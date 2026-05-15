# Editor de Musicografia Braille — TODO

## Fase 1: Estrutura Base
- [ ] Criar página `/editor-musicografia-braille` (rota protegida, requer login)
- [ ] Criar tabela `braille_projects` no banco (id, user_id, title, content_braille, content_text, created_at, updated_at)
- [ ] Criar tRPC procedure `editor.createProject` (novo projeto)
- [ ] Criar tRPC procedure `editor.listProjects` (listar projetos do usuário)
- [ ] Criar tRPC procedure `editor.getProject` (carregar projeto específico)
- [ ] Criar tRPC procedure `editor.updateProject` (salvar alterações)
- [ ] Criar tRPC procedure `editor.deleteProject` (deletar projeto)
- [ ] Layout da página: 3 painéis (entrada, braille grid, partitura)

## Fase 2: Input Handler Duplo + Parser Braille
- [ ] Implementar input handler para teclado padrão (A-Z, 0-9, símbolos)
- [ ] Implementar input handler para teclado Perkins (F, D, S, J, K, L = pontos 1-6)
- [ ] Criar parser de braille que converte celas em caracteres Unicode braille (U+2800-U+28FF)
- [ ] Criar mapeamento de símbolos braille → musicografia braille
- [ ] Sincronizar entrada em tempo real entre os dois modos

## Fase 3: Renderizadores
- [ ] Renderizador de Braille Grid (tabela visual com pontos ativos/inativos)
- [ ] Integrar Vexflow.js para renderização de partitura
- [ ] Criar 2 pautas (treble + bass) vazias
- [ ] Sincronizar renderização em tempo real com entrada

## Fase 4: 24 Símbolos Básicos
- [ ] Notas (C, D, E, F, G, A, B em 7 oitavas)
- [ ] Durações (semibreve, mínima, semínima, colcheia, semicolcheia, fusa, semifusa)
- [ ] Acidentes (sustenido, bemol, bequadro)
- [ ] Pausa (pausa geral)
- [ ] Compasso (simples: 2/4, 3/4, 4/4, etc.)
- [ ] Dinâmicas (forte, piano, mezzo-forte, mezzo-piano)
- [ ] Sinais de oitava (oitava acima, oitava abaixo)
- [ ] Ligadura (legato)
- [ ] Ponto de aumento (aumenta duração em 50%)

## Fase 5: Exportação .brf + Importação
- [ ] Exportar projeto em formato `.brf` (Braille Ready Format)
- [ ] Importar arquivo `.brf` e carregar no editor
- [ ] Importar arquivo `.txt` com braille Unicode
- [ ] Importar arquivo MusicXML e converter para braille

## Fase 6: Painel Admin
- [ ] Criar aba "Editor de Musicografia" no painel Admin
- [ ] Listar todos os projetos de todos os usuários
- [ ] Visualizar conteúdo de cada projeto
- [ ] Deletar projetos
- [ ] Exportar projeto como `.brf`
- [ ] Filtrar por usuário, data, título

## Fase 7: Página Inicial + Testes
- [ ] Criar página de boas-vindas (antes de login)
- [ ] Integrar vídeo YouTube (espaço para URL)
- [ ] Descrição do programa
- [ ] Testes end-to-end
- [ ] Otimização de performance
- [ ] Minificação + Ofuscação

## Notas
- Todos os projetos são salvos automaticamente a cada mudança (auto-save)
- Apenas usuários logados podem acessar o editor
- Admin tem acesso a todos os projetos de todos os usuários
- Exportação .brf é feita no servidor (backend)
