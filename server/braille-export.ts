/**
 * Braille Music Export Module
 * Handles conversion of Braille Unicode content to .brf (Braille Ready Format)
 * 
 * BRF uses North American ASCII Braille (Computer Braille Code) mapping:
 * Each Unicode Braille character (U+2800-U+283F) maps to an ASCII character.
 * Page formatting uses CR+LF for line breaks and FF (0x0C) for page breaks.
 */

// ============================================================
// Page Format Presets
// ============================================================

export interface PageFormat {
  name: string;
  description: string;
  cellsPerLine: number;
  linesPerPage: number;
  paperSize: string;
}

export const PAGE_FORMATS: Record<string, PageFormat> = {
  "bana-standard": {
    name: "BANA Padrão (EUA)",
    description: "Formulário contínuo 11½\" × 11\" - Padrão americano",
    cellsPerLine: 40,
    linesPerPage: 25,
    paperSize: "11.5x11in",
  },
  "a4-brasil": {
    name: "A4 Brasil",
    description: "Papel A4 (210×297mm) - Padrão brasileiro para impressoras braille",
    cellsPerLine: 40,
    linesPerPage: 25,
    paperSize: "A4",
  },
  "a4-internacional": {
    name: "A4 Internacional",
    description: "Papel A4 com margens maiores - Padrão internacional",
    cellsPerLine: 32,
    linesPerPage: 27,
    paperSize: "A4",
  },
  "letter-us": {
    name: "Letter (EUA)",
    description: "Papel Letter 8½\" × 11\" - Impressoras cut-sheet",
    cellsPerLine: 34,
    linesPerPage: 25,
    paperSize: "Letter",
  },
  "formulario-continuo": {
    name: "Formulário Contínuo",
    description: "Papel contínuo para impressoras tractor-feed (12\" × 11\")",
    cellsPerLine: 42,
    linesPerPage: 25,
    paperSize: "12x11in",
  },
  "braille-facil": {
    name: "Braille Fácil (Brasil)",
    description: "Configuração padrão do software Braille Fácil",
    cellsPerLine: 40,
    linesPerPage: 25,
    paperSize: "Formulário contínuo",
  },
  custom: {
    name: "Personalizado",
    description: "Configuração personalizada de células e linhas",
    cellsPerLine: 40,
    linesPerPage: 25,
    paperSize: "Custom",
  },
};

// ============================================================
// Unicode Braille → ASCII BRF Mapping
// ============================================================

/**
 * North American ASCII Braille (Computer Braille Code) mapping.
 * Maps Unicode Braille U+2800..U+283F (6-dot patterns) to ASCII characters.
 * This is the standard used by BRF files.
 */
const UNICODE_TO_ASCII_BRF: Record<number, string> = {
  0x2800: " ",  // ⠀ (empty/space)
  0x2801: "A",  // ⠁ dots 1
  0x2802: "1",  // ⠂ dots 2
  0x2803: "B",  // ⠃ dots 12
  0x2804: "'",  // ⠄ dots 3
  0x2805: "K",  // ⠅ dots 13
  0x2806: "2",  // ⠆ dots 23
  0x2807: "L",  // ⠇ dots 123
  0x2808: "@",  // ⠈ dots 4
  0x2809: "C",  // ⠉ dots 14
  0x280A: "I",  // ⠊ dots 24
  0x280B: "F",  // ⠋ dots 124
  0x280C: "/",  // ⠌ dots 34
  0x280D: "M",  // ⠍ dots 134
  0x280E: "S",  // ⠎ dots 234
  0x280F: "P",  // ⠏ dots 1234
  0x2810: "\"", // ⠐ dots 5
  0x2811: "E",  // ⠑ dots 15
  0x2812: "3",  // ⠒ dots 25
  0x2813: "H",  // ⠓ dots 125
  0x2814: "9",  // ⠔ dots 35
  0x2815: "O",  // ⠕ dots 135
  0x2816: "6",  // ⠖ dots 235
  0x2817: "R",  // ⠗ dots 1235
  0x2818: "^",  // ⠘ dots 45
  0x2819: "D",  // ⠙ dots 145
  0x281A: "J",  // ⠚ dots 245
  0x281B: "G",  // ⠛ dots 1245
  0x281C: ">",  // ⠜ dots 345
  0x281D: "N",  // ⠝ dots 1345
  0x281E: "T",  // ⠞ dots 2345
  0x281F: "Q",  // ⠟ dots 12345
  0x2820: ",",  // ⠠ dots 6
  0x2821: "*",  // ⠡ dots 16
  0x2822: "5",  // ⠢ dots 26
  0x2823: "<",  // ⠣ dots 126
  0x2824: "-",  // ⠤ dots 36
  0x2825: "U",  // ⠥ dots 136
  0x2826: "8",  // ⠦ dots 236
  0x2827: "V",  // ⠧ dots 1236
  0x2828: ".",  // ⠨ dots 46
  0x2829: "%",  // ⠩ dots 146
  0x282A: "[",  // ⠪ dots 246
  0x282B: "$",  // ⠫ dots 1246
  0x282C: "+",  // ⠬ dots 346
  0x282D: "X",  // ⠭ dots 1346
  0x282E: "!",  // ⠮ dots 2346
  0x282F: "&",  // ⠯ dots 12346
  0x2830: ";",  // ⠰ dots 56
  0x2831: ":",  // ⠱ dots 156
  0x2832: "4",  // ⠲ dots 256
  0x2833: "\\", // ⠳ dots 1256
  0x2834: "0",  // ⠴ dots 356
  0x2835: "Z",  // ⠵ dots 1356
  0x2836: "7",  // ⠶ dots 2356
  0x2837: "(",  // ⠷ dots 12356
  0x2838: "_",  // ⠸ dots 456
  0x2839: "?",  // ⠹ dots 1456
  0x283A: "W",  // ⠺ dots 2456
  0x283B: ")",  // ⠻ dots 12456
  0x283C: "#",  // ⠼ dots 3456
  0x283D: "Y",  // ⠽ dots 13456
  0x283E: "}",  // ⠾ dots 23456
  0x283F: "=",  // ⠿ dots 123456
};

