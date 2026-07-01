/**
 * scoreAudioPlayer.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Motor de áudio FM nativo puro — Five Steps Braille
 *
 * Síntese FM aditiva multi-timbre via Web Audio API nativa.
 * Zero dependências externas. Funciona 100% offline / PWA-ready.
 *
 * API pública:
 *   loadSoundFont(_url?)                                         → Promise<void>  (stub)
 *   setInstrument(inst: InstrumentType)                         → void
 *   setBpm(newBpm)                                              → void
 *   playScore(elements, initialBpm, startIndex, onHighlight?)   → void
 *   stopScore()                                                  → void
 *   pauseScore()                                                 → void
 *   resumeScore()                                                → void
 *   playSingleNote(note, keySignature?, durationMs?)            → void
 *
 * Timbres FM disponíveis:
 *   "piano"  — ratioFM=2.756, depthFM=14,  decayFM=0.04  (percussivo, martelo)
 *   "guitar" — ratioFM=1.0,   depthFM=4,   decayFM=0.08  (dedilhado nylon)
 *   "flute"  — ratioFM=1.0,   depthFM=1.5, decayFM=0.5,  attackTime=0.05 (sopro)
 *
 * Regras de negócio (MIMB + Dissertação Vanazzi 2014):
 *   1. Apenas 'note' e 'rest' emitem som / avançam cursor.
 *   2. 'keysignature' atualiza keyAccidentals global.
 *   3. Prioridade de acidente: compasso > armadura > natural.
 *   4. Acidente explícito na nota → salvo em measureAccidentals.
 *   5. 'barline' e 'rest' limpam measureAccidentals; armadura global persiste.
 *   6. setBpm() ajusta andamento em tempo real sem reiniciar.
 *   7. playSingleNote() usa AudioContext efêmero de curta duração.
 *   8. startIndex permite iniciar reprodução a partir do cursor do editor.
 */

import type {
  ParsedElement,
  ParsedNote,
  ParsedKeySignature,
} from './brailleMusic';
import type { Accidental } from './brailleMusic';

// ─── TIPOS ────────────────────────────────────────────────────────────────────

/** Delta de semitom para cada Accidental. */
const ACCIDENTAL_SEMITONE: Record<Accidental, number> = {
  sharp:          1,
  flat:          -1,
  natural:        0,
  'double-sharp': 2,
  'double-flat': -2,
};

/** Mapa pitch → delta de semitom para a armadura de clave ativa. */
type KeyAccidentalMap = Partial<Record<string, number>>;

/**
 * Acidentes acumulados dentro do compasso atual.
 * null = sentinela de bequadro (cancela a armadura de clave para este pitch).
 */
type MeasureAccidentalMap = Partial<Record<string, number | null>>;

/**
 * Timbres FM disponíveis.
 * Alternar com setInstrument() — efeito na próxima nota agendada.
 */
export type InstrumentType = 'piano' | 'guitar' | 'flute';

// ─── CONSTANTES MUSICAIS ──────────────────────────────────────────────────────

const A4_FREQ = 440;
const A4_MIDI = 69;

const PITCH_CLASS: Record<string, number> = {
  C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11,
};

const DURATION_PULSES: Record<string, number> = {
  w:     4,
  h:     2,
  q:     1,
  '8':   0.5,
  '16':  0.25,
  '32':  0.125,
  '64':  0.0625,
  '128': 0.03125,
};

const KEY_SIGNATURE_MAP: Record<string, KeyAccidentalMap> = {
  C:    {},
  G:    { F:  1 },
  D:    { F:  1, C:  1 },
  A:    { F:  1, C:  1, G:  1 },
  E:    { F:  1, C:  1, G:  1, D:  1 },
  B:    { F:  1, C:  1, G:  1, D:  1, A:  1 },
  'F#': { F:  1, C:  1, G:  1, D:  1, A:  1, E:  1 },
  'C#': { F:  1, C:  1, G:  1, D:  1, A:  1, E:  1, B:  1 },
  F:    { B: -1 },
  Bb:   { B: -1, E: -1 },
  Eb:   { B: -1, E: -1, A: -1 },
  Ab:   { B: -1, E: -1, A: -1, D: -1 },
  Db:   { B: -1, E: -1, A: -1, D: -1, G: -1 },
  Gb:   { B: -1, E: -1, A: -1, D: -1, G: -1, C: -1 },
  Cb:   { B: -1, E: -1, A: -1, D: -1, G: -1, C: -1, F: -1 },
};

