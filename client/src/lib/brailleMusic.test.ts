import { describe, it, expect } from 'vitest';
import {
  parseBrailleMusic,
  parseBrailleLine,
  getQuickReference,
  describeBrailleChar,
  perkinsDotsToUnicode,
  unicodeToDots,
} from './brailleMusic';

describe('Braille Music Parser', () => {
  describe('parseBrailleMusic - Basic Parsing', () => {
    it('should parse a single note', () => {
      const result = parseBrailleMusic('⠽');
      expect(result.elements.length).toBeGreaterThan(0);
      const note = result.elements[0];
      expect(note.type).toBe('note');
      if (note.type === 'note') {
        expect(note.pitch).toBe('C');
      }
    });

    it('should parse multiple notes', () => {
      const result = parseBrailleMusic('⠽⠵');
      expect(result.elements.length).toBeGreaterThan(0);
      expect(result.elements.filter(e => e.type === 'note').length).toBeGreaterThanOrEqual(2);
    });

    it('should handle barlines (spaces)', () => {
      const result = parseBrailleMusic('⠽ ⠵');
      const barlines = result.elements.filter(e => e.type === 'barline');
      expect(barlines.length).toBeGreaterThan(0);
    });
  });

  describe('Disambiguation - Semibreve vs Semicolcheia', () => {
    it('should interpret single Y as semibreve in 4/4', () => {
      const result = parseBrailleMusic('⠽', { beatsPerMeasure: 4 });
      const note = result.elements.find(e => e.type === 'note');
      expect(note?.type).toBe('note');
      if (note?.type === 'note') {
        expect(note.duration).toBe('w'); // whole note (semibreve)
      }
    });

    it('should interpret two Ys as semicolcheias in 4/4 (ambiguous group)', () => {
      const result = parseBrailleMusic('⠽⠽', { beatsPerMeasure: 4 });
      const notes = result.elements.filter(e => e.type === 'note');
      expect(notes.length).toBe(2);
      
      // Both should be 16th notes (semicolcheias) because 2 semibreves don't fit
      if (notes[0]?.type === 'note') {
        expect(notes[0].duration).toBe('16');
      }
      if (notes[1]?.type === 'note') {
        expect(notes[1].duration).toBe('16');
      }
    });

    it('should handle mixed semibreves and semicolcheias across measures', () => {
      const result = parseBrailleMusic('⠽ ⠽⠽', { beatsPerMeasure: 4 });
      const notes = result.elements.filter(e => e.type === 'note');
      
      expect(notes.length).toBe(3);
      
      // First note: semibreve (4 beats, fits in measure)
      if (notes[0]?.type === 'note') {
        expect(notes[0].duration).toBe('w');
      }
      
      // Second note: semibreve (4 beats, new measure)
      if (notes[1]?.type === 'note') {
        expect(notes[1].duration).toBe('w');
      }
      
      // Third note: semicolcheia (doesn't fit with second)
      if (notes[2]?.type === 'note') {
        expect(notes[2].duration).toBe('16');
      }
    });

    it('should interpret half notes correctly in 4/4', () => {
      const result = parseBrailleMusic('⠝⠝⠝⠝', { beatsPerMeasure: 4 });
      const notes = result.elements.filter(e => e.type === 'note');
      
      // First two should be half notes (2 beats each = 4 beats total)
      if (notes[0]?.type === 'note') {
        expect(notes[0].duration).toBe('h');
      }
      if (notes[1]?.type === 'note') {
        expect(notes[1].duration).toBe('h');
      }
      
      // Third and fourth should be 32nds (don't fit)
      if (notes[2]?.type === 'note') {
        expect(notes[2].duration).toBe('32');
      }
      if (notes[3]?.type === 'note') {
        expect(notes[3].duration).toBe('32');
      }
    });

    it('should handle 3/4 time signature', () => {
      const result = parseBrailleMusic('⠽⠽⠽', { beatsPerMeasure: 3 });
      const notes = result.elements.filter(e => e.type === 'note');
      
      // 3 semibreves = 12 beats, but 3/4 = 3 beats max
      // So all three should be semicolcheias (0.25 beats each = 0.75 total)
      expect(notes.length).toBe(3);
      for (const note of notes) {
        if (note.type === 'note') {
          expect(note.duration).toBe('16');
        }
      }
    });

    it('should handle 6/8 time signature', () => {
      const result = parseBrailleMusic('⠽', { beatsPerMeasure: 6 });
      const note = result.elements.find(e => e.type === 'note');
      
      // In 6/8, a semibreve (4 beats) doesn't fit (6 beats max)
      // But a single note should still be interpreted as semibreve if it fits
      if (note?.type === 'note') {
        expect(note.duration).toBe('w'); // fits in 6/8
      }
    });
  });

  describe('Quick Reference', () => {
    it('should include note-whole-forced category', () => {
      const ref = getQuickReference();
      const forcedSemibreves = ref.filter(e => e.category === 'note-whole-forced');
      expect(forcedSemibreves.length).toBe(7); // C through B
    });

    it('should include timesig category', () => {
      const ref = getQuickReference();
      const timesigs = ref.filter(e => e.category === 'timesig');
      expect(timesigs.length).toBeGreaterThanOrEqual(4); // 4/4, 3/4, 2/4, 6/8
    });

    it('should include barline category', () => {
      const ref = getQuickReference();
      const barlines = ref.filter(e => e.category === 'barline');
      expect(barlines.length).toBeGreaterThanOrEqual(3); // barline, end, ritornelo
    });

    it('should include other category with ligaduras', () => {
      const ref = getQuickReference();
      const others = ref.filter(e => e.category === 'other');
      expect(others.length).toBeGreaterThan(0);
      
      const hasLigadura = others.some(e => e.description.includes('Ligadura'));
      expect(hasLigadura).toBe(true);
    });
  });

  describe('Perkins Keyboard', () => {
    it('should convert Perkins dots to Unicode Braille', () => {
      const dots = { dot1: true, dot2: false, dot3: false, dot4: false, dot5: false, dot6: false };
      const char = perkinsDotsToUnicode(dots);
      expect(char).toBe('⠁');
    });

    it('should convert Unicode Braille to dots', () => {
      const dots = unicodeToDots('⠁');
      expect(dots).toContain(1);
      expect(dots.length).toBe(1);
    });

    it('should round-trip Perkins dots', () => {
      const originalDots = { dot1: true, dot2: true, dot3: false, dot4: true, dot5: false, dot6: false };
      const char = perkinsDotsToUnicode(originalDots);
      const recoveredDots = unicodeToDots(char);
      
      expect(recoveredDots).toContain(1);
      expect(recoveredDots).toContain(2);
      expect(recoveredDots).toContain(4);
      expect(recoveredDots).not.toContain(3);
      expect(recoveredDots).not.toContain(5);
      expect(recoveredDots).not.toContain(6);
    });
  });

  describe('Describe Braille Char', () => {
    it('should describe a note character', () => {
      const desc = describeBrailleChar('⠽');
      expect(desc).toContain('C');
      expect(desc).toContain('semibreve');
    });

    it('should describe a rest character', () => {
      const desc = describeBrailleChar('⠍');
      expect(desc).toContain('Pausa');
    });

    it('should describe an octave sign', () => {
      const desc = describeBrailleChar('⠐');
      expect(desc).toContain('Oitava');
    });
  });

  describe('Parse Line with Cursor', () => {
    it('should parse the line containing the cursor', () => {
      const fullText = '⠽⠵\n⠷⠾';
      const result = parseBrailleLine(fullText, 0); // cursor at start of first line
      
      expect(result.elements.length).toBeGreaterThan(0);
      const notes = result.elements.filter(e => e.type === 'note');
      expect(notes.length).toBeGreaterThanOrEqual(2); // at least C and D
    });

    it('should parse second line when cursor is there', () => {
      const fullText = '⠽⠵\n⠷⠾';
      const result = parseBrailleLine(fullText, 5); // cursor on second line
      
      expect(result.elements.length).toBeGreaterThan(0);
      const notes = result.elements.filter(e => e.type === 'note');
      expect(notes.length).toBeGreaterThanOrEqual(2); // at least G and B
    });
  });
});

