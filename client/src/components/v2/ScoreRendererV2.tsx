import { useEffect, useRef } from 'react';
import { Renderer, Stave, StaveNote, Voice, Formatter } from 'vexflow';
import type { ParsedElement, ParsedNote, ParsedRest, ParsedTimeSignature } from '@/lib/v2/brailleModelV2';
import { durationToVexFlow } from '@/lib/v2/brailleModelV2';

interface ScoreRendererV2Props {
  elements: ParsedElement[];
  width?: number;
  height?: number;
}

export default function ScoreRendererV2({ elements, width = 800, height = 250 }: ScoreRendererV2Props) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current || elements.length === 0) {
      if (containerRef.current) containerRef.current.innerHTML = '';
      return;
    }

    containerRef.current.innerHTML = '';
    
    try {
      const renderer = new Renderer(containerRef.current, Renderer.Backends.SVG);
      renderer.resize(width, height);
      const context = renderer.getContext();

      const timeSig = elements.find((el): el is ParsedTimeSignature => el.type === 'timesignature');
      const numerator = timeSig ? timeSig.numerator : 4;
      const denominator = timeSig ? timeSig.denominator : 4;

      const stave = new Stave(10, 40, width - 20);
      stave.addClef('treble');
      if (timeSig) {
        stave.addTimeSignature(`${numerator}/${denominator}`);
      }
      stave.setContext(context).draw();

      const musicElements = elements.filter(
        (el): el is ParsedNote | ParsedRest => el.type === 'note' || el.type === 'rest'
      );

      if (musicElements.length > 0) {
        const vexNotes = musicElements.map((el) => {
          if (el.type === 'note') {
            const note = new StaveNote({
              keys: [`${el.pitch.toLowerCase()}/${el.octave}`],
              duration: durationToVexFlow(el.duration),
              clef: 'treble',
            });
            // TODO: Implementar suporte a notas pontuadas
            return note;
          } else {
            const rest = new StaveNote({
              keys: ['b/4'],
              duration: durationToVexFlow(el.duration) + 'r',
              clef: 'treble',
            });
            // TODO: Implementar suporte a pausas pontuadas
            return rest;
          }
        });

        const voice = new Voice({ numBeats: numerator, beatValue: denominator });
        voice.setMode(2); // SOFT mode
        
        const validNotes = vexNotes.filter(n => n != null);
        voice.addTickables(validNotes);

        const formatter = new Formatter();
        formatter.joinVoices([voice]).format([voice], width - 50);
        voice.draw(context, stave);
      }
    } catch (error) {
      console.error("Erro no VexFlow Renderer V2:", error);
      if (containerRef.current) {
        containerRef.current.innerHTML = `<div style="color: red; padding: 20px;">Erro ao renderizar partitura. Verifique o console.</div>`;
      }
    }
  }, [elements, width, height]);

  return <div ref={containerRef} style={{ width: '100%', minHeight: height, overflowX: 'auto' }} />;
}