const DIATONIC_SCALE = ['C', 'D', 'E', 'F', 'G', 'A', 'B'] as const;

// ─── PARÂMETROS FM POR TIMBRE ─────────────────────────────────────────────────

interface FMPreset {
  ratioFM:    number;   // razão freq modulador / portadora
  depthFM:    number;   // profundidade de modulação (índice FM)
  decayFM:    number;   // decaimento do modulador (s) — transitório de ataque
  peakGain:   number;   // ganho de pico do envelope mestre [0, 1]
  attackTime: number;   // tempo de ataque linear (s) — 0 = imediato (piano/guitar)
  gains:      readonly number[]; // ganhos dos parciais harmônicos
}

const FM_PRESETS: Record<InstrumentType, FMPreset> = {
  piano: {
    ratioFM:    2.756,
    depthFM:    14,
    decayFM:    0.04,
    peakGain:   0.30,
    attackTime: 0,        // ataque percussivo — imediato
    gains:      [1.0, 0.50, 0.25, 0.12],
  },
  guitar: {
    ratioFM:    1.0,
    depthFM:    4,
    decayFM:    0.08,
    peakGain:   0.25,
    attackTime: 0,        // pizzicato — imediato
    gains:      [1.0, 0.60, 0.30, 0.08],
  },
  flute: {
    ratioFM:    1.0,
    depthFM:    1.5,
    decayFM:    0.5,
    peakGain:   0.28,
    attackTime: 0.05,     // sopro gradual — 50 ms de ataque linear
    gains:      [1.0, 0.20, 0.05, 0.01],
  },
};

// ─── ESTADO GLOBAL DO INSTRUMENTO ────────────────────────────────────────────

let _currentInstrument: InstrumentType = 'piano';

// ─── FUNÇÕES PURAS DE CONVERSÃO ───────────────────────────────────────────────

/**
 * Converte pitch + oitava braille + delta de acidente → número MIDI.
 *
 * Mapeamento oitava braille → MIDI (convenção MIDI científica):
 *   Oitava 0 → MIDI 12  (C0)
 *   Oitava 1 → MIDI 24  (C1)
 *   Oitava 2 → MIDI 36  (C2)
 *   Oitava 3 → MIDI 48  (C3)
 *   Oitava 4 → MIDI 60  (C4 = Dó central) ← oitava central do piano
 *   Oitava 5 → MIDI 72  (C5)
 *   Oitava 6 → MIDI 84  (C6)
 *   Oitava 7 → MIDI 96  (C7)
 *
 * Fórmula: midi = 12 * (octaveBraille + 1) + pitchClass + delta
 *
 * Verificação:
 *   C4 → 12*(4+1) + 0 + 0 = 60 ✓
 *   A4 → 12*(4+1) + 9 + 0 = 69 ✓  (440 Hz)
 *   F#5 → 12*(5+1) + 5 + 1 = 78 ✓
 */
function pitchToMidi(pitch: string, octave: number, delta: number): number {
  const pitchClass = PITCH_CLASS[pitch];
  if (pitchClass === undefined) {
    throw new Error(`[scoreAudioPlayer] Nota desconhecida: "${pitch}"`);
  }
  return 12 * (octave + 1) + pitchClass + delta;
}

function midiToFrequency(midi: number): number {
  return A4_FREQ * Math.pow(2, (midi - A4_MIDI) / 12);
}

/**
 * Resolve o delta de semitom de uma nota pela hierarquia de acidentes:
 *   1. measureAccidentals[pitch] — acidente explícito neste compasso
 *      (null = bequadro: cancela a armadura, retorna 0)
 *   2. keyAccidentals[pitch]     — acidente implícito da armadura de clave
 *   3. 0                         — natural (sem alteração)
 */
