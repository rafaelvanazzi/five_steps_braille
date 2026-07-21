/**
 * MusicXML Parser Module — server/routers/musicxml-parser.ts
 *
 * PORTA SERVER-SIDE da lógica de importMusicXML() desenvolvida e validada em
 * client/src/lib/brailleMusic.ts, substituindo integralmente a implementação
 * legada baseada em xml2js. Preservada a paridade rigorosa com a Dissertação
 * de Mestrado "Particularidades da Musicografia Braille" (Vanazzi, 2014):
 *
 *   • Regras de Uso das Oitavas (Grau 3, Cap. 3): 2ª/3ª nunca levam sinal
 *     (inferidas por proximidade MIDI); 4ª/5ª só levam sinal se mudou de
 *     oitava; 6ª/7ª sempre levam sinal obrigatório.
 *   • Piano com pauta dupla: <staff>1</staff> (RH) / <staff>2</staff> (LH),
 *     alternando blocos de N compassos com prefixos '.>' (mão direita, na
 *     verdade HAND_RIGHT '⠨⠜') e '_>' (mão esquerda, HAND_LEFT '⠸⠜').
 *   • Acordes (<chord/>) convertidos em sinais de intervalo (Grau 4), com
 *     ligadura própria por nota do acorde.
 *   • Anacruse: leitura simétrica de metrical="no"/implicit="no".
 *
 * ── NOTA DE COMPATIBILIDADE DE CONTRATO (leia antes de alterar assinaturas) ──
 * O router server/routers/editor.ts consome estas funções da seguinte forma
 * (verificado linha a linha no arquivo real, não inferido):
 *
 *   const validation = await validateMusicXML(input.xmlContent);
 *   if (!validation.valid) { ...validation.errors.join(", ")... }
 *
 *   const parsed = await parseMusicXML(input.xmlContent);
 *   contentBraille: parsed.brailleContent,
 *   title: parsed.title || ...,
 *   metadata: {
 *     title: parsed.title, composer: parsed.composer,
 *     notesCount: parsed.notes.length,
 *     timeSignature: `${parsed.timeSignature.beats}/${parsed.timeSignature.beatType}`,
 *     key: `${parsed.key.fifths} sharps/flats (${parsed.key.mode})`,
 *   }
 *
 * Por isso, ambas as funções permanecem ASSÍNCRONAS retornando OBJETOS
 * estruturados (não strings/booleans simples) — mudar isso quebraria o
 * router em produção. O parâmetro 'options' (isPiano/measureAlternation) é
 * um segundo argumento OPCIONAL adicional — editor.ts hoje não o passa,
 * então o comportamento atual (isPiano=false) é preservado integralmente
 * até que o router seja atualizado para expor essa opção na UI.
 *
 * ── AMBIENTE DOM NO SERVIDOR ──────────────────────────────────────────────
 * Node.js não tem DOMParser nativo. Entre '@xmldom/xmldom' (não implementa
 * querySelector/querySelectorAll — só getElementsByTagName) e 'jsdom' (DOM
 * completo, com querySelector), optamos por 'jsdom' para preservar a lógica
 * de travessia por seletor CSS EXATAMENTE como validada no cliente, sem
 * reescrever tudo para getElementsByTagName aninhado (risco real de
 * introduzir bugs numa porta que deveria ser fiel).
 *
 * AÇÃO NECESSÁRIA: 'jsdom' precisa ser adicionado às dependências do projeto
 * (`npm install jsdom` + `npm install --save-dev @types/jsdom`) — não estava
 * presente no parser legado (que usava 'xml2js').
 */

import { JSDOM } from "jsdom";

// ─── TIPOS BASE (espelhados de brailleMusic.ts — arquivo server é autocontido) ──

type NoteName   = 'C' | 'D' | 'E' | 'F' | 'G' | 'A' | 'B';
type BrailleDuration = 'w' | 'h' | 'q' | '8' | '16';
type Accidental  = 'sharp' | 'flat' | 'natural' | 'double-sharp' | 'double-flat';

interface NoteInfo {
  pitch: NoteName;
  duration: BrailleDuration;
  altDuration: BrailleDuration;
}

// ─── TABELAS BASE (glifo Braille → significado) ──────────────────────────────
// Fonte: TABELA_BRAILLE_corrigida.odt (Rafael Vanazzi) + Manual Internacional
// de Musicografia Braille (2004) + Dissertação Vanazzi (2014).

