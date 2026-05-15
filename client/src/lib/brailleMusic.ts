/**
 * Braille Music Parser
 * 
 * Parses Unicode Braille music notation and converts it to a structured
 * representation that can be rendered as a visual score.
 * 
 * Based on the International Manual of Braille Music Notation and
 * the BANA 2015 Music Braille Code specification.
 */

// ─── NOTE TABLES ───────────────────────────────────────────────────────────────
// Each note character encodes BOTH pitch (dots 1,2,4,5) and rhythm (dots 3,6).
// Pitch follows solfège: C=d, D=e, E=f, F=g, G=h, A=i, B=j

type NoteName = 'C' | 'D' | 'E' | 'F' | 'G' | 'A' | 'B';
type Duration = 'w' | 'h' | 'q' | '8' | '16' | '32' | '64' | '128';

interface NoteInfo {
  pitch: NoteName;
  /** Primary duration (the common one) */
  duration: Duration;
  /** Secondary duration (the less common one, same dots) */
  altDuration: Duration;
}

/**
 * Map from Unicode Braille character to note info.
 * Each character encodes pitch + one of 4 duration groups.
 */
const NOTE_MAP: Record<string, NoteInfo> = {
  // Eighth notes (and 128th notes) — no dot 3 or 6
  '\u2819': { pitch: 'C', duration: '8', altDuration: '128' },  // ⠙
  '\u2811': { pitch: 'D', duration: '8', altDuration: '128' },  // ⠑
  '\u280B': { pitch: 'E', duration: '8', altDuration: '128' },  // ⠋
  '\u281B': { pitch: 'F', duration: '8', altDuration: '128' },  // ⠛
  '\u2813': { pitch: 'G', duration: '8', altDuration: '128' },  // ⠓
  '\u280A': { pitch: 'A', duration: '8', altDuration: '128' },  // ⠊
  '\u281A': { pitch: 'B', duration: '8', altDuration: '128' },  // ⠚

  // Quarter notes (and 64th notes) — dot 6 only
  '\u2839': { pitch: 'C', duration: 'q', altDuration: '64' },   // ⠹
  '\u2831': { pitch: 'D', duration: 'q', altDuration: '64' },   // ⠱
  '\u282B': { pitch: 'E', duration: 'q', altDuration: '64' },   // ⠫
  '\u283B': { pitch: 'F', duration: 'q', altDuration: '64' },   // ⠻
  '\u2833': { pitch: 'G', duration: 'q', altDuration: '64' },   // ⠳
  '\u282A': { pitch: 'A', duration: 'q', altDuration: '64' },   // ⠪
  '\u283A': { pitch: 'B', duration: 'q', altDuration: '64' },   // ⠺

  // Half notes (and 32nd notes) — dot 3 only
  '\u281D': { pitch: 'C', duration: 'h', altDuration: '32' },   // ⠝
  '\u2815': { pitch: 'D', duration: 'h', altDuration: '32' },   // ⠕
  '\u280F': { pitch: 'E', duration: 'h', altDuration: '32' },   // ⠏
  '\u281F': { pitch: 'F', duration: 'h', altDuration: '32' },   // ⠟
  '\u2817': { pitch: 'G', duration: 'h', altDuration: '32' },   // ⠗
  '\u280E': { pitch: 'A', duration: 'h', altDuration: '32' },   // ⠎
  '\u281E': { pitch: 'B', duration: 'h', altDuration: '32' },   // ⠞

  // Whole notes (and 16th notes) — dots 3 and 6
  '\u283D': { pitch: 'C', duration: 'w', altDuration: '16' },   // ⠽
  '\u2835': { pitch: 'D', duration: 'w', altDuration: '16' },   // ⠵
  '\u282F': { pitch: 'E', duration: 'w', altDuration: '16' },   // ⠯
  '\u283F': { pitch: 'F', duration: 'w', altDuration: '16' },   // ⠿
  '\u2837': { pitch: 'G', duration: 'w', altDuration: '16' },   // ⠷
  '\u282E': { pitch: 'A', duration: 'w', altDuration: '16' },   // ⠮
  '\u283E': { pitch: 'B', duration: 'w', altDuration: '16' },   // ⠾
};

// ─── REST TABLE ────────────────────────────────────────────────────────────────

