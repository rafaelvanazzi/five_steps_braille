import { useState } from "react";
import SiteLayout from "@/components/SiteLayout";
import ScoreRendererV2 from "@/components/v2/ScoreRendererV2";
import { parseBrailleMusicV2 } from "@/lib/v2/brailleParserV2";
import type { DifficultyGrade } from "@/lib/v2/brailleModelV2";

interface QuickRefEntry {
  char: string;
  displayChar?: string;
  description: string;
  dots: string;
  category: string;
}

const QUICK_REFERENCE_V2: QuickRefEntry[] = [
  // Notas (Grau 1)
  { char: "⠝", displayChar: "⠝", description: "Dó", dots: "1-4", category: "note-whole-half" },
  { char: "⠏", displayChar: "⠏", description: "Ré", dots: "1-2-4", category: "note-whole-half" },
  { char: "⠟", displayChar: "⠟", description: "Mi", dots: "1-2-4-5", category: "note-whole-half" },
  { char: "⠟", displayChar: "⠟", description: "Fá", dots: "1-2-4", category: "note-quarter" },
  { char: "⠛", displayChar: "⠛", description: "Sol", dots: "1-2-4-5", category: "note-quarter" },
  { char: "⠓", displayChar: "⠓", description: "Lá", dots: "1-2-5", category: "note-eighth" },
  { char: "⠧", displayChar: "⠧", description: "Si", dots: "1-2-3-6", category: "note-eighth" },
  
  // Pausas (Grau 1)
  { char: "⠧", displayChar: "𝄽", description: "Pausa de Semibreve", dots: "1-2-3-6", category: "rest" },
  { char: "⠧", displayChar: "𝄾", description: "Pausa de Mínima", dots: "1-2-3-6", category: "rest" },
  
  // Oitavas (Grau 2)
  { char: "⠈", displayChar: "8va", description: "Oitava", dots: "4-5", category: "octave" },
  
  // Alterações (Grau 1)
  { char: "⠡", displayChar: "♯", description: "Sustenido", dots: "1-5", category: "accidental" },
  { char: "⠢", displayChar: "♭", description: "Bemol", dots: "2-3-4", category: "accidental" },
  { char: "⠣", displayChar: "♮", description: "Bequadro", dots: "1-3-4", category: "accidental" },
  
  // Compassos (Grau 1)
  { char: "⠢⠼", displayChar: "4/4", description: "Compasso 4/4", dots: "2-3-4 / 3-4-5-6", category: "timesig" },
  { char: "⠢⠆", displayChar: "3/4", description: "Compasso 3/4", dots: "2-3-4 / 2-3", category: "timesig" },
  
  // Barras (Grau 1)
  { char: "⠇", displayChar: "|", description: "Barra de Compasso", dots: "1-2-3", category: "barline" },
  
  // Intervalos (Grau 3)
  { char: "⠬", displayChar: "3ª", description: "Intervalo de Terça", dots: "3-4-5", category: "interval" },
  { char: "⠭", displayChar: "5ª", description: "Intervalo de Quinta", dots: "2-3-4-5", category: "interval" },
];

function QuickReferencePanel({ onInsert }: { onInsert: (char: string) => void }) {
  const [filter, setFilter] = useState<string>("all");

  const categories = [
    { key: "all", label: "Todos" },
    { key: "note-whole-half", label: "Semibreves / Mínimas" },
    { key: "note-quarter", label: "Semínimas" },
    { key: "note-eighth", label: "Colcheias" },
    { key: "rest", label: "Pausas" },
    { key: "octave", label: "Oitavas" },
    { key: "accidental", label: "Alterações" },
    { key: "timesig", label: "Compassos" },
    { key: "barline", label: "Barras" },
    { key: "interval", label: "Intervalos" },
    { key: "other", label: "Outros" },
  ];

  const filtered = filter === "all" ? QUICK_REFERENCE_V2 : QUICK_REFERENCE_V2.filter((e: QuickRefEntry) => e.category === filter);

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1">
        {categories.map((cat) => (
          <button
            key={cat.key}
            onClick={() => setFilter(cat.key)}
            className={`px-2 py-0.5 text-xs rounded-md transition-colors ${
              filter === cat.key
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-accent"
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-4 sm:grid-cols-6 gap-1 max-h-48 overflow-y-auto">
        {filtered.map((entry, i) => (
          <button
            key={i}
            onClick={() => onInsert(entry.char)}
            className="flex flex-col items-center p-1.5 rounded-md border border-border hover:bg-accent transition-colors"
            title={`${entry.description} (Pontos ${entry.dots})`}
          >
            <span className="text-xl leading-none">{entry.displayChar ?? entry.char}</span>
            <span className="text-[8px] text-muted-foreground mt-0.5 truncate w-full text-center">
              {entry.description}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

export default function BrailleEditorV2() {
  const [brailleContent, setBrailleContent] = useState("");
  const [maxGrade, setMaxGrade] = useState<DifficultyGrade>(1);

  const handleInsert = (char: string) => {
    setBrailleContent((prev) => prev + char);
  };

  const handleParse = () => {
    const result = parseBrailleMusicV2(brailleContent);
    console.log("Parsed result:", result);
  };

  return (
    <SiteLayout>
      <div className="container max-w-7xl py-4 space-y-3">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Editor de Musicografia Braille V2</h1>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Grau máximo:</span>
            <span className="text-lg font-semibold text-primary">{maxGrade}</span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="space-y-2">
            <h2 className="text-sm font-semibold">Texto em Braille</h2>
            <textarea
              value={brailleContent}
              onChange={(e) => setBrailleContent(e.target.value)}
              className="w-full h-64 p-3 border rounded-lg font-mono text-2xl"
              placeholder="Digite em Braille musical..."
            />
            <div className="flex gap-2">
              <button
                onClick={handleParse}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90"
              >
                Analisar
              </button>
              <button
                onClick={() => setBrailleContent("")}
                className="px-4 py-2 bg-muted text-muted-foreground rounded-lg hover:bg-muted/90"
              >
                Limpar
              </button>
            </div>
            <QuickReferencePanel onInsert={handleInsert} />
          </div>

          <div className="space-y-2">
            <h2 className="text-sm font-semibold">Partitura (VexFlow)</h2>
            <ScoreRendererV2 elements={[]} />
          </div>
        </div>
      </div>
    </SiteLayout>
  );
}
