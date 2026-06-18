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
} from 'vexflow';
import type {
  ParsedElement,
  ParsedNote,
  ParsedRest,
  ParsedKeySignature,
} from '../lib/brailleMusic';

// ─── INTERFACES LOCAIS ────────────────────────────────────────────────────────

interface ScoreRendererProps {
  elements: ParsedElement[];
  width?: number;
  height?: number;
  beatsPerMeasure?: number;
  /** Forçar modo de pauta dupla (grand staff) independente da detecção automática */
  grandStaff?: boolean;
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
  barlineType: 'single' | 'end' | 'repeat-begin' | 'repeat-end' | 'repeat-both';
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
function buildChordKeys(
  baseNote: ParsedNote,
  intervalEls: Array<{ intervalSize: number; accidental?: string; explicitOctave?: number }>,
  direction: 'ascending' | 'descending',
): { keys: string[]; accMods: Map<number, string> } {

  const SEMITONES: Record<DiatonicPitch, number> = { C:0, D:2, E:4, F:5, G:7, A:9, B:11 };
  const midiOf = (pitch: DiatonicPitch, octave: number) => (octave + 1) * 12 + SEMITONES[pitch];

  type Entry = { pitch: DiatonicPitch; octave: number; acc?: string };

  // Nota base
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

  entries.forEach((e, idx) => {
    keys.push(`${e.pitch.toLowerCase()}/${e.octave}`);
    if (e.acc) accMods.set(idx, e.acc);
  });

  return { keys, accMods };
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
): Stave[] {
  const staves: Stave[] = [];
  let x = startX;

  for (let i = 0; i < measures.length; i++) {
    const measure = measures[i];
    const staveW  = staveWidths[i] ?? 200;
    const isFirst = i === 0;
    const ksN     = ksAccidentalCount(keySignature);
    const extraW  = isFirst ? firstMeasureExtra(ksN, !!timeSignatureEl) : 0;

    // Elementos a renderizar (note, rest; interval é consumido com a nota-base)
    const mNotes = measure.notes.filter(n =>
      n.type === 'note' || n.type === 'rest' || n.type === 'interval'
    );

    // ── Stave ─────────────────────────────────────────────────────────────
    const stave = new Stave(x, startY, staveW);
    stave.setContext(ctx);

    if (isFirst) {
      stave.addClef(clef);
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
    }

    if (measure.begBarlineType === 'repeat-begin') stave.setBegBarType(4);
    if      (measure.barlineType === 'end')          stave.setEndBarType(3);
    else if (measure.barlineType === 'repeat-end')   stave.setEndBarType(5);
    else if (measure.barlineType === 'repeat-begin') stave.setEndBarType(4);
    else if (measure.barlineType === 'repeat-both')  stave.setEndBarType(6);

    stave.draw();
    staves.push(stave);

    if (mNotes.length === 0) { x += staveW; continue; }

    // ── Construir StaveNotes ─────────────────────────────────────────────
    const vexNotes:  StaveNote[]             = [];
    const srcIdxs:   (number | undefined)[]  = [];
    const skipSet = new Set<number>();

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

        // Coletar intervalos consecutivos imediatos após esta nota
        const intervalEls: Array<{ intervalSize: number; accidental?: string; explicitOctave?: number }> = [];
        for (let ji = ni + 1; ji < mNotes.length; ji++) {
          const nxt = mNotes[ji];
          if (nxt.type !== 'interval') break;
          const intAny = nxt as any;
          intervalEls.push({
            intervalSize:   intAny.intervalSize as number,
            accidental:     intAny.accidental ? accidentalToVex(String(intAny.accidental)) : undefined,
            explicitOctave: intAny.explicitOctave as number | undefined,
          });
          skipSet.add(ji);
        }

        // Construir keys ordenadas grave→agudo + mapa de acidentes por índice
        const { keys, accMods } = buildChordKeys(noteEl, intervalEls, intervalDir);

        // ÚNICO StaveNote para toda a nota + seus intervalos (acorde)
        const vn = new StaveNote({ keys, duration: noteToVexDuration(noteEl), clef });

        // Acidente da nota base: encontrar seu índice após a ordenação
        if (noteEl.accidental) {
          const baseKey = noteToVexKey(noteEl);
          const baseIdx = keys.indexOf(baseKey);
          if (baseIdx !== -1) {
            try { vn.addModifier(new Accidental(accidentalToVex(String(noteEl.accidental))), baseIdx); }
            catch { /* ignora */ }
          }
        }

        // Acidentes dos intervalos no índice exato após ordenação
        accMods.forEach((vexAcc, keyIdx) => {
          try { vn.addModifier(new Accidental(vexAcc), keyIdx); }
          catch { /* ignora */ }
        });

        if (noteEl.dotted) Dot.buildAndAttach([vn], { all: true });

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

  return staves;
}

// ─── COMPONENTE PRINCIPAL ─────────────────────────────────────────────────────

export default function ScoreRenderer({
  elements,
  width = 1000,
  height = 300,
  beatsPerMeasure = 4,
  grandStaff: grandStaffProp,
  onNoteClick,
  onMeasureClick,
}: ScoreRendererProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const noteHitAreas = useRef<NoteHitArea[]>([]);
  const handleClick  = onNoteClick || onMeasureClick;

  // ── Derivações estáticas ───────────────────────────────────────────────────

  const timeSignatureEl = useMemo(() =>
    (elements.find(el => el.type === 'timesignature') as any) ?? null,
  [elements]);

  const timeSignature = useMemo(() => {
    if (timeSignatureEl) return { numerator: timeSignatureEl.numerator as number, denominator: timeSignatureEl.denominator as number };
    return { numerator: beatsPerMeasure, denominator: 4 };
  }, [timeSignatureEl, beatsPerMeasure]);

  const keySignature = useMemo(() => {
    const el = elements.find(e => e.type === 'keysignature') as ParsedKeySignature | undefined;
    return el?.vexKey ?? null;
  }, [elements]);

  // ── Clave e direção de intervalos ─────────────────────────────────────────
  // Lê os campos ParsedHand.impliedClef / ParsedClef.intervalDirection
  // emitidos pelo brailleMusic.ts.
  // Fallback seguro: treble + descending quando nenhuma clave está presente.
  const { activeClef, intervalDirection } = useMemo(() => {
    for (const el of elements) {
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
  }, [elements]);

  // ── Grand staff ────────────────────────────────────────────────────────────
  const { trebleEls, bassEls, hasBothHands: detectedBothHands } = useMemo(
    () => splitByHand(elements),
    [elements]
  );
  // hasBothHands: auto-detectado OU forçado pela prop grandStaff
  const hasBothHands = grandStaffProp ?? detectedBothHands;

  const GRAND_GAP  = 60;
  const bassStartY = hasBothHands ? height + GRAND_GAP : 0;

  const trebleMeasures = useMemo(() => groupIntoMeasures(trebleEls), [trebleEls]);
  const bassMeasures   = useMemo(() => groupIntoMeasures(bassEls),   [bassEls]);

  // Larguras de compasso: máximo entre treble e bass para cada índice
  // Garante que compassos simultâneos tenham a mesma largura → alinhamento X perfeito
  const staveWidths = useMemo(() => {
    const BASE = 50;
    const MIN  = 200;
    const ksN  = ksAccidentalCount(keySignature);
    const nMeasures = Math.max(trebleMeasures.length, bassMeasures.length);

    return Array.from({ length: nMeasures }, (_, i) => {
      const tMeasure = trebleMeasures[i];
      const bMeasure = bassMeasures[i];
      const extra    = i === 0 ? firstMeasureExtra(ksN, !!timeSignatureEl) : 0;

      const tNotes = tMeasure?.notes.filter(n => n.type === 'note' || n.type === 'rest' || n.type === 'interval') ?? [];
      const bNotes = bMeasure?.notes.filter(n => n.type === 'note' || n.type === 'rest' || n.type === 'interval') ?? [];

      const tW = tNotes.reduce((s, n) => s + calcNoteWidth(n, BASE), 0);
      const bW = bNotes.reduce((s, n) => s + calcNoteWidth(n, BASE), 0);

      // Usar o maior entre treble e bass + espaço de cabeçalho + padding
      return Math.max(MIN, Math.max(tW, bW) + extra + 40);
    });
  }, [trebleMeasures, bassMeasures, keySignature, timeSignatureEl]);

  // ── Efeito principal de renderização ──────────────────────────────────────
  useEffect(() => {
    if (!containerRef.current || trebleMeasures.length === 0) return;
    containerRef.current.innerHTML = '';
    noteHitAreas.current = [];

    const totalWidth  = Math.max(width, staveWidths.reduce((s, w) => s + w, 20) + 20);
    const totalHeight = hasBothHands ? height * 2 + GRAND_GAP : height;

    const renderer = new Renderer(containerRef.current, Renderer.Backends.SVG);
    renderer.resize(totalWidth, totalHeight);
    const ctx = renderer.getContext();

    // ── Pauta treble ──────────────────────────────────────────────────────
    const trebleStaves = renderStaveSystem(
      ctx, trebleMeasures, 10, 40, staveWidths,
      hasBothHands ? 'treble' : activeClef,
      hasBothHands ? 'descending' : intervalDirection,
      keySignature, timeSignatureEl, timeSignature,
      noteHitAreas.current,
    );

    // ── Pauta bass (grand staff) ──────────────────────────────────────────
    let bassStaves: Stave[] = [];
    if (hasBothHands && bassMeasures.length > 0) {
      bassStaves = renderStaveSystem(
        ctx, bassMeasures, 10, bassStartY, staveWidths,
        'bass', 'ascending',
        keySignature, timeSignatureEl, timeSignature,
        noteHitAreas.current,
      );
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
    elements, trebleMeasures, bassMeasures, staveWidths,
    width, height, activeClef, intervalDirection, hasBothHands,
    keySignature, timeSignatureEl, timeSignature, bassStartY, grandStaffProp,
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
        overflowX: 'auto',
        overflowY: 'hidden',
        width:     '100%',
        maxHeight: (hasBothHands ? height * 2 + GRAND_GAP : height) + 60,
      }}
    />
  );
}
