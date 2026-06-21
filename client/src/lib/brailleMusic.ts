/**
 * Braille Music Parser — Versão Corrigida
 *
 * Baseado exclusivamente em:
 *  - TABELA_BRAILLE_corrigida.odt  (Rafael Vanazzi, revisão manual)
 *  - TABELA_BRAILLE_corrigida_2-_em_acorde.odt
 *  - Novo Manual Internacional de Musicografia Braille (2004)
 *  - Dissertação de Mestrado: "Particularidades da Musicografia Braille" (Vanazzi, 2014)
 *
 * CORREÇÕES APLICADAS em relação à versão anterior:
 *  1. REST_MAP completamente refeito (células corretas)
 *  2. INTERVAL_MAP corrigido (evita colisão com ponto de aumento)
 *  3. BARLINE_MAP corrigido (espaço = barra simples; ⠣⠅ = barra final)
 *  4. TIME_SIGNATURE_MAP corrigido (3/4, 2/4, 6/8, etc.)
 *  5. AUGMENTATION_DOT desambiguado de NOTE_TIE
 *  6. Em acorde total (⠣⠜) e parcial (⠐⠂) adicionados
 *  7. Claves adicionadas (Sol e Fá)
 *  8. Metadados de grau pedagógico (dissertação) em cada elemento
 *  9. inferOctave corrigida — regras de 6ª/7ª usam MIDI (dissertação cap.3)
 * 10. disambiguateDuration corrigida — lookahead por compasso completo
 * 11. Ligaduras completas: simples, dupla, prolongação, frase início/fim
 * 12. Fermata ⠣⠇ (1,2,6)+(1,2,3) adicionada
 * 13. Staccato ⠦ (2,3,6) adicionado
 * 14. Ponto de aumento duplo ⠄⠄ suportado
 */

// ─── TIPOS BASE ────────────────────────────────────────────────────────────────

type NoteName = 'C' | 'D' | 'E' | 'F' | 'G' | 'A' | 'B';
type Duration = 'w' | 'h' | 'q' | '8' | '16' | '32' | '64' | '128';
export type Accidental = 'sharp' | 'flat' | 'natural' | 'double-sharp' | 'double-flat';

// Graus pedagógicos (dissertação Vanazzi 2014)
export type PedagogicGrade = 1 | 2 | 3 | 4 | 5;

/**
 * Nível de leitura cognitiva do músico cego (arquitetura de 3 níveis):
 *   1 — Notas simples, pausas, armaduras, fórmulas de compasso, marcas de mão,
 *         inferência de oitavas por proximidade MIDI.
 *   2 — Sinais de Intervalo (ParsedInterval) — acordes braille.
 *   3 — Sinais "em acorde" total/parcial e controle matricial de pauta dupla.
 */
export type ReadingLevel = 1 | 2 | 3;

/**
 * Chave administrativa central para conteúdos premium (staccato, dinâmicas,
 * ligaduras, nuances, fermatas, ornamentos, articulações, quiálteras).
 * Altere este valor para false para desabilitar a renderização desses elementos.
 */
export const PREMIUM_CONTENT_ENABLED: boolean = true;

interface NoteInfo {
  pitch: NoteName;
  duration: Duration;    // valor primário (ex: colcheia)
  altDuration: Duration; // valor alternativo (ex: quartifusa)
}

// ─── REGISTRO DE NOTAS ─────────────────────────────────────────────────────────
// Fonte: Tabela 1A do Manual / TABELA_BRAILLE_corrigida.odt
// Colcheias (8) e Quartifusas (128) — pontos de nota sem 3 e sem 6
const NOTE_MAP: Record<string, NoteInfo> = {
  '\u2819': { pitch: 'C', duration: '8',  altDuration: '128' }, // ⠙ (1,4,5)
  '\u2811': { pitch: 'D', duration: '8',  altDuration: '128' }, // ⠑ (1,5)
  '\u280B': { pitch: 'E', duration: '8',  altDuration: '128' }, // ⠋ (1,2,4)
  '\u281B': { pitch: 'F', duration: '8',  altDuration: '128' }, // ⠛ (1,2,4,5)
  '\u2813': { pitch: 'G', duration: '8',  altDuration: '128' }, // ⠓ (1,2,5)
  '\u280A': { pitch: 'A', duration: '8',  altDuration: '128' }, // ⠊ (2,4)
  '\u281A': { pitch: 'B', duration: '8',  altDuration: '128' }, // ⠚ (2,4,5)

  // Semínimas (q) e Semifusas (64) — acrescenta ponto 6
  '\u2839': { pitch: 'C', duration: 'q',  altDuration: '64'  }, // ⠹ (1,4,5,6)
  '\u2831': { pitch: 'D', duration: 'q',  altDuration: '64'  }, // ⠱ (1,5,6)
  '\u282B': { pitch: 'E', duration: 'q',  altDuration: '64'  }, // ⠫ (1,2,4,6)
  '\u283B': { pitch: 'F', duration: 'q',  altDuration: '64'  }, // ⠻ (1,2,4,5,6)
  '\u2833': { pitch: 'G', duration: 'q',  altDuration: '64'  }, // ⠳ (1,2,5,6)
  '\u282A': { pitch: 'A', duration: 'q',  altDuration: '64'  }, // ⠪ (2,4,6)
  '\u283A': { pitch: 'B', duration: 'q',  altDuration: '64'  }, // ⠺ (2,4,5,6)

  // Mínimas (h) e Fusas (32) — acrescenta ponto 3
  '\u281D': { pitch: 'C', duration: 'h',  altDuration: '32'  }, // ⠝ (1,3,4,5) — Dó mínima
  '\u2815': { pitch: 'D', duration: 'h',  altDuration: '32'  }, // ⠕ (1,3,5)   — Ré mínima
  '\u280F': { pitch: 'E', duration: 'h',  altDuration: '32'  }, // ⠏ (1,2,3,4) — Mi mínima
  '\u281F': { pitch: 'F', duration: 'h',  altDuration: '32'  }, // ⠟ (1,2,3,4,5) — Fá mínima
  '\u2817': { pitch: 'G', duration: 'h',  altDuration: '32'  }, // ⠗ (1,2,3,5) — Sol mínima
  '\u280E': { pitch: 'A', duration: 'h',  altDuration: '32'  }, // ⠎ (2,3,4)   — Lá mínima
  '\u281E': { pitch: 'B', duration: 'h',  altDuration: '32'  }, // ⠞ (2,3,4,5) — Si mínima

  // Semibreves (w) e Semicolcheias (16) — acrescenta pontos 3 e 6
  '\u283D': { pitch: 'C', duration: 'w',  altDuration: '16'  }, // ⠽ (1,3,4,5,6)
  '\u2835': { pitch: 'D', duration: 'w',  altDuration: '16'  }, // ⠵ (1,3,5,6)
  '\u282F': { pitch: 'E', duration: 'w',  altDuration: '16'  }, // ⠯ (1,2,3,4,6)
  '\u283F': { pitch: 'F', duration: 'w',  altDuration: '16'  }, // ⠿ (1,2,3,4,5,6)
  '\u2837': { pitch: 'G', duration: 'w',  altDuration: '16'  }, // ⠷ (1,2,3,5,6)
  '\u282E': { pitch: 'A', duration: 'w',  altDuration: '16'  }, // ⠮ (2,3,4,6)
  '\u283E': { pitch: 'B', duration: 'w',  altDuration: '16'  }, // ⠾ (2,3,4,5,6)
};

// ─── REGISTRO DE PAUSAS ────────────────────────────────────────────────────────
// CORRIGIDO — Fonte: TABELA_BRAILLE_corrigida.odt, seção PAUSAS
const REST_MAP: Record<string, { duration: Duration; altDuration: Duration }> = {
  '\u282D': { duration: '8',  altDuration: '128' }, // ⠭ (1,3,4,6) — pausa colcheia / quartifusa
  '\u2827': { duration: 'q',  altDuration: '64'  }, // ⠧ (1,2,3,6) — pausa semínima / semifusa
  '\u2825': { duration: 'h',  altDuration: '32'  }, // ⠥ (1,3,6)   — pausa mínima / fusa
  '\u280D': { duration: 'w',  altDuration: '16'  }, // ⠍ (1,3,4)   — pausa semibreve / semicolcheia
};
// ATENÇÃO: ⠧ (\u2827) = pausa semínima (pontos 1,2,3,6). ⠾ (\u283E) = Si semibreve (pontos 2,3,4,5,6). Sem conflito.
// Verificação: ⠧ = 0x27 = pontos 1,2,3,6. ⠾ = 0x3E = pontos 2,3,4,5,6. São células DIFERENTES.
// Verificação de bits: ⠧ = 0x27 = 0b100111 = pontos 1,2,3,6 ✓
//                      ⠾ = 0x3E = 0b111110 = pontos 2,3,4,5,6 ✓  — sem conflito

// ─── SINAIS DE OITAVA ──────────────────────────────────────────────────────────
// Fonte: TABELA_BRAILLE_corrigida.odt, seção SINAIS DE OITAVA
const OCTAVE_MAP: Record<string, number> = {
  '\u2808\u2808': 0, // ⠈⠈ (4)+(4) — abaixo da 1ª oitava (cela dupla)
  '\u2808': 1,       // ⠈  (4)     — 1ª oitava
  '\u2818': 2,       // ⠘  (4,5)   — 2ª oitava
  '\u2838': 3,       // ⠸  (4,5,6) — 3ª oitava
  '\u2810': 4,       // ⠐  (5)     — 4ª oitava (dó central)
  '\u2828': 5,       // ⠨  (4,6)   — 5ª oitava
  '\u2830': 6,       // ⠰  (5,6)   — 6ª oitava
  '\u2820': 7,       // ⠠  (6)     — 7ª oitava
  '\u2820\u2820': 8, // ⠠⠠ (6)+(6) — acima da 7ª (cela dupla)
};

