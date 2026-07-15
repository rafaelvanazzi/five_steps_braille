/**
 * ScoreRenderer.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Renderiza partitura visual a partir de ParsedElement[] usando VexFlow 5.
 *
 * Correções do Bloco 3:
 *  1. Direção de intervalos estrita por contexto de clave:
 *       Treble / Mão Direita → DESCENDENTE (nota base = mais aguda)
 *       Bass   / Mão Esquerda → ASCENDENTE  (nota base = mais grave)
 *  2. Acordes: nota base + intervalos em um ÚNICO StaveNote (array 'keys').
 *     Acidentes de intervalo aplicados no índice exato da nota do acorde.
 *  3. Grand staff sincronizado: Mão Direita → pauta treble, Mão Esquerda →
 *     pauta bass, alinhadas verticalmente por StaveConnector BRACE.
 */

import { useEffect, useRef, useMemo } from 'react';
import {
  Renderer,
  Stave,
  StaveNote,
  StaveConnector,
  Voice,
  Formatter,
  Accidental,
  Dot,
  Beam,
  StaveTie,
  Fraction,
} from 'vexflow';
import type {
  ParsedElement,
  ParsedNote,
  ParsedRest,
  ParsedKeySignature,
} from '../lib/brailleMusic';
import { PREMIUM_CONTENT_ENABLED } from '../lib/brailleMusic';

// ─── INTERFACES LOCAIS ────────────────────────────────────────────────────────

interface ScoreRendererProps {
  elements: ParsedElement[];
  width?: number;
  height?: number;
  beatsPerMeasure?: number;
  /** Nível máximo de leitura a renderizar (1=básico, 2=intervalos, 3=grand staff) */
  maxLevel?: 1 | 2 | 3;
  /** Forçar modo de pauta dupla (grand staff) independente da detecção automática */
  grandStaff?: boolean;
  /**
   * Fator de escala do canvas VexFlow (padrão: 0.8).
   * Valores menores = partitura mais compacta; maiores = mais legível.
   * Range recomendado: 0.4–1.5
   */
  scaleRatio?: number;
  /**
   * sourceIndex da nota atualmente ativa no playback.
   * A StaveNote correspondente recebe fillStyle/strokeStyle azul (#3b82f6).
   * null ou undefined = nenhum destaque.
   */
  activeSourceIndex?: number | null;
  /** Chamado quando o usuário clica em uma nota — recebe sourceIndex */
  onNoteClick?: (sourceIndex: number) => void;
  /** @deprecated Use onNoteClick */
  onMeasureClick?: (sourceIndex: number) => void;
}

interface NoteHitArea {
  x: number; y: number; w: number; h: number;
  sourceIndex: number;
}

interface MeasureInfo {
  notes: ParsedElement[];
  barlineType: 'single' | 'end' | 'end-section' | 'repeat-begin' | 'repeat-end' | 'repeat-both';
  begBarlineType?: 'repeat-begin';
  sourceIndex?: number;
}

// ─── CONSTANTES ───────────────────────────────────────────────────────────────

const DIATONIC = ['C', 'D', 'E', 'F', 'G', 'A', 'B'] as const;
type DiatonicPitch = typeof DIATONIC[number];

const VALID_KEYS = ['C','G','D','A','E','B','F#','C#','F','Bb','Eb','Ab','Db','Gb','Cb'] as const;

/** Espaço do cabeçalho (clave + armadura + TS) no primeiro compasso. */
function firstMeasureExtra(ksCount: number, hasTS: boolean): number {
  return 36 + ksCount * 18 + 10 + (hasTS ? 26 : 0) + 16;
}

/** Quantidade de acidentes de uma armadura de clave. */
function ksAccidentalCount(vexKey: string | null): number {
  if (!vexKey) return 0;
  const sharps = ['G','D','A','E','B','F#','C#'];
  const flats  = ['F','Bb','Eb','Ab','Db','Gb','Cb'];
  const si = sharps.indexOf(vexKey);
  if (si !== -1) return si + 1;
  const fi = flats.indexOf(vexKey);
  if (fi !== -1) return fi + 1;
  return 0;
}

// ─── FUNÇÕES PURAS ─────────────────────────────────────────────────────────────

function groupIntoMeasures(elements: ParsedElement[]): MeasureInfo[] {
  const measures: MeasureInfo[] = [];
  let current: ParsedElement[] = [];
  let nextBeg: 'repeat-begin' | undefined;
  let currentSrc: number | undefined;

  for (const el of elements) {
    if (el.type === 'barline') {
      const bt = (el as any).barlineType as string | undefined;
      if (bt === 'repeat-begin' && current.length === 0) { nextBeg = 'repeat-begin'; continue; }
      if (!bt && current.length === 0) continue;

      let barType: MeasureInfo['barlineType'] = 'single';
      if      (bt === 'end')          barType = 'end';
      else if (bt === 'repeat-end')   barType = 'repeat-end';
      else if (bt === 'repeat-begin') barType = 'repeat-begin';

      measures.push({ notes: current, barlineType: barType, begBarlineType: nextBeg, sourceIndex: currentSrc });
      current = []; nextBeg = undefined; currentSrc = undefined;
    } else {
      if ((el.type === 'note' || el.type === 'rest') && currentSrc === undefined) {
        currentSrc = (el as any).sourceIndex;
      }
      current.push(el);
    }
  }

  if (current.length > 0 || nextBeg) {
    measures.push({ notes: current, barlineType: 'single', begBarlineType: nextBeg, sourceIndex: currentSrc });
  }

  // Detect repeat-both
  for (let i = 0; i < measures.length - 1; i++) {
    if (measures[i].barlineType === 'repeat-end' && measures[i + 1].begBarlineType === 'repeat-begin') {
      measures[i].barlineType = 'repeat-both';
      measures[i + 1].begBarlineType = undefined;
    }
  }
  return measures;
}

function noteToVexKey(note: ParsedNote): string {
  return `${note.pitch.toLowerCase()}/${note.octave}`;
}

function noteToVexDuration(el: ParsedNote | ParsedRest): string {
  return el.vexDuration.replace('d', '').replace('r', '');
}

function accidentalToVex(acc: string): string {
  switch (acc) {
    case 'sharp':        return '#';
    case 'flat':         return 'b';
    case 'natural':      return 'n';
    case 'double-sharp': return '##';
    case 'double-flat':  return 'bb';
    default:             return acc;
  }
}

function calcNoteWidth(el: ParsedElement, base: number): number {
  if (el.type !== 'note' && el.type !== 'rest') return 0;
  switch ((el as ParsedNote | ParsedRest).duration) {
    case 'w':  return base * 3;
    case 'h':  return base * 2;
    case 'q':  return base * 1.5;
    case '8':  return base * 1.2;
    case '16': return base * 0.8;
    case '32': return base * 0.7;
    default:   return base;
  }
}

/**
 * Constrói as keys VexFlow de um acorde (nota base + intervalos).
 *
 * REGRA MUSICAL (Manual Internacional de Musicografia Braille §1-10):
 *   Treble / Mão Direita → DESCENDENTE: a nota base é a mais aguda;
 *     os intervalos são contados para baixo.
 *     Ex.: base = G4, 3ª → E4 (terça abaixo)
 *   Bass / Mão Esquerda → ASCENDENTE: a nota base é a mais grave;
 *     os intervalos são contados para cima.
 *     Ex.: base = C3, 3ª → E3 (terça acima)
 *
 * O VexFlow exige que as keys estejam ordenadas de BAIXO para CIMA
 * (nota mais grave primeiro). Por isso, ao final, ordenamos por MIDI.
 *
 * @returns keys    — array 'pitch/octave' ordenado grave→agudo
 * @returns accMods — mapa índice-na-key → string acidente VexFlow
 */