const NOTE_MAP: Record<string, NoteInfo> = {
  '\u2819': { pitch: 'C', duration: '8', altDuration: '8' },
  '\u2811': { pitch: 'D', duration: '8', altDuration: '8' },
  '\u280B': { pitch: 'E', duration: '8', altDuration: '8' },
  '\u281B': { pitch: 'F', duration: '8', altDuration: '8' },
  '\u2813': { pitch: 'G', duration: '8', altDuration: '8' },
  '\u280A': { pitch: 'A', duration: '8', altDuration: '8' },
  '\u281A': { pitch: 'B', duration: '8', altDuration: '8' },

  '\u2839': { pitch: 'C', duration: 'q', altDuration: 'q' },
  '\u2831': { pitch: 'D', duration: 'q', altDuration: 'q' },
  '\u282B': { pitch: 'E', duration: 'q', altDuration: 'q' },
  '\u283B': { pitch: 'F', duration: 'q', altDuration: 'q' },
  '\u2833': { pitch: 'G', duration: 'q', altDuration: 'q' },
  '\u282A': { pitch: 'A', duration: 'q', altDuration: 'q' },
  '\u283A': { pitch: 'B', duration: 'q', altDuration: 'q' },

  '\u281D': { pitch: 'C', duration: 'h', altDuration: 'h' },
  '\u2815': { pitch: 'D', duration: 'h', altDuration: 'h' },
  '\u280F': { pitch: 'E', duration: 'h', altDuration: 'h' },
  '\u281F': { pitch: 'F', duration: 'h', altDuration: 'h' },
  '\u2817': { pitch: 'G', duration: 'h', altDuration: 'h' },
  '\u280E': { pitch: 'A', duration: 'h', altDuration: 'h' },
  '\u281E': { pitch: 'B', duration: 'h', altDuration: 'h' },

  '\u283D': { pitch: 'C', duration: 'w', altDuration: '16' },
  '\u2835': { pitch: 'D', duration: 'w', altDuration: '16' },
  '\u282F': { pitch: 'E', duration: 'w', altDuration: '16' },
  '\u283F': { pitch: 'F', duration: 'w', altDuration: '16' },
  '\u2837': { pitch: 'G', duration: 'w', altDuration: '16' },
  '\u282E': { pitch: 'A', duration: 'w', altDuration: '16' },
  '\u283E': { pitch: 'B', duration: 'w', altDuration: '16' },
};

const REST_MAP: Record<string, { duration: BrailleDuration; altDuration: BrailleDuration }> = {
  '\u282D': { duration: '8', altDuration: '8' },
  '\u2827': { duration: 'q', altDuration: 'q' },
  '\u2825': { duration: 'h', altDuration: 'h' },
  '\u280D': { duration: 'w', altDuration: '16' },
};

const OCTAVE_MAP: Record<string, number> = {
  '\u2808\u2808': 0,
  '\u2808': 1,
  '\u2818': 2,
  '\u2838': 3,
  '\u2810': 4,
  '\u2828': 5,
  '\u2830': 6,
  '\u2820': 7,
  '\u2820\u2820': 8,
};

const ACCIDENTAL_MAP: Record<string, Accidental> = {
  '\u2829': 'sharp',
  '\u2823': 'flat',
  '\u2821': 'natural',
  '\u2829\u2829': 'double-sharp',
  '\u2823\u2823': 'double-flat',
};

const INTERVAL_MAP: Record<string, number> = {
  '\u280C': 2,
  '\u282C': 3,
  '\u283C': 4,
  '\u2814': 5,
  '\u2834': 6,
  '\u2812': 7,
  '\u2824': 8,
};

const KEY_SIG_SHARP: Record<string, { vexKey: string; fifths: number }> = {
  '\u2829':              { vexKey: 'G',  fifths: 1 },
  '\u2829\u2829':        { vexKey: 'D',  fifths: 2 },
  '\u2829\u2829\u2829':  { vexKey: 'A',  fifths: 3 },
};

const KEY_SIG_FLAT: Record<string, { vexKey: string; fifths: number }> = {
  '\u2823':              { vexKey: 'F',  fifths: -1 },
  '\u2823\u2823':        { vexKey: 'Bb', fifths: -2 },
  '\u2823\u2823\u2823':  { vexKey: 'Eb', fifths: -3 },
};

const OFFICIAL_KEY_SIGNATURE_MAP: Record<string, { vexKey: string; fifths: number }> = {
  '\u283C\u2819\u2829': { vexKey: 'E',  fifths: 4 },
  '\u283C\u2811\u2829': { vexKey: 'B',  fifths: 5 },
  '\u283C\u280B\u2829': { vexKey: 'F#', fifths: 6 },
  '\u283C\u281B\u2829': { vexKey: 'C#', fifths: 7 },
  '\u283C\u2819\u2823': { vexKey: 'Ab', fifths: -4 },
  '\u283C\u2811\u2823': { vexKey: 'Db', fifths: -5 },
  '\u283C\u280B\u2823': { vexKey: 'Gb', fifths: -6 },
  '\u283C\u281B\u2823': { vexKey: 'Cb', fifths: -7 },
};

const NUMBER_SIGN        = '\u283C';         // ⠼
const AUGMENTATION_DOT   = '\u2804';         // ⠄
const SLUR_SIMPLE        = '\u2809';         // ⠉ — "Ligadura de Duração"
const HAND_RIGHT         = '\u2828\u281C';   // ⠨⠜ — mão direita → clave de sol
const HAND_LEFT          = '\u2838\u281C';   // ⠸⠜ — mão esquerda → clave de fá

// ─── MAPAS REVERSOS (pitch/duração/oitava/acidente/intervalo → glifo Braille) ──

