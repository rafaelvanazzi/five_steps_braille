/**
 * Braille Music Parser
 * 
 * Parses Unicode Braille music notation and converts it to a structured
 * representation that can be rendered as a visual score.
 * 
 * Based on the International Manual of Braille Music Notation and
 * the BANA 2015 Music Braille Code specification.
 * 
 * KEY FEATURE: Automatic disambiguation of semibreve/semicolcheia (and
 * mínima/fusa) based on measure context. If a whole note doesn't fit
 * in the remaining beats of a measure, it's interpreted as a 16th note.
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
 * 
 * Group 1: Colcheia (8th) / Quartifusa (128th) — no dot 3 or 6
 * Group 2: Semínima (quarter) / Semifusa (64th) — dot 6 only
 * Group 3: Mínima (half) / Fusa (32nd) — dot 3 only
 * Group 4: Semibreve (whole) / Semicolcheia (16th) — dots 3 and 6
 */
const NOTE_MAP: Record<string, NoteInfo> = {
  // Eighth notes (colcheias) / 128th notes (quartifusas) — no dot 3 or 6
  '\u2819': { pitch: 'C', duration: '8', altDuration: '128' },  // ⠙ = D
  '\u2811': { pitch: 'D', duration: '8', altDuration: '128' },  // ⠑ = E
  '\u280B': { pitch: 'E', duration: '8', altDuration: '128' },  // ⠋ = F
  '\u281B': { pitch: 'F', duration: '8', altDuration: '128' },  // ⠛ = G
  '\u2813': { pitch: 'G', duration: '8', altDuration: '128' },  // ⠓ = H
  '\u280A': { pitch: 'A', duration: '8', altDuration: '128' },  // ⠊ = I
  '\u281A': { pitch: 'B', duration: '8', altDuration: '128' },  // ⠚ = J

  // Quarter notes (semínimas) / 64th notes (semifusas) — dot 6 only
  '\u2839': { pitch: 'C', duration: 'q', altDuration: '64' },   // ⠹ = ?
  '\u2831': { pitch: 'D', duration: 'q', altDuration: '64' },   // ⠱ = ?
  '\u282B': { pitch: 'E', duration: 'q', altDuration: '64' },   // ⠫ = ?
  '\u283B': { pitch: 'F', duration: 'q', altDuration: '64' },   // ⠻ = ?
  '\u2833': { pitch: 'G', duration: 'q', altDuration: '64' },   // ⠳ = ?
  '\u282A': { pitch: 'A', duration: 'q', altDuration: '64' },   // ⠪ = ?
  '\u283A': { pitch: 'B', duration: 'q', altDuration: '64' },   // ⠺ = ?

  // Half notes (mínimas) / 32nd notes (fusas) — dot 3 only
  '\u2815': { pitch: 'C', duration: 'h', altDuration: '32' },   // ⠕ = ?
  '\u280D': { pitch: 'D', duration: 'h', altDuration: '32' },   // ⠍ = ?
  '\u2807': { pitch: 'E', duration: 'h', altDuration: '32' },   // ⠇ = ?
  '\u2817': { pitch: 'F', duration: 'h', altDuration: '32' },   // ⠗ = ?
  '\u280F': { pitch: 'G', duration: 'h', altDuration: '32' },   // ⠏ = ?
  '\u2806': { pitch: 'A', duration: 'h', altDuration: '32' },   // ⠆ = ?
  '\u2816': { pitch: 'B', duration: 'h', altDuration: '32' },   // ⠖ = ?

  // Whole notes (semibreves) / 16th notes (semicolcheias) — dots 3 and 6
  '\u283D': { pitch: 'C', duration: 'w', altDuration: '16' },   // ⠽ = ?
  '\u282F': { pitch: 'D', duration: 'w', altDuration: '16' },   // ⠯ = ?
  '\u283F': { pitch: 'E', duration: 'w', altDuration: '16' },   // ⠿ = ?
  '\u283E': { pitch: 'F', duration: 'w', altDuration: '16' },   // ⠾ = ?
  '\u2837': { pitch: 'G', duration: 'w', altDuration: '16' },   // ⠷ = ?
  '\u282E': { pitch: 'A', duration: 'w', altDuration: '16' },   // ⠮ = ?
};

