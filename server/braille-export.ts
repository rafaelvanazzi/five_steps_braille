/**
 * Braille Music Export Module
 * Handles conversion of Braille content to .brf (Braille Ready Format)
 */

export interface BrfExportOptions {
  title?: string;
  author?: string;
  language?: "pt" | "en" | "es";
  pageWidth?: number; // Characters per line (default 40)
  pageHeight?: number; // Lines per page (default 25)
}

/**
 * Convert Braille Unicode content to .brf format
 * .brf is a text format where each Braille character is represented as a 2-character code
 */
export function brailleUnicodeToUtf8Braille(brailleContent: string): string {
  // Convert Unicode Braille (U+2800-U+28FF) to UTF-8 Braille representation
  // This is a direct pass-through since Unicode Braille IS UTF-8 Braille
  return brailleContent;
}

/**
 * Generate .brf file content from Braille content
 * Includes header with metadata and formatted Braille content
 */
export function generateBrfContent(
  brailleContent: string,
  options: BrfExportOptions = {}
): string {
  const {
    title = "Untitled",
    author = "Unknown",
    language = "pt",
    pageWidth = 40,
    pageHeight = 25,
  } = options;

  // BRF header
  const header = `
⠠⠠⠠⠠⠠⠠⠠⠠⠠⠠⠠⠠⠠⠠⠠⠠⠠⠠⠠⠠
⠠⠠⠠⠠⠠⠠⠠⠠⠠⠠⠠⠠⠠⠠⠠⠠⠠⠠⠠⠠

⠠⠞⠊⠞⠇⠑: ${title}
⠠⠁⠥⠞⠓⠕⠗: ${author}
⠠⠇⠁⠝⠛⠥⠁⠛⠑: ${language}

⠠⠠⠠⠠⠠⠠⠠⠠⠠⠠⠠⠠⠠⠠⠠⠠⠠⠠⠠⠠
⠠⠠⠠⠠⠠⠠⠠⠠⠠⠠⠠⠠⠠⠠⠠⠠⠠⠠⠠⠠

`;

  // Format content into pages
  const lines = brailleContent.split("\n");
  let currentPage = "";
  let currentLine = "";
  let lineCount = 0;
  const pages: string[] = [];

  for (const line of lines) {
    // Wrap long lines
    let remainingLine = line;
    while (remainingLine.length > pageWidth) {
      currentLine = remainingLine.substring(0, pageWidth);
      currentPage += currentLine + "\n";
      lineCount++;

      if (lineCount >= pageHeight) {
        pages.push(currentPage);
        currentPage = "";
        lineCount = 0;
      }

      remainingLine = remainingLine.substring(pageWidth);
    }

    // Add remaining line
    if (remainingLine.length > 0) {
      currentLine = remainingLine;
      currentPage += currentLine + "\n";
      lineCount++;

      if (lineCount >= pageHeight) {
        pages.push(currentPage);
        currentPage = "";
        lineCount = 0;
      }
    }
  }

  // Add last page if not empty
  if (currentPage.trim().length > 0) {
    pages.push(currentPage);
  }

  // Combine all pages with page breaks
  const pageBreak = "\n" + "⠠".repeat(pageWidth) + "\n";
  const content = pages.join(pageBreak);

  return header + content;
}

/**
 * Convert Braille content to ASCII representation for compatibility
 * Uses dot patterns: 1-8 representing the 8 dots in a Braille cell
 */
export function brailleToAsciiRepresentation(brailleContent: string): string {
  const asciiMap: Record<string, string> = {
    "\u2800": "0", // Empty cell
    "\u2801": "1", // Dot 1
    "\u2802": "2", // Dot 2
    "\u2804": "3", // Dot 3
    "\u2808": "4", // Dot 4
    "\u2810": "5", // Dot 5
    "\u2820": "6", // Dot 6
    "\u2840": "7", // Dot 7
    "\u2880": "8", // Dot 8
  };

  let result = "";
  for (const char of brailleContent) {
    result += asciiMap[char] || "?";
  }
  return result;
}

/**
 * Export Braille content as .brf file (returns file content as string)
 */
export function exportAsBrf(
  brailleContent: string,
  options: BrfExportOptions = {}
): string {
  return generateBrfContent(brailleContent, options);
}

/**
 * Export Braille content as plain text with metadata
 */
export function exportAsPlainText(
  brailleContent: string,
  textContent: string,
  options: BrfExportOptions = {}
): string {
  const { title = "Untitled", author = "Unknown", language = "pt" } = options;

  const header = `Title: ${title}
Author: ${author}
Language: ${language}
Format: Braille Music Notation
Generated: ${new Date().toISOString()}

---

`;

  const content = `BRAILLE CONTENT:
${brailleContent}

TEXT CONTENT:
${textContent}

---
End of Document`;

  return header + content;
}

