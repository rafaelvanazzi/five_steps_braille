/**
 * scoreAudioPlayer.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Motor de áudio para o Editor de Partituras em Braille — Five Steps Braille
 *
 * Suporte a SoundFont2 (.sf2) com fallback em síntese FM nativa.
 *
 * Hierarquia de síntese:
 *   1. SF2 carregado via loadSoundFont() → AudioBufferSourceNode + playbackRate
 *   2. Fallback FM (zero dependências externas) — automático se SF2 não foi
 *      carregado ou falhou durante o parsing.
 *
 * API pública:
 *   loadSoundFont(url)                                    → Promise<void>
 *   playScore(elements, initialBpm, onElementHighlight?)  → void
 *   stopScore()                                           → void
 *   setBpm(newBpm)                                        → void
 *   playSingleNote(note, keySignature?, durationMs?)      → void
 *
 * Regras de negócio (MIMB + Dissertação Vanazzi 2014):
 *   1. Apenas 'note' e 'rest' emitem som; outros tipos são ignorados.
 *   2. 'keysignature' atualiza a armadura de clave ativa.
 *   3. Prioridade de acidente: compasso > armadura de clave > natural.
 *   4. Acidente explícito na nota é salvo em measureAccidentals.
 *   5. 'barline' e 'rest' limpam measureAccidentals (armadura global persiste).
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

/** Mapa de nota → delta de semitom para uma armadura de clave. */
type KeyAccidentalMap = Partial<Record<string, number>>;

/**
 * Acidentais acumulados dentro do compasso atual.
 * null = sentinela de bequadro (cancela a armadura de clave).
 */
type MeasureAccidentalMap = Partial<Record<string, number | null>>;

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

// ─── FUNÇÕES PURAS DE CONVERSÃO ───────────────────────────────────────────────

/**
 * Converte pitch + oitava braille + delta de acidente → número MIDI.
 *
 * Mapeamento de oitava braille → MIDI (convenção MIDI científica):
 *   Oitava 0 braille → MIDI 12  (C0)
 *   Oitava 1 braille → MIDI 24  (C1)
 *   Oitava 2 braille → MIDI 36  (C2)
 *   Oitava 3 braille → MIDI 48  (C3)
 *   Oitava 4 braille → MIDI 60  (C4 = Dó central)  ← oitava central do piano
 *   Oitava 5 braille → MIDI 72  (C5)
 *   Oitava 6 braille → MIDI 84  (C6)
 *   Oitava 7 braille → MIDI 96  (C7)
 *
 * Fórmula: midi = 12 * (octaveBraille + 1) + pitchClass + delta
 * onde pitchClass: C=0, D=2, E=4, F=5, G=7, A=9, B=11
 *
 * Verificação: C4 → 12*(4+1) + 0 + 0 = 60 ✓
 *              A4 → 12*(4+1) + 9 + 0 = 69 ✓ (440 Hz)
 *              F#5 → 12*(5+1) + 5 + 1 = 78 ✓
 */
function pitchToMidi(pitch: string, octave: number, delta: number): number {
  const pitchClass = PITCH_CLASS[pitch];
  if (pitchClass === undefined) {
    throw new Error(`[scoreAudioPlayer] Nota desconhecida: "${pitch}"`);
  }
  // Fórmula correta para oitava braille 4 = Dó central (MIDI 60):
  return 12 * (octave + 1) + pitchClass + delta;
}

function midiToFrequency(midi: number): number {
  return A4_FREQ * Math.pow(2, (midi - A4_MIDI) / 12);
}

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

// ─── MOTOR DE SOUNDFONT2 ──────────────────────────────────────────────────────
//
// Parser estrutural de sub-chunks RIFF do formato SF2:
//
//  RIFF layout:
//    RIFF ─┬─ sfbk ─┬─ LIST INFO  (metadados textuais — ignorado)
//           │         ├─ LIST sdta ─┬─ smpl  (PCM 16-bit signed, 22050/44100 Hz)
//           │         │             └─ sm24   (byte extra de 24-bit — opcional)
//           │         └─ LIST pdta ─┬─ phdr  (preset headers)
//           │                       ├─ pbag  (preset bags)
//           │                       ├─ pmod  (modulators)
//           │                       ├─ pgen  (preset generators)
//           │                       ├─ inst  (instrument headers)
//           │                       ├─ ibag  (instrument bags)
//           │                       ├─ imod  (instrument modulators)
//           │                       ├─ igen  (instrument generators — keyRange, sampleID, etc.)
//           │                       └─ shdr  (sample headers: início/fim/loop, taxa, pitch)
//           └─ [sub-chunks extras ignorados]

