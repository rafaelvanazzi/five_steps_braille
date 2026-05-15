import { describe, it, expect } from "vitest";
import {
  noteTobraille,
  notesToBraille,
  midiToNote,
  noteToMidi,
  isValidNote,
  generateScale,
  BRAILLE_SYMBOLS,
  MusicalNote,
} from "./braille-symbols";

describe("Braille Symbols - Advanced Music Notation", () => {
  describe("noteTobraille", () => {
    it("should convert a basic note to Braille", () => {
      const note: MusicalNote = {
        pitch: "C",
        octave: 4,
        duration: "quarter",
      };
      const result = noteTobraille(note);
      expect(result).toBeTruthy();
      expect(result.length).toBeGreaterThan(0);
    });

    it("should include accidental in Braille representation", () => {
      const note: MusicalNote = {
        pitch: "C",
        octave: 4,
        accidental: "sharp",
        duration: "quarter",
      };
      const result = noteTobraille(note);
      expect(result).toContain(BRAILLE_SYMBOLS.accidentals.sharp);
    });

    it("should include dotted note indicator", () => {
      const note: MusicalNote = {
        pitch: "D",
        octave: 4,
        duration: "half",
        dotted: true,
      };
      const result = noteTobraille(note);
      expect(result).toContain(BRAILLE_SYMBOLS.durations.dotted);
    });

    it("should include articulation in Braille representation", () => {
      const note: MusicalNote = {
        pitch: "E",
        octave: 4,
        duration: "quarter",
        articulation: "staccato",
      };
      const result = noteTobraille(note);
      expect(result).toContain(BRAILLE_SYMBOLS.articulation.staccato);
    });

    it("should include dynamic marking", () => {
      const note: MusicalNote = {
        pitch: "F",
        octave: 4,
        duration: "quarter",
        dynamic: "f",
      };
      const result = noteTobraille(note);
      expect(result).toContain(BRAILLE_SYMBOLS.dynamics.f);
    });

    it("should include fermata when specified", () => {
      const note: MusicalNote = {
        pitch: "G",
        octave: 4,
        duration: "whole",
        fermata: true,
      };
      const result = noteTobraille(note);
      expect(result).toContain(BRAILLE_SYMBOLS.expression.fermata);
    });
  });

  describe("notesToBraille", () => {
    it("should convert multiple notes to Braille", () => {
      const notes: MusicalNote[] = [
        { pitch: "C", octave: 4, duration: "quarter" },
        { pitch: "D", octave: 4, duration: "quarter" },
        { pitch: "E", octave: 4, duration: "quarter" },
      ];
      const result = notesToBraille(notes);
      expect(result).toBeTruthy();
      expect(result.length).toBeGreaterThan(0);
    });

    it("should join notes without separator", () => {
      const notes: MusicalNote[] = [
        { pitch: "C", octave: 4, duration: "quarter" },
        { pitch: "C", octave: 4, duration: "quarter" },
      ];
      const result = notesToBraille(notes);
      expect(result).not.toContain(" ");
    });
  });

  describe("MIDI Conversion", () => {
    it("should convert MIDI number to note", () => {
      const result = midiToNote(60); // C4
      expect(result.pitch).toBe("C");
      expect(result.octave).toBe(4);
    });

    it("should convert note to MIDI number", () => {
      const result = noteToMidi("C", 4);
      expect(result).toBe(60);
    });

    it("should handle sharp accidental in MIDI conversion", () => {
      const result = noteToMidi("C", 4, "sharp");
      expect(result).toBe(61);
    });

    it("should handle flat accidental in MIDI conversion", () => {
      const result = noteToMidi("D", 4, "flat");
      expect(result).toBe(61);
    });

    it("should handle double sharp", () => {
      const result = noteToMidi("C", 4, "doubleSharp");
      expect(result).toBe(62);
    });

    it("should handle double flat", () => {
      const result = noteToMidi("D", 4, "doubleFlat");
      expect(result).toBe(60);
    });
  });

  describe("Note Validation", () => {
    it("should validate a correct note", () => {
      const note: MusicalNote = {
        pitch: "A",
        octave: 5,
        duration: "eighth",
      };
      expect(isValidNote(note)).toBe(true);
    });

    it("should reject invalid pitch", () => {
      const note: MusicalNote = {
        pitch: "H",
        octave: 4,
        duration: "quarter",
      };
      expect(isValidNote(note)).toBe(false);
    });

    it("should reject invalid octave", () => {
      const note: MusicalNote = {
        pitch: "C",
        octave: 8,
        duration: "quarter",
      };
      expect(isValidNote(note)).toBe(false);
    });

    it("should reject invalid duration", () => {
      const note: MusicalNote = {
        pitch: "C",
        octave: 4,
        duration: "invalid" as any,
      };
      expect(isValidNote(note)).toBe(false);
    });
  });

  describe("Scale Generation", () => {
    it("should generate major scale", () => {
      const scale = generateScale("C", 4, "major", 8);
      expect(scale).toHaveLength(8);
      expect(scale[0].pitch).toBe("C");
      expect(scale[0].octave).toBe(4);
    });

    it("should generate minor scale", () => {
      const scale = generateScale("A", 4, "minor", 8);
      expect(scale).toHaveLength(8);
      expect(scale[0].pitch).toBe("A");
    });

    it("should generate pentatonic scale", () => {
      const scale = generateScale("C", 4, "pentatonic", 5);
      expect(scale).toHaveLength(5);
    });

    it("should generate scale with correct octave progression", () => {
      const scale = generateScale("G", 4, "major", 8);
      // Verify that octaves increase appropriately
      let lastOctave = scale[0].octave;
      for (let i = 1; i < scale.length; i++) {
        expect(scale[i].octave).toBeGreaterThanOrEqual(lastOctave);
        lastOctave = scale[i].octave;
      }
    });

    it("should generate scale with correct pitch sequence for major", () => {
      const scale = generateScale("C", 4, "major", 8);
      const pitches = scale.map((n) => n.pitch);
      expect(pitches).toEqual(["C", "D", "E", "F", "G", "A", "B", "C"]);
    });
  });

  describe("Braille Symbols Constants", () => {
    it("should have all note symbols", () => {
      expect(BRAILLE_SYMBOLS.notes['C-quarter']).toBeTruthy();
      expect(BRAILLE_SYMBOLS.notes['D-quarter']).toBeTruthy();
      expect(BRAILLE_SYMBOLS.notes['E-quarter']).toBeTruthy();
      expect(BRAILLE_SYMBOLS.notes['F-quarter']).toBeTruthy();
      expect(BRAILLE_SYMBOLS.notes['G-quarter']).toBeTruthy();
      expect(BRAILLE_SYMBOLS.notes['A-quarter']).toBeTruthy();
      expect(BRAILLE_SYMBOLS.notes['B-quarter']).toBeTruthy();
    });

    it("should have all accidental symbols", () => {
      expect(BRAILLE_SYMBOLS.accidentals.sharp).toBeTruthy();
      expect(BRAILLE_SYMBOLS.accidentals.flat).toBeTruthy();
      expect(BRAILLE_SYMBOLS.accidentals.natural).toBeTruthy();
    });

    it("should have all duration symbols", () => {
      expect(BRAILLE_SYMBOLS.durations.whole).toBeTruthy();
      expect(BRAILLE_SYMBOLS.durations.half).toBeTruthy();
      expect(BRAILLE_SYMBOLS.durations.quarter).toBeTruthy();
      expect(BRAILLE_SYMBOLS.durations.eighth).toBeTruthy();
    });

    it("should have all dynamic symbols", () => {
      expect(BRAILLE_SYMBOLS.dynamics.p).toBeTruthy();
      expect(BRAILLE_SYMBOLS.dynamics.f).toBeTruthy();
      expect(BRAILLE_SYMBOLS.dynamics.mf).toBeTruthy();
    });

    it("should have all articulation symbols", () => {
      expect(BRAILLE_SYMBOLS.articulation.staccato).toBeTruthy();
      expect(BRAILLE_SYMBOLS.articulation.legato).toBeTruthy();
      expect(BRAILLE_SYMBOLS.articulation.tenuto).toBeTruthy();
    });
  });
});
