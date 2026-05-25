/**
 * MusicXML Parser Module
 * Converts MusicXML files to Braille notation (Basic Mode)
 * 
 * Basic mode includes: time signature, key signature, notes, rests,
 * accidentals, octave signs, ties, barlines (final, repeat), and triplets.
 */

import { parseStringPromise } from "xml2js";

// ─── BRAILLE CONSTANTS ────────────────────────────────────────────────────────

const BRAILLE_NUMBER_SIGN = '\u283C'; // ⠼

const BRAILLE_DIGIT: Record<number, string> = {
  0: '\u281A', 1: '\u2801', 2: '\u2803', 3: '\u2809',
  4: '\u2819', 5: '\u2811', 6: '\u280B', 7: '\u281B',
  8: '\u2813', 9: '\u280A',
};

const TS_DENOM: Record<number, string> = {
  2: '\u2806', 4: '\u2832', 8: '\u2826', 16: '\u2824',
};

const NOTE_CHAR_MAP: Record<string, string> = {
  'C-eighth': '\u2819', 'D-eighth': '\u2811', 'E-eighth': '\u280B',
  'F-eighth': '\u281B', 'G-eighth': '\u2813', 'A-eighth': '\u280A', 'B-eighth': '\u281A',
  'C-quarter': '\u2839', 'D-quarter': '\u2831', 'E-quarter': '\u282B',
  'F-quarter': '\u283B', 'G-quarter': '\u2833', 'A-quarter': '\u282A', 'B-quarter': '\u283A',
  'C-half': '\u281D', 'D-half': '\u2815', 'E-half': '\u280F',
  'F-half': '\u281F', 'G-half': '\u2817', 'A-half': '\u280E', 'B-half': '\u281E',
  'C-whole': '\u283D', 'D-whole': '\u2835', 'E-whole': '\u282F',
  'F-whole': '\u283F', 'G-whole': '\u2837', 'A-whole': '\u282E', 'B-whole': '\u283E',
  'C-sixteenth': '\u283D', 'D-sixteenth': '\u2835', 'E-sixteenth': '\u282F',
  'F-sixteenth': '\u283F', 'G-sixteenth': '\u2837', 'A-sixteenth': '\u282E', 'B-sixteenth': '\u283E',
  'C-thirtysecond': '\u281D', 'D-thirtysecond': '\u2815', 'E-thirtysecond': '\u280F',
  'F-thirtysecond': '\u281F', 'G-thirtysecond': '\u2817', 'A-thirtysecond': '\u280E', 'B-thirtysecond': '\u281E',
};

const REST_CHAR_MAP: Record<string, string> = {
  'whole': '\u280D', 'half': '\u2825', 'quarter': '\u2827',
  'eighth': '\u282D', 'sixteenth': '\u282D', 'thirtysecond': '\u2825',
};

const OCTAVE_SIGN_MAP: Record<number, string> = {
  1: '\u2808', 2: '\u2818', 3: '\u2838', 4: '\u2810',
  5: '\u2828', 6: '\u2830', 7: '\u2820',
};

const ACCIDENTAL_SIGN_MAP: Record<string, string> = {
  'sharp': '\u2829', 'flat': '\u2823', 'natural': '\u2821',
};

const AUGMENTATION_DOT = '\u2804'; // ⠄
const BARLINE_SPACE = '\u2800';    // space = barline
const BARLINE_FINAL = '\u2823\u2805'; // ⠣⠅
const BARLINE_REPEAT_BEGIN = '\u2823\u2836'; // ⠣⠶
const BARLINE_REPEAT_END = '\u2823\u2806'; // ⠣⠆
const TIE_SIGN = '\u2809'; // ⠉
const TRIPLET_SIGN = '\u2806'; // ⠆

// ─── TYPES ────────────────────────────────────────────────────────────────────

type Duration = 'whole' | 'half' | 'quarter' | 'eighth' | 'sixteenth' | 'thirtysecond' | 'sixtyfourth';

export interface MusicalNote {
  pitch: string;
  octave: number;
  accidental?: 'sharp' | 'flat' | 'natural' | 'doubleSharp' | 'doubleFlat';
  duration: Duration;
  dotted?: boolean;
  articulation?: string;
  dynamic?: string;
  fermata?: boolean;
}

export interface ParsedMusicXML {
  title: string;
  composer: string;
  notes: MusicalNote[];
  timeSignature: { beats: number; beatType: number };
  key: { fifths: number; mode: string };
  brailleContent: string;
  partsInfo: { id: string; name: string }[];
}

