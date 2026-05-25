# Five Steps Braille - Project TODO

## Database & Backend
- [x] Schema: tabelas materials, contact_messages
- [x] DB helpers para materials e contact_messages
- [x] tRPC router: materials (list, upload, download, delete)
- [x] tRPC router: contact (submit, list admin)
- [x] Upload de arquivos para S3 (admin only)
- [x] Download de arquivos (usuários cadastrados)

## Frontend - Layout & Idiomas
- [x] Sistema de idiomas (PT/EN) via Context
- [x] Header com navegação e botão de troca de idioma
- [x] Footer bilíngue
- [x] Paleta de cores acessível WCAG AA/AAA

## Frontend - Páginas Públicas
- [x] Home: apresentação do Five Steps, hero section, destaques
- [x] Sobre o Método: 5 Graus e 23 etapas progressivas
- [x] Para Instituições: proposta de parceria, formulário de interesse
- [x] Para Músicos com DV: como o método auxilia na alfabetização
- [x] Para Músicos sem DV: como contribuir gerando material

## Frontend - Acervo/Biblioteca
- [x] Listagem de materiais por Grau (1-5) com tabs
- [x] Cadastro obrigatório para download
- [x] Upload de materiais (admin only)
- [x] Download de materiais (usuários cadastrados)

## Frontend - Contato
- [x] Formulário de contato para parcerias institucionais
- [x] Notificação ao administrador por sistema

## Acessibilidade WCAG
- [x] Alto contraste (mínimo 4.5:1)
- [x] Navegação por teclado (focus rings visíveis)
- [x] Atributos ARIA em todos os componentes interativos
- [x] Textos alternativos em imagens
- [x] Skip navigation link

## Testes
- [x] Vitest: materials router (list, upload, delete, download)
- [x] Vitest: contact router (send, list admin)
- [x] Vitest: auth logout (existente)

## Melhorias Futuras
- [x] Add Spanish language support (trilingual PT/EN/ES)
- [x] Translate all pages to Spanish
- [x] Update language selector in Header to include ES button

## Painel de Administração
- [x] Schema: tabela activity_ratings (estrelas por atividade/usuário)
- [x] Schema: tabela activity_comments (comentários por atividade/usuário)
- [x] Schema: tabela download_logs (registro de cada download com timestamp)
- [x] DB helpers para ratings, comments, download_logs
- [x] tRPC router: admin (listar usuários, estatísticas, atividades mais baixadas)
- [x] tRPC router: ratings (criar/atualizar rating, listar ratings)
- [x] tRPC router: comments (criar, listar, deletar comentário)
- [x] Frontend: página /admin com painel completo
- [x] Admin: listagem de todos os usuários com emails
- [x] Admin: listagem de atividades com quem enviou cada uma
- [x] Admin: ranking de atividades mais baixadas
- [x] Admin: estatísticas gerais (total usuários, downloads, materiais)
- [x] Admin: listagem de comentários recentes
- [x] Frontend: sistema de estrelas (1-5) visível para todos nas atividades
- [x] Frontend: sistema de comentários visível para todos nas atividades
- [x] Proteção do painel admin (apenas role=admin)
- [x] Testes vitest para novos routers

## Seção de Serviços na Página Início
- [x] Adicionar seção "Serviços Especializados" na Home com 4 cards (Aulas, Workshops, Transcrição, Consultoria)
- [x] Indicar idiomas disponíveis (PT/ES) e botão para contato/orçamento

## Envio de E-mail no Formulário de Contato
- [x] Instalar biblioteca de envio de e-mail (Resend)
- [x] Configurar credencial RESEND_API_KEY
- [x] Criar helper de envio de e-mail no servidor
- [x] Integrar envio para acervo.musicografia@gmail.com e rafaelvanazzi@gmail.com no router de contato
- [x] Manter notificação Manus e armazenamento no banco de dados intactos
- [x] Testar envio de e-mail

## Etiquetas e Nome do Criador no Acervo
- [x] Schema: adicionar campo material_type (partitura/atividade_musicalizacao) na tabela materials
- [x] Schema: adicionar campo creator_vision (vidente/pdv) na tabela materials
- [x] Schema: adicionar campo creator_name na tabela materials
- [x] Backend: atualizar routers e db helpers para os novos campos
- [x] Frontend: atualizar formulário de upload com os novos campos
- [x] Frontend: exibir etiquetas e nome do criador nos cards do acervo
- [x] Frontend: adicionar filtros por tipo de material e tipo de criador
- [x] Traduções: adicionar chaves PT/EN/ES para os novos campos
- [x] Testes: atualizar testes vitest

