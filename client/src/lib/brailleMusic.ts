/**
 * Braille Music Parser — Versão Corrigida
 *
 * Baseado exclusivamente em:
 *  - TABELA_BRAILLE_corrigida.odt  (Rafael Vanazzi, revisão manual)
 *  - TABELA_BRAILLE_corrigida_2-_em_acorde.odt
 *  - Novo Manual Internacional de Musicografia Braille (2004)
 *  - Dissertação de Mestrado: "Particularidades da Musicografia Braille" (Vanazzi, 2014)
 *
 * CORREÇÕES APLICADAS em relação à versão anterior:
 *  1. REST_MAP completamente refeito (células corretas)
 *  2. INTERVAL_MAP corrigido (evita colisão com ponto de aumento)
 *  3. BARLINE_MAP corrigido (espaço = barra simples; ⠣⠅ = barra final)
 *  4. TIME_SIGNATURE_MAP corrigido (3/4, 2/4, 6/8, etc.)
 *  5. AUGMENTATION_DOT desambiguado de NOTE_TIE
 *  6. Em acorde total (⠣⠜) e parcial (⠐⠂) adicionados
 *  7. Claves adicionadas (Sol e Fá)
 *  8. Metadados de grau pedagógico (dissertação) em cada elemento
 */

// ─── TIPOS BASE ────────────────────────────────────────────────────────────────

type NoteName = 'C' | 'D' | 'E' | 'F' | 'G' | 'A' | 'B';
type Duration = 'w' | 'h' | 'q' | '8' | '16' | '32' | '64' | '128';
export type Accidental = 'sharp' | 'flat' | 'natural' | 'double-sharp' | 'double-flat';

// Graus pedagógicos (dissertação Vanazzi 2014)
export type PedagogicGrade = 1 | 2 | 3 | 4 | 5;

interface NoteInfo {
  pitch: NoteName;
  duration: Duration;    // valor primário (ex: colcheia)
  altDuration: Duration; // valor alternativo (ex: quartifusa)
}

// ─── REGISTRO DE NOTAS ─────────────────────────────────────────────────────────
// Fonte: Tabela 1A do Manual / TABELA_BRAILLE_corrigida.odt
// Colcheias (8) e Quartifusas (128) — pontos de nota sem 3 e sem 6
const NOTE_MAP: Record<string, NoteInfo> = {
  '\u2819': { pitch: 'C', duration: '8',  altDuration: '128' }, // ⠙ (1,4,5)
  '\u2811': { pitch: 'D', duration: '8',  altDuration: '128' }, // ⠑ (1,5)
  '\u280B': { pitch: 'E', duration: '8',  altDuration: '128' }, // ⠋ (1,2,4)
  '\u281B': { pitch: 'F', duration: '8',  altDuration: '128' }, // ⠛ (1,2,4,5)
  '\u2813': { pitch: 'G', duration: '8',  altDuration: '128' }, // ⠓ (1,2,5)
  '\u280A': { pitch: 'A', duration: '8',  altDuration: '128' }, // ⠊ (2,4)
  '\u281A': { pitch: 'B', duration: '8',  altDuration: '128' }, // ⠚ (2,4,5)

  // Semínimas (q) e Semifusas (64) — acrescenta ponto 6
  '\u2839': { pitch: 'C', duration: 'q',  altDuration: '64'  }, // ⠹ (1,4,5,6)
  '\u2831': { pitch: 'D', duration: 'q',  altDuration: '64'  }, // ⠱ (1,5,6)
  '\u282B': { pitch: 'E', duration: 'q',  altDuration: '64'  }, // ⠫ (1,2,4,6)
  '\u283B': { pitch: 'F', duration: 'q',  altDuration: '64'  }, // ⠻ (1,2,4,5,6)
  '\u2833': { pitch: 'G', duration: 'q',  altDuration: '64'  }, // ⠳ (1,2,5,6)
  '\u282A': { pitch: 'A', duration: 'q',  altDuration: '64'  }, // ⠪ (2,4,6)
  '\u283A': { pitch: 'B', duration: 'q',  altDuration: '64'  }, // ⠺ (2,4,5,6)

  // Mínimas (h) e Fusas (32) — acrescenta ponto 3
  '\u281D': { pitch: 'C', duration: 'h',  altDuration: '32'  }, // ⠝ (1,3,4,5) — Dó mínima
  '\u2815': { pitch: 'D', duration: 'h',  altDuration: '32'  }, // ⠕ (1,3,5)   — Ré mínima
  '\u280F': { pitch: 'E', duration: 'h',  altDuration: '32'  }, // ⠏ (1,2,3,4) — Mi mínima
  '\u281F': { pitch: 'F', duration: 'h',  altDuration: '32'  }, // ⠟ (1,2,3,4,5) — Fá mínima
  '\u2817': { pitch: 'G', duration: 'h',  altDuration: '32'  }, // ⠗ (1,2,3,5) — Sol mínima
  '\u280E': { pitch: 'A', duration: 'h',  altDuration: '32'  }, // ⠎ (2,3,4)   — Lá mínima
  '\u281E': { pitch: 'B', duration: 'h',  altDuration: '32'  }, // ⠞ (2,3,4,5) — Si mínima

  // Semibreves (w) e Semicolcheias (16) — acrescenta pontos 3 e 6
  '\u283D': { pitch: 'C', duration: 'w',  altDuration: '16'  }, // ⠽ (1,3,4,5,6)
  '\u2835': { pitch: 'D', duration: 'w',  altDuration: '16'  }, // ⠵ (1,3,5,6)
  '\u282F': { pitch: 'E', duration: 'w',  altDuration: '16'  }, // ⠯ (1,2,3,4,6)
  '\u283F': { pitch: 'F', duration: 'w',  altDuration: '16'  }, // ⠿ (1,2,3,4,5,6)
  '\u2837': { pitch: 'G', duration: 'w',  altDuration: '16'  }, // ⠷ (1,2,3,5,6)
  '\u282E': { pitch: 'A', duration: 'w',  altDuration: '16'  }, // ⠮ (2,3,4,6)
  '\u283E': { pitch: 'B', duration: 'w',  altDuration: '16'  }, // ⠾ (2,3,4,5,6)
};