/**
 * Mapa de armadura de clave → pitch → acidente implícito.
 * Usado para filtrar acidentes redundantes: se o acidente local é igual
 * ao da armadura, o VexFlow já o aplica — não adicionar novamente.
 */
const KEY_PITCH_ACCIDENTALS: Record<string, Record<string, string>> = {
  G:  { F: '#' },
  D:  { F: '#', C: '#' },
  A:  { F: '#', C: '#', G: '#' },
  E:  { F: '#', C: '#', G: '#', D: '#' },
  B:  { F: '#', C: '#', G: '#', D: '#', A: '#' },
  'F#': { F: '#', C: '#', G: '#', D: '#', A: '#', E: '#' },
  'C#': { F: '#', C: '#', G: '#', D: '#', A: '#', E: '#', B: '#' },
  F:  { B: 'b' },
  Bb: { B: 'b', E: 'b' },
  Eb: { B: 'b', E: 'b', A: 'b' },
  Ab: { B: 'b', E: 'b', A: 'b', D: 'b' },
  Db: { B: 'b', E: 'b', A: 'b', D: 'b', G: 'b' },
  Gb: { B: 'b', E: 'b', A: 'b', D: 'b', G: 'b', C: 'b' },
  Cb: { B: 'b', E: 'b', A: 'b', D: 'b', G: 'b', C: 'b', F: 'b' },
};

function buildChordKeys(
  baseNote: ParsedNote,
  intervalEls: Array<{
    intervalSize:   number;
    accidental?:    string;
    explicitOctave?: number;
    staccato?:      boolean;
    slur?:          boolean;
  }>,
  direction: 'ascending' | 'descending',
  activeKeySignature: string | null = null,
): { keys: string[]; accMods: Map<number, string> } {

  const SEMITONES: Record<DiatonicPitch, number> = { C:0, D:2, E:4, F:5, G:7, A:9, B:11 };
  const midiOf = (pitch: DiatonicPitch, octave: number) => (octave + 1) * 12 + SEMITONES[pitch];

  type Entry = { pitch: DiatonicPitch; octave: number; acc?: string };

  // Nota base — acidente incluído aqui; será mapeado ao índice correto após ordenação
  // NÃO aplicar o acidente da nota base fora desta função para evitar duplicação
  const entries: Entry[] = [{
    pitch:  baseNote.pitch as DiatonicPitch,
    octave: baseNote.octave,
    acc:    baseNote.accidental ? accidentalToVex(String(baseNote.accidental)) : undefined,
  }];

  // Intervalos
  for (const intEl of intervalEls) {
    const size    = intEl.intervalSize; // 2..8
    const steps   = size - 1;           // passos diatônicos
    const baseIdx = DIATONIC.indexOf(baseNote.pitch as DiatonicPitch);
    if (baseIdx === -1) continue;

    let newPitch:  DiatonicPitch;
    let newOctave: number;

    if (intEl.explicitOctave !== undefined) {
      // Oitava fornecida explicitamente pelo parser
      newPitch  = DIATONIC[((baseIdx + steps) % 7 + 7) % 7];
      newOctave = intEl.explicitOctave;
    } else if (direction === 'descending') {
      // Treble: contar para BAIXO
      const rawIdx = baseIdx - steps;
      newPitch  = DIATONIC[((rawIdx % 7) + 7) % 7];
      newOctave = rawIdx < 0
        ? baseNote.octave - Math.ceil(Math.abs(rawIdx) / 7)
        : baseNote.octave;
    } else {
      // Bass: contar para CIMA
      const rawIdx = baseIdx + steps;
      newPitch  = DIATONIC[rawIdx % 7];
      newOctave = rawIdx >= 7
        ? baseNote.octave + Math.floor(rawIdx / 7)
        : baseNote.octave;
    }

    entries.push({
      pitch:  newPitch,
      octave: newOctave,
      acc:    intEl.accidental ?? undefined,
    });
  }

  // Ordenar grave→agudo (VexFlow exige essa ordem)
  entries.sort((a, b) => midiOf(a.pitch, a.octave) - midiOf(b.pitch, b.octave));

  const keys:    string[]            = [];
  const accMods: Map<number, string> = new Map();

  const keyPitchMap = activeKeySignature ? (KEY_PITCH_ACCIDENTALS[activeKeySignature] ?? {}) : {};

  entries.forEach((e, idx) => {
    keys.push(`${e.pitch.toLowerCase()}/${e.octave}`);
    if (e.acc) {
      const implicitAcc = keyPitchMap[e.pitch.toUpperCase()];
      // Incluir o acidente em accMods SOMENTE se for diferente do implícito pela armadura.
      // Acidentes iguais à armadura são aplicados automaticamente pelo VexFlow — não duplicar.
      // Bequadro (n) sempre é explícito — cancela a armadura.
      if (e.acc === 'n' || e.acc !== implicitAcc) {
        accMods.set(idx, e.acc);
      }
    }
  });

  return { keys, accMods };
}

// ─── MAPA MATRICIAL DE COMPASSOS ─────────────────────────────────────────────

/**
 * Converte um array de MeasureInfo em um Map<number, MeasureInfo> indexado
 * pelo número de compasso real. Compassos sem notas reais são omitidos do mapa
 * mas mantêm o índice para preservar o alinhamento com a outra pauta.
 *
 * Isso implementa o alinhamento matricial: trebleTrack.get(N) e bassTrack.get(N)
 * são renderizados na mesma coordenada X.
 */
function buildMeasureTrack(measures: MeasureInfo[]): Map<number, MeasureInfo> {
  const track = new Map<number, MeasureInfo>();
  measures.forEach((m, idx) => track.set(idx, m));
  return track;
}

// ─── NUMERAÇÃO DE COMPASSOS ───────────────────────────────────────────────────

/**
 * Adiciona o número do compasso no topo de um stave.
 * Tenta usar StaveText do VexFlow 5 (método oficial).
 * Fallback: texto SVG nativo para compatibilidade com todos os backends.
 * O compasso 0 (primeiro) recebe o número 1, conforme notação convencional.
 */
function addMeasureNumber(
  ctx: ReturnType<Renderer['getContext']>,
  stave: Stave,
  measureIdx: number,
): void {
  const num = String(measureIdx + 1);
  try {
    // Tentar StaveText (VexFlow 5 nativo — posicionamento automático)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const VF = (window as any).VexFlow ?? (globalThis as any).VexFlow;
    if (VF?.StaveText) {
      const st = new VF.StaveText(num, 'above', { shiftX: 4, shiftY: -12, justification: 1 });
      stave.addModifier(st);
    } else {
      throw new Error('StaveText not available');
    }
  } catch {
    // Fallback: texto SVG posicionado manualmente
    try {
      const x = stave.getX() + 4;
      const y = stave.getY() - 5;
      ctx.save();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (ctx as any).setFont?.('Arial', 9, '');
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (ctx as any).setFillStyle?.('#555');
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (ctx as any).fillText?.(num, x, y);
      ctx.restore();
    } catch { /* ignora se nenhum método funcionar */ }
  }
}

// ─── SEPARAÇÃO POR MÃO ────────────────────────────────────────────────────────

interface HandSplit {
  trebleEls:    ParsedElement[];
  bassEls:      ParsedElement[];
  hasBothHands: boolean;
}