/**
 * Validate Braille content
 * Checks if all characters are valid Braille Unicode
 */
export function validateBrailleContent(content: string): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  for (let i = 0; i < content.length; i++) {
    const code = content.charCodeAt(i);
    // Valid Braille Unicode range: U+2800 to U+28FF
    if ((code < 0x2800 || code > 0x28ff) && code !== 10 && code !== 13 && code !== 32 && code !== 9) {
      // Allow newlines (10), carriage returns (13), spaces (32), tabs (9)
      errors.push(`Invalid character at position ${i}: U+${code.toString(16).toUpperCase()}`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Get file size estimation for Braille content
 */
export function estimateFileSize(brailleContent: string): {
  bytes: number;
  kilobytes: number;
} {
  // Each Braille character is 3 bytes in UTF-8
  const bytes = brailleContent.length * 3;
  const kilobytes = bytes / 1024;

  return { bytes, kilobytes };
}

/**
 * Convert Braille content to MusicXML format
 * MusicXML is a standard format for music notation
 */
export function exportAsMusicXML(
  brailleContent: string,
  options: BrfExportOptions = {}
): string {
  const { title = "Untitled", author = "Unknown", language = "pt" } = options;

  // Mapeamento simplificado de símbolos Braille para notas
  const brailleToNoteMap: Record<string, { pitch: string; octave: number }> = {
    "\u2801": { pitch: "C", octave: 4 }, // Ponto 1
    "\u2802": { pitch: "D", octave: 4 }, // Ponto 2
    "\u2804": { pitch: "E", octave: 4 }, // Ponto 3
    "\u2808": { pitch: "F", octave: 4 }, // Ponto 4
    "\u2810": { pitch: "G", octave: 4 }, // Ponto 5
    "\u2820": { pitch: "A", octave: 4 }, // Ponto 6
    "\u2840": { pitch: "B", octave: 4 }, // Ponto 7
  };

  // Converter Braille em notas
  const notes: Array<{ pitch: string; octave: number; duration: number }> = [];
  for (const char of brailleContent) {
    const noteData = brailleToNoteMap[char];
    if (noteData) {
      notes.push({
        pitch: noteData.pitch,
        octave: noteData.octave,
        duration: 4, // Semínima (padrão)
      });
    }
  }

  // Gerar MusicXML
  let musicXML = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE score-partwise PUBLIC "-//Recordare//DTD MusicXML 3.1 Partwise//EN" "http://www.musicxml.org/dtds/partwise.dtd">
<score-partwise version="3.1">
  <work>
    <work-title>${escapeXml(title)}</work-title>
  </work>
  <movement-title>${escapeXml(title)}</movement-title>
  <identification>
    <creator type="software">Five Steps - Musicografia Braille</creator>
    <creator type="composer">${escapeXml(author)}</creator>
    <encoding>
      <software>Five Steps Editor</software>
      <encoding-date>${new Date().toISOString().split("T")[0]}</encoding-date>
    </encoding>
  </identification>
  <part-list>
    <score-part id="P1">
      <part-name>Braille Music</part-name>
      <score-instrument id="P1-I1">
        <instrument-name>Piano</instrument-name>
      </score-instrument>
      <midi-instrument id="P1-I1">
        <midi-program>1</midi-program>
      </midi-instrument>
    </score-part>
  </part-list>
  <part id="P1">
    <measure number="1">
      <attributes>
        <divisions>4</divisions>
        <key>
          <fifths>0</fifths>
        </key>
        <time>
          <beats>4</beats>
          <beat-type>4</beat-type>
        </time>
        <clef>
          <sign>G</sign>
          <line>2</line>
        </clef>
      </attributes>
`;

  // Adicionar notas
  let measureCount = 1;
  let beatCount = 0;

  for (const note of notes) {
    if (beatCount >= 4) {
      measureCount++;
      beatCount = 0;
      musicXML += `    </measure>
    <measure number="${measureCount}">
`;
    }

    const pitchStep = note.pitch;
    const octave = note.octave;
    const duration = note.duration;

    musicXML += `      <note>
        <pitch>
          <step>${pitchStep}</step>
          <octave>${octave}</octave>
        </pitch>
        <duration>${duration}</duration>
        <type>quarter</type>
      </note>
`;

    beatCount += duration / 4;
  }

  // Adicionar rest se necessário para completar a última medida
  if (beatCount > 0 && beatCount < 4) {
    const restDuration = (4 - beatCount) * 4;
    musicXML += `      <note>
        <rest/>
        <duration>${restDuration}</duration>
        <type>quarter</type>
      </note>
`;
  }

  musicXML += `    </measure>
  </part>
</score-partwise>`;

  return musicXML;
}

/**
 * Escape XML special characters
 */
function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}