const REVERSE_NOTE_MAP: Record<NoteName, Partial<Record<BrailleDuration, string>>> = (() => {
  const rev = { C: {}, D: {}, E: {}, F: {}, G: {}, A: {}, B: {} } as
    Record<NoteName, Partial<Record<BrailleDuration, string>>>;
  for (const [char, info] of Object.entries(NOTE_MAP)) {
    const durKey = info.duration;
    if (rev[info.pitch][durKey] === undefined) rev[info.pitch][durKey] = char;
    if (info.altDuration === '16' && rev[info.pitch]['16'] === undefined) {
      rev[info.pitch]['16'] = char;
    }
  }
  return rev;
})();

const REVERSE_REST_MAP: Partial<Record<BrailleDuration, string>> = (() => {
  const rev: Partial<Record<BrailleDuration, string>> = {};
  for (const [char, info] of Object.entries(REST_MAP)) {
    if (rev[info.duration] === undefined) rev[info.duration] = char;
    if (info.altDuration === '16' && rev['16'] === undefined) rev['16'] = char;
  }
  return rev;
})();

const REVERSE_OCTAVE_MAP: Record<number, string> = (() => {
  const rev: Record<number, string> = {};
  for (const [char, oct] of Object.entries(OCTAVE_MAP)) rev[oct] = char;
  return rev;
})();

const REVERSE_ACCIDENTAL_MAP: Partial<Record<Accidental, string>> = (() => {
  const rev: Partial<Record<Accidental, string>> = {};
  for (const [char, acc] of Object.entries(ACCIDENTAL_MAP)) {
    if (rev[acc] === undefined) rev[acc] = char;
  }
  return rev;
})();

const REVERSE_INTERVAL_MAP: Record<number, string> = (() => {
  const rev: Record<number, string> = {};
  for (const [char, size] of Object.entries(INTERVAL_MAP)) {
    if (rev[size] === undefined) rev[size] = char;
  }
  return rev;
})();

/** Converte fifths (MusicXML) → glifo(s) Braille de armadura de clave. */
function fifthsToKeySignatureBraille(fifths: number): string {
  if (!fifths) return '';
  const wantSharp = fifths > 0;
  const abs = Math.abs(fifths);
  if (abs <= 3) {
    const table = wantSharp ? KEY_SIG_SHARP : KEY_SIG_FLAT;
    for (const [glyph, info] of Object.entries(table)) {
      if (info.fifths === fifths) return glyph;
    }
    return '';
  }
  for (const [glyph, info] of Object.entries(OFFICIAL_KEY_SIGNATURE_MAP)) {
    if (info.fifths === fifths) return glyph;
  }
  return '';
}

/** Converte um número inteiro (1-9) para o dígito Braille correspondente. */
function numberToBrailleDigits(n: number): string {
  const digitGlyphs: Record<string, string> = {
    '1': '\u2801', '2': '\u2803', '3': '\u2809', '4': '\u2819', '5': '\u2811',
    '6': '\u280B', '7': '\u281B', '8': '\u2813', '9': '\u280A', '0': '\u281A',
  };
  return String(n).split('').map(d => digitGlyphs[d] ?? '').join('');
}

/** Converte <alter> (semitons ±2) → nosso tipo Accidental, se aplicável. */
function alterToAccidental(alter: number): Accidental | undefined {
  if (alter === 1)  return 'sharp';
  if (alter === -1) return 'flat';
  if (alter === 0)  return 'natural';
  if (alter === 2)  return 'double-sharp';
  if (alter === -2) return 'double-flat';
  return undefined;
}

// ─── GRAU 3 — REGRAS DE USO DAS OITAVAS (Dissertação Vanazzi 2014, Cap. 3) ──

const PITCH_ORDER_INFER: ReadonlyArray<NoteName> = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
const SEMITONES_INFER: Record<NoteName, number>  = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };

/** Converte pitch + oitava → número MIDI (C4=60, A4=69, convenção científica). */
function noteToMidi(pitch: NoteName, octave: number): number {
  return (octave + 1) * 12 + SEMITONES_INFER[pitch];
}

/** Distância diatônica mínima (0=uníssono, 1=2ª, ..., 6=7ª), com envoltório circular. */
function minDiatonicSteps(prevIdx: number, nextIdx: number): number {
  const direct  = Math.abs(nextIdx - prevIdx);
  const wrapped = 7 - direct;
  return Math.min(direct, wrapped);
}

/** Encontra a oitava que coloca nextPitch mais próxima (MIDI) de prevMidi. */
function closestOctaveByMidi(
  prevMidi: number,
  nextPitch: NoteName,
  minOct = 0,
  maxOct = 8,
): number {
  let bestOct = 4, bestDist = 999;
  for (let oct = minOct; oct <= maxOct; oct++) {
    const dist = Math.abs(noteToMidi(nextPitch, oct) - prevMidi);
    if (dist < bestDist) { bestDist = dist; bestOct = oct; }
  }
  return bestOct;
}

/**
 * inferOctave — Algoritmo de Inferência Diatônica (Dissertação Vanazzi 2014, Cap. 3)
 *
 * REGRA 1 (2ª/3ª — diatSteps 0-2): NUNCA leva sinal; inferida por proximidade MIDI.
 * REGRA 2 (4ª/5ª — diatSteps 3-4): sem sinal = SEMPRE a mesma oitava da anterior.
 * REGRA 3 (6ª/7ª — diatSteps 5-6): SEMPRE exige sinal; violação = fallback MIDI + aviso.
 */
function inferOctave(
  prevPitch: NoteName,
  prevOctave: number,
  nextPitch: NoteName,
  errors: string[],
): number {
  const prevIdx   = PITCH_ORDER_INFER.indexOf(prevPitch);
  const nextIdx   = PITCH_ORDER_INFER.indexOf(nextPitch);
  const prevMidi  = noteToMidi(prevPitch, prevOctave);
  const diatSteps = minDiatonicSteps(prevIdx, nextIdx);

  if (diatSteps <= 2) {
    return closestOctaveByMidi(prevMidi, nextPitch, prevOctave - 1, prevOctave + 1);
  }
  if (diatSteps === 3 || diatSteps === 4) {
    return prevOctave;
  }
  errors.push(
    `[Grau 3] Aviso: intervalo de ${diatSteps === 5 ? '6ª' : '7ª'} sem sinal de oitava ` +
    `(${prevPitch}${prevOctave}→${nextPitch}). Inferindo por proximidade MIDI.`
  );
  return closestOctaveByMidi(prevMidi, nextPitch, prevOctave - 1, prevOctave + 1);
}

/**
 * Decide, de forma roundtrip-segura, se o sinal de oitava pode ser OMITIDO:
 * simula o que inferOctave() reconstruiria sem o sinal e só omite se o
 * resultado bater com a oitava real conhecida (vinda do MusicXML absoluto).
 */
function shouldEmitOctaveMarker(
  prevPitch:  NoteName | null,
  prevOctave: number,
  pitch:      NoteName,
  octave:     number,
): boolean {
  if (prevPitch === null) return true;
  const errors: string[] = [];
  const inferred = inferOctave(prevPitch, prevOctave, pitch, errors);
  return inferred !== octave;
}

// ─── CONVERSÃO DE DURAÇÃO MusicXML ↔ Braille (Grau 2 — linhas travadas) ─────

const MUSICXML_TYPE_TO_DURATION: Record<string, BrailleDuration> = {
  'whole':   'w',
  '16th':    '16',
  'half':    'h',
  'quarter': 'q',
  'eighth':  '8',
  '32nd':    '16',
  '64th':    '16',
  '128th':   '16',
};


// ─── TIPOS DE OPÇÃO E RETORNO ────────────────────────────────────────────────

export interface MusicXMLImportOptions {
  /** true = parte de piano com pauta dupla (staff 1=RH / staff 2=LH). */
  isPiano?: boolean;
  /** Nº de compassos por bloco antes de alternar de mão (padrão: 4). */
  measureAlternation?: number;
  /** Índice da <part> a usar quando isPiano=false e há múltiplas partes. */
  partIndex?: number;
}

/** Nota musical simplificada — mantida apenas para os metadados que
 *  editor.ts consome (parsed.notes.length). Não participa do algoritmo
 *  de geração de Braille em si (que opera sobre XmlNoteEvent). */
export interface MusicalNote {
  pitch:       string;
  octave:      number;
  accidental?: Accidental;
  duration:    string;
  dotted:      boolean;
}

/**
 * Formato de retorno de parseMusicXML — espelha EXATAMENTE os campos que
 * server/routers/editor.ts já destrutura (parsed.brailleContent, .title,
 * .composer, .notes.length, .timeSignature.{beats,beatType}, .key.{fifths,mode}).
 */
export interface ParsedMusicXML {
  title:          string;
  composer:       string;
  notes:          MusicalNote[];
  timeSignature:  { beats: number; beatType: number };
  key:            { fifths: number; mode: string };
  brailleContent: string;
  partsInfo:      { id: string; name: string }[];
}

interface XmlNoteEvent {
  isRest:        boolean;
  isChord:       boolean;
  pitch?:        NoteName;
  octave?:       number;
  alterSemis?:   number;
  durationTicks: number;
  typeName?:     string;
  dotted:        boolean;
  voice:         string;
  staff:         number;
  tieStart:      boolean;
  tieStop:       boolean;
  slurStart:     boolean;
  slurStop:      boolean;
  measureIdx:    number;
}

// ─── MOTOR PRINCIPAL DE IMPORTAÇÃO (MusicXML → Braille) ──────────────────────
//
// Idêntico em estrutura/lógica ao importMusicXML() de brailleMusic.ts —
// mesma travessia por seletor CSS, agora usando o Document do jsdom em vez
// do DOMParser nativo do navegador (que não existe em Node.js).

function runImportMusicXMLCore(
  xmlString: string,
  options:   MusicXMLImportOptions,
): {
  brailleContent: string;
  measuresCount:  number;
  timeSignature:  { beats: number; beatType: number };
  key:            { fifths: number; mode: string };
  notes:          MusicalNote[];
} {
  const isPiano            = !!options.isPiano;
  const measureAlternation = options.measureAlternation ?? 4;

  const dom = new JSDOM(xmlString, { contentType: 'application/xml' });
  const doc = dom.window.document;

  const parserError = doc.querySelector('parsererror');
  if (parserError) {
    throw new Error(`[parseMusicXML] XML malformado: ${parserError.textContent ?? 'erro desconhecido'}`);
  }

  if (doc.querySelector('score-timewise')) {
    throw new Error(
      '[parseMusicXML] Formato <score-timewise> não é suportado. ' +
      'Reexporte o arquivo como <score-partwise> (padrão de Finale/MuseScore/Sibelius).'
    );
  }

  const scoreRoot = doc.querySelector('score-partwise');
  if (!scoreRoot) {
    throw new Error('[parseMusicXML] Elemento <score-partwise> não encontrado no XML fornecido.');
  }

  const parts = Array.from(scoreRoot.querySelectorAll('part'));
  if (parts.length === 0) {
    throw new Error('[parseMusicXML] Nenhum elemento <part> encontrado no MusicXML.');
  }

  const partIdx = Math.min(options.partIndex ?? 0, parts.length - 1);
  const part = parts[partIdx];
  const measureNodes = Array.from(part.querySelectorAll('measure'));

  let divisions = 1;
  let currentFifths: number | null = null;
  let currentTimeNum = 4;
  let currentTimeDen = 4;
  let currentClefSign = 'G';

  const measureEventsRH: XmlNoteEvent[][] = [];
  const measureEventsLH: XmlNoteEvent[][] = [];
  const measureHeaderInfo: Array<{
    fifthsChanged: boolean; fifths: number;
    timeChanged: boolean; timeNum: number; timeDen: number;
    clefChanged: boolean; clefSign: string;
    isExplicitAnacrusis: boolean;
  }> = [];

  const collectedNotes: MusicalNote[] = [];

  measureNodes.forEach((measureEl, measureIdx) => {
    const eventsRH: XmlNoteEvent[] = [];
    const eventsLH: XmlNoteEvent[] = [];

    const metricalAttr = measureEl.getAttribute('metrical');
    const implicitAttr = measureEl.getAttribute('implicit');
    const isExplicitAnacrusis = metricalAttr === 'no' || implicitAttr === 'no';

    let fifthsChanged = false, timeChanged = false, clefChanged = false;

    const attributesEl = measureEl.querySelector('attributes');
    if (attributesEl) {
      const divisionsEl = attributesEl.querySelector('divisions');
      if (divisionsEl?.textContent) divisions = parseInt(divisionsEl.textContent, 10) || divisions;

      const fifthsEl = attributesEl.querySelector('key fifths');
      if (fifthsEl?.textContent) {
        const f = parseInt(fifthsEl.textContent, 10);
        if (f !== currentFifths) { currentFifths = f; fifthsChanged = true; }
      }

      const beatsEl    = attributesEl.querySelector('time beats');
      const beatTypeEl = attributesEl.querySelector('time beat-type');
      if (beatsEl?.textContent && beatTypeEl?.textContent) {
        const num = parseInt(beatsEl.textContent, 10);
        const den = parseInt(beatTypeEl.textContent, 10);
        if (num !== currentTimeNum || den !== currentTimeDen) {
          currentTimeNum = num; currentTimeDen = den; timeChanged = true;
        }
      }

      const clefSignEl = attributesEl.querySelector('clef sign');
      if (clefSignEl?.textContent && clefSignEl.textContent !== currentClefSign) {
        currentClefSign = clefSignEl.textContent;
        clefChanged = true;
      }
    }

    measureHeaderInfo.push({
      fifthsChanged, fifths: currentFifths ?? 0,
      timeChanged, timeNum: currentTimeNum, timeDen: currentTimeDen,
      clefChanged, clefSign: currentClefSign,
      isExplicitAnacrusis,
    });

    const noteEls = Array.from(measureEl.children).filter(el => el.tagName === 'note');

    for (const noteEl of noteEls) {
      const isRest  = !!noteEl.querySelector('rest');
      const isChord = !!noteEl.querySelector('chord');

      const staffEl = noteEl.querySelector('staff');
      const staff   = staffEl?.textContent ? parseInt(staffEl.textContent, 10) : 1;

      const voiceEl = noteEl.querySelector('voice');
      const voice   = voiceEl?.textContent ?? '1';

      const durationEl = noteEl.querySelector('duration');
      const durationTicks = durationEl?.textContent ? parseInt(durationEl.textContent, 10) : divisions;

      const typeEl   = noteEl.querySelector('type');
      const typeName = typeEl?.textContent ?? undefined;

      const dotted = !!noteEl.querySelector('dot');

      const tieStart = Array.from(noteEl.querySelectorAll('tie')).some(t => t.getAttribute('type') === 'start');
      const tieStop  = Array.from(noteEl.querySelectorAll('tie')).some(t => t.getAttribute('type') === 'stop');
      const slurStart = Array.from(noteEl.querySelectorAll('notations slur'))
        .some(s => s.getAttribute('type') === 'start');
      const slurStop  = Array.from(noteEl.querySelectorAll('notations slur'))
        .some(s => s.getAttribute('type') === 'stop');

      let pitch: NoteName | undefined;
      let octave: number | undefined;
      let alterSemis: number | undefined;

      if (!isRest) {
        const stepEl   = noteEl.querySelector('pitch step');
        const octaveEl = noteEl.querySelector('pitch octave');
        const alterEl  = noteEl.querySelector('pitch alter');
        pitch      = (stepEl?.textContent as NoteName) ?? 'C';
        octave     = octaveEl?.textContent ? parseInt(octaveEl.textContent, 10) : 4;
        alterSemis = alterEl?.textContent ? parseInt(alterEl.textContent, 10) : undefined;

        if (!isChord) {
          collectedNotes.push({
            pitch, octave,
            accidental: alterSemis !== undefined ? alterToAccidental(alterSemis) : undefined,
            duration: typeName ?? 'quarter',
            dotted,
          });
        }
      }

      const event: XmlNoteEvent = {
        isRest, isChord, pitch, octave, alterSemis,
        durationTicks, typeName, dotted, voice,
        staff: isPiano ? staff : 1,
        tieStart, tieStop, slurStart, slurStop,
        measureIdx,
      };

      if (!isPiano || staff === 1) eventsRH.push(event);
      else                          eventsLH.push(event);
    }

    measureEventsRH.push(eventsRH);
    measureEventsLH.push(eventsLH);
  });

  function eventsToMeasureBraille(
    events: XmlNoteEvent[],
    lastNoteRef: { pitch: NoteName | null; octave: number },
  ): string {
    let out = '';
    let i = 0;

    while (i < events.length) {
      const ev = events[i];

      if (ev.isRest) {
        const durKey: BrailleDuration = ev.typeName !== undefined
          ? (MUSICXML_TYPE_TO_DURATION[ev.typeName] ?? '16')
          : '16';
        const glyph = REVERSE_REST_MAP[durKey];
        if (glyph) out += glyph;
        i++;
        continue;
      }

      const durKey: BrailleDuration = ev.typeName !== undefined
        ? (MUSICXML_TYPE_TO_DURATION[ev.typeName] ?? '16')
        : '16';
      const accidental = ev.alterSemis !== undefined ? alterToAccidental(ev.alterSemis) : undefined;

      if (accidental && REVERSE_ACCIDENTAL_MAP[accidental]) {
        out += REVERSE_ACCIDENTAL_MAP[accidental];
      }

      const needsOctave = shouldEmitOctaveMarker(
        lastNoteRef.pitch, lastNoteRef.octave, ev.pitch!, ev.octave!,
      );
      if (needsOctave) {
        const octGlyph = REVERSE_OCTAVE_MAP[ev.octave!];
        if (octGlyph) out += octGlyph;
      }

      const noteGlyph = REVERSE_NOTE_MAP[ev.pitch!]?.[durKey];
      if (noteGlyph) out += noteGlyph;
      if (ev.dotted) out += AUGMENTATION_DOT;

      lastNoteRef.pitch  = ev.pitch!;
      lastNoteRef.octave = ev.octave!;

      let j = i + 1;
      while (j < events.length && events[j].isChord) {
        const chordEv = events[j];
        const baseIdx  = PITCH_ORDER_INFER.indexOf(ev.pitch!);
        const chordIdx = PITCH_ORDER_INFER.indexOf(chordEv.pitch!);
        const octaveDiff = (chordEv.octave! - ev.octave!) * 7;
        const rawInterval = (chordIdx - baseIdx) + octaveDiff;
        const intervalSize = Math.abs(rawInterval) + 1;
        const intervalGlyph = REVERSE_INTERVAL_MAP[intervalSize];
        if (intervalGlyph) out += intervalGlyph;

        const chordAcc = chordEv.alterSemis !== undefined ? alterToAccidental(chordEv.alterSemis) : undefined;
        if (chordAcc && REVERSE_ACCIDENTAL_MAP[chordAcc]) out += REVERSE_ACCIDENTAL_MAP[chordAcc];

        if (chordEv.tieStart || chordEv.slurStart) {
          out += SLUR_SIMPLE;
        }

        j++;
      }

      if (ev.tieStart || ev.slurStart) {
        out += SLUR_SIMPLE;
      }

      i = j;
    }

    return out;
  }

  let result = '';
  const lastNoteRH: { pitch: NoteName | null; octave: number } = { pitch: null, octave: 4 };
  const lastNoteLH: { pitch: NoteName | null; octave: number } = { pitch: null, octave: 4 };

  function emitHeaderIfChanged(idx: number): string {
    const info = measureHeaderInfo[idx];
    let header = '';
    if (info.clefChanged) {
      header += info.clefSign === 'F' ? HAND_LEFT : HAND_RIGHT;
    }
    if (info.fifthsChanged) {
      header += fifthsToKeySignatureBraille(info.fifths);
    }
    if (idx === 0) {
      header += `${NUMBER_SIGN}${numberToBrailleDigits(info.timeNum)}${AUGMENTATION_DOT}${numberToBrailleDigits(info.timeDen)}`;
    }
    return header;
  }

  if (!isPiano) {
    for (let m = 0; m < measureNodes.length; m++) {
      result += emitHeaderIfChanged(m);
      result += eventsToMeasureBraille(measureEventsRH[m], lastNoteRH);
      if (m < measureNodes.length - 1) result += ' ';
    }
  } else {
    const totalMeasures = measureNodes.length;
    let m = 0;
    while (m < totalMeasures) {
      const blockEnd = Math.min(m + measureAlternation, totalMeasures);

      result += HAND_RIGHT;
      for (let k = m; k < blockEnd; k++) {
        result += emitHeaderIfChanged(k);
        result += eventsToMeasureBraille(measureEventsRH[k], lastNoteRH);
        if (k < blockEnd - 1) result += ' ';
      }
      result += '\n';

      result += HAND_LEFT;
      for (let k = m; k < blockEnd; k++) {
        result += eventsToMeasureBraille(measureEventsLH[k], lastNoteLH);
        if (k < blockEnd - 1) result += ' ';
      }
      result += '\n';

      m = blockEnd;
    }
  }

  return {
    brailleContent: result.trim(),
    measuresCount:  measureNodes.length,
    timeSignature:  { beats: currentTimeNum, beatType: currentTimeDen },
    key:            { fifths: currentFifths ?? 0, mode: 'major' },
    notes:          collectedNotes,
  };
}


/**
 * Tipo do documento DOM inferido diretamente de jsdom (não do 'lib.dom' do
 * TypeScript, que pode não estar disponível/habilitado num tsconfig de
 * servidor) — evita depender do global 'Document' do navegador.
 */
type JSDOMDocument = InstanceType<typeof JSDOM>['window']['document'];

/** Extrai título, compositor e lista de partes via travessia DOM (jsdom). */
function extractHeaderMetadata(doc: JSDOMDocument): {
  title: string;
  composer: string;
  partsInfo: { id: string; name: string }[];
} {
  const scoreRoot = doc.querySelector('score-partwise');

  const movementTitleEl = scoreRoot?.querySelector('movement-title');
  const workTitleEl     = scoreRoot?.querySelector('work work-title');
  const title = movementTitleEl?.textContent ?? workTitleEl?.textContent ?? 'Untitled';

  const creatorEl = scoreRoot?.querySelector('identification creator');
  const composer  = creatorEl?.textContent ?? 'Unknown';

  const partsInfo: { id: string; name: string }[] = [];
  const scorePartEls = scoreRoot ? Array.from(scoreRoot.querySelectorAll('part-list score-part')) : [];
  for (const sp of scorePartEls) {
    const id = sp.getAttribute('id') ?? '';
    const nameEl = sp.querySelector('part-name');
    partsInfo.push({ id, name: nameEl?.textContent ?? id });
  }

  return { title, composer, partsInfo };
}

// ─── API PÚBLICA — CONTRATO COMPATÍVEL COM server/routers/editor.ts ─────────

/**
 * Importa uma string MusicXML (<score-partwise>) e retorna a estrutura
 * completa consumida por editor.ts: brailleContent, título, compositor,
 * fórmula de compasso, armadura e contagem de notas.
 *
 * @param xmlContent — Conteúdo MusicXML bruto (arquivo .xml/.musicxml)
 * @param options    — isPiano (pauta dupla), measureAlternation (compassos
 *                     por bloco), partIndex — TODOS opcionais; editor.ts
 *                     hoje não passa este argumento, preservando o
 *                     comportamento atual (isPiano=false) sem quebra.
 */
export async function parseMusicXML(
  xmlContent: string,
  options: MusicXMLImportOptions = {},
): Promise<ParsedMusicXML> {
  const dom = new JSDOM(xmlContent, { contentType: 'application/xml' });
  const doc = dom.window.document;

  const { title, composer, partsInfo } = extractHeaderMetadata(doc);
  const core = runImportMusicXMLCore(xmlContent, options);

  return {
    title,
    composer,
    notes:          core.notes,
    timeSignature:  core.timeSignature,
    key:            core.key,
    brailleContent: core.brailleContent,
    partsInfo,
  };
}

/**
 * Valida se o conteúdo é um MusicXML bem-formado com <score-partwise> e
 * ao menos uma <part>. Retorna {valid, errors} — formato consumido
 * diretamente por editor.ts (validation.valid / validation.errors.join(", ")).
 */
export async function validateMusicXML(
  xmlContent: string,
): Promise<{ valid: boolean; errors: string[] }> {
  const errors: string[] = [];

  try {
    const dom = new JSDOM(xmlContent, { contentType: 'application/xml' });
    const doc = dom.window.document;

    const parserError = doc.querySelector('parsererror');
    if (parserError) {
      errors.push(`XML malformado: ${parserError.textContent ?? 'erro de sintaxe'}`);
      return { valid: false, errors };
    }

    const scoreRoot = doc.querySelector('score-partwise');
    if (!scoreRoot) {
      if (doc.querySelector('score-timewise')) {
        errors.push('Formato <score-timewise> não é suportado — reexporte como <score-partwise>.');
      } else {
        errors.push('Arquivo não é um MusicXML válido (score-partwise não encontrado)');
      }
    } else {
      const parts = scoreRoot.querySelectorAll('part');
      if (parts.length === 0) {
        errors.push('Nenhuma parte (<part>) encontrada no arquivo');
      }
    }

    return { valid: errors.length === 0, errors };
  } catch (error) {
    return {
      valid: false,
      errors: [`Erro ao validar MusicXML: ${error instanceof Error ? error.message : 'Erro desconhecido'}`],
    };
  }
}

/**
 * Extrai metadados leves (título, compositor, nº de compassos/partes) sem
 * processar o Braille completo — útil para pré-visualização rápida antes
 * de confirmar a importação. Mantida por compatibilidade com consumidores
 * que possam depender dela fora deste router.
 */
export async function extractMusicXMLMetadata(xmlContent: string): Promise<{
  title: string;
  composer: string;
  measures: number;
  parts: number;
  partsInfo: { id: string; name: string }[];
}> {
  try {
    const dom = new JSDOM(xmlContent, { contentType: 'application/xml' });
    const doc = dom.window.document;

    const { title, composer, partsInfo } = extractHeaderMetadata(doc);
    const scoreRoot = doc.querySelector('score-partwise');
    const parts = scoreRoot ? Array.from(scoreRoot.querySelectorAll('part')) : [];
    const measures = parts.length > 0 ? parts[0].querySelectorAll('measure').length : 0;

    return { title, composer, measures, parts: parts.length, partsInfo };
  } catch {
    return { title: 'Unknown', composer: 'Unknown', measures: 0, parts: 0, partsInfo: [] };
  }
}

// ─── RE-EXPORTS DE COMPATIBILIDADE (parser legado) ───────────────────────────
// O parser antigo exportava NOTE_CHAR_MAP/OCTAVE_SIGN_MAP/ACCIDENTAL_SIGN_MAP/
// REST_CHAR_MAP e as funções noteTobraille/notesToBraille para uso externo.
// server/routers/editor.ts NÃO importa estes símbolos deste arquivo (importa
// noteTobraille de "./braille-symbols" para a feature de escalas) — mas
// mantemos os re-exports, agora construídos a partir das tabelas corretas
// (REVERSE_NOTE_MAP etc. com as regras de Grau 3 corrigidas), como rede de
// segurança para qualquer outro consumidor não visível nesta auditoria.

export const NOTE_CHAR_MAP       = NOTE_MAP;
export const OCTAVE_SIGN_MAP     = OCTAVE_MAP;
export const ACCIDENTAL_SIGN_MAP = ACCIDENTAL_MAP;
export const REST_CHAR_MAP       = REST_MAP;

export function noteTobraille(note: MusicalNote): string {
  let braille = '';
  if (note.accidental && REVERSE_ACCIDENTAL_MAP[note.accidental]) {
    braille += REVERSE_ACCIDENTAL_MAP[note.accidental];
  }
  const octGlyph = REVERSE_OCTAVE_MAP[note.octave];
  if (octGlyph) braille += octGlyph;

  const durKey: BrailleDuration = MUSICXML_TYPE_TO_DURATION[note.duration] ?? 'q';
  const noteGlyph = REVERSE_NOTE_MAP[note.pitch as NoteName]?.[durKey];
  if (noteGlyph) braille += noteGlyph;
  if (note.dotted) braille += AUGMENTATION_DOT;

  return braille;
}

export function notesToBraille(notes: MusicalNote[], measureIndices?: number[]): string {
  let result = '';
  let prevPitch: NoteName | null = null;
  let prevOctave: number | null = null;
  const measureStartSet = new Set(measureIndices ?? []);

  for (let i = 0; i < notes.length; i++) {
    const note = notes[i];
    if (i > 0 && measureStartSet.has(i)) {
      result += ' ';
      prevPitch = null;
      prevOctave = null;
    }

    if (note.accidental && REVERSE_ACCIDENTAL_MAP[note.accidental]) {
      result += REVERSE_ACCIDENTAL_MAP[note.accidental];
    }

    const pitch = note.pitch as NoteName;
    const needsOctave = prevPitch === null
      ? true
      : shouldEmitOctaveMarker(prevPitch, prevOctave!, pitch, note.octave);
    if (needsOctave) {
      const octGlyph = REVERSE_OCTAVE_MAP[note.octave];
      if (octGlyph) result += octGlyph;
    }

    const durKey: BrailleDuration = MUSICXML_TYPE_TO_DURATION[note.duration] ?? 'q';
    const noteGlyph = REVERSE_NOTE_MAP[pitch]?.[durKey];
    if (noteGlyph) result += noteGlyph;
    if (note.dotted) result += AUGMENTATION_DOT;

    prevPitch  = pitch;
    prevOctave = note.octave;
  }

  return result;
}
