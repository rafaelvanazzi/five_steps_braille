import { useState, useRef, useMemo } from "react";
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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Trash2, Upload, FileText, Mail, ShieldAlert, Users, BarChart3,
  Download, MessageSquare, Star, Activity, Search, ArrowUpDown,
  Pencil, Eye, EyeOff, CalendarDays, UserCheck, Plus, X as XIcon, MessagesSquare,
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Link } from "wouter";

const gradeStages: Record<number, number> = { 1: 2, 2: 5, 3: 5, 4: 3, 5: 8 };

type AdminTab = "dashboard" | "users" | "materials" | "downloads" | "comments" | "ratings" | "messages" | "upload" | "events" | "registrations" | "forum";

// ─── AdminForumTab ────────────────────────────────────────────────────────────
function AdminForumTab() {
  const utils = trpc.useUtils();
  const { data: topics = [], isLoading } = trpc.forum.allTopics.useQuery();
  const hideTopic = trpc.forum.hideTopic.useMutation({ onSuccess: () => utils.forum.allTopics.invalidate() });
  const deleteTopic = trpc.forum.deleteTopic.useMutation({
    onSuccess: () => { toast.success("Tópico removido."); utils.forum.allTopics.invalidate(); },
    onError: (e) => toast.error(e.message),
  });
  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">Moderar Fórum</h2>
      <p className="text-sm text-muted-foreground">Total de tópicos: <strong>{topics.length}</strong></p>
      {isLoading ? (
        <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="h-12 bg-muted animate-pulse rounded" />)}</div>
      ) : topics.length === 0 ? (
        <p className="text-muted-foreground italic">Nenhum tópico ainda.</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Tópico</TableHead>
              <TableHead>Categoria</TableHead>
              <TableHead>Autor</TableHead>
              <TableHead>Respostas</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {topics.map(topic => (
              <TableRow key={topic.id} className={topic.hidden ? "opacity-60" : ""}>
                <TableCell className="font-medium max-w-xs truncate">{topic.title}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{topic.categoryNamePt}</TableCell>
                <TableCell className="text-sm">{topic.authorDisplayName ?? topic.authorName ?? "—"}</TableCell>
                <TableCell className="text-sm">{topic.replyCount}</TableCell>
                <TableCell>
                  <Badge variant={topic.hidden ? "outline" : "default"} className={topic.hidden ? "border-amber-400 text-amber-600" : ""}>
                    {topic.hidden ? "Oculto" : "Visível"}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Button size="icon" variant="ghost" className="h-7 w-7" aria-label={topic.hidden ? "Mostrar tópico" : "Ocultar tópico"}
                      onClick={() => hideTopic.mutate({ topicId: topic.id, hidden: !topic.hidden })}>
                      {topic.hidden ? <Eye className="w-4 h-4" aria-hidden="true" /> : <EyeOff className="w-4 h-4" aria-hidden="true" />}
                    </Button>
                    <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive hover:text-destructive" aria-label="Deletar tópico"
                      onClick={() => { if (confirm("Deletar tópico e todas as respostas?")) deleteTopic.mutate({ topicId: topic.id }); }}>
                      <Trash2 className="w-4 h-4" aria-hidden="true" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}

function formatDate(d: Date | string) {
  return new Date(d).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

function formatSize(bytes?: number | null) {
  if (!bytes) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function StatCard({ icon: Icon, label, value, color }: { icon: React.ElementType; label: string; value: number | string; color: string }) {
  return (
    <Card className="border-border shadow-sm" aria-label={`${label}: ${value}`}>
      <CardContent className="p-5 flex items-center gap-4">
        <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${color}`} aria-hidden="true">
          <Icon className="w-6 h-6 text-white" />
        </div>
        <div>
          <p className="text-2xl font-bold text-foreground" aria-hidden="true">{value}</p>
          <p className="text-sm text-muted-foreground" aria-hidden="true">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── AdminEventsTab ──────────────────────────────────────────────────────────
function AdminEventsTab({ utils }: { utils: ReturnType<typeof trpc.useUtils> }) {
  const [showForm, setShowForm] = useState(false);
  const [editingEvent, setEditingEvent] = useState<null | {
    id: number; title: string; description: string; eventDate: string;
    format: "online" | "presencial" | "hibrido"; targetAudience: "videntes" | "pdv" | "ambos";
    maxSpots: number; meetingLink: string; status: "draft" | "published"; pastEventText: string;
  }>(null);

  const emptyForm = {
    title: "", description: "", eventDate: "",
    format: "online" as "online" | "presencial" | "hibrido",
    targetAudience: "ambos" as "videntes" | "pdv" | "ambos",
    maxSpots: 100, meetingLink: "", status: "draft" as "draft" | "published", pastEventText: "",
  };
  const [form, setForm] = useState(emptyForm);

  const { data: events = [], isLoading } = trpc.events.list.useQuery({ includeAll: true }, { refetchOnWindowFocus: false });
  type EventItem = (typeof events)[0];

  const createMutation = trpc.events.create.useMutation({
    onSuccess: () => { toast.success("Evento criado!"); utils.events.list.invalidate(); setShowForm(false); setForm(emptyForm); },
    onError: (e) => toast.error(e.message),
  });
  const updateMutation = trpc.events.update.useMutation({
    onSuccess: () => { toast.success("Evento atualizado!"); utils.events.list.invalidate(); setEditingEvent(null); },
    onError: (e) => toast.error(e.message),
  });
  const deleteMutation = trpc.events.delete.useMutation({
    onSuccess: () => { toast.success("Evento removido."); utils.events.list.invalidate(); },
    onError: (e) => toast.error(e.message),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title || !form.eventDate) return;
    const payload = {
      ...form,
      eventDate: new Date(form.eventDate),
      meetingLink: form.meetingLink || null,
      pastEventText: form.pastEventText || null,
    };
    if (editingEvent) updateMutation.mutate({ id: editingEvent.id, ...payload });
    else createMutation.mutate(payload);
  };

  const startEdit = (ev: EventItem) => {
    setEditingEvent({
      id: ev.id, title: ev.title, description: ev.description,
      eventDate: new Date(ev.eventDate).toISOString().slice(0, 16),
      format: ev.format, targetAudience: ev.targetAudience,
      maxSpots: ev.maxSpots, meetingLink: ev.meetingLink ?? "",
      status: ev.status, pastEventText: ev.pastEventText ?? "",
    });
    setForm({
      title: ev.title, description: ev.description,
      eventDate: new Date(ev.eventDate).toISOString().slice(0, 16),
      format: ev.format, targetAudience: ev.targetAudience,
      maxSpots: ev.maxSpots, meetingLink: ev.meetingLink ?? "",
      status: ev.status, pastEventText: ev.pastEventText ?? "",
    });
    setShowForm(true);
  };

  const cancelForm = () => { setShowForm(false); setEditingEvent(null); setForm(emptyForm); };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Gerenciar Eventos</h2>
        {!showForm && (
          <Button size="sm" onClick={() => setShowForm(true)}>
            <Plus className="w-4 h-4 mr-1" aria-hidden="true" /> Novo Evento
          </Button>
        )}
      </div>

      {showForm && (
        <Card className="border-border shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">{editingEvent ? "Editar Evento" : "Criar Novo Evento"}</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2 space-y-1.5">
                <Label htmlFor="ev-title">Título *</Label>
                <Input id="ev-title" required value={form.title} onChange={e => setForm({...form, title: e.target.value})} placeholder="Ex: Introdução à Musicografia Braille" />
              </div>
              <div className="md:col-span-2 space-y-1.5">
                <Label htmlFor="ev-desc">Descrição *</Label>
                <Textarea id="ev-desc" required rows={3} value={form.description} onChange={e => setForm({...form, description: e.target.value})} placeholder="Descreva o evento..." />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ev-date">Data e Hora *</Label>
                <Input id="ev-date" type="datetime-local" required value={form.eventDate} onChange={e => setForm({...form, eventDate: e.target.value})} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ev-spots">Vagas</Label>
                <Input id="ev-spots" type="number" min={1} max={9999} value={form.maxSpots} onChange={e => setForm({...form, maxSpots: parseInt(e.target.value) || 100})} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ev-format">Formato</Label>
                <Select value={form.format} onValueChange={v => setForm({...form, format: v as typeof form.format})}>
                  <SelectTrigger id="ev-format"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="online">Online</SelectItem>
                    <SelectItem value="presencial">Presencial</SelectItem>
                    <SelectItem value="hibrido">Híbrido</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ev-audience">Público-alvo</Label>
                <Select value={form.targetAudience} onValueChange={v => setForm({...form, targetAudience: v as typeof form.targetAudience})}>
                  <SelectTrigger id="ev-audience"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="videntes">Músicos videntes</SelectItem>
                    <SelectItem value="pdv">Pessoas com DV</SelectItem>
                    <SelectItem value="ambos">Todos os públicos</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ev-status">Status</Label>
                <Select value={form.status} onValueChange={v => setForm({...form, status: v as typeof form.status})}>
                  <SelectTrigger id="ev-status"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Rascunho (oculto)</SelectItem>
                    <SelectItem value="published">Publicado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ev-link">Link da Aula (online)</Label>
                <Input id="ev-link" type="url" value={form.meetingLink} onChange={e => setForm({...form, meetingLink: e.target.value})} placeholder="https://meet.google.com/..." />
              </div>
              <div className="md:col-span-2 space-y-1.5">
                <Label htmlFor="ev-past-text">Relato do evento (após realizado)</Label>
                <Textarea id="ev-past-text" rows={4} value={form.pastEventText} onChange={e => setForm({...form, pastEventText: e.target.value})} placeholder="Escreva aqui o relato do evento após sua realização..." />
              </div>
              <div className="md:col-span-2 flex gap-2">
                <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                  {editingEvent ? "Salvar Alterações" : "Criar Evento"}
                </Button>
                <Button type="button" variant="outline" onClick={cancelForm}>Cancelar</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {isLoading ? (
        <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="h-16 bg-muted animate-pulse rounded" />)}</div>
      ) : events.length === 0 ? (
        <p className="text-muted-foreground italic">Nenhum evento criado ainda.</p>
      ) : (
        <div className="space-y-3">
          {events.map((ev: EventItem) => (
            <div key={ev.id} className="flex items-start justify-between gap-4 p-4 border border-border rounded-lg bg-card">
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <span className="font-medium text-sm">{ev.title}</span>
                  <Badge variant={ev.status === "published" ? "default" : "secondary"} className="text-xs">
                    {ev.status === "published" ? "Publicado" : "Rascunho"}
                  </Badge>
                  <Badge variant="outline" className="text-xs">{ev.format}</Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  {new Date(ev.eventDate).toLocaleString("pt-BR")} · {ev.maxSpots} vagas
                </p>
              </div>
              <div className="flex gap-1 shrink-0">
                <Button size="sm" variant="ghost" onClick={() => startEdit(ev)} aria-label="Editar evento">
                  <Pencil className="w-4 h-4" aria-hidden="true" />
                </Button>
                <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive"
                  onClick={() => { if (confirm("Remover este evento?")) deleteMutation.mutate({ id: ev.id }); }}
                  aria-label="Remover evento">
                  <Trash2 className="w-4 h-4" aria-hidden="true" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── AdminRegistrationsTab ────────────────────────────────────────────────────
function AdminRegistrationsTab() {
  const [selectedEventId, setSelectedEventId] = useState<number | null>(null);
  const { data: events = [] } = trpc.events.list.useQuery({ includeAll: true }, { refetchOnWindowFocus: false });
  type RegEventItem = (typeof events)[0];
  const { data: registrations = [], isLoading } = trpc.events.listRegistrations.useQuery(
    { eventId: selectedEventId! },
    { enabled: selectedEventId !== null }
  );

  const handleExportCSV = () => {
    if (!registrations.length) return;
    const headers = ["Nome","Email","País","Instrumento","Nível Braille","Pessoa com DV","Motivação","Lista de Espera","Data"];
    const rows = registrations.map(r => [
      r.userName ?? "", r.userEmail ?? "", r.country, r.instrument,
      r.brailleLevel, r.isVisuallyImpaired ? "Sim" : "Não",
      r.motivation ?? "", r.waitlisted ? "Sim" : "Não",
      new Date(r.createdAt).toLocaleString("pt-BR"),
    ]);
    const csv = [headers, ...rows].map(row => row.map(v => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `inscricoes_evento_${selectedEventId}.csv`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold">Inscrições por Evento</h2>
      <div className="max-w-sm">
        <Label htmlFor="reg-event-select">Selecionar Evento</Label>
        <Select value={selectedEventId ? String(selectedEventId) : ""} onValueChange={v => setSelectedEventId(v ? parseInt(v) : null)}>
          <SelectTrigger id="reg-event-select" className="mt-1"><SelectValue placeholder="Escolha um evento..." /></SelectTrigger>
          <SelectContent>
            {events.map((ev: RegEventItem) => (
              <SelectItem key={ev.id} value={String(ev.id)}>{ev.title} — {new Date(ev.eventDate).toLocaleDateString("pt-BR")}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {selectedEventId && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">{registrations.length} inscrito(s)</p>
            <Button size="sm" variant="outline" onClick={handleExportCSV} disabled={!registrations.length}>
              Exportar CSV
            </Button>
          </div>
          {isLoading ? (
            <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="h-12 bg-muted animate-pulse rounded" />)}</div>
          ) : registrations.length === 0 ? (
            <p className="text-muted-foreground italic">Nenhuma inscrição para este evento.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>País</TableHead>
                    <TableHead>Instrumento</TableHead>
                    <TableHead>Nível Braille</TableHead>
                    <TableHead>DV</TableHead>
                    <TableHead>Lista Espera</TableHead>
                    <TableHead>Data</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {registrations.map(r => (
                    <TableRow key={r.id}>
                      <TableCell className="font-medium">{r.userName ?? "—"}</TableCell>
                      <TableCell className="text-xs">{r.userEmail ?? "—"}</TableCell>
                      <TableCell>{r.country}</TableCell>
                      <TableCell>{r.instrument}</TableCell>
                      <TableCell>{r.brailleLevel}</TableCell>
                      <TableCell>{r.isVisuallyImpaired ? "Sim" : "Não"}</TableCell>
                      <TableCell>{r.waitlisted ? <Badge variant="secondary">Espera</Badge> : <Badge variant="default">Confirmado</Badge>}</TableCell>
                      <TableCell className="text-xs">{new Date(r.createdAt).toLocaleDateString("pt-BR")}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function Admin() {
  const { t } = useLanguage();
  const { user, isAuthenticated } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({
    title: "", description: "", grade: 1, stage: undefined as number | undefined,
    language: "pt" as "pt" | "en" | "both",
    materialType: "atividade" as "partitura" | "atividade",
    creatorVision: "vidente" as "vidente" | "pdv",
    creatorName: "",
  });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [activeTab, setActiveTab] = useState<AdminTab>("dashboard");
  const [userSearch, setUserSearch] = useState("");

  const utils = trpc.useUtils();

  // Queries
  const { data: stats } = trpc.admin.stats.useQuery(undefined, { enabled: isAuthenticated && user?.role === "admin" });
  const { data: allUsers = [], isLoading: usersLoading } = trpc.admin.users.useQuery(undefined, { enabled: isAuthenticated && user?.role === "admin" });
  const { data: materialsWithUploader = [], isLoading: materialsLoading } = trpc.admin.materialsWithUploader.useQuery(undefined, { enabled: isAuthenticated && user?.role === "admin" });
  const { data: downloadRanking = [] } = trpc.admin.downloadRanking.useQuery(undefined, { enabled: isAuthenticated && user?.role === "admin" });
  const { data: recentComments = [] } = trpc.admin.recentComments.useQuery(undefined, { enabled: isAuthenticated && user?.role === "admin" });
  const { data: recentDownloads = [] } = trpc.admin.recentDownloads.useQuery(undefined, { enabled: isAuthenticated && user?.role === "admin" });
  const { data: ratingsOverview = [] } = trpc.admin.ratingsOverview.useQuery(undefined, { enabled: isAuthenticated && user?.role === "admin" });
  const { data: materials = [] } = trpc.materials.list.useQuery({});
  const { data: messages = [], isLoading: messagesLoading } = trpc.contact.list.useQuery(undefined, { enabled: isAuthenticated && user?.role === "admin" });

  // Mutations
  const uploadMutation = trpc.materials.upload.useMutation({
    onSuccess: () => {
      toast.success("Material enviado com sucesso!");
      setForm({ title: "", description: "", grade: 1, stage: undefined, language: "pt", materialType: "atividade", creatorVision: "vidente", creatorName: "" });
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      utils.materials.list.invalidate();
      utils.admin.materialsWithUploader.invalidate();
      utils.admin.stats.invalidate();
    },
    onError: (err) => toast.error(`Erro ao enviar: ${err.message}`),
  });

  const deleteMutation = trpc.materials.delete.useMutation({
    onSuccess: () => {
      toast.success("Material removido.");
      utils.materials.list.invalidate();
      utils.materials.listAll.invalidate();
      utils.admin.materialsWithUploader.invalidate();
      utils.admin.stats.invalidate();
    },
    onError: (e) => toast.error(`Erro ao remover: ${e.message}`),
  });

  const toggleVisibilityMutation = trpc.materials.toggleVisibility.useMutation({
    onSuccess: (_, vars) => {
      toast.success(vars.hidden ? "Material ocultado para revisão." : "Material publicado no acervo.");
      utils.materials.list.invalidate();
      utils.materials.listAll.invalidate();
      utils.admin.materialsWithUploader.invalidate();
    },
    onError: (e) => toast.error(`Erro: ${e.message}`),
  });

  const deleteCommentMutation = trpc.admin.deleteComment.useMutation({
    onSuccess: () => {
      toast.success("Comentário removido.");
      utils.admin.recentComments.invalidate();
    },
    onError: () => toast.error("Erro ao remover comentário."),
  });

  // Computed
  const filteredUsers = useMemo(() => {
    if (!userSearch.trim()) return allUsers;
    const q = userSearch.toLowerCase();
    return allUsers.filter(u =>
      (u.name?.toLowerCase().includes(q)) ||
      (u.email?.toLowerCase().includes(q))
    );
  }, [allUsers, userSearch]);

  // Build download count map
  const downloadCountMap = useMemo(() => {
    const map = new Map<number, number>();
    downloadRanking.forEach(r => map.set(r.materialId, r.downloadCount));
    return map;
  }, [downloadRanking]);

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
        creatorName: form.creatorName.trim() || undefined,
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

  const tabs: { key: AdminTab; label: string; icon: React.ElementType }[] = [
    { key: "dashboard", label: "Painel", icon: BarChart3 },
    { key: "users", label: "Usuários", icon: Users },
    { key: "materials", label: "Materiais", icon: FileText },
    { key: "downloads", label: "Downloads", icon: Download },
    { key: "comments", label: "Comentários", icon: MessageSquare },
    { key: "ratings", label: "Avaliações", icon: Star },
    { key: "messages", label: "Mensagens", icon: Mail },
    { key: "events", label: "Eventos", icon: CalendarDays },
    { key: "registrations", label: "Inscrições", icon: UserCheck },
    { key: "forum", label: "Fórum", icon: MessagesSquare },
    { key: "upload", label: "Enviar", icon: Upload },
  ];

  return (
    <SiteLayout>
      <section className="bg-primary text-primary-foreground py-8" aria-labelledby="admin-heading">
        <div className="container">
          <h1 id="admin-heading" className="text-3xl font-bold mb-1">Painel de Administração</h1>
          <p className="text-primary-foreground/80">Gerencie usuários, materiais, avaliações e mensagens do Five Steps</p>
        </div>
      </section>

      <div className="container py-8">
        {/* Tab Nav */}
        <div className="flex flex-wrap gap-1 mb-8 border-b border-border pb-1" role="tablist" aria-label="Seções de administração">
          {tabs.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              role="tab"
              aria-selected={activeTab === key}
              onClick={() => setActiveTab(key)}
              className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium border-b-2 transition-colors focus-visible:outline-2 focus-visible:outline-primary ${
                activeTab === key
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon className="w-4 h-4" aria-hidden="true" />
              {label}
            </button>
          ))}
        </div>

        {/* ═══ Dashboard ═══ */}
        {activeTab === "dashboard" && (
          <div className="space-y-8">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard icon={Users} label="Usuários Cadastrados" value={stats?.totalUsers ?? 0} color="bg-blue-600" />
              <StatCard icon={FileText} label="Materiais no Acervo" value={stats?.totalMaterials ?? 0} color="bg-green-600" />
              <StatCard icon={Download} label="Downloads Totais" value={stats?.totalDownloads ?? 0} color="bg-purple-600" />
              <StatCard icon={Mail} label="Mensagens Recebidas" value={stats?.totalMessages ?? 0} color="bg-orange-600" />
            </div>

            {/* Recent Downloads */}
            <Card className="border-border shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Activity className="w-5 h-5 text-primary" aria-hidden="true" />
                  Downloads Recentes
                </CardTitle>
              </CardHeader>
              <CardContent>
                {recentDownloads.length === 0 ? (
                  <p className="text-muted-foreground text-sm text-center py-4">Nenhum download registrado ainda.</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Usuário</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Material</TableHead>
                        <TableHead>Data</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {recentDownloads.slice(0, 10).map((dl) => (
                        <TableRow key={dl.id}>
                          <TableCell className="font-medium text-sm">{dl.userName ?? "—"}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">{dl.userEmail ?? "—"}</TableCell>
                          <TableCell className="text-sm">
                            {dl.materialTitle ?? "—"}
                            {dl.materialGrade && <Badge variant="outline" className="ml-2 text-xs">G{dl.materialGrade}</Badge>}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">{formatDate(dl.createdAt)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>

            {/* Recent Comments */}
            <Card className="border-border shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <MessageSquare className="w-5 h-5 text-primary" aria-hidden="true" />
                  Comentários Recentes
                </CardTitle>
              </CardHeader>
              <CardContent>
                {recentComments.length === 0 ? (
                  <p className="text-muted-foreground text-sm text-center py-4">Nenhum comentário ainda.</p>
                ) : (
                  <div className="space-y-3">
                    {recentComments.slice(0, 5).map((c) => (
                      <div key={c.id} className="flex items-start justify-between gap-3 p-3 bg-muted/50 rounded-lg">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium text-sm">{c.userName ?? "Anônimo"}</span>
                            <span className="text-xs text-muted-foreground">sobre</span>
                            <span className="text-sm font-medium text-primary">{c.materialTitle ?? "—"}</span>
                          </div>
                          <p className="text-sm text-muted-foreground line-clamp-2">{c.content}</p>
                          <p className="text-xs text-muted-foreground mt-1">{formatDate(c.createdAt)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* ═══ Users ═══ */}
        {activeTab === "users" && (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" aria-hidden="true" />
                <Input
                  placeholder="Buscar por nome ou email..."
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  className="pl-9"
                  aria-label="Buscar usuários por nome ou email"
                />
              </div>
              <Badge variant="secondary">{filteredUsers.length} usuário(s)</Badge>
            </div>

            {usersLoading ? (
              <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="h-12 bg-muted rounded animate-pulse" />)}</div>
            ) : (
              <Card className="border-border shadow-sm overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>ID</TableHead>
                      <TableHead>Nome</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Método Login</TableHead>
                      <TableHead>Papel</TableHead>
                      <TableHead>Cadastro</TableHead>
                      <TableHead>Último Acesso</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredUsers.map((u) => (
                      <TableRow key={u.id}>
                        <TableCell className="text-sm font-mono">{u.id}</TableCell>
                        <TableCell className="font-medium text-sm">{u.name ?? "—"}</TableCell>
                        <TableCell className="text-sm">
                          {u.email ? (
                            <a href={`mailto:${u.email}`} className="text-primary hover:underline">{u.email}</a>
                          ) : "—"}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">{u.loginMethod ?? "—"}</TableCell>
                        <TableCell>
                          <Badge variant={u.role === "admin" ? "default" : "secondary"} className="text-xs">
                            {u.role === "admin" ? "Admin" : "Usuário"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">{formatDate(u.createdAt)}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{formatDate(u.lastSignedIn)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Card>
            )}
          </div>
        )}

        {/* ═══ Materials with Uploader ═══ */}
        {activeTab === "materials" && (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <Badge variant="secondary">{materialsWithUploader.length} material(is)</Badge>
              <Badge variant="outline" className="text-xs">
                {materialsWithUploader.filter(m => m.hidden).length} oculto(s)
              </Badge>
            </div>
            {materialsLoading ? (
              <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="h-12 bg-muted rounded animate-pulse" />)}</div>
            ) : materialsWithUploader.length === 0 ? (
              <p className="text-muted-foreground text-center py-12">Nenhum material cadastrado.</p>
            ) : (
              <Card className="border-border shadow-sm overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Título</TableHead>
                      <TableHead>Grau</TableHead>
                      <TableHead>Idioma</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Enviado por</TableHead>
                      <TableHead>Downloads</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Data</TableHead>
                      <TableHead>Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {materialsWithUploader.map((m) => (
                      <TableRow key={m.id} className={m.hidden ? "bg-amber-50/40 dark:bg-amber-900/10" : ""}>
                        <TableCell className="font-medium text-sm max-w-[180px] truncate">{m.title}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs">G{m.grade}{m.stage ? `.${m.stage}` : ""}</Badge>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">{m.language.toUpperCase()}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {m.materialType === "partitura" ? "Partitura" : "Atividade"}
                        </TableCell>
                        <TableCell className="text-sm">
                          <div>
                            <span className="font-medium">{m.uploaderName ?? "—"}</span>
                            {m.uploaderEmail && (
                              <p className="text-xs text-muted-foreground">{m.uploaderEmail}</p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-sm font-medium">{downloadCountMap.get(m.id) ?? 0}</TableCell>
                        <TableCell>
                          {m.hidden ? (
                            <Badge variant="outline" className="text-xs border-amber-400 text-amber-700 bg-amber-50 dark:bg-amber-900/20">
                              <EyeOff className="w-3 h-3 mr-1" aria-hidden="true" />
                              Oculto
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-xs border-green-400 text-green-700 bg-green-50 dark:bg-green-900/20">
                              <Eye className="w-3 h-3 mr-1" aria-hidden="true" />
                              Visível
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">{formatDate(m.createdAt)}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => toggleVisibilityMutation.mutate({ id: m.id, hidden: !m.hidden })}
                              disabled={toggleVisibilityMutation.isPending}
                              aria-label={m.hidden ? `Publicar ${m.title}` : `Ocultar ${m.title}`}
                              title={m.hidden ? "Publicar no acervo" : "Ocultar para revisão"}
                            >
                              {m.hidden
                                ? <Eye className="w-3.5 h-3.5" aria-hidden="true" />
                                : <EyeOff className="w-3.5 h-3.5" aria-hidden="true" />}
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => { if (confirm(`Remover permanentemente "${m.title}"?`)) deleteMutation.mutate({ id: m.id }); }}
                              aria-label={`Remover ${m.title}`}
                            >
                              <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Card>
            )}
          </div>
        )}

        {/* ═══ Downloads Ranking ═══ */}
        {activeTab === "downloads" && (
          <div className="space-y-6">
            <Card className="border-border shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <ArrowUpDown className="w-5 h-5 text-primary" aria-hidden="true" />
                  Ranking de Downloads por Material
                </CardTitle>
              </CardHeader>
              <CardContent>
                {downloadRanking.length === 0 ? (
                  <p className="text-muted-foreground text-sm text-center py-4">Nenhum download registrado ainda.</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>#</TableHead>
                        <TableHead>Material</TableHead>
                        <TableHead>Downloads</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {downloadRanking.map((r, i) => {
                        const mat = materials.find(m => m.id === r.materialId);
                        return (
                          <TableRow key={r.materialId}>
                            <TableCell className="font-bold text-lg text-primary">{i + 1}</TableCell>
                            <TableCell className="font-medium text-sm">
                              {mat?.title ?? `Material #${r.materialId}`}
                              {mat && <Badge variant="outline" className="ml-2 text-xs">G{mat.grade}</Badge>}
                            </TableCell>
                            <TableCell className="text-lg font-bold">{r.downloadCount}</TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>

            <Card className="border-border shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Activity className="w-5 h-5 text-primary" aria-hidden="true" />
                  Histórico de Downloads
                </CardTitle>
              </CardHeader>
              <CardContent>
                {recentDownloads.length === 0 ? (
                  <p className="text-muted-foreground text-sm text-center py-4">Nenhum download registrado.</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Usuário</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Material</TableHead>
                        <TableHead>Grau</TableHead>
                        <TableHead>Data</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {recentDownloads.map((dl) => (
                        <TableRow key={dl.id}>
                          <TableCell className="font-medium text-sm">{dl.userName ?? "—"}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">{dl.userEmail ?? "—"}</TableCell>
                          <TableCell className="text-sm">{dl.materialTitle ?? "—"}</TableCell>
                          <TableCell><Badge variant="outline" className="text-xs">G{dl.materialGrade}</Badge></TableCell>
                          <TableCell className="text-sm text-muted-foreground">{formatDate(dl.createdAt)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* ═══ Comments ═══ */}
        {activeTab === "comments" && (
          <div className="space-y-4">
            <Badge variant="secondary">{recentComments.length} comentário(s)</Badge>
            {recentComments.length === 0 ? (
              <p className="text-muted-foreground text-center py-12">Nenhum comentário ainda.</p>
            ) : (
              <div className="space-y-3">
                {recentComments.map((c) => (
                  <Card key={c.id} className="border-border shadow-sm">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2 mb-1">
                            <span className="font-medium text-sm">{c.userName ?? "Anônimo"}</span>
                            <span className="text-xs text-muted-foreground">{c.userEmail ?? ""}</span>
                            <span className="text-xs text-muted-foreground">·</span>
                            <span className="text-sm text-primary font-medium">{c.materialTitle ?? "—"}</span>
                          </div>
                          <p className="text-sm text-foreground mt-1">{c.content}</p>
                          <p className="text-xs text-muted-foreground mt-2">{formatDate(c.createdAt)}</p>
                        </div>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => { if (confirm("Remover este comentário?")) deleteCommentMutation.mutate({ id: c.id }); }}
                          aria-label="Remover comentário"
                          className="flex-shrink-0"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ═══ Ratings ═══ */}
        {activeTab === "ratings" && (
          <div className="space-y-4">
            <Badge variant="secondary">{ratingsOverview.length} material(is) avaliado(s)</Badge>
            {ratingsOverview.length === 0 ? (
              <p className="text-muted-foreground text-center py-12">Nenhuma avaliação ainda.</p>
            ) : (
              <Card className="border-border shadow-sm overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Material</TableHead>
                      <TableHead>Grau</TableHead>
                      <TableHead>Média</TableHead>
                      <TableHead>N.º Avaliações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {ratingsOverview.map((r) => (
                      <TableRow key={r.materialId}>
                        <TableCell className="font-medium text-sm">{r.materialTitle ?? `#${r.materialId}`}</TableCell>
                        <TableCell><Badge variant="outline" className="text-xs">G{r.materialGrade}</Badge></TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            {[1,2,3,4,5].map(s => (
                              <Star
                                key={s}
                                className={`w-4 h-4 ${s <= Math.round(Number(r.avgRating)) ? "text-yellow-500 fill-yellow-500" : "text-gray-300"}`}
                                aria-hidden="true"
                              />
                            ))}
                            <span className="ml-1 text-sm font-medium">{Number(r.avgRating).toFixed(1)}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm">{r.ratingCount}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Card>
            )}
          </div>
        )}

        {/* ═══ Messages ═══ */}
        {activeTab === "messages" && (
          <div className="space-y-4">
            <Badge variant="secondary">{messages.length} mensagem(ns)</Badge>
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
                        {" · "}{formatDate(msg.createdAt)}
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

        {/* ═══ Events ═══ */}
        {activeTab === "events" && <AdminEventsTab utils={utils} />}

        {/* ═══ Registrations ═══ */}
        {activeTab === "registrations" && <AdminRegistrationsTab />}

        {/* ═══ Forum ═══ */}
        {activeTab === "forum" && <AdminForumTab />}

        {/* ═══ Upload ═══ */}
        {activeTab === "upload" && (
          <Card className="max-w-2xl border-border shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Upload className="w-5 h-5 text-primary" aria-hidden="true" />
                Enviar Novo Material
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleUpload} noValidate className="space-y-5" aria-label="Formulário de envio de material">
                <div className="space-y-1.5">
                  <Label htmlFor="mat-title">Título <span className="text-destructive" aria-label="obrigatório">*</span></Label>
                  <Input id="mat-title" required aria-required="true" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Ex: Exercícios de Notas — Grau 1" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="mat-desc">Descrição</Label>
                  <Textarea id="mat-desc" rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Descreva brevemente o conteúdo do material..." className="resize-none" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="mat-grade">Grau <span className="text-destructive" aria-label="obrigatório">*</span></Label>
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
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="mat-type">Tipo de Material <span className="text-destructive" aria-label="obrigatório">*</span></Label>
                    <Select value={form.materialType} onValueChange={(v) => setForm({ ...form, materialType: v as typeof form.materialType })}>
                      <SelectTrigger id="mat-type"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="atividade">Atividade de Musicalização</SelectItem>
                        <SelectItem value="partitura">Partitura</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="mat-vision">Criador <span className="text-destructive" aria-label="obrigatório">*</span></Label>
                    <Select value={form.creatorVision} onValueChange={(v) => setForm({ ...form, creatorVision: v as typeof form.creatorVision })}>
                      <SelectTrigger id="mat-vision"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="vidente">Vidente</SelectItem>
                        <SelectItem value="pdv">Pessoa com DV (PDV)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="mat-creator">Nome do Criador</Label>
                  <Input id="mat-creator" value={form.creatorName} onChange={(e) => setForm({ ...form, creatorName: e.target.value })} placeholder="Ex: Rafael Vanazzi" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="mat-file">Arquivo <span className="text-destructive" aria-label="obrigatório">*</span></Label>
                  <Input id="mat-file" type="file" ref={fileInputRef} onChange={handleFileChange} className="cursor-pointer" />
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
      </div>
    </SiteLayout>
  );
}
