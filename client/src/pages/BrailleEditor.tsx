import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { getLoginUrl } from "@/const";
import SiteLayout from "@/components/SiteLayout";
import ScoreRenderer from "@/components/ScoreRenderer";
import {
  parseBrailleMusic,
  perkinsDotsToUnicode,
  getQuickReference,
  describeBrailleChar,
  exportToMusicXML,
  unicodeToDots,
  type ParsedElement,
  type ParsedNote,
  type PerkinsKeyState,
  type ParseOptions,
} from "@/lib/brailleMusic";
import { brailleToRoman } from "@/lib/brailleRomano";
import { playScore, stopScore, pauseScore, resumeScore, setBpm as setScoreBpmFn, loadSoundFont, setInstrument, type InstrumentType } from "@/lib/scoreAudioPlayer";
import { asciiToUnicodeBraille, detectBrailleFormat } from "@/lib/brailleAscii";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import {
  ArrowLeft,
  Plus,
  Trash2,
  Download,
  FileText,
  Music,
  Keyboard,
  Info,
  Upload,
  Play,
  Pause,
  Square,
  Volume2,
  VolumeX,
  MessageSquareText,
  LayoutTemplate,
  FlipHorizontal2,
  FlipVertical2,
  Lock,
  ChevronDown,
  ZoomIn,
  ZoomOut,
} from "lucide-react";

// ─── TIPOS ────────────────────────────────────────────────────────────────────

type LayoutMode = "horizontal" | "vertical";
type PanelOrder = "braille-first" | "score-first";
type InputMode  = "braille" | "romano"; // modo do painel braille

interface EditorMetadata {
  brailleFontSize: number;
  scoreFontSize:   number;
  refFontSize:     number;
  scoreScaleStep:  number;
  layoutMode:      LayoutMode;
  panelOrder:      PanelOrder;
  splitPct:        number;
}

// ─── MOTOR DE ÁUDIO PIANO SF2 ────────────────────────────────────────────────
//
// Arquitetura:
//  1. Tenta carregar amostras do SoundFont Equinox_Grand_Pianos.sf2
//     (ou WAV individuais se o SF2 não estiver disponível).
//  2. Fallback silencioso: oscilador FM se nenhuma amostra carregou.
//  3. Regras de articulação:
//     - Staccato: duração do áudio cortada pela metade.
//     - Tie (prolongação): canal mantido aberto pelo tempo somado das duas notas.

// Mapa de amostras WAV individuais (fallback ou alternativa ao SF2)
// Popule com os paths reais do servidor — ex: extraídos do Equinox SF2
const PIANO_SAMPLE_MAP: Partial<Record<number, string>> = {
  // Notas de C2 a C6 com espaçamento por terça (o player interpola com playbackRate)
  36: "/audio/piano/sf2/C2.wav",
  40: "/audio/piano/sf2/E2.wav",
  43: "/audio/piano/sf2/G2.wav",
  48: "/audio/piano/sf2/C3.wav",
  52: "/audio/piano/sf2/E3.wav",
  55: "/audio/piano/sf2/G3.wav",
  60: "/audio/piano/sf2/C4.wav",
  64: "/audio/piano/sf2/E4.wav",
  67: "/audio/piano/sf2/G4.wav",
  72: "/audio/piano/sf2/C5.wav",
  76: "/audio/piano/sf2/E5.wav",
  79: "/audio/piano/sf2/G5.wav",
  84: "/audio/piano/sf2/C6.wav",
};

/** Cache de AudioBuffer decodificados. null = carregando/falhou. */
const audioBufferCache = new Map<number, AudioBuffer | null>();

/** Carrega a amostra mais próxima ao MIDI solicitado e armazena em cache. */
async function loadPianoSample(audioCtx: AudioContext, midi: number): Promise<{ buffer: AudioBuffer; closestMidi: number } | null> {
  const keys = Object.keys(PIANO_SAMPLE_MAP).map(Number);
  if (keys.length === 0) return null;

  const closest = keys.reduce((a, b) => Math.abs(b - midi) < Math.abs(a - midi) ? b : a);

  if (audioBufferCache.has(closest)) {
    const cached = audioBufferCache.get(closest);
    return cached ? { buffer: cached, closestMidi: closest } : null;
  }

  const url = PIANO_SAMPLE_MAP[closest];
  if (!url) return null;

  audioBufferCache.set(closest, null); // marcar como "carregando"
  try {
    const resp = await fetch(url);
    if (!resp.ok) return null;
    const buf = await audioCtx.decodeAudioData(await resp.arrayBuffer());
    audioBufferCache.set(closest, buf);
    return { buffer: buf, closestMidi: closest };
  } catch {
    audioBufferCache.set(closest, null);
    return null;
  }
}

/**
 * Agenda a reprodução de uma nota via AudioBufferSourceNode.
 *
 * @param options.staccato  true → duração cortada pela metade
 * @param options.isTie     true → nota não re-ataca (canal contínuo); duração = tieDuration
 * @param options.tieDuration  duração em pulsos da nota + nota prolongada
 * @param options.bpm       BPM para converter pulsos em segundos
 */
function playPianoBuffer(
  audioCtx: AudioContext,
  buffer:   AudioBuffer,
  midi:     number,
  closestMidi: number,
  startTime: number,
  durationSec: number,
  options: {
    velocity?:    number;
    staccato?:    boolean;
    isTie?:       boolean;
    tieDuration?: number; // em pulsos
    bpm?:         number;
  } = {}
): void {
  const { velocity = 0.75, staccato = false, isTie = false, tieDuration, bpm = 120 } = options;

  // Calcular duração efetiva
  let effectiveDuration = durationSec;
  if (staccato) {
    // Staccato: cortar pela metade
    effectiveDuration = durationSec * 0.5;
  } else if (isTie && tieDuration !== undefined) {
    // Tie: usar a duração somada (pulsos → segundos)
    const secondsPerBeat = 60 / bpm;
    effectiveDuration = tieDuration * secondsPerBeat;
  }

  const src  = audioCtx.createBufferSource();
  const gain = audioCtx.createGain();
  src.buffer = buffer;
  // Transpor por playbackRate (semitoms)
  src.playbackRate.value = Math.pow(2, (midi - closestMidi) / 12);

  // Envelope: ataque imediato, decaimento exponencial
  gain.gain.setValueAtTime(velocity, startTime);
  gain.gain.exponentialRampToValueAtTime(0.001, startTime + effectiveDuration);

  src.connect(gain);
  gain.connect(audioCtx.destination);
  src.start(startTime);
  src.stop(startTime + effectiveDuration + 0.05);
}

/**
 * Fallback FM quando nenhuma amostra está disponível.
 * Respeita staccato (duração × 0.5).
 */
function playFallbackOscillator(
  audioCtx:    AudioContext,
  midi:        number,
  startTime:   number,
  durationSec: number,
  staccato = false,
  velocity = 0.3
): void {
  const dur = staccato ? durationSec * 0.5 : durationSec;
  const osc  = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = "triangle";
  osc.frequency.value = 440 * Math.pow(2, (midi - 69) / 12);
  gain.gain.setValueAtTime(velocity, startTime);
  gain.gain.exponentialRampToValueAtTime(0.001, startTime + dur);
  osc.connect(gain);
  gain.connect(audioCtx.destination);
  osc.start(startTime);
  osc.stop(startTime + dur + 0.03);
}

// ─── FONT SIZE CONTROL ────────────────────────────────────────────────────────

function FontSizeControl({
  label, value, onChange, min = 10, max = 48, step = 2,
}: {
  label: string; value: number; onChange: (v: number) => void;
  min?: number; max?: number; step?: number;
}) {
  return (
    <div className="flex items-center gap-1" title={label}>
      <span className="text-[9px] text-muted-foreground hidden sm:inline">{label}</span>
      <button
        onClick={() => onChange(Math.max(min, value - step))}
        className="p-0.5 rounded hover:bg-accent transition-colors text-muted-foreground hover:text-foreground"
        aria-label={`Diminuir ${label}`}
      >
        <ZoomOut className="w-3 h-3" />
      </button>
      <span className="text-[10px] text-muted-foreground w-6 text-center">{value}</span>
      <button
        onClick={() => onChange(Math.min(max, value + step))}
        className="p-0.5 rounded hover:bg-accent transition-colors text-muted-foreground hover:text-foreground"
        aria-label={`Aumentar ${label}`}
      >
        <ZoomIn className="w-3 h-3" />
      </button>
    </div>
  );
}

// ─── PERKINS KEYBOARD ─────────────────────────────────────────────────────────
// ─── ABREVIAÇÃO DE DESCRIÇÃO DE CÉLULA (~Desc) ───────────────────────────────
//
// Consulta describeBrailleChar() (brailleMusic.ts) e comprime a descrição
// completa em um rótulo curto (≤6 caracteres) para caber sob cada célula
// na renderização estruturada. Mapa de compressão cobre os casos mais comuns
// de notas, durações, oitavas, acidentes e símbolos de compasso.

const PITCH_ABBR: Record<string, string> = {
  C: 'dó', D: 'ré', E: 'mi', F: 'fá', G: 'sol', A: 'lá', B: 'si',
};

const DURATION_ABBR: Record<string, string> = {
  w: 'semibr', h: 'mín', q: 'semín', '8': 'colch', '16': 'semic',
};

function abbreviateCellDescription(char: string): string {
  if (!char.trim()) return '';

  const full = describeBrailleChar(char);

  // Nota musical: "C (q)" → "dó·semín"
  const noteMatch = full.match(/^([A-G])\s*\(([whq0-9]+)\)$/);
  if (noteMatch) {
    const [, pitch, dur] = noteMatch;
    const p = PITCH_ABBR[pitch] ?? pitch.toLowerCase();
    const d = DURATION_ABBR[dur] ?? dur;
    return `${p}·${d}`;
  }

  // Pausa: "Pausa (q)" → "pausa·semín"
  const restMatch = full.match(/^Pausa\s*\(([whq0-9]+)\)$/);
  if (restMatch) {
    const d = DURATION_ABBR[restMatch[1]] ?? restMatch[1];
    return `pausa·${d}`;
  }

  // Oitava: "Oitava 4" → "oit4"
  const octMatch = full.match(/^Oitava\s*(\d)$/);
  if (octMatch) return `oit${octMatch[1]}`;

  // Acidentes
  if (full === 'Sustenido')          return 'sust';
  if (full === 'Bemol')              return 'bem';
  if (full === 'Bequadro')           return 'beq';
  if (full === 'Dobrado sustenido')  return 'dsust';
  if (full === 'Dobrado bemol')      return 'dbem';

  // Ligaduras
  if (full === 'Ligadura de Duração')       return 'ligDur';
  if (full === 'Início de Ligadura')        return 'ligIn';
  if (full === 'Início de Ligadura Longa')  return 'ligLIn';
  if (full === 'Fim de Ligadura Longa')     return 'ligLFim';

  // Staccato e articulações
  if (full === 'Staccato') return 'stac';

  // Fórmula de compasso — já vem curta o suficiente (ex: "4/4")
  if (/^\d+\/\d+$/.test(full)) return full;

  // Fallback: truncar em 6 caracteres
  if (full === 'Símbolo desconhecido') return '';
  return full.length > 6 ? full.slice(0, 6) : full;
}

// ─── DESCRIÇÃO SEMÂNTICA ANALÍTICA COMPLETA (ARIA / Leitores de Tela) ────────
//
// Gera uma descrição textual completa em português para uma célula Braille,
// destinada a sintetizadores de voz (JAWS, NVDA, VoiceOver) via aria-label.
// Diferente de abbreviateCellDescription() (abreviação visual curta), esta
// função produz frases analíticas completas — ex: "Nota Mi da 4ª Oitava com
// Ligadura de Duração", "Intervalo de Quinta Diatônica".
//
// O parâmetro `contextEl` é OPCIONAL: quando fornecido (o ParsedElement real
// correspondente a esta posição, já disponível via parsedElements no editor),
// a descrição é enriquecida com informação contextual real (oitava resolvida,
// ligaduras ativas nesta ocorrência específica, acidentes, staccato) que uma
// análise puramente do caractere isolado não pode determinar — o mesmo glifo
// de nota pode ou não ter uma ligadura ativa dependendo do que vem antes/depois
// dele no documento.
const FULL_DURATION_NAME: Record<string, string> = {
  w: 'Semibreve', h: 'Mínima', q: 'Semínima', '8': 'Colcheia', '16': 'Semicolcheia',
};

const FULL_ACCIDENTAL_NAME: Record<string, string> = {
  sharp: 'sustenido', flat: 'bemol', natural: 'bequadro',
  'double-sharp': 'dobrado sustenido', 'double-flat': 'dobrado bemol',
};

// ─── FEEDBACK FALADO (Web Speech API) ────────────────────────────────────────
//
// Vocaliza cada célula Braille digitada, para uso por pessoas com baixa visão
// residual ou como reforço de aprendizagem — independente do feedback sonoro
// musical (tecla soa a nota) e da descrição visual em tela (~Desc).
//
// Regra: células com significado ambíguo/incompleto (prefixos preparatórios
// de sinais de duas celas — sinal numérico, prefixos de oitava/hífen musical,
// mão/clave, início de ligadura longa) são faladas pelos NÚMEROS DOS PONTOS
// (ex: "pontos três, quatro, cinco, seis"), já que sua descrição semântica só
// se resolve quando a célula seguinte for lida — falar uma descrição
// prematura (ex: "Oitava 4" para um ⠐ que na verdade é hífen musical de
// quebra de linha) seria enganoso. Células reconhecidas (notas, pausas)
// são faladas por sua descrição semântica reduzida.

/**
 * Glifos de UMA cela que são, por natureza, a PRIMEIRA metade de um sinal de
 * duas celas (sinal numérico ⠼, oitava/hífen ⠐, início de frase ⠰⠃/⠉⠉, mão
 * direita ⠨⠜, mão esquerda ⠸⠜, fim de frase ⠘⠆) — sempre falados por pontos,
 * nunca por uma descrição semântica isolada e potencialmente prematura.
 */
