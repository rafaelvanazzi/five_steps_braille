/**
 * ScoreRenderer - Renders a visual music score from parsed Braille music elements.
 * Uses VexFlow to draw notes on a staff in real-time.
 * Supports: notes, rests, barlines, time signatures, accidentals, dots, slurs, ties.
 * Click on a note to jump to the corresponding Braille cell in the editor.
 */
import { useEffect, useRef, useMemo } from 'react';
import { Renderer, Stave, StaveNote, Voice, Formatter, Accidental, Dot, Curve, Beam } from 'vexflow';
import type { ParsedElement, ParsedNote, ParsedRest, ParsedKeySignature } from '../lib/brailleMusic';

interface ScoreRendererProps {
  elements: ParsedElement[];
  width?: number;
  height?: number;
  beatsPerMeasure?: number;
  /** Called when user clicks a note; receives the sourceIndex of that note in the Braille text */
  onNoteClick?: (sourceIndex: number) => void;
  /** @deprecated Use onNoteClick instead */
  onMeasureClick?: (sourceIndex: number) => void;
}

// Hit area for individual notes (for click detection)
interface NoteHitArea {
  x: number;
  y: number;
  w: number;
  h: number;
  sourceIndex: number;
}

// Measure info including barline type
interface MeasureInfo {
  notes: ParsedElement[]; // inclui note, rest, interval, dynamic, ornament, etc.
  barlineType: 'single' | 'end' | 'repeat-begin' | 'repeat-end' | 'repeat-both';
  begBarlineType?: 'repeat-begin';
  /** sourceIndex of the first element in this measure (for cursor sync) */
  sourceIndex?: number;
}

// Group elements into measures (split by barlines)
function groupIntoMeasures(elements: ParsedElement[]): MeasureInfo[] {
  const measures: MeasureInfo[] = [];
  let current: ParsedElement[] = [];
  let nextBegBarline: 'repeat-begin' | undefined = undefined;
  let currentSourceIndex: number | undefined = undefined;

  for (let i = 0; i < elements.length; i++) {
    const el = elements[i];
    
    if (el.type === 'barline') {
      // Check if this is a repeat-begin at the start of a measure (no notes yet)
      if ((el as any).barlineType === 'repeat-begin' && current.length === 0) {
        // Mark for the next measure
        nextBegBarline = 'repeat-begin';
        continue; // Don't create a measure yet
      }
      
      // For simple barlines (no type) with no notes, skip them (preserve nextBegBarline)
      if (!(el as any).barlineType && current.length === 0) {
        continue;
      }
      
      // For other barlines, always create a measure (even if empty)
      let barType: 'single' | 'end' | 'repeat-begin' | 'repeat-end' | 'repeat-both' = 'single';
      if ((el as any).barlineType === 'end') {
        barType = 'end';
      } else if ((el as any).barlineType === 'repeat-end') {
        barType = 'repeat-end';
      }
      
      measures.push({ 
        notes: current, 
        barlineType: barType, 
        begBarlineType: nextBegBarline,
        sourceIndex: currentSourceIndex
      });
      current = [];
      nextBegBarline = undefined;
      currentSourceIndex = undefined;
    } else if (el.type === 'note' || el.type === 'rest') {
      // Track the sourceIndex of the first note/rest in this measure
      if (currentSourceIndex === undefined && el.sourceIndex !== undefined) {
        currentSourceIndex = el.sourceIndex;
      }
      current.push(el);
    }
    // Skip timesignature and notetie elements
  }
  
  if (current.length > 0 || nextBegBarline) {
    measures.push({ 
      notes: current, 
      barlineType: 'single', 
      begBarlineType: nextBegBarline,
      sourceIndex: currentSourceIndex
    });
  }

  // Detect repeat-both: when a measure ends with repeat-end and next has repeat-begin at start
  for (let i = 0; i < measures.length - 1; i++) {
    if (measures[i].barlineType === 'repeat-end' && measures[i + 1].begBarlineType === 'repeat-begin') {
      measures[i].barlineType = 'repeat-both';
      measures[i + 1].begBarlineType = undefined; // Remove repeat-begin from next measure
    }
  }

  return measures;
}