// ─── ALTERAÇÕES ────────────────────────────────────────────────────────────────
// Fonte: TABELA_BRAILLE_corrigida.odt, seção Alterações
const ACCIDENTAL_MAP: Record<string, Accidental> = {
  '\u2829': 'sharp',        // ⠩ (1,4,6)       — sustenido
  '\u2823': 'flat',         // ⠣ (1,2,6)        — bemol
  '\u2821': 'natural',      // ⠡ (1,6)           — bequadro
  '\u2829\u2829': 'double-sharp', // ⠩⠩           — dobrado sustenido
  '\u2823\u2823': 'double-flat',  // ⠣⠣            — dobrado bemol
};

// ─── SINAIS DE BARRA DE COMPASSO ───────────────────────────────────────────────
// CORRIGIDO — Fonte: TABELA_BRAILLE_corrigida.odt, seção Barras de Compasso
// Barra simples = ESPAÇO (cela em branco) — tratada diretamente no parser
const BARLINE_TWO_CELL: Record<string, 'end' | 'end-section' | 'dotted' | 'repeat-begin' | 'repeat-end'> = {
  '\u2823\u2805': 'end',         // ⠣⠅ (1,2,6)+(1,3)     — barra final (dupla grossa)
  '\u2823\u2805\u2804': 'end-section', // ⠣⠅⠄               — barra dupla de seção
  '\u2805': 'dotted',            // ⠅ (1,3)               — linha divisória pontilhada
  '\u2823\u2836': 'repeat-begin',// ⠣⠶ (1,2,6)+(2,3,5,6) — ritornelo início
  '\u2823\u2826': 'repeat-end',  // ⠣⠆ (1,2,6)+(2,3)     — ritornelo fim
};

// ─── FÓRMULAS DE COMPASSO ──────────────────────────────────────────────────────
// CORRIGIDO — Fonte: TABELA_BRAILLE_corrigida.odt, seção Compassos
// Formato: ⠼ (sinal de número) + numerador (dígito normal) + denominador (dígito rebaixado)
// Numeradores (dígitos normais braille):
const BRAILLE_NUMERATOR: Record<string, number> = {
  '\u2801': 1,  // ⠁ (1)
  '\u2803': 2,  // ⠃ (1,2)
  '\u2809': 3,  // ⠉ (1,4)
  '\u2819': 4,  // ⠙ (1,4,5)
  '\u2811': 5,  // ⠑ (1,5)
  '\u280B': 6,  // ⠋ (1,2,4)
  '\u281B': 7,  // ⠛ (1,2,4,5)
  '\u2813': 8,  // ⠓ (1,2,5)
  '\u280A': 9,  // ⠊ (2,4)
  '\u281A': 0,  // ⠚ (2,4,5)
};
// Denominadores (dígitos "rebaixados" — pontos 2,3,5,6):
const BRAILLE_DENOMINATOR: Record<string, number> = {
  '\u2802': 1,  // ⠂ (2)
  '\u2806': 2,  // ⠆ (2,3)
  '\u2812': 3,  // ⠒ (2,5)
  '\u2832': 4,  // ⠲ (2,5,6)
  '\u2822': 5,  // ⠢ (2,6)
  '\u2816': 6,  // ⠖ (2,3,5)
  '\u2836': 7,  // ⠶ (2,3,5,6)
  '\u2826': 8,  // ⠦ (2,3,6)
  '\u2814': 9,  // ⠔ (3,5)
  '\u2834': 0,  // ⠴ (3,5,6)
};

// Fórmulas mais comuns pré-computadas para lookup rápido
// C (⠨⠉ = 4,6 + 1,4) e C cortado (⠸⠉ = 4,5,6 + 1,4)
const TIME_SIG_SHORTHAND: Record<string, { numerator: number; denominator: number }> = {
  '\u2828\u2809': { numerator: 4, denominator: 4 }, // ⠨⠉ = C (4/4)
  '\u2838\u2809': { numerator: 2, denominator: 2 }, // ⠸⠉ = C cortado (2/2)
};

const NUMBER_SIGN = '\u283C'; // ⠼ (3,4,5,6) — prefixo numérico

// ─── INTERVALOS (ACORDES) ──────────────────────────────────────────────────────
// CORRIGIDO — Fonte: TABELA_BRAILLE_corrigida.odt, seção Intervalos para Acordes
// IMPORTANTE: ⠼ (3,4,5,6) = intervalo de 4ª MAS TAMBÉM = sinal de número
// O parser deve usar o CONTEXTO para desambiguar: após uma nota = intervalo; no início = número
const INTERVAL_MAP: Record<string, number> = {
  '\u280C': 2, // ⠌ (3,4)     — 2ª
  '\u282C': 3, // ⠬ (3,4,6)   — 3ª
  '\u283C': 4, // ⠼ (3,4,5,6) — 4ª  ← também NUMBER_SIGN (desambiguado por contexto)
  '\u2814': 5, // ⠔ (3,5)     — 5ª
  '\u2834': 6, // ⠴ (3,5,6)   — 6ª
  '\u2812': 7, // ⠒ (2,5)     — 7ª
  '\u2824': 8, // ⠤ (3,6)     — 8ª  ← também PONTO DE AUMENTO (desambiguado por contexto)
};

// ─── OUTROS SÍMBOLOS ────────────────────────────────────────────────────────────
const AUGMENTATION_DOT  = '\u2804'; // ⠄ (3)     — ponto de aumento
const AUGMENTATION_DOT2 = '\u2804\u2804'; // ⠄⠄     — ponto de aumento duplo

// Ligaduras
const SLUR_SIMPLE       = '\u2809';         // ⠉ (1,4)     — ligadura simples/expressão
const SLUR_DOUBLE       = '\u2809\u2809';  // ⠉⠉          — ligadura dupla (>3 notas)
const TIE               = '\u2808\u2809';  // ⠈⠉ (4)+(1,4) — ligadura de prolongação
const PHRASE_START      = '\u2830\u2803';  // ⠰⠃ (5,6)+(1,2) — início ligadura de frase
const PHRASE_END        = '\u2818\u2806';  // ⠘⠆ (4,5)+(2,3) — fim ligadura de frase

// Articulações
const FERMATA           = '\u2823\u2807';  // ⠣⠇ (1,2,6)+(1,2,3) — fermata (após nota)
const STACCATO          = '\u2826';         // ⠦ (2,3,6)           — staccato (antes de nota)

// Alias mantido para compatibilidade
const NOTE_TIE = SLUR_SIMPLE;

// Em acorde
const IN_CHORD_TOTAL    = '\u2823\u281C'; // ⠣⠜ (1,2,6)+(3,4,5) — em acorde total
const IN_CHORD_PARTIAL  = '\u2810\u2802'; // ⠐⠂ (5)+(2)          — em acorde parcial
const CHORD_SEPARATOR   = '\u2828\u2805'; // ⠨⠅ (4,6)+(1,3)      — separador de voz

// Claves — Fonte: TABELA_BRAILLE_corrigida.odt, seção Claves
const CLEF_TREBLE = '\u281C\u280C\u2807'; // ⠜⠌⠇ (3,4,5)+(3,4)+(1,2,3) — clave de sol (2ª linha)
const CLEF_BASS   = '\u281C\u283C\u2807'; // ⠜⠼⠇ (3,4,5)+(3,4,5,6)+(1,2,3) — clave de fá (4ª linha)

// Parte mão direita / mão esquerda (piano)

// Hífen musical (compasso continua na linha seguinte)
const MUSICAL_HYPHEN = '\u2810'; // ⠐ (5) — ATENÇÃO: mesmo que oitava 4 → desambiguar por contexto

// ─── CLAVES ────────────────────────────────────────────────────────────────────
const CLEF_SOL_2 = '\u281C\u280C\u2807'; // ⠜⠌⠇ (3,4,5)+(3,4)+(1,2,3) — Clave de Sol 2ª linha
const CLEF_FA_4  = '\u281C\u283C\u2807'; // ⠜⠼⠇ (3,4,5)+(3,4,5,6)+(1,2,3) — Clave de Fá 4ª linha
const CLEF_DO_3  = '\u281C\u282C\u2807'; // ⠜⠬⠇ (3,4,5)+(3,4,6)+(1,2,3) — Clave de Dó 3ª linha
const CLEF_DO_4  = '\u281C\u282C\u2810\u2807'; // ⠜⠬⠐⠇ (3,4,5)+(3,4,6)+(5)+(1,2,3) — Clave de Dó 4ª linha (violoncelo)

// ─── MÃO DIREITA / ESQUERDA ────────────────────────────────────────────────────
const HAND_RIGHT = '\u2828\u281C'; // ⠨⠜ (4,6)+(3,4,5) — mão direita → clave de sol
const HAND_LEFT  = '\u2838\u281C'; // ⠸⠜ (4,5,6)+(3,4,5) — mão esquerda → clave de fá

// ─── DINÂMICA ──────────────────────────────────────────────────────────────────
// Prefixo ⠜ (U+281C) + símbolo
const DYNAMIC_MAP: Record<string, string> = {
  '\u281C\u280F':             'p',
  '\u281C\u280F\u280F':      'pp',
  '\u281C\u280D\u280F':      'mp',
  '\u281C\u280D\u280B':      'mf',
  '\u281C\u280B':             'f',
  '\u281C\u280B\u280B':      'ff',
  '\u281C\u2809':             'cresc',
  '\u281C\u2812':             'cresc-fim',
  '\u281C\u2819':             'dim',
  '\u281C\u2832':             'dim-fim',
};

// ─── ORNAMENTOS ────────────────────────────────────────────────────────────────
const ORNAMENT_MAP: Record<string, string> = {
  '\u2816':             'trinado',
  '\u2802\u2816':      'mordente-sup',
  '\u281C\u2805':      'arpejo',
  '\u2808\u2801':      'glissando',
  '\u2820\u2832':      'grupeto-sup',
  '\u2832':             'grupeto-inf',
  '\u2822':             'apogiatura',
};

