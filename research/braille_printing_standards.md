# Padrões de Impressão Braille - Pesquisa

## Formato BRF (Braille Ready Format)
- Arquivo de texto simples representando páginas braille finalizadas
- Usa ASCII para representar símbolos braille (Computer Braille Code)
- Caracteres de controle: espaço, CR (Carriage Return), LF (Line Feed), FF (Form Feed = quebra de página)
- Padrão: 25 linhas por página, até 39 caracteres por linha
- 63 combinações únicas de pontos + espaço (64 total)
- Cada combinação é mapeada para um caractere ASCII

## Padrões de Página por Tamanho de Papel

### Padrão BANA (EUA) - 11½" × 11" (formulário contínuo)
- **40 células por linha**
- **25 linhas por página**
- Espaçamento simples
- Papel padrão para impressoras tractor-feed

### A4 (210mm × 297mm) - Padrão Internacional/Brasil
- **29-32 células por linha** (varia por impressora)
- **27-29 linhas por página**
- Fonte: UKAAF e AccessiblePrints Australia (~30 células × 27 linhas)

### Padrão UK (UKAAF)
- UK usa frequentemente **30 ou 40 células** por 25 linhas
- EUA usa 30 ou 40 células por 25 linhas

### Index Braille Basic-D V5 (configurações de fábrica)
- Suporta A4 e formulário contínuo (tractor feed)
- Configurável: células por linha e linhas por página
- Layouts personalizáveis (1-9 layouts)

### Brasil - Normas Técnicas
- Impressoras mecânicas: 25 linhas × 42 células (papel A4/formulário)
- Reglete 9 linhas (para escrita manual)
- Papel braille: 120g/m² (mais grosso que papel comum 80g/m²)

## Tabela Resumo de Formatos

| Formato | Células/Linha | Linhas/Página | Papel |
|---------|--------------|---------------|-------|
| BANA (EUA padrão) | 40 | 25 | 11½" × 11" |
| A4 Internacional | 29-32 | 27-29 | A4 (210×297mm) |
| A4 Brasil (impressora) | 40-42 | 25 | A4 |
| Letter (EUA) | 34-38 | 25 | 8½" × 11" |
| Formulário contínuo | 40-42 | 25 | 11½" × 11" |
| Braille Fácil (Brasil) | 40 | 25 | Formulário contínuo |

## Mapeamento ASCII ↔ Braille (Computer Braille Code)
- Espaço = espaço (sem pontos)
- A-Z maiúsculas e minúsculas mapeadas para combinações de pontos
- Números precedidos por indicador numérico
- Pontuação mapeada para caracteres ASCII específicos