// ─── REGISTRO DE PAUSAS ────────────────────────────────────────────────────────
// CORRIGIDO — Fonte: TABELA_BRAILLE_corrigida.odt, seção PAUSAS
const REST_MAP: Record<string, { duration: Duration; altDuration: Duration }> = {
  '\u282D': { duration: '8',  altDuration: '128' }, // ⠭ (1,3,4,6) — pausa colcheia / quartifusa
  '\u2827': { duration: 'q',  altDuration: '64'  }, // ⠧ (1,2,3,6) — pausa semínima / semifusa
  '\u2825': { duration: 'h',  altDuration: '32'  }, // ⠥ (1,3,6)   — pausa mínima / fusa
  '\u280D': { duration: 'w',  altDuration: '16'  }, // ⠍ (1,3,4)   — pausa semibreve / semicolcheia
};
// ATENÇÃO: ⠧ (\u2827) = pausa semínima (pontos 1,2,3,6). ⠾ (\u283E) = Si semibreve (pontos 2,3,4,5,6). Sem conflito.
// Verificação: ⠧ = 0x27 = pontos 1,2,3,6. ⠾ = 0x3E = pontos 2,3,4,5,6. São células DIFERENTES.
// Verificação de bits: ⠧ = 0x27 = 0b100111 = pontos 1,2,3,6 ✓
//                      ⠾ = 0x3E = 0b111110 = pontos 2,3,4,5,6 ✓  — sem conflito

// ─── SINAIS DE OITAVA ──────────────────────────────────────────────────────────
// Fonte: TABELA_BRAILLE_corrigida.odt, seção SINAIS DE OITAVA
const OCTAVE_MAP: Record<string, number> = {
  '\u2808\u2808': 0, // ⠈⠈ (4)+(4) — abaixo da 1ª oitava (cela dupla)
  '\u2808': 1,       // ⠈  (4)     — 1ª oitava
  '\u2818': 2,       // ⠘  (4,5)   — 2ª oitava
  '\u2838': 3,       // ⠸  (4,5,6) — 3ª oitava
  '\u2810': 4,       // ⠐  (5)     — 4ª oitava (dó central)
  '\u2828': 5,       // ⠨  (4,6)   — 5ª oitava
  '\u2830': 6,       // ⠰  (5,6)   — 6ª oitava
  '\u2820': 7,       // ⠠  (6)     — 7ª oitava
  '\u2820\u2820': 8, // ⠠⠠ (6)+(6) — acima da 7ª (cela dupla)
};

// ─── ALTERAÇÕES ────────────────────────────────────────────────────────────────
// Fonte: TABELA_BRAILLE_corrigida.odt, seção Alterações
const ACCIDENTAL_MAP: Record<string, Accidental> = {
  '\u2829': 'sharp',        // ⠩ (1,4,6)       — sustenido
  '\u2823': 'flat',         // ⠣ (1,2,6)        — bemol
  '\u2821': 'natural',      // ⠡ (1,6)           — bequadro
  '\u2829\u2829': 'double-sharp', // ⠩⠩           — dobrado sustenido
  '\u2823\u2823': 'double-flat',  // ⠣⠣            — dobrado bemol
};

// ─── SINAIS DE BARRA DE COMPASSO ───────────────────────────────────────────────
// CORRIGIDO — Fonte: TABELA_BRAILLE_corrigida.odt, seção Barras de Compasso
// Barra simples = ESPAÇO (cela em branco) — tratada diretamente no parser
const BARLINE_TWO_CELL: Record<string, 'end' | 'end-section' | 'dotted' | 'repeat-begin' | 'repeat-end'> = {
  '\u2823\u2805': 'end',         // ⠣⠅ (1,2,6)+(1,3)     — barra final (dupla grossa)
  '\u2823\u2805\u2804': 'end-section', // ⠣⠅⠄               — barra dupla de seção
  '\u2805': 'dotted',            // ⠅ (1,3)               — linha divisória pontilhada
  '\u2823\u2836': 'repeat-begin',// ⠣⠶ (1,2,6)+(2,3,5,6) — ritornelo início
  '\u2823\u2826': 'repeat-end',  // ⠣⠆ (1,2,6)+(2,3)     — ritornelo fim
};