const REST_MAP: Record<string, { duration: Duration; altDuration: Duration }> = {
  '\u282D': { duration: '8', altDuration: '128' },   // ⠭ eighth rest
  '\u2827': { duration: 'q', altDuration: '64' },     // ⠧ quarter rest
  '\u2825': { duration: 'h', altDuration: '32' },     // ⠥ half rest
  '\u280D': { duration: 'w', altDuration: '16' },     // ⠍ whole rest
};

// ─── OCTAVE SIGNS ──────────────────────────────────────────────────────────────
// Octave 4 = middle C octave (C4–B4)

const OCTAVE_MAP: Record<string, number> = {
  '\u2808': 1,  // ⠈ 1st octave
  '\u2818': 2,  // ⠘ 2nd octave
  '\u2838': 3,  // ⠸ 3rd octave
  '\u2810': 4,  // ⠐ 4th octave (middle C)
  '\u2828': 5,  // ⠨ 5th octave
  '\u2830': 6,  // ⠰ 6th octave
  '\u2820': 7,  // ⠠ 7th octave
};

// ─── ACCIDENTALS ───────────────────────────────────────────────────────────────

type Accidental = 'sharp' | 'flat' | 'natural';

const ACCIDENTAL_MAP: Record<string, Accidental> = {
  '\u2829': 'sharp',    // ⠩
  '\u2823': 'flat',     // ⠣
  '\u2821': 'natural',  // ⠡
};

// ─── ARTICULATIONS ─────────────────────────────────────────────────────────────

const ARTICULATION_SINGLE: Record<string, string> = {
  '\u2826': 'staccato',      // ⠦
};

// Two-char articulations: first char → second char → name
const ARTICULATION_PREFIX: Record<string, Record<string, string>> = {
  '\u2820': { '\u2826': 'staccatissimo' },  // ⠠⠦
  '\u2838': { '\u2826': 'tenuto' },          // ⠸⠦
  '\u2828': { '\u2826': 'accent' },          // ⠨⠦
  '\u2830': { '\u2826': 'martellato' },      // ⠰⠦
  '\u2810': { '\u2826': 'tenuto-staccato' }, // ⠐⠦
};

// ─── OTHER SYMBOLS ─────────────────────────────────────────────────────────────

const AUGMENTATION_DOT = '\u2804'; // ⠄
const BARLINE = '\u2800';          // space = barline in braille music
const SLUR = '\u2809';             // ⠉
const NUMBER_SIGN = '\u283C';      // ⠼ (number indicator)
const WORD_SIGN = '\u281C';        // ⠜ (word sign, precedes dynamics text)

// Number values for time signatures
const BRAILLE_DIGITS: Record<string, number> = {
  '\u2801': 1, // ⠁ = a = 1
  '\u2803': 2, // ⠃ = b = 2
  '\u2809': 3, // ⠉ = c = 3
  '\u2819': 4, // ⠙ = d = 4
  '\u2811': 5, // ⠑ = e = 5
  '\u280B': 6, // ⠋ = f = 6
  '\u281B': 7, // ⠛ = g = 7
  '\u2813': 8, // ⠓ = h = 8
  '\u280A': 9, // ⠊ = i = 9
  '\u281A': 0, // ⠚ = j = 0
};

// ─── PARSED TYPES ──────────────────────────────────────────────────────────────

export interface ParsedNote {
  type: 'note';
  pitch: NoteName;
  octave: number;
  duration: Duration;
  accidental?: Accidental;
  dotted: boolean;
  articulation?: string;
  /** VexFlow key string like "c/4", "d#/5" */
  vexKey: string;
  /** VexFlow duration string like "q", "h", "8" */
  vexDuration: string;
}

export interface ParsedRest {
  type: 'rest';
  duration: Duration;
  dotted: boolean;
  vexDuration: string;
}

export interface ParsedBarline {
  type: 'barline';
}

export type ParsedElement = ParsedNote | ParsedRest | ParsedBarline;

export interface ParseResult {
  elements: ParsedElement[];
  errors: string[];
}

// ─── HELPER: pitch → MIDI-like number for octave inference ─────────────────────

const PITCH_TO_SEMITONE: Record<NoteName, number> = {
  'C': 0, 'D': 2, 'E': 4, 'F': 5, 'G': 7, 'A': 9, 'B': 11,
};