// ─── ARTICULAÇÃO EXTRA ─────────────────────────────────────────────────────────
const ARTICULATION_EXTRA_MAP: Record<string, string> = {
  '\u2826\u2826':      'staccato-duplo',
  '\u2820\u2826':      'staccatissimo',
  '\u2838\u2826':      'tenuta',
  '\u2828\u2826':      'smorzando',
  '\u2830\u2826':      'martelato',
};

// ─── QUIÁLTERAS ────────────────────────────────────────────────────────────────
const QUIALTERA_MAP: Record<string, string> = {
  '\u2806':                   'tercina',
  '\u2838\u2806\u2804':     'quialtera-2',
  '\u2838\u2812\u2804':     'quialtera-3',
  '\u2838\u2832\u2804':     'quialtera-4',
  '\u2838\u2822\u2804':     'quialtera-5',
};

// ─── REPETIÇÃO/FORMA ───────────────────────────────────────────────────────────
const REPETITION_MAP: Record<string, string> = {
  '\u282C\u2801':             'coda',
  '\u283C\u2802':             '1a-vez',
  '\u283C\u2806':             '2a-vez',
  '\u281C\u2819\u280E\u2804': 'segno',
};

// Armadura de clave (chaves comuns)
// Armaduras de 4-7 acidentes: ⠼ + dígito + ⠩/⠣
// Detectadas pelo parser antes da fórmula de compasso (mesmo prefixo ⠼)
// Armaduras de 1-3: detectadas por sequência de ⠩⠩ ou ⠣⠣ sem nota entre elas
const OFFICIAL_KEY_SIGNATURE_MAP: Record<string, { vexKey: string; fifths: number }> = {
  // 4-7 sustenidos: ⠼ + dígito numerador + ⠩
  '\u283C\u2819\u2829':             { vexKey: 'E',  fifths: 4  }, // 4 sustenidos ⠼⠙⠩
  '\u283C\u2811\u2829':             { vexKey: 'B',  fifths: 5  }, // 5 sustenidos ⠼⠑⠩
  '\u283C\u280B\u2829':             { vexKey: 'F#', fifths: 6  }, // 6 sustenidos ⠼⠋⠩
  '\u283C\u281B\u2829':             { vexKey: 'C#', fifths: 7  }, // 7 sustenidos ⠼⠛⠩
  // 4-7 bemóis: ⠼ + dígito numerador + ⠣
  '\u283C\u2819\u2823':             { vexKey: 'Ab', fifths: -4 }, // 4 bemóis ⠼⠙⠣
  '\u283C\u2811\u2823':             { vexKey: 'Db', fifths: -5 }, // 5 bemóis ⠼⠑⠣
  '\u283C\u280B\u2823':             { vexKey: 'Gb', fifths: -6 }, // 6 bemóis ⠼⠋⠣
  '\u283C\u281B\u2823':             { vexKey: 'Cb', fifths: -7 }, // 7 bemóis ⠼⠛⠣
};

// Armaduras de 1-3 acidentes: detectadas por contexto (repetição de ⠩ ou ⠣)
const KEY_SIG_SHARP: Record<string, { vexKey: string; fifths: number }> = {
  '\u2829':             { vexKey: 'G',  fifths: 1  }, // 1 sustenido  ⠩
  '\u2829\u2829':       { vexKey: 'D',  fifths: 2  }, // 2 sustenidos ⠩⠩
  '\u2829\u2829\u2829':{ vexKey: 'A',  fifths: 3  }, // 3 sustenidos ⠩⠩⠩
};
const KEY_SIG_FLAT: Record<string, { vexKey: string; fifths: number }> = {
  '\u2823':             { vexKey: 'F',  fifths: -1 }, // 1 bemol  ⠣
  '\u2823\u2823':       { vexKey: 'Bb', fifths: -2 }, // 2 bemóis ⠣⠣
  '\u2823\u2823\u2823':{ vexKey: 'Eb', fifths: -3 }, // 3 bemóis ⠣⠣⠣
};

// ─── TIPOS EXPORTADOS ──────────────────────────────────────────────────────────

export interface ParsedNote {
  type: 'note';
  pitch: NoteName;
  octave: number;
  duration: Duration;
  dotted: boolean;
  dotted2: boolean;
  staccato?: boolean;
  fermata?: boolean;
  accidental?: Accidental;
  articulation?: string;
  vexKey: string;
  vexDuration: string;
  sourceIndex: number;
  measureIndex?: number;
  grade: PedagogicGrade;
  /** Nível cognitivo de leitura: notas simples = Nível 1 */
  level: ReadingLevel;
  /** Elemento de conteúdo premium (staccato, dinâmica, ornamento, etc.) */
  isPremium: boolean;
}

export interface ParsedRest {
  type: 'rest';
  duration: Duration;
  dotted: boolean;
  dotted2: boolean;
  vexDuration: string;
  sourceIndex: number;
  grade: PedagogicGrade;
  /** Nível cognitivo: pausas = Nível 1 */
  level: ReadingLevel;
  isPremium: boolean;
}

export interface ParsedBarline {
  type: 'barline';
  sourceIndex: number;
  barlineType?: 'single' | 'end' | 'end-section' | 'dotted' | 'repeat-begin' | 'repeat-end';
  measureIndex?: number;
  level: ReadingLevel;
  isPremium: boolean;
}

export interface ParsedTimeSignature {
  type: 'timesignature';
  numerator: number;
  denominator: number;
  sourceIndex: number;
  _abbreviated?: 'C' | 'C|';
  level: ReadingLevel;
  isPremium: boolean;
}

export interface ParsedKeySignature {
  type: 'keysignature';
  fifths: number;
  vexKey: string;
  sourceIndex: number;
  level: ReadingLevel;
  isPremium: boolean;
}

export interface ParsedNoteTie {
  type: 'notetie';
  sourceIndex: number;
  level: ReadingLevel;
  isPremium: boolean;
}

export interface ParsedInterval {
  type: 'interval';
  intervalSize: number;
  /** Acidente exclusivamente local — não vaza para armadura global */
  accidental?: Accidental;
  /** Sinal de oitava explícito desta nota do intervalo */
  explicitOctave?: number;
  /** Duração herdada da nota-base do acorde */
  duration?: Duration;
  /** Staccato aplicado especificamente a esta nota de intervalo */
  staccato?: boolean;
  /** Ligadura de prolongação aplicada a esta nota de intervalo */
  slur?: boolean;
  sourceIndex: number;
  measureIndex?: number;
  grade: PedagogicGrade;
  /** Nível cognitivo: intervalos = Nível 2 */
  level: ReadingLevel;
  isPremium: boolean;
}

export interface ParsedClef {
  type: 'clef';
  clefType: 'treble' | 'bass' | 'tenor' | 'alto';
  intervalDirection: 'ascending' | 'descending';
  sourceIndex: number;
  level: ReadingLevel;
  isPremium: boolean;
}

export interface ParsedChordMarker {
  type: 'chordmarker';
  markerType: 'total' | 'partial' | 'separator' | 'right-hand' | 'left-hand';
  sourceIndex: number;
  /** Nível cognitivo: marcadores em acorde = Nível 3 */
  level: ReadingLevel;
  isPremium: boolean;
}

export interface ParsedSlur {
  type: 'slur';
  slurType: 'simple' | 'double';
  sourceIndex: number;
  level: ReadingLevel;
  isPremium: boolean;
}

export interface ParsedTie {
  type: 'tie';
  sourceIndex: number;
  level: ReadingLevel;
  isPremium: boolean;
}

export interface ParsedPhrase {
  type: 'phrase';
  phraseType: 'start' | 'end';
  sourceIndex: number;
  level: ReadingLevel;
  isPremium: boolean;
}

export interface ParsedFermata {
  type: 'fermata';
  sourceIndex: number;
  level: ReadingLevel;
  isPremium: boolean;
}

export interface ParsedStaccato {
  type: 'staccato';
  sourceIndex: number;
  level: ReadingLevel;
  isPremium: boolean;
}

export interface ParsedDynamic {
  type: 'dynamic';
  name: string;
  sourceIndex: number;
  level: ReadingLevel;
  isPremium: boolean;
}

export interface ParsedOrnament {
  type: 'ornament';
  name: string;
  sourceIndex: number;
  level: ReadingLevel;
  isPremium: boolean;
}

export interface ParsedQuialtera {
  type: 'quialtera';
  name: string;
  sourceIndex: number;
  level: ReadingLevel;
  isPremium: boolean;
}

export interface ParsedRepetition {
  type: 'repetition';
  name: string;
  sourceIndex: number;
  level: ReadingLevel;
  isPremium: boolean;
}

export interface ParsedArticulation {
  type: 'articulation';
  name: string;
  sourceIndex: number;
  level: ReadingLevel;
  isPremium: boolean;
}

export interface ParsedHand {
  type: 'hand';
  hand: 'right' | 'left';
  impliedClef: 'treble' | 'bass';
  intervalDirection: 'ascending' | 'descending';
  sourceIndex: number;
  /** Nível cognitivo: marcas de mão = Nível 3 (controle matricial de pauta dupla) */
  level: ReadingLevel;
  isPremium: boolean;
}

export type ParsedElement =
  | ParsedNote
  | ParsedRest
  | ParsedBarline
  | ParsedTimeSignature
  | ParsedKeySignature
  | ParsedNoteTie
  | ParsedInterval
  | ParsedClef
  | ParsedChordMarker
  | ParsedSlur
  | ParsedTie
  | ParsedPhrase
  | ParsedFermata
  | ParsedStaccato
  | ParsedDynamic
  | ParsedOrnament
  | ParsedQuialtera
  | ParsedRepetition
  | ParsedArticulation
  | ParsedHand;

export interface ParseResult {
  elements: ParsedElement[];
  errors: string[];
}

export interface ParseOptions {
  beatsPerMeasure?: number;
  initialOctave?: number;        // oitava inicial (contexto da linha anterior)
  initialPrevPitch?: string;     // nota anterior (contexto da linha anterior)
  initialBeatsPerMeasure?: number; // compasso da linha anterior
}

// Contexto que uma linha deixa para a próxima
export interface LineContext {
  lastOctave: number;
  lastPitch: string | null;
  beatsPerMeasure: number;
  keySignature: string | null;
  clef: string;
}

