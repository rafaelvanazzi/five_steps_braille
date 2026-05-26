/**
 * ScoreRenderer - Renders a visual music score from parsed Braille music elements.
 * Uses VexFlow to draw notes on a staff in real-time.
 * Supports: notes, rests, barlines, time signatures, accidentals, dots, slurs, ties.
 * Click on a note to jump to the corresponding Braille cell in the editor.
 */
import { useEffect, useLayoutEffect, useRef, useMemo } from 'react';
import { Renderer, Stave, StaveNote, Voice, Formatter, Accidental, Dot, Curve } from 'vexflow';
import type { ParsedElement, ParsedNote, ParsedRest, ParsedKeySignature } from '../lib/brailleMusic';

interface ScoreRendererProps {
  elements: ParsedElement[];
  width?: number;
  height?: number;
  beatsPerMeasure?: number;
  /** Called when user clicks a note; receives the sourceIndex of that note in the Braille text */
  onNoteClick?: (sourceIndex: number) => void;
  /** @deprecated Use onNoteClick instead */
  onMeasureClick?: (sourceIndex: number) => void;
  /** Source index of the note to highlight (for bidirectional sync with Braille cursor) */
  highlightedSourceIndex?: number | null;
}

// Hit area for individual notes (for click detection)
interface NoteHitArea {
  x: number;
  y: number;
  w: number;
  h: number;
  sourceIndex: number;
}

// Measure info including barline type
interface MeasureInfo {
  notes: (ParsedNote | ParsedRest)[];
  barlineType: 'single' | 'end' | 'repeat-begin' | 'repeat-end' | 'repeat-both';
  begBarlineType?: 'repeat-begin';
  /** sourceIndex of the first element in this measure (for cursor sync) */
  sourceIndex?: number;
}

// Group elements into measures (split by barlines)
function groupIntoMeasures(elements: ParsedElement[]): MeasureInfo[] {
  const measures: MeasureInfo[] = [];
  let current: (ParsedNote | ParsedRest)[] = [];
  let nextBegBarline: 'repeat-begin' | undefined = undefined;
  let currentSourceIndex: number | undefined = undefined;

  for (let i = 0; i < elements.length; i++) {
    const el = elements[i];
    
    if (el.type === 'barline') {
      // Check if this is a repeat-begin at the start of a measure (no notes yet)
      if ((el as any).barlineType === 'repeat-begin' && current.length === 0) {
        // Mark for the next measure
        nextBegBarline = 'repeat-begin';
        continue; // Don't create a measure yet
      }
      
      // For simple barlines (no type) with no notes, skip them (preserve nextBegBarline)
      if (!(el as any).barlineType && current.length === 0) {
        continue;
      }
      
      // For other barlines, always create a measure (even if empty)
      let barType: 'single' | 'end' | 'repeat-begin' | 'repeat-end' | 'repeat-both' = 'single';
      if ((el as any).barlineType === 'end') {
        barType = 'end';
      } else if ((el as any).barlineType === 'repeat-end') {
        barType = 'repeat-end';
      }
      
      measures.push({ 
        notes: current, 
        barlineType: barType, 
        begBarlineType: nextBegBarline,
        sourceIndex: currentSourceIndex
      });
      current = [];
      nextBegBarline = undefined;
      currentSourceIndex = undefined;
    } else if (el.type === 'note' || el.type === 'rest') {
      // Track the sourceIndex of the first note/rest in this measure
      if (currentSourceIndex === undefined && el.sourceIndex !== undefined) {
        currentSourceIndex = el.sourceIndex;
      }
      current.push(el);
    }
    // Skip timesignature and notetie elements
  }
  
  if (current.length > 0 || nextBegBarline) {
    measures.push({ 
      notes: current, 
      barlineType: 'single', 
      begBarlineType: nextBegBarline,
      sourceIndex: currentSourceIndex
    });
  }

  // Detect repeat-both: when a measure ends with repeat-end and next has repeat-begin at start
  for (let i = 0; i < measures.length - 1; i++) {
    if (measures[i].barlineType === 'repeat-end' && measures[i + 1].begBarlineType === 'repeat-begin') {
      measures[i].barlineType = 'repeat-both';
      measures[i + 1].begBarlineType = undefined; // Remove repeat-begin from next measure
    }
  }

  return measures;
}