/**
 * Separa elementos por mão (Mão Direita → treble, Mão Esquerda → bass).
 *
 * LÓGICA DO LEITOR BRAILLE:
 * Na partitura de piano em braille, a mão direita é escrita primeiro com seus
 * compassos (0, 1, 2...). Ao encontrar o sinal de Mão Esquerda, o contador de
 * compassos RESETA para 0 (ver brailleMusic.ts: trebleMeasureIndex/bassMeasureIndex)
 * e a mão esquerda preenche os mesmos compassos em paralelo — cada nota, pausa,
 * intervalo e barline já carrega o measureIndex CORRETO e RELATIVO à sua própria
 * mão, atribuído pelo parser no momento da emissão.
 *
 * BUG CORRIGIDO: a implementação anterior empurrava barlines indiscriminadamente
 * para AMBOS os arrays (treble E bass) sempre que uma barline aparecia no fluxo
 * linear do documento — independente de qual mão estava ativa naquele ponto.
 * Como a convenção Braille de piano escreve TODA a mão direita primeiro (com
 * suas N barlines) e só DEPOIS toda a mão esquerda (com suas próprias N
 * barlines), isso fazia o array 'bass' acumular N barlines "fantasma" vindas
 * da seção da mão direita ANTES de qualquer nota real da esquerda aparecer —
 * resultando em compassos vazios no início da pauta bass e o conteúdo real da
 * mão esquerda só aparecendo a partir do compasso N (deslocamento temporal).
 *
 * CORREÇÃO: em vez de depender da ordem sequencial linear e duplicar barlines
 * às cegas, os elementos são agrupados em "baldes" (buckets) indexados
 * ESTRITAMENTE pelo measureIndex real de cada elemento — que já reflete a
 * posição correta e independente de cada mão, não a posição no texto linear.
 * Barlines são atribuídas apenas à mão em que realmente ocorreram, indexadas
 * pelo measureIndex do compasso que estão fechando. Isso garante que
 * trebleMeasures[i] e bassMeasures[i] sempre correspondam ao MESMO compasso
 * lógico, com correspondência direta de índice.
 */
function splitByHand(elements: ParsedElement[]): HandSplit {
  let currentHand: 'right' | 'left' | null = null;
  let sawRight = false;
  let sawLeft  = false;

  // Elementos globais (armadura, TS, clave) → aplicados a ambas as pautas,
  // sempre no início do stream reconstruído de cada mão.
  const globalEls: ParsedElement[] = [];

  // Buckets por mão: measureIndex → lista de notas/pausas/intervalos daquele compasso
  const trebleBuckets = new Map<number, ParsedElement[]>();
  const bassBuckets   = new Map<number, ParsedElement[]>();

  // Tipo de barline que FECHA cada compasso, indexado por measureIndex, por mão
  const trebleBarlineType = new Map<number, string>();
  const bassBarlineType   = new Map<number, string>();

  for (const el of elements) {
    // Sinal de mão: trocar o fluxo ativo (não entra nos buckets de compasso)
    if (el.type === 'hand') {
      currentHand = (el as any).hand as 'right' | 'left';
      if (currentHand === 'right') sawRight = true;
      else                          sawLeft  = true;
      continue;
    }

    // Elementos globais → ambas as pautas (independente da mão atual)
    if (el.type === 'keysignature' || el.type === 'timesignature' || el.type === 'clef') {
      globalEls.push(el);
      continue;
    }

    // Barlines → atribuídas SOMENTE à mão ativa no momento em que ocorreram,
    // indexadas pelo measureIndex do compasso que estão fechando (nunca às
    // cegas para ambas as pautas — essa era a causa raiz do deslocamento).
    if (el.type === 'barline') {
      const idx   = (el as any).measureIndex as number | undefined ?? 0;
      const bType = ((el as any).barlineType as string | undefined) ?? 'single';
      if (currentHand === 'left') bassBarlineType.set(idx, bType);
      else                        trebleBarlineType.set(idx, bType);
      continue;
    }

    // Notas, pausas, intervalos → bucketed pelo measureIndex REAL do elemento
    // (atribuído pelo parser, relativo à mão ativa — não à posição linear no texto)
    const idx = (el as any).measureIndex as number | undefined ?? 0;
    if (currentHand === 'left') {
      if (!bassBuckets.has(idx)) bassBuckets.set(idx, []);
      bassBuckets.get(idx)!.push(el);
    } else {
      if (!trebleBuckets.has(idx)) trebleBuckets.set(idx, []);
      trebleBuckets.get(idx)!.push(el);
    }
  }

  /**
   * Reconstrói o stream linear de UMA mão a partir de seus buckets por
   * measureIndex, sintetizando a barline correta na posição exata de cada
   * compasso. O resultado é consumido, sem nenhuma outra alteração, pela
   * função groupIntoMeasures() já existente — preservando toda a lógica
   * downstream de agrupamento de compassos intacta.
   */
  function buildLinearStreamForHand(
    buckets:      Map<number, ParsedElement[]>,
    barlineTypes: Map<number, string>,
  ): ParsedElement[] {
    const allIdxs = [...Array.from(buckets.keys()), ...Array.from(barlineTypes.keys())];
    const maxIdx  = allIdxs.length > 0 ? Math.max(...allIdxs) : -1;
    const out: ParsedElement[] = [...globalEls];
    for (let i = 0; i <= maxIdx; i++) {
      const notesForMeasure = buckets.get(i) ?? [];
      out.push(...notesForMeasure);
      const bType = barlineTypes.get(i) ?? 'single';
      out.push({
        type: 'barline',
        barlineType: bType as any,
        sourceIndex: 0,
        measureIndex: i,
        level: 1 as const,
        isPremium: false,
      } as any);
    }
    return out;
  }

  const treble = buildLinearStreamForHand(trebleBuckets, trebleBarlineType);
  const bass   = buildLinearStreamForHand(bassBuckets,   bassBarlineType);

  return {
    trebleEls:    sawRight && sawLeft ? treble   : elements,
    bassEls:      sawRight && sawLeft ? bass     : [],
    hasBothHands: sawRight && sawLeft,
  };
}

// ─── ENGINE DE RENDERIZAÇÃO DE UMA PAUTA ─────────────────────────────────────

/**
 * Empilha um StaveTie (ou par de StaveTies parciais) conectando duas notas.
 *
 * Se ambas as notas estão no MESMO sistema (Y aproximadamente igual), desenha
 * um único arco contínuo StaveTie({ firstNote, lastNote }).
 *
 * Se as notas estão em SISTEMAS DIFERENTES (quebra de linha vertical entre
 * elas), usa o suporte nativo do VexFlow para arcos parciais/abertos:
 *   - StaveTie({ firstNote: origem })  → desenha do noteheads até a borda
 *     direita da pauta de origem (sem lastNote, o VexFlow estende o arco).
 *   - StaveTie({ lastNote: destino })  → desenha da borda esquerda da pauta
 *     de destino até o notehead (sem firstNote, o VexFlow inicia do início
 *     da pauta).
 * O resultado visual: o arco "se estende até o fim da pauta superior e
 * continua a partir do início da pauta inferior", sem cancelar a ligadura.
 */
function pushTieOrPartial(
  tiesToDraw: StaveTie[],
  originNote: StaveNote,
  originY:    number,
  destNote:   StaveNote,
  destY:      number,
): void {
  const sameSystem = Math.abs(destY - originY) < 5;

  if (sameSystem) {
    try {
      tiesToDraw.push(new StaveTie({ firstNote: originNote, lastNote: destNote } as any));
    } catch { /* ignora falha de API */ }
    return;
  }

  // Sistemas diferentes: dois arcos parciais nativos do VexFlow
  try {
    tiesToDraw.push(new StaveTie({ firstNote: originNote } as any)); // até o fim da pauta superior
  } catch { /* ignora */ }
  try {
    tiesToDraw.push(new StaveTie({ lastNote: destNote } as any)); // a partir do início da pauta inferior
  } catch { /* ignora */ }
}

