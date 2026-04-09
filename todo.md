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
