/**
 * scoreAudioPlayer.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Motor de áudio para o Editor de Partituras em Braille — Five Steps Braille
 *
 * Síntese de piano via Web Audio API nativa (zero dependências externas).
 * Segue estritamente as regras do Manual Internacional de Musicografia Braille
 * e da dissertação Vanazzi (2014) para resolução de acidentes.
 *
 * API pública exportada:
 *   playScore(elements, initialBpm, onElementHighlight?)  → void
 *   stopScore()                                           → void
 *   setBpm(newBpm)                                        → void
 *   playSingleNote(note)                                  → void
 *
 * Regras de negócio:
 *   1. Apenas 'note' e 'rest' emitem som; todos os outros tipos são ignorados.
 *   2. 'keysignature' atualiza a armadura de clave ativa.
 *   3. Para cada nota: acidente do compasso > armadura de clave > natural.
 *   4. Acidente explícito na nota é salvo em measureAccidentals.
 *   5. 'barline' limpa measureAccidentals, restaurando a armadura de clave.
 *   6. setBpm() ajusta o andamento em tempo real sem reiniciar o player.
 *   7. playSingleNote() fornece feedback imediato ao digitar.
 */

import type {
  ParsedElement,
  ParsedNote,
  ParsedKeySignature,
} from '../lib/brailleMusic';
import type { Accidental } from '../lib/brailleMusic';

// ─── TIPOS INTERNOS ───────────────────────────────────────────────────────────

/** Delta de semitom para cada tipo de Accidental. */
const ACCIDENTAL_SEMITONE: Record<Accidental, number> = {
  sharp:          1,
  flat:          -1,
  natural:        0,
  'double-sharp': 2,
  'double-flat': -2,
};

/**
 * Mapa de nota → delta de semitom para uma armadura de clave.
 * Ausência de chave = nota natural (delta 0).
 */
type KeyAccidentalMap = Partial<Record<string, number>>;

/**
 * Acidentais acumulados dentro do compasso atual.
 * O valor `null` é a sentinela de bequadro (cancela a armadura de clave).
 */
type MeasureAccidentalMap = Partial<Record<string, number | null>>;

// ─── CONSTANTES MUSICAIS ──────────────────────────────────────────────────────

/** Frequência de referência: A4 = 440 Hz, MIDI 69. */
const A4_FREQ = 440;
const A4_MIDI = 69;

/**
 * Número MIDI base de cada nota dentro de uma oitava
 * (relativo a C, sem considerar a oitava).
 */
const PITCH_CLASS: Record<string, number> = {
  C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11,
};

/**
 * Duração de cada figura em pulsos de semínima.
 * Semínima = 1 pulso, colcheia = 0.5, etc.
 */
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

/**
 * Mapeamento vexKey → { nota: delta de semitom }
 * Baseado no ciclo de quintas:
 *   Sustenidos: F C G D A E B (em ordem crescente de # na armadura)
 *   Bemóis:     B E A D G C F (em ordem crescente de ♭)
 */
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

/** Ordem diatônica das notas (para cálculo de intervalos harmônicos). */
const DIATONIC_SCALE = ['C', 'D', 'E', 'F', 'G', 'A', 'B'] as const;

// ─── FUNÇÕES PURAS DE CONVERSÃO ───────────────────────────────────────────────

/**
 * Converte pitch + oitava + delta de semitom → número MIDI.
 *
 * Convenção: C4 = 60, A4 = 69.
 * MIDI 12 = C0 na escala científica (C-1 = 0 na convenção MIDI estrita,
 * mas usamos a convenção mais comum onde C4 = 60).
 */
function pitchToMidi(pitch: string, octave: number, delta: number): number {
  const pitchClass = PITCH_CLASS[pitch];
  if (pitchClass === undefined) {
    throw new Error(`[scoreAudioPlayer] Nota desconhecida: "${pitch}"`);
  }
  return 12 * (octave + 1) + pitchClass + delta;
}

/** Converte número MIDI → frequência Hz via afinação igual temperada. */
function midiToFrequency(midi: number): number {
  return A4_FREQ * Math.pow(2, (midi - A4_MIDI) / 12);
}

