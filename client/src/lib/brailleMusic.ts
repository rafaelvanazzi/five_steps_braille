/**
 * Braille Music Parser — Versão Fermata Braille
 * * Baseado estritamente em:
 * - Novo Manual Internacional de Musicografia Braille (2004) - Capítulo 6 (Ligaduras e Articulações)
 * - Dissertação de Mestrado: "Particularidades da Musicografia Braille" (Vanazzi, 2014)
 * * Níveis de Leitura Cognitivos (ReadingLevel):
 * 1: Notas simples, pausas, armaduras, fórmulas de compasso, oitavas MIDI e ligaduras/articulações.
 * 2: Sinais de Intervalo (Acordes).
 * 3: Sinais de "em acorde" total/parcial e pauta dupla de piano.
 */

export type ReadingLevel = 1 | 2 | 3;

export const PREMIUM_CONTENT_ENABLED: boolean = true;

type NoteName = 'C' | 'D' | 'E' | 'F' | 'G' | 'A' | 'B';
type Duration = 'w' | 'h' | 'q' | '8' | '16' | '32' | '64' | '128';
export type Accidental = 'sharp' | 'flat' | 'natural' | 'double-sharp' | 'double-flat';

export type PedagogicGrade = 1 | 2 | 3 | 4 | 5;

interface NoteInfo {
  pitch: NoteName;
  duration: Duration;
  altDuration: Duration;
}

const NOTE_MAP: Record<string, NoteInfo> = {
  '\u2819': { pitch: 'C', duration: '8',  altDuration: '128' }, // ⠙
  '\u2811': { pitch: 'D', duration: '8',  altDuration: '128' }, // ⠑
  '\u280B': { pitch: 'E', duration: '8',  altDuration: '128' }, // ⠋
  '\u281B': { pitch: 'F', duration: '8',  altDuration: '128' }, // ⠛
  '\u2813': { pitch: 'G', duration: '8',  altDuration: '128' }, // ⠓
  '\u280A': { pitch: 'A', duration: '8',  altDuration: '128' }, // ⠊
  '\u281A': { pitch: 'B', duration: '8',  altDuration: '128' }, // ⠚

  '\u2839': { pitch: 'C', duration: 'q',  altDuration: '64'  }, // ⠹
  '\u2831': { pitch: 'D', duration: 'q',  altDuration: '64'  }, // ⠱
  '\u282B': { pitch: 'E', duration: 'q',  altDuration: '64'  }, // ⠫
  '\u283B': { pitch: 'F', duration: 'q',  altDuration: '64'  }, // ⠻
  '\u2833': { pitch: 'G', duration: 'q',  altDuration: '64'  }, // ⠳
  '\u282A': { pitch: 'A', duration: 'q',  altDuration: '64'  }, // ⠪
  '\u283A': { pitch: 'B', duration: 'q',  altDuration: '64'  }, // ⠺

  '\u281D': { pitch: 'C', duration: 'h',  altDuration: '32'  }, // ⠝
  '\u2815': { pitch: 'D', duration: 'h',  altDuration: '32'  }, // ⠕
  '\u280F': { pitch: 'E', duration: 'h',  altDuration: '32'  }, // ⠏
  '\u281F': { pitch: 'F', duration: 'h',  altDuration: '32'  }, // ⠟
  '\u2817': { pitch: 'G', duration: 'h',  altDuration: '32'  }, // ⠗
  '\u280E': { pitch: 'A', duration: 'h',  altDuration: '32'  }, // ⠎
  '\u281E': { pitch: 'B', duration: 'h',  altDuration: '32'  }, // ⠞

  '\u283D': { pitch: 'C', duration: 'w',  altDuration: '16'  }, // ⠽
  '\u2835': { pitch: 'D', duration: 'w',  altDuration: '16'  }, // ⠵
  '\u282F': { pitch: 'E', duration: 'w',  altDuration: '16'  }, // ⠯
  '\u283F': { pitch: 'F', duration: 'w',  altDuration: '16'  }, // ⠿
  '\u2837': { pitch: 'G', duration: 'w',  altDuration: '16'  }, // ⠷
  '\u282E': { pitch: 'A', duration: 'w',  altDuration: '16'  }, // ⠮
  '\u283E': { pitch: 'B', duration: 'w',  altDuration: '16'  }, // ⠾
};

