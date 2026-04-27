import React, { createContext, useContext, useState } from "react";

export type Language = "pt" | "en" | "es";

type Translations = {
  // Navigation
  nav_home: string;
  nav_about: string;
  nav_institutions: string;
  nav_musicians_dv: string;
  nav_musicians_nodv: string;
  nav_library: string;
  nav_activities: string;
  nav_forum: string;
  nav_contact: string;
  nav_login: string;
  nav_logout: string;
  nav_admin: string;

  // Home
  home_hero_title: string;
  home_hero_subtitle: string;
  home_hero_cta: string;
  home_hero_cta2: string;
  home_what_title: string;
  home_what_desc: string;
  home_grades_title: string;
  home_grade1_title: string;
  home_grade1_desc: string;
  home_grade2_title: string;
  home_grade2_desc: string;
  home_grade3_title: string;
  home_grade3_desc: string;
  home_grade4_title: string;
  home_grade4_desc: string;
  home_grade5_title: string;
  home_grade5_desc: string;
  home_who_title: string;
  home_who_dv: string;
  home_who_dv_desc: string;
  home_who_nodv: string;
  home_who_nodv_desc: string;
  home_who_inst: string;
  home_who_inst_desc: string;
  home_cta_title: string;
  home_cta_desc: string;
  home_cta_library: string;
  home_cta_contact: string;

  // Home — new mission blocks
  home_mission_title: string;
  home_mission_desc: string;
  home_dream_title: string;
  home_dream_desc: string;
  home_evidence_title: string;
  home_evidence_desc: string;
  home_evidence_article: string;
  home_evidence_thesis: string;
  home_community_title: string;
  home_community_forum: string;
  home_community_forum_desc: string;
  home_community_library: string;
  home_community_library_desc: string;

  // About
  about_title: string;
  about_subtitle: string;
  about_origin_title: string;
  about_origin_desc: string;
  about_sloboda_title: string;
  about_sloboda_desc: string;
  about_dalcroze_title: string;
  about_dalcroze_desc: string;
  about_grades_title: string;
  about_complementary_title: string;
  about_complementary_desc: string;
  about_platform_title: string;
  about_platform_desc: string;

  // Institutions
  inst_title: string;
  inst_subtitle: string;
  inst_why_title: string;
  inst_why_desc: string;
  inst_offer_title: string;
  inst_offer_1: string;
  inst_offer_2: string;
  inst_offer_3: string;
  inst_offer_4: string;
  inst_types_title: string;
  inst_type_univ: string;
  inst_type_school: string;
  inst_type_culture: string;
  inst_type_ngo: string;
  inst_cta: string;

  // People with VI (unified page)
  dv_title: string;
  dv_subtitle: string;
  dv_what_title: string;
  dv_what_desc: string;
  dv_benefits_title: string;
  dv_benefit_1: string;
  dv_benefit_2: string;
  dv_benefit_3: string;
  dv_benefit_4: string;
  dv_journey_title: string;
  dv_cta: string;
  dv_teacher_title: string;
  dv_teacher_desc: string;

  // Music Educators (formerly NoDV)
  nodv_title: string;
  nodv_subtitle: string;
  nodv_why_title: string;
  nodv_why_desc: string;
  nodv_how_title: string;
  nodv_how_1: string;
  nodv_how_2: string;
  nodv_how_3: string;
  nodv_impact_title: string;
  nodv_impact_desc: string;
  nodv_cta: string;
  nodv_volunteer_title: string;
  nodv_volunteer_desc: string;
  nodv_volunteer_cta: string;
  nodv_volunteer_contact_cta: string;

  // Library
  lib_title: string;
  lib_subtitle: string;
  lib_login_required: string;
  lib_login_cta: string;
  lib_grade_label: string;
  lib_stage_label: string;
  lib_download: string;
  lib_upload: string;
  lib_no_materials: string;
  lib_filter_all: string;
  lib_file_size: string;
  lib_language: string;
  lib_lang_pt: string;
  lib_lang_en: string;
  lib_lang_both: string;
  library_title: string;
  library_subtitle: string;
  library_login_required: string;
  library_login_banner: string;
  library_login: string;
  library_download: string;
  library_all: string;
  library_grade: string;
  library_empty: string;
  library_empty_desc: string;
  library_type_partitura: string;
  library_type_atividade: string;
  library_creator_vidente: string;
  library_creator_pdv: string;
  library_creator_by: string;
  library_filter_type: string;
  library_filter_creator: string;
  library_filter_all_types: string;
  library_filter_all_creators: string;

  // Contact
  contact_title: string;
  contact_subtitle: string;
  contact_name: string;
  contact_email: string;
  contact_institution: string;
  contact_subject: string;
  contact_message: string;
  contact_type: string;
  contact_type_inst: string;
  contact_type_dv: string;
  contact_type_nodv: string;
  contact_type_general: string;
  contact_submit: string;
  contact_success: string;
  contact_error: string;

  // Footer
  footer_desc: string;
  footer_links: string;
  footer_rights: string;

  // Common
  common_loading: string;
  common_error: string;
  common_back: string;
  common_read_more: string;
  common_skip_nav: string;

  // Services
  home_services_title: string;
  home_services_subtitle: string;
  home_services_lessons: string;
  home_services_lessons_desc: string;
  home_services_workshops: string;
  home_services_workshops_desc: string;
  home_services_transcription: string;
  home_services_transcription_desc: string;
  home_services_consulting: string;
  home_services_consulting_desc: string;
  home_services_languages: string;
  home_services_cta: string;
};