/**
 * Resolve o delta de semitom efetivo para uma nota, aplicando a prioridade:
 *   1. Acidente do compasso (measureAccidentals) — null = bequadro (cancela tudo)
 *   2. Acidente da armadura de clave (keyAccidentals)
 *   3. Natural (delta 0)
 */
function resolveNoteDelta(
  pitch: string,
  measureAccidentals: MeasureAccidentalMap,
  keyAccidentals: KeyAccidentalMap,
): number {
  if (Object.prototype.hasOwnProperty.call(measureAccidentals, pitch)) {
    // null = bequadro explícito → nota natural independente da armadura
    return measureAccidentals[pitch] ?? 0;
  }
  return keyAccidentals[pitch] ?? 0;
}

/**
 * Calcula a duração de uma figura em segundos.
 * Considera ponto de aumento (×1.5) e ponto duplo (×1.75).
 */
function figureDurationSeconds(
  duration: string,
  dotted: boolean,
  dotted2: boolean,
  bpm: number,
): number {
  const pulses = DURATION_PULSES[duration] ?? 1;
  const secondsPerPulse = 60 / bpm;
  const multiplier = dotted2 ? 1.75 : dotted ? 1.5 : 1;
  return pulses * secondsPerPulse * multiplier;
}

// ─── SÍNTESE SONORA ───────────────────────────────────────────────────────────

/**
 * Parâmetros do envelope ADSR do piano sintético.
 * Valores calibrados para imitar o ataque percussivo e o decaimento natural do piano.
 */
const PIANO_ENV = {
  attack:       0.004,  // s — tempo de ataque
  decay:        0.09,   // s — tempo de decaimento
  sustainLevel: 0.50,   // 0–1 — nível de sustain
  releaseRatio: 0.20,   // fração da duração total reservada ao release
  releaseMin:   0.06,   // s — release mínimo
  releaseMax:   0.45,   // s — release máximo
};

/**
 * Agenda a síntese de um acorde (1 ou mais frequências) no AudioContext.
 * Usa dois osciladores por frequência:
 *   - Onda triangular: corpo do som (piano médio)
 *   - Onda senoidal oitava acima: brilho harmônico (decai rápido)
 *
 * Não bloqueia a thread principal — todos os eventos são agendados
 * com precisão via Web Audio API scheduler.
 */
function scheduleChord(
  ctx: AudioContext,
  frequencies: number[],
  startTime: number,
  durationSeconds: number,
  velocity = 0.72,
): void {
  const env = PIANO_ENV;
  const noteOff = startTime + durationSeconds;
  const release = Math.min(
    env.releaseMax,
    Math.max(env.releaseMin, durationSeconds * env.releaseRatio),
  );
  const sustainEnd = noteOff - release;

  frequencies.forEach(freq => {
    if (!Number.isFinite(freq) || freq <= 0) return;

    // — Oscilador principal (corpo)
    const osc1  = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'triangle';
    osc1.frequency.value = freq;

    gain1.gain.setValueAtTime(0, startTime);
    gain1.gain.linearRampToValueAtTime(velocity, startTime + env.attack);
    gain1.gain.linearRampToValueAtTime(
      velocity * env.sustainLevel,
      startTime + env.attack + env.decay,
    );
    gain1.gain.setValueAtTime(velocity * env.sustainLevel, sustainEnd);
    gain1.gain.linearRampToValueAtTime(0, noteOff);

    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(startTime);
    osc1.stop(noteOff + 0.02);

    // — Oscilador harmônico (brilho, decai rápido)
    const osc2  = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.value = freq * 2;

    gain2.gain.setValueAtTime(0, startTime);
    gain2.gain.linearRampToValueAtTime(velocity * 0.11, startTime + env.attack);
    gain2.gain.linearRampToValueAtTime(0, startTime + env.attack + env.decay);

    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(startTime);
    osc2.stop(startTime + env.attack + env.decay + 0.01);
  });
}

// ─── ESTADO GLOBAL DO PLAYER ──────────────────────────────────────────────────
// Mantido fora da função principal para permitir controle via setBpm/stopScore.

let _ctx:             AudioContext | null = null;
let _stopped:         boolean             = true;
let _currentBpm:      number              = 120;
let _finishTimer:     ReturnType<typeof setTimeout> | null = null;

