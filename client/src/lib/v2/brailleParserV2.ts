/**
 * Braille Music Parser V2 - Pipeline Architecture
 * Implementa os Graus 1, 2 e 3 (Notas, Ritmo, Oitavas) com base estrita
 * nas tabelas fornecidas pelo usuário (Manual Internacional + Dissertação).
 */

import type {
  ParsedElement, ParsedNote, ParsedRest, ParsedTimeSignature, 
  ParsedOctaveMarker, ParseError, ParseResult, NoteName, Duration, DifficultyGrade
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

  // Mínimas / Fusas
  '⠝': { pitch: 'C', duration: 'h', altDuration: '32' },
  '⠕': { pitch: 'D', duration: 'h', altDuration: '32' },
  '⠏': { pitch: 'E', duration: 'h', altDuration: '32' },
  '⠟': { pitch: 'F', duration: 'h', altDuration: '32' },
  '⠗': { pitch: 'G', duration: 'h', altDuration: '32' },
  '⠎': { pitch: 'A', duration: 'h', altDuration: '32' },
  '⠞': { pitch: 'B', duration: 'h', altDuration: '32' },

  // Semibreves / Semicolcheias
  '⠽': { pitch: 'C', duration: 'w', altDuration: '16' },
  '⠵': { pitch: 'D', duration: 'w', altDuration: '16' },
  '⠯': { pitch: 'E', duration: 'w', altDuration: '16' },
  '⠿': { pitch: 'F', duration: 'w', altDuration: '16' },
  '⠷': { pitch: 'G', duration: 'w', altDuration: '16' },
  '⠮': { pitch: 'A', duration: 'w', altDuration: '16' },
  '⠾': { pitch: 'B', duration: 'w', altDuration: '16' },
};

/**
 * Parser principal - implementa pipeline de transformação
 */
export function parseBrailleMusicV2(input: string): ParseResult {
  const elements: ParsedElement[] = [];
  const errors: ParseError[] = [];
  let maxGrade: DifficultyGrade = 1;

  // TODO: Implementar pipeline completo
  // 1. Tokenizar
  // 2. Parsear estrutura
  // 3. Parsear notas
  // 4. Resolver ambiguidades
  // 5. Validar

  return {
    measures: [elements],
    maxGrade,
    errors,
  };
}

/**
 * Função auxiliar para parsing (será expandida)
 */
export function parseNoteFromBraille(char: string, index: number): ParsedNote | ParseError {
  const noteInfo = NOTE_MAP[char];
  
  if (!noteInfo) {
    return {
      type: 'error',
      message: `Caractere Braille desconhecido: ${char}`,
      sourceIndex: index,
    };
  }

  return {
    type: 'note',
    pitch: noteInfo.pitch,
    duration: noteInfo.duration,
    sourceIndex: index,
    grade: 1,
  };
}
