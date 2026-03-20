import { useState, useRef } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import SiteLayout from "@/components/SiteLayout";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trash2, Upload, FileText, Mail, ShieldAlert } from "lucide-react";
import { toast } from "sonner";
import { Link } from "wouter";

const gradeStages: Record<number, number> = { 1: 2, 2: 5, 3: 5, 4: 3, 5: 8 };

export default function Admin() {
  const { t } = useLanguage();
  const { user, isAuthenticated } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({
    title: "", description: "", grade: 1, stage: undefined as number | undefined,
    language: "pt" as "pt" | "en" | "both",
  });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [activeTab, setActiveTab] = useState<"upload" | "materials" | "messages">("upload");

  const utils = trpc.useUtils();
  const { data: materials = [], isLoading: materialsLoading } = trpc.materials.list.useQuery({});
  const { data: messages = [], isLoading: messagesLoading } = trpc.contact.list.useQuery();

  const uploadMutation = trpc.materials.upload.useMutation({
    onSuccess: () => {
      toast.success("Material enviado com sucesso!");
      setForm({ title: "", description: "", grade: 1, stage: undefined, language: "pt" });
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      utils.materials.list.invalidate();
    },
    onError: (err) => toast.error(`Erro ao enviar: ${err.message}`),
  });

  const deleteMutation = trpc.materials.delete.useMutation({
    onSuccess: () => {
      toast.success("Material removido.");
      utils.materials.list.invalidate();
    },
    onError: () => toast.error("Erro ao remover material."),
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) setSelectedFile(file);
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) { toast.error("Selecione um arquivo."); return; }
    if (!form.title) { toast.error("Informe o título."); return; }

    const reader = new FileReader();
    reader.onload = () => {
      const base64 = (reader.result as string).split(",")[1];
      uploadMutation.mutate({
        ...form,
        fileBase64: base64,
        fileName: selectedFile.name,
        mimeType: selectedFile.type,
        fileSize: selectedFile.size,
      });
    };
    reader.readAsDataURL(selectedFile);
  };

  if (!isAuthenticated || user?.role !== "admin") {
    return (
      <SiteLayout>
        <div className="container py-24 text-center">
          <ShieldAlert className="w-16 h-16 text-destructive mx-auto mb-4" aria-hidden="true" />
          <h1 className="text-2xl font-bold text-foreground mb-2">Acesso Restrito</h1>
          <p className="text-muted-foreground mb-6">Esta área é exclusiva para administradores.</p>
          <Button asChild variant="outline"><Link href="/">Voltar ao Início</Link></Button>
        </div>
      </SiteLayout>
    );
  }

  return (
    <SiteLayout>
      <section className="bg-primary text-primary-foreground py-10" aria-labelledby="admin-heading">
        <div className="container">
          <h1 id="admin-heading" className="text-3xl font-bold mb-1">Administração</h1>
          <p className="text-primary-foreground/80">Gerencie materiais e mensagens do Five Steps</p>
        </div>
      </section>

      <div className="container py-10">
        {/* Tab Nav */}
        <div className="flex gap-2 mb-8 border-b border-border" role="tablist" aria-label="Seções de administração">
          {(["upload", "materials", "messages"] as const).map((tab) => (
            <button
              key={tab}
              role="tab"
              aria-selected={activeTab === tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors focus-visible:outline-2 focus-visible:outline-primary ${
                activeTab === tab
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab === "upload" && "Enviar Material"}
              {tab === "materials" && `Materiais (${materials.length})`}
              {tab === "messages" && `Mensagens (${messages.length})`}
            </button>
          ))}
        </div>

        {/* Upload Tab */}
        {activeTab === "upload" && (
          <Card className="max-w-2xl border-border shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Upload className="w-5 h-5 text-primary" aria-hidden="true" />
                Enviar Novo Material
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleUpload} noValidate className="space-y-5">
                <div className="space-y-1.5">
                  <Label htmlFor="mat-title">Título <span className="text-destructive">*</span></Label>
                  <Input id="mat-title" required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Ex: Exercícios de Notas — Grau 1" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="mat-desc">Descrição</Label>
                  <Textarea id="mat-desc" rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Descreva brevemente o conteúdo do material..." className="resize-none" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="mat-grade">Grau <span className="text-destructive">*</span></Label>
                    <Select value={String(form.grade)} onValueChange={(v) => setForm({ ...form, grade: parseInt(v), stage: undefined })}>
                      <SelectTrigger id="mat-grade"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">Grau 1 — Notas e Alturas</SelectItem>
                        <SelectItem value="2">Grau 2 — Tempo</SelectItem>
                        <SelectItem value="3">Grau 3 — Intervalos Diatônicos</SelectItem>
                        <SelectItem value="4">Grau 4 — Intervalos Cromáticos</SelectItem>
                        <SelectItem value="5">Grau 5 — Tópicos Diversos</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="mat-stage">Etapa (opcional)</Label>
                    <Select value={form.stage ? String(form.stage) : "none"} onValueChange={(v) => setForm({ ...form, stage: v === "none" ? undefined : parseInt(v) })}>
                      <SelectTrigger id="mat-stage"><SelectValue placeholder="Selecionar..." /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Sem etapa específica</SelectItem>
                        {Array.from({ length: gradeStages[form.grade] ?? 0 }, (_, i) => i + 1).map((s) => (
                          <SelectItem key={s} value={String(s)}>Etapa {s}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="mat-lang">Idioma</Label>
                  <Select value={form.language} onValueChange={(v) => setForm({ ...form, language: v as typeof form.language })}>
                    <SelectTrigger id="mat-lang"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pt">Português</SelectItem>
                      <SelectItem value="en">English</SelectItem>
                      <SelectItem value="both">Bilíngue</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="mat-file">Arquivo <span className="text-destructive">*</span></Label>
                  <Input id="mat-file" type="file" ref={fileInputRef} onChange={handleFileChange} accept=".pdf,.mp3,.wav,.xml,.mxl,.brl,.txt,.zip" className="cursor-pointer" />
                  {selectedFile && (
                    <p className="text-xs text-muted-foreground mt-1">
                      <FileText className="w-3 h-3 inline mr-1" aria-hidden="true" />
                      {selectedFile.name} — {(selectedFile.size / 1024).toFixed(1)} KB
                    </p>
                  )}
                </div>
                <Button type="submit" className="w-full bg-primary text-primary-foreground hover:bg-primary/90 font-semibold" disabled={uploadMutation.isPending}>
                  {uploadMutation.isPending ? "Enviando..." : "Enviar Material"}
                </Button>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Materials Tab */}
        {activeTab === "materials" && (
          <div>
            {materialsLoading ? (
              <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-16 bg-muted rounded-xl animate-pulse" />)}</div>
            ) : materials.length === 0 ? (
              <p className="text-muted-foreground text-center py-12">Nenhum material cadastrado ainda.</p>
            ) : (
              <div className="space-y-3">
                {materials.map((m) => (
                  <Card key={m.id} className="border-border shadow-sm">
                    <CardContent className="p-4 flex items-center justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant="outline" className="text-xs">Grau {m.grade}{m.stage ? ` · Etapa ${m.stage}` : ""}</Badge>
                          <Badge variant="secondary" className="text-xs">{m.language.toUpperCase()}</Badge>
                        </div>
                        <p className="font-medium text-sm text-foreground truncate">{m.title}</p>
                        <p className="text-xs text-muted-foreground truncate">{m.fileName}</p>
                      </div>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => { if (confirm("Remover este material?")) deleteMutation.mutate({ id: m.id }); }}
                        aria-label={`Remover ${m.title}`}
                        className="flex-shrink-0"
                      >
                        <Trash2 className="w-4 h-4" aria-hidden="true" />
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Messages Tab */}
        {activeTab === "messages" && (
          <div>
            {messagesLoading ? (
              <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-20 bg-muted rounded-xl animate-pulse" />)}</div>
            ) : messages.length === 0 ? (
              <p className="text-muted-foreground text-center py-12">Nenhuma mensagem recebida ainda.</p>
            ) : (
              <div className="space-y-4">
                {messages.map((msg) => (
                  <Card key={msg.id} className="border-border shadow-sm">
                    <CardContent className="p-5">
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <div className="flex items-center gap-2">
                          <Mail className="w-4 h-4 text-primary flex-shrink-0" aria-hidden="true" />
                          <span className="font-semibold text-sm text-foreground">{msg.name}</span>
                          {msg.institution && <span className="text-xs text-muted-foreground">— {msg.institution}</span>}
                        </div>
                        <Badge variant={msg.status === "new" ? "default" : "secondary"} className="text-xs flex-shrink-0">
                          {msg.status === "new" ? "Novo" : msg.status === "read" ? "Lido" : "Respondido"}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mb-1">
                        <a href={`mailto:${msg.email}`} className="hover:text-primary transition-colors">{msg.email}</a>
                        {" · "}{new Date(msg.createdAt).toLocaleDateString("pt-BR")}
                      </p>
                      <p className="text-sm font-medium text-foreground mb-1">{msg.subject}</p>
                      <p className="text-sm text-muted-foreground leading-relaxed">{msg.message}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </SiteLayout>
  );
}