// ─── FUNÇÕES UTILITÁRIAS ────────────────────────────────────────────────────────

function durationToBeats(duration: Duration, dotted: boolean = false): number {
  const beats: Record<Duration, number> = {
    'w': 4, 'h': 2, 'q': 1, '8': 0.5, '16': 0.25,
    '32': 0.125, '64': 0.0625, '128': 0.03125,
  };
  let result = beats[duration] ?? 1;
  if (dotted) result *= 1.5;
  return result;
}

// Regra de inferência de oitava (Dissertação Vanazzi 2014, Cap. 3):
// - Intervalos de 2ª e 3ª: nunca mudam oitava
// - Intervalos de 4ª e 5ª: mudam apenas se cruzar fronteira B↔C
// - Intervalos de 6ª, 7ª e ≥8ª: sempre requerem sinal explícito de oitava
function inferOctave(prevPitch: NoteName, prevOctave: number, nextPitch: NoteName): number {
  // Regras de uso das oitavas — Manual Internacional §1-10 / MusicBraille Aula 12
  // Confirmado por: Manual Internacional PT-BR, versão espanhola e dissertação Vanazzi.
  //
  // A lógica baseia-se em pares de intervalos COMPLEMENTARES (soma = 9):
  //   2ª ↔ 7ª  |  3ª ↔ 6ª  |  4ª ↔ 5ª
  //
  // Regra 1 — 2ª e 3ª (diat_steps 1 ou 2):
  //   NUNCA leva sinal de oitava, mesmo que mude de oitava.
  //   Parser: calcular pela nota MIDI mais próxima (2ª ou 3ª, não 7ª ou 6ª).
  //
  // Regra 2 — 4ª e 5ª (diat_steps 3 ou 4):
  //   Leva sinal SOMENTE se a nota estiver em oitava DIFERENTE.
  //   Sem sinal = SEMPRE mesma oitava da anterior.
  //
  // Regra 3 — 6ª, 7ª e 8ª (diat_steps 5, 6 ou 7):
  //   SEMPRE leva sinal de oitava.
  //   Sem sinal = situação inválida; parser usa oitava mais próxima (fallback).

  const pitchOrder: NoteName[] = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
  const semitonos: Record<NoteName, number> = { C:0, D:2, E:4, F:5, G:7, A:9, B:11 };
  const prevIdx = pitchOrder.indexOf(prevPitch);
  const nextIdx = pitchOrder.indexOf(nextPitch);
  const diatSteps = Math.abs(nextIdx - prevIdx); // 0=unís,1=2ª,2=3ª,3=4ª,4=5ª,5=6ª,6=7ª

  // Regra 2: 4ª e 5ª → sempre mesma oitava sem sinal explícito
  if (diatSteps === 3 || diatSteps === 4) return prevOctave;

  // Regra 1: 2ª e 3ª → oitava mais próxima em MIDI
  // (pode mudar de oitava — ex: Si4→Dó5 é 2ª ascendente, correto)
  if (diatSteps <= 2) {
    const prevMidi = (prevOctave + 1) * 12 + semitonos[prevPitch];
    let bestOct = prevOctave, bestDist = 999;
    for (let oct = prevOctave - 1; oct <= prevOctave + 1; oct++) {
      if (oct < 0 || oct > 8) continue;
      const dist = Math.abs((oct + 1) * 12 + semitonos[nextPitch] - prevMidi);
      if (dist < bestDist) { bestDist = dist; bestOct = oct; }
    }
    return bestOct;
  }

  // Regra 3: 6ª, 7ª e 8ª → oitava mais próxima em MIDI (fallback)
  // Sem sinal de oitava, o parser aproxima pelo intervalo complementar:
  //   6ª sem sinal → usa a 3ª mais próxima
  //   7ª sem sinal → usa a 2ª mais próxima
  //   8ª sem sinal → usa o uníssono
  const prevMidi = (prevOctave + 1) * 12 + semitonos[prevPitch];
  let bestOct = prevOctave, bestDist = 999;
  for (let oct = prevOctave - 1; oct <= prevOctave + 1; oct++) {
    if (oct < 0 || oct > 8) continue;
    const dist = Math.abs((oct + 1) * 12 + semitonos[nextPitch] - prevMidi);
    if (dist < bestDist) { bestDist = dist; bestOct = oct; }
  }
  return bestOct;
}

// Desambiguação por compasso completo (lookahead)
// Recebe todos os items ambíguos de um compasso e decide em bloco.
// Reproduz a lógica do MusicBraille: testa todos primários juntos primeiro.
function disambiguateMeasure(
  items: Array<{ primary: Duration; secondary: Duration; dotted: boolean; dotted2: boolean }>,
  beatsPerMeasure: number,
): Duration[] {
  if (!items.length) return [];
  const totalPrimary = items.reduce(
    (s, it) => s + durationToBeats(it.primary, it.dotted) * (it.dotted2 ? 1 + 0.25 : 1), 0
  );
  if (totalPrimary <= beatsPerMeasure + 0.001) return items.map(it => it.primary);
  return items.map(it => it.secondary);
}

// Mantida para compatibilidade com chamadas existentes
function disambiguateDuration(
  primary: Duration,
  secondary: Duration,
  beatsUsed: number,
  beatsPerMeasure: number,
  dotted: boolean,
): Duration {
  if (beatsUsed >= beatsPerMeasure - 0.001) return secondary;
  if (beatsUsed + durationToBeats(primary, dotted) <= beatsPerMeasure + 0.001) return primary;
  if (beatsUsed + durationToBeats(secondary, dotted) <= beatsPerMeasure + 0.001) return secondary;
  return primary;
}

function durationToVex(duration: Duration, dotted: boolean, isRest: boolean): string {
  let s = duration === 'w' ? 'w' : duration === 'h' ? 'h' : duration === 'q' ? 'q' :
          duration === '8' ? '8' : duration === '16' ? '16' : duration === '32' ? '32' :
          duration === '64' ? '64' : '128';
  if (dotted) s += 'd';
  if (isRest) s += 'r';
  return s;
}

function gradeForNote(hasOctave: boolean, hasAccidental: boolean): PedagogicGrade {
  if (hasAccidental) return 3;
  if (hasOctave)     return 3;
  return 1;
}

// ─── PARSER PRINCIPAL ──────────────────────────────────────────────────────────

// Tenta ler uma fórmula de compasso a partir da posição i
// Retorna { numerator, denominator, advance } ou null
function tryReadTimeSignature(
  input: string,
  i: number,
): { numerator: number; denominator: number; advance: number } | null {
  if (input[i] !== NUMBER_SIGN) return null;

  // Verificar atalhos C (⠨⠉ = \u2828\u2809) e C-cortado (⠸⠉ = \u2838\u2809) primeiro
  const twoCell = input.substring(i, i + 2);
  if (twoCell === '\u2828\u2809') {
    return { numerator: 4, denominator: 4, abbreviated: 'C'  as const, advance: 2 };
  }
  if (twoCell === '\u2838\u2809') {
    return { numerator: 2, denominator: 2, abbreviated: 'C|' as const, advance: 2 };
  }

  // Ler numerador (1 ou 2 dígitos)
  let j = i + 1;
  let numerator = 0;
  let numDigits = 0;
  while (j < input.length && BRAILLE_NUMERATOR[input[j]] !== undefined) {
    numerator = numerator * 10 + BRAILLE_NUMERATOR[input[j]];
    j++;
    numDigits++;
    if (numDigits === 2) break; // máximo 2 dígitos no numerador
  }
  if (numDigits === 0) return null;

  // Ler denominador (1 dígito rebaixado)
  if (j >= input.length || BRAILLE_DENOMINATOR[input[j]] === undefined) return null;
  const denominator = BRAILLE_DENOMINATOR[input[j]];
  if (denominator === 0) return null; // denominador 0 inválido
  j++;

  return { numerator, denominator, advance: j - i };
}