/**
 * Estado de ligaduras/prolongações para UMA sequência de pauta (uma "mão").
 * Extraído em objeto mutável para permitir instâncias INDEPENDENTES por mão
 * no Grand Staff — uma tie na mão direita nunca interfere no estado da
 * mão esquerda, e vice-versa.
 */
interface TieRenderState {
  activeTieStartNote:  StaveNote | null;
  activeTieStartY:     number;
  activeSlurMap:       Map<string, StaveNote>;
  activeSlurYMap:      Map<string, number>;
  activePedagogicMap:  Map<string, StaveNote>;
  activePedagogicYMap: Map<string, number>;
}

function createTieRenderState(): TieRenderState {
  return {
    activeTieStartNote:  null,
    activeTieStartY:     0,
    activeSlurMap:       new Map(),
    activeSlurYMap:      new Map(),
    activePedagogicMap:  new Map(),
    activePedagogicYMap: new Map(),
  };
}

/**
 * Renderiza as StaveNotes de UM compasso dentro de UMA stave já criada.
 * Extraído de renderStaveSystem para ser reutilizado tanto pelo caminho de
 * pauta única quanto pelo Grand Staff sincronizado (renderGrandStaffSystem) —
 * garante que ambos os caminhos usem EXATAMENTE a mesma lógica de acordes,
 * ligaduras, beaming e destaque de playback, sem divergência de comportamento.
 *
 * Retorna false se o compasso não pôde ser formatado (erro de Voice/Formatter),
 * permitindo ao chamador decidir como avançar o cursor X mesmo assim.
 */
function renderMeasureNotesIntoStave(
  ctx:              ReturnType<Renderer['getContext']>,
  stave:            Stave,
  mNotes:           ParsedElement[],
  clef:             string,
  intervalDir:      'ascending' | 'descending',
  keySignature:     string | null,
  timeSignature:    { numerator: number; denominator: number },
  hitAreas:         NoteHitArea[],
  activeSourceIndex: number | null | undefined,
  tieState:         TieRenderState,
  staveY:           number,
  staveW:           number,
  extraW:           number,
  measureIdx:       number,
): void {
  const vexNotes:  StaveNote[]             = [];
  const srcIdxs:   (number | undefined)[]  = [];
  const skipSet = new Set<number>();

  const tiesToDraw: StaveTie[] = [];

  // ── measureAccidentalsTrack: persistência visual de acidentes por compasso ──
  // Regra MIMB/teoria tradicional: acidente impresso uma vez persiste até a barline.
  // Reinicializado a cada chamada (= cada compasso), local a esta invocação.
  const measureAccidentalsTrack = new Map<string, string>();

  for (let ni = 0; ni < mNotes.length; ni++) {
    if (skipSet.has(ni)) continue;
    const el = mNotes[ni];

    // Pausas
    if (el.type === 'rest') {
      const restEl  = el as ParsedRest;
      const restDur = noteToVexDuration(restEl) + 'r';
      const vr = new StaveNote({ keys: [clef === 'bass' ? 'd/3' : 'b/4'], duration: restDur, clef });
      if (restEl.dotted) Dot.buildAndAttach([vr], { all: true });
      vexNotes.push(vr);
      srcIdxs.push((restEl as any).sourceIndex);
      continue;
    }

    // Notas (com possíveis intervalos)
    if (el.type === 'note') {
      const noteEl = el as ParsedNote;

      const intervalEls: Array<{
        intervalSize:    number;
        accidental?:     string;
        explicitOctave?: number;
        staccato?:       boolean;
        slur?:           boolean;
      }> = [];
      for (let ji = ni + 1; ji < mNotes.length; ji++) {
        const nxt = mNotes[ji];
        if (nxt.type !== 'interval') break;
        const intAny = nxt as any;
        intervalEls.push({
          intervalSize:   intAny.intervalSize as number,
          accidental:     intAny.accidental ? accidentalToVex(String(intAny.accidental)) : undefined,
          explicitOctave: intAny.explicitOctave as number | undefined,
          staccato:       intAny.staccato as boolean | undefined,
          slur:           intAny.slur as boolean | undefined,
        });
        skipSet.add(ji);
      }

      const { keys, accMods } = buildChordKeys(noteEl, intervalEls, intervalDir, keySignature);
      const vn = new StaveNote({ keys, duration: noteToVexDuration(noteEl), clef });

      accMods.forEach((vexAcc, keyIdx) => {
        const keyPitch = keys[keyIdx] ?? '?';
        const prevAcc  = measureAccidentalsTrack.get(keyPitch);
        if (prevAcc !== vexAcc) {
          try {
            vn.addModifier(new Accidental(vexAcc), keyIdx);
            measureAccidentalsTrack.set(keyPitch, vexAcc);
          } catch { /* ignora falha de API */ }
        }
      });

      if (noteEl.dotted) Dot.buildAndAttach([vn], { all: true });

      // ── Destaque visual da nota ativa no playback ─────────────────────
      if (
        activeSourceIndex !== null &&
        activeSourceIndex !== undefined &&
        (noteEl as any).sourceIndex === activeSourceIndex
      ) {
        try {
          vn.setStyle({ fillStyle: '#3b82f6', strokeStyle: '#3b82f6' });
        } catch { /* VexFlow version sem setStyle — ignorar */ }
      }

      // ── Ligaduras e Prolongações — Modelo Neutro (Cérebro) ───────────────
      const noteTieRole  = (noteEl as any).tieRole   as 'start' | 'end' | undefined;
      const noteSlurRole = (noteEl as any).slurRole  as 'start' | 'end' | undefined;
      const noteLongId   = (noteEl as any).slurLongId as string | undefined;
      const notePedRole  = (noteEl as any).slurRolePedagogic   as 'start' | 'end' | undefined;
      const notePedId    = (noteEl as any).slurLongIdPedagogic as string | undefined;

      // Canal 1: Tie de Prolongação
      if (noteTieRole === 'start') {
        tieState.activeTieStartNote = vn;
        tieState.activeTieStartY    = staveY;
      }
      if (noteTieRole === 'end' && tieState.activeTieStartNote !== null) {
        pushTieOrPartial(tiesToDraw, tieState.activeTieStartNote, tieState.activeTieStartY, vn, staveY);
        tieState.activeTieStartNote = null;
      }

      // Canal 2: Slur de Expressão / Fraseio
      if (noteSlurRole === 'start' && noteLongId) {
        tieState.activeSlurMap.set(noteLongId, vn);
        tieState.activeSlurYMap.set(noteLongId, staveY);
      }
      if (noteSlurRole === 'end' && noteLongId) {
        const startVn = tieState.activeSlurMap.get(noteLongId);
        const startY  = tieState.activeSlurYMap.get(noteLongId);
        if (startVn !== undefined && startY !== undefined) {
          pushTieOrPartial(tiesToDraw, startVn, startY, vn, staveY);
          tieState.activeSlurMap.delete(noteLongId);
          tieState.activeSlurYMap.delete(noteLongId);
        }
      }

      // Canal 3: Ligadura Longa Pedagógica
      if (notePedRole === 'start' && notePedId) {
        tieState.activePedagogicMap.set(notePedId, vn);
        tieState.activePedagogicYMap.set(notePedId, staveY);
      }
      if (notePedRole === 'end' && notePedId) {
        const startVn = tieState.activePedagogicMap.get(notePedId);
        const startY  = tieState.activePedagogicYMap.get(notePedId);
        if (startVn !== undefined && startY !== undefined) {
          pushTieOrPartial(tiesToDraw, startVn, startY, vn, staveY);
          tieState.activePedagogicMap.delete(notePedId);
          tieState.activePedagogicYMap.delete(notePedId);
        }
      }

      vexNotes.push(vn);
      srcIdxs.push((noteEl as any).sourceIndex);
    }
  }

  if (vexNotes.length === 0) return;

  // ── Voice ────────────────────────────────────────────────────────────
  const voice = new Voice({ numBeats: timeSignature.numerator, beatValue: timeSignature.denominator });
  voice.setMode(2); // SOFT

  const isCompound = (
    timeSignature.denominator === 8 &&
    [6, 9, 12].includes(timeSignature.numerator)
  );

  let beams: Beam[] = [];
  try {
    beams = isCompound
      ? Beam.generateBeams(vexNotes, { groups: [new Fraction(3, 8)] })
      : Beam.generateBeams(vexNotes);
    beams.forEach(b => b.setContext(ctx));

    if (activeSourceIndex !== null && activeSourceIndex !== undefined) {
      const activeVexNote = vexNotes.find((_, idx) => srcIdxs[idx] === activeSourceIndex);
      if (activeVexNote) {
        beams.forEach(b => {
          const beamNotes = (b as any).notes as StaveNote[] | undefined;
          if (beamNotes?.includes(activeVexNote)) {
            try {
              b.setStyle({ fillStyle: '#3b82f6', strokeStyle: '#3b82f6' });
            } catch { /* VexFlow version sem setStyle em Beam — ignorar */ }
          }
        });
      }
    }
  } catch {
    beams = [];
  }

  voice.addTickables(vexNotes);

  try {
    const notesArea = Math.max(staveW - extraW - 20, 60);
    new Formatter().joinVoices([voice]).format([voice], notesArea);
    voice.draw(ctx, stave);
    beams.forEach(b => { try { b.draw(); } catch { /* ignora — beam pode não ter notas */ } });
    tiesToDraw.forEach(t => { try { t.setContext(ctx).draw(); } catch { /* ignora */ } });
  } catch (e) {
    console.warn(`[ScoreRenderer] format/draw error (measure ${measureIdx}):`, e);
    return;
  }

  // ── Hit areas para click ─────────────────────────────────────────────
  for (let j = 0; j < vexNotes.length; j++) {
    const srcIdx = srcIdxs[j];
    if (srcIdx === undefined) continue;
    try {
      const bb = vexNotes[j].getBoundingBox();
      if (bb) hitAreas.push({ x: bb.getX(), y: bb.getY(), w: bb.getW(), h: bb.getH(), sourceIndex: srcIdx });
    } catch {
      try {
        const nx = vexNotes[j].getAbsoluteX();
        hitAreas.push({ x: nx - 10, y: staveY - 10, w: 30, h: 90, sourceIndex: srcIdx });
      } catch { /* ignora */ }
    }
  }
}

