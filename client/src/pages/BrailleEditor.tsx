import React, { useState, useEffect, useRef } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertCircle, Save, Download, Plus, Trash2 } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import SheetMusicRenderer from "@/components/SheetMusicRenderer";

// Mapeamento de teclado Perkins para pontos Braille
// Perkins: F=1, D=2, S=3, J=4, K=5, L=6
const PERKINS_MAP: Record<string, number[]> = {
  f: [1],
  d: [2],
  s: [3],
  j: [4],
  k: [5],
  l: [6],
  fd: [1, 2],
  fs: [1, 3],
  fj: [1, 4],
  fk: [1, 5],
  fl: [1, 6],
  ds: [2, 3],
  dj: [2, 4],
  dk: [2, 5],
  dl: [2, 6],
  sj: [3, 4],
  sk: [3, 5],
  sl: [3, 6],
  jk: [4, 5],
  jl: [4, 6],
  kl: [5, 6],
  fds: [1, 2, 3],
  fdj: [1, 2, 4],
  fdk: [1, 2, 5],
  fdl: [1, 2, 6],
  fsj: [1, 3, 4],
  fsk: [1, 3, 5],
  fsl: [1, 3, 6],
  fjk: [1, 4, 5],
  fjl: [1, 4, 6],
  fkl: [1, 5, 6],
  dsj: [2, 3, 4],
  dsk: [2, 3, 5],
  dsl: [2, 3, 6],
  djk: [2, 4, 5],
  djl: [2, 4, 6],
  dkl: [2, 5, 6],
  sjk: [3, 4, 5],
  sjl: [3, 4, 6],
  skl: [3, 5, 6],
  jkl: [4, 5, 6],
  fdsj: [1, 2, 3, 4],
  fdsk: [1, 2, 3, 5],
  fdsl: [1, 2, 3, 6],
  fdjk: [1, 2, 4, 5],
  fdjl: [1, 2, 4, 6],
  fdkl: [1, 2, 5, 6],
  fsjk: [1, 3, 4, 5],
  fsjl: [1, 3, 4, 6],
  fskl: [1, 3, 5, 6],
  fjkl: [1, 4, 5, 6],
  dsjk: [2, 3, 4, 5],
  dsjl: [2, 3, 4, 6],
  dskl: [2, 3, 5, 6],
  djkl: [2, 4, 5, 6],
  sjkl: [3, 4, 5, 6],
  fdsjk: [1, 2, 3, 4, 5],
  fdsjl: [1, 2, 3, 4, 6],
  fdskl: [1, 2, 3, 5, 6],
  fdjkl: [1, 2, 4, 5, 6],
  dsjkl: [2, 3, 4, 5, 6],
  fdsjkl: [1, 2, 3, 4, 5, 6],
};

// Converter pontos Braille para caractere Unicode
function pointsToUnicode(points: number[]): string {
  if (points.length === 0) return "\u2800"; // Espaço Braille vazio
  let code = 0x2800;
  points.forEach((p) => {
    const bitMap = [0, 0x01, 0x02, 0x04, 0x08, 0x10, 0x20, 0x40, 0x80];
    code += bitMap[p] || 0;
  });
  return String.fromCharCode(code);
}

// Converter caractere Unicode para pontos Braille
function unicodeToPoints(char: string): number[] {
  const code = char.charCodeAt(0);
  if (code < 0x2800 || code > 0x28ff) return [];
  const offset = code - 0x2800;
  const points: number[] = [];
  const bitMap = [1, 2, 3, 4, 5, 6, 7, 8];
  bitMap.forEach((p, i) => {
    if (offset & (1 << i)) points.push(p);
  });
  return points;
}