// ─── FÓRMULAS DE COMPASSO ──────────────────────────────────────────────────────
// CORRIGIDO — Fonte: TABELA_BRAILLE_corrigida.odt, seção Compassos
// Formato: ⠼ (sinal de número) + numerador (dígito normal) + denominador (dígito rebaixado)
// Numeradores (dígitos normais braille):
const BRAILLE_NUMERATOR: Record<string, number> = {
  '\u2801': 1,  // ⠁ (1)
  '\u2803': 2,  // ⠃ (1,2)
  '\u2809': 3,  // ⠉ (1,4)
  '\u2819': 4,  // ⠙ (1,4,5)
  '\u2811': 5,  // ⠑ (1,5)
  '\u280B': 6,  // ⠋ (1,2,4)
  '\u281B': 7,  // ⠛ (1,2,4,5)
  '\u2813': 8,  // ⠓ (1,2,5)
  '\u280A': 9,  // ⠊ (2,4)
  '\u281A': 0,  // ⠚ (2,4,5)
};
// Denominadores (dígitos "rebaixados" — pontos 2,3,5,6):
const BRAILLE_DENOMINATOR: Record<string, number> = {
  '\u2802': 1,  // ⠂ (2)
  '\u2806': 2,  // ⠆ (2,3)
  '\u2812': 3,  // ⠒ (2,5)
  '\u2832': 4,  // ⠲ (2,5,6)
  '\u2822': 5,  // ⠢ (2,6)
  '\u2816': 6,  // ⠖ (2,3,5)
  '\u2836': 7,  // ⠶ (2,3,5,6)
  '\u2826': 8,  // ⠦ (2,3,6)
  '\u2814': 9,  // ⠔ (3,5)
  '\u2834': 0,  // ⠴ (3,5,6)
};

// Fórmulas mais comuns pré-computadas para lookup rápido
// C (⠨⠉ = 4,6 + 1,4) e C cortado (⠸⠉ = 4,5,6 + 1,4)
const TIME_SIG_SHORTHAND: Record<string, { numerator: number; denominator: number }> = {
  '\u2828\u2809': { numerator: 4, denominator: 4 }, // ⠨⠉ = C (4/4)
  '\u2838\u2809': { numerator: 2, denominator: 2 }, // ⠸⠉ = C cortado (2/2)
};

const NUMBER_SIGN = '\u283C'; // ⠼ (3,4,5,6) — prefixo numérico

// ─── INTERVALOS (ACORDES) ──────────────────────────────────────────────────────
// CORRIGIDO — Fonte: TABELA_BRAILLE_corrigida.odt, seção Intervalos para Acordes
// IMPORTANTE: ⠼ (3,4,5,6) = intervalo de 4ª MAS TAMBÉM = sinal de número
// O parser deve usar o CONTEXTO para desambiguar: após uma nota = intervalo; no início = número
const INTERVAL_MAP: Record<string, number> = {
  '\u280C': 2, // ⠌ (3,4)     — 2ª
  '\u282C': 3, // ⠬ (3,4,6)   — 3ª
  '\u283C': 4, // ⠼ (3,4,5,6) — 4ª  ← também NUMBER_SIGN (desambiguado por contexto)
  '\u2814': 5, // ⠔ (3,5)     — 5ª
  '\u2834': 6, // ⠴ (3,5,6)   — 6ª
  '\u2812': 7, // ⠒ (2,5)     — 7ª
  '\u2824': 8, // ⠤ (3,6)     — 8ª  ← também PONTO DE AUMENTO (desambiguado por contexto)
};

// ─── OUTROS SÍMBOLOS ────────────────────────────────────────────────────────────
const AUGMENTATION_DOT  = '\u2804'; // ⠄ (3)     — ponto de aumento (CORRIGIDO: era \u2824)
const NOTE_TIE          = '\u2809'; // ⠉ (1,4)   — ligadura de expressão (slur)
                                    // Nota: início de ligadura de fraseio = ⠰⠃, fim = ⠘⠆

// Em acorde
const IN_CHORD_TOTAL    = '\u2823\u281C'; // ⠣⠜ (1,2,6)+(3,4,5) — em acorde total
const IN_CHORD_PARTIAL  = '\u2810\u2802'; // ⠐⠂ (5)+(2)          — em acorde parcial
const CHORD_SEPARATOR   = '\u2828\u2805'; // ⠨⠅ (4,6)+(1,3)      — separador de voz

// Claves — Fonte: TABELA_BRAILLE_corrigida.odt, seção Claves
const CLEF_TREBLE = '\u281C\u280C\u2807'; // ⠜⠌⠇ (3,4,5)+(3,4)+(1,2,3) — clave de sol (2ª linha)
const CLEF_BASS   = '\u281C\u283C\u2807'; // ⠜⠼⠇ (3,4,5)+(3,4,5,6)+(1,2,3) — clave de fá (4ª linha)