const pt: Translations = {
  nav_home: "Início",
  nav_about: "O Método Five Steps",
  nav_institutions: "Para Instituições",
  nav_musicians_dv: "Para Pessoas com DV",
  nav_musicians_nodv: "Para Educadores de Música",
  nav_library: "Acervo",
  nav_activities: "Aulas e Atividades",
  nav_forum: "Fórum",
  nav_contact: "Contato",
  nav_login: "Entrar",
  nav_logout: "Sair",
  nav_admin: "Administração",

  home_hero_title: "Five Steps",
  home_hero_subtitle: "Vivência musical para pessoas com deficiência visual, fundamentada na musicografia Braille",
  home_hero_cta: "Explorar o Acervo",
  home_hero_cta2: "Conhecer o Método",

  home_mission_title: "Nossa Missão",
  home_mission_desc: "Levar a vivência musical a pessoas com deficiência visual por meio de princípios pedagógicos fundamentados na musicografia Braille. Não se trata apenas de ensinar a ler partituras — trata-se de criar uma experiência musical que parte do universo tátil e cognitivo da PDV, gerando uma conexão mais profunda com a música do que qualquer abordagem adaptada do ensino convencional.",
  home_dream_title: "O Sonho do Projeto",
  home_dream_desc: "Criar escolas onde todos os professores sejam pessoas com deficiência visual, ensinando música para alunos com ou sem DV, e criando suas próprias atividades adaptadas. O método Five Steps estrutura como esse sonho pode acontecer na prática — de forma progressiva, científica e replicável.",

  home_evidence_title: "Comprovado na Prática",
  home_evidence_desc: "Observamos em aulas práticas, por diversas vezes, que materiais didáticos baseados nas particularidades da musicografia Braille aceleram a aprendizagem musical de PDV. Quando as atividades são criadas por pessoas com DV, o impacto é ainda maior: elas compreendem o Braille por dentro e, ao explicar entre si, usam uma linguagem que torna o entendimento mais natural e direto do que quando a explicação vem de um músico vidente.",
  home_evidence_article: "Artigo: \"Didática musical para alunos com deficiência visual: material didático musical e dinâmicas especiais\" — Rafael Vanazzi e Raphael Ota",
  home_evidence_thesis: "Dissertação de Mestrado (UNICAMP): \"Particularidades da Musicografia Braille para o Auxílio de Novas Metodologias de Ensino\" — Rafael Vanazzi",

  home_community_title: "Uma Comunidade Global",
  home_community_forum: "Fórum Internacional",
  home_community_forum_desc: "Espaço de troca entre professores, músicos com DV e educadores de todo o mundo, em português, inglês e espanhol.",
  home_community_library: "Acervo Digital",
  home_community_library_desc: "Partituras e atividades musicais classificadas conforme os 5 Graus e 23 etapas do método Five Steps.",

  home_what_title: "O que é o Five Steps?",
  home_what_desc: "O Five Steps é um framework metodológico desenvolvido a partir de dissertação de mestrado na UNICAMP, que organiza a musicografia Braille em 5 Graus de Dificuldade e 23 etapas progressivas. Fundamentado na psicologia cognitiva de John Sloboda e nos princípios da Rítmica Jacques-Dalcroze, o método mapeia passo a passo o que o aluno precisa compreender para vivenciar e ler música em Braille com excelência.",
  home_grades_title: "Os 5 Graus de Dificuldade",
  home_grade1_title: "Grau 1 — Notas e Alturas",
  home_grade1_desc: "2 etapas. Fundamentos da leitura de notas e suas alturas na musicografia Braille.",
  home_grade2_title: "Grau 2 — Tempo",
  home_grade2_desc: "5 etapas. Compreensão das figuras rítmicas e organização temporal da música.",
  home_grade3_title: "Grau 3 — Intervalos Diatônicos e Oitavas",
  home_grade3_desc: "5 etapas. Leitura de intervalos e navegação entre oitavas na partitura Braille.",
  home_grade4_title: "Grau 4 — Intervalos Cromáticos e Inversões",
  home_grade4_desc: "3 etapas. Domínio de acidentes, cromatismos e inversões de intervalos.",
  home_grade5_title: "Grau 5 — Tópicos Diversos",
  home_grade5_desc: "8 etapas. Percepção bidimensional, contraponto, polirritmia, harmonia e solfejo.",
  home_who_title: "Para quem é o Five Steps?",
  home_who_dv: "Pessoas com Deficiência Visual",
  home_who_dv_desc: "Vivência musical prática fundamentada no Braille, sem necessidade de ler partituras. Para músicos com DV: capacitação para ensinar com autonomia.",
  home_who_nodv: "Educadores e Estudantes de Música",
  home_who_nodv_desc: "Formação em musicografia Braille para transcrever partituras e criar atividades adaptadas — comprovadamente enriquecedora para licenciandos e musicoterapeutas.",
  home_who_inst: "Instituições",
  home_who_inst_desc: "Universidades, escolas de música e casas de cultura que desejam oferecer formação musical inclusiva de base científica.",
  home_cta_title: "Faça parte desta comunidade global",
  home_cta_desc: "Acesse o acervo de materiais organizados pelas 23 etapas ou entre em contato para uma parceria.",
  home_cta_library: "Acessar o Acervo",
  home_cta_contact: "Fale Conosco",

  about_title: "O Método Five Steps",
  about_subtitle: "Uma estrutura pedagógica para o ensino musical fundamentado na musicografia Braille",
  about_origin_title: "A Origem do Método",
  about_origin_desc: "O Five Steps nasceu da observação de uma injustiça: ao serem transcritas para a musicografia Braille, as provas de vestibular em música tornavam-se artificialmente mais difíceis para candidatos com deficiência visual, pois incluíam conceitos que poderiam ser evitados ou introduzidos gradualmente. Essa constatação motivou a dissertação de mestrado de Rafael Vanazzi na UNICAMP — \"Particularidades da Musicografia Braille para o Auxílio de Novas Metodologias de Ensino\" — que resultou em um mapa completo do que o leitor Braille precisa dominar para ler partituras com excelência.",
  about_sloboda_title: "Fundamentação Científica — John Sloboda",
  about_sloboda_desc: "O método é fundamentado na psicologia cognitiva do musicólogo britânico John Sloboda, especialmente em sua obra sobre como os músicos processam e leem partituras. Aplicando esses conceitos ao contexto tátil da musicografia Braille, o Five Steps mapeia os processos cognitivos célula por célula, garantindo que cada etapa prepare o aluno para a seguinte.",
  about_dalcroze_title: "Fundamentação Pedagógica — Rítmica Jacques-Dalcroze",
  about_dalcroze_desc: "O método também se apoia nos princípios da Rítmica Jacques-Dalcroze, abordagem pedagógica que integra movimento corporal, percepção rítmica e expressão musical. Rafael Vanazzi é diplomado em Rítmica Jacques-Dalcroze (2018, Santiago — Chile), em curso reconhecido pelo Institut Jacques-Dalcroze da Suíça. Essa formação influencia diretamente a forma como as atividades do Five Steps são estruturadas: partindo da experiência corporal e sensorial antes de chegar à leitura formal.",
  about_grades_title: "Os 5 Graus e suas Etapas",
  about_complementary_title: "Conteúdos Complementares",
  about_complementary_desc: "Além dos 5 Graus, o método inclui uma grade de Conteúdos Complementares que devem ser abordados ao longo de todos os graus, conforme a necessidade do aluno. Esses conteúdos variam de acordo com o instrumento (piano, flauta, violino, etc.) e incluem: nuances, ligaduras, dedilhados, dinâmicas, ornamentação, repetições, abreviação de sequências e duplicação de símbolos.",
  about_platform_title: "A Visão da Plataforma Global",
  about_platform_desc: "O Five Steps aspira a se tornar um hub mundial onde professores de musicografia Braille de todo o mundo possam compartilhar e organizar atividades didáticas pelas 23 etapas. Ao completar todas as etapas, o aluno deve atingir um nível médio/avançado de leitura musical em Braille, equivalente ao de um músico profissional.",

  inst_title: "Para Instituições",
  inst_subtitle: "Ofereça formação musical inclusiva com base científica e pedagógica comprovada",
  inst_why_title: "Por que oferecer o Five Steps?",
  inst_why_desc: "A musicografia Braille é uma área de conhecimento especializado e escasso. Ao adotar o método Five Steps, sua instituição passa a oferecer uma formação estruturada, baseada em pesquisa acadêmica (UNICAMP) e experiência prática comprovada, que beneficia tanto alunos com deficiência visual quanto professores de música que desejam ampliar sua atuação pedagógica.",
  inst_offer_title: "O que oferecemos",
  inst_offer_1: "Aulas e oficinas de musicografia Braille para alunos com deficiência visual",
  inst_offer_2: "Formação de professores para aplicação do método Five Steps",
  inst_offer_3: "Consultoria para adaptação de materiais didáticos musicais",
  inst_offer_4: "Palestras e workshops sobre educação musical inclusiva",
  inst_types_title: "Tipos de Instituições",
  inst_type_univ: "Universidades e Conservatórios",
  inst_type_school: "Escolas de Música",
  inst_type_culture: "Casas de Cultura e Centros Culturais",
  inst_type_ngo: "ONGs e Institutos de Inclusão",
  inst_cta: "Entre em Contato",

  dv_title: "Para Pessoas com Deficiência Visual",
  dv_subtitle: "Vivência musical prática, sem precisar ler partituras em Braille",
  dv_what_title: "Uma abordagem diferente",
  dv_what_desc: "O Five Steps propõe aulas didáticas práticas fundamentadas na musicografia Braille — mas sem exigir que o aluno leia partituras. O objetivo é criar uma vivência musical que parte do universo tátil e cognitivo da PDV, usando os princípios do Braille como base pedagógica. Isso gera uma conexão com a música muito mais natural e profunda do que abordagens adaptadas do ensino convencional.",
  dv_benefits_title: "O que você vai encontrar",
  dv_benefit_1: "Aulas práticas que respeitam e partem do universo da PDV",
  dv_benefit_2: "Progressão clara: cada etapa prepara para a seguinte, sem lacunas",
  dv_benefit_3: "Autonomia: ao avançar nas etapas, você desenvolve independência musical real",
  dv_benefit_4: "Acervo de atividades organizadas por grau para prática autônoma",
  dv_journey_title: "A Jornada de Aprendizado",
  dv_cta: "Acessar o Acervo de Materiais",
  dv_teacher_title: "Para Músicos com DV que Ensinam",
  dv_teacher_desc: "Se você é músico com deficiência visual e deseja ensinar, o Five Steps oferece uma estrutura clara para criar suas próprias atividades e aplicá-las com alunos com ou sem DV. Professores com DV têm uma perspectiva única: ao explicar a música a partir do Braille, a linguagem usada é mais direta e natural para outros alunos com DV — algo que observamos repetidamente em aulas práticas. O projeto apoia e incentiva essa forma de ensinar.",

  nodv_title: "Para Educadores e Estudantes de Música",
  nodv_subtitle: "Amplie sua formação com a musicografia Braille — comprovadamente",
  nodv_why_title: "Por que aprender musicografia Braille?",
  nodv_why_desc: "Aulas de musicografia Braille para músicos videntes não são apenas sobre inclusão — são sobre ampliar a visão pedagógica. Observamos em experiências práticas que estudantes de licenciatura musical, musicoterapia e áreas afins que passam pela formação em musicografia Braille desenvolvem uma compreensão mais profunda dos fundamentos musicais e uma capacidade pedagógica mais versátil. Você aprende a transcrever partituras e a criar atividades musicais adaptadas de acordo com os princípios do Five Steps.",
  nodv_how_title: "O que você vai aprender",
  nodv_how_1: "Ler e escrever em musicografia Braille com o método Five Steps",
  nodv_how_2: "Transcrever partituras convencionais para o formato Braille",
  nodv_how_3: "Criar atividades musicais adaptadas classificadas pelas 23 etapas",
  nodv_impact_title: "Para quem é essa formação",
  nodv_impact_desc: "Especialmente indicada para graduandos e graduados em licenciatura musical, musicoterapia e áreas afins. Também para músicos profissionais que desejam atuar com alunos com deficiência visual ou contribuir com o acervo colaborativo da plataforma.",
  nodv_cta: "Quero me Formar",
  nodv_volunteer_title: "Seja um Voluntário de Transcrição",
  nodv_volunteer_desc: "Estamos formando um grupo de músicos videntes voluntários para transcrever partituras convencionais em musicografia Braille. Cada partitura transcrita amplia o acervo disponível para músicos com deficiência visual em todo o mundo. Não é necessário ter experiência prévia — o método Five Steps guia você passo a passo.",
  nodv_volunteer_cta: "Quero ser voluntário",
  nodv_volunteer_contact_cta: "Falar com a equipe",

  lib_title: "Acervo de Materiais",
  lib_subtitle: "Materiais didáticos organizados pelos 5 Graus e 23 etapas do método",
  lib_login_required: "Faça login para acessar o acervo completo e baixar materiais.",
  lib_login_cta: "Entrar para Acessar",
  lib_grade_label: "Grau",
  lib_stage_label: "Etapa",
  lib_download: "Baixar",
  lib_upload: "Enviar Material",
  lib_no_materials: "Nenhum material disponível neste grau ainda.",
  lib_filter_all: "Todos os Graus",
  lib_file_size: "Tamanho",
  lib_language: "Idioma",
  lib_lang_pt: "Português",
  lib_lang_en: "Inglês",
  lib_lang_both: "Bilíngue",
  library_title: "Acervo de Materiais",
  library_subtitle: "Partituras e atividades musicais classificadas conforme os 5 Graus e 23 etapas do método Five Steps",
  library_login_required: "Faça login para baixar este material.",
  library_login_banner: "Cadastre-se gratuitamente para acessar e baixar todos os materiais do acervo.",
  library_login: "Entrar / Cadastrar",
  library_download: "Baixar",
  library_all: "Todos os Graus",
  library_grade: "Grau",
  library_empty: "Nenhum material disponível ainda.",
  library_empty_desc: "Em breve novos materiais serão adicionados ao acervo.",
  library_type_partitura: "Partitura",
  library_type_atividade: "Atividade de Musicalização",
  library_creator_vidente: "Vidente",
  library_creator_pdv: "Pessoa com DV",
  library_creator_by: "Por",
  library_filter_type: "Tipo de Material",
  library_filter_creator: "Tipo de Criador",
  library_filter_all_types: "Todos os Tipos",
  library_filter_all_creators: "Todos os Criadores",

  contact_title: "Contato",
  contact_subtitle: "Entre em contato para parcerias, informações ou para receber aulas",
  contact_name: "Nome completo",
  contact_email: "E-mail",
  contact_institution: "Instituição (opcional)",
  contact_subject: "Assunto",
  contact_message: "Mensagem",
  contact_type: "Tipo de interesse",
  contact_type_inst: "Parceria Institucional",
  contact_type_dv: "Pessoa com Deficiência Visual",
  contact_type_nodv: "Educador / Estudante de Música",
  contact_type_general: "Informações Gerais",
  contact_submit: "Enviar Mensagem",
  contact_success: "Mensagem enviada com sucesso! Retornaremos em breve.",
  contact_error: "Erro ao enviar mensagem. Por favor, tente novamente.",

  footer_desc: "Five Steps é um projeto de educação musical inclusiva desenvolvido por Rafael Moreira Vanazzi de Souza, Mestre em Música pela UNICAMP e diplomado em Rítmica Jacques-Dalcroze (Santiago, 2018).",
  footer_links: "Links",
  footer_rights: "Todos os direitos reservados.",

  common_loading: "Carregando...",
  common_error: "Ocorreu um erro. Por favor, tente novamente.",
  common_back: "Voltar",
  common_read_more: "Saiba mais",
  common_skip_nav: "Pular para o conteúdo principal",

  home_services_title: "Serviços Especializados",
  home_services_subtitle: "Formação, consultoria e transcrição em musicografia braille",
  home_services_lessons: "Aulas Particulares",
  home_services_lessons_desc: "Aulas individuais ou em grupo (online) de musicografia braille para músicos com DV e educadores.",
  home_services_workshops: "Workshops e Palestras",
  home_services_workshops_desc: "Formações presenciais ou online para universidades, conservatórios e eventos.",
  home_services_transcription: "Transcrição de Partituras",
  home_services_transcription_desc: "Transcrição profissional de partituras em tinta para musicografia braille, qualquer complexidade.",
  home_services_consulting: "Consultoria Institucional",
  home_services_consulting_desc: "Diagnóstico e capacitação em acessibilidade musical para escolas, conservatórios e universidades.",
  home_services_languages: "Disponível em português e espanhol",
  home_services_cta: "Solicitar Orçamento",
};

