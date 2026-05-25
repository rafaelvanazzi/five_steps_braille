import { describe, it, expect } from "vitest";
import {
  convertToBrfAscii,
  generateBrfContent,
  validateBrailleContent,
  estimateExport,
  exportAsBrf,
  exportAsPlainText,
  getPageFormats,
  PAGE_FORMATS,
} from "./braille-export";

describe("Braille Export Module", () => {
  describe("convertToBrfAscii", () => {
    it("should convert Unicode Braille to ASCII BRF characters", () => {
      // ⠁ = dots 1 = A, ⠃ = dots 12 = B, ⠉ = dots 14 = C
      const input = "\u2801\u2803\u2809";
      const result = convertToBrfAscii(input);
      expect(result).toBe("ABC");
    });

    it("should convert space (⠀ U+2800) to space", () => {
      const input = "\u2800";
      const result = convertToBrfAscii(input);
      expect(result).toBe(" ");
    });

    it("should handle empty string", () => {
      const result = convertToBrfAscii("");
      expect(result).toBe("");
    });

    it("should convert number indicator (⠼ dots 3456) to #", () => {
      const input = "\u283C";
      const result = convertToBrfAscii(input);
      expect(result).toBe("#");
    });

    it("should convert full braille (⠿ dots 123456) to =", () => {
      const input = "\u283F";
      const result = convertToBrfAscii(input);
      expect(result).toBe("=");
    });

    it("should preserve regular whitespace", () => {
      const input = "\u2801 \u2803\n\u2809";
      const result = convertToBrfAscii(input);
      expect(result).toBe("A B\nC");
    });
  });

  describe("validateBrailleContent", () => {
    it("should validate correct 6-dot Braille content", () => {
      const content = "\u2801\u2802\u2804";
      const result = validateBrailleContent(content);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it("should detect invalid characters", () => {
      const content = "Hello\u2801World";
      const result = validateBrailleContent(content);
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it("should allow newlines and spaces", () => {
      const content = "\u2801\n\u2802 \u2804";
      const result = validateBrailleContent(content);
      expect(result.valid).toBe(true);
    });

    it("should warn about 8-dot braille characters", () => {
      const content = "\u2801\u2840\u2802"; // U+2840 is 8-dot
      const result = validateBrailleContent(content);
      expect(result.valid).toBe(true); // valid but with warnings
      expect(result.warnings.length).toBeGreaterThan(0);
    });

    it("should handle empty content", () => {
      const result = validateBrailleContent("");
      expect(result.valid).toBe(true);
    });
  });

  describe("generateBrfContent", () => {
    it("should generate ASCII BRF content from Unicode Braille", () => {
      const content = "\u2801\u2803\u2809"; // ABC in braille
      const result = generateBrfContent(content);
      expect(result).toContain("ABC");
    });

    it("should wrap long lines at cellsPerLine boundary", () => {
      // 50 characters of ⠁ (A) with 40 cells per line should wrap
      const longContent = "\u2801".repeat(50);
      const result = generateBrfContent(longContent, { format: "a4-brasil" });
      const lines = result.split("\r\n");
      // First line should be 40 chars, second should have the rest
      expect(lines[0].length).toBeLessThanOrEqual(40);
    });

    it("should use page break (FF) between pages", () => {
      // Create content that spans multiple pages
      const lines = Array(30).fill("\u2801".repeat(10)).join("\n");
      const result = generateBrfContent(lines, { format: "a4-brasil" });
      expect(result).toContain("\x0C"); // Form Feed
    });

    it("should add page numbers when pageNumbering is true", () => {
      const content = "\u2801\u2803\u2809";
      const result = generateBrfContent(content, { pageNumbering: true });
      expect(result).toContain("1"); // Page number
    });

    it("should include header when includeHeader is true", () => {
      const content = "\u2801\u2803\u2809";
      const result = generateBrfContent(content, {
        includeHeader: true,
        title: "Test Title",
      });
      expect(result).toContain("TEST TITLE");
    });
  });

  describe("exportAsBrf", () => {
    it("should return a Buffer", () => {
      const content = "\u2801\u2803\u2809";
      const result = exportAsBrf(content);
      expect(result).toBeInstanceOf(Buffer);
    });

    it("should contain ASCII-only content", () => {
      const content = "\u2801\u2803\u2809";
      const result = exportAsBrf(content);
      const str = result.toString("ascii");
      // All characters should be valid ASCII (0-127)
      for (let i = 0; i < str.length; i++) {
        expect(str.charCodeAt(i)).toBeLessThan(128);
      }
    });

    it("should handle empty content", () => {
      const result = exportAsBrf("");
      expect(result).toBeInstanceOf(Buffer);
    });
  });

  describe("exportAsPlainText", () => {
    it("should export content as plain text with metadata", () => {
      const brailleContent = "\u2801\u2802\u2804";
      const textContent = "Hello World";
      const result = exportAsPlainText(brailleContent, textContent, {
        title: "My Project",
        author: "Me",
      });

      expect(result).toContain("My Project");
      expect(result).toContain("Me");
      expect(result).toContain("CONTEÚDO BRAILLE:");
      expect(result).toContain("CONTEÚDO TEXTO:");
      expect(result).toContain(brailleContent);
      expect(result).toContain(textContent);
    });
  });

  describe("getPageFormats", () => {
    it("should return available page formats", () => {
      const formats = getPageFormats();
      expect(formats.length).toBeGreaterThan(0);
      expect(formats.some((f) => f.key === "a4-brasil")).toBe(true);
      expect(formats.some((f) => f.key === "bana-standard")).toBe(true);
    });

    it("should not include custom format", () => {
      const formats = getPageFormats();
      expect(formats.some((f) => f.key === "custom")).toBe(false);
    });
  });

  describe("estimateExport", () => {
    it("should estimate pages and bytes correctly", () => {
      const content = "\u2801".repeat(100);
      const result = estimateExport(content, { format: "a4-brasil" });
      expect(result.estimatedPages).toBeGreaterThan(0);
      expect(result.estimatedBytes).toBeGreaterThan(0);
      expect(result.cellsPerLine).toBe(40);
      expect(result.linesPerPage).toBe(25);
    });

    it("should use custom dimensions when provided", () => {
      const content = "\u2801".repeat(100);
      const result = estimateExport(content, {
        cellsPerLine: 32,
        linesPerPage: 27,
      });
      expect(result.cellsPerLine).toBe(32);
      expect(result.linesPerPage).toBe(27);
    });
  });

  describe("PAGE_FORMATS", () => {
    it("should have A4 Brasil with 40 cells and 25 lines", () => {
      expect(PAGE_FORMATS["a4-brasil"].cellsPerLine).toBe(40);
      expect(PAGE_FORMATS["a4-brasil"].linesPerPage).toBe(25);
    });

    it("should have BANA standard with 40 cells and 25 lines", () => {
      expect(PAGE_FORMATS["bana-standard"].cellsPerLine).toBe(40);
      expect(PAGE_FORMATS["bana-standard"].linesPerPage).toBe(25);
    });

    it("should have A4 internacional with 32 cells and 27 lines", () => {
      expect(PAGE_FORMATS["a4-internacional"].cellsPerLine).toBe(32);
      expect(PAGE_FORMATS["a4-internacional"].linesPerPage).toBe(27);
    });
  });

  describe("Integration tests", () => {
    it("should handle complete export workflow", () => {
      const brailleContent = "\u2801\u2803\u2809\u2819"; // A B C D

      // Validate
      const validation = validateBrailleContent(brailleContent);
      expect(validation.valid).toBe(true);

      // Export as BRF
      const brfBuffer = exportAsBrf(brailleContent, {
        title: "Music Piece",
        format: "a4-brasil",
      });
      expect(brfBuffer).toBeInstanceOf(Buffer);
      const brfStr = brfBuffer.toString("ascii");
      expect(brfStr).toContain("ABCD");

      // Export as plain text
      const txtContent = exportAsPlainText(brailleContent, "Do Re Mi Fa", {
        title: "Music Piece",
        author: "Composer",
      });
      expect(txtContent).toContain("Do Re Mi Fa");

      // Estimate
      const estimate = estimateExport(brailleContent);
      expect(estimate.estimatedPages).toBe(1);
    });

    it("should handle empty Braille content gracefully", () => {
      const validation = validateBrailleContent("");
      expect(validation.valid).toBe(true);

      const brfBuffer = exportAsBrf("");
      expect(brfBuffer).toBeInstanceOf(Buffer);
    });
  });
});
