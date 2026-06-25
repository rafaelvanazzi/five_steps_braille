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
  // Curve desativado — ligaduras longas causavam linhas diagonais cruzadas
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
      else if (bt === 'end-section')  barType = 'end-section';
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
 * compassos RESETA para 0 e a mão esquerda preenche os mesmos compassos em
 * paralelo. O ScoreRenderer usa measureIndex para alinhar verticalmente.
 *
 * Barlines são propagadas para AMBAS as pautas para que groupIntoMeasures
 * produza o mesmo número de compassos em cada pauta.
 */
function splitByHand(elements: ParsedElement[]): HandSplit {
  const treble: ParsedElement[] = [];
  const bass:   ParsedElement[] = [];
  let currentHand: 'right' | 'left' | null = null;
  let sawRight = false;
  let sawLeft  = false;

  // Elementos globais (armadura, TS, clave) → registrados antes de qualquer mão
  // Serão propagados para ambas as pautas
  const globalEls: ParsedElement[] = [];

  for (const el of elements) {
    // Sinal de mão: trocar o fluxo ativo
    if (el.type === 'hand') {
      currentHand = (el as any).hand as 'right' | 'left';
      if (currentHand === 'right') {
        sawRight = true;
        treble.push(el);
        bass.push(el); // contexto de clave para a pauta bass também
      } else {
        sawLeft = true;
        bass.push(el);
        treble.push(el); // contexto de clave para a pauta treble também
      }
      continue;
    }

    // Elementos globais → ambas as pautas (independente da mão atual)
    if (el.type === 'keysignature' || el.type === 'timesignature' || el.type === 'clef') {
      treble.push(el);
      bass.push(el);
      globalEls.push(el);
      continue;
    }

    // Barlines → AMBAS as pautas para manter compassos sincronizados
    if (el.type === 'barline') {
      treble.push(el);
      bass.push(el);
      continue;
    }

    // Notas, pausas, intervalos → mão atual
    if (currentHand === 'left') {
      bass.push(el);
    } else {
      treble.push(el); // null ou 'right'
    }
  }

  return {
    trebleEls:    sawRight && sawLeft ? treble   : elements,
    bassEls:      sawRight && sawLeft ? bass     : [],
    hasBothHands: sawRight && sawLeft,
  };
}

// ─── ENGINE DE RENDERIZAÇÃO DE UMA PAUTA ─────────────────────────────────────