/** Metadados de uma amostra extraída do SF2. */
interface SF2Sample {
  name:       string;  // SHdr.achSampleName
  start:      number;  // SHdr.dwStart (frames no smpl chunk)
  end:        number;  // SHdr.dwEnd
  loopStart:  number;  // SHdr.dwStartLoop
  loopEnd:    number;  // SHdr.dwEndLoop
  sampleRate: number;  // SHdr.dwSampleRate
  pitch:      number;  // SHdr.byOriginalKey (MIDI 0–127)
  pitchCorr:  number;  // SHdr.chPitchCorrection (cents, -99..+99)
  type:       number;  // SHdr.sfSampleType (1=mono, 2=right, 4=left, 0x8000=ROM)
}

/** Associação instrumento-zona: quais amostras cobrem quais notas MIDI. */
interface SF2Zone {
  keyLo:    number; // keyRange.lo
  keyHi:    number; // keyRange.hi
  velLo:    number; // velRange.lo
  velHi:    number; // velRange.hi
  sampleId: number; // ID do SHdr
  tune:     number; // scaleTuning (cents/semitom, normalmente 100)
  fine:     number; // fineTune (cents)
  coarse:   number; // coarseTune (semitoms)
}

// ─── ESTADO DO SOUNDFONT ───────────────────────────────────────────────────────

/** AudioBuffer decodificado por número MIDI de pitch-base. */
const _sfBuffers = new Map<number, AudioBuffer>();

/** Metadados das amostras (antes de decodificar). */
let _sfSamples:   SF2Sample[] = [];

/** Zonas do instrumento 0 (piano — preset 0, bank 0). */
let _sfZones:     SF2Zone[]   = [];

/** PCM 16-bit signed big-array — compartilhado; fatias por amostra. */
let _sfPcm:       Int16Array | null = null;

/** Taxa de amostragem do smpl chunk (assumida uniforme). */
let _sfSampleRate = 44100;

/** Indica se o SF2 foi carregado e está pronto para uso. */
let _sfReady = false;

/**
 * AudioContext compartilhado e persistente para SF2.
 *
 * Bug crítico (corrigido): AudioBuffers são ligados ao AudioContext em que foram
 * decodificados via decodeAudioData(). Se loadSoundFont() usa um ctx temporário
 * e playSingleNote() cria um ctx diferente, os buffers não podem ser reproduzidos.
 *
 * Fix: _sharedCtx é criado uma única vez em loadSoundFont() e reutilizado em
 * TODAS as chamadas de scheduleChord (playScore e playSingleNote).
 */
let _sharedCtx: AudioContext | null = null;

/** AudioContext temporário para pré-decodificação (alias interno). */
let _sfCtx: AudioContext | null = null;

// ─── HELPERS DE LEITURA BINÁRIA ───────────────────────────────────────────────

function readUint32LE(view: DataView, offset: number): number {
  return view.getUint32(offset, true);
}
function readUint16LE(view: DataView, offset: number): number {
  return view.getUint16(offset, true);
}
function readInt16LE(view: DataView, offset: number): number {
  return view.getInt16(offset, true);
}
function readInt8(view: DataView, offset: number): number {
  return view.getInt8(offset);
}
function readUint8(view: DataView, offset: number): number {
  return view.getUint8(offset);
}
function readFourCC(view: DataView, offset: number): string {
  return String.fromCharCode(
    view.getUint8(offset),
    view.getUint8(offset + 1),
    view.getUint8(offset + 2),
    view.getUint8(offset + 3),
  );
}
function readString(buf: ArrayBuffer, offset: number, length: number): string {
  const bytes = new Uint8Array(buf, offset, length);
  let s = '';
  for (let i = 0; i < bytes.length; i++) {
    if (bytes[i] === 0) break;
    s += String.fromCharCode(bytes[i]);
  }
  return s;
}

// ─── PARSER SF2 ──────────────────────────────────────────────────────────────

/** Parsear o chunk smpl → Int16Array de PCM 16-bit. */
function parseSdtaChunk(
  view: DataView,
  buf:  ArrayBuffer,
  offset: number,
  size: number,
): void {
  const end = offset + size;
  let pos   = offset;

  while (pos < end - 8) {
    const id   = readFourCC(view, pos);
    const len  = readUint32LE(view, pos + 4);
    pos += 8;
    if (id === 'smpl') {
      // PCM 16-bit little-endian
      _sfPcm = new Int16Array(buf, pos, len >> 1);
      _sfSampleRate = 44100; // será sobrescrito pelos shdr
    }
    pos += len + (len & 1); // word-align
  }
}

