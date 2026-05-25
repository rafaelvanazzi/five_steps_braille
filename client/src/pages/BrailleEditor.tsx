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
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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
import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { z } from "zod";

// Page format definitions for UI
const PAGE_FORMATS_UI = [
  {
    id: "a4-brasil",
    name: "A4 Brasil",
    description: "40×25 - Padrão brasileiro",
    cellsPerLine: 40,
    linesPerPage: 25,
    printers: "Index, Juliet, ViewPlus",
  },
  {
    id: "a4-internacional",
    name: "A4 Internacional",
    description: "32×27 - Padrão internacional",
    cellsPerLine: 32,
    linesPerPage: 27,
    printers: "Index, Juliet, ViewPlus",
  },
  {
    id: "bana-standard",
    name: "BANA Padrão",
    description: "40×25 - Padrão americano",
    cellsPerLine: 40,
    linesPerPage: 25,
    printers: "Index, Juliet, ViewPlus",
  },
  {
    id: "letter-us",
    name: "Letter (EUA)",
    description: "34×25 - Papel Letter",
    cellsPerLine: 34,
    linesPerPage: 25,
    printers: "Index, Juliet, ViewPlus",
  },
  {
    id: "formulario-continuo",
    name: "Formulário Contínuo",
    description: "42×25 - Papel contínuo",
    cellsPerLine: 42,
    linesPerPage: 25,
    printers: "Impressoras tractor-feed",
  },
  {
    id: "braille-facil",
    name: "Braille Fácil",
    description: "40×25 - Software Braille Fácil",
    cellsPerLine: 40,
    linesPerPage: 25,
    printers: "Index, Juliet, ViewPlus",
  },
];

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
    { key: "f", label: "F\n(1)", dot: "1" },
    { key: "d", label: "D\n(2)", dot: "2" },
    { key: "s", label: "S\n(3)", dot: "3" },
    { key: "j", label: "J\n(4)", dot: "4" },
    { key: "k", label: "K\n(5)", dot: "5" },
    { key: "l", label: "L\n(6)", dot: "6" },
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
              disabled
            >
              {k.label}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── QUICK REFERENCE PANEL ────────────────────────────────────────────────────

