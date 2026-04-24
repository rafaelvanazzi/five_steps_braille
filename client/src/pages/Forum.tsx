import { Link } from "wouter";
import { MessageSquare, ChevronRight, BookOpen, HelpCircle, Calendar, Globe } from "lucide-react";
import SiteLayout from "@/components/SiteLayout";
import { trpc } from "@/lib/trpc";
import { useLanguage } from "@/contexts/LanguageContext";

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  "musicografia-braille": <BookOpen className="w-6 h-6" aria-hidden="true" />,
  "acervo": <MessageSquare className="w-6 h-6" aria-hidden="true" />,
  "duvidas-suporte": <HelpCircle className="w-6 h-6" aria-hidden="true" />,
  "eventos-formacoes": <Calendar className="w-6 h-6" aria-hidden="true" />,
  "geral": <Globe className="w-6 h-6" aria-hidden="true" />,
};

export default function Forum() {
  const { language, t } = useLanguage();
  const { data: categories, isLoading } = trpc.forum.categories.useQuery();

  const getCategoryName = (cat: { namePt: string; nameEn: string; nameEs: string }) => {
    if (language === "en") return cat.nameEn;
    if (language === "es") return cat.nameEs;
    return cat.namePt;
  };

  const getCategoryDesc = (cat: { descriptionPt?: string | null; descriptionEn?: string | null; descriptionEs?: string | null }) => {
    if (language === "en") return cat.descriptionEn;
    if (language === "es") return cat.descriptionEs;
    return cat.descriptionPt;
  };

  return (
    <SiteLayout>
      <main id="main-content" className="min-h-screen bg-background">
        {/* Hero */}
        <section className="bg-primary/5 border-b border-border py-12 px-4">
          <div className="max-w-4xl mx-auto text-center">
            <div className="flex justify-center mb-4">
              <div className="p-3 rounded-full bg-primary/10">
                <MessageSquare className="w-8 h-8 text-primary" aria-hidden="true" />
              </div>
            </div>
            <h1 className="text-3xl font-bold text-foreground mb-3">
              {language === "en" ? "Community Forum" : language === "es" ? "Foro Comunitario" : "Fórum Comunitário"}
            </h1>
            <p className="text-muted-foreground max-w-xl mx-auto">
              {language === "en"
                ? "Exchange experiences, ask questions and discuss braille music notation with the global Five Steps community."
                : language === "es"
                ? "Intercambia experiencias, haz preguntas y discute sobre musicografía braille con la comunidad global Five Steps."
                : "Troque experiências, tire dúvidas e discuta sobre musicografia braille com a comunidade global Five Steps."}
            </p>
          </div>
        </section>

        {/* Categories */}
        <section className="max-w-4xl mx-auto px-4 py-10" aria-label={language === "en" ? "Forum categories" : language === "es" ? "Categorías del foro" : "Categorias do fórum"}>
          {isLoading ? (
            <div className="space-y-3" aria-busy="true" aria-label="Carregando categorias...">
              {[1, 2, 3, 4, 5].map(i => (
                <div key={i} className="h-24 rounded-lg bg-muted animate-pulse" />
              ))}
            </div>
          ) : (
            <ul className="space-y-3" role="list">
              {(categories ?? []).map(cat => (
                <li key={cat.id}>
                  <Link href={`/forum/${cat.slug}`}>
                    <div className="flex items-center gap-4 p-5 rounded-lg border border-border bg-card hover:border-primary/50 hover:bg-accent/30 transition-colors cursor-pointer group focus-within:ring-2 focus-within:ring-primary">
                      <div className="flex-shrink-0 text-primary">
                        {CATEGORY_ICONS[cat.slug] ?? <MessageSquare className="w-6 h-6" aria-hidden="true" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h2 className="font-semibold text-foreground group-hover:text-primary transition-colors">
                          {getCategoryName(cat)}
                        </h2>
                        <p className="text-sm text-muted-foreground mt-0.5 line-clamp-2">
                          {getCategoryDesc(cat)}
                        </p>
                      </div>
                      <div className="flex items-center gap-3 flex-shrink-0 text-muted-foreground">
                        <span className="text-sm font-medium" aria-label={`${cat.topicCount} tópicos`}>
                          {cat.topicCount} {language === "en" ? "topics" : language === "es" ? "temas" : "tópicos"}
                        </span>
                        <ChevronRight className="w-4 h-4 group-hover:text-primary transition-colors" aria-hidden="true" />
                      </div>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
    </SiteLayout>
  );
}
