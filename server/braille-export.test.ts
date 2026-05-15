import { describe, it, expect } from "vitest";
import {
  brailleUnicodeToUtf8Braille,
  generateBrfContent,
  brailleToAsciiRepresentation,
  validateBrailleContent,
  estimateFileSize,
  exportAsBrf,
  exportAsPlainText,
} from "./braille-export";

describe("Braille Export Module", () => {
  describe("brailleUnicodeToUtf8Braille", () => {
    it("should convert Unicode Braille to UTF-8 Braille", () => {
      const input = "\u2801\u2802\u2804"; // Braille characters
      const result = brailleUnicodeToUtf8Braille(input);
      expect(result).toBe(input); // Direct pass-through
    });

    it("should handle empty string", () => {
      const result = brailleUnicodeToUtf8Braille("");
      expect(result).toBe("");
    });
  });

  describe("validateBrailleContent", () => {
    it("should validate correct Braille content", () => {
      const content = "\u2801\u2802\u2804"; // Valid Braille
      const result = validateBrailleContent(content);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it("should detect invalid characters", () => {
      const content = "Hello\u2801World"; // Mix of ASCII and Braille
      const result = validateBrailleContent(content);
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it("should allow newlines and carriage returns", () => {
      const content = "\u2801\n\u2802\r\u2804";
      const result = validateBrailleContent(content);
      expect(result.valid).toBe(true);
    });

    it("should handle empty content", () => {
      const result = validateBrailleContent("");
      expect(result.valid).toBe(true);
    });
  });

  describe("estimateFileSize", () => {
    it("should estimate file size correctly", () => {
      const content = "\u2801\u2802\u2804"; // 3 Braille characters
      const result = estimateFileSize(content);
      expect(result.bytes).toBe(9); // 3 chars * 3 bytes each
      expect(result.kilobytes).toBe(9 / 1024);
    });

    it("should handle empty content", () => {
      const result = estimateFileSize("");
      expect(result.bytes).toBe(0);
      expect(result.kilobytes).toBe(0);
    });

    it("should handle large content", () => {
      const content = "\u2801".repeat(1000);
      const result = estimateFileSize(content);
      expect(result.bytes).toBe(3000);
      expect(result.kilobytes).toBeCloseTo(2.93, 1);
    });
  });

  describe("brailleToAsciiRepresentation", () => {
    it("should convert Braille to ASCII representation", () => {
      const content = "\u2800\u2801\u2802"; // Empty, dot 1, dot 2
      const result = brailleToAsciiRepresentation(content);
      expect(result).toBe("012");
    });

    it("should handle unknown characters", () => {
      const content = "A\u2801B"; // Mix of ASCII and Braille
      const result = brailleToAsciiRepresentation(content);
      expect(result).toContain("?");
    });
  });

  describe("generateBrfContent", () => {
    it("should generate BRF content with header", () => {
      const content = "\u2801\u2802\u2804";
      const result = generateBrfContent(content, {
        title: "Test Project",
        author: "Test Author",
        language: "pt",
      });

      expect(result).toContain("Test Project");
      expect(result).toContain("Test Author");
      expect(result).toContain("pt");
      expect(result).toContain(content);
    });

    it("should use default options", () => {
      const content = "\u2801\u2802";
      const result = generateBrfContent(content);

      expect(result).toContain("Untitled");
      expect(result).toContain("Unknown");
      expect(result).toContain("pt");
    });

    it("should wrap long lines", () => {
      const longContent = "\u2801".repeat(100);
      const result = generateBrfContent(longContent, { pageWidth: 40 });

      // Should have multiple lines due to wrapping
      const lines = result.split("\n").filter((line) => line.length > 0);
      expect(lines.length).toBeGreaterThan(1);
    });
  });

  describe("exportAsBrf", () => {
    it("should export content as BRF format", () => {
      const content = "\u2801\u2802\u2804";
      const result = exportAsBrf(content, {
        title: "My Project",
        author: "Me",
      });

      expect(result).toContain("My Project");
      expect(result).toContain("Me");
      expect(result).toContain(content);
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
      expect(result).toContain("BRAILLE CONTENT:");
      expect(result).toContain("TEXT CONTENT:");
      expect(result).toContain(brailleContent);
      expect(result).toContain(textContent);
    });

    it("should include ISO timestamp", () => {
      const result = exportAsPlainText("\u2801", "test");
      expect(result).toMatch(/Generated: \d{4}-\d{2}-\d{2}T/);
    });
  });

  describe("Integration tests", () => {
    it("should handle complete export workflow", () => {
      const brailleContent = "\u2801\u2802\u2804\u2808";
      const textContent = "Do Re Mi Fa";

      // Validate
      const validation = validateBrailleContent(brailleContent);
      expect(validation.valid).toBe(true);

      // Export as BRF
      const brfContent = exportAsBrf(brailleContent, {
        title: "Music Piece",
        author: "Composer",
      });
      expect(brfContent).toContain("Music Piece");

      // Export as plain text
      const txtContent = exportAsPlainText(brailleContent, textContent, {
        title: "Music Piece",
        author: "Composer",
      });
      expect(txtContent).toContain(textContent);

      // Estimate size
      const size = estimateFileSize(brailleContent);
      expect(size.bytes).toBeGreaterThan(0);
    });

    it("should handle empty Braille content gracefully", () => {
      const validation = validateBrailleContent("");
      expect(validation.valid).toBe(true);

      const brfContent = exportAsBrf("");
      expect(brfContent).toBeDefined();

      const size = estimateFileSize("");
      expect(size.bytes).toBe(0);
    });
  });
});