const PREPARATORY_PREFIX_CHARS = new Set<string>([
  '\u283C', // ⠼ sinal numérico (compasso / armadura / intervalo — depende do que segue)
  '\u2810', // ⠐ oitava 4 / hífen musical (ambíguo — depende do próximo caractere)
  '\u2830', // ⠰ primeira metade de ⠰⠃ (início de ligadura longa de frase)
  '\u2828', // ⠨ primeira metade de ⠨⠜ (mão direita)
  '\u2838', // ⠸ primeira metade de ⠸⠜ (mão esquerda)
  '\u2809', // ⠉ ligadura simples — pode ser início de ⠉⠉ (dupla) até a próxima cela confirmar
  '\u2818', // ⠘ primeira metade de ⠘⠆ (fim de ligadura longa de frase)
  '\u2803', // ⠃ segunda metade de ⠰⠃ / início de frase pedagógica isolado
]);

const NUMBER_WORDS_PT: Record<number, string> = {
  1: 'um', 2: 'dois', 3: 'três', 4: 'quatro', 5: 'cinco', 6: 'seis',
};

/** Converte os pontos de uma cela em uma frase falada: "pontos três, quatro". */
function spokenDotsDescription(char: string): string {
  const dots = unicodeToDots(char);
  if (dots.length === 0) return 'célula vazia';
  const words = dots.map(d => NUMBER_WORDS_PT[d] ?? String(d));
  return words.length === 1 ? `ponto ${words[0]}` : `pontos ${words.join(', ')}`;
}

/**
 * Descrição semântica REDUZIDA para fala (mais curta que a descrição ARIA
 * completa) — ex: "Dó colcheia", "Pausa de mínima".
 */
function spokenShortDescription(char: string): string {
  const full = describeBrailleChar(char);

  const noteMatch = full.match(/^([A-G])\s*\(([whq0-9]+)\)$/);
  if (noteMatch) {
    const [, letter, durCode] = noteMatch;
    const pitchName = PITCH_ABBR[letter] ?? letter.toLowerCase();
    const cap = pitchName.charAt(0).toUpperCase() + pitchName.slice(1);
    const durName = FULL_DURATION_NAME[durCode] ?? durCode;
    return `${cap} ${durName.toLowerCase()}`;
  }

  const restMatch = full.match(/^Pausa\s*\(([whq0-9]+)\)$/);
  if (restMatch) {
    const durName = FULL_DURATION_NAME[restMatch[1]] ?? restMatch[1];
    return `Pausa de ${durName.toLowerCase()}`;
  }

  return full;
}

/**
 * Dispara a fala (SpeechSynthesis) para o caractere recém-digitado.
 * Cancela qualquer fala pendente antes de iniciar a nova, evitando acúmulo
 * de fila quando o usuário digita rapidamente.
 */
function speakBrailleFeedback(char: string): void {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
  if (!char || !char.trim()) return;

  const full = describeBrailleChar(char);
  const isUnknown     = full === 'Símbolo desconhecido';
  const isPreparatory = PREPARATORY_PREFIX_CHARS.has(char);

  const textToSpeak = (isUnknown || isPreparatory)
    ? spokenDotsDescription(char)
    : spokenShortDescription(char);

  try {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(textToSpeak);
    utterance.lang = 'pt-BR';
    utterance.rate = 1.15;
    window.speechSynthesis.speak(utterance);
  } catch { /* fala é best-effort — falha silenciosa */ }
}

/**
 * Determina a direção de leitura de um intervalo (Ascendente/Descendente)
 * pela convenção MIMB: intervalos em mão direita/clave de Sol são lidos
 * ASCENDENTES (de baixo para cima a partir da nota-base); intervalos em
 * mão esquerda/clave de Fá são lidos DESCENDENTES. Escaneia allElements
 * retroativamente a partir da posição do intervalo para achar a última
 * clave/mão ativa. Sem contexto de clave anterior (ou se allElements não
 * for fornecido), usa Ascendente — convenção padrão/mais comum do MIMB.
 */
function resolveIntervalDirection(
  contextEl:    ParsedElement,
  allElements?: ParsedElement[],
): 'Ascendente' | 'Descendente' {
  if (!allElements) return 'Ascendente';
  const idx = allElements.indexOf(contextEl);
  if (idx < 0) return 'Ascendente';
  for (let i = idx - 1; i >= 0; i--) {
    const el = allElements[i];
    if (el.type === 'clef' || el.type === 'hand') {
      const clefType = (el as any).clefType as string | undefined;
      return clefType === 'bass' ? 'Descendente' : 'Ascendente';
    }
  }
  return 'Ascendente'; // nenhuma clave anterior encontrada — padrão MIMB
}

function getBrailleSemanticDescription(
  char: string,
  contextEl?: ParsedElement,
  allElements?: ParsedElement[],
): string {
  if (!char || !char.trim()) {
    return 'Espaço — separador de compasso';
  }

  const full = describeBrailleChar(char);

  // ── Nota musical: "C (q)" → descrição analítica completa ──────────────────
  const noteMatch = full.match(/^([A-G])\s*\(([whq0-9]+)\)$/);
  if (noteMatch) {
    const [, pitchLetter, durCode] = noteMatch;
    const pitchNameRaw = PITCH_ABBR[pitchLetter] ?? pitchLetter.toLowerCase();
    const pitchName    = pitchNameRaw.charAt(0).toUpperCase() + pitchNameRaw.slice(1);
    const durName      = FULL_DURATION_NAME[durCode] ?? durCode;

    let desc = `Nota ${pitchName}`;

    const noteCtx = (contextEl && contextEl.type === 'note') ? (contextEl as ParsedNote) : undefined;

    if (noteCtx) {
      desc += ` da ${noteCtx.octave}ª Oitava`;
    }

    desc += `, duração ${durName}`;

    if (noteCtx) {
      if (noteCtx.tieRole === 'start' || noteCtx.tieRole === 'end') {
        desc += ', com Ligadura de Duração';
      } else if (noteCtx.slurRole === 'start' || noteCtx.slurRole === 'end') {
        desc += ', com Ligadura de Expressão';
      }
      if (noteCtx.slurRolePedagogic === 'start' || noteCtx.slurRolePedagogic === 'end') {
        desc += ', parte de Frase Pedagógica';
      }
      if (noteCtx.staccato)  desc += ', staccato';
      if (noteCtx.dotted)    desc += ', pontuada';
      if (noteCtx.accidental) {
        desc += `, ${FULL_ACCIDENTAL_NAME[noteCtx.accidental] ?? ''}`;
      }
    }

    return desc;
  }

  // ── Pausa: "Pausa (q)" → "Pausa de Semínima" ───────────────────────────────
  const restMatch = full.match(/^Pausa\s*\(([whq0-9]+)\)$/);
  if (restMatch) {
    const durName = FULL_DURATION_NAME[restMatch[1]] ?? restMatch[1];
    return `Pausa de ${durName}`;
  }

  // ── Sinal de oitava isolado: "Oitava 4" → "Sinal de 4ª Oitava" ─────────────
  const octMatch = full.match(/^Oitava\s*(\d)$/);
  if (octMatch) return `Sinal de ${octMatch[1]}ª Oitava`;

  // ── Intervalos: "Intervalo: Quintaª" (formato atual) → "Intervalo de Quinta Diatônica Ascendente/Descendente"
  const intervalMatch = full.match(/^Intervalo:\s*(.+)$/);
  if (intervalMatch) {
    const cleanName  = intervalMatch[1].replace(/ª$/, '').trim();
    const direction   = contextEl ? resolveIntervalDirection(contextEl, allElements) : 'Ascendente';
    return `Intervalo de ${cleanName} Diatônica ${direction}`;
  }

  // ── Acidentes ───────────────────────────────────────────────────────────────
  if (full === 'Sustenido')          return 'Sinal de Sustenido';
  if (full === 'Bemol')              return 'Sinal de Bemol';
  if (full === 'Bequadro')           return 'Sinal de Bequadro';
  if (full === 'Dobrado sustenido')  return 'Sinal de Dobrado Sustenido';
  if (full === 'Dobrado bemol')      return 'Sinal de Dobrado Bemol';

  // ── Ligaduras ───────────────────────────────────────────────────────────────
  if (full === 'Ligadura de Duração')       return 'Sinal de Ligadura de Duração';
  if (full === 'Início de Ligadura')        return 'Início de Ligadura de Expressão';
  if (full === 'Início de Ligadura Longa')  return 'Início de Ligadura de Frase Longa';
  if (full === 'Fim de Ligadura Longa')     return 'Fim de Ligadura de Frase Longa';

  // ── Articulações ──────────────────────────────────────────────────────────
  if (full === 'Staccato') return 'Sinal de Staccato';

  // ── Fórmula de compasso ──────────────────────────────────────────────────
  if (/^\d+\/\d+$/.test(full)) return `Fórmula de compasso ${full}`;

  // ── Claves e mãos ─────────────────────────────────────────────────────────
  if (full === 'Mão direita') return 'Sinal de Mão Direita — clave de Sol';
  if (full === 'Mão esquerda') return 'Sinal de Mão Esquerda — clave de Fá';

  if (full === 'Símbolo desconhecido' || !full) {
    return 'Símbolo Braille não identificado';
  }

  return full;
}

// ─── TECLADO PERKINS VIRTUAL ─────────────────────────────────────────────────
//
// Suporte completo a:
//   • Teclado físico (F,D,S / J,K,L) com guard para não interceptar inputs de texto
//   • Botões virtuais com type="button" inputMode="none" — nunca abre teclado do SO
//   • Overlay modo Perkins físico (isMobileScreenInputMode): tela cheia dividida em
//     metade esquerda (pontos 1-2-3) e metade direita (pontos 4-5-6), com debounce
//     de 50ms para capturar multi-toques como máquina Perkins física

/** Mapa de slot de overlay (posição 0-5) para campo de PerkinsKeyState */
const OVERLAY_SLOT_TO_DOT: Array<keyof PerkinsKeyState> = [
  'dot1', 'dot2', 'dot3',  // metade esquerda (slots 0,1,2)
  'dot4', 'dot5', 'dot6',  // metade direita  (slots 3,4,5)
];