const REST_MAP: Record<string, { duration: Duration; altDuration: Duration }> = {
  '\u282D': { duration: '8',  altDuration: '128' }, // ⠭
  '\u2827': { duration: 'q',  altDuration: '64'  }, // ⠧
  '\u2825': { duration: 'h',  altDuration: '32'  }, // ⠥
  '\u280D': { duration: 'w',  altDuration: '16'  }, // ⠍
};

const OCTAVE_MAP: Record<string, number> = {
  '\u2808\u2808': 0, '\u2808': 1, '\u2818': 2, '\u2838': 3, '\u2810': 4, '\u2828': 5, '\u2830': 6, '\u2820': 7, '\u2820\u2820': 8
};

const ACCIDENTAL_MAP: Record<string, Accidental> = {
  '\u2829': 'sharp', '\u2823': 'flat', '\u2821': 'natural', '\u2829\u2829': 'double-sharp', '\u2823\u2823': 'double-flat'
};

const BARLINE_TWO_CELL: Record<string, 'end' | 'end-section' | 'dotted' | 'repeat-begin' | 'repeat-end'> = {
  '\u2823\u2805': 'end', '\u2823\u2805\u2804': 'end-section', '\u2805': 'dotted', '\u2823\u2836': 'repeat-begin', '\u2823\u2826': 'repeat-end'
};

const BRAILLE_NUMERATOR: Record<string, number> = {
  '\u2801': 1, '\u2803': 2, '\u2809': 3, '\u2819': 4, '\u2811': 5, '\u280B': 6, '\u281B': 7, '\u2813': 8, '\u280A': 9, '\u281A': 0
};
const BRAILLE_DENOMINATOR: Record<string, number> = {
  '\u2802': 1, '\u2806': 2, '\u2812': 3, '\u2832': 4, '\u2822': 5, '\u2816': 6, '\u2836': 7, '\u2826': 8, '\u2814': 9, '\u2834': 0
};

const NUMBER_SIGN = '\u283C'; // ⠼

const INTERVAL_MAP: Record<string, number> = {
  '\u280C': 2, '\u282C': 3, '\u283C': 4, '\u2814': 5, '\u2834': 6, '\u2812': 7, '\u2824': 8
};

const AUGMENTATION_DOT  = '\u2804'; // ⠄
const AUGMENTATION_DOT2 = '\u2804\u2804';

// Sinais de Ligadura (Capítulo 6 MIMB)
const SLUR_SIMPLE       = '\u2809';         // ⠉ (Ligadura de expressão curta / prolongação)
const SLUR_DOUBLE       = '\u2809\u2809';  // ⠉⠉ (Início de Ligadura de fraseio longo)
const PHRASE_START      = '\u2830\u2803';  // ⠰⠃ (Início de Ligadura Longa)
const PHRASE_END        = '\u2818\u2806';  // ⠘⠆ (Fim de Ligadura Longa)

const FERMATA           = '\u2823\u2807';  // ⠣⠇
const STACCATO          = '\u2826';         // ⠦

const HAND_RIGHT = '\u2828\u281C'; // ⠨⠜
const HAND_LEFT  = '\u2838\u281C'; // ⠸⠜

const CLEF_TREBLE = '\u281C\u280C\u2807'; // ⠜⠌⠇
const CLEF_BASS   = '\u281C\u283C\u2807'; // ⠜⠼⠇
const CLEF_DO_4  = '\u281C\u282C\u2810\u2807';

export interface ParsedNote {
  type: 'note';
  pitch: NoteName;
  octave: number;
  duration: Duration;
  dotted: boolean;
  dotted2: boolean;
  staccato?: boolean;
  fermata?: boolean;
  accidental?: Accidental;
  vexKey: string;
  vexDuration: string;
  measureIndex: number;
  sourceIndex: number;
  level: ReadingLevel;
  isPremium: boolean;
  slurType?: 'start' | 'stop' | 'simple';
  tieType?: 'start' | 'stop';
}