// ─── API PÚBLICA ──────────────────────────────────────────────────────────────

/**
 * Altera o andamento (BPM) da execução em tempo real.
 * Afeta o agendamento das notas ainda não processadas.
 * Se o player não estiver ativo, o valor é salvo para a próxima execução.
 *
 * @param newBpm — Novo valor de BPM (mínimo: 20, máximo: 400)
 */
export function setBpm(newBpm: number): void {
  _currentBpm = Math.max(20, Math.min(400, newBpm));
}

/**
 * Interrompe imediatamente qualquer reprodução em curso.
 * Fecha o AudioContext e limpa os timers pendentes.
 */
export function stopScore(): void {
  _stopped = true;
  if (_finishTimer !== null) {
    clearTimeout(_finishTimer);
    _finishTimer = null;
  }
  if (_ctx !== null) {
    _ctx.close().catch(() => { /* ignora erros de fechamento */ });
    _ctx = null;
  }
}

/**
 * Percorre o array de elementos e reproduz a partitura completa.
 *
 * Regras de negócio:
 *   1. Apenas 'note' e 'rest' emitem som.
 *   2. 'keysignature' atualiza a armadura de clave ativa.
 *   3. Acidente do compasso > armadura de clave > natural.
 *   4. Acidente explícito salvo em measureAccidentals para o compasso atual.
 *   5. 'barline' limpa measureAccidentals.
 *   6. setBpm() ajusta o andamento sem reiniciar.
 *
 * @param elements            — Array de ParsedElement do brailleMusic.ts
 * @param initialBpm          — BPM inicial (padrão: 120)
 * @param onElementHighlight  — Callback opcional: recebe sourceIndex da nota atual
 */
