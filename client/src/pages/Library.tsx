import { useState, useMemo } from "react";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileDown, Lock, BookOpen, FileText, Music, Star, MessageSquare, Send, Trash2, ChevronDown, ChevronUp, Eye, EyeOff, User } from "lucide-react";
import { toast } from "sonner";

const gradeLabels: Record<number, { pt: string; en: string; badge: string }> = {
  1: { pt: "Notas e Alturas", en: "Notes & Pitches", badge: "grade-badge-1" },
  2: { pt: "Tempo", en: "Time", badge: "grade-badge-2" },
  3: { pt: "Intervalos Diatônicos", en: "Diatonic Intervals", badge: "grade-badge-3" },
  4: { pt: "Intervalos Cromáticos", en: "Chromatic Intervals", badge: "grade-badge-4" },
  5: { pt: "Tópicos Diversos", en: "Diverse Topics", badge: "grade-badge-5" },
};

function FileIcon({ mimeType }: { mimeType?: string | null }) {
  if (mimeType?.includes("audio")) return <Music className="w-5 h-5 text-purple-600" aria-hidden="true" />;
  if (mimeType?.includes("pdf")) return <FileText className="w-5 h-5 text-red-600" aria-hidden="true" />;
  return <BookOpen className="w-5 h-5 text-blue-600" aria-hidden="true" />;
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
  const { data: userRating } = trpc.ratings.getUserRating.useQuery(
    { materialId },
    { enabled: isAuthenticated }
  );

  const rateMutation = trpc.ratings.rate.useMutation({
    onSuccess: () => {
      utils.ratings.getForMaterial.invalidate({ materialId });
      utils.ratings.getUserRating.invalidate({ materialId });
      toast.success("Avaliação registrada!");
    },
    onError: () => toast.error("Erro ao avaliar."),
  });

  const handleRate = (rating: number) => {
    if (!isAuthenticated) {
      toast.error("Faça login para avaliar.");
      return;
    }
    rateMutation.mutate({ materialId, rating });
  };

  const currentUserRating = userRating?.rating ?? 0;
  const average = ratingData?.average ?? 0;
  const count = ratingData?.count ?? 0;

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <div className="flex items-center gap-0.5" role="group" aria-label="Avaliação por estrelas">
        {[1, 2, 3, 4, 5].map((s) => (
          <button
            key={s}
            onClick={() => handleRate(s)}
            onMouseEnter={() => isAuthenticated && setHoverStar(s)}
            onMouseLeave={() => setHoverStar(0)}
            disabled={!isAuthenticated || rateMutation.isPending}
            className="p-0.5 focus-visible:outline-2 focus-visible:outline-primary rounded disabled:cursor-default"
            aria-label={`${s} estrela${s > 1 ? "s" : ""}`}
          >
            <Star
              className={`w-4 h-4 transition-colors ${
                (hoverStar > 0 ? s <= hoverStar : s <= currentUserRating)
                  ? "text-yellow-500 fill-yellow-500"
                  : s <= Math.round(average)
                    ? "text-yellow-400 fill-yellow-400/50"
                    : "text-gray-300"
              }`}
            />
          </button>
        ))}
      </div>
      <span className="text-xs text-muted-foreground">
        {count > 0 ? `${average.toFixed(1)} (${count})` : "Sem avaliações"}
      </span>
    </div>
  );
}