// ─── HELPERS ──────────────────────────────────────────────────────────────────

function getNoteDuration(type: string): Duration {
  const map: Record<string, Duration> = {
    whole: 'whole', half: 'half', quarter: 'quarter', eighth: 'eighth',
    '16th': 'sixteenth', '32nd': 'thirtysecond', '64th': 'sixtyfourth',
  };
  return map[type] || 'quarter';
}

function getAccidental(alter?: string[]): 'sharp' | 'flat' | 'natural' | undefined {
  if (!alter || alter.length === 0) return undefined;
  const a = parseInt(alter[0]);
  if (a === 1) return 'sharp';
  if (a === -1) return 'flat';
  if (a === 0) return 'natural';
  return undefined;
}

const PITCH_STEPS: Record<string, number> = {
  'C': 0, 'D': 1, 'E': 2, 'F': 3, 'G': 4, 'A': 5, 'B': 6,
};

function needsOctaveSign(
  currentPitch: string, currentOctave: number,
  prevPitch: string | null, prevOctave: number | null
): boolean {
  if (prevPitch === null || prevOctave === null) return true;
  const currAbs = currentOctave * 7 + (PITCH_STEPS[currentPitch] || 0);
  const prevAbs = prevOctave * 7 + (PITCH_STEPS[prevPitch] || 0);
  const interval = Math.abs(currAbs - prevAbs);
  // Octave sign needed for intervals >= 4th (3+ steps) or octave change
  if (currentOctave !== prevOctave) return true;
  if (interval >= 4) return true;
  return false;
}

// ─── MAIN PARSER ──────────────────────────────────────────────────────────────