## Acessibilidade Completa para Leitores de Tela (JAWS/NVDA)
- [x] Auditoria: identificar problemas de acessibilidade em todas as páginas
- [x] HTML semântico: landmarks (main, nav, header, footer, section, article)
- [x] Atributo lang dinâmico no html baseado no idioma selecionado
- [x] Skip navigation link funcional e visível ao focar
- [x] ARIA labels em todos os elementos interativos
- [x] Alt text descritivo em todas as imagens
- [x] Foco visível e navegação por teclado em todos os componentes
- [x] Formulários: labels associados, mensagens de erro acessíveis
- [x] Contraste de cores WCAG AA verificado
- [x] Live regions (aria-live) para conteúdo dinâmico
- [x] Heading hierarchy correta (h1 > h2 > h3)
- [x] Seletor de idioma acessível
- [x] Sistema de estrelas acessível por teclado
- [x] Testes automatizados de acessibilidade (vitest - 39 testes)

## Gestão de Materiais (Admin + Uploader)
- [x] Schema: adicionar campo `hidden` (boolean) na tabela materials para ocultar/revisão
- [x] Migração SQL para o novo campo
- [x] Router: endpoint para editar atributos do material (título, descrição, grau, etapa, idioma, tipo, criador)
- [x] Router: endpoint para substituir arquivo do material (novo upload S3)
- [x] Router: endpoint para alternar visibilidade (ocultar/mostrar)
- [x] Router: endpoint para deletar material (admin + owner)
- [x] Permissões: verificar que apenas admin ou o uploader original podem executar ações
- [x] Frontend Library: botões de ação (editar, substituir, ocultar, deletar) visíveis para owner/admin
- [x] Frontend Library: modal/dialog de edição de atributos
- [x] Frontend Library: modal/dialog de substituição de arquivo
- [x] Frontend Library: indicador visual de material oculto
- [x] Frontend Admin: atualizar listagem para refletir status oculto
- [x] Testes vitest para os novos endpoints


## Múltiplos Arquivos por Card de Material
- [x] Schema: criar tabela material_files (id, materialId, fileKey, fileUrl, fileName, fileSize, mimeType, uploadedBy, createdAt)
- [x] Migração SQL para a nova tabela
- [x] DB helpers: addFileToMaterial, getFilesByMaterial, deleteFile (owner-only)
- [x] Router tRPC: addFileToMaterial (owner-only), deleteFile (owner-only)
- [x] Atualizar router materials.list para retornar array de files por material
- [x] UI Library: exibir múltiplos arquivos em cada card (lista ou abas)
- [x] UI Library: botão "Adicionar arquivo" visível apenas para owner
- [x] UI Library: botão deletar arquivo (owner-only)
- [x] Testes vitest para múltiplos arquivos (5 testes)

## Correção de Download de Arquivos
- [x] Diagnosticar problema de download (URL estática vs presigned)
- [x] Corrigir download do arquivo principal (usar storageGet para URL presigned fresca)
- [x] Adicionar endpoint getFileDownloadUrl para arquivos adicionais
- [x] Adicionar botão de download nos arquivos adicionais (visível para usuários autenticados)
- [x] Corrigir handleDownload para adicionar elemento ao DOM antes de clicar

## Aba Aulas e Atividades
- [x] Schema: tabela events (id, title, description, eventDate, format, targetAudience, maxSpots, meetingLink, status draft/published, pastEventText, createdAt)
- [x] Schema: tabela event_registrations (id, eventId, userId, country, instrument, brailleLevel, isVisuallyImpaired, motivation, waitlisted, createdAt)
- [x] Migração SQL aplicada
- [x] DB helpers: createEvent, updateEvent, listEvents, getEventById, deleteEvent
- [x] DB helpers: createRegistration, listRegistrationsByEvent, cancelRegistration, countRegistrations
- [x] Router tRPC: events.list (public), events.get (public), events.create/update/delete (admin)
- [x] Router tRPC: events.register (protected), events.cancelRegistration (protected), events.listMyRegistrations (protected)
- [x] Router tRPC: events.listRegistrations (admin), events.exportRegistrations (admin)
- [x] E-mail: notificação ao admin (rafaelvanazzi@gmail.com) ao receber inscrição
- [x] E-mail: confirmação ao aluno com dados do evento e link da aula
- [x] Página Activities.tsx com seção "Realizadas" (texto livre) e "Próximas Atividades"
- [x] Dialog de inscrição com campos: país, instrumento, nível de braille, DV/vidente, motivação
- [x] Admin: aba "Eventos" com CRUD completo (criar/editar/publicar/ocultar/deletar)
- [x] Admin: aba "Inscrições" com lista por evento e exportação CSV
- [x] Rota /atividades no App.tsx e link na navegação (PT/EN/ES)
- [x] 101 testes passando