// Parte mão direita / mão esquerda (piano)
const RIGHT_HAND  = '\u2828\u281C'; // ⠨⠜ (4,6)+(3,4,5)
const LEFT_HAND   = '\u2838\u281C'; // ⠸⠜ (4,5,6)+(3,4,5)

// Hífen musical (compasso continua na linha seguinte)
const MUSICAL_HYPHEN = '\u2810'; // ⠐ (5) — ATENÇÃO: mesmo que oitava 4 → desambiguar por contexto

// Armadura de clave (chaves comuns)
const OFFICIAL_KEY_SIGNATURE_MAP: Record<string, { vexKey: string; fifths: number }> = {
  '\u2829':                         { vexKey: 'G',  fifths: 1  }, // 1 sustenido
  '\u2829\u2829':                   { vexKey: 'D',  fifths: 2  }, // 2 sustenidos
  '\u2829\u2829\u2829':             { vexKey: 'A',  fifths: 3  }, // 3 sustenidos
  '\u283C\u2819\u2829':             { vexKey: 'E',  fifths: 4  }, // 4 sustenidos (⠼⠙⠩)
  '\u283C\u2811\u2829':             { vexKey: 'B',  fifths: 5  }, // 5 sustenidos
  '\u283C\u280B\u2829':             { vexKey: 'F#', fifths: 6  }, // 6 sustenidos
  '\u283C\u281B\u2829':             { vexKey: 'C#', fifths: 7  }, // 7 sustenidos
  '\u2823':                         { vexKey: 'F',  fifths: -1 }, // 1 bemol
  '\u2823\u2823':                   { vexKey: 'Bb', fifths: -2 }, // 2 bemóis
  '\u2823\u2823\u2823':             { vexKey: 'Eb', fifths: -3 }, // 3 bemóis
  '\u283C\u2819\u2823':             { vexKey: 'Ab', fifths: -4 }, // 4 bemóis
  '\u283C\u2811\u2823':             { vexKey: 'Db', fifths: -5 }, // 5 bemóis
  '\u283C\u280B\u2823':             { vexKey: 'Gb', fifths: -6 }, // 6 bemóis
  '\u283C\u281B\u2823':             { vexKey: 'Cb', fifths: -7 }, // 7 bemóis
};

// ─── TIPOS EXPORTADOS ──────────────────────────────────────────────────────────

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
  grade: PedagogicGrade; // grau pedagógico mínimo para leitura desta nota
}

export interface ParsedRest {
  type: 'rest';
  duration: Duration;
  dotted: boolean;
  vexDuration: string;
  sourceIndex: number;
  grade: PedagogicGrade;
}

export interface ParsedBarline {
  type: 'barline';
  sourceIndex: number;
  barlineType?: 'single' | 'end' | 'end-section' | 'dotted' | 'repeat-begin' | 'repeat-end';
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
  grade: PedagogicGrade;
}

export interface ParsedClef {
  type: 'clef';
  clefType: 'treble' | 'bass';
  sourceIndex: number;
}

export interface ParsedChordMarker {
  type: 'chordmarker';
  markerType: 'total' | 'partial' | 'separator' | 'right-hand' | 'left-hand';
  sourceIndex: number;
}

export type ParsedElement =
  | ParsedNote
  | ParsedRest
  | ParsedBarline
  | ParsedTimeSignature
  | ParsedKeySignature
  | ParsedNoteTie
  | ParsedInterval
  | ParsedClef
  | ParsedChordMarker;

export interface ParseResult {
  elements: ParsedElement[];
  errors: string[];
}

export interface ParseOptions {
  beatsPerMeasure?: number;
}

// ─── FUNÇÕES UTILITÁRIAS ────────────────────────────────────────────────────────

function durationToBeats(duration: Duration, dotted: boolean = false): number {
  const beats: Record<Duration, number> = {
    'w': 4, 'h': 2, 'q': 1, '8': 0.5, '16': 0.25,
    '32': 0.125, '64': 0.0625, '128': 0.03125,
  };
  let result = beats[duration] ?? 1;
  if (dotted) result *= 1.5;
  return result;
}

// Regra de inferência de oitava (Dissertação Vanazzi 2014, Cap. 3):
// - Intervalos de 2ª e 3ª: nunca mudam oitava
// - Intervalos de 4ª e 5ª: mudam apenas se cruzar fronteira B↔C
// - Intervalos de 6ª, 7ª e ≥8ª: sempre requerem sinal explícito de oitava
function inferOctave(prevPitch: NoteName, prevOctave: number, nextPitch: NoteName): number {
  const pitchOrder: NoteName[] = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
  const prevIdx = pitchOrder.indexOf(prevPitch);
  const nextIdx = pitchOrder.indexOf(nextPitch);
  const interval = Math.abs(nextIdx - prevIdx);

  if (interval <= 2) {
    // 2ª e 3ª: nunca mudam oitava
    return prevOctave;
  }
  if (interval <= 4) {
    // 4ª e 5ª: mudam se cruzar B→C (subindo) ou C→B (descendo)
    if (nextIdx > prevIdx) return prevOctave; // subindo, mesma oitava
    return prevOctave + 1; // descendo, próxima oitava
  }
  // 6ª e 7ª: deveriam ter sinal explícito; inferimos de forma conservadora
  if (nextIdx > prevIdx) return prevOctave;
  return prevOctave + 1;
}

