import { useState, useEffect, useRef } from "react";
import SiteLayout from "@/components/SiteLayout";
import { parseBrailleMusic, getQuickReference, type PerkinsKeyState, type QuickRefEntry } from "@/lib/v2/brailleModelV2";
import type { ParseResult } from "@/lib/v2/brailleModelV2";
import ScoreRendererV2 from "@/components/v2/ScoreRendererV2";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

// ─── COMPONENTE: TECLADO PERKINS ─────────────────────────────────────────────
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
        setPressed(new Set(ppressedRef.current));

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
            >
              <span>{k.label}</span>
              <span className="text-[9px] font-normal opacity-70">{k.sub}</span>
            </button>
          </div>
        ))}
      </div>
      <p className="text-[10px] text-muted-foreground">
        Espaço = Barra · Backspace = Apagar
      </p>
    </div>
  );
}

// ─── COMPONENTE: REFERÊNCIA RÁPIDA ───────────────────────────────────────────
function QuickReferencePanel({ onInsert }: { onInsert: (char: string) => void }) {
  const ref = getQuickReference();
  const [filter, setFilter] = useState<string>("all");

  const categories = [
    { key: "all", label: "Todos" },
    { key: "note-whole-half", label: "Semibreves / Mínimas" },
    { key: "note-half-32nd", label: "Mínimas / Fusas" },
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

  const filtered = filter === "all" ? ref : ref.filter((e: QuickRefEntry) => e.category === filter);

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
            key