function pitchToAbsolute(pitch: NoteName, octave: number): number {
  return octave * 12 + PITCH_TO_SEMITONE[pitch];
}

/**
 * Given a previous note (pitch+octave) and a new pitch, infer the octave
 * of the new pitch following the Braille music rules:
 * - Intervals of unison, 2nd, 3rd: choose the closest octave
 * - Intervals of 4th, 5th: stay in the same octave as previous
 * - Intervals of 6th, 7th, octave: AMBIGUOUS (needs octave sign)
 *   → default to same octave
 */
function inferOctave(prevPitch: NoteName, prevOctave: number, newPitch: NoteName): number {
  const prevAbs = pitchToAbsolute(prevPitch, prevOctave);
  
  // Try same octave, one above, one below
  const candidates = [prevOctave - 1, prevOctave, prevOctave + 1];
  let bestOctave = prevOctave;
  let bestDist = Infinity;
  
  for (const oct of candidates) {
    if (oct < 1 || oct > 7) continue;
    const abs = pitchToAbsolute(newPitch, oct);
    const dist = Math.abs(abs - prevAbs);
    // For intervals up to a 5th (7 semitones), pick closest
    if (dist < bestDist) {
      bestDist = dist;
      bestOctave = oct;
    }
  }
  
  // If the interval is a 4th or 5th (5-7 semitones), prefer same octave
  const sameOctAbs = pitchToAbsolute(newPitch, prevOctave);
  const sameOctDist = Math.abs(sameOctAbs - prevAbs);
  if (sameOctDist >= 5 && sameOctDist <= 7) {
    bestOctave = prevOctave;
  }
  
  return bestOctave;
}

// ─── MAIN PARSER ───────────────────────────────────────────────────────────────

/**
 * Parse a string of Unicode Braille music notation into structured elements.
 * This is the core engine that powers the real-time score rendering.
 */