## Fórum Comunitário
- [ ] Schema: tabela forum_categories (id, slug, nameKey, descriptionKey, order, createdAt)
- [ ] Schema: tabela forum_topics (id, categoryId, userId, title, pinned, hidden, createdAt, lastPostAt)
- [ ] Schema: tabela forum_posts (id, topicId, userId, body, hidden, createdAt, updatedAt)
- [ ] Schema: tabela user_display_names (userId PK, displayName, updatedAt)
- [ ] Migração SQL aplicada
- [ ] DB helpers: categorias, tópicos (list, get, create, pin, hide), posts (list, create, hide), displayName (get, set)
- [ ] Router tRPC: forum.categories (public), forum.topics (public list, protected create/pin/hide), forum.posts (protected list/create, admin hide)
- [ ] Router tRPC: forum.setDisplayName (protected), forum.getDisplayName (protected)
- [ ] Seeder: inserir as 5 categorias padrão no banco
- [ ] Página Forum.tsx: lista de categorias com contador de tópicos (pública)
- [ ] Página ForumCategory.tsx: lista de tópicos com título, autor, nº respostas, data (pública)
- [ ] Página ForumTopic.tsx: posts completos (requer login) + formulário de resposta
- [ ] Dialog SetDisplayName: aparece antes do primeiro post, nome do Google como sugestão
- [ ] Admin: aba Fórum com lista de tópicos/posts para moderar (fixar, ocultar, deletar)
- [ ] Navegação: link "Fórum" no Header (PT/EN/ES)
- [ ] Rotas no App.tsx: /forum, /forum/:slug, /forum/:slug/:topicId
- [ ] Testes vitest para os novos endpoints

## Badge de Idioma no Fórum
- [ ] Schema: adicionar campo `language` (enum: pt/en/es) na tabela forum_topics
- [ ] Migração SQL aplicada
- [ ] Backend: atualizar createTopic e listTopics para incluir language
- [ ] Frontend ForumCategory: seletor de idioma ao criar tópico
- [ ] Frontend ForumCategory: badge PT/EN/ES nos cards de tópicos
- [ ] Frontend ForumTopic: badge de idioma no cabeçalho do tópico

## Filtro de Idioma no Fórum e Convite a Voluntários
- [x] Filtro por idioma (Todos/PT/EN/ES) na lista de tópicos do fórum
- [x] Bloco de convite a voluntários na página ForMusiciansNoDV

## Domínio de E-mail Verificado
- [x] Verificar domínio braille5steps.com no Resend (registros SPF/DKIM/DMARC no Hostinger)
- [x] Atualizar FROM_ADDRESS em server/email.ts para "Five Steps <noreply@braille5steps.com>"
- [x] Atualizar from nos e-mails de inscrição em eventos (server/routers.ts) — já estava correto

## Realinhamento do Site (Missão e Posicionamento)
- [x] Home: nova seção de Missão com sonho do projeto
- [x] Home: seção de Evidências com artigo publicado e dissertação UNICAMP
- [x] Home: seção de Comunidade (Fórum Internacional + Acervo classificado)
- [x] Home: graus do método reposicionados como instrumento da missão
- [x] Página Para Pessoas com DV: unificada (músicos e não músicos) com seção para quem ensina
- [x] Página Para Educadores de Música: reformulada com foco pedagógico comprovado, público-alvo explícito
- [x] Página Sobre o Método: seção Dalcroze adicionada (Diploma Rítmica Jacques-Dalcroze, Santiago 2018)
- [x] LanguageContext: novos textos em PT/EN/ES para todas as seções reformuladas

