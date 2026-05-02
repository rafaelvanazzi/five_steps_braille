import { useState, useMemo, useEffect, useRef } from "react";
import { announce } from "@/hooks/useA11yAnnounce";
import { useLanguage } from "@/contexts/LanguageContext";
import SiteLayout from "@/components/SiteLayout";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose,
} from "@/components/ui/dialog";
import {
  FileDown, Lock, BookOpen, FileText, Music, Star, MessageSquare, Send, Trash2,
  ChevronDown, ChevronUp, Eye, EyeOff, User, Pencil, Upload, MoreVertical,
} from "lucide-react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";

const gradeLabels: Record<number, { pt: string; en: string; badge: string }> = {
  1: { pt: "Notas e Alturas", en: "Notes & Pitches", badge: "grade-badge-1" },
  2: { pt: "Tempo", en: "Time", badge: "grade-badge-2" },
  3: { pt: "Intervalos Diatônicos", en: "Diatonic Intervals", badge: "grade-badge-3" },
  4: { pt: "Intervalos Cromáticos", en: "Chromatic Intervals", badge: "grade-badge-4" },
  5: { pt: "Tópicos Diversos", en: "Diverse Topics", badge: "grade-badge-5" },
};

const gradeStages: Record<number, number> = { 1: 2, 2: 5, 3: 5, 4: 3, 5: 8 };

function FileIcon({ mimeType, fileName }: { mimeType?: string | null; fileName?: string | null }) {
  const ext = fileName?.split(".").pop()?.toLowerCase() ?? "";
  if (mimeType?.includes("audio") || ["mp3","wav","ogg","flac","aac","m4a"].includes(ext))
    return <Music className="w-5 h-5 text-purple-600" aria-hidden="true" />;
  if (mimeType?.includes("video") || ["mp4","mov","avi","mkv","webm"].includes(ext))
    return <Music className="w-5 h-5 text-pink-600" aria-hidden="true" />;
  if (mimeType?.includes("pdf") || ext === "pdf")
    return <FileText className="w-5 h-5 text-red-600" aria-hidden="true" />;
  if (["doc","docx","odt","rtf"].includes(ext))
    return <FileText className="w-5 h-5 text-blue-700" aria-hidden="true" />;
  if (["xls","xlsx","ods","csv"].includes(ext))
    return <FileText className="w-5 h-5 text-green-700" aria-hidden="true" />;
  if (["xml","mxl","musicxml"].includes(ext))
    return <Music className="w-5 h-5 text-indigo-600" aria-hidden="true" />;
  if (["brl","brm","brf"].includes(ext))
    return <BookOpen className="w-5 h-5 text-amber-600" aria-hidden="true" />;
  if (["zip","rar","7z","tar","gz"].includes(ext))
    return <FileText className="w-5 h-5 text-gray-500" aria-hidden="true" />;
  if (["txt","md"].includes(ext))
    return <FileText className="w-5 h-5 text-gray-600" aria-hidden="true" />;
  return <FileText className="w-5 h-5 text-blue-600" aria-hidden="true" />;
}

