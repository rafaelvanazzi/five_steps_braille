import { useState, useCallback, useEffect, useRef, useMemo } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { getLoginUrl } from "@/const";
import SiteLayout from "@/components/SiteLayout";
import ScoreRenderer from "@/components/ScoreRenderer";
import {
  parseBrailleMusic,
  perkinsDotsToUnicode,
  describeBrailleChar,
  unicodeToDots,
  getQuickReference,
  type ParsedElement,
  type PerkinsKeyState,
} from "@/lib/brailleMusic";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import {
  ArrowLeft,
  Plus,
  Trash2,
  Download,
  FileText,
  Music,
  Keyboard,
  Info,
} from "lucide-react";

// ─── BRAILLE CELL VISUAL ───────────────────────────────────────────────────────

function BrailleCell({ char, size = 32 }: { char: string; size?: number }) {
  const dots = unicodeToDots(char);
  const dotSize = size * 0.18;
  const gap = size * 0.28;
  const offsetX = size * 0.28;
  const offsetY = size * 0.12;

  return (
    <svg
      width={size}
      height={size * 1.3}
      viewBox={`0 0 ${size} ${size * 1.3}`}
      className="inline-block"
      role="img"
      aria-label={describeBrailleChar(char)}
    >
      <rect width={size} height={size * 1.3} rx={3} fill="transparent" />
      {[1, 2, 3, 4, 5, 6].map((dot) => {
        const col = dot <= 3 ? 0 : 1;
        const row = dot <= 3 ? dot - 1 : dot - 4;
        const cx = offsetX + col * gap;
        const cy = offsetY + row * gap;
        const active = dots.includes(dot);
        return (
          <circle
            key={dot}
            cx={cx}
            cy={cy}
            r={dotSize}
            fill={active ? "oklch(0.28 0.09 255)" : "#d1d5db"}
            stroke={active ? "oklch(0.28 0.09 255)" : "#9ca3af"}
            strokeWidth={0.5}
          />
        );
      })}
    </svg>
  );
}

// ─── PERKINS KEYBOARD COMPONENT ────────────────────────────────────────────────

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
    dot1: false,
    dot2: false,
    dot3: false,
    dot4: false,
    dot5: false,
    dot6: false,
  });

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
      if (key === " ") {
        e.preventDefault();
        onSpace();
        return;
      }
      if (key === "backspace") {
        e.preventDefault();
        onBackspace();
        return;
      }
      if (["f", "d", "s", "j", "k", "l"].includes(key)) {
        e.preventDefault();
        pressedRef.current.delete(key);
        setPressed(new Set(pressedRef.current));

        if (pressedRef.current.size === 0) {
          const dots = { ...activeDotsRef.current };
          if (dots.dot1 || dots.dot2 || dots.dot3 || dots.dot4 || dots.dot5 || dots.dot6) {
            const char = perkinsDotsToUnicode(dots);
            onChar(char);
          }
          activeDotsRef.current = {
            dot1: false, dot2: false, dot3: false,
            dot4: false, dot5: false, dot6: false,
          };
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
    <div className="flex flex-col items-center gap-3 py-4">
      <p className="text-sm text-muted-foreground">
        Pressione as teclas simultaneamente e solte para gerar o caractere Braille
      </p>
      <div className="flex gap-2 items-center">
        {keys.map((k, i) => (
          <div key={k.key} className="flex items-center">
            {i === 3 && <span className="inline-block w-8" />}
            <button
              className={`w-14 h-16 rounded-lg border-2 flex flex-col items-center justify-center transition-colors font-bold text-lg ${
                pressed.has(k.key)
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-card text-card-foreground border-border hover:border-primary/50"
              }`}
              aria-label={`Tecla ${k.label} - ${k.sub}`}
              tabIndex={-1}
            >
              <span>{k.label}</span>
              <span className="text-[10px] font-normal opacity-70">{k.sub}</span>
            </button>
          </div>
        ))}
      </div>
      <p className="text-xs text-muted-foreground">
        Espaço = Barra de compasso · Backspace = Apagar
      </p>
    </div>
  );
}

// ─── QUICK REFERENCE PANEL ─────────────────────────────────────────────────────