function PerkinsKeyboard({
  onChar, onSpace, onBackspace, onNewline, brailleTextareaRef, isMobileScreenInputMode,
}: {
  onChar: (char: string) => void;
  onSpace: () => void;
  onBackspace: () => void;
  onNewline: () => void;
  brailleTextareaRef: React.RefObject<HTMLTextAreaElement | null>;
  /** Quando true (overlay mobile ativo), desativar o listener de teclado físico
   *  para não capturar toques do OS. Quando false (desktop), o listener funciona normalmente. */
  isMobileScreenInputMode: boolean;
}) {
  const [pressed,      setPressed]      = useState<Set<string>>(new Set());
  const pressedRef                      = useRef<Set<string>>(new Set());
  const activeDotsRef                   = useRef<PerkinsKeyState>({
    dot1: false, dot2: false, dot3: false,
    dot4: false, dot5: false, dot6: false,
  });

  // Estado do overlay Perkins físico (modo mobile paisagem)
  const [overlayDotsActive, setOverlayDotsActive] = useState<Set<number>>(new Set());
  const overlayDotsRef    = useRef<Set<number>>(new Set());
  const overlayCommitRef  = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Commit: emite célula quando todos os pontos são liberados ─────────────
  const commitIfDone = useCallback(() => {
    if (pressedRef.current.size === 0) {
      const dots = { ...activeDotsRef.current };
      if (dots.dot1 || dots.dot2 || dots.dot3 || dots.dot4 || dots.dot5 || dots.dot6) {
        onChar(perkinsDotsToUnicode(dots));
      }
      activeDotsRef.current = {
        dot1: false, dot2: false, dot3: false,
        dot4: false, dot5: false, dot6: false,
      };
    }
  }, [onChar]);

  // ── Teclado físico (F,D,S / J,K,L) ──────────────────────────────────────
  // Guard: se isMobileScreenInputMode=true, o overlay tátil está ativo.
  // Neste caso, desativar completamente a escuta do teclado físico para evitar
  // conflito com o SO mobile. Em desktop (false), o listener funciona normalmente.
  useEffect(() => {
    if (isMobileScreenInputMode) return; // overlay mobile ativo — não capturar teclado físico

    const down = (e: KeyboardEvent) => {
      const active = document.activeElement;
      const isTextInput =
        active instanceof HTMLInputElement ||
        (active instanceof HTMLTextAreaElement && active !== brailleTextareaRef.current);
      if (isTextInput) return;

      const key = e.key.toLowerCase();
      if (["f","d","s","j","k","l"].includes(key)) {
        e.preventDefault();
        if (key === "f") activeDotsRef.current.dot1 = true;
        if (key === "d") activeDotsRef.current.dot2 = true;
        if (key === "s") activeDotsRef.current.dot3 = true;
        if (key === "j") activeDotsRef.current.dot4 = true;
        if (key === "k") activeDotsRef.current.dot5 = true;
        if (key === "l") activeDotsRef.current.dot6 = true;
        pressedRef.current.add(key);
        setPressed(new Set(pressedRef.current));
      }
      if (key === " " || key === "backspace" || key === "enter") e.preventDefault();
    };
    const up = (e: KeyboardEvent) => {
      const active = document.activeElement;
      const isTextInput =
        active instanceof HTMLInputElement ||
        (active instanceof HTMLTextAreaElement && active !== brailleTextareaRef.current);
      if (isTextInput) return;

      const key = e.key.toLowerCase();
      if (key === " ")         { e.preventDefault(); onSpace();     return; }
      if (key === "backspace") { e.preventDefault(); onBackspace(); return; }
      if (key === "enter")     { e.preventDefault(); onNewline();   return; }
      if (["f","d","s","j","k","l"].includes(key)) {
        e.preventDefault();
        pressedRef.current.delete(key);
        setPressed(new Set(pressedRef.current));
        commitIfDone();
      }
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup",   up);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup",   up);
    };
  }, [onSpace, onBackspace, onNewline, commitIfDone, isMobileScreenInputMode]);

  // ── Botões virtuais (touch/click) ─────────────────────────────────────────
  // type="button" + inputMode="none": nunca abre teclado do SO em Android/iOS

  const handleVirtualDown = useCallback((dotKey: string, dotField: keyof PerkinsKeyState) => {
    activeDotsRef.current[dotField] = true;
    pressedRef.current.add(dotKey);
    setPressed(new Set(pressedRef.current));
  }, []);

  const handleVirtualUp = useCallback((dotKey: string) => {
    pressedRef.current.delete(dotKey);
    setPressed(new Set(pressedRef.current));
    commitIfDone();
  }, [commitIfDone]);

  const keys: Array<{ label: string; sub: string; key: string; field: keyof PerkinsKeyState }> = [
    { label: "S", sub: "•3", key: "s", field: "dot3" },
    { label: "D", sub: "•2", key: "d", field: "dot2" },
    { label: "F", sub: "•1", key: "f", field: "dot1" },
    { label: "J", sub: "•4", key: "j", field: "dot4" },
    { label: "K", sub: "•5", key: "k", field: "dot5" },
    { label: "L", sub: "•6", key: "l", field: "dot6" },
  ];

  // ── Overlay Perkins Físico (isMobileScreenInputMode) ─────────────────────
  // Disparado pelo estado pai via prop — renderizado como overlay invisível
  // em tela cheia quando em paisagem mobile.
  // Metade esquerda = pontos 1-2-3 (posições verticais top/middle/bottom)
  // Metade direita  = pontos 4-5-6
  // Debounce de 50ms: aguarda todos os dedos serem levantados antes de emitir.

  const handleOverlayTouchStart = useCallback((
    e: React.TouchEvent<HTMLDivElement>,
    slotIndex: number
  ) => {
    e.preventDefault();
    e.stopPropagation();
    overlayDotsRef.current.add(slotIndex);
    setOverlayDotsActive(new Set(overlayDotsRef.current));
  }, []);

  const handleOverlayTouchEnd = useCallback((
    e: React.TouchEvent<HTMLDivElement>,
    slotIndex: number
  ) => {
    e.preventDefault();
    e.stopPropagation();
    overlayDotsRef.current.delete(slotIndex);
    setOverlayDotsActive(new Set(overlayDotsRef.current));

    // Debounce 50ms: emitir célula quando nenhum dedo mais tocar a tela
    if (overlayCommitRef.current) clearTimeout(overlayCommitRef.current);
    overlayCommitRef.current = setTimeout(() => {
      if (overlayDotsRef.current.size === 0) {
        // Construir PerkinsKeyState a partir dos slots ativos no momento do commit
        const dots: PerkinsKeyState = {
          dot1: false, dot2: false, dot3: false,
          dot4: false, dot5: false, dot6: false,
        };
        // Nota: neste ponto todos os slots foram liberados.
        // Usar os dots que foram pressionados ao longo do gesto (capturados abaixo).
        const committed = committedOverlayDotsRef.current;
        if (committed.size > 0) {
          Array.from(committed).forEach(slot => {
            const field = OVERLAY_SLOT_TO_DOT[slot];
            if (field) dots[field] = true;
          });
          if (dots.dot1||dots.dot2||dots.dot3||dots.dot4||dots.dot5||dots.dot6) {
            onChar(perkinsDotsToUnicode(dots));
          }
          committedOverlayDotsRef.current = new Set();
        }
      }
    }, 50);
  }, [onChar]);

  // Acumulador: registra todos os slots que foram tocados no gesto atual
  const committedOverlayDotsRef = useRef<Set<number>>(new Set());

  const handleOverlaySlotStart = useCallback((
    e: React.TouchEvent<HTMLDivElement>,
    slotIndex: number
  ) => {
    e.preventDefault();
    e.stopPropagation();
    committedOverlayDotsRef.current.add(slotIndex);
    handleOverlayTouchStart(e, slotIndex);
  }, [handleOverlayTouchStart]);

  return (
    <div className="flex flex-col items-center gap-1.5 py-1 select-none">
      <div className="flex gap-1.5 items-center">
        {keys.map((k, idx) => (
          <div key={k.key} className="flex items-center">
            {idx === 3 && <span className="inline-block w-3" />}
            <button
              type="button"
              inputMode="none"
              onTouchStart={(e) => { e.preventDefault(); e.stopPropagation(); handleVirtualDown(k.key, k.field); }}
              onTouchEnd={(e)   => { e.preventDefault(); e.stopPropagation(); handleVirtualUp(k.key); }}
              onTouchCancel={(e) => { e.preventDefault(); e.stopPropagation(); handleVirtualUp(k.key); }}
              onPointerDown={(e) => { e.preventDefault(); handleVirtualDown(k.key, k.field); }}
              onPointerUp={(e)   => { e.preventDefault(); handleVirtualUp(k.key); }}
              onPointerLeave={(e) => {
                e.preventDefault();
                if (pressedRef.current.has(k.key)) handleVirtualUp(k.key);
              }}
              onPointerCancel={(e) => { e.preventDefault(); handleVirtualUp(k.key); }}
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}
              className={`w-11 h-12 rounded-xl border-2 flex flex-col items-center justify-center font-bold text-sm transition-all touch-none select-none ${
                pressed.has(k.key)
                  ? "bg-primary text-primary-foreground border-primary scale-95 shadow-inner"
                  : "bg-card text-card-foreground border-border hover:border-primary/60 hover:bg-accent active:scale-95"
              }`}
              aria-label={`Perkins ${k.label} – Ponto ${k.field.replace("dot","")}`}
            >
              <span className="leading-none">{k.label}</span>
              <span className="text-[9px] font-normal opacity-60 mt-0.5">{k.sub}</span>
            </button>
          </div>
        ))}
      </div>
      {/* Barra de ações */}
      <div className="flex gap-1.5 mt-0.5">
        <button
          type="button"
          inputMode="none"
          onTouchStart={e => { e.preventDefault(); e.stopPropagation(); }}
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); onSpace(); }}
          className="px-4 py-1 text-[10px] rounded-lg border border-border bg-card hover:bg-accent transition-colors text-muted-foreground touch-none"
          aria-label="Barra de compasso (espaço)"
        >
          ␣ Barra
        </button>
        <button
          type="button"
          inputMode="none"
          onTouchStart={e => { e.preventDefault(); e.stopPropagation(); }}
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); onNewline(); }}
          className="px-3 py-1 text-[10px] rounded-lg border border-border bg-card hover:bg-accent transition-colors text-muted-foreground touch-none"
          aria-label="Nova linha"
        >
          ↵ Linha
        </button>
        <button
          type="button"
          inputMode="none"
          onTouchStart={e => { e.preventDefault(); e.stopPropagation(); }}
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); onBackspace(); }}
          className="px-3 py-1 text-[10px] rounded-lg border border-border bg-card hover:bg-accent transition-colors text-muted-foreground touch-none"
          aria-label="Apagar"
        >
          ⌫ Apagar
        </button>
      </div>

      {/* Slots do Overlay Perkins Físico — renderizados externamente pelo pai */}
      {/* Ver: PerkinsPhysicalOverlay abaixo */}
    </div>
  );
}

// ─── OVERLAY PERKINS FÍSICO (MODO MOBILE PAISAGEM) ───────────────────────────
//
// Overlay invisível em tela cheia, dividido em 6 zonas de toque.
// Ativado por isMobileScreenInputMode no componente pai.
// Não usa inputs de texto — apenas divs com onTouchStart/End.

function PerkinsPhysicalOverlay({
  onChar,
  onClose,
}: {
  onChar: (char: string) => void;
  onClose: () => void;
}) {
  const committedRef    = useRef<Set<number>>(new Set());
  const activeRef       = useRef<Set<number>>(new Set());
  const [active, setActive] = useState<Set<number>>(new Set());
  const commitTimerRef  = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Slots: 0=dot1(esq-top), 1=dot2(esq-mid), 2=dot3(esq-bot)
  //        3=dot4(dir-top), 4=dot5(dir-mid), 5=dot6(dir-bot)
  const SLOT_LABELS = ['•1','•2','•3','•4','•5','•6'];

  const scheduleCommit = useCallback(() => {
    if (commitTimerRef.current) clearTimeout(commitTimerRef.current);
    commitTimerRef.current = setTimeout(() => {
      if (activeRef.current.size === 0 && committedRef.current.size > 0) {
        const dots: PerkinsKeyState = {
          dot1: false, dot2: false, dot3: false,
          dot4: false, dot5: false, dot6: false,
        };
        Array.from(committedRef.current).forEach(slot => {
          const field = OVERLAY_SLOT_TO_DOT[slot];
          if (field) dots[field] = true;
        });
        if (dots.dot1||dots.dot2||dots.dot3||dots.dot4||dots.dot5||dots.dot6) {
          onChar(perkinsDotsToUnicode(dots));
        }
        committedRef.current = new Set();
      }
    }, 50); // 50ms debounce
  }, [onChar]);

  const handleSlotStart = useCallback((
    e: React.TouchEvent<HTMLDivElement>,
    slot: number
  ) => {
    e.preventDefault();
    e.stopPropagation();
    activeRef.current.add(slot);
    committedRef.current.add(slot);
    setActive(new Set(activeRef.current));
  }, []);

  const handleSlotEnd = useCallback((
    e: React.TouchEvent<HTMLDivElement>,
    slot: number
  ) => {
    e.preventDefault();
    e.stopPropagation();
    activeRef.current.delete(slot);
    setActive(new Set(activeRef.current));
    scheduleCommit();
  }, [scheduleCommit]);

  // Slots esquerda (pontos 1-2-3) e direita (pontos 4-5-6)
  const leftSlots  = [0, 1, 2];
  const rightSlots = [3, 4, 5];

  return (
    <div
      className="fixed inset-0 z-50 flex landscape:flex portrait:hidden"
      style={{ touchAction: 'none' }}
    >
      {/* Metade esquerda: pontos 1-2-3 */}
      <div className="flex-1 flex flex-col">
        {leftSlots.map(slot => (
          <div
            key={slot}
            className={`flex-1 flex items-center justify-center border-r border-b border-white/10 transition-colors ${
              active.has(slot) ? 'bg-primary/30' : 'bg-black/5'
            }`}
            inputMode="none"
            tabIndex={-1}
            onTouchStart={e => handleSlotStart(e, slot)}
            onTouchEnd={e => handleSlotEnd(e, slot)}
            onTouchCancel={e => handleSlotEnd(e, slot)}
            style={{ touchAction: 'none', WebkitTapHighlightColor: 'transparent' }}
          >
            <span className="text-white/40 text-2xl font-bold pointer-events-none select-none">
              {SLOT_LABELS[slot]}
            </span>
          </div>
        ))}
      </div>

      {/* Metade direita: pontos 4-5-6 */}
      <div className="flex-1 flex flex-col">
        {rightSlots.map(slot => (
          <div
            key={slot}
            className={`flex-1 flex items-center justify-center border-b border-white/10 transition-colors ${
              active.has(slot) ? 'bg-primary/30' : 'bg-black/5'
            }`}
            inputMode="none"
            tabIndex={-1}
            onTouchStart={e => handleSlotStart(e, slot)}
            onTouchEnd={e => handleSlotEnd(e, slot)}
            onTouchCancel={e => handleSlotEnd(e, slot)}
            style={{ touchAction: 'none', WebkitTapHighlightColor: 'transparent' }}
          >
            <span className="text-white/40 text-2xl font-bold pointer-events-none select-none">
              {SLOT_LABELS[slot]}
            </span>
          </div>
        ))}
      </div>

      {/* Botão de fechar o overlay */}
      <button
        type="button"
        inputMode="none"
        onClick={onClose}
        className="absolute top-3 right-3 z-10 w-10 h-10 rounded-full bg-black/40 text-white flex items-center justify-center text-lg"
        aria-label="Fechar modo Perkins físico"
      >
        ✕
      </button>
    </div>
  );
}

// ─── REFERÊNCIA RÁPIDA ────────────────────────────────────────────────────────

