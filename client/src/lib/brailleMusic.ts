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
// Durações válidas — fusas (32), semifusas (64) e quartifusas (128) REMOVIDAS.
// Linhas fundamentais são resolvidas diretamente: col=8, mín=h, sem=q.
// Apenas semibreve (w) vs semicolcheia (16) usa desambiguação dinâmica (linha 3).
// Tipo completo — 32/64/128 mantidos para compatibilidade com durationToBeats e getQuickReference.
// O parser NUNCA emite esses valores: NOTE_MAP e disambiguateMeasure estão travados nas linhas 1/2/4.
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
  '\u2819': { pitch: 'C', duration: '8',  altDuration: '8' }, // ⠙ (1,4,5)
  '\u2811': { pitch: 'D', duration: '8',  altDuration: '8' }, // ⠑ (1,5)
  '\u280B': { pitch: 'E', duration: '8',  altDuration: '8' }, // ⠋ (1,2,4)
  '\u281B': { pitch: 'F', duration: '8',  altDuration: '8' }, // ⠛ (1,2,4,5)
  '\u2813': { pitch: 'G', duration: '8',  altDuration: '8' }, // ⠓ (1,2,5)
  '\u280A': { pitch: 'A', duration: '8',  altDuration: '8' }, // ⠊ (2,4)
  '\u281A': { pitch: 'B', duration: '8',  altDuration: '8' }, // ⠚ (2,4,5)

  // Semínimas (q) e Semifusas (64) — acrescenta ponto 6
  '\u2839': { pitch: 'C', duration: 'q',  altDuration: 'q'  }, // ⠹ (1,4,5,6)
  '\u2831': { pitch: 'D', duration: 'q',  altDuration: 'q'  }, // ⠱ (1,5,6)
  '\u282B': { pitch: 'E', duration: 'q',  altDuration: 'q'  }, // ⠫ (1,2,4,6)
  '\u283B': { pitch: 'F', duration: 'q',  altDuration: 'q'  }, // ⠻ (1,2,4,5,6)
  '\u2833': { pitch: 'G', duration: 'q',  altDuration: 'q'  }, // ⠳ (1,2,5,6)
  '\u282A': { pitch: 'A', duration: 'q',  altDuration: 'q'  }, // ⠪ (2,4,6)
  '\u283A': { pitch: 'B', duration: 'q',  altDuration: 'q'  }, // ⠺ (2,4,5,6)

  // Mínimas (h) e Fusas (32) — acrescenta ponto 3
  '\u281D': { pitch: 'C', duration: 'h',  altDuration: 'h'  }, // ⠝ (1,3,4,5) — Dó mínima
  '\u2815': { pitch: 'D', duration: 'h',  altDuration: 'h'  }, // ⠕ (1,3,5)   — Ré mínima
  '\u280F': { pitch: 'E', duration: 'h',  altDuration: 'h'  }, // ⠏ (1,2,3,4) — Mi mínima
  '\u281F': { pitch: 'F', duration: 'h',  altDuration: 'h'  }, // ⠟ (1,2,3,4,5) — Fá mínima
  '\u2817': { pitch: 'G', duration: 'h',  altDuration: 'h'  }, // ⠗ (1,2,3,5) — Sol mínima
  '\u280E': { pitch: 'A', duration: 'h',  altDuration: 'h'  }, // ⠎ (2,3,4)   — Lá mínima
  '\u281E': { pitch: 'B', duration: 'h',  altDuration: 'h'  }, // ⠞ (2,3,4,5) — Si mínima

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
  '\u282D': { duration: '8',  altDuration: '8'   }, // ⠭ (1,3,4,6) — pausa colcheia (travada)
  '\u2827': { duration: 'q',  altDuration: 'q'   }, // ⠧ (1,2,3,6) — pausa semínima (travada)
  '\u2825': { duration: 'h',  altDuration: 'h'   }, // ⠥ (1,3,6)   — pausa mínima (travada)
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
// Ligadura Longa Pedagógica: início ⠃ isolado (dots 1,2 — mesmo glifo do intervalo de 3ª).
// Desambiguado por contexto: só é "início de frase pedagógica" quando NÃO há nota
// base ativa (!inNoteContext). Quando há nota base ativa, ⠃ mantém seu papel
// tradicional de intervalo (INTERVAL_MAP). Fecha com o mesmo PHRASE_END (⠘⠆),
// mas mantém estado INDEPENDENTE do escopo de frase ⠰⠃/⠘⠆ — os dois podem
// coexistir sem que a abertura/fechamento de um corrompa o estado do outro.
const PEDAGOGIC_PHRASE_START = '\u2803'; // ⠃ isolado (1,2) — início frase pedagógica

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
  /**
   * ID estável único da nota — usado para ancoragem de ligaduras longas e MusicXML.
   * Formato: "note-{measureIndex}-{sourceIndex}"
   */
  id: string;
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
  measureIndex: number;
  grade: PedagogicGrade;
  level: ReadingLevel;
  isPremium: boolean;
  // ── Modelo Neutro de Ligaduras (Cérebro) ─────────────────────────────────
  // Papéis retroativos: o parser marca a nota ORIGEM e a nota DESTINO diretamente.
  // O VexFlow e o MusicXML consomem esses papéis sem estado flutuante.
  /**
   * Papel de ligadura de expressão (slur curto):
   * 'start' = esta nota abre o arco  |  'end' = esta nota fecha o arco
   */
  slurRole?: 'start' | 'end';
  /**
   * Papel de ligadura de prolongação (tie — mesma altura, MIMB 6-2):
   * 'start' = esta nota dispara o som  |  'end' = esta nota prolonga sem re-ataque
   */
  tieRole?: 'start' | 'end';
  /** Soma de pulsos da tie (tieRole='end'): duração acumulada para o áudio */
  tieDuration?: number;
  /**
   * ID de escopo de ligadura longa (⠉⠉/⠰⠃ … ⠉/⠘⠆).
   * A nota 'start' e a nota 'end' compartilham o mesmo slurLongId.
   * Permite que o VexFlow construa um arco limpo sem linhas diagonais.
   */
  slurLongId?: string;
  /**
   * Papel de ligadura longa PEDAGÓGICA (⠃ isolado … ⠘⠆) — Cap. 6 estendido.
   * Campo totalmente independente de slurRole/slurLongId: permite que uma
   * frase pedagógica e uma ligadura de frase comum (⠰⠃/⠉⠉…⠘⠆) coexistam
   * e se sobreponham na mesma região da partitura sem conflito de estado.
   */
  slurRolePedagogic?: 'start' | 'end';
  /** ID de escopo da ligadura longa pedagógica — independente de slurLongId. */
  slurLongIdPedagogic?: string;
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
  /**
   * Armadura de clave ativa ao final do parse (ex: 'G', 'D', 'Bb').
   * null = Dó Maior / Lá menor (sem acidentes).
   * Persistida no ParseResult para que o scoreAudioPlayer e BrailleEditor
   * possam aplicar o delta correto sem re-parsear.
   */
  keySignature: string | null;
  /**
   * Estado da última nota processada — usar como initialNoteState
   * na próxima chamada para preservar contexto de oitavas entre linhas.
   */
  lastNoteState?: LastNoteState;
}

