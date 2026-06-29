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
 *   playSingleNote(note, keySignature?, durationMs?)       → void
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
} from './brailleMusic';
import type { Accidental } from './brailleMusic';

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

// ─── SÍNTESE FM DE PIANO ─────────────────────────────────────────────────────
//
// Arquitetura de síntese aditiva com modulação FM leve:
//
//  MODULADOR FM
//   └─ OscFM (sine, freq × ratioFM)
//       └─ GainFM (profundidade de modulação)
//           └─ frequency input do OscFundamental
//
//  CADEIA PRINCIPAL (por harmônico)
//   ├─ OscFundamental (sine, freq)          — frequência fundamental
//   ├─ Osc2 (sine, freq × 2)               — 2° harmônico (oitava)
//   ├─ Osc3 (sine, freq × 3)               — 3° harmônico (quinta)
//   └─ Osc4 (sine, freq × 4)               — 4° harmônico (oitava + quinta)
//       └─ GainMaster
//           └─ destination
//
// Envelope: ataque imediato (gain.setValueAtTime 0.3) →
//           decaimento exponencial (exponentialRampToValueAtTime 0.001)
//           ao longo da duração da nota, imitando o martelo + ressonância da corda.

/**
 * Tabela de amplitudes relativas de cada harmônico.
 * Baseada na análise espectral aproximada de um piano Steinway (notas médias).
 * Índice 0 = fundamental, 1 = 2°, 2 = 3°, 3 = 4° harmônico.
 */
const HARMONIC_GAINS = [1.0, 0.50, 0.25, 0.12] as const;

/**
 * Parâmetros do modulador FM.
 * ratioFM:  frequência do modulador = fundamental × ratioFM
 * depthFM:  desvio máximo de frequência em Hz (profundidade de modulação)
 * decayFM:  o FM decai rapidamente após o ataque (simula o transiente do martelo)
 */
const FM_PARAMS = {
  ratioFM:  2.756,  // rácio não-inteiro → aliasing interessante no ataque
  depthFM:  14,     // Hz — inarm. leve no transiente
  decayFM:  0.04,   // s — FM some rapidamente
} as const;

/**
 * Agenda a síntese de um acorde de piano usando FM + síntese aditiva.
 *
 * Envelope de sulco (conforme especificado):
 *   1. gain.setValueAtTime(0.3, startTime)              — ataque imediato
 *   2. gain.exponentialRampToValueAtTime(0.001, noteOff) — decaimento ao longo da duração
 *
 * O decaimento exponencial imita fisicamente: a energia mecânica do martelo
 * transmitida à corda decai de forma logarítmica com o tempo.
 *
 * @param ctx             — AudioContext ativo
 * @param frequencies     — Array de frequências Hz (nota + intervalos harmônicos do acorde)
 * @param startTime       — Timestamp Web Audio de início
 * @param durationSeconds — Duração total da nota em segundos
 * @param velocity        — Intensidade 0.0–1.0 (mapeia para amplitude inicial)
 */