function resolveNoteDelta(
  pitch: string,
  measureAccidentals: MeasureAccidentalMap,
  keyAccidentals: KeyAccidentalMap,
): number {
  if (Object.prototype.hasOwnProperty.call(measureAccidentals, pitch)) {
    return measureAccidentals[pitch] ?? 0;
  }
  return keyAccidentals[pitch] ?? 0;
}

/**
 * Duração em segundos de uma figura rítmica.
 * Suporta ponto simples (×1.5) e ponto duplo (×1.75).
 */
function figureDurationSeconds(
  duration: string,
  dotted: boolean,
  dotted2: boolean,
  bpm: number,
): number {
  const pulses          = DURATION_PULSES[duration] ?? 1;
  const secondsPerPulse = 60 / bpm;
  const multiplier      = dotted2 ? 1.75 : dotted ? 1.5 : 1;
  return pulses * secondsPerPulse * multiplier;
}

// ─── STUB DE SOUNDFONT ────────────────────────────────────────────────────────

/**
 * Stub público — mantém a assinatura da API para não quebrar importações.
 * Motor FM puro: retorna Promise.resolve() imediatamente.
 *
 * @param _url — ignorado (mantido por compatibilidade com BrailleEditor.tsx)
 */
export async function loadSoundFont(_url?: string): Promise<void> {
  return Promise.resolve();
}

// ─── MOTOR FM MULTI-TIMBRE ────────────────────────────────────────────────────
//
// Síntese FM aditiva com preset por instrumento (_currentInstrument):
//
//   Piano  — modulador de alta frequência (ratio 2.756) com decaimento rápido
//             simula o transitório percussivo do martelo. Parciais decrescentes
//             reconstituem o timbre rico das cordas.
//
//   Guitar — modulador de baixa modulação (ratio 1.0, depth 4) com decaimento
//             médio simula o ataque dedilhado e a sustentação curta de nylon.
//
//   Flute  — modulação suave (depth 1.5) com envelope de ataque linear de 50 ms
//             emula o sopro gradual da embocadura. Parciais muito atenuados
//             resultam no timbre limpo e flautado.

/**
 * Agenda o som de um acorde FM no AudioContext fornecido.
 * Lê _currentInstrument para selecionar os parâmetros FM corretos.
 *
 * @param ctx             — AudioContext ativo
 * @param frequencies     — array de frequências em Hz
 * @param startTime       — ctx.currentTime de início (s)
 * @param durationSeconds — duração sonora efetiva (s)
 * @param velocity        — ganho relativo [0, 1] (padrão: 0.72)
 */
function scheduleChord(
  ctx: AudioContext,
  frequencies: number[],
  startTime: number,
  durationSeconds: number,
  velocity = 0.72,
): void {
  const preset       = FM_PRESETS[_currentInstrument];
  const safeDuration = Math.max(durationSeconds, 0.08);
  const noteOff      = startTime + safeDuration;
  const attackEnd    = startTime + preset.attackTime;

  frequencies.forEach(freq => {
    if (!Number.isFinite(freq) || freq <= 0) return;

    // ── Modulador FM ─────────────────────────────────────────────────────────
    const oscFM  = ctx.createOscillator();
    const gainFM = ctx.createGain();
    oscFM.type = 'sine';
    oscFM.frequency.value = freq * preset.ratioFM;
    gainFM.gain.setValueAtTime(preset.depthFM * velocity, startTime);
    gainFM.gain.exponentialRampToValueAtTime(0.001, startTime + preset.decayFM);
    oscFM.connect(gainFM);
    oscFM.start(startTime);
    oscFM.stop(startTime + preset.decayFM + 0.01);

    // ── Envelope mestre (ataque + decaimento) ─────────────────────────────────
    const gainMaster = ctx.createGain();
    const peakGain   = preset.peakGain * velocity;

    if (preset.attackTime > 0) {
      // Flauta: ataque linear suave (emula sopro)
      gainMaster.gain.setValueAtTime(0, startTime);
      gainMaster.gain.linearRampToValueAtTime(peakGain, attackEnd);
      gainMaster.gain.exponentialRampToValueAtTime(0.001, noteOff);
    } else {
      // Piano / Guitar: ataque imediato + decaimento exponencial
      gainMaster.gain.setValueAtTime(peakGain, startTime);
      gainMaster.gain.exponentialRampToValueAtTime(0.001, noteOff);
    }
    gainMaster.connect(ctx.destination);

    // ── Parciais harmônicos ───────────────────────────────────────────────────
    preset.gains.forEach((relGain, harmonicIdx) => {
      const harmFreq = freq * (harmonicIdx + 1);
      if (!Number.isFinite(harmFreq) || harmFreq > 20000) return;

      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = harmFreq;

      // Conectar modulador ao primeiro parcial (portadora fundamental)
      if (harmonicIdx === 0) gainFM.connect(osc.frequency);

      const gainHarm = ctx.createGain();
      gainHarm.gain.value = relGain;
      osc.connect(gainHarm);
      gainHarm.connect(gainMaster);
      osc.start(startTime);
      osc.stop(noteOff + 0.05);
    });
  });
}