/** Parsear shdr → array de SF2Sample. */
function parseShdr(view: DataView, offset: number, size: number): SF2Sample[] {
  const count   = (size / 46) | 0;
  const samples: SF2Sample[] = [];
  for (let i = 0; i < count - 1; i++) { // último é EOS sentinel
    const base = offset + i * 46;
    samples.push({
      name:       readString(view.buffer as ArrayBuffer, base, 20),
      start:      readUint32LE(view, base + 20),
      end:        readUint32LE(view, base + 24),
      loopStart:  readUint32LE(view, base + 28),
      loopEnd:    readUint32LE(view, base + 32),
      sampleRate: readUint32LE(view, base + 36),
      pitch:      readUint8(view, base + 40),
      pitchCorr:  readInt8(view, base + 41),
      type:       readUint16LE(view, base + 42),
    });
  }
  return samples;
}

/**
 * Parsear igen para o instrumento 0 (preset 0 / bank 0 = piano acústico).
 * Generators relevantes: keyRange (43), velRange (44), sampleID (53),
 * scaleTuning (56), fineTune (52), coarseTune (51).
 */
function parseIgen(view: DataView, offset: number, size: number): SF2Zone[] {
  const count = (size / 4) | 0;
  const zones: SF2Zone[] = [];

  let keyLo   = 0, keyHi = 127;
  let velLo   = 0, velHi = 127;
  let fine    = 0, coarse = 0, tune = 100;

  for (let i = 0; i < count; i++) {
    const base    = offset + i * 4;
    const genId   = readUint16LE(view, base);
    const amtLo   = readUint8(view, base + 2);
    const amtHi   = readUint8(view, base + 3);
    const amtS    = readInt16LE(view, base + 2);

    if      (genId === 43) { keyLo = amtLo; keyHi = amtHi; }     // keyRange
    else if (genId === 44) { velLo = amtLo; velHi = amtHi; }     // velRange
    else if (genId === 52) { fine   = amtS;                }      // fineTune
    else if (genId === 51) { coarse = amtS;                }      // coarseTune
    else if (genId === 56) { tune   = amtS;                }      // scaleTuning
    else if (genId === 53) {                                       // sampleID
      const sampleId = readUint16LE(view, base + 2);
      zones.push({ keyLo, keyHi, velLo, velHi, sampleId, tune, fine, coarse });
      // reset para próxima zona
      keyLo = 0; keyHi = 127; velLo = 0; velHi = 127;
      fine  = 0; coarse = 0;  tune  = 100;
    }
  }
  return zones;
}

/** Parsear o chunk pdta → popula _sfZones e _sfSamples. */
function parsePdtaChunk(
  view:   DataView,
  offset: number,
  size:   number,
): void {
  const end = offset + size;
  let pos   = offset;
  let igenOffset = -1, igenSize = 0;
  let shdrOffset = -1, shdrSize = 0;

  while (pos < end - 8) {
    const id  = readFourCC(view, pos);
    const len = readUint32LE(view, pos + 4);
    pos += 8;
    if      (id === 'igen') { igenOffset = pos; igenSize = len; }
    else if (id === 'shdr') { shdrOffset = pos; shdrSize = len; }
    pos += len + (len & 1);
  }

  if (shdrOffset >= 0) _sfSamples = parseShdr(view, shdrOffset, shdrSize);
  if (igenOffset >= 0) _sfZones   = parseIgen(view, igenOffset, igenSize);
}

/** Parser RIFF principal do SF2. */
function parseSF2(buf: ArrayBuffer): void {
  const view = new DataView(buf);
  if (readFourCC(view, 0) !== 'RIFF') throw new Error('[SF2] Não é RIFF');
  // offset 4 = tamanho total (ignorado)
  if (readFourCC(view, 8) !== 'sfbk') throw new Error('[SF2] Não é sfbk');

  let pos = 12;
  const total = buf.byteLength;

  while (pos < total - 8) {
    const id  = readFourCC(view, pos);
    const len = readUint32LE(view, pos + 4);
    pos += 8;

    if (id === 'LIST') {
      const listType = readFourCC(view, pos);
      if      (listType === 'sdta') parseSdtaChunk(view, buf, pos + 4, len - 4);
      else if (listType === 'pdta') parsePdtaChunk(view, pos + 4, len - 4);
    }

    pos += len + (len & 1);
  }
}

/**
 * Encontrar a zona de instrumento que melhor cobre um MIDI específico (vel=64).
 * Retorna a zona com menor distância de pitch ao MIDI solicitado.
 */
