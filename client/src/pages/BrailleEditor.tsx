function QuickReferencePanel({ onInsert }: { onInsert: (char: string) => void }) {
  const ref = QUICK_REFERENCE;
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

  const filtered = filter === "all" ? ref : ref.filter((e) => e.category === filter);

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