/**
 * Cria a Stave de UM compasso (aplicando cabeçalho de sistema, barlines) sem
 * ainda renderizar as notas — separado para ser chamado de forma sincronizada
 * por renderGrandStaffSystem (treble e bass da MESMA posição X e do MESMO
 * sistema visual).
 */
function createMeasureStave(
  ctx:             ReturnType<Renderer['getContext']>,
  x:               number,
  y:               number,
  staveW:          number,
  measure:         MeasureInfo,
  clef:            string,
  keySignature:    string | null,
  timeSignatureEl: any,
  isSystem:        boolean,
  isFirst:         boolean,
  showMeasureNumbers: boolean,
  measureIdx:      number,
): Stave {
  const stave = new Stave(x, y, staveW);
  stave.setContext(ctx);

  // Reinjetar clave e armadura no início de CADA SISTEMA (não só no primeiro compasso global)
  if (isSystem) {
    stave.addClef(clef);
    if (keySignature && (VALID_KEYS as readonly string[]).includes(keySignature)) {
      try { stave.addKeySignature(keySignature); } catch { /* ignora */ }
    }
    // Fórmula de compasso: apenas no primeiro compasso global (início da música)
    if (isFirst && timeSignatureEl) {
      const abbr = timeSignatureEl._abbreviated;
      const num  = timeSignatureEl.numerator as number;
      const den  = timeSignatureEl.denominator as number;
      try {
        if      (abbr === 'C')  stave.addTimeSignature('C');
        else if (abbr === 'C|') stave.addTimeSignature('C|');
        else if (num && den)    stave.addTimeSignature(`${num}/${den}`);
      } catch { /* ignora */ }
    }
  }

  if (measure.begBarlineType === 'repeat-begin') stave.setBegBarType(4);
  if      (measure.barlineType === 'end')          stave.setEndBarType(3);
  else if (measure.barlineType === 'end-section')  stave.setEndBarType(3);
  else if (measure.barlineType === 'repeat-end')   stave.setEndBarType(5);
  else if (measure.barlineType === 'repeat-begin') stave.setEndBarType(4);
  else if (measure.barlineType === 'repeat-both')  stave.setEndBarType(6);

  stave.draw();
  if (showMeasureNumbers) {
    addMeasureNumber(ctx, stave, measureIdx);
  }

  return stave;
}

/**
 * Renderiza uma sequência de compassos em UMA ÚNICA pauta (sem Grand Staff).
 * Retorna o array de Stave criados.
 */
function renderStaveSystem(
  ctx:            ReturnType<Renderer['getContext']>,
  measures:       MeasureInfo[],
  startX:         number,
  startY:         number,
  staveWidths:    number[],
  clef:           string,
  intervalDir:    'ascending' | 'descending',
  keySignature:   string | null,
  timeSignatureEl: any,
  timeSignature:  { numerator: number; denominator: number },
  hitAreas:       NoteHitArea[],
  showMeasureNumbers: boolean = false,
  availableWidth:  number = 900,
  systemHeight:    number = 110,
  activeSourceIndex?: number | null,
): { staves: Stave[]; totalHeight: number } {
  const staves: Stave[] = [];
  const MARGIN_RIGHT = 20;
  let x = startX;
  let y = startY;
  let systemIdx = 0;

  const tieState = createTieRenderState();

  const measureTrack = buildMeasureTrack(measures);
  const maxIdx = Math.max(measures.length - 1, 0);

  for (let i = 0; i <= maxIdx; i++) {
    const measure = measureTrack.get(i) ?? { notes: [], barlineType: 'single' as const };
    let staveW  = staveWidths[i] ?? 200;
    const isFirstOfSystem = (i === 0) || (x + staveW > availableWidth - MARGIN_RIGHT);
    if (isFirstOfSystem && i > 0) {
      x = startX;
      y = startY + (++systemIdx) * systemHeight;
    }
    const isFirst  = i === 0;
    const isSystem = isFirstOfSystem;
    const ksN      = ksAccidentalCount(keySignature);
    const extraW   = isSystem ? firstMeasureExtra(ksN, isFirst && !!timeSignatureEl) : 0;
    if (isSystem) staveW = Math.max(staveW, staveW + extraW);

    const mNotes = measure.notes.filter(n =>
      n.type === 'note' || n.type === 'rest' || n.type === 'interval'
    );
    const hasRealNotes  = mNotes.some(n => n.type === 'note' || n.type === 'rest');
    const hasHeaderOnly = !hasRealNotes && measure.notes.some(
      n => n.type === 'keysignature' || n.type === 'timesignature' || n.type === 'clef'
    );
    const isFinalBar = measure.barlineType === 'end' || measure.barlineType === 'end-section';

    if (!hasRealNotes && !hasHeaderOnly && !isFinalBar) {
      x += staveW; continue;
    }

    const stave = createMeasureStave(
      ctx, x, y, staveW, measure, clef, keySignature, timeSignatureEl,
      isSystem, isFirst, showMeasureNumbers, i,
    );
    staves.push(stave);

    if (mNotes.length === 0 || (hasHeaderOnly && !hasRealNotes)) {
      x += staveW; continue;
    }

    renderMeasureNotesIntoStave(
      ctx, stave, mNotes, clef, intervalDir, keySignature, timeSignature,
      hitAreas, activeSourceIndex, tieState, y, staveW, extraW, i,
    );

    x += staveW;
  }

  const totalHeight = systemIdx > 0
    ? (systemIdx + 1) * systemHeight
    : systemHeight;
  return { staves, totalHeight };
}

