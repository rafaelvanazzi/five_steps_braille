/**
 * ASCII Braille ↔ Unicode Braille Conversion
 * 
 * BRF files use ASCII Braille (North American Braille ASCII Code)
 * where printable ASCII characters 32-95 map to Braille cells.
 * This module converts between ASCII Braille and Unicode Braille (U+2800-U+283F).
 * 
 * Reference: https://en.wikipedia.org/wiki/Braille_ASCII
 */

// ASCII character → Unicode Braille character
// Maps ASCII codes 32-95 (and lowercase 97-122 = same as uppercase 65-90)
const ASCII_TO_UNICODE: Record<string, string> = {
  ' ':  '\u2800', // space → blank
  '!':  '\u282E', // ⠮
  '"':  '\u2810', // ⠐
  '#':  '\u283C', // ⠼
  '$':  '\u282B', // ⠫
  '%':  '\u2829', // ⠩
  '&':  '\u282F', // ⠯
  "'":  '\u2804', // ⠄
  '(':  '\u2837', // ⠷
  ')':  '\u283E', // ⠾
  '*':  '\u2821', // ⠡
  '+':  '\u282C', // ⠬
  ',':  '\u2820', // ⠠
  '-':  '\u2824', // ⠤
  '.':  '\u2828', // ⠨
  '/':  '\u280C', // ⠌
  '0':  '\u2834', // ⠴
  '1':  '\u2802', // ⠂
  '2':  '\u2806', // ⠆
  '3':  '\u2812', // ⠒
  '4':  '\u2832', // ⠲
  '5':  '\u2822', // ⠢
  '6':  '\u2816', // ⠖
  '7':  '\u2836', // ⠶
  '8':  '\u2826', // ⠦
  '9':  '\u2814', // ⠔
  ':':  '\u2831', // ⠱
  ';':  '\u2830', // ⠰
  '<':  '\u2823', // ⠣
  '=':  '\u283F', // ⠿
  '>':  '\u281C', // ⠜
  '?':  '\u2839', // ⠹
  '@':  '\u2808', // ⠈
  'A':  '\u2801', // ⠁
  'B':  '\u2803', // ⠃
  'C':  '\u2809', // ⠉
  'D':  '\u2819', // ⠙
  'E':  '\u2811', // ⠑
  'F':  '\u280B', // ⠋
  'G':  '\u281B', // ⠛
  'H':  '\u2813', // ⠓
  'I':  '\u280A', // ⠊
  'J':  '\u281A', // ⠚
  'K':  '\u2805', // ⠅
  'L':  '\u2807', // ⠇
  'M':  '\u280D', // ⠍
  'N':  '\u281D', // ⠝
  'O':  '\u2815', // ⠕
  'P':  '\u280F', // ⠏
  'Q':  '\u281F', // ⠟
  'R':  '\u2817', // ⠗
  'S':  '\u280E', // ⠎
  'T':  '\u281E', // ⠞
  'U':  '\u2825', // ⠥
  'V':  '\u2827', // ⠧
  'W':  '\u283A', // ⠺
  'X':  '\u282D', // ⠭
  'Y':  '\u283D', // ⠽
  'Z':  '\u2835', // ⠵
  '[':  '\u282A', // ⠪
  '\\': '\u2833', // ⠳
  ']':  '\u283B', // ⠻
  '^':  '\u2818', // ⠘
  '_':  '\u2838', // ⠸
};

// Build reverse map: Unicode → ASCII
const UNICODE_TO_ASCII: Record<string, string> = {};
for (const [ascii, unicode] of Object.entries(ASCII_TO_UNICODE)) {
  UNICODE_TO_ASCII[unicode] = ascii;
}

/**
 * Convert ASCII Braille text (BRF format) to Unicode Braille.
 * Handles both uppercase and lowercase ASCII letters.
 */
export function asciiToUnicodeBraille(asciiText: string): string {
  let result = '';
  for (const ch of asciiText) {
    const upper = ch.toUpperCase();
    const mapped = ASCII_TO_UNICODE[upper];
    if (mapped) {
      result += mapped;
    } else if (ch === '\n' || ch === '\r' || ch === '\t') {
      result += ch; // preserve whitespace
    } else {
      // Check if it's already a Unicode Braille character
      const code = ch.charCodeAt(0);
      if (code >= 0x2800 && code <= 0x28FF) {
        result += ch; // already Unicode Braille
      } else {
        result += ch; // pass through unknown characters
      }
    }
  }
  return result;
}

/**
 * Convert Unicode Braille to ASCII Braille (BRF format).
 */
export function unicodeToAsciiBraille(unicodeText: string): string {
  let result = '';
  for (const ch of unicodeText) {
    const mapped = UNICODE_TO_ASCII[ch];
    if (mapped) {
      result += mapped;
    } else if (ch === '\n' || ch === '\r' || ch === '\t') {
      result += ch;
    } else {
      result += ch;
    }
  }
  return result;
}

/**
 * Detect if a text is ASCII Braille (BRF) or Unicode Braille.
 * Returns 'ascii' if most characters are in ASCII range,
 * 'unicode' if most are in Unicode Braille range,
 * or 'mixed' if both are present.
 */
export function detectBrailleFormat(text: string): 'ascii' | 'unicode' | 'mixed' | 'unknown' {
  let asciiCount = 0;
  let unicodeCount = 0;
  let totalSignificant = 0;

  for (const ch of text) {
    const code = ch.charCodeAt(0);
    if (ch === ' ' || ch === '\n' || ch === '\r' || ch === '\t') continue;
    totalSignificant++;
    
    if (code >= 0x2800 && code <= 0x28FF) {
      unicodeCount++;
    } else if (code >= 32 && code <= 126) {
      asciiCount++;
    }
  }

  if (totalSignificant === 0) return 'unknown';
  if (unicodeCount > 0 && asciiCount === 0) return 'unicode';
  if (asciiCount > 0 && unicodeCount === 0) return 'ascii';
  if (asciiCount > 0 && unicodeCount > 0) return 'mixed';
  return 'unknown';
}
