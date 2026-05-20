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
}

// Measure info including barline type
interface MeasureInfo {
  notes: (ParsedNote | ParsedRest)[];
  barlineType: 'single' | 'end' | 'none';
}

// Group elements into measures (split by barlines)
function groupIntoMeasures(elements: ParsedElement[]): MeasureInfo[] {
  const measures: MeasureInfo[] = [];
  let current: (ParsedNote | ParsedRest)[] = [];

  for (const el of elements) {
    if (el.type === 'barline') {
      if (current.length > 0) {
        let barType: 'single' | 'end' | 'none' = 'single';
        if ((el as any).barlineType === 'final') {
          barType = 'end';
        } else if ((el as any).barlineType === 'none') {
          barType = 'none';
        }
        measures.push({ notes: current, barlineType: barType });
        current = [];
      }
    } else if (el.type === 'note' || el.type === 'rest') {
      current.push(el);
    }
    // Skip timesignature and notetie elements
  }
  if (current.length > 0) {
    measures.push({ notes: current, barlineType: 'none' });
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

export default function ScoreRenderer({ elements, width = 800, height = 200, beatsPerMeasure: propBeatsPerMeasure = 4 }: ScoreRendererProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  // Extract time signature from elements if present
  const timeSignature = useMemo(() => {
    const ts = elements.find(el => el.type === 'timesignature');
    if (ts && ts.type === 'timesignature') {
      return { numerator: ts.numerator, denominator: ts.denominator };
    }
    return { numerator: propBeatsPerMeasure, denominator: 4 };
  }, [elements, propBeatsPerMeasure]);

  const measures = useMemo(() => groupIntoMeasures(elements), [elements]);

  useEffect(() => {
    if (!containerRef.current) return;

    // Clear previous rendering
    containerRef.current.innerHTML = '';

    if (elements.length === 0) {
      // Show empty staff placeholder
      try {
        const renderer = new Renderer(containerRef.current, Renderer.Backends.SVG);
        renderer.resize(width, height);
        const context = renderer.getContext();
        const stave = new Stave(10, 20, width - 20);
        stave.addClef('treble').addTimeSignature(`${timeSignature.numerator}/${timeSignature.denominator}`);
        stave.setContext(context).draw();
      } catch {
        // Ignore errors on empty staff
      }
      return;
    }

    try {
      const renderer = new Renderer(containerRef.current, Renderer.Backends.SVG);

      const staveWidth = 260;
      const measuresPerLine = Math.max(1, Math.floor((width - 40) / staveWidth));
      const numLines = Math.ceil(Math.max(1, measures.length) / measuresPerLine);
      const totalHeight = Math.max(height, numLines * 130 + 40);

      renderer.resize(width, totalHeight);
      const context = renderer.getContext();
      context.setFont('Arial', 10);

      let x = 10;
      let y = 20;
      let measureIndex = 0;

      // Track notes for slur/tie rendering
      const allStaveNotes: StaveNote[] = [];

      for (let line = 0; line < numLines; line++) {
        x = 10;
        for (let m = 0; m < measuresPerLine && measureIndex < measures.length; m++, measureIndex++) {
          const { notes: measureNotes } = measures[measureIndex];
          const isFirst = measureIndex === 0;
          const currentStaveWidth = isFirst ? staveWidth + 40 : staveWidth;

          const stave = new Stave(x, y, currentStaveWidth);
          if (isFirst) {
            stave.addClef('treble');
            // Add time signature on first measure (from parsed or prop)
            stave.addTimeSignature(`${timeSignature.numerator}/${timeSignature.denominator}`);
          }
          
          // Set barline type based on measure info
          const measure = measures[measureIndex];
          if (measure.barlineType === 'end') {
            stave.setEndBarType(2); // END barline (ritornelos)
          }
          // 'none' and 'single' use default barline (no setEndBarType call)
          
          stave.setContext(context).draw();

          if (measureNotes.length === 0) {
            x += currentStaveWidth;
            continue;
          }

          // Create VexFlow notes
          const vfNotes = measureNotes.map(el => {
            if (el.type === 'rest') {
              const dur = noteToVexDuration(el);
              const note = new StaveNote({
                keys: ['b/4'],
                duration: dur,
              });
              if (el.dotted) {
                Dot.buildAndAttach([note]);
              }
              return note;
            } else {
              const key = noteToVexKey(el);
              const dur = noteToVexDuration(el);

              const note = new StaveNote({
                keys: [key],
                duration: dur,
              });

              // Add accidental as modifier
              if (el.accidental === 'sharp') {
                note.addModifier(new Accidental('#'));
              } else if (el.accidental === 'flat') {
                note.addModifier(new Accidental('b'));
              } else if (el.accidental === 'natural') {
                note.addModifier(new Accidental('n'));
              }

              if (el.dotted) {
                Dot.buildAndAttach([note]);
              }

              return note;
            }
          });

          allStaveNotes.push(...vfNotes);

          // Calculate total beats for voice
          const totalBeats = measureNotes.reduce((sum, el) => {
            return sum + durationToBeats(el.vexDuration);
          }, 0);

          const voice = new Voice({
            numBeats: Math.max(totalBeats, 0.25),
            beatValue: 4,
          }).setMode(Voice.Mode.SOFT);

          voice.addTickables(vfNotes);

          new Formatter()
            .joinVoices([voice])
            .format([voice], currentStaveWidth - (isFirst ? 100 : 40));

          voice.draw(context, stave);

          x += currentStaveWidth;
        }
        y += 130;
      }

      // Draw ties between consecutive notes when notetie elements are present
      const noteTies = elements.filter(e => e.type === 'notetie');
      const slurNotes = elements
        .filter(e => e.type === 'note')
        .map((e, i) => ({ el: e as ParsedNote, idx: i }))
        .filter(({ el }) => el.articulation === 'slur' || el.vexDuration?.includes('tie'));

      // Handle note ties (ligaduras de nota)
      if (noteTies.length > 0 && allStaveNotes.length >= 2) {
        try {
          let noteIdx = 0;
          for (let i = 0; i < elements.length - 2; i++) {
            if (elements[i].type === 'note' && elements[i + 1].type === 'notetie' && elements[i + 2].type === 'note') {
              const firstNote = allStaveNotes[noteIdx];
              const secondNote = allStaveNotes[noteIdx + 1];
              if (firstNote && secondNote) {
                const curve = new Curve(firstNote, secondNote, {
                  cps: [{ x: 0, y: 10 }, { x: 0, y: 10 }],
                });
                curve.setContext(context).draw();
              }
            }
            if (elements[i].type === 'note') noteIdx++;
          }
        } catch {
          // Ignore tie rendering errors
        }
      }

      if (slurNotes.length >= 2 && allStaveNotes.length >= 2) {
        try {
          const firstNote = allStaveNotes[0];
          const lastNote = allStaveNotes[allStaveNotes.length - 1];
          if (firstNote && lastNote && firstNote !== lastNote) {
            const curve = new Curve(firstNote, lastNote, {
              cps: [{ x: 0, y: 10 }, { x: 0, y: 10 }],
            });
            curve.setContext(context).draw();
          }
        } catch {
          // Ignore slur rendering errors
        }
      }

    } catch (err) {
      console.error('VexFlow rendering error:', err);
      if (containerRef.current) {
        containerRef.current.innerHTML = `<p style="color: #ef4444; padding: 8px; font-size: 12px;">Erro na renderização: ${(err as Error).message}</p>`;
      }
    }
  }, [elements, measures, width, height, timeSignature, propBeatsPerMeasure]);

  return (
    <div
      ref={containerRef}
      className="bg-white rounded-lg overflow-auto"
      style={{ minHeight: height }}
      role="img"
      aria-label="Partitura musical renderizada a partir da entrada em Braille"
    />
  );
}
