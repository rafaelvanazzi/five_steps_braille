/**
 * Braille Music Model V2
 * Baseado na dissertação de Vanazzi de Souza (2014) e no Manual Internacional (2004).
 * Cada elemento carrega metadados sobre seu grau de dificuldade (1-5).
 */

export type DifficultyGrade = 1 | 2 | 3 | 4 | 5;
export type NoteName = 'C' | 'D' | 'E' | 'F' | 'G' | 'A' | 'B';
export type Duration = 'w' | 'h' | 'q' | '8' | '16' | '32' | '64' | '128';

export interface ParsedNote {
  type: 'note';
  pitch: NoteName;
  duration: Duration;
  octave?: number;
  sourceIndex: number;
  grade: DifficultyGrade;
}

export interface ParsedRest {
  type: 'rest';
  duration: Duration;
  sourceIndex: number;
  grade: DifficultyGrade;
}

export interface ParsedTimeSignature {
  type: 'timesig';
  numerator: number;
  denominator: number;
  sourceIndex: number;
  grade: DifficultyGrade;
}

export interface ParsedOctaveMarker {
  type: 'octave';
  octave: number;
  sourceIndex: number;
  grade: DifficultyGrade;
}

export interface ParseError {
  type: 'error';
  message: string;
  sourceIndex: number;
}

export type ParsedElement = ParsedNote | ParsedRest | ParsedTimeSignature | ParsedOctaveMarker | ParseError;

export interface ParseResult {
  measures: ParsedElement[][];
  maxGrade: DifficultyGrade;
  errors: ParseError[];
}

// Helper functions
export function durationToBeats(duration: Duration): number {
  const beatMap: Record<Duration, number> = {
    'w': 4,
    'h': 2,
    'q': 1,
    '8': 0.5,
    '16': 0.25,
    '32': 0.125,
    '64': 0.0625,
    '128': 0.03125,
  };
  return beatMap[duration] || 1;
}

export function getGradeDescription(grade: DifficultyGrade): string {
  const descriptions: Record<DifficultyGrade, string> = {
    1: 'Notas e Ritmo Básico',
    2: 'Oitavas e Alterações',
    3: 'Intervalos e Acordes',
    4: 'Polifonia Simples',
    5: 'Polifonia Complexa',
  };
  return descriptions[grade];
}

export function getCognitiveChallengesForGrade(grade: DifficultyGrade): string[] {
  const challenges: Record<DifficultyGrade, string[]> = {
    1: ['Memorizar caracteres Braille', 'Reconhecer durações'],
    2: ['Entender oitavas', 'Aplicar alterações'],
    3: ['Identificar intervalos', 'Construir acordes'],
    4: ['Seguir múltiplas vozes', 'Coordenar ritmos'],
    5: ['Análise harmônica complexa', 'Interpretação polifônica'],
  };
  return challenges[grade];
}
