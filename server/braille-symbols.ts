/**
 * Braille Music Symbols Module (Server-side)
 * 
 * Correct implementation based on the International Manual of Braille Music Notation.
 * In Braille music, each note character encodes BOTH pitch and duration in a single cell:
 *   - Dots 1,2,4,5 encode the pitch (C through B)
 *   - Dots 3,6 encode the duration group
 */

// ─── NOTE CHARACTER TABLE ──────────────────────────────────────────────────────
// Each note is a SINGLE Unicode Braille character encoding pitch + duration.
// Duration groups by dots 3,6:
//   No dot 3/6 = eighth (or 128th)
//   Dot 6 only = quarter (or 64th)
//   Dot 3 only = half (or 32nd)
//   Dots 3+6   = whole (or 16th)

type NoteName = 'C' | 'D' | 'E' | 'F' | 'G' | 'A' | 'B';
type Duration = 'whole' | 'half' | 'quarter' | 'eighth' | 'sixteenth' | 'thirtysecond' | 'sixtyfourth';

// Map from (pitch, duration) → Unicode Braille character
const NOTE_CHAR_MAP: Record<string, string> = {
  // Eighth notes (colcheias)
  'C-eighth':   '\u2819', // ⠙
  'D-eighth':   '\u2811', // ⠑
  'E-eighth':   '\u280B', // ⠋
  'F-eighth':   '\u281B', // ⠛
  'G-eighth':   '\u2813', // ⠓
  'A-eighth':   '\u280A', // ⠊
  'B-eighth':   '\u281A', // ⠚

  // Quarter notes (semínimas)
  'C-quarter':  '\u2839', // ⠹
  'D-quarter':  '\u2831', // ⠱
  'E-quarter':  '\u282B', // ⠫
  'F-quarter':  '\u283B', // ⠻
  'G-quarter':  '\u2833', // ⠳
  'A-quarter':  '\u282A', // ⠪
  'B-quarter':  '\u283A', // ⠺

  // Half notes (mínimas)
  'C-half':     '\u281D', // ⠝
  'D-half':     '\u2815', // ⠕
  'E-half':     '\u280F', // ⠏
  'F-half':     '\u281F', // ⠟
  'G-half':     '\u2817', // ⠗
  'A-half':     '\u280E', // ⠎
  'B-half':     '\u281E', // ⠞

  // Whole notes (semibreves)
  'C-whole':    '\u283D', // ⠽
  'D-whole':    '\u2835', // ⠵
  'E-whole':    '\u282F', // ⠯
  'F-whole':    '\u283F', // ⠿
  'G-whole':    '\u2837', // ⠷
  'A-whole':    '\u282E', // ⠮
  'B-whole':    '\u283E', // ⠾

  // Sixteenth notes (semicolcheias) — same as whole notes (context determines)
  'C-sixteenth': '\u283D', // ⠽
  'D-sixteenth': '\u2835', // ⠵
  'E-sixteenth': '\u282F', // ⠯
  'F-sixteenth': '\u283F', // ⠿
  'G-sixteenth': '\u2837', // ⠷
  'A-sixteenth': '\u282E', // ⠮
  'B-sixteenth': '\u283E', // ⠾

  // Thirty-second notes (fusas) — same as half notes
  'C-thirtysecond': '\u281D', // ⠝
  'D-thirtysecond': '\u2815', // ⠕
  'E-thirtysecond': '\u280F', // ⠏
  'F-thirtysecond': '\u281F', // ⠟
  'G-thirtysecond': '\u2817', // ⠗
  'A-thirtysecond': '\u280E', // ⠎
  'B-thirtysecond': '\u281E', // ⠞

  // Sixty-fourth notes (semifusas) — same as quarter notes
  'C-sixtyfourth': '\u2839', // ⠹
  'D-sixtyfourth': '\u2831', // ⠱
  'E-sixtyfourth': '\u282B', // ⠫
  'F-sixtyfourth': '\u283B', // ⠻
  'G-sixtyfourth': '\u2833', // ⠳
  'A-sixtyfourth': '\u282A', // ⠪
  'B-sixtyfourth': '\u283A', // ⠺
};

// ─── REST CHARACTER TABLE ──────────────────────────────────────────────────────

const REST_CHAR_MAP: Record<string, string> = {
  'eighth':       '\u282D', // ⠭
  'quarter':      '\u2827', // ⠧
  'half':         '\u2825', // ⠥
  'whole':        '\u280D', // ⠍
};

// ─── OCTAVE SIGNS ──────────────────────────────────────────────────────────────

const OCTAVE_SIGN_MAP: Record<number, string> = {
  1: '\u2808', // ⠈
  2: '\u2818', // ⠘
  3: '\u2838', // ⠸
  4: '\u2810', // ⠐
  5: '\u2828', // ⠨
  6: '\u2830', // ⠰
  7: '\u2820', // ⠠
};

// ─── ACCIDENTAL SIGNS ──────────────────────────────────────────────────────────

