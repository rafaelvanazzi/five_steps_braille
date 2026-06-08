/**
 * Braille Music Parser V2 - Pipeline Architecture
 * Implementa os Graus 1 a 5 com base estrita nas tabelas validadas.
 */

import {
  ParsedElement, ParsedNote, ParsedRest, ParsedTimeSignature, 
  ParsedBarline, ParsedOctaveMarker, ParsedInterval, ParsedChord,
  ParsedSlur, ParsedPhrasingSlur, ParseError, ParseResult, 
  NoteName, Duration, Accidental, durationToBeats, getCognitiveChallengesForGrade, DifficultyGrade
} from './brailleModelV2';

// ─── MAPEAMENTOS EXATOS (Caracteres Braille Literais) ────────────────────────

const NOTE_MAP: Record<string, { pitch: NoteName; duration: Duration; altDuration: Duration }> = {
  '⠙': { pitch: 'C', duration: '8', altDuration: '128' }, '⠑': { pitch: 'D', duration: '8', altDuration: '128' },
  '⠋': { pitch: 'E', duration: '8', altDuration: '128' }, '⠛': { pitch: 'F', duration: '8', altDuration: '128' },
  '⠓': { pitch: 'G', duration: '8', altDuration: '128' }, '⠊': { pitch: 'A', duration: '8', altDuration: '128' },
  '⠚': { pitch: 'B', duration: '8', altDuration: '128' },
  '⠹': { pitch: 'C', duration: 'q', altDuration: '64' },  '⠱': { pitch: 'D', duration: 'q', altDuration: '64' },
  '⠫': { pitch: 'E', duration: 'q', altDuration: '64' },  '⠻': { pitch: 'F', duration: 'q', altDuration: '64' },
  '⠳': { pitch: 'G', duration: 'q', altDuration: '64' },  '⠪': { pitch: 'A', duration: 'q', altDuration: '64' },
  '⠺': { pitch: 'B', duration: 'q', altDuration: '64' },
  '⠝': { pitch: 'C', duration: 'h', altDuration: '32' },  '⠕': { pitch: 'D', duration: 'h', altDuration: '32' },
  '⠏': { pitch: 'E', duration: 'h', altDuration: '32' },  '⠟': { pitch: 'F', duration: 'h', altDuration: '32' },
  '⠗': { pitch: 'G', duration: 'h', altDuration: '32' },  '⠎': { pitch: 'A', duration: 'h', altDuration: '32' },
  '⠞': { pitch: 'B', duration: 'h', altDuration: '32' },
  '⠽': { pitch: 'C', duration: 'w', altDuration: '16' },  '⠵': { pitch: 'D', duration: 'w', altDuration: '16' },
  '⠯': { pitch: 'E', duration: 'w', altDuration: '16' },  '⠿': { pitch: 'F', duration: 'w', altDuration: '16' },
  '⠷': { pitch: 'G', duration: 'w', altDuration: '16' },  '⠮': { pitch: 'A', duration: 'w', altDuration: '16' },
  '⠾': { pitch: 'B', duration: 'w', altDuration: '16' },
};

const REST_MAP: Record<string, { duration: Duration; altDuration: Duration }> = {
  '⠭': { duration: '8', altDuration: '128' },
  '⠧': { duration: 'q', altDuration: '64' },
  '⠥': { duration: 'h', altDuration: '32' },
  '⠍': { duration: 'w', altDuration: '16' },
};

const OCTAVE_MAP: Record<string, number> = {
  '⠈⠈': 0, '⠈': 1, '⠘': 2, '⠸': 3, '⠐': 4, '⠨': 5, '⠰': 6, '⠠': 7, '⠠⠠': 8,
};

const ACCIDENTAL_MAP: Record<string, Accidental> = {
  '⠩': 'sharp', '⠣': 'flat', '⠡': 'natural', '⠩⠩': 'sharp', '⠣⠣': 'flat',
};