const en: Translations = {
  nav_home: "Home",
  nav_about: "The Five Steps Method",
  nav_institutions: "For Institutions",
  nav_musicians_dv: "For People with VI",
  nav_musicians_nodv: "For Music Educators",
  nav_library: "Library",
  nav_activities: "Classes & Activities",
  nav_forum: "Forum",
  nav_contact: "Contact",
  nav_login: "Sign In",
  nav_logout: "Sign Out",
  nav_admin: "Administration",

  home_hero_title: "Five Steps",
  home_hero_subtitle: "Musical experience for people with visual impairment, grounded in Braille music notation",
  home_hero_cta: "Explore the Library",
  home_hero_cta2: "Learn the Method",

  home_mission_title: "Our Mission",
  home_mission_desc: "To bring musical experience to people with visual impairment through pedagogical principles grounded in Braille music notation. This is not just about teaching how to read scores — it is about creating a musical experience that starts from the tactile and cognitive world of the visually impaired, generating a deeper connection with music than any approach adapted from conventional teaching.",
  home_dream_title: "The Project's Dream",
  home_dream_desc: "To create schools where all teachers are people with visual impairment, teaching music to students with or without VI, and creating their own adapted activities. The Five Steps method structures how this dream can happen in practice — progressively, scientifically, and replicably.",

  home_evidence_title: "Proven in Practice",
  home_evidence_desc: "We have observed repeatedly in practical classes that teaching materials based on the particularities of Braille music notation accelerate the musical learning of visually impaired students. When activities are created by people with VI, the impact is even greater: they understand Braille from the inside, and when they explain to each other, they use a language that makes understanding more natural and direct than when the explanation comes from a sighted musician.",
  home_evidence_article: "Article: \"Musical didactics for students with visual impairment: musical teaching materials and special dynamics\" — Rafael Vanazzi and Raphael Ota",
  home_evidence_thesis: "Master's Thesis (UNICAMP): \"Particularities of Braille Music Notation for the Support of New Teaching Methodologies\" — Rafael Vanazzi",

  home_community_title: "A Global Community",
  home_community_forum: "International Forum",
  home_community_forum_desc: "A space for exchange among teachers, musicians with VI, and educators from around the world, in Portuguese, English, and Spanish.",
  home_community_library: "Digital Library",
  home_community_library_desc: "Scores and musical activities classified according to the 5 Grades and 23 stages of the Five Steps method.",

  home_what_title: "What is Five Steps?",
  home_what_desc: "Five Steps is a methodological framework developed from a Master's thesis at UNICAMP (Brazil), organizing Braille music notation into 5 Difficulty Grades and 23 progressive stages. Grounded in John Sloboda's cognitive psychology and the principles of Jacques-Dalcroze Eurhythmics, the method maps step by step what the student needs to understand to experience and read music in Braille with excellence.",
  home_grades_title: "The 5 Difficulty Grades",
  home_grade1_title: "Grade 1 — Notes and Pitches",
  home_grade1_desc: "2 stages. Fundamentals of reading notes and their pitches in Braille music notation.",
  home_grade2_title: "Grade 2 — Time",
  home_grade2_desc: "5 stages. Understanding rhythmic figures and temporal organization of music.",
  home_grade3_title: "Grade 3 — Diatonic Intervals and Octaves",
  home_grade3_desc: "5 stages. Reading intervals and navigating between octaves in Braille scores.",
  home_grade4_title: "Grade 4 — Chromatic Intervals and Inversions",
  home_grade4_desc: "3 stages. Mastery of accidentals, chromaticism, and interval inversions.",
  home_grade5_title: "Grade 5 — Diverse Topics",
  home_grade5_desc: "8 stages. Bidimensional perception, counterpoint, polyrhythm, harmony, and solfège.",
  home_who_title: "Who is Five Steps for?",
  home_who_dv: "People with Visual Impairment",
  home_who_dv_desc: "Practical musical experience grounded in Braille, without needing to read scores. For musicians with VI: training to teach with autonomy.",
  home_who_nodv: "Music Educators and Students",
  home_who_nodv_desc: "Training in Braille music notation to transcribe scores and create adapted activities — proven to enrich music education students and music therapists.",
  home_who_inst: "Institutions",
  home_who_inst_desc: "Universities, music schools, and cultural centers wishing to offer science-based inclusive music education.",
  home_cta_title: "Join this global community",
  home_cta_desc: "Access the library of materials organized by the 23 stages or get in touch for a partnership.",
  home_cta_library: "Access the Library",
  home_cta_contact: "Contact Us",

  about_title: "The Five Steps Method",
  about_subtitle: "A pedagogical framework for music education grounded in Braille music notation",
  about_origin_title: "The Origin of the Method",
  about_origin_desc: "Five Steps was born from the observation of an injustice: when transcribed into Braille music notation, university entrance exams in music became artificially more difficult for visually impaired candidates, as they included concepts that could be avoided or introduced gradually. This finding motivated Rafael Vanazzi's Master's thesis at UNICAMP — \"Particularities of Braille Music Notation for the Support of New Teaching Methodologies\" — which resulted in a complete map of what the Braille reader needs to master to read scores with excellence.",
  about_sloboda_title: "Scientific Foundation — John Sloboda",
  about_sloboda_desc: "The method is grounded in the cognitive psychology of British musicologist John Sloboda, especially his work on how musicians process and read scores. Applying these concepts to the tactile context of Braille music notation, Five Steps maps cognitive processes cell by cell, ensuring each stage prepares the student for the next.",
  about_dalcroze_title: "Pedagogical Foundation — Jacques-Dalcroze Eurhythmics",
  about_dalcroze_desc: "The method also draws on the principles of Jacques-Dalcroze Eurhythmics, a pedagogical approach that integrates body movement, rhythmic perception, and musical expression. Rafael Vanazzi holds a diploma in Jacques-Dalcroze Eurhythmics (2018, Santiago — Chile), from a course recognized by the Institut Jacques-Dalcroze in Switzerland. This training directly influences how Five Steps activities are structured: starting from bodily and sensory experience before arriving at formal reading.",
  about_grades_title: "The 5 Grades and Their Stages",
  about_complementary_title: "Complementary Content",
  about_complementary_desc: "In addition to the 5 Grades, the method includes a grid of Complementary Content that should be addressed throughout all grades, as needed by the student. These contents vary according to the instrument (piano, flute, violin, etc.) and include: nuances, slurs, fingerings, dynamics, ornamentation, repetitions, sequence abbreviation, and symbol duplication.",
  about_platform_title: "The Global Platform Vision",
  about_platform_desc: "Five Steps aspires to become a worldwide hub where Braille music teachers from around the world can share and organize teaching activities by the 23 stages. Upon completing all stages, the student should reach an intermediate/advanced level of Braille music reading, equivalent to that of a professional musician.",

  inst_title: "For Institutions",
  inst_subtitle: "Offer inclusive music education with proven scientific and pedagogical foundations",
  inst_why_title: "Why offer Five Steps?",
  inst_why_desc: "Braille music notation is a specialized and scarce area of knowledge. By adopting the Five Steps method, your institution begins to offer structured, research-based training (UNICAMP) with proven practical results, benefiting both visually impaired students and music teachers who wish to expand their pedagogical practice.",
  inst_offer_title: "What we offer",
  inst_offer_1: "Braille music notation classes and workshops for visually impaired students",
  inst_offer_2: "Teacher training for applying the Five Steps method",
  inst_offer_3: "Consulting for adapting musical teaching materials",
  inst_offer_4: "Lectures and workshops on inclusive music education",
  inst_types_title: "Types of Institutions",
  inst_type_univ: "Universities and Conservatories",
  inst_type_school: "Music Schools",
  inst_type_culture: "Cultural Centers",
  inst_type_ngo: "NGOs and Inclusion Institutes",
  inst_cta: "Get in Touch",

  dv_title: "For People with Visual Impairment",
  dv_subtitle: "Practical musical experience, without needing to read Braille scores",
  dv_what_title: "A different approach",
  dv_what_desc: "Five Steps offers practical teaching classes grounded in Braille music notation — but without requiring the student to read scores. The goal is to create a musical experience that starts from the tactile and cognitive world of the visually impaired, using Braille principles as a pedagogical foundation. This generates a connection with music that is far more natural and deep than approaches adapted from conventional teaching.",
  dv_benefits_title: "What you will find",
  dv_benefit_1: "Practical classes that respect and start from the world of the visually impaired",
  dv_benefit_2: "Clear progression: each stage prepares for the next, with no gaps",
  dv_benefit_3: "Autonomy: as you advance through the stages, you develop real musical independence",
  dv_benefit_4: "Library of activities organized by grade for autonomous practice",
  dv_journey_title: "The Learning Journey",
  dv_cta: "Access the Materials Library",
  dv_teacher_title: "For Musicians with VI Who Teach",
  dv_teacher_desc: "If you are a musician with visual impairment and wish to teach, Five Steps offers a clear structure to create your own activities and apply them with students with or without VI. Teachers with VI have a unique perspective: when explaining music from within the Braille framework, the language used is more direct and natural for other visually impaired students — something we have observed repeatedly in practical classes. The project supports and encourages this way of teaching.",

  nodv_title: "For Music Educators and Students",
  nodv_subtitle: "Expand your training with Braille music notation — proven results",
  nodv_why_title: "Why learn Braille music notation?",
  nodv_why_desc: "Braille music notation classes for sighted musicians are not just about inclusion — they are about expanding pedagogical vision. We have observed in practical experiences that music education students, music therapists, and related professionals who go through Braille music training develop a deeper understanding of musical fundamentals and a more versatile pedagogical capacity. You learn to transcribe scores and create adapted musical activities according to Five Steps principles.",
  nodv_how_title: "What you will learn",
  nodv_how_1: "Read and write Braille music notation with the Five Steps method",
  nodv_how_2: "Transcribe conventional scores to Braille format",
  nodv_how_3: "Create adapted musical activities classified by the 23 stages",
  nodv_impact_title: "Who this training is for",
  nodv_impact_desc: "Especially recommended for undergraduate and graduate students in music education, music therapy, and related fields. Also for professional musicians who wish to work with visually impaired students or contribute to the platform's collaborative library.",
  nodv_cta: "I Want to Train",
  nodv_volunteer_title: "Become a Transcription Volunteer",
  nodv_volunteer_desc: "We are forming a group of sighted musician volunteers to transcribe conventional sheet music into Braille music notation. Each transcribed score expands the library available to visually impaired musicians worldwide. No prior experience is required — the Five Steps method guides you step by step.",
  nodv_volunteer_cta: "I want to volunteer",
  nodv_volunteer_contact_cta: "Talk to the team",

  lib_title: "Materials Library",
  lib_subtitle: "Teaching materials organized by the 5 Grades and 23 stages of the method",
  lib_login_required: "Please sign in to access the full library and download materials.",
  lib_login_cta: "Sign In to Access",
  lib_grade_label: "Grade",
  lib_stage_label: "Stage",
  lib_download: "Download",
  lib_upload: "Upload Material",
  lib_no_materials: "No materials available for this grade yet.",
  lib_filter_all: "All Grades",
  lib_file_size: "Size",
  lib_language: "Language",
  lib_lang_pt: "Portuguese",
  lib_lang_en: "English",
  lib_lang_both: "Bilingual",
  library_title: "Materials Library",
  library_subtitle: "Scores and musical activities classified according to the 5 Grades and 23 stages of the Five Steps method",
  library_login_required: "Please sign in to download this material.",
  library_login_banner: "Sign up for free to access and download all materials in the library.",
  library_login: "Sign In / Register",
  library_download: "Download",
  library_all: "All Grades",
  library_grade: "Grade",
  library_empty: "No materials available yet.",
  library_empty_desc: "New materials will be added to the library soon.",
  library_type_partitura: "Score",
  library_type_atividade: "Music Activity",
  library_creator_vidente: "Sighted",
  library_creator_pdv: "Person with VI",
  library_creator_by: "By",
  library_filter_type: "Material Type",
  library_filter_creator: "Creator Type",
  library_filter_all_types: "All Types",
  library_filter_all_creators: "All Creators",

  contact_title: "Contact",
  contact_subtitle: "Get in touch for partnerships, information, or to receive classes",
  contact_name: "Full name",
  contact_email: "Email",
  contact_institution: "Institution (optional)",
  contact_subject: "Subject",
  contact_message: "Message",
  contact_type: "Type of interest",
  contact_type_inst: "Institutional Partnership",
  contact_type_dv: "Person with Visual Impairment",
  contact_type_nodv: "Music Educator / Student",
  contact_type_general: "General Information",
  contact_submit: "Send Message",
  contact_success: "Message sent successfully! We will get back to you soon.",
  contact_error: "Error sending message. Please try again.",

  footer_desc: "Five Steps is an inclusive music education project developed by Rafael Moreira Vanazzi de Souza, Master of Music from UNICAMP (Brazil) and diploma holder in Jacques-Dalcroze Eurhythmics (Santiago, 2018).",
  footer_links: "Links",
  footer_rights: "All rights reserved.",

  common_loading: "Loading...",
  common_error: "An error occurred. Please try again.",
  common_back: "Back",
  common_read_more: "Learn more",
  common_skip_nav: "Skip to main content",

  home_services_title: "Specialized Services",
  home_services_subtitle: "Training, consulting, and transcription in braille music notation",
  home_services_lessons: "Private Lessons",
  home_services_lessons_desc: "Individual or group lessons (online) in braille music notation for musicians with VI and educators.",
  home_services_workshops: "Workshops & Lectures",
  home_services_workshops_desc: "In-person or online training for universities, conservatories, and events.",
  home_services_transcription: "Score Transcription",
  home_services_transcription_desc: "Professional transcription of print scores to braille music notation, any complexity level.",
  home_services_consulting: "Institutional Consulting",
  home_services_consulting_desc: "Accessibility assessment and training in braille music for schools, conservatories, and universities.",
  home_services_languages: "Available in Portuguese and Spanish",
  home_services_cta: "Request a Quote",
};