// ─── Comments Section ───────────────────────────────────────────────────────
function CommentsSection({ materialId, isAuthenticated }: { materialId: number; isAuthenticated: boolean }) {
  const [showComments, setShowComments] = useState(false);
  const [newComment, setNewComment] = useState("");
  const { user } = useAuth();
  const utils = trpc.useUtils();

  const { data: comments = [], isLoading } = trpc.comments.getForMaterial.useQuery(
    { materialId },
    { enabled: showComments }
  );

  const addMutation = trpc.comments.add.useMutation({
    onSuccess: () => {
      setNewComment("");
      utils.comments.getForMaterial.invalidate({ materialId });
      toast.success("Comentário adicionado!");
    },
    onError: () => toast.error("Erro ao comentar."),
  });

  const deleteMutation = trpc.comments.delete.useMutation({
    onSuccess: () => {
      utils.comments.getForMaterial.invalidate({ materialId });
      toast.success("Comentário removido.");
    },
    onError: () => toast.error("Erro ao remover."),
  });

  const handleSubmit = () => {
    if (!newComment.trim()) return;
    addMutation.mutate({ materialId, content: newComment.trim() });
  };

  return (
    <div className="mt-3 pt-3 border-t border-border/50">
      <button
        onClick={() => setShowComments(!showComments)}
        className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
      >
        <MessageSquare className="w-3.5 h-3.5" />
        {showComments ? "Ocultar comentários" : "Ver comentários"}
        {showComments ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
      </button>

      {showComments && (
        <div className="mt-3 space-y-3">
          {isLoading ? (
            <div className="h-8 bg-muted rounded animate-pulse" />
          ) : comments.length === 0 ? (
            <p className="text-xs text-muted-foreground italic">Nenhum comentário ainda. Seja o primeiro!</p>
          ) : (
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {comments.map((c) => (
                <div key={c.id} className="bg-muted/50 rounded-lg p-3">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="text-xs font-medium text-foreground">{c.userName ?? "Anônimo"}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">
                        {new Date(c.createdAt).toLocaleDateString("pt-BR")}
                      </span>
                      {(user?.id === c.userId || user?.role === "admin") && (
                        <button
                          onClick={() => { if (confirm("Remover este comentário?")) deleteMutation.mutate({ id: c.id }); }}
                          className="text-muted-foreground hover:text-destructive transition-colors"
                          aria-label="Remover comentário"
                        >
                          <Trash2 className="w-3 h-3" />
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
              <Textarea
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Escreva um comentário..."
                rows={2}
                className="text-sm resize-none flex-1"
                maxLength={2000}
              />
              <Button
                size="sm"
                onClick={handleSubmit}
                disabled={!newComment.trim() || addMutation.isPending}
                className="self-end gap-1"
              >
                <Send className="w-3.5 h-3.5" />
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

// ─── Material Card ──────────────────────────────────────────────────────────
function MaterialCard({ material, isAuthenticated }: {
  material: {
    id: number; title: string; description?: string | null; grade: number;
    stage?: number | null; fileName: string; fileSize?: number | null;
    mimeType?: string | null; language: string;
    materialType: string; creatorVision: string; creatorName?: string | null;
  };
  isAuthenticated: boolean;
}) {
  const { t } = useLanguage();
  const getDownload = trpc.materials.getDownloadUrl.useQuery(
    { id: material.id },
    { enabled: false }
  );

  const handleDownload = async () => {
    if (!isAuthenticated) {
      toast.error(t.library_login_required);
      return;
    }
    const result = await getDownload.refetch();
    if (result.data) {
      const a = document.createElement("a");
      a.href = result.data.url;
      a.download = result.data.fileName;
      a.target = "_blank";
      a.rel = "noopener noreferrer";
      a.click();
    }
  };

  const gradeInfo = gradeLabels[material.grade];
  const isPartitura = material.materialType === "partitura";
  const isPDV = material.creatorVision === "pdv";

  return (
    <Card className="border border-border shadow-sm hover:shadow-md transition-shadow">
      <CardContent className="p-5">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 mt-0.5">
            <FileIcon mimeType={material.mimeType} />
          </div>
          <div className="flex-1 min-w-0">
            {/* Badges row */}
            <div className="flex flex-wrap items-center gap-1.5 mb-2">
              {/* Grade badge */}
              <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold ${gradeInfo?.badge ?? ""}`}>
                Grau {material.grade}{material.stage ? ` · Etapa ${material.stage}` : ""}
              </span>
              {/* Material type badge */}
              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${
                isPartitura
                  ? "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300"
                  : "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300"
              }`}>
                {isPartitura ? <FileText className="w-3 h-3" /> : <Music className="w-3 h-3" />}
                {isPartitura ? t.library_type_partitura : t.library_type_atividade}
              </span>
              {/* Creator vision badge */}
              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${
                isPDV
                  ? "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300"
                  : "bg-gray-100 text-gray-700 dark:bg-gray-800/50 dark:text-gray-300"
              }`}>
                {isPDV ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                {isPDV ? t.library_creator_pdv : t.library_creator_vidente}
              </span>
              {/* Language badge */}
              {material.language !== "both" && (
                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-muted text-muted-foreground border border-border">
                  {material.language.toUpperCase()}
                </span>
              )}
            </div>

            {/* Title */}
            <h3 className="font-semibold text-foreground text-sm leading-tight mb-1 truncate">{material.title}</h3>

            {/* Creator name */}
            {material.creatorName && (
              <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                <User className="w-3 h-3" aria-hidden="true" />
                {t.library_creator_by}: <span className="font-medium text-foreground/80">{material.creatorName}</span>
              </p>
            )}

            {/* Description */}
            {material.description && (
              <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2 mb-2">{material.description}</p>
            )}
            <p className="text-xs text-muted-foreground mb-2">{material.fileName} {formatSize(material.fileSize) && `· ${formatSize(material.fileSize)}`}</p>

            {/* Star Rating */}
            <StarRating materialId={material.id} isAuthenticated={isAuthenticated} />

            {/* Comments */}
            <CommentsSection materialId={material.id} isAuthenticated={isAuthenticated} />
          </div>
          <div className="flex-shrink-0">
            {isAuthenticated ? (
              <Button
                size="sm"
                variant="outline"
                onClick={handleDownload}
                disabled={getDownload.isFetching}
                aria-label={`Baixar ${material.title}`}
                className="gap-1"
              >
                <FileDown className="w-4 h-4" aria-hidden="true" />
                {t.library_download}
              </Button>
            ) : (
              <Button
                size="sm"
                variant="outline"
                asChild
                className="gap-1 text-muted-foreground"
              >
                <a href={getLoginUrl()} aria-label={`Faça login para baixar ${material.title}`}>
                  <Lock className="w-4 h-4" aria-hidden="true" />
                  {t.library_login}
                </a>
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Library Page ───────────────────────────────────────────────────────────
export default function Library() {
  const { t, language } = useLanguage();
  const { isAuthenticated } = useAuth();
  const [activeGrade, setActiveGrade] = useState<string>("all");
  const [filterType, setFilterType] = useState<string>("all");
  const [filterCreator, setFilterCreator] = useState<string>("all");

  const { data: materials = [], isLoading } = trpc.materials.list.useQuery(
    { grade: activeGrade !== "all" ? parseInt(activeGrade) : undefined }
  );

  // Apply client-side filters for type and creator
  const filteredMaterials = useMemo(() => {
    let result = materials;
    if (filterType !== "all") {
      result = result.filter((m: any) => m.materialType === filterType);
    }
    if (filterCreator !== "all") {
      result = result.filter((m: any) => m.creatorVision === filterCreator);
    }
    return result;
  }, [materials, filterType, filterCreator]);

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
            {/* Type filter */}
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">{t.library_filter_type}</label>
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger className="w-[200px] h-9 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t.library_filter_all_types}</SelectItem>
                  <SelectItem value="partitura">{t.library_type_partitura}</SelectItem>
                  <SelectItem value="atividade">{t.library_type_atividade}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {/* Creator filter */}
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">{t.library_filter_creator}</label>
              <Select value={filterCreator} onValueChange={setFilterCreator}>
                <SelectTrigger className="w-[200px] h-9 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t.library_filter_all_creators}</SelectItem>
                  <SelectItem value="vidente">{t.library_creator_vidente}</SelectItem>
                  <SelectItem value="pdv">{t.library_creator_pdv}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {/* Active filters indicator */}
            {(filterType !== "all" || filterCreator !== "all") && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => { setFilterType("all"); setFilterCreator("all"); }}
                className="text-xs text-muted-foreground hover:text-foreground"
              >
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
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {[1, 2, 3, 4].map((i) => (
                      <div key={i} className="h-24 bg-muted rounded-xl animate-pulse" aria-hidden="true" />
                    ))}
                  </div>
                ) : filteredMaterials.length === 0 ? (
                  <div className="text-center py-16">
                    <BookOpen className="w-12 h-12 text-muted-foreground mx-auto mb-4" aria-hidden="true" />
                    <p className="text-muted-foreground text-lg">{t.library_empty}</p>
                    <p className="text-sm text-muted-foreground mt-2">{t.library_empty_desc}</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {filteredMaterials.map((m: any) => (
                      <MaterialCard
                        key={m.id}
                        material={m}
                        isAuthenticated={isAuthenticated}
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
