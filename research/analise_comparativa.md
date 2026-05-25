# Análise Comparativa: BrailleMuse vs SMB Online vs Editor 5Steps

## Resumo dos Sistemas Analisados

| Aspecto | BrailleMuse | SMB Online | Editor 5Steps (atual) |
|---------|-------------|------------|----------------------|
| Tipo | Tradutor automático | Tradutor automático | Editor interativo |
| Entrada | MusicXML | MusicXML | Teclado Perkins + MusicXML |
| Saída | Braille (visualização) | .brf, .txt | Visualização + edição |
| Edição | Não | Não (apenas visualiza resultado) | Sim (edição em tempo real) |
| Renderização visual | Não | Não | Sim (VexFlow) |
| Interação bidirecional | Não | Não | Sim (partitura → braille) |

## Diferencial do Editor 5Steps

O grande diferencial do Editor 5Steps em relação ao BrailleMuse e SMB Online é que ele é um **editor interativo**, não apenas um tradutor. Enquanto os outros sistemas convertem MusicXML para Braille de forma unidirecional (sem possibilidade de edição), o 5Steps permite que o transcritor:

1. Escreva diretamente em Braille usando teclado Perkins virtual
2. Veja a renderização em partitura convencional em tempo real
3. Clique na partitura para navegar no texto Braille
4. Edite e corrija a transcrição manualmente

## Recomendações para Importação MusicXML

### Modo Básico (prioridade)
Elementos a converter do MusicXML para Braille:

| Elemento MusicXML | Sinal Braille | Prioridade |
|-------------------|---------------|------------|
| `<time>` (fórmula de compasso) | Sinais numéricos Braille | Alta |
| `<key>` (armadura de clave) | Sinais de armadura | Alta |
| `<note>` (notas com pitch e duration) | Notas Braille (C-B, durações) | Alta |
| `<accidental>` (alterações) | ⠩ (sustenido), ⠣ (bemol), ⠡ (bequadrado) | Alta |
| Oitavas (baseado no pitch) | Sinais de oitava (1-7) | Alta |
| `<tie>` e `<slur>` (ligaduras) | ⠈⠉ (ligadura) | Alta |
| `<barline>` (barras) | Espaço, dupla final, ritornelo | Alta |
| Tuplets/tercinas | Sinal de tercina | Alta |

### Modo Completo (futuro)
Adiciona ao modo básico:

| Elemento MusicXML | Sinal Braille | Prioridade |
|-------------------|---------------|------------|
| `<dynamics>` (dinâmicas) | Sinais de dinâmica | Média |
| `<articulations>` (staccato, etc.) | Sinais de articulação | Média |
| `<ornaments>` (trinado, etc.) | Sinais de ornamento | Média |
| `<direction>` (expressão) | Sinais de expressão | Baixa |
| `<pedal>` (pedal) | Sinais de pedal | Baixa |
| Repetições | Sinais de repetição | Média |
| Números de compasso | Números Braille | Baixa |

## Recomendações para Exportação BRF

### Configurações de Página (baseado no BrailleMuse)

| Parâmetro | Opções | Padrão recomendado |
|-----------|--------|-------------------|
| Células por linha | 32, 34, 38, 40, 60 | 40 |
| Linhas por página | 18, 22, 25, 27, 30, 40 | 25 |
| Compassos por linha | 1-6 | Automático |

### Formato BRF
O formato BRF (Braille Ready Format) é um arquivo de texto ASCII onde cada caractere representa uma cela Braille. As especificações são:

- Codificação ASCII com mapeamento North American Braille Computer Code
- Caracteres de controle: Form Feed (0x0C) para quebra de página
- Linhas terminadas com CR+LF
- Máximo de células por linha conforme configuração da impressora
- Sem cabeçalhos ou metadados (apenas conteúdo Braille)

## Plano de Implementação Sugerido

### Fase 1: Corrigir renderização VexFlow (concluído)
- Accidentals corrigidos
- Largura dinâmica dos compassos
- Scroll horizontal

### Fase 2: Importação MusicXML - Modo Básico
1. Parser de MusicXML (usando DOMParser no browser)
2. Converter elementos básicos para sequência de celas Braille
3. Inserir resultado no editor para edição manual
4. Opção de selecionar partes específicas

### Fase 3: Exportação BRF
1. Converter texto Braille Unicode para ASCII BRF
2. Configurações de página (células × linhas)
3. Quebras de linha automáticas respeitando limites de compasso
4. Download do arquivo .brf

### Fase 4: Melhorias futuras
1. Importação MusicXML - Modo Completo
2. Perfis de conversão salvos
3. Exportação MusicXML (braille → MusicXML)