function findZoneForMidi(midi: number): SF2Zone | null {
  // Primeiro tentar zona exata (keyLo <= midi <= keyHi)
  const exact = _sfZones.find(z => midi >= z.keyLo && midi <= z.keyHi);
  if (exact) return exact;

  // Vizinho mais próximo
  let best: SF2Zone | null = null;
  let bestDist = Infinity;
  for (const z of _sfZones) {
    const dist = Math.min(Math.abs(midi - z.keyLo), Math.abs(midi - z.keyHi));
    if (dist < bestDist) { bestDist = dist; best = z; }
  }
  return best;
}

/**
 * Decodificar a amostra de uma zona em AudioBuffer.
 * Usa o PCM 16-bit do smpl chunk e a sampleRate do shdr.
 */
async function decodeZone(
  ctx: AudioContext,
  zone: SF2Zone,
): Promise<AudioBuffer | null> {
  if (!_sfPcm) return null;
  const sample = _sfSamples[zone.sampleId];
  if (!sample) return null;
  if (sample.type & 0x8000) return null; // ROM sample — ignorar

  const sr       = sample.sampleRate || 44100;
  const startFr  = sample.start;
  const endFr    = Math.min(sample.end, _sfPcm.length);
  const frameLen = endFr - startFr;
  if (frameLen <= 0) return null;

  const audioBuf = ctx.createBuffer(1, frameLen, sr);
  const channel  = audioBuf.getChannelData(0);

  // Converter Int16 PCM → Float32 normalizado [-1, +1]
  for (let i = 0; i < frameLen; i++) {
    channel[i] = (_sfPcm[startFr + i] ?? 0) / 32768.0;
  }

  // Registrar no mapa por pitch MIDI de base
  _sfBuffers.set(sample.pitch, audioBuf);
  return audioBuf;
}

/**
 * Pré-decodifica todas as amostras do SF2 em AudioBuffers.
 * Chamado internamente após parseSF2() terminar.
 */
async function preDecodeAllZones(ctx: AudioContext): Promise<void> {
  const seen = new Set<number>();
  const tasks: Promise<void>[] = [];

  for (const zone of _sfZones) {
    if (seen.has(zone.sampleId)) continue;
    seen.add(zone.sampleId);

    tasks.push(
      decodeZone(ctx, zone).then(buf => {
        if (buf) {
          const sample = _sfSamples[zone.sampleId];
          if (sample) _sfBuffers.set(sample.pitch, buf);
        }
      }).catch(() => { /* ignora amostras corrompidas individualmente */ })
    );
  }

  await Promise.all(tasks);
}

// ─── API PÚBLICA DO SOUNDFONT ─────────────────────────────────────────────────

/**
 * Carrega e parseia um arquivo SoundFont2 (.sf2) a partir de uma URL.
 *
 * Após carregar com sucesso, `playScore` e `playSingleNote` usarão
 * automaticamente os buffers do SF2. Se falhar, o fallback FM permanece ativo.
 *
 * Suporte a Range Requests: o fetch enviará headers `Accept-Ranges` corretos
 * se o servidor suportar (necessário para arquivos SF2 grandes).
 *
 * @param url — URL do arquivo .sf2 (ex: '/assets/piano.sf2')
 */
export async function loadSoundFont(url: string): Promise<void> {
  _sfReady = false;
  _sfBuffers.clear();
  _sfSamples = [];
  _sfZones   = [];
  _sfPcm     = null;

  try {
    const response = await fetch(url, {
      headers: { Accept: 'application/octet-stream' },
    });

    if (!response.ok) {
      throw new Error(`[SF2] HTTP ${response.status} ao carregar ${url}`);
    }

    const buf = await response.arrayBuffer();
    parseSF2(buf);

    if (_sfZones.length === 0 || _sfSamples.length === 0) {
      throw new Error('[SF2] Nenhuma zona/amostra válida encontrada');
    }

    // Criar AudioContext temporário para decodificação
    const AudioCtx =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    _sfCtx = new AudioCtx();

    await preDecodeAllZones(_sfCtx);

    // IMPORTANTE: NÃO fechar o AudioContext aqui.
    // Os AudioBuffers estão ligados a este contexto — fechá-lo
    // invalidaria todos os buffers já decodificados.
    // _sharedCtx é mantido ativo e reutilizado por playScore e playSingleNote.
    _sharedCtx = _sfCtx; // promover para contexto compartilhado persistente
    _sfCtx     = null;   // limpar referência temporária

    _sfReady = _sfBuffers.size > 0;

    if (!_sfReady) {
      throw new Error('[SF2] Nenhum AudioBuffer decodificado com sucesso');
    }

    if (process.env.NODE_ENV === 'development') {
      console.info(`[SF2] Carregado: ${_sfBuffers.size} amostras, ${_sfZones.length} zonas`);
    }
  } catch (err) {
    _sfReady = false;
    if (process.env.NODE_ENV === 'development') {
      console.warn('[SF2] Falha no carregamento — fallback FM ativo:', err);
    }
    // Não relança — o fallback FM é ativado automaticamente
  }
}