// Convert duration to VexFlow beat value for voice
function durationToBeats(dur: string): number {
  const base = dur.replace('r', '').replace('d', '');
  let beats = 0;
  switch (base) {
    case 'w': beats = 4; break;
    case 'h': beats = 2; break;
    case 'q': beats = 1; break;
    case '8': beats = 0.5; break;
    case '16': beats = 0.25; break;
    case '32': beats = 0.125; break;
    case '64': beats = 0.0625; break;
    default: beats = 1;
  }
  if (dur.includes('d')) beats *= 1.5;
  return beats;
}

/**
 * Extract a clean VexFlow key from a ParsedNote.
 * VexFlow expects keys like "c/4", "b/4" etc.
 * Accidentals are added separately via Accidental modifier.
 */
function noteToVexKey(note: ParsedNote): string {
  return `${note.pitch.toLowerCase()}/${note.octave}`;
}

/**
 * Extract clean VexFlow duration string.
 * Removes 'd' suffix (dotted is handled by Dot.buildAndAttach).
 * Also removes 'r' suffix for rests (added separately in StaveNote creation).
 */
function noteToVexDuration(el: ParsedNote | ParsedRest): string {
  let dur = el.vexDuration;
  // Remove 'd' (dotted handled by Dot.buildAndAttach)
  dur = dur.replace('d', '');
  // Remove 'r' suffix for rests (we add it separately when creating StaveNote)
  dur = dur.replace('r', '');
  return dur;
}

/**
 * Convert accidental type from parser format to VexFlow format.
 * Parser uses: 'sharp', 'flat', 'natural'
 * VexFlow expects: '#', 'b', 'n'
 */
function accidentalToVex(acc: string): string {
  switch (acc) {
    case 'sharp': return '#';
    case 'flat': return 'b';
    case 'natural': return 'n';
    default: return acc;
  }
}