export interface ParsedRest {
  type: 'rest';
  duration: Duration;
  dotted: boolean;
  dotted2: boolean;
  vexDuration: string;
  sourceIndex: number;
  level: ReadingLevel;
  isPremium: boolean;
}

export interface ParsedBarline {
  type: 'barline';
  sourceIndex: number;
  barlineType?: 'single' | 'end' | 'end-section' | 'dotted' | 'repeat-begin' | 'repeat-end';
  measureIndex?: number;
  level: ReadingLevel;
  isPremium: boolean;
}

export interface ParsedTimeSignature {
  type: 'timesignature';
  numerator: number;
  denominator: number;
  sourceIndex: number;
  level: ReadingLevel;
  isPremium: boolean;
}

export interface ParsedKeySignature {
  type: 'keysignature';
  fifths: number;
  vexKey: string;
  sourceIndex: number;
  level: ReadingLevel;
  isPremium: boolean;
}

export interface ParsedInterval {
  type: 'interval';
  intervalSize: number;
  accidental?: Accidental;
  explicitOctave?: number;
  duration?: Duration;
  staccato?: boolean;
  measureIndex: number;
  sourceIndex: number;
  level: ReadingLevel;
  isPremium: boolean;
}

export interface ParsedClef {
  type: 'clef';
  clefType: 'treble' | 'bass' | 'tenor' | 'alto';
  intervalDirection: 'ascending' | 'descending';
  sourceIndex: number;
  level: ReadingLevel;
  isPremium: boolean;
}

export interface ParsedHand {
  type: 'hand';
  hand: 'right' | 'left';
  impliedClef: 'treble' | 'bass';
  intervalDirection: 'ascending' | 'descending';
  sourceIndex: number;
  level: ReadingLevel;
  isPremium: boolean;
}

export type ParsedElement = ParsedNote | ParsedRest | ParsedBarline | ParsedTimeSignature | ParsedKeySignature | ParsedInterval | ParsedClef | ParsedHand;

export interface ParseResult {
  elements: ParsedElement[];
  errors: string[];
}

export interface ParseOptions {
  beatsPerMeasure?: number;
  initialOctave?: number;
  initialPrevPitch?: string;
}

function durationToBeats(duration: Duration, dotted: boolean = false): number {
  const beats: Record<Duration, number> = { 'w': 4, 'h': 2, 'q': 1, '8': 0.5, '16': 0.25, '32': 0.125, '64': 0.0625, '128': 0.03125 };
  let result = beats[duration] ?? 1;
  if (dotted) result *= 1.5;
  return result;
}

function inferOctave(prevPitch: NoteName, prevOctave: number, nextPitch: NoteName): number {
  const pitchOrder: NoteName[] = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
  const semitonos: Record<NoteName, number> = { C:0, D:2, E:4, F:5, G:7, A:9, B:11 };
  const prevIdx = pitchOrder.indexOf(prevPitch);
  const nextIdx = pitchOrder.indexOf(nextPitch);
  const diatSteps = Math.abs(nextIdx - prevIdx);

  if (diatSteps === 3 || diatSteps === 4) return prevOctave;

  if (diatSteps <= 2) {
    const prevMidi = (prevOctave + 1) * 12 + semitonos[prevPitch];
    let bestOct = prevOctave, bestDist = 999;
    for (let oct = prevOctave - 1; oct <= prevOctave + 1; oct++) {
      if (oct < 0 || oct > 8) continue;
      const dist = Math.abs((oct + 1) * 12 + semitonos[nextPitch] - prevMidi);
      if (dist < bestDist) { bestDist = dist; bestOct = oct; }
    }
    return bestOct;
  }

  const prevMidi = (prevOctave + 1) * 12 + semitonos[prevPitch];
  let bestOct = prevOctave, bestDist = 999;
  for (let oct = prevOctave - 1; oct <= prevOctave + 1; oct++) {
    if (oct < 0 || oct > 8) continue;
    const dist = Math.abs((oct + 1) * 12 + semitonos[nextPitch] - prevMidi);
    if (dist < bestDist) { bestDist = dist; bestOct = oct; }
  }
  return bestOct;
}