/**
 * Renderiza uma sequência de compassos em um contexto VexFlow.
 * Retorna o array de Stave criados (para StaveConnector do grand staff).
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
): { staves: Stave[]; totalHeight: number } {
  const staves: Stave[] = [];
  const MARGIN_RIGHT = 20;
  let x = startX;
  let y = startY;
  let systemIdx = 0;

  // Estado de ligaduras — persiste entre compassos
  let pendingSlurNote:  StaveNote | null = null; // nota-origem de slur/tie pendente
  let pendingSlurY:     number           = 0;    // Y do sistema de origem (salvaguarda)
  // Ligaduras longas: mapa slurLongId → StaveNote de início (persistência entre compassos)
  const activeLongSlurMap  = new Map<string, StaveNote>(); // id → nota-origem
  const activeLongSlurYMap = new Map<string, number>();    // id → Y de origem
  const activeTies = new Map<string, StaveNote>(); // "pitch/octave" → StaveNote (tie)

  // Construir mapa matricial para acesso por índice real
  const measureTrack = buildMeasureTrack(measures);
  const maxIdx = Math.max(measures.length - 1, 0);

  for (let i = 0; i <= maxIdx; i++) {
    const measure = measureTrack.get(i) ?? { notes: [], barlineType: 'single' as const };
    let staveW  = staveWidths[i] ?? 200;
    // Verificar se o próximo compasso cabe na linha atual ou precisa quebrar
    const isFirstOfSystem = (i === 0) || (x + staveW > availableWidth - MARGIN_RIGHT);
    if (isFirstOfSystem && i > 0) {
      // Quebra de linha: descer para o próximo sistema
      x = startX;
      y = startY + (++systemIdx) * systemHeight;
    }
    const isFirst  = i === 0;
    const isSystem = isFirstOfSystem; // primeiro compasso deste sistema
    const ksN      = ksAccidentalCount(keySignature);
    // Cabeçalho extra: sempre no início de cada sistema (não só no primeiro compasso global)
    const extraW   = isSystem ? firstMeasureExtra(ksN, isFirst && !!timeSignatureEl) : 0;
    if (isSystem) staveW = Math.max(staveW, staveW + extraW);

    // Elementos a renderizar (note, rest; interval é consumido com a nota-base)
    // 'text' e outros não-musicais são filtrados aqui para evitar pautas fantasmas
    const mNotes = measure.notes.filter(n =>
      n.type === 'note' || n.type === 'rest' || n.type === 'interval'
    );
    // Compasso sem notas reais: ignorar (não criar stave vazio) a menos que seja barra final
    const hasRealNotes = mNotes.some(n => n.type === 'note' || n.type === 'rest');
    if (!hasRealNotes && measure.barlineType !== 'end' && measure.barlineType !== 'end-section') {
      x += staveW; continue;
    }

    // ── Stave ─────────────────────────────────────────────────────────────
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
    // Barra final: aplica o tipo correto na pauta atual (treble ou bass)
    // A sincronização é garantida pois splitByHand propaga barlines para ambas as pautas
    if      (measure.barlineType === 'end')          stave.setEndBarType(3); // barra dupla final
    else if (measure.barlineType === 'end-section')  stave.setEndBarType(3); // barra dupla de seção
    else if (measure.barlineType === 'repeat-end')   stave.setEndBarType(5);
    else if (measure.barlineType === 'repeat-begin') stave.setEndBarType(4);
    else if (measure.barlineType === 'repeat-both')  stave.setEndBarType(6);

    stave.draw();
    staves.push(stave);

    // Numeração visual de compassos no topo da pauta superior (primeiro sistema)
    if (showMeasureNumbers) {
      addMeasureNumber(ctx, stave, i);
    }

    if (mNotes.length === 0) { x += staveW; continue; }

    // ── Construir StaveNotes ─────────────────────────────────────────────
    const vexNotes:  StaveNote[]             = [];
    const srcIdxs:   (number | undefined)[]  = [];
    const skipSet = new Set<number>();

    // Lista de ligaduras a desenhar APÓS o Formatter (coordenadas X definidas)
    // Unificada: StaveTie cobre tanto ties de prolongação quanto slurs simples
    const tiesToDraw: StaveTie[] = [];

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
          try { vn.addModifier(new Accidental(vexAcc), keyIdx); }
          catch { /* ignora */ }
        });

        if (noteEl.dotted) Dot.buildAndAttach([vn], { all: true });

        // ── Ligaduras: modelo retroativo (tieRole / slurRole / slurLongId) ──
        // O parser já marcou as notas com papéis exatos — apenas conectar os pares.
        // Salvaguarda de Y: arco cancelado se as notas estiverem em sistemas diferentes.
        const noteSlurRole  = (noteEl as any).slurRole  as 'start' | 'end' | undefined;
        const noteTieRole   = (noteEl as any).tieRole   as 'start' | 'end' | undefined;
        const noteLongId    = (noteEl as any).slurLongId as string | undefined;

        // Fechar slur/tie pendente do compasso anterior com esta nota como destino
        if (pendingSlurNote !== null && Math.abs(y - pendingSlurY) < 5) {
          if (noteSlurRole === 'end' || noteTieRole === 'end') {
            tiesToDraw.push(new StaveTie({ firstNote: pendingSlurNote, lastNote: vn } as any));
            pendingSlurNote = null;
          }
        } else if (pendingSlurNote !== null) {
          pendingSlurNote = null; // salvaguarda: Y diferente — cancelar arco
        }

        // Abrir novo arco (slur start ou tie start)
        if (noteSlurRole === 'start' || noteTieRole === 'start') {
          pendingSlurNote = vn;
          pendingSlurY    = y;
        }

        // Ligadura longa: abrir pelo slurLongId
        if (noteLongId && noteSlurRole === 'start') {
          activeLongSlurMap.set(noteLongId, vn);
          activeLongSlurYMap.set(noteLongId, y);
        }
        // Ligadura longa: fechar pelo slurLongId
        if (noteLongId && noteSlurRole === 'end') {
          const startVn = activeLongSlurMap.get(noteLongId);
          const startY  = activeLongSlurYMap.get(noteLongId);
          if (startVn && startY !== undefined && Math.abs(y - startY) < 5) {
            tiesToDraw.push(new StaveTie({ firstNote: startVn, lastNote: vn } as any));
          }
          activeLongSlurMap.delete(noteLongId);
          activeLongSlurYMap.delete(noteLongId);
        }

        // Registrar esta nota no mapa de ties (para cruzamento de compassos)
        // O tie visual é criado pelo bloco de slurRole/tieRole acima.
        activeTies.set(`${noteEl.pitch.toLowerCase()}/${noteEl.octave}`, vn);

        vexNotes.push(vn);
        srcIdxs.push((noteEl as any).sourceIndex);
      }
    }

    if (vexNotes.length === 0) { x += staveW; continue; }

    // ── Voice ────────────────────────────────────────────────────────────
    const voice = new Voice({ numBeats: timeSignature.numerator, beatValue: timeSignature.denominator });
    voice.setMode(2); // SOFT

    // ── Beaming: criar ANTES do draw para suprimir flags individuais ─────
    const isCompound = timeSignature.denominator === 8 && [6, 9, 12].includes(timeSignature.numerator);
    const beamSz     = isCompound ? 3 : 2;
    const beamable   = vexNotes.filter(n => ['8','16','32','64'].includes((n as any).duration));
    const beams: Beam[] = [];
    for (let bi = 0; bi < beamable.length; bi += beamSz) {
      const grp = beamable.slice(bi, bi + beamSz);
      if (grp.length >= 2) { try { beams.push(new Beam(grp)); } catch { /* ignora */ } }
    }

    voice.addTickables(vexNotes);

    try {
      const notesArea = Math.max(staveW - extraW - 20, 60);
      new Formatter().joinVoices([voice]).format([voice], notesArea);
      voice.draw(ctx, stave);
      beams.forEach(b => { try { b.setContext(ctx).draw(); } catch { /* ignora */ } });
      // Desenhar ligaduras APÓS format/draw (coordenadas X das notas já estão definidas)
      // Desenhar slurs simples e ties após o Formatter
      tiesToDraw.forEach(t => { try { t.setContext(ctx).draw(); } catch { /* ignora */ } });
    } catch (e) {
      console.warn(`[ScoreRenderer] format/draw error (measure ${i}):`, e);
      x += staveW; continue;
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
          hitAreas.push({ x: nx - 10, y: startY - 10, w: 30, h: 90, sourceIndex: srcIdx });
        } catch { /* ignora */ }
      }
    }

    x += staveW;
  }

  const totalHeight = systemIdx > 0
    ? (systemIdx + 1) * systemHeight
    : systemHeight;
  return { staves, totalHeight };
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

  // ── Efeito principal de renderização ──────────────────────────────────────
  useEffect(() => {
    if (!containerRef.current || trebleMeasures.length === 0) return;
    containerRef.current.innerHTML = '';
    noteHitAreas.current = [];

    // +30 de offset inicial (margem para StaveConnector BRACE) + 20 de padding direito
    // Largura disponível para cada sistema (excluindo margem inicial de 30px)
    const AVAIL_WIDTH = Math.max(width - 10, 400);
    const SYSTEM_H    = hasBothHands ? GRAND_GAP * 2 + 80 : 110;
    const totalWidth  = AVAIL_WIDTH;

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

    const trebleTotalH = nSystems * SYSTEM_H;
    const totalHeight  = hasBothHands ? trebleTotalH * 2 + GRAND_GAP : trebleTotalH;

    const renderer = new Renderer(containerRef.current, Renderer.Backends.SVG);
    renderer.resize(totalWidth, Math.max(totalHeight, 160));
    const ctx = renderer.getContext();

    // Aplicar escala configurável (padrão 0.8, range 0.4–1.5)
    // O canvas é criado em coordenadas físicas (1/scaleRatio do tamanho lógico)
    // e as chamadas VexFlow usam coordenadas lógicas multiplicadas por (1/scaleRatio)
    const invScale = 1 / scaleRatio;
    ctx.scale(scaleRatio, scaleRatio);
    renderer.resize(Math.ceil(totalWidth * invScale), Math.ceil(Math.max(totalHeight * invScale, 160)));

    const logicAvailW = AVAIL_WIDTH * invScale;
    const logicSysH   = SYSTEM_H   * invScale;

    // ── Pauta treble ──────────────────────────────────────────────────────
    const { staves: trebleStaves } = renderStaveSystem(
      ctx, trebleMeasures, 30, 40, staveWidths,
      hasBothHands ? 'treble' : activeClef,
      hasBothHands ? 'descending' : intervalDirection,
      keySignature, timeSignatureEl, timeSignature,
      noteHitAreas.current,
      true,
      logicAvailW,
      logicSysH,
    );

    // ── Pauta bass (grand staff) ──────────────────────────────────────────
    let bassStaves: Stave[] = [];
    if (hasBothHands && bassMeasures.length > 0) {
      const bassY0 = trebleTotalH * invScale + GRAND_GAP;
      const { staves: bs } = renderStaveSystem(
        ctx, bassMeasures, 30, bassY0, staveWidths,
        'bass', 'ascending',
        keySignature, timeSignatureEl, timeSignature,
        noteHitAreas.current,
        false,
        logicAvailW,
        logicSysH,
      );
      bassStaves = bs;
    }

    // ── StaveConnector: BRACE (chave de piano) + linha dupla esquerda ─────
    if (hasBothHands && trebleStaves[0] && bassStaves[0]) {
      try {
        const brace = new StaveConnector(trebleStaves[0], bassStaves[0]);
        brace.setType(StaveConnector.type.BRACE);
        brace.setContext(ctx).draw();

        const lineL = new StaveConnector(trebleStaves[0], bassStaves[0]);
        lineL.setType(StaveConnector.type.DOUBLE);
        lineL.setContext(ctx).draw();
      } catch (e) {
        console.warn('[ScoreRenderer] StaveConnector error:', e);
      }
    }

  }, [
    elements, filteredElements, trebleMeasures, bassMeasures, staveWidths,
    width, height, activeClef, intervalDirection, hasBothHands,
    keySignature, timeSignatureEl, timeSignature, bassStartY, grandStaffProp, maxLevel, scaleRatio,
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