function QuickReferencePanel({ onInsert }: { onInsert: (char: string) => void }) {
  const ref = useMemo(() => getQuickReference(), []);
  const [filter, setFilter] = useState<string>("all");

  const categories = [
    { key: "all", label: "Todos" },
    { key: "note-quarter", label: "Semínimas" },
    { key: "note-eighth", label: "Colcheias" },
    { key: "note-half", label: "Mínimas" },
    { key: "note-whole", label: "Semibreves" },
    { key: "rest", label: "Pausas" },
    { key: "octave", label: "Oitavas" },
    { key: "accidental", label: "Alterações" },
  ];

  const filtered = filter === "all" ? ref : ref.filter((e) => e.category === filter);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-1">
        {categories.map((cat) => (
          <button
            key={cat.key}
            onClick={() => setFilter(cat.key)}
            className={`px-2 py-1 text-xs rounded-md transition-colors ${
              filter === cat.key
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-accent"
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-4 sm:grid-cols-6 gap-1 max-h-64 overflow-y-auto">
        {filtered.map((entry, i) => (
          <button
            key={i}
            onClick={() => onInsert(entry.char)}
            className="flex flex-col items-center p-2 rounded-md border border-border hover:bg-accent transition-colors"
            title={`${entry.description} (Pontos ${entry.dots})`}
          >
            <span className="text-2xl leading-none">{entry.char}</span>
            <span className="text-[9px] text-muted-foreground mt-1 truncate w-full text-center">
              {entry.description}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── MAIN EDITOR PAGE ──────────────────────────────────────────────────────────

export default function BrailleEditor() {
  // ALL hooks before any conditional return
  const { user, loading: authLoading } = useAuth({ redirectOnUnauthenticated: true });
  const projectsQuery = trpc.editor.list.useQuery(undefined, { enabled: !!user });
  const createMutation = trpc.editor.create.useMutation();
  const updateMutation = trpc.editor.update.useMutation();
  const deleteMutation = trpc.editor.delete.useMutation();
  const exportMutation = trpc.editor.export.useMutation();
  const utils = trpc.useUtils();

  const [currentProjectId, setCurrentProjectId] = useState<number | null>(null);
  const [projectTitle, setProjectTitle] = useState("");
  const [brailleContent, setBrailleContent] = useState("");
  const [inputMode, setInputMode] = useState<"perkins" | "standard">("standard");
  const [showReference, setShowReference] = useState(false);
  const [showProjects, setShowProjects] = useState(true);
  const [parsedElements, setParsedElements] = useState<ParsedElement[]>([]);
  const [saveStatus, setSaveStatus] = useState<"saved" | "saving" | "unsaved">("saved");
  const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [scoreWidth, setScoreWidth] = useState(800);
  const scoreContainerRef = useRef<HTMLDivElement>(null);

  // Parse braille content whenever it changes
  useEffect(() => {
    if (brailleContent.trim()) {
      try {
        const result = parseBrailleMusic(brailleContent);
        setParsedElements(result.elements);
      } catch {
        setParsedElements([]);
      }
    } else {
      setParsedElements([]);
    }
  }, [brailleContent]);

  // Auto-save
  useEffect(() => {
    if (!currentProjectId || !brailleContent) return;
    setSaveStatus("unsaved");

    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    autoSaveTimerRef.current = setTimeout(() => {
      setSaveStatus("saving");
      updateMutation.mutate(
        { id: currentProjectId, contentBraille: brailleContent, title: projectTitle },
        {
          onSuccess: () => {
            setSaveStatus("saved");
            utils.editor.list.invalidate();
          },
          onError: () => setSaveStatus("unsaved"),
        }
      );
    }, 2000);

    return () => {
      if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    };
  }, [brailleContent, currentProjectId, projectTitle]);

  // Measure score container width
  useEffect(() => {
    if (!scoreContainerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setScoreWidth(Math.max(400, entry.contentRect.width - 16));
      }
    });
    observer.observe(scoreContainerRef.current);
    return () => observer.disconnect();
  }, []);

  // ─── HANDLERS ──────────────────────────────────────────────────────────────

  const insertChar = useCallback((char: string) => {
    setBrailleContent((prev) => prev + char);
  }, []);

  const insertSpace = useCallback(() => {
    setBrailleContent((prev) => prev + " ");
  }, []);

  const handleBackspace = useCallback(() => {
    setBrailleContent((prev) => prev.slice(0, -1));
  }, []);

  const handleCreateProject = useCallback(async () => {
    const title = "Novo Projeto " + new Date().toLocaleDateString("pt-BR");
    try {
      const project = await createMutation.mutateAsync({ title, language: "pt" });
      setCurrentProjectId(project.id);
      setProjectTitle(title);
      setBrailleContent("");
      setShowProjects(false);
      utils.editor.list.invalidate();
      toast.success("Projeto criado com sucesso!");
    } catch {
      toast.error("Erro ao criar projeto");
    }
  }, [createMutation, utils]);

  const handleOpenProject = useCallback(
    (project: { id: number; title: string; contentBraille: string | null }) => {
      setCurrentProjectId(project.id);
      setProjectTitle(project.title);
      setBrailleContent(project.contentBraille || "");
      setShowProjects(false);
      setSaveStatus("saved");
    },
    []
  );

  const handleDeleteProject = useCallback(
    async (id: number) => {
      if (!confirm("Tem certeza que deseja excluir este projeto?")) return;
      try {
        await deleteMutation.mutateAsync({ id });
        if (currentProjectId === id) {
          setCurrentProjectId(null);
          setBrailleContent("");
          setShowProjects(true);
        }
        utils.editor.list.invalidate();
        toast.success("Projeto excluído");
      } catch {
        toast.error("Erro ao excluir projeto");
      }
    },
    [deleteMutation, currentProjectId, utils]
  );

  const handleExport = useCallback(
    async (format: "brf" | "txt" | "musicxml") => {
      if (!currentProjectId) return;
      try {
        const result = await exportMutation.mutateAsync({ id: currentProjectId, format });
        const blob = new Blob([result.content], { type: "text/plain;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = result.filename;
        a.click();
        URL.revokeObjectURL(url);
        toast.success(`Exportado como ${format.toUpperCase()}`);
      } catch {
        toast.error("Erro ao exportar");
      }
    },
    [currentProjectId, exportMutation]
  );

  // ─── LOADING / AUTH STATES ─────────────────────────────────────────────────

  if (authLoading) {
    return (
      <SiteLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      </SiteLayout>
    );
  }

  if (!user) {
    return (
      <SiteLayout>
        <div className="container max-w-2xl py-20 text-center space-y-6">
          <Music className="w-16 h-16 mx-auto text-primary" />
          <h1 className="text-3xl font-bold">Editor de Musicografia Braille</h1>
          <p className="text-muted-foreground text-lg">
            Escreva em Braille musical e veja a partitura aparecer em tempo real.
            Faça login para começar.
          </p>
          <Button asChild size="lg">
            <a href={getLoginUrl()}>Fazer Login</a>
          </Button>
        </div>
      </SiteLayout>
    );
  }

  // ─── PROJECT LIST VIEW ─────────────────────────────────────────────────────

  if (showProjects) {
    return (
      <SiteLayout>
        <div className="container max-w-4xl py-10 space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <a href="/" className="text-muted-foreground hover:text-foreground transition-colors">
                <ArrowLeft className="w-5 h-5" />
              </a>
              <h1 className="text-2xl font-bold">Editor de Musicografia Braille</h1>
            </div>
            <Button onClick={handleCreateProject} disabled={createMutation.isPending}>
              <Plus className="w-4 h-4 mr-2" />
              Novo Projeto
            </Button>
          </div>

          <p className="text-muted-foreground">
            Escreva em Braille musical usando o teclado Perkins ou o teclado padrão.
            A partitura é renderizada em tempo real conforme você digita.
          </p>

          {projectsQuery.isLoading ? (
            <div className="flex justify-center py-10">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
          ) : projectsQuery.data && projectsQuery.data.length > 0 ? (
            <div className="grid gap-3">
              {projectsQuery.data.map((project: any) => (
                <Card
                  key={project.id}
                  className="cursor-pointer hover:border-primary/50 transition-colors"
                  onClick={() => handleOpenProject(project)}
                >
                  <CardContent className="flex items-center justify-between py-4">
                    <div className="flex items-center gap-3 min-w-0">
                      <FileText className="w-5 h-5 text-muted-foreground shrink-0" />
                      <div className="min-w-0">
                        <p className="font-medium truncate">{project.title}</p>
                        <p className="text-sm text-muted-foreground">
                          {project.contentBraille
                            ? `${project.contentBraille.length} caracteres`
                            : "Vazio"}
                          {" · "}
                          {new Date(project.updatedAt).toLocaleDateString("pt-BR")}
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteProject(project.id);
                      }}
                      aria-label="Excluir projeto"
                    >
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="py-12 text-center">
                <Music className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">
                  Nenhum projeto ainda. Crie um novo para começar!
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </SiteLayout>
    );
  }

  // ─── EDITOR VIEW ───────────────────────────────────────────────────────────

  const noteCount = parsedElements.filter((e) => e.type === "note").length;
  const restCount = parsedElements.filter((e) => e.type === "rest").length;

  return (
    <SiteLayout>
      <div className="container max-w-7xl py-6 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowProjects(true)}
              className="text-muted-foreground hover:text-foreground transition-colors"
              aria-label="Voltar aos projetos"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <Input
              value={projectTitle}
              onChange={(e) => setProjectTitle(e.target.value)}
              className="text-lg font-semibold border-none bg-transparent px-0 h-auto focus-visible:ring-0 max-w-xs"
              aria-label="Nome do projeto"
            />
            <span
              className={`text-xs px-2 py-0.5 rounded-full ${
                saveStatus === "saved"
                  ? "bg-green-100 text-green-700"
                  : saveStatus === "saving"
                  ? "bg-yellow-100 text-yellow-700"
                  : "bg-red-100 text-red-700"
              }`}
            >
              {saveStatus === "saved" ? "Salvo" : saveStatus === "saving" ? "Salvando..." : "Não salvo"}
            </span>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Button variant="outline" size="sm" onClick={() => setShowReference(!showReference)}>
              <Info className="w-4 h-4 mr-1" />
              Referência
            </Button>
            <div className="flex border rounded-lg overflow-hidden">
              <button
                onClick={() => setInputMode("standard")}
                className={`px-3 py-1.5 text-sm flex items-center gap-1 transition-colors ${
                  inputMode === "standard"
                    ? "bg-primary text-primary-foreground"
                    : "bg-card text-card-foreground hover:bg-accent"
                }`}
              >
                <Keyboard className="w-3.5 h-3.5" />
                Padrão
              </button>
              <button
                onClick={() => setInputMode("perkins")}
                className={`px-3 py-1.5 text-sm flex items-center gap-1 transition-colors ${
                  inputMode === "perkins"
                    ? "bg-primary text-primary-foreground"
                    : "bg-card text-card-foreground hover:bg-accent"
                }`}
              >
                <Keyboard className="w-3.5 h-3.5" />
                Perkins
              </button>
            </div>
            <div className="flex border rounded-lg overflow-hidden">
              <button
                onClick={() => handleExport("brf")}
                className="px-3 py-1.5 text-sm flex items-center gap-1 bg-card text-card-foreground hover:bg-accent transition-colors"
                title="Exportar como BRF"
              >
                <Download className="w-3.5 h-3.5" />
                .brf
              </button>
              <button
                onClick={() => handleExport("txt")}
                className="px-3 py-1.5 text-sm flex items-center gap-1 bg-card text-card-foreground hover:bg-accent transition-colors border-l"
                title="Exportar como TXT"
              >
                .txt
              </button>
              <button
                onClick={() => handleExport("musicxml")}
                className="px-3 py-1.5 text-sm flex items-center gap-1 bg-card text-card-foreground hover:bg-accent transition-colors border-l"
                title="Exportar como MusicXML"
              >
                .xml
              </button>
            </div>
          </div>
        </div>

        {/* Quick Reference */}
        {showReference && (
          <Card>
            <CardHeader className="py-3">
              <CardTitle className="text-sm">Referência Rápida de Símbolos</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <QuickReferencePanel onInsert={insertChar} />
            </CardContent>
          </Card>
        )}

        {/* ── SCORE RENDERING (FULL WIDTH ON TOP) ── */}
        <Card>
          <CardHeader className="py-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Music className="w-4 h-4" />
              Partitura
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div ref={scoreContainerRef} className="min-h-[160px]">
              {parsedElements.length > 0 ? (
                <ScoreRenderer elements={parsedElements} width={scoreWidth} height={200} />
              ) : (
                <div className="flex flex-col items-center justify-center h-[160px] text-muted-foreground">
                  <Music className="w-12 h-12 mb-3 opacity-30" />
                  <p className="text-sm">Digite em Braille musical para ver a partitura aqui</p>
                  <p className="text-xs mt-1 font-mono">
                    Ex: ⠐⠹⠱⠫⠻ (Sinal de 4ª oitava + C D E F semínimas)
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* ── MAIN EDITOR AREA (TWO COLUMNS) ── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Left: Braille Input (2/3) */}
          <div className="lg:col-span-2 space-y-3">
            <Card>
              <CardHeader className="py-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Keyboard className="w-4 h-4" />
                  Entrada em Braille Musical
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {inputMode === "perkins" && (
                  <PerkinsKeyboard onChar={insertChar} onSpace={insertSpace} onBackspace={handleBackspace} />
                )}

                <textarea
                  value={brailleContent}
                  onChange={(e) => setBrailleContent(e.target.value)}
                  className="w-full h-40 p-3 border rounded-lg bg-card text-card-foreground font-mono text-2xl leading-relaxed resize-none focus:outline-none focus:ring-2 focus:ring-primary/50"
                  placeholder={
                    inputMode === "perkins"
                      ? "Use o teclado Perkins acima (F,D,S,J,K,L)..."
                      : "Digite ou cole texto em Braille Unicode aqui..."
                  }
                  aria-label="Área de entrada em Braille musical"
                  readOnly={inputMode === "perkins"}
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>{brailleContent.length} caracteres</span>
                  <span>{noteCount} notas · {restCount} pausas</span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right: Braille Cell Visualization + Stats (1/3) */}
          <div className="space-y-3">
            {brailleContent.trim() ? (
              <>
                <Card>
                  <CardHeader className="py-3">
                    <CardTitle className="text-sm">Celas Braille</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-1 max-h-48 overflow-y-auto">
                      {Array.from(brailleContent).map((char, i) => {
                        if (char === " " || char === "\u2800") {
                          return (
                            <div key={i} className="w-0.5 h-10 bg-border mx-1 self-center" title="Barra de compasso" />
                          );
                        }
                        return (
                          <div key={i} className="flex flex-col items-center" title={describeBrailleChar(char)}>
                            <BrailleCell char={char} size={28} />
                            <span className="text-[8px] text-muted-foreground truncate max-w-[28px]">
                              {describeBrailleChar(char).split(" ")[0]}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="py-3">
                    <CardTitle className="text-sm">Análise</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div className="bg-muted rounded-lg p-3 text-center">
                        <p className="text-xl font-bold text-primary">{noteCount}</p>
                        <p className="text-muted-foreground text-xs">Notas</p>
                      </div>
                      <div className="bg-muted rounded-lg p-3 text-center">
                        <p className="text-xl font-bold text-primary">{restCount}</p>
                        <p className="text-muted-foreground text-xs">Pausas</p>
                      </div>
                      <div className="bg-muted rounded-lg p-3 text-center">
                        <p className="text-xl font-bold text-primary">
                          {parsedElements.filter((e) => e.type === "barline").length + 1}
                        </p>
                        <p className="text-muted-foreground text-xs">Compassos</p>
                      </div>
                      <div className="bg-muted rounded-lg p-3 text-center">
                        <p className="text-xl font-bold text-primary">{brailleContent.length}</p>
                        <p className="text-muted-foreground text-xs">Caracteres</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </>
            ) : (
              <Card>
                <CardContent className="py-8 text-center">
                  <Info className="w-8 h-8 mx-auto text-muted-foreground mb-3 opacity-50" />
                  <p className="text-sm text-muted-foreground">
                    As celas Braille e a análise aparecerão aqui quando você começar a digitar.
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </SiteLayout>
  );
}