// Convert duration to VexFlow beat value for voice
function durationToBeats(dur: string): number {
  const base = dur.replace('r', '').replace('d', '');
  let beats = 0;
  switch (base) {
    case 'w': beats = 4; break;
    case 'h': beats = 2; break;
    case 'q': beats = 1; break;
    case '8': beats = 0.5; break;
    case '16': beats = 0.25; break;
    case '32': beats = 0.125; break;
    case '64': beats = 0.0625; break;
    default: beats = 1;
  }
  if (dur.includes('d')) beats *= 1.5;
  return beats;
}

/**
 * Extract a clean VexFlow key from a ParsedNote.
 * VexFlow expects keys like "c/4", "b/4" etc.
 * Accidentals are added separately via Accidental modifier.
 */
function noteToVexKey(note: ParsedNote): string {
  return `${note.pitch.toLowerCase()}/${note.octave}`;
}

/**
 * Extract clean VexFlow duration string.
 * Removes 'd' suffix (dotted is handled by Dot.buildAndAttach).
 * Also removes 'r' suffix for rests (added separately in StaveNote creation).
 */
function noteToVexDuration(el: ParsedNote | ParsedRest): string {
  let dur = el.vexDuration;
  // Remove 'd' (dotted handled by Dot.buildAndAttach)
  dur = dur.replace('d', '');
  // Remove 'r' suffix for rests (we add it separately when creating StaveNote)
  dur = dur.replace('r', '');
  return dur;
}

/**
 * Convert accidental type from parser format to VexFlow format.
 * Parser uses: 'sharp', 'flat', 'natural'
 * VexFlow expects: '#', 'b', 'n'
 */
function accidentalToVex(acc: string): string {
  switch (acc) {
    case 'sharp': return '#';
    case 'flat': return 'b';
    case 'natural': return 'n';
    default: return acc;
  }
}