// ============================================================
// Export Options
// ============================================================

export interface BrfExportOptions {
  title?: string;
  author?: string;
  format?: string; // key from PAGE_FORMATS
  cellsPerLine?: number; // override for custom
  linesPerPage?: number; // override for custom
  includeHeader?: boolean;
  pageNumbering?: boolean;
  startPage?: number;
}

// ============================================================
// Core Conversion Functions
// ============================================================

/**
 * Convert a single Unicode Braille character to its ASCII BRF equivalent.
 */
function unicodeBrailleToAscii(char: string): string {
  const code = char.charCodeAt(0);
  if (code >= 0x2800 && code <= 0x283F) {
    return UNICODE_TO_ASCII_BRF[code] || " ";
  }
  // Pass through regular ASCII characters (spaces, newlines, etc.)
  if (code === 32 || code === 10 || code === 13 || code === 9) {
    return char;
  }
  // For 8-dot braille (U+2840-U+28FF), map to space (not supported in standard BRF)
  if (code >= 0x2840 && code <= 0x28FF) {
    return " ";
  }
  // Non-braille characters: pass through as-is (for text headers)
  return char;
}

/**
 * Convert a string of Unicode Braille to ASCII BRF string.
 */
export function convertToBrfAscii(unicodeBraille: string): string {
  let result = "";
  for (const char of unicodeBraille) {
    result += unicodeBrailleToAscii(char);
  }
  return result;
}

/**
 * Format content into pages with proper line wrapping and page breaks.
 * Respects musical measure boundaries when possible (breaks at spaces).
 */
function formatIntoPages(
  content: string,
  cellsPerLine: number,
  linesPerPage: number,
  pageNumbering: boolean,
  startPage: number
): string {
  const lines = content.split("\n");
  const formattedLines: string[] = [];

  for (const line of lines) {
    if (line.length <= cellsPerLine) {
      formattedLines.push(line);
    } else {
      // Word-wrap at spaces (measure boundaries in braille music)
      let remaining = line;
      while (remaining.length > cellsPerLine) {
        // Find last space within cellsPerLine
        let breakPoint = remaining.lastIndexOf(" ", cellsPerLine);
        if (breakPoint <= 0) {
          // No space found, hard break
          breakPoint = cellsPerLine;
        }
        formattedLines.push(remaining.substring(0, breakPoint));
        remaining = remaining.substring(breakPoint + 1); // skip the space
      }
      if (remaining.length > 0) {
        formattedLines.push(remaining);
      }
    }
  }

  // Split into pages
  const pages: string[] = [];
  let currentPageLines: string[] = [];
  const effectiveLinesPerPage = pageNumbering ? linesPerPage - 1 : linesPerPage;

  for (const line of formattedLines) {
    currentPageLines.push(line);
    if (currentPageLines.length >= effectiveLinesPerPage) {
      pages.push(currentPageLines.join("\r\n"));
      currentPageLines = [];
    }
  }
  // Add last page
  if (currentPageLines.length > 0) {
    pages.push(currentPageLines.join("\r\n"));
  }

  // Add page numbers if requested
  if (pageNumbering) {
    for (let i = 0; i < pages.length; i++) {
      const pageNum = (startPage + i).toString();
      // Page number right-aligned on last line
      const padding = " ".repeat(cellsPerLine - pageNum.length);
      pages[i] = pages[i] + "\r\n" + padding + pageNum;
    }
  }

  // Join pages with Form Feed (FF = 0x0C)
  return pages.join("\r\n\x0C\r\n");
}

