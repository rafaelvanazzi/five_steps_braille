/**
 * Braille Music ↔ Roman Text Bidirectional Conversion
 * 
 * Converts between Unicode Braille music notation and a human-readable
 * Roman (Latin alphabet) representation for the "Texto em Romano" panel.
 * 
 * Roman format examples:
 *   "O4 Cq Dq Eq Fq" = Octave 4, C quarter, D quarter, E quarter, F quarter
 *   "O4 #C8 Dq | Eh Fh" = Octave 4, C# eighth, D quarter | E half, F half
 *   "O5 bEq Gq" = Octave 5, Eb quarter, G quarter
 *   "Rq Rh" = quarter rest, half rest
 */

// ─── BRAILLE → ROMAN TABLES ──────────────────────────────────────────────────

// Note characters → pitch + duration
const NOTE_TABLE: Record<string, { pitch: string; dur: string }> = {
  // Eighth notes (colcheias)
  '\u2819': { pitch: 'C', dur: '8' },  // ⠙
  '\u2811': { pitch: 'D', dur: '8' },  // ⠑
  '\u280B': { pitch: 'E', dur: '8' },  // ⠋
  '\u281B': { pitch: 'F', dur: '8' },  // ⠛
  '\u2813': { pitch: 'G', dur: '8' },  // ⠓
  '\u280A': { pitch: 'A', dur: '8' },  // ⠊
  '\u281A': { pitch: 'B', dur: '8' },  // ⠚
  // Quarter notes (semínimas)
  '\u2839': { pitch: 'C', dur: 'q' },  // ⠹
  '\u2831': { pitch: 'D', dur: 'q' },  // ⠱
  '\u282B': { pitch: 'E', dur: 'q' },  // ⠫
  '\u283B': { pitch: 'F', dur: 'q' },  // ⠻
  '\u2833': { pitch: 'G', dur: 'q' },  // ⠳
  '\u282A': { pitch: 'A', dur: 'q' },  // ⠪
  '\u283A': { pitch: 'B', dur: 'q' },  // ⠺
  // Half notes (mínimas)
  '\u281D': { pitch: 'C', dur: 'h' },  // ⠝
  '\u2815': { pitch: 'D', dur: 'h' },  // ⠕
  '\u280F': { pitch: 'E', dur: 'h' },  // ⠏
  '\u281F': { pitch: 'F', dur: 'h' },  // ⠟
  '\u2817': { pitch: 'G', dur: 'h' },  // ⠗
  '\u280E': { pitch: 'A', dur: 'h' },  // ⠎
  '\u281E': { pitch: 'B', dur: 'h' },  // ⠞
  // Whole notes (semibreves)
  '\u283D': { pitch: 'C', dur: 'w' },  // ⠽
  '\u2835': { pitch: 'D', dur: 'w' },  // ⠵
  '\u282F': { pitch: 'E', dur: 'w' },  // ⠯
  '\u283F': { pitch: 'F', dur: 'w' },  // ⠿
  '\u2837': { pitch: 'G', dur: 'w' },  // ⠷
  '\u282E': { pitch: 'A', dur: 'w' },  // ⠮
  '\u283E': { pitch: 'B', dur: 'w' },  // ⠾
};

// Rest characters
const REST_TABLE: Record<string, string> = {
  '\u282D': '8',  // ⠭ eighth rest
  '\u2827': 'q',  // ⠧ quarter rest
  '\u2825': 'h',  // ⠥ half rest
  '\u280D': 'w',  // ⠍ whole rest
};

// Octave signs
const OCTAVE_TABLE: Record<string, number> = {
  '\u2808': 1, '\u2818': 2, '\u2838': 3, '\u2810': 4,
  '\u2828': 5, '\u2830': 6, '\u2820': 7,
};

// Accidentals
const ACCIDENTAL_TABLE: Record<string, string> = {
  '\u2829': '#',  // ⠩ sharp
  '\u2823': 'b',  // ⠣ flat
  '\u2821': 'n',  // ⠡ natural
};

const AUGMENTATION_DOT = '\u2804'; // ⠄
const SLUR_CHAR = '\u2809';       // ⠉