export default function BrailleEditor() {
  const { user, loading } = useAuth({ redirectOnUnauthenticated: true });
  const [inputMode, setInputMode] = useState<"standard" | "perkins">("standard");
  const [projectTitle, setProjectTitle] = useState("Novo Projeto");
  const [language, setLanguage] = useState<"pt" | "en" | "es">("pt");
  const [brailleContent, setBrailleContent] = useState("");
  const [textContent, setTextContent] = useState("");
  const [musicContent, setMusicContent] = useState("");
  const [currentProjectId, setCurrentProjectId] = useState<number | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved">("idle");
  const [perkinsPressedKeys, setPerkinsPressedKeys] = useState<Set<string>>(new Set());
  const textInputRef = useRef<HTMLTextAreaElement>(null);
  const brailleInputRef = useRef<HTMLTextAreaElement>(null);

  // Mostrar loading enquanto verifica autenticação
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-600">Carregando...</p>
        </div>
      </div>
    );
  }

  // Queries e mutations
  const { data: projects = [] } = trpc.editor.list.useQuery();
  const createMutation = trpc.editor.create.useMutation();
  const updateMutation = trpc.editor.update.useMutation();
  const deleteMutation = trpc.editor.delete.useMutation();
  const importMusicXMLMutation = trpc.editor.importMusicXML.useMutation();
  const generateScaleMutation = trpc.editor.generateScale.useMutation();

  // Redirecionar se não autenticado
  useEffect(() => {
    if (user === null) {
      window.location.href = "/";
    }
  }, [user]);

  // Auto-save a cada 3 segundos se houver mudanças
  useEffect(() => {
    const timer = setTimeout(async () => {
      if (!currentProjectId || (brailleContent === "" && textContent === "")) return;
      
      setIsSaving(true);
      setSaveStatus("saving");
      try {
        await updateMutation.mutateAsync({
          id: currentProjectId,
          title: projectTitle,
          contentBraille: brailleContent,
          contentText: textContent,
          contentMusicXml: musicContent,
        });
        setSaveStatus("saved");
        setTimeout(() => setSaveStatus("idle"), 2000);
      } catch (err) {
        console.error("Auto-save failed:", err);
        setSaveStatus("idle");
      } finally {
        setIsSaving(false);
      }
    }, 3000);

    return () => clearTimeout(timer);
  }, [brailleContent, textContent, musicContent, projectTitle, currentProjectId]);

  // Handler para teclado Perkins
  const handlePerkinsPressDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    const key = e.key.toLowerCase();
    if (!["f", "d", "s", "j", "k", "l"].includes(key)) return;

    e.preventDefault();
    const newKeys = new Set(perkinsPressedKeys);
    newKeys.add(key);
    setPerkinsPressedKeys(newKeys);
  };

  const handlePerkinsKeyUp = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    const key = e.key.toLowerCase();
    if (!["f", "d", "s", "j", "k", "l"].includes(key)) return;

    e.preventDefault();
    const newKeys = new Set(perkinsPressedKeys);
    newKeys.delete(key);
    setPerkinsPressedKeys(newKeys);

    // Se todas as teclas foram soltas, processar a combinação
    if (newKeys.size === 0 && perkinsPressedKeys.size > 0) {
      const combination = Array.from(perkinsPressedKeys).sort().join("");
      const points = PERKINS_MAP[combination];
      if (points) {
        const brailleChar = pointsToUnicode(points);
        setBrailleContent((prev) => prev + brailleChar);
      }
    }
  };

  // Handler para input de texto padrão
  const handleTextInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setTextContent(e.target.value);
  };

  // Handler para input de Braille direto
  const handleBrailleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setBrailleContent(e.target.value);
  };

  // Criar novo projeto
  const handleNewProject = async () => {
    try {
      await createMutation.mutateAsync({
        title: "Novo Projeto",
        language: "pt",
        contentBraille: "",
        contentText: "",
        contentMusicXml: "",
      });
    } catch (err) {
      console.error("Failed to create project:", err);
    }
  };

  // Deletar projeto
  const handleDeleteProject = async (projectId: number) => {
    if (!confirm("Tem certeza que deseja deletar este projeto?")) return;
    try {
      await deleteMutation.mutateAsync({ id: projectId });
      setCurrentProjectId(null);
      setBrailleContent("");
      setTextContent("");
      setMusicContent("");
      setProjectTitle("Novo Projeto");
    } catch (err) {
      console.error("Failed to delete project:", err);
    }
  };

  // Renderizar grade Braille
  const renderBrailleGrid = () => {
    return (
      <div className="grid gap-2">
        {brailleContent.split("").map((char, idx) => {
          const points = unicodeToPoints(char);
          return (
            <div key={idx} className="flex gap-2 p-2 border rounded bg-slate-50">
              <div className="text-2xl font-bold">{char}</div>
              <div className="grid grid-cols-2 gap-1">
                {[1, 2, 3, 4, 5, 6].map((p) => (
                  <div
                    key={p}
                    className={`w-4 h-4 rounded-full border-2 ${
                      points.includes(p)
                        ? "bg-blue-600 border-blue-600"
                        : "bg-white border-gray-300"
                    }`}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Editor de Musicografia Braille</h1>
          <p className="text-gray-600 mt-2">Crie e edite partituras em Braille com suporte Perkins</p>
        </div>

        {/* Status de salvamento */}
        {saveStatus !== "idle" && (
          <Alert className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {saveStatus === "saving" ? "Salvando..." : "Salvo com sucesso!"}
            </AlertDescription>
          </Alert>
        )}

        {/* Barra de ferramentas */}
        <div className="flex gap-4 mb-6">
          <Input
            type="text"
            value={projectTitle}
            onChange={(e) => setProjectTitle(e.target.value)}
            placeholder="Título do projeto"
            className="flex-1"
          />
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value as "pt" | "en" | "es")}
            className="px-4 py-2 border rounded"
          >
            <option value="pt">Português</option>
            <option value="en">English</option>
            <option value="es">Español</option>
          </select>
          <Button onClick={handleNewProject} variant="outline">
            <Plus className="w-4 h-4 mr-2" />
            Novo
          </Button>
          <Button variant="outline">
            <Download className="w-4 h-4 mr-2" />
            Exportar
          </Button>
        </div>

        {/* Conteúdo principal */}
        <div className="grid grid-cols-3 gap-6">
          {/* Painel de Entrada */}
          <Card className="p-6 col-span-1">
            <h2 className="text-xl font-bold mb-4">Entrada</h2>
            
            <Tabs value={inputMode} onValueChange={(v) => setInputMode(v as "standard" | "perkins")}>
              <TabsList className="w-full mb-4">
                <TabsTrigger value="standard" className="flex-1">Padrão</TabsTrigger>
                <TabsTrigger value="perkins" className="flex-1">Perkins</TabsTrigger>
              </TabsList>

              <TabsContent value="standard">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Texto em tinta</label>
                    <textarea
                      ref={textInputRef}
                      value={textContent}
                      onChange={handleTextInput}
                      placeholder="Digite o texto em tinta..."
                      className="w-full h-32 p-3 border rounded font-mono text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Braille Unicode</label>
                    <textarea
                      ref={brailleInputRef}
                      value={brailleContent}
                      onChange={handleBrailleInput}
                      placeholder="Cole caracteres Braille Unicode..."
                      className="w-full h-32 p-3 border rounded font-mono text-sm"
                    />
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="perkins">
                <div className="space-y-4">
                  <div className="bg-blue-50 p-4 rounded border border-blue-200">
                    <p className="text-sm font-medium mb-3">Combinações de teclas:</p>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>F = Ponto 1</div>
                      <div>D = Ponto 2</div>
                      <div>S = Ponto 3</div>
                      <div>J = Ponto 4</div>
                      <div>K = Ponto 5</div>
                      <div>L = Ponto 6</div>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Entrada Perkins</label>
                    <textarea
                      onKeyDown={handlePerkinsPressDown}
                      onKeyUp={handlePerkinsKeyUp}
                      placeholder="Pressione as teclas Perkins (F, D, S, J, K, L)..."
                      className="w-full h-32 p-3 border rounded font-mono text-sm"
                      readOnly
                    />
                  </div>
                  <div className="text-xs text-gray-600">
                    Teclas pressionadas: {Array.from(perkinsPressedKeys).join(", ") || "nenhuma"}
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </Card>

          {/* Grade Braille */}
          <Card className="p-6 col-span-1">
            <h2 className="text-xl font-bold mb-4">Grade Braille</h2>
            <div className="max-h-96 overflow-y-auto">
              {brailleContent.length > 0 ? (
                renderBrailleGrid()
              ) : (
                <p className="text-gray-500 text-center py-8">Nenhum conteúdo Braille ainda</p>
              )}
            </div>
          </Card>

          {/* Partitura */}
          <Card className="p-6 col-span-1">
            <h2 className="text-xl font-bold mb-4">Partitura</h2>
            <div className="bg-gray-100 h-96 rounded">
              <SheetMusicRenderer brailleContent={brailleContent} language={language} />
            </div>
          </Card>
        </div>

        {/* Projetos salvos */}
        <Card className="mt-6 p-6">
          <h2 className="text-xl font-bold mb-4">Meus Projetos</h2>
          {projects && projects.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
             {projects?.map((proj: any) => (
                <Card key={proj.id} className="p-4 hover:shadow-lg cursor-pointer transition">
                  <h3 className="font-bold text-lg mb-2">{proj.title}</h3>
                  <p className="text-sm text-gray-600 mb-3">
                    {proj.contentBraille?.length || 0} caracteres Braille
                  </p>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setCurrentProjectId(proj.id);
                        setProjectTitle(proj.title);
                        setBrailleContent(proj.contentBraille || "");
                        setTextContent(proj.contentText || "");
                        setMusicContent(proj.contentMusicXml || "");
                      }}
                    >
                      Abrir
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleDeleteProject(proj.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            <p className="text-gray-500">Nenhum projeto salvo ainda</p>
          )}
        </Card>
      </div>
    </div>
  );
}