// ============================================================
// Main Export Functions
// ============================================================

/**
 * Generate .brf file content from Unicode Braille content.
 * Converts Unicode to ASCII BRF and formats into pages.
 */
export function generateBrfContent(
  brailleContent: string,
  options: BrfExportOptions = {}
): string {
  const {
    format = "a4-brasil",
    cellsPerLine: customCells,
    linesPerPage: customLines,
    includeHeader = false,
    pageNumbering = true,
    startPage = 1,
  } = options;

  // Determine page dimensions
  const pageFormat = PAGE_FORMATS[format] || PAGE_FORMATS["a4-brasil"];
  const cellsPerLine = customCells || pageFormat.cellsPerLine;
  const linesPerPage = customLines || pageFormat.linesPerPage;

  // Convert Unicode Braille to ASCII BRF
  const asciiContent = convertToBrfAscii(brailleContent);

  // Optional header (in BRF ASCII)
  let header = "";
  if (includeHeader && options.title) {
    const titleBrf = options.title.toUpperCase();
    header = titleBrf + "\r\n";
    if (options.author) {
      header += options.author.toUpperCase() + "\r\n";
    }
    header += "\r\n";
  }

  const fullContent = header + asciiContent;

  // Format into pages
  return formatIntoPages(fullContent, cellsPerLine, linesPerPage, pageNumbering, startPage);
}

/**
 * Export Braille content as .brf file (returns file content as Buffer)
 */
export function exportAsBrf(
  brailleContent: string,
  options: BrfExportOptions = {}
): Buffer {
  const content = generateBrfContent(brailleContent, options);
  return Buffer.from(content, "ascii");
}

/**
 * Export Braille content as plain text with metadata
 */
export function exportAsPlainText(
  brailleContent: string,
  textContent: string,
  options: BrfExportOptions = {}
): string {
  const { title = "Sem título", author = "Desconhecido" } = options;

  return `Título: ${title}
Autor: ${author}
Formato: Musicografia Braille
Gerado: ${new Date().toISOString()}

---

CONTEÚDO BRAILLE:
${brailleContent}

CONTEÚDO TEXTO:
${textContent}

---
Fim do Documento`;
}

/**
 * Validate Braille content for BRF export.
 * Checks if all characters are valid 6-dot Braille Unicode or whitespace.
 */
export function validateBrailleContent(content: string): {
  valid: boolean;
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];

  for (let i = 0; i < content.length; i++) {
    const code = content.charCodeAt(i);
    // Valid: 6-dot Braille (U+2800-U+283F), whitespace
    if (code >= 0x2800 && code <= 0x283F) continue;
    if (code === 32 || code === 10 || code === 13 || code === 9) continue;
    // 8-dot braille: warning (will be converted to space)
    if (code >= 0x2840 && code <= 0x28FF) {
      warnings.push(`Caractere 8-pontos na posição ${i} será convertido para espaço`);
      continue;
    }
    errors.push(`Caractere inválido na posição ${i}: U+${code.toString(16).toUpperCase()}`);
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Get available page formats for the UI
 */
export function getPageFormats(): Array<PageFormat & { key: string }> {
  return Object.entries(PAGE_FORMATS)
    .filter(([key]) => key !== "custom")
    .map(([key, format]) => ({ key, ...format }));
}

/**
 * Estimate file size and page count for BRF export
 */
export function estimateExport(
  brailleContent: string,
  options: BrfExportOptions = {}
): {
  estimatedPages: number;
  estimatedBytes: number;
  cellsPerLine: number;
  linesPerPage: number;
} {
  const format = options.format || "a4-brasil";
  const pageFormat = PAGE_FORMATS[format] || PAGE_FORMATS["a4-brasil"];
  const cellsPerLine = options.cellsPerLine || pageFormat.cellsPerLine;
  const linesPerPage = options.linesPerPage || pageFormat.linesPerPage;

  const lines = brailleContent.split("\n");
  let totalLines = 0;
  for (const line of lines) {
    totalLines += Math.max(1, Math.ceil(line.length / cellsPerLine));
  }

  const estimatedPages = Math.max(1, Math.ceil(totalLines / linesPerPage));
  // Each character = 1 byte in ASCII BRF + CR+LF per line + FF per page
  const estimatedBytes = brailleContent.length + totalLines * 2 + estimatedPages;

  return { estimatedPages, estimatedBytes, cellsPerLine, linesPerPage };
}