// Duration display names
const DUR_NAMES: Record<string, string> = {
  'w': 'w', 'h': 'h', 'q': 'q', '8': '8', '16': '16', '32': '32',
};

// ─── ROMAN → BRAILLE REVERSE TABLES ──────────────────────────────────────────

// Build reverse lookup: { pitch+dur → braille char }
const ROMAN_TO_BRAILLE_NOTE: Record<string, string> = {};
for (const [braille, info] of Object.entries(NOTE_TABLE)) {
  ROMAN_TO_BRAILLE_NOTE[`${info.pitch}${info.dur}`] = braille;
}

const ROMAN_TO_BRAILLE_REST: Record<string, string> = {};
for (const [braille, dur] of Object.entries(REST_TABLE)) {
  ROMAN_TO_BRAILLE_REST[dur] = braille;
}

const OCTAVE_TO_BRAILLE: Record<number, string> = {};
for (const [braille, oct] of Object.entries(OCTAVE_TABLE)) {
  OCTAVE_TO_BRAILLE[oct] = braille;
}

const ACC_TO_BRAILLE: Record<string, string> = {
  '#': '\u2829', 'b': '\u2823', 'n': '\u2821',
};

// ─── BRAILLE → ROMAN CONVERSION ──────────────────────────────────────────────

/**
 * Convert a Unicode Braille music string to Roman text representation.
 * Non-music Braille characters (text annotations) are passed through as-is.
 */
export function brailleToRoman(braille: string): string {
  const parts: string[] = [];
  let i = 0;
  
  while (i < braille.length) {
    const ch = braille[i];
    const code = ch.charCodeAt(0);
    
    // Space / blank braille = barline
    if (ch === ' ' || ch === '\u2800') {
      parts.push('|');
      i++;
      continue;
    }
    
    // Newline
    if (ch === '\n') {
      parts.push('\n');
      i++;
      continue;
    }
    if (ch === '\r') {
      i++;
      continue;
    }
    
    // Octave sign
    if (OCTAVE_TABLE[ch] !== undefined) {
      parts.push(`O${OCTAVE_TABLE[ch]}`);
      i++;
      continue;
    }
    
    // Accidental
    if (ACCIDENTAL_TABLE[ch]) {
      parts.push(ACCIDENTAL_TABLE[ch]);
      i++;
      continue;
    }
    
    // Note
    if (NOTE_TABLE[ch]) {
      const info = NOTE_TABLE[ch];
      let token = info.pitch + info.dur;
      // Check for augmentation dot
      if (i + 1 < braille.length && braille[i + 1] === AUGMENTATION_DOT) {
        token += '.';
        i++; // skip the dot
      }
      parts.push(token);
      i++;
      continue;
    }
    
    // Rest
    if (REST_TABLE[ch]) {
      let token = 'R' + REST_TABLE[ch];
      if (i + 1 < braille.length && braille[i + 1] === AUGMENTATION_DOT) {
        token += '.';
        i++;
      }
      parts.push(token);
      i++;
      continue;
    }
    
    // Augmentation dot (standalone, shouldn't happen normally)
    if (ch === AUGMENTATION_DOT) {
      parts.push('.');
      i++;
      continue;
    }
    
    // Slur
    if (ch === SLUR_CHAR) {
      parts.push('~');
      i++;
      continue;
    }
    
    // Non-braille character (text annotation) — pass through
    if (code < 0x2800 || code > 0x28FF) {
      // Collect consecutive non-braille characters
      let text = '';
      while (i < braille.length) {
        const c = braille[i].charCodeAt(0);
        if (c >= 0x2800 && c <= 0x28FF) break;
        if (braille[i] === ' ') break;
        if (braille[i] === '\n') break;
        text += braille[i];
        i++;
      }
      parts.push(`[${text}]`);
      continue;
    }
    
    // Unknown braille character — show dots
    const dots = [];
    const val = code - 0x2800;
    if (val & 0x01) dots.push(1);
    if (val & 0x02) dots.push(2);
    if (val & 0x04) dots.push(3);
    if (val & 0x08) dots.push(4);
    if (val & 0x10) dots.push(5);
    if (val & 0x20) dots.push(6);
    parts.push(`(${dots.join('')})`);
    i++;
  }
  
  return parts.join(' ');
}

