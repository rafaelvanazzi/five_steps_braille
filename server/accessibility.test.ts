import { describe, it, expect } from "vitest";
import { readFileSync, existsSync } from "fs";
import { resolve } from "path";

describe("WCAG 2.1 AA Accessibility Compliance", () => {
  // ─── index.html ───
  describe("index.html", () => {
    const html = readFileSync(resolve(__dirname, "../client/index.html"), "utf-8");

    it("has lang attribute on html element", () => {
      expect(html).toMatch(/<html\s+lang="pt"/);
    });

    it("has meta description", () => {
      expect(html).toMatch(/<meta\s+name="description"/);
    });

    it("has a11y announcer live region", () => {
      expect(html).toContain('id="a11y-announcer"');
      expect(html).toContain('aria-live="polite"');
      expect(html).toContain('role="status"');
    });

    it("has descriptive title", () => {
      expect(html).toMatch(/<title>Five Steps/);
    });
  });

  // ─── SiteLayout ───
  describe("SiteLayout", () => {
    const src = readFileSync(resolve(__dirname, "../client/src/components/SiteLayout.tsx"), "utf-8");

    it("has skip navigation link", () => {
      expect(src).toContain('href="#main-content"');
      expect(src).toContain("skip-nav");
    });

    it("has main element with id for skip nav target", () => {
      expect(src).toContain('id="main-content"');
      expect(src).toContain("<main");
    });
  });

  // ─── Header ───
  describe("Header", () => {
    const src = readFileSync(resolve(__dirname, "../client/src/components/Header.tsx"), "utf-8");

    it("has role=banner on header", () => {
      expect(src).toContain('role="banner"');
    });

    it("has aria-label on main navigation", () => {
      expect(src).toMatch(/aria-label=.*[Nn]avega/);
    });

    it("has aria-current for active page", () => {
      expect(src).toContain('aria-current');
    });

    it("has aria-expanded on mobile menu toggle", () => {
      expect(src).toContain("aria-expanded");
    });

    it("has aria-controls on mobile menu toggle", () => {
      expect(src).toContain("aria-controls");
    });

    it("has aria-label on language buttons", () => {
      expect(src).toContain('aria-label="Português"');
      expect(src).toContain('aria-label="English"');
      expect(src).toContain('aria-label="Español"');
    });

    it("has aria-pressed on language toggle buttons", () => {
      expect(src).toContain("aria-pressed");
    });
  });

  // ─── Footer ───
  describe("Footer", () => {
    const src = readFileSync(resolve(__dirname, "../client/src/components/Footer.tsx"), "utf-8");

    it("has role=contentinfo on footer", () => {
      expect(src).toContain('role="contentinfo"');
    });

    it("has footer navigation with aria-label", () => {
      expect(src).toContain("aria-label");
    });

    it("uses address element for contact info", () => {
      expect(src).toContain("<address");
    });
  });

  // ─── LanguageContext ───
  describe("LanguageContext", () => {
    const src = readFileSync(resolve(__dirname, "../client/src/contexts/LanguageContext.tsx"), "utf-8");

    it("updates document.documentElement.lang on language change", () => {
      expect(src).toContain("document.documentElement.lang");
    });
  });

  // ─── Route A11y Hook ───
  describe("useRouteA11y", () => {
    const src = readFileSync(resolve(__dirname, "../client/src/hooks/useRouteA11y.ts"), "utf-8");

    it("moves focus to main content on route change", () => {
      expect(src).toContain('getElementById("main-content")');
      expect(src).toContain(".focus(");
    });
  });

  // ─── A11y Announcer Hook ───
  describe("useA11yAnnounce", () => {
    const src = readFileSync(resolve(__dirname, "../client/src/hooks/useA11yAnnounce.ts"), "utf-8");

    it("exports announce function", () => {
      expect(src).toContain("export function announce");
    });

    it("uses aria-live region", () => {
      expect(src).toContain("aria-live");
    });
  });

  // ─── CSS Accessibility ───
  describe("CSS Accessibility", () => {
    const css = readFileSync(resolve(__dirname, "../client/src/index.css"), "utf-8");

    it("has skip-nav styles", () => {
      expect(css).toContain(".skip-nav");
    });

    it("has focus-visible styles", () => {
      expect(css).toContain("focus-visible");
    });

    it("has prefers-reduced-motion media query", () => {
      expect(css).toContain("prefers-reduced-motion");
    });
  });

  // ─── Contact Form ───
  describe("Contact Form", () => {
    const src = readFileSync(resolve(__dirname, "../client/src/pages/Contact.tsx"), "utf-8");

    it("has aria-required on required fields", () => {
      expect(src).toContain('aria-required="true"');
    });

    it("has labels with htmlFor on all inputs", () => {
      expect(src).toContain('htmlFor="contact-name"');
      expect(src).toContain('htmlFor="contact-email"');
      expect(src).toContain('htmlFor="contact-subject"');
      expect(src).toContain('htmlFor="contact-message"');
    });

    it("has role=status on success message", () => {
      expect(src).toContain('role="status"');
    });
  });

  // ─── Library / Acervo ───
  describe("Library / Acervo", () => {
    const src = readFileSync(resolve(__dirname, "../client/src/pages/Library.tsx"), "utf-8");

    it("has aria-labelledby on hero section", () => {
      expect(src).toContain('aria-labelledby="library-heading"');
    });

    it("has aria-label on star rating group", () => {
      expect(src).toMatch(/role="radiogroup"/);
    });

    it("has aria-expanded on comments toggle", () => {
      expect(src).toContain("aria-expanded");
    });

    it("has aria-label on comment textarea", () => {
      expect(src).toContain('aria-label="Escreva um comentário"');
    });

    it("uses announce for filter results", () => {
      expect(src).toContain("announce(");
    });
  });

  // ─── Admin Panel ───
  describe("Admin Panel", () => {
    const src = readFileSync(resolve(__dirname, "../client/src/pages/Admin.tsx"), "utf-8");

    it("has tablist role on tab navigation", () => {
      expect(src).toContain('role="tablist"');
    });

    it("has tab role on individual tabs", () => {
      expect(src).toContain('role="tab"');
    });

    it("has aria-selected on tabs", () => {
      expect(src).toContain("aria-selected");
    });

    it("has aria-label on search input", () => {
      expect(src).toContain('aria-label="Buscar usuários por nome ou email"');
    });

    it("has aria-required on upload form required fields", () => {
      expect(src).toContain('aria-required="true"');
    });

    it("has aria-label on delete buttons", () => {
      expect(src).toContain('aria-label="Remover');
    });
  });

  // ─── Home Page ───
  describe("Home Page", () => {
    const src = readFileSync(resolve(__dirname, "../client/src/pages/Home.tsx"), "utf-8");

    it("has aria-labelledby on all sections", () => {
      expect(src).toContain('aria-labelledby="hero-heading"');
      expect(src).toContain('aria-labelledby="what-heading"');
      expect(src).toContain('aria-labelledby="grades-heading"');
      expect(src).toContain('aria-labelledby="who-heading"');
      expect(src).toContain('aria-labelledby="services-heading"');
      expect(src).toContain('aria-labelledby="cta-heading"');
    });

    it("has aria-hidden on decorative elements", () => {
      expect(src).toContain('aria-hidden="true"');
    });
  });
});
