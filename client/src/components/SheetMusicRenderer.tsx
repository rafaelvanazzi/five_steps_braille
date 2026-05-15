import React, { useEffect, useRef } from "react";
import { Renderer, Stave, StaveNote, Voice, Formatter, Beam, Accidental } from "vexflow";

interface SheetMusicRendererProps {
  brailleContent: string;
  language: "pt" | "en" | "es";
}

// Mapeamento de símbolos Braille para notas musicais
// Formato simplificado para demonstração
const BRAILLE_TO_NOTE_MAP: Record<string, { note: string; octave: number; duration: string }> = {
  // Notas básicas (C, D, E, F, G, A, B)
  "\u2801": { note: "C", octave: 4, duration: "q" }, // Ponto 1
  "\u2802": { note: "D", octave: 4, duration: "q" }, // Ponto 2
  "\u2804": { note: "E", octave: 4, duration: "q" }, // Ponto 3
  "\u2808": { note: "F", octave: 4, duration: "q" }, // Ponto 4
  "\u2810": { note: "G", octave: 4, duration: "q" }, // Ponto 5
  "\u2820": { note: "A", octave: 4, duration: "q" }, // Ponto 6
  "\u2840": { note: "B", octave: 4, duration: "q" }, // Ponto 7
  // Durações (semínima, colcheia, etc.)
  "\u2803": { note: "C", octave: 4, duration: "h" }, // Mínima
  "\u2806": { note: "C", octave: 4, duration: "w" }, // Semibreve
  "\u280c": { note: "C", octave: 4, duration: "8" }, // Colcheia
};

export default function SheetMusicRenderer({ brailleContent, language }: SheetMusicRendererProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<Renderer | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    try {
      // Limpar renderizador anterior
      if (rendererRef.current) {
        const canvas = containerRef.current.querySelector("canvas");
        if (canvas) canvas.remove();
      }

      // Criar novo renderizador
      const renderer = new Renderer(containerRef.current, Renderer.Backends.CANVAS);
      rendererRef.current = renderer;
      renderer.resize(containerRef.current.clientWidth, 300);

      const context = renderer.getContext();
      context.setFillStyle("#000000");
      context.setStrokeStyle("#000000");

      // Criar duas pautas (treble e bass)
      const staveTop = new Stave(10, 40, 500);
      staveTop.addClef("treble").addTimeSignature("4/4").setContext(context).draw();

      const staveBottom = new Stave(10, 150, 500);
      staveBottom.addClef("bass").addTimeSignature("4/4").setContext(context).draw();

      // Converter conteúdo Braille em notas
      const notes: StaveNote[] = [];
      if (brailleContent.length > 0) {
        for (let i = 0; i < Math.min(brailleContent.length, 8); i++) {
          const char = brailleContent[i];
          const noteData = BRAILLE_TO_NOTE_MAP[char];

          if (noteData) {
            const note = new StaveNote({
              keys: [`${noteData.note.toLowerCase()}/${noteData.octave}`],
              duration: noteData.duration,
            });
            notes.push(note);
          } else {
            // Pausa se não reconhecer
            const note = new StaveNote({
              keys: ["b/4"],
              duration: "q",
            });
            note.addModifier(new Accidental("n"));
            notes.push(note);
          }
        }
      } else {
        // Notas vazias para demonstração
        for (let i = 0; i < 4; i++) {
          const note = new StaveNote({
            keys: ["c/4"],
            duration: "q",
          });
          notes.push(note);
        }
      }

      // Criar voice e adicionar notas
      const voice = new Voice({ numBeats: 4, beatValue: 4 });
      voice.addTickables(notes);

      // Formatar e desenhar
      const formatter = new Formatter();
      formatter.joinVoices([voice]).format([voice], 490);
      voice.draw(context, staveTop);
    } catch (error) {
      console.error("Error rendering sheet music:", error);
    }
  }, [brailleContent]);

  return (
    <div className="w-full h-full bg-white rounded border">
      <div
        ref={containerRef}
        className="w-full h-full flex items-center justify-center"
        style={{ minHeight: "350px" }}
      />
    </div>
  );
}