function QuickReferencePanel({
  onInsert, fontSize = 24,
}: {
  onInsert: (char: string) => void;
  fontSize?: number;
}) {
  const ref      = useMemo(() => getQuickReference(), []);
  const [filter, setFilter] = useState<string>("note-whole");

  const categories = [
    { key: "note-whole",   label: "Sb/Sc" },
    { key: "note-half",    label: "Mín/Fu" },
    { key: "note-quarter", label: "Sem/Sf" },
    { key: "note-eighth",  label: "Col/Qt" },
    { key: "rest",         label: "Pausas" },
    { key: "octave",       label: "Oitavas" },
    { key: "accidental",   label: "Alters." },
    { key: "armadura",     label: "Armad." },
    { key: "timesig",      label: "Comps." },
    { key: "barline",      label: "Barras" },
    { key: "interval",     label: "Interv." },
    { key: "ligadura",     label: "Ligad." },
    { key: "articulacao",  label: "Articu." },
    { key: "dinamica",     label: "Dinâm." },
    { key: "ornamento",    label: "Orn." },
    { key: "quialtera",    label: "Quiált." },
    { key: "repeticao",    label: "Repet." },
    { key: "clave",        label: "Claves" },
    { key: "other",        label: "Outros" },
  ];

  const filtered = ref.filter((e) => e.category === filter);

  return (
    <div className="space-y-1.5">
      <div className="flex flex-wrap gap-1">
        {categories.map((cat) => (
          <button
            key={cat.key}
            onClick={() => setFilter(cat.key)}
            className={`px-1.5 py-0.5 text-[10px] rounded transition-colors ${
              filter === cat.key
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-accent"
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-4 sm:grid-cols-5 gap-1 max-h-44 overflow-y-auto">
        {filtered.map((entry, i) => (
          <button
            key={i}
            onClick={() => onInsert(entry.char)}
            className="flex flex-col items-center p-1.5 rounded border border-border hover:bg-accent transition-colors"
            title={`${entry.description} (${entry.dots})`}
          >
            <span style={{ fontSize }} className="leading-none block">{entry.char}</span>
            <span
              style={{ fontSize: Math.max(8, Math.round(fontSize * 0.35)) }}
              className="text-muted-foreground mt-0.5 truncate w-full text-center leading-tight block"
            >
              {entry.description}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── DROPDOWN ─────────────────────────────────────────────────────────────────

function Dropdown({
  label, icon, items, disabled = false,
}: {
  label: string;
  icon: React.ReactNode;
  items: { label: string; icon?: React.ReactNode; onClick: () => void; locked?: boolean }[];
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => !disabled && setOpen((v) => !v)}
        disabled={disabled}
        className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-md border border-border bg-card hover:bg-accent transition-colors disabled:opacity-40"
      >
        {icon}
        <span className="hidden sm:inline">{label}</span>
        <ChevronDown className="w-3 h-3 opacity-60" />
      </button>
      {open && (
        <div className="absolute z-50 top-full mt-1 left-0 bg-popover border border-border rounded-lg shadow-lg py-1 min-w-[200px]">
          {items.map((item, i) => (
            <button
              key={i}
              onClick={() => { if (!item.locked) { item.onClick(); setOpen(false); } }}
              className={`flex items-center gap-2 w-full px-3 py-1.5 text-xs text-left transition-colors ${
                item.locked ? "text-muted-foreground cursor-not-allowed" : "hover:bg-accent"
              }`}
            >
              {item.locked ? <Lock className="w-3 h-3" /> : (item.icon ?? null)}
              {item.label}
              {item.locked && <span className="ml-auto text-[9px] text-primary font-medium">PRO</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── MAIN EDITOR ──────────────────────────────────────────────────────────────

export default function BrailleEditor() {
  const { user, loading: authLoading } = useAuth({ redirectOnUnauthenticated: true });
  const projectsQuery          = trpc.editor.list.useQuery(undefined, { enabled: !!user });
  const createMutation         = trpc.editor.create.useMutation();
  const updateMutation         = trpc.editor.update.useMutation();
  const deleteMutation         = trpc.editor.delete.useMutation();
  const exportMutation         = trpc.editor.export.useMutation();
  const importMusicXMLMutation = trpc.editor.importMusicXML.useMutation();
  const utils                  = trpc.useUtils();

  // ── Conteúdo ──────────────────────────────────────────────────────────────
  const [currentProjectId, setCurrentProjectId] = useState<number | null>(null);
  const [projectTitle,     setProjectTitle]     = useState("");
  const [brailleContent,   setBrailleContent]   = useState("");
  const [romanContent,     setRomanContent]     = useState("");

  // ── Undo / Redo ───────────────────────────────────────────────────────────
  const undoStack  = useRef<string[]>([]);
  const redoStack  = useRef<string[]>([]);
  const isUndoRedo = useRef(false);

  // ── UI state ──────────────────────────────────────────────────────────────
  const [showProjects,  setShowProjects]  = useState(true);
  const [showReference, setShowReference] = useState(false);
  const [showRomano,    setShowRomano]    = useState(false);
  const [showCellDescriptions, setShowCellDescriptions] = useState(false);
  const [inputMode,     setInputMode]     = useState<InputMode>("braille");
  const [layoutMode,    setLayoutMode]    = useState<LayoutMode>("horizontal");
  const [panelOrder,    setPanelOrder]    = useState<PanelOrder>("braille-first");
  const [saveStatus,    setSaveStatus]    = useState<"saved" | "saving" | "unsaved">("saved");
  const [importing,     setImporting]     = useState(false);
  // Modo Perkins físico para mobile em paisagem — overlay invisível de tela cheia
  const [isMobileScreenInputMode, setIsMobileScreenInputMode] = useState(false);
  // Detecção estreita de dispositivo móvel/tablet — controla a visibilidade
  // do botão de overlay Perkins físico. Evita que listeners de touch/inputMode
  // fiquem ativos desnecessariamente em desktop (risco de congelamento de UI).
  const [isMobile, setIsMobile] = useState(false);

  // ── Font sizes ────────────────────────────────────────────────────────────
  const [brailleFontSize, setBrailleFontSize] = useState(28);
  const [scoreFontSize,   setScoreFontSize]   = useState(14);
  // Seletor de escala VexFlow: step 1–6 → escala 0.5–1.0
  // Mapa: 1→0.5, 2→0.6, 3→0.7, 4→0.8 (padrão), 5→0.9, 6→1.0
  const SCALE_STEPS: Record<number, number> = { 1: 0.5, 2: 0.6, 3: 0.7, 4: 0.8, 5: 0.9, 6: 1.0 };
  const [scoreScaleStep, setScoreScaleStep] = useState(4); // 4 = 0.8 (padrão)
  const scoreScaleRatio = SCALE_STEPS[scoreScaleStep] ?? 0.8;
  const [refFontSize,     setRefFontSize]     = useState(24);

  // ── Split pane ────────────────────────────────────────────────────────────
  // splitPct: percentagem do primeiro painel (0–100); default 50%
  const [splitPct,    setSplitPct]    = useState(50);
  const isDragging                    = useRef(false);
  const containerRef                  = useRef<HTMLDivElement>(null);

  const handleDividerMouseDown = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    isDragging.current = true;

    const move = (ev: MouseEvent | TouchEvent) => {
      if (!isDragging.current || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const clientX = "touches" in ev ? ev.touches[0].clientX : ev.clientX;
      const clientY = "touches" in ev ? ev.touches[0].clientY : ev.clientY;
      const pct = layoutMode === "horizontal"
        ? ((clientX - rect.left) / rect.width) * 100
        : ((clientY - rect.top)  / rect.height) * 100;
      setSplitPct(Math.max(20, Math.min(80, pct)));
    };
    const up = () => { isDragging.current = false; };

    window.addEventListener("mousemove", move as EventListener);
    window.addEventListener("touchmove", move as EventListener, { passive: false });
    window.addEventListener("mouseup",   up);
    window.addEventListener("touchend",  up);
    return () => {
      window.removeEventListener("mousemove", move as EventListener);
      window.removeEventListener("touchmove", move as EventListener);
      window.removeEventListener("mouseup",   up);
      window.removeEventListener("touchend",  up);
    };
  }, [layoutMode]);

  // ── Audio state ───────────────────────────────────────────────────────────
  const [isPlaying,          setIsPlaying]          = useState(false);
  const [isPaused,           setIsPaused]           = useState(false);
  const [instrument,         setInstrumentState]    = useState<InstrumentType>('piano');
  /** sourceIndex da nota ativa no playback — null quando parado. */
  /**
   * sourceIndex(es) da(s) nota(s) ativa(s) no playback. Pode ser um único
   * número (instrumento monofônico) ou um array de dois números (Grand
   * Staff — mão direita e mão esquerda soando simultaneamente no mesmo
   * instante, vindo do scheduler polifônico de scoreAudioPlayer.ts).
   */
  const [playingSourceIndex, setPlayingSourceIndex] = useState<number | number[] | null>(null);
  const [playerBpm,     setPlayerBpm]     = useState(120);
  const [bpmInputValue, setBpmInputValue] = useState("120");
  const [soundOnType,   setSoundOnType]   = useState(true);
  /** Vocaliza o sinal digitado via Web Speech API (SpeechSynthesis). */
  const [speechFeedback, setSpeechFeedback] = useState(false);
  const audioCtxRef = useRef<AudioContext | null>(null);

  // ── Score ─────────────────────────────────────────────────────────────────
  const [parsedElements, setParsedElements] = useState<ParsedElement[]>([]);

  // Armadura de clave ativa — derivada dos elementos parseados em tempo real.
  // Usada por tryPlayFeedback e playSingleNote para aplicar delta correto.
  const activeKeySignature = useMemo<string | null>(() => {
    const ks = parsedElements.find(e => e.type === 'keysignature') as any;
    return ks?.vexKey ?? null;
  }, [parsedElements]);
  const [cursorPos,      setCursorPos]      = useState(0);
  const [selectionRange, setSelectionRange] = useState<[number, number] | null>(null);
  const [scoreWidth,     setScoreWidth]     = useState(800);

  // ── Refs ──────────────────────────────────────────────────────────────────
  const syncSourceRef      = useRef<"braille" | "romano" | "none">("none");
  const brailleTextareaRef = useRef<HTMLTextAreaElement>(null);
  const romanTextareaRef   = useRef<HTMLTextAreaElement>(null);
  const scoreContainerRef  = useRef<HTMLDivElement>(null);
  const fileInputRef       = useRef<HTMLInputElement>(null);
  const midiFileInputRef   = useRef<HTMLInputElement>(null);

  const parseOptions = useMemo<ParseOptions>(() => ({}), []);
  const isExportLocked = false;

  // ── Parse ─────────────────────────────────────────────────────────────────
  // BUG CORRIGIDO: este efeito usava parseBrailleLine()/parseBrailleSelection(),
  // que retornam APENAS os elementos da linha (ou seleção) atual — herdando de
  // linhas anteriores somente contexto invisível (oitava, compasso), nunca as
  // notas em si. Como parsedElements é a ÚNICA fonte que alimenta tanto o
  // ScoreRenderer quanto o playScore, isso fazia a partitura visual e o áudio
  // "esquecerem" tudo antes do cursor sempre que o usuário pressionava Enter
  // ou movia o cursor para uma nova linha.
  //
  // Fix: parsedElements agora SEMPRE reflete o documento INTEIRO via
  // parseBrailleMusic(brailleContent). O cursor/seleção continuam disponíveis
  // (cursorPos, selectionRange) para outras finalidades (ex: startIndex do
  // playScore, mapeamento de clique), mas nunca mais recortam o conteúdo
  // que é renderizado ou reproduzido.
  useEffect(() => {
    if (!brailleContent.trim()) { setParsedElements([]); return; }
    try {
      const result = parseBrailleMusic(brailleContent, parseOptions);
      setParsedElements(result.elements);
    } catch { setParsedElements([]); }
  }, [brailleContent, parseOptions]);

  // ── Sync braille → romano ─────────────────────────────────────────────────
  useEffect(() => {
    if (syncSourceRef.current === "braille") {
      setRomanContent(brailleToRoman(brailleContent));
      syncSourceRef.current = "none";
    }
  }, [brailleContent]);

  // ── Score width via ResizeObserver ────────────────────────────────────────
  useEffect(() => {
    if (!scoreContainerRef.current) return;
    const obs = new ResizeObserver(entries => {
      for (const entry of entries)
        setScoreWidth(Math.max(300, entry.contentRect.width - 8));
    });
    obs.observe(scoreContainerRef.current);
    return () => obs.disconnect();
  }, []);

  // ── Persistência de metadados ─────────────────────────────────────────────
  // Os metadados de UI são salvos junto com o projeto como JSON no contentBraille
  // prefixado com "::META::{...}\n" para não interferir com o conteúdo braille.
  const META_PREFIX = "::META::";

  const encodeWithMeta = useCallback((braille: string): string => {
    const meta: EditorMetadata = {
      brailleFontSize, scoreFontSize, refFontSize, scoreScaleStep, layoutMode, panelOrder, splitPct,
    };
    return `${META_PREFIX}${JSON.stringify(meta)}\n${braille}`;
  }, [brailleFontSize, scoreFontSize, refFontSize, scoreScaleStep, layoutMode, panelOrder, splitPct]);

  const decodeWithMeta = useCallback((raw: string): string => {
    if (!raw.startsWith(META_PREFIX)) return raw;
    const nl = raw.indexOf("\n");
    if (nl < 0) return "";
    try {
      const meta = JSON.parse(raw.slice(META_PREFIX.length, nl)) as EditorMetadata;
      if (meta.brailleFontSize) setBrailleFontSize(meta.brailleFontSize);
      if (meta.scoreFontSize)   setScoreFontSize(meta.scoreFontSize);
      if (meta.scoreScaleStep)  setScoreScaleStep(meta.scoreScaleStep);
      if (meta.refFontSize)     setRefFontSize(meta.refFontSize);
      if (meta.layoutMode)      setLayoutMode(meta.layoutMode);
      if (meta.panelOrder)      setPanelOrder(meta.panelOrder);
      if (meta.splitPct)        setSplitPct(meta.splitPct);
    } catch { /* ignora metadata corrompida */ }
    return raw.slice(nl + 1);
  }, []);

  // ── AudioContext ──────────────────────────────────────────────────────────
  function getAudioCtx(): AudioContext {
    if (!audioCtxRef.current)
      audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    return audioCtxRef.current;
  }
  useEffect(() => { return () => { audioCtxRef.current?.close(); }; }, []);

  // ── Detecção de dispositivo móvel/tablet (largura + user agent) ────────────
  useEffect(() => {
    const checkIsMobile = () => {
      const narrowViewport = window.innerWidth < 1024;
      const mobileUA = /Android|iPhone|iPad|iPod|Mobile|Tablet/i.test(navigator.userAgent);
      setIsMobile(narrowViewport || mobileUA);
    };
    checkIsMobile();
    window.addEventListener("resize", checkIsMobile);
    return () => window.removeEventListener("resize", checkIsMobile);
  }, []);

  // ── Carregar SoundFont SF2 local em background ─────────────────────────────
  // Enquanto carrega (~1-3s): toda digitação usa síntese FM (zero latência).
  // Quando pronto (_sfReady=true): piano real ativo automaticamente sem reiniciar.
  // Rota local /assets/piano.sf2 — funciona offline (PWA-ready), zero CDN.
  useEffect(() => {
    loadSoundFont('/assets/piano.sf2').catch(() => {
      // Falha silenciosa — fallback FM permanece ativo indefinidamente
    });
  }, []);

  // ── Player ────────────────────────────────────────────────────────────────
  const setScoreBpm = setScoreBpmFn;
  useEffect(() => { return () => stopScore(); }, []);

  const handleStop   = useCallback(() => {
    stopScore();
    setIsPlaying(false);
    setIsPaused(false);
    setPlayingSourceIndex(null); // limpar destaque visual ao parar
  }, []);
  const handlePause  = useCallback(() => {
    if (isPlaying && !isPaused) {
      pauseScore();
      setIsPaused(true);
    }
  }, [isPlaying, isPaused]);

  const handlePlay = useCallback(() => {
    if (parsedElements.length === 0) return;
    if (isPlaying && !isPaused) { handleStop(); return; }

    if (isPaused) {
      // Retomar reprodução pausada
      resumeScore();
      setIsPaused(false);
      return;
    }

    setScoreBpm(playerBpm);
    // Nova assinatura: playScore(elements, bpm, startIndex, onHighlight?)
    // onDone removido — o player encerra internamente via _finishTimer.
    // Calcular duração total para desativar o botão automaticamente.
    // cursorPos (posição do cursor no texto Braille) é mapeado para
    // o sourceIndex do elemento correspondente via parsedElements.
    // playScore percorre todos os elementos ANTES do startIndex para
    // preservar armadura de clave e acidentes do compasso vigentes —
    // a nota iniciada soa com o contexto harmônico correto.
    const activeSourceIndex = (() => {
      // Encontrar o ParsedNote com sourceIndex mais próximo do cursorPos
      const notes = parsedElements.filter(
        e => e.type === 'note' || e.type === 'rest'
      );
      if (notes.length === 0) return 0;
      // Usar o maior sourceIndex que não ultrapasse cursorPos
      let best = 0;
      for (const el of notes) {
        const si = (el as any).sourceIndex as number ?? 0;
        if (si <= cursorPos && si >= best) best = si;
      }
      return best;
    })();
    // Callback onElementHighlight: sincroniza destaque visual (nota + texto Braille)
    // com o scheduler de áudio. Chamado a cada nota reproduzida.
    playScore(parsedElements, playerBpm, activeSourceIndex, (srcIdx) => {
      setPlayingSourceIndex(srcIdx);
    });
    setIsPlaying(true);
    setIsPaused(false);

    // Estimar duração total (beats / bpm × 60s × 1000ms) + margem de 500ms
    const totalBeats = parsedElements.reduce((acc, el) => {
      if (el.type !== 'note' && el.type !== 'rest') return acc;
      const dur = (el as any).duration as string ?? 'q';
      const dot  = (el as any).dotted  as boolean ?? false;
      const dot2 = (el as any).dotted2 as boolean ?? false;
      const PULSES: Record<string, number> = {
        w: 4, h: 2, q: 1, '8': 0.5, '16': 0.25, '32': 0.125, '64': 0.0625, '128': 0.03125,
      };
      const pulses = (PULSES[dur] ?? 1) * (dot2 ? 1.75 : dot ? 1.5 : 1);
      return acc + pulses;
    }, 0);
    const durationMs = (totalBeats / playerBpm) * 60 * 1000 + 500;

    const timerId = setTimeout(() => {
      setIsPlaying(false);
      setIsPaused(false);
      setPlayingSourceIndex(null); // limpar destaque ao terminar
    }, durationMs);

    // Limpar timer se o usuário parar manualmente
    return () => clearTimeout(timerId);
  }, [parsedElements, isPlaying, isPaused, playerBpm, handleStop, setScoreBpm]);

  const handleBpmInputChange = useCallback((raw: string) => setBpmInputValue(raw), []);
  const handleInstrumentChange = useCallback((inst: InstrumentType) => {
    setInstrument(inst);
    setInstrumentState(inst);
  }, []);

  const handleBpmCommit = useCallback((raw: string) => {
    const parsed  = parseInt(raw, 10);
    const clamped = Number.isNaN(parsed) ? 120 : Math.max(20, Math.min(400, parsed));
    setBpmInputValue(String(clamped));
    setPlayerBpm(clamped);
    setScoreBpm(clamped);
  }, [setScoreBpm]);

  // ── Feedback sonoro ───────────────────────────────────────────────────────
  /**
   * Feedback em tempo real ao digitar: toca a nota correspondente (áudio) e/ou
   * fala o sinal digitado (Web Speech API), conforme os toggles ativos.
   *
   * CORREÇÃO DE CONDIÇÃO DE CORRIDA: a versão anterior parseava o `char`
   * isolado como fallback quando o pitch não batia com o `brailleContent`
   * (desatualizado, vindo do closure do React antes do re-render). Como o
   * parse isolado de um único caractere não tem contexto de oitava anterior,
   * a inferência de oitava caía sempre no valor padrão — travando o som na
   * 4ª oitava de forma incorreta sempre que a nota mudava de altura.
   *
   * Agora `insertCharAtCursor` calcula o texto COMPLETO E JÁ ATUALIZADO
   * (`fullText`) ANTES de chamar esta função, e o parseia UMA ÚNICA VEZ.
   * A última nota desse parse é sempre a fonte de verdade — nunca há fallback
   * para um parse isolado do caractere, eliminando a condição de corrida e o
   * bug de oitava por completo.
   *
   * @param fullText       — Texto Braille completo, já incluindo o caractere
   *                         recém-inserido (calculado localmente, não vindo
   *                         do estado React ainda não commitado).
   * @param insertedChar   — O caractere específico que acabou de ser digitado
   *                         (usado para a fala, que descreve a CÉLULA digitada,
   *                         não necessariamente a última nota completa).
   * @param insertionStart — Posição (índice) onde o caractere foi inserido —
   *                         usado para garantir que só toquemos som se uma
   *                         nota REALMENTE nova foi formada nesta digitação
   *                         (evita repetir uma nota antiga quando o caractere
   *                         digitado foi apenas um prefixo/modificador ainda
   *                         incompleto, como um sinal de oitava isolado).
   */
  const tryPlayFeedback = useCallback((
    fullText:       string,
    insertedChar:   string,
    insertionStart: number,
  ) => {
    // ── FALA: sempre baseada no caractere digitado, independente do áudio ────
    if (speechFeedback) {
      speakBrailleFeedback(insertedChar);
    }

    if (!soundOnType) return;

    try {
      // ── Fonte ÚNICA de verdade: o texto completo e atualizado ─────────────
      // Nunca há fallback para parse isolado do caractere — elimina o bug de
      // oitava travada e a condição de corrida com o estado React.
      const fullResult = parseBrailleMusic(fullText, parseOptions);
      const allNotes    = fullResult.elements.filter(e => e.type === "note") as ParsedNote[];
      const noteEl      = allNotes.length > 0 ? allNotes[allNotes.length - 1] : undefined;

      // Só tocar se a última nota corresponde a algo formado NESTA digitação
      // (sourceIndex na posição de inserção ou depois) — se o caractere
      // digitado foi apenas um prefixo/modificador (ex: sinal de oitava
      // isolado aguardando a próxima nota), não há som novo a tocar ainda.
      if (!noteEl || (noteEl.sourceIndex ?? -1) < insertionStart) return;

      // ── MIDI com acidente resolvido ───────────────────────────────────────
      // Prioridade: acidente explícito da nota > armadura de clave > natural (0)
      const PITCH_CLASS: Record<string, number> = { C:0, D:2, E:4, F:5, G:7, A:9, B:11 };
      const ACC_DELTA: Record<string, number>    = {
        sharp: 1, flat: -1, natural: 0, 'double-sharp': 2, 'double-flat': -2,
      };
      const KEY_SIG_DELTAS: Record<string, Record<string, number>> = {
        'G':  { F: 1 },
        'D':  { F: 1, C: 1 },
        'A':  { F: 1, C: 1, G: 1 },
        'E':  { F: 1, C: 1, G: 1, D: 1 },
        'B':  { F: 1, C: 1, G: 1, D: 1, A: 1 },
        'F#': { F: 1, C: 1, G: 1, D: 1, A: 1, E: 1 },
        'C#': { F: 1, C: 1, G: 1, D: 1, A: 1, E: 1, B: 1 },
        'F':  { B: -1 },
        'Bb': { B: -1, E: -1 },
        'Eb': { B: -1, E: -1, A: -1 },
        'Ab': { B: -1, E: -1, A: -1, D: -1 },
        'Db': { B: -1, E: -1, A: -1, D: -1, G: -1 },
        'Gb': { B: -1, E: -1, A: -1, D: -1, G: -1, C: -1 },
        'Cb': { B: -1, E: -1, A: -1, D: -1, G: -1, C: -1, F: -1 },
      };
      const baseMidi = 12 * (noteEl.octave + 1) + (PITCH_CLASS[noteEl.pitch] ?? 0);
      const accDelta = noteEl.accidental !== undefined
        ? (ACC_DELTA[noteEl.accidental] ?? 0)
        : ((activeKeySignature ? (KEY_SIG_DELTAS[activeKeySignature]?.[noteEl.pitch] ?? 0) : 0));
      const midi     = baseMidi + accDelta;

      const ctx = getAudioCtx();
      const t0  = ctx.currentTime + 0.01;

      loadPianoSample(ctx, midi).then(result => {
        if (result) {
          playPianoBuffer(ctx, result.buffer, midi, result.closestMidi, t0, 0.28, {
            velocity:    0.7,
            staccato:    !!noteEl.staccato,
            isTie:       (noteEl as any).tieRole === 'end',
            tieDuration: noteEl.tieDuration,
            bpm:         playerBpm,
          });
        } else {
          playFallbackOscillator(ctx, midi, t0, 0.28, !!noteEl.staccato, 0.3);
        }
      });
    } catch { /* feedback é best-effort — falha silenciosa */ }
  }, [soundOnType, speechFeedback, parseOptions, playerBpm, activeKeySignature]);

  // ── Save ──────────────────────────────────────────────────────────────────
  const handleSave = useCallback(() => {
    if (!currentProjectId) return;
    setSaveStatus("saving");
    updateMutation.mutate(
      { id: currentProjectId, contentBraille: encodeWithMeta(brailleContent), title: projectTitle },
      {
        onSuccess: () => { setSaveStatus("saved"); utils.editor.list.invalidate(); },
        onError:   () => setSaveStatus("unsaved"),
      }
    );
  }, [currentProjectId, brailleContent, projectTitle, updateMutation, utils, encodeWithMeta]);

  useEffect(() => {
    if (currentProjectId && brailleContent) setSaveStatus("unsaved");
  }, [brailleContent, currentProjectId]);

  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (saveStatus === "unsaved" && currentProjectId) {
        handleSave(); e.preventDefault(); e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [saveStatus, currentProjectId, handleSave]);

  // ── Undo / Redo / Ctrl+S ─────────────────────────────────────────────────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const isMac = navigator.platform.toUpperCase().includes("MAC");
      const ctrl  = isMac ? e.metaKey : e.ctrlKey;
      if (!ctrl) return;
      if (e.key === "z" && !e.shiftKey) {
        e.preventDefault();
        if (undoStack.current.length > 0) {
          const prev = undoStack.current.pop()!;
          redoStack.current.push(brailleContent);
          isUndoRedo.current = true;
          setBrailleContent(prev);
        }
      }
      if (e.key === "y" || (e.key === "z" && e.shiftKey)) {
        e.preventDefault();
        if (redoStack.current.length > 0) {
          const next = redoStack.current.pop()!;
          undoStack.current.push(brailleContent);
          isUndoRedo.current = true;
          setBrailleContent(next);
        }
      }
      if (e.key === "s") { e.preventDefault(); handleSave(); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [brailleContent, handleSave]);

  // ── Cursor tracking ───────────────────────────────────────────────────────
  const updateCursor = useCallback((ta: HTMLTextAreaElement) => {
    const s = ta.selectionStart, e = ta.selectionEnd;
    setCursorPos(s);
    setSelectionRange(s !== e ? [s, e] : null);
  }, []);

  // ── Insert at cursor ──────────────────────────────────────────────────────
  const insertCharAtCursor = useCallback((char: string) => {
    const ta = brailleTextareaRef.current;
    if (ta) {
      const start  = ta.selectionStart;
      const end    = ta.selectionEnd;
      const newPos = start + char.length;
      ta.focus();
      const newContent = brailleContent.slice(0, start) + char + brailleContent.slice(end);
      if (!isUndoRedo.current) {
        undoStack.current.push(brailleContent);
        if (undoStack.current.length > 100) undoStack.current.shift();
        redoStack.current = [];
      }
      isUndoRedo.current    = false;
      syncSourceRef.current = "braille";
      setBrailleContent(newContent);
      setCursorPos(newPos);
      setSelectionRange(null);
      requestAnimationFrame(() => {
        if (brailleTextareaRef.current) {
          brailleTextareaRef.current.selectionStart = newPos;
          brailleTextareaRef.current.selectionEnd   = newPos;
          brailleTextareaRef.current.focus();
        }
      });
      // Passar o texto COMPLETO já atualizado (newContent) — não o estado
      // React brailleContent, que só será commitado no próximo render —
      // elimina a condição de corrida na resolução de oitava do feedback.
      tryPlayFeedback(newContent, char, start);
    } else {
      syncSourceRef.current = "braille";
      const fallbackContent = brailleContent + char;
      setBrailleContent(prev => prev + char);
      tryPlayFeedback(fallbackContent, char, brailleContent.length);
    }
  }, [brailleContent, tryPlayFeedback]);

  const handleBrailleChange = useCallback((newContent: string) => {
    if (!isUndoRedo.current) {
      undoStack.current.push(brailleContent);
      if (undoStack.current.length > 100) undoStack.current.shift();
      redoStack.current = [];
    }
    isUndoRedo.current    = false;
    syncSourceRef.current = "braille";
    setBrailleContent(newContent);
  }, [brailleContent]);

  // Modo romano: textarea comum, sync braille → roman
  const handleRomanChange = useCallback((newContent: string) => {
    setRomanContent(newContent);
    // Reversão: tentar converter romano de volta para braille
    // (implementação básica — pode ser expandida)
  }, []);

  const insertSpace    = useCallback(() => insertCharAtCursor(" "),  [insertCharAtCursor]);
  const insertNewline  = useCallback(() => insertCharAtCursor("\n"), [insertCharAtCursor]);
  const handleBackspace = useCallback(() => {
    const ta = brailleTextareaRef.current;
    if (ta) {
      const s = ta.selectionStart, e = ta.selectionEnd;
      if (s !== e) {
        const nc = brailleContent.slice(0, s) + brailleContent.slice(e);
        syncSourceRef.current = "braille";
        setBrailleContent(nc); setCursorPos(s); setSelectionRange(null);
        requestAnimationFrame(() => { ta.selectionStart = ta.selectionEnd = s; ta.focus(); });
      } else if (s > 0) {
        const nc = brailleContent.slice(0, s - 1) + brailleContent.slice(s);
        syncSourceRef.current = "braille";
        setBrailleContent(nc); setCursorPos(s - 1); setSelectionRange(null);
        requestAnimationFrame(() => { ta.selectionStart = ta.selectionEnd = s - 1; ta.focus(); });
      }
    } else {
      syncSourceRef.current = "braille";
      setBrailleContent(prev => prev.slice(0, -1));
    }
  }, [brailleContent]);

  // ── Export ────────────────────────────────────────────────────────────────
  const handleExportBRF = useCallback(async () => {
    if (!currentProjectId) return;
    try {
      const result = await exportMutation.mutateAsync({ id: currentProjectId, format: "brf" });
      const blob   = new Blob([result.content], { type: "text/plain;charset=utf-8" });
      const url    = URL.createObjectURL(blob);
      const a      = document.createElement("a");
      a.href = url; a.download = result.filename;
      document.body.appendChild(a); a.click();
      document.body.removeChild(a); URL.revokeObjectURL(url);
      toast.success("Exportado como BRF");
    } catch { toast.error("Erro ao exportar BRF"); }
  }, [currentProjectId, exportMutation]);

  /**
   * Exporta os elementos parseados para MusicXML e dispara o download.
   * Usa exportToMusicXML(elements) diretamente — sem reparsear o texto.
   */
  const handleExportMusicXML = useCallback(() => {
    if (parsedElements.length === 0) {
      toast.error("Nada para exportar — digite alguma música primeiro");
      return;
    }
    try {
      const xml  = exportToMusicXML(parsedElements);
      const blob = new Blob([xml], { type: "application/vnd.recordare.musicxml+xml" });
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement("a");
      const safeName = (projectTitle || "partitura").replace(/[^\w\-]+/g, "_");
      a.href = url; a.download = `${safeName}.musicxml`;
      document.body.appendChild(a); a.click();
      document.body.removeChild(a); URL.revokeObjectURL(url);
      toast.success("Exportado como MusicXML");
    } catch (err: any) {
      toast.error(err?.message || "Erro ao exportar MusicXML");
    }
  }, [parsedElements, projectTitle]);

  /**
   * Imprime a partitura via window.print() nativo. A folha de estilos
   * @media print (injetada globalmente, ver <style> no final do componente)
   * isola o container do VexFlow (#vexflow-print-area), ocultando o resto
   * da interface (editor Braille, teclado Perkins, barra de ferramentas).
   */
  const handleExportPDF = useCallback(() => {
    if (isExportLocked) { toast.error("Exportar PDF requer plano PRO"); return; }
    if (parsedElements.length === 0) {
      toast.error("Nada para imprimir — digite alguma música primeiro");
      return;
    }
    window.print();
  }, [isExportLocked, parsedElements]);

  const handleExportAudio = useCallback(() => {
    if (isExportLocked) { toast.error("Exportar áudio requer plano PRO"); return; }
    toast.info("Exportação de áudio em desenvolvimento");
  }, [isExportLocked]);

  // ── Import ────────────────────────────────────────────────────────────────
  const handleImportFile = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const fileName = file.name.toLowerCase();
    const isBrf    = fileName.endsWith(".brf");
    const isXML    = fileName.endsWith(".musicxml") || fileName.endsWith(".xml") || fileName.endsWith(".mxl");
    if (!isBrf && !isXML) {
      toast.error("Formato não suportado. Use .brf ou .musicxml");
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }
    setImporting(true);
    try {
      const text = await file.text();
      if (isBrf) {
        const fmt    = detectBrailleFormat(text);
        let braille  = (fmt === "ascii" || fmt === "mixed") ? asciiToUnicodeBraille(text) : text;
        braille      = decodeWithMeta(braille.replace(/\n{3,}/g, "\n\n").trim());
        if (!braille) { toast.error("BRF vazio"); return; }
        if (!currentProjectId) {
          const title = file.name.replace(/\.brf$/i, "");
          const proj  = await createMutation.mutateAsync({ title, language: "pt", contentBraille: encodeWithMeta(braille) });
          setCurrentProjectId(proj.id); setProjectTitle(title);
          syncSourceRef.current = "braille";
          setBrailleContent(braille); setRomanContent(brailleToRoman(braille));
          setShowProjects(false); utils.editor.list.invalidate();
        } else {
          syncSourceRef.current = "braille";
          setBrailleContent(braille); setRomanContent(brailleToRoman(braille));
        }
        toast.success(`BRF importado: ${file.name}`);
      } else {
        if (!currentProjectId) {
          const title = file.name.replace(/\.(musicxml|xml|mxl)$/i, "");
          const proj  = await createMutation.mutateAsync({ title, language: "pt" });
          setCurrentProjectId(proj.id); setProjectTitle(title);
          setShowProjects(false); utils.editor.list.invalidate();
          const res     = await importMusicXMLMutation.mutateAsync({ projectId: proj.id, xmlContent: text, fileName: file.name });
          if (res.metadata?.title) setProjectTitle(res.metadata.title);
          const updated = await utils.editor.get.fetch({ id: proj.id });
          const braille = decodeWithMeta(updated?.contentBraille || "");
          syncSourceRef.current = "braille";
          setBrailleContent(braille); setRomanContent(brailleToRoman(braille));
          toast.success(`MusicXML importado: ${res.metadata?.notesCount || 0} notas`);
        } else {
          const res     = await importMusicXMLMutation.mutateAsync({ projectId: currentProjectId, xmlContent: text, fileName: file.name });
          if (res.metadata?.title) setProjectTitle(res.metadata.title);
          const updated = await utils.editor.get.fetch({ id: currentProjectId });
          const braille = decodeWithMeta(updated?.contentBraille || "");
          syncSourceRef.current = "braille";
          setBrailleContent(braille); setRomanContent(brailleToRoman(braille));
          utils.editor.list.invalidate();
          toast.success(`MusicXML importado: ${res.metadata?.notesCount || 0} notas`);
        }
      }
    } catch (err: any) {
      toast.error(err?.message || "Erro ao importar");
    } finally {
      setImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }, [currentProjectId, createMutation, importMusicXMLMutation, utils, encodeWithMeta, decodeWithMeta]);

  const handleImportMidi = useCallback(() => {
    toast.info("Importação de MIDI em desenvolvimento");
  }, []);

  // ── Project handlers ──────────────────────────────────────────────────────
  const handleCreateProject = useCallback(async () => {
    const title = "Novo Projeto " + new Date().toLocaleDateString("pt-BR");
    try {
      const proj = await createMutation.mutateAsync({ title, language: "pt" });
      setCurrentProjectId(proj.id); setProjectTitle(title);
      setBrailleContent(""); setRomanContent("");
      setShowProjects(false); utils.editor.list.invalidate();
      toast.success("Projeto criado!");
    } catch { toast.error("Erro ao criar projeto"); }
  }, [createMutation, utils]);

  const handleOpenProject = useCallback((proj: { id: number; title: string; contentBraille: string | null }) => {
    setCurrentProjectId(proj.id); setProjectTitle(proj.title);
    const raw    = proj.contentBraille || "";
    const braille = decodeWithMeta(raw);
    syncSourceRef.current = "braille";
    setBrailleContent(braille); setRomanContent(brailleToRoman(braille));
    setShowProjects(false); setSaveStatus("saved");
    setCursorPos(0); setSelectionRange(null);
  }, [decodeWithMeta]);

  const handleDeleteProject = useCallback(async (id: number) => {
    if (!confirm("Excluir este projeto?")) return;
    try {
      await deleteMutation.mutateAsync({ id });
      if (currentProjectId === id) {
        setCurrentProjectId(null); setBrailleContent(""); setRomanContent(""); setShowProjects(true);
      }
      utils.editor.list.invalidate(); toast.success("Projeto excluído");
    } catch { toast.error("Erro ao excluir"); }
  }, [deleteMutation, currentProjectId, utils]);

  // ─── LOADING / AUTH ────────────────────────────────────────────────────────

  if (authLoading) {
    return (
      <SiteLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      </SiteLayout>
    );
  }

  if (!user) {
    return (
      <SiteLayout>
        <div className="container max-w-2xl py-20 text-center space-y-6">
          <Music className="w-16 h-16 mx-auto text-primary" />
          <h1 className="text-3xl font-bold">Editor de Musicografia Braille</h1>
          <p className="text-muted-foreground text-lg">
            Escreva em Braille musical e veja a partitura aparecer em tempo real. Faça login para começar.
          </p>
          <Button asChild size="lg"><a href={getLoginUrl()}>Fazer Login</a></Button>
        </div>
      </SiteLayout>
    );
  }

  // ─── PROJECT LIST ──────────────────────────────────────────────────────────

  if (showProjects) {
    return (
      <SiteLayout>
        <div className="container max-w-4xl py-10 space-y-6">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <a href="/" className="text-muted-foreground hover:text-foreground transition-colors">
                <ArrowLeft className="w-5 h-5" />
              </a>
              <h1 className="text-2xl font-bold">Editor de Musicografia Braille</h1>
            </div>
            <div className="flex items-center gap-2">
              <Dropdown
                label="Importar"
                icon={<Upload className="w-3.5 h-3.5" />}
                items={[
                  { label: "MusicXML (.xml / .musicxml)", icon: <FileText className="w-3 h-3" />, onClick: () => fileInputRef.current?.click() },
                  { label: "MIDI (.mid)",                  icon: <Music    className="w-3 h-3" />, onClick: handleImportMidi },
                ]}
              />
              <Button onClick={handleCreateProject} disabled={createMutation.isPending}>
                <Plus className="w-4 h-4 mr-2" />Novo Projeto
              </Button>
            </div>
          </div>

          <input ref={fileInputRef}     type="file" accept=".brf,.musicxml,.xml,.mxl" onChange={handleImportFile} className="hidden" />
          <input ref={midiFileInputRef} type="file" accept=".mid,.midi"               onChange={() => handleImportMidi()} className="hidden" />

          <p className="text-muted-foreground text-sm">
            Escreva em Braille musical com o teclado Perkins (F,D,S / J,K,L) ou importe arquivos BRF e MusicXML.
          </p>

          {projectsQuery.isLoading ? (
            <div className="flex justify-center py-10">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
          ) : projectsQuery.data?.length ? (
            <div className="grid gap-3">
              {projectsQuery.data.map((project: any) => (
                <Card key={project.id} className="cursor-pointer hover:border-primary/50 transition-colors" onClick={() => handleOpenProject(project)}>
                  <CardContent className="flex items-center justify-between py-4">
                    <div className="flex items-center gap-3 min-w-0">
                      <FileText className="w-5 h-5 text-muted-foreground shrink-0" />
                      <div className="min-w-0">
                        <p className="font-medium truncate">{project.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {project.contentBraille ? `${project.contentBraille.length} chars` : "Vazio"}
                          {" · "}{new Date(project.updatedAt).toLocaleDateString("pt-BR")}
                        </p>
                      </div>
                    </div>
                    <Button variant="ghost" size="icon" onClick={e => { e.stopPropagation(); handleDeleteProject(project.id); }} aria-label="Excluir">
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="py-12 text-center">
                <Music className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">Nenhum projeto ainda. Crie um novo!</p>
              </CardContent>
            </Card>
          )}
        </div>
      </SiteLayout>
    );
  }

  // ─── EDITOR VIEW ──────────────────────────────────────────────────────────

  const lines       = brailleContent.split("\n");
  const fullParse   = parseBrailleMusic(brailleContent, parseOptions);
  const noteCount   = fullParse.elements.filter(e => e.type === "note").length;
  const barCount    = fullParse.elements.filter(e => e.type === "barline").length + 1;

  let charCount = 0, currentLineNum = 1;
  for (let li = 0; li < lines.length; li++) {
    if (cursorPos <= charCount + lines[li].length) { currentLineNum = li + 1; break; }
    charCount += lines[li].length + 1;
  }

  // ── Painel da Partitura (VexFlow) ─────────────────────────────────────────
  const scorePanel = (
    <div className="flex flex-col h-full min-h-0 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm mx-1">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-border bg-card/50 flex-wrap gap-1 shrink-0">
        <span className="text-sm font-semibold flex items-center gap-1.5 text-slate-800 dark:text-slate-100">
          <Music className="w-4 h-4 text-primary" />
          Partitura
          <span className="text-[10px] font-normal text-muted-foreground opacity-80">{noteCount} notas · {barCount} compassos</span>
        </span>
        {/* Seletor de escala VexFlow: 1=menor (0.5) … 6=maior (1.0), padrão 4=0.8 */}
        <div className="flex items-center gap-1.5" title="Escala da partitura VexFlow">
          <span className="text-[9px] text-muted-foreground hidden sm:inline">Escala</span>
          <div className="flex items-center gap-0.5">
            {([1,2,3,4,5,6] as const).map(step => (
              <button
                key={step}
                onClick={() => setScoreScaleStep(step)}
                className={`w-5 h-5 text-[9px] rounded transition-colors font-mono ${
                  scoreScaleStep === step
                    ? "bg-primary text-primary-foreground font-bold"
                    : "bg-muted text-muted-foreground hover:bg-accent"
                }`}
                title={`Escala ${SCALE_STEPS[step]} (${step === 4 ? "padrão" : ""})`}
                aria-label={`Escala ${SCALE_STEPS[step]}`}
                aria-pressed={scoreScaleStep === step}
              >
                {step}
              </button>
            ))}
          </div>
        </div>
      </div>
      {/* Área da partitura */}
      <div ref={scoreContainerRef} id="vexflow-print-area" className="flex-1 overflow-auto p-1 min-h-[140px]">
        {parsedElements.length > 0 ? (
          <ScoreRenderer
            elements={parsedElements}
            width={scoreWidth}
            height={layoutMode === "vertical" ? 160 : 200}
            scaleRatio={scoreScaleRatio}
            activeSourceIndex={playingSourceIndex}
            onMeasureClick={(srcIdx) => {
              const ta = brailleTextareaRef.current;
              if (!ta) return;
              ta.focus();
              ta.setSelectionRange(srcIdx, srcIdx);
            }}
          />
        ) : (
          <div className="flex flex-col items-center justify-center h-full min-h-[120px] text-muted-foreground">
            <Music className="w-10 h-10 mb-2 opacity-20" />
            <p className="text-xs text-center">Digite em Braille para ver a partitura</p>
          </div>
        )}
      </div>
    </div>
  );

  // ── Painel do Editor Braille ───────────────────────────────────────────────
  const braillePanel = (
    <div className="flex flex-col h-full min-h-0 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm mx-1">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-border bg-card/50 flex-wrap gap-1 shrink-0">
        <span className="text-sm font-semibold flex items-center gap-1.5 text-slate-800 dark:text-slate-100">
          <Keyboard className="w-4 h-4 text-primary" />
          {inputMode === "braille" ? "Braille Musical" : "Notação Romana"}
          <span className="text-[10px] font-normal text-muted-foreground opacity-80">Linha {currentLineNum}</span>
        </span>
        <div className="flex items-center gap-1.5 flex-wrap">
          {/* Seletor de tamanho do Braille */}
          <FontSizeControl label="Braille" value={brailleFontSize} onChange={setBrailleFontSize} min={12} max={60} step={2} />
          {/* Som ao digitar */}
          <label className="flex items-center gap-1 cursor-pointer" title={soundOnType ? "Desativar feedback sonoro" : "Ativar feedback sonoro"}>
            {soundOnType
              ? <Volume2 className="w-3.5 h-3.5 text-primary" />
              : <VolumeX className="w-3.5 h-3.5 text-muted-foreground" />}
            <div className="relative" onClick={() => setSoundOnType(v => !v)}>
              <div className={`w-7 h-4 rounded-full transition-colors ${soundOnType ? "bg-primary" : "bg-muted-foreground/30"}`} />
              <div className={`absolute top-0.5 w-3 h-3 rounded-full bg-white shadow transition-transform ${soundOnType ? "translate-x-3.5" : "translate-x-0.5"}`} />
            </div>
          </label>
          {/* Vocalizar sinal ao digitar (Web Speech API) */}
          <button
            type="button"
            onClick={() => setSpeechFeedback(v => !v)}
            className={`p-1 rounded transition-colors ${
              speechFeedback ? "text-primary" : "text-muted-foreground hover:text-foreground"
            }`}
            title="Vocalizar sinal ao digitar"
            aria-label="Vocalizar sinal ao digitar"
            aria-pressed={speechFeedback}
          >
            <MessageSquareText className="w-3.5 h-3.5" />
          </button>
          {/* Toggle Abc — troca entre modo Braille e Romano */}
          <button
            onClick={() => setInputMode(v => v === "braille" ? "romano" : "braille")}
            className={`text-[10px] px-2 py-0.5 rounded-md border transition-colors ${
              inputMode === "romano"
                ? "bg-primary text-primary-foreground border-primary"
                : "border-border text-muted-foreground hover:text-foreground hover:border-primary/50"
            }`}
            title={inputMode === "braille" ? "Mudar para entrada Romana (teclado padrão)" : "Mudar para entrada Braille (Perkins)"}
          >
            Abc
          </button>
          {/* Botão de ativação do overlay Perkins físico — SOMENTE em mobile/tablet.
              Em desktop este botão é removido do fluxo de renderização (não apenas
              escondido via CSS), evitando que listeners de touch fiquem registrados
              desnecessariamente e possam congelar a interface. */}
          {isMobile && inputMode === "braille" && (
            <button
              type="button"
              inputMode="none"
              onClick={(e) => { e.preventDefault(); setIsMobileScreenInputMode(v => !v); }}
              className={`text-[10px] px-2 py-0.5 rounded-md border transition-colors ${
                isMobileScreenInputMode
                  ? "bg-primary text-primary-foreground border-primary"
                  : "border-border text-muted-foreground hover:text-foreground hover:border-primary/50"
              }`}
              title="Modo Perkins físico (mobile paisagem)"
              aria-label="Ativar modo Perkins físico para mobile em paisagem"
            >
              ⌨︎ Físico
            </button>
          )}
          {/* Mostrar romano (sobreposição) quando em modo braille */}
          {inputMode === "braille" && (
            <button
              onClick={() => setShowRomano(v => !v)}
              className={`text-[9px] px-1.5 py-0.5 rounded transition-colors ${showRomano ? "bg-primary/20 text-primary" : "text-muted-foreground hover:text-foreground"}`}
              title="Mostrar mapeamento romano abaixo"
              aria-pressed={showRomano}
            >
              ~Abc
            </button>
          )}
          {/* Mostrar descrição abreviada sob cada célula Braille.
              Este modo também é a via primária de acessibilidade detalhada:
              cada célula recebe tabIndex, role="img" e aria-label semântico
              completo (ex: "Nota Mi da 4ª Oitava com Ligadura de Duração"),
              navegável célula-a-célula por leitores de tela (JAWS/NVDA). */}
          {inputMode === "braille" && (
            <button
              onClick={() => setShowCellDescriptions(v => !v)}
              className={`text-[9px] px-1.5 py-0.5 rounded transition-colors ${showCellDescriptions ? "bg-primary/20 text-primary" : "text-muted-foreground hover:text-foreground"}`}
              title="Mostrar descrição abreviada sob cada célula (navegação acessível célula-a-célula)"
              aria-label="Alternar modo de descrição de células — navegação detalhada para leitores de tela"
              aria-pressed={showCellDescriptions}
            >
              ~Desc
            </button>
          )}
          {/* Referência */}
          <button
            onClick={() => setShowReference(v => !v)}
            className={`p-1 rounded transition-colors ${showReference ? "text-primary" : "text-muted-foreground hover:text-foreground"}`}
            title="Referência rápida de símbolos"
          >
            <Info className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Teclado Perkins virtual — só em modo braille */}
      {inputMode === "braille" && (
        <div className="px-2 py-1 border-b border-border/50 shrink-0">
          <PerkinsKeyboard
            onChar={insertCharAtCursor}
            onSpace={insertSpace}
            onBackspace={handleBackspace}
            onNewline={insertNewline}
            brailleTextareaRef={brailleTextareaRef}
            isMobileScreenInputMode={isMobileScreenInputMode}
          />
        </div>
      )}

      {/* Referência rápida (colapsável) */}
      {showReference && (
        <div className="px-3 py-2 border-b border-border/50 bg-muted/20 shrink-0">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">Referência Rápida</span>
            <FontSizeControl label="Símbolos" value={refFontSize} onChange={setRefFontSize} min={14} max={48} step={2} />
          </div>
          <QuickReferencePanel onInsert={insertCharAtCursor} fontSize={refFontSize} />
        </div>
      )}

      {/* Área de texto — muda conforme o modo */}
      {inputMode === "braille" ? (
        showCellDescriptions ? (
          // ── Modo ~Desc: renderização estruturada célula-a-célula ──────────
          // Cada caractere Braille é encapsulado em um container vertical com
          // o símbolo em cima e a descrição abreviada embaixo. O textarea real
          // permanece funcional, sobreposto de forma invisível para capturar
          // digitação, cursor e seleção sem duplicar a lógica de edição.
          <div className="relative flex-1 min-h-[120px]">
            <div
              className="w-full h-full p-3 overflow-auto"
              aria-hidden="true"
            >
              {brailleContent.split("\n").map((line, lineIdx) => {
                // Calcular o offset absoluto do início desta linha no brailleContent
                const lineOffset = brailleContent
                  .split("\n")
                  .slice(0, lineIdx)
                  .reduce((acc, l) => acc + l.length + 1, 0);

                return (
                  <div key={lineIdx} className="flex flex-wrap items-start gap-0.5 mb-1">
                    {Array.from(line).map((char, charIdx) => {
                      const absoluteIdx = lineOffset + charIdx;
                      const isActive    = Array.isArray(playingSourceIndex)
                        ? playingSourceIndex.includes(absoluteIdx)
                        : absoluteIdx === playingSourceIndex;
                      const desc        = abbreviateCellDescription(char);
                      // Localizar o ParsedElement real desta posição para enriquecer
                      // a descrição semântica com contexto (ligadura ativa, oitava
                      // resolvida, acidente) que o caractere isolado não revela.
                      const contextEl = parsedElements.find(
                        e => (e as any).sourceIndex === absoluteIdx
                      );
                      const semanticLabel = getBrailleSemanticDescription(char, contextEl, parsedElements);
                      return (
                        <div
                          key={charIdx}
                          tabIndex={0}
                          role="img"
                          aria-label={semanticLabel}
                          className={`inline-flex flex-col items-center text-center select-none rounded-sm transition-colors focus:outline-none focus:ring-2 focus:ring-primary/60 ${
                            isActive ? "bg-blue-200 dark:bg-blue-900/50" : ""
                          }`}
                          style={{ minWidth: Math.max(brailleFontSize * 0.6, 18) }}
                          title={semanticLabel}
                        >
                          <span style={{ fontSize: brailleFontSize }} className="leading-none">
                            {char === " " ? "\u00A0" : char}
                          </span>
                          <span
                            style={{ fontSize: Math.max(8, Math.round(brailleFontSize * 0.28)) }}
                            className="text-muted-foreground leading-tight mt-0.5 whitespace-nowrap"
                          >
                            {desc}
                          </span>
                        </div>
                      );
                    })}
                    {line.length === 0 && <span className="opacity-0 select-none">&nbsp;</span>}
                  </div>
                );
              })}
            </div>
            {/* Textarea real — invisível mas funcional, captura toda a edição */}
            <textarea
              ref={brailleTextareaRef}
              value={brailleContent}
              onChange={e => handleBrailleChange(e.target.value)}
              onSelect={e => updateCursor(e.currentTarget)}
              onClick={e  => updateCursor(e.currentTarget)}
              onKeyUp={e  => updateCursor(e.currentTarget)}
              style={{ fontSize: brailleFontSize, color: "transparent", caretColor: "transparent" }}
              className="absolute inset-0 w-full h-full p-3 font-mono leading-relaxed resize-none focus:outline-none bg-transparent opacity-0 z-20"
              placeholder="⠐⠹⠱⠫⠻⠳⠪⠺"
              aria-label="Área de entrada em Braille musical — modo descrição de células"
              spellCheck={false}
            />
          </div>
        ) : (
          <div className="relative flex-1 min-h-[120px]">
            {/* Camada de destaque visual: sobrepõe o textarea com spans coloridos
                na posição da nota ativa no playback (playingSourceIndex).
                Visível apenas durante a reprodução de áudio.
                CRÍTICO: classes estruturais/tipográficas IDÊNTICAS ao textarea
                abaixo (padding, fonte, line-height, wrapping) — qualquer diferença
                causa desalinhamento de caracteres em telas estreitas ou fontes grandes.
                DECISÃO DE ACESSIBILIDADE: esta camada permanece aria-hidden="true"
                e SEM tabIndex/role/aria-label por célula — é puramente decorativa
                (sincronização visual do playback). O <textarea> real logo abaixo já
                é nativamente acessível (leitores de tela leem seu value/seleção
                normalmente). A navegação analítica célula-a-célula com descrições
                semânticas completas (ex: "Nota Mi da 4ª Oitava com Ligadura de
                Duração") é oferecida no modo ~Desc — ver botão na barra de
                ferramentas — evitando duplicar/conflitar com o textarea nativo. */}
            {playingSourceIndex !== null && (
              <div
                aria-hidden="true"
                style={{ fontSize: brailleFontSize }}
                className="absolute inset-0 w-full h-full p-3 font-mono leading-relaxed pointer-events-none whitespace-pre-wrap z-10 overflow-hidden border border-transparent bg-transparent"
              >
                {Array.from(brailleContent).map((char, idx) => {
                  const isActive = Array.isArray(playingSourceIndex)
                    ? playingSourceIndex.includes(idx)
                    : idx === playingSourceIndex;
                  return (
                  <span
                    key={idx}
                    className={
                      isActive
                        ? "bg-blue-200 dark:bg-blue-900/50 rounded-sm transition-colors"
                        : undefined
                    }
                  >
                    {char}
                  </span>
                  );
                })}
              </div>
            )}
            <textarea
              ref={brailleTextareaRef}
              value={brailleContent}
              onChange={e => handleBrailleChange(e.target.value)}
              onSelect={e => updateCursor(e.currentTarget)}
              onClick={e  => updateCursor(e.currentTarget)}
              onKeyUp={e  => updateCursor(e.currentTarget)}
              onScroll={e => {
                // Sincronizar o scroll do overlay de destaque com o textarea,
                // evitando que o realce fique deslocado em partituras longas.
                const overlay = e.currentTarget.previousSibling as HTMLDivElement | null;
                if (overlay) overlay.scrollTop = e.currentTarget.scrollTop;
              }}
              style={{ fontSize: brailleFontSize }}
              className="absolute inset-0 w-full h-full p-3 font-mono leading-relaxed resize-none focus:outline-none bg-transparent z-20 caret-primary border border-transparent"
              placeholder="⠐⠹⠱⠫⠻⠳⠪⠺"
              aria-label="Área de entrada em Braille musical"
              spellCheck={false}
            />
          </div>
        )
      ) : (
        <textarea
          ref={romanTextareaRef}
          value={romanContent}
          onChange={e => handleRomanChange(e.target.value)}
          style={{ fontSize: scoreFontSize + 2 }}
          className="flex-1 p-3 font-mono leading-relaxed resize-none focus:outline-none bg-transparent min-h-[120px]"
          placeholder="Notação romana (teclado padrão)"
          aria-label="Área de entrada em Notação Romana"
          spellCheck={false}
        />
      )}

      {/* Romano síncrono (sobreposição, só em modo braille) */}
      {inputMode === "braille" && showRomano && (
        <div className="border-t border-slate-200 dark:border-slate-700 p-2 bg-slate-50 dark:bg-slate-900/30 shrink-0">
          <p className="text-[9px] text-muted-foreground mb-1 font-medium uppercase tracking-wide select-none">
            Mapeamento síncrono (Romano)
          </p>
          <div className="font-mono text-xs text-foreground/80 leading-relaxed whitespace-pre-wrap break-all max-h-20 overflow-y-auto select-text">
            {romanContent
              ? Array.from(romanContent).map((char, idx) => (
                  <span
                    key={idx}
                    className="inline-block hover:bg-primary/10 rounded transition-colors px-px"
                    title={`U+${brailleContent.charCodeAt(idx).toString(16).toUpperCase().padStart(4, "0")}`}
                  >
                    {char}
                  </span>
                ))
              : <span className="text-muted-foreground">—</span>
            }
          </div>
        </div>
      )}

      {/* Rodapé */}
      <div className="flex justify-between px-3 py-1 border-t border-border/50 text-[9px] text-muted-foreground shrink-0">
        <span>{brailleContent.length} chars · {inputMode === "braille" ? "Perkins F,D,S/J,K,L" : "Teclado padrão"}</span>
        <span>Ctrl+Z desfaz · Ctrl+S salva</span>
      </div>
    </div>
  );

  // ── Ordem dos painéis ─────────────────────────────────────────────────────
  const firstPanel  = panelOrder === "braille-first" ? braillePanel : scorePanel;
  const secondPanel = panelOrder === "braille-first" ? scorePanel   : braillePanel;

  return (
    <SiteLayout>
      {/* ── Folha de estilos @media print — isola o container do VexFlow ──────
          Ao chamar window.print() (handleExportPDF), esta regra global oculta
          TUDO na página exceto #vexflow-print-area, garantindo que a versão
          impressa/PDF contenha apenas a partitura renderizada, sem editor
          Braille, teclado Perkins, barra de ferramentas ou navegação. */}
      <style>{`
        @media print {
          body * { visibility: hidden; }
          #vexflow-print-area, #vexflow-print-area * { visibility: visible; }
          #vexflow-print-area {
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: auto;
            overflow: visible !important;
          }
          @page { margin: 1.5cm; }
        }
      `}</style>
      <div className="flex flex-col h-screen overflow-hidden">

        {/* ── BARRA DE FERRAMENTAS ─────────────────────────────────────────── */}
        <header className="flex items-center gap-2 px-3 py-2 border-b border-border bg-card shrink-0 flex-wrap">

          {/* Voltar */}
          <button
            onClick={() => { if (saveStatus === "unsaved" && currentProjectId) handleSave(); setShowProjects(true); }}
            className="text-muted-foreground hover:text-foreground transition-colors p-1"
            aria-label="Voltar aos projetos"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>

          {/* Título */}
          <Input
            value={projectTitle}
            onChange={e => setProjectTitle(e.target.value)}
            className="text-sm font-semibold border-none bg-transparent px-0 h-auto focus-visible:ring-0 max-w-[120px] sm:max-w-xs"
            aria-label="Nome do projeto"
          />

          {/* Status de save */}
          <div className="flex items-center gap-1">
            <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
              saveStatus === "saved"
                ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                : saveStatus === "saving"
                ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400"
                : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
            }`}>
              {saveStatus === "saved" ? "✓ Salvo" : saveStatus === "saving" ? "Salvando…" : "● Não salvo"}
            </span>
            {saveStatus === "unsaved" && (
              <button
                onClick={handleSave}
                className="text-[10px] px-2 py-0.5 rounded bg-primary text-primary-foreground hover:opacity-90"
                title="Salvar (Ctrl+S)"
              >
                Salvar
              </button>
            )}
          </div>

          <div className="h-4 w-px bg-border mx-0.5" />

          {/* ── Controles de Transporte ──────────────────────────────────── */}
          <div className="flex items-center gap-1.5" role="group" aria-label="Controles de reprodução">

            {/* BPM */}
            <div className="flex items-center gap-1">
              <label htmlFor="bpm-inp" className="text-[10px] text-muted-foreground">BPM</label>
              <input
                id="bpm-inp"
                type="number" min={20} max={400}
                value={bpmInputValue}
                onChange={e => handleBpmInputChange(e.target.value)}
                onBlur={e  => handleBpmCommit(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter") { handleBpmCommit((e.target as HTMLInputElement).value); (e.target as HTMLInputElement).blur(); } }}
                className="w-12 h-6 text-center text-xs border rounded bg-card focus:outline-none focus:ring-1 focus:ring-primary/50"
                aria-label="Andamento em BPM"
              />
            </div>

            {/* Play / Resume */}
            <button
              onClick={handlePlay}
              disabled={parsedElements.length === 0}
              aria-label={isPaused ? "Retomar reprodução" : isPlaying ? "Iniciando do cursor" : "Reproduzir partitura a partir do cursor"}
              aria-pressed={isPlaying && !isPaused}
              title={isPaused ? "Retomar (a partir do ponto pausado)" : isPlaying ? "Reproduzindo…" : "Reproduzir a partir do cursor"}
              className={`flex items-center gap-1 text-xs px-2 py-1 rounded font-medium transition-colors disabled:opacity-40 ${
                isPlaying && !isPaused
                  ? "bg-primary/20 text-primary border border-primary/40"
                  : "bg-primary text-primary-foreground hover:opacity-90"
              }`}
            >
              <Play className="w-3 h-3" aria-hidden="true" />
              <span>{isPaused ? "Retomar" : isPlaying ? "Tocando" : "Ouvir"}</span>
            </button>

            {/* Pause / Resume toggle */}
            <button
              onClick={handlePause}
              disabled={!isPlaying || parsedElements.length === 0}
              aria-label={isPaused ? "Reprodução pausada — clique para retomar" : "Pausar reprodução"}
              aria-pressed={isPaused}
              title={isPaused ? "Pausado — clique em Retomar" : "Pausar"}
              className={`flex items-center gap-1 text-xs px-2 py-1 rounded font-medium transition-colors disabled:opacity-30 ${
                isPaused
                  ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400 border border-yellow-400/40"
                  : "bg-card border border-border text-muted-foreground hover:text-foreground hover:border-primary/50"
              }`}
            >
              <Pause className="w-3 h-3" aria-hidden="true" />
              <span className="sr-only">{isPaused ? "Pausado" : "Pausar"}</span>
            </button>

            {/* Stop */}
            <button
              onClick={handleStop}
              disabled={!isPlaying && !isPaused}
              aria-label="Parar reprodução e reiniciar cursor"
              title="Parar"
              className="flex items-center gap-1 text-xs px-2 py-1 rounded font-medium transition-colors disabled:opacity-30 bg-card border border-border text-muted-foreground hover:text-red-600 hover:border-red-400/50"
            >
              <Square className="w-3 h-3" aria-hidden="true" />
              <span className="sr-only">Parar</span>
            </button>

          </div>

          <div className="h-4 w-px bg-border mx-0.5" aria-hidden="true" />

          {/* ── Seletor de Timbre FM ──────────────────────────────────────── */}
          <div className="flex items-center gap-1">
            <label
              htmlFor="instrument-sel"
              className="text-[10px] text-muted-foreground hidden sm:inline"
            >
              Timbre
            </label>
            <select
              id="instrument-sel"
              value={instrument}
              onChange={e => handleInstrumentChange(e.target.value as InstrumentType)}
              aria-label="Selecionar timbre de instrumento"
              title="Timbre FM do instrumento"
              className="h-6 text-xs rounded border border-border bg-card px-1.5 focus:outline-none focus:ring-1 focus:ring-primary/50 text-foreground cursor-pointer"
            >
              <option value="piano">🎹 Piano</option>
              <option value="guitar">🎸 Violão</option>
              <option value="flute">🎵 Flauta</option>
            </select>
          </div>

          <div className="h-4 w-px bg-border mx-0.5" />

          {/* Layout controls */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => setLayoutMode("horizontal")}
              className={`p-1.5 rounded transition-colors ${layoutMode === "horizontal" ? "bg-primary/15 text-primary" : "text-muted-foreground hover:text-foreground"}`}
              title="Layout horizontal"
            >
              <LayoutTemplate className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setLayoutMode("vertical")}
              className={`p-1.5 rounded transition-colors ${layoutMode === "vertical" ? "bg-primary/15 text-primary" : "text-muted-foreground hover:text-foreground"}`}
              title="Layout vertical"
            >
              <FlipVertical2 className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setPanelOrder(v => v === "braille-first" ? "score-first" : "braille-first")}
              className="p-1.5 rounded text-muted-foreground hover:text-foreground transition-colors"
              title="Inverter posição dos painéis"
            >
              {layoutMode === "horizontal"
                ? <FlipHorizontal2 className="w-3.5 h-3.5" />
                : <FlipVertical2 className="w-3.5 h-3.5" />}
            </button>
          </div>

          <div className="h-4 w-px bg-border mx-0.5" />

          {/* Import / Export */}
          <div className="flex items-center gap-1">
            <Dropdown
              label="Importar"
              icon={<Upload className="w-3.5 h-3.5" />}
              items={[
                { label: "MusicXML (.xml / .musicxml)", icon: <FileText className="w-3 h-3" />, onClick: () => fileInputRef.current?.click() },
                { label: "MIDI (.mid)",                  icon: <Music    className="w-3 h-3" />, onClick: handleImportMidi },
              ]}
              disabled={importing}
            />
            <Dropdown
              label="Exportar"
              icon={<Download className="w-3.5 h-3.5" />}
              items={[
                { label: "Impressora Braille (BRF)",  icon: <FileText className="w-3 h-3" />, onClick: handleExportBRF },
                { label: "MusicXML (.musicxml)",       icon: <FileText className="w-3 h-3" />, onClick: handleExportMusicXML },
                { label: "Imprimir Partitura (PDF)",  icon: <FileText className="w-3 h-3" />, onClick: handleExportPDF,   locked: isExportLocked },
                { label: "Áudio MIDI / WAV",          icon: <Volume2  className="w-3 h-3" />, onClick: handleExportAudio, locked: isExportLocked },
              ]}
            />
          </div>

          <input ref={fileInputRef}     type="file" accept=".brf,.musicxml,.xml,.mxl" onChange={handleImportFile} className="hidden" />
          <input ref={midiFileInputRef} type="file" accept=".mid,.midi"               onChange={() => handleImportMidi()} className="hidden" />
        </header>

        {/* ── ÁREA DE PAINÉIS COM DIVISOR ARRASTÁVEL ───────────────────────── */}
        <main
          ref={containerRef}
          className="flex-1 min-h-0 overflow-hidden"
          style={{ userSelect: isDragging.current ? "none" : "auto" }}
        >
          {layoutMode === "horizontal" ? (
            <div className="flex h-full">
              {/* Primeiro painel */}
              <div className="min-w-0 overflow-hidden" style={{ width: `${splitPct}%` }}>
                {firstPanel}
              </div>

              {/* Divisor arrastável horizontal */}
              <div
                onMouseDown={handleDividerMouseDown}
                onTouchStart={handleDividerMouseDown}
                className="w-1.5 shrink-0 cursor-col-resize bg-border hover:bg-primary/40 active:bg-primary/60 transition-colors touch-none relative group"
                aria-label="Arrastar para redimensionar painéis"
              >
                {/* Alça visual */}
                <div className="absolute inset-y-0 -left-1 -right-1 group-hover:bg-primary/10 transition-colors" />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col gap-0.5 opacity-40 group-hover:opacity-80">
                  {[0,1,2,3,4].map(i => <div key={i} className="w-0.5 h-1 bg-border rounded-full" />)}
                </div>
              </div>

              {/* Segundo painel */}
              <div className="min-w-0 overflow-hidden flex-1">
                {secondPanel}
              </div>
            </div>
          ) : (
            <div className="flex flex-col h-full">
              {/* Primeiro painel */}
              <div className="min-h-0 overflow-hidden" style={{ height: `${splitPct}%` }}>
                {firstPanel}
              </div>

              {/* Divisor arrastável vertical */}
              <div
                onMouseDown={handleDividerMouseDown}
                onTouchStart={handleDividerMouseDown}
                className="h-1.5 shrink-0 cursor-row-resize bg-border hover:bg-primary/40 active:bg-primary/60 transition-colors touch-none relative group"
                aria-label="Arrastar para redimensionar painéis"
              >
                <div className="absolute inset-x-0 -top-1 -bottom-1 group-hover:bg-primary/10 transition-colors" />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-row gap-0.5 opacity-40 group-hover:opacity-80">
                  {[0,1,2,3,4].map(i => <div key={i} className="h-0.5 w-1 bg-border rounded-full" />)}
                </div>
              </div>

              {/* Segundo painel */}
              <div className="min-h-0 overflow-hidden flex-1">
                {secondPanel}
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Overlay Perkins Físico — visível apenas em landscape + isMobileScreenInputMode */}
      {isMobileScreenInputMode && (
        <PerkinsPhysicalOverlay
          onChar={insertCharAtCursor}
          onClose={() => setIsMobileScreenInputMode(false)}
        />
      )}
    </SiteLayout>
  );
}
