# Análise do SMB Online Music Braille Converter

## Visão Geral
- **Nome:** SMB Online Music Braille Converter (parte do Sao Mai Braille)
- **Origem:** Sao Mai Center for the Blind (SMCB), Vietnã
- **URL:** https://saomaicenter.org/en/smsoft/smb-online
- **Função:** Conversão de MusicXML para Braille musical

## Fluxo de Trabalho
1. Selecionar arquivo MusicXML (.musicxml, .XML, .mxl)
2. Selecionar partes a converter (todas ou específicas)
3. Escolher perfil musical (Solo with Accompaniment, Orchestra, Chamber)
4. Personalizar configurações de conversão (opcional)
5. Clicar "Translate into Braille"
6. Resultado aparece em campo editável
7. Download em formato .txt ou .brf

## Funcionalidades Principais
- Conversão MusicXML → Braille musical
- Seleção de partes individuais (1-6) ou range (ex: 1-3, 2,4,6)
- Perfis de música pré-configurados
- Configurações de conversão personalizáveis
- Download em .txt e .brf
- Perfis salvos para usuários "Transcriber Member"

## Limitações da Versão Online
- Máximo 2 MB por arquivo
- Apenas MusicXML puro (não mistura com texto literário)
- Menos opções no Score Info dialog
- Não analisa o MusicXML para dar opções específicas da partitura
- Sem edição de nomes de instrumentos, abreviações, etc.

## Diferenças vs Desktop
- Desktop: sem limite de tamanho
- Desktop: converte arquivos mistos (música + texto)
- Desktop: lembra preferências automaticamente
- Desktop: analisa MusicXML antes da conversão
- Desktop: mais opções de Score Info

## Insights para o Editor 5Steps

### Importação MusicXML - Modo Básico
Baseado no BrailleMuse e SMB, o modo básico deve incluir:
- Fórmula de compasso
- Armadura de clave
- Notas musicais com durações
- Alterações (sustenido, bemol, bequadrado)
- Sinais de oitava
- Ligaduras
- Barras (dupla final, ritornelo início/fim)
- Tercinas

### Importação MusicXML - Modo Completo
Adiciona ao modo básico:
- Indicações dinâmicas (p, f, mf, etc.)
- Marcas de pedal
- Ornamentos
- Marcas de expressão
- Articulações
- Repetições melódicas
- Números de compasso
- Grupos rítmicos
- Acordes parciais

### Formato de Exportação BRF
- Ambos os sistemas oferecem download em .brf e .txt
- BrailleMuse permite configurar: linhas por página, células por linha
- Configurações típicas de impressora: 25 linhas × 40 células, ou 30 × 32

### Recomendações para o 5Steps
1. Oferecer dois modos de importação (Básico e Completo) com toggles individuais
2. Permitir seleção de partes na importação
3. Exportação BRF com opções de formato de página (linhas × células)
4. Perfis de conversão salvos para reutilização
