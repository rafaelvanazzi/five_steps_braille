import { describe, it, expect } from "vitest";
import {
  parseMusicXML,
  validateMusicXML,
  extractMusicXMLMetadata,
} from "./musicxml-parser";

// Exemplo mínimo de MusicXML válido
const validMusicXML = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE score-partwise PUBLIC "-//Recordare//DTD MusicXML 3.1 Partwise//EN" "http://www.musicxml.org/dtds/partwise.dtd">
<score-partwise version="3.1">
  <work>
    <work-title>Test Score</work-title>
  </work>
  <movement-title>Test Movement</movement-title>
  <identification>
    <creator type="composer">Test Composer</creator>
  </identification>
  <part-list>
    <score-part id="P1">
      <part-name>Piano</part-name>
    </score-part>
  </part-list>
  <part id="P1">
    <measure number="1">
      <attributes>
        <divisions>4</divisions>
        <key>
          <fifths>0</fifths>
        </key>
        <time>
          <beats>4</beats>
          <beat-type>4</beat-type>
        </time>
        <clef>
          <sign>G</sign>
          <line>2</line>
        </clef>
      </attributes>
      <note>
        <pitch>
          <step>C</step>
          <octave>4</octave>
        </pitch>
        <duration>4</duration>
        <type>quarter</type>
      </note>
      <note>
        <pitch>
          <step>D</step>
          <octave>4</octave>
        </pitch>
        <duration>4</duration>
        <type>quarter</type>
      </note>
    </measure>
  </part>
</score-partwise>`;

const invalidMusicXML = `<?xml version="1.0"?>
<invalid>This is not MusicXML</invalid>`;

describe("MusicXML Parser", () => {
  describe("validateMusicXML", () => {
    it("should validate correct MusicXML", async () => {
      const result = await validateMusicXML(validMusicXML);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it("should reject invalid MusicXML", async () => {
      const result = await validateMusicXML(invalidMusicXML);
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it("should reject empty string", async () => {
      const result = await validateMusicXML("");
      expect(result.valid).toBe(false);
    });
  });

  describe("parseMusicXML", () => {
    it("should parse valid MusicXML", async () => {
      const result = await parseMusicXML(validMusicXML);
      expect(result.title).toBe("Test Movement");
      expect(result.composer).toBe("Test Composer");
      expect(result.notes.length).toBeGreaterThan(0);
    });

    it("should extract time signature", async () => {
      const result = await parseMusicXML(validMusicXML);
      expect(result.timeSignature.beats).toBe(4);
      expect(result.timeSignature.beatType).toBe(4);
    });

    it("should extract key signature", async () => {
      const result = await parseMusicXML(validMusicXML);
      expect(result.key.fifths).toBe(0);
      expect(result.key.mode).toBe("major");
    });

    it("should generate Braille content", async () => {
      const result = await parseMusicXML(validMusicXML);
      expect(result.brailleContent).toBeTruthy();
      expect(result.brailleContent.length).toBeGreaterThan(0);
    });

    it("should parse notes with correct pitch and octave", async () => {
      const result = await parseMusicXML(validMusicXML);
      expect(result.notes.length).toBeGreaterThanOrEqual(2);
      expect(result.notes[0].pitch).toBe("C");
      expect(result.notes[0].octave).toBe(4);
      expect(result.notes[1].pitch).toBe("D");
    });

    it("should throw error for invalid MusicXML", async () => {
      try {
        await parseMusicXML(invalidMusicXML);
        expect.fail("Should have thrown an error");
      } catch (error) {
        expect(error).toBeTruthy();
      }
    });
  });

  describe("extractMusicXMLMetadata", () => {
    it("should extract title", async () => {
      const metadata = await extractMusicXMLMetadata(validMusicXML);
      expect(metadata.title).toBe("Test Movement");
    });

    it("should extract composer", async () => {
      const metadata = await extractMusicXMLMetadata(validMusicXML);
      expect(metadata.composer).toBe("Test Composer");
    });

    it("should count measures", async () => {
      const metadata = await extractMusicXMLMetadata(validMusicXML);
      expect(metadata.measures).toBeGreaterThan(0);
    });

    it("should count parts", async () => {
      const metadata = await extractMusicXMLMetadata(validMusicXML);
      expect(metadata.parts).toBeGreaterThan(0);
    });

    it("should handle invalid XML gracefully", async () => {
      const metadata = await extractMusicXMLMetadata(invalidMusicXML);
      expect(metadata.title).toBe("Unknown");
      expect(metadata.composer).toBe("Unknown");
    });
  });
});
