import { useState, useEffect, useRef } from "react";
import SiteLayout from "@/components/SiteLayout";
import { parseBrailleMusic } from "@/lib/v2/brailleParserV2";
import type { ParseResult, PerkinsKeyState } from "@/lib/v2/brailleModelV2";
import ScoreRendererV2 from "@/components/v2/ScoreRendererV2";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

// --- COMPONENTE TECLADO PERKINS ---
function PerkinsKeyboard({ onChar, onSpace, onBackspace }: { onChar: (char: string) => void; onSpace: () => void; onBackspace: () => void }) {
  const [pressed, setPressed] = useState<Set<string>>(new Set());
  const pressedRef = useRef<Set<string>>(new Set());
  const activeDotsRef = useRef<PerkinsKeyState>({ dot1: false, dot2: false, dot3: false, dot4: false, dot5: false, dot6: false });

  const perkinsDotsToUnicode = (keys: PerkinsKeyState): string => {
    const dotValue = (keys.dot1 ? 1 : 0) + (keys.dot2 ? 2 : 0) + (keys.dot3 ? 4 : 0) + (keys.dot4 ? 8 : 0) + (keys.dot5 ? 16 : 0) + (keys.dot6 ? 32 : 0);
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
    return () => { window.removeEventListener("keydown", down); window.removeEventListener("keyup", up); };
  }, [onChar, onSpace, onBackspace]);

  const keys = [
    { label: "S", sub: "Ponto 3", key: "s" }, { label: "D", sub: "Ponto 2", key: "d" }, { label: "F", sub: "Ponto 1", key: "f" },
    { label: "J", sub: "Ponto 4", key: "j" }, { label: "K", sub: "Ponto 5", key: "k" }, { label: "L", sub: "Ponto 6", key: "l" },
  ];

  return (
    <div className="flex flex-col items-center gap-2 py-2 select-none">
      <div className="flex gap-2 items-center">
        {keys.map((k, i) => (
          <div key={k.key} className="flex items-center">
            {i === 3 && <span className="inline-block w-6" />}
            <button className={`w-12 h-14 rounded-lg border-2 flex flex-col items-center justify-center transition-colors font-bold text-base ${pressed.has(k.key) ? "bg-primary text-primary-foreground border-primary" : "bg-card text-card-foreground border-border hover:border-primary/50"}`}>
              <span>{k.label}</span><span className="text-[9px] font-normal opacity-70">{k.sub}</span>
            </button>
          </div>
        ))}
      </div>
      <p className="text-[10px] text-muted-foreground">Espaço = Barra · Backspace = Apagar</p>
    </div>
  );
}