function disambiguateDuration(
  primary: Duration,
  secondary: Duration,
  beatsUsed: number,
  beatsPerMeasure: number,
  dotted: boolean,
): Duration {
  const primaryBeats  = durationToBeats(primary, dotted);
  const secondaryBeats = durationToBeats(secondary, dotted);
  if (beatsUsed + primaryBeats  <= beatsPerMeasure) return primary;
  if (beatsUsed + secondaryBeats <= beatsPerMeasure) return secondary;
  return primary; // mantém primário mesmo estourando (parser não é rígido)
}

function durationToVex(duration: Duration, dotted: boolean, isRest: boolean): string {
  let s = duration === 'w' ? 'w' : duration === 'h' ? 'h' : duration === 'q' ? 'q' :
          duration === '8' ? '8' : duration === '16' ? '16' : duration === '32' ? '32' :
          duration === '64' ? '64' : '128';
  if (dotted) s += 'd';
  if (isRest) s += 'r';
  return s;
}

function gradeForNote(hasOctave: boolean, hasAccidental: boolean): PedagogicGrade {
  if (hasAccidental) return 3;
  if (hasOctave)     return 3;
  return 1;
}

// ─── PARSER PRINCIPAL ──────────────────────────────────────────────────────────

// Tenta ler uma fórmula de compasso a partir da posição i
// Retorna { numerator, denominator, advance } ou null
function tryReadTimeSignature(
  input: string,
  i: number,
): { numerator: number; denominator: number; advance: number } | null {
  if (input[i] !== NUMBER_SIGN) return null;

  // Verificar atalhos C e C-cortado primeiro
  const twoCell = input.substring(i, i + 2);
  if (TIME_SIG_SHORTHAND[twoCell]) {
    const ts = TIME_SIG_SHORTHAND[twoCell];
    return { numerator: ts.numerator, denominator: ts.denominator, advance: 2 };
  }

  // Ler numerador (1 ou 2 dígitos)
  let j = i + 1;
  let numerator = 0;
  let numDigits = 0;
  while (j < input.length && BRAILLE_NUMERATOR[input[j]] !== undefined) {
    numerator = numerator * 10 + BRAILLE_NUMERATOR[input[j]];
    j++;
    numDigits++;
    if (numDigits === 2) break; // máximo 2 dígitos no numerador
  }
  if (numDigits === 0) return null;

  // Ler denominador (1 dígito rebaixado)
  if (j >= input.length || BRAILLE_DENOMINATOR[input[j]] === undefined) return null;
  const denominator = BRAILLE_DENOMINATOR[input[j]];
  if (denominator === 0) return null; // denominador 0 inválido
  j++;

  return { numerator, denominator, advance: j - i };
}

