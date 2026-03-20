import { useLanguage } from "@/contexts/LanguageContext";
import Header from "./Header";
import Footer from "./Footer";

interface SiteLayoutProps {
  children: React.ReactNode;
}

export default function SiteLayout({ children }: SiteLayoutProps) {
  const { t } = useLanguage();
  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* WCAG: Skip Navigation */}
      <a href="#main-content" className="skip-nav">
        {t.common_skip_nav}
      </a>
      <Header />
      <main id="main-content" className="flex-1" tabIndex={-1}>
        {children}
      </main>
      <Footer />
    </div>
  );
}