## Conteúdo do Vídeo de Aula Incorporado ao Site
- [x] Citações aprimoradas de Rafael Vanazzi na Home (seção de destaque visual)
- [x] História do "aluno ensinando aluno" na página Para Pessoas com DV
- [x] Seção Joan Llongueres (Dalcroze para cegos) na página Sobre o Método
- [x] Crítica às provas de aptidão universitárias na página Para Educadores de Música
- [x] Embed do vídeo da aula (YouTube) na página Sobre o Método

## Novas Funcionalidades do Fórum

- [ ] Schema: tabela forum_topic_views (contagem de visualizações)
- [ ] Schema: tabela forum_reactions (reações com emoji por post)
- [ ] tRPC: busca global no fórum (título + corpo dos posts)
- [ ] tRPC: incrementar views ao abrir tópico
- [ ] tRPC: toggle de reação (adicionar/remover emoji)
- [ ] UI: barra de busca global na página do fórum
- [ ] UI: contador de visualizações nos cards de tópico
- [ ] UI: botões de reação acessíveis nos posts (aria-label descritivo)
- [ ] Traduções PT/EN/ES para busca e reações

## Upload por Usuários Logados
- [ ] Liberar procedure materials.upload para qualquer usuário autenticado (não apenas admin)
- [ ] Materiais enviados por usuários ficam ocultos (hidden=true) até aprovação do admin
- [ ] Adicionar formulário de upload na página Acervo (Library.tsx) para usuários logados
- [ ] Notificação ao admin quando novo material for enviado por usuário

## Melhorias do Editor de Musicografia Braille
- [x] Botão "Voltar ao Início" no editor de Braille
- [x] Download funcional no botão Exportar (.brf, .txt, MusicXML)
- [x] Redesign visual do editor seguindo o estilo do site (cores, tipografia, layout)
- [x] Reescrita completa do engine de parsing de Musicografia Braille (norma internacional)
- [x] Renderização de partitura em tempo real com VexFlow (notas, pausas, oitavas, alterações)
- [x] Teclado Perkins funcional (F,D,S = pontos 1,2,3 / J,K,L = pontos 4,5,6)
- [x] Visualizador de celas Braille em tempo real
- [x] Painel de referência rápida de símbolos clicáveis
- [x] Análise em tempo real (notas, pausas, compassos, caracteres)
- [x] Auto-save a cada 2 segundos

## Importação de Arquivos no Editor de Braille
- [x] Botão de importação de arquivo .brf no editor (carrega conteúdo Braille para edição)
- [x] Botão de importação de arquivo .musicxml no editor (converte para Braille e carrega para edição)
- [x] Feedback visual durante importação (loading, sucesso, erro)
- [x] Criação automática de projeto ao importar sem projeto aberto
- [x] Botão de importação disponível tanto na lista de projetos quanto dentro do editor

## Melhorias do Editor v2 - Feedback do Utilizador
- [ ] Corrigir importação BRF: converter ASCII Braille → Unicode e disparar renderização da partitura
- [ ] Redesenhar celas Braille: círculos menores com espaçamento real entre pontos
- [ ] Adicionar correspondência alfabética abaixo de cada cela Braille
- [ ] Implementar cursor editável no campo Braille (inserir/deletar em qualquer posição)
- [ ] Permitir seleção de trecho Braille para substituição
- [ ] Adicionar símbolos: compassos (quaternário, ternário), barra final
- [ ] Adicionar símbolos: ligaduras
- [ ] Adicionar símbolos: ritornelos e casa 1/casa 2
- [ ] Feedback sonoro ao digitar notas (ativar/desativar)
- [ ] Reprodução da partitura completa (play/pause)
- [ ] Interatividade: clicar nota na partitura destaca cela Braille correspondente
- [ ] Interatividade: clicar cela Braille destaca nota na partitura

## Reestruturação do Editor v3
- [x] Corrigir nota Si (B) no VexFlow — erro "Invalid key name"
- [x] Adicionar semicolcheias ao mapeamento Braille
- [x] Criar 3 janelas sincronizadas: Partitura + Texto em Braille + Texto em Romano
- [x] Texto em Braille: entrada automática em Perkins ao clicar
- [x] Texto em Romano: entrada em teclado padrão ao clicar, mostra correspondência
- [x] Sincronização bidirecional: editar num atualiza o outro
- [x] Textos romanos no Braille não devem causar erro na partitura
- [x] Remover janela "Celas Braille" desnecessária

