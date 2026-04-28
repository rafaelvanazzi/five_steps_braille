import { useState } from "react";
import { Link, useParams, useLocation } from "wouter";
import { ChevronLeft, Plus, MessageSquare, Pin, EyeOff, Trash2, MoreVertical, Eye } from "lucide-react";
import SiteLayout from "@/components/SiteLayout";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { getLoginUrl } from "@/const";
import { DisplayNameDialog } from "@/components/DisplayNameDialog";

export default function ForumCategory() {
  const { slug } = useParams<{ slug: string }>();
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const { language } = useLanguage();
  const utils = trpc.useUtils();

  const [newTopicOpen, setNewTopicOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [topicLang, setTopicLang] = useState<"pt" | "en" | "es">(language as "pt" | "en" | "es" || "pt");
  const [showDisplayNameDialog, setShowDisplayNameDialog] = useState(false);
  const [langFilter, setLangFilter] = useState<"all" | "pt" | "en" | "es">("all");

  const { data, isLoading } = trpc.forum.topics.useQuery({ slug: slug ?? "" }, { enabled: !!slug });
  const { data: displayName } = trpc.forum.getDisplayName.useQuery(undefined, { enabled: !!user });

  const createTopic = trpc.forum.createTopic.useMutation({
    onSuccess: (result) => {
      utils.forum.topics.invalidate();
      setNewTopicOpen(false);
      setTitle("");
      setBody("");
      navigate(`/forum/topico/${result.topicId}`);
    },
    onError: (e) => toast.error(e.message),
  });

  const pinTopic = trpc.forum.pinTopic.useMutation({ onSuccess: () => utils.forum.topics.invalidate() });
  const hideTopic = trpc.forum.hideTopic.useMutation({ onSuccess: () => utils.forum.topics.invalidate() });
  const deleteTopic = trpc.forum.deleteTopic.useMutation({ onSuccess: () => utils.forum.topics.invalidate() });

  const handleNewTopic = () => {
    if (!user) { window.location.href = getLoginUrl(); return; }
    if (!displayName) { setShowDisplayNameDialog(true); return; }
    setNewTopicOpen(true);
  };

  const handleSubmit = () => {
    if (!title.trim() || !body.trim()) return;
    createTopic.mutate({ categorySlug: slug ?? "", title: title.trim(), body: body.trim(), language: topicLang });
  };

  const cat = data?.category;
  const allTopics = data?.topics ?? [];
  const topics = langFilter === "all" ? allTopics : allTopics.filter(t => t.language === langFilter);

  const getCategoryName = () => {
    if (!cat) return "";
    if (language === "en") return cat.nameEn;
    if (language === "es") return cat.nameEs;
    return cat.namePt;
  };

  const formatDate = (d: Date | string) =>
    new Date(d).toLocaleDateString(language === "en" ? "en-US" : language === "es" ? "es-ES" : "pt-BR", { day: "2-digit", month: "short", year: "numeric" });

  return (
    <SiteLayout>
      <main id="main-content" className="min-h-screen bg-background">
        <div className="max-w-4xl mx-auto px-4 py-8">
          {/* Breadcrumb */}
          <nav aria-label="Navegação" className="mb-6">
            <Link href="/forum">
              <button className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors">
                <ChevronLeft className="w-4 h-4" aria-hidden="true" />
                {language === "en" ? "Back to Forum" : language === "es" ? "Volver al Foro" : "Voltar ao Fórum"}
              </button>
            </Link>
          </nav>

          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              {isLoading ? (
                <div className="h-8 w-48 bg-muted rounded animate-pulse" />
              ) : (
                <h1 className="text-2xl font-bold text-foreground">{getCategoryName()}</h1>
              )}
            </div>
            <Button onClick={handleNewTopic} className="flex items-center gap-2">
              <Plus className="w-4 h-4" aria-hidden="true" />
              {language === "en" ? "New Topic" : language === "es" ? "Nuevo Tema" : "Novo Tópico"}
            </Button>
          </div>

          {/* Language filter */}
          <div className="flex items-center gap-2 mb-4 flex-wrap" role="group" aria-label={language === "en" ? "Filter by language" : language === "es" ? "Filtrar por idioma" : "Filtrar por idioma"}>
            <span className="text-sm text-muted-foreground mr-1">
              {language === "en" ? "Language:" : language === "es" ? "Idioma:" : "Idioma:"}
            </span>
            {(["all", "pt", "en", "es"] as const).map(l => (
              <button
                key={l}
                type="button"
                onClick={() => setLangFilter(l)}
                aria-pressed={langFilter === l}
                className={`text-xs font-semibold px-2.5 py-1 rounded border transition-colors ${
                  langFilter === l
                    ? l === "pt" ? "bg-green-600 text-white border-green-600"
                      : l === "es" ? "bg-yellow-500 text-white border-yellow-500"
                      : l === "en" ? "bg-blue-600 text-white border-blue-600"
                      : "bg-foreground text-background border-foreground"
                    : "bg-background text-muted-foreground border-border hover:border-foreground"
                }`}
              >
                {l === "all" ? (language === "en" ? "All" : language === "es" ? "Todos" : "Todos") : l.toUpperCase()}
              </button>
            ))}
            {langFilter !== "all" && (
              <span className="text-xs text-muted-foreground">
                ({topics.length} {language === "en" ? "topics" : language === "es" ? "temas" : "tópicos"})
              </span>
            )}
          </div>

          {/* Topics list */}
          {isLoading ? (
            <div className="space-y-2" aria-busy="true">
              {[1, 2, 3].map(i => <div key={i} className="h-16 rounded-lg bg-muted animate-pulse" />)}
            </div>
          ) : topics.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <MessageSquare className="w-10 h-10 mx-auto mb-3 opacity-40" aria-hidden="true" />
              <p>{language === "en" ? "No topics yet. Be the first to start a discussion!" : language === "es" ? "Aún no hay temas. ¡Sé el primero en iniciar una discusión!" : "Nenhum tópico ainda. Seja o primeiro a iniciar uma discussão!"}</p>
            </div>
          ) : (
            <ul className="space-y-2" role="list">
              {topics.map(topic => (
                <li key={topic.id} className={`rounded-lg border ${topic.hidden ? "border-amber-300 bg-amber-50 dark:bg-amber-950/20" : "border-border bg-card"}`}>
                  <div className="flex items-center gap-3 p-4">
                    {topic.pinned && <Pin className="w-4 h-4 text-primary flex-shrink-0" aria-label={language === "en" ? "Pinned topic" : language === "es" ? "Tema fijado" : "Tópico fixado"} />}
                    <Link href={`/forum/topico/${topic.id}`} className="flex-1 min-w-0">
                      <span className="font-medium text-foreground hover:text-primary transition-colors line-clamp-1 cursor-pointer">
                        {topic.title}
                      </span>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {topic.authorDisplayName ?? topic.authorName ?? "Usuário"} · {formatDate(topic.lastPostAt)}
                      </p>
                    </Link>
                    <div className="flex items-center gap-3 flex-shrink-0">
                      {/* Language badge */}
                      {topic.language && (
                        <span
                          className={`text-xs font-semibold px-1.5 py-0.5 rounded uppercase tracking-wide ${
                            topic.language === "pt" ? "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300" :
                            topic.language === "es" ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300" :
                            "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300"
                          }`}
                          aria-label={`Idioma: ${topic.language === "pt" ? "Português" : topic.language === "es" ? "Español" : "English"}`}
                        >
                          {topic.language}
                        </span>
                      )}
                      {/* View count */}
                      {"viewCount" in topic && typeof topic.viewCount === "number" && topic.viewCount > 0 && (
                        <span className="text-xs text-muted-foreground flex items-center gap-1" aria-label={`${topic.viewCount} ${language === "en" ? "views" : language === "es" ? "vistas" : "visualizações"}`}>
                          <Eye className="w-3.5 h-3.5" aria-hidden="true" />
                          {topic.viewCount}
                        </span>
                      )}
                      {/* Reply count */}
                      <span className="text-sm text-muted-foreground flex items-center gap-1" aria-label={`${topic.replyCount} ${language === "en" ? "replies" : language === "es" ? "respuestas" : "respostas"}`}>
                        <MessageSquare className="w-3.5 h-3.5" aria-hidden="true" />
                        {topic.replyCount}
                      </span>
                      {user?.role === "admin" && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-7 w-7" aria-label="Opções de moderação">
                              <MoreVertical className="w-4 h-4" aria-hidden="true" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => pinTopic.mutate({ topicId: topic.id, pinned: !topic.pinned })}>
                              <Pin className="w-4 h-4 mr-2" aria-hidden="true" />
                              {topic.pinned
                                ? (language === "en" ? "Unpin" : language === "es" ? "Desfijar" : "Desafixar")
                                : (language === "en" ? "Pin" : language === "es" ? "Fijar" : "Fixar")}
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => hideTopic.mutate({ topicId: topic.id, hidden: !topic.hidden })}>
                              <EyeOff className="w-4 h-4 mr-2" aria-hidden="true" />
                              {topic.hidden
                                ? (language === "en" ? "Show" : language === "es" ? "Mostrar" : "Mostrar")
                                : (language === "en" ? "Hide" : language === "es" ? "Ocultar" : "Ocultar")}
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-destructive"
                              onClick={() => { if (confirm(language === "en" ? "Delete this topic and all replies?" : language === "es" ? "¿Eliminar este tema y todas las respuestas?" : "Deletar este tópico e todas as respostas?")) deleteTopic.mutate({ topicId: topic.id }); }}
                            >
                              <Trash2 className="w-4 h-4 mr-2" aria-hidden="true" />
                              {language === "en" ? "Delete" : language === "es" ? "Eliminar" : "Deletar"}
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* New Topic Dialog */}
        <Dialog open={newTopicOpen} onOpenChange={setNewTopicOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{language === "en" ? "New Topic" : language === "es" ? "Nuevo Tema" : "Novo Tópico"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div>
                <Label htmlFor="topic-title">{language === "en" ? "Title" : language === "es" ? "Título" : "Título"} *</Label>
                <Input
                  id="topic-title"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  placeholder={language === "en" ? "Topic title..." : language === "es" ? "Título del tema..." : "Título do tópico..."}
                  maxLength={255}
                  aria-required="true"
                />
              </div>
              <div>
                <Label htmlFor="topic-lang">{language === "en" ? "Language" : language === "es" ? "Idioma" : "Idioma"}</Label>
                <div className="flex gap-2 mt-1" role="radiogroup" aria-label="Idioma do tópico">
                  {(["pt", "en", "es"] as const).map(l => (
                    <button
                      key={l}
                      type="button"
                      role="radio"
                      aria-checked={topicLang === l}
                      onClick={() => setTopicLang(l)}
                      className={`text-xs font-semibold px-3 py-1.5 rounded border transition-colors ${
                        topicLang === l
                          ? l === "pt" ? "bg-green-600 text-white border-green-600"
                            : l === "es" ? "bg-yellow-500 text-white border-yellow-500"
                            : "bg-blue-600 text-white border-blue-600"
                          : "bg-background text-muted-foreground border-border hover:border-foreground"
                      }`}
                    >
                      {l.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <Label htmlFor="topic-body">{language === "en" ? "Content" : language === "es" ? "Contenido" : "Conteúdo"} *</Label>
                <Textarea
                  id="topic-body"
                  value={body}
                  onChange={e => setBody(e.target.value)}
                  placeholder={language === "en" ? "Write your message..." : language === "es" ? "Escribe tu mensaje..." : "Escreva sua mensagem..."}
                  rows={5}
                  maxLength={10000}
                  aria-required="true"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setNewTopicOpen(false)}>
                {language === "en" ? "Cancel" : language === "es" ? "Cancelar" : "Cancelar"}
              </Button>
              <Button onClick={handleSubmit} disabled={!title.trim() || !body.trim() || createTopic.isPending}>
                {createTopic.isPending ? "..." : language === "en" ? "Create topic" : language === "es" ? "Crear tema" : "Criar tópico"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <DisplayNameDialog
          open={showDisplayNameDialog}
          onClose={() => setShowDisplayNameDialog(false)}
          onSaved={() => { setShowDisplayNameDialog(false); setNewTopicOpen(true); }}
          language={language}
        />
      </main>
    </SiteLayout>
  );
}