export default function ScoreRenderer({ elements, width = 1000, height = 300, beatsPerMeasure = 4, onNoteClick, onMeasureClick }: ScoreRendererProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  // Store note hit areas for click detection (per individual note)
  const noteHitAreas = useRef<NoteHitArea[]>([]);

  // Unified click handler: prefer onNoteClick, fallback to onMeasureClick
  const handleNoteClick = onNoteClick || onMeasureClick;

  // Extract time signature from parsed elements (null = não escrita, não renderizar)
  const timeSignatureEl = useMemo(() => {
    return elements.find(el => el.type === 'timesignature') as any || null;
  }, [elements]);

  // timeSignature para uso no Voice (fallback 4/4 só para contagem interna)
  const timeSignature = useMemo(() => {
    if (timeSignatureEl) return { numerator: timeSignatureEl.numerator, denominator: timeSignatureEl.denominator };
    return { numerator: 4, denominator: 4 }; // fallback interno, NÃO renderizado
  }, [timeSignatureEl]);

  // Extract key signature from parsed elements
  const keySignature = useMemo(() => {
    const keySigEl = elements.find(el => el.type === 'keysignature') as ParsedKeySignature | undefined;
    return keySigEl?.vexKey || null;
  }, [elements]);

  // Detectar clave ativa e direção de intervalos — lê os campos do parser
  // ParsedHand.impliedClef e ParsedClef.intervalDirection são emitidos explicitamente.
  const { activeClef, intervalDirection, hasBothHands } = useMemo(() => {
    let clef = 'treble';
    let dir: 'ascending' | 'descending' = 'descending';
    let rightHandSeen = false;
    let leftHandSeen  = false;

    for (const el of elements) {
      if (el.type === 'hand') {
        const h = el as any;
        const hClef = h.impliedClef ?? (h.hand === 'left' ? 'bass' : 'treble');
        const hDir  = h.intervalDirection ?? (h.hand === 'left' ? 'ascending' : 'descending');
        if (h.hand === 'right') rightHandSeen = true;
        if (h.hand === 'left')  leftHandSeen  = true;
        // Usar a primeira mão encontrada como clave primária
        if (clef === 'treble' && dir === 'descending' && el === elements.find(e => e.type === 'hand')) {
          clef = hClef;
          dir  = hDir;
        }
      }
      if (el.type === 'clef') {
        const c = el as any;
        clef = c.clefType ?? 'treble';
        dir  = c.intervalDirection ?? (clef === 'bass' ? 'ascending' : 'descending');
      }
      if (el.type === 'note') break;
    }

    return {
      activeClef: clef,
      intervalDirection: dir,
      hasBothHands: rightHandSeen && leftHandSeen,
    };
  }, [elements]);

  // Separar elementos por mão para grand staff
  // Se hasBothHands: elementos entre 'hand right' e 'hand left' vão para pautas separadas
  const { trebleElements, bassElements } = useMemo(() => {
    if (!hasBothHands) return { trebleElements: elements, bassElements: [] as typeof elements };

    const treble: typeof elements = [];
    const bass:   typeof elements = [];
    let currentHand: 'right' | 'left' | null = null;

    for (const el of elements) {
      if (el.type === 'hand') {
        currentHand = (el as any).hand;
        // Enviar o sinal de mão para ambas as pautas (para contexto de armadura/clave)
        treble.push(el);
        bass.push(el);
        continue;
      }
      if (currentHand === 'left') {
        bass.push(el);
      } else {
        // null ou 'right' → pauta de clave de sol
        treble.push(el);
      }
    }
    return { trebleElements: treble, bassElements: bass };
  }, [elements, hasBothHands]);

  // Posição Y da pauta de baixo — calculada para o grand staff
  const GRAND_STAFF_GAP = 50;
  const bassStaveY = hasBothHands ? height + GRAND_STAFF_GAP : 0;

  // Group elements into measures
  const measures      = useMemo(() => groupIntoMeasures(trebleElements), [trebleElements]);
  const bassMeasures  = useMemo(() => groupIntoMeasures(bassElements),   [bassElements]);

  useEffect(() => {
    if (!containerRef.current || measures.length === 0) return;

    // Clear container and hit areas
    containerRef.current.innerHTML = '';
    noteHitAreas.current = [];

    const minStaveWidth = 200;  // Minimum width for a measure
    const baseNoteWidth = 50;    // Base width per note

    // Calculate width for a note based on its duration (longer notes get more space)
    function getNoteWidth(el: ParsedElement): number {
      if (el.type !== 'note' && el.type !== 'rest') return 0;
      const dur = (el as ParsedNote | ParsedRest).duration;
      switch (dur) {
        case 'w': return baseNoteWidth * 3;   // 150px for whole notes
        case 'h': return baseNoteWidth * 2;   // 100px for half notes
        case 'q': return baseNoteWidth * 1.5; // 75px for quarter notes
        case '8': return baseNoteWidth;       // 50px for eighth notes
        case '16': return baseNoteWidth * 0.8; // 40px for 16th notes
        case '32': return baseNoteWidth * 0.7; // 35px for 32nd notes
        default: return baseNoteWidth;
      }
    }

    // First pass: calculate total width needed (all measures in one line)
    let totalWidth = 10; // Start with left padding
    let currentLineX = 10;

    for (let i = 0; i < measures.length; i++) {
      const measure = measures[i];
      // intervalos são consumidos junto com a nota anterior (acorde)
      // dinâmica, ornamentos, etc. são ignorados na renderização VexFlow por enquanto
      const measureNotes = measure.notes.filter(n =>
        n.type === 'note' || n.type === 'rest' || n.type === 'interval'
      );
      // Calcular espaço real ocupado no primeiro compasso:
      // Clave (~30px) + armadura (12px por acidente) + compasso (~20px) + margem
      const ksAccidentals = keySignature ? Math.abs(
        ['C','G','D','A','E','B','F#','C#'].indexOf(keySignature) !== -1
          ? ['C','G','D','A','E','B','F#','C#'].indexOf(keySignature)
          : (['F','Bb','Eb','Ab','Db','Gb','Cb'].indexOf(keySignature) + 1)
      ) : 0;
      // Espaço real do VexFlow no 1º compasso:
      // Clave (~36px) + por acidente (~18px) + padding (~10px) + TS (~26px) + margem (~16px)
      const extraW = i === 0
        ? (36 + ksAccidentals * 18 + 10 + (timeSignatureEl ? 26 : 0) + 16)
        : 0;
      const notesWidth = measureNotes.reduce((sum, n) => sum + getNoteWidth(n), 0);
      const staveW = Math.max(minStaveWidth, notesWidth + extraW + 40); // +40 for padding

      currentLineX += staveW;
      totalWidth = Math.max(totalWidth, currentLineX + 10); // Add right padding
    }

    // Use the calculated dimensions - all measures in one line, scroll if needed
    const canvasWidth  = Math.max(width, totalWidth);
    // Grand staff: altura dupla com espaço entre as duas pautas
    const canvasHeight = hasBothHands ? height * 2 + GRAND_STAFF_GAP : height;

    const renderer = new Renderer(containerRef.current, Renderer.Backends.SVG);
    renderer.resize(canvasWidth, canvasHeight);
    const context = renderer.getContext();

    let x = 10;
    let y = 40;

    // Render each measure
    try {
    for (let i = 0; i < measures.length; i++) {
      const measure = measures[i];
      // intervalos são consumidos junto com a nota anterior (acorde)
      // dinâmica, ornamentos, etc. são ignorados na renderização VexFlow por enquanto
      const measureNotes = measure.notes.filter(n =>
        n.type === 'note' || n.type === 'rest' || n.type === 'interval'
      );
      const isFirst = i === 0;

      // Calculate stave width dynamically based on note durations
      // Add extra space for first measure (clef + time signature take ~80px)
      // Espaço real do primeiro compasso: clave + armadura (por acidente) + compasso + margem
      const ksCount = keySignature ? Math.abs(
        ['C','G','D','A','E','B','F#','C#'].indexOf(keySignature) !== -1
          ? ['C','G','D','A','E','B','F#','C#'].indexOf(keySignature)
          : (['F','Bb','Eb','Ab','Db','Gb','Cb'].indexOf(keySignature) + 1)
      ) : 0;
      // Espaço real do VexFlow no 1º compasso:
      // Clave (~36px) + por acidente (~18px) + padding (~10px) + TS (~26px) + margem (~16px)
      const extraWidth = isFirst
        ? (36 + ksCount * 18 + 10 + (timeSignatureEl ? 26 : 0) + 16)
        : 0;
      const notesWidth = measureNotes.reduce((sum, n) => sum + getNoteWidth(n), 0);
      const currentStaveWidth = Math.max(minStaveWidth, notesWidth + extraWidth + 40);

      // All measures in one line - no wrapping
      // Create stave
      const stave = new Stave(x, y, currentStaveWidth);
      // Clave e armadura: apenas no PRIMEIRO compasso de cada renderização
      // (regra de partitura: clave e armadura aparecem no início de cada linha/sistema)
      const validKeys = ['C','G','D','A','E','B','F#','C#','F','Bb','Eb','Ab','Db','Gb','Cb'];
      if (isFirst) {
        stave.addClef(activeClef);
        if (keySignature && validKeys.includes(keySignature)) {
          try { stave.addKeySignature(keySignature); }
          catch (e) { console.warn('VexFlow keySignature error:', keySignature, e); }
        }
        // Compasso: só renderiza se foi escrito explicitamente
        if (timeSignatureEl) {
          // Verificar se é C ou C-cortado pelo _abbreviated OU pelas dimensões
          const abbr = (timeSignatureEl as any)._abbreviated;
          const num = (timeSignatureEl as any).numerator ?? (timeSignatureEl as any).num;
          const den = (timeSignatureEl as any).denominator ?? (timeSignatureEl as any).den;
          try {
            if (abbr === 'C') {
              stave.addTimeSignature('C');
            } else if (abbr === 'C|') {
              stave.addTimeSignature('C|');
            } else if (num && den) {
              stave.addTimeSignature(`${num}/${den}`);
            }
          } catch (e) {
            console.warn('addTimeSignature error:', e);
          }
        }
      }

      // Set beginning barline type (ritornelo de início)
      if (measure.begBarlineType === 'repeat-begin') {
        stave.setBegBarType(4); // REPEAT_BEGIN = =|:
      }

      // Set ending barline type
      if (measure.barlineType === 'end') {
        stave.setEndBarType(3); // END = =|=
      } else if (measure.barlineType === 'repeat-begin') {
        stave.setEndBarType(4); // REPEAT_BEGIN = =|:
      } else if (measure.barlineType === 'repeat-end') {
        stave.setEndBarType(5); // REPEAT_END = =:|
      } else if (measure.barlineType === 'repeat-both') {
        stave.setEndBarType(6); // REPEAT_BOTH = =::
      }
      // 'single' uses default barline (no setEndBarType call)

      stave.setContext(context).draw();

      // Não renderizar compassos completamente vazios (antes da melodia)
      if (measureNotes.length === 0) {
        // Ainda assim avança x só se não for o primeiro compasso ou se houver armadura/compasso
        if (!isFirst || (!keySignature && timeSignature.numerator === 4)) {
          x += currentStaveWidth;
        }
        continue;
      }

      // Create voice and add notes (SOFT mode avoids strict beat-count validation errors)
      const voice = new Voice({ numBeats: timeSignature.numerator, beatValue: timeSignature.denominator });
      voice.setMode(2); // Voice.Mode.SOFT = 2 — allows partial or overflowing measures
      const vexNotes: StaveNote[] = [];
      // Track which parsed element corresponds to each VexFlow note
      const noteSourceIndices: (number | undefined)[] = [];

      for (const el of measureNotes) {
        if (el.type === 'note') {
          const noteEl = el as ParsedNote; // type assertion segura após type guard
          // Verificar se a próxima nota é um intervalo e construir acorde
          const noteIdx = measureNotes.indexOf(el);
          const intervalKeys: string[] = [noteToVexKey(noteEl)];
          /** Mapa: índice-no-loop → { posição-na-chave, tipo-de-acidente } para notas de intervalo */
          const intervalAccidentals = new Map<number, { noteIdx: number; accidental: string }>();
          let skipCount = 0;

          // Coletar intervalos consecutivos após esta nota
          for (let intIdx = noteIdx + 1; intIdx < measureNotes.length; intIdx++) {
            const nextEl = measureNotes[intIdx];
            if (nextEl.type === 'interval') {
              const size = (nextEl as any).intervalSize as number;
              const pitchOrder = ['C','D','E','F','G','A','B'] as const;
              const basePitchIdx = pitchOrder.indexOf(noteEl.pitch as any);
              if (basePitchIdx !== -1) {
                // Direção: descendente (treble) = subtraímos; ascendente (bass) = somamos
                const direction = intervalDirection === 'descending' ? -1 : 1;
                const steps = (size - 1) * direction;
                const newPitchIdx = ((basePitchIdx + steps) % 7 + 7) % 7;
                const newPitch = pitchOrder[newPitchIdx];
                // Calcular oitava
                let newOctave = noteEl.octave;
                if (direction === -1) {
                  const rawIdx = basePitchIdx + steps;
                  if (rawIdx < 0) newOctave = noteEl.octave - Math.ceil(Math.abs(rawIdx) / 7);
                } else {
                  const rawIdx = basePitchIdx + steps;
                  if (rawIdx >= 7) newOctave = noteEl.octave + Math.floor(rawIdx / 7);
                }
                intervalKeys.push(`${newPitch.toLowerCase()}/${newOctave}`);
                skipCount++;
              }
            } else {
              break; // parar ao encontrar elemento que não é intervalo
            }
          }

          const vexNote = new StaveNote({
            keys: intervalKeys,
            duration: noteToVexDuration(noteEl),
            clef: activeClef,
          });
          // Aplicar acidentes nas notas de intervalo (não afetam armadura global)
          intervalAccidentals.forEach(({ noteIdx, accidental }) => {
            try {
              const vexAcc = accidental === 'sharp' ? '#'
                : accidental === 'flat' ? 'b'
                : accidental === 'natural' ? 'n'
                : accidental === 'double-sharp' ? '##'
                : accidental === 'double-flat' ? 'bb'
                : null;
              if (vexAcc) vexNote.addModifier(new Accidental(vexAcc), noteIdx);
            } catch { /* ignora se VexFlow não suportar */ }
          });

          // Add accidental if present (convert from parser format to VexFlow format)
          if (el.accidental) {
            vexNote.addModifier(new Accidental(accidentalToVex(el.accidental)), 0);
          }

          // Add dot if present
          if (el.dotted) {
            Dot.buildAndAttach([vexNote], { all: true });
          }

          vexNotes.push(vexNote);
          noteSourceIndices.push(el.sourceIndex);
        } else if (el.type === 'rest') {
          const restDur = noteToVexDuration(el) + 'r';
          const vexRest = new StaveNote({
            keys: [activeClef === 'bass' ? 'd/3' : 'b/4'],
            duration: restDur,
            clef: activeClef,
          });

          // Add dot to rest if present
          if (el.dotted) {
            Dot.buildAndAttach([vexRest], { all: true });
          }

          vexNotes.push(vexRest);
          noteSourceIndices.push(el.sourceIndex);
        }
      }

      voice.addTickables(vexNotes);

      // Format and draw (only if there are notes)
      if (vexNotes.length > 0) {
        try {
          // Beaming: CRIAR os beams ANTES do draw
          // O VexFlow só omite a flag individual quando note.beam !== null
          // portanto o Beam deve ser criado antes de voice.draw()
          const isCompound = timeSignature.denominator === 8 &&
            [6, 9, 12].includes(timeSignature.numerator);
          const beamSize = isCompound ? 3 : 2;

          const beamable = vexNotes.filter(n => {
            const dur = (n as any).duration;
            return ['8','16','32','64'].includes(dur);
          });

          const beams: Beam[] = [];
          for (let bi = 0; bi < beamable.length; bi += beamSize) {
            const group = beamable.slice(bi, bi + beamSize);
            if (group.length >= 2) {
              try {
                beams.push(new Beam(group)); // associa beam às notas ANTES do draw
              } catch { /* ignora */ }
            }
          }

          // Format e draw — notas dentro de Beams não terão flag individual
          const formatter = new Formatter();
          // Espaço disponível para as notas = largura total menos o espaço do cabeçalho
          const notesArea = currentStaveWidth - extraWidth - 10;
          formatter.joinVoices([voice]).format([voice], Math.max(notesArea, 60));
          voice.draw(context, stave);

          // Desenhar as barras de beam após o voice.draw()
          beams.forEach(b => {
            try { b.setContext(context).draw(); } catch { /* ignora */ }
          });

        } catch (e) {
          console.warn('VexFlow format/draw error (skipping measure):', e);
          x += currentStaveWidth;
          continue;
        }

        // After drawing, extract bounding boxes for each note to create click hit areas
        for (let j = 0; j < vexNotes.length; j++) {
          const vexNote = vexNotes[j];
          const srcIdx = noteSourceIndices[j];
          if (srcIdx === undefined) continue;

          try {
            const bb = vexNote.getBoundingBox();
            if (bb) {
              noteHitAreas.current.push({
                x: bb.getX(),
                y: bb.getY(),
                w: bb.getW(),
                h: bb.getH(),
                sourceIndex: srcIdx,
              });
            }
          } catch {
            // If getBoundingBox fails, use approximate position based on note's x
            // This is a fallback for notes that don't have a bounding box
            try {
              const noteX = vexNote.getAbsoluteX();
              noteHitAreas.current.push({
                x: noteX - 10,
                y: y - 10,
                w: 30,
                h: 90,
                sourceIndex: srcIdx,
              });
            } catch {
              // Skip this note if we can't get its position
            }
          }
        }
      }

      // Draw ties/ligaduras between consecutive notes
      for (let j = 0; j < measureNotes.length - 1; j++) {
        const current = measureNotes[j];
        const next = measureNotes[j + 1];

        // Check if there's a notetie between them
        const hasTie = elements.some((el, idx) => {
          if (el.type === 'notetie') {
            const currentIdx = elements.indexOf(current as any);
            const nextIdx = elements.indexOf(next as any);
            return currentIdx >= 0 && nextIdx >= 0 && currentIdx < idx && idx < nextIdx;
          }
          return false;
        });

        if (hasTie && j < vexNotes.length - 1) {
          const curve = new Curve(vexNotes[j], vexNotes[j + 1], { cps: [{ x: 0, y: 20 }, { x: 0, y: 20 }] });
          curve.setContext(context).draw();
        }
      }

      x += currentStaveWidth;
    }

    // ── PAUTA DE BAIXO (grand staff quando hasBothHands) ──────────────────────
    if (hasBothHands && bassMeasures.length > 0) {
      let bx = 10;
      for (let bi = 0; bi < bassMeasures.length; bi++) {
        const bm = bassMeasures[bi];
        const bmNotes = bm.notes.filter((n: any) => n.type === 'note' || n.type === 'rest');
        if (bmNotes.length === 0) continue;

        const ksAcc2 = keySignature ? Math.abs(
          ['C','G','D','A','E','B','F#','C#'].indexOf(keySignature) !== -1
            ? ['C','G','D','A','E','B','F#','C#'].indexOf(keySignature)
            : (['F','Bb','Eb','Ab','Db','Gb','Cb'].indexOf(keySignature) + 1)
        ) : 0;
        const extraW2 = bi === 0 ? (36 + ksAcc2 * 18 + 10 + (timeSignatureEl ? 26 : 0) + 16) : 0;
        const notesW2 = bmNotes.reduce((s: number, n: any) => s + getNoteWidth(n), 0);
        const bStaveW = Math.max(200, notesW2 + extraW2 + 40);

        try {
          const stave2 = new Stave(bx, bassStaveY, bStaveW);
          stave2.setContext(context);
          if (bi === 0) {
            stave2.addClef('bass');
            if (keySignature) {
              const vk2 = ['C','G','D','A','E','B','F#','C#','F','Bb','Eb','Ab','Db','Gb','Cb'];
              if (vk2.includes(keySignature)) {
                try { stave2.addKeySignature(keySignature); } catch { /* ignora */ }
              }
            }
          }
          stave2.draw();

          const vn2 = bmNotes.map((el: any) => {
            if (el.type === 'rest') {
              return new StaveNote({ keys: ['d/3'], duration: noteToVexDuration(el), clef: 'bass' });
            }
            return new StaveNote({ keys: [`${el.pitch.toLowerCase()}/${el.octave}`], duration: noteToVexDuration(el), clef: 'bass' });
          });

          const voice2 = new Voice({ numBeats: timeSignature.numerator, beatValue: timeSignature.denominator });
          voice2.setStrict(false);
          voice2.addTickables(vn2);

          const isComp2 = timeSignature.denominator === 8 && [6,9,12].includes(timeSignature.numerator);
          const bSz2 = isComp2 ? 3 : 2;
          const beams2: any[] = [];
          const beable2 = vn2.filter((n: any) => ['8','16','32','64'].includes((n as any).duration));
          for (let bb = 0; bb < beable2.length; bb += bSz2) {
            const g = beable2.slice(bb, bb + bSz2);
            if (g.length >= 2) { try { beams2.push(new Beam(g)); } catch { /* ignora */ } }
          }

          try {
            new Formatter().joinVoices([voice2]).format([voice2], bStaveW - extraW2 - 20);
            voice2.draw(context as any, stave2);
            beams2.forEach((b: any) => { try { b.setContext(context as any).draw(); } catch { /* ignora */ } });
          } catch (e) { console.warn('Bass staff format error:', e); }
        } catch (e) { console.warn('Bass staff render error:', e); }

        bx += bStaveW;
      }
    }

    } catch (e) {
      console.error('ScoreRenderer VexFlow error:', e);
    }
  }, [elements, measures, width, height, timeSignature]);

  // Add click listener on the SVG canvas to detect note clicks
  useEffect(() => {
    if (!containerRef.current || !handleNoteClick) return;

    const onClick = (e: MouseEvent) => {
      const svg = containerRef.current?.querySelector('svg');
      if (!svg) return;
      const rect = svg.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const clickY = e.clientY - rect.top;

      // Find the closest note to the click position
      let closestNote: NoteHitArea | null = null;
      let closestDist = Infinity;

      for (const area of noteHitAreas.current) {
        // Check if click is within the hit area (with some vertical tolerance)
        const centerX = area.x + area.w / 2;
        const centerY = area.y + area.h / 2;
        const dist = Math.sqrt((clickX - centerX) ** 2 + (clickY - centerY) ** 2);

        // Only consider notes within reasonable distance (within the stave area)
        if (dist < closestDist && clickY >= area.y - 20 && clickY <= area.y + area.h + 20) {
          closestDist = dist;
          closestNote = area;
        }
      }

      // If we found a note within 60px, trigger the callback
      if (closestNote && closestDist < 60) {
        handleNoteClick(closestNote.sourceIndex);
      }
    };

    const svg = containerRef.current.querySelector('svg');
    if (svg) {
      svg.addEventListener('click', onClick as EventListener);
      return () => svg.removeEventListener('click', onClick as EventListener);
    }
  }, [handleNoteClick, measures, bassMeasures, hasBothHands, bassStaveY]);

  return (
    <div
      ref={containerRef}
      style={{
        cursor: handleNoteClick ? 'pointer' : 'default',
        overflowX: 'auto',
        overflowY: 'hidden',
        width: '100%',
        maxHeight: height + 50,
      }}
    />
  );
}