// ─── ESTADO GLOBAL DO PLAYER ──────────────────────────────────────────────────

let _ctx:         AudioContext | null                  = null;
let _stopped:     boolean                              = true;
let _currentBpm:  number                               = 120;
let _finishTimer: ReturnType<typeof setTimeout> | null = null;

// ─── API PÚBLICA ──────────────────────────────────────────────────────────────

/**
 * Alterna o timbre FM ativo.
 * Efeito imediato na próxima nota agendada (playScore ou playSingleNote).
 *
 * @param inst — 'piano' | 'guitar' | 'flute'
 */
export function setInstrument(inst: InstrumentType): void {
  _currentInstrument = inst;
}

/** Retorna o timbre FM atualmente selecionado. */
export function getInstrument(): InstrumentType {
  return _currentInstrument;
}

/**
 * Altera o andamento (BPM) em tempo real.
 * Afeta imediatamente os agendamentos futuros do playScore ativo.
 *
 * @param newBpm — Novo valor de BPM (mínimo: 20, máximo: 400)
 */
export function setBpm(newBpm: number): void {
  _currentBpm = Math.max(20, Math.min(400, newBpm));
}

/**
 * Interrompe imediatamente qualquer reprodução em curso.
 * Fecha o AudioContext e limpa timers pendentes.
 */
export function stopScore(): void {
  _stopped = true;
  if (_finishTimer !== null) {
    clearTimeout(_finishTimer);
    _finishTimer = null;
  }
  if (_ctx !== null) {
    _ctx.close().catch(() => {});
    _ctx = null;
  }
}

/**
 * Pausa a reprodução suspendendo o AudioContext.
 * As notas já agendadas no scheduler são congeladas no tempo.
 * Chamar resumeScore() continua a partir do ponto exato de pausa.
 */
export function pauseScore(): void {
  if (_ctx !== null && _ctx.state === 'running') {
    _ctx.suspend().catch(() => {});
  }
}

/**
 * Retoma a reprodução após pauseScore().
 * Desuspende o AudioContext — o scheduler continua de onde parou.
 */
export function resumeScore(): void {
  if (_ctx !== null && _ctx.state === 'suspended') {
    _ctx.resume().catch(() => {});
  }
}

/**
 * Percorre o array de elementos e reproduz a partitura via síntese FM.
 *
 * @param elements           — Array de ParsedElement do brailleMusic.ts
 * @param initialBpm         — BPM inicial (padrão: 120)
 * @param startIndex         — sourceIndex a partir do qual iniciar a reprodução.
 *                             Elementos com sourceIndex < startIndex são percorridos
 *                             para atualizar o estado de armadura/acidentes mas
 *                             NÃO geram som e NÃO avançam o cursor de áudio.
 *                             0 = reproduzir desde o início.
 * @param onElementHighlight — Callback opcional: sourceIndex da nota atual
 */
export function playScore(
  elements:            ParsedElement[],
  initialBpm         = 120,
  startIndex         = 0,
  onElementHighlight?: (sourceIndex: number) => void,
): void {
  stopScore();

  const AudioCtx =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;

  _ctx     = new AudioCtx();
  _stopped = false;
  setBpm(initialBpm);

  // ── Estado de armadura de clave ───────────────────────────────────────────
  let currentGlobalKeySignature: string | null = null;
  let keyAccidentals:            KeyAccidentalMap     = {};
  let measureAccidentals:        MeasureAccidentalMap = {};

  const firstKS = elements.find(el => el.type === 'keysignature') as ParsedKeySignature | undefined;
  if (firstKS) {
    currentGlobalKeySignature = firstKS.vexKey;
    keyAccidentals = { ...(KEY_SIGNATURE_MAP[firstKS.vexKey] ?? {}) };
  }

  // ── Cursor de tempo (Web Audio scheduler) ────────────────────────────────
  let cursor = _ctx.currentTime + 0.05;
  const ctx  = _ctx;

  // ── Tie tracking (MIMB 6-2) ───────────────────────────────────────────────
  const tieActiveUntil = new Map<string, number>();

  // ── Loop principal ────────────────────────────────────────────────────────
  for (let i = 0; i < elements.length; i++) {
    if (_stopped) break;

    const el = elements[i];

    // keysignature → atualiza armadura global (SEMPRE, mesmo antes de startIndex)
    if (el.type === 'keysignature') {
      const ks = el as ParsedKeySignature;
      currentGlobalKeySignature = ks.vexKey;
      keyAccidentals     = { ...(KEY_SIGNATURE_MAP[ks.vexKey] ?? {}) };
      measureAccidentals = {};
      continue;
    }

    // barline → limpa acidentes locais + reafirma armadura global
    if (el.type === 'barline') {
      measureAccidentals = {};
      if (currentGlobalKeySignature) {
        keyAccidentals = { ...(KEY_SIGNATURE_MAP[currentGlobalKeySignature] ?? {}) };
      }
      continue;
    }

    // rest → avança cursor (apenas se >= startIndex) + limpa acidentes locais
    if (el.type === 'rest') {
      const rest = el as { type: 'rest'; duration: string; dotted: boolean; dotted2: boolean; sourceIndex?: number };
      measureAccidentals = {};
      if (currentGlobalKeySignature) {
        keyAccidentals = { ...(KEY_SIGNATURE_MAP[currentGlobalKeySignature] ?? {}) };
      }
      // Avançar cursor apenas se esta pausa está no trecho a ser reproduzido
      const restSrcIdx = rest.sourceIndex ?? 0;
      if (restSrcIdx >= startIndex) {
        cursor += figureDurationSeconds(rest.duration, rest.dotted, rest.dotted2, _currentBpm);
      }
      continue;
    }

    if (el.type !== 'note') continue;

    const note = el as ParsedNote;

    // Registrar acidente explícito no mapa do compasso (SEMPRE — afeta estado)
    if (note.accidental !== undefined) {
      if (note.accidental === 'natural') {
        (measureAccidentals as Record<string, null>)[note.pitch] = null;
      } else {
        measureAccidentals[note.pitch] = ACCIDENTAL_SEMITONE[note.accidental];
      }
    }

    const metricDur = figureDurationSeconds(note.duration, note.dotted, note.dotted2, _currentBpm);

    // ── Verificar se esta nota está no trecho a reproduzir ────────────────
    // Notas antes de startIndex: processam estado (acidentes, armadura) mas
    // não geram som e não avançam o cursor de áudio.
    const noteSrcIdx = note.sourceIndex ?? 0;
    if (noteSrcIdx < startIndex) {
      // Apenas atualizar estado — sem som, sem avanço de cursor
      continue;
    }

    // ── Frequências do acorde (nota base + intervalos) ────────────────────
    const chordFrequencies: number[] = [];
    let intervalCount = 0;

    const delta = resolveNoteDelta(note.pitch, measureAccidentals, keyAccidentals);
    const midi  = pitchToMidi(note.pitch, note.octave, delta);
    chordFrequencies.push(midiToFrequency(midi));

    for (let j = i + 1; j < elements.length; j++) {
      const next = elements[j];
      if (next.type !== 'interval') break;
      intervalCount++;

      const size      = (next as { type: 'interval'; intervalSize: number }).intervalSize;
      const baseIdx   = DIATONIC_SCALE.indexOf(note.pitch as typeof DIATONIC_SCALE[number]);
      const rawIdx    = baseIdx + (size - 1);
      const intPitch  = DIATONIC_SCALE[((rawIdx % 7) + 7) % 7];
      const intOctave = note.octave + Math.floor(rawIdx / 7);

      const intDelta = resolveNoteDelta(intPitch, measureAccidentals, keyAccidentals);
      const intMidi  = pitchToMidi(intPitch, intOctave, intDelta);
      chordFrequencies.push(midiToFrequency(intMidi));
    }

    // ── Tie MIMB 6-2 (ligadura de prolongação) ────────────────────────────
    const isTie             = !!(note as any).isTie || (note as any).tieRole === 'end';
    const tieDurationPulses = (note as any).tieDuration as number | undefined;
    const noteKey           = `${note.pitch.toLowerCase()}/${note.octave}`;

    if (isTie) {
      tieActiveUntil.delete(noteKey);
      if (onElementHighlight !== undefined && note.sourceIndex !== undefined) {
        const noteTime = (cursor - ctx.currentTime) * 1000;
        const srcIdx   = note.sourceIndex;
        setTimeout(() => { if (!_stopped) onElementHighlight(srcIdx); }, Math.max(0, noteTime));
      }
      cursor += metricDur;
      continue;
    }

    // Calcular duração do som (pode ser maior que metricDur se for origem de tie)
    let soundDur = metricDur;

    if (tieDurationPulses !== undefined) {
      soundDur = tieDurationPulses * (60 / _currentBpm);
      tieActiveUntil.set(noteKey, cursor + soundDur);
    } else {
      let lookAhead = i + 1 + intervalCount;
      while (lookAhead < elements.length) {
        const nextEl = elements[lookAhead];
        if (nextEl.type === 'note') {
          const nextNote = nextEl as ParsedNote;
          const nextKey  = `${nextNote.pitch.toLowerCase()}/${nextNote.octave}`;
          if (!!(nextNote as any).isTie && nextKey === noteKey) {
            const nextTieDur = (nextNote as any).tieDuration as number | undefined;
            if (nextTieDur !== undefined) {
              soundDur = nextTieDur * (60 / _currentBpm);
              tieActiveUntil.set(noteKey, cursor + soundDur);
            }
          }
          break;
        }
        if (nextEl.type === 'barline') { lookAhead++; continue; }
        break;
      }
    }

    // Agendar som FM com o timbre selecionado
    scheduleChord(ctx, chordFrequencies, cursor, soundDur * 0.96);

    if (onElementHighlight !== undefined && note.sourceIndex !== undefined) {
      const noteTime = (cursor - ctx.currentTime) * 1000;
      const srcIdx   = note.sourceIndex;
      setTimeout(() => { if (!_stopped) onElementHighlight(srcIdx); }, Math.max(0, noteTime));
    }

    cursor += metricDur;
  }

  // ── Encerramento automático ───────────────────────────────────────────────
  if (!_stopped) {
    const remainingMs = Math.max(0, (cursor - ctx.currentTime) * 1000) + 300;
    _finishTimer = setTimeout(() => {
      if (!_stopped) { _stopped = true; ctx.close().catch(() => {}); }
    }, remainingMs);
  }
}