const ACCIDENTAL_SIGN_MAP: Record<string, string> = {
  'sharp':   '\u2829', // ⠩
  'flat':    '\u2823', // ⠣
  'natural': '\u2821', // ⠡
};

// ─── OTHER SIGNS ───────────────────────────────────────────────────────────────

const AUGMENTATION_DOT = '\u2804'; // ⠄
const BARLINE_SPACE = ' ';         // space = barline separator
const SLUR_SIGN = '\u2809';       // ⠉

// ─── EXPORTED INTERFACE ────────────────────────────────────────────────────────

export interface MusicalNote {
  pitch: string; // C, D, E, F, G, A, B
  octave: number; // 1-7
  accidental?: 'sharp' | 'flat' | 'natural' | 'doubleSharp' | 'doubleFlat';
  duration: Duration;
  dotted?: boolean;
  articulation?: string;
  dynamic?: string;
  fermata?: boolean;
}

/**
 * Convert a musical note to its correct Braille Unicode representation.
 * Uses the international standard where pitch + duration are encoded
 * in a SINGLE Braille character.
 */
export function noteTobraille(note: MusicalNote): string {
  let braille = '';

  // 0. Dynamic marking (before octave sign)
  if (note.dynamic && DYNAMICS_MAP[note.dynamic]) {
    braille += DYNAMICS_MAP[note.dynamic];
  }

  // 1. Octave sign (always added for first note; for subsequent notes
  //    the caller should decide based on interval rules)
  const octSign = OCTAVE_SIGN_MAP[note.octave];
  if (octSign) {
    braille += octSign;
  }

  // 2. Accidental (before the note)
  if (note.accidental && note.accidental !== 'doubleSharp' && note.accidental !== 'doubleFlat') {
    const accSign = ACCIDENTAL_SIGN_MAP[note.accidental];
    if (accSign) braille += accSign;
  }

  // 2b. Articulation (before the note)
  if (note.articulation && ARTICULATION_MAP[note.articulation]) {
    braille += ARTICULATION_MAP[note.articulation];
  }

  // 3. The note character itself (encodes pitch + duration in one cell)
  const key = `${note.pitch}-${note.duration}`;
  const noteChar = NOTE_CHAR_MAP[key];
  if (noteChar) {
    braille += noteChar;
  }

  // 4. Augmentation dot (after the note)
  if (note.dotted) {
    braille += AUGMENTATION_DOT;
  }

  // 5. Fermata (after the note)
  if (note.fermata && EXPRESSION_MAP['fermata']) {
    braille += EXPRESSION_MAP['fermata'];
  }

  return braille;
}

/**
 * Convert a rest to its Braille representation.
 */
export function restToBraille(duration: Duration, dotted?: boolean): string {
  let braille = REST_CHAR_MAP[duration] || '';
  if (dotted) braille += AUGMENTATION_DOT;
  return braille;
}

/**
 * Convert multiple notes to Braille with proper octave handling.
 * Only emits octave signs when necessary (first note, or when interval
 * is ambiguous — 6th, 7th, or octave+).
 * 
 * If measureIndices is provided, barline separators (spaces) are inserted
 * between measures.
 */
export function notesToBraille(notes: MusicalNote[], measureIndices?: number[]): string {
  let result = '';
  let prevPitch: string | null = null;
  let prevOctave: number | null = null;

  const PITCH_SEMITONES: Record<string, number> = {
    'C': 0, 'D': 2, 'E': 4, 'F': 5, 'G': 7, 'A': 9, 'B': 11,
  };

  // Build a set of indices where a new measure starts
  const measureStartSet = new Set(measureIndices || []);

  for (let i = 0; i < notes.length; i++) {
    const note = notes[i];
    let braille = '';

    // Insert barline (space) before the first note of a new measure
    if (i > 0 && measureStartSet.has(i)) {
      result += BARLINE_SPACE;
      // After a barline, the next note needs an octave sign
      prevPitch = null;
      prevOctave = null;
    }

    // Determine if octave sign is needed
    let needOctave = false;
    if (i === 0 || prevPitch === null || prevOctave === null) {
      needOctave = true;
    } else {
      // Calculate interval
      const prevAbs = prevOctave * 12 + (PITCH_SEMITONES[prevPitch] || 0);
      const currAbs = note.octave * 12 + (PITCH_SEMITONES[note.pitch] || 0);
      const interval = Math.abs(currAbs - prevAbs);
      // Need octave sign for intervals >= 6th (9+ semitones)
      if (interval >= 9) needOctave = true;
    }

    // 1. Octave sign
    if (needOctave) {
      const octSign = OCTAVE_SIGN_MAP[note.octave];
      if (octSign) braille += octSign;
    }

    // 2. Accidental
    if (note.accidental && note.accidental !== 'doubleSharp' && note.accidental !== 'doubleFlat') {
      const accSign = ACCIDENTAL_SIGN_MAP[note.accidental];
      if (accSign) braille += accSign;
    }

    // 3. Note character
    const key = `${note.pitch}-${note.duration}`;
    const noteChar = NOTE_CHAR_MAP[key];
    if (noteChar) braille += noteChar;

    // 4. Augmentation dot
    if (note.dotted) braille += AUGMENTATION_DOT;

    result += braille;
    prevPitch = note.pitch;
    prevOctave = note.octave;
  }

  return result;
}

