/**
 * ScoreRenderer.tsx — Versão Estabilizada com Quebra Dinâmica e Escala Fixa
 * * Desenha arcos de ligaduras (StaveTie) e respeita as escalas discretas (0.5 a 1.0).
 */

import { useEffect, useRef, useMemo } from 'react';
import { Renderer, Stave, StaveNote, StaveConnector, Voice, Formatter, Accidental, Dot, Beam, StaveTie } from 'vexflow';
import type { ParsedElement, ParsedNote, ParsedRest } from '../lib/brailleMusic';
import { PREMIUM_CONTENT_ENABLED } from '../lib/brailleMusic';

interface ScoreRendererProps {
  elements: ParsedElement[];
  width?: number;
  height?: number;
  beatsPerMeasure?: number;
  grandStaff?: boolean;
  maxLevel?: 1 | 2 | 3;
  scaleRatio?: number; // Valor discreto vindo do seletor (0.5 a 1.0)
  onNoteClick?: (sourceIndex: number) => void;
}

interface MeasureInfo {
  notes: ParsedElement[];
  barlineType: 'single' | 'end' | 'repeat-begin' | 'repeat-end' | 'repeat-both';
  begBarlineType?: 'repeat-begin';
  sourceIndex?: number;
}

export default function ScoreRenderer({
  elements,
  width = 1000,
  height = 300,
  beatsPerMeasure = 4,
  grandStaff,
  maxLevel = 3,
  scaleRatio = 0.8,
  onNoteClick,
}: ScoreRendererProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const tiesArrayRef = useRef<any[]>([]);

  // Pipeline síncrono de filtragem do Paywall de Conteúdo
  const filteredElements = useMemo(() => {
    return elements.filter(el => {
      if (el.level && el.level > maxLevel) return false;
      if (!PREMIUM_CONTENT_ENABLED && (el as any).isPremium) return false;
      return true;
    });
  }, [elements, maxLevel]);

  const measures = useMemo(() => {
    const output: MeasureInfo[] = [];
    let current: ParsedElement[] = [];
    for (const el of filteredElements) {
      if (el.type === 'barline') {
        output.push({ notes: current, barlineType: (el as any).barlineType ?? 'single' });
        current = [];
      } else {
        current.push(el);
      }
    }
    if (current.length > 0) output.push({ notes: current, barlineType: 'single' });
    return output;
  }, [filteredElements]);

  useEffect(() => {
    if (!containerRef.current || measures.length === 0) return;
    containerRef.current.innerHTML = '';
    tiesArrayRef.current = [];

    const calculatedScale = scaleRatio;
    const containerWidth = containerRef.current.clientWidth || 800;

    // Instanciação limpa do renderizador SVG do VexFlow 5
    const renderer = new Renderer(containerRef.current, Renderer.Backends.SVG);
    renderer.resize(containerWidth, 1200); // Altura vertical elástica para empilhamento
    const context = renderer.getContext();
    context.clear();
    context.scale(calculatedScale, calculatedScale);

    let currentX = 40;
    let currentY = 50;
    const staveWidth = 240;
    const maxRowWidth = (containerWidth / calculatedScale) - 60;

    const renderedNotesMap = new Map<number, StaveNote>();
    let prevStaveNote: StaveNote | null = null;

    measures.forEach((measure, idx) => {
      // Algoritmo de Wrap / Quebra Dinâmica Vertical de Linha
      if (currentX + staveWidth > maxRowWidth) {
        currentX = 40;
        currentY += 160; // Deslocamento vertical livre de colisões
      }

      const stave = new Stave(currentX, currentY, staveWidth);
      stave.setContext(context);

      // Reinjeção compulsória de cabeçalhos gráficos em quebras de sistema
      if (idx === 0 || currentX === 40) {
        stave.addClef('treble');
      }

      if (measure.barlineType === 'end') stave.setEndBarType(3);
      stave.draw();

      const mNotes = measure.notes.filter(n => n.type === 'note' || n.type === 'rest');
      const vexNotes: StaveNote[] = [];

      mNotes.forEach(el => {
        if (el.type === 'rest') {
          const vn = new StaveNote({ keys: ['b/4'], duration: (el as ParsedRest).vexDuration + 'r', clef: 'treble' });
          vn.setContext(context);
          vexNotes.push(vn);
        } else if (el.type === 'note') {
          const noteEl = el as ParsedNote;
          const vn = new StaveNote({ keys: [noteEl.vexKey], duration: noteEl.vexDuration, clef: 'treble' });
          
          if (noteEl.dotted) Dot.buildAndAttach([vn], { all: true });
          
          vn.setContext(context);
          vexNotes.push(vn);
          renderedNotesMap.set(noteEl.sourceIndex, vn);

          // Renderização Física de Arcos de Ligadura de Expressão e Prolongação (StaveTie)
          if (noteEl.slurType === 'stop' || noteEl.tieType === 'stop') {
            if (prevStaveNote) {
              const tie = new StaveTie({ first_note: prevStaveNote, last_note: vn });
              tiesArrayRef.current.push(tie);
            }
          }
          prevStaveNote = vn;
        }
      });

      if (vexNotes.length > 0) {
        const voice = new Voice({ numBeats: beatsPerMeasure, beatValue: 4 });
        voice.setMode(2);
        voice.addTickables(vexNotes);
        new Formatter().joinVoices([voice]).format([voice], staveWidth - 40);
        voice.draw(context, stave);
      }

      currentX += staveWidth;
    });

    // Desenho de todas as ligaduras empilhadas na pauta gráfica
    tiesArrayRef.current.forEach(t => t.setContext(context).draw());

  }, [measures, beatsPerMeasure, scaleRatio]);

  return <div ref={containerRef} className="w-full overflow-x-hidden overflow-y-auto min-h-[400px] bg-white p-2" />;
}