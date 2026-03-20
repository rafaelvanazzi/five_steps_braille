import { Link } from "wouter";
import { useLanguage } from "@/contexts/LanguageContext";
import { Music } from "lucide-react";

export default function Footer() {
  const { t } = useLanguage();
  const year = new Date().getFullYear();

  return (
    <footer className="bg-primary text-primary-foreground mt-auto" role="contentinfo">
      <div className="container py-10">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Brand */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Music className="w-5 h-5 text-secondary" aria-hidden="true" />
              <span className="font-bold text-lg">Five Steps</span>
            </div>
            <p className="text-sm text-primary-foreground/75 leading-relaxed">
              {t.footer_desc}
            </p>
          </div>

          {/* Links */}
          <div>
            <h3 className="font-semibold text-secondary mb-3 text-sm uppercase tracking-wider">{t.footer_links}</h3>
            <nav aria-label="Links do rodapé">
              <ul className="space-y-2">
                <li><Link href="/sobre" className="text-sm text-primary-foreground/75 hover:text-primary-foreground transition-colors">{t.nav_about}</Link></li>
                <li><Link href="/acervo" className="text-sm text-primary-foreground/75 hover:text-primary-foreground transition-colors">{t.nav_library}</Link></li>
                <li><Link href="/instituicoes" className="text-sm text-primary-foreground/75 hover:text-primary-foreground transition-colors">{t.nav_institutions}</Link></li>
                <li><Link href="/contato" className="text-sm text-primary-foreground/75 hover:text-primary-foreground transition-colors">{t.nav_contact}</Link></li>
              </ul>
            </nav>
          </div>

          {/* Contact */}
          <div>
            <h3 className="font-semibold text-secondary mb-3 text-sm uppercase tracking-wider">Contato</h3>
            <address className="not-italic text-sm text-primary-foreground/75 space-y-1">
              <p>Rafael Moreira Vanazzi de Souza</p>
              <p>M.Mus. — UNICAMP</p>
              <p>Campinas, SP — Brasil</p>
              <a href="mailto:rafaelvanazzi@gmail.com" className="hover:text-primary-foreground transition-colors">
                rafaelvanazzi@gmail.com
              </a>
            </address>
          </div>
        </div>

        <div className="border-t border-primary-foreground/20 mt-8 pt-6 text-center text-xs text-primary-foreground/60">
          <p>© {year} Five Steps — Musicografia Braille. {t.footer_rights}</p>
        </div>
      </div>
    </footer>
  );
}