/**
 * Convert MIDI number to note name + octave.
 */
export function midiToNote(midiNumber: number): { pitch: string; octave: number } {
  const pitches = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  const pitchIndex = midiNumber % 12;
  const octave = Math.floor(midiNumber / 12) - 1;
  let pitch = pitches[pitchIndex];
  if (pitch.includes('#')) {
    const map: Record<string, string> = { 'C#': 'Db', 'D#': 'Eb', 'F#': 'Gb', 'G#': 'Ab', 'A#': 'Bb' };
    pitch = map[pitch] || pitch;
  }
  return { pitch: pitch[0], octave };
}

/**
 * Convert note to MIDI number.
 */
export function noteToMidi(pitch: string, octave: number, accidental?: string): number {
  const pitches: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
  let midi = (octave + 1) * 12 + pitches[pitch];
  if (accidental === 'sharp') midi += 1;
  else if (accidental === 'flat') midi -= 1;
  else if (accidental === 'doubleSharp') midi += 2;
  else if (accidental === 'doubleFlat') midi -= 2;
  return midi;
}

/**
 * Validate if a note is valid.
 */
export function isValidNote(note: MusicalNote): boolean {
  const validPitches = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
  const validOctaves = [0, 1, 2, 3, 4, 5, 6, 7];
  const validDurations: Duration[] = ['whole', 'half', 'quarter', 'eighth', 'sixteenth', 'thirtysecond', 'sixtyfourth'];
  return validPitches.includes(note.pitch) && validOctaves.includes(note.octave) && validDurations.includes(note.duration);
}

/**
 * Generate a scale in Braille.
 */
export function generateScale(
  startPitch: string,
  startOctave: number,
  scaleType: 'major' | 'minor' | 'pentatonic' = 'major',
  length: number = 8
): MusicalNote[] {
  const pitches = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
  const startIndex = pitches.indexOf(startPitch);
  const notes: MusicalNote[] = [];

  for (let i = 0; i < length; i++) {
    const pitchIndex = (startIndex + i) % 7;
    const octaveOffset = Math.floor((startIndex + i) / 7);
    notes.push({
      pitch: pitches[pitchIndex],
      octave: startOctave + octaveOffset,
      duration: 'quarter',
    });
  }

  return notes;
}

// ─── DYNAMICS ──────────────────────────────────────────────────────────────────

const DYNAMICS_MAP: Record<string, string> = {
  'pp':  '\u2810\u2810\u280F', // ⠐⠐⠏
  'p':   '\u2810\u280F',       // ⠐⠏
  'mp':  '\u2810\u280D\u280F', // ⠐⠍⠏
  'mf':  '\u2810\u280D\u280B', // ⠐⠍⠋
  'f':   '\u2810\u280B',       // ⠐⠋
  'ff':  '\u2810\u2810\u280B', // ⠐⠐⠋
  'sfz': '\u2810\u280E\u280B\u2835', // ⠐⠎⠋⠵
};

// ─── ARTICULATION ──────────────────────────────────────────────────────────────

const ARTICULATION_MAP: Record<string, string> = {
  'staccato':    '\u2826', // ⠦
  'legato':      '\u2809', // ⠉ (slur/legato)
  'tenuto':      '\u2838\u2826', // ⠸⠦
  'accent':      '\u2828\u2826', // ⠨⠦
  'marcato':     '\u2830\u2826', // ⠰⠦
  'fermata':     '\u2828\u2804', // ⠨⠄
};

// ─── EXPRESSION ────────────────────────────────────────────────────────────────

const EXPRESSION_MAP: Record<string, string> = {
  'fermata':    '\u2828\u2804', // ⠨⠄
  'crescendo':  '\u2810\u2823', // ⠐⠣
  'decrescendo':'\u2810\u2829', // ⠐⠩
};

// ─── DURATION SYMBOLS ──────────────────────────────────────────────────────────

const DURATION_SYMBOL_MAP: Record<string, string> = {
  'whole':   '(dots 3+6)',
  'half':    '(dot 3)',
  'quarter': '(dot 6)',
  'eighth':  '(no dots 3/6)',
  'dotted':  AUGMENTATION_DOT,
};

// Re-export for backward compatibility
export const BRAILLE_SYMBOLS = {
  notes: NOTE_CHAR_MAP,
  octaves: OCTAVE_SIGN_MAP,
  accidentals: ACCIDENTAL_SIGN_MAP,
  rests: REST_CHAR_MAP,
  durations: DURATION_SYMBOL_MAP,
  dynamics: DYNAMICS_MAP,
  articulation: ARTICULATION_MAP,
  expression: EXPRESSION_MAP,
};