// Rest map (similar structure)
const REST_MAP: Record<string, { duration: Duration; altDuration: Duration }> = {
  '\u2800': { duration: '8', altDuration: '128' },   // ⠀ = rest (8th/128th)
  '\u2830': { duration: 'q', altDuration: '64' },    // ⠰ = rest (quarter/64th)
  '\u2804': { duration: 'h', altDuration: '32' },    // ⠄ = rest (half/32nd)
  '\u283C': { duration: 'w', altDuration: '16' },    // ⠼ = rest (whole/16th)
};

// Accidental map
const ACCIDENTAL_MAP: Record<string, Accidental> = {
  '\u2829': 'sharp',   // ⠩ = #
  '\u2823': 'flat',    // ⠣ = b
  '\u282C': 'natural', // ⠬ = ♮
};

// Octave map
const OCTAVE_MAP: Record<string, number> = {
  '\u2806': 1,  // ⠆
  '\u2807': 2,  // ⠇
  '\u2809': 3,  // ⠉
  '\u280A': 4,  // ⠊
  '\u280B': 5,  // ⠋
  '\u280C': 6,  // ⠌
  '\u280D': 7,  // ⠍
  '\u280E': 8,  // ⠎
};

// Barline map
const BARLINE_MAP: Record<string, 'single' | 'end' | 'repeat-begin' | 'repeat-end' | 'repeat-both'> = {
  '\u2823\u2805': 'single',        // ⠣⠅
  '\u2823\u2836': 'end',           // ⠣⠶
  '\u2823\u2806': 'repeat-begin',  // ⠣⠆
  '\u2823\u2830': 'repeat-end',    // ⠣⠰
  '\u2823\u2837': 'repeat-both',   // ⠣⠷ (repeat both)
};

// Time signature map
const TIME_SIGNATURE_MAP: Record<string, { numerator: number; denominator: number }> = {
  // 4/4: ⠼ (número) + ⠙ (4) + ⠲ (4)
  '\u283C\u2819\u2832': { numerator: 4, denominator: 4 },
  
  // 3/4: ⠼ (número) + ⠉ (3) + ⠲ (4)
  '\u283C\u2809\u2832': { numerator: 3, denominator: 4 },
  
  // 2/4: ⠼ (número) + ⠋ (2) + ⠲ (4)
  '\u283C\u280B\u2832': { numerator: 2, denominator: 4 },
  
  // 6/8: ⠼ (número) + ⠛ (6) + ⠦ (8)
  '\u283C\u281B\u2826': { numerator: 6, denominator: 8 },
  
  // 2/2: ⠼ (número) + ⠋ (2) + ⠑ (2)
  '\u283C\u280B\u2811': { numerator: 2, denominator: 2 },
  
  // 3/8: ⠼ (número) + ⠉ (3) + ⠦ (8)
  '\u283C\u2809\u2826': { numerator: 3, denominator: 8 },
  
};

// Braille digits
const BRAILLE_DIGITS: Record<string, string> = {
  '\u2819': '1', '\u2811': '2', '\u280B': '3', '\u281B': '4',
  '\u2813': '5', '\u280A': '6', '\u281A': '7', '\u2803': '8',
  '\u280F': '9', '\u280E': '0',
};

// Key signature mapping (official braille patterns)
// Sharps: ⠩ (1), ⠩⠩ (2), ⠩⠩⠩ (3), ⠼⠛⠩ (4), ⠼⠙⠩ (5), ⠼⠊⠩ (6), ⠼⠚⠩ (7)
// Flats:  ⠣ (1), ⠣⠣ (2), ⠣⠣⠣ (3), ⠼⠛⠣ (4), ⠼⠙⠣ (5), ⠼⠊⠣ (6), ⠼⠚⠣ (7)
const OFFICIAL_KEY_SIGNATURE_MAP: Record<string, string> = {
  // Sharps (VexFlow uppercase)
  '\u2829': 'F',                              // ⠩ = 1 sharp
  '\u2829\u2829': 'C',                        // ⠩⠩ = 2 sharps
  '\u2829\u2829\u2829': 'G',                  // ⠩⠩⠩ = 3 sharps
  '\u283C\u2819\u2829': 'D',                  // ⠼⠙⠩ = 4 sharps (digit 1)
  '\u283C\u2811\u2829': 'A',                  // ⠼⠑⠩ = 5 sharps (digit 2)
  '\u283C\u280B\u2829': 'E',                  // ⠼⠋⠩ = 6 sharps (digit 3)
  '\u283C\u281B\u2829': 'B',                  // ⠼⠛⠩ = 7 sharps (digit 4)
  // Flats (VexFlow lowercase)
  '\u2823': 'f',                              // ⠣ = 1 flat
  '\u2823\u2823': 'c',                        // ⠣⠣ = 2 flats
  '\u2823\u2823\u2823': 'g',                  // ⠣⠣⠣ = 3 flats
  '\u283C\u2819\u2823': 'd',                  // ⠼⠙⠣ = 4 flats (digit 1)
  '\u283C\u2811\u2823': 'a',                  // ⠼⠑⠣ = 5 flats (digit 2)
  '\u283C\u280B\u2823': 'e',                  // ⠼⠋⠣ = 6 flats (digit 3)
  '\u283C\u281B\u2823': 'b',                  // ⠼⠛⠣ = 7 flats (digit 4)
};

// Fifths to VexFlow key mapping
const FIFTHS_TO_VEX_KEY: Record<string, string> = {
  '7': 'B',   // 7 sharps
  '6': 'F#',  // 6 sharps
  '5': 'C#',  // 5 sharps
  '4': 'G',   // 4 sharps
  '3': 'D',   // 3 sharps
  '2': 'A',   // 2 sharps
  '1': 'E',   // 1 sharp
  '0': 'C',   // no sharps/flats
  '-1': 'F',  // 1 flat
  '-2': 'Bb', // 2 flats
  '-3': 'Eb', // 3 flats
  '-4': 'Ab', // 4 flats
  '-5': 'Db', // 5 flats
  '-6': 'Gb', // 6 flats
  '-7': 'Cb', // 7 flats
};

// Other constants
const NUMBER_SIGN = '\u283C';      // ⠼
const AUGMENTATION_DOT = '\u2824'; // ⠤
const NOTE_TIE = '\u2824';         // ⠤ (also used for augmentation dot)
const WORD_SIGN = '\u2820';        // ⠠
const FORCED_WHOLE_MARKER = '\u2831'; // ⠱
const FORCED_32ND_MARKER = '\u2833';  // ⠳

// ─── PARSED ELEMENT TYPES ──────────────────────────────────────────────────────

export type Accidental = 'sharp' | 'flat' | 'natural';

export interface ParsedNote {
  type: 'note';
  pitch: NoteName;
  octave: number;
  duration: Duration;
  dotted: boolean;
  accidental?: Accidental;
  articulation?: string;
  vexKey: string;
  vexDuration: string;
  sourceIndex: number;
  forceWhole?: boolean;
}

export interface ParsedRest {
  type: 'rest';
  duration: Duration;
  dotted: boolean;
  vexDuration: string;
  sourceIndex: number;
}

export interface ParsedBarline {
  type: 'barline';
  sourceIndex: number;
  barlineType?: 'single' | 'end' | 'repeat-begin' | 'repeat-end' | 'repeat-both';
}

export interface ParsedTimeSignature {
  type: 'timesignature';
  numerator: number;
  denominator: number;
  sourceIndex: number;
}

export interface ParsedKeySignature {
  type: 'keysignature';
  fifths: number;
  vexKey: string;
  sourceIndex: number;
}

export interface ParsedNoteTie {
  type: 'notetie';
  sourceIndex: number;
}

export type ParsedElement = ParsedNote | ParsedRest | ParsedBarline | ParsedTimeSignature | ParsedKeySignature | ParsedNoteTie;

export interface ParseResult {
  elements: ParsedElement[];
  errors: string[];
}

export interface ParseOptions {
  beatsPerMeasure?: number;
}

// ─── UTILITY FUNCTIONS ─────────────────────────────────────────────────────────

function durationToBeats(duration: Duration, dotted: boolean = false): number {
  const beats: Record<Duration, number> = {
    'w': 4,
    'h': 2,
    'q': 1,
    '8': 0.5,
    '16': 0.25,
    '32': 0.125,
    '64': 0.0625,
    '128': 0.03125,
  };
  let result = beats[duration];
  if (dotted) result *= 1.5;
  return result;
}

function inferOctave(prevPitch: NoteName, prevOctave: number, nextPitch: NoteName): number {
  const pitchOrder: NoteName[] = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
  const prevIndex = pitchOrder.indexOf(prevPitch);
  const nextIndex = pitchOrder.indexOf(nextPitch);
  
  if (nextIndex > prevIndex) {
    return prevOctave;
  } else if (nextIndex < prevIndex) {
    return prevOctave + 1;
  }
  return prevOctave;
}

function disambiguateDuration(
  primary: Duration,
  secondary: Duration,
  beatsUsed: number,
  beatsPerMeasure: number,
  dotted: boolean,
): Duration {
  const primaryBeats = durationToBeats(primary, dotted);
  const secondaryBeats = durationToBeats(secondary, dotted);
  
  if (beatsUsed + primaryBeats <= beatsPerMeasure) {
    return primary;
  }
  if (beatsUsed + secondaryBeats <= beatsPerMeasure) {
    return secondary;
  }
  return primary;
}

// ─── MAIN PARSER ───────────────────────────────────────────────────────────────

/**
 * Check if a token is a pure key signature (only sharps or only flats)
 */
function isKeySignatureToken(token: string): { vexKey: string; fifths: number } | null {
  // Try to match against official key signature patterns first
  const vexKey = OFFICIAL_KEY_SIGNATURE_MAP[token];
  if (vexKey) {
    // Calculate fifths from token
    const sharpChar = '\u2829'; // ⠩
    const flatChar = '\u2823';  // ⠣
    const fifths = token.includes(sharpChar) ? token.length : -token.length;
    return { vexKey, fifths };
  }
  
  return null;
}

/**
 * Parse structural tokens in official Braille order:
 * [Key Signature] + [Time Signature] + [Octave] + [Notes]
 */
function parseStructuralTokens(tokens: string[]): {
  keySignature: ParsedKeySignature | null;
  timeSignature: ParsedTimeSignature | null;
  initialOctave: number;
  remainingTokens: string[];
  remainingInput: string;
} {
  let tokenIndex = 0;
  let keySignature: ParsedKeySignature | null = null;
  let timeSignature: ParsedTimeSignature | null = null;
  let initialOctave = 4;
  let charOffset = 0;

  // A) FIRST TOKEN: Check for key signature
  if (tokenIndex < tokens.length) {
    const keySigResult = isKeySignatureToken(tokens[tokenIndex]);
    if (keySigResult) {
      keySignature = {
        type: 'keysignature',
        fifths: keySigResult.fifths,
        vexKey: keySigResult.vexKey,
        sourceIndex: charOffset,
      };
      charOffset += tokens[tokenIndex].length + 1; // +1 for space
      tokenIndex++;
    }
  }

  // B) SECOND TOKEN (or first if no key sig): Check for time signature
  if (tokenIndex < tokens.length) {
    const token = tokens[tokenIndex];
    
    // Check if it's a time signature pattern (⠼ + 2 digits)
    if (token.startsWith(NUMBER_SIGN)) {
      // First try exact match in TIME_SIGNATURE_MAP
      if (TIME_SIGNATURE_MAP[token]) {
        const ts = TIME_SIGNATURE_MAP[token];
        timeSignature = {
          type: 'timesignature',
          numerator: ts.numerator,
          denominator: ts.denominator,
          sourceIndex: charOffset,
        };
        charOffset += token.length + 1; // +1 for space
        tokenIndex++;
      } else {
        // Try digit-based parsing
        let digitStr = '';
        for (let i = 1; i < token.length; i++) {
          if (BRAILLE_DIGITS[token[i]]) {
            digitStr += BRAILLE_DIGITS[token[i]];
          } else {
            break;
          }
        }
        if (digitStr.length >= 2) {
          const numerator = parseInt(digitStr[0], 10);
          const denominator = parseInt(digitStr[1], 10);
          if (!isNaN(numerator) && !isNaN(denominator)) {
            timeSignature = {
              type: 'timesignature',
              numerator,
              denominator,
              sourceIndex: charOffset,
            };
            charOffset += token.length + 1; // +1 for space
            tokenIndex++;
          }
        }
      }
    }
  }

  // C) NEXT TOKENS: Check for initial octave sign
  if (tokenIndex < tokens.length) {
    const token = tokens[tokenIndex];
    // If first character is an octave sign, use it
    if (token.length === 1 && OCTAVE_MAP[token] !== undefined) {
      initialOctave = OCTAVE_MAP[token];
      charOffset += token.length + 1; // +1 for space
      tokenIndex++;
    }
  }

  // Reconstruct remaining input from remaining tokens
  const remainingTokens = tokens.slice(tokenIndex);
  const remainingInput = remainingTokens.join(' ');

  return {
    keySignature,
    timeSignature,
    initialOctave,
    remainingTokens,
    remainingInput,
  };
}

export function parseBrailleMusic(input: string, options?: ParseOptions): ParseResult {
  let beatsPerMeasure = options?.beatsPerMeasure ?? 4;
  
  const elements: ParsedElement[] = [];
  const errors: string[] = [];
  
  // Tokenize input by spaces
  const tokens = input.split(/\s+/).filter(t => t.length > 0);
  
  // Parse structural elements in official order: key signature -> time signature -> octave
  const structural = parseStructuralTokens(tokens);
  
  // Add key signature and time signature to elements (only once, at the beginning)
  if (structural.keySignature) {
    elements.push(structural.keySignature);
  }
  if (structural.timeSignature) {
    elements.push(structural.timeSignature);
    beatsPerMeasure = structural.timeSignature.numerator;
  }
  
  // Use the remaining input (without structural tokens) for note/rest parsing
  const processInput = structural.remainingInput;
  
  let currentOctave = structural.initialOctave; // Use initial octave from structural parsing
  let prevPitch: NoteName | null = null;
  let prevOctave = 4;
  let octaveSet = false;
  
  // Pending modifiers for the next note
  let pendingAccidental: Accidental | undefined;
  let pendingArticulation: string | undefined;
  let pendingOctave: number | undefined;
  
  // Measure context for disambiguation
  let beatsUsedInMeasure = 0;
  
  // Track if we're in a note sequence (after octave sign or after a note)
  let inNoteContext = false;
  
  let i = 0;
  while (i < processInput.length) {
    let ch = processInput[i];
    const nextCh = i + 1 < processInput.length ? processInput[i + 1] : '';
    
    // Check for barline patterns (2-char sequences)
    if (i + 1 < processInput.length) {
      const barlinePattern = processInput.substring(i, i + 2);
      if (BARLINE_MAP[barlinePattern]) {
        const barlineType = BARLINE_MAP[barlinePattern];
        // Skip if last element is already a barline
        if (elements.length === 0 || elements[elements.length - 1].type !== 'barline') {
          elements.push({
            type: 'barline',
            sourceIndex: i,
            // Store barline type for rendering
            ...(barlineType && { barlineType }),
          } as any);
        }
        beatsUsedInMeasure = 0;
        inNoteContext = false; // End of note sequence
        i += 2;
        continue;
      }
    }
    
    // Skip literal spaces (barlines in braille music)
    if (ch === ' ' || ch === '\u2800') {
      if (elements.length > 0 && elements[elements.length - 1].type !== 'barline') {
        elements.push({ type: 'barline', sourceIndex: i });
      }
      // Reset measure beat counter
      beatsUsedInMeasure = 0;
      inNoteContext = false; // End of note sequence
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
      if (nextCh === ch) {
        i += 2;
        continue;
      }
      pendingOctave = OCTAVE_MAP[ch];
      inNoteContext = true; // We're now in a note sequence
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
    if (nextCh && ACCIDENTAL_MAP[nextCh]) {
      pendingArticulation = ACCIDENTAL_MAP[nextCh];
      i += 2;
      continue;
    }
    
    // Check for forced whole note marker
    // CRITICAL: Only treat as marker if followed by a DIFFERENT note AND we're NOT in a note context
    // (⠱ is both D and FORCED_WHOLE_MARKER, so check context)
    let forceWhole = false;
    let force32nd = false;
    if (ch === FORCED_WHOLE_MARKER && !inNoteContext && i + 1 < processInput.length && NOTE_MAP[processInput[i + 1]]) {
      forceWhole = true;
      i++;
      ch = processInput[i];
    } else if (ch === FORCED_32ND_MARKER && !inNoteContext && i + 1 < processInput.length && NOTE_MAP[processInput[i + 1]]) {
      force32nd = true;
      i++;
      ch = processInput[i];
    }
    
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
        octave = currentOctave;
        octaveSet = true;
      } else if (prevPitch !== null) {
        octave = inferOctave(prevPitch, prevOctave, noteInfo.pitch);
      } else {
        octave = currentOctave;
      }
      
      // Check for augmentation dot
      let dotted = false;
      if (i + 1 < processInput.length && processInput[i + 1] === AUGMENTATION_DOT) {
        dotted = true;
      }
      
      // ── DISAMBIGUATION ──
      // Determine the actual duration based on measure context
      let actualDuration: Duration;
      if (forceWhole && noteInfo.duration === 'w') {
        // Force semibreve, ignore disambiguation
        actualDuration = 'w';
      } else if (force32nd && noteInfo.duration === 'h') {
        // Force fusa (32nd), ignoring the default mínima
        actualDuration = '32';
      } else if (force32nd && noteInfo.duration === 'w') {
        // Force semicolcheia (16th), ignoring the default semibreve
        actualDuration = '16';
      } else {
        actualDuration = disambiguateDuration(
          noteInfo.duration,
          noteInfo.altDuration,
          beatsUsedInMeasure,
          beatsPerMeasure,
          dotted,
        );
      }
      
      // Update beats used in measure
      beatsUsedInMeasure += durationToBeats(actualDuration, dotted);
      
      // Build VexFlow key
      const vexKey = `${noteInfo.pitch.toLowerCase()}/${octave}`;
      let vexDuration: string = actualDuration;
      if (dotted) vexDuration = actualDuration + 'd';
      
      const parsedNote: ParsedNote = {
        type: 'note',
        pitch: noteInfo.pitch,
        octave,
        duration: actualDuration,
        accidental: pendingAccidental,
        dotted,
        articulation: pendingArticulation,
        vexKey,
        vexDuration,
        sourceIndex: i,
        forceWhole,
      };
      
      elements.push(parsedNote);
      
      // Update state
      prevPitch = noteInfo.pitch;
      prevOctave = octave;
      currentOctave = octave;
      pendingAccidental = undefined;
      pendingArticulation = undefined;
      inNoteContext = true; // We're in a note sequence
      
      i++;
      if (dotted && i < processInput.length && processInput[i] === AUGMENTATION_DOT) {
        i++;
      }
      continue;
    }
    
    // Check for rest
    if (REST_MAP[ch]) {
      const restInfo = REST_MAP[ch];
      
      // Check for augmentation dot
      let dotted = false;
      if (i + 1 < processInput.length && processInput[i + 1] === AUGMENTATION_DOT) {
        dotted = true;
      }
      
      // Disambiguate rest duration too
      const actualDuration = disambiguateDuration(
        restInfo.duration,
        restInfo.altDuration,
        beatsUsedInMeasure,
        beatsPerMeasure,
        dotted,
      );
      
      beatsUsedInMeasure += durationToBeats(actualDuration, dotted);
      
      let vexDuration = actualDuration + 'r';
      if (dotted) vexDuration = actualDuration + 'dr';
      
      elements.push({
        type: 'rest',
        duration: actualDuration,
        dotted,
        vexDuration,
        sourceIndex: i,
      });
      
      i++;
      if (dotted && i < processInput.length && processInput[i] === AUGMENTATION_DOT) {
        i++;
      }
      continue;
    }
    
    // Check for time signature patterns (NUMBER_SIGN + 3 chars)
    if (ch === NUMBER_SIGN && i + 2 < processInput.length) {
      const pattern = processInput.substring(i, i + 3);
      if (TIME_SIGNATURE_MAP[pattern]) {
        const ts = TIME_SIGNATURE_MAP[pattern];
        elements.push({
          type: 'timesignature',
          numerator: ts.numerator,
          denominator: ts.denominator,
          sourceIndex: i,
        } as ParsedTimeSignature);
        beatsPerMeasure = ts.numerator;
        i += 3;
        continue;
      }
    }
    
    // Fallback: Check for number sign with digit-based parsing
    if (ch === NUMBER_SIGN) {
      const startIndex = i;
      i++;
      let digits = '';
      while (i < processInput.length && BRAILLE_DIGITS[processInput[i]] !== undefined) {
        digits += BRAILLE_DIGITS[processInput[i]];
        i++;
      }
      if (digits.length >= 2) {
        const numerator = parseInt(digits[0], 10);
        const denominator = parseInt(digits[1], 10);
        if (!isNaN(numerator) && !isNaN(denominator)) {
          elements.push({
            type: 'timesignature',
            numerator,
            denominator,
            sourceIndex: startIndex,
          } as ParsedTimeSignature);
          beatsPerMeasure = numerator;
        }
      }
      continue;
    }
    
    // Check for word sign (dynamics prefix)
    if (ch === WORD_SIGN) {
      i++;
      while (i < processInput.length && processInput[i] !== ' ' && processInput[i] !== '\u2800' && !NOTE_MAP[processInput[i]] && !REST_MAP[processInput[i]]) {
        i++;
      }
      continue;
    }
    
    // Check for note tie (ligadura de nota)
    if (ch === NOTE_TIE) {
      elements.push({
        type: 'notetie',
        sourceIndex: i,
      } as ParsedNoteTie);
      i++;
      continue;
    }
    
    // Unknown character — skip
    i++;
  }
  
  return { elements, errors };
}

// ─── LINE-BASED PARSING ────────────────────────────────────────────────────────

/**
 * Parse only a specific line of braille text.
 * Used for rendering only the line where the cursor is.
 */
export function parseBrailleLine(fullText: string, cursorPosition: number, options?: ParseOptions): ParseResult {
  // Find the line that contains the cursor
  const lines = fullText.split('\n');
  let charCount = 0;
  let targetLine = '';
  
  for (let lineIdx = 0; lineIdx < lines.length; lineIdx++) {
    const lineStart = charCount;
    const lineEnd = charCount + lines[lineIdx].length;
    
    if (cursorPosition >= lineStart && cursorPosition <= lineEnd) {
      targetLine = lines[lineIdx];
      break;
    }
    charCount = lineEnd + 1; // +1 for the newline character
  }
  
  if (!targetLine) {
    // Fallback: use last line
    targetLine = lines[lines.length - 1] || '';
  }
  
  return parseBrailleMusic(targetLine, options);
}

/**
 * Parse a selected range of braille text.
 */
export function parseBrailleSelection(fullText: string, selStart: number, selEnd: number, options?: ParseOptions): ParseResult {
  const selectedText = fullText.slice(selStart, selEnd);
  return parseBrailleMusic(selectedText, options);
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
export function perkinsKeysToBraille(keys: PerkinsKeyState): string {
  const dotValue = (keys.dot1 ? 1 : 0) + (keys.dot2 ? 2 : 0) + (keys.dot3 ? 4 : 0) + (keys.dot4 ? 8 : 0) + (keys.dot5 ? 16 : 0) + (keys.dot6 ? 32 : 0);
  return String.fromCharCode(0x2800 + dotValue);
}

/**
 * Convert a Unicode Braille character to Perkins key state.
 */
export function brailleToPerkins(char: string): PerkinsKeyState {
  const code = char.charCodeAt(0) - 0x2800;
  return {
    dot1: (code & 1) !== 0,
    dot2: (code & 2) !== 0,
    dot3: (code & 4) !== 0,
    dot4: (code & 8) !== 0,
    dot5: (code & 16) !== 0,
    dot6: (code & 32) !== 0,
  };
}

// ─── QUICK REFERENCE ──────────────────────────────────────────────────────────

export interface QuickRefEntry {
  char: string;           // Unicode braille character
  displayChar?: string;   // Optional display character
  dots: string;           // Dot numbers
  description: string;    // Description
  category?: string;      // Optional category for filtering
}

export const QUICK_REFERENCE: QuickRefEntry[] = [
  { char: '\u2804', dots: '3', description: 'Dot 3' },
  { char: '\u2820', dots: '6', description: 'Dot 6' },
  { char: '\u2824', dots: '3,6', description: 'Augmentation dot' },
  { char: '\u2829', dots: '1,2,4,6', description: 'Sharp' },
  { char: '\u2823', dots: '1,2,3,4', description: 'Flat' },
  { char: '\u282C', dots: '3,4,5,6', description: 'Natural' },
];

/**
 * Convert Perkins dots object to Unicode Braille character.
 * Alias for perkinsKeysToBraille for backward compatibility.
 */
export function perkinsDotsToUnicode(dots: PerkinsKeyState): string {
  return perkinsKeysToBraille(dots);
}

/**
 * Describe a Braille character in human-readable format.
 */
export function describeBrailleChar(char: string): string {
  // Try to find in QUICK_REFERENCE
  const entry = QUICK_REFERENCE.find(e => e.char === char);
  if (entry) {
    return entry.description;
  }
  
  // Try to find in NOTE_MAP
  const noteInfo = NOTE_MAP[char];
  if (noteInfo) {
    return `${noteInfo.pitch} (${noteInfo.duration})`;
  }
  
  // Try to find in REST_MAP
  const restInfo = REST_MAP[char];
  if (restInfo) {
    return `Rest (${restInfo.duration})`;
  }
  
  // Try to find in ACCIDENTAL_MAP
  const accidental = ACCIDENTAL_MAP[char];
  if (accidental) {
    return accidental.charAt(0).toUpperCase() + accidental.slice(1);
  }
  
  // Try to find in OCTAVE_MAP
  const octave = OCTAVE_MAP[char];
  if (octave !== undefined) {
    return `Octave ${octave}`;
  }
  
  // Default fallback
  return 'Unknown';
}
