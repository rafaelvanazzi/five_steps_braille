import { useState, useCallback } from "react";
import { Link, useLocation } from "wouter";
import { MessageSquare, ChevronRight, BookOpen, HelpCircle, Calendar, Globe, Search, X } from "lucide-react";
import SiteLayout from "@/components/SiteLayout";
import { trpc } from "@/lib/trpc";
import { useLanguage } from "@/contexts/LanguageContext";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  "musicografia-braille": <BookOpen className="w-6 h-6" aria-hidden="true" />,
  "acervo": <MessageSquare className="w-6 h-6" aria-hidden="true" />,
  "duvidas-suporte": <HelpCircle className="w-6 h-6" aria-hidden="true" />,
  "eventos-formacoes": <Calendar className="w-6 h-6" aria-hidden="true" />,
  "geral": <Globe className="w-6 h-6" aria-hidden="true" />,
  "avisos-boas-vindas": <MessageSquare className="w-6 h-6" aria-hidden="true" />,
};

export default function Forum() {
  const { language, t } = useLanguage();
  const [, navigate] = useLocation();
  const { data: categories, isLoading } = trpc.forum.categories.useQuery();

  const [searchQuery, setSearchQuery] = useState("");
  const [submittedQuery, setSubmittedQuery] = useState("");

  const { data: searchResults, isFetching: isSearching } = trpc.forum.search.useQuery(
    { query: submittedQuery },
    { enabled: submittedQuery.length >= 2 }
  );

  const handleSearch = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    const q = searchQuery.trim();
    if (q.length >= 2) setSubmittedQuery(q);
  }, [searchQuery]);

  const clearSearch = () => {
    setSearchQuery("");
    setSubmittedQuery("");
  };

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

  const searchPlaceholder = language === "en"
    ? "Search topics and posts..."
    : language === "es"
    ? "Buscar temas y publicaciones..."
    : "Buscar tópicos e postagens...";

  const searchLabel = language === "en"
    ? "Search the forum"
    : language === "es"
    ? "Buscar en el foro"
    : "Buscar no fórum";

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
            <p className="text-muted-foreground max-w-xl mx-auto mb-6">
              {language === "en"
                ? "Exchange experiences, ask questions and discuss braille music notation with the global Five Steps community."
                : language === "es"
                ? "Intercambia experiencias, haz preguntas y discute sobre musicografía braille con la comunidad global Five Steps."
                : "Troque experiências, tire dúvidas e discuta sobre musicografia braille com a comunidade global Five Steps."}
            </p>

            {/* Search bar */}
            <form
              onSubmit={handleSearch}
              className="max-w-xl mx-auto"
              role="search"
              aria-label={searchLabel}
            >
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" aria-hidden="true" />
                  <Input
                    type="search"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    placeholder={searchPlaceholder}
                    aria-label={searchPlaceholder}
                    className="pl-9 pr-9 bg-background"
                    minLength={2}
                    maxLength={200}
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={clearSearch}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      aria-label={language === "en" ? "Clear search" : language === "es" ? "Limpiar búsqueda" : "Limpar busca"}
                    >
                      <X className="w-4 h-4" aria-hidden="true" />
                    </button>
                  )}
                </div>
                <Button type="submit" disabled={searchQuery.trim().length < 2}>
                  {language === "en" ? "Search" : language === "es" ? "Buscar" : "Buscar"}
                </Button>
              </div>
            </form>
          </div>
        </section>

        {/* Search Results */}
        {submittedQuery && (
          <section
            className="max-w-4xl mx-auto px-4 py-6"
            aria-label={language === "en" ? "Search results" : language === "es" ? "Resultados de búsqueda" : "Resultados da busca"}
            aria-live="polite"
            aria-busy={isSearching}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-foreground">
                {language === "en"
                  ? `Results for "${submittedQuery}"`
                  : language === "es"
                  ? `Resultados para "${submittedQuery}"`
                  : `Resultados para "${submittedQuery}"`}
              </h2>
              <button
                onClick={clearSearch}
                className="text-sm text-muted-foreground hover:text-foreground underline"
              >
                {language === "en" ? "Clear" : language === "es" ? "Limpiar" : "Limpar"}
              </button>
            </div>

            {isSearching ? (
              <div className="space-y-2" aria-busy="true">
                {[1, 2, 3].map(i => <div key={i} className="h-14 rounded-lg bg-muted animate-pulse" />)}
              </div>
            ) : !searchResults || searchResults.length === 0 ? (
              <div className="text-center py-10 text-muted-foreground">
                <Search className="w-8 h-8 mx-auto mb-2 opacity-40" aria-hidden="true" />
                <p>
                  {language === "en"
                    ? "No results found. Try different keywords."
                    : language === "es"
                    ? "No se encontraron resultados. Prueba con otras palabras."
                    : "Nenhum resultado encontrado. Tente outras palavras."}
                </p>
              </div>
            ) : (
              <ul className="space-y-2" role="list">
                {searchResults.map((result, idx) => (
                  <li key={`${result.topicId}-${idx}`}>
                    <Link href={`/forum/topico/${result.topicId}`}>
                      <div className="flex items-start gap-3 p-4 rounded-lg border border-border bg-card hover:border-primary/50 hover:bg-accent/30 transition-colors cursor-pointer">
                        <MessageSquare className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" aria-hidden="true" />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-foreground line-clamp-1">{result.topicTitle}</p>
                          {result.snippet && (
                            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{result.snippet}</p>
                          )}
                        </div>
                        <span
                          className={`text-xs font-semibold px-1.5 py-0.5 rounded uppercase tracking-wide flex-shrink-0 ${
                            result.language === "pt" ? "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300" :
                            result.language === "es" ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300" :
                            "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300"
                          }`}
                          aria-label={`Idioma: ${result.language === "pt" ? "Português" : result.language === "es" ? "Español" : "English"}`}
                        >
                          {result.language}
                        </span>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
            <div className="mt-6 border-t border-border pt-4">
              <h2 className="text-lg font-semibold text-foreground mb-4">
                {language === "en" ? "Browse categories" : language === "es" ? "Explorar categorías" : "Explorar categorias"}
              </h2>
            </div>
          </section>
        )}

        {/* Categories */}
        <section
          className="max-w-4xl mx-auto px-4 py-10"
          aria-label={language === "en" ? "Forum categories" : language === "es" ? "Categorías del foro" : "Categorias do fórum"}
        >
          {!submittedQuery && (
            <h2 className="sr-only">
              {language === "en" ? "Forum categories" : language === "es" ? "Categorías del foro" : "Categorias do fórum"}
            </h2>
          )}
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
                        <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors">
                          {getCategoryName(cat)}
                        </h3>
                        <p className="text-sm text-muted-foreground mt-0.5 line-clamp-2">
                          {getCategoryDesc(cat)}
                        </p>
                      </div>
                      <div className="flex items-center gap-3 flex-shrink-0 text-muted-foreground">
                        <span className="text-sm font-medium" aria-label={`${cat.topicCount} ${language === "en" ? "topics" : language === "es" ? "temas" : "tópicos"}`}>
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
