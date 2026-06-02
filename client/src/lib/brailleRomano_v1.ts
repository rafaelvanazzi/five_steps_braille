/**
 * Braille ↔ Romano (ASCII Braille) Bidirectional Conversion
 * 
 * The "Texto em Romano" panel shows the ASCII Braille letters corresponding
 * to each Unicode Braille character. This uses the standard North American
 * Braille ASCII mapping where each Unicode Braille cell maps to a printable
 * ASCII character (letters, digits, punctuation).
 * 
 * Example: ⠙ (dots 1,4,5 = Dó colcheia) → "D" (ASCII Braille letter)
 *          ⠹ (dots 1,4,5,6 = Dó semínima) → "?" (ASCII Braille letter)
 */

// ─── UNICODE BRAILLE → ASCII CHARACTER TABLE ─────────────────────────────────
// Based on North American Braille ASCII (NABCC)
// Maps Unicode Braille U+2800–U+283F to printable ASCII characters 32–95

const UNICODE_TO_ASCII: Record<string, string> = {
  '\u2800': ' ',  // blank
  '\u2801': 'A',  // ⠁
  '\u2802': '1',  // ⠂
  '\u2803': 'B',  // ⠃
  '\u2804': "'",  // ⠄
  '\u2805': 'K',  // ⠅
  '\u2806': '2',  // ⠆
  '\u2807': 'L',  // ⠇
  '\u2808': '@',  // ⠈
  '\u2809': 'C',  // ⠉
  '\u280A': 'I',  // ⠊
  '\u280B': 'F',  // ⠋
  '\u280C': '/',  // ⠌
  '\u280D': 'M',  // ⠍
  '\u280E': 'S',  // ⠎
  '\u280F': 'P',  // ⠏
  '\u2810': '"',  // ⠐
  '\u2811': 'E',  // ⠑
  '\u2812': '3',  // ⠒
  '\u2813': 'H',  // ⠓
  '\u2814': '9',  // ⠔
  '\u2815': 'O',  // ⠕
  '\u2816': '6',  // ⠖
  '\u2817': 'R',  // ⠗
  '\u2818': '^',  // ⠘
  '\u2819': 'D',  // ⠙
  '\u281A': 'J',  // ⠚
  '\u281B': 'G',  // ⠛
  '\u281C': '>',  // ⠜
  '\u281D': 'N',  // ⠝
  '\u281E': 'T',  // ⠞
  '\u281F': 'Q',  // ⠟
  '\u2820': ',',  // ⠠
  '\u2821': '*',  // ⠡
  '\u2822': '5',  // ⠢
  '\u2823': '<',  // ⠣
  '\u2824': '-',  // ⠤
  '\u2825': 'U',  // ⠥
  '\u2826': '8',  // ⠦
  '\u2827': 'V',  // ⠧
  '\u2828': '.',  // ⠨
  '\u2829': '%',  // ⠩
  '\u282A': '[',  // ⠪
  '\u282B': '$',  // ⠫
  '\u282C': '+',  // ⠬
  '\u282D': 'X',  // ⠭
  '\u282E': '!',  // ⠮
  '\u282F': '&',  // ⠯
  '\u2830': ';',  // ⠰
  '\u2831': ':',  // ⠱
  '\u2832': '4',  // ⠲
  '\u2833': '\\', // ⠳
  '\u2834': '0',  // ⠴
  '\u2835': 'Z',  // ⠵
  '\u2836': '7',  // ⠶
  '\u2837': '(',  // ⠷
  '\u2838': '_',  // ⠸
  '\u2839': '?',  // ⠹
  '\u283A': 'W',  // ⠺
  '\u283B': ']',  // ⠻
  '\u283C': '#',  // ⠼
  '\u283D': 'Y',  // ⠽
  '\u283E': ')',  // ⠾
  '\u283F': '=',  // ⠿
};

// Build reverse map: ASCII → Unicode
const ASCII_TO_UNICODE: Record<string, string> = {};
for (const [unicode, ascii] of Object.entries(UNICODE_TO_ASCII)) {
  // Only map if not already mapped (avoid duplicates for space)
  if (!ASCII_TO_UNICODE[ascii]) {
    ASCII_TO_UNICODE[ascii] = unicode;
  }
}

// ─── BRAILLE → ROMANO CONVERSION ──────────────────────────────────────────────

/**
 * Convert a Unicode Braille string to its ASCII Braille (Romano) representation.
 * Each Unicode Braille character is mapped to its corresponding ASCII character.
 * Non-Braille characters (text annotations, newlines) are passed through as-is.
 */
export function brailleToRoman(braille: string): string {
  let result = '';
  for (const ch of braille) {
    const code = ch.charCodeAt(0);
    
    // Unicode Braille range
    if (code >= 0x2800 && code <= 0x283F) {
      const ascii = UNICODE_TO_ASCII[ch];
      result += ascii || ch;
    } else if (ch === '\n' || ch === '\r') {
      result += ch;
    } else {
      // Non-Braille character (text annotation) — pass through
      result += ch;
    }
  }
  return result;
}

// ─── ROMANO → BRAILLE CONVERSION ──────────────────────────────────────────────

/**
 * Convert an ASCII Braille (Romano) string back to Unicode Braille.
 * Each ASCII character is mapped to its corresponding Unicode Braille character.
 * Handles both uppercase and lowercase letters (mapped to same Braille cell).
 */
export function romanToBraille(roman: string): string {
  let result = '';
  for (const ch of roman) {
    const upper = ch.toUpperCase();
    const unicode = ASCII_TO_UNICODE[upper];
    if (unicode) {
      result += unicode;
    } else if (ch === '\n' || ch === '\r') {
      result += ch;
    } else {
      // Unknown character — pass through
      result += ch;
    }
  }
  return result;
}

/**
 * Get a human-readable description of the Romano (ASCII Braille) format.
 */
export function getRomanFormatHelp(): string {
  return `Formato Romano (ASCII Braille):
  Cada cela Braille tem uma letra correspondente no alfabeto.
  
  Exemplos de notas:
  ⠙ (Dó colcheia) = D
  ⠹ (Dó semínima) = ?
  ⠝ (Dó mínima) = N
  ⠽ (Dó semibreve) = Y
  
  Espaço = Barra de compasso
  
  Para escrever aqui, use as letras do teclado.
  O correspondente em Braille aparecerá automaticamente.`;
}