export function parseBrailleMusic(input: string): ParseResult {
  const elements: ParsedElement[] = [];
  const errors: string[] = [];
  
  let currentOctave = 4; // default to 4th octave (middle C)
  let prevPitch: NoteName | null = null;
  let prevOctave = 4;
  let octaveSet = false;
  
  // Pending modifiers for the next note
  let pendingAccidental: Accidental | undefined;
  let pendingArticulation: string | undefined;
  let pendingOctave: number | undefined;
  
  let i = 0;
  while (i < input.length) {
    const ch = input[i];
    const nextCh = i + 1 < input.length ? input[i + 1] : '';
    
    // Skip literal spaces (barlines in braille music)
    if (ch === ' ' || ch === '\u2800') {
      // A space can be a barline separator
      if (elements.length > 0 && elements[elements.length - 1].type !== 'barline') {
        elements.push({ type: 'barline' });
      }
      i++;
      continue;
    }
    
    // Skip newlines
    if (ch === '\n' || ch === '\r') {
      i++;
      continue;
    }
    
    // Check for octave sign
    if (OCTAVE_MAP[ch] !== undefined) {
      // Check for double octave signs (below first / above seventh)
      if (nextCh === ch) {
        // Double sign - skip for now
        i += 2;
        continue;
      }
      pendingOctave = OCTAVE_MAP[ch];
      i++;
      continue;
    }
    
    // Check for accidental
    if (ACCIDENTAL_MAP[ch]) {
      pendingAccidental = ACCIDENTAL_MAP[ch];
      i++;
      continue;
    }
    
    // Check for articulation (two-char)
    if (ARTICULATION_PREFIX[ch] && nextCh && ARTICULATION_PREFIX[ch][nextCh]) {
      pendingArticulation = ARTICULATION_PREFIX[ch][nextCh];
      i += 2;
      continue;
    }
    
    // Check for articulation (single-char) — only if next char is a note
    if (ARTICULATION_SINGLE[ch] && nextCh && NOTE_MAP[nextCh]) {
      pendingArticulation = ARTICULATION_SINGLE[ch];
      i++;
      continue;
    }
    
    // Check for augmentation dot (after a note)
    // Handled below after note parsing
    
    // Check for note
    if (NOTE_MAP[ch]) {
      const noteInfo = NOTE_MAP[ch];
      
      // Determine octave
      let octave: number;
      if (pendingOctave !== undefined) {
        octave = pendingOctave;
        pendingOctave = undefined;
        octaveSet = true;
      } else if (!octaveSet && prevPitch === null) {
        // First note without octave sign — default to 4
        octave = currentOctave;
        octaveSet = true;
      } else if (prevPitch !== null) {
        // Infer octave from previous note
        octave = inferOctave(prevPitch, prevOctave, noteInfo.pitch);
      } else {
        octave = currentOctave;
      }
      
      // Check for augmentation dot
      let dotted = false;
      if (i + 1 < input.length && input[i + 1] === AUGMENTATION_DOT) {
        dotted = true;
        // Don't advance i here, we'll do it after
      }
      
      // Build VexFlow key — accidentals are added as modifiers in ScoreRenderer,
      // NOT as part of the key string. Key is always just "c/4", "b/4", etc.
      const vexKey = `${noteInfo.pitch.toLowerCase()}/${octave}`;
      let vexDuration = noteInfo.duration;
      if (dotted) vexDuration = (vexDuration + 'd') as any;
      
      const parsedNote: ParsedNote = {
        type: 'note',
        pitch: noteInfo.pitch,
        octave,
        duration: noteInfo.duration,
        accidental: pendingAccidental,
        dotted,
        articulation: pendingArticulation,
        vexKey,
        vexDuration: vexDuration as string,
      };
      
      elements.push(parsedNote);
      
      // Update state
      prevPitch = noteInfo.pitch;
      prevOctave = octave;
      currentOctave = octave;
      pendingAccidental = undefined;
      pendingArticulation = undefined;
      
      i++;
      // Skip augmentation dot if present
      if (dotted && i < input.length && input[i] === AUGMENTATION_DOT) {
        i++;
      }
      continue;
    }
    
    // Check for rest
    if (REST_MAP[ch]) {
      const restInfo = REST_MAP[ch];
      
      let dotted = false;
      if (i + 1 < input.length && input[i + 1] === AUGMENTATION_DOT) {
        dotted = true;
      }
      
      let vexDuration = restInfo.duration + 'r';
      if (dotted) vexDuration = restInfo.duration + 'dr';
      
      elements.push({
        type: 'rest',
        duration: restInfo.duration,
        dotted,
        vexDuration,
      });
      
      i++;
      if (dotted && i < input.length && input[i] === AUGMENTATION_DOT) {
        i++;
      }
      continue;
    }
    
    // Check for number sign (time signature prefix)
    if (ch === NUMBER_SIGN) {
      // Skip time signature for now (just consume digits)
      i++;
      while (i < input.length && BRAILLE_DIGITS[input[i]] !== undefined) {
        i++;
      }
      continue;
    }
    
    // Check for word sign (dynamics prefix)
    if (ch === WORD_SIGN) {
      // Skip dynamics text for now
      i++;
      while (i < input.length && input[i] !== ' ' && input[i] !== '\u2800' && !NOTE_MAP[input[i]] && !REST_MAP[input[i]]) {
        i++;
      }
      continue;
    }
    
    // Check for slur
    if (ch === SLUR) {
      // Skip slur for now (visual rendering can be added later)
      i++;
      continue;
    }
    
    // Unknown character — skip
    i++;
  }
  
  return { elements, errors };
}

// ─── PERKINS KEYBOARD MAPPING ──────────────────────────────────────────────────
// Perkins keyboard: F=dot1, D=dot2, S=dot3, J=dot4, K=dot5, L=dot6, Space=space

export interface PerkinsKeyState {
  dot1: boolean; // F
  dot2: boolean; // D
  dot3: boolean; // S
  dot4: boolean; // J
  dot5: boolean; // K
  dot6: boolean; // L
}

/**
 * Convert a set of active Perkins dots to a Unicode Braille character.
 * Braille Unicode: U+2800 + (dot1*1 + dot2*2 + dot3*4 + dot4*8 + dot5*16 + dot6*32)
 */
export function perkinsDotsToUnicode(dots: PerkinsKeyState): string {
  let value = 0x2800;
  if (dots.dot1) value += 0x01;
  if (dots.dot2) value += 0x02;
  if (dots.dot3) value += 0x04;
  if (dots.dot4) value += 0x08;
  if (dots.dot5) value += 0x10;
  if (dots.dot6) value += 0x20;
  return String.fromCharCode(value);
}

/**
 * Convert a Unicode Braille character to its dot pattern description.
 */
