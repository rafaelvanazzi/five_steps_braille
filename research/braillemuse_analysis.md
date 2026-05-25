# Análise do BrailleMuse

## Visão Geral
- **Nome:** BrailleMUSE v5.64pp20210922pre
- **Função:** Sistema de Tradução de MusicXML para Partitura Braille
- **Origem:** Universidade Nacional de Yokohama, Laboratório Gotoh (2005)
- **URL:** https://braillemuse.net/BrailleMUSEpre/ptbr/Input-e-b.jsp

## Fluxo de Trabalho
1. Preparar arquivo MusicXML no computador
2. Selecionar o arquivo MusicXML (máximo 38 MB)
3. Pressionar "Executar"
4. O sistema traduz para partitura Braille

## Opções de Configuração

### Formato de Página
- **Compassos por Linha:** 1, 2, 3, 4, 5, 6
- **Linhas por Página:** 18, 22, 25, 27, 30, 40
- **Células por Linha:** 32, 34, 38, 40, 60

### Notação Musical
- **Seleção da Descrição do Acorde:** Internacional / Japonês
- **Descrição dos Grupos Rítmicos:** Não utilizar / Utilizar
- **Em Acorde Parcial:** Não utilizar / Utilizar (alguns) / Utilizar (mais) / Utilizar (quando possível)
- **Marca de Pausa Anexada para Processamento de Em Acorde:** Não utilizar / Utilizar
- **Quinto Suplemento - Símbolos de Alteração:** Não utilizar / Anexar com marcação / Utilizar
- **Repetição na Melodia:** Não procurar / Procurar no compasso / Procurar entre compassos
- **Anexar Número do Compasso:** Nenhum / A partir de "1" / "0" / "1" com sinal / "0" com sinal
- **Abreviação para Repetidas Articulações:** Não utilizar / Utilizar
- **Ligadura de Expressão:** Não utilizar / Utilizar
- **Indicação Dinâmica:** Não utilizar / Utilizar
- **Marca de Pedal:** Não utilizar / Utilizar
- **Ornamento:** Não utilizar / Utilizar
- **Marca de Expressão:** Não utilizar / Utilizar

### Formato de Saída
- **Formato:** Seção por seção / Seção por seção (abreviar compasso sem nota) / Parte por Parte / Selecionar Parte
- **Impressão do Número da Página e Linha da Partitura Original no Cabeçalho:** Não utilizar / Utilizar
- **Transcrição de Tom:** Especificar Escala Diferencial Cromática
- **Ordem das Notas em um Acorde:** Padrão (dependendo da clave) / Grave para agudo / Agudo para grave

## Insights para o Editor 5Steps
1. O BrailleMuse é um **tradutor automático** (MusicXML → Braille), não um editor interativo
2. Oferece muitas opções de personalização da tradução
3. Permite controlar o nível de detalhamento (básico vs completo) via toggles individuais
4. O formato de página (linhas/células) é configurável para diferentes impressoras
5. Suporta formatos de saída diferentes (seção por seção, parte por parte)
