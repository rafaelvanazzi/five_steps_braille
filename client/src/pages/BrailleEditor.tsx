import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { getLoginUrl } from "@/const";
import SiteLayout from "@/components/SiteLayout";
import ScoreRenderer from "@/components/ScoreRenderer";
import {
  parseBrailleMusic,
  parseBrailleLine,
  parseBrailleSelection,
  perkinsDotsToUnicode,
  describeBrailleChar,
  unicodeToDots,
  getQuickReference,
  type ParsedElement,
  type PerkinsKeyState,
  type ParseOptions,
} from "@/lib/brailleMusic";
import { brailleToRoman, romanToBraille, getRomanFormatHelp } from "@/lib/brailleRomano";
import { asciiToUnicodeBraille, detectBrailleFormat } from "@/lib/brailleAscii";
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
  Upload,
  HelpCircle,
} from "lucide-react";

// ─── PERKINS KEYBOARD COMPONENT ────────────────────────────────────────────────

function PerkinsKeyboard({
  onChar,
  onSpace,
  onBackspace,
  onNewline,
}: {
  onChar: (char: string) => void;
  onSpace: () => void;
  onBackspace: () => void;
  onNewline: () => void;
}) {
  const [pressed, setPressed] = useState<Set<string>>(new Set());
  const pressedRef = useRef<Set<string>>(new Set());
  const activeDotsRef = useRef<PerkinsKeyState>({
    dot1: false, dot2: false, dot3: false,
    dot4: false, dot5: false, dot6: false,
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
      if (key === "enter") e.preventDefault();
    };

    const up = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      if (key === " ") { e.preventDefault(); onSpace(); return; }
      if (key === "backspace") { e.preventDefault(); onBackspace(); return; }
      if (key === "enter") { e.preventDefault(); onNewline(); return; }
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
  }, [onChar, onSpace, onBackspace, onNewline]);

  const keys = [
    { label: "S", sub: "Ponto 3", key: "s" },
    { label: "D", sub: "Ponto 2", key: "d" },
    { label: "F", sub: "Ponto 1", key: "f" },
    { label: "J", sub: "Ponto 4", key: "j" },
    { label: "K", sub: "Ponto 5", key: "k" },
    { label: "L", sub: "Ponto 6", key: "l" },
  ];

  return (
    <div className="flex flex-col items-center gap-2 py-2">
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
              tabIndex={-1}
            >
              <span>{k.label}</span>
              <span className="text-[9px] font-normal opacity-70">{k.sub}</span>
            </button>
          </div>
        ))}
      </div>
      <p className="text-[10px] text-muted-foreground">
        Espaço = Barra de compasso · Enter = Nova linha · Backspace = Apagar
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
    { key: "note-whole", label: "Semibreves" },
    { key: "note-16th-forced", label: "Semicolcheias" },
    { key: "note-half", label: "Mínimas" },
    { key: "note-32nd-forced", label: "Fusas" },
    { key: "note-quarter", label: "Semínimas" },
    { key: "note-eighth", label: "Colcheias" },
    { key: "rest", label: "Pausas" },
    { key: "octave", label: "Oitavas" },
    { key: "accidental", label: "Alterações" },
    { key: "timesig", label: "Fórmulas" },
    { key: "barline", label: "Barras" },
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
            <span className="text-xl leading-none">{entry.char}</span>
            <span className="text-[8px] text-muted-foreground mt-0.5 truncate w-full text-center">
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
  const importMusicXMLMutation = trpc.editor.importMusicXML.useMutation();
  const utils = trpc.useUtils();

  const [currentProjectId, setCurrentProjectId] = useState<number | null>(null);
  const [projectTitle, setProjectTitle] = useState("");
  const [brailleContent, setBrailleContent] = useState("");
  const [romanContent, setRomanContent] = useState("");
  const [activePanel, setActivePanel] = useState<"braille" | "romano">("braille");
  const [showReference, setShowReference] = useState(false);
  const [showRomanHelp, setShowRomanHelp] = useState(false);
  const [showProjects, setShowProjects] = useState(true);
  const [parsedElements, setParsedElements] = useState<ParsedElement[]>([]);
  const [saveStatus, setSaveStatus] = useState<"saved" | "saving" | "unsaved">("saved");
  const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [scoreWidth, setScoreWidth] = useState(800);
  const scoreContainerRef = useRef<HTMLDivElement>(null);
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const brailleTextareaRef = useRef<HTMLTextAreaElement>(null);
  const romanTextareaRef = useRef<HTMLTextAreaElement>(null);
  
  // Cursor position tracking for line-based rendering
  const [cursorPos, setCursorPos] = useState(0);
  const [selectionRange, setSelectionRange] = useState<[number, number] | null>(null);
  
  // Time signature for disambiguation
  const [beatsPerMeasure, setBeatsPerMeasure] = useState(4);
  
  // Track which panel last changed content to avoid infinite sync loops
  const syncSourceRef = useRef<"braille" | "romano" | "none">("none");

  // Parse options
  const parseOptions = useMemo<ParseOptions>(() => ({
    beatsPerMeasure,
  }), [beatsPerMeasure]);

  // Parse braille content based on cursor position → render only current line
  useEffect(() => {
    if (brailleContent.trim()) {
      try {
        let result;
        if (selectionRange && selectionRange[0] !== selectionRange[1]) {
          // If there's a selection, parse only the selected text
          result = parseBrailleSelection(brailleContent, selectionRange[0], selectionRange[1], parseOptions);
        } else {
          // Parse only the line where the cursor is
          result = parseBrailleLine(brailleContent, cursorPos, parseOptions);
        }
        setParsedElements(result.elements);
      } catch {
        setParsedElements([]);
      }
    } else {
      setParsedElements([]);
    }
  }, [brailleContent, cursorPos, selectionRange, parseOptions]);

  // Sync: Braille → Romano (when braille changes and was the source)
  useEffect(() => {
    if (syncSourceRef.current === "braille") {
      const roman = brailleToRoman(brailleContent);
      setRomanContent(roman);
      syncSourceRef.current = "none";
    }
  }, [brailleContent]);

  // Sync: Romano → Braille (when romano changes and was the source)
  useEffect(() => {
    if (syncSourceRef.current === "romano") {
      const braille = romanToBraille(romanContent);
      setBrailleContent(braille);
      syncSourceRef.current = "none";
    }
  }, [romanContent]);

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

  // ─── CURSOR TRACKING ──────────────────────────────────────────────────────

  const updateCursorPosition = useCallback((textarea: HTMLTextAreaElement) => {
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    setCursorPos(start);
    if (start !== end) {
      setSelectionRange([start, end]);
    } else {
      setSelectionRange(null);
    }
  }, []);

  // ─── BRAILLE INPUT HANDLERS ────────────────────────────────────────────────

  const handleBrailleChange = useCallback((newContent: string) => {
    syncSourceRef.current = "braille";
    setBrailleContent(newContent);
  }, []);

  const insertCharAtCursor = useCallback((char: string) => {
    const textarea = brailleTextareaRef.current;
    if (textarea) {
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const newContent = brailleContent.slice(0, start) + char + brailleContent.slice(end);
      syncSourceRef.current = "braille";
      setBrailleContent(newContent);
      const newPos = start + char.length;
      setCursorPos(newPos);
      setSelectionRange(null);
      requestAnimationFrame(() => {
        textarea.selectionStart = textarea.selectionEnd = newPos;
        textarea.focus();
      });
    } else {
      syncSourceRef.current = "braille";
      setBrailleContent((prev) => prev + char);
    }
  }, [brailleContent]);

  const insertSpaceAtCursor = useCallback(() => {
    insertCharAtCursor(" ");
  }, [insertCharAtCursor]);

  const insertNewlineAtCursor = useCallback(() => {
    insertCharAtCursor("\n");
  }, [insertCharAtCursor]);

  const handleBackspaceAtCursor = useCallback(() => {
    const textarea = brailleTextareaRef.current;
    if (textarea) {
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      if (start !== end) {
        const newContent = brailleContent.slice(0, start) + brailleContent.slice(end);
        syncSourceRef.current = "braille";
        setBrailleContent(newContent);
        setCursorPos(start);
        setSelectionRange(null);
        requestAnimationFrame(() => {
          textarea.selectionStart = textarea.selectionEnd = start;
          textarea.focus();
        });
      } else if (start > 0) {
        const newContent = brailleContent.slice(0, start - 1) + brailleContent.slice(start);
        syncSourceRef.current = "braille";
        setBrailleContent(newContent);
        setCursorPos(start - 1);
        setSelectionRange(null);
        requestAnimationFrame(() => {
          textarea.selectionStart = textarea.selectionEnd = start - 1;
          textarea.focus();
        });
      }
    } else {
      syncSourceRef.current = "braille";
      setBrailleContent((prev) => prev.slice(0, -1));
    }
  }, [brailleContent]);

  // ─── ROMANO INPUT HANDLER ──────────────────────────────────────────────────

  const handleRomanChange = useCallback((newContent: string) => {
    syncSourceRef.current = "romano";
    setRomanContent(newContent);
  }, []);

  // ─── PROJECT HANDLERS ──────────────────────────────────────────────────────

  const handleCreateProject = useCallback(async () => {
    const title = "Novo Projeto " + new Date().toLocaleDateString("pt-BR");
    try {
      const project = await createMutation.mutateAsync({ title, language: "pt" });
      setCurrentProjectId(project.id);
      setProjectTitle(title);
      setBrailleContent("");
      setRomanContent("");
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
      const braille = project.contentBraille || "";
      syncSourceRef.current = "braille";
      setBrailleContent(braille);
      setRomanContent(brailleToRoman(braille));
      setShowProjects(false);
      setSaveStatus("saved");
      setCursorPos(0);
      setSelectionRange(null);
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
          setRomanContent("");
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
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        toast.success(`Exportado como ${format.toUpperCase()}`);
      } catch {
        toast.error("Erro ao exportar");
      }
    },
    [currentProjectId, exportMutation]
  );

  // ─── IMPORT HANDLER ────────────────────────────────────────────────────────

  const handleImportFile = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const fileName = file.name.toLowerCase();
    const isBrf = fileName.endsWith('.brf');
    const isMusicXML = fileName.endsWith('.musicxml') || fileName.endsWith('.xml') || fileName.endsWith('.mxl');

    if (!isBrf && !isMusicXML) {
      toast.error('Formato não suportado. Use .brf ou .musicxml');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    setImporting(true);

    try {
      const text = await file.text();

      if (isBrf) {
        const format = detectBrailleFormat(text);
        let brailleText: string;
        
        if (format === 'ascii' || format === 'mixed') {
          brailleText = asciiToUnicodeBraille(text);
        } else {
          brailleText = text;
        }
        
        brailleText = brailleText.replace(/\n{3,}/g, '\n\n').trim();

        if (!brailleText) {
          toast.error('O arquivo BRF está vazio ou não contém conteúdo Braille válido');
          return;
        }

        if (!currentProjectId) {
          const title = file.name.replace(/\.(brf)$/i, '');
          const project = await createMutation.mutateAsync({ title, language: 'pt', contentBraille: brailleText });
          setCurrentProjectId(project.id);
          setProjectTitle(title);
          syncSourceRef.current = "braille";
          setBrailleContent(brailleText);
          setRomanContent(brailleToRoman(brailleText));
          setShowProjects(false);
          utils.editor.list.invalidate();
          toast.success(`Arquivo BRF importado: ${file.name}`);
        } else {
          syncSourceRef.current = "braille";
          setBrailleContent(brailleText);
          setRomanContent(brailleToRoman(brailleText));
          toast.success(`Conteúdo BRF carregado: ${file.name}`);
        }
      } else {
        // MusicXML
        if (!currentProjectId) {
          const title = file.name.replace(/\.(musicxml|xml|mxl)$/i, '');
          const project = await createMutation.mutateAsync({ title, language: 'pt' });
          setCurrentProjectId(project.id);
          setProjectTitle(title);
          setShowProjects(false);
          utils.editor.list.invalidate();

          const result = await importMusicXMLMutation.mutateAsync({
            projectId: project.id,
            xmlContent: text,
            fileName: file.name,
          });

          if (result.metadata?.title) setProjectTitle(result.metadata.title);
          const updated = await utils.editor.get.fetch({ id: project.id });
          const braille = updated?.contentBraille || '';
          syncSourceRef.current = "braille";
          setBrailleContent(braille);
          setRomanContent(brailleToRoman(braille));
          toast.success(
            `MusicXML importado: ${result.metadata?.notesCount || 0} notas convertidas para Braille`
          );
        } else {
          const result = await importMusicXMLMutation.mutateAsync({
            projectId: currentProjectId,
            xmlContent: text,
            fileName: file.name,
          });

          if (result.metadata?.title) setProjectTitle(result.metadata.title);
          const updated = await utils.editor.get.fetch({ id: currentProjectId });
          const braille = updated?.contentBraille || '';
          syncSourceRef.current = "braille";
          setBrailleContent(braille);
          setRomanContent(brailleToRoman(braille));
          utils.editor.list.invalidate();
          toast.success(
            `MusicXML importado: ${result.metadata?.notesCount || 0} notas convertidas para Braille`
          );
        }
      }
    } catch (err: any) {
      console.error('Import error:', err);
      toast.error(err?.message || 'Erro ao importar arquivo');
    } finally {
      setImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }, [currentProjectId, createMutation, importMusicXMLMutation, utils]);

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
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                disabled={importing}
              >
                <Upload className="w-4 h-4 mr-2" />
                {importing ? 'Importando...' : 'Importar Arquivo'}
              </Button>
              <Button onClick={handleCreateProject} disabled={createMutation.isPending}>
                <Plus className="w-4 h-4 mr-2" />
                Novo Projeto
              </Button>
            </div>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept=".brf,.musicxml,.xml,.mxl"
            onChange={handleImportFile}
            className="hidden"
            aria-label="Importar arquivo BRF ou MusicXML"
          />

          <p className="text-muted-foreground">
            Escreva em Braille musical usando o teclado Perkins ou o teclado padrão.
            A partitura é renderizada em tempo real conforme você digita.
            Você também pode <strong>importar arquivos .brf</strong> ou <strong>.musicxml</strong>.
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

  // ─── EDITOR VIEW (3 PANELS) ────────────────────────────────────────────────

  // Count from full document for stats
  const fullParse = parseBrailleMusic(brailleContent, parseOptions);
  const noteCount = fullParse.elements.filter((e) => e.type === "note").length;
  const restCount = fullParse.elements.filter((e) => e.type === "rest").length;
  const barCount = fullParse.elements.filter((e) => e.type === "barline").length + 1;

  // Get current line info for display
  const lines = brailleContent.split('\n');
  let currentLineNum = 1;
  let charCount = 0;
  for (let li = 0; li < lines.length; li++) {
    if (cursorPos <= charCount + lines[li].length) {
      currentLineNum = li + 1;
      break;
    }
    charCount += lines[li].length + 1;
  }

  return (
    <SiteLayout>
      <div className="container max-w-7xl py-4 space-y-3">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-2">
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
              className={`text-xs px-2 py-0.5 rounded-full whitespace-nowrap inline-block min-w-[90px] text-center ${
                saveStatus === "saved"
                  ? "bg-green-100 text-green-700"
                  : saveStatus === "saving"
                  ? "bg-yellow-100 text-yellow-700"
                  : "bg-red-100 text-red-700"
              }`}
            >
              {saveStatus === "saved" ? "✓ Salvo" : saveStatus === "saving" ? "Salvando..." : "Não salvo"}
            </span>
          </div>
          <div className="flex items-center gap-1.5 flex-wrap">
            {/* Time signature selector */}
            <div className="flex items-center gap-1 border rounded-lg px-2 py-1 bg-card">
              <span className="text-xs text-muted-foreground">Compasso:</span>
              <select
                value={beatsPerMeasure}
                onChange={(e) => setBeatsPerMeasure(Number(e.target.value))}
                className="text-xs bg-transparent border-none focus:outline-none cursor-pointer"
              >
                <option value={2}>2/4</option>
                <option value={3}>3/4</option>
                <option value={4}>4/4</option>
                <option value={6}>6/8</option>
              </select>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={importing}
            >
              <Upload className="w-3.5 h-3.5 mr-1" />
              {importing ? '...' : 'Importar'}
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".brf,.musicxml,.xml,.mxl"
              onChange={handleImportFile}
              className="hidden"
            />
            <Button variant="outline" size="sm" onClick={() => setShowReference(!showReference)}>
              <Info className="w-3.5 h-3.5 mr-1" />
              Ref.
            </Button>
            <div className="flex border rounded-lg overflow-hidden">
              <button
                onClick={() => handleExport("brf")}
                className="px-2 py-1 text-xs flex items-center gap-1 bg-card text-card-foreground hover:bg-accent transition-colors"
                title="Exportar como BRF"
              >
                <Download className="w-3 h-3" />
                .brf
              </button>
              <button
                onClick={() => handleExport("txt")}
                className="px-2 py-1 text-xs bg-card text-card-foreground hover:bg-accent transition-colors border-l"
                title="Exportar como TXT"
              >
                .txt
              </button>
              <button
                onClick={() => handleExport("musicxml")}
                className="px-2 py-1 text-xs bg-card text-card-foreground hover:bg-accent transition-colors border-l"
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
            <CardHeader className="py-2">
              <CardTitle className="text-sm">Referência Rápida de Símbolos</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <QuickReferencePanel onInsert={insertCharAtCursor} />
            </CardContent>
          </Card>
        )}

        {/* ── PANEL 1: SCORE RENDERING (FULL WIDTH ON TOP) ── */}
        <Card>
          <CardHeader className="py-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm flex items-center gap-2">
                <Music className="w-4 h-4" />
                Partitura
                <span className="text-[10px] font-normal text-muted-foreground">
                  (Linha {currentLineNum} de {lines.length})
                </span>
              </CardTitle>
              <span className="text-xs text-muted-foreground hidden sm:inline">
                {noteCount} notas · {restCount} pausas · {barCount} compassos · {beatsPerMeasure}/4
              </span>
            </div>
          </CardHeader>
          <CardContent className="pt-0 pb-2">
            <div ref={scoreContainerRef} className="min-h-[140px]">
              {parsedElements.length > 0 ? (
                <ScoreRenderer
                  elements={parsedElements}
                  width={scoreWidth}
                  height={180}
                  onMeasureClick={(sourceIndex) => {
                    // Move cursor in Braille textarea to the start of the clicked measure
                    const textarea = brailleTextareaRef.current;
                    if (!textarea) return;
                    textarea.focus();
                    textarea.setSelectionRange(sourceIndex, sourceIndex);
                    // Scroll textarea to make cursor visible
                    const lineHeight = 20;
                    const text = textarea.value;
                    const linesBeforeCursor = text.substring(0, sourceIndex).split('\n').length - 1;
                    textarea.scrollTop = linesBeforeCursor * lineHeight;
                  }}
                />
              ) : (
                <div className="flex flex-col items-center justify-center h-[140px] text-muted-foreground">
                  <Music className="w-10 h-10 mb-2 opacity-30" />
                  <p className="text-sm">Digite em Braille musical para ver a partitura aqui</p>
                  <p className="text-xs mt-1 font-mono">
                    Ex: ⠐⠹⠱⠫⠻ (Sinal de 4ª oitava + C D E F semínimas)
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* ── PANELS 2 & 3: BRAILLE + ROMANO (SIDE BY SIDE) ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          {/* Panel 2: Texto em Braille (Perkins input) */}
          <Card className={`transition-all ${activePanel === "braille" ? "ring-2 ring-primary/50" : ""}`}>
            <CardHeader className="py-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Keyboard className="w-4 h-4" />
                  Texto em Braille
                </CardTitle>
                <span className="text-[10px] text-muted-foreground bg-muted px-2 py-0.5 rounded">
                  Teclado Perkins (F,D,S / J,K,L)
                </span>
              </div>
            </CardHeader>
            <CardContent className="space-y-2 pt-0">
              {activePanel === "braille" && (
                <PerkinsKeyboard
                  onChar={insertCharAtCursor}
                  onSpace={insertSpaceAtCursor}
                  onBackspace={handleBackspaceAtCursor}
                  onNewline={insertNewlineAtCursor}
                />
              )}

              <textarea
                ref={brailleTextareaRef}
                value={brailleContent}
                onChange={(e) => handleBrailleChange(e.target.value)}
                onFocus={() => setActivePanel("braille")}
                onSelect={(e) => updateCursorPosition(e.currentTarget)}
                onClick={(e) => updateCursorPosition(e.currentTarget)}
                onKeyUp={(e) => updateCursorPosition(e.currentTarget)}
                className="w-full h-48 p-3 border rounded-lg bg-card text-card-foreground font-mono text-2xl leading-relaxed resize-none focus:outline-none focus:ring-2 focus:ring-primary/50"
                placeholder="Clique aqui e use o teclado Perkins (F,D,S,J,K,L)..."
                aria-label="Área de entrada em Braille musical — use teclado Perkins"
                spellCheck={false}
              />
              <div className="flex justify-between text-[10px] text-muted-foreground">
                <span>{brailleContent.length} caracteres Braille · Linha {currentLineNum}</span>
                <span>Documento oficial para impressão</span>
              </div>
            </CardContent>
          </Card>

          {/* Panel 3: Texto em Romano (standard keyboard input) */}
          <Card className={`transition-all ${activePanel === "romano" ? "ring-2 ring-primary/50" : ""}`}>
            <CardHeader className="py-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  Texto em Romano
                </CardTitle>
                <button
                  onClick={() => setShowRomanHelp(!showRomanHelp)}
                  className="text-muted-foreground hover:text-foreground transition-colors"
                  title="Ajuda sobre o formato Romano"
                >
                  <HelpCircle className="w-4 h-4" />
                </button>
              </div>
            </CardHeader>
            <CardContent className="space-y-2 pt-0">
              {showRomanHelp && (
                <div className="bg-muted rounded-lg p-3 text-xs text-muted-foreground whitespace-pre-line mb-2">
                  {getRomanFormatHelp()}
                </div>
              )}

              <textarea
                ref={romanTextareaRef}
                value={romanContent}
                onChange={(e) => handleRomanChange(e.target.value)}
                onFocus={() => setActivePanel("romano")}
                className="w-full h-48 p-3 border rounded-lg bg-card text-card-foreground font-mono text-base leading-relaxed resize-none focus:outline-none focus:ring-2 focus:ring-primary/50"
                placeholder="Clique aqui e digite com teclado padrão (letras ASCII Braille)..."
                aria-label="Área de entrada em texto Romano — use teclado padrão"
                spellCheck={false}
              />
              <div className="flex justify-between text-[10px] text-muted-foreground">
                <span>{romanContent.length} caracteres</span>
                <span>Teclado padrão · Correspondência alfabética</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </SiteLayout>
  );
}