// ─── SÍNTESE FM DE PIANO (FALLBACK) ──────────────────────────────────────────

const HARMONIC_GAINS = [1.0, 0.50, 0.25, 0.12] as const;
const FM_PARAMS = {
  ratioFM:  2.756,
  depthFM:  14,
  decayFM:  0.04,
} as const;

/**
 * Síntese FM + aditiva (fallback quando SF2 não está carregado).
 * Mantida intacta: envelope setValueAtTime → exponentialRampToValueAtTime.
 */
function scheduleChordFM(
  ctx: AudioContext,
  frequencies: number[],
  startTime: number,
  durationSeconds: number,
  velocity = 0.72,
): void {
  const safeDuration = Math.max(durationSeconds, 0.08);
  const noteOff      = startTime + safeDuration;

  frequencies.forEach(freq => {
    if (!Number.isFinite(freq) || freq <= 0) return;

    const oscFM  = ctx.createOscillator();
    const gainFM = ctx.createGain();
    oscFM.type = 'sine';
    oscFM.frequency.value = freq * FM_PARAMS.ratioFM;
    gainFM.gain.setValueAtTime(FM_PARAMS.depthFM * velocity, startTime);
    gainFM.gain.exponentialRampToValueAtTime(0.001, startTime + FM_PARAMS.decayFM);
    oscFM.connect(gainFM);
    oscFM.start(startTime);
    oscFM.stop(startTime + FM_PARAMS.decayFM + 0.01);

    const gainMaster = ctx.createGain();
    const peakGain   = 0.30 * velocity;
    gainMaster.gain.setValueAtTime(peakGain, startTime);
    gainMaster.gain.exponentialRampToValueAtTime(0.001, noteOff);
    gainMaster.connect(ctx.destination);

    HARMONIC_GAINS.forEach((relGain, harmonicIdx) => {
      const harmFreq = freq * (harmonicIdx + 1);
      if (!Number.isFinite(harmFreq) || harmFreq > 20000) return;

      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = harmFreq;
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

// ─── SÍNTESE SF2 ──────────────────────────────────────────────────────────────

/**
 * Agenda reprodução de um acorde via AudioBufferSourceNode (SF2).
 * Para cada frequência, encontra o buffer cujo pitch-base é mais próximo
 * e ajusta `.playbackRate` para transpor até a frequência alvo.
 *
 * Envelope: setValueAtTime(peak) → exponentialRampToValueAtTime(0.001)
 */
function scheduleChordSF2(
  _ctxIgnored: AudioContext,
  frequencies: number[],
  startTime: number,
  durationSeconds: number,
  velocity = 0.72,
): void {
  // Bug fix crítico: AudioBuffers são ligados ao AudioContext em que foram
  // decodificados (decodeAudioData). Usar _sharedCtx — o mesmo ctx de loadSoundFont
  // — garante que os buffers sejam reproduzíveis. O parâmetro _ctxIgnored (ctx do
  // caller) não pode ser usado para SF2 pois é um contexto diferente.
  const ctx = _sharedCtx;
  if (!ctx || _sfBuffers.size === 0) {
    scheduleChordFM(_ctxIgnored, frequencies, startTime, durationSeconds, velocity);
    return;
  }

  // Retomar o contexto se estiver suspenso (política de autoplay do browser)
  if (ctx.state === 'suspended') {
    ctx.resume().catch(() => {});
  }

  // Recalcular startTime relativo ao _sharedCtx
  const ctxNow      = ctx.currentTime;
  const safeStart   = ctxNow + 0.01;
  const safeDuration = Math.max(durationSeconds, 0.08);
  const noteOff      = safeStart + safeDuration;

  frequencies.forEach(freq => {
    if (!Number.isFinite(freq) || freq <= 0) return;

    // MIDI alvo a partir da frequência
    const targetMidi = Math.round(A4_MIDI + 12 * Math.log2(freq / A4_FREQ));

    // Encontrar o buffer com pitch-base mais próximo no mapa SF2
    let bestPitch  = -1;
    let bestDist   = Infinity;
    _sfBuffers.forEach((_, pitch) => {
      const dist = Math.abs(pitch - targetMidi);
      if (dist < bestDist) { bestDist = dist; bestPitch = pitch; }
    });

    const buffer = bestPitch >= 0 ? _sfBuffers.get(bestPitch) : undefined;
    if (!buffer) {
      scheduleChordFM(_ctxIgnored, [freq], startTime, durationSeconds, velocity);
      return;
    }

    // playbackRate: transpor do pitch-base (sample) ao pitch-alvo (nota solicitada)
    // Fórmula: ratio = 2^((targetMidi - baseMidi) / 12)
    // Equivalente a freq/baseFreq mas mais preciso em semitom inteiro.
    const semitoneDiff = targetMidi - bestPitch;
    const playRate     = Math.pow(2, semitoneDiff / 12);

    const src  = ctx.createBufferSource();
    const gain = ctx.createGain();

    src.buffer             = buffer;
    src.playbackRate.value = playRate;

    // Envelope: ataque imediato → decaimento exponencial
    const peakGain = 0.80 * velocity;
    gain.gain.setValueAtTime(peakGain, safeStart);
    gain.gain.exponentialRampToValueAtTime(0.001, noteOff);

    src.connect(gain);
    gain.connect(ctx.destination);

    src.start(safeStart);
    src.stop(noteOff + 0.1);
  });
}

/**
 * Rota de síntese unificada: usa SF2 se disponível, FM como fallback.
 */
function scheduleChord(
  ctx: AudioContext,
  frequencies: number[],
  startTime: number,
  durationSeconds: number,
  velocity = 0.72,
): void {
  if (_sfReady && _sfBuffers.size > 0) {
    scheduleChordSF2(ctx, frequencies, startTime, durationSeconds, velocity);
  } else {
    scheduleChordFM(ctx, frequencies, startTime, durationSeconds, velocity);
  }
}

// ─── ESTADO GLOBAL DO PLAYER ──────────────────────────────────────────────────

let _ctx:         AudioContext | null = null;
let _stopped:     boolean             = true;
let _currentBpm:  number              = 120;
let _finishTimer: ReturnType<typeof setTimeout> | null = null;

// ─── API PÚBLICA ──────────────────────────────────────────────────────────────

/**
 * Altera o andamento (BPM) em tempo real.
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
  // Fechar apenas o ctx de playback (_ctx), nunca o _sharedCtx do SF2.
  // _sharedCtx deve persistir para que playSingleNote possa usar os AudioBuffers.
  if (_ctx !== null && _ctx !== _sharedCtx) {
    _ctx.close().catch(() => {});
    _ctx = null;
  } else {
    _ctx = null; // apenas limpar referência se for o _sharedCtx
  }
}

/**
 * Percorre o array de elementos e reproduz a partitura completa.
 *
 * Usa SF2 se loadSoundFont() foi chamado com sucesso; FM como fallback.
 *
 * @param elements           — Array de ParsedElement do brailleMusic.ts
 * @param initialBpm         — BPM inicial (padrão: 120)
 * @param onElementHighlight — Callback opcional: sourceIndex da nota atual
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

  // Bug fix: se SF2 está disponível, usar _sharedCtx para playScore também.
  // Isso garante que os AudioBuffers (decodificados em _sharedCtx) sejam
  // reproduzíveis sem necessidade de transferência entre contextos.
  if (_sfReady && _sharedCtx) {
    if (_sharedCtx.state === 'suspended') _sharedCtx.resume().catch(() => {});
    _ctx = _sharedCtx;
  } else {
    _ctx = new AudioCtx();
  }
  _stopped = false;
  setBpm(initialBpm);

  // ── Estado de armadura ────────────────────────────────────────────────────
  let currentGlobalKeySignature: string | null = null;
  let keyAccidentals:            KeyAccidentalMap     = {};
  let measureAccidentals:        MeasureAccidentalMap = {};

  const firstKS = elements.find(el => el.type === 'keysignature') as ParsedKeySignature | undefined;
  if (firstKS) {
    currentGlobalKeySignature = firstKS.vexKey;
    keyAccidentals = { ...(KEY_SIGNATURE_MAP[firstKS.vexKey] ?? {}) };
  }

  let cursor = _ctx.currentTime + 0.05;
  const ctx  = _ctx;

  // Tie tracking (MIMB 6-2)
  const tieActiveUntil = new Map<string, number>();

  // ── Loop principal ────────────────────────────────────────────────────────
  for (let i = 0; i < elements.length; i++) {
    if (_stopped) break;

    const el = elements[i];

    // keysignature → atualiza armadura global
    if (el.type === 'keysignature') {
      const ks = el as ParsedKeySignature;
      currentGlobalKeySignature = ks.vexKey;
      keyAccidentals     = { ...(KEY_SIGNATURE_MAP[ks.vexKey] ?? {}) };
      measureAccidentals = {};
      continue;
    }

    // barline → limpa acidentes locais, reafirma keyAccidentals da armadura global
    if (el.type === 'barline') {
      measureAccidentals = {};
      if (currentGlobalKeySignature) {
        keyAccidentals = { ...(KEY_SIGNATURE_MAP[currentGlobalKeySignature] ?? {}) };
      }
      continue;
    }

    // rest → avança cursor + reset para garantir que nota pós-pausa
    // não herde bequadros locais do compasso anterior
    if (el.type === 'rest') {
      const rest = el as { type: 'rest'; duration: string; dotted: boolean; dotted2: boolean };
      // Bug fix: pausa não propaga bequadros locais para nota seguinte
      measureAccidentals = {};
      if (currentGlobalKeySignature) {
        keyAccidentals = { ...(KEY_SIGNATURE_MAP[currentGlobalKeySignature] ?? {}) };
      }
      cursor += figureDurationSeconds(rest.duration, rest.dotted, rest.dotted2, _currentBpm);
      continue;
    }

    if (el.type !== 'note') continue;

    const note = el as ParsedNote;

    // Registrar acidente explícito no compasso
    if (note.accidental !== undefined) {
      if (note.accidental === 'natural') {
        (measureAccidentals as Record<string, null>)[note.pitch] = null;
      } else {
        measureAccidentals[note.pitch] = ACCIDENTAL_SEMITONE[note.accidental];
      }
    }

    const metricDur = figureDurationSeconds(note.duration, note.dotted, note.dotted2, _currentBpm);

    // Coletar frequências do acorde (nota base + intervalos)
    const chordFrequencies: number[] = [];
    let intervalCount = 0;

    // resolveNoteDelta: medida > armadura > natural
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

    // ── Tie MIMB 6-2 ─────────────────────────────────────────────────────
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

    // Agendar som (SF2 ou FM dependendo de _sfReady)
    scheduleChord(ctx, chordFrequencies, cursor, soundDur * 0.96);

    if (onElementHighlight !== undefined && note.sourceIndex !== undefined) {
      const noteTime = (cursor - ctx.currentTime) * 1000;
      const srcIdx   = note.sourceIndex;
      setTimeout(() => { if (!_stopped) onElementHighlight(srcIdx); }, Math.max(0, noteTime));
    }

    cursor += metricDur;
  }

  if (!_stopped) {
    const remainingMs = Math.max(0, (cursor - ctx.currentTime) * 1000) + 300;
    _finishTimer = setTimeout(() => {
      if (!_stopped) { _stopped = true; ctx.close().catch(() => {}); }
    }, remainingMs);
  }
}

/**
 * Feedback imediato ao digitar — toca uma nota única.
 * Usa SF2 se disponível, FM como fallback.
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

  if (_sfReady && _sharedCtx) {
    // SF2 disponível: usar _sharedCtx diretamente (buffers já decodificados nele).
    // NÃO criar novo AudioContext — os AudioBuffers não são transferíveis.
    if (_sharedCtx.state === 'suspended') {
      _sharedCtx.resume().catch(() => {});
    }
    // scheduleChordSF2 será chamado internamente via scheduleChord, usando _sharedCtx
    scheduleChord(_sharedCtx, [hz], _sharedCtx.currentTime + 0.01, dur, 0.65);
    return;
  }

  // Fallback FM: criar AudioContext efêmero (SF2 ainda carregando ou indisponível)
  const AudioCtx =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;

  let ctx: AudioContext;
  try { ctx = new AudioCtx(); } catch { return; }

  scheduleChordFM(ctx, [hz], ctx.currentTime + 0.01, dur, 0.65);

  setTimeout(() => { ctx.close().catch(() => {}); }, durationMs + 200);
}

// ─── TESTES UNITÁRIOS (Vitest) ───────────────────────────────────────────────

if (import.meta.vitest) {
  const { describe, it, expect } = import.meta.vitest;

  describe('pitchToMidi — conversão de nota para MIDI', () => {
    it('C4 = MIDI 60', ()  => expect(pitchToMidi('C', 4, 0)).toBe(60));
    it('A4 = MIDI 69', ()  => expect(pitchToMidi('A', 4, 0)).toBe(69));
    it('C#4 = MIDI 61', () => expect(pitchToMidi('C', 4, 1)).toBe(61));
    it('Bb4 = MIDI 70', () => expect(pitchToMidi('B', 4, -1)).toBe(70));
    it('C5 = MIDI 72', ()  => expect(pitchToMidi('C', 5, 0)).toBe(72));
    it('B3 = MIDI 59', ()  => expect(pitchToMidi('B', 3, 0)).toBe(59));
    it('F#5 = MIDI 78', () => expect(pitchToMidi('F', 5, 1)).toBe(78));
  });

  describe('midiToFrequency', () => {
    it('A4 = 440 Hz',  () => expect(midiToFrequency(69)).toBeCloseTo(440.0, 2));
    it('A5 = 880 Hz',  () => expect(midiToFrequency(81)).toBeCloseTo(880.0, 2));
    it('C4 ≈ 261.63', () => expect(midiToFrequency(60)).toBeCloseTo(261.63, 1));
    it('A3 = 220 Hz',  () => expect(midiToFrequency(57)).toBeCloseTo(220.0, 2));
  });

  describe('resolveNoteDelta — prioridade de acidentes', () => {
    const keyD: KeyAccidentalMap = { F: 1, C: 1 };
    it('F em Ré maior → +1', ()  => expect(resolveNoteDelta('F', {}, keyD)).toBe(1));
    it('D em Ré maior → 0', ()   => expect(resolveNoteDelta('D', {}, keyD)).toBe(0));
    it('bequadro cancela F#', () => {
      const m: MeasureAccidentalMap = {};
      (m as Record<string, null>)['F'] = null;
      expect(resolveNoteDelta('F', m, keyD)).toBe(0);
    });
    it('Cb no compasso > C# da armadura', () => {
      expect(resolveNoteDelta('C', { C: -1 }, keyD)).toBe(-1);
    });
    it('Ré maior não afeta nota não listada', () => {
      expect(resolveNoteDelta('B', {}, keyD)).toBe(0);
    });
  });

  describe('figureDurationSeconds', () => {
    it('q a 60 BPM = 1.0s',  () => expect(figureDurationSeconds('q', false, false, 60)).toBeCloseTo(1.0, 5));
    it('h a 60 BPM = 2.0s',  () => expect(figureDurationSeconds('h', false, false, 60)).toBeCloseTo(2.0, 5));
    it('w a 60 BPM = 4.0s',  () => expect(figureDurationSeconds('w', false, false, 60)).toBeCloseTo(4.0, 5));
    it('8 a 120 BPM = 0.25s',() => expect(figureDurationSeconds('8', false, false, 120)).toBeCloseTo(0.25, 5));
    it('q. a 60 BPM = 1.5s', () => expect(figureDurationSeconds('q', true, false, 60)).toBeCloseTo(1.5, 5));
    it('q.. a 60 BPM = 1.75s',()=> expect(figureDurationSeconds('q', false, true, 60)).toBeCloseTo(1.75, 5));
  });

  describe('KEY_SIGNATURE_MAP', () => {
    it('C: sem acidentes',    () => expect(KEY_SIGNATURE_MAP['C']).toEqual({}));
    it('G: F#',               () => expect(KEY_SIGNATURE_MAP['G']).toEqual({ F: 1 }));
    it('D: F# e C#',          () => expect(KEY_SIGNATURE_MAP['D']).toEqual({ F: 1, C: 1 }));
    it('F: Bb',               () => expect(KEY_SIGNATURE_MAP['F']).toEqual({ B: -1 }));
    it('Bb: Bb e Eb',         () => expect(KEY_SIGNATURE_MAP['Bb']).toEqual({ B: -1, E: -1 }));
    it('C#: 7 sustenidos',    () => expect(Object.keys(KEY_SIGNATURE_MAP['C#'] ?? {})).toHaveLength(7));
    it('Cb: 7 bemóis',        () => expect(Object.keys(KEY_SIGNATURE_MAP['Cb'] ?? {})).toHaveLength(7));
  });

  describe('setBpm', () => {
    it('mínimo: 20',  () => { setBpm(1);    expect(_currentBpm).toBe(20); });
    it('máximo: 400', () => { setBpm(9999); expect(_currentBpm).toBe(400); });
    it('normal: 120', () => { setBpm(120);  expect(_currentBpm).toBe(120); });
  });

  describe('loadSoundFont — estado SF2', () => {
    it('_sfReady false antes de carregar', () => expect(_sfReady).toBe(false));
    it('_sfBuffers vazio antes de carregar', () => expect(_sfBuffers.size).toBe(0));
  });
}
