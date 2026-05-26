import { describe, it, expect } from 'vitest';
import { parseBrailleMusic } from '../client/src/lib/brailleMusic';

describe('Braille Parser - Structural Order Validation', () => {
  describe('VALIDATION 1: ⠩ ⠼⠙ ⠐⠹ (1 sharp + 4/4 + 4th octave + C)', () => {
    it('should parse key signature, time signature, and note in correct order', () => {
      const result = parseBrailleMusic('⠩ ⠼⠙ ⠐⠹');
      
      // DEBUG: Log what we got
      console.log('Elements:', result.elements.map(el => ({ type: el.type, ...el })));
      
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
  });

  describe('VALIDATION 2: ⠼⠙⠩ ⠼⠉ ⠐⠹⠱⠫ (4 sharps + 3/4 + 4th octave + C D E)', () => {
    it('should parse 4 sharps, 3/4 time, and 3 notes without extra rests', () => {
      const result = parseBrailleMusic('⠼⠙⠩ ⠼⠉ ⠐⠹⠱⠫');
      
      
      // Should have NO errors
      expect(result.errors).toEqual([]);
      
      // Count elements by type
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
  });

  describe('VALIDATION 3: ⠣ ⠼⠙ ⠐⠹ (1 flat + 4/4 + 4th octave + C)', () => {
    it('should parse 1 flat (F major), 4/4 time, and C note', () => {
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
  });

  describe('Order Integrity', () => {
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

    it('should handle multiple sharps correctly', () => {
      const result = parseBrailleMusic('\u283C\u2819\u2829 \u283C\u2819 \u2810\u2839');
      
      const keySignatures = result.elements.filter(el => el.type === 'keysignature');
      expect(keySignatures.length).toBe(1);
      
      // 4 sharps = D major
      expect(keySignatures[0].vexKey).toBe('D');
    });

    it('should handle multiple flats correctly', () => {
      const result = parseBrailleMusic('⠣⠣ ⠼⠙ ⠐⠹');
      
      const keySignatures = result.elements.filter(el => el.type === 'keysignature');
      expect(keySignatures.length).toBe(1);
      
      // 2 flats = Bb major (lowercase c)
      expect(keySignatures[0].vexKey).toBe('c');
    });
  });
});