export interface ParseOptions {
  beatsPerMeasure?: number;
  initialOctave?: number;        // oitava inicial (contexto da linha anterior)
  initialPrevPitch?: string;     // nota anterior (contexto da linha anterior)
  initialBeatsPerMeasure?: number; // compasso da linha anterior
  /**
   * Estado completo da última nota — Grau 3: preserva contexto de oitavas entre linhas.
   * Quando fornecido, prevalece sobre initialOctave e initialPrevPitch.
   */
  initialNoteState?: LastNoteState;
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

// ─── ESTADO DE LEITURA — Grau 3: Regra de Uso das Oitavas ──────────────────────
//
// Implementa a dissertação Vanazzi 2014, Cap. 3, figuras 18 e 20:
// O parser mantém o estado da última nota lida e aplica uma árvore de decisão
// baseada na DISTÂNCIA DIATÔNICA entre a nota anterior e a atual.
//
// Regras estatutárias (Manual Internacional §1-10):
//
//   REGRA 1 — 2ª e 3ª (diatSteps 1–2):
//     NUNCA leva sinal de oitava, mesmo cruzando fronteira de oitava (Si→Dó).
//     Inferência: nota MIDI mais próxima da anterior.
//     Ex.: B4 → C (sem sinal) = C5, pois MIDI(C5)–MIDI(B4) = 1 < MIDI(C4)–MIDI(B4) = 11
//
//   REGRA 2 — 4ª e 5ª (diatSteps 3–4):
//     Sem sinal de oitava = SEMPRE na MESMA oitava da nota anterior.
//     Sinal explícito = muda de oitava conforme o sinal.
//     Ex.: C4 → G (sem sinal) = G4. C4 → ⠨G = G5.
//
//   REGRA 3 — 6ª, 7ª e ≥8ª (diatSteps 5–6):
//     SEMPRE devem levar sinal de oitava conforme o MIMB.
//     Sem sinal = violação musicográfica; parser registra aviso e aplica
//     fallback de MIDI mais próximo para não quebrar a renderização.

/**
 * Estado interno de última nota processada.
 * Mantido entre compassos para preservar o contexto melódico.
 */
export interface LastNoteState {
  noteName: string;        // 'C' | 'D' | 'E' | 'F' | 'G' | 'A' | 'B'
  octave: number;          // oitava real (ex: 4 = quarta oitava, C central = C4)
  diatonicPosition: number; // índice na escala diatônica [0=C … 6=B]
  midiNumber: number;      // MIDI: C4=60, A4=69 — usado para cálculo de proximidade
}

/** Mapas internos compartilhados pelas funções de inferência. */
const PITCH_ORDER_INFER: ReadonlyArray<NoteName> = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
const SEMITONES_INFER: Record<NoteName, number>  = { C:0, D:2, E:4, F:5, G:7, A:9, B:11 };

/**
 * Converte pitch + oitava → número MIDI.
 * C4 = 60, A4 = 69 (convenção MIDI científica).
 */
function noteToMidi(pitch: NoteName, octave: number): number {
  return (octave + 1) * 12 + SEMITONES_INFER[pitch];
}

/**
 * Calcula a distância diatônica MÍNIMA (0=unís, 1=2ª, 2=3ª, …, 6=7ª)
 * considerando o envoltório circular (B→C conta como 1, não 6).
 */
function minDiatonicSteps(prevIdx: number, nextIdx: number): number {
  const direct    = Math.abs(nextIdx - prevIdx);
  const wrapped   = 7 - direct; // distância pelo outro lado da escala
  return Math.min(direct, wrapped);
}

/**
 * Encontra a oitava que coloca `nextPitch` mais próxima (MIDI) de `prevMidi`.
 * Limita a busca ao intervalo [minOct, maxOct] para evitar saltos irrealistas.
 */
function closestOctaveByMidi(
  prevMidi:  number,
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
 * @param prevPitch  — Nome da nota anterior (NoteName)
 * @param prevOctave — Oitava real da nota anterior
 * @param nextPitch  — Nome da nota atual (sem sinal de oitava)
 * @param errors     — Array para registrar avisos de violação musicográfica
 * @returns          — Oitava inferida para a nota atual
 */
function inferOctave(
  prevPitch:  NoteName,
  prevOctave: number,
  nextPitch:  NoteName,
  errors:     string[],
): number {
  const prevIdx    = PITCH_ORDER_INFER.indexOf(prevPitch);
  const nextIdx    = PITCH_ORDER_INFER.indexOf(nextPitch);
  const prevMidi   = noteToMidi(prevPitch, prevOctave);
  const diatSteps  = minDiatonicSteps(prevIdx, nextIdx); // 0–6

  // ── REGRA 1: 2ª e 3ª (diatSteps 0, 1, 2) ────────────────────────────────
  // Inclui uníssono (0) como caso degenerado de 2ª.
  // Usa proximidade MIDI para resolver cruzamentos de oitava (B→C, etc.).
  if (diatSteps <= 2) {
    // Janela de busca: oitava anterior ±1 cobre todos os casos de 2ª e 3ª
    return closestOctaveByMidi(prevMidi, nextPitch, prevOctave - 1, prevOctave + 1);
  }

  // ── REGRA 2: 4ª e 5ª (diatSteps 3, 4) ───────────────────────────────────
  // Sem sinal de oitava = SEMPRE a mesma oitava da nota anterior.
  // Não há ambiguidade: o intervalo já é único dentro da mesma oitava.
  if (diatSteps === 3 || diatSteps === 4) {
    return prevOctave;
  }

  // ── REGRA 3: 6ª e 7ª (diatSteps 5, 6) ───────────────────────────────────
  // Violação: esses intervalos SEMPRE devem ter sinal de oitava no MIMB.
  // Parser registra aviso e aplica fallback de MIDI mais próximo.
  errors.push(
    `[Grau 3] Aviso: intervalo de ${diatSteps === 5 ? '6ª' : '7ª'} sem sinal de oitava ` +
    `(${prevPitch}${prevOctave}→${nextPitch}). Musicografia inválida; inferindo por proximidade MIDI.`
  );
  // Fallback idêntico à Regra 1, mas sem restrição de janela
  return closestOctaveByMidi(prevMidi, nextPitch, prevOctave - 1, prevOctave + 1);
}

// Desambiguação por compasso completo (lookahead)
// Recebe todos os items ambíguos de um compasso e decide em bloco.
// Reproduz a lógica do MusicBraille: testa todos primários juntos primeiro.
/**
 * Desambiguação de duração por compasso — REGRAS TRAVADAS (Grau 2):
 *
 * Linha 1 (sem pontos 3 e 6): primary='8',  secondary='128' → SEMPRE '8'  (colcheia)
 * Linha 2 (ponto 3):          primary='h',  secondary='32'  → SEMPRE 'h'  (mínima)
 * Linha 4 (ponto 6):          primary='q',  secondary='64'  → SEMPRE 'q'  (semínima)
 * Linha 3 (pontos 3 e 6):     primary='w',  secondary='16'  → DINÂMICO (semibreve vs semicolcheia)
 *   → Única linha que usa o algoritmo de lookahead por preenchimento de compasso.
 *
 * Essa travagem elimina a resolução incorreta para fusas (32), semifusas (64)
 * e quartifusas (128) nas linhas fundamentais de leitura.
 */
function disambiguateMeasure(
  items: Array<{ primary: Duration; secondary: Duration; dotted: boolean; dotted2: boolean }>,
  beatsPerMeasure: number,
): Duration[] {
  if (!items.length) return [];

  return items.map(it => {
    // Linha 1 — colcheia travada: '8' → sempre '8', nunca '128'
    if (it.primary === '8')  return '8'  as Duration;
    // Linha 2 — mínima travada: 'h' → sempre 'h', nunca '32'
    if (it.primary === 'h')  return 'h'  as Duration;
    // Linha 4 — semínima travada: 'q' → sempre 'q', nunca '64'
    if (it.primary === 'q')  return 'q'  as Duration;
    // Linha 3 — ÚNICA linha com desambiguação dinâmica: 'w' vs '16'
    // (não retorna aqui — cai no algoritmo de preenchimento abaixo)
    return null; // sentinela para linha 3
  }).map((resolved, idx) => {
    if (resolved !== null) return resolved; // linhas 1, 2 e 4 já resolvidas
    // Linha 3: algoritmo de lookahead por preenchimento de compasso
    const it = items[idx];
    // Testar se TODOS os primários do compasso (w) cabem no número de pulsos
    const totalPrimary = items.reduce(
      (s, item) => s + durationToBeats(item.primary === 'w' ? 'w' : item.primary, item.dotted)
                     * (item.dotted2 ? 1 + 0.25 : 1),
      0
    );
    return (totalPrimary <= beatsPerMeasure + 0.001) ? it.primary : it.secondary;
  });
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
  // Fusas (32), semifusas (64) e quartifusas (128) removidas do tipo Duration.
  // Apenas w/h/q/8/16 são valores válidos.
  let s = duration === 'w'   ? 'w'
        : duration === 'h'   ? 'h'
        : duration === 'q'   ? 'q'
        : duration === '8'   ? '8'
        : duration === '16'  ? '16'
        : duration === '32'  ? '32'
        : duration === '64'  ? '64'
        : duration === '128' ? '128'
        : '8'; // fallback
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
): { numerator: number; denominator: number; advance: number; abbreviated?: 'C' | 'C|' } | null {
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
    | { kind: 'pedagogic'; pedagogicType: 'start'; idx: number }
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

  type RawMeasure = { tokens: RawToken[]; barlineType: string; barlineIdx?: number };
  const measures: RawMeasure[] = [];
  let curTokens: RawToken[] = [];

  let i = 0;
  const len = input.length;

  // isMusicContextActive: FALSE até encontrar token de ativação musical explícito.
  // Tokens de ativação: Clave (⠜⠌⠇ / ⠜⠼⠇), Mão (⠨⠜ / ⠸⠜), Fórmula de Compasso (⠼).
  // Enquanto FALSE, espaços são silenciosos e texto plano é ignorado.
  let isMusicContextActive = false;
  // inNoteContext: true quando há uma nota base ativa no compasso corrente.
  // Declarado aqui (escopo da função) para estar disponível tanto na fase 1
  // (verificação de intervalo ⠼) quanto na fase 2 (resolução de notas).
  // É reinicializado para false no início de cada compasso (fase 2).
  let inNoteContext = false;
  // noteOctaveSeen: TRUE após o primeiro sinal de oitava de nota.
  // Espaços só incrementam compasso DEPOIS do primeiro sinal de oitava.
  let noteOctaveSeen = false;

  while (i < len) {
    const ch  = input[i];
    const ch2 = i + 1 < len ? input[i + 1] : '';
    const two = ch + ch2;
    const three = two + (i + 2 < len ? input[i + 2] : '');

    // Espaço (' '/⠀) OU quebra de linha (Enter/\r\n) = barra de compasso simples.
    // Ambos disparam EXATAMENTE a mesma lógica: o usuário não precisa digitar
    // um espaço antes ou depois do Enter para obter a separação de compasso —
    // pressionar Enter sozinho já produz a barra, com sourceIndex correto
    // apontando para a posição real do caractere de quebra de linha no texto.
    //
    // Regra de criação de barra (idêntica para espaço e quebra de linha):
    //   (1) O contexto musical está ativo (já encontrou clave, mão ou ⠼)
    //   (2) O bloco atual (curTokens) contém notas, pausas ou intervalos reais
    //       — blocos com APENAS configurações (hand, clef, ks, ts, oct) são
    //         "espaços/quebras decorativas de cabeçalho" e não incrementam
    //         o compasso.
    //
    // Nota sobre \r\n (Windows): o \r é processado primeiro e, se já tiver
    // esvaziado curTokens, o \n subsequente encontra hasRealMusic=false e
    // não gera um segundo compasso vazio — sem duplicação.
    if (ch === ' ' || ch === '\u2800' || ch === '\n' || ch === '\r') {
      if (isMusicContextActive) {
        const hasRealMusic = curTokens.some(
          tk => tk.kind === 'note' || tk.kind === 'rest' || tk.kind === 'interval'
        );
        if (hasRealMusic) {
          measures.push({ tokens: curTokens, barlineType: 'single', barlineIdx: i });
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
      measures.push({ tokens: curTokens, barlineType: bType, barlineIdx: i });
      curTokens = [];
      i += 2; continue;
    }

    // Fermata ⠣⠇ — ANTES de testar bemol ⠣
    if (two === FERMATA) {
      curTokens.push({ kind: 'fermata', idx: i }); i += 2; continue;
    }

    // Ligaduras de frase — ANTES de testar oitavas ⠰ e ⠘
    // PHRASE_START (⠰⠃) e PHRASE_END (⠘⠆) — ligaduras longas intercambiáveis com ⠉⠉/⠉
    if (two === PHRASE_START) { curTokens.push({ kind: 'phrase', phraseType: 'start', idx: i }); i += 2; continue; }
    if (two === PHRASE_END)   { curTokens.push({ kind: 'phrase', phraseType: 'end',   idx: i }); i += 2; continue; }

    // Ligadura de prolongação ⠈⠉ — ANTES de testar oitava ⠈
    if (two === TIE) { curTokens.push({ kind: 'tie', idx: i }); i += 2; continue; }

    // SLUR_DOUBLE (⠉⠉) — liga à nota anterior via retroação, abre escopo longo
    if (two === SLUR_DOUBLE) { curTokens.push({ kind: 'slur', slurType: 'double', idx: i }); i += 2; continue; }

    // Oitavas duplas
    if (OCTAVE_MAP[two] !== undefined && two.length === 2 && ch2) {
      noteOctaveSeen = true; // oitava dupla → espaços passam a ser barras
      curTokens.push({ kind: 'oct', val: OCTAVE_MAP[two], idx: i }); i += 2; continue;
    }

    // ⠼ (U+283C) — TRIPLA AMBIGUIDADE: TS / KS / Intervalo 4ª / Texto órfão
    // Prioridade MIMB:
    //   1. Armadura de 4-7 acidentes (⠼ + dígito + ⠩/⠣) — 3 células
    //   2. Fórmula de compasso (tryReadTimeSignature)
    //   3. Intervalo de 4ª — SOMENTE se inNoteContext ativo (há nota base no compasso)
    //   4. Texto literário órfão — fallback quando nenhuma das anteriores se aplica
    if (ch === NUMBER_SIGN) {
      // ── Prioridade 1: armadura de 4-7 acidentes ───────────────────────────
      if (i + 2 < len && OFFICIAL_KEY_SIGNATURE_MAP[three]) {
        const ks = OFFICIAL_KEY_SIGNATURE_MAP[three];
        curTokens.push({ kind: 'ks', fifths: ks.fifths, vexKey: ks.vexKey, idx: i });
        i += 3; continue;
      }
      // ── Prioridade 2: fórmula de compasso ─────────────────────────────────
      // Válida apenas no início do fluxo ou após espaço (não dentro de compasso com notas)
      const prevSemantic = i > 0 ? input[i - 1] : '';
      const atMeasureStart = !isMusicContextActive
        || curTokens.length === 0
        || prevSemantic === ' '
        || prevSemantic === '\u2800';
      if (atMeasureStart) {
        const ts = tryReadTimeSignature(input, i);
        if (ts) {
          isMusicContextActive = true; // ⠼ = gatilho de ativação musical
          curTokens.push({ kind: 'ts', numerator: ts.numerator, denominator: ts.denominator, idx: i });
          beatsPerMeasure = ts.numerator;
          i += ts.advance; continue;
        }
        // Falhou em ler TS → texto literal órfão (não disparar erro de execução)
        curTokens.push({ kind: 'text', char: ch, idx: i });
        i++; continue;
      }
      // ── Prioridade 3: intervalo de 4ª — SOMENTE com nota base ativa ───────
      // inNoteContext garante que há uma nota base válida antes deste token
      // no mesmo compasso, tornando ⠼ um qualificador de intervalo legítimo.
      if (inNoteContext && INTERVAL_MAP[ch] !== undefined) {
        // O bloco de intervalos adiante tratará o roubo de acc/oct pendentes
        // — não processar aqui, deixar cair no bloco INTERVAL_MAP abaixo
        // para manter a lógica de captura de modificadores centralizada.
        // (O 'fall-through' intencional para o bloco de intervalos acontece
        //  porque NÃO usamos 'continue' aqui — apenas saímos do if NUMBER_SIGN)
      } else {
        // ── Prioridade 4: texto literário órfão ───────────────────────────────
        curTokens.push({ kind: 'text', char: ch, idx: i });
        i++; continue;
      }
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

    // Oitava simples — com desambiguação do Hífen Musical (MIMB §6)
    if (OCTAVE_MAP[ch] !== undefined) {
      // ⠐ (U+2810, Ponto 5) = AMBÍGUO: oitava 4 OU hífen musical de quebra de linha.
      // Lookahead: se o próximo caractere semântico for espaço/braille-vazio ou fim de string
      //            → hífen musical (kind:'text') e não oitava.
      if (ch === MUSICAL_HYPHEN) {
        // Achar o próximo caractere não-newline
        let lookI = i + 1;
        while (lookI < len && (input[lookI] === '\r' || input[lookI] === '\n')) lookI++;
        const nextSemantic = lookI < len ? input[lookI] : '';
        const isMusicHyphen = lookI >= len                // fim de string
          || nextSemantic === ' '                          // espaço ASCII
          || nextSemantic === '\u2800';                  // cela braille vazia
        if (isMusicHyphen) {
          // Hífen musical de quebra de linha — classificar como texto, não oitava.
          // Não gera som nem nota; apenas preserva a continuidade métrica visual.
          curTokens.push({ kind: 'text', char: ch, idx: i });
          i++; continue;
        }
      }
      // Caso normal: sinal de oitava legítimo
      noteOctaveSeen = true;
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

    // ── Ligadura Longa Pedagógica: ⠃ isolado (SOMENTE fora de contexto de nota) ──
    // Desambiguação: ⠃ (U+2803) é o mesmo glifo do intervalo de 3ª (INTERVAL_MAP).
    // Se NÃO há nota base ativa (!inNoteContext), ⠃ não pode ser um intervalo
    // legítimo — reinterpretamos como abertura de frase pedagógica.
    // Se HÁ nota base ativa, ⠃ mantém seu papel de intervalo (cai no bloco abaixo).
    if (ch === PEDAGOGIC_PHRASE_START && !inNoteContext) {
      curTokens.push({ kind: 'pedagogic', pedagogicType: 'start', idx: i });
      i++; continue;
    }

    // Intervalo — captura acidentes, oitavas, staccato e slur pendentes
    // como modificadores específicos desta nota do intervalo.
    // CONDIÇÃO OBRIGATÓRIA: inNoteContext deve ser true (há nota base no compasso).
    // Sem nota base ativa, o caractere não pode ser intervalo — tratar como texto.
    if (INTERVAL_MAP[ch] !== undefined && ch !== AUGMENTATION_DOT) {
      if (!inNoteContext) {
        // Nenhuma nota base ativa → não é intervalo, é texto literal ou símbolo isolado
        curTokens.push({ kind: 'text', char: ch, idx: i });
        i++; continue;
      }
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
  if (curTokens.length > 0) measures.push({ tokens: curTokens, barlineType: 'single', barlineIdx: Math.max(0, len - 1) });

  // ── Fase 2: desambiguar e resolver oitavas ────────────────────────────────
  const elements: ParsedElement[] = [];
  // Inicializar estado de leitura — usa LastNoteState se disponível (Grau 3)
  const initState = options?.initialNoteState;
  let currentOctave  = initState?.octave ?? options?.initialOctave ?? 4;
  let prevPitch: NoteName | null = (initState?.noteName as NoteName ?? options?.initialPrevPitch as NoteName) ?? null;
  let prevOctave     = initState?.octave ?? options?.initialOctave ?? 4;
  let firstNoteInDoc = !initState && !options?.initialPrevPitch;
  // inNoteContext já declarado antes do while loop — reinicializar por compasso
  inNoteContext = false;

  // ── ESTADO DE LIGADURAS — ESCOPO DE FUNÇÃO (não por compasso) ────────────────
  // BUG CORRIGIDO: estas variáveis eram anteriormente declaradas DENTRO do loop
  // for(measure), sendo reinicializadas a cada novo compasso. Isso corrompia
  // qualquer ligadura de prolongação (⠉) ou frase longa que cruzasse uma barline,
  // pois o estado "pendente" era perdido exatamente na transição de compasso.
  // Hoisting para aqui garante que o estado sobrevive através de barlines,
  // espaços em branco e quebras de linha — apenas o token de fechamento correto
  // (mesma altura para tie; ⠘⠆/⠉ contextual para frases) consome o estado.

  // Contador global e monotônico para geração de IDs de escopo de ligadura longa.
  // Cada abertura (⠉⠉, ⠰⠃, ou ⠃ pedagógico) consome um novo ID único —
  // elimina colisões e não depende de measureIndex/sourceIndex.
  let slurIdCounter = 0;

  // Canal de ligadura simples (⠉) / tie explícito (⠈⠉)
  let nextNoteIsSlurTarget = false;  // ⠉ simples foi lido → próxima nota é destino
  let nextNoteIsTieTarget  = false;  // ⠈⠉ foi lido → próxima nota é destino de tie
  let pendingTie           = false;  // ⠈⠉ explícito (mantido para compatibilidade)

  // Canal de ligadura longa de FRASE (⠉⠉ ou ⠰⠃ … ⠉ contextual ou ⠘⠆)
  let activeSlurLongId: string | null = null;
  // ⠰⠃ (Início de Ligadura Longa explícito): NÃO marca a nota anterior.
  // Ativa esta flag prospectiva — a PRÓXIMA nota processada é que recebe
  // slurRole='start' e um novo ID de escopo (gerado no momento da resolução).
  let pendingLongSlurStart = false;

  // Canal de ligadura longa PEDAGÓGICA (⠃ isolado … ⠘⠆) — INDEPENDENTE do canal
  // de frase acima. Abrir/fechar um NUNCA afeta o estado do outro: são variáveis
  // distintas, permitindo sobreposição/coexistência simultânea na partitura.
  let activePedagogicPhraseId: string | null = null;
  let nextNoteIsPedagogicEnd = false;

  // Mapa de ties pendentes por altura — "pitch/octave" → nota de origem (referência
  // mutável). Permite rastrear múltiplas prolongações simultâneas (ex: acorde onde
  // duas alturas diferentes têm tie ativo ao mesmo tempo) e fechar corretamente
  // mesmo que a nota de destino apareça no compasso seguinte.
  const pendingTies = new Map<string, ParsedNote>();

  // Última nota emitida — usada para comparação de pitch+octave na resolução de tie.
  // Também hoisted: sem isso, uma tie pendente no fim do compasso N perderia a
  // referência da nota de origem ao processar o compasso N+1.
  let lastNoteForTie: { pitch: string; octave: number; duration: Duration; dotted: boolean; dotted2: boolean } | null = null;

  // Processar cada compasso
  // trebleMeasureIndex e bassMeasureIndex: índices separados por mão,
  // cada um reseta para 0 ao encontrar o token da mão correspondente.
  // Implementam a sincronização matricial: trebleTrack[N] ↔ bassTrack[N] na mesma X.
  let trebleMeasureIndex = 0;
  let bassMeasureIndex   = 0;
  let activeMeasureHand: 'right' | 'left' | null = null;
  // ── Contador Matricial Dinâmico de Bloco (correção de bug) ────────────────
  // BUG CORRIGIDO: trebleMeasureIndex/bassMeasureIndex eram resetados para 0
  // INCONDICIONALMENTE a cada token de mão, mesmo quando já havia um bloco
  // anterior daquela mesma mão processado. Em documentos que alternam mãos
  // em blocos pequenos (1-2 compassos, ou linha a linha), isso fazia o
  // SEGUNDO bloco da mão direita voltar a measureIndex=0, colidindo com o
  // PRIMEIRO bloco — e como splitByHand()/scoreAudioPlayer.ts usam
  // measureIndex como chave de agrupamento (bucket), blocos diferentes
  // acabavam se fundindo no mesmo compasso, quebrando VexFlow e áudio.
  //
  // currentBlockStartMeasure: measureIndex em que o bloco atual de
  // alternância começa — avança apenas quando a MÃO DIREITA reaparece após
  // a esquerda (ou no início do documento), preservando a numeração
  // sequencial contínua através de qualquer número de alternâncias.
  let currentBlockStartMeasure = 0;
  let lastHand: 'right' | 'left' | null = null;
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
    // ── Persistência de acidentes no compasso (MIMB Cap. 5) ──────────────────
    // Qualquer acidente ocorrendo num compasso afeta notas subsequentes do mesmo
    // nome E oitava até o token de barline limpar o estado.
    // O estado é reinicializado a cada compasso no loop externo for(measure).
    const measureAccidentals = new Map<string, Accidental>(); // "pitch/octave" → acidente
    // NOTA: nextNoteIsSlurTarget, nextNoteIsTieTarget, activeSlurLongId,
    // pendingLongSlurStart, activePedagogicPhraseId, nextNoteIsPedagogicEnd,
    // lastNoteForTie, pendingTie e slurIdCounter foram movidos para escopo de
    // FUNÇÃO (antes deste for-loop) — ver comentário "ESTADO DE LIGADURAS"
    // acima. Isso corrige o bug de perda de estado ao cruzar barlines.
    //
    // Contador de notas no compasso — para geração de ID único (não confundir
    // com slurIdCounter, que é global e usado apenas para IDs de ligadura longa)
    let noteSeqInMeasure = 0;
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
        elements.push({ type: 'keysignature', fifths: (tk as any).fifths, vexKey: (tk as any).vexKey, sourceIndex: (tk as any).idx, level: 1 as const, isPremium: false });
        inNoteContext = false; continue;
      }
      if (tk.kind === 'clef') {
        const clefTk = tk as { kind: 'clef'; clefType: 'treble' | 'bass' | 'tenor' | 'alto'; intervalDirection: 'ascending' | 'descending'; idx: number };
        elements.push({
          type: 'clef',
          clefType: clefTk.clefType,
          intervalDirection: clefTk.intervalDirection,
          sourceIndex: clefTk.idx,
          level: 1 as const,
          isPremium: false,
        });
        inNoteContext = false; continue;
      }
      if (tk.kind === 'oct') { pendingOctave = (tk as any).val; inNoteContext = true; continue; }
      if (tk.kind === 'acc') { pendingAccidental = (tk as any).val; continue; }
      if (tk.kind === 'staccato') { pendingStaccato = true; continue; }
      if (tk.kind === 'fermata')       { elements.push({ type: 'fermata', sourceIndex: (tk as any).idx, level: 1 as const, isPremium: true }); continue; }
      if (tk.kind === 'hand') {
        const handTk = tk as { kind: 'hand'; hand: 'right' | 'left'; impliedClef: 'treble' | 'bass'; intervalDirection: 'ascending' | 'descending'; idx: number };
        // ── Contador Matricial Dinâmico ───────────────────────────────────
        // Mão direita: se vem depois da esquerda (ou é a primeira mão do
        // documento), avança currentBlockStartMeasure para o maior índice já
        // alcançado por qualquer uma das mãos — isto é, o próximo bloco
        // continua de onde o alinhamento parou, nunca reinicia em 0.
        if (handTk.hand === 'right') {
          if (lastHand === 'left' || lastHand === null) {
            currentBlockStartMeasure = Math.max(trebleMeasureIndex, bassMeasureIndex);
          }
          trebleMeasureIndex = currentBlockStartMeasure;
          measureIndex       = trebleMeasureIndex;
          lastHand           = 'right';
        } else {
          // Mão esquerda sempre começa no MESMO compasso em que o bloco
          // atual da mão direita começou — preserva o alinhamento matricial
          // (trebleTrack[N] ↔ bassTrack[N]) através de qualquer número de
          // alternâncias de blocos.
          bassMeasureIndex = currentBlockStartMeasure;
          measureIndex     = bassMeasureIndex;
          lastHand         = 'left';
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
      if (tk.kind === 'slur') {
        const slurTk = tk as { kind: 'slur'; slurType: 'simple' | 'double'; idx: number };
        elements.push({ type: 'slur', slurType: slurTk.slurType, sourceIndex: slurTk.idx, level: 1 as const, isPremium: true });

        if (slurTk.slurType === 'simple') {
          // ⠉ SIMPLES — retroação direta:
          // 1. Localizar a última nota já emitida e marcar como 'start'
          const lastNote = Array.from(elements).reverse().find(e => e.type === 'note') as ParsedNote | undefined;
          if (lastNote) {
            // Verificar se a próxima nota terá mesma altura → será tie, não slur
            // (decisão adiada para o processamento da próxima nota)
            nextNoteIsSlurTarget = true; // flag efêmera: próxima nota = destino
          }
        } else {
          // ⠉⠉ DUPLO — abre escopo de ligadura longa de FRASE.
          // ID gerado por contador global monotônico — nunca colide, independe
          // de measureIndex/sourceIndex (que podiam repetir entre mãos/vozes).
          const lastNote = Array.from(elements).reverse().find(e => e.type === 'note') as ParsedNote | undefined;
          if (lastNote) {
            slurIdCounter++;
            const longId = `slur-long-${slurIdCounter}`;
            (lastNote as any).slurLongId = longId;
            (lastNote as any).slurRole   = 'start';
            activeSlurLongId = longId;
          }
        }
        continue;
      }
      if (tk.kind === 'tie') {
        // ⠈⠉ explícito = prolongação forçada — próxima nota é destino
        pendingTie            = true;
        nextNoteIsTieTarget   = true;
        elements.push({ type: 'tie', sourceIndex: (tk as any).idx, level: 1 as const, isPremium: true });
        continue;
      }
      if (tk.kind === 'phrase') {
        const phTk = tk as { kind: 'phrase'; phraseType: 'start' | 'end'; idx: number };
        elements.push({ type: 'phrase', phraseType: phTk.phraseType, sourceIndex: phTk.idx, level: 1 as const, isPremium: true });

        if (phTk.phraseType === 'start') {
          // ⠰⠃ (Início de Ligadura Longa) — NÃO marca a nota anterior.
          // Ativa flag prospectiva: a PRÓXIMA nota processada recebe
          // slurRole='start' (ver bloco de resolução de nota).
          pendingLongSlurStart = true;
        } else {
          // ⠘⠆ (Fim de Ligadura Longa) — retrocede ao array de elementos e
          // aplica o fechamento (slurRole='end') na nota IMEDIATAMENTE
          // ANTERIOR ao sinal, usando o escopo atualmente ativo.
          if (activeSlurLongId !== null) {
            const lastNote = Array.from(elements).reverse().find(e => e.type === 'note') as ParsedNote | undefined;
            if (lastNote) {
              (lastNote as any).slurRole   = 'end';
              (lastNote as any).slurLongId = activeSlurLongId;
            }
            activeSlurLongId = null;
          }
          // Canal PEDAGÓGICO (⠃ isolado) — independente, mantém seu próprio
          // fluxo prospectivo (não alterado por esta refatoração).
          if (activePedagogicPhraseId !== null) {
            nextNoteIsPedagogicEnd = true;
          }
        }
        continue;
      }
      if (tk.kind === 'pedagogic') {
        // ⠃ isolado (fora de contexto de nota) — Ligadura Longa Pedagógica.
        // Canal totalmente independente do escopo de frase (⠰⠃/⠉⠉/⠘⠆) acima:
        // usa suas PRÓPRIAS variáveis de estado e seu PRÓPRIO campo na
        // ParsedNote (slurRolePedagogic/slurLongIdPedagogic), permitindo
        // sobreposição/coexistência sem cancelar o outro canal.
        const pedTk = tk as { kind: 'pedagogic'; pedagogicType: 'start'; idx: number };
        elements.push({ type: 'phrase', phraseType: 'start', sourceIndex: pedTk.idx, level: 1 as const, isPremium: true });

        const lastNote = Array.from(elements).reverse().find(e => e.type === 'note') as ParsedNote | undefined;
        if (lastNote) {
          slurIdCounter++;
          const pedId = `phrase-ped-${slurIdCounter}`;
          (lastNote as any).slurLongIdPedagogic = pedId;
          (lastNote as any).slurRolePedagogic   = 'start';
          activePedagogicPhraseId = pedId;
          nextNoteIsPedagogicEnd  = false;
        }
        continue;
      }
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
        else if (prevPitch !== null) { octave = inferOctave(prevPitch, prevOctave, n.pitch, errors); currentOctave = octave; }
        else { octave = currentOctave; }

        // ── MODELO RETROATIVO DE LIGADURAS (Cérebro) ─────────────────────────
        // ID único desta nota (formato estável para MusicXML e ancoragem VexFlow)
        const noteId = `note-${measureIndex}-${n.idx}`;
        noteSeqInMeasure++;

        // ── Persistência de acidentes no compasso ────────────────────────────
        // Chave de acidente: "pitch/octave" — acidente afeta mesma nota na mesma oitava
        const accKey = `${n.pitch}/${octave}`;
        if (pendingAccidental !== undefined) {
          // Acidente explícito → registrar para notas subsequentes do compasso
          measureAccidentals.set(accKey, pendingAccidental);
        } else if (measureAccidentals.has(accKey)) {
          // Sem acidente explícito mas há acidente ativo no compasso → aplicar
          pendingAccidental = measureAccidentals.get(accKey);
        }

        // Papéis que esta nota pode receber
        let resolvedSlurRole: 'start' | 'end' | undefined = undefined;
        let resolvedTieRole:  'start' | 'end' | undefined = undefined;
        let resolvedTieDuration: number | undefined        = undefined;
        let resolvedSlurLongId:  string | undefined        = undefined;
        let resolvedSlurRolePedagogic: 'start' | 'end' | undefined = undefined;
        let resolvedSlurLongIdPedagogic: string | undefined        = undefined;

        const BEAT_MAP: Record<string, number> = {
          w: 4, h: 2, q: 1, '8': 0.5, '16': 0.25, '32': 0.125, '64': 0.0625, '128': 0.03125,
        };

        // ── CASO 0: Esta nota é destino de ligadura longa PEDAGÓGICA (⠃ … ⠘⠆) ──
        // Canal independente — processado ANTES e SEM interferir nos demais casos.
        if (nextNoteIsPedagogicEnd && activePedagogicPhraseId !== null) {
          resolvedSlurRolePedagogic   = 'end';
          resolvedSlurLongIdPedagogic = activePedagogicPhraseId;
          activePedagogicPhraseId  = null;
          nextNoteIsPedagogicEnd   = false;
        }

        // ── CASO 1: Esta nota é destino PROSPECTIVO de ⠰⠃ (Início de Ligadura Longa) ──
        // ⠰⠃ não marcou a nota anterior — esta é a nota que efetivamente abre
        // o escopo. Gera o ID aqui, no momento em que a nota real é conhecida.
        if (pendingLongSlurStart) {
          slurIdCounter++;
          const newLongId    = `slur-long-${slurIdCounter}`;
          resolvedSlurRole   = 'start';
          resolvedSlurLongId = newLongId;
          activeSlurLongId   = newLongId; // ativo até o ⠘⠆ correspondente
          pendingLongSlurStart = false;
        }

        // ── CASO 2: Esta nota é destino de ⠉ simples (retroação contextual) ───
        if (nextNoteIsSlurTarget) {
          nextNoteIsSlurTarget = false;
          const samePitchOctave =
            lastNoteForTie !== null &&
            lastNoteForTie.pitch  === n.pitch &&
            lastNoteForTie.octave === octave;

          if (samePitchOctave || nextNoteIsTieTarget) {
            // Mesma altura (ou tie explícito) → "Ligadura de Duração" (MIMB 6-2)
            resolvedTieRole = 'end';
            // Retroativamente marcar a nota-origem como 'start'
            const originNote = Array.from(elements).reverse().find(e => e.type === 'note') as ParsedNote | undefined;
            if (originNote) {
              (originNote as any).tieRole = 'start';
              const originKey = `${originNote.pitch}/${originNote.octave}`;
              pendingTies.set(originKey, originNote); // registrar no mapa (robustez multi-voz)
              const prevPulses = (BEAT_MAP[lastNoteForTie!.duration] ?? 1) * (lastNoteForTie!.dotted ? 1.5 : 1);
              const thisPulses = (BEAT_MAP[dur] ?? 1) * (n.dotted ? 1.5 : 1);
              resolvedTieDuration = prevPulses + thisPulses;
              pendingTies.delete(originKey); // tie resolvida nesta mesma passagem — consumida
            }
          } else if (activeSlurLongId !== null) {
            // Altura DIFERENTE e HÁ um escopo de ligadura longa de frase ATIVO
            // (aberto por ⠉⠉ ou ⠰⠃) — o ⠉ simples fecha ESSE escopo existente,
            // conectando a nota de partida original (possivelmente vários
            // compassos atrás) à nota de chegada atual — em vez de criar uma
            // ligadura curta redundante isolada entre apenas as duas últimas notas.
            resolvedSlurRole   = 'end';
            resolvedSlurLongId = activeSlurLongId;
            activeSlurLongId   = null;
          } else {
            // Altura diferente e NENHUM escopo longo ativo → ligadura de
            // expressão curta, conectando apenas a nota imediatamente
            // anterior (origem) à nota atual.
            resolvedSlurRole = 'end';
            const originNote = Array.from(elements).reverse().find(e => e.type === 'note') as ParsedNote | undefined;
            if (originNote) {
              (originNote as any).slurRole = 'start';
            }
          }
          nextNoteIsTieTarget = false;
          pendingTie          = false;
        }

        // ── CASO 3: Tie explícito (⠈⠉) ainda pendente ────────────────────────
        else if (pendingTie) {
          resolvedTieRole = 'end';
          const originNote = Array.from(elements).reverse().find(e => e.type === 'note') as ParsedNote | undefined;
          if (originNote && lastNoteForTie !== null) {
            (originNote as any).tieRole = 'start';
            const prevPulses = (BEAT_MAP[lastNoteForTie.duration] ?? 1) * (lastNoteForTie.dotted ? 1.5 : 1);
            const thisPulses = (BEAT_MAP[dur] ?? 1) * (n.dotted ? 1.5 : 1);
            resolvedTieDuration = prevPulses + thisPulses;
          }
          pendingTie          = false;
          nextNoteIsTieTarget = false;
        }

        elements.push({
          type: 'note',
          id:          noteId,
          pitch:       n.pitch,
          octave,
          duration:    dur,
          dotted:      n.dotted,
          dotted2:     n.dotted2,
          staccato:    pendingStaccato,
          accidental:  pendingAccidental,
          vexKey:      `${n.pitch.toLowerCase()}/${octave}`,
          vexDuration: durationToVex(dur, n.dotted, false),
          measureIndex,
          sourceIndex: n.idx,
          grade:       gradeForNote(pendingOctave !== undefined, !!pendingAccidental),
          level:       1 as const,
          isPremium:   false,
          slurRole:    resolvedSlurRole,
          tieRole:     resolvedTieRole,
          tieDuration: resolvedTieDuration,
          slurLongId:  resolvedSlurLongId,
          slurRolePedagogic:   resolvedSlurRolePedagogic,
          slurLongIdPedagogic: resolvedSlurLongIdPedagogic,
        });
        lastNoteForTie   = { pitch: n.pitch, octave, duration: dur, dotted: n.dotted, dotted2: n.dotted2 };
        lastNoteDuration = dur;
        prevPitch = n.pitch; prevOctave = octave;
        pendingAccidental = undefined; pendingStaccato = false;
        firstNoteInDoc = false; inNoteContext = true; continue;
      }
    }

    // Emitir barra de compasso com measureIndex da mão ativa
    elements.push({ type: 'barline', sourceIndex: (measure as any).barlineIdx ?? 0, barlineType: measure.barlineType as any, measureIndex, level: 1 as const, isPremium: false } as any);
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

  // Armadura de clave final para o ParseResult
  const currentKeySignature: string | null =
    (elements.find(e => e.type === 'keysignature') as any)?.vexKey ?? null;

  // Construir o estado final para continuidade melódica entre linhas (Grau 3)
  const lastNoteState: LastNoteState | undefined = prevPitch !== null
    ? {
        noteName:        prevPitch,
        octave:          prevOctave,
        diatonicPosition: PITCH_ORDER_INFER.indexOf(prevPitch),
        midiNumber:      noteToMidi(prevPitch, prevOctave),
      }
    : undefined;

  return { elements, errors, keySignature: currentKeySignature, lastNoteState };
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
    ref.push({ char, dots: Array.from(char).map(c => unicodeToDots(c).join(',')).join(' '), description: desc, category: 'timesig' });
  });

  // Barras
  const barDescs: Record<string, string> = {
    end: 'Barra final', 'end-section': 'Barra de seção',
    'repeat-begin': 'Ritornelo início', 'repeat-end': 'Ritornelo fim', dotted: 'Barra pontilhada',
  };
  Object.entries(BARLINE_TWO_CELL).forEach(([char, type]) => {
    ref.push({ char, dots: Array.from(char).map(c => unicodeToDots(c).join(',')).join(' '), description: barDescs[type] ?? type, category: 'barline' });
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
  ref.push({ char: SLUR_SIMPLE,           dots: '1,4',     description: 'Ligadura de Duração',     category: 'ligadura' });
  ref.push({ char: SLUR_DOUBLE,           dots: '1,4 1,4', description: 'Início de Ligadura',      category: 'ligadura' });
  ref.push({ char: TIE,                   dots: '4 1,4',   description: 'Ligadura de Duração',     category: 'ligadura' });
  ref.push({ char: PHRASE_START,          dots: '5,6 1,2', description: 'Início de Ligadura Longa', category: 'ligadura' });
  ref.push({ char: PHRASE_END,            dots: '4,5 2,3', description: 'Fim de Ligadura Longa',   category: 'ligadura' });

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


// ═══════════════════════════════════════════════════════════════════════════
// MUSICXML BIDIRECIONAL — IMPORT / EXPORT
// ═══════════════════════════════════════════════════════════════════════════
//
// Converte entre MusicXML (formato <score-partwise>, padrão de exportação do
// Finale, MuseScore, Sibelius) e o texto Braille musical do Five Steps.
//
// Suporte:
//   • importMusicXML() — MusicXML → texto Braille
//   • exportToMusicXML() — texto Braille → MusicXML
//   • Piano com pauta dupla (staff 1=RH / staff 2=LH), alternando blocos de
//     N compassos com prefixos '.>' (mão direita) e '_>' (mão esquerda)
//   • Anacruse (compasso incompleto inicial) via metrical="no"
//   • Acordes (<chord/>) → intervalos Grau 4
//   • Ligaduras de duração (<tie>) e de expressão (<slur>) → '⠉'
//   • Múltiplas vozes sobrepostas na mesma pauta → Grau 5 "Em Acorde" (ver nota)
//
// LIMITAÇÃO DECLARADA: apenas <score-partwise> é suportado (formato padrão
// de exportação de todo software de notação musical relevante). O formato
// <score-timewise> — raro na prática — não é tratado; importMusicXML lança
// um erro claro e explícito nesse caso, em vez de falhar silenciosamente.

// ─── MAPAS REVERSOS (pitch/duração/oitava/acidente/intervalo → glifo Braille) ──

type BrailleDuration = 'w' | 'h' | 'q' | '8' | '16';

const REVERSE_NOTE_MAP: Record<NoteName, Partial<Record<BrailleDuration, string>>> = (() => {
  const rev = { C: {}, D: {}, E: {}, F: {}, G: {}, A: {}, B: {} } as
    Record<NoteName, Partial<Record<BrailleDuration, string>>>;
  for (const [char, info] of Object.entries(NOTE_MAP)) {
    const durKey = info.duration as BrailleDuration;
    if (rev[info.pitch][durKey] === undefined) rev[info.pitch][durKey] = char;
    // O mesmo glifo cobre 'w' e '16' (ambiguidade Grau 3, resolvida por contexto
    // na leitura) — garantir que a busca por '16' também encontre o glifo certo.
    if (info.altDuration === '16' && rev[info.pitch]['16'] === undefined) {
      rev[info.pitch]['16'] = char;
    }
  }
  return rev;
})();

const REVERSE_REST_MAP: Partial<Record<BrailleDuration, string>> = (() => {
  const rev: Partial<Record<BrailleDuration, string>> = {};
  for (const [char, info] of Object.entries(REST_MAP)) {
    const durKey = info.duration as BrailleDuration;
    if (rev[durKey] === undefined) rev[durKey] = char;
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
    if (rev[acc] === undefined) rev[acc] = char; // prioriza a cela mais simples encontrada primeiro
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

// ─── GRAU 5: "EM ACORDE TOTAL/PARCIAL" (múltiplas vozes sobrepostas) ─────────
//
// ⚠️ NOTA DE PRECISÃO MUSICOGRÁFICA: os glifos abaixo são um MAPEAMENTO
// ESTRUTURAL DE TRABALHO para os delimitadores de "Em Acorde Total" (duas
// vozes com ritmo idêntico e sobreposição completa) e "Em Acorde Parcial"
// (sobreposição rítmica parcial) do Grau 5 do MIMB. A ESTRUTURA de detecção,
// agrupamento e delimitação está implementada e funcional; os CÓDIGOS DE
// PONTOS EXATOS abaixo devem ser validados contra o Manual Internacional de
// Musicografia Braille (Parte 2, Capítulo sobre notação polifônica) antes de
// uso em produção — notação de múltiplas vozes tem variação regional/editorial
// e não deve ser afirmada aqui com falsa certeza absoluta.
const IN_CHORD_TOTAL_START   = '\u2807\u2807'; // ⠇⠇ (placeholder estrutural — validar MIMB Parte 2)
const IN_CHORD_TOTAL_END     = '\u2807\u2807\u2804'; // placeholder — validar
const IN_CHORD_PARTIAL_START = '\u2807\u2803'; // placeholder — validar
const IN_CHORD_PARTIAL_END   = '\u2807\u2803\u2804'; // placeholder — validar

// ─── UTILITÁRIOS DE CONVERSÃO DE DURAÇÃO (MusicXML ↔ Braille) ────────────────

/** Nome do <type> do MusicXML → nossa Duration travada por linha (Grau 2). */
const MUSICXML_TYPE_TO_DURATION: Record<string, BrailleDuration> = {
  'whole':       'w',
  '16th':        '16',
  'half':        'h',
  'quarter':     'q',
  'eighth':      '8',
  // Tipos sem correspondência exata no nosso sistema travado (32nd, 64th, etc.)
  // são aproximados para a categoria mais próxima suportada, com aviso.
  '32nd':        '16',
  '64th':        '16',
  '128th':       '16',
};

/** Nossa Duration → nome <type> do MusicXML (direção inversa, para export). */
const DURATION_TO_MUSICXML_TYPE: Record<BrailleDuration, string> = {
  w:    'whole',
  h:    'half',
  q:    'quarter',
  '8':  'eighth',
  '16': '16th',
};

/** Pulsos (semínima=1) de cada Duration — para cálculo de divisions/ticks. */
const BRAILLE_DURATION_PULSES: Record<BrailleDuration, number> = {
  w: 4, h: 2, q: 1, '8': 0.5, '16': 0.25,
};

// ─── DETECÇÃO DE OMISSÃO DE OITAVA (ROUNDTRIP-SAFE) ──────────────────────────
//
// Ao exportar de MusicXML→Braille, sabemos a oitava REAL de cada nota (dado
// absoluto do XML). Mas incluir um sinal de oitava explícito em TODA nota
// produziria um Braille verboso e não-idiomático — um transcritor humano só
// escreve o sinal quando a Regra de Uso das Oitavas (Grau 3, Dissertação
// Vanazzi Cap. 3) o exige. Esta função decide, de forma roundtrip-segura, se
// o sinal pode ser OMITIDO: simula o que inferOctave() reconstruiria sem o
// sinal e só omite se o resultado bater com a oitava real.
function shouldEmitOctaveMarker(
  prevPitch:  NoteName | null,
  prevOctave: number,
  pitch:      NoteName,
  octave:     number,
): boolean {
  if (prevPitch === null) return true; // primeira nota do documento sempre explícita
  const errors: string[] = [];
  const inferred = inferOctave(prevPitch, prevOctave, pitch, errors);
  return inferred !== octave; // só emite o sinal se a inferência automática erraria
}

// ─── IMPORTAÇÃO: MusicXML → TEXTO BRAILLE ────────────────────────────────────

export interface MusicXMLImportOptions {
  /** true = parte de piano com pauta dupla (staff 1=RH / staff 2=LH). */
  isPiano?: boolean;
  /** Nº de compassos por bloco antes de alternar de mão (padrão: 4). */
  measureAlternation?: number;
}

interface XmlNoteEvent {
  isRest:      boolean;
  isChord:     boolean;
  pitch?:      NoteName;
  octave?:     number;
  alterSemis?: number; // -2..+2 (bemol dobrado .. sustenido dobrado)
  durationTicks: number;
  typeName?:   string; // <type> textual, se presente
  dotted:      boolean;
  voice:       string;
  staff:       number; // 1 = RH/superior, 2 = LH/inferior (default 1)
  tieStart:    boolean;
  tieStop:     boolean;
  slurStart:   boolean;
  slurStop:    boolean;
  measureIdx:  number;
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

/**
 * Importa uma string MusicXML (<score-partwise>) e retorna o texto Braille
 * musical equivalente, pronto para ser inserido no editor.
 *
 * @param xmlString — Conteúdo MusicXML bruto (arquivo .xml/.musicxml)
 * @param options   — isPiano (pauta dupla) e measureAlternation (compassos por bloco)
 */
export function importMusicXML(
  xmlString: string,
  options: MusicXMLImportOptions = {},
): string {
  const isPiano            = !!options.isPiano;
  const measureAlternation = options.measureAlternation ?? 4;

  const doc = new DOMParser().parseFromString(xmlString, 'application/xml');

  const parserError = doc.querySelector('parsererror');
  if (parserError) {
    throw new Error(`[importMusicXML] XML malformado: ${parserError.textContent ?? 'erro desconhecido'}`);
  }

  if (doc.querySelector('score-timewise')) {
    throw new Error(
      '[importMusicXML] Formato <score-timewise> não é suportado. ' +
      'Reexporte o arquivo como <score-partwise> (padrão de Finale/MuseScore/Sibelius).'
    );
  }

  const scoreRoot = doc.querySelector('score-partwise');
  if (!scoreRoot) {
    throw new Error('[importMusicXML] Elemento <score-partwise> não encontrado no XML fornecido.');
  }

  const parts = Array.from(scoreRoot.querySelectorAll('part'));
  if (parts.length === 0) {
    throw new Error('[importMusicXML] Nenhum elemento <part> encontrado no MusicXML.');
  }

  // Para piano, assumimos UMA <part> contendo AMBAS as pautas via <staff>1/2</staff>
  // em cada <note>. Para instrumentos monofônicos, usamos a primeira <part>.
  const part = parts[0];
  const measureNodes = Array.from(part.querySelectorAll('measure'));

  let divisions = 1; // divisions por semínima — lido de <attributes><divisions>
  let currentFifths: number | null = null;
  let currentTimeNum = 4;
  let currentTimeDen = 4;
  let currentClefSign = 'G'; // G=treble, F=bass

  // Eventos de nota por compasso, já separados por staff (1=RH, 2=LH)
  const measureEventsRH: XmlNoteEvent[][] = [];
  const measureEventsLH: XmlNoteEvent[][] = [];
  const measureHeaderInfo: Array<{
    fifthsChanged: boolean; fifths: number;
    timeChanged: boolean; timeNum: number; timeDen: number;
    clefChanged: boolean; clefSign: string;
    /** true quando o compasso traz metrical="no"/implicit="no" (anacruse
     *  sinalizada explicitamente pelo XML) — tratamento simétrico ao export,
     *  que injeta esses mesmos atributos no primeiro compasso incompleto. */
    isExplicitAnacrusis: boolean;
  }> = [];

  measureNodes.forEach((measureEl, measureIdx) => {
    const eventsRH: XmlNoteEvent[] = [];

    // ── Leitura simétrica de metrical/implicit (anacruse explícita) ─────────
    // exportToMusicXML() injeta implicit="no" metrical="no" no primeiro
    // compasso incompleto. Na importação, lemos esses mesmos atributos para
    // reconhecer explicitamente a anacruse vinda de Finale/MuseScore/Sibelius,
    // em vez de depender apenas da contagem de pulsos (que já funciona como
    // fallback, mas a leitura explícita é mais robusta e simétrica).
    const metricalAttr = measureEl.getAttribute('metrical');
    const implicitAttr = measureEl.getAttribute('implicit');
    const isExplicitAnacrusis = metricalAttr === 'no' || implicitAttr === 'no';
    const eventsLH: XmlNoteEvent[] = [];

    let fifthsChanged = false, timeChanged = false, clefChanged = false;

    // <attributes> pode aparecer em qualquer compasso, não só no primeiro
    const attributesEl = measureEl.querySelector('attributes');
    if (attributesEl) {
      const divisionsEl = attributesEl.querySelector('divisions');
      if (divisionsEl?.textContent) divisions = parseInt(divisionsEl.textContent, 10) || divisions;

      const fifthsEl = attributesEl.querySelector('key fifths');
      if (fifthsEl?.textContent) {
        const f = parseInt(fifthsEl.textContent, 10);
        if (f !== currentFifths) { currentFifths = f; fifthsChanged = true; }
      }

      const beatsEl     = attributesEl.querySelector('time beats');
      const beatTypeEl  = attributesEl.querySelector('time beat-type');
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

    // Percorrer <note> na ordem do documento
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

  // ── Converter uma sequência de eventos de UM compasso em texto Braille ────
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
          : '16'; // fallback conservador
        const glyph = REVERSE_REST_MAP[durKey];
        if (glyph) out += glyph;
        i++;
        continue;
      }

      // Ligadura de duração / expressão vinda da nota ANTERIOR (mesma sequência)
      // já foi emitida no fechamento do laço anterior — aqui tratamos apenas
      // a emissão da nota atual e o sinal de abertura, se aplicável.

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

      // ── Acordes: notas subsequentes com <chord/> viram intervalos (Grau 4) ──
      // BLINDAGEM: cada nota do acorde carrega seu PRÓPRIO estado de tie/slur
      // (uma voz interna do acorde pode ligar independentemente da voz base).
      // Emitir o ⠉ de cada nota de intervalo IMEDIATAMENTE após seu próprio
      // glifo evita tanto a perda silenciosa dessa informação (nota "fantasma"
      // sem ligadura representada) quanto qualquer duplicação — cada evento
      // emite exatamente um ⠉ no ponto exato em que ocorre, nunca mais de uma vez.
      let j = i + 1;
      while (j < events.length && events[j].isChord) {
        const chordEv = events[j];
        const baseIdx  = PITCH_ORDER_INFER.indexOf(ev.pitch!);
        const chordIdx = PITCH_ORDER_INFER.indexOf(chordEv.pitch!);
        const octaveDiff = (chordEv.octave! - ev.octave!) * 7;
        const rawInterval = (chordIdx - baseIdx) + octaveDiff;
        const intervalSize = Math.abs(rawInterval) + 1; // 1-based (uníssono=1, 3ª=3, etc.)
        const intervalGlyph = REVERSE_INTERVAL_MAP[intervalSize];
        if (intervalGlyph) out += intervalGlyph;

        const chordAcc = chordEv.alterSemis !== undefined ? alterToAccidental(chordEv.alterSemis) : undefined;
        if (chordAcc && REVERSE_ACCIDENTAL_MAP[chordAcc]) out += REVERSE_ACCIDENTAL_MAP[chordAcc];

        // Ligadura própria desta nota do acorde (independente da nota-base)
        if (chordEv.tieStart || chordEv.slurStart) {
          out += SLUR_SIMPLE;
        }

        j++;
      }

      // ── Ligadura: tie/slur "start" na nota-BASE → emitir ⠉ após a nota atual ──
      // (emitido aqui, depois do acorde, para preservar a ordem de leitura
      // Braille: nota-base → intervalos → ligadura da nota-base, se houver)
      if (ev.tieStart || ev.slurStart) {
        out += SLUR_SIMPLE; // '⠉' — "Ligadura de Duração" (mesma altura) ou expressão
      }

      i = j;
    }

    return out;
  }

  // ── Detectar vozes sobrepostas na mesma pauta (Grau 5 — estrutural) ───────
  function detectOverlappingVoices(events: XmlNoteEvent[]): boolean {
    const byVoice = new Map<string, XmlNoteEvent[]>();
    for (const ev of events) {
      if (!byVoice.has(ev.voice)) byVoice.set(ev.voice, []);
      byVoice.get(ev.voice)!.push(ev);
    }
    return byVoice.size > 1;
  }

  // ── Montar o texto final, com alternância de mãos se isPiano ──────────────
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
      // Fórmula de compasso sempre explícita no primeiro compasso
      header += `${NUMBER_SIGN}${numberToBrailleDigits(info.timeNum)}${AUGMENTATION_DOT}${numberToBrailleDigits(info.timeDen)}`;

      // Tratamento simétrico da anacruse: quando o XML sinaliza explicitamente
      // metrical="no"/implicit="no" no primeiro compasso, confirmamos que
      // NENHUM preenchimento de silêncio é injetado — o compasso é transcrito
      // com exatamente os pulsos presentes, deixando-o naturalmente mais curto
      // que a fórmula de compasso ativa (comportamento idêntico ao caso em
      // que a anacruse é detectada apenas por contagem de pulsos, sem o
      // atributo explícito — aqui apenas confirmamos/documentamos a intenção).
      // isExplicitAnacrusis fica disponível em measureHeaderInfo para quem
      // consumir importMusicXML precisar diferenciar anacruse explícita
      // (vinda do atributo XML) de anacruse inferida por contagem de pulsos.
      // Nenhum log é emitido aqui — este arquivo é mantido livre de
      // dependências de ambiente (sem 'process', sem Node) por design,
      // já que é um módulo de parsing portátil e independente de runtime.
    }
    return header;
  }

  if (!isPiano) {
    for (let m = 0; m < measureNodes.length; m++) {
      result += emitHeaderIfChanged(m);
      const hasOverlap = detectOverlappingVoices(measureEventsRH[m]);
      if (hasOverlap) result += IN_CHORD_PARTIAL_START;
      result += eventsToMeasureBraille(measureEventsRH[m], lastNoteRH);
      if (hasOverlap) result += IN_CHORD_PARTIAL_END;
      if (m < measureNodes.length - 1) result += ' ';
    }
    return result.trim();
  }

  // Piano: alternar blocos de measureAlternation compassos entre RH e LH
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

  return result.trim();
}

/** Converte um número inteiro (1-9) para o dígito Braille correspondente (⠼ + letra-número). */
function numberToBrailleDigits(n: number): string {
  const digitGlyphs: Record<string, string> = {
    '1': '\u2801', '2': '\u2803', '3': '\u2809', '4': '\u2819', '5': '\u2811',
    '6': '\u280B', '7': '\u281B', '8': '\u2813', '9': '\u280A', '0': '\u281A',
  };
  return String(n).split('').map(d => digitGlyphs[d] ?? '').join('');
}

// ─── EXPORTAÇÃO: TEXTO BRAILLE → MusicXML ────────────────────────────────────

function xmlEscape(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Exporta um array de ParsedElement já processado (vindo de parseBrailleMusic
 * ou do estado parsedElements do editor) para uma string MusicXML válida
 * (<score-partwise version="4.0">), compatível com Finale/MuseScore/Sibelius.
 *
 * @param elements — Array de ParsedElement já parseado (ex: parsedElements do BrailleEditor)
 */
export function exportToMusicXML(elements: ParsedElement[]): string {
  // Agrupar elements em compassos, delimitados por 'barline'
  const measures: ParsedElement[][] = [];
  let currentMeasure: ParsedElement[] = [];
  for (const el of elements) {
    currentMeasure.push(el);
    if (el.type === 'barline') {
      measures.push(currentMeasure);
      currentMeasure = [];
    }
  }
  if (currentMeasure.length > 0) measures.push(currentMeasure);

  const DIVISIONS = 256; // divisions por semínima — granularidade alta o suficiente

  let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
  xml += '<!DOCTYPE score-partwise PUBLIC "-//Recordare//DTD MusicXML 4.0 Partwise//EN" '
       + '"http://www.musicxml.org/dtds/partwise.dtd">\n';
  xml += '<score-partwise version="4.0">\n';
  xml += '  <part-list>\n';
  xml += '    <score-part id="P1">\n';
  xml += '      <part-name>Five Steps Braille</part-name>\n';
  xml += '    </score-part>\n';
  xml += '  </part-list>\n';
  xml += '  <part id="P1">\n';

  let lastFifths: number | null = null;
  let lastTimeNum: number | null = null;
  let lastTimeDen: number | null = null;
  let lastClef: 'treble' | 'bass' | null = null;
  let openTieByKey = new Map<string, boolean>(); // "pitch/octave" → tie ainda aberta

  measures.forEach((measureEls, measureIdx) => {
    const notesAndRests = measureEls.filter(e => e.type === 'note' || e.type === 'rest');

    // Duração total do compasso em pulsos (semínima=1) — usada para detectar anacruse
    const totalPulses = notesAndRests.reduce((acc, el) => {
      const dur    = (el as any).duration as string ?? 'q';
      const dotted = (el as any).dotted   as boolean ?? false;
      const dotted2= (el as any).dotted2  as boolean ?? false;
      const base   = BRAILLE_DURATION_PULSES[dur as BrailleDuration] ?? 1;
      return acc + base * (dotted2 ? 1.75 : dotted ? 1.5 : 1);
    }, 0);

    const ks = measureEls.find(e => e.type === 'keysignature') as ParsedKeySignature | undefined;
    const ts = measureEls.find(e => e.type === 'timesignature') as any | undefined;
    const clefEl = measureEls.find(e => e.type === 'clef' || e.type === 'hand') as any | undefined;

    const timeNum = ts?.numerator   ?? lastTimeNum ?? 4;
    const timeDen = ts?.denominator ?? lastTimeDen ?? 4;
    const fullMeasurePulses = timeNum * (4 / timeDen);
    const isAnacrusis = measureIdx === 0 && totalPulses > 0 && totalPulses < fullMeasurePulses - 0.001;

    xml += `    <measure number="${measureIdx + 1}"${isAnacrusis ? ' implicit="no" metrical="no"' : ''}>\n`;

    const needsAttributes =
      measureIdx === 0 ||
      (ks && ks.fifths !== lastFifths) ||
      (ts && (timeNum !== lastTimeNum || timeDen !== lastTimeDen)) ||
      (clefEl && (clefEl.clefType === 'bass' ? 'bass' : 'treble') !== lastClef);

    if (needsAttributes) {
      xml += '      <attributes>\n';
      xml += `        <divisions>${DIVISIONS}</divisions>\n`;
      const fifthsVal = ks?.fifths ?? lastFifths ?? 0;
      xml += `        <key><fifths>${fifthsVal}</fifths></key>\n`;
      xml += `        <time><beats>${timeNum}</beats><beat-type>${timeDen}</beat-type></time>\n`;
      const clefType = clefEl?.clefType === 'bass' ? 'bass' : 'treble';
      xml += clefType === 'bass'
        ? '        <clef><sign>F</sign><line>4</line></clef>\n'
        : '        <clef><sign>G</sign><line>2</line></clef>\n';
      xml += '      </attributes>\n';
      lastFifths = fifthsVal; lastTimeNum = timeNum; lastTimeDen = timeDen; lastClef = clefType;
    }

    for (const el of notesAndRests) {
      if (el.type === 'rest') {
        const rest = el as ParsedRest;
        const pulses = BRAILLE_DURATION_PULSES[rest.duration as BrailleDuration] ?? 1;
        const ticks  = Math.round(pulses * DIVISIONS);
        xml += '      <note>\n';
        xml += '        <rest/>\n';
        xml += `        <duration>${ticks}</duration>\n`;
        xml += `        <type>${DURATION_TO_MUSICXML_TYPE[rest.duration as BrailleDuration] ?? 'quarter'}</type>\n`;
        if (rest.dotted) xml += '        <dot/>\n';
        xml += '      </note>\n';
        continue;
      }

      const note = el as ParsedNote;
      const pulses = BRAILLE_DURATION_PULSES[note.duration as BrailleDuration] ?? 1;
      const ticks  = Math.round(pulses * DIVISIONS * (note.dotted2 ? 1.75 : note.dotted ? 1.5 : 1));
      const noteKey = `${note.pitch}/${note.octave}`;

      xml += '      <note>\n';
      xml += '        <pitch>\n';
      xml += `          <step>${note.pitch}</step>\n`;
      if (note.accidental) {
        const alterMap: Record<Accidental, number> = {
          sharp: 1, flat: -1, natural: 0, 'double-sharp': 2, 'double-flat': -2,
        };
        xml += `          <alter>${alterMap[note.accidental]}</alter>\n`;
      }
      xml += `          <octave>${note.octave}</octave>\n`;
      xml += '        </pitch>\n';
      xml += `        <duration>${ticks}</duration>\n`;
      xml += `        <type>${DURATION_TO_MUSICXML_TYPE[note.duration as BrailleDuration] ?? 'quarter'}</type>\n`;
      if (note.dotted)  xml += '        <dot/>\n';
      if (note.dotted2) xml += '        <dot/>\n        <dot/>\n';
      if (note.accidental) {
        const accNameMap: Record<Accidental, string> = {
          sharp: 'sharp', flat: 'flat', natural: 'natural',
          'double-sharp': 'double-sharp', 'double-flat': 'flat-flat',
        };
        xml += `        <accidental>${accNameMap[note.accidental]}</accidental>\n`;
      }

      const tieStart = note.tieRole === 'start';
      const tieStop  = note.tieRole === 'end';
      if (tieStart) { xml += '        <tie type="start"/>\n'; openTieByKey.set(noteKey, true); }
      if (tieStop)  { xml += '        <tie type="stop"/>\n';  openTieByKey.delete(noteKey); }

      const hasSlur = note.slurRole !== undefined;
      if (hasSlur || tieStart || tieStop) {
        xml += '        <notations>\n';
        if (tieStart) xml += '          <tied type="start"/>\n';
        if (tieStop)  xml += '          <tied type="stop"/>\n';
        if (note.slurRole === 'start') xml += '          <slur type="start" number="1"/>\n';
        if (note.slurRole === 'end')   xml += '          <slur type="stop" number="1"/>\n';
        xml += '        </notations>\n';
      }

      xml += '      </note>\n';
    }

    xml += '    </measure>\n';
  });

  xml += '  </part>\n';
  xml += '</score-partwise>\n';

  return xml;
}

/**
 * Conveniência: exporta diretamente a partir do texto Braille bruto,
 * parseando internamente antes de chamar exportToMusicXML(elements).
 * Use esta função quando você só tem a string do editor, não o array
 * de ParsedElement já processado.
 *
 * @param brailleText — Conteúdo bruto do editor (texto Braille musical)
 */
export function exportBrailleTextToMusicXML(brailleText: string): string {
  const { elements } = parseBrailleMusic(brailleText);
  return exportToMusicXML(elements);
}

// ═══════════════════════════════════════════════════════════════════════════
// MOTOR DE VALIDAÇÃO RÍTMICA — detectMeasureErrors
// ═══════════════════════════════════════════════════════════════════════════
//
// Analisa um documento já parseado e verifica se a soma de pulsos de cada
// compasso corresponde exatamente à fórmula de compasso ativa. Roda
// inteiramente no cliente — latência zero, sem chamada ao servidor — já que
// a regra "soma de pulsos == fórmula de compasso" é teoria musical básica e
// pública, sem relação com as heurísticas proprietárias de transcrição.
//
// NOTA DE ARQUITETURA: ParsedRest não carrega measureIndex próprio (só
// ParsedNote e ParsedBarline carregam). Para não alterar parseBrailleMusic
// (função mestre, fora do escopo desta tarefa), o agrupamento por compasso
// aqui é feito por INFERÊNCIA CONTEXTUAL: cada elemento herda o measureIndex
// do último 'note' ou 'barline' visto antes dele no documento — como pausas
// sempre aparecem entre uma nota/barline e a próxima, essa inferência é
// exata na prática, sem precisar tocar no parser mestre.

/**
 * Agrupa elementos (note/rest/interval) por measureIndex, inferindo o índice
 * de compasso de pausas via contexto (última nota/barline vista), já que
 * ParsedRest não carrega measureIndex próprio.
 */
function groupElementsByMeasureIndex(
  elements: ParsedElement[],
): Map<number, ParsedElement[]> {
  const buckets = new Map<number, ParsedElement[]>();
  let currentMeasureIdx = 0;

  for (const el of elements) {
    if (el.type === 'note' || el.type === 'barline') {
      const idx = (el as any).measureIndex as number | undefined;
      if (idx !== undefined) currentMeasureIdx = idx;
    }

    if (el.type === 'note' || el.type === 'rest') {
      if (!buckets.has(currentMeasureIdx)) buckets.set(currentMeasureIdx, []);
      buckets.get(currentMeasureIdx)!.push(el);
    }
  }

  return buckets;
}

/**
 * Fator de compressão rítmica de quiálteras (tercinas e famílias correlatas).
 *
 * ⚠️ NOTA DE PRECISÃO: sem um marcador explícito de FIM de quiáltera no
 * modelo atual do parser (ParsedQuialtera não delimita quantas notas afeta),
 * adotamos a convenção de que o número já presente no próprio nome do
 * marcador ('quialtera-3' → 3) indica quantas notas/pausas IMEDIATAMENTE
 * seguintes são compression. O fator de compressão padrão (N notas no
 * tempo da potência de 2 mais próxima abaixo de N) cobre corretamente o
 * caso mais comum (tercina, quialtera-3 → 3 notas no tempo de 2 → fator
 * 2/3). Para duplas/quínteis (quialtera-2/quialtera-5), a convenção pode
 * variar conforme o compasso simples/composto — este é um valor de
 * trabalho documentado, não uma afirmação musicográfica definitiva.
 */
const QUIALTERA_COMPRESSION_FACTOR: Record<string, number> = {
  'quialtera-2': 3 / 2, // dupla: 2 notas no tempo de 3 (comum em compasso composto)
  'quialtera-3': 2 / 3, // tercina: 3 notas no tempo de 2
  'quialtera-4': 3 / 4, // quatro notas no tempo de 3
  'quialtera-5': 4 / 5, // quíntupla: 5 notas no tempo de 4
};

/** Extrai quantas notas um marcador de quiáltera afeta, a partir do próprio nome. */
function quialteraNoteCount(name: string): number {
  const match = name.match(/quialtera-(\d+)/);
  return match ? parseInt(match[1], 10) : 0;
}

/**
 * Calcula a soma de pulsos (semínima = 1.0) de um compasso, aplicando pontos
 * de aumento (dotted ×1.5, dotted2 ×1.75) e compressão de quiálteras quando
 * presentes na sequência original de tokens do compasso.
 *
 * @param measureElements — elementos (note/rest) já filtrados para este compasso
 * @param rawMeasureTokens — sequência ORIGINAL de elementos do documento inteiro,
 *                           usada para localizar marcadores 'quialtera' que
 *                           precedem as notas deste compasso especificamente
 */
function sumMeasurePulses(
  measureElements: ParsedElement[],
  allElements:     ParsedElement[],
): number {
  // Mapear quais sourceIndex estão sob compressão de quiáltera, escaneando
  // o documento completo uma única vez (fora do loop de compassos, mas
  // reconstruído aqui por simplicidade/isolamento desta função pura).
  const compressedSourceIndexes = new Map<number, number>(); // sourceIndex → fator

  for (let i = 0; i < allElements.length; i++) {
    const el = allElements[i];
    if (el.type !== 'quialtera') continue;
    const factor = QUIALTERA_COMPRESSION_FACTOR[(el as any).name] ?? 1;
    const noteCount = quialteraNoteCount((el as any).name);
    let consumed = 0;
    for (let j = i + 1; j < allElements.length && consumed < noteCount; j++) {
      const nxt = allElements[j];
      if (nxt.type === 'note' || nxt.type === 'rest') {
        compressedSourceIndexes.set((nxt as any).sourceIndex, factor);
        consumed++;
      }
    }
  }

  let totalPulses = 0;

  for (const el of measureElements) {
    const duration = (el as any).duration as Duration;
    const dotted   = (el as any).dotted  as boolean ?? false;
    const dotted2  = (el as any).dotted2 as boolean ?? false;
    const sourceIdx = (el as any).sourceIndex as number;

    const basePulses = BRAILLE_DURATION_PULSES[duration as BrailleDuration] ?? 1;
    const dotMultiplier = dotted2 ? 1.75 : dotted ? 1.5 : 1;
    const tupletFactor = compressedSourceIndexes.get(sourceIdx) ?? 1;

    totalPulses += basePulses * dotMultiplier * tupletFactor;
  }

  return totalPulses;
}

/**
 * Analisa o array de elementos parseados e detecta compassos rítmicamente
 * incompletos ou excedentes em relação à fórmula de compasso ativa.
 *
 * Roda inteiramente no cliente (latência zero) — reaproveita BRAILLE_DURATION_PULSES
 * (semínima=1, mínima=2, colcheia=0.5, semibreve=4) já usado pelo módulo de
 * exportação MusicXML, sem duplicar tabelas.
 *
 * @param elements        — ParsedElement[] já processado por parseBrailleMusic
 * @param beatsPerMeasure — pulsos esperados por compasso (numerador × 4/denominador
 *                          da fórmula de compasso ativa)
 * @returns                 array de avisos em português plano, ex:
 *                          "Erro: compasso 2 incompleto, faltam 0.5 pulsos"
 */
export function detectMeasureErrors(
  elements:        ParsedElement[],
  beatsPerMeasure: number,
): string[] {
  const errors: string[] = [];
  const buckets = groupElementsByMeasureIndex(elements);

  const sortedIndexes = Array.from(buckets.keys()).sort((a, b) => a - b);

  for (const measureIdx of sortedIndexes) {
    const measureElements = buckets.get(measureIdx)!;
    const totalPulses = sumMeasurePulses(measureElements, elements);

    // Tolerância de ponto flutuante — evita falsos positivos por arredondamento
    const EPSILON = 0.001;
    const diff = totalPulses - beatsPerMeasure;

    const displayMeasureNumber = measureIdx + 1; // numeração 1-based para o usuário

    if (diff > EPSILON) {
      errors.push(
        `Erro: compasso ${displayMeasureNumber} excede a fórmula de compasso em ${diff.toFixed(2)} pulsos`
      );
    } else if (diff < -EPSILON) {
      const missing = Math.abs(diff);
      if (measureIdx === 0) {
        // Primeiro compasso global: incompletude é esperada (anacruse) —
        // aviso suave, não erro crítico.
        errors.push(`Compasso 1 incompleto — provável anacruse`);
      } else {
        errors.push(
          `Erro: compasso ${displayMeasureNumber} incompleto, faltam ${missing.toFixed(2)} pulsos`
        );
      }
    }
  }

  return errors;
}