export function parseBrailleMusic(input: string, options?: ParseOptions): ParseResult {
  let beatsPerMeasure = options?.beatsPerMeasure ?? 4;
  const elements: ParsedElement[] = [];
  const errors: string[] = [];

  let i = 0;
  let currentOctave    = 4;
  let prevPitch: NoteName | null = null;
  let prevOctave       = 4;
  let firstNoteInDoc   = true;   // Exige sinal de oitava na 1ª nota
  let pendingOctave: number | undefined;
  let pendingAccidental: Accidental | undefined;
  let beatsUsedInMeasure = 0;
  let inNoteContext    = false; // true = logo após uma nota, permite intervalo

  const len = input.length;

  while (i < len) {
    const ch   = input[i];
    const ch2  = i + 1 < len ? input[i + 1] : '';
    const two  = ch + ch2;
    const three = two + (i + 2 < len ? input[i + 2] : '');

    // ── Quebras de linha (ignorar) ─────────────────────────────────────────
    if (ch === '\n' || ch === '\r') { i++; continue; }

    // ── Espaço = Barra de compasso simples ────────────────────────────────
    if (ch === ' ' || ch === '\u2800') {
      const last = elements[elements.length - 1];
      if (!last || last.type !== 'barline') {
        elements.push({ type: 'barline', sourceIndex: i, barlineType: 'single' });
      }
      beatsUsedInMeasure = 0;
      inNoteContext      = false;
      i++;
      continue;
    }

    // ── Em acorde (3-cela) ─────────────────────────────────────────────────
    if (three === IN_CHORD_TOTAL) {
      elements.push({ type: 'chordmarker', markerType: 'total', sourceIndex: i });
      inNoteContext = false; i += 3; continue;
    }
    if (three === CLEF_TREBLE) {
      elements.push({ type: 'clef', clefType: 'treble', sourceIndex: i });
      inNoteContext = false; i += 3; continue;
    }
    if (three === CLEF_BASS) {
      elements.push({ type: 'clef', clefType: 'bass', sourceIndex: i });
      inNoteContext = false; i += 3; continue;
    }

    // ── Símbolos de 2 células ─────────────────────────────────────────────
    if (ch2) {
      // Barras especiais
      if (BARLINE_TWO_CELL[two]) {
        const barType = BARLINE_TWO_CELL[two];
        elements.push({ type: 'barline', sourceIndex: i, barlineType: barType });
        beatsUsedInMeasure = 0; inNoteContext = false;
        i += 2; continue;
      }
      // Em acorde parcial / separador
      if (two === IN_CHORD_PARTIAL) {
        elements.push({ type: 'chordmarker', markerType: 'partial', sourceIndex: i });
        inNoteContext = false; i += 2; continue;
      }
      if (two === CHORD_SEPARATOR) {
        elements.push({ type: 'chordmarker', markerType: 'separator', sourceIndex: i });
        inNoteContext = false; i += 2; continue;
      }
      if (two === RIGHT_HAND) {
        elements.push({ type: 'chordmarker', markerType: 'right-hand', sourceIndex: i });
        inNoteContext = false; i += 2; continue;
      }
      if (two === LEFT_HAND) {
        elements.push({ type: 'chordmarker', markerType: 'left-hand', sourceIndex: i });
        inNoteContext = false; i += 2; continue;
      }

      // Alterações duplas
      if (ACCIDENTAL_MAP[two]) {
        pendingAccidental = ACCIDENTAL_MAP[two];
        i += 2; continue;
      }

      // Oitava dupla (⠈⠈ ou ⠠⠠)
      if (OCTAVE_MAP[two] !== undefined) {
        pendingOctave = OCTAVE_MAP[two];
        inNoteContext = true; i += 2; continue;
      }

      // Armadura de clave (3 células)
      if (i + 2 < len) {
        const ks3 = OFFICIAL_KEY_SIGNATURE_MAP[three];
        if (ks3) {
          elements.push({ type: 'keysignature', fifths: ks3.fifths, vexKey: ks3.vexKey, sourceIndex: i });
          inNoteContext = false; i += 3; continue;
        }
        // Fórmula de compasso
        const ts = tryReadTimeSignature(input, i);
        if (ts) {
          elements.push({ type: 'timesignature', numerator: ts.numerator, denominator: ts.denominator, sourceIndex: i });
          beatsPerMeasure = ts.numerator;
          inNoteContext = false; i += ts.advance; continue;
        }
      }
    }

    // ── Fórmula de compasso de 1 célula (C e C-cortado) ───────────────────
    if (ch === NUMBER_SIGN) {
      const ts = tryReadTimeSignature(input, i);
      if (ts) {
        elements.push({ type: 'timesignature', numerator: ts.numerator, denominator: ts.denominator, sourceIndex: i });
        beatsPerMeasure = ts.numerator;
        inNoteContext = false; i += ts.advance; continue;
      }
      // NUMBER_SIGN sem fórmula reconhecida → pular
      i++; continue;
    }

    // ── Armaduras de 1 ou 2 células ────────────────────────────────────────
    if (OFFICIAL_KEY_SIGNATURE_MAP[ch]) {
      const ks = OFFICIAL_KEY_SIGNATURE_MAP[ch];
      elements.push({ type: 'keysignature', fifths: ks.fifths, vexKey: ks.vexKey, sourceIndex: i });
      inNoteContext = false; i++; continue;
    }
    if (ch2 && OFFICIAL_KEY_SIGNATURE_MAP[two]) {
      const ks = OFFICIAL_KEY_SIGNATURE_MAP[two];
      elements.push({ type: 'keysignature', fifths: ks.fifths, vexKey: ks.vexKey, sourceIndex: i });
      inNoteContext = false; i += 2; continue;
    }

    // ── Sinal de oitava simples ────────────────────────────────────────────
    if (OCTAVE_MAP[ch] !== undefined) {
      pendingOctave = OCTAVE_MAP[ch];
      inNoteContext = true; i++; continue;
    }

    // ── Alterações simples ────────────────────────────────────────────────
    if (ACCIDENTAL_MAP[ch]) {
      pendingAccidental = ACCIDENTAL_MAP[ch];
      i++; continue;
    }

    // ── Ligadura de expressão ─────────────────────────────────────────────
    if (ch === NOTE_TIE) {
      elements.push({ type: 'notetie', sourceIndex: i });
      i++; continue;
    }

    // ── Intervalo (somente APÓS uma nota, para evitar confusão com sinal de número) ──
    if (inNoteContext && INTERVAL_MAP[ch] !== undefined && ch !== AUGMENTATION_DOT) {
      // ⠼ (4ª) só é intervalo se estivermos em contexto de nota
      // (evita confusão com NUMBER_SIGN no início de compasso)
      elements.push({ type: 'interval', intervalSize: INTERVAL_MAP[ch], sourceIndex: i, grade: 4 });
      i++; continue;
    }

    // ── Pausa ─────────────────────────────────────────────────────────────
    if (REST_MAP[ch]) {
      const restInfo = REST_MAP[ch];
      const dotted   = i + 1 < len && input[i + 1] === AUGMENTATION_DOT;
      const dur      = disambiguateDuration(restInfo.duration, restInfo.altDuration, beatsUsedInMeasure, beatsPerMeasure, dotted);
      beatsUsedInMeasure += durationToBeats(dur, dotted);
      elements.push({
        type: 'rest', duration: dur, dotted,
        vexDuration: durationToVex(dur, dotted, true),
        sourceIndex: i, grade: 2,
      });
      i++; if (dotted && i < len && input[i] === AUGMENTATION_DOT) i++;
      inNoteContext = true;
      continue;
    }

    // ── Nota ──────────────────────────────────────────────────────────────
    if (NOTE_MAP[ch]) {
      const noteInfo = NOTE_MAP[ch];
      let octave: number;

      if (pendingOctave !== undefined) {
        octave        = pendingOctave;
        pendingOctave = undefined;
        currentOctave = octave;
      } else if (firstNoteInDoc) {
        // Primeira nota do documento sem sinal de oitava: usa padrão 4
        octave        = 4;
        currentOctave = 4;
        errors.push(`Aviso: primeira nota sem sinal de oitava — assumindo oitava 4`);
      } else if (prevPitch !== null) {
        octave = inferOctave(prevPitch, prevOctave, noteInfo.pitch);
        currentOctave = octave;
      } else {
        octave = currentOctave;
      }

      const dotted = i + 1 < len && input[i + 1] === AUGMENTATION_DOT;
      const dur    = disambiguateDuration(noteInfo.duration, noteInfo.altDuration, beatsUsedInMeasure, beatsPerMeasure, dotted);
      beatsUsedInMeasure += durationToBeats(dur, dotted);

      elements.push({
        type:         'note',
        pitch:        noteInfo.pitch,
        octave,
        duration:     dur,
        dotted,
        accidental:   pendingAccidental,
        vexKey:       `${noteInfo.pitch.toLowerCase()}/${octave}`,
        vexDuration:  durationToVex(dur, dotted, false),
        sourceIndex:  i,
        grade:        gradeForNote(true, !!pendingAccidental),
      });

      prevPitch         = noteInfo.pitch;
      prevOctave        = octave;
      pendingAccidental = undefined;
      firstNoteInDoc    = false;
      inNoteContext     = true;

      i++;
      if (dotted && i < len && input[i] === AUGMENTATION_DOT) i++;
      continue;
    }

    // ── Ponto de aumento isolado (consumir sem erro) ───────────────────────
    if (ch === AUGMENTATION_DOT) { i++; continue; }

    // ── Célula desconhecida — avisa e avança ──────────────────────────────
    i++;
  }

  return { elements, errors };
}

