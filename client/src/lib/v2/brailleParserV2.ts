/**
 * Braille Music Parser V2 - Pipeline Architecture
 * Implementa os Graus 1, 2 e 3 (Notas, Ritmo, Oitavas) com base estrita
 * nas tabelas fornecidas pelo usuário (Manual Internacional + Dissertação).
 */

import {
  ParsedElement, ParsedNote, ParsedRest, ParsedTimeSignature, 
  ParsedOctaveMarker, ParseError, ParseResult, NoteName, Duration,
  durationToBeats, getGradeDescription, getCognitiveChallengesForGrade
} from './brailleModelV2';

// ─── TABELAS DE MAPEAMENTO (Usando caracteres Braille literais para 100% de precisão) ───

const NOTE_MAP: Record<string, { pitch: NoteName; duration: Duration; altDuration: Duration }> = {
  // Colcheias / Quartifusas
  '⠙': { pitch: 'C', duration: '8', altDuration: '128' },
  '⠑': { pitch: 'D', duration: '8', altDuration: '128' },
  '⠋': { pitch: 'E', duration: '8', altDuration: '128' },
  '⠛': { pitch: 'F', duration: '8', altDuration: '128' },
  '⠓': { pitch: 'G', duration: '8', altDuration: '128' },
  '⠊': { pitch: 'A', duration: '8', altDuration: '128' },
  '⠚': { pitch: 'B', duration: '8', altDuration: '128' },

  // Semínimas / Semifusas
  '⠹': { pitch: 'C', duration: 'q', altDuration: '64' },
  '⠱': { pitch: 'D', duration: 'q', altDuration: '64' },
  '⠫': { pitch: 'E', duration: 'q', altDuration: '64' },
  '⠻': { pitch: 'F', duration: 'q', altDuration: '64' },
  '⠳': { pitch: 'G', duration: 'q', altDuration: '64' },
  '⠪': { pitch: 'A', duration: 'q', altDuration: '64' },
  '⠺': { pitch: 'B', duration: 'q', altDuration: '64' },

  // Mínimas / Fusas (Conforme caracteres exatos fornecidos)
  '⠝': { pitch: 'C', duration: 'h', altDuration: '32' },
  '⠕': { pitch: 'D', duration: 'h', altDuration: '32' },
  '⠏': { pitch: 'E', duration: 'h', altDuration: '32' },
  '⠟': { pitch: 'F', duration: 'h', altDuration: '32' },
  '⠗': { pitch: 'G', duration: 'h', altDuration: '32' },
  '⠎': { pitch: 'A', duration: 'h', altDuration: '32' },
  '⠞': { pitch: 'B', duration: 'h', altDuration: '32' },

  // Semibreves / Semicolcheias (Conforme caracteres exatos fornecidos)
  '⠽': { pitch: 'C', duration: 'w', altDuration: '16' },
  '⠵': { pitch: 'D', duration: 'w', altDuration: '16' },
  '⠯': { pitch: 'E', duration: 'w', altDuration: '16' },
  '⠿': { pitch: 'F', duration: 'w', altDuration: '16' },
  '⠷': { pitch: 'G', duration: 'w', altDuration: '16' },
  '⠮': { pitch: 'A', duration: 'w', altDuration: '16' },
  '⠾': { pitch: 'B', duration: 'w', altDuration: '16' },
};

const REST_MAP: Record<string, { duration: Duration; altDuration: Duration }> = {
  '⠭': { duration: '8', altDuration: '128' },  // Colcheia
  '⠧': { duration: 'q', altDuration: '64' },   // Semínima
  '⠥': { duration: 'h', altDuration: '32' },   // Mínima
  '⠍': { duration: 'w', altDuration: '16' },   // Semibreve
};

const OCTAVE_MAP: Record<string, number> = {
  '⠈⠈': 0,  // Abaixo da 1ª
  '⠈': 1,   // 1ª
  '⠘': 2,   // 2ª
  '⠸': 3,   // 3ª
  '⠐': 4,   // 4ª (Central)
  '⠨': 5,   // 5ª
  '⠰': 6,   // 6ª
  '⠠': 7,   // 7ª
  '⠠⠠': 8,  // Acima da 7ª
};