export function playScore(
  elements: ParsedElement[],
  initialBpm = 120,
  onElementHighlight?: (sourceIndex: number) => void,
): void {
  // Parar qualquer execução anterior
  stopScore();

  // Inicializar AudioContext
  const AudioCtx =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;

  _ctx     = new AudioCtx();
  _stopped = false;
  setBpm(initialBpm);

  // ── Estado de memória de acidentes ────────────────────────────────────────
  let keyAccidentals:     KeyAccidentalMap     = {};
  let measureAccidentals: MeasureAccidentalMap = {};

  // Pré-carregar armadura se houver keysignature antes das notas
  const firstKS = elements.find(el => el.type === 'keysignature') as ParsedKeySignature | undefined;
  if (firstKS) {
    keyAccidentals = { ...(KEY_SIGNATURE_MAP[firstKS.vexKey] ?? {}) };
  }

  // ── Cursor de tempo (Web Audio API scheduler) ─────────────────────────────
  let cursor = _ctx.currentTime + 0.05;
  const ctx  = _ctx; // captura local para closures (ctx pode mudar se stopScore for chamado)

  // ── Loop principal sobre os elementos ────────────────────────────────────
  for (let i = 0; i < elements.length; i++) {
    if (_stopped) break;

    const el = elements[i];

    // ── Regra 2: atualizar armadura de clave ──────────────────────────────
    if (el.type === 'keysignature') {
      const ks = el as ParsedKeySignature;
      keyAccidentals     = { ...(KEY_SIGNATURE_MAP[ks.vexKey] ?? {}) };
      measureAccidentals = {}; // armadura nova → reset do compasso
      continue;
    }

    // ── Regra 5: barra de compasso → limpar acidentes do compasso ────────
    if (el.type === 'barline') {
      measureAccidentals = {};
      continue;
    }

    // ── Regra 1: pausas avançam o cursor sem som ──────────────────────────
    if (el.type === 'rest') {
      const rest = el as { type: 'rest'; duration: string; dotted: boolean; dotted2: boolean };
      cursor += figureDurationSeconds(rest.duration, rest.dotted, rest.dotted2, _currentBpm);
      continue;
    }

    // ── Regra 1: apenas notas emitem som ─────────────────────────────────
    if (el.type !== 'note') continue;

    const note = el as ParsedNote;

    // ── Regra 4: registrar acidente explícito da nota ─────────────────────
    if (note.accidental !== undefined) {
      if (note.accidental === 'natural') {
        // null = sentinela de bequadro: cancela a armadura para este pitch no compasso
        (measureAccidentals as Record<string, null>)[note.pitch] = null;
      } else {
        measureAccidentals[note.pitch] = ACCIDENTAL_SEMITONE[note.accidental];
      }
    }

    // ── Regra 3: resolver acidente efetivo e calcular frequência ─────────
    const delta = resolveNoteDelta(note.pitch, measureAccidentals, keyAccidentals);
    const midi  = pitchToMidi(note.pitch, note.octave, delta);
    const hz    = midiToFrequency(midi);
    const dur   = figureDurationSeconds(note.duration, note.dotted, note.dotted2, _currentBpm);

    // ── Coletar intervalos harmônicos consecutivos (acorde) ───────────────
    // Elementos 'interval' imediatamente após a nota formam o acorde.
    // Cada intervalo também respeita a armadura e os acidentes do compasso.
    const chordFrequencies: number[] = [hz];

    for (let j = i + 1; j < elements.length; j++) {
      const next = elements[j];
      if (next.type !== 'interval') break;

      const size      = (next as { type: 'interval'; intervalSize: number }).intervalSize;
      const baseIdx   = DIATONIC_SCALE.indexOf(note.pitch as typeof DIATONIC_SCALE[number]);
      const rawIdx    = baseIdx + (size - 1);
      const intPitch  = DIATONIC_SCALE[((rawIdx % 7) + 7) % 7];
      const intOctave = note.octave + Math.floor(rawIdx / 7);

      const intDelta = resolveNoteDelta(intPitch, measureAccidentals, keyAccidentals);
      const intMidi  = pitchToMidi(intPitch, intOctave, intDelta);
      chordFrequencies.push(midiToFrequency(intMidi));
    }

    // ── Agendar o som no Web Audio scheduler ──────────────────────────────
    scheduleChord(ctx, chordFrequencies, cursor, dur * 0.93);

    // ── Callback de highlight (sincronizado com o tempo da nota) ─────────
    if (onElementHighlight !== undefined && note.sourceIndex !== undefined) {
      const noteTime = (cursor - ctx.currentTime) * 1000;
      const srcIdx   = note.sourceIndex;
      setTimeout(() => {
        if (!_stopped) onElementHighlight(srcIdx);
      }, Math.max(0, noteTime));
    }

    cursor += dur;
  }

  // ── Agendar o encerramento após a última nota ─────────────────────────────
  if (!_stopped) {
    const remainingMs = Math.max(0, (cursor - ctx.currentTime) * 1000) + 300;
    _finishTimer = setTimeout(() => {
      if (!_stopped) {
        _stopped = true;
        ctx.close().catch(() => {});
      }
    }, remainingMs);
  }
}

/**
 * Toca uma única nota por um curto período (feedback imediato ao digitar).
 * Usa um AudioContext efêmero independente do player principal.
 *
 * Ideal para uso no teclado Perkins: toda vez que o usuário confirma uma célula,
 * chame `playSingleNote(parsedNote)` para ouvir a nota imediatamente.
 *
 * @param note      — ParsedNote a ser tocada
 * @param durationMs — Duração em milissegundos (padrão: 300ms)
 */
export function playSingleNote(note: ParsedNote, durationMs = 300): void {
  const AudioCtx =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;

  let ctx: AudioContext;
  try {
    ctx = new AudioCtx();
  } catch {
    return; // Navegador sem suporte a Web Audio API
  }

  // Usa delta 0 (sem armadura) para feedback imediato — a armadura
  // não é relevante para o feedback de digitação isolada
  const accidentalDelta = note.accidental !== undefined && note.accidental !== 'natural'
    ? ACCIDENTAL_SEMITONE[note.accidental]
    : 0;

  const midi = pitchToMidi(note.pitch, note.octave, accidentalDelta);
  const hz   = midiToFrequency(midi);
  const dur  = durationMs / 1000;

  scheduleChord(ctx, [hz], ctx.currentTime + 0.01, dur, 0.65);

  setTimeout(() => {
    ctx.close().catch(() => {});
  }, durationMs + 200);
}

// Testes unitários movidos para scoreAudioPlayer.test.ts
// Compatível com Vitest (configuração padrão do projeto).