/**
 * Reprodução imediata de nota individual — feedback de digitação ao vivo.
 *
 * Usa AudioContext efêmero de curta duração e o timbre FM ativo (_currentInstrument).
 * Aplica armadura de clave ativa para frequência correta (ex: Dó em Ré Maior → Dó#).
 *
 * @param note         — ParsedNote a ser tocada
 * @param keySignature — Armadura ativa (ex: 'G', 'D'). null = Dó Maior.
 * @param durationMs   — Duração em ms (padrão: 300ms)
 */
export function playSingleNote(
  note:         ParsedNote,
  keySignature: string | null = null,
  durationMs  = 300,
): void {
  const keyAcc: KeyAccidentalMap = (() => {
    if (!keySignature) return {};
    const acc = KEY_SIGNATURE_MAP[keySignature];
    if (!acc && process.env.NODE_ENV === 'development') {
      console.warn(`[playSingleNote] armadura '${keySignature}' não encontrada`);
    }
    return acc ?? {};
  })();

  // Prioridade: acidente explícito > armadura de clave > natural
  const finalDelta = note.accidental !== undefined
    ? (ACCIDENTAL_SEMITONE[note.accidental] ?? 0)
    : resolveNoteDelta(note.pitch, {}, keyAcc);

  const midi = pitchToMidi(note.pitch, note.octave, finalDelta);
  const hz   = midiToFrequency(midi);
  const dur  = durationMs / 1000;

  // AudioContext efêmero — criado e fechado por nota individual
  const AudioCtx =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;

  let ctx: AudioContext;
  try {
    ctx = new AudioCtx();
  } catch {
    return;
  }

  scheduleChord(ctx, [hz], ctx.currentTime + 0.01, dur, 0.65);

  setTimeout(() => { ctx.close().catch(() => {}); }, durationMs + 200);
}