// ─── FUNÇÕES AUXILIARES EXPORTADAS ─────────────────────────────────────────────

export function parseBrailleLine(fullText: string, cursorPosition: number, options?: ParseOptions): ParseResult {
  const lines = fullText.split('\n');
  let charCount = 0;
  let targetLine = '';
  for (const line of lines) {
    if (cursorPosition <= charCount + line.length) { targetLine = line; break; }
    charCount += line.length + 1;
  }
  if (!targetLine) targetLine = lines[lines.length - 1] || '';
  return parseBrailleMusic(targetLine, options);
}

export function parseBrailleSelection(fullText: string, selStart: number, selEnd: number, options?: ParseOptions): ParseResult {
  return parseBrailleMusic(fullText.slice(selStart, selEnd), options);
}

// ─── TECLADO PERKINS ───────────────────────────────────────────────────────────

export interface PerkinsKeyState {
  dot1: boolean; dot2: boolean; dot3: boolean;
  dot4: boolean; dot5: boolean; dot6: boolean;
}

export function perkinsKeysToBraille(keys: PerkinsKeyState): string {
  const v = (keys.dot1 ? 1 : 0) | (keys.dot2 ? 2 : 0) | (keys.dot3 ? 4 : 0) |
            (keys.dot4 ? 8 : 0) | (keys.dot5 ? 16 : 0) | (keys.dot6 ? 32 : 0);
  return String.fromCharCode(0x2800 + v);
}

export function perkinsDotsToUnicode(dots: PerkinsKeyState): string {
  return perkinsKeysToBraille(dots);
}

export function brailleToPerkins(char: string): PerkinsKeyState {
  const code = char.charCodeAt(0) - 0x2800;
  return {
    dot1: (code & 1)  !== 0, dot2: (code & 2)  !== 0, dot3: (code & 4)  !== 0,
    dot4: (code & 8)  !== 0, dot5: (code & 16) !== 0, dot6: (code & 32) !== 0,
  };
}

export function unicodeToDots(char: string): number[] {
  const code = char.charCodeAt(0) - 0x2800;
  const dots: number[] = [];
  for (let i = 0; i < 6; i++) { if ((code & (1 << i)) !== 0) dots.push(i + 1); }
  return dots;
}

// ─── REFERÊNCIA RÁPIDA ─────────────────────────────────────────────────────────

export interface QuickRefEntry {
  char: string;
  displayChar?: string;
  dots: string;
  description: string;
  category: string;
}

