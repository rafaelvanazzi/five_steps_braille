import { useState, useEffect, useRef } from "react";
import SiteLayout from "@/components/SiteLayout";
import { parseBrailleMusic } from "@/lib/v2/brailleParserV2";
import type { ParseResult, PerkinsKeyState } from "@/lib/v2/brailleModelV2";
import ScoreRendererV2 from "@/components/v2/ScoreRendererV2";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

// --- COMPONENTE TECLADO PERKINS (Reutilizado do V1 para garantir funcionamento) ---
function PerkinsKeyboard({
  onChar,
  onSpace,
  onBackspace,
}: {
  onChar: (char: string) => void;
  onSpace: () => void;
  onBackspace: () => void;
}) {
  const [pressed, setPressed] = useState<Set<string>>(new Set());
  const pressedRef = useRef<Set<string>>(new Set());
  const activeDotsRef = useRef<PerkinsKeyState>({
    dot1: false, dot2: false, dot3: false,
    dot4: false, dot5: false, dot6: false,
  });

  // Função auxiliar para converter dots em caractere Braille
  const perkinsDotsToUnicode = (keys: PerkinsKeyState): string => {
    const dotValue = (keys.dot1 ? 1 : 0) + (keys.dot2 ? 2 : 0) + (keys.dot3 ? 4 : 0) +
                     (keys.dot4 ? 8 : 0) + (keys.dot5 ? 16 : 0) + (keys.dot6 ? 32 : 0);
    return String.fromCharCode(0x2800 + dotValue);
  };

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      if (["f", "d", "s", "j", "k", "l"].includes(key)) {
        e.preventDefault();
        if (key === "f") activeDotsRef.current.dot1 = true;
        if (key === "d") activeDotsRef.current.dot2 = true;
        if (key === "s") activeDotsRef.current.dot3 = true;
        if (key === "j") activeDotsRef.current.dot4 = true;
        if (key === "k") activeDotsRef.current.dot5 = true;
        if (key === "l") activeDotsRef.current.dot6 = true;
        pressedRef.current.add(key);
        setPressed(new Set(pressedRef.current));
      }
      if (key === " ") e.preventDefault();
      if (key === "backspace") e.preventDefault();
    };

    const up = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      if (key === " ") { e.preventDefault(); onSpace(); return; }
      if (key === "backspace") { e.preventDefault(); onBackspace(); return; }
      if (["f", "d", "s", "j", "k", "l"].includes(key)) {
        e.preventDefault();
        pressedRef.current.delete(key);
        setPressed(new Set(pressedRef.current));

        if (pressedRef.current.size === 0) {
          const dots = { ...activeDotsRef.current };
          if (dots.dot1 || dots.dot2 || dots.dot3 || dots.dot4 || dots.dot5 || dots.dot6) {
            onChar(perkinsDotsToUnicode(dots));
          }
          activeDotsRef.current = { dot1: false, dot2: false, dot3: false, dot4: false, dot5: false, dot6: false };
        }
      }
    };

    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
  }, [onChar, onSpace, onBackspace]);

  const keys = [
    { label: "S", sub: "Ponto 3", key: "s" },
    { label: "D", sub: "Ponto 2", key: "d" },
    { label: "F", sub: "Ponto 1", key: "f" },
    { label: "J", sub: "Ponto 4", key: "j" },
    { label: "K", sub: "Ponto 5", key: "k" },
    { label: "L", sub: "Ponto 6", key: "l" },
  ];

  return (
    <div className="flex flex-col items-center gap-2 py-2 select-none">
      <div className="flex gap-2 items-center">
        {keys.map((k, i) => (
          <div key={k.key} className="flex items-center">
            {i === 3 && <span className="inline-block w-6" />}
            <button
              className={`w-12 h-14 rounded-lg border-2 flex flex-col items-center justify-center transition-colors font-bold text-base ${
                pressed.has(k.key)
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-card text-card-foreground border-border hover:border-primary/50"
              }`}
              aria-label={`Tecla ${k.label} - ${k.sub}`}
            >
              <span>{k.label}</span>
              <span className="text-[9px] font-normal opacity-70">{k.sub}</span>
            </button>
          </div>
        ))}
      </div>
      <p className="text-[10px] text-muted-foreground">
        Espaço = Barra · Backspace = Apagar
     2024
      </p>
    </div>
  );
}
// --- FIM DO COMPONENTE TECLADO PERKINS ---

export default function BrailleEditorV2() {
  const [brailleContent, setBrailleContent] = useState("");
  const [parseResult, setParseResult] = useState<ParseResult | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Analisa o texto automaticamente sempre que ele muda
  useEffect(() => {
    if (brailleContent.trim()) {
      const result = parseBrailleMusic(brailleContent);
      setParseResult(result);
    } else {
      setParseResult(null);
    }
  }, [brailleContent]);

  const insertChar = (char: string) => {
    const textarea = textareaRef.current;
    if (textarea) {
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const newContent = brailleContent.slice(0, start) + char + brailleContent.slice(end);
      setBrailleContent(newContent);
      setTimeout(() => {
        textarea.selectionStart = textarea.selectionEnd = start + char.length;
        textarea.focus();
      }, 0);
    } else {
      setBrailleContent((prev) => prev + char);
    }
  };

  const handleBackspace = () => {
    const textarea = textareaRef.current;
    if (textarea) {
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      if (start !== end) {
        const newContent = brailleContent.slice(0, start) + brailleContent.slice(end);
        setBrailleContent(newContent);
        setTimeout(() => {
          textarea.selectionStart = textarea.selectionEnd = start;
          textarea.focus();
        }, 0);
      } else if (start > 0) {
        const newContent = brailleContent.slice(0, start - 1) + brailleContent.slice(start);
        setBrailleContent(newContent);
        setTimeout(() => {
          textarea.selectionStart = textarea.selectionEnd = start - 1;
          textarea.focus();
        }, 0);
      }
    } else {
      setBrailleContent((prev) => prev.slice(0, -1));
    }
  };

  return (
    <SiteLayout>
      <div className="container max-w-7xl py-6 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Editor de Musicografia Braille V2</h1>
          <span className="text-xs px-3 py-1 rounded-full bg-green-100 text-green-700 font-semibold">
            Parser Ativo (Graus 1, 2 e 3)
          </span>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Painel Esquerdo: Entrada */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-semibold">Texto em Braille</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <PerkinsKeyboard 
                onChar={insertChar} 
                onSpace={() => insertChar(" ")} 
                onBackspace={handleBackspace} 
              />
              <textarea
                ref={textareaRef}
                value={brailleContent}
                onChange={(e) => setBrailleContent(e.target.value)}
                className="w-full h-48 p-4 border rounded-lg bg-card text-card-foreground font-mono text-2xl leading-relaxed resize-none focus:outline-none focus:ring-2 focus:ring-primary/50"
                placeholder="Digite aqui (ex: ⠼⠙⠲ ⠐⠹⠱⠫⠻)..."
                spellCheck={false}
              />
            </CardContent>
          </Card>

          {/* Painel Direito: Visualização */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-semibold">Partitura (VexFlow)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="min-h-[200px] border rounded-lg bg-white p-2 overflow-x-auto flex items-center justify-center">
                  {parseResult && parseResult.measures.length > 0 && parseResult.measures[0].elements.length > 0 ? (
                    <ScoreRendererV2 
                      elements={parseResult.measures[0].elements} 
                      width={700} 
                      height={200} 
                    />
                  ) : (
                    <p className="text-gray-400 text-sm">Digite notas em Braille para ver a partitura aqui.</p>
                  )}
                </div>
              </CardContent>
