import { parseBrailleMusic } from './client/src/lib/brailleMusic.js';

// Testar mínimas: NN (dois C mínima)
const N = '\u281D'; // ⠝ = C mínima
const Q = '\u2839'; // ⠹ = C semínima

console.log('=== Teste 1: NN (duas mínimas de C) ===');
const r1 = parseBrailleMusic(N + N, { beatsPerMeasure: 4 });
for (const el of r1.elements) {
  if (el.type === 'note') {
    console.log(`  pitch=${el.pitch} duration=${el.duration} vexDuration=${el.vexDuration}`);
  }
}

console.log('\n=== Teste 2: QQ (duas semínimas de C) ===');
const r2 = parseBrailleMusic(Q + Q, { beatsPerMeasure: 4 });
for (const el of r2.elements) {
  if (el.type === 'note') {
    console.log(`  pitch=${el.pitch} duration=${el.duration} vexDuration=${el.vexDuration}`);
  }
}

console.log('\n=== Teste 3: N (uma mínima) ===');
const r3 = parseBrailleMusic(N, { beatsPerMeasure: 4 });
for (const el of r3.elements) {
  if (el.type === 'note') {
    console.log(`  pitch=${el.pitch} duration=${el.duration} vexDuration=${el.vexDuration}`);
  }
}
