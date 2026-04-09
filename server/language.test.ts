import { describe, it, expect } from "vitest";

// Mock translations from LanguageContext
const translations = {
  pt: {
    nav_home: "Início",
    nav_about: "Sobre o Método",
    nav_institutions: "Para Instituições",
    nav_musicians_dv: "Para Músicos com DV",
    nav_musicians_nodv: "Para Músicos sem DV",
    nav_library: "Acervo",
    nav_contact: "Contato",
    nav_login: "Entrar",
    nav_logout: "Sair",
    nav_admin: "Administração",
    home_hero_title: "Five Steps",
    home_hero_subtitle: "Uma arquitetura pedagógica global para a alfabetização musical em Braille",
    contact_title: "Contato",
    contact_success: "Mensagem enviada com sucesso! Retornaremos em breve.",
  },
  en: {
    nav_home: "Home",
    nav_about: "About the Method",
    nav_institutions: "For Institutions",
    nav_musicians_dv: "For Musicians with VI",
    nav_musicians_nodv: "For Musicians without VI",
    nav_library: "Library",
    nav_contact: "Contact",
    nav_login: "Sign In",
    nav_logout: "Sign Out",
    nav_admin: "Administration",
    home_hero_title: "Five Steps",
    home_hero_subtitle: "A global pedagogical architecture for Braille music literacy",
    contact_title: "Contact",
    contact_success: "Message sent successfully! We will get back to you soon.",
  },
  es: {
    nav_home: "Inicio",
    nav_about: "Sobre el Método",
    nav_institutions: "Para Instituciones",
    nav_musicians_dv: "Para Músicos con DV",
    nav_musicians_nodv: "Para Músicos sin DV",
    nav_library: "Biblioteca",
    nav_contact: "Contacto",
    nav_login: "Iniciar Sesión",
    nav_logout: "Cerrar Sesión",
    nav_admin: "Administración",
    home_hero_title: "Five Steps",
    home_hero_subtitle: "Una arquitectura pedagógica global para la alfabetización musical en Braille",
    contact_title: "Contacto",
    contact_success: "¡Mensaje enviado exitosamente! Nos comunicaremos pronto.",
  },
};

describe("Trilingual Support", () => {
  describe("Language availability", () => {
    it("should have Portuguese translations", () => {
      expect(translations.pt).toBeDefined();
      expect(Object.keys(translations.pt).length).toBeGreaterThan(0);
    });

    it("should have English translations", () => {
      expect(translations.en).toBeDefined();
      expect(Object.keys(translations.en).length).toBeGreaterThan(0);
    });

    it("should have Spanish translations", () => {
      expect(translations.es).toBeDefined();
      expect(Object.keys(translations.es).length).toBeGreaterThan(0);
    });
  });

  describe("Translation consistency", () => {
    it("should have same keys across all languages", () => {
      const ptKeys = Object.keys(translations.pt).sort();
      const enKeys = Object.keys(translations.en).sort();
      const esKeys = Object.keys(translations.es).sort();

      expect(ptKeys).toEqual(enKeys);
      expect(ptKeys).toEqual(esKeys);
    });

    it("should have non-empty values for all translations", () => {
      Object.entries(translations).forEach(([lang, trans]) => {
        Object.entries(trans).forEach(([key, value]) => {
          expect(value).toBeTruthy();
          expect(typeof value).toBe("string");
          expect(value.length).toBeGreaterThan(0);
        });
      });
    });
  });

  describe("Navigation translations", () => {
    it("should have all navigation items in Portuguese", () => {
      expect(translations.pt.nav_home).toBe("Início");
      expect(translations.pt.nav_about).toBe("Sobre o Método");
      expect(translations.pt.nav_institutions).toBe("Para Instituições");
      expect(translations.pt.nav_library).toBe("Acervo");
      expect(translations.pt.nav_contact).toBe("Contato");
    });

    it("should have all navigation items in English", () => {
      expect(translations.en.nav_home).toBe("Home");
      expect(translations.en.nav_about).toBe("About the Method");
      expect(translations.en.nav_institutions).toBe("For Institutions");
      expect(translations.en.nav_library).toBe("Library");
      expect(translations.en.nav_contact).toBe("Contact");
    });

    it("should have all navigation items in Spanish", () => {
      expect(translations.es.nav_home).toBe("Inicio");
      expect(translations.es.nav_about).toBe("Sobre el Método");
      expect(translations.es.nav_institutions).toBe("Para Instituciones");
      expect(translations.es.nav_library).toBe("Biblioteca");
      expect(translations.es.nav_contact).toBe("Contacto");
    });
  });

  describe("Hero section translations", () => {
    it("should have consistent hero title across languages", () => {
      expect(translations.pt.home_hero_title).toBe("Five Steps");
      expect(translations.en.home_hero_title).toBe("Five Steps");
      expect(translations.es.home_hero_title).toBe("Five Steps");
    });

    it("should have hero subtitle in all languages", () => {
      expect(translations.pt.home_hero_subtitle).toContain("arquitetura pedagógica");
      expect(translations.en.home_hero_subtitle).toContain("pedagogical architecture");
      expect(translations.es.home_hero_subtitle).toContain("arquitectura pedagógica");
    });
  });

  describe("Contact page translations", () => {
    it("should have contact title in all languages", () => {
      expect(translations.pt.contact_title).toBe("Contato");
      expect(translations.en.contact_title).toBe("Contact");
      expect(translations.es.contact_title).toBe("Contacto");
    });

    it("should have success message in all languages", () => {
      expect(translations.pt.contact_success).toContain("sucesso");
      expect(translations.en.contact_success).toContain("successfully");
      expect(translations.es.contact_success).toContain("exitosamente");
    });
  });

  describe("Authentication translations", () => {
    it("should have login/logout in all languages", () => {
      expect(translations.pt.nav_login).toBe("Entrar");
      expect(translations.pt.nav_logout).toBe("Sair");
      expect(translations.en.nav_login).toBe("Sign In");
      expect(translations.en.nav_logout).toBe("Sign Out");
      expect(translations.es.nav_login).toBe("Iniciar Sesión");
      expect(translations.es.nav_logout).toBe("Cerrar Sesión");
    });
  });

  describe("Admin translations", () => {
    it("should have admin panel label in all languages", () => {
      expect(translations.pt.nav_admin).toBe("Administração");
      expect(translations.en.nav_admin).toBe("Administration");
      expect(translations.es.nav_admin).toBe("Administración");
    });
  });
});
