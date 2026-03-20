import { useState } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import SiteLayout from "@/components/SiteLayout";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { FileDown, Lock, BookOpen, FileText, Music } from "lucide-react";
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

function MaterialCard({ material, isAuthenticated, language }: {
  material: { id: number; title: string; description?: string | null; grade: number; stage?: number | null; fileName: string; fileSize?: number | null; mimeType?: string | null; language: string };
  isAuthenticated: boolean;
  language: string;
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

  return (
    <Card className="border border-border shadow-sm hover:shadow-md transition-shadow">
      <CardContent className="p-5">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 mt-0.5">
            <FileIcon mimeType={material.mimeType} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold ${gradeInfo?.badge ?? ""}`}>
                Grau {material.grade}{material.stage ? ` · Etapa ${material.stage}` : ""}
              </span>
              {material.language !== "both" && (
                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-muted text-muted-foreground border border-border">
                  {material.language.toUpperCase()}
                </span>
              )}
            </div>
            <h3 className="font-semibold text-foreground text-sm leading-tight mb-1 truncate">{material.title}</h3>
            {material.description && (
              <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2 mb-2">{material.description}</p>
            )}
            <p className="text-xs text-muted-foreground">{material.fileName} {formatSize(material.fileSize) && `· ${formatSize(material.fileSize)}`}</p>
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

export default function Library() {
  const { t, language } = useLanguage();
  const { isAuthenticated } = useAuth();
  const [activeGrade, setActiveGrade] = useState<string>("all");

  const { data: materials = [], isLoading } = trpc.materials.list.useQuery(
    { grade: activeGrade !== "all" ? parseInt(activeGrade) : undefined }
  );

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
                ) : materials.length === 0 ? (
                  <div className="text-center py-16">
                    <BookOpen className="w-12 h-12 text-muted-foreground mx-auto mb-4" aria-hidden="true" />
                    <p className="text-muted-foreground text-lg">{t.library_empty}</p>
                    <p className="text-sm text-muted-foreground mt-2">{t.library_empty_desc}</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {materials.map((m) => (
                      <MaterialCard
                        key={m.id}
                        material={m}
                        isAuthenticated={isAuthenticated}
                        language={language}
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