// Dígitos Padrão (Numerador do Compasso)
const DIGIT_MAP: Record<string, string> = {
  '⠁': '1', '⠃': '2', '⠉': '3', '⠙': '4',
  '⠑': '5', '⠋': '6', '⠛': '7', '⠓': '8',
  '⠊': '9', '⠚': '0',
};

// Dígitos Rebaixados (Denominador do Compasso - Unidade de Tempo)
const LOWERED_DIGIT_MAP: Record<string, string> = {
  '⠂': '1', '⠆': '2', '⠒': '3', '⠲': '4',
  '⠢': '5', '⠖': '6', '⠶': '7', '⠦': '8',
  '⠔': '9', '⠴': '0',
};

const NUMBER_SIGN = '⠼';

// ─── FUNÇÕES AUXILIARES DA REGRA DE OITAVAS (Grau 3) ───────────────────────────────

function getDiatonicInterval(pitch1: NoteName, pitch2: NoteName): number {
  const order: NoteName[] = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
  const i1 = order.indexOf(pitch1);
  const i2 = order.indexOf(pitch2);
  let interval = i2 - i1 + 1;
  if (interval <= 0) interval += 7;
  return interval;
}

function applyOctaveRule(interval: number, currentOctave: number, lastPitch: NoteName, nextPitch: NoteName): number {
  // Regra 1: 2ª e 3ª -> Nunca muda oitava implicitamente
  if (interval === 2 || interval === 3) {
    return currentOctave;
  }
  // Regra 2: 4ª e 5ª -> Muda apenas se cruzar a fronteira da oitava (ex: B para C)
  if (interval === 4 || interval === 5) {
    const order: NoteName[] = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
    const i1 = order.indexOf(lastPitch);
    const i2 = order.indexOf(nextPitch);
    if ((i1 > i2 && i1 === 6 && i2 === 0) || (i1 < i2 && i1 === 0 && i2 === 6)) {
      return currentOctave + (i1 > i2 ? 1 : -1);
    }
    return currentOctave;
  }
  // Regra 3: 6ª e 7ª -> Sempre muda oitava (ou deveria ter sinal explícito)
  if (interval === 6 || interval === 7) {
    const order: NoteName[] = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
    const i1 = order.indexOf(lastPitch);
    const i2 = order.indexOf(nextPitch);
    return currentOctave + (i1 > i2 ? 1 : -1);
  }
  
  return currentOctave;
}

// ─── PIPELINE DO PARSER ──────────────────────────────────────────────────────────────