const NUMERATOR_MAP: Record<string, string> = {
  '⠁': '1', '⠃': '2', '⠉': '3', '⠙': '4', '⠑': '5', '⠋': '6', '⠛': '7', '⠓': '8', '⠊': '9', '⠚': '0',
};

const DENOMINATOR_MAP: Record<string, string> = {
  '⠂': '1', '⠆': '2', '⠒': '3', '⠲': '4', '⠢': '5', '⠖': '6', '⠶': '7', '⠦': '8', '⠔': '9', '⠴': '0',
};

const INTERVAL_MAP: Record<string, 2 | 3 | 4 | 5 | 6 | 7 | 8> = {
  '⠌': 2, '⠬': 3, '⠼': 4, '⠔': 5, '⠴': 6, '⠒': 7, '⠤': 8,
};

const BARLINE_MAP: Record<string, string> = {
  ' ': 'single',
  '⠅': 'dashed',
  '⠣⠅': 'end',
  '⠣⠅⠄': 'end-section',
  '⠣⠶': 'repeat-begin',
  '⠣⠆': 'repeat-end',
};

const LIGADURA_EXPRESSAO = '⠉';
const LIGADURA_FRASEIO_INICIO = '⠰⠃';
const LIGADURA_FRASEIO_FIM = '⠘⠆';

// ─── LÓGICA DA REGRA DE USO DAS OITAVAS ──────────────────────────────────────

function getDiatonicInterval(pitch1: NoteName, pitch2: NoteName): number {
  const order: NoteName[] = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
  const i1 = order.indexOf(pitch1);
  const i2 = order.indexOf(pitch2);
  let interval = i2 - i1 + 1;
  if (interval <= 0) interval += 7;
  return interval;
}

function applyOctaveRule(interval: number, currentOctave: number, lastPitch: NoteName, nextPitch: NoteName): number {
  if (interval === 2 || interval === 3) return currentOctave;
  if (interval === 4 || interval === 5) {
    const order: NoteName[] = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
    const i1 = order.indexOf(lastPitch);
    const i2 = order.indexOf(nextPitch);
    if ((i1 > i2 && i1 === 6 && i2 === 0) || (i1 < i2 && i1 === 0 && i2 === 6)) {
      return currentOctave + (i1 > i2 ? 1 : -1);
    }
    return currentOctave;
  }
  if (interval === 6 || interval === 7) {
    const order: NoteName[] = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
    const i1 = order.indexOf(lastPitch);
    const i2 = order.indexOf(nextPitch);
    return currentOctave + (i1 > i2 ? 1 : -1);
  }
  return currentOctave;
}

// ─── PIPELINE DO PARSER ──────────────────────────────────────────────────────