export function parseBrailleMusic(input: string, options?: ParseOptions): ParseResult {
  let beatsPerMeasure = options?.beatsPerMeasure ?? 4;
  const errors: string[] = [];

  // ── Fase 1: tokenizar em compassos ────────────────────────────────────────
  type RawToken =
    | { kind: 'note'; pitch: NoteName; primary: Duration; secondary: Duration; dotted: boolean; dotted2: boolean; idx: number }
    | { kind: 'rest'; primary: Duration; secondary: Duration; dotted: boolean; dotted2: boolean; idx: number }
    | { kind: 'oct'; val: number; idx: number }
    | { kind: 'acc'; val: Accidental; idx: number }
    | { kind: 'staccato'; idx: number }
    | { kind: 'fermata'; idx: number }
    | { kind: 'slur'; slurType: 'simple' | 'double'; idx: number }
    | { kind: 'tie'; idx: number }
    | { kind: 'phrase'; phraseType: 'start' | 'end'; idx: number }
    | { kind: 'ts'; numerator: number; denominator: number; abbreviated?: 'C' | 'C|'; idx: number }
    | { kind: 'ks'; fifths: number; vexKey: string; idx: number }
    | { kind: 'clef'; clefType: 'treble' | 'bass' | 'tenor' | 'alto'; intervalDirection: 'ascending' | 'descending'; idx: number }
    | { kind: 'hand'; hand: 'right' | 'left'; impliedClef: 'treble' | 'bass'; intervalDirection: 'ascending' | 'descending'; idx: number }
    | { kind: 'interval'; intervalSize: number; pendingAccidental?: Accidental; pendingOctave?: number; pendingStaccato?: boolean; pendingSlur?: boolean; idx: number }
    | { kind: 'dynamic'; name: string; idx: number }
    | { kind: 'ornament'; name: string; idx: number }
    | { kind: 'articulation'; name: string; idx: number }
    | { kind: 'quialtera'; name: string; idx: number }
    | { kind: 'repetition'; name: string; idx: number }
    | { kind: 'text'; char: string; idx: number };

  type RawMeasure = { tokens: RawToken[]; barlineType: string };
  const measures: RawMeasure[] = [];
  let curTokens: RawToken[] = [];

  let i = 0;
  const len = input.length;

  // isMusicContextActive: FALSE até encontrar token de ativação musical explícito.
  // Tokens de ativação: Clave (⠜⠌⠇ / ⠜⠼⠇), Mão (⠨⠜ / ⠸⠜), Fórmula de Compasso (⠼).
  // Enquanto FALSE, espaços são silenciosos e texto plano é ignorado.
  let isMusicContextActive = false;
  // noteOctaveSeen: TRUE após o primeiro sinal de oitava de nota.
  // Espaços só incrementam compasso DEPOIS do primeiro sinal de oitava.
  let noteOctaveSeen = false;

  while (i < len) {
    const ch  = input[i];
    const ch2 = i + 1 < len ? input[i + 1] : '';
    const two = ch + ch2;
    const three = two + (i + 2 < len ? input[i + 2] : '');

    if (ch === '\n' || ch === '\r') { i++; continue; }

    // Espaço = barra de compasso simples (com exclusão estrutural)
    // Regra: o espaço só cria barra de compasso se:
    //   (1) O contexto musical está ativo (já encontrou clave, mão ou ⠼)
    //   (2) O bloco atual (curTokens) contém notas, pausas ou intervalos reais
    //       — blocos com APENAS configurações (hand, clef, ks, ts, oct) são
    //         "espaços decorativos de cabeçalho" e não incrementam o compasso.
    if (ch === ' ' || ch === '\u2800') {
      if (isMusicContextActive) {
        const hasRealMusic = curTokens.some(
          tk => tk.kind === 'note' || tk.kind === 'rest' || tk.kind === 'interval'
        );
        if (hasRealMusic) {
          measures.push({ tokens: curTokens, barlineType: 'single' });
          curTokens = [];
        }
        // Bloco só com configurações: descartar tokens decorativos de cabeçalho
        // mas manter o estado (armadura/clave já foram enfileirados)
      }
      // Sem contexto musical: ignorar silenciosamente
      i++; continue;
    }

    // Barras especiais (2 células) — ANTES de testar bemol ⠣
    // A barra final (⠣⠅) encerra o compasso atual e injeta 'end' em AMBAS as trilhas.
    // splitByHand no ScoreRenderer propaga a barline síncrona para treble e bass.
    if (BARLINE_TWO_CELL[two]) {
      const bType = BARLINE_TWO_CELL[two];
      // Sempre encerrar: barra final (end/end-section) fecha mesmo compasso vazio
      measures.push({ tokens: curTokens, barlineType: bType });
      curTokens = [];
      i += 2; continue;
    }

    // Fermata ⠣⠇ — ANTES de testar bemol ⠣
    if (two === FERMATA) {
      curTokens.push({ kind: 'fermata', idx: i }); i += 2; continue;
    }

    // Ligaduras de frase — ANTES de testar oitavas ⠰ e ⠘
    if (two === PHRASE_START) { curTokens.push({ kind: 'phrase', phraseType: 'start', idx: i }); i += 2; continue; }
    if (two === PHRASE_END)   { curTokens.push({ kind: 'phrase', phraseType: 'end',   idx: i }); i += 2; continue; }

    // Ligadura de prolongação ⠈⠉ — ANTES de testar oitava ⠈
    if (two === TIE) { curTokens.push({ kind: 'tie', idx: i }); i += 2; continue; }

    // Ligadura dupla ⠉⠉ — ANTES de ligadura simples ⠉
    if (two === SLUR_DOUBLE) { curTokens.push({ kind: 'slur', slurType: 'double', idx: i }); i += 2; continue; }

    // Oitavas duplas
    if (OCTAVE_MAP[two] !== undefined && two.length === 2 && ch2) {
      noteOctaveSeen = true; // oitava dupla → espaços passam a ser barras
      curTokens.push({ kind: 'oct', val: OCTAVE_MAP[two], idx: i }); i += 2; continue;
    }

    // Fórmula de compasso OU armadura de 4-7 acidentes (⠼ + dígito + ⠩/⠣)
    // Testar armadura de 3 células PRIMEIRO (⠼⠙⠩, ⠼⠑⠣, etc.)
    if (ch === NUMBER_SIGN) {
      if (i + 2 < len && OFFICIAL_KEY_SIGNATURE_MAP[three]) {
        const ks = OFFICIAL_KEY_SIGNATURE_MAP[three];
        curTokens.push({ kind: 'ks', fifths: ks.fifths, vexKey: ks.vexKey, idx: i });
        i += 3; continue;
      }
      const ts = tryReadTimeSignature(input, i);
      if (ts) {
        isMusicContextActive = true; // ⠼ = gatilho de ativação musical
        curTokens.push({ kind: 'ts', numerator: ts.numerator, denominator: ts.denominator, idx: i });
        beatsPerMeasure = ts.numerator;
        i += ts.advance; continue;
      }
      i++; continue;
    }

    // Armadura de clave (3 células)
    if (i + 2 < len) {
      const ks3 = OFFICIAL_KEY_SIGNATURE_MAP[three];
      if (ks3) { curTokens.push({ kind: 'ks', fifths: ks3.fifths, vexKey: ks3.vexKey, idx: i }); i += 3; continue; }
    }

    // Mão direita ⠨⠜ (\u2828\u281C) e Mão esquerda ⠸⠜ (\u2838\u281C)
    // ANTES de C/C-cortado e oitavas — ambos começam com ⠨/⠸ mas têm segunda célula ⠜
    // Garante detecção mesmo sem espaço entre mão e nota adjacente
    if (two === HAND_RIGHT) {
      isMusicContextActive = true; // Mão Direita = gatilho de ativação musical
      curTokens.push({ kind: 'hand', hand: 'right', impliedClef: 'treble', intervalDirection: 'descending', idx: i });
      i += 2; continue;
    }
    if (two === HAND_LEFT) {
      isMusicContextActive = true; // Mão Esquerda = gatilho de ativação musical
      curTokens.push({ kind: 'hand', hand: 'left', impliedClef: 'bass', intervalDirection: 'ascending', idx: i });
      i += 2; continue;
    }

    // Fórmulas C (⠨⠉ = \u2828\u2809) e C-cortado (⠸⠉ = \u2838\u2809)
    // ANTES de claves — ⠸ e ⠨ são também oitavas 3 e 5
    if (two === '\u2828\u2809') {
      curTokens.push({ kind: 'ts', numerator: 4, denominator: 4, abbreviated: 'C',  idx: i });
      beatsPerMeasure = 4; i += 2; continue;
    }
    if (two === '\u2838\u2809') {
      curTokens.push({ kind: 'ts', numerator: 2, denominator: 2, abbreviated: 'C|', idx: i });
      beatsPerMeasure = 2; i += 2; continue;
    }

    // Claves — cada uma define a direção dos intervalos automaticamente
    // Clave de Sol (treble) → intervalos descendentes
    // Clave de Fá (bass)   → intervalos ascendentes
    // Clave de Dó (tenor)  → intervalos descendentes (mesmo comportamento de treble)
    if (three === CLEF_TREBLE) {
      isMusicContextActive = true; // Clave de Sol = gatilho de ativação musical
      curTokens.push({ kind: 'clef', clefType: 'treble', intervalDirection: 'descending', idx: i });
      i += 3; continue;
    }
    if (three === CLEF_BASS) {
      isMusicContextActive = true; // Clave de Fá = gatilho de ativação musical
      curTokens.push({ kind: 'clef', clefType: 'bass', intervalDirection: 'ascending', idx: i });
      i += 3; continue;
    }
    // Clave de Dó 4ª linha (violoncelo/tenor) — 4 células
    // Clave de Dó na 4ª linha comporta-se como bass: intervalos ASCENDENTES
    {
      const fourChars = input.substring(i, i + 4);
      if (fourChars === CLEF_DO_4) {
        curTokens.push({ kind: 'clef', clefType: 'tenor', intervalDirection: 'ascending', idx: i });
        i += 4; continue;
      }
    }

    // Staccato ⠦
    if (ch === STACCATO) { curTokens.push({ kind: 'staccato', idx: i }); i++; continue; }

    // Ligadura simples ⠉
    if (ch === SLUR_SIMPLE) { curTokens.push({ kind: 'slur', slurType: 'simple', idx: i }); i++; continue; }

    // Oitava simples
    if (OCTAVE_MAP[ch] !== undefined) {
      noteOctaveSeen = true; // primeiro sinal de oitava → espaços passam a ser barras
      curTokens.push({ kind: 'oct', val: OCTAVE_MAP[ch], idx: i }); i++; continue;
    }

    // ⠩ e ⠣: armadura (1-3 acidentes) OU acidente — distinguir por contexto
    // Regra MusicBraille: sequência de ⠩⠩ ou ⠣⠣ sem nota entre elas = armadura
    // ⠩ ou ⠣ sozinhos imediatamente antes de nota = acidente
    if (ch === '\u2829' || ch === '\u2823') {
      const ACC_CHAR = ch;
      const KS_MAP = ch === '\u2829' ? KEY_SIG_SHARP : KEY_SIG_FLAT;
      // Contar quantos chars iguais seguem consecutivos (máx 3)
      let count = 1;
      while (count < 3 && i + count < len && input[i + count] === ACC_CHAR) count++;
      const seq = ACC_CHAR.repeat(count);
      // Verificar se o char após a sequência é uma nota (acidente) ou não (armadura)
      const afterSeq = input[i + count] || '';
      const afterIsNote = NOTE_MAP[afterSeq] !== undefined || REST_MAP[afterSeq] !== undefined;
      if (!afterIsNote && KS_MAP[seq]) {
        // Armadura
        const ks = KS_MAP[seq];
        curTokens.push({ kind: 'ks', fifths: ks.fifths, vexKey: ks.vexKey, idx: i });
        i += count; continue;
      }
      // Acidente (só o primeiro char; os outros serão processados na próxima iteração)
      if (ACCIDENTAL_MAP[ch]) { curTokens.push({ kind: 'acc', val: ACCIDENTAL_MAP[ch], idx: i }); i++; continue; }
    }

    // Outras alterações simples (bequadro ⠡)
    if (ACCIDENTAL_MAP[ch]) { curTokens.push({ kind: 'acc', val: ACCIDENTAL_MAP[ch], idx: i }); i++; continue; }

    // Armadura de 1-2 células
    if (OFFICIAL_KEY_SIGNATURE_MAP[ch]) {
      const ks = OFFICIAL_KEY_SIGNATURE_MAP[ch];
      curTokens.push({ kind: 'ks', fifths: ks.fifths, vexKey: ks.vexKey, idx: i }); i++; continue;
    }
    if (ch2 && OFFICIAL_KEY_SIGNATURE_MAP[two]) {
      const ks = OFFICIAL_KEY_SIGNATURE_MAP[two];
      curTokens.push({ kind: 'ks', fifths: ks.fifths, vexKey: ks.vexKey, idx: i }); i += 2; continue;
    }

    // Intervalo — captura acidentes, oitavas, staccato e slur pendentes
    // como modificadores específicos desta nota do intervalo.
    // Esses tokens são "roubados" da fila principal — não afetam a nota base.
    if (INTERVAL_MAP[ch] !== undefined && ch !== AUGMENTATION_DOT) {
      let pendingAccForInterval: Accidental | undefined;
      let pendingOctForInterval: number | undefined;
      let pendingStaccForInterval: boolean | undefined;
      let pendingSlurForInterval: boolean | undefined;

      // Roubar acidente pendente (imediatamente antes do intervalo)
      if (curTokens.length > 0) {
        const lastTk = curTokens[curTokens.length - 1];
        if (lastTk.kind === 'acc') {
          pendingAccForInterval = (lastTk as { kind: 'acc'; val: Accidental; idx: number }).val;
          curTokens.pop();
        }
      }
      // Roubar oitava pendente (pode estar antes do acidente)
      if (curTokens.length > 0) {
        const lastTk2 = curTokens[curTokens.length - 1];
        if (lastTk2.kind === 'oct') {
          pendingOctForInterval = (lastTk2 as { kind: 'oct'; val: number; idx: number }).val;
          curTokens.pop();
        }
      }
      // Roubar staccato pendente
      if (curTokens.length > 0) {
        const lastTk3 = curTokens[curTokens.length - 1];
        if (lastTk3.kind === 'staccato') {
          pendingStaccForInterval = true;
          curTokens.pop();
        }
      }
      // Roubar slur pendente
      if (curTokens.length > 0) {
        const lastTk4 = curTokens[curTokens.length - 1];
        if (lastTk4.kind === 'slur') {
          pendingSlurForInterval = true;
          curTokens.pop();
        }
      }

      curTokens.push({
        kind: 'interval',
        intervalSize: INTERVAL_MAP[ch],
        pendingAccidental:  pendingAccForInterval,
        pendingOctave:      pendingOctForInterval,
        pendingStaccato:    pendingStaccForInterval,
        pendingSlur:        pendingSlurForInterval,
        idx: i,
      });
      i++; continue;
    }

    // Pausa
    if (REST_MAP[ch]) {
      isMusicContextActive = true; noteOctaveSeen = true;
      const r = REST_MAP[ch];
      const dotted  = i + 1 < len && input[i + 1] === AUGMENTATION_DOT;
      const dotted2 = dotted && i + 2 < len && input[i + 2] === AUGMENTATION_DOT;
      curTokens.push({ kind: 'rest', primary: r.duration, secondary: r.altDuration, dotted, dotted2, idx: i });
      i++; if (dotted) { i++; if (dotted2) i++; } continue;
    }

    // Nota
    if (NOTE_MAP[ch]) {
      isMusicContextActive = true; noteOctaveSeen = true;
      const n = NOTE_MAP[ch];
      const dotted  = i + 1 < len && input[i + 1] === AUGMENTATION_DOT;
      const dotted2 = dotted && i + 2 < len && input[i + 2] === AUGMENTATION_DOT;
      curTokens.push({ kind: 'note', pitch: n.pitch, primary: n.duration, secondary: n.altDuration, dotted, dotted2, idx: i });
      i++; if (dotted) { i++; if (dotted2) i++; } continue;
    }

    if (ch === AUGMENTATION_DOT) { i++; continue; }

    // Caractere não reconhecido:
    // se contexto musical não foi ativado ainda, é texto literário (título, autor, etc.)
    // → emitir como kind:'text' para que o ScoreRenderer possa filtrar explicitamente
    if (!isMusicContextActive) {
      curTokens.push({ kind: 'text', char: ch, idx: i });
      i++; continue;
    }

    // No contexto musical, pular caractere desconhecido sem gerar elemento
    i++;
  }
  if (curTokens.length > 0) measures.push({ tokens: curTokens, barlineType: 'single' });

  // ── Fase 2: desambiguar e resolver oitavas ────────────────────────────────
  const elements: ParsedElement[] = [];
  let currentOctave    = options?.initialOctave ?? 4;
  let prevPitch: NoteName | null = (options?.initialPrevPitch as NoteName) ?? null;
  let prevOctave       = options?.initialOctave ?? 4;
  let firstNoteInDoc   = !options?.initialPrevPitch; // se tem contexto anterior, não é a primeira
  let inNoteContext    = false;

  // Processar cada compasso
  // trebleMeasureIndex e bassMeasureIndex: índices separados por mão,
  // cada um reseta para 0 ao encontrar o token da mão correspondente.
  // Implementam a sincronização matricial: trebleTrack[N] ↔ bassTrack[N] na mesma X.
  let trebleMeasureIndex = 0;
  let bassMeasureIndex   = 0;
  let activeMeasureHand: 'right' | 'left' | null = null;
  // measureIndex: índice efetivo da mão ativa (alias para o índice correto)
  let measureIndex = 0;
  for (const measure of measures) {
    const noteRestTokens = measure.tokens.filter(t => t.kind === 'note' || t.kind === 'rest') as
      Array<{ kind: string; primary: Duration; secondary: Duration; dotted: boolean; dotted2: boolean }>;

    const resolvedDurations = disambiguateMeasure(noteRestTokens, beatsPerMeasure);
    let nrIdx = 0;
    let pendingOctave: number | undefined;
    let pendingAccidental: Accidental | undefined;
    let pendingStaccato = false;
    /** Duração da última nota emitida neste compasso — herdada pelos intervalos do acorde. */
    let lastNoteDuration: Duration | null = null;

    for (const tk of measure.tokens) {
      if (tk.kind === 'ts') {
        const tsTk = tk as { kind: 'ts'; numerator: number; denominator: number; abbreviated?: 'C' | 'C|'; idx: number };
        elements.push({ type: 'timesignature', numerator: tsTk.numerator, denominator: tsTk.denominator, _abbreviated: tsTk.abbreviated, sourceIndex: tsTk.idx, level: 1 as const, isPremium: false } as ParsedTimeSignature);
        beatsPerMeasure = tsTk.numerator;
        inNoteContext = false; continue;
      }
      if (tk.kind === 'ks') {
        elements.push({ type: 'keysignature', fifths: (tk as any).fifths, vexKey: (tk as any).vexKey, sourceIndex: (tk as any).idx });
        inNoteContext = false; continue;
      }
      if (tk.kind === 'clef') {
        const clefTk = tk as { kind: 'clef'; clefType: 'treble' | 'bass' | 'tenor' | 'alto'; intervalDirection: 'ascending' | 'descending'; idx: number };
        elements.push({
          type: 'clef',
          clefType: clefTk.clefType,
          intervalDirection: clefTk.intervalDirection,
          sourceIndex: clefTk.idx,
        });
        inNoteContext = false; continue;
      }
      if (tk.kind === 'oct') { pendingOctave = (tk as any).val; inNoteContext = true; continue; }
      if (tk.kind === 'acc') { pendingAccidental = (tk as any).val; continue; }
      if (tk.kind === 'staccato') { pendingStaccato = true; continue; }
      if (tk.kind === 'fermata')       { elements.push({ type: 'fermata', sourceIndex: (tk as any).idx, level: 1 as const, isPremium: true }); continue; }
      if (tk.kind === 'hand') {
        const handTk = tk as { kind: 'hand'; hand: 'right' | 'left'; impliedClef: 'treble' | 'bass'; intervalDirection: 'ascending' | 'descending'; idx: number };
        // Resetar o índice de compasso para a mão que está começando
        // Isso implementa a lógica do leitor braille: mão direita começa do compasso 0,
        // mão esquerda também começa do compasso 0 (alinhamento matricial)
        if (handTk.hand === 'right') {
          trebleMeasureIndex = 0;
          measureIndex       = 0;
        } else {
          bassMeasureIndex = 0;
          measureIndex     = 0;
        }
        activeMeasureHand = handTk.hand;
        elements.push({
          type: 'hand',
          hand: handTk.hand,
          impliedClef: handTk.impliedClef,
          intervalDirection: handTk.intervalDirection,
          sourceIndex: handTk.idx,
          level: 3 as const,
          isPremium: false,
        });
        continue;
      }
      if (tk.kind === 'dynamic')       { elements.push({ type: 'dynamic', name: (tk as any).name, sourceIndex: (tk as any).idx, level: 1 as const, isPremium: true }); continue; }
      if (tk.kind === 'ornament')      { elements.push({ type: 'ornament', name: (tk as any).name, sourceIndex: (tk as any).idx, level: 1 as const, isPremium: true }); continue; }
      if (tk.kind === 'articulation')  { elements.push({ type: 'articulation', name: (tk as any).name, sourceIndex: (tk as any).idx, level: 1 as const, isPremium: true }); continue; }
      if (tk.kind === 'quialtera')     { elements.push({ type: 'quialtera', name: (tk as any).name, sourceIndex: (tk as any).idx, level: 1 as const, isPremium: true }); continue; }
      if (tk.kind === 'repetition')    { elements.push({ type: 'repetition', name: (tk as any).name, sourceIndex: (tk as any).idx, level: 1 as const, isPremium: true }); continue; }
      if (tk.kind === 'text')           { /* texto literário: não emite elemento musical */ continue; }
      if (tk.kind === 'slur')          { elements.push({ type: 'slur', slurType: (tk as any).slurType, sourceIndex: (tk as any).idx, level: 1 as const, isPremium: true }); continue; }
      if (tk.kind === 'tie')     { elements.push({ type: 'tie', sourceIndex: (tk as any).idx, level: 1 as const, isPremium: true }); continue; }
      if (tk.kind === 'phrase')  { elements.push({ type: 'phrase', phraseType: (tk as any).phraseType, sourceIndex: (tk as any).idx, level: 1 as const, isPremium: true }); continue; }
      if (tk.kind === 'interval') {
        if (inNoteContext) {
          const intTk = tk as {
            kind: 'interval';
            intervalSize: number;
            pendingAccidental?: Accidental;
            pendingOctave?: number;
            pendingStaccato?: boolean;
            pendingSlur?: boolean;
            idx: number;
          };
          elements.push({
            type: 'interval',
            intervalSize:   intTk.intervalSize,
            accidental:     intTk.pendingAccidental,
            explicitOctave: intTk.pendingOctave,
            duration:       lastNoteDuration ?? undefined,
            staccato:       intTk.pendingStaccato,
            slur:           intTk.pendingSlur,
            measureIndex,
            sourceIndex:    intTk.idx,
            grade: 4,
            level: 2 as const,
            isPremium: false,
          });
        }
        continue;
      }
      if (tk.kind === 'rest') {
        const r = tk as any;
        const dur = resolvedDurations[nrIdx++];
        elements.push({
          type: 'rest', duration: dur, dotted: r.dotted, dotted2: r.dotted2,
          vexDuration: durationToVex(dur, r.dotted, true),
          sourceIndex: r.idx, grade: 2,
          level: 1 as const, isPremium: false,
        });
        inNoteContext = true; pendingAccidental = undefined; continue;
      }
      if (tk.kind === 'note') {
        const n = tk as any;
        const dur = resolvedDurations[nrIdx++];
        let octave: number;
        if (pendingOctave !== undefined) { octave = pendingOctave; pendingOctave = undefined; currentOctave = octave; }
        else if (firstNoteInDoc) { octave = 4; currentOctave = 4; errors.push('Aviso: primeira nota sem sinal de oitava — assumindo oitava 4'); }
        else if (prevPitch !== null) { octave = inferOctave(prevPitch, prevOctave, n.pitch); currentOctave = octave; }
        else { octave = currentOctave; }

        elements.push({
          type: 'note', pitch: n.pitch, octave, duration: dur,
          dotted: n.dotted, dotted2: n.dotted2,
          staccato: pendingStaccato,
          accidental: pendingAccidental,
          vexKey: `${n.pitch.toLowerCase()}/${octave}`,
          vexDuration: durationToVex(dur, n.dotted, false),
          measureIndex,
          sourceIndex: n.idx,
          grade: gradeForNote(pendingOctave !== undefined, !!pendingAccidental),
          level: 1 as const,
          isPremium: false,
        });
        prevPitch = n.pitch; prevOctave = octave;
        pendingAccidental = undefined; pendingStaccato = false;
        firstNoteInDoc = false; inNoteContext = true; continue;
      }
    }

    // Emitir barra de compasso com measureIndex da mão ativa
    elements.push({ type: 'barline', sourceIndex: 0, barlineType: measure.barlineType as any, measureIndex, level: 1 as const, isPremium: false } as any);
    // Incrementar o índice da mão ativa
    if (activeMeasureHand === 'left') {
      bassMeasureIndex++;
      measureIndex = bassMeasureIndex;
    } else {
      trebleMeasureIndex++;
      measureIndex = trebleMeasureIndex;
    }
  }

  // Remover barra final vazia se último elemento
  if (elements.length > 0 && elements[elements.length - 1].type === 'barline') {
    const prev = elements[elements.length - 2];
    if (!prev || prev.type === 'barline') elements.pop();
  }

  return { elements, errors };
}

