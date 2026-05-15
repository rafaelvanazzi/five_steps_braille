/**
 * Advanced Braille Music Symbols Module
 * Handles accidentals, dynamics, articulation, and other musical symbols
 */

// Mapeamento de símbolos musicais para Braille Unicode
export const BRAILLE_SYMBOLS = {
  // Notas básicas (7 notas naturais)
  notes: {
    C: "\u2801", // Ponto 1
    D: "\u2802", // Ponto 2
    E: "\u2804", // Ponto 3
    F: "\u2808", // Ponto 4
    G: "\u2810", // Ponto 5
    A: "\u2820", // Ponto 6
    B: "\u2840", // Ponto 7
  },

  // Alterações (Accidentals)
  accidentals: {
    sharp: "\u2843", // Sustenido (pontos 1,2,4)
    flat: "\u2863", // Bemol (pontos 1,2,3,4,6)
    natural: "\u2823", // Bequadro (pontos 1,2,6)
    doubleSharp: "\u2847", // Duplo sustenido (pontos 1,2,3,4)
    doubleFlat: "\u2867", // Duplo bemol (pontos 1,2,3,4,5,6)
  },

  // Durações (Note Durations)
  durations: {
    whole: "\u2806", // Semibreve (pontos 2,3)
    half: "\u2803", // Mínima (pontos 1,2)
    quarter: "\u2809", // Semínima (pontos 1,4)
    eighth: "\u280c", // Colcheia (pontos 3,4)
    sixteenth: "\u2818", // Semicolcheia (pontos 4,5)
    thirtysecond: "\u2830", // Fusa (pontos 5,6)
    sixtyfourth: "\u2860", // Semifusa (pontos 6,7)
    dotted: "\u2805", // Ponto de aumento (pontos 1,3)
  },

  // Dinâmica (Dynamics)
  dynamics: {
    ppp: "\u2842", // Pianíssimo (pontos 1,4)
    pp: "\u2844", // Pianíssimo (pontos 1,3,4)
    p: "\u2840", // Piano (pontos 7)
    mp: "\u2848", // Mezzo-piano (pontos 1,4,5)
    mf: "\u2850", // Mezzo-forte (pontos 5,6)
    f: "\u2852", // Forte (pontos 2,4,5)
    ff: "\u2854", // Fortíssimo (pontos 1,2,4,5)
    fff: "\u2856", // Fortíssimo (pontos 1,2,3,4,5)
    sfz: "\u2858", // Sforzando (pontos 4,5,6)
  },

  // Articulação (Articulation)
  articulation: {
    staccato: "\u2801", // Staccato (pontos 1)
    legato: "\u2802", // Ligado (pontos 2)
    tenuto: "\u2804", // Tenuto (pontos 3)
    marcato: "\u2808", // Marcato (pontos 4)
    accent: "\u2810", // Acento (pontos 5)
    heavyAccent: "\u2820", // Acento pesado (pontos 6)
    portato: "\u2840", // Portato (pontos 7)
  },

  // Pausas (Rests)
  rests: {
    wholeRest: "\u2806", // Pausa de semibreve
    halfRest: "\u2803", // Pausa de mínima
    quarterRest: "\u2809", // Pausa de semínima
    eighthRest: "\u280c", // Pausa de colcheia
    sixteenthRest: "\u2818", // Pausa de semicolcheia
  },

  // Sinais de compasso (Time Signatures)
  timeSignatures: {
    common: "\u2807", // Compasso comum (C) - pontos 1,2,3
    cut: "\u2815", // Compasso cortado (C/) - pontos 1,2,4,5
    duple: "\u2809", // Binário - pontos 1,4
    triple: "\u2811", // Ternário - pontos 1,4,5
    quadruple: "\u2819", // Quaternário - pontos 1,4,5,6
  },

  // Símbolos de repetição (Repeat Symbols)
  repeats: {
    repeat: "\u2825", // Repetição - pontos 1,2,6
    ending1: "\u282d", // 1ª vez - pontos 1,2,3,6
    ending2: "\u282e", // 2ª vez - pontos 1,2,3,4,6
    coda: "\u2835", // Coda - pontos 1,2,3,5,6
    segno: "\u2836", // Segno - pontos 1,2,3,5,6,7
  },

  // Símbolos de expressão (Expression Marks)
  expression: {
    crescendo: "\u2843", // Crescendo (pontos 1,2,4)
    diminuendo: "\u2845", // Diminuendo (pontos 1,2,3,5)
    fermata: "\u2849", // Fermata (pontos 1,3,4,5)
    breath: "\u284b", // Respiração (pontos 1,2,3,4,5)
    caesura: "\u284d", // Cesura (pontos 1,2,3,5,6)
  },

  // Claves (Clefs)
  clefs: {
    treble: "\u2801", // Clave de sol (pontos 1)
    bass: "\u2802", // Clave de fá (pontos 2)
    alto: "\u2804", // Clave de dó (pontos 3)
  },

  // Acidentes de oitava (Octave Indicators)
  octaves: {
    octave0: "\u2800", // Oitava 0
    octave1: "\u2801", // Oitava 1
    octave2: "\u2802", // Oitava 2
    octave3: "\u2804", // Oitava 3
    octave4: "\u2808", // Oitava 4
    octave5: "\u2810", // Oitava 5
    octave6: "\u2820", // Oitava 6
    octave7: "\u2840", // Oitava 7
  },
};

// Estrutura para representar uma nota com todos os modificadores
export interface MusicalNote {
  pitch: string; // C, D, E, F, G, A, B
  octave: number; // 0-7
  accidental?: "sharp" | "flat" | "natural" | "doubleSharp" | "doubleFlat";
  duration: "whole" | "half" | "quarter" | "eighth" | "sixteenth" | "thirtysecond" | "sixtyfourth";
  dotted?: boolean;
  articulation?: keyof typeof BRAILLE_SYMBOLS.articulation;
  dynamic?: keyof typeof BRAILLE_SYMBOLS.dynamics;
  fermata?: boolean;
}

/**
 * Converter nota musical para Braille
 */
export function noteTobraille(note: MusicalNote): string {
  let braille = "";

  // Adicionar indicador de oitava
  const octaveKey = `octave${note.octave}` as keyof typeof BRAILLE_SYMBOLS.octaves;
  braille += BRAILLE_SYMBOLS.octaves[octaveKey] || "";

  // Adicionar alteração se houver
  if (note.accidental) {
    braille += BRAILLE_SYMBOLS.accidentals[note.accidental];
  }

  // Adicionar nota
  const noteKey = note.pitch as keyof typeof BRAILLE_SYMBOLS.notes;
  braille += BRAILLE_SYMBOLS.notes[noteKey];

  // Adicionar duração
  const durationKey = note.duration as keyof typeof BRAILLE_SYMBOLS.durations;
  braille += BRAILLE_SYMBOLS.durations[durationKey];

  // Adicionar ponto de aumento se for dotted
  if (note.dotted) {
    braille += BRAILLE_SYMBOLS.durations.dotted;
  }

  // Adicionar articulação se houver
  if (note.articulation) {
    braille += BRAILLE_SYMBOLS.articulation[note.articulation];
  }

  // Adicionar dinâmica se houver
  if (note.dynamic) {
    braille += BRAILLE_SYMBOLS.dynamics[note.dynamic];
  }

  // Adicionar fermata se houver
  if (note.fermata) {
    braille += BRAILLE_SYMBOLS.expression.fermata;
  }

  return braille;
}

/**
 * Converter múltiplas notas para Braille
 */
export function notesToBraille(notes: MusicalNote[]): string {
  return notes.map((note) => noteTobraille(note)).join("");
}

/**
 * Converter nota MIDI para nota musical
 * MIDI: 0-127, onde 60 = C4 (Dó central)
 */
export function midiToNote(midiNumber: number): { pitch: string; octave: number } {
  const pitches = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
  const pitchIndex = midiNumber % 12;
  const octave = Math.floor(midiNumber / 12) - 1;

  let pitch = pitches[pitchIndex];
  // Converter sustenido para bemol se necessário
  if (pitch.includes("#")) {
    const pitchMap: Record<string, string> = {
      "C#": "Db",
      "D#": "Eb",
      "F#": "Gb",
      "G#": "Ab",
      "A#": "Bb",
    };
    pitch = pitchMap[pitch] || pitch;
  }

  return { pitch: pitch[0], octave };
}

/**
 * Converter nota para MIDI
 */
export function noteToMidi(pitch: string, octave: number, accidental?: string): number {
  const pitches: Record<string, number> = {
    C: 0,
    D: 2,
    E: 4,
    F: 5,
    G: 7,
    A: 9,
    B: 11,
  };

  let midiNumber = (octave + 1) * 12 + pitches[pitch];

  if (accidental === "sharp") {
    midiNumber += 1;
  } else if (accidental === "flat") {
    midiNumber -= 1;
  } else if (accidental === "doubleSharp") {
    midiNumber += 2;
  } else if (accidental === "doubleFlat") {
    midiNumber -= 2;
  }

  return midiNumber;
}

/**
 * Validar se uma nota é válida
 */
export function isValidNote(note: MusicalNote): boolean {
  const validPitches = ["C", "D", "E", "F", "G", "A", "B"];
  const validOctaves = [0, 1, 2, 3, 4, 5, 6, 7];
  const validDurations = ["whole", "half", "quarter", "eighth", "sixteenth", "thirtysecond", "sixtyfourth"];

  return (
    validPitches.includes(note.pitch) &&
    validOctaves.includes(note.octave) &&
    validDurations.includes(note.duration)
  );
}

/**
 * Gerar escala em Braille
 */
export function generateScale(
  startPitch: string,
  startOctave: number,
  scaleType: "major" | "minor" | "pentatonic" = "major",
  length: number = 8
): MusicalNote[] {
  const pitches = ["C", "D", "E", "F", "G", "A", "B"];
  const startIndex = pitches.indexOf(startPitch);

  const notes: MusicalNote[] = [];

  for (let i = 0; i < length; i++) {
    const pitchIndex = (startIndex + i) % 7;
    const octaveOffset = Math.floor((startIndex + i) / 7);
    const octave = startOctave + octaveOffset;

    notes.push({
      pitch: pitches[pitchIndex],
      octave,
      duration: "quarter",
    });
  }

  return notes;
}