export function parseBrailleMusic(input: string): ParseResult {
  const tokens = input.split(/[\s\n]+/).filter(t => t.length > 0);
  const elements: ParsedElement[] = [];
  const errors: ParseError[] = [];
  
  let currentOctave = 4;
  let lastPitch: NoteName | null = null;
  let beatsPerMeasure = 4;
  let beatsUsedInMeasure = 0;

  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];
    const sourceIndex = input.indexOf(token);

    // 1. Compasso (Grau 2)
    if (token.length === 3 && NUMERATOR_MAP[token[1]] && DENOMINATOR_MAP[token[2]]) {
      const num = parseInt(NUMERATOR_MAP[token[1]], 10);
      const den = parseInt(DENOMINATOR_MAP[token[2]], 10);
      elements.push({
        type: 'timesignature', numerator: num, denominator: den, sourceIndex, grade: 2,
        cognitiveChallenges: getCognitiveChallengesForGrade(2)
      });
      beatsPerMeasure = num;
      beatsUsedInMeasure = 0;
      continue;
    }

    // 2. Oitava (Grau 3)
    if (OCTAVE_MAP[token] !== undefined) {
      currentOctave = OCTAVE_MAP[token];
      elements.push({
        type: 'octave', octave: currentOctave, sourceIndex, grade: 3,
        cognitiveChallenges: getCognitiveChallengesForGrade(3)
      });
      continue;
    }

    // 3. Barras de Compasso (Grau 2)
    if (BARLINE_MAP[token]) {
      elements.push({
        type: 'barline', barlineType: BARLINE_MAP[token] as any, sourceIndex, grade: 2,
        cognitiveChallenges: getCognitiveChallengesForGrade(2)
      });
      beatsUsedInMeasure = 0;
      continue;
    }

    // 4. Ligaduras (Grau 5)
    if (token === LIGADURA_EXPRESSAO) {
      elements.push({ type: 'slur', sourceIndex, grade: 5, cognitiveChallenges: getCognitiveChallengesForGrade(5) });
      continue;
    }
    if (token === LIGADURA_FRASEIO_INICIO) {
      elements.push({ type: 'phrasing-slur', position: 'start', sourceIndex, grade: 5, cognitiveChallenges: getCognitiveChallengesForGrade(5) });
      continue;
    }
    if (token === LIGADURA_FRASEIO_FIM) {
      elements.push({ type: 'phrasing-slur', position: 'end', sourceIndex, grade: 5, cognitiveChallenges: getCognitiveChallengesForGrade(5) });
      continue;
    }

    // 5. Notas (Graus 1, 2, 3)
    const noteInfo = NOTE_MAP[token];
    if (noteInfo) {
      let duration = noteInfo.duration;
      const primaryBeats = durationToBeats(noteInfo.duration, false);
      const altBeats = durationToBeats(noteInfo.altDuration, false);
      
      if (beatsUsedInMeasure + primaryBeats > beatsPerMeasure && beatsUsedInMeasure + altBeats <= beatsPerMeasure) {
        duration = noteInfo.altDuration;
      }

      let finalOctave = currentOctave;
      if (lastPitch !== null) {
        const interval = getDiatonicInterval(lastPitch, noteInfo.pitch);
        finalOctave = applyOctaveRule(interval, currentOctave, lastPitch, noteInfo.pitch);
      }
      
      currentOctave = finalOctave;
      lastPitch = noteInfo.pitch;
      beatsUsedInMeasure += durationToBeats(duration, false);

      elements.push({
        type: 'note', pitch: noteInfo.pitch, octave: finalOctave, duration, dotted: false, sourceIndex, grade: 3,
        cognitiveChallenges: getCognitiveChallengesForGrade(3)
      });
      continue;
    }

    // 6. Pausas (Grau 2)
    const restInfo = REST_MAP[token];
    if (restInfo) {
      let duration = restInfo.duration;
      const primaryBeats = durationToBeats(restInfo.duration, false);
      const altBeats = durationToBeats(restInfo.altDuration, false);
      
      if (beatsUsedInMeasure + primaryBeats > beatsPerMeasure && beatsUsedInMeasure + altBeats <= beatsPerMeasure) {
        duration = restInfo.altDuration;
      }
      
      beatsUsedInMeasure += durationToBeats(duration, false);
      lastPitch = null;

      elements.push({
        type: 'rest', duration, dotted: false, sourceIndex, grade: 2,
        cognitiveChallenges: getCognitiveChallengesForGrade(2)
      });
      continue;
    }

    // 7. Intervalos (Grau 4)
    if (INTERVAL_MAP[token] !== undefined) {
      elements.push({
        type: 'interval', intervalSize: INTERVAL_MAP[token], sourceIndex, grade: 4,
        cognitiveChallenges: getCognitiveChallengesForGrade(4)
      });
      continue;
    }

    // 8. Erros
    if (token.length > 0 && !token.match(/^[\s\n]+$/)) {
      errors.push({ type: 'error', message: `Símbolo não reconhecido: "${token}"`, sourceIndex, grade: 1 });
    }
  }

  return {
    measures: [{ elements, maxGrade: 5 }],
    maxGrade: 5,
    errors,
    stats: {
      noteCount: elements.filter(e => e.type === 'note').length,
      restCount: elements.filter(e => e.type === 'rest').length,
      measureCount: 1,
      grades: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
    }
  };
}