export async function parseMusicXML(xmlContent: string, options?: { partIndex?: number }): Promise<ParsedMusicXML> {
  const parsed = await parseStringPromise(xmlContent);
  const scorePartwise = parsed["score-partwise"];

  if (!scorePartwise) {
    throw new Error("Arquivo MusicXML inválido: score-partwise não encontrado");
  }

  // Extract metadata
  const workTitle = scorePartwise.work?.[0]?.["work-title"]?.[0] || "";
  const movementTitle = scorePartwise["movement-title"]?.[0] || workTitle || "Untitled";
  
  let composer = "Unknown";
  const creatorData = scorePartwise.identification?.[0]?.creator?.[0];
  if (typeof creatorData === "string") composer = creatorData;
  else if (creatorData && typeof creatorData === "object" && "_" in creatorData) composer = creatorData._;

  // Parts info
  const partsInfo: { id: string; name: string }[] = [];
  const partListEl = scorePartwise["part-list"]?.[0]?.["score-part"];
  if (partListEl) {
    for (const sp of partListEl) {
      const id = sp.$?.id || '';
      const name = sp["part-name"]?.[0] || id;
      partsInfo.push({ id, name: typeof name === 'string' ? name : name._ || id });
    }
  }

  // Select part
  const parts = scorePartwise.part || [];
  if (parts.length === 0) throw new Error("Nenhuma parte encontrada no arquivo MusicXML");
  
  const partIdx = options?.partIndex ?? 0;
  const part = parts[Math.min(partIdx, parts.length - 1)];
  const measures = part.measure || [];

  let timeSignature = { beats: 4, beatType: 4 };
  let key = { fifths: 0, mode: "major" };
  const allNotes: MusicalNote[] = [];

  // Build braille directly with all elements
  let braille = '';
  let prevPitch: string | null = null;
  let prevOctave: number | null = null;
  let firstMeasure = true;

  for (let mIdx = 0; mIdx < measures.length; mIdx++) {
    const measure = measures[mIdx];

    // Barline between measures (not before first)
    if (!firstMeasure) {
      braille += BARLINE_SPACE;
      // After barline, reset octave tracking
      prevPitch = null;
      prevOctave = null;
    }

    // Check for repeat-begin barline
    const barlineElements = measure.barline || [];
    for (const bl of barlineElements) {
      const location = bl.$?.location || 'right';
      const repeatDir = bl.repeat?.[0]?.$?.direction;
      if (location === 'left' && repeatDir === 'forward') {
        braille += BARLINE_REPEAT_BEGIN + BARLINE_SPACE;
      }
    }

    // Attributes (time signature, key)
    if (measure.attributes) {
      const attrs = measure.attributes[0];
      
      if (attrs.time) {
        const time = attrs.time[0];
        timeSignature = {
          beats: parseInt(time.beats[0]),
          beatType: parseInt(time["beat-type"][0]),
        };
        // Write time signature in braille
        const numStr = BRAILLE_DIGIT[timeSignature.beats] || BRAILLE_DIGIT[4];
        const denomStr = TS_DENOM[timeSignature.beatType] || TS_DENOM[4];
        braille += BRAILLE_NUMBER_SIGN + numStr + denomStr + BARLINE_SPACE;
      }

      if (attrs.key) {
        const keyData = attrs.key[0];
        key = {
          fifths: parseInt(keyData.fifths[0]),
          mode: keyData.mode?.[0] || "major",
        };
      }
    }

    // Process notes and rests
    const noteElements = measure.note || [];
    let inTriplet = false;

    for (const noteData of noteElements) {
      // Skip chord notes (only top note in basic mode)
      if (noteData.chord) continue;
      // Skip grace notes
      if (noteData.grace) continue;

      // Check for tuplet
      const notations = noteData.notations?.[0];
      const tupletEl = notations?.tuplet?.[0];
      if (tupletEl?.$?.type === 'start' && !inTriplet) {
        braille += TRIPLET_SIGN;
        inTriplet = true;
      }

      if (noteData.rest) {
        // REST
        const type = noteData.type?.[0] || 'quarter';
        const duration = getNoteDuration(type);
        const dotted = !!noteData.dot;
        const restChar = REST_CHAR_MAP[duration] || REST_CHAR_MAP['quarter'];
        braille += restChar;
        if (dotted) braille += AUGMENTATION_DOT;
        prevPitch = null;
        prevOctave = null;
      } else if (noteData.pitch && noteData.pitch.length > 0) {
        // NOTE
        const pitchData = noteData.pitch[0];
        const step = pitchData.step?.[0] || 'C';
        const octave = parseInt(pitchData.octave?.[0] || '4');
        const alter = pitchData.alter;
        const type = noteData.type?.[0] || 'quarter';
        const duration = getNoteDuration(type);
        const dotted = !!noteData.dot;
        const accidental = getAccidental(alter);

        // Check for explicit accidental element
        let acc = accidental;
        const accEl = noteData.accidental?.[0];
        if (accEl) {
          const accText = typeof accEl === 'string' ? accEl : accEl._ || '';
          if (accText === 'sharp') acc = 'sharp';
          else if (accText === 'flat') acc = 'flat';
          else if (accText === 'natural') acc = 'natural';
        }

        // Accidental sign (before octave sign)
        if (acc) {
          braille += ACCIDENTAL_SIGN_MAP[acc] || '';
        }

        // Octave sign
        if (needsOctaveSign(step, octave, prevPitch, prevOctave)) {
          const octSign = OCTAVE_SIGN_MAP[octave];
          if (octSign) braille += octSign;
        }

        // Note character
        const noteKey = `${step}-${duration}`;
        const noteChar = NOTE_CHAR_MAP[noteKey];
        if (noteChar) braille += noteChar;

        // Augmentation dot
        if (dotted) braille += AUGMENTATION_DOT;

        // Tie
        const tieElements = noteData.tie || [];
        const hasTieStart = tieElements.some((t: any) => t.$?.type === 'start');
        if (hasTieStart) {
          braille += TIE_SIGN;
        }

        // Track for octave decisions
        prevPitch = step;
        prevOctave = octave;

        // Save note for metadata
        allNotes.push({ pitch: step, octave, accidental: acc, duration, dotted });
      }

      // Tuplet end
      if (tupletEl?.$?.type === 'stop' && inTriplet) {
        inTriplet = false;
      }
    }

    // Check for repeat-end or final barline
    for (const bl of barlineElements) {
      const location = bl.$?.location || 'right';
      const repeatDir = bl.repeat?.[0]?.$?.direction;
      const barStyle = bl["bar-style"]?.[0] || '';

      if (location === 'right') {
        if (repeatDir === 'backward') {
          braille += BARLINE_SPACE + BARLINE_REPEAT_END;
        } else if (barStyle === 'light-heavy') {
          braille += BARLINE_SPACE + BARLINE_FINAL;
        }
      }
    }

    firstMeasure = false;
  }

  return {
    title: movementTitle,
    composer,
    notes: allNotes,
    timeSignature,
    key,
    brailleContent: braille.trim(),
    partsInfo,
  };
}