## Correções v3.1
- [x] Texto Romano mostra letras ASCII Braille (NABCC) corretas
- [x] Importação MusicXML inclui barras de compasso entre compassos
- [x] Layout do status de salvamento com largura fixa (sem pulos)
- [x] Nota Si (B) corrigida no VexFlow (accidentals como modifiers)

## Editor v3.2 - Renderização por Linha e Desambiguação
- [ ] Renderizar partitura apenas da linha onde está o cursor
- [ ] Renderizar partitura do trecho selecionado (se houver seleção)
- [ ] Desambiguação automática semibreve↔semicolcheia baseada na fórmula de compasso
- [ ] Desambiguação automática mínima↔fusa (mesma cela Braille)
- [ ] Atualizar Referência Rápida com semicolcheias, barras de compasso, fórmulas de compasso, ligaduras
- [ ] Cursor tracking bidirecional entre Texto em Braille e Texto em Romano

## Melhorias v3.2 - Renderização e Desambiguação
- [x] ScoreRenderer reescrito com suporte a fórmula de compasso (addTimeSignature)
- [x] ScoreRenderer com prop beatsPerMeasure para determinar a fórmula
- [x] ScoreRenderer com ligaduras via Curve (entre primeira e última nota)
- [x] ScoreRenderer com staff vazio com clave e fórmula quando não há notas
- [x] brailleMusic.ts: Desambiguação retroativa de dois passos (Pass 2)
- [x] brailleMusic.ts: Quando 2+ notas do grupo w/16 no mesmo compasso, TODAS viram semicolcheia
- [x] brailleMusic.ts: getQuickReference() expandida com categorias
- [x] BrailleEditor.tsx: QuickReferencePanel atualizado com novas categorias
- [x] Testes vitest criados para desambiguação, Quick Reference, Perkins keyboard
- [ ] Testes supervisionados do usuário no browser (7 testes)
- [ ] Validar testes vitest e salvar checkpoint


## Correções v3.3 - Feedback dos Testes Supervisionados
- [x] Mapeamento Braille de compassos corrigido (denominador em linha rebaixada)
- [x] Compassos 4/4, 3/4, 2/4, 6/8 com celas corretas
- [x] Compassos 3/8 e 9/8 adicionados
- [x] Mapeamento Braille de barras corrigido (barra final, ritornelos)
- [x] Sinal de tercina (2,3) adicionado na aba Outros
- [x] Staff vazio com compasso aparece logo após digitar fórmula
- [x] Parsing de compassos implementado (ParsedTimeSignature)
- [x] ScoreRenderer usa compassos parseados
- [x] Semibreve forçada implementada (ignora desambiguação)
- [x] Testes vitest ainda passando (162 testes)

## Correções v3.4 - Renderização VexFlow
- [x] Corrigir accidentals: converter 'sharp'/'flat'/'natural' para '#'/'b'/'n' (formato VexFlow)
- [x] Largura dinâmica do compasso baseada na duração das notas (semibreves mais largas, colcheias menores)
- [x] Largura extra no primeiro compasso para acomodar clave + fórmula de compasso (+80px)
- [x] Corrigir pausas pontuadas (dotted rests) com Dot.buildAndAttach
- [x] Corrigir duração de pausas: remover 'r' duplicado no vexDuration
- [x] Scroll horizontal automático quando compassos ultrapassam a largura disponível
- [x] Todos os compassos em uma única linha (sem wrap/quebra de linha)
- [x] 171 testes vitest passando

## Envio de Emails em Massa
- [x] Função sendBulkEmail no backend (Resend API)
- [x] Procedure tRPC admin.sendBulkEmail
- [x] Página AdminBulkEmail.tsx com editor HTML e preview
- [x] Sistema de campanhas de email agendadas (tabelas no banco)
- [x] Fila em memória para envio com intervalo configurável (sem Heartbeat)
- [x] Botão de edição de campanhas antes do envio
- [x] 171 testes vitest passando

## Interação Partitura → Braille (v3.5)
- [x] Hit areas por nota individual no ScoreRenderer (não mais por compasso)
- [x] Clicar numa nota na partitura VexFlow move o cursor para a cela Braille correspondente
- [x] Cela Braille selecionada (highlighted) ao clicar na nota
- [x] Detecção de nota mais próxima ao clique (tolerância de 60px)
- [x] Fallback para posição aproximada quando getBoundingBox não está disponível
- [x] 171 testes vitest passando