/**
 * Renderiza o GRAND STAFF (pauta dupla de piano) com PAGINAÇÃO UNIFICADA:
 * treble e bass são processados em um ÚNICO loop, compasso a compasso,
 * decidindo a quebra de sistema pela largura MÁXIMA entre as duas mãos
 * (já pré-computada em staveWidths[i] = max(trebleWidth[i], bassWidth[i])).
 *
 * Isso elimina o bug estrutural em que treble e bass eram renderizados como
 * dois blocos INDEPENDENTES e sequenciais (todo o treble primeiro, depois
 * todo o bass abaixo) — causando desalinhamento crônico assim que qualquer
 * um dos dois lados precisasse de um número diferente de sistemas.
 *
 * Cada sistema agora é uma unidade atômica: treble[i] e bass[i] nascem no
 * MESMO x, o cabeçalho (clave+armadura) é reinjetado SIMULTANEAMENTE em
 * ambas as pautas, e o StaveConnector (BRACE+DOUBLE) é desenhado
 * imediatamente para aquele par — nunca apenas no primeiro compasso global.
 */
function renderGrandStaffSystem(
  ctx:             ReturnType<Renderer['getContext']>,
  trebleMeasures:  MeasureInfo[],
  bassMeasures:    MeasureInfo[],
  startX:          number,
  startY:          number,
  staveWidths:     number[],
  keySignature:    string | null,
  timeSignatureEl: any,
  timeSignature:   { numerator: number; denominator: number },
  hitAreas:        NoteHitArea[],
  availableWidth:  number,
  systemHeight:    number,
  activeSourceIndex: number | null | undefined,
  staveGap:        number,   // distância vertical entre a pauta treble e a bass DENTRO do mesmo sistema
  staveBlockH:     number,   // altura nominal de uma única pauta (para avançar Y corretamente)
): { trebleStaves: Stave[]; bassStaves: Stave[]; totalHeight: number } {
  const trebleStaves: Stave[] = [];
  const bassStaves:   Stave[] = [];
  const MARGIN_RIGHT = 20;
  let x = startX;
  let systemIdx = 0;

  // Estado de ligaduras SEPARADO por mão — uma tie na mão direita nunca
  // interfere no estado de ligadura da mão esquerda.
  const trebleTieState = createTieRenderState();
  const bassTieState   = createTieRenderState();

  const trebleTrack = buildMeasureTrack(trebleMeasures);
  const bassTrack   = buildMeasureTrack(bassMeasures);

  // ── Paginação UNIFICADA: usa o MAIOR número de compassos entre as duas mãos ──
  const maxMeasures = Math.max(trebleMeasures.length, bassMeasures.length, 1);
  const maxIdx = maxMeasures - 1;

  const ksN = ksAccidentalCount(keySignature);

  for (let i = 0; i <= maxIdx; i++) {
    const tMeasure = trebleTrack.get(i) ?? { notes: [], barlineType: 'single' as const };
    const bMeasure = bassTrack.get(i)   ?? { notes: [], barlineType: 'single' as const };

    // Largura já unificada (staveWidths[i] = max(trebleWidth[i], bassWidth[i]))
    let staveW = staveWidths[i] ?? 200;

    // ── Decisão de quebra de sistema — UMA ÚNICA decisão para ambas as mãos ──
    const isFirstOfSystem = (i === 0) || (x + staveW > availableWidth - MARGIN_RIGHT);
    if (isFirstOfSystem && i > 0) {
      x = startX;
      systemIdx++;
    }

    const isFirst  = i === 0;
    const isSystem = isFirstOfSystem;
    const extraW   = isSystem ? firstMeasureExtra(ksN, isFirst && !!timeSignatureEl) : 0;
    if (isSystem) staveW = Math.max(staveW, staveW + extraW);

    // ── Coordenadas Y deste sistema — treble e bass sempre no MESMO sistema ──
    const yTreble = startY + systemIdx * systemHeight;
    const yBass   = yTreble + staveBlockH + staveGap;

    const tNotes = tMeasure.notes.filter(n => n.type === 'note' || n.type === 'rest' || n.type === 'interval');
    const bNotes = bMeasure.notes.filter(n => n.type === 'note' || n.type === 'rest' || n.type === 'interval');

    const tHasReal = tNotes.some(n => n.type === 'note' || n.type === 'rest');
    const bHasReal = bNotes.some(n => n.type === 'note' || n.type === 'rest');
    const tHeaderOnly = !tHasReal && tMeasure.notes.some(n => n.type === 'keysignature' || n.type === 'timesignature' || n.type === 'clef');
    const bHeaderOnly = !bHasReal && bMeasure.notes.some(n => n.type === 'keysignature' || n.type === 'timesignature' || n.type === 'clef');
    const tFinalBar = tMeasure.barlineType === 'end' || tMeasure.barlineType === 'end-section';
    const bFinalBar = bMeasure.barlineType === 'end' || bMeasure.barlineType === 'end-section';

    // Se NENHUMA das duas mãos tem conteúdo relevante neste índice, pular o slot inteiro
    const tSkip = !tHasReal && !tHeaderOnly && !tFinalBar;
    const bSkip = !bHasReal && !bHeaderOnly && !bFinalBar;
    if (tSkip && bSkip) { x += staveW; continue; }

    // ── Criar AMBAS as staves deste sistema, SEMPRE no mesmo x ─────────────
    // (mesmo que uma das mãos esteja "vazia" neste índice, desenhamos uma
    // stave estéril para preservar o alinhamento vertical rigoroso — evita
    // que uma clave fique "flutuando" sem sua contraparte embaixo/em cima).
    const staveTreble = createMeasureStave(
      ctx, x, yTreble, staveW, tMeasure, 'treble', keySignature, timeSignatureEl,
      isSystem, isFirst, true, i,
    );
    trebleStaves.push(staveTreble);

    const staveBass = createMeasureStave(
      ctx, x, yBass, staveW, bMeasure, 'bass', keySignature, timeSignatureEl,
      isSystem, isFirst, false, i,
    );
    bassStaves.push(staveBass);

    // ── StaveConnector (BRACE + DOUBLE) — desenhado para CADA sistema, não só o primeiro ──
    if (isSystem) {
      try {
        const brace = new StaveConnector(staveTreble, staveBass);
        brace.setType(StaveConnector.type.BRACE);
        brace.setContext(ctx).draw();

        const lineL = new StaveConnector(staveTreble, staveBass);
        lineL.setType(StaveConnector.type.DOUBLE);
        lineL.setContext(ctx).draw();
      } catch (e) {
        console.warn(`[ScoreRenderer] StaveConnector error (sistema ${systemIdx}):`, e);
      }
    }

    // ── Renderizar notas de cada mão em sua stave, com estado de ligadura próprio ──
    if (!tSkip && tNotes.length > 0) {
      renderMeasureNotesIntoStave(
        ctx, staveTreble, tNotes, 'treble', 'descending', keySignature, timeSignature,
        hitAreas, activeSourceIndex, trebleTieState, yTreble, staveW, extraW, i,
      );
    }
    if (!bSkip && bNotes.length > 0) {
      renderMeasureNotesIntoStave(
        ctx, staveBass, bNotes, 'bass', 'ascending', keySignature, timeSignature,
        hitAreas, activeSourceIndex, bassTieState, yBass, staveW, extraW, i,
      );
    }

    x += staveW;
  }

  const totalHeight = (systemIdx + 1) * systemHeight;
  return { trebleStaves, bassStaves, totalHeight };
}