export default function ScoreRenderer({ elements, width = 1000, height = 300, beatsPerMeasure = 4, onNoteClick, onMeasureClick, highlightedSourceIndex }: ScoreRendererProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  // Store note hit areas for click detection (per individual note)
  const noteHitAreas = useRef<NoteHitArea[]>([]);

  // Unified click handler: prefer onNoteClick, fallback to onMeasureClick
  const handleNoteClick = onNoteClick || onMeasureClick;

  // Extract time signature from parsed elements
  const timeSignature = useMemo(() => {
    const timeSigEl = elements.find(el => el.type === 'timesignature') as any;
    if (timeSigEl) {
      return { numerator: timeSigEl.numerator, denominator: timeSigEl.denominator };
    }
    return { numerator: 4, denominator: 4 };
  }, [elements]);

  // Extract key signature from parsed elements
  const keySignature = useMemo(() => {
    const keySigEl = elements.find(el => el.type === 'keysignature') as ParsedKeySignature | undefined;
    return keySigEl?.vexKey || null;
  }, [elements]);

  // Group elements into measures
  const measures = useMemo(() => groupIntoMeasures(elements), [elements]);

  useLayoutEffect(() => {
    if (!containerRef.current || measures.length === 0) {
      // Ensure container is cleaned up even if no measures
      if (containerRef.current) {
        containerRef.current.innerHTML = '';
      }
      return;
    }

    // Clear container and hit areas
    containerRef.current.innerHTML = '';
    noteHitAreas.current = [];

    const minStaveWidth = 200;  // Minimum width for a measure
    const baseNoteWidth = 50;    // Base width per note

    // Calculate width for a note based on its duration (longer notes get more space)
    function getNoteWidth(el: ParsedNote | ParsedRest): number {
      const dur = el.type === 'note' ? el.duration : el.duration;
      switch (dur) {
        case 'w': return baseNoteWidth * 3;   // 150px for whole notes
        case 'h': return baseNoteWidth * 2;   // 100px for half notes
        case 'q': return baseNoteWidth * 1.5; // 75px for quarter notes
        case '8': return baseNoteWidth;       // 50px for eighth notes
        case '16': return baseNoteWidth * 0.8; // 40px for 16th notes
        case '32': return baseNoteWidth * 0.7; // 35px for 32nd notes
        default: return baseNoteWidth;
      }
    }

    // First pass: calculate total width needed (all measures in one line)
    let totalWidth = 10; // Start with left padding
    let currentLineX = 10;

    for (let i = 0; i < measures.length; i++) {
      const measure = measures[i];
      const measureNotes = measure.notes.filter(n => n.type === 'note' || n.type === 'rest');
      const extraW = i === 0 ? (80 + (keySignature ? 40 : 0)) : 0; // Extra space for clef + key sig + time signature
      const notesWidth = measureNotes.reduce((sum, n) => sum + getNoteWidth(n), 0);
      const staveW = Math.max(minStaveWidth, notesWidth + extraW + 40); // +40 for padding

      currentLineX += staveW;
      totalWidth = Math.max(totalWidth, currentLineX + 10); // Add right padding
    }

    // Use the calculated dimensions - all measures in one line, scroll if needed
    const canvasWidth = Math.max(width, totalWidth);
    const canvasHeight = height;

    const renderer = new Renderer(containerRef.current, Renderer.Backends.SVG);
    renderer.resize(canvasWidth, canvasHeight);
    const context = renderer.getContext();

    let x = 10;
    let y = 40;

    // Render each measure
    for (let i = 0; i < measures.length; i++) {
      const measure = measures[i];
      const measureNotes = measure.notes.filter(n => n.type === 'note' || n.type === 'rest');
      const isFirst = i === 0;

      // Calculate stave width dynamically based on note durations
      // Add extra space for first measure (clef + time signature take ~80px)
      const extraWidth = isFirst ? (80 + (keySignature ? 40 : 0)) : 0;
      const notesWidth = measureNotes.reduce((sum, n) => sum + getNoteWidth(n), 0);
      const currentStaveWidth = Math.max(minStaveWidth, notesWidth + extraWidth + 40); // +40 for padding

      // All measures in one line - no wrapping
      // Create stave
      const stave = new Stave(x, y, currentStaveWidth);
      if (isFirst) {
        stave.addClef('treble');
        // Add key signature if present
        if (keySignature) {
          stave.addKeySignature(keySignature);
        }
        // Add time signature on first measure (from parsed or prop)
        stave.addTimeSignature(`${timeSignature.numerator}/${timeSignature.denominator}`);
      }

      // Set beginning barline type (ritornelo de início)
      if (measure.begBarlineType === 'repeat-begin') {
        stave.setBegBarType(4); // REPEAT_BEGIN = =|:
      }

      // Set ending barline type
      if (measure.barlineType === 'end') {
        stave.setEndBarType(3); // END = =|=
      } else if (measure.barlineType === 'repeat-begin') {
        stave.setEndBarType(4); // REPEAT_BEGIN = =|:
      } else if (measure.barlineType === 'repeat-end') {
        stave.setEndBarType(5); // REPEAT_END = =:|
      } else if (measure.barlineType === 'repeat-both') {
        stave.setEndBarType(6); // REPEAT_BOTH = =::
      }
      // 'single' uses default barline (no setEndBarType call)

      stave.setContext(context).draw();

      if (measureNotes.length === 0) {
        x += currentStaveWidth;
        continue;
      }

      // Create voice and add notes (SOFT mode avoids strict beat-count validation errors)
      const voice = new Voice({ numBeats: timeSignature.numerator, beatValue: timeSignature.denominator });
      voice.setMode(2); // Voice.Mode.SOFT = 2 — allows partial or overflowing measures
      const vexNotes: StaveNote[] = [];
      // Track which parsed element corresponds to each VexFlow note
      const noteSourceIndices: (number | undefined)[] = [];

      for (const el of measureNotes) {
        if (el.type === 'note') {
          const vexNote = new StaveNote({
            keys: [noteToVexKey(el)],
            duration: noteToVexDuration(el),
            clef: 'treble',
          });

          // Add accidental if present (convert from parser format to VexFlow format)
          if (el.accidental) {
            vexNote.addModifier(new Accidental(accidentalToVex(el.accidental)), 0);
          }

          // Add dot if present
          if (el.dotted) {
            Dot.buildAndAttach([vexNote], { all: true });
          }

          vexNotes.push(vexNote);
          noteSourceIndices.push(el.sourceIndex);
        } else if (el.type === 'rest') {
          const restDur = noteToVexDuration(el) + 'r';
          const vexRest = new StaveNote({
            keys: ['b/4'],
            duration: restDur,
            clef: 'treble',
          });

          // Add dot to rest if present
          if (el.dotted) {
            Dot.buildAndAttach([vexRest], { all: true });
          }

          vexNotes.push(vexRest);
          noteSourceIndices.push(el.sourceIndex);
        }
      }

      voice.addTickables(vexNotes);

      // Format and draw (only if there are notes)
      if (vexNotes.length > 0) {
        const formatter = new Formatter();
        // Use the calculated stave width directly
        formatter.joinVoices([voice]).format([voice], currentStaveWidth - 20);
        voice.draw(context, stave);

        // After drawing, extract bounding boxes for each note to create click hit areas
        for (let j = 0; j < vexNotes.length; j++) {
          const vexNote = vexNotes[j];
          const srcIdx = noteSourceIndices[j];
          if (srcIdx === undefined) continue;

          try {
            const bb = vexNote.getBoundingBox();
            if (bb) {
              noteHitAreas.current.push({
                x: bb.getX(),
                y: bb.getY(),
                w: bb.getW(),
                h: bb.getH(),
                sourceIndex: srcIdx,
              });
            }
          } catch {
            // If getBoundingBox fails, use approximate position based on note's x
            // This is a fallback for notes that don't have a bounding box
            try {
              const noteX = vexNote.getAbsoluteX();
              noteHitAreas.current.push({
                x: noteX - 10,
                y: y - 10,
                w: 30,
                h: 90,
                sourceIndex: srcIdx,
              });
            } catch {
              // Skip this note if we can't get its position
            }
          }
        }
      }

      // Draw ties/ligaduras between consecutive notes
      for (let j = 0; j < measureNotes.length - 1; j++) {
        const current = measureNotes[j];
        const next = measureNotes[j + 1];

        // Check if there's a notetie between them
        const hasTie = elements.some((el, idx) => {
          if (el.type === 'notetie') {
            const currentIdx = elements.indexOf(current as any);
            const nextIdx = elements.indexOf(next as any);
            return currentIdx >= 0 && nextIdx >= 0 && currentIdx < idx && idx < nextIdx;
          }
          return false;
        });

        if (hasTie && j < vexNotes.length - 1) {
          const curve = new Curve(vexNotes[j], vexNotes[j + 1], { cps: [{ x: 0, y: 20 }, { x: 0, y: 20 }] });
          curve.setContext(context).draw();
        }
      }

      x += currentStaveWidth;
    }
    
    // Apply visual highlight to the selected note using hit areas
    if (highlightedSourceIndex !== null && highlightedSourceIndex !== undefined) {
      const svg = containerRef.current?.querySelector('svg');
      if (svg) {
        // Find the hit area for the highlighted note
        const highlightedArea = noteHitAreas.current.find(area => area.sourceIndex === highlightedSourceIndex);
        if (highlightedArea) {
          // Create a highlight rectangle
          const highlightRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
          highlightRect.setAttribute('x', String(highlightedArea.x - 5));
          highlightRect.setAttribute('y', String(highlightedArea.y - 5));
          highlightRect.setAttribute('width', String(highlightedArea.w + 10));
          highlightRect.setAttribute('height', String(highlightedArea.h + 10));
          highlightRect.setAttribute('fill', 'rgba(59, 130, 246, 0.2)');
          highlightRect.setAttribute('stroke', '#3b82f6');
          highlightRect.setAttribute('stroke-width', '2');
          highlightRect.setAttribute('rx', '4');
          svg.appendChild(highlightRect);
        }
      }
    }
  }, [elements, measures, width, height, timeSignature, highlightedSourceIndex]);

  // Add click listener on the SVG canvas to detect note clicks
  useEffect(() => {
    if (!containerRef.current || !handleNoteClick) return;

    const onClick = (e: MouseEvent) => {
      const svg = containerRef.current?.querySelector('svg');
      if (!svg) return;
      const rect = svg.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const clickY = e.clientY - rect.top;

      // Find the closest note to the click position
      let closestNote: NoteHitArea | null = null;
      let closestDist = Infinity;

      for (const area of noteHitAreas.current) {
        // Check if click is within the hit area (with some vertical tolerance)
        const centerX = area.x + area.w / 2;
        const centerY = area.y + area.h / 2;
        const dist = Math.sqrt((clickX - centerX) ** 2 + (clickY - centerY) ** 2);

        // Only consider notes within reasonable distance (within the stave area)
        if (dist < closestDist && clickY >= area.y - 20 && clickY <= area.y + area.h + 20) {
          closestDist = dist;
          closestNote = area;
        }
      }

      // If we found a note within 60px, trigger the callback
      if (closestNote && closestDist < 60) {
        handleNoteClick(closestNote.sourceIndex);
      }
    };

    const svg = containerRef.current.querySelector('svg');
    if (svg) {
      svg.addEventListener('click', onClick as EventListener);
      return () => svg.removeEventListener('click', onClick as EventListener);
    }
  }, [handleNoteClick, measures]);

  return (
    <div
      ref={containerRef}
      style={{
        cursor: handleNoteClick ? 'pointer' : 'default',
        overflowX: 'auto',
        overflowY: 'hidden',
        width: '100%',
        maxHeight: height + 50,
      }}
    />
  );
}