// --- COMPONENTE REFERÊNCIA RÁPIDA ---
function QuickReferencePanel({ onInsert }: { onInsert: (char: string) => void }) {
  const ref = [
    { char: '⠙', dots: '1,4,5', description: 'Dó colcheia', category: 'note-eighth' }, { char: '⠑', dots: '1,5', description: 'Ré colcheia', category: 'note-eighth' },
    { char: '⠋', dots: '1,2,4', description: 'Mi colcheia', category: 'note-eighth' }, { char: '⠛', dots: '1,2,4,5', description: 'Fá colcheia', category: 'note-eighth' },
    { char: '⠓', dots: '1,2,5', description: 'Sol colcheia', category: 'note-eighth' }, { char: '⠊', dots: '2,4', description: 'Lá colcheia', category: 'note-eighth' },
    { char: '⠚', dots: '2,4,5', description: 'Si colcheia', category: 'note-eighth' },
    { char: '⠹', dots: '1,4,5,6', description: 'Dó semínima', category: 'note-quarter' }, { char: '⠱', dots: '1,5,6', description: 'Ré semínima', category: 'note-quarter' },
    { char: '⠫', dots: '1,2,4,6', description: 'Mi semínima', category: 'note-quarter' }, { char: '⠻', dots: '1,2,4,5,6', description: 'Fá semínima', category: 'note-quarter' },
    { char: '⠳', dots: '1,2,5,6', description: 'Sol semínima', category: 'note-quarter' }, { char: '⠪', dots: '2,4,6', description: 'Lá semínima', category: 'note-quarter' },
    { char: '⠺', dots: '2,4,5,6', description: 'Si semínima', category: 'note-quarter' },
    { char: '⠝', dots: '1,3,4,5', description: 'Dó mínima', category: 'note-half-32nd' }, { char: '⠕', dots: '1,3,5', description: 'Ré mínima', category: 'note-half-32nd' },
    { char: '⠏', dots: '1,2,3,4', description: 'Mi mínima', category: 'note-half-32nd' }, { char: '⠟', dots: '1,2,3,4,5', description: 'Fá mínima', category: 'note-half-32nd' },
    { char: '⠗', dots: '1,2,3,5', description: 'Sol mínima', category: 'note-half-32nd' }, { char: '⠎', dots: '2,3,4', description: 'Lá mínima', category: 'note-half-32nd' },
    { char: '⠞', dots: '2,3,4,5', description: 'Si mínima', category: 'note-half-32nd' },
    { char: '⠽', dots: '1,3,4,5,6', description: 'Dó semibreve', category: 'note-whole-half' }, { char: '⠵', dots: '1,3,5,6', description: 'Ré semibreve', category: 'note-whole-half' },
    { char: '⠯', dots: '1,2,3,4,6', description: 'Mi semibreve', category: 'note-whole-half' }, { char: '⠿', dots: '1,2,3,4,5,6', description: 'Fá semibreve', category: 'note-whole-half' },
    { char: '⠷', dots: '1,2,3,5,6', description: 'Sol semibreve', category: 'note-whole-half' }, { char: '⠮', dots: '2,3,4,6', description: 'Lá semibreve', category: 'note-whole-half' },
    { char: '⠾', dots: '2,3,4,5,6', description: 'Si semibreve', category: 'note-whole-half' },
    { char: '⠭', dots: '1,3,4,6', description: 'Pausa colcheia', category: 'rest' }, { char: '⠧', dots: '1,2,3,6', description: 'Pausa semínima', category: 'rest' },
    { char: '⠥', dots: '1,3,6', description: 'Pausa mínima', category: 'rest' }, { char: '⠍', dots: '1,3,4', description: 'Pausa semibreve', category: 'rest' },
    { char: '⠈', dots: '4', description: '1ª oitava', category: 'octave' }, { char: '⠘', dots: '4,5', description: '2ª oitava', category: 'octave' },
    { char: '⠸', dots: '4,5,6', description: '3ª oitava', category: 'octave' }, { char: '⠐', dots: '5', description: '4ª oitava (central)', category: 'octave' },
    { char: '⠨', dots: '4,6', description: '5ª oitava', category: 'octave' }, { char: '⠰', dots: '5,6', description: '6ª oitava', category: 'octave' },
    { char: '⠠', dots: '6', description: '7ª oitava', category: 'octave' },
    { char: '⠩', dots: '1,4,6', description: 'Sustenido', category: 'accidental' }, { char: '⠣', dots: '1,2,6', description: 'Bemol', category: 'accidental' },
    { char: '⠡', dots: '1,6', description: 'Bequadro', category: 'accidental' },
    { char: '⠼⠙⠲', dots: '3,4,5,6 + 1,4,5 + 2,5,6', description: '4/4', category: 'timesig' }, { char: '⠼⠉⠲', dots: '3,4,5,6 + 1,4 + 2,5,6', description: '3/4', category: 'timesig' },
    { char: '⠼⠃⠲', dots: '3,4,5,6 + 1,2 + 2,5,6', description: '2/4', category: 'timesig' }, { char: '⠼⠋⠦', dots: '3,4,5,6 + 1,2,4 + 2,3,6', description: '6/8', category: 'timesig' },
    { char: ' ', dots: '0', description: 'Barra simples (espaço)', category: 'barline' }, { char: '⠣⠅', dots: '1,2,6 + 1,3', description: 'Barra final', category: 'barline' },
    { char: '⠣⠶', dots: '1,2,6 + 2,3,5,6', description: 'Ritornelo início', category: 'barline' }, { char: '⠣⠆', dots: '1,2,6 + 2,3', description: 'Ritornelo fim', category: 'barline' },
    { char: '⠌', dots: '3,4', description: '2ª', category: 'interval' }, { char: '⠬', dots: '3,4,6', description: '3ª', category: 'interval' },
    { char: '⠼', dots: '3,4,5,6', description: '4ª', category: 'interval' }, { char: '⠔', dots: '3,5', description: '5ª', category: 'interval' },
    { char: '⠴', dots: '3,5,6', description: '6ª', category: 'interval' }, { char: '⠒', dots: '2,5', description: '7ª', category: 'interval' },
    { char: '⠤', dots: '3,6', description: '8ª', category: 'interval' },
    { char: '⠄', dots: '3', description: 'Ponto de aumento', category: 'other' }, { char: '⠉', dots: '1,4', description: 'Ligadura de expressão', category: 'other' },
  ];
  
  const [filter, setFilter] = useState<string>("all");
  const categories = [
    { key: "all", label: "Todos" }, { key: "note-whole-half", label: "Semibreves / Mínimas" }, { key: "note-half-32nd", label: "Mínimas / Fusas" },
    { key: "note-quarter", label: "Semínimas" }, { key: "note-eighth", label: "Colcheias" }, { key: "rest", label: "Pausas" },
    { key: "octave", label: "Oitavas" }, { key: "accidental", label: "Alterações" }, { key: "timesig", label: "Compassos" },
    { key: "barline", label: "Barras" }, { key: "interval", label: "Intervalos" }, { key: "other", label: "Outros" },
  ];

  const filtered = filter === "all" ? ref : ref.filter((e: any) => e.category === filter);

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1">
        {categories.map((cat) => (
          <button key={cat.key} onClick={() => setFilter(cat.key)} className={`px-2 py-0.5 text-xs rounded-md transition-colors ${filter === cat.key ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-accent"}`}>
            {cat.label}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-4 sm:grid-cols-6 gap-1 max-h-48 overflow-y-auto">
        {filtered.map((entry: any, i: number) => (
          <button key={i} onClick={() => onInsert(entry.char)} className="flex flex-col items-center p-1.5 rounded-md border border-border hover:bg-accent transition-colors" title={`${entry.description} (Pontos ${entry.dots})`}>
            <span className="text-xl leading-none">{entry.char}</span>
            <span className="text-[8px] text-muted-foreground mt-0.5 truncate w-full text-center">{entry.description}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

// --- PÁGINA PRINCIPAL ---
export default function BrailleEditorV2() {
  const [brailleContent, setBrailleContent] = useState("");
  const [parseResult, setParseResult] = useState<ParseResult | null>(null);
  const [showReference, setShowReference] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

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
      setTimeout(() => { textarea.selectionStart = textarea.selectionEnd = start + char.length; textarea.focus(); }, 0);
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
        setTimeout(() => { textarea.selectionStart = textarea.selectionEnd = start; textarea.focus(); }, 0);
      } else if (start > 0) {
        const newContent = brailleContent.slice(0, start - 1) + brailleContent.slice(start);
        setBrailleContent(newContent);
        setTimeout(() => { textarea.selectionStart = textarea.selectionEnd = start - 1; textarea.focus(); }, 0);
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
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setShowReference(!showReference)}>
              {showReference ? "Ocultar Referência" : "Mostrar Referência"}
            </Button>
            <span className="text-xs px-3 py-1 rounded-full bg-green-100 text-green-700 font-semibold flex items-center">Parser Ativo (Graus 1 a 5)</span>
          </div>
        </div>

        {showReference && (
          <Card>
            <CardHeader className="py-2"><CardTitle className="text-sm">Referência Rápida de Símbolos</CardTitle></CardHeader>
            <CardContent className="pt-0"><QuickReferencePanel onInsert={insertChar} /></CardContent>
          </Card>
        )}
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader><CardTitle className="text-sm font-semibold">Texto em Braille</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <PerkinsKeyboard onChar={insertChar} onSpace={() => insertChar(" ")} onBackspace={handleBackspace} />
              <textarea
                ref={textareaRef} value={brailleContent} onChange={(e) => setBrailleContent(e.target.value)}
                className="w-full h-48 p-4 border rounded-lg bg-card text-card-foreground font-mono text-2xl leading-relaxed resize-none focus:outline-none focus:ring-2 focus:ring-primary/50"
                placeholder="Digite aqui (ex: ⠼⠙⠲ ⠐⠹⠱⠫⠻)..." spellCheck={false}
              />
            </CardContent>
          </Card>

          <div className="space-y-6">
            <Card>
              <CardHeader><CardTitle className="text-sm font-semibold">Partitura (VexFlow)</CardTitle></CardHeader>
              <CardContent>
                <div className="min-h-[200px] border rounded-lg bg-white p-2 overflow-x-auto flex items-center justify-center">
                  {parseResult && parseResult.measures.length > 0 && parseResult.measures[0].elements.length > 0 ? (
                    <ScoreRendererV2 elements={parseResult.measures[0].elements} width={700} height={200} />
                  ) : (
                    <p className="text-gray-400 text-sm">Digite notas em Braille para ver a partitura aqui.</p>
                  )}
                </div>
              </CardContent>
            </Card>

            {parseResult && (
              <Card>
                <CardHeader><CardTitle className="text-sm font-semibold">Diagnóstico do Parser</CardTitle></CardHeader>
                <CardContent className="text-sm space-y-2">
                  <div className="flex justify-between border-b pb-2">
                    <span className="text-muted-foreground">Elementos reconhecidos:</span>
                    <span className="font-bold">{parseResult.measures[0]?.elements.length || 0}</span>
                  </div>
                  {parseResult.errors.length > 0 && (
                    <div className="bg-red-50 text-red-700 p-3 rounded text-xs border border-red-200">
                      <strong>⚠️ Erros:</strong>
                      <ul className="list-disc list-inside mt-1">
                        {parseResult.errors.map((err, i) => (<li key={i}>{err.message}</li>))}
                      </ul>
                    </div>
                  )}
                  <details className="mt-2">
                    <summary className="cursor-pointer text-xs text-blue-600 hover:underline">Ver JSON bruto do parser</summary>
                    <pre className="text-[10px] mt-2 bg-gray-100 p-2 rounded overflow-auto max-h-40">
                      {JSON.stringify(parseResult.measures[0]?.elements, null, 2)}
                    </pre>
                  </details>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </SiteLayout>
  );
}
