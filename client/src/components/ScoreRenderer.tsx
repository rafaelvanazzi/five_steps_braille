/**
 * ScoreRenderer - Renders a visual music score from parsed Braille music elements.
 * Uses VexFlow to draw notes on a staff in real-time.
 */
import { useEffect, useRef, useMemo } from 'react';
import { Renderer, Stave, StaveNote, Voice, Formatter, Accidental, Dot } from 'vexflow';
import type { ParsedElement, ParsedNote, ParsedRest } from '../lib/brailleMusic';

interface ScoreRendererProps {
  elements: ParsedElement[];
  width?: number;
  height?: number;
}

// Group elements into measures (split by barlines)
function groupIntoMeasures(elements: ParsedElement[]): (ParsedNote | ParsedRest)[][] {
  const measures: (ParsedNote | ParsedRest)[][] = [];
  let current: (ParsedNote | ParsedRest)[] = [];

  for (const el of elements) {
    if (el.type === 'barline') {
      if (current.length > 0) {
        measures.push(current);
        current = [];
      }
    } else {
      current.push(el);
    }
  }
  if (current.length > 0) {
    measures.push(current);
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
    default: beats = 1;
  }
  if (dur.includes('d')) beats *= 1.5;
  return beats;
}

/**
 * Extract a clean VexFlow key from a ParsedNote.
 * VexFlow expects keys like "c/4", "b/4" etc.
 * The accidental is added separately via Accidental modifier.
 * 
 * IMPORTANT: We must NOT include accidentals in the key string.
 * VexFlow uses modifiers for accidentals, not key names.
 * The key is always just the base note letter + octave.
 */
function noteToVexKey(note: ParsedNote): string {
  // Always use just the base pitch letter (no accidental suffix)
  return `${note.pitch.toLowerCase()}/${note.octave}`;
}

/**
 * Extract clean VexFlow duration string.
 * Removes 'd' suffix (dotted is handled by Dot.buildAndAttach).
 */
function noteToVexDuration(el: ParsedNote | ParsedRest): string {
  const dur = el.vexDuration;
  if (el.type === 'rest') {
    // Rest durations: "qr", "hr", "8r", "wr", "16r", "qdr" etc.
    const clean = dur.replace('d', '');
    return clean;
  }
  // Note durations: "q", "h", "8", "w", "16", "qd" etc.
  return dur.replace('d', '');
}

export default function ScoreRenderer({ elements, width = 800, height = 200 }: ScoreRendererProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  const measures = useMemo(() => groupIntoMeasures(elements), [elements]);

  useEffect(() => {
    if (!containerRef.current) return;

    // Clear previous rendering
    containerRef.current.innerHTML = '';

    if (elements.length === 0) {
      return;
    }

    // Filter only notes and rests
    const noteElements = elements.filter(e => e.type === 'note' || e.type === 'rest') as (ParsedNote | ParsedRest)[];
    if (noteElements.length === 0) return;

    try {
      const renderer = new Renderer(containerRef.current, Renderer.Backends.SVG);

      // Calculate needed width based on number of measures
      const measuresData = measures.length > 0 ? measures : [noteElements];
      const staveWidth = 250;
      const measuresPerLine = Math.max(1, Math.floor((width - 40) / staveWidth));
      const numLines = Math.ceil(measuresData.length / measuresPerLine);
      const totalHeight = Math.max(height, numLines * 120 + 40);

      renderer.resize(width, totalHeight);
      const context = renderer.getContext();
      context.setFont('Arial', 10);

      let x = 10;
      let y = 20;
      let measureIndex = 0;

      for (let line = 0; line < numLines; line++) {
        x = 10;
        for (let m = 0; m < measuresPerLine && measureIndex < measuresData.length; m++, measureIndex++) {
          const measureNotes = measuresData[measureIndex];
          const isFirst = measureIndex === 0;
          const currentStaveWidth = isFirst ? staveWidth + 30 : staveWidth;

          const stave = new Stave(x, y, currentStaveWidth);
          if (isFirst) {
            stave.addClef('treble');
          }
          stave.setContext(context).draw();

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
              // Note — build key cleanly from pitch and octave
              const key = noteToVexKey(el);
              const dur = noteToVexDuration(el);
              
              const note = new StaveNote({
                keys: [key],
                duration: dur,
              });

              // Add accidental as modifier (NOT in the key string)
              if (el.accidental === 'sharp') {
                note.addModifier(new Accidental('#'));
              } else if (el.accidental === 'flat') {
                note.addModifier(new Accidental('b'));
              } else if (el.accidental === 'natural') {
                note.addModifier(new Accidental('n'));
              }

              // Add dot
              if (el.dotted) {
                Dot.buildAndAttach([note]);
              }

              return note;
            }
          });

          if (vfNotes.length > 0) {
            // Calculate total beats
            const totalBeats = measureNotes.reduce((sum, el) => {
              return sum + durationToBeats(el.vexDuration);
            }, 0);

            // Use a loose voice (no strict time checking)
            const voice = new Voice({
              numBeats: totalBeats,
              beatValue: 4,
            }).setMode(Voice.Mode.SOFT);

            voice.addTickables(vfNotes);

            new Formatter()
              .joinVoices([voice])
              .format([voice], currentStaveWidth - (isFirst ? 80 : 30));

            voice.draw(context, stave);
          }

          x += currentStaveWidth;
        }
        y += 120;
      }
    } catch (err) {
      console.error('VexFlow rendering error:', err);
      // Show error in container
      if (containerRef.current) {
        containerRef.current.innerHTML = `<p style="color: #ef4444; padding: 8px;">Erro na renderização: ${(err as Error).message}</p>`;
      }
    }
  }, [elements, measures, width, height]);

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
