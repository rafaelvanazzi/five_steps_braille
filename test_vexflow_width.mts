/**
 * Test script to understand VexFlow width behavior with many notes
 * Run with: npx tsx test_vexflow_width.mts
 */

import { Renderer, Stave, StaveNote, Voice, Formatter } from 'vexflow';
import * as fs from 'fs';

// Create a simple test to see how VexFlow handles width
const container = {
  innerHTML: '',
  appendChild: () => {},
} as any;

const renderer = new Renderer(container, Renderer.Backends.SVG);
renderer.resize(1200, 400);
const context = renderer.getContext();

console.log('=== VexFlow Width Test ===\n');

// Test 1: 8 quarter notes with 500px width
console.log('Test 1: 8 quarter notes with 500px width');
const stave1 = new Stave(10, 40, 500);
stave1.addClef('treble');
stave1.addTimeSignature('4/4');
stave1.setContext(context).draw();

const voice1 = new Voice({ numBeats: 4, beatValue: 4 });
voice1.setMode(2);

const notes1 = [];
for (let i = 0; i < 8; i++) {
  const note = new StaveNote({
    keys: ['c/4'],
    duration: 'q',
    clef: 'treble',
  });
  notes1.push(note);
}

voice1.addTickables(notes1);

const formatter1 = new Formatter();
formatter1.joinVoices([voice1]).format([voice1], 480);
voice1.draw(context, stave1);

console.log('  Stave width: 500px');
console.log('  Format width: 480px');
console.log('  Notes: 8 quarter notes');
console.log('  Result: Check if notes overlap\n');

// Test 2: Same but with 1000px width
console.log('Test 2: 8 quarter notes with 1000px width');
const stave2 = new Stave(10, 140, 1000);
stave2.addClef('treble');
stave2.addTimeSignature('4/4');
stave2.setContext(context).draw();

const voice2 = new Voice({ numBeats: 4, beatValue: 4 });
voice2.setMode(2);

const notes2 = [];
for (let i = 0; i < 8; i++) {
  const note = new StaveNote({
    keys: ['c/4'],
    duration: 'q',
    clef: 'treble',
  });
  notes2.push(note);
}

voice2.addTickables(notes2);

const formatter2 = new Formatter();
formatter2.joinVoices([voice2]).format([voice2], 980);
voice2.draw(context, stave2);

console.log('  Stave width: 1000px');
console.log('  Format width: 980px');
console.log('  Notes: 8 quarter notes');
console.log('  Result: Notes should have more space\n');

// Get SVG output
const svg = context.svg;
const svgString = svg.outerHTML;

// Save to file
fs.writeFileSync('/tmp/vexflow_test.svg', svgString);
console.log('SVG saved to /tmp/vexflow_test.svg');
console.log('\nConclusion: If Test 1 and Test 2 look the same, VexFlow is ignoring the width parameter.');
console.log('If Test 2 has more space, then the width parameter works correctly.');