describe('Key Signature Mapping - Official Braille Standard', () => {
  it('should parse 1 sharp (F major) correctly', () => {
    // ⠩ = 1 sharp (F major)
    const result = parseBrailleMusic('⠩ ⠼⠋ ⠐⠹');
    
    expect(result.errors).toEqual([]);
    expect(result.elements.length).toBeGreaterThan(0);
    
    // First element should be key signature
    const keySignature = result.elements.find(el => el.type === 'keysignature');
    expect(keySignature).toBeDefined();
    expect(keySignature?.vexKey).toBe('F');
  });

  it('should parse 2 sharps (G major) correctly', () => {
    // ⠩⠩ = 2 sharps (G major)
    const result = parseBrailleMusic('⠩⠩ ⠼⠋ ⠐⠹');
    
    expect(result.errors).toEqual([]);
    const keySignature = result.elements.find(el => el.type === 'keysignature');
    expect(keySignature).toBeDefined();
    expect(keySignature?.vexKey).toBe('C');
  });

  it('should parse 3 sharps (A major) correctly', () => {
    // ⠩⠩⠩ = 3 sharps (A major)
    const result = parseBrailleMusic('⠩⠩⠩ ⠼⠋ ⠐⠹');
    
    expect(result.errors).toEqual([]);
    const keySignature = result.elements.find(el => el.type === 'keysignature');
    expect(keySignature).toBeDefined();
    expect(keySignature?.vexKey).toBe('G');
  });

  it('should parse 1 flat (F major) correctly', () => {
    // ⠣ = 1 flat (F major)
    const result = parseBrailleMusic('⠣ ⠼⠋ ⠐⠹');
    
    expect(result.errors).toEqual([]);
    const keySignature = result.elements.find(el => el.type === 'keysignature');
    expect(keySignature).toBeDefined();
    expect(keySignature?.vexKey).toBe('f');
  });

  it('should parse 2 flats (Bb major) correctly', () => {
    // ⠣⠣ = 2 flats (Bb major)
    const result = parseBrailleMusic('⠣⠣ ⠼⠋ ⠐⠹');
    
    expect(result.errors).toEqual([]);
    const keySignature = result.elements.find(el => el.type === 'keysignature');
    expect(keySignature).toBeDefined();
    expect(keySignature?.vexKey).toBe('c');
  });

  it('should parse 3 flats (Eb major) correctly', () => {
    // ⠣⠣⠣ = 3 flats (Eb major)
    const result = parseBrailleMusic('⠣⠣⠣ ⠼⠋ ⠐⠹');
    
    expect(result.errors).toEqual([]);
    const keySignature = result.elements.find(el => el.type === 'keysignature');
    expect(keySignature).toBeDefined();
    expect(keySignature?.vexKey).toBe('g');
  });

  it('should parse key signature with spaces correctly', () => {
    // ⠩ ⠼⠙ ⠐⠹ = 1 sharp + 4/4 + Do
    const result = parseBrailleMusic('⠩ ⠼⠙ ⠐⠹');
    
    expect(result.errors).toEqual([]);
    expect(result.elements.length).toBeGreaterThan(0);
    
    const keySignature = result.elements.find(el => el.type === 'keysignature');
    expect(keySignature).toBeDefined();
    expect(keySignature?.vexKey).toBe('F');
    
    // Should also have time signature and note
    const timeSignature = result.elements.find(el => el.type === 'timesignature');
    expect(timeSignature).toBeDefined();
    
    const note = result.elements.find(el => el.type === 'note');
    expect(note).toBeDefined();
  });

  it('should parse 2 flats with spaces correctly', () => {
    // ⠣⠣ ⠼⠉ ⠐⠹⠱ = 2 flats + 3/4 + Do Re
    const result = parseBrailleMusic('⠣⠣ ⠼⠉ ⠐⠹⠱');
    
    expect(result.errors).toEqual([]);
    
    const keySignature = result.elements.find(el => el.type === 'keysignature');
    expect(keySignature).toBeDefined();
    expect(keySignature?.vexKey).toBe('c');
    
    const timeSignature = result.elements.find(el => el.type === 'timesignature');
    expect(timeSignature).toBeDefined();
    expect(timeSignature?.numerator).toBe(3);
    expect(timeSignature?.denominator).toBe(4);
    
    // Should have 2 notes
    const notes = result.elements.filter(el => el.type === 'note');
    expect(notes.length).toBe(2);
  });

  it('should handle no key signature (C major)', () => {
    // No key signature = C major
    const result = parseBrailleMusic('⠼⠙ ⠐⠹');
    
    expect(result.errors).toEqual([]);
    
    // Should NOT have a key signature element
    const keySignature = result.elements.find(el => el.type === 'keysignature');
    expect(keySignature).toBeUndefined();
    
    // Should have time signature and note
    const timeSignature = result.elements.find(el => el.type === 'timesignature');
    expect(timeSignature).toBeDefined();
    
    const note = result.elements.find(el => el.type === 'note');
    expect(note).toBeDefined();
  });
});