// ─── COMPONENTE PRINCIPAL ─────────────────────────────────────────────────────

export default function ScoreRenderer({
  elements,
  width = 1000,
  height = 300,
  beatsPerMeasure = 4,
  maxLevel = 3,
  grandStaff: grandStaffProp,
  scaleRatio = 0.8,
  activeSourceIndex,
  onNoteClick,
  onMeasureClick,
}: ScoreRendererProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const noteHitAreas = useRef<NoteHitArea[]>([]);
  const handleClick  = onNoteClick || onMeasureClick;

  // ── Derivações estáticas ───────────────────────────────────────────────────

  // Filtrar elementos por nível de leitura e disponibilidade premium
  const filteredElements = useMemo(() => {
    return elements.filter(el => {
      const elAny = el as any;
      const elLevel: number = elAny.level ?? 1;
      if (elLevel > maxLevel) return false;
      if (elAny.isPremium && !PREMIUM_CONTENT_ENABLED) return false;
      return true;
    });
  }, [elements, maxLevel]);

  const timeSignatureEl = useMemo(() =>
    (filteredElements.find(el => el.type === 'timesignature') as any) ?? null,
  [filteredElements]);

  const timeSignature = useMemo(() => {
    if (timeSignatureEl) return { numerator: timeSignatureEl.numerator as number, denominator: timeSignatureEl.denominator as number };
    return { numerator: beatsPerMeasure, denominator: 4 };
  }, [timeSignatureEl, beatsPerMeasure]);

  const keySignature = useMemo(() => {
    const el = filteredElements.find(e => e.type === 'keysignature') as ParsedKeySignature | undefined;
    return el?.vexKey ?? null;
  }, [filteredElements]);

  // ── Clave e direção de intervalos ─────────────────────────────────────────
  // Lê os campos ParsedHand.impliedClef / ParsedClef.intervalDirection
  // emitidos pelo brailleMusic.ts.
  // Fallback seguro: treble + descending quando nenhuma clave está presente.
  const { activeClef, intervalDirection } = useMemo(() => {
    for (const el of filteredElements) {
      if (el.type === 'hand') {
        const h = el as any;
        return {
          activeClef:        (h.impliedClef ?? (h.hand === 'left' ? 'bass' : 'treble')) as string,
          intervalDirection: (h.intervalDirection ?? (h.hand === 'left' ? 'ascending' : 'descending')) as 'ascending' | 'descending',
        };
      }
      if (el.type === 'clef') {
        const c  = el as any;
        const ct = (c.clefType as string) ?? 'treble';
        return {
          activeClef:        ct,
          intervalDirection: (c.intervalDirection ?? (ct === 'bass' ? 'ascending' : 'descending')) as 'ascending' | 'descending',
        };
      }
      if (el.type === 'note') break;
    }
    return { activeClef: 'treble', intervalDirection: 'descending' as const };
  }, [filteredElements]);

  // ── Grand staff ────────────────────────────────────────────────────────────
  const { trebleEls, bassEls, hasBothHands: detectedBothHands } = useMemo(
    () => splitByHand(filteredElements),
    [filteredElements]
  );
  // hasBothHands: auto-detectado OU forçado pela prop grandStaff
  const hasBothHands = grandStaffProp ?? detectedBothHands;

  const GRAND_GAP  = 60;
  const bassStartY = hasBothHands ? height + GRAND_GAP : 0;

  const trebleMeasures = useMemo(() => groupIntoMeasures(trebleEls), [trebleEls]);
  const bassMeasures   = useMemo(() => groupIntoMeasures(bassEls),   [bassEls]);

  // Larguras de compasso: calculadas por índice matricial (trebleTrack.get(N) ↔ bassTrack.get(N))
  // Garante alinhamento vertical perfeito: compasso N de ambas as pautas na mesma coordenada X
  const staveWidths = useMemo(() => {
    const BASE      = 50;
    const MIN       = 200;
    const ksN       = ksAccidentalCount(keySignature);
    // Usar o mapa matricial para indexação correta
    const tTrack    = buildMeasureTrack(trebleMeasures);
    const bTrack    = buildMeasureTrack(bassMeasures);
    const nMeasures = Math.max(tTrack.size, bTrack.size, 1);

    return Array.from({ length: nMeasures }, (_, i) => {
      const tMeasure = tTrack.get(i);
      const bMeasure = bTrack.get(i);
      const extra    = i === 0 ? firstMeasureExtra(ksN, !!timeSignatureEl) : 0;

      const tNotes = tMeasure?.notes.filter(n => n.type === 'note' || n.type === 'rest' || n.type === 'interval') ?? [];
      const bNotes = bMeasure?.notes.filter(n => n.type === 'note' || n.type === 'rest' || n.type === 'interval') ?? [];

      const tW = tNotes.reduce((s, n) => s + calcNoteWidth(n, BASE), 0);
      const bW = bNotes.reduce((s, n) => s + calcNoteWidth(n, BASE), 0);

      // Largura = máximo entre treble e bass para alinhamento perfeito
      return Math.max(MIN, Math.max(tW, bW) + extra + 40);
    });
  }, [trebleMeasures, bassMeasures, keySignature, timeSignatureEl]);

  // hasHeaderTokens: elevado para useMemo em escopo de componente — precisa
  // ser acessível tanto dentro do corpo do useEffect (para a checagem de
  // pauta estéril) quanto no array de dependências desse mesmo efeito.
  // BUG CORRIGIDO: estava declarado como 'const' dentro do próprio useEffect,
  // mas referenciado no array de deps — escopo inválido que nunca compilaria
  // sob verificação real de TypeScript (só não fora pego por checagens
  // heurísticas anteriores em vez de tsc de fato).
  const hasHeaderTokens = useMemo(() =>
    filteredElements.some(
      e => e.type === 'keysignature' || e.type === 'timesignature' || e.type === 'clef'
    ),
  [filteredElements]);

  // ── Efeito principal de renderização ──────────────────────────────────────
  // Renderizar mesmo quando trebleMeasures está vazio (só há tokens de cabeçalho:
  // keysignature, timesignature, clef). Nesse caso, desenhamos a pauta estéril
  // com Clave + Armadura + Fórmula de Compasso sem nenhuma voz/formatter.
  useEffect(() => {
    if (!containerRef.current) return;
    // Se não há compassos E não há elementos de cabeçalho, não há nada a desenhar
    if (trebleMeasures.length === 0 && !hasHeaderTokens) return;
    containerRef.current.innerHTML = '';
    noteHitAreas.current = [];

    // +30 de offset inicial (margem para StaveConnector BRACE) + 20 de padding direito
    // Largura disponível para cada sistema (excluindo margem inicial de 30px)
    const AVAIL_WIDTH   = Math.max(width - 10, 400);
    // STAVE_BLOCK_H: altura nominal de UMA única pauta (5 linhas + margem de segurança)
    const STAVE_BLOCK_H = 80;
    // SYSTEM_H: distância entre o início de um sistema e o início do próximo.
    // Grand Staff: 2 pautas (treble+bass) + 2 gaps (entre elas e após o sistema).
    // Pauta simples: valor histórico de 110 preservado sem alteração.
    const SYSTEM_H    = hasBothHands ? (STAVE_BLOCK_H * 2 + GRAND_GAP * 2) : 110;
    const totalWidth  = AVAIL_WIDTH;

    // ── Pauta estéril: só tokens de cabeçalho (sem notas ainda) ────────────
    // Quando o usuário digitou apenas keysignature/timesignature/clef,
    // desenhamos a(s) pauta(s) com modificadores sem Voice/Formatter.
    // Suporta Grand Staff (hasBothHands): nesse caso renderiza treble + bass
    // com StaveConnector BRACE e DOUBLE.
    if (trebleMeasures.length === 0 && hasHeaderTokens) {
      const renderer = new Renderer(containerRef.current, Renderer.Backends.SVG);
      const staveWidth  = Math.max(width - 60, 200);
      const logicWidth  = staveWidth / scaleRatio;
      const svgH        = hasBothHands ? 280 : 160;
      renderer.resize(staveWidth + 60, svgH);
      const ctx = renderer.getContext();
      ctx.scale(scaleRatio, scaleRatio);

      // Função auxiliar: adicionar modificadores comuns
      const addModifiers = (stave: Stave, clefName: string) => {
        stave.addClef(clefName);
        if (keySignature && (VALID_KEYS as readonly string[]).includes(keySignature)) {
          try { stave.addKeySignature(keySignature); } catch { /* ignora */ }
        }
        if (timeSignatureEl) {
          const abbr = timeSignatureEl._abbreviated;
          const num  = timeSignatureEl.numerator as number;
          const den  = timeSignatureEl.denominator as number;
          try {
            if      (abbr === 'C')  stave.addTimeSignature('C');
            else if (abbr === 'C|') stave.addTimeSignature('C|');
            else if (num && den)    stave.addTimeSignature(`${num}/${den}`);
          } catch { /* ignora */ }
        }
      };

      if (hasBothHands) {
        // Grand Staff: treble (y=40) + bass (y=160) + BRACE + DOUBLE
        const staveTreble = new Stave(30, 40,  logicWidth);
        const staveBass   = new Stave(30, 160, logicWidth);
        staveTreble.setContext(ctx);
        staveBass.setContext(ctx);

        addModifiers(staveTreble, 'treble');
        addModifiers(staveBass,   'bass');

        // StaveConnector BRACE (chave de piano à esquerda)
        const brace = new StaveConnector(staveTreble, staveBass);
        brace.setType(StaveConnector.type.BRACE);
        brace.setContext(ctx).draw();

        // StaveConnector DOUBLE (barra dupla à esquerda)
        const dbl = new StaveConnector(staveTreble, staveBass);
        dbl.setType(StaveConnector.type.DOUBLE);
        dbl.setContext(ctx).draw();

        staveTreble.draw();
        staveBass.draw();
      } else {
        // Pauta simples
        const stave = new Stave(30, 40, logicWidth);
        stave.setContext(ctx);
        addModifiers(stave, activeClef);
        stave.draw();
      }

      return; // pauta estéril desenhada — sair sem criar Voice/Formatter
    }

    // Primeiro passo: estimar a altura total necessária
    // (quantos sistemas serão necessários para todos os compassos)
    const ksN        = ksAccidentalCount(keySignature);
    const firstExtra = firstMeasureExtra(ksN, !!timeSignatureEl);
    let   lineX      = 30;
    let   nSystems   = 1;
    for (let i = 0; i < staveWidths.length; i++) {
      const sw = i === 0 ? staveWidths[i] + firstExtra : staveWidths[i];
      if (i > 0 && lineX + sw > AVAIL_WIDTH - 20) {
        lineX = 30;
        nSystems++;
      }
      lineX += sw;
    }

    // totalHeight = nSystems * SYSTEM_H em AMBOS os casos agora: no Grand Staff,
    // cada "sistema" já representa o par treble+bass completo (paginação unificada),
    // então não há mais necessidade de duplicar/somar blocos separados.
    const totalHeight = nSystems * SYSTEM_H;

    const renderer = new Renderer(containerRef.current, Renderer.Backends.SVG);
    renderer.resize(totalWidth, Math.max(totalHeight, 160));
    const ctx = renderer.getContext();

    // Aplicar escala configurável (padrão 0.8, range 0.4–1.5)
    // O canvas é criado em coordenadas físicas (1/scaleRatio do tamanho lógico)
    // e as chamadas VexFlow usam coordenadas lógicas multiplicadas por (1/scaleRatio)
    const invScale = 1 / scaleRatio;
    ctx.scale(scaleRatio, scaleRatio);
    renderer.resize(Math.ceil(totalWidth * invScale), Math.ceil(Math.max(totalHeight * invScale, 160)));

    const logicAvailW    = AVAIL_WIDTH   * invScale;
    const logicSysH      = SYSTEM_H      * invScale;
    const logicStaveGap  = GRAND_GAP     * invScale;
    const logicStaveBlkH = STAVE_BLOCK_H * invScale;

    if (hasBothHands) {
      // ── Grand Staff: paginação unificada treble+bass em UMA única passada ──
      // Elimina o bug de blocos sequenciais desalinhados: cada sistema agora
      // nasce com treble e bass no MESMO x, cabeçalho reinjetado simultaneamente
      // e StaveConnector desenhado por sistema (não só no primeiro compasso).
      renderGrandStaffSystem(
        ctx, trebleMeasures, bassMeasures, 30, 40, staveWidths,
        keySignature, timeSignatureEl, timeSignature,
        noteHitAreas.current,
        logicAvailW, logicSysH,
        activeSourceIndex,
        logicStaveGap, logicStaveBlkH,
      );
    } else {
      // ── Pauta única (sem Grand Staff) ───────────────────────────────────
      renderStaveSystem(
        ctx, trebleMeasures, 30, 40, staveWidths,
        activeClef, intervalDirection,
        keySignature, timeSignatureEl, timeSignature,
        noteHitAreas.current,
        true,
        logicAvailW,
        logicSysH,
        activeSourceIndex,
      );
    }

  }, [
    elements, filteredElements, trebleMeasures, bassMeasures, staveWidths,
    width, height, activeClef, intervalDirection, hasBothHands,
    keySignature, timeSignatureEl, timeSignature, bassStartY, grandStaffProp, maxLevel, scaleRatio,
    hasHeaderTokens, activeSourceIndex,
  ]);

  // ── Click listener ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!containerRef.current || !handleClick) return;

    const onClick = (e: MouseEvent) => {
      const svg = containerRef.current?.querySelector('svg');
      if (!svg) return;
      const rect = svg.getBoundingClientRect();
      const cx   = e.clientX - rect.left;
      const cy   = e.clientY - rect.top;

      let best: NoteHitArea | null = null;
      let bestD = Infinity;

      for (const area of noteHitAreas.current) {
        const dx = cx - (area.x + area.w / 2);
        const dy = cy - (area.y + area.h / 2);
        const d  = Math.sqrt(dx * dx + dy * dy);
        if (d < bestD && cy >= area.y - 20 && cy <= area.y + area.h + 20) {
          bestD = d; best = area;
        }
      }

      if (best && bestD < 60) handleClick(best.sourceIndex);
    };

    const svg = containerRef.current.querySelector('svg');
    if (!svg) return;
    svg.addEventListener('click', onClick as EventListener);
    return () => svg.removeEventListener('click', onClick as EventListener);
  }, [handleClick, trebleMeasures]);

  return (
    <div
      ref={containerRef}
      style={{
        cursor:    handleClick ? 'pointer' : 'default',
        overflowX: 'hidden',
        overflowY: 'auto',
        width:     '100%',
        minHeight: 120,
      }}
    />
  );
}
