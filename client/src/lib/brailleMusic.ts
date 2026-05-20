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
  '\u2831': { pitch: 'D', duration: 'q', altDuration: '64' },   // ⠱ = :
  '\u282B': { pitch: 'E', duration: 'q', altDuration: '64' },   // ⠫ = $
  '\u283B': { pitch: 'F', duration: 'q', altDuration: '64' },   // ⠻ = ]
  '\u2833': { pitch: 'G', duration: 'q', altDuration: '64' },   // ⠳ = backslash
  '\u282A': { pitch: 'A', duration: 'q', altDuration: '64' },   // ⠪ = [
  '\u283A': { pitch: 'B', duration: 'q', altDuration: '64' },   // ⠺ = W

  // Half notes (mínimas) / 32nd notes (fusas) — dot 3 only
  '\u281D': { pitch: 'C', duration: 'h', altDuration: '32' },   // ⠝ = N
  '\u2815': { pitch: 'D', duration: 'h', altDuration: '32' },   // ⠕ = O
  '\u280F': { pitch: 'E', duration: 'h', altDuration: '32' },   // ⠏ = P
  '\u281F': { pitch: 'F', duration: 'h', altDuration: '32' },   // ⠟ = Q
  '\u2817': { pitch: 'G', duration: 'h', altDuration: '32' },   // ⠗ = R
  '\u280E': { pitch: 'A', duration: 'h', altDuration: '32' },   // ⠎ = S
  '\u281E': { pitch: 'B', duration: 'h', altDuration: '32' },   // ⠞ = T

  // Whole notes (semibreves) / 16th notes (semicolcheias) — dots 3 and 6
  '\u283D': { pitch: 'C', duration: 'w', altDuration: '16' },   // ⠽ = Y
  '\u2835': { pitch: 'D', duration: 'w', altDuration: '16' },   // ⠵ = Z
  '\u282F': { pitch: 'E', duration: 'w', altDuration: '16' },   // ⠯ = &
  '\u283F': { pitch: 'F', duration: 'w', altDuration: '16' },   // ⠿ = =
  '\u2837': { pitch: 'G', duration: 'w', altDuration: '16' },   // ⠷ = (
  '\u282E': { pitch: 'A', duration: 'w', altDuration: '16' },   // ⠮ = !
  '\u283E': { pitch: 'B', duration: 'w', altDuration: '16' },   // ⠾ = )
};

// ─── REST TABLE ────────────────────────────────────────────────────────────────