// ─── ROMAN → BRAILLE CONVERSION ──────────────────────────────────────────────

/**
 * Convert Roman text representation back to Unicode Braille music.
 * Handles tokens like: O4, Cq, D8, #Eq, bAh, Rq, |, ~, [text]
 */
export function romanToBraille(roman: string): string {
  const result: string[] = [];
  
  // Tokenize: split by spaces, but keep newlines
  const lines = roman.split('\n');
  
  for (let lineIdx = 0; lineIdx < lines.length; lineIdx++) {
    if (lineIdx > 0) result.push('\n');
    
    const tokens = lines[lineIdx].split(/\s+/).filter(t => t.length > 0);
    
    for (const token of tokens) {
      // Barline
      if (token === '|') {
        result.push(' ');
        continue;
      }
      
      // Slur
      if (token === '~') {
        result.push(SLUR_CHAR);
        continue;
      }
      
      // Text annotation [text]
      const textMatch = token.match(/^\[(.+)\]$/);
      if (textMatch) {
        result.push(textMatch[1]);
        continue;
      }
      
      // Octave sign: O1-O7
      const octMatch = token.match(/^O([1-7])$/);
      if (octMatch) {
        const oct = parseInt(octMatch[1]);
        if (OCTAVE_TO_BRAILLE[oct]) {
          result.push(OCTAVE_TO_BRAILLE[oct]);
        }
        continue;
      }
      
      // Rest: Rq, R8, Rh, Rw, Rq., Rh. etc
      const restMatch = token.match(/^R(w|h|q|8|16|32)(\.)?$/);
      if (restMatch) {
        const dur = restMatch[1];
        const dotted = !!restMatch[2];
        if (ROMAN_TO_BRAILLE_REST[dur]) {
          result.push(ROMAN_TO_BRAILLE_REST[dur]);
          if (dotted) result.push(AUGMENTATION_DOT);
        }
        continue;
      }
      
      // Note: optional accidental + pitch + duration + optional dot
      // Examples: Cq, D8, #Eq, bAh, nFq, Cq., #Gw.
      const noteMatch = token.match(/^([#bn])?([A-G])(w|h|q|8|16|32)(\.)?$/);
      if (noteMatch) {
        const acc = noteMatch[1]; // # b n or undefined
        const pitch = noteMatch[2]; // C D E F G A B
        const dur = noteMatch[3]; // w h q 8 16 32
        const dotted = !!noteMatch[4];
        
        // Add accidental
        if (acc && ACC_TO_BRAILLE[acc]) {
          result.push(ACC_TO_BRAILLE[acc]);
        }
        
        // Add note
        const key = `${pitch}${dur}`;
        if (ROMAN_TO_BRAILLE_NOTE[key]) {
          result.push(ROMAN_TO_BRAILLE_NOTE[key]);
        }
        
        // Add dot
        if (dotted) {
          result.push(AUGMENTATION_DOT);
        }
        continue;
      }
      
      // Augmentation dot standalone
      if (token === '.') {
        result.push(AUGMENTATION_DOT);
        continue;
      }
      
      // Unknown token — try to pass through as text
      // (could be a text annotation without brackets)
    }
  }
  
  return result.join('');
}

/**
 * Get a human-readable description of the Roman notation format.
 */
export function getRomanFormatHelp(): string {
  return `Formato Romano:
  O1-O7 = Oitava (O4 = Dó central)
  C D E F G A B = Notas (Dó Ré Mi Fá Sol Lá Si)
  w = semibreve, h = mínima, q = semínima, 8 = colcheia
  # = sustenido, b = bemol, n = bequadro
  R = pausa (ex: Rq = pausa de semínima)
  . = ponto de aumento (ex: Cq. = Dó semínima pontuada)
  | = barra de compasso
  ~ = ligadura
  
  Exemplo: O4 Cq Dq Eq Fq | Gq Aq Bq Cw`;
}