// ─── FUNÇÕES AUXILIARES EXPORTADAS ─────────────────────────────────────────────

export function parseBrailleLine(fullText: string, cursorPosition: number, options?: ParseOptions): ParseResult {
  const lines = fullText.split('\n');
  let charCount = 0;
  let targetLineIdx = 0;
  for (let li = 0; li < lines.length; li++) {
    if (cursorPosition <= charCount + lines[li].length) { targetLineIdx = li; break; }
    charCount += lines[li].length + 1;
  }
  const targetLine = lines[targetLineIdx] || '';

  // Construir contexto das linhas anteriores
  // (oitava final, nota final, compasso, armadura)
  let lineContext: ParseOptions = { ...options };

  if (targetLineIdx > 0) {
    // Parsear todas as linhas anteriores para obter o contexto final
    const prevText = lines.slice(0, targetLineIdx).join('\n');
    const prevResult = parseBrailleMusic(prevText, options);
    const prevEls = prevResult.elements;

    // Extrair última nota para contexto de oitava
    let lastOctave = 4;
    let lastPitch: string | null = null;
    let lastBpm = options?.beatsPerMeasure ?? 4;

    for (const el of prevEls) {
      if (el.type === 'note') {
        lastOctave = el.octave;
        lastPitch  = el.pitch;
      }
      if (el.type === 'timesignature') {
        lastBpm = el.numerator;
      }
    }

    lineContext = {
      ...options,
      initialOctave: lastOctave,
      initialPrevPitch: lastPitch ?? undefined,
      beatsPerMeasure: lastBpm,
    };
  }

  return parseBrailleMusic(targetLine, lineContext);
}