export function unicodeToDots(char: string): number[] {
  const code = char.charCodeAt(0) - 0x2800;
  const dots: number[] = [];
  if (code & 0x01) dots.push(1);
  if (code & 0x02) dots.push(2);
  if (code & 0x04) dots.push(3);
  if (code & 0x08) dots.push(4);
  if (code & 0x10) dots.push(5);
  if (code & 0x20) dots.push(6);
  return dots;
}

/**
 * Get a human-readable description of a Braille music character.
 */
export function describeBrailleChar(char: string): string {
  if (NOTE_MAP[char]) {
    const n = NOTE_MAP[char];
    const durNames: Record<Duration, string> = {
      'w': 'semibreve', 'h': 'mínima', 'q': 'semínima', '8': 'colcheia',
      '16': 'semicolcheia', '32': 'fusa', '64': 'semifusa', '128': 'quartifusa',
    };
    return `${n.pitch} ${durNames[n.duration]}`;
  }
  if (REST_MAP[char]) {
    const r = REST_MAP[char];
    const durNames: Record<Duration, string> = {
      'w': 'semibreve', 'h': 'mínima', 'q': 'semínima', '8': 'colcheia',
      '16': 'semicolcheia', '32': 'fusa', '64': 'semifusa', '128': 'quartifusa',
    };
    return `Pausa de ${durNames[r.duration]}`;
  }
  if (OCTAVE_MAP[char] !== undefined) return `Oitava ${OCTAVE_MAP[char]}`;
  if (ACCIDENTAL_MAP[char]) {
    const names: Record<Accidental, string> = { sharp: 'Sustenido', flat: 'Bemol', natural: 'Bequadro' };
    return names[ACCIDENTAL_MAP[char]];
  }
  if (char === AUGMENTATION_DOT) return 'Ponto de aumento';
  if (char === SLUR) return 'Ligadura';
  if (char === '\u2800' || char === ' ') return 'Barra de compasso';
  
  const dots = unicodeToDots(char);
  if (dots.length > 0) return `Pontos ${dots.join(',')}`;
  return 'Desconhecido';
}

// ─── QUICK REFERENCE DATA ──────────────────────────────────────────────────────

export interface QuickRefEntry {
  char: string;
  dots: string;
  description: string;
  category: 'note-eighth' | 'note-quarter' | 'note-half' | 'note-whole' | 'rest' | 'octave' | 'accidental' | 'other';
}

export function getQuickReference(): QuickRefEntry[] {
  const entries: QuickRefEntry[] = [];
  
  // Notes
  const durationCategories: [string, 'note-eighth' | 'note-quarter' | 'note-half' | 'note-whole'][] = [
    ['8', 'note-eighth'], ['q', 'note-quarter'], ['h', 'note-half'], ['w', 'note-whole'],
  ];
  
  for (const [char, info] of Object.entries(NOTE_MAP)) {
    const cat = info.duration === '8' ? 'note-eighth' : info.duration === 'q' ? 'note-quarter' : info.duration === 'h' ? 'note-half' : 'note-whole';
    const dots = unicodeToDots(char);
    entries.push({
      char,
      dots: dots.join(','),
      description: describeBrailleChar(char),
      category: cat,
    });
  }
  
  // Rests
  for (const [char] of Object.entries(REST_MAP)) {
    const dots = unicodeToDots(char);
    entries.push({
      char,
      dots: dots.join(','),
      description: describeBrailleChar(char),
      category: 'rest',
    });
  }
  
  // Octaves
  for (const [char, oct] of Object.entries(OCTAVE_MAP)) {
    const dots = unicodeToDots(char);
    entries.push({
      char,
      dots: dots.join(','),
      description: `Oitava ${oct}`,
      category: 'octave',
    });
  }
  
  // Accidentals
  for (const [char, acc] of Object.entries(ACCIDENTAL_MAP)) {
    const dots = unicodeToDots(char);
    const names: Record<Accidental, string> = { sharp: 'Sustenido', flat: 'Bemol', natural: 'Bequadro' };
    entries.push({
      char,
      dots: dots.join(','),
      description: names[acc],
      category: 'accidental',
    });
  }
  
  // Other
  entries.push({
    char: AUGMENTATION_DOT,
    dots: '3',
    description: 'Ponto de aumento',
    category: 'other',
  });
  
  return entries;
}