const es: Translations = {
  nav_home: "Inicio",
  nav_about: "El Método Five Steps",
  nav_institutions: "Para Instituciones",
  nav_musicians_dv: "Para Personas con DV",
  nav_musicians_nodv: "Para Educadores de Música",
  nav_library: "Biblioteca",
  nav_activities: "Clases y Actividades",
  nav_forum: "Foro",
  nav_contact: "Contacto",
  nav_login: "Iniciar Sesión",
  nav_logout: "Cerrar Sesión",
  nav_admin: "Administración",

  home_hero_title: "Five Steps",
  home_hero_subtitle: "Vivencia musical para personas con discapacidad visual, fundamentada en la musicografía Braille",
  home_hero_cta: "Explorar la Biblioteca",
  home_hero_cta2: "Conocer el Método",

  home_mission_title: "Nuestra Misión",
  home_mission_desc: "Llevar la vivencia musical a personas con discapacidad visual a través de principios pedagógicos fundamentados en la musicografía Braille. No se trata solo de enseñar a leer partituras — se trata de crear una experiencia musical que parte del universo táctil y cognitivo de la persona con DV, generando una conexión más profunda con la música que cualquier enfoque adaptado de la enseñanza convencional.",
  home_dream_title: "El Sueño del Proyecto",
  home_dream_desc: "Crear escuelas donde todos los profesores sean personas con discapacidad visual, enseñando música a estudiantes con o sin DV, y creando sus propias actividades adaptadas. El método Five Steps estructura cómo este sueño puede hacerse realidad en la práctica — de forma progresiva, científica y replicable.",

  home_evidence_title: "Comprobado en la Práctica",
  home_evidence_desc: "Hemos observado repetidamente en clases prácticas que los materiales didácticos basados en las particularidades de la musicografía Braille aceleran el aprendizaje musical de las personas con DV. Cuando las actividades son creadas por personas con DV, el impacto es aún mayor: comprenden el Braille desde adentro y, al explicarse entre sí, usan un lenguaje que hace el entendimiento más natural y directo que cuando la explicación proviene de un músico vidente.",
  home_evidence_article: "Artículo: \"Didáctica musical para alumnos con discapacidad visual: material didáctico musical y dinámicas especiales\" — Rafael Vanazzi y Raphael Ota",
  home_evidence_thesis: "Disertación de Maestría (UNICAMP): \"Particularidades de la Musicografía Braille para el Auxilio de Nuevas Metodologías de Enseñanza\" — Rafael Vanazzi",

  home_community_title: "Una Comunidad Global",
  home_community_forum: "Foro Internacional",
  home_community_forum_desc: "Un espacio de intercambio entre profesores, músicos con DV y educadores de todo el mundo, en portugués, inglés y español.",
  home_community_library: "Biblioteca Digital",
  home_community_library_desc: "Partituras y actividades musicales clasificadas según los 5 Grados y 23 etapas del método Five Steps.",

  home_what_title: "¿Qué es Five Steps?",
  home_what_desc: "Five Steps es un marco metodológico desarrollado a partir de una disertación de maestría en UNICAMP, que organiza la musicografía Braille en 5 Grados de Dificultad y 23 etapas progresivas. Fundamentado en la psicología cognitiva de John Sloboda y en los principios de la Rítmica Jacques-Dalcroze, el método mapea paso a paso lo que el estudiante necesita comprender para vivenciar y leer música en Braille con excelencia.",
  home_grades_title: "Los 5 Grados de Dificultad",
  home_grade1_title: "Grado 1 — Notas y Alturas",
  home_grade1_desc: "2 etapas. Fundamentos de la lectura de notas y sus alturas en la musicografía Braille.",
  home_grade2_title: "Grado 2 — Tiempo",
  home_grade2_desc: "5 etapas. Comprensión de las figuras rítmicas y organización temporal de la música.",
  home_grade3_title: "Grado 3 — Intervalos Diatónicos y Octavas",
  home_grade3_desc: "5 etapas. Lectura de intervalos y navegación entre octavas en la partitura Braille.",
  home_grade4_title: "Grado 4 — Intervalos Cromáticos e Inversiones",
  home_grade4_desc: "3 etapas. Dominio de accidentales, cromatismo e inversiones de intervalos.",
  home_grade5_title: "Grado 5 — Tópicos Diversos",
  home_grade5_desc: "8 etapas. Percepción bidimensional, contrapunto, poliritmia, armonía y solfeo.",
  home_who_title: "¿Para quién es Five Steps?",
  home_who_dv: "Personas con Discapacidad Visual",
  home_who_dv_desc: "Vivencia musical práctica fundamentada en el Braille, sin necesidad de leer partituras. Para músicos con DV: capacitación para enseñar con autonomía.",
  home_who_nodv: "Educadores y Estudiantes de Música",
  home_who_nodv_desc: "Formación en musicografía Braille para transcribir partituras y crear actividades adaptadas — comprobadamente enriquecedora para licenciandos y musicoterapeutas.",
  home_who_inst: "Instituciones",
  home_who_inst_desc: "Universidades, escuelas de música y casas de cultura que desean ofrecer formación musical inclusiva de base científica.",
  home_cta_title: "Únete a esta comunidad global",
  home_cta_desc: "Accede a la biblioteca de materiales organizados por las 23 etapas o ponte en contacto para una asociación.",
  home_cta_library: "Acceder a la Biblioteca",
  home_cta_contact: "Contáctanos",

  about_title: "El Método Five Steps",
  about_subtitle: "Un marco pedagógico para la educación musical fundamentada en la musicografía Braille",
  about_origin_title: "El Origen del Método",
  about_origin_desc: "Five Steps nació de la observación de una injusticia: al transcribirse a la musicografía Braille, los exámenes de acceso a la universidad en música se volvían artificialmente más difíciles para candidatos con discapacidad visual, ya que incluían conceptos que podrían evitarse o introducirse gradualmente. Este hallazgo motivó la disertación de maestría de Rafael Vanazzi en UNICAMP — \"Particularidades de la Musicografía Braille para el Auxilio de Nuevas Metodologías de Enseñanza\" — que resultó en un mapa completo de lo que el lector Braille necesita dominar para leer partituras con excelencia.",
  about_sloboda_title: "Fundamentación Científica — John Sloboda",
  about_sloboda_desc: "El método se fundamenta en la psicología cognitiva del musicólogo británico John Sloboda, especialmente en su trabajo sobre cómo los músicos procesan y leen partituras. Aplicando estos conceptos al contexto táctil de la musicografía Braille, Five Steps mapea los procesos cognitivos célula por célula, asegurando que cada etapa prepare al estudiante para la siguiente.",
  about_dalcroze_title: "Fundamentación Pedagógica — Rítmica Jacques-Dalcroze",
  about_dalcroze_desc: "El método también se apoya en los principios de la Rítmica Jacques-Dalcroze, un enfoque pedagógico que integra el movimiento corporal, la percepción rítmica y la expresión musical. Rafael Vanazzi es diplomado en Rítmica Jacques-Dalcroze (2018, Santiago — Chile), en un curso reconocido por el Institut Jacques-Dalcroze de Suiza. Esta formación influye directamente en cómo se estructuran las actividades de Five Steps: partiendo de la experiencia corporal y sensorial antes de llegar a la lectura formal.",
  about_grades_title: "Los 5 Grados y sus Etapas",
  about_complementary_title: "Contenidos Complementarios",
  about_complementary_desc: "Además de los 5 Grados, el método incluye una matriz de Contenidos Complementarios que deben abordarse a lo largo de todos los grados, según sea necesario para el estudiante. Estos contenidos varían según el instrumento (piano, flauta, violín, etc.) e incluyen: matices, ligaduras, digitaciones, dinámicas, ornamentación, repeticiones, abreviación de secuencias y duplicación de símbolos.",
  about_platform_title: "La Visión de la Plataforma Global",
  about_platform_desc: "Five Steps aspira a convertirse en un centro mundial donde profesores de musicografía Braille de todo el mundo puedan compartir y organizar actividades didácticas por las 23 etapas. Al completar todas las etapas, el estudiante debe alcanzar un nivel intermedio/avanzado de lectura musical en Braille, equivalente al de un músico profesional.",

  inst_title: "Para Instituciones",
  inst_subtitle: "Ofrece educación musical inclusiva con fundamentos científicos y pedagógicos comprobados",
  inst_why_title: "¿Por qué ofrecer Five Steps?",
  inst_why_desc: "La musicografía Braille es un área de conocimiento especializado y escaso. Al adoptar el método Five Steps, tu institución comienza a ofrecer una formación estructurada, basada en investigación académica (UNICAMP) y con resultados prácticos comprobados, que beneficia tanto a estudiantes con discapacidad visual como a profesores de música que desean ampliar su práctica pedagógica.",
  inst_offer_title: "Lo que ofrecemos",
  inst_offer_1: "Clases y talleres de musicografía Braille para estudiantes con discapacidad visual",
  inst_offer_2: "Formación de profesores para la aplicación del método Five Steps",
  inst_offer_3: "Consultoría para la adaptación de materiales didácticos musicales",
  inst_offer_4: "Conferencias y talleres sobre educación musical inclusiva",
  inst_types_title: "Tipos de Instituciones",
  inst_type_univ: "Universidades y Conservatorios",
  inst_type_school: "Escuelas de Música",
  inst_type_culture: "Casas de Cultura y Centros Culturales",
  inst_type_ngo: "ONGs e Institutos de Inclusión",
  inst_cta: "Ponerse en Contacto",

  dv_title: "Para Personas con Discapacidad Visual",
  dv_subtitle: "Vivencia musical práctica, sin necesidad de leer partituras en Braille",
  dv_what_title: "Un enfoque diferente",
  dv_what_desc: "Five Steps ofrece clases didácticas prácticas fundamentadas en la musicografía Braille — pero sin exigir que el estudiante lea partituras. El objetivo es crear una vivencia musical que parte del universo táctil y cognitivo de la persona con DV, usando los principios del Braille como base pedagógica. Esto genera una conexión con la música mucho más natural y profunda que los enfoques adaptados de la enseñanza convencional.",
  dv_benefits_title: "Lo que encontrarás",
  dv_benefit_1: "Clases prácticas que respetan y parten del universo de la persona con DV",
  dv_benefit_2: "Progresión clara: cada etapa prepara para la siguiente, sin lagunas",
  dv_benefit_3: "Autonomía: al avanzar en las etapas, desarrollas independencia musical real",
  dv_benefit_4: "Biblioteca de actividades organizadas por grado para práctica autónoma",
  dv_journey_title: "El Viaje de Aprendizaje",
  dv_cta: "Acceder a la Biblioteca de Materiales",
  dv_teacher_title: "Para Músicos con DV que Enseñan",
  dv_teacher_desc: "Si eres músico con discapacidad visual y deseas enseñar, Five Steps ofrece una estructura clara para crear tus propias actividades y aplicarlas con estudiantes con o sin DV. Los profesores con DV tienen una perspectiva única: al explicar la música desde el Braille, el lenguaje utilizado es más directo y natural para otros estudiantes con DV — algo que hemos observado repetidamente en clases prácticas. El proyecto apoya e impulsa esta forma de enseñar.",

  nodv_title: "Para Educadores y Estudiantes de Música",
  nodv_subtitle: "Amplía tu formación con la musicografía Braille — resultados comprobados",
  nodv_why_title: "¿Por qué aprender musicografía Braille?",
  nodv_why_desc: "Las clases de musicografía Braille para músicos videntes no son solo sobre inclusión — son sobre ampliar la visión pedagógica. Hemos observado en experiencias prácticas que estudiantes de licenciatura musical, musicoterapia y áreas afines que pasan por la formación en musicografía Braille desarrollan una comprensión más profunda de los fundamentos musicales y una capacidad pedagógica más versátil. Aprenderás a transcribir partituras y a crear actividades musicales adaptadas según los principios de Five Steps.",
  nodv_how_title: "Lo que aprenderás",
  nodv_how_1: "Leer y escribir en musicografía Braille con el método Five Steps",
  nodv_how_2: "Transcribir partituras convencionales al formato Braille",
  nodv_how_3: "Crear actividades musicales adaptadas clasificadas por las 23 etapas",
  nodv_impact_title: "Para quién es esta formación",
  nodv_impact_desc: "Especialmente recomendada para graduandos y graduados en licenciatura musical, musicoterapia y áreas afines. También para músicos profesionales que deseen trabajar con estudiantes con discapacidad visual o contribuir a la biblioteca colaborativa de la plataforma.",
  nodv_cta: "Quiero Formarme",
  nodv_volunteer_title: "Sé Voluntario de Transcripción",
  nodv_volunteer_desc: "Estamos formando un grupo de músicos videntes voluntarios para transcribir partituras convencionales en musicografía Braille. Cada partitura transcrita amplía la biblioteca disponible para músicos con discapacidad visual en todo el mundo. No se requiere experiencia previa — el método Five Steps te guía paso a paso.",
  nodv_volunteer_cta: "Quiero ser voluntario",
  nodv_volunteer_contact_cta: "Hablar con el equipo",

  lib_title: "Biblioteca de Materiales",
  lib_subtitle: "Materiales didácticos organizados por los 5 Grados y 23 etapas del método",
  lib_login_required: "Inicia sesión para acceder a la biblioteca completa y descargar materiales.",
  lib_login_cta: "Inicia Sesión para Acceder",
  lib_grade_label: "Grado",
  lib_stage_label: "Etapa",
  lib_download: "Descargar",
  lib_upload: "Enviar Material",
  lib_no_materials: "Ningún material disponible en este grado aún.",
  lib_filter_all: "Todos los Grados",
  lib_file_size: "Tamaño",
  lib_language: "Idioma",
  lib_lang_pt: "Portugués",
  lib_lang_en: "Inglés",
  lib_lang_both: "Bilingüe",
  library_title: "Biblioteca de Materiales",
  library_subtitle: "Partituras y actividades musicales clasificadas según los 5 Grados y 23 etapas del método Five Steps",
  library_login_required: "Inicia sesión para descargar este material.",
  library_login_banner: "Regístrate gratuitamente para acceder y descargar todos los materiales de la biblioteca.",
  library_login: "Inicia Sesión / Registrarse",
  library_download: "Descargar",
  library_all: "Todos los Grados",
  library_grade: "Grado",
  library_empty: "Ningún material disponible aún.",
  library_empty_desc: "Pronto se añadirán nuevos materiales a la biblioteca.",
  library_type_partitura: "Partitura",
  library_type_atividade: "Actividad de Musicalización",
  library_creator_vidente: "Vidente",
  library_creator_pdv: "Persona con DV",
  library_creator_by: "Por",
  library_filter_type: "Tipo de Material",
  library_filter_creator: "Tipo de Creador",
  library_filter_all_types: "Todos los Tipos",
  library_filter_all_creators: "Todos los Creadores",

  contact_title: "Contacto",
  contact_subtitle: "Ponte en contacto para asociaciones, información o para recibir clases",
  contact_name: "Nombre completo",
  contact_email: "Correo Electrónico",
  contact_institution: "Institución (opcional)",
  contact_subject: "Asunto",
  contact_message: "Mensaje",
  contact_type: "Tipo de interés",
  contact_type_inst: "Asociación Institucional",
  contact_type_dv: "Persona con Discapacidad Visual",
  contact_type_nodv: "Educador / Estudiante de Música",
  contact_type_general: "Información General",
  contact_submit: "Enviar Mensaje",
  contact_success: "¡Mensaje enviado exitosamente! Nos comunicaremos pronto.",
  contact_error: "Error al enviar el mensaje. Por favor, intenta de nuevo.",

  footer_desc: "Five Steps es un proyecto de educación musical inclusiva desarrollado por Rafael Moreira Vanazzi de Souza, Maestro en Música por UNICAMP (Brasil) y diplomado en Rítmica Jacques-Dalcroze (Santiago, 2018).",
  footer_links: "Enlaces",
  footer_rights: "Todos los derechos reservados.",

  common_loading: "Cargando...",
  common_error: "Ocurrió un error. Por favor, intenta de nuevo.",
  common_back: "Atrás",
  common_read_more: "Saber más",
  common_skip_nav: "Saltar al contenido principal",

  home_services_title: "Servicios Especializados",
  home_services_subtitle: "Formación, consultoría y transcripción en musicografía braille",
  home_services_lessons: "Clases Particulares",
  home_services_lessons_desc: "Clases individuales o grupales (online) de musicografía braille para músicos con DV y educadores.",
  home_services_workshops: "Talleres y Conferencias",
  home_services_workshops_desc: "Formaciones presenciales u online para universidades, conservatorios y eventos.",
  home_services_transcription: "Transcripción de Partituras",
  home_services_transcription_desc: "Transcripción profesional de partituras en tinta a musicografía braille, cualquier complejidad.",
  home_services_consulting: "Consultoría Institucional",
  home_services_consulting_desc: "Diagnóstico y capacitación en accesibilidad musical para escuelas, conservatorios y universidades.",
  home_services_languages: "Disponible en portugués y español",
  home_services_cta: "Solicitar Presupuesto",
};

type LanguageContextType = {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: Translations;
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguage] = useState<Language>(() => {
    const saved = localStorage.getItem("five_steps_lang");
    return (saved as Language) || "pt";
  });

  const handleSetLanguage = (lang: Language) => {
    setLanguage(lang);
    localStorage.setItem("five_steps_lang", lang);
    // WCAG: Sync HTML lang attribute for screen readers
    const langMap: Record<Language, string> = { pt: "pt-BR", en: "en", es: "es" };
    document.documentElement.lang = langMap[lang];
  };

  // Sync lang on initial load
  React.useEffect(() => {
    const langMap: Record<Language, string> = { pt: "pt-BR", en: "en", es: "es" };
    document.documentElement.lang = langMap[language];
  }, [language]);

  const t = language === "pt" ? pt : language === "en" ? en : es;

  return (
    <LanguageContext.Provider value={{ language, setLanguage: handleSetLanguage, t }}>
      {children}
      {/* WCAG: Live region for screen reader announcements */}
      <div
        id="a11y-announcer"
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
      />
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useLanguage must be used within LanguageProvider");
  return ctx;
}