export function parseBrailleSelection(fullText: string, selStart: number, selEnd: number, options?: ParseOptions): ParseResult {
  return parseBrailleMusic(fullText.slice(selStart, selEnd), options);
}

// ─── TECLADO PERKINS ───────────────────────────────────────────────────────────

export interface PerkinsKeyState {
  dot1: boolean; dot2: boolean; dot3: boolean;
  dot4: boolean; dot5: boolean; dot6: boolean;
}

export function perkinsKeysToBraille(keys: PerkinsKeyState): string {
  const v = (keys.dot1 ? 1 : 0) | (keys.dot2 ? 2 : 0) | (keys.dot3 ? 4 : 0) |
            (keys.dot4 ? 8 : 0) | (keys.dot5 ? 16 : 0) | (keys.dot6 ? 32 : 0);
  return String.fromCharCode(0x2800 + v);
}

export function perkinsDotsToUnicode(dots: PerkinsKeyState): string {
  return perkinsKeysToBraille(dots);
}

export function brailleToPerkins(char: string): PerkinsKeyState {
  const code = char.charCodeAt(0) - 0x2800;
  return {
    dot1: (code & 1)  !== 0, dot2: (code & 2)  !== 0, dot3: (code & 4)  !== 0,
    dot4: (code & 8)  !== 0, dot5: (code & 16) !== 0, dot6: (code & 32) !== 0,
  };
}

export function unicodeToDots(char: string): number[] {
  const code = char.charCodeAt(0) - 0x2800;
  const dots: number[] = [];
  for (let i = 0; i < 6; i++) { if ((code & (1 << i)) !== 0) dots.push(i + 1); }
  return dots;
}

// ─── REFERÊNCIA RÁPIDA ─────────────────────────────────────────────────────────

export interface QuickRefEntry {
  char: string;
  displayChar?: string;
  dots: string;
  description: string;
  category: string;
}

