/**
 * Braille Music Model V2
 * Baseado na dissertação de Vanazzi de Souza (2014) e no Manual Internacional (2004).
 * Cada elemento carrega metadados sobre seu grau de difficulty (1-5).
 */

export type NoteName = 'C' | 'D' | 'E' | 'F' | 'G' | 'A' | 'B';
export type Duration = 'w' | 'h' | 'q' | '8' | '16' | '32' | '64' | '128';
export type Accidental = 'sharp' | 'flat' | 'natural';
export type DifficultyGrade = 1 | 2 | 3 | 4 | 5;
export type BarlineType = 'single' | 'dashed' | 'end' | 'end-section' | 'repeat-begin' | 'repeat-end';

export interface ParsedNote {
  type: 'note';
  pitch: NoteName;
  octave: number;
  duration: Duration;
  dotted: boolean;
  accidental?: Accidental;
  sourceIndex: number;
  grade: DifficultyGrade;
  cognitiveChallenges: string[];
}

export interface ParsedRest {
  type: 'rest';
  duration: Duration;
  dotted: boolean;
  sourceIndex: number;
  grade: DifficultyGrade;
  cognitiveChallenges: string[];
}

export interface ParsedBarline {
  type: 'barline';
  barlineType: BarlineType;
  sourceIndex: number;
  grade: 2;
  cognitiveChallenges: string[];
}

export interface ParsedTimeSignature {
  type: 'timesignature';
  numerator: number;
  denominator: number;
  sourceIndex: number;
  grade: 2;
  cognitiveChallenges: string[];
}

export interface ParsedOctaveMarker {
  type: 'octave';
  octave: number;
  sourceIndex: number;
  grade: 3;
  cognitiveChallenges: string[];
}

export interface ParsedInterval {
  type: 'interval';
  intervalSize: 2 | 3 | 4 | 5 | 6 | 7 | 8;
  sourceIndex: number;
  grade: 4;
  cognitiveChallenges: string[];
}

export interface ParsedChord {
  type: 'chord';
  baseNote: ParsedNote;
  intervals: ParsedInterval[];
  sourceIndex: number;
  grade: 4;
  cognitiveChallenges: string[];
}

export interface ParsedSlur {
  type: 'slur';
  sourceIndex: number;
  grade: 5;
  cognitiveChallenges: string[];
}

export interface ParsedPhrasingSlur {
  type: 'phrasing-slur';
  position: 'start' | 'end';
  sourceIndex: number;
  grade: 5;
  cognitiveChallenges: string[];
}

export interface ParseError {
  type: 'error';
  message: string;
  sourceIndex: number;
  grade?: DifficultyGrade;
}

export type ParsedElement = 
  | ParsedNote 
  | ParsedRest 
  | ParsedBarline 
  | ParsedTimeSignature 
  | ParsedOctaveMarker
  | ParsedInterval
  | ParsedChord
  | ParsedSlur
  | ParsedPhrasingSlur
  | ParseError;

export interface ParsedMeasure {
  elements: ParsedElement[];
  timeSignature?: { numerator: number; denominator: number };
  maxGrade: DifficultyGrade;
}

export interface ParseResult {
  measures: ParsedMeasure[];
  maxGrade: DifficultyGrade;
  errors: ParseError[];
  stats: {
    noteCount: number;
    restCount: number;
    measureCount: number;
    grades: Record<DifficultyGrade, number>;
  };
}

export interface ParseOptions {
  defaultBeatsPerMeasure?: number;
  defaultOctave?: number;
}

export function durationToBeats(duration: Duration, dotted: boolean = false): number {
  const beats: Record<Duration, number> = {
    'w': 4, 'h': 2, 'q': 1, '8': 0.5, '16': 0.25, '32': 0.125, '64': 0.0625, '128': 0.03125,
  };
  let result = beats[duration];
  if (dotted) result *= 1.5;
  return result;
}

export function getGradeDescription(grade: DifficultyGrade): string {
  const descriptions: Record<DifficultyGrade, string> = {
    1: 'Notas e alturas (sem valor de tempo)',
    2: 'Valores de tempo, compasso e agrupamentos',
    3: 'Oitavas e Regra de Uso das Oitavas',
    4: 'Acordes (tríades, tétrades, inversões)',
    5: 'Vozes simultâneas, ligaduras e polifonia',
  };
  return descriptions[grade];
}

export function getCognitiveChallengesForGrade(grade: DifficultyGrade): string[] {
  const challenges: Record<DifficultyGrade, string[]> = {
    1: ['Reconhecer a cela braille da nota', 'Perceber se a melodia sobe ou desce'],
    2: ['Reconhecer o valor de tempo (pontos 3 e 6)', 'Contar unidades de tempo no compasso', 'Perceber agrupamentos rítmicos'],
    3: ['Contar intervalos diatônicos entre notas', 'Aplicar a Regra de Uso das Oitavas', 'Memorizar a última nota e sua oitava'],
    4: ['Montar acordes a partir de intervalos', 'Respeitar a armadura de clave nos intervalos', 'Contar intervalos diatônicos ascendentes/descendentes'],
    5: ['Relacionar duas vozes lidas consecutivamente', 'Construir percepção bidimensional da música', 'Memorizar frases musicais completas'],
  };
  return challenges[grade];
}

export function durationToVexFlow(duration: Duration): string {
  const map: Record<Duration, string> = {
    'w': 'w', 'h': 'h', 'q': 'q', '8': '8', '16': '16', '32': '32', '64': '64', '128': '128',
  };
  return map[duration];
}
