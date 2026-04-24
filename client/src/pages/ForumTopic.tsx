import { useState } from "react";
import { Link, useParams } from "wouter";
import { ChevronLeft, MessageSquare, EyeOff, Trash2, MoreVertical, Pin, User } from "lucide-react";
import SiteLayout from "@/components/SiteLayout";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { getLoginUrl } from "@/const";
import { DisplayNameDialog } from "@/components/DisplayNameDialog";

export default function ForumTopic() {
  const { id } = useParams<{ id: string }>();
  const topicId = parseInt(id ?? "0");
  const { user } = useAuth();
  const { language } = useLanguage();
  const utils = trpc.useUtils();

  const [replyBody, setReplyBody] = useState("");
  const [showDisplayNameDialog, setShowDisplayNameDialog] = useState(false);

  const { data, isLoading } = trpc.forum.posts.useQuery({ topicId }, { enabled: !!topicId && !!user });
  const { data: displayName } = trpc.forum.getDisplayName.useQuery(undefined, { enabled: !!user });

  const reply = trpc.forum.reply.useMutation({
    onSuccess: () => {
      utils.forum.posts.invalidate();
      setReplyBody("");
      toast.success(language === "en" ? "Reply posted!" : language === "es" ? "¡Respuesta publicada!" : "Resposta publicada!");
    },
    onError: (e) => toast.error(e.message),
  });

  const hidePost = trpc.forum.hidePost.useMutation({ onSuccess: () => utils.forum.posts.invalidate() });
  const deletePost = trpc.forum.deletePost.useMutation({ onSuccess: () => utils.forum.posts.invalidate() });

  const handleReply = () => {
    if (!user) { window.location.href = getLoginUrl(); return; }
    if (!displayName) { setShowDisplayNameDialog(true); return; }
    if (!replyBody.trim()) return;
    reply.mutate({ topicId, body: replyBody.trim() });
  };

  const formatDate = (d: Date | string) =>
    new Date(d).toLocaleString(language === "en" ? "en-US" : language === "es" ? "es-ES" : "pt-BR", {
      day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
    });

  const topic = data?.topic;
  const posts = data?.posts ?? [];

  // If not logged in, show login prompt
  if (!user) {
    return (
      <SiteLayout>
        <main id="main-content" className="min-h-screen bg-background">
          <div className="max-w-4xl mx-auto px-4 py-8">
            <nav aria-label="Navegação" className="mb-6">
              <Link href="/forum">
                <button className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors">
                  <ChevronLeft className="w-4 h-4" aria-hidden="true" />
                  {language === "en" ? "Back to Forum" : language === "es" ? "Volver al Foro" : "Voltar ao Fórum"}
                </button>
              </Link>
            </nav>
            <div className="text-center py-16">
              <MessageSquare className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-40" aria-hidden="true" />
              <h2 className="text-xl font-semibold mb-2">
                {language === "en" ? "Login required to read posts" : language === "es" ? "Inicia sesión para leer las publicaciones" : "Faça login para ler as postagens"}
              </h2>
              <p className="text-muted-foreground mb-6">
                {language === "en" ? "You need to be logged in to read and participate in forum discussions."
                  : language === "es" ? "Necesitas iniciar sesión para leer y participar en las discusiones del foro."
                  : "Você precisa estar logado para ler e participar das discussões do fórum."}
              </p>
              <a href={getLoginUrl()}>
                <Button>
                  {language === "en" ? "Login" : language === "es" ? "Iniciar sesión" : "Fazer login"}
                </Button>
              </a>
            </div>
          </div>
        </main>
      </SiteLayout>
    );
  }

  return (
    <SiteLayout>
      <main id="main-content" className="min-h-screen bg-background">
        <div className="max-w-4xl mx-auto px-4 py-8">
          {/* Breadcrumb */}
          <nav aria-label="Navegação" className="mb-6">
            <button
              onClick={() => window.history.back()}
              className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <ChevronLeft className="w-4 h-4" aria-hidden="true" />
              {language === "en" ? "Back" : language === "es" ? "Volver" : "Voltar"}
            </button>
          </nav>

          {/* Topic title */}
          {isLoading ? (
            <div className="h-8 w-2/3 bg-muted rounded animate-pulse mb-6" />
          ) : (
            <div className="mb-6 flex items-start gap-2">
              {topic?.pinned && <Pin className="w-5 h-5 text-primary mt-1 flex-shrink-0" aria-label="Tópico fixado" />}
              <h1 className="text-2xl font-bold text-foreground">{topic?.title}</h1>
            </div>
          )}

          {/* Posts */}
          {isLoading ? (
            <div className="space-y-4" aria-busy="true">
              {[1, 2].map(i => <div key={i} className="h-32 rounded-lg bg-muted animate-pulse" />)}
            </div>
          ) : (
            <ol className="space-y-4" aria-label="Mensagens do tópico">
              {posts.map((post, idx) => (
                <li
                  key={post.id}
                  id={`post-${post.id}`}
                  className={`rounded-lg border p-5 ${post.hidden ? "border-amber-300 bg-amber-50 dark:bg-amber-950/20 opacity-70" : "border-border bg-card"}`}
                >
                  <div className="flex items-start gap-3">
                    {/* Avatar */}
                    <div className="flex-shrink-0 w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold text-sm" aria-hidden="true">
                      {(post.authorDisplayName ?? post.authorName ?? "?")[0].toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <div>
                          <span className="font-medium text-sm text-foreground">
                            {post.authorDisplayName ?? post.authorName ?? "Usuário"}
                          </span>
                          <span className="text-xs text-muted-foreground ml-2">{formatDate(post.createdAt)}</span>
                          {idx === 0 && (
                            <span className="ml-2 text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded">
                              {language === "en" ? "Author" : language === "es" ? "Autor" : "Autor"}
                            </span>
                          )}
                          {post.hidden && (
                            <span className="ml-2 text-xs bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded">Oculto</span>
                          )}
                        </div>
                        {user?.role === "admin" && (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-7 w-7" aria-label="Opções de moderação">
                                <MoreVertical className="w-4 h-4" aria-hidden="true" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => hidePost.mutate({ postId: post.id, hidden: !post.hidden })}>
                                <EyeOff className="w-4 h-4 mr-2" aria-hidden="true" />
                                {post.hidden ? "Mostrar" : "Ocultar"}
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className="text-destructive"
                                onClick={() => { if (confirm("Deletar esta mensagem?")) deletePost.mutate({ postId: post.id }); }}
                              >
                                <Trash2 className="w-4 h-4 mr-2" aria-hidden="true" />
                                Deletar
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                      </div>
                      <div className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">
                        {post.body}
                      </div>
                    </div>
                  </div>
                </li>
              ))}
            </ol>
          )}

          {/* Reply box */}
          {!isLoading && (
            <div className="mt-8 border-t border-border pt-6">
              <h2 className="font-semibold text-foreground mb-3">
                {language === "en" ? "Write a reply" : language === "es" ? "Escribe una respuesta" : "Escrever uma resposta"}
              </h2>
              <Textarea
                value={replyBody}
                onChange={e => setReplyBody(e.target.value)}
                placeholder={language === "en" ? "Your message..." : language === "es" ? "Tu mensaje..." : "Sua mensagem..."}
                rows={4}
                maxLength={10000}
                aria-label={language === "en" ? "Reply message" : language === "es" ? "Mensaje de respuesta" : "Mensagem de resposta"}
                className="mb-3"
              />
              <div className="flex justify-end">
                <Button onClick={handleReply} disabled={!replyBody.trim() || reply.isPending}>
                  {reply.isPending ? "..." : language === "en" ? "Send reply" : language === "es" ? "Enviar respuesta" : "Enviar resposta"}
                </Button>
              </div>
            </div>
          )}
        </div>

        <DisplayNameDialog
          open={showDisplayNameDialog}
          onClose={() => setShowDisplayNameDialog(false)}
          onSaved={() => { setShowDisplayNameDialog(false); if (replyBody.trim()) reply.mutate({ topicId, body: replyBody.trim() }); }}
          language={language}
        />
      </main>
    </SiteLayout>
  );
}