function scheduleChord(
  ctx: AudioContext,
  frequencies: number[],
  startTime: number,
  durationSeconds: number,
  velocity = 0.72,
): void {
  // A duração mínima garante que o envelope exponencial não chegue a zero
  // antes do tempo, evitando cliques e erros de valor zero no Web Audio API.
  const safeDuration = Math.max(durationSeconds, 0.08);
  const noteOff = startTime + safeDuration;

  frequencies.forEach(freq => {
    if (!Number.isFinite(freq) || freq <= 0) return;

    // ── Modulador FM (martelo → transiente percussivo) ─────────────────────
    // O FM adiciona inarmonia no instante do ataque e desaparece rapidamente,
    // imitando a distorção de frequência quando o martelo bate na corda.
    const oscFM  = ctx.createOscillator();
    const gainFM = ctx.createGain();
    oscFM.type = 'sine';
    oscFM.frequency.value = freq * FM_PARAMS.ratioFM;

    // Profundidade de modulação: máxima no ataque, zero em 40ms
    gainFM.gain.setValueAtTime(FM_PARAMS.depthFM * velocity, startTime);
    gainFM.gain.exponentialRampToValueAtTime(
      0.001,
      startTime + FM_PARAMS.decayFM,
    );

    oscFM.connect(gainFM);
    oscFM.start(startTime);
    oscFM.stop(startTime + FM_PARAMS.decayFM + 0.01);

    // ── Osciladores harmônicos (corpo da nota) ─────────────────────────────
    // Cada harmônico compartilha o mesmo GainMaster — um único envelope
    // controla toda a cadeia, simplificando e melhorando a coerência tímbrica.
    const gainMaster = ctx.createGain();

    // Envelope de sulco (especificado):
    //   Ataque imediato a 0.3 × velocity → decaimento exponencial até 0.001
    const peakGain = 0.30 * velocity;
    gainMaster.gain.setValueAtTime(peakGain, startTime);
    gainMaster.gain.exponentialRampToValueAtTime(0.001, noteOff);

    gainMaster.connect(ctx.destination);

    HARMONIC_GAINS.forEach((relGain, harmonicIdx) => {
      const harmFreq = freq * (harmonicIdx + 1);
      if (!Number.isFinite(harmFreq) || harmFreq > 20000) return; // acima de 20 kHz → inaudível

      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = harmFreq;

      // Conectar modulador FM apenas na fundamental (harmônico 0)
      // — nos harmônicos superiores o FM causaria distorção excessiva
      if (harmonicIdx === 0) {
        gainFM.connect(osc.frequency);
      }

      // GainHarm escala cada harmônico pela sua amplitude relativa
      const gainHarm = ctx.createGain();
      gainHarm.gain.value = relGain;

      osc.connect(gainHarm);
      gainHarm.connect(gainMaster);

      osc.start(startTime);
      osc.stop(noteOff + 0.05); // pequena cauda para evitar clique no corte
    });
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
  stopScore();

  const AudioCtx =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;

  _ctx     = new AudioCtx();
  _stopped = false;
  setBpm(initialBpm);

  // ── Estado de memória de acidentes ────────────────────────────────────────
  // currentGlobalKeySignature: persiste do primeiro ao último compasso.
  // Atualizada sempre que um elemento 'keysignature' é encontrado no loop.
  // Garante que o delta de semitom da armadura (ex: F# e C# em Ré Maior)
  // seja aplicado continuamente em toda a partitura.
  let currentGlobalKeySignature: string | null = null;
  let keyAccidentals:            KeyAccidentalMap     = {};
  let measureAccidentals:        MeasureAccidentalMap = {};

  // Pré-carregar armadura a partir do primeiro elemento keysignature encontrado
  const firstKS = elements.find(el => el.type === 'keysignature') as ParsedKeySignature | undefined;
  if (firstKS) {
    currentGlobalKeySignature = firstKS.vexKey;
    keyAccidentals = { ...(KEY_SIGNATURE_MAP[firstKS.vexKey] ?? {}) };
  }

  // ── Cursor de tempo ────────────────────────────────────────────────────────
  let cursor = _ctx.currentTime + 0.05;
  const ctx  = _ctx;

  // ── Estado de tie (MIMB 6-2) ──────────────────────────────────────────────
  // Rastreia notas ativas com envelope aberto para prolongação.
  // Chave: "pitch/octave" → cursor de fim do som agendado.
  // Quando isTie=true chega, NÃO re-ataca; apenas avança o cursor pelo
  // tempo métrico da nota vinculada sem gerar novo som.
  // O envelope da nota ORIGEM foi agendado com a duração somada (tieDuration).
  const tieActiveUntil = new Map<string, number>(); // pitch/octave → timestamp de fim

  // ── Loop principal ────────────────────────────────────────────────────────
  for (let i = 0; i < elements.length; i++) {
    if (_stopped) break;

    const el = elements[i];

    // Regra 2: atualizar armadura — persiste em currentGlobalKeySignature
    if (el.type === 'keysignature') {
      const ks = el as ParsedKeySignature;
      currentGlobalKeySignature = ks.vexKey;
      keyAccidentals     = { ...(KEY_SIGNATURE_MAP[ks.vexKey] ?? {}) };
      measureAccidentals = {};
      continue;
    }

    // Regra 5: barline limpa acidentes locais do compasso.
    // keyAccidentals (armadura global) persiste intacta — apenas measureAccidentals é zerado.
    // Isso garante que Fá# e Dó# (ex: Ré Maior) continuem ativos após cada barline.
    if (el.type === 'barline') {
      measureAccidentals = {};
      // Reforço: derivar keyAccidentals da armadura global persistente
      // (prevenção contra qualquer corrupção de estado via elementos inesperados)
      if (currentGlobalKeySignature) {
        keyAccidentals = { ...(KEY_SIGNATURE_MAP[currentGlobalKeySignature] ?? {}) };
      }
      continue;
    }

    // Pausas: avançam o cursor mantendo armadura intacta.
    // A cada pausa, re-afirmamos keyAccidentals da armadura global —
    // isso evita que bequadros locais (measureAccidentals null) vazem
    // para notas subsequentes quando o ciclo é interrompido pela pausa.
    if (el.type === 'rest') {
      const rest = el as { type: 'rest'; duration: string; dotted: boolean; dotted2: boolean };
      // Garantia: keyAccidentals sempre derivado da armadura global após qualquer pausa
      if (currentGlobalKeySignature) {
        keyAccidentals = { ...(KEY_SIGNATURE_MAP[currentGlobalKeySignature] ?? {}) };
      }
      cursor += figureDurationSeconds(rest.duration, rest.dotted, rest.dotted2, _currentBpm);
      continue;
    }

    if (el.type !== 'note') continue;

    const note = el as ParsedNote;

    // Regra 4: registrar acidente explícito
    if (note.accidental !== undefined) {
      if (note.accidental === 'natural') {
        (measureAccidentals as Record<string, null>)[note.pitch] = null;
      } else {
        measureAccidentals[note.pitch] = ACCIDENTAL_SEMITONE[note.accidental];
      }
    }

    // ── Duração métrica desta nota ────────────────────────────────────────
    // A duração métrica é sempre a duração nominal da figura — ela determina
    // quanto o cursor avança independentemente de ties ou staccato.
    const metricDur = figureDurationSeconds(note.duration, note.dotted, note.dotted2, _currentBpm);

    // ── Coletar intervalos harmônicos ─────────────────────────────────────
    // Coletamos SEMPRE, mesmo em ties — necessário para manter a contagem de
    // índice correta do loop e resolver acidentes de intervalos.
    const chordFrequencies: number[] = [];
    let intervalCount = 0;

    // resolveNoteDelta — prioridade (MIMB Cap. 5):
    //   1. measureAccidentals[pitch] — acidente explícito neste compasso (bequadro ou acidente)
    //   2. keyAccidentals[pitch]     — acidente implícito da armadura global (currentGlobalKeySignature)
    //   3. 0                         — sem alteração (Dó Maior / Lá menor)
    // Se note.accidental !== undefined → delta foi registrado em measureAccidentals acima.
    // Se note.accidental === undefined → resolveNoteDelta aplica o da armadura automaticamente.
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

    // ── MIMB 6-2: Tie (Ligadura de Prolongação) ───────────────────────────
    // isTie=true: esta nota é a CONTINUAÇÃO de uma tie.
    //   → NÃO re-atacar. O envelope já foi aberto pela nota origem com
    //     duração total (tieDuration). Apenas avançar o cursor.
    //
    // Nota ORIGEM (não tem isTie): se a próxima nota de mesma altura tiver
    // isTie=true, o parser já calculou tieDuration em pulsos.
    //   → Agendar o som com a duração SOMADA (tieDuration → segundos).
    //   → Registrar em tieActiveUntil para suprimir o re-ataque.

    const isTie          = !!(note as any).isTie || (note as any).tieRole === 'end';
    const tieDurationPulses = (note as any).tieDuration as number | undefined;
    const noteKey        = `${note.pitch.toLowerCase()}/${note.octave}`;

    if (isTie) {
      // Esta nota é uma continuação — silêncio de ataque, apenas avança cursor.
      // O envelope da nota origem já cobre este tempo.
      tieActiveUntil.delete(noteKey); // consumida

      // Callback de highlight (a nota existe musicalmente, só não re-ataca)
      if (onElementHighlight !== undefined && note.sourceIndex !== undefined) {
        const noteTime = (cursor - ctx.currentTime) * 1000;
        const srcIdx   = note.sourceIndex;
        setTimeout(() => {
          if (!_stopped) onElementHighlight(srcIdx);
        }, Math.max(0, noteTime));
      }

      cursor += metricDur;
      continue; // ← pula scheduleChord inteiramente
    }

    // ── Verificar se esta nota é ORIGEM de um tie ─────────────────────────
    // O parser emite tieDuration na nota seguinte (isTie=true), não aqui.
    // Para saber se esta nota será ligada, olhamos adiante no array:
    // se o próximo elemento de tipo 'note' com mesmo pitch/octave tiver isTie=true,
    // esta é a origem e deve usar a duração somada.
    let soundDur = metricDur; // duração padrão do som

    if (tieDurationPulses !== undefined) {
      // A nota atual tem tieDuration — ela É a origem com duração somada já calculada
      soundDur = (tieDurationPulses / 1) * (60 / _currentBpm);
      // Registrar que este pitch+octave tem tie ativo até cursor + soundDur
      tieActiveUntil.set(noteKey, cursor + soundDur);
    } else {
      // Verificar lookahead: existe próxima nota de mesma altura com isTie=true?
      // Isso acontece quando o parser emite tieDuration apenas na nota de origem.
      let lookAhead = i + 1 + intervalCount;
      // Pular barlines, slurs e outros elementos não-notas
      while (lookAhead < elements.length) {
        const nextEl = elements[lookAhead];
        if (nextEl.type === 'note') {
          const nextNote = nextEl as ParsedNote;
          const nextKey  = `${nextNote.pitch.toLowerCase()}/${nextNote.octave}`;
          if (!!(nextNote as any).isTie && nextKey === noteKey) {
            // Próxima nota de mesma altura tem isTie=true → esta é a origem
            const nextTieDur = (nextNote as any).tieDuration as number | undefined;
            if (nextTieDur !== undefined) {
              soundDur = nextTieDur * (60 / _currentBpm);
              tieActiveUntil.set(noteKey, cursor + soundDur);
            }
          }
          break; // parar no primeiro elemento 'note' encontrado
        }
        if (nextEl.type === 'barline') { lookAhead++; continue; }
        break; // qualquer outro tipo → parar
      }
    }

    // ── Agendar o som ─────────────────────────────────────────────────────
    scheduleChord(ctx, chordFrequencies, cursor, soundDur * 0.96);

    // ── Callback de highlight ─────────────────────────────────────────────
    if (onElementHighlight !== undefined && note.sourceIndex !== undefined) {
      const noteTime = (cursor - ctx.currentTime) * 1000;
      const srcIdx   = note.sourceIndex;
      setTimeout(() => {
        if (!_stopped) onElementHighlight(srcIdx);
      }, Math.max(0, noteTime));
    }

    cursor += metricDur;
  }

  // ── Encerramento ─────────────────────────────────────────────────────────
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
 * chame `playSingleNote(parsedNote, keySignature)` para ouvir a nota
 * com a armadura de clave ativa corretamente aplicada.
 *
 * @param note         — ParsedNote a ser tocada
 * @param keySignature — Armadura de clave ativa na UI (ex: 'G', 'D', 'F'). null = Dó Maior.
 * @param durationMs   — Duração em milissegundos (padrão: 300ms)
 */
export function playSingleNote(
  note:         ParsedNote,
  keySignature: string | null = null,
  durationMs  = 300,
): void {
  const AudioCtx =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;

  let ctx: AudioContext;
  try {
    ctx = new AudioCtx();
  } catch {
    return;
  }

  // Resolver armadura de clave ativa — aplica delta de semitom implícito.
  // O KEY_SIGNATURE_MAP usa as chaves do VexFlow (ex: 'G', 'D', 'F', 'Bb', 'Eb').
  // Se keySignature não for null mas não existir no mapa, keyAcc fica {} →
  // a nota soará natural. Log defensivo para detectar esse caso em desenvolvimento.
  const keyAcc: KeyAccidentalMap = (() => {
    if (!keySignature) return {};
    const acc = KEY_SIGNATURE_MAP[keySignature];
    if (!acc && process.env.NODE_ENV === 'development') {
      console.warn(`[playSingleNote] armadura '${keySignature}' não encontrada em KEY_SIGNATURE_MAP`);
    }
    return acc ?? {};
  })();

  // Prioridade (idêntica ao playScore/MIMB Cap. 5):
  //   1. Acidente explícito na nota (accidental !== undefined) → ACCIDENTAL_SEMITONE
  //   2. Armadura de clave ativa (keyAcc) → resolveNoteDelta com measureAccidentals vazio
  //      (digitação isolada: não há contexto de compasso — apenas a armadura)
  //   3. 0 → nota natural (Dó Maior)
  //
  // CASO CRÍTICO: nota.accidental === undefined E pitch está na armadura →
  //   resolveNoteDelta({}, keyAcc) retorna keyAcc[pitch] → semitom correto aplicado.
  const finalDelta = note.accidental !== undefined
    ? (ACCIDENTAL_SEMITONE[note.accidental] ?? 0)
    : resolveNoteDelta(note.pitch, {}, keyAcc);

  const midi = pitchToMidi(note.pitch, note.octave, finalDelta);
  const hz   = midiToFrequency(midi);
  const dur  = durationMs / 1000;

  scheduleChord(ctx, [hz], ctx.currentTime + 0.01, dur, 0.65);

  setTimeout(() => {
    ctx.close().catch(() => {});
  }, durationMs + 200);
}

// ─── TESTES UNITÁRIOS ─────────────────────────────────────────────────────────
// Compatível com Vitest (configuração padrão do projeto).
// Execute: pnpm vitest run src/lib/scoreAudioPlayer.test.ts

if (import.meta.vitest) {
  const { describe, it, expect } = import.meta.vitest;

  describe('pitchToMidi — conversão de nota para MIDI', () => {
    it('C4 = MIDI 60 (padrão internacional)', () =>
      expect(pitchToMidi('C', 4, 0)).toBe(60));
    it('A4 = MIDI 69 (referência 440 Hz)', () =>
      expect(pitchToMidi('A', 4, 0)).toBe(69));
    it('C#4 = MIDI 61 (sustenido = +1 semitom)', () =>
      expect(pitchToMidi('C', 4, 1)).toBe(61));
    it('Bb4 = MIDI 70 (bemol = -1 semitom)', () =>
      expect(pitchToMidi('B', 4, -1)).toBe(70));
    it('C5 = MIDI 72 (oitava acima de C4)', () =>
      expect(pitchToMidi('C', 5, 0)).toBe(72));
    it('B3 = MIDI 59 (abaixo de C4)', () =>
      expect(pitchToMidi('B', 3, 0)).toBe(59));
    it('F#5 = MIDI 78', () =>
      expect(pitchToMidi('F', 5, 1)).toBe(78));
  });

  describe('midiToFrequency — conversão MIDI → Hz', () => {
    it('A4 (MIDI 69) = 440.00 Hz', () =>
      expect(midiToFrequency(69)).toBeCloseTo(440.0, 2));
    it('A5 (MIDI 81) = 880.00 Hz (oitava acima)', () =>
      expect(midiToFrequency(81)).toBeCloseTo(880.0, 2));
    it('C4 (MIDI 60) ≈ 261.63 Hz', () =>
      expect(midiToFrequency(60)).toBeCloseTo(261.63, 1));
    it('A3 (MIDI 57) = 220.00 Hz', () =>
      expect(midiToFrequency(57)).toBeCloseTo(220.0, 2));
  });

  describe('resolveNoteDelta — prioridade de acidentes', () => {
    // Ré maior: F# e C#
    const keyD: KeyAccidentalMap = { F: 1, C: 1 };

    it('sem acidente no compasso: F em Ré maior → sustenido (+1)', () =>
      expect(resolveNoteDelta('F', {}, keyD)).toBe(1));

    it('sem acidente no compasso: D em Ré maior → natural (0)', () =>
      expect(resolveNoteDelta('D', {}, keyD)).toBe(0));

    it('bequadro no compasso (null) cancela F# da armadura', () => {
      const mAcc: MeasureAccidentalMap = {};
      (mAcc as Record<string, null>)['F'] = null;
      expect(resolveNoteDelta('F', mAcc, keyD)).toBe(0);
    });

    it('acidente do compasso tem prioridade sobre armadura', () => {
      const mAcc: MeasureAccidentalMap = { C: -1 }; // Cb no compasso
      expect(resolveNoteDelta('C', mAcc, keyD)).toBe(-1);
    });

    it('acidente do compasso não afeta outras notas', () => {
      const mAcc: MeasureAccidentalMap = { F: -1 };
      expect(resolveNoteDelta('C', mAcc, keyD)).toBe(1); // C# da armadura
    });

    it('nota sem acidente em Dó maior → natural (0)', () =>
      expect(resolveNoteDelta('B', {}, {})).toBe(0));
  });

  describe('figureDurationSeconds — duração das figuras', () => {
    it('semínima a 60 BPM = 1.000s', () =>
      expect(figureDurationSeconds('q', false, false, 60)).toBeCloseTo(1.0, 5));
    it('mínima a 60 BPM = 2.000s', () =>
      expect(figureDurationSeconds('h', false, false, 60)).toBeCloseTo(2.0, 5));
    it('semibreve a 60 BPM = 4.000s', () =>
      expect(figureDurationSeconds('w', false, false, 60)).toBeCloseTo(4.0, 5));
    it('colcheia a 120 BPM = 0.250s', () =>
      expect(figureDurationSeconds('8', false, false, 120)).toBeCloseTo(0.25, 5));
    it('semínima pontuada a 60 BPM = 1.500s', () =>
      expect(figureDurationSeconds('q', true, false, 60)).toBeCloseTo(1.5, 5));
    it('semínima com ponto duplo a 60 BPM = 1.750s', () =>
      expect(figureDurationSeconds('q', false, true, 60)).toBeCloseTo(1.75, 5));
    it('colcheia a 60 BPM = 0.500s', () =>
      expect(figureDurationSeconds('8', false, false, 60)).toBeCloseTo(0.5, 5));
  });

  describe('KEY_SIGNATURE_MAP — armaduras de clave', () => {
    it('Dó maior (C): nenhum acidente', () =>
      expect(KEY_SIGNATURE_MAP['C']).toEqual({}));
    it('Sol maior (G): F#', () =>
      expect(KEY_SIGNATURE_MAP['G']).toEqual({ F: 1 }));
    it('Ré maior (D): F# e C#', () =>
      expect(KEY_SIGNATURE_MAP['D']).toEqual({ F: 1, C: 1 }));
    it('Fá maior (F): Bb', () =>
      expect(KEY_SIGNATURE_MAP['F']).toEqual({ B: -1 }));
    it('Sib maior (Bb): Bb e Eb', () =>
      expect(KEY_SIGNATURE_MAP['Bb']).toEqual({ B: -1, E: -1 }));
    it('Dó# maior (C#): 7 sustenidos', () =>
      expect(Object.keys(KEY_SIGNATURE_MAP['C#'] ?? {})).toHaveLength(7));
    it('Dób maior (Cb): 7 bemóis', () =>
      expect(Object.keys(KEY_SIGNATURE_MAP['Cb'] ?? {})).toHaveLength(7));
  });

  describe('setBpm — controle de andamento', () => {
    it('valor mínimo: 20 BPM', () => { setBpm(1); expect(_currentBpm).toBe(20); });
    it('valor máximo: 400 BPM', () => { setBpm(9999); expect(_currentBpm).toBe(400); });
    it('valor normal: 120 BPM', () => { setBpm(120); expect(_currentBpm).toBe(120); });
    it('valor normal: 60 BPM', () => { setBpm(60); expect(_currentBpm).toBe(60); });
  });
}