function disambiguateMeasure(items: any[], beatsPerMeasure: number): Duration[] {
  if (!items.length) return [];
  const totalPrimary = items.reduce((s, it) => s + durationToBeats(it.primary, it.dotted) * (it.dotted2 ? 1.25 : 1), 0);
  if (totalPrimary <= beatsPerMeasure + 0.001) return items.map(it => it.primary);
  return items.map(it => it.secondary);
}

function durationToVex(duration: Duration, dotted: boolean, isRest: boolean): string {
  let s = duration;
  if (dotted) s += 'd';
  if (isRest) s += 'r';
  return s;
}

export function parseBrailleMusic(input: string, options?: ParseOptions): ParseResult {
  let beatsPerMeasure = options?.beatsPerMeasure ?? 4;
  const errors: string[] = [];

  // Estruturas do Tokenizer Volátil
  interface RawToken {
    kind: string;
    pitch?: NoteName;
    primary?: Duration;
    secondary?: Duration;
    dotted?: boolean;
    dotted2?: boolean;
    val?: any;
    idx: number;
    slurType?: 'start' | 'stop' | 'simple';
  }

  const measures: Array<{ tokens: RawToken[]; barlineType: string }> = [];
  let curTokens: RawToken[] = [];
  let i = 0;
  const len = input.length;
  let isMusicActive = false;

  // Pilha de escopo contextual para controle de fraseio longo
  let activeFraseioLongoLigadura = false;

  while (i < len) {
    const ch = input[i];
    const ch2 = i + 1 < len ? input[i + 1] : '';
    const two = ch + ch2;
    const three = two + (i + 2 < len ? input[i + 2] : '');

    if (ch === '\n' || ch === '\r') { i++; continue; }

    if (ch === ' ' || ch === '\u2800') {
      if (isMusicActive) {
        if (curTokens.some(tk => tk.kind === 'note' || tk.kind === 'rest' || tk.kind === 'interval')) {
          measures.push({ tokens: curTokens, barlineType: 'single' });
          curTokens = [];
        }
      }
      i++; continue;
    }

    if (BARLINE_TWO_CELL[two]) {
      measures.push({ tokens: curTokens, barlineType: BARLINE_TWO_CELL[two] });
      curTokens = [];
      i += 2; continue;
    }

    if (two === FERMATA) { curTokens.push({ kind: 'fermata', idx: i }); i += 2; continue; }

    // Gerenciamento semântico de Ligaduras Alternativas Longas (⠰⠃ e ⠘⠆)
    if (two === PHRASE_START) {
      activeFraseioLongoLigadura = true;
      curTokens.push({ kind: 'slur_long_start', idx: i });
      i += 2; continue;
    }
    if (two === PHRASE_END) {
      activeFraseioLongoLigadura = false;
      curTokens.push({ kind: 'slur_long_stop', idx: i });
      i += 2; continue;
    }

    // Início de Ligadura de fraseio duplo (⠉⠉)
    if (two === SLUR_DOUBLE) {
      activeFraseioLongoLigadura = true;
      curTokens.push({ kind: 'slur_double_start', idx: i });
      i += 2; continue;
    }

    if (ch === NUMBER_SIGN) {
      isMusicActive = true;
      const ts = tryReadTimeSignature(input, i);
      if (ts) {
        curTokens.push({ kind: 'ts', val: ts, idx: i });
        beatsPerMeasure = ts.numerator;
        i += ts.advance; continue;
      }
    }

    if (two === HAND_RIGHT) {
      isMusicActive = true;
      curTokens.push({ kind: 'hand', val: { hand: 'right', impliedClef: 'treble', dir: 'descending' }, idx: i });
      i += 2; continue;
    }
    if (two === HAND_LEFT) {
      isMusicActive = true;
      curTokens.push({ kind: 'hand', val: { hand: 'left', impliedClef: 'bass', dir: 'ascending' }, idx: i });
      i += 2; continue;
    }

    if (three === CLEF_TREBLE) {
      isMusicActive = true;
      curTokens.push({ kind: 'clef', val: { type: 'treble', dir: 'descending' }, idx: i });
      i += 3; continue;
    }
    if (three === CLEF_BASS) {
      isMusicActive = true;
      curTokens.push({ kind: 'clef', val: { type: 'bass', dir: 'ascending' }, idx: i });
      i += 3; continue;
    }

    if (ch === STACCATO) { curTokens.push({ kind: 'staccato', idx: i }); i++; continue; }

    // Tratamento contextual da cela simples '⠉' (Ligadura / Fim de Ligadura)
    if (ch === SLUR_SIMPLE) {
      if (activeFraseioLongoLigadura) {
        // Se a frase estiver ativa por contexto, atua como fechamento ("Fim de Ligadura")
        activeFraseioLongoLigadura = false;
        curTokens.push({ kind: 'slur_context_stop', idx: i });
      } else {
        // Caso contrário, injeta como gatilho de ligadura simples/prolongação ordinária
        curTokens.push({ kind: 'slur_simple_trigger', idx: i });
      }
      i++; continue;
    }

    if (OCTAVE_MAP[ch] !== undefined) { curTokens.push({ kind: 'oct', val: OCTAVE_MAP[ch], idx: i }); i++; continue; }
    if (ACCIDENTAL_MAP[ch]) { curTokens.push({ kind: 'acc', val: ACCIDENTAL_MAP[ch], idx: i }); i++; continue; }

    if (INTERVAL_MAP[ch] !== undefined) {
      let intAcc: Accidental | undefined;
      let intOct: number | undefined;
      let intStacc = false;

      if (curTokens.length > 0 && curTokens[curTokens.length - 1].kind === 'acc') { intAcc = curTokens.pop()?.val; }
      if (curTokens.length > 0 && curTokens[curTokens.length - 1].kind === 'oct') { intOct = curTokens.pop()?.val; }
      if (curTokens.length > 0 && curTokens[curTokens.length - 1].kind === 'staccato') { intStacc = true; curTokens.pop(); }

      curTokens.push({ kind: 'interval', val: { size: INTERVAL_MAP[ch], acc: intAcc, oct: intOct, staccato: intStacc }, idx: i });
      i++; continue;
    }

    if (REST_MAP[ch]) {
      const r = REST_MAP[ch];
      const dotted = i + 1 < len && input[i + 1] === AUGMENTATION_DOT;
      const dotted2 = dotted && i + 2 < len && input[i + 2] === AUGMENTATION_DOT;
      curTokens.push({ kind: 'rest', primary: r.duration, secondary: r.altDuration, dotted, dotted2, idx: i });
      i++; if (dotted) { i++; if (dotted2) i++; } continue;
    }

    if (NOTE_MAP[ch]) {
      const n = NOTE_MAP[ch];
      const dotted = i + 1 < len && input[i + 1] === AUGMENTATION_DOT;
      const dotted2 = dotted && i + 2 < len && input[i + 2] === AUGMENTATION_DOT;
      curTokens.push({ kind: 'note', pitch: n.pitch, primary: n.duration, secondary: n.altDuration, dotted, dotted2, idx: i });
      i++; if (dotted) { i++; if (dotted2) i++; } continue;
    }

    i++;
  }
  if (curTokens.length > 0) measures.push({ tokens: curTokens, barlineType: 'single' });

  // Fase de compilação da AST estruturada por níveis lógicos
  const elements: ParsedElement[] = [];
  let currentOctave = options?.initialOctave ?? 4;
  let prevPitch: NoteName | null = (options?.initialPrevPitch as NoteName) ?? null;
  let prevOctave = options?.initialOctave ?? 4;
  let firstNote = !options?.initialPrevPitch;
  let measureIndex = 0;

  // Estados voláteis de escopo para acoplamento de ligaduras gráficas
  let activeLongSlurOrigin: ParsedNote | null = null;
  let pendingSlurNextNote: 'start' | 'stop' | 'simple' | null = null;

  for (const measure of measures) {
    const noteTokens = measure.tokens.filter(t => t.kind === 'note' || t.kind === 'rest');
    const resolvedDurs = disambiguateMeasure(noteTokens, beatsPerMeasure);
    let nrIdx = 0;

    let pendingOct: number | undefined;
    let pendingAcc: Accidental | undefined;
    let pendingStacc = false;
    let pendingFermata = false;

    for (const tk of measure.tokens) {
      if (tk.kind === 'ts') {
        elements.push({ type: 'timesignature', numerator: tk.val.numerator, denominator: tk.val.denominator, sourceIndex: tk.idx, level: 1, isPremium: false });
        beatsPerMeasure = tk.val.numerator; continue;
      }
      if (tk.kind === 'hand') {
        elements.push({ type: 'hand', hand: tk.val.hand, impliedClef: tk.val.impliedClef, intervalDirection: tk.val.dir, sourceIndex: tk.idx, level: 3, isPremium: false });
        continue;
      }
      if (tk.kind === 'clef') {
        elements.push({ type: 'clef', clefType: tk.val.type, intervalDirection: tk.val.dir, sourceIndex: tk.idx, level: 1, isPremium: false });
        continue;
      }
      if (tk.kind === 'oct') { pendingOct = tk.val; continue; }
      if (tk.kind === 'acc') { pendingAcc = tk.val; continue; }
      if (tk.kind === 'staccato') { pendingStacc = true; continue; }
      if (tk.kind === 'fermata') { pendingFermata = true; continue; }

      // Chaveamento de escopo de ligaduras longas e curtas
      if (tk.kind === 'slur_double_start' || tk.kind === 'slur_long_start') {
        pendingSlurNextNote = 'start'; continue;
      }
      if (tk.kind === 'slur_context_stop' || tk.kind === 'slur_long_stop') {
        pendingSlurNextNote = 'stop'; continue;
      }
      if (tk.kind === 'slur_simple_trigger') {
        pendingSlurNextNote = 'simple'; continue;
      }

      if (tk.kind === 'interval') {
        elements.push({
          type: 'interval', intervalSize: tk.val.size, accidental: tk.val.acc, explicitOctave: tk.val.oct, staccato: tk.val.staccato,
          measureIndex, sourceIndex: tk.idx, level: 2, isPremium: false
        });
        continue;
      }

      if (tk.kind === 'rest') {
        const dur = resolvedDurs[nrIdx++];
        elements.push({
          type: 'rest', duration: dur, dotted: !!tk.dotted, dotted2: !!tk.dotted2,
          vexDuration: durationToVex(dur, !!tk.dotted, true), sourceIndex: tk.idx, level: 1, isPremium: false
        });
        pendingAcc = undefined; pendingStacc = false; pendingFermata = false; continue;
      }

      if (tk.kind === 'note') {
        const dur = resolvedDurs[nrIdx++];
        let octave: number;

        if (pendingOct !== undefined) { octave = pendingOct; pendingOct = undefined; currentOctave = octave; }
        else if (firstNote) { octave = 4; currentOctave = 4; }
        else if (prevPitch !== null) { octave = inferOctave(prevPitch, prevOctave, tk.pitch as NoteName); currentOctave = octave; }
        else { octave = currentOctave; }

        // Criação do objeto estruturado da nota
        const parsedNote: ParsedNote = {
          type: 'note', pitch: tk.pitch as NoteName, octave, duration: dur, dotted: !!tk.dotted, dotted2: !!tk.dotted2,
          staccato: pendingStacc, fermata: pendingFermata, accidental: pendingAcc,
          vexKey: `${(tk.pitch as string).toLowerCase()}/${octave}`,
          vexDuration: durationToVex(dur, !!tk.dotted, false),
          measureIndex, sourceIndex: tk.idx, level: 1, isPremium: false
        };

        // Resolução semântica de Ligaduras e Regra 6-2 (MIMB)
        if (pendingSlurNextNote === 'start') {
          parsedNote.slurType = 'start';
          activeLongSlurOrigin = parsedNote;
          parsedNote.isPremium = true;
        } else if (pendingSlurNextNote === 'stop') {
          parsedNote.slurType = 'stop';
          parsedNote.isPremium = true;
          activeLongSlurOrigin = null;
        } else if (pendingSlurNextNote === 'simple') {
          // Checagem Regra 6-2: Notas consecutivas idênticas -> Transforma em Sinal de Prolongação (Tie)
          if (prevPitch === parsedNote.pitch && prevOctave === parsedNote.octave && elements.length > 0) {
            parsedNote.tieType = 'stop';
            // Retroalimenta o nó da nota anterior na trilha como origem do arco de prolongação
            for (let eIdx = elements.length - 1; eIdx >= 0; eIdx--) {
              if (elements[eIdx].type === 'note') {
                const prevNote = elements[eIdx] as ParsedNote;
                if (prevNote.pitch === parsedNote.pitch && prevNote.octave === parsedNote.octave) {
                  prevNote.tieType = 'start';
                  break;
                }
              }
            }
          } else {
            // Notas distintas -> Ligadura de expressão simples
            parsedNote.slurType = 'simple';
          }
        }

        // Se uma ligadura de fraseio longo estiver ativa por escopo, propaga as tags de conteúdo complementar premium
        if (activeLongSlurOrigin !== null) {
          parsedNote.isPremium = true;
        }

        elements.push(parsedNote);
        prevPitch = tk.pitch as NoteName; prevOctave = octave;
        pendingAcc = undefined; pendingStacc = false; pendingFermata = false;
        pendingSlurNextNote = null; firstNote = false; continue;
      }
    }

    elements.push({ type: 'barline', sourceIndex: 0, barlineType: measure.barlineType as any, measureIndex, level: 1, isPremium: false });
    measureIndex++;
  }

  return { elements, errors };
}

