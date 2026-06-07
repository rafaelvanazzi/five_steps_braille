/**
 * Braille Music Parser - Professional Version
 * 
 * Parses Unicode Braille music notation and converts it to a structured
 * representation that can be rendered as a visual score.
 * 
 * Based on:
 * - Music Braille Code 2015 (BANA)
 * - International Manual of Braille Music Notation
 * - MusiBraille (UFRJ) conventions
 */

// ─── NOTE TABLES ───────────────────────────────────────────────────────────────

type NoteName = 'C' | 'D' | 'E' | 'F' | 'G' | 'A' | 'B';
type Duration = 'w' | 'h' | 'q' | '8' | '16' | '32' | '64' | '128';

interface NoteInfo {
  pitch: NoteName;
  duration: Duration;
  altDuration: Duration;
}

const NOTE_MAP: Record<string, NoteInfo> = {
  // Eighth notes (colcheias) / 128th notes (quartifusas)
  '\u2819': { pitch: 'C', duration: '8', altDuration: '128' },
  '\u2811': { pitch: 'D', duration: '8', altDuration: '128' },
  '\u280B': { pitch: 'E', duration: '8', altDuration: '128' },
  '\u281B': { pitch: 'F', duration: '8', altDuration: '128' },
  '\u2813': { pitch: 'G', duration: '8', altDuration: '128' },
  '\u280A': { pitch: 'A', duration: '8', altDuration: '128' },
  '\u281A': { pitch: 'B', duration: '8', altDuration: '128' },

  // Quarter notes (semínimas) / 64th notes (semifusas)
  '\u2839': { pitch: 'C', duration: 'q', altDuration: '64' },
  '\u2831': { pitch: 'D', duration: 'q', altDuration: '64' },
  '\u282B': { pitch: 'E', duration: 'q', altDuration: '64' },
  '\u283B': { pitch: 'F', duration: 'q', altDuration: '64' },
  '\u2833': { pitch: 'G', duration: 'q', altDuration: '64' },
  '\u282A': { pitch: 'A', duration: 'q', altDuration: '64' },
  '\u283A': { pitch: 'B', duration: 'q', altDuration: '64' },

  // Half notes (mínimas) / 32nd notes (fusas)
  '\u2815': { pitch: 'C', duration: 'h', altDuration: '32' },
  '\u280D': { pitch: 'D', duration: 'h', altDuration: '32' },
  '\u2807': { pitch: 'E', duration: 'h', altDuration: '32' },
  '\u2817': { pitch: 'F', duration: 'h', altDuration: '32' },
  '\u280F': { pitch: 'G', duration: 'h', altDuration: '32' },
  '\u2806': { pitch: 'A', duration: 'h', altDuration: '32' },
  '\u2816': { pitch: 'B', duration: 'h', altDuration: '32' },

  // Whole notes (semibreves) / 16th notes (semicolcheias)
  '\u283D': { pitch: 'C', duration: 'w', altDuration: '16' },
  '\u282F': { pitch: 'D', duration: 'w', altDuration: '16' },
  '\u283F': { pitch: 'E', duration: 'w', altDuration: '16' },
  '\u283E': { pitch: 'F', duration: 'w', altDuration: '16' },
  '\u2837': { pitch: 'G', duration: 'w', altDuration: '16' },
  '\u282E': { pitch: 'A', duration: 'w', altDuration: '16' },
  '\u2827': { pitch: 'B', duration: 'w', altDuration: '16' },
};

const REST_MAP: Record<string, { duration: Duration; altDuration: Duration }> = {
  '\u2800': { duration: '8', altDuration: '128' },
  '\u2830': { duration: 'q', altDuration: '64' },
  '\u2804': { duration: 'h', altDuration: '32' },
};

const ACCIDENTAL_MAP: Record<string, Accidental> = {
  '\u2829': 'sharp',
  '\u2823': 'flat',
  '\u2821': 'natural',
};

const OCTAVE_MAP: Record<string, number> = {
  '\u2808\u2808': 0,
  '\u2808': 1,
  '\u2818': 2,
  '\u2838': 3,
  '\u2810': 4,
  '\u2828': 5,
  '\u2830': 6,
  '\u2820': 7,
  '\u2820\u2820': 8,
};

const BARLINE_MAP: Record<string, 'single' | 'end' | 'repeat-begin' | 'repeat-end' | 'repeat-both'> = {
  '\u2823\u2805': 'single',
  '\u2823\u2836': 'end',
  '\u2823\u2806': 'repeat-begin',
  '\u2823\u2830': 'repeat-end',
  '\u2823\u2837': 'repeat-both',
};

// Time signature map - CORRECTED with proper Braille digits
// Format: ⠼ (number sign) + numerator + denominator
const TIME_SIGNATURE_MAP: Record<string, { numerator: number; denominator: number }> = {
  '\u283C\u2819\u2832': { numerator: 4, denominator: 4 },  // ⠼⠙⠲ = 4/4
  '\u283C\u2809\u2832': { numerator: 3, denominator: 4 },  // ⠼⠉⠲ = 3/4
  '\u283C\u2803\u2832': { numerator: 2, denominator: 4 },  // ⠼⠃⠲ = 2/4 ← CORRIGIDO!
  '\u283C\u280B\u2826': { numerator: 6, denominator: 8 },  // ⠼⠋⠦ = 6/8
  '\u283C\u2803\u2811': { numerator: 2, denominator: 2 },  // ⠼⠃⠑ = 2/2 ← CORRIGIDO!
  '\u283C\u2809\u2826': { numerator: 3, denominator: 8 },  // ⠼⠉⠦ = 3/8
};

const INTERVAL_MAP: Record<string, number> = {
  '\u2824': 2,
  '\u282C': 3,
  '\u283C': 4,
  '\u2814': 5,
  '\u2834': 6,
  '\u2812': 7,
  '\u2838': 8,
};

// Braille digits - CORRECTED
const BRAILLE_DIGITS: Record<string, string> = {
  '\u2801': '1', // ⠁
  '\u2803': '2', // ⠃ ← CORRIGIDO!
  '\u2809': '3', // ⠉
  '\u2819': '4', // ⠙
  '\u2811': '5', // ⠑
  '\u280B': '6', // ⠋ ← CORRIGIDO!
  '\u281B': '7', // ⠛
  '\u2813': '8', // ⠓
  '\u280A': '9', // ⠊
  '\u281A': '0', // ⠚
};

const OFFICIAL_KEY_SIGNATURE_MAP: Record<string, string> = {
  '\u2829': 'F',
  '\u2829\u2829': 'C',
  '\u2829\u2829\u2829': 'G',
  '\u283C\u2819\u2829': 'D',
  '\u283C\u2811\u2829': 'A',
  '\u283C\u280B\u2829': 'E',
  '\u283C\u281B\u2829': 'B',
  '\u2823': 'f',
  '\u2823\u2823': 'c',
  '\u2823\u2823\u2823': 'g',
  '\u283C\u2819\u2823': 'd',
  '\u283C\u2811\u2823': 'a',
  '\u283C\u280B\u2823': 'e',
  '\u283C\u281B\u2823': 'b',
};

const NUMBER_SIGN = '\u283C';
const AUGMENTATION_DOT = '\u2824';
const NOTE_TIE = '\u2824';
const WORD_SIGN = '\u2820';
const FORCED_WHOLE_MARKER = '\u2831';
const FORCED_32ND_MARKER = '\u2833';

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

export interface ParsedInterval {
  type: 'interval';
  intervalSize: number;
  sourceIndex: number;
}

export type ParsedElement = ParsedNote | ParsedRest | ParsedBarline | ParsedTimeSignature | ParsedKeySignature | ParsedNoteTie | ParsedInterval;

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
    'w': 4, 'h': 2, 'q': 1, '8': 0.5, '16': 0.25,
    '32': 0.125, '64': 0.0625, '128': 0.03125,
  };
  let result = beats[duration];
  if (dotted) result *= 1.5;
  return result;
}

function inferOctave(prevPitch: NoteName, prevOctave: number, nextPitch: NoteName): number {
  const pitchOrder: NoteName[] = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
  const prevIndex = pitchOrder.indexOf(prevPitch);
  const nextIndex = pitchOrder.indexOf(nextPitch);
  
  if (nextIndex > prevIndex) return prevOctave;
  else if (nextIndex < prevIndex) return prevOctave + 1;
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
  
  if (beatsUsed + primaryBeats <= beatsPerMeasure) return primary;
  if (beatsUsed + secondaryBeats <= beatsPerMeasure) return secondary;
  return primary;
}

// ─── MAIN PARSER ───────────────────────────────────────────────────────────────

function isKeySignatureToken(token: string): { vexKey: string; fifths: number } | null {
  const vexKey = OFFICIAL_KEY_SIGNATURE_MAP[token];
  if (vexKey) {
    const sharpChar = '\u2829';
    const fifths = token.includes(sharpChar) ? token.length : -token.length;
    return { vexKey, fifths };
  }
  return null;
}

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

  if (tokenIndex < tokens.length) {
    const keySigResult = isKeySignatureToken(tokens[tokenIndex]);
    if (keySigResult) {
      keySignature = {
        type: 'keysignature',
        fifths: keySigResult.fifths,
        vexKey: keySigResult.vexKey,
        sourceIndex: charOffset,
      };
      charOffset += tokens[tokenIndex].length + 1;
      tokenIndex++;
    }
  }

  if (tokenIndex < tokens.length) {
    const token = tokens[tokenIndex];
    if (token.startsWith(NUMBER_SIGN) && TIME_SIGNATURE_MAP[token]) {
      const ts = TIME_SIGNATURE_MAP[token];
      timeSignature = {
        type: 'timesignature',
        numerator: ts.numerator,
        denominator: ts.denominator,
        sourceIndex: charOffset,
      };
      charOffset += token.length + 1;
      tokenIndex++;
    }
  }

  if (tokenIndex < tokens.length) {
    const token = tokens[tokenIndex];
    if (OCTAVE_MAP[token] !== undefined) {
      initialOctave = OCTAVE_MAP[token];
      charOffset += token.length + 1;
      tokenIndex++;
    }
  }

  const remainingTokens = tokens.slice(tokenIndex);
  const remainingInput = remainingTokens.join(' ');

  return { keySignature, timeSignature, initialOctave, remainingTokens, remainingInput };
}

