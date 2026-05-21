/**
 * ScoreRenderer - Renders a visual music score from parsed Braille music elements.
 * Uses VexFlow to draw notes on a staff in real-time.
 * Supports: notes, rests, barlines, time signatures, accidentals, dots, slurs, ties.
 */
import { useEffect, useRef, useMemo } from 'react';
import { Renderer, Stave, StaveNote, Voice, Formatter, Accidental, Dot, Curve } from 'vexflow';
import type { ParsedElement, ParsedNote, ParsedRest } from '../lib/brailleMusic';

interface ScoreRendererProps {
  elements: ParsedElement[];
  width?: number;
  height?: number;
  beatsPerMeasure?: number;
  /** Called when user clicks a measure; receives the sourceIndex of the first note in that measure */
  onMeasureClick?: (sourceIndex: number) => void;
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
 */
function noteToVexDuration(el: ParsedNote | ParsedRest): string {
  const dur = el.vexDuration;
  if (el.type === 'rest') {
    return dur.replace('d', '');
  }
  return dur.replace('d', '');
}

export default function ScoreRenderer({ elements, width = 1000, height = 300, beatsPerMeasure = 4, onMeasureClick }: ScoreRendererProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  // Store measure hit areas for click detection: { x, y, w, h, sourceIndex }
  const measureHitAreas = useRef<Array<{ x: number; y: number; w: number; h: number; sourceIndex: number }>>([]);

  // Extract time signature from parsed elements
  const timeSignature = useMemo(() => {
    const timeSigEl = elements.find(el => el.type === 'timesignature') as any;
    if (timeSigEl) {
      return { numerator: timeSigEl.numerator, denominator: timeSigEl.denominator };
    }
    return { numerator: 4, denominator: 4 };
  }, [elements]);

  // Group elements into measures
  const measures = useMemo(() => groupIntoMeasures(elements), [elements]);

  useEffect(() => {
    if (!containerRef.current || measures.length === 0) return;

    // Clear container and hit areas
    containerRef.current.innerHTML = '';
    measureHitAreas.current = [];

    const renderer = new Renderer(containerRef.current, Renderer.Backends.SVG);
    renderer.resize(width, height);
    const context = renderer.getContext();

    let x = 10;
    let y = 40;
    const minStaveWidth = 150;  // Minimum width for a measure
    const noteWidth = 60;        // Approximate width per note (increased for better spacing)

    // Render each measure
    for (let i = 0; i < measures.length; i++) {
      const measure = measures[i];
      const measureNotes = measure.notes.filter(n => n.type === 'note' || n.type === 'rest');
      const isFirst = i === 0;

      // Calculate stave width dynamically based on number of notes
      // Each note takes approximately 30px, with a minimum of 100px
      const currentStaveWidth = Math.max(minStaveWidth, measureNotes.length * noteWidth);

      // Check if we need to wrap to next line
      if (x + currentStaveWidth > width - 20) {
        x = 10;
        y += 100;
      }

      // Create stave
      const stave = new Stave(x, y, currentStaveWidth);
      if (isFirst) {
        stave.addClef('treble');
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

      // Record hit area for this measure (for click detection)
      if (measure.sourceIndex !== undefined) {
        measureHitAreas.current.push({ x, y: y - 10, w: currentStaveWidth, h: 90, sourceIndex: measure.sourceIndex });
      }

      if (measureNotes.length === 0) {
        x += currentStaveWidth;
        continue;
      }

      // Create voice and add notes (SOFT mode avoids strict beat-count validation errors)
      const voice = new Voice({ numBeats: timeSignature.numerator, beatValue: timeSignature.denominator });
      voice.setMode(2); // Voice.Mode.SOFT = 2 — allows partial or overflowing measures
      const vexNotes: StaveNote[] = [];

      for (const el of measureNotes) {
        if (el.type === 'note') {
          const vexNote = new StaveNote({
            keys: [noteToVexKey(el)],
            duration: noteToVexDuration(el),
            clef: 'treble',
          });

          // Add accidental if present
          if (el.accidental) {
            vexNote.addModifier(new Accidental(el.accidental), 0);
          }

          // Add dot if present
          if (el.dotted) {
            Dot.buildAndAttach([vexNote], { all: true });
          }

          vexNotes.push(vexNote);
        } else if (el.type === 'rest') {
          const vexRest = new StaveNote({
            keys: ['b/4'],
            duration: noteToVexDuration(el) + 'r',
            clef: 'treble',
          });
          vexNotes.push(vexRest);
        }
      }

      voice.addTickables(vexNotes);

      // Format and draw (only if there are notes)
      if (vexNotes.length > 0) {
        const formatter = new Formatter();
        // Calculate minimum width needed for all notes
        const minWidth = formatter.preCalculateMinTotalWidth([voice]);
        // Use the maximum of calculated width and current stave width
        const formatWidth = Math.max(minWidth + 20, currentStaveWidth - 20);
        formatter.joinVoices([voice]).format([voice], formatWidth);
        voice.draw(context, stave);
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
  }, [elements, measures, width, height, timeSignature]);

  // Add click listener on the SVG canvas to detect measure clicks
  useEffect(() => {
    if (!containerRef.current || !onMeasureClick) return;

    const handleClick = (e: MouseEvent) => {
      const svg = containerRef.current?.querySelector('svg');
      if (!svg) return;
      const rect = svg.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const clickY = e.clientY - rect.top;

      // Find which measure was clicked
      for (const area of measureHitAreas.current) {
        if (clickX >= area.x && clickX <= area.x + area.w &&
            clickY >= area.y && clickY <= area.y + area.h) {
          onMeasureClick(area.sourceIndex);
          break;
        }
      }
    };

    const svg = containerRef.current.querySelector('svg');
    if (svg) {
      svg.addEventListener('click', handleClick as EventListener);
      return () => svg.removeEventListener('click', handleClick as EventListener);
    }
  }, [onMeasureClick, measures]);

  return <div ref={containerRef} style={{ cursor: onMeasureClick ? 'pointer' : 'default' }} />;
}