// ─── VALIDATION ───────────────────────────────────────────────────────────────

export async function validateMusicXML(xmlContent: string): Promise<{ valid: boolean; errors: string[] }> {
  const errors: string[] = [];

  try {
    const parsed = await parseStringPromise(xmlContent);

    if (!parsed["score-partwise"]) {
      errors.push("Arquivo não é um MusicXML válido (score-partwise não encontrado)");
    }

    const scorePartwise = parsed["score-partwise"];
    if (!scorePartwise.part || scorePartwise.part.length === 0) {
      errors.push("Nenhuma parte encontrada no arquivo");
    }

    return { valid: errors.length === 0, errors };
  } catch (error) {
    return {
      valid: false,
      errors: [`Erro ao validar MusicXML: ${error instanceof Error ? error.message : "Erro desconhecido"}`],
    };
  }
}

// ─── METADATA EXTRACTION ──────────────────────────────────────────────────────

export async function extractMusicXMLMetadata(xmlContent: string): Promise<{
  title: string;
  composer: string;
  measures: number;
  parts: number;
  partsInfo: { id: string; name: string }[];
}> {
  try {
    const parsed = await parseStringPromise(xmlContent);
    const scorePartwise = parsed["score-partwise"];

    const title = scorePartwise["movement-title"]?.[0] || scorePartwise.work?.[0]?.["work-title"]?.[0] || "Untitled";
    
    let composer = "Unknown";
    const creatorData = scorePartwise.identification?.[0]?.creator?.[0];
    if (typeof creatorData === "string") composer = creatorData;
    else if (creatorData && typeof creatorData === "object" && "_" in creatorData) composer = creatorData._;
    
    const measures = scorePartwise.part?.[0]?.measure?.length || 0;
    const parts = scorePartwise.part?.length || 0;

    const partsInfo: { id: string; name: string }[] = [];
    const partListEl = scorePartwise["part-list"]?.[0]?.["score-part"];
    if (partListEl) {
      for (const sp of partListEl) {
        const id = sp.$?.id || '';
        const name = sp["part-name"]?.[0] || id;
        partsInfo.push({ id, name: typeof name === 'string' ? name : name._ || id });
      }
    }

    return { title, composer, measures, parts, partsInfo };
  } catch (error) {
    return { title: "Unknown", composer: "Unknown", measures: 0, parts: 0, partsInfo: [] };
  }
}

// Re-export for backward compatibility
export { NOTE_CHAR_MAP, OCTAVE_SIGN_MAP, ACCIDENTAL_SIGN_MAP, REST_CHAR_MAP };
export function noteTobraille(note: MusicalNote): string {
  let braille = '';
  const octSign = OCTAVE_SIGN_MAP[note.octave];
  if (octSign) braille += octSign;
  if (note.accidental && note.accidental !== 'doubleSharp' && note.accidental !== 'doubleFlat') {
    const accSign = ACCIDENTAL_SIGN_MAP[note.accidental];
    if (accSign) braille += accSign;
  }
  const key = `${note.pitch}-${note.duration}`;
  const noteChar = NOTE_CHAR_MAP[key];
  if (noteChar) braille += noteChar;
  if (note.dotted) braille += AUGMENTATION_DOT;
  return braille;
}

export function notesToBraille(notes: MusicalNote[], measureIndices?: number[]): string {
  let result = '';
  let prevPitch: string | null = null;
  let prevOctave: number | null = null;
  const measureStartSet = new Set(measureIndices || []);

  for (let i = 0; i < notes.length; i++) {
    const note = notes[i];
    if (i > 0 && measureStartSet.has(i)) {
      result += BARLINE_SPACE;
      prevPitch = null;
      prevOctave = null;
    }

    if (note.accidental && note.accidental !== 'doubleSharp' && note.accidental !== 'doubleFlat') {
      result += ACCIDENTAL_SIGN_MAP[note.accidental] || '';
    }

    if (needsOctaveSign(note.pitch, note.octave, prevPitch, prevOctave)) {
      const octSign = OCTAVE_SIGN_MAP[note.octave];
      if (octSign) result += octSign;
    }

    const key = `${note.pitch}-${note.duration}`;
    const noteChar = NOTE_CHAR_MAP[key];
    if (noteChar) result += noteChar;
    if (note.dotted) result += AUGMENTATION_DOT;

    prevPitch = note.pitch;
    prevOctave = note.octave;
  }

  return result;
}