export function parseBrailleMusic(input: string, options?: ParseOptions): ParseResult {
  let beatsPerMeasure = options?.beatsPerMeasure ?? 4;
  const elements: ParsedElement[] = [];
  const errors: string[] = [];
  
  const tokens = input.split(/\s+/).filter(t => t.length > 0);
  const structural = parseStructuralTokens(tokens);
  
  if (structural.keySignature) elements.push(structural.keySignature);
  if (structural.timeSignature) {
    elements.push(structural.timeSignature);
    beatsPerMeasure = structural.timeSignature.numerator;
  }
  
  const processInput = structural.remainingInput;
  let currentOctave = structural.initialOctave;
  let prevPitch: NoteName | null = null;
  let prevOctave = 4;
  let octaveSet = false;
  let pendingAccidental: Accidental | undefined;
  let pendingArticulation: string | undefined;
  let pendingOctave: number | undefined;
  let beatsUsedInMeasure = 0;
  let inNoteContext = false;
  
  let i = 0;
  while (i < processInput.length) {
    let ch = processInput[i];
    const nextCh = i + 1 < processInput.length ? processInput[i + 1] : '';
    
    if (i + 1 < processInput.length) {
      const barlinePattern = processInput.substring(i, i + 2);
      if (BARLINE_MAP[barlinePattern]) {
        const barlineType = BARLINE_MAP[barlinePattern];
        if (elements.length === 0 || elements[elements.length - 1].type !== 'barline') {
          elements.push({
            type: 'barline',
            sourceIndex: i,
            ...(barlineType && { barlineType }),
          } as any);
        }
        beatsUsedInMeasure = 0;
        inNoteContext = false;
        i += 2;
        continue;
      }
    }
    
    if (ch === ' ' || ch === '\u2800') {
      if (elements.length > 0 && elements[elements.length - 1].type !== 'barline') {
        elements.push({ type: 'barline', sourceIndex: i });
      }
      beatsUsedInMeasure = 0;
      inNoteContext = false;
      i++;
      continue;
    }
    
    if (ch === '\n' || ch === '\r') {
      i++;
      continue;
    }
    
    if (i + 1 < processInput.length && OCTAVE_MAP[processInput.substring(i, i + 2)] !== undefined) {
      pendingOctave = OCTAVE_MAP[processInput.substring(i, i + 2)];
      inNoteContext = true;
      i += 2;
      continue;
    } else if (OCTAVE_MAP[ch] !== undefined) {
      if (nextCh === ch) {
        i += 2;
        continue;
      }
      pendingOctave = OCTAVE_MAP[ch];
      inNoteContext = true;
      i++;
      continue;
    }
    
    if (ACCIDENTAL_MAP[ch]) {
      pendingAccidental = ACCIDENTAL_MAP[ch];
      i++;
      continue;
    }
    
    if (nextCh && ACCIDENTAL_MAP[nextCh]) {
      pendingArticulation = ACCIDENTAL_MAP[nextCh];
      i += 2;
      continue;
    }
    
    if (inNoteContext && INTERVAL_MAP[ch] !== undefined && ch !== AUGMENTATION_DOT) {
      const intervalSize = INTERVAL_MAP[ch];
      elements.push({
        type: 'interval',
        intervalSize,
        sourceIndex: i,
      } as ParsedInterval);
      i++;
      continue;
    }
    
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
    
    if (NOTE_MAP[ch]) {
      const noteInfo = NOTE_MAP[ch];
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
      
      let dotted = false;
      if (i + 1 < processInput.length && processInput[i + 1] === AUGMENTATION_DOT) {
        dotted = true;
      }
      
      let actualDuration: Duration;
      if (forceWhole && noteInfo.duration === 'w') {
        actualDuration = 'w';
      } else if (force32nd && noteInfo.duration === 'h') {
        actualDuration = '32';
      } else if (force32nd && noteInfo.duration === 'w') {
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
      
      beatsUsedInMeasure += durationToBeats(actualDuration, dotted);
      const vexKey = `${noteInfo.pitch.toLowerCase()}/${octave}`;
      let vexDuration: string = actualDuration;
      if (dotted) vexDuration = actualDuration + 'd';
      
      elements.push({
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
      });
      
      prevPitch = noteInfo.pitch;
      prevOctave = octave;
      currentOctave = octave;
      pendingAccidental = undefined;
      pendingArticulation = undefined;
      inNoteContext = true;
      
      i++;
      if (dotted && i < processInput.length && processInput[i] === AUGMENTATION_DOT) {
        i++;
      }
      continue;
    }
    
    if (ch === NUMBER_SIGN) {
      if (i + 2 < processInput.length) {
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
      const restInfo = { duration: 'w' as Duration, altDuration: '16' as Duration };
      let dotted = false;
      if (i + 1 < processInput.length && processInput[i + 1] === AUGMENTATION_DOT) {
        dotted = true;
      }
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
    
    if (REST_MAP[ch]) {
      const restInfo = REST_MAP[ch];
      let dotted = false;
      if (i + 1 < processInput.length && processInput[i + 1] === AUGMENTATION_DOT) {
        dotted = true;
      }
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
    
    if (ch === WORD_SIGN) {
      i++;
      while (i < processInput.length && processInput[i] !== ' ' && processInput[i] !== '\u2800' && !NOTE_MAP[processInput[i]] && !REST_MAP[processInput[i]]) {
        i++;
      }
      continue;
    }
    
    if (ch === NOTE_TIE) {
      elements.push({ type: 'notetie', sourceIndex: i } as ParsedNoteTie);
      i++;
      continue;
    }
    
    i++;
  }
  
  return { elements, errors };
}

export function parseBrailleLine(fullText: string, cursorPosition: number, options?: ParseOptions): ParseResult {
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
    charCount = lineEnd + 1;
  }
  
  if (!targetLine) targetLine = lines[lines.length - 1] || '';
  return parseBrailleMusic(targetLine, options);
}

export function parseBrailleSelection(fullText: string, selStart: number, selEnd: number, options?: ParseOptions): ParseResult {
  const selectedText = fullText.slice(selStart, selEnd);
  return parseBrailleMusic(selectedText, options);
}

export interface PerkinsKeyState {
  dot1: boolean; dot2: boolean; dot3: boolean;
  dot4: boolean; dot5: boolean; dot6: boolean;
}

export function perkinsKeysToBraille(keys: PerkinsKeyState): string {
  const dotValue = (keys.dot1 ? 1 : 0) + (keys.dot2 ? 2 : 0) + (keys.dot3 ? 4 : 0) +
                   (keys.dot4 ? 8 : 0) + (keys.dot5 ? 16 : 0) + (keys.dot6 ? 32 : 0);
  return String.fromCharCode(0x2800 + dotValue);
}

export function brailleToPerkins(char: string): PerkinsKeyState {
  const code = char.charCodeAt(0) - 0x2800;
  return {
    dot1: (code & 1) !== 0, dot2: (code & 2) !== 0, dot3: (code & 4) !== 0,
    dot4: (code & 8) !== 0, dot5: (code & 16) !== 0, dot6: (code & 32) !== 0,
  };
}

export function unicodeToDots(char: string): number[] {
  const code = char.charCodeAt(0) - 0x2800;
  const dots: number[] = [];
  for (let i = 0; i < 6; i++) {
    if ((code & (1 << i)) !== 0) dots.push(i + 1);
  }
  return dots;
}

export interface QuickRefEntry {
  char: string;
  displayChar?: string;
  dots: string;
  description: string;
  category: string;
}

export function getQuickReference(): QuickRefEntry[] {
  const ref: QuickRefEntry[] = [];
  
  // Notes
  Object.entries(NOTE_MAP).forEach(([char, info]) => {
    let category: string;
    let desc: string;
    
    if (info.duration === 'w') {
      category = 'note-whole-half';
      desc = `${info.pitch} semibreve`;
    } else if (info.duration === 'h') {
      category = 'note-whole-half';
      desc = `${info.pitch} mínima`;
    } else if (info.duration === 'q') {
      category = 'note-quarter';
      desc = `${info.pitch} semínima`;
    } else if (info.duration === '8') {
      category = 'note-eighth';
      desc = `${info.pitch} colcheia`;
    } else {
      category = 'note-half-32nd';
      desc = `${info.pitch} ${info.duration}`;
    }
    
    ref.push({
      char,
      dots: unicodeToDots(char).join(','),
      description: desc,
      category,
    });
  });
  
  // Rests
  Object.entries(REST_MAP).forEach(([char, info]) => {
    const desc = info.duration === 'w' ? 'Pausa semibreve' : 
                 info.duration === 'h' ? 'Pausa mínima' :
                 info.duration === 'q' ? 'Pausa semínima' : 'Pausa colcheia';
    ref.push({
      char,
      dots: unicodeToDots(char).join(','),
      description: desc,
      category: 'rest',
    });
  });
  
  // Whole rest
  ref.push({
    char: '\u283C',
    dots: '3,4,5,6',
    description: 'Pausa semibreve / Sinal de número',
    category: 'rest',
  });
  
  // Accidentals
  Object.entries(ACCIDENTAL_MAP).forEach(([char, acc]) => {
    const desc = acc === 'sharp' ? 'Sustenido' : acc === 'flat' ? 'Bemol' : 'Bequadro';
    ref.push({
      char,
      dots: unicodeToDots(char).join(','),
      description: desc,
      category: 'accidental',
    });
  });
  
  // Octaves
  Object.entries(OCTAVE_MAP).forEach(([char, oct]) => {
    if (char.length === 1) {
      ref.push({
        char,
        dots: unicodeToDots(char).join(','),
        description: `Oitava ${oct}`,
        category: 'octave',
      });
    }
  });
  
  // Time signatures
  Object.entries(TIME_SIGNATURE_MAP).forEach(([char, ts]) => {
    ref.push({
      char,
      dots: unicodeToDots(char[0]).join(',') + ' ' + unicodeToDots(char[1]).join(',') + ' ' + unicodeToDots(char[2]).join(','),
      description: `Compasso ${ts.numerator}/${ts.denominator}`,
      category: 'timesig',
    });
  });
  
  // Barlines
  Object.entries(BARLINE_MAP).forEach(([char, type]) => {
    const desc = type === 'single' ? 'Barra simples' : 
                 type === 'end' ? 'Barra final' : 
                 type === 'repeat-begin' ? 'Ritornelo início' : 
                 type === 'repeat-end' ? 'Ritornelo fim' : 'Ritornelo ambos';
    ref.push({
      char,
      dots: unicodeToDots(char[0]).join(',') + ' ' + unicodeToDots(char[1]).join(','),
      description: desc,
      category: 'barline',
    });
  });
  
  // Intervals
  Object.entries(INTERVAL_MAP).forEach(([char, size]) => {
    const desc = size === 2 ? 'Segunda' : 
                 size === 3 ? 'Terça' : 
                 size === 4 ? 'Quarta' : 
                 size === 5 ? 'Quinta' : 
                 size === 6 ? 'Sexta' : 
                 size === 7 ? 'Sétima' : 'Oitava';
    ref.push({
      char,
      dots: unicodeToDots(char).join(','),
      description: `Intervalo: ${desc}`,
      category: 'interval',
    });
  });
  
  // Other
  ref.push({
    char: '\u2824',
    dots: '3,6',
    description: 'Ponto de aumento',
    category: 'other',
  });
  
  return ref;
}

export const QUICK_REFERENCE = getQuickReference();

export function perkinsDotsToUnicode(dots: PerkinsKeyState): string {
  return perkinsKeysToBraille(dots);
}

export function describeBrailleChar(char: string): string {
  const ref = getQuickReference();
  const entry = ref.find(e => e.char === char);
  if (entry) return entry.description;
  
  const noteInfo = NOTE_MAP[char];
  if (noteInfo) return `${noteInfo.pitch} (${noteInfo.duration})`;
  
  const restInfo = REST_MAP[char];
  if (restInfo) return `Pausa (${restInfo.duration})`;
  
  const accidental = ACCIDENTAL_MAP[char];
  if (accidental) return accidental.charAt(0).toUpperCase() + accidental.slice(1);
  
  const octave = OCTAVE_MAP[char];
  if (octave !== undefined) return `Oitava ${octave}`;
  
  return 'Unknown';
}