export function parseBrailleMusic(input: string): ParseResult {
  // 1. Tokenização (separa por espaços e quebras de linha)
  const tokens = input.split(/[\s\n]+/).filter(t => t.length > 0);
  
  const elements: ParsedElement[] = [];
  const errors: ParseError[] = [];
  
  let currentOctave = 4; // Padrão inicial (4ª oitava)
  let lastPitch: NoteName | null = null;
  let beatsPerMeasure = 4; // Padrão 4/4
  let beatsUsedInMeasure = 0;

  // 2. Processamento Sequencial (Pipeline)
  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];
    const sourceIndex = input.indexOf(token); // Simplificado para demo

    // A) Compasso (Grau 2): Sinal de número + dígito + dígito rebaixado (3 células)
    if (token.startsWith(NUMBER_SIGN) && token.length === 3) {
      const numChar = token[1];
      const denChar = token[2];
      const numStr = DIGIT_MAP[numChar];
      const denStr = LOWERED_DIGIT_MAP[denChar];

      if (numStr && denStr) {
        const num = parseInt(numStr, 10);
        const den = parseInt(denStr, 10);
        
        elements.push({
          type: 'timesignature',
          numerator: num,
          denominator: den,
          sourceIndex,
          grade: 2,
          cognitiveChallenges: getCognitiveChallengesForGrade(2)
        });
        beatsPerMeasure = num;
        beatsUsedInMeasure = 0; // Reseta contagem do compasso
        continue;
        // Obs: A nota seguinte a um compasso deve ter oitava, mas isso é tratado no fluxo normal ou por regra de formatação.
      }
    }

    // B) Oitava (Grau 3)
    if (OCTAVE_MAP[token] !== undefined) {
      currentOctave = OCTAVE_MAP[token];
      elements.push({
        type: 'octave',
        octave: currentOctave,
        sourceIndex,
        grade: 3,
        cognitiveChallenges: getCognitiveChallengesForGrade(3)
      });
      continue;
    }

    // C) Notas (Graus 1, 2, 3)
    const noteInfo = NOTE_MAP[token];
    if (noteInfo) {
      // Grau 2: Desambiguação de Duração
      let duration = noteInfo.duration;
      const primaryBeats = durationToBeats(noteInfo.duration, false);
      const altBeats = durationToBeats(noteInfo.altDuration, false);
      
      if (beatsUsedInMeasure + primaryBeats > beatsPerMeasure && beatsUsedInMeasure + altBeats <= beatsPerMeasure) {
        duration = noteInfo.altDuration;
      }

      // Grau 3: Regra de Uso das Oitavas
      let finalOctave = currentOctave;
      if (lastPitch !== null) {
        const interval = getDiatonicInterval(lastPitch, noteInfo.pitch);
        finalOctave = applyOctaveRule(interval, currentOctave, lastPitch, noteInfo.pitch);
      }
      
      currentOctave = finalOctave;
      lastPitch = noteInfo.pitch;
      beatsUsedInMeasure += durationToBeats(duration, false);

      elements.push({
        type: 'note',
        pitch: noteInfo.pitch,
        octave: finalOctave,
        duration,
        dotted: false, // Simplificado para V2 inicial
        sourceIndex,
        grade: 3, // Nota com oitava é classificada como Grau 3
        cognitiveChallenges: [
          'Reconhecer cela da nota (Grau 1)', 
          'Reconhecer valor de tempo (Grau 2)', 
          `Aplicar Regra de Oitavas: intervalo de ${getDiatonicInterval(lastPitch || noteInfo.pitch, noteInfo.pitch)}ª (Grau 3)`
        ]
      });
      continue;
    }

    // D) Pausas (Grau 2)
    const restInfo = REST_MAP[token];
    if (restInfo) {
      let duration = restInfo.duration;
      const primaryBeats = durationToBeats(restInfo.duration, false);
      const altBeats = durationToBeats(restInfo.altDuration, false);
      
      if (beatsUsedInMeasure + primaryBeats > beatsPerMeasure && beatsUsedInMeasure + altBeats <= beatsPerMeasure) {
        duration = restInfo.altDuration;
      }
      
      beatsUsedInMeasure += durationToBeats(duration, false);
      lastPitch = null; // Pausa quebra a sequência de oitavas

      elements.push({
        type: 'rest',
        duration,
        dotted: false,
        sourceIndex,
        grade: 2,
        cognitiveChallenges: getCognitiveChallengesForGrade(2)
      });
      continue;
    }

    // E) Tratamento de tokens desconhecidos (Erros)
    if (token.length > 0 && !token.match(/^[\s\n]+$/)) {
      // Ignora espaços em branco isolados que são barras de compasso implícitas
      if (token === ' ') continue;
      
      errors.push({
        type: 'error',
        message: `Símbolo não reconhecido: "${token}"`,
        sourceIndex,
        grade: 1
      });
    }
  }

  // Agrupamento simplificado em um único compasso para a V2 inicial
  // (A lógica de múltiplos compassos por espaço em branco será refinada na V2.1)
  return {
    measures: [{ 
      elements, 
      timeSignature: beatsPerMeasure === 4 ? { numerator: 4, denominator: 4 } : undefined,
      maxGrade: 3 
    }],
    maxGrade: 3,
    errors,
    stats: {
      noteCount: elements.filter(e => e.type === 'note').length,
      restCount: elements.filter(e => e.type === 'rest').length,
      measureCount: 1,
      grades: { 1: 0, 2: 0, 3: elements.filter(e => e.grade === 3).length, 4: 0, 5: 0 }
    }
  };
}