function tryReadTimeSignature(input: string, i: number): { numerator: number; denominator: number; advance: number } | null {
  if (input[i] !== NUMBER_SIGN) return null;
  let j = i + 1;
  let numerator = 0;
  let numDigits = 0;
  while (j < input.length && BRAILLE_NUMERATOR[input[j]] !== undefined) {
    numerator = numerator * 10 + BRAILLE_NUMERATOR[input[j]];
    j++; numDigits++;
    if (numDigits === 2) break;
  }
  if (numDigits === 0) return null;
  if (j >= input.length || BRAILLE_DENOMINATOR[input[j]] === undefined) return null;
  const denominator = BRAILLE_DENOMINATOR[input[j]];
  if (denominator === 0) return null;
  j++;
  return { numerator, denominator, advance: j - i };
}

export function getQuickReference(): any[] {
  const ref: any[] = [];
  // Notas e Sinais Fundamentais
  ref.push({ char: '⠉', dots: '1,4', description: 'Ligadura', category: 'ligadura' });
  ref.push({ char: '⠉⠉', dots: '1,4 1,4', description: 'Início de Ligadura', category: 'ligadura' });
  ref.push({ char: '⠰⠃', dots: '5,6 1,2', description: 'Início de Ligadura Longa', category: 'ligadura' });
  ref.push({ char: '⠘⠆', dots: '4,5 2,3', description: 'Fim de Ligadura Longa', category: 'ligadura' });
  ref.push({ char: '⠦', dots: '2,3,6', description: 'Staccato', category: 'articulacao' });
  ref.push({ char: '⠣⠇', dots: '1,2,6 1,2,3', description: 'Fermata', category: 'articulacao' });
  return ref;
}

export const QUICK_REFERENCE = getQuickReference();

export function describeBrailleChar(char: string): string {
  const entry = QUICK_REFERENCE.find(e => e.char === char);
  if (entry) return entry.description;
  return 'Símbolo';
}