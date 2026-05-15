/**
 * MusicXML Parser Module
 * Converts MusicXML files to Braille notation
 */

import { parseStringPromise } from "xml2js";
import { MusicalNote, noteTobraille, BRAILLE_SYMBOLS } from "./braille-symbols";

export interface MusicXMLNote {
  pitch?: Array<{
    step: string[];
    octave: string[];
    alter?: string[];
  }>;
  duration: string[];
  type: string[];
  dot?: string[];
  rest?: string[];
  articulations?: Array<{
    staccato?: string[];
    tenuto?: string[];
    accent?: string[];
    "strong-accent"?: string[];
  }>;
  dynamics?: Array<{
    p?: string[];
    f?: string[];
    pp?: string[];
    ff?: string[];
    mf?: string[];
    mp?: string[];
    sfz?: string[];
  }>;
  fermata?: string[];
}

export interface MusicXMLMeasure {
  note?: MusicXMLNote[];
  attributes?: Array<{
    divisions: string[];
    time?: Array<{
      beats: string[];
      "beat-type": string[];
    }>;
    clef?: Array<{
      sign: string[];
      line: string[];
    }>;
    key?: Array<{
      fifths: string[];
      mode?: string[];
    }>;
  }>;
}

export interface ParsedMusicXML {
  title: string;
  composer: string;
  notes: MusicalNote[];
  timeSignature: { beats: number; beatType: number };
  key: { fifths: number; mode: string };
  brailleContent: string;
}

/**
 * Converter tipo de nota para duração Braille
 */
function getNoteDuration(
  type: string,
  divisions: number
): "whole" | "half" | "quarter" | "eighth" | "sixteenth" | "thirtysecond" | "sixtyfourth" {
  const durationMap: Record<string, "whole" | "half" | "quarter" | "eighth" | "sixteenth" | "thirtysecond" | "sixtyfourth"> = {
    whole: "whole",
    half: "half",
    quarter: "quarter",
    eighth: "eighth",
    "16th": "sixteenth",
    "32nd": "thirtysecond",
    "64th": "sixtyfourth",
  };

  return durationMap[type] || "quarter";
}

/**
 * Extrair articulação de nota
 */
function getArticulation(
  articulations?: Array<{
    staccato?: string[];
    tenuto?: string[];
    accent?: string[];
    "strong-accent"?: string[];
  }>
): "staccato" | "legato" | "tenuto" | "marcato" | "accent" | undefined {
  if (!articulations || articulations.length === 0) return undefined;

  const art = articulations[0];
  if (art.staccato) return "staccato";
  if (art.tenuto) return "tenuto";
  if (art.accent) return "accent";
  if (art["strong-accent"]) return "marcato";

  return undefined;
}

/**
 * Extrair dinâmica de nota
 */
function getDynamic(
  dynamics?: Array<{
    p?: string[];
    f?: string[];
    pp?: string[];
    ff?: string[];
    mf?: string[];
    mp?: string[];
    sfz?: string[];
  }>
): string | undefined {
  if (!dynamics || dynamics.length === 0) return undefined;

  const dyn = dynamics[0];
  if (dyn.pp) return "pp";
  if (dyn.p) return "p";
  if (dyn.mp) return "mp";
  if (dyn.mf) return "mf";
  if (dyn.f) return "f";
  if (dyn.ff) return "ff";
  if (dyn.sfz) return "sfz";

  return undefined;
}

/**
 * Converter alteração (accidental)
 */
function getAccidental(alter?: string[]): "sharp" | "flat" | "natural" | undefined {
  if (!alter || alter.length === 0) return undefined;

  const alteration = parseInt(alter[0]);
  if (alteration === 1) return "sharp";
  if (alteration === -1) return "flat";
  if (alteration === 0) return "natural";

  return undefined;
}

/**
 * Fazer parse de arquivo MusicXML
 */
export async function parseMusicXML(xmlContent: string): Promise<ParsedMusicXML> {
  try {
    const parsed = await parseStringPromise(xmlContent);
    const scorePartwise = parsed["score-partwise"];

    if (!scorePartwise) {
      throw new Error("Arquivo MusicXML inválido: score-partwise não encontrado");
    }

    // Extrair metadados
    const workTitle = scorePartwise.work?.[0]?.["work-title"]?.[0] || "Untitled";
    const movementTitle = scorePartwise["movement-title"]?.[0] || workTitle;
    
    // Extrair composer - pode ser string ou objeto com propriedade "_"
    let composer = "Unknown";
    const creatorData = scorePartwise.identification?.[0]?.creator?.[0];
    if (typeof creatorData === "string") {
      composer = creatorData;
    } else if (creatorData && typeof creatorData === "object" && "_" in creatorData) {
      composer = creatorData._;
    }

    // Extrair medidas
    const parts = scorePartwise.part || [];
    if (parts.length === 0) {
      throw new Error("Nenhuma parte encontrada no arquivo MusicXML");
    }

    // Usar primeira parte
    const part = parts[0];
    const measures: MusicXMLMeasure[] = part.measure || [];

    let timeSignature = { beats: 4, beatType: 4 };
    let key = { fifths: 0, mode: "major" };
    let divisions = 4;
    const notes: MusicalNote[] = [];
    const measureStartIndices: number[] = []; // Track where each measure starts

    // Processar medidas
    for (const measure of measures) {
      // Track the start index of this measure's notes
      const measureStartIndex = notes.length;

      // Extrair atributos (time signature, key, etc)
      if (measure.attributes) {
        const attrs = measure.attributes[0];

        if (attrs.divisions) {
          divisions = parseInt(attrs.divisions[0]);
        }

        if (attrs.time) {
          const time = attrs.time[0];
          timeSignature = {
            beats: parseInt(time.beats[0]),
            beatType: parseInt(time["beat-type"][0]),
          };
        }

        if (attrs.key) {
          const keyData = attrs.key[0];
          key = {
            fifths: parseInt(keyData.fifths[0]),
            mode: keyData.mode?.[0] || "major",
          };
        }
      }

      // Processar notas
      if (measure.note) {
        for (const noteData of measure.note) {
          // Pular pausas
          if (noteData.rest) {
            continue;
          }

          if (noteData.pitch && noteData.pitch.length > 0) {
            const pitch = noteData.pitch[0];
            const step = pitch.step?.[0] || "C";
            const octave = parseInt(pitch.octave?.[0] || "4");
            const alter = pitch.alter;

            const duration = getNoteDuration(noteData.type?.[0] || "quarter", divisions);
            const dotted = noteData.dot ? true : false;
            const articulation = getArticulation(noteData.articulations);
            const dynamic = getDynamic(noteData.dynamics);
            const accidental = getAccidental(alter);
            const fermata = noteData.fermata ? true : false;

            notes.push({
              pitch: step,
              octave,
              accidental,
              duration,
              dotted,
              articulation,
              dynamic,
              fermata,
            });
          }
        }
      }

      // If this measure added notes, record its start index
      if (notes.length > measureStartIndex) {
        measureStartIndices.push(measureStartIndex);
      }
    }

    // Converter notas para Braille com barras de compasso entre medidas
    const { notesToBraille } = await import("./braille-symbols");
    const brailleContent = notesToBraille(notes, measureStartIndices);

    return {
      title: movementTitle,
      composer,
      notes,
      timeSignature,
      key,
      brailleContent,
    };
  } catch (error) {
    console.error("Erro ao fazer parse de MusicXML:", error);
    throw new Error(`Falha ao processar arquivo MusicXML: ${error instanceof Error ? error.message : "Erro desconhecido"}`);
  }
}

/**
 * Validar arquivo MusicXML
 */
export async function validateMusicXML(xmlContent: string): Promise<{ valid: boolean; errors: string[] }> {
  const errors: string[] = [];

  try {
    const parsed = await parseStringPromise(xmlContent);

    if (!parsed["score-partwise"]) {
      errors.push("Arquivo não é um MusicXML válido (score-partwise não encontrado)");
    }

    const scorePartwise = parsed["score-partwise"];
    if (!scorePartwise.part || scorePartwise.part.length === 0) {
      errors.push("Nenhuma parte encontrada no arquivo");
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  } catch (error) {
    return {
      valid: false,
      errors: [
        `Erro ao validar MusicXML: ${error instanceof Error ? error.message : "Erro desconhecido"}`,
      ],
    };
  }
}

/**
 * Extrair informações básicas de MusicXML sem fazer parse completo
 */
export async function extractMusicXMLMetadata(xmlContent: string): Promise<{
  title: string;
  composer: string;
  measures: number;
  parts: number;
}> {
  try {
    const parsed = await parseStringPromise(xmlContent);
    const scorePartwise = parsed["score-partwise"];

    const title = scorePartwise["movement-title"]?.[0] || scorePartwise.work?.[0]?.["work-title"]?.[0] || "Untitled";
    
    // Extrair composer - pode ser string ou objeto com propriedade "_"
    let composer = "Unknown";
    const creatorData = scorePartwise.identification?.[0]?.creator?.[0];
    if (typeof creatorData === "string") {
      composer = creatorData;
    } else if (creatorData && typeof creatorData === "object" && "_" in creatorData) {
      composer = creatorData._;
    }
    
    const measures = scorePartwise.part?.[0]?.measure?.length || 0;
    const parts = scorePartwise.part?.length || 0;

    return { title, composer, measures, parts };
  } catch (error) {
    console.error("Erro ao extrair metadados de MusicXML:", error);
    return {
      title: "Unknown",
      composer: "Unknown",
      measures: 0,
      parts: 0,
    };
  }
}