// ─── TESTES UNITÁRIOS (Vitest) ────────────────────────────────────────────────

if (import.meta.vitest) {
  const { describe, it, expect, beforeEach } = import.meta.vitest;

  describe('pitchToMidi — oitava central C4 = MIDI 60', () => {
    it('C4 = 60 (Dó central)',  () => expect(pitchToMidi('C', 4, 0)).toBe(60));
    it('A4 = 69 (440 Hz ref)', () => expect(pitchToMidi('A', 4, 0)).toBe(69));
    it('C#4 = 61',             () => expect(pitchToMidi('C', 4, 1)).toBe(61));
    it('Bb4 = 70',             () => expect(pitchToMidi('B', 4, -1)).toBe(70));
    it('C5 = 72',              () => expect(pitchToMidi('C', 5, 0)).toBe(72));
    it('B3 = 59',              () => expect(pitchToMidi('B', 3, 0)).toBe(59));
    it('F#5 = 78',             () => expect(pitchToMidi('F', 5, 1)).toBe(78));
    it('C0 = 12',              () => expect(pitchToMidi('C', 0, 0)).toBe(12));
    it('C7 = 96',              () => expect(pitchToMidi('C', 7, 0)).toBe(96));
  });

  describe('midiToFrequency', () => {
    it('A4 (69) = 440 Hz',   () => expect(midiToFrequency(69)).toBeCloseTo(440.0, 2));
    it('A5 (81) = 880 Hz',   () => expect(midiToFrequency(81)).toBeCloseTo(880.0, 2));
    it('C4 (60) ≈ 261.63 Hz',() => expect(midiToFrequency(60)).toBeCloseTo(261.63, 1));
    it('A3 (57) = 220 Hz',   () => expect(midiToFrequency(57)).toBeCloseTo(220.0, 2));
  });

  describe('resolveNoteDelta — prioridade de acidentes', () => {
    const keyD: KeyAccidentalMap = { F: 1, C: 1 };
    it('F em Ré maior → +1',          () => expect(resolveNoteDelta('F', {}, keyD)).toBe(1));
    it('D em Ré maior → 0',           () => expect(resolveNoteDelta('D', {}, keyD)).toBe(0));
    it('bequadro cancela F#', () => {
      const m: MeasureAccidentalMap = {};
      (m as Record<string, null>)['F'] = null;
      expect(resolveNoteDelta('F', m, keyD)).toBe(0);
    });
    it('Cb no compasso > C# da armadura', () =>
      expect(resolveNoteDelta('C', { C: -1 }, keyD)).toBe(-1));
    it('nota não listada → 0',        () => expect(resolveNoteDelta('B', {}, keyD)).toBe(0));
  });

  describe('figureDurationSeconds', () => {
    it('q 60 BPM = 1.0s',     () => expect(figureDurationSeconds('q',  false, false, 60)).toBeCloseTo(1.0,  5));
    it('h 60 BPM = 2.0s',     () => expect(figureDurationSeconds('h',  false, false, 60)).toBeCloseTo(2.0,  5));
    it('w 60 BPM = 4.0s',     () => expect(figureDurationSeconds('w',  false, false, 60)).toBeCloseTo(4.0,  5));
    it('8 120 BPM = 0.25s',   () => expect(figureDurationSeconds('8',  false, false, 120)).toBeCloseTo(0.25, 5));
    it('q. 60 BPM = 1.5s',    () => expect(figureDurationSeconds('q',  true,  false, 60)).toBeCloseTo(1.5,  5));
    it('q.. 60 BPM = 1.75s',  () => expect(figureDurationSeconds('q',  false, true,  60)).toBeCloseTo(1.75, 5));
    it('16 120 BPM = 0.125s', () => expect(figureDurationSeconds('16', false, false, 120)).toBeCloseTo(0.125,5));
  });

  describe('KEY_SIGNATURE_MAP', () => {
    it('C: sem acidentes', () => expect(KEY_SIGNATURE_MAP['C']).toEqual({}));
    it('G: F#',            () => expect(KEY_SIGNATURE_MAP['G']).toEqual({ F: 1 }));
    it('D: F# e C#',       () => expect(KEY_SIGNATURE_MAP['D']).toEqual({ F: 1, C: 1 }));
    it('F: Bb',            () => expect(KEY_SIGNATURE_MAP['F']).toEqual({ B: -1 }));
    it('Bb: Bb e Eb',      () => expect(KEY_SIGNATURE_MAP['Bb']).toEqual({ B: -1, E: -1 }));
    it('C#: 7 sustenidos', () => expect(Object.keys(KEY_SIGNATURE_MAP['C#'] ?? {})).toHaveLength(7));
    it('Cb: 7 bemóis',     () => expect(Object.keys(KEY_SIGNATURE_MAP['Cb'] ?? {})).toHaveLength(7));
  });

  describe('setBpm', () => {
    it('mínimo: 20',  () => { setBpm(1);    expect(_currentBpm).toBe(20);  });
    it('máximo: 400', () => { setBpm(9999); expect(_currentBpm).toBe(400); });
    it('normal: 120', () => { setBpm(120);  expect(_currentBpm).toBe(120); });
    it('normal: 80',  () => { setBpm(80);   expect(_currentBpm).toBe(80);  });
  });

  describe('setInstrument / getInstrument', () => {
    beforeEach(() => { setInstrument('piano'); });

    it('padrão é piano',         () => expect(getInstrument()).toBe('piano'));
    it('muda para guitar',       () => { setInstrument('guitar'); expect(getInstrument()).toBe('guitar'); });
    it('muda para flute',        () => { setInstrument('flute');  expect(getInstrument()).toBe('flute');  });
    it('volta para piano',       () => { setInstrument('flute'); setInstrument('piano'); expect(getInstrument()).toBe('piano'); });
    it('FM_PRESETS piano correto',  () => expect(FM_PRESETS.piano.ratioFM).toBeCloseTo(2.756, 3));
    it('FM_PRESETS guitar ratio',   () => expect(FM_PRESETS.guitar.ratioFM).toBe(1.0));
    it('FM_PRESETS flute attack',   () => expect(FM_PRESETS.flute.attackTime).toBeCloseTo(0.05, 3));
    it('FM_PRESETS flute depth < guitar', () =>
      expect(FM_PRESETS.flute.depthFM).toBeLessThan(FM_PRESETS.guitar.depthFM));
  });

  describe('loadSoundFont — stub FM puro', () => {
    it('resolve imediatamente com url',   async () =>
      await expect(loadSoundFont('/assets/piano.sf2')).resolves.toBeUndefined());
    it('resolve imediatamente sem args',  async () =>
      await expect(loadSoundFont()).resolves.toBeUndefined());
  });
}