export function getQuickReference(): QuickRefEntry[] {
  const ref: QuickRefEntry[] = [];

  // Notas
  const durLabels: Record<Duration, string> = {
    w: 'semibreve', h: 'mínima', q: 'semínima', '8': 'colcheia',
    '16': 'semicolcheia', '32': 'fusa', '64': 'semifusa', '128': 'quartifusa',
  };
  const durCat: Record<Duration, string> = {
    w: 'note-whole', h: 'note-half', q: 'note-quarter', '8': 'note-eighth',
    '16': 'note-16th-forced', '32': 'note-32nd-forced', '64': 'note-64th', '128': 'note-128th',
  };
  Object.entries(NOTE_MAP).forEach(([char, info]) => {
    const ptLabel: Record<string, string> = { C:'Dó',D:'Ré',E:'Mi',F:'Fá',G:'Sol',A:'Lá',B:'Si' };
    ref.push({
      char, dots: unicodeToDots(char).join(','),
      description: `${ptLabel[info.pitch]} ${durLabels[info.duration]}`,
      category: durCat[info.duration],
    });
  });

  // Pausas
  Object.entries(REST_MAP).forEach(([char, info]) => {
    ref.push({
      char, dots: unicodeToDots(char).join(','),
      description: `Pausa ${durLabels[info.duration]}`,
      category: 'rest',
    });
  });

  // Alterações
  const accLabels: Record<string, string> = {
    sharp:'Sustenido', flat:'Bemol', natural:'Bequadro',
    'double-sharp':'Dobrado sustenido', 'double-flat':'Dobrado bemol',
  };
  Object.entries(ACCIDENTAL_MAP).forEach(([char, acc]) => {
    ref.push({
      char, dots: char.length === 1 ? unicodeToDots(char).join(',') : unicodeToDots(char[0]).join(',') + '+' + unicodeToDots(char[1]).join(','),
      description: accLabels[acc] ?? acc,
      category: 'accidental',
    });
  });

  // Oitavas (somente celas simples para exibição)
  Object.entries(OCTAVE_MAP).forEach(([char, oct]) => {
    if (char.length === 1) {
      ref.push({ char, dots: unicodeToDots(char).join(','), description: `Oitava ${oct}`, category: 'octave' });
    }
  });

  // Fórmulas de compasso comuns
  const commonTimeSigs = [
    { char: '\u283C\u2819\u2832', desc: '4/4 — quaternário' },
    { char: '\u283C\u2809\u2832', desc: '3/4 — ternário' },
    { char: '\u283C\u2803\u2832', desc: '2/4 — binário' },
    { char: '\u283C\u280B\u2826', desc: '6/8 — composto' },
    { char: '\u2828\u2809',       desc: 'C — 4/4 abreviado' },
    { char: '\u2838\u2809',       desc: 'C cortado — 2/2' },
  ];
  commonTimeSigs.forEach(({ char, desc }) => {
    ref.push({ char, dots: [...char].map(c => unicodeToDots(c).join(',')).join(' '), description: desc, category: 'timesig' });
  });

  // Barras
  const barDescs: Record<string, string> = {
    end: 'Barra final', 'end-section': 'Barra de seção',
    'repeat-begin': 'Ritornelo início', 'repeat-end': 'Ritornelo fim', dotted: 'Barra pontilhada',
  };
  Object.entries(BARLINE_TWO_CELL).forEach(([char, type]) => {
    ref.push({ char, dots: [...char].map(c => unicodeToDots(c).join(',')).join(' '), description: barDescs[type] ?? type, category: 'barline' });
  });

  // Intervalos
  const intervalNames: Record<number, string> = { 2:'Segunda', 3:'Terça', 4:'Quarta', 5:'Quinta', 6:'Sexta', 7:'Sétima', 8:'Oitava' };
  Object.entries(INTERVAL_MAP).forEach(([char, size]) => {
    ref.push({ char, dots: unicodeToDots(char).join(','), description: `Intervalo: ${intervalNames[size] ?? size}ª`, category: 'interval' });
  });

  // Outros
  ref.push({ char: AUGMENTATION_DOT, dots: unicodeToDots(AUGMENTATION_DOT).join(','), description: 'Ponto de aumento', category: 'other' });
  ref.push({ char: NOTE_TIE, dots: unicodeToDots(NOTE_TIE).join(','), description: 'Ligadura de expressão', category: 'other' });

  return ref;
}

export const QUICK_REFERENCE = getQuickReference();

export function describeBrailleChar(char: string): string {
  const entry = QUICK_REFERENCE.find(e => e.char === char);
  if (entry) return entry.description;
  if (NOTE_MAP[char]) return `${NOTE_MAP[char].pitch} (${NOTE_MAP[char].duration})`;
  if (REST_MAP[char]) return `Pausa (${REST_MAP[char].duration})`;
  if (ACCIDENTAL_MAP[char]) return accLabel(ACCIDENTAL_MAP[char]);
  if (OCTAVE_MAP[char] !== undefined) return `Oitava ${OCTAVE_MAP[char]}`;
  return 'Símbolo desconhecido';
}

function accLabel(acc: Accidental): string {
  const m: Record<Accidental, string> = {
    sharp: 'Sustenido', flat: 'Bemol', natural: 'Bequadro',
    'double-sharp': 'Dobrado sustenido', 'double-flat': 'Dobrado bemol',
  };
  return m[acc] ?? acc;
}
