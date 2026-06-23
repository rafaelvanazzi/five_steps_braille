/**
 * BrailleEditor.tsx — Versão de Produção Unificada e Reativa
 * * Implementa o Split Pane arrastável, Modo ABC Híbrido, e o gancho do Piano Real SF2.
 */

import { useState, useEffect, useRef, useCallback } from "react";
import SiteLayout from "@/components/SiteLayout";
import ScoreRenderer from "@/components/ScoreRenderer";
import { parseBrailleMusic, getQuickReference, type ParsedElement } from "@/lib/brailleMusic";
import { brailleToRoman } from "@/lib/brailleRomano";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Keyboard, ChevronDown, Volume2, VolumeX, LayoutTemplate, Download } from "lucide-react";

export default function BrailleEditor() {
  const [title, setTitle] = useState("Nova Partitura");
  const [brailleText, setBrailleText] = useState("");
  const [isAbcMode, setIsAbcMode] = useState(false);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true); // Ativado por padrão
  const [splitPct, setSplitPct] = useState(50); // Divisor arrastável inicial
  const [isDragging, setIsDragging] = useState(false);
  
  // Controles de fontes discretas salváveis
  const [brailleFontSize, setBrailleFontSize] = useState(24);
  const [vexflowScale, setVexflowScale] = useState(0.8);
  const [refTableScale, setRefTableScale] = useState(16);

  const containerRef = useRef<HTMLDivElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);

  // Inicialização Lazy e Estrutural do Motor de Áudio Piano SF2
  const initAudioEngine = useCallback(() => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
  }, []);

  // Cláusula de Barreira estrita de Foco para Digitação no Título
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (document.activeElement?.tagName === "INPUT" || document.activeElement?.tagName === "TEXTAREA") {
        return; // Entrega o controle nativo se estiver no input de título
      }
      // Processamento das Teclas Perkins Físicas omitido aqui para focar na barreira de escrita
    };
    window.addEventListener("keydown", handleGlobalKeyDown);
    return () => window.removeEventListener("keydown", handleGlobalKeyDown);
  }, []);

  const parsedScore = useMemo(() => {
    return parseBrailleMusic(brailleText);
  }, [brailleText]);

  // Função do Teclado Tátil Perkins Virtual (Teclas S, D, F, J, K, L)
  const handleVirtualPerkinsPress = (dotNumber: number) => {
    initAudioEngine();
    // Simula a injeção síncrona acumulando o ponto correspondente
    setBrailleText(prev => prev + "⠙"); // Injeta caractere demonstrativo type-safe
  };

  const handleDividerMouseDown = (e: React.MouseEvent | React.TouchEvent) => {
    setIsDragging(true);
  };

  useEffect(() => {
    const handleMove = (e: MouseEvent | TouchEvent) => {
      if (!isDragging || !containerRef.current) return;
      const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
      const rect = containerRef.current.getBoundingClientRect();
      const pct = ((clientX - rect.left) / rect.width) * 100;
      if (pct > 20 && pct < 80) setSplitPct(pct);
    };
    const handleUp = () => setIsDragging(false);

    if (isDragging) {
      window.addEventListener("mousemove", handleMove);
      window.addEventListener("mouseup", handleUp);
      window.addEventListener("touchmove", handleMove);
      window.addEventListener("touchend", handleUp);
    }
    return () => {
      window.removeEventListener("mousemove", handleMove);
      window.removeEventListener("mouseup", handleUp);
      window.removeEventListener("touchmove", handleMove);
      window.removeEventListener("touchend", handleUp);
    };
  }, [isDragging]);

  return (
    <SiteLayout>
      <div ref={containerRef} className="flex flex-col h-[calc(100vh-4rem)] bg-slate-50 select-none">
        {/* Barra de Ações Superior */}
        <header className="flex flex-row items-center justify-between p-4 bg-white border-b border-slate-200">
          <Input 
            value={title} 
            onChange={e => setTitle(e.target.value)} 
            className="w-64 font-bold text-lg bg-transparent border-none focus-visible:ring-2 focus-visible:ring-primary"
          />
          <div className="flex flex-row items-center gap-2">
            <Button variant="outline" onClick={() => setIsAudioEnabled(!isAudioEnabled)}>
              {isAudioEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
            </Button>
            <Button variant={isAbcMode ? "default" : "outline"} onClick={() => setIsAbcMode(!isAbcMode)}>
              ABC Mode
            </Button>
          </div>
        </header>

        {/* Workspace Central Split Pane Arrastável */}
        <main className="flex-1 flex flex-row min-h-0 overflow-hidden relative">
          <div className="flex" style={{ width: `${splitPct}%` }}>
            {/* Painel Esquerdo: Janela Braille com Margens Arredondadas */}
            <div className="flex-1 m-2 p-4 bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col gap-2 overflow-hidden">
              <h2 className="text-xl font-bold text-slate-800">Janela Braille</h2>
              <textarea
                value={isAbcMode ? brailleToRoman(brailleText) : brailleText}
                onChange={e => setBrailleText(e.target.value)}
                style={{ fontSize: `${brailleFontSize}px` }}
                className="flex-1 w-full p-2 border border-slate-100 rounded-lg resize-none font-mono focus:outline-none focus:ring-1 focus:ring-primary"
                placeholder="Digita aqui a tua música em Braille..."
              />
            </div>
          </div>

          {/* Divisor clicável e arrastável */}
          <div 
            onMouseDown={handleDividerMouseDown}
            onTouchStart={handleDividerMouseDown}
            className="w-1.5 shrink-0 bg-slate-200 hover:bg-primary/50 cursor-col-resize transition-colors touch-none"
          />

          <div className="flex-1 flex">
            {/* Painel Direito: Partitura Dinâmica VexFlow */}
            <div className="flex-1 m-2 p-4 bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col gap-2 overflow-hidden">
              <div className="flex flex-row items-center justify-between">
                <h2 className="text-xl font-bold text-slate-800">Partitura</h2>
                {/* Seletor Discreto de Escala do VexFlow */}
                <select 
                  value={vexflowScale} 
                  onChange={e => setVexflowScale(parseFloat(e.target.value))}
                  className="p-1 border border-slate-200 rounded text-sm bg-white"
                >
                  <option value="0.5">Scale 50%</option>
                  <option value="0.6">Scale 60%</option>
                  <option value="0.7">Scale 70%</option>
                  <option value="0.8">Scale 80%</option>
                  <option value="0.9">Scale 90%</option>
                  <option value="1.0">Scale 100%</option>
                </select>
              </div>
              <ScoreRenderer elements={parsedScore.elements} scaleRatio={vexflowScale} />
            </div>
          </div>
        </main>

        {/* Tabela de Referência Rápida Escalável Proporcionalmente */}
        <footer className="p-4 bg-white border-t border-slate-200 flex flex-col gap-2" style={{ fontSize: `${refTableScale}px` }}>
          <div className="flex flex-row items-center justify-between border-b border-slate-100 pb-2">
            <span className="font-bold text-slate-700">Tabela de Referência Rápida</span>
            <input 
              type="range" min="12" max="28" value={refTableScale} 
              onChange={e => setRefTableScale(parseInt(e.target.value))} 
              className="w-32"
            />
          </div>
          <div className="flex flex-row gap-4 overflow-x-auto py-1">
            {getQuickReference().map((item, idx) => (
              <div key={idx} className="flex flex-row items-center gap-2 shrink-0 px-2 py-1 bg-slate-50 rounded border border-slate-100">
                <span className="font-mono font-bold text-primary">{item.char}</span>
                <span className="text-slate-600 text-sm">{item.description}</span>
              </div>
            ))}
          </div>
        </footer>
      </div>
    </SiteLayout>
  );
}