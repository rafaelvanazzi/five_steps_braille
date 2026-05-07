import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { Menu, X, Music } from "lucide-react";

export default function Header() {
  const { t, language, setLanguage } = useLanguage();
  const { user, isAuthenticated } = useAuth();
  const [location] = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const logout = trpc.auth.logout.useMutation({
    onSuccess: () => window.location.reload(),
  });

  const navLinks = [
    { href: "/", label: t.nav_home },
    { href: "/sobre", label: t.nav_about },
    { href: "/para-instituicoes", label: t.nav_institutions },
    { href: "/para-musicos-dv", label: t.nav_musicians_dv },
    { href: "/para-musicos-sem-dv", label: t.nav_musicians_nodv },
    { href: "/acervo", label: t.nav_library },
    { href: "/atividades", label: t.nav_activities },
    { href: "/forum", label: t.nav_forum },
    { href: "/contato", label: t.nav_contact },
    { href: "/sobre-rafael", label: language === "pt" ? "Rafa Vanazzi" : language === "en" ? "Rafa Vanazzi" : "Rafa Vanazzi" },
  ];

  const isActive = (href: string) => location === href;

  return (
    <header className="bg-primary text-primary-foreground shadow-lg sticky top-0 z-40" role="banner">
      <div className="container">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 font-bold text-xl hover:opacity-90 transition-opacity focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-foreground rounded-sm">
            <Music className="w-6 h-6 text-secondary" aria-hidden="true" />
            <span>Five Steps</span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center gap-1" aria-label="Navegação principal">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`px-3 py-2 rounded-md text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-foreground ${
                  isActive(link.href)
                    ? "bg-primary-foreground/20 text-primary-foreground"
                    : "text-primary-foreground/80 hover:text-primary-foreground hover:bg-primary-foreground/10"
                }`}
                aria-current={isActive(link.href) ? "page" : undefined}
              >
                {link.label}
              </Link>
            ))}
          </nav>

          {/* Right side: Language + Auth */}
          <div className="hidden lg:flex items-center gap-2">
            {/* Language Toggle - Trilingual */}
            <div className="flex gap-1 bg-primary-foreground/10 rounded-md p-1" role="group" aria-label="Selecionar idioma">
              <button
                onClick={() => setLanguage("pt")}
                className={`px-2 py-1 rounded text-xs font-medium transition ${
                  language === "pt"
                    ? "bg-primary-foreground/30 text-primary-foreground"
                    : "text-primary-foreground/70 hover:text-primary-foreground"
                }`}
                aria-label="Português"
                aria-pressed={language === "pt"}
              >
                PT
              </button>
              <button
                onClick={() => setLanguage("en")}
                className={`px-2 py-1 rounded text-xs font-medium transition ${
                  language === "en"
                    ? "bg-primary-foreground/30 text-primary-foreground"
                    : "text-primary-foreground/70 hover:text-primary-foreground"
                }`}
                aria-label="English"
                aria-pressed={language === "en"}
              >
                EN
              </button>
              <button
                onClick={() => setLanguage("es")}
                className={`px-2 py-1 rounded text-xs font-medium transition ${
                  language === "es"
                    ? "bg-primary-foreground/30 text-primary-foreground"
                    : "text-primary-foreground/70 hover:text-primary-foreground"
                }`}
                aria-label="Español"
                aria-pressed={language === "es"}
              >
                ES
              </button>
            </div>

            {/* Auth */}
            {isAuthenticated ? (
              <div className="flex items-center gap-2">
                {user?.role === "admin" && (
                  <Link
                    href="/admin"
                    className="px-3 py-1.5 rounded-md text-sm font-medium text-secondary hover:text-secondary/80 transition-colors"
                  >
                    {t.nav_admin}
                  </Link>
                )}
                <span className="text-sm text-primary-foreground/70">{user?.name}</span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => logout.mutate()}
                  className="border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/10"
                >
                  {t.nav_logout}
                </Button>
              </div>
            ) : (
              <Button
                asChild
                size="sm"
                className="bg-secondary text-secondary-foreground hover:bg-secondary/90 font-semibold"
              >
                <a href={getLoginUrl()}>{t.nav_login}</a>
              </Button>
            )}
          </div>

          {/* Mobile menu button */}
          <button
            className="lg:hidden p-2 rounded-md text-primary-foreground hover:bg-primary-foreground/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-foreground"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-expanded={mobileOpen}
            aria-controls="mobile-menu"
            aria-label={mobileOpen ? "Fechar menu" : "Abrir menu"}
          >
            {mobileOpen ? <X className="w-6 h-6" aria-hidden="true" /> : <Menu className="w-6 h-6" aria-hidden="true" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileOpen && (
        <div id="mobile-menu" className="lg:hidden border-t border-primary-foreground/20">
          <nav className="container py-3 flex flex-col gap-1" aria-label="Navegação mobile">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileOpen(false)}
                className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  isActive(link.href)
                    ? "bg-primary-foreground/20 text-primary-foreground"
                    : "text-primary-foreground/80 hover:text-primary-foreground hover:bg-primary-foreground/10"
                }`}
                aria-current={isActive(link.href) ? "page" : undefined}
              >
                {link.label}
              </Link>
            ))}
            <div className="flex flex-col gap-2 pt-2 border-t border-primary-foreground/20 mt-2">
              <div className="flex gap-1 bg-primary-foreground/10 rounded-md p-1" role="group" aria-label="Selecionar idioma">
                <button
                  onClick={() => { setLanguage("pt"); setMobileOpen(false); }}
                  className={`px-2 py-1 rounded text-xs font-medium transition ${
                    language === "pt"
                      ? "bg-primary-foreground/30 text-primary-foreground"
                      : "text-primary-foreground/70 hover:text-primary-foreground"
                  }`}
                  aria-label="Português"
                  aria-pressed={language === "pt"}
                >
                  PT
                </button>
                <button
                  onClick={() => { setLanguage("en"); setMobileOpen(false); }}
                  className={`px-2 py-1 rounded text-xs font-medium transition ${
                    language === "en"
                      ? "bg-primary-foreground/30 text-primary-foreground"
                      : "text-primary-foreground/70 hover:text-primary-foreground"
                  }`}
                  aria-label="English"
                  aria-pressed={language === "en"}
                >
                  EN
                </button>
                <button
                  onClick={() => { setLanguage("es"); setMobileOpen(false); }}
                  className={`px-2 py-1 rounded text-xs font-medium transition ${
                    language === "es"
                      ? "bg-primary-foreground/30 text-primary-foreground"
                      : "text-primary-foreground/70 hover:text-primary-foreground"
                  }`}
                  aria-label="Español"
                  aria-pressed={language === "es"}
                >
                  ES
                </button>
              </div>
              {isAuthenticated ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => { logout.mutate(); setMobileOpen(false); }}
                  className="border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/10"
                >
                  {t.nav_logout}
                </Button>
              ) : (
                <Button asChild size="sm" className="bg-secondary text-secondary-foreground hover:bg-secondary/90 font-semibold">
                  <a href={getLoginUrl()} onClick={() => setMobileOpen(false)}>{t.nav_login}</a>
                </Button>
              )}
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