function formatSize(bytes?: number | null) {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// ─── Star Rating Component ──────────────────────────────────────────────────
function StarRating({ materialId, isAuthenticated }: { materialId: number; isAuthenticated: boolean }) {
  const [hoverStar, setHoverStar] = useState(0);
  const utils = trpc.useUtils();
  const { data: ratingData } = trpc.ratings.getForMaterial.useQuery({ materialId });
  const { data: userRating } = trpc.ratings.getUserRating.useQuery({ materialId }, { enabled: isAuthenticated });
  const rateMutation = trpc.ratings.rate.useMutation({
    onSuccess: () => {
      utils.ratings.getForMaterial.invalidate({ materialId });
      utils.ratings.getUserRating.invalidate({ materialId });
      toast.success("Avaliação registrada!");
    },
    onError: () => toast.error("Erro ao avaliar."),
  });
  const handleRate = (rating: number) => {
    if (!isAuthenticated) { toast.error("Faça login para avaliar."); return; }
    rateMutation.mutate({ materialId, rating });
  };
  const currentUserRating = userRating?.rating ?? 0;
  const average = ratingData?.average ?? 0;
  const count = ratingData?.count ?? 0;
  return (
    <div className="flex items-center gap-2 flex-wrap">
      <div className="flex items-center gap-0.5" role="radiogroup" aria-label={`Avaliação: ${count > 0 ? `média ${average.toFixed(1)} de 5, ${count} avaliações` : "sem avaliações"}`}>
        {[1, 2, 3, 4, 5].map((s) => (
          <button key={s} onClick={() => handleRate(s)}
            onMouseEnter={() => isAuthenticated && setHoverStar(s)}
            onMouseLeave={() => setHoverStar(0)}
            disabled={!isAuthenticated || rateMutation.isPending}
            className="p-0.5 focus-visible:outline-2 focus-visible:outline-primary rounded disabled:cursor-default"
            role="radio" aria-checked={s === currentUserRating}
            aria-label={`${s} estrela${s > 1 ? "s" : ""}${s === currentUserRating ? " (sua avaliação atual)" : ""}`}>
            <Star className={`w-4 h-4 transition-colors ${(hoverStar > 0 ? s <= hoverStar : s <= currentUserRating) ? "text-yellow-500 fill-yellow-500" : s <= Math.round(average) ? "text-yellow-400 fill-yellow-400/50" : "text-gray-300"}`} aria-hidden="true" />
          </button>
        ))}
      </div>
      <span className="text-xs text-muted-foreground">{count > 0 ? `${average.toFixed(1)} (${count})` : "Sem avaliações"}</span>
    </div>
  );
}

// ─── Comments Section ───────────────────────────────────────────────────────
function CommentsSection({ materialId, isAuthenticated }: { materialId: number; isAuthenticated: boolean }) {
  const [showComments, setShowComments] = useState(false);
  const [newComment, setNewComment] = useState("");
  const { user } = useAuth();
  const utils = trpc.useUtils();
  const { data: comments = [], isLoading } = trpc.comments.getForMaterial.useQuery({ materialId }, { enabled: showComments });
  const addMutation = trpc.comments.add.useMutation({
    onSuccess: () => { setNewComment(""); utils.comments.getForMaterial.invalidate({ materialId }); toast.success("Comentário adicionado!"); },
    onError: () => toast.error("Erro ao comentar."),
  });
  const deleteMutation = trpc.comments.delete.useMutation({
    onSuccess: () => { utils.comments.getForMaterial.invalidate({ materialId }); toast.success("Comentário removido."); },
    onError: () => toast.error("Erro ao remover."),
  });
  return (
    <div className="mt-3 pt-3 border-t border-border/50">
      <button onClick={() => setShowComments(!showComments)} aria-expanded={showComments}
        className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors">
        <MessageSquare className="w-3.5 h-3.5" aria-hidden="true" />
        {showComments ? "Ocultar comentários" : "Ver comentários"}
        {showComments ? <ChevronUp className="w-3 h-3" aria-hidden="true" /> : <ChevronDown className="w-3 h-3" aria-hidden="true" />}
      </button>
      {showComments && (
        <div className="mt-3 space-y-3">
          {isLoading ? <div className="h-8 bg-muted rounded animate-pulse" /> :
            comments.length === 0 ? <p className="text-xs text-muted-foreground italic">Nenhum comentário ainda. Seja o primeiro!</p> : (
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {comments.map((c) => (
                  <div key={c.id} className="bg-muted/50 rounded-lg p-3">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className="text-xs font-medium text-foreground">{c.userName ?? "Anônimo"}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">{new Date(c.createdAt).toLocaleDateString("pt-BR")}</span>
                        {(user?.id === c.userId || user?.role === "admin") && (
                          <button onClick={() => { if (confirm("Remover este comentário?")) deleteMutation.mutate({ id: c.id }); }}
                            className="text-muted-foreground hover:text-destructive transition-colors" aria-label="Remover comentário">
                            <Trash2 className="w-3 h-3" aria-hidden="true" />
                          </button>
                        )}
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground leading-relaxed">{c.content}</p>
                  </div>
                ))}
              </div>
            )}
          {isAuthenticated ? (
            <div className="flex gap-2">
              <Textarea value={newComment} onChange={(e) => setNewComment(e.target.value)}
                placeholder="Escreva um comentário..." rows={2} className="text-sm resize-none flex-1"
                maxLength={2000} aria-label="Escreva um comentário" />
              <Button size="sm" onClick={() => { if (newComment.trim()) addMutation.mutate({ materialId, content: newComment.trim() }); }}
                disabled={!newComment.trim() || addMutation.isPending} className="self-end gap-1">
                <Send className="w-3.5 h-3.5" aria-hidden="true" />
                {addMutation.isPending ? "..." : "Enviar"}
              </Button>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">
              <a href={getLoginUrl()} className="text-primary hover:underline">Faça login</a> para comentar.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Edit Material Dialog ───────────────────────────────────────────────────
type MaterialForEdit = {
  id: number; title: string; description?: string | null; grade: number;
  stage?: number | null; language: string; materialType: string;
  creatorVision: string; creatorName?: string | null;
};

function EditMaterialDialog({
  material, open, onClose, onSuccess,
}: { material: MaterialForEdit; open: boolean; onClose: () => void; onSuccess: () => void }) {
  const [form, setForm] = useState({
    title: material.title,
    description: material.description ?? "",
    grade: material.grade,
    stage: material.stage ?? undefined as number | undefined,
    language: material.language as "pt" | "en" | "both",
    materialType: material.materialType as "partitura" | "atividade",
    creatorVision: material.creatorVision as "vidente" | "pdv",
    creatorName: material.creatorName ?? "",
  });

  const editMutation = trpc.materials.edit.useMutation({
    onSuccess: () => { toast.success("Material atualizado!"); onSuccess(); onClose(); },
    onError: (e) => toast.error(`Erro: ${e.message}`),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    editMutation.mutate({
      id: material.id,
      title: form.title,
      description: form.description || null,
      grade: form.grade,
      stage: form.stage ?? null,
      language: form.language,
      materialType: form.materialType,
      creatorVision: form.creatorVision,
      creatorName: form.creatorName || null,
    });
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar Material</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4" aria-label="Formulário de edição de material">
          <div className="space-y-1.5">
            <Label htmlFor="edit-title">Título <span className="text-destructive" aria-label="obrigatório">*</span></Label>
            <Input id="edit-title" required aria-required="true" value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="edit-desc">Descrição</Label>
            <Textarea id="edit-desc" rows={3} value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="resize-none" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="edit-grade">Grau <span className="text-destructive" aria-label="obrigatório">*</span></Label>
              <Select value={String(form.grade)} onValueChange={(v) => setForm({ ...form, grade: parseInt(v), stage: undefined })}>
                <SelectTrigger id="edit-grade"><SelectValue /></SelectTrigger>
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
              <Label htmlFor="edit-stage">Etapa</Label>
              <Select value={form.stage ? String(form.stage) : "none"}
                onValueChange={(v) => setForm({ ...form, stage: v === "none" ? undefined : parseInt(v) })}>
                <SelectTrigger id="edit-stage"><SelectValue placeholder="Sem etapa" /></SelectTrigger>
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
            <Label htmlFor="edit-lang">Idioma</Label>
            <Select value={form.language} onValueChange={(v) => setForm({ ...form, language: v as typeof form.language })}>
              <SelectTrigger id="edit-lang"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="pt">Português</SelectItem>
                <SelectItem value="en">English</SelectItem>
                <SelectItem value="both">Bilíngue</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="edit-type">Tipo</Label>
              <Select value={form.materialType} onValueChange={(v) => setForm({ ...form, materialType: v as typeof form.materialType })}>
                <SelectTrigger id="edit-type"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="atividade">Atividade de Musicalização</SelectItem>
                  <SelectItem value="partitura">Partitura</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-vision">Criador</Label>
              <Select value={form.creatorVision} onValueChange={(v) => setForm({ ...form, creatorVision: v as typeof form.creatorVision })}>
                <SelectTrigger id="edit-vision"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="vidente">Vidente</SelectItem>
                  <SelectItem value="pdv">Pessoa com DV (PDV)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="edit-creator">Nome do Criador</Label>
            <Input id="edit-creator" value={form.creatorName}
              onChange={(e) => setForm({ ...form, creatorName: e.target.value })}
              placeholder="Ex: Rafael Vanazzi" />
          </div>
          <DialogFooter className="gap-2">
            <DialogClose asChild>
              <Button type="button" variant="outline">Cancelar</Button>
            </DialogClose>
            <Button type="submit" disabled={editMutation.isPending}>
              {editMutation.isPending ? "Salvando..." : "Salvar Alterações"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Replace File Dialog ────────────────────────────────────────────────────
function ReplaceFileDialog({
  materialId, materialTitle, open, onClose, onSuccess,
}: { materialId: number; materialTitle: string; open: boolean; onClose: () => void; onSuccess: () => void }) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const replaceMutation = trpc.materials.replaceFile.useMutation({
    onSuccess: () => { toast.success("Arquivo substituído com sucesso!"); onSuccess(); onClose(); setSelectedFile(null); },
    onError: (e) => toast.error(`Erro: ${e.message}`),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) { toast.error("Selecione um arquivo."); return; }
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = (reader.result as string).split(",")[1];
      replaceMutation.mutate({
        id: materialId,
        fileBase64: base64,
        fileName: selectedFile.name,
        mimeType: selectedFile.type,
        fileSize: selectedFile.size,
      });
    };
    reader.readAsDataURL(selectedFile);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Substituir Arquivo</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          Substituindo o arquivo de: <span className="font-medium text-foreground">{materialTitle}</span>
        </p>
        <form onSubmit={handleSubmit} className="space-y-4" aria-label="Formulário de substituição de arquivo">
          <div className="space-y-1.5">
            <Label htmlFor="replace-file">Novo arquivo <span className="text-destructive" aria-label="obrigatório">*</span></Label>
            <Input id="replace-file" type="file" ref={fileInputRef}
              onChange={(e) => setSelectedFile(e.target.files?.[0] ?? null)}
              aria-required="true" className="cursor-pointer" />
            {selectedFile && (
              <p className="text-xs text-muted-foreground">
                <FileText className="w-3 h-3 inline mr-1" aria-hidden="true" />
                {selectedFile.name} — {(selectedFile.size / 1024).toFixed(1)} KB
              </p>
            )}
          </div>
          <DialogFooter className="gap-2">
            <DialogClose asChild>
              <Button type="button" variant="outline">Cancelar</Button>
            </DialogClose>
            <Button type="submit" disabled={!selectedFile || replaceMutation.isPending}>
              {replaceMutation.isPending ? "Enviando..." : "Substituir Arquivo"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Material Card ──────────────────────────────────────────────────────────
type MaterialData = {
  id: number; title: string; description?: string | null; grade: number;
  stage?: number | null; fileName: string; fileSize?: number | null;
  mimeType?: string | null; language: string; materialType: string;
  creatorVision: string; creatorName?: string | null;
  uploadedBy: number; hidden: boolean;
};

type MaterialFile = {
  id: number;
  materialId: number;
  fileKey: string;
  fileUrl: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  uploadedBy: number;
  createdAt: Date;
};

function MaterialCard({ material, isAuthenticated, currentUserId, currentUserRole, onMutated }: {
  material: MaterialData;
  isAuthenticated: boolean;
  currentUserId?: number;
  currentUserRole?: string;
  onMutated: () => void;
}) {
  const { t } = useLanguage();
  const [editOpen, setEditOpen] = useState(false);
  const [replaceOpen, setReplaceOpen] = useState(false);
  const [addFileOpen, setAddFileOpen] = useState(false);
  const { data: additionalFiles = [] } = trpc.materials.getFiles.useQuery({ materialId: material.id });
  const deleteFileMutation = trpc.materials.deleteFile.useMutation({
    onSuccess: () => { toast.success("Arquivo removido."); onMutated(); },
    onError: (e) => toast.error(`Erro: ${e.message}`),
  });

  const utils = trpc.useUtils();
  const isOwner = currentUserId === material.uploadedBy;
  const isAdmin = currentUserRole === "admin";
  const canManage = isOwner || isAdmin;

  const getDownload = trpc.materials.getDownloadUrl.useQuery({ id: material.id }, { enabled: false });

  const deleteMutation = trpc.materials.delete.useMutation({
    onSuccess: () => { toast.success("Material removido."); onMutated(); },
    onError: (e) => toast.error(`Erro ao remover: ${e.message}`),
  });

  const toggleVisibilityMutation = trpc.materials.toggleVisibility.useMutation({
    onSuccess: (_, vars) => {
      toast.success(vars.hidden ? "Material ocultado para revisão." : "Material publicado no acervo.");
      onMutated();
    },
    onError: (e) => toast.error(`Erro: ${e.message}`),
  });

  const [downloadingFileId, setDownloadingFileId] = useState<number | null>(null);

  const handleDownload = async () => {
    if (!isAuthenticated) { toast.error(t.library_login_required); return; }
    const result = await getDownload.refetch();
    if (result.data) {
      const a = document.createElement("a");
      a.href = result.data.url;
      a.download = result.data.fileName;
      a.target = "_blank";
      a.rel = "noopener noreferrer";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
  };

  const handleDownloadAdditionalFile = async (fileId: number, fileName: string) => {
    if (!isAuthenticated) { toast.error(t.library_login_required); return; }
    setDownloadingFileId(fileId);
    try {
      const result = await utils.client.materials.getFileDownloadUrl.query({ fileId });
      if (result) {
        const a = document.createElement("a");
        a.href = result.url;
        a.download = result.fileName;
        a.target = "_blank";
        a.rel = "noopener noreferrer";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      }
    } catch (e: any) {
      toast.error(`Erro ao baixar arquivo: ${e.message}`);
    } finally {
      setDownloadingFileId(null);
    }
  };

  const gradeInfo = gradeLabels[material.grade];
  const isPartitura = material.materialType === "partitura";
  const isPDV = material.creatorVision === "pdv";

  return (
    <>
      <Card className={`border shadow-sm hover:shadow-md transition-shadow ${material.hidden ? "border-amber-300 bg-amber-50/30 dark:bg-amber-900/10" : "border-border"}`}>
        <CardContent className="p-5">
          {/* Hidden badge */}
          {material.hidden && (
            <div className="flex items-center gap-1.5 mb-3 px-2 py-1 bg-amber-100 dark:bg-amber-900/30 rounded text-xs font-medium text-amber-800 dark:text-amber-300 w-fit">
              <EyeOff className="w-3.5 h-3.5" aria-hidden="true" />
              Oculto — em revisão
            </div>
          )}

          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 mt-0.5">
              <FileIcon mimeType={material.mimeType} fileName={material.fileName} />
            </div>
            <div className="flex-1 min-w-0">
              {/* Badges row */}
              <div className="flex flex-wrap items-center gap-1.5 mb-2">
                <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold ${gradeInfo?.badge ?? ""}`}>
                  Grau {material.grade}{material.stage ? ` · Etapa ${material.stage}` : ""}
                </span>
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${isPartitura ? "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300" : "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300"}`}>
                  {isPartitura ? <FileText className="w-3 h-3" aria-hidden="true" /> : <Music className="w-3 h-3" aria-hidden="true" />}
                  {isPartitura ? t.library_type_partitura : t.library_type_atividade}
                </span>
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${isPDV ? "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300" : "bg-gray-100 text-gray-700 dark:bg-gray-800/50 dark:text-gray-300"}`}>
                  {isPDV ? <EyeOff className="w-3 h-3" aria-hidden="true" /> : <Eye className="w-3 h-3" aria-hidden="true" />}
                  {isPDV ? t.library_creator_pdv : t.library_creator_vidente}
                </span>
                {material.language !== "both" && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-muted text-muted-foreground border border-border">
                    {material.language.toUpperCase()}
                  </span>
                )}
              </div>

              <h3 className="font-semibold text-foreground text-sm leading-tight mb-1 truncate">{material.title}</h3>

              {material.creatorName && (
                <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                  <User className="w-3 h-3" aria-hidden="true" />
                  {t.library_creator_by}: <span className="font-medium text-foreground/80">{material.creatorName}</span>
                </p>
              )}

              {material.description && (
                <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2 mb-2">{material.description}</p>
              )}
              <p className="text-xs text-muted-foreground mb-2">{material.fileName}{formatSize(material.fileSize) && ` · ${formatSize(material.fileSize)}`}</p>
              {additionalFiles.length > 0 && (
                <div className="mt-3 pt-3 border-t border-border space-y-1.5">
                  <p className="text-xs font-medium text-foreground">Arquivos adicionais ({additionalFiles.length}):</p>
                  {additionalFiles.map((file) => (
                    <div key={file.id} className="flex items-center justify-between gap-2 p-2 rounded bg-muted/50">
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <FileIcon mimeType={file.mimeType} fileName={file.fileName} />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-foreground truncate">{file.fileName}</p>
                          <p className="text-xs text-muted-foreground">{formatSize(file.fileSize)}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        {isAuthenticated && (
                          <Button size="sm" variant="ghost" className="h-7 w-7 p-0"
                            onClick={() => handleDownloadAdditionalFile(file.id, file.fileName)}
                            disabled={downloadingFileId === file.id}
                            aria-label={`Baixar ${file.fileName}`}>
                            <FileDown className="w-3.5 h-3.5 text-primary" aria-hidden="true" />
                          </Button>
                        )}
                        {isOwner && (
                          <Button size="sm" variant="ghost" className="h-7 w-7 p-0"
                            onClick={() => { if (confirm(`Remover "${file.fileName}"?`)) deleteFileMutation.mutate({ fileId: file.id }); }}
                            disabled={deleteFileMutation.isPending}
                            aria-label={`Deletar ${file.fileName}`}>
                            <Trash2 className="w-3.5 h-3.5 text-destructive" aria-hidden="true" />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <StarRating materialId={material.id} isAuthenticated={isAuthenticated} />
              <CommentsSection materialId={material.id} isAuthenticated={isAuthenticated} />
            </div>

            {/* Action buttons */}
            <div className="flex-shrink-0 flex flex-col items-end gap-2">
              {/* Download button */}
              {isAuthenticated ? (
                <Button size="sm" variant="outline" onClick={handleDownload}
                  disabled={getDownload.isFetching} aria-label={`Baixar ${material.title}`} className="gap-1">
                  <FileDown className="w-4 h-4" aria-hidden="true" />
                  {t.library_download}
                </Button>
              ) : (
                <Button size="sm" variant="outline" asChild className="gap-1 text-muted-foreground">
                  <a href={getLoginUrl()} aria-label={`Faça login para baixar ${material.title}`}>
                    <Lock className="w-4 h-4" aria-hidden="true" />
                    {t.library_login}
                  </a>
                </Button>
              )}

              {/* Management menu (owner or admin) */}
              {canManage && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button size="sm" variant="ghost" className="h-8 w-8 p-0"
                      aria-label={`Gerenciar ${material.title}`}>
                      <MoreVertical className="w-4 h-4" aria-hidden="true" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-52">
                    <DropdownMenuItem onClick={() => setEditOpen(true)} className="gap-2 cursor-pointer">
                      <Pencil className="w-4 h-4" aria-hidden="true" />
                      Editar atributos
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setReplaceOpen(true)} className="gap-2 cursor-pointer">
                      <Upload className="w-4 h-4" aria-hidden="true" />
                      Substituir arquivo
                    {isOwner && (
                      <DropdownMenuItem onClick={() => setAddFileOpen(true)} className="gap-2 cursor-pointer">
                        <Upload className="w-4 h-4" aria-hidden="true" />
                        Adicionar arquivo
                      </DropdownMenuItem>
                    )}
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => toggleVisibilityMutation.mutate({ id: material.id, hidden: !material.hidden })}
                      disabled={toggleVisibilityMutation.isPending}
                      className="gap-2 cursor-pointer">
                      {material.hidden
                        ? <><Eye className="w-4 h-4" aria-hidden="true" /> Publicar no acervo</>
                        : <><EyeOff className="w-4 h-4" aria-hidden="true" /> Ocultar para revisão</>}
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => { if (confirm(`Remover permanentemente "${material.title}"?`)) deleteMutation.mutate({ id: material.id }); }}
                      disabled={deleteMutation.isPending}
                      className="gap-2 cursor-pointer text-destructive focus:text-destructive">
                      <Trash2 className="w-4 h-4" aria-hidden="true" />
                      Deletar permanentemente
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Dialogs */}
      {editOpen && (
        <EditMaterialDialog material={material} open={editOpen}
          onClose={() => setEditOpen(false)} onSuccess={onMutated} />
      )}
      {replaceOpen && (
        <ReplaceFileDialog materialId={material.id} materialTitle={material.title}
          open={replaceOpen} onClose={() => setReplaceOpen(false)} onSuccess={onMutated} />
      )}
      {addFileOpen && isOwner && (
        <AddFileDialog materialId={material.id} materialTitle={material.title}
          open={addFileOpen} onClose={() => setAddFileOpen(false)} onSuccess={onMutated} />
      )}
    </>
  );
}

// ─── Library Page ───────────────────────────────────────────────────────────
export default function Library() {
  const { t, language } = useLanguage();
  const { isAuthenticated, user } = useAuth();
  const [activeGrade, setActiveGrade] = useState<string>("all");
  const [filterType, setFilterType] = useState<string>("all");
  const [filterCreator, setFilterCreator] = useState<string>("all");

  const isAdmin = user?.role === "admin";

  // Admin/owner: use listAll to see hidden materials; public: use list
  const publicQuery = trpc.materials.list.useQuery(
    { grade: activeGrade !== "all" ? parseInt(activeGrade) : undefined },
    { enabled: !isAuthenticated }
  );
  const allQuery = trpc.materials.listAll.useQuery(
    { grade: activeGrade !== "all" ? parseInt(activeGrade) : undefined },
    { enabled: isAuthenticated }
  );

  const { data: materials = [], isLoading, refetch } = isAuthenticated
    ? { data: allQuery.data ?? [], isLoading: allQuery.isLoading, refetch: allQuery.refetch }
    : { data: publicQuery.data ?? [], isLoading: publicQuery.isLoading, refetch: publicQuery.refetch };

  const filteredMaterials = useMemo(() => {
    let result = materials as MaterialData[];
    if (filterType !== "all") result = result.filter((m) => m.materialType === filterType);
    if (filterCreator !== "all") result = result.filter((m) => m.creatorVision === filterCreator);
    return result;
  }, [materials, filterType, filterCreator]);

  useEffect(() => {
    if (!isLoading && (materials as MaterialData[]).length > 0) {
      announce(`${filteredMaterials.length} materiais encontrados`);
    }
  }, [filteredMaterials.length, isLoading, (materials as MaterialData[]).length]);

  const handleMutated = () => { refetch(); };

  return (
    <SiteLayout>
      {/* Hero */}
      <section className="bg-primary text-primary-foreground py-14" aria-labelledby="library-heading">
        <div className="container">
          <h1 id="library-heading" className="text-4xl md:text-5xl font-bold mb-4">{t.library_title}</h1>
          <p className="text-xl text-primary-foreground/80 max-w-2xl">{t.library_subtitle}</p>
        </div>
      </section>

      {/* Login Banner */}
      {!isAuthenticated && (
        <div className="bg-secondary/20 border-b border-secondary/30 py-3">
          <div className="container flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-sm text-foreground">
              <Lock className="w-4 h-4 text-primary" aria-hidden="true" />
              <span>{t.library_login_banner}</span>
            </div>
            <Button asChild size="sm" className="bg-primary text-primary-foreground hover:bg-primary/90">
              <a href={getLoginUrl()}>{t.library_login}</a>
            </Button>
          </div>
        </div>
      )}

      {/* Library Content */}
      <section className="py-12" aria-labelledby="materials-heading">
        <div className="container">
          <h2 id="materials-heading" className="sr-only">Materiais do Acervo</h2>

          {/* Filters row */}
          <div className="flex flex-wrap items-end gap-4 mb-6">
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">{t.library_filter_type}</label>
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger className="w-[200px] h-9 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t.library_filter_all_types}</SelectItem>
                  <SelectItem value="partitura">{t.library_type_partitura}</SelectItem>
                  <SelectItem value="atividade">{t.library_type_atividade}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">{t.library_filter_creator}</label>
              <Select value={filterCreator} onValueChange={setFilterCreator}>
                <SelectTrigger className="w-[200px] h-9 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t.library_filter_all_creators}</SelectItem>
                  <SelectItem value="vidente">{t.library_creator_vidente}</SelectItem>
                  <SelectItem value="pdv">{t.library_creator_pdv}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {(filterType !== "all" || filterCreator !== "all") && (
              <Button variant="ghost" size="sm"
                onClick={() => { setFilterType("all"); setFilterCreator("all"); }}
                className="text-xs text-muted-foreground hover:text-foreground">
                Limpar filtros
              </Button>
            )}
          </div>

          <Tabs value={activeGrade} onValueChange={setActiveGrade}>
            <TabsList className="mb-8 flex flex-wrap h-auto gap-1 bg-muted p-1 rounded-lg" aria-label="Filtrar por grau">
              <TabsTrigger value="all" className="text-sm">{t.library_all}</TabsTrigger>
              {[1, 2, 3, 4, 5].map((g) => (
                <TabsTrigger key={g} value={String(g)} className="text-sm">
                  {t.library_grade} {g}
                </TabsTrigger>
              ))}
            </TabsList>

            {["all", "1", "2", "3", "4", "5"].map((tab) => (
              <TabsContent key={tab} value={tab}>
                {isLoading ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4" aria-busy="true" aria-label="Carregando materiais">
                    {[1, 2, 3, 4].map((i) => <div key={i} className="h-24 bg-muted rounded-xl animate-pulse" aria-hidden="true" />)}
                  </div>
                ) : filteredMaterials.length === 0 ? (
                  <div className="text-center py-16">
                    <BookOpen className="w-12 h-12 text-muted-foreground mx-auto mb-4" aria-hidden="true" />
                    <p className="text-muted-foreground text-lg">{t.library_empty}</p>
                    <p className="text-sm text-muted-foreground mt-2">{t.library_empty_desc}</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {filteredMaterials.map((m) => (
                      <MaterialCard
                        key={m.id}
                        material={m}
                        isAuthenticated={isAuthenticated}
                        currentUserId={user?.id}
                        currentUserRole={user?.role}
                        onMutated={handleMutated}
                      />
                    ))}
                  </div>
                )}
              </TabsContent>
            ))}
          </Tabs>
        </div>
      </section>
    </SiteLayout>
  );
}


// ─── Add File Dialog ────────────────────────────────────────────────────────
function AddFileDialog({
  materialId, materialTitle, open, onClose, onSuccess,
}: { materialId: number; materialTitle: string; open: boolean; onClose: () => void; onSuccess: () => void }) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const addFileMutation = trpc.materials.addFile.useMutation({
    onSuccess: () => { toast.success("Arquivo adicionado com sucesso!"); onSuccess(); onClose(); setSelectedFile(null); },
    onError: (e) => toast.error(`Erro: ${e.message}`),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) { toast.error("Selecione um arquivo."); return; }
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = (reader.result as string).split(",")[1];
      addFileMutation.mutate({
        materialId,
        fileBase64: base64,
        fileName: selectedFile.name,
        mimeType: selectedFile.type,
        fileSize: selectedFile.size,
      });
    };
    reader.readAsDataURL(selectedFile);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Adicionar Arquivo</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          Adicionando arquivo a: <span className="font-medium text-foreground">{materialTitle}</span>
        </p>
        <form onSubmit={handleSubmit} className="space-y-4" aria-label="Formulário de adição de arquivo">
          <div className="space-y-1.5">
            <Label htmlFor="add-file">Arquivo <span className="text-destructive" aria-label="obrigatório">*</span></Label>
            <Input id="add-file" type="file" ref={fileInputRef}
              onChange={(e) => setSelectedFile(e.target.files?.[0] ?? null)}
              aria-required="true" className="cursor-pointer" />
            {selectedFile && (
              <p className="text-xs text-muted-foreground">
                <FileText className="w-3 h-3 inline mr-1" aria-hidden="true" />
                {selectedFile.name} — {(selectedFile.size / 1024).toFixed(1)} KB
              </p>
            )}
          </div>
          <DialogFooter className="gap-2">
            <DialogClose asChild>
              <Button type="button" variant="outline">Cancelar</Button>
            </DialogClose>
            <Button type="submit" disabled={addFileMutation.isPending}>
              {addFileMutation.isPending ? "Adicionando..." : "Adicionar Arquivo"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