export function getQuickReference(): QuickRefEntry[] {
  const ref: QuickRefEntry[] = [];

  // Notas
  const durLabels: Record<Duration, string> = {
    w: 'semibreve/semicolcheia', h: 'mínima/fusa', q: 'semínima/semifusa', '8': 'colcheia/quartifusa',
    '16': 'semibreve/semicolcheia', '32': 'mínima/fusa', '64': 'semínima/semifusa', '128': 'colcheia/quartifusa',
  };
  const durCat: Record<Duration, string> = {
    w: 'note-whole', h: 'note-half', q: 'note-quarter', '8': 'note-eighth',
    '16': 'note-whole', '32': 'note-half', '64': 'note-quarter', '128': 'note-eighth',
  };
  Object.entries(NOTE_MAP).forEach(([char, info]) => {
    const ptLabel: Record<string, string> = { C:'Dó',D:'Ré',E:'Mi',F:'Fá',G:'Sol',A:'Lá',B:'Si' };
    ref.push({
      char, dots: unicodeToDots(char).join(','),
      description: `${ptLabel[info.pitch]} ${durLabels[info.duration]}`,
      category: durCat[info.duration],
    });
  });

  // Pausas
  Object.entries(REST_MAP).forEach(([char, info]) => {
    ref.push({
      char, dots: unicodeToDots(char).join(','),
      description: `Pausa ${durLabels[info.duration]}`,
      category: 'rest',
    });
  });

  // Alterações
  const accLabels: Record<string, string> = {
    sharp:'Sustenido', flat:'Bemol', natural:'Bequadro',
    'double-sharp':'Dobrado sustenido', 'double-flat':'Dobrado bemol',
  };
  Object.entries(ACCIDENTAL_MAP).forEach(([char, acc]) => {
    ref.push({
      char, dots: char.length === 1 ? unicodeToDots(char).join(',') : unicodeToDots(char[0]).join(',') + '+' + unicodeToDots(char[1]).join(','),
      description: accLabels[acc] ?? acc,
      category: 'accidental',
    });
  });

  // Oitavas (somente celas simples para exibição)
  Object.entries(OCTAVE_MAP).forEach(([char, oct]) => {
    if (char.length === 1) {
      ref.push({ char, dots: unicodeToDots(char).join(','), description: `Oitava ${oct}`, category: 'octave' });
    }
  });

  // Fórmulas de compasso comuns
  const commonTimeSigs = [
    { char: '\u283C\u2819\u2832', desc: '4/4 — quaternário' },
    { char: '\u283C\u2809\u2832', desc: '3/4 — ternário' },
    { char: '\u283C\u2803\u2832', desc: '2/4 — binário' },
    { char: '\u283C\u280B\u2826', desc: '6/8 — composto' },
    { char: '\u2828\u2809',       desc: 'C — 4/4 abreviado' },
    { char: '\u2838\u2809',       desc: 'C cortado — 2/2' },
  ];
  commonTimeSigs.forEach(({ char, desc }) => {
    ref.push({ char, dots: [...char].map(c => unicodeToDots(c).join(',')).join(' '), description: desc, category: 'timesig' });
  });

  // Barras
  const barDescs: Record<string, string> = {
    end: 'Barra final', 'end-section': 'Barra de seção',
    'repeat-begin': 'Ritornelo início', 'repeat-end': 'Ritornelo fim', dotted: 'Barra pontilhada',
  };
  Object.entries(BARLINE_TWO_CELL).forEach(([char, type]) => {
    ref.push({ char, dots: [...char].map(c => unicodeToDots(c).join(',')).join(' '), description: barDescs[type] ?? type, category: 'barline' });
  });

  // Intervalos
  const intervalNames: Record<number, string> = { 2:'Segunda', 3:'Terça', 4:'Quarta', 5:'Quinta', 6:'Sexta', 7:'Sétima', 8:'Oitava' };
  Object.entries(INTERVAL_MAP).forEach(([char, size]) => {
    ref.push({ char, dots: unicodeToDots(char).join(','), description: `Intervalo: ${intervalNames[size] ?? size}ª`, category: 'interval' });
  });

  // Outros
  ref.push({ char: AUGMENTATION_DOT,      dots: '3',       description: 'Ponto de aumento',       category: 'other' });
  ref.push({ char: AUGMENTATION_DOT2,     dots: '3,3',     description: 'Ponto duplo de aumento', category: 'other' });

  // Ligaduras
  ref.push({ char: SLUR_SIMPLE,           dots: '1,4',     description: 'Ligadura simples',        category: 'ligadura' });
  ref.push({ char: SLUR_DOUBLE,           dots: '1,4 1,4', description: 'Ligadura dupla',          category: 'ligadura' });
  ref.push({ char: TIE,                   dots: '4 1,4',   description: 'Lig. prolongação',        category: 'ligadura' });
  ref.push({ char: PHRASE_START,          dots: '5,6 1,2', description: 'Lig. frase início',       category: 'ligadura' });
  ref.push({ char: PHRASE_END,            dots: '4,5 2,3', description: 'Lig. frase fim',          category: 'ligadura' });

  // Articulação
  ref.push({ char: STACCATO,                            dots: '2,3,6',          description: 'Staccato',          category: 'articulacao' });
  ref.push({ char: FERMATA,                             dots: '1,2,6 1,2,3',    description: 'Fermata',           category: 'articulacao' });
  ref.push({ char: '\u2826\u2826',                   dots: '2,3,6 2,3,6',    description: 'Staccato duplo',    category: 'articulacao' });
  ref.push({ char: '\u2838\u2826',                   dots: '4,5,6 2,3,6',    description: 'Tenuta',            category: 'articulacao' });
  ref.push({ char: '\u2830\u2826',                   dots: '5,6 2,3,6',      description: 'Martelato',         category: 'articulacao' });
  ref.push({ char: '\u2820\u2826',                   dots: '6 2,3,6',        description: 'Staccatissimo',     category: 'articulacao' });
  ref.push({ char: '\u2828\u2826',                   dots: '4,6 2,3,6',      description: 'Smorzando',         category: 'articulacao' });

  // Dinâmica
  ref.push({ char: '\u281C\u280F',                   dots: '3,4,5 1,2,3,4',  description: 'Piano (p)',         category: 'dinamica' });
  ref.push({ char: '\u281C\u280F\u280F',            dots: '3,4,5 ...',      description: 'Pianíssimo (pp)',   category: 'dinamica' });
  ref.push({ char: '\u281C\u280D\u280F',            dots: '3,4,5 ...',      description: 'Mezzo-piano (mp)', category: 'dinamica' });
  ref.push({ char: '\u281C\u280D\u280B',            dots: '3,4,5 ...',      description: 'Mezzo-forte (mf)', category: 'dinamica' });
  ref.push({ char: '\u281C\u280B',                   dots: '3,4,5 1,2,4',    description: 'Forte (f)',         category: 'dinamica' });
  ref.push({ char: '\u281C\u280B\u280B',            dots: '3,4,5 ...',      description: 'Fortíssimo (ff)',   category: 'dinamica' });
  ref.push({ char: '\u281C\u2809',                   dots: '3,4,5 1,4',      description: 'Crescendo',         category: 'dinamica' });
  ref.push({ char: '\u281C\u2812',                   dots: '3,4,5 2,5',      description: 'Cresc. fim',        category: 'dinamica' });
  ref.push({ char: '\u281C\u2819',                   dots: '3,4,5 1,4,5',    description: 'Diminuendo',        category: 'dinamica' });
  ref.push({ char: '\u281C\u2832',                   dots: '3,4,5 2,5,6',    description: 'Dimin. fim',        category: 'dinamica' });

  // Ornamentos
  ref.push({ char: '\u2816',                          dots: '2,3,5',          description: 'Trinado',           category: 'ornamento' });
  ref.push({ char: '\u2802\u2816',                   dots: '2 2,3,5',        description: 'Mordente superior', category: 'ornamento' });
  ref.push({ char: '\u281C\u2805',                   dots: '3,4,5 1,3',      description: 'Arpejo',            category: 'ornamento' });
  ref.push({ char: '\u2808\u2801',                   dots: '4 1',            description: 'Glissando',         category: 'ornamento' });
  ref.push({ char: '\u2822',                          dots: '2,6',            description: 'Apogiatura',        category: 'ornamento' });
  ref.push({ char: '\u2820\u2832',                   dots: '6 2,5,6',        description: 'Grupeto superior',  category: 'ornamento' });
  ref.push({ char: '\u2832',                          dots: '2,5,6',          description: 'Grupeto inferior',  category: 'ornamento' });

  // Quiálteras
  ref.push({ char: '\u2806',                          dots: '2,3',            description: 'Tercina',           category: 'quialtera' });
  ref.push({ char: '\u2838\u2806\u2804',            dots: '4,5,6 2,3 3',    description: 'Quiáltera 2',       category: 'quialtera' });
  ref.push({ char: '\u2838\u2812\u2804',            dots: '4,5,6 2,5 3',    description: 'Quiáltera 3',       category: 'quialtera' });
  ref.push({ char: '\u2838\u2832\u2804',            dots: '4,5,6 2,5,6 3',  description: 'Quiáltera 4',       category: 'quialtera' });
  ref.push({ char: '\u2838\u2822\u2804',            dots: '4,5,6 2,6 3',    description: 'Quiáltera 5',       category: 'quialtera' });

  // Repetição / Forma
  ref.push({ char: '\u282C\u2801',                   dots: '3,4,6 1',        description: 'Coda',              category: 'repeticao' });
  ref.push({ char: '\u283C\u2802',                   dots: '3,4,5,6 2',      description: '1ª vez',            category: 'repeticao' });
  ref.push({ char: '\u283C\u2806',                   dots: '3,4,5,6 2,3',    description: '2ª vez',            category: 'repeticao' });
  ref.push({ char: '\u2823\u2836',                   dots: '1,2,6 2,3,5,6',  description: 'Ritornelo início',  category: 'repeticao' });
  ref.push({ char: '\u2823\u2826',                   dots: '1,2,6 2,3,6',    description: 'Ritornelo fim',     category: 'repeticao' });

  // Claves
  ref.push({ char: CLEF_SOL_2,                        dots: '3,4,5 3,4 1,2,3',       description: 'Clave de Sol',      category: 'clave' });
  ref.push({ char: CLEF_FA_4,                         dots: '3,4,5 3,4,5,6 1,2,3',   description: 'Clave de Fá',       category: 'clave' });
  ref.push({ char: CLEF_DO_3,                         dots: '3,4,5 3,4,6 1,2,3',     description: 'Clave de Dó',       category: 'clave' });
  ref.push({ char: HAND_RIGHT,                        dots: '4,6 3,4,5',              description: 'Mão direita',       category: 'clave' });
  ref.push({ char: HAND_LEFT,                         dots: '4,5,6 3,4,5',            description: 'Mão esquerda',      category: 'clave' });

  // Fórmulas de compasso extras
  ref.push({ char: '\u2828\u2809', dots: '4,6 1,4',          description: 'C — 4/4 abreviado',  category: 'timesig' });
  ref.push({ char: '\u2838\u2809', dots: '4,5,6 1,4',        description: 'C cortado — 2/2',    category: 'timesig' });
  ref.push({ char: '\u283C\u2809\u2826', dots: '3,4,5,6 ...', description: '3/8',              category: 'timesig' });
  ref.push({ char: '\u283C\u280A\u2826', dots: '3,4,5,6 ...', description: '9/8',              category: 'timesig' });

  return ref;
}

export const QUICK_REFERENCE = getQuickReference();

export function describeBrailleChar(char: string): string {
  const entry = QUICK_REFERENCE.find(e => e.char === char);
  if (entry) return entry.description;
  if (NOTE_MAP[char]) return `${NOTE_MAP[char].pitch} (${NOTE_MAP[char].duration})`;
  if (REST_MAP[char]) return `Pausa (${REST_MAP[char].duration})`;
  if (ACCIDENTAL_MAP[char]) return accLabel(ACCIDENTAL_MAP[char]);
  if (OCTAVE_MAP[char] !== undefined) return `Oitava ${OCTAVE_MAP[char]}`;
  return 'Símbolo desconhecido';
}

function accLabel(acc: Accidental): string {
  const m: Record<Accidental, string> = {
    sharp: 'Sustenido', flat: 'Bemol', natural: 'Bequadro',
    'double-sharp': 'Dobrado sustenido', 'double-flat': 'Dobrado bemol',
  };
  return m[acc] ?? acc;
}
