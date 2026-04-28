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