const REST_MAP: Record<string, { duration: Duration; altDuration: Duration }> = {
  '\u282D': { duration: '8', altDuration: '128' },   // ⠭ eighth rest = X
  '\u2827': { duration: 'q', altDuration: '64' },     // ⠧ quarter rest = V
  '\u2825': { duration: 'h', altDuration: '32' },     // ⠥ half rest = U
  '\u280D': { duration: 'w', altDuration: '16' },     // ⠍ whole rest = M
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
const SLUR = '\u2809';             // ⠉ (ligadura de nota - tie)
const NOTE_TIE = '\u2809';         // ⠉ (1,4) = ligadura de nota
const NUMBER_SIGN = '\u283C';      // ⠼ (number indicator)
const WORD_SIGN = '\u281C';        // ⠜ (word sign, precedes dynamics text)
const FORCED_WHOLE_MARKER = '\u2824'; // ⠤ (marker for forced semibreve, internal use only)

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

// Time signature patterns (NUMBER_SIGN + numerator + denominator)
const TIME_SIGNATURE_MAP: Record<string, { numerator: number; denominator: number }> = {
  '\u283C\u2819\u2832': { numerator: 4, denominator: 4 }, // ⠼⠙⠲ = 4/4
  '\u283C\u2809\u2832': { numerator: 3, denominator: 4 }, // ⠼⠉⠲ = 3/4
  '\u283C\u2803\u2832': { numerator: 2, denominator: 4 }, // ⠼⠃⠲ = 2/4
  '\u283C\u280B\u2826': { numerator: 6, denominator: 8 }, // ⠼⠋⠦ = 6/8
  '\u283C\u2809\u2826': { numerator: 3, denominator: 8 }, // ⠼⠉⠦ = 3/8
  '\u283C\u280A\u2826': { numerator: 9, denominator: 8 }, // ⠼⠊⠦ = 9/8
};

// Barline patterns
const BARLINE_MAP: Record<string, 'barline' | 'none' | 'final'> = {
  '\u2823\u2805': 'none',  // ⠣⠅ = barra final (não renderiza)
  '\u2823\u2836': 'final', // ⠣⠶ = ritornelo início (renderiza como END)
  '\u2823\u2806': 'final', // ⠣⠆ = ritornelo fim (renderiza como END)
}

// ─── PARSED TYPES ──────────────────────────────────────────────────────────────

export interface ParsedNote {
  type: 'note';
  pitch: NoteName;
  octave: number;
  duration: Duration;
  accidental?: Accidental;
  dotted: boolean;
  articulation?: string;
  /** VexFlow key string like "c/4", "b/4" */
  vexKey: string;
  /** VexFlow duration string like "q", "h", "8", "16" */
  vexDuration: string;
  /** Index in the original input string (for cursor tracking) */
  sourceIndex?: number;
  /** Force this note to be a whole note (semibreve), ignoring disambiguation */
  forceWhole?: boolean;
}

export interface ParsedRest {
  type: 'rest';
  duration: Duration;
  dotted: boolean;
  vexDuration: string;
  sourceIndex?: number;
}

export interface ParsedBarline {
  type: 'barline';
  barlineType?: 'final' | 'repeat-begin' | 'repeat-end';
  sourceIndex?: number;
}

export interface ParsedNoteTie {
  type: 'notetie';
  sourceIndex?: number;
}

export interface ParsedTimeSignature {
  type: 'timesignature';
  numerator: number;
  denominator: number;
  sourceIndex?: number;
}

export type ParsedElement = ParsedNote | ParsedRest | ParsedBarline | ParsedTimeSignature | ParsedNoteTie;

export interface ParseResult {
  elements: ParsedElement[];
  errors: string[];
}

// ─── DURATION HELPERS ──────────────────────────────────────────────────────────

/** Convert a duration string to its beat value (in quarter-note beats) */
export function durationToBeats(dur: Duration, dotted = false): number {
  let beats = 0;
  switch (dur) {
    case 'w': beats = 4; break;
    case 'h': beats = 2; break;
    case 'q': beats = 1; break;
    case '8': beats = 0.5; break;
    case '16': beats = 0.25; break;
    case '32': beats = 0.125; break;
    case '64': beats = 0.0625; break;
    case '128': beats = 0.03125; break;
    default: beats = 1;
  }
  if (dotted) beats *= 1.5;
  return beats;
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

// ─── DISAMBIGUATION: semibreve vs semicolcheia ─────────────────────────────────

/**
 * Determine whether a note with ambiguous duration should use the primary
 * (longer) or alternative (shorter) duration based on measure context.
 * 
 * Rules:
 * - Group 4 (whole/16th): If a whole note (4 beats) fits in the remaining
 *   beats of the measure, use whole. Otherwise, use 16th.
 * - Group 3 (half/32nd): If a half note (2 beats) fits, use half. Otherwise, use 32nd.
 * - Group 1 (8th/128th): Always use 8th (128th is extremely rare).
 * - Group 2 (quarter/64th): Always use quarter (64th is extremely rare).
 * 
 * @param primaryDur The primary (longer) duration
 * @param altDur The alternative (shorter) duration
 * @param beatsUsedInMeasure Beats already used in the current measure
 * @param beatsPerMeasure Total beats in the measure (from time signature)
 * @param dotted Whether the note has an augmentation dot
 */
function disambiguateDuration(
  primaryDur: Duration,
  altDur: Duration,
  beatsUsedInMeasure: number,
  beatsPerMeasure: number,
  dotted: boolean,
): Duration {
  // Only disambiguate for groups that share the same Braille cell
  // Group 4: whole (w=4 beats) vs 16th (16=0.25 beats)
  // Group 3: half (h=2 beats) vs 32nd (32=0.125 beats)
  
  if (primaryDur === 'w' || primaryDur === 'h') {
    const primaryBeats = durationToBeats(primaryDur, dotted);
    const remaining = beatsPerMeasure - beatsUsedInMeasure;
    
    // If the primary (longer) duration fits in the remaining beats, use it
    if (primaryBeats <= remaining + 0.001) {
      return primaryDur;
    }
    // Otherwise, use the alternative (shorter) duration
    return altDur;
  }
  
  // For 8th/128th and quarter/64th, always use the primary (common) duration
  return primaryDur;
}

// ─── MAIN PARSER ───────────────────────────────────────────────────────────────

export interface ParseOptions {
  /** Beats per measure (default: 4 for 4/4 time) */
  beatsPerMeasure?: number;
  /** Beat value (default: 4 = quarter note) */
  beatValue?: number;
}

/**
 * Parse a string of Unicode Braille music notation into structured elements.
 * This is the core engine that powers the real-time score rendering.
 * 
 * Now includes automatic disambiguation of semibreve/semicolcheia based
 * on measure context.
 */
export function parseBrailleMusic(input: string, options?: ParseOptions): ParseResult {
  let beatsPerMeasure = options?.beatsPerMeasure ?? 4;
  
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
  
  // Measure context for disambiguation
  let beatsUsedInMeasure = 0;
  
  let i = 0;
  while (i < input.length) {
    let ch = input[i];
    const nextCh = i + 1 < input.length ? input[i + 1] : '';
    
    // Check for barline patterns (2-char sequences)
    if (i + 1 < input.length) {
      const barlinePattern = input.substring(i, i + 2);
      if (BARLINE_MAP[barlinePattern]) {
        const barlineType = BARLINE_MAP[barlinePattern];
        // Skip if last element is already a barline
        if (elements.length === 0 || elements[elements.length - 1].type !== 'barline') {
          elements.push({
            type: 'barline',
            sourceIndex: i,
            // Store barline type for rendering
            ...(barlineType !== 'barline' && { barlineType }),
          } as any);
        }
        beatsUsedInMeasure = 0;
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
    
    // Check for forced whole note marker
    let forceWhole = false;
    if (ch === FORCED_WHOLE_MARKER) {
      forceWhole = true;
      i++;
      if (i >= input.length || !NOTE_MAP[input[i]]) {
        // Invalid: marker without following note
        i++;
        continue;
      }
      ch = input[i];
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
      if (i + 1 < input.length && input[i + 1] === AUGMENTATION_DOT) {
        dotted = true;
      }
      
      // ── DISAMBIGUATION ──
      // Determine the actual duration based on measure context
      // If forceWhole is true, use the primary (whole note) duration
      let actualDuration: Duration;
      if (forceWhole && noteInfo.duration === 'w') {
        // Force semibreve, ignore disambiguation
        actualDuration = 'w';
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
      
      i++;
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
      if (dotted && i < input.length && input[i] === AUGMENTATION_DOT) {
        i++;
      }
      continue;
    }
    
    // Check for time signature patterns (NUMBER_SIGN + 3 chars)
    if (ch === NUMBER_SIGN && i + 2 < input.length) {
      const pattern = input.substring(i, i + 3);
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
      while (i < input.length && BRAILLE_DIGITS[input[i]] !== undefined) {
        digits += BRAILLE_DIGITS[input[i]];
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
      while (i < input.length && input[i] !== ' ' && input[i] !== '\u2800' && !NOTE_MAP[input[i]] && !REST_MAP[input[i]]) {
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
  
  // ── PASS 2: Retroactive disambiguation ──────────────────────────────────────
  // Group elements by measure. For each measure, if there are >1 notes/rests
  // from the w/16 group (or h/32 group), ALL of them should use the shorter
  // duration (semicolcheia/fusa). This handles the case where the user types
  // two whole-note cells in the same measure.
  
  let measureElements: (ParsedNote | ParsedRest)[] = [];
  
  function applyRetroactiveDisambiguation(measureNotes: (ParsedNote | ParsedRest)[]) {
    // Count notes from each ambiguous group within this measure
    const wholeGroup = measureNotes.filter(n => {
      const dur = n.type === 'note' ? n.duration : n.duration;
      return dur === 'w' || dur === '16';
    });
    const halfGroup = measureNotes.filter(n => {
      const dur = n.type === 'note' ? n.duration : n.duration;
      return dur === 'h' || dur === '32';
    });
    
    // If >1 note in the w/16 group, all should be 16th
    if (wholeGroup.length > 1) {
      for (const n of wholeGroup) {
        if (n.type === 'note') {
          n.duration = '16' as Duration;
          n.vexDuration = n.dotted ? '16d' : '16';
        } else {
          n.duration = '16' as Duration;
          n.vexDuration = n.dotted ? '16dr' : '16r';
        }
      }
    }
    
    // If >1 note in the h/32 group, all should be 32nd
    if (halfGroup.length > 1) {
      for (const n of halfGroup) {
        if (n.type === 'note') {
          n.duration = '32' as Duration;
          n.vexDuration = n.dotted ? '32d' : '32';
        } else {
          n.duration = '32' as Duration;
          n.vexDuration = n.dotted ? '32dr' : '32r';
        }
      }
    }
  }
  
  for (const el of elements) {
    if (el.type === 'barline') {
      applyRetroactiveDisambiguation(measureElements);
      measureElements = [];
    } else {
      measureElements.push(el as ParsedNote | ParsedRest);
    }
  }
  // Apply to last measure
  if (measureElements.length > 0) {
    applyRetroactiveDisambiguation(measureElements);
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
    const altName = durNames[n.altDuration];
    return `${n.pitch} ${durNames[n.duration]} / ${altName}`;
  }
  if (REST_MAP[char]) {
    const r = REST_MAP[char];
    const durNames: Record<Duration, string> = {
      'w': 'semibreve', 'h': 'mínima', 'q': 'semínima', '8': 'colcheia',
      '16': 'semicolcheia', '32': 'fusa', '64': 'semifusa', '128': 'quartifusa',
    };
    return `Pausa ${durNames[r.duration]} / ${durNames[r.altDuration]}`;
  }
  if (OCTAVE_MAP[char] !== undefined) return `Oitava ${OCTAVE_MAP[char]}`;
  if (ACCIDENTAL_MAP[char]) {
    const names: Record<Accidental, string> = { sharp: 'Sustenido', flat: 'Bemol', natural: 'Bequadro' };
    return names[ACCIDENTAL_MAP[char]];
  }
  if (char === AUGMENTATION_DOT) return 'Ponto de aumento';
  if (char === SLUR) return 'Ligadura';
  if (char === NUMBER_SIGN) return 'Sinal de número';
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
  category: string;
}

export function getQuickReference(): QuickRefEntry[] {
  const entries: QuickRefEntry[] = [];
  
  // Notes — organized by duration group
  for (const [char, info] of Object.entries(NOTE_MAP)) {
    const durNames: Record<Duration, string> = {
      'w': 'Semibreve/Semicolcheia', 'h': 'Mínima/Fusa', 'q': 'Semínima', '8': 'Colcheia',
      '16': 'Semicolcheia', '32': 'Fusa', '64': 'Semifusa', '128': 'Quartifusa',
    };
    const cat = info.duration === '8' ? 'note-eighth' : info.duration === 'q' ? 'note-quarter' : info.duration === 'h' ? 'note-half' : 'note-whole-16th';
    const dots = unicodeToDots(char);
    entries.push({
      char,
      dots: dots.join(','),
      description: `${info.pitch} ${durNames[info.duration]}`,
      category: cat,
    });
  }
  
  // Rests
  for (const [char, info] of Object.entries(REST_MAP)) {
    const durNames: Record<Duration, string> = {
      'w': 'Semibreve/Semicolcheia', 'h': 'Mínima/Fusa', 'q': 'Semínima', '8': 'Colcheia',
      '16': 'Semicolcheia', '32': 'Fusa', '64': 'Semifusa', '128': 'Quartifusa',
    };
    const dots = unicodeToDots(char);
    entries.push({
      char,
      dots: dots.join(','),
      description: `Pausa ${durNames[info.duration]}`,
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
  
  // Semibreve forçada (entrada explícita para evitar ambiguidade)
  // Usa marcador especial + nota para forçar semibreve
  const semibreveForced = [
    { char: FORCED_WHOLE_MARKER + '\u283D', pitch: 'C', dots: '1,4 + 1,3,4,5,6' },
    { char: FORCED_WHOLE_MARKER + '\u2835', pitch: 'D', dots: '1,4 + 1,3,4,5,6' },
    { char: FORCED_WHOLE_MARKER + '\u282F', pitch: 'E', dots: '1,4 + 2,3,4,5,6' },
    { char: FORCED_WHOLE_MARKER + '\u283F', pitch: 'F', dots: '1,4 + 1,2,3,4,5,6' },
    { char: FORCED_WHOLE_MARKER + '\u2837', pitch: 'G', dots: '1,4 + 1,2,3,4,5' },
    { char: FORCED_WHOLE_MARKER + '\u282E', pitch: 'A', dots: '1,4 + 2,3,4,5' },
    { char: FORCED_WHOLE_MARKER + '\u283E', pitch: 'B', dots: '1,4 + 2,3,4,5,6' },
  ];
  for (const s of semibreveForced) {
    entries.push({
      char: s.char,
      dots: s.dots,
      description: `${s.pitch} Semibreve (forçada)`,
      category: 'note-whole-forced',
    });
  }
  
  // Fórmulas de compasso
  // Celas corretas conforme especificação musicográfica Braille
  entries.push(
    { char: NUMBER_SIGN + '\u2819\u2832', dots: '3,4,5,6 + 1,4,5 + 2,5,6', description: 'Fórmula 4/4', category: 'timesig' },
    { char: NUMBER_SIGN + '\u2809\u2832', dots: '3,4,5,6 + 1,4 + 2,5,6', description: 'Fórmula 3/4', category: 'timesig' },
    { char: NUMBER_SIGN + '\u2803\u2832', dots: '3,4,5,6 + 1,2 + 2,5,6', description: 'Fórmula 2/4', category: 'timesig' },
    { char: NUMBER_SIGN + '\u280B\u2826', dots: '3,4,5,6 + 1,2,4 + 2,3,6', description: 'Fórmula 6/8', category: 'timesig' },
    { char: NUMBER_SIGN + '\u2809\u2826', dots: '3,4,5,6 + 1,4 + 2,3,6', description: 'Fórmula 3/8', category: 'timesig' },
    { char: NUMBER_SIGN + '\u280A\u2826', dots: '3,4,5,6 + 2,4 + 2,3,6', description: 'Fórmula 9/8', category: 'timesig' },
  );
  
  // Barras de compasso e repetições
  entries.push(
    { char: ' ', dots: '-', description: 'Barra de compasso', category: 'barline' },
    { char: '\u2823\u2805', dots: '1,2,6 + 1,3', description: 'Barra final', category: 'barline' },
    { char: '\u2823\u2836', dots: '1,2,6 + 2,3,5,6', description: 'Ritornelo (início)', category: 'barline' },
    { char: '\u2823\u2806', dots: '1,2,6 + 2,3', description: 'Ritornelo (fim)', category: 'barline' },
  );
  
  // Ligaduras e outros símbolos
  entries.push(
    { char: AUGMENTATION_DOT, dots: '3', description: 'Ponto de aumento', category: 'other' },
    { char: NOTE_TIE, dots: '1,4', description: 'Ligadura de nota', category: 'other' },
    { char: '\u2806', dots: '2,3', description: 'Sinal de tercina', category: 'other' },
    { char: NUMBER_SIGN, dots: unicodeToDots(NUMBER_SIGN).join(','), description: 'Sinal de número', category: 'other' },
  );
  
  return entries;
}