function QuickReference({ onInsert }: { onInsert: (char: string) => void }) {
  const [filter, setFilter] = useState<string>("all");
  const ref = getQuickReference();
  const categories = [
    { key: "all", label: "Todos" },
    ...Array.from(new Set(ref.map((e) => e.category))).map((c) => ({ key: c, label: c })),
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
            title={entry.description}
          >
            <span className="text-lg font-braille">{entry.displayChar || entry.char}</span>
            <span className="text-[10px] text-muted-foreground text-center">{entry.dots}</span>
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
  
  // Export format selection dialog
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [selectedPageFormat, setSelectedPageFormat] = useState("a4-brasil");
  const [customCellsPerLine, setCustomCellsPerLine] = useState<number | undefined>();
  const [customLinesPerPage, setCustomLinesPerPage] = useState<number | undefined>();
  const [includeHeader, setIncludeHeader] = useState(false);
  const [pageNumbering, setPageNumbering] = useState(true);

  // Parse options
  const parseOptions = useMemo<ParseOptions>(() => ({
    beatsPerMeasure,
  }), [beatsPerMeasure]);

  // Parse braille content based on cursor position → render only current line
  useEffect(() => {
    if (!brailleContent) {
      setParsedElements([]);
      return;
    }

    const lines = brailleContent.split("\n");
    let charCount = 0;
    let currentLineIndex = 0;

    for (let i = 0; i < lines.length; i++) {
      const lineLength = lines[i].length + 1; // +1 for newline
      if (charCount + lineLength > cursorPos) {
        currentLineIndex = i;
        break;
      }
      charCount += lineLength;
    }

    const currentLine = lines[currentLineIndex] || "";
    const parseResult = parseBrailleLine(brailleContent, cursorPos, parseOptions);
    setParsedElements(parseResult.elements);
  }, [brailleContent, cursorPos, parseOptions]);

  // Auto-save
  useEffect(() => {
    if (!currentProjectId) return;
    setSaveStatus("unsaved");

    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    autoSaveTimerRef.current = setTimeout(() => {
      setSaveStatus("saving");
      updateMutation.mutateAsync({
        id: currentProjectId,
        contentBraille: brailleContent,
        contentText: romanContent,
      }).then(() => {
        setSaveStatus("saved");
      }).catch(() => {
        setSaveStatus("unsaved");
      });
    }, 2000);

    return () => {
      if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    };
  }, [brailleContent, currentProjectId, projectTitle, romanContent]);

  // Measure score container width
  useEffect(() => {
    const observer = new ResizeObserver(() => {
      if (scoreContainerRef.current) {
        setScoreWidth(scoreContainerRef.current.clientWidth);
      }
    });
    observer.observe(scoreContainerRef.current!);
    return () => observer.disconnect();
  }, []);

  // ─── CURSOR TRACKING ──────────────────────────────────────────────────────

  const updateCursorPosition = useCallback((textarea: HTMLTextAreaElement) => {
    setCursorPos(textarea.selectionStart);
    setSelectionRange([textarea.selectionStart, textarea.selectionEnd]);
  }, []);

  // ─── HANDLERS ─────────────────────────────────────────────────────────────

  const handleOpenProject = useCallback((project: any) => {
    setCurrentProjectId(project.id);
    setProjectTitle(project.title);
    setBrailleContent(project.contentBraille || "");
    setRomanContent(project.contentText || "");
    setShowProjects(false);
  }, []);

  const handleCreateProject = useCallback(async () => {
    const title = prompt("Nome do projeto:");
    if (!title) return;
    try {
      const project = await createMutation.mutateAsync({
        title,
        language: "pt",
        contentBraille: "",
        contentText: "",
      });
      handleOpenProject(project);
      utils.editor.list.invalidate();
    } catch {
      toast.error("Erro ao criar projeto");
    }
  }, [createMutation, handleOpenProject, utils]);

  const handleDeleteProject = useCallback(async () => {
    if (!currentProjectId) return;
    if (!confirm("Tem certeza que deseja deletar este projeto?")) return;
    try {
      await deleteMutation.mutateAsync({ id: currentProjectId });
      setShowProjects(true);
      setCurrentProjectId(null);
      utils.editor.list.invalidate();
      toast.success("Projeto deletado");
    } catch {
      toast.error("Erro ao deletar projeto");
    }
  }, [deleteMutation, currentProjectId, utils]);

  const handleExport = useCallback(
    async (format: "brf" | "txt") => {
      if (!currentProjectId) return;
      try {
        const result = await exportMutation.mutateAsync({
          id: currentProjectId,
          format,
          pageFormat: selectedPageFormat,
          cellsPerLine: customCellsPerLine,
          linesPerPage: customLinesPerPage,
          includeHeader,
          pageNumbering,
        });
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
        setShowExportDialog(false);
      } catch {
        toast.error("Erro ao exportar");
      }
    },
    [currentProjectId, exportMutation, selectedPageFormat, customCellsPerLine, customLinesPerPage, includeHeader, pageNumbering]
  );

  // ─── IMPORT HANDLER ────────────────────────────────────────────────────────

  const handleImportFile = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const fileName = file.name.toLowerCase();
    const isBrf = fileName.endsWith('.brf');
    const isMusicXML = fileName.endsWith('.musicxml') || fileName.endsWith('.xml') || fileName.endsWith('.mxl');

    if (!isBrf && !isMusicXML) {
      toast.error("Apenas arquivos .brf e .musicxml são suportados");
      return;
    }

    setImporting(true);
    try {
      const content = await file.text();

      if (isBrf) {
        // Convert ASCII BRF to Unicode Braille
        const unicodeBraille = asciiToUnicodeBraille(content);
        setBrailleContent(unicodeBraille);
        toast.success("Arquivo BRF importado");
      } else if (isMusicXML) {
        // Parse MusicXML and convert to Braille
        if (!currentProjectId) {
          // Create new project
          const projectName = fileName.replace(/\.[^.]+$/, '');
          const newProject = await createMutation.mutateAsync({
            title: projectName,
            language: "pt",
            contentBraille: "",
            contentText: "",
          });
          setCurrentProjectId(newProject.id);
          setProjectTitle(newProject.title);
        }

        const result = await importMusicXMLMutation.mutateAsync({
          projectId: currentProjectId || 0,
          xmlContent: content,
        });

        if (result.success && result.project) {
          setBrailleContent(result.project.contentBraille || "");
          toast.success("MusicXML importado e convertido para Braille");
        }
      }
    } catch (err) {
      console.error("Import error:", err);
      toast.error("Erro ao importar arquivo");
    } finally {
      setImporting(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  }, [currentProjectId, createMutation, importMusicXMLMutation]);

  const handleBrailleChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setBrailleContent(e.target.value);
    updateCursorPosition(e.target);
    syncSourceRef.current = "braille";
  }, [updateCursorPosition]);

  const handleRomanChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const roman = e.target.value;
    setRomanContent(roman);
    updateCursorPosition(e.target);

    if (syncSourceRef.current !== "braille") {
      const braille = romanToBraille(roman);
      setBrailleContent(braille);
      syncSourceRef.current = "romano";
    }
  }, [updateCursorPosition]);

  const handlePerkinsChar = useCallback((char: string) => {
    if (!brailleTextareaRef.current) return;
    const start = brailleTextareaRef.current.selectionStart;
    const end = brailleTextareaRef.current.selectionEnd;
    const newContent = brailleContent.substring(0, start) + char + brailleContent.substring(end);
    setBrailleContent(newContent);
    syncSourceRef.current = "braille";

    setTimeout(() => {
      if (brailleTextareaRef.current) {
        brailleTextareaRef.current.selectionStart = brailleTextareaRef.current.selectionEnd = start + 1;
        updateCursorPosition(brailleTextareaRef.current);
      }
    }, 0);
  }, [brailleContent, updateCursorPosition]);

  const handleSpace = useCallback(() => {
    handlePerkinsChar(" ");
  }, [handlePerkinsChar]);

  const handleBackspace = useCallback(() => {
    if (!brailleTextareaRef.current) return;
    const start = brailleTextareaRef.current.selectionStart;
    if (start > 0) {
      const newContent = brailleContent.substring(0, start - 1) + brailleContent.substring(start);
      setBrailleContent(newContent);
      syncSourceRef.current = "braille";

      setTimeout(() => {
        if (brailleTextareaRef.current) {
          brailleTextareaRef.current.selectionStart = brailleTextareaRef.current.selectionEnd = start - 1;
          updateCursorPosition(brailleTextareaRef.current);
        }
      }, 0);
    }
  }, [brailleContent, updateCursorPosition]);

  const handleNewline = useCallback(() => {
    handlePerkinsChar("\n");
  }, [handlePerkinsChar]);

  const handleScoreNoteClick = useCallback((noteIndex: number) => {
    if (!brailleTextareaRef.current) return;
    
    const currentLine = brailleContent.split("\n")[Math.floor(cursorPos / (brailleContent.split("\n")[0]?.length || 1)) || 0] || "";
    const parseResult = parseBrailleLine(brailleContent, cursorPos, parseOptions);
    const parsed = parseResult.elements;
    
    if (noteIndex >= 0 && noteIndex < parsed.length) {
      const element = parsed[noteIndex];
      const lineStart = brailleContent.lastIndexOf("\n", cursorPos) + 1;
      const elementPos = currentLine.indexOf((element as any).raw);
      
      if (elementPos !== -1) {
        const newPos = lineStart + elementPos;
        brailleTextareaRef.current.selectionStart = newPos;
        brailleTextareaRef.current.selectionEnd = newPos;
        updateCursorPosition(brailleTextareaRef.current);
      }
    }
  }, [brailleContent, cursorPos, parseOptions, updateCursorPosition]);

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
          <a href={getLoginUrl("/editor-musicografia-braille")}>
            <Button size="lg">Entrar</Button>
          </a>
        </div>
      </SiteLayout>
    );
  }

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

          <Card className="bg-muted/50 border-muted">
            <CardContent className="pt-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <h3 className="font-semibold text-sm flex items-center gap-2">
                    <Keyboard className="w-4 h-4" />
                    Edicao
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Escreva em Braille musical usando o <strong>teclado Perkins</strong> (F, D, S, J, K, L) ou o <strong>teclado padrao</strong>. A partitura e renderizada em tempo real.
                  </p>
                </div>
                <div className="space-y-2">
                  <h3 className="font-semibold text-sm flex items-center gap-2">
                    <Upload className="w-4 h-4" />
                    Importacao
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Importe arquivos <strong>.brf</strong> (Braille) ou <strong>.musicxml</strong> (partitura). MusicXML e convertido automaticamente para Braille musical (modo basico).
                  </p>
                </div>
                <div className="space-y-2">
                  <h3 className="font-semibold text-sm flex items-center gap-2">
                    <Download className="w-4 h-4" />
                    Exportacao
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Exporte como <strong>.brf</strong> (6 formatos de pagina) ou <strong>.txt</strong>. Padrao ASCII compativel com impressoras <strong>Index, Juliet e ViewPlus</strong>.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

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
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-10 text-muted-foreground">
              <p>Nenhum projeto ainda. Crie um novo para começar!</p>
            </div>
          )}
        </div>
      </SiteLayout>
    );
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
            <div>
              <h1 className="text-xl font-bold">{projectTitle}</h1>
              <span className={`text-xs px-2 py-1 rounded-md ${
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
                onClick={() => setShowExportDialog(true)}
                className="px-2 py-1 text-xs flex items-center gap-1 bg-card text-card-foreground hover:bg-accent transition-colors"
                title="Exportar como BRF com opções de formato"
              >
                <Download className="w-3 h-3" />
                .brf
              </button>
              <button
                onClick={() => handleExport("txt")}
                className="px-2 py-1 text-xs flex items-center gap-1 bg-card text-card-foreground hover:bg-accent transition-colors border-l border-border"
                title="Exportar como TXT"
              >
                <Download className="w-3 h-3" />
                .txt
              </button>
            </div>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleDeleteProject}
            >
              <Trash2 className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>

        {/* Export Dialog */}
        <Dialog open={showExportDialog} onOpenChange={setShowExportDialog}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Exportar como BRF</DialogTitle>
              <DialogDescription>
                Escolha o formato de página para sua impressora Braille
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              {/* Format selection */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {PAGE_FORMATS_UI.map((fmt) => (
                  <button
                    key={fmt.id}
                    onClick={() => setSelectedPageFormat(fmt.id)}
                    className={`p-3 rounded-lg border-2 text-left transition-colors ${
                      selectedPageFormat === fmt.id
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/50"
                    }`}
                  >
                    <p className="font-semibold text-sm">{fmt.name}</p>
                    <p className="text-xs text-muted-foreground">{fmt.description}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Impressoras: {fmt.printers}
                    </p>
                  </button>
                ))}
              </div>

              {/* Custom format */}
              <div className="border rounded-lg p-3 space-y-3">
                <p className="text-sm font-semibold">Personalizado</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-muted-foreground">Células por linha</label>
                    <Input
                      type="number"
                      min="20"
                      max="100"
                      value={customCellsPerLine || ""}
                      onChange={(e) => setCustomCellsPerLine(e.target.value ? Number(e.target.value) : undefined)}
                      placeholder="Ex: 40"
                      className="text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">Linhas por página</label>
                    <Input
                      type="number"
                      min="10"
                      max="50"
                      value={customLinesPerPage || ""}
                      onChange={(e) => setCustomLinesPerPage(e.target.value ? Number(e.target.value) : undefined)}
                      placeholder="Ex: 25"
                      className="text-sm"
                    />
                  </div>
                </div>
              </div>

              {/* Options */}
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input
                    type="checkbox"
                    checked={includeHeader}
                    onChange={(e) => setIncludeHeader(e.target.checked)}
                    className="rounded"
                  />
                  Incluir cabeçalho (título e autor)
                </label>
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input
                    type="checkbox"
                    checked={pageNumbering}
                    onChange={(e) => setPageNumbering(e.target.checked)}
                    className="rounded"
                  />
                  Numeração de páginas
                </label>
              </div>

              {/* Buttons */}
              <div className="flex gap-2 justify-end pt-4">
                <Button
                  variant="outline"
                  onClick={() => setShowExportDialog(false)}
                >
                  Cancelar
                </Button>
                <Button
                  onClick={() => handleExport("brf")}
                  disabled={exportMutation.isPending}
                >
                  {exportMutation.isPending ? "Exportando..." : "Exportar"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Perkins Keyboard */}
        <Card>
          <CardContent className="pt-4">
            <PerkinsKeyboard
              onChar={handlePerkinsChar}
              onSpace={handleSpace}
              onBackspace={handleBackspace}
              onNewline={handleNewline}
            />
          </CardContent>
        </Card>

        {/* Panel 1: Score */}
        <Card>
          <CardHeader className="py-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm flex items-center gap-2">
                <Music className="w-4 h-4" />
                Partitura
                <span className="text-[10px] font-normal text-muted-foreground">
                  (Linha {Math.floor(cursorPos / (brailleContent.split("\n")[0]?.length || 1)) + 1} de {brailleContent.split("\n").length})
                </span>
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent className="pt-0 pb-2">
            <div ref={scoreContainerRef} className="min-h-[140px]">
              {parsedElements.length > 0 ? (
                <ScoreRenderer
                  elements={parsedElements}
                  width={scoreWidth}
                  height={180}
                  onNoteClick={handleScoreNoteClick}
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
                  Documento oficial
                </span>
              </div>
            </CardHeader>
            <CardContent className="space-y-2 pt-0">
              <textarea
                ref={brailleTextareaRef}
                value={brailleContent}
                onChange={handleBrailleChange}
                onFocus={() => setActivePanel("braille")}
                className="w-full h-32 p-2 font-braille text-lg border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                placeholder="Digite em Braille musical..."
                spellCheck={false}
              />
              <div className="flex justify-between text-[10px] text-muted-foreground">
                <span>{brailleContent.length} caracteres Braille · Linha {Math.floor(cursorPos / (brailleContent.split("\n")[0]?.length || 1)) + 1}</span>
                <span>Documento oficial para impressão</span>
              </div>
            </CardContent>
          </Card>

          {/* Panel 3: Texto em Romano */}
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
                  aria-label="Ajuda"
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
                onChange={handleRomanChange}
                onFocus={() => setActivePanel("romano")}
                className="w-full h-32 p-2 font-mono text-sm border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                placeholder="Notação alfabética (C D E F G A B)..."
                spellCheck={false}
              />
              <div className="flex justify-between text-[10px] text-muted-foreground">
                <span>{romanContent.length} caracteres</span>
                <span>Teclado padrão · Correspondência alfabética</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Panel 4: Quick Reference */}
        {showReference && (
          <Card>
            <CardHeader className="py-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <HelpCircle className="w-4 h-4" />
                Referência Rápida
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <QuickReference onInsert={handlePerkinsChar} />
            </CardContent>
          </Card>
        )}
      </div>
    </SiteLayout>
  );
}