describe('CRITICAL VALIDATION - Parsing Order and Structure', () => {
  it('VALIDATION 1: ⠩ ⠼⠙ ⠐⠹ (1 sharp + 4/4 + 4th octave + C)', () => {
    const result = parseBrailleMusic('⠩ ⠼⠙ ⠐⠹');
    
    // Should have NO errors
    expect(result.errors).toEqual([]);
    
    // Should have exactly 3 elements: key signature, time signature, note
    expect(result.elements.length).toBe(3);
    
    // Element 1: Key signature (1 sharp = F major)
    expect(result.elements[0].type).toBe('keysignature');
    expect(result.elements[0].vexKey).toBe('F');
    
    // Element 2: Time signature (4/4)
    expect(result.elements[1].type).toBe('timesignature');
    expect(result.elements[1].numerator).toBe(4);
    expect(result.elements[1].denominator).toBe(4);
    
    // Element 3: Note (C in 4th octave)
    expect(result.elements[2].type).toBe('note');
    expect(result.elements[2].pitch).toBe('C');
    expect(result.elements[2].octave).toBe(4);
    expect(result.elements[2].duration).toBe('q'); // quarter note (semínima)
    
    // CRITICAL: Should NOT have any extra rests or barlines
    const rests = result.elements.filter(el => el.type === 'rest');
    expect(rests.length).toBe(0);
  });

  it('VALIDATION 2: ⠼⠙⠩ ⠼⠉ ⠐⠹⠱⠫ (4 sharps + 3/4 + 4th octave + C D E)', () => {
    const result = parseBrailleMusic('⠼⠙⠩ ⠼⠉ ⠐⠹⠱⠫');
    
    // Should have NO errors
    expect(result.errors).toEqual([]);
    
    // Should have: key signature, time signature, 3 notes (no extra rests)
    const keySignatures = result.elements.filter(el => el.type === 'keysignature');
    const timeSignatures = result.elements.filter(el => el.type === 'timesignature');
    const notes = result.elements.filter(el => el.type === 'note');
    const rests = result.elements.filter(el => el.type === 'rest');
    
    expect(keySignatures.length).toBe(1);
    expect(timeSignatures.length).toBe(1);
    expect(notes.length).toBe(3);
    expect(rests.length).toBe(0); // CRITICAL: NO extra rests
    
    // Key signature: 4 sharps = D major
    expect(keySignatures[0].vexKey).toBe('D');
    
    // Time signature: 3/4
    expect(timeSignatures[0].numerator).toBe(3);
    expect(timeSignatures[0].denominator).toBe(4);
    
    // Notes: C, D, E in 4th octave
    expect(notes[0].pitch).toBe('C');
    expect(notes[0].octave).toBe(4);
    expect(notes[1].pitch).toBe('D');
    expect(notes[1].octave).toBe(4);
    expect(notes[2].pitch).toBe('E');
    expect(notes[2].octave).toBe(4);
  });

  it('VALIDATION 3: ⠣ ⠼⠙ ⠐⠹ (1 flat + 4/4 + 4th octave + C)', () => {
    const result = parseBrailleMusic('⠣ ⠼⠙ ⠐⠹');
    
    // Should have NO errors
    expect(result.errors).toEqual([]);
    
    // Should have exactly 3 elements: key signature, time signature, note
    expect(result.elements.length).toBe(3);
    
    // Element 1: Key signature (1 flat = F major)
    expect(result.elements[0].type).toBe('keysignature');
    expect(result.elements[0].vexKey).toBe('f'); // lowercase for flats
    
    // Element 2: Time signature (4/4)
    expect(result.elements[1].type).toBe('timesignature');
    expect(result.elements[1].numerator).toBe(4);
    expect(result.elements[1].denominator).toBe(4);
    
    // Element 3: Note (C in 4th octave, natural - no accidental)
    expect(result.elements[2].type).toBe('note');
    expect(result.elements[2].pitch).toBe('C');
    expect(result.elements[2].octave).toBe(4);
    expect(result.elements[2].accidental).toBeUndefined(); // Natural, not affected by key signature
    
    // CRITICAL: Should NOT have any extra rests or barlines
    const rests = result.elements.filter(el => el.type === 'rest');
    expect(rests.length).toBe(0);
  });

  it('should NOT duplicate key signatures or time signatures across measures', () => {
    const result = parseBrailleMusic('⠩ ⠼⠙ ⠐⠹ ⠱ ⠫');
    
    // Count structural elements
    const keySignatures = result.elements.filter(el => el.type === 'keysignature');
    const timeSignatures = result.elements.filter(el => el.type === 'timesignature');
    
    // CRITICAL: Each should appear only ONCE at the beginning
    expect(keySignatures.length).toBe(1);
    expect(timeSignatures.length).toBe(1);
    
    // Key signature should be first
    expect(result.elements[0].type).toBe('keysignature');
    
    // Time signature should be second
    expect(result.elements[1].type).toBe('timesignature');
  });

  it('should respect octave sign at the beginning of remaining tokens', () => {
    // Test that octave sign is processed before notes
    const result = parseBrailleMusic('⠩ ⠼⠙ ⠐⠹⠱⠫');
    
    const notes = result.elements.filter(el => el.type === 'note');
    
    // All notes should be in 4th octave (set by ⠐)
    expect(notes.every(n => n.octave === 4)).toBe(true);
  });
});
