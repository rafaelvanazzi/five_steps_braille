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

  // About
  about_title: string;
  about_subtitle: string;
  about_origin_title: string;
  about_origin_desc: string;
  about_sloboda_title: string;
  about_sloboda_desc: string;
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

  // Musicians DV
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

  // Musicians no DV
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
  nav_about: "Sobre o Método",
  nav_institutions: "Para Instituições",
  nav_musicians_dv: "Para Músicos com DV",
  nav_musicians_nodv: "Para Músicos sem DV",
  nav_library: "Acervo",
  nav_activities: "Aulas e Atividades",
  nav_forum: "Fórum",
  nav_contact: "Contato",
  nav_login: "Entrar",
  nav_logout: "Sair",
  nav_admin: "Administração",

  home_hero_title: "Five Steps",
  home_hero_subtitle: "Uma arquitetura pedagógica global para a alfabetização musical em Braille",
  home_hero_cta: "Explorar o Acervo",
  home_hero_cta2: "Conhecer o Método",
  home_what_title: "O que é o Five Steps?",
  home_what_desc: "O Five Steps é um framework metodológico desenvolvido a partir de pesquisa de mestrado na UNICAMP, que organiza a musicografia Braille em 5 Graus de Dificuldade e 23 etapas progressivas. Fundamentado na psicologia cognitiva de John Sloboda, o método mapeia passo a passo o que o leitor Braille precisa compreender para ler diferentes partituras com excelência.",
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
  home_who_dv: "Músicos com Deficiência Visual",
  home_who_dv_desc: "Um caminho estruturado para atingir excelência na leitura de partituras em Braille.",
  home_who_nodv: "Músicos sem Deficiência Visual",
  home_who_nodv_desc: "Contribua gerando e organizando material didático que beneficia toda a comunidade.",
  home_who_inst: "Instituições",
  home_who_inst_desc: "Universidades, escolas de música e casas de cultura que desejam oferecer formação inclusiva.",
  home_cta_title: "Faça parte desta comunidade global",
  home_cta_desc: "Acesse o acervo de materiais organizados pelas 23 etapas ou entre em contato para uma parceria.",
  home_cta_library: "Acessar o Acervo",
  home_cta_contact: "Fale Conosco",

  about_title: "Sobre o Método Five Steps",
  about_subtitle: "Uma taxonomia completa para o ensino da musicografia Braille",
  about_origin_title: "A Origem do Método",
  about_origin_desc: "O Five Steps nasceu da observação de uma injustiça: ao serem transcritas para a musicografia Braille, as provas de vestibular em música tornavam-se artificialmente mais difíceis para candidatos com deficiência visual, pois incluíam conceitos que poderiam ser evitados ou introduzidos de forma gradual. Essa constatação motivou uma pesquisa de mestrado na UNICAMP (Universidade Estadual de Campinas) que resultou em um mapa completo do que o leitor Braille precisa dominar para ler partituras com excelência.",
  about_sloboda_title: "Fundamentação Científica",
  about_sloboda_desc: "O método é fundamentado na psicologia cognitiva do musicólogo britânico John Sloboda, especialmente em sua obra sobre como os músicos processam e leem partituras. Aplicando esses conceitos ao contexto tátil da musicografia Braille, o Five Steps mapeia os processos cognitivos célula por célula, garantindo que cada etapa prepare o aluno para a seguinte.",
  about_grades_title: "Os 5 Graus e suas Etapas",
  about_complementary_title: "Conteúdos Complementares",
  about_complementary_desc: "Além dos 5 Graus, o método inclui uma grade de Conteúdos Complementares que devem ser abordados ao longo de todos os graus, conforme a necessidade do aluno. Esses conteúdos variam de acordo com o instrumento (piano, flauta, violino, etc.) e incluem: nuances, ligaduras, dedilhados, dinâmicas, ornamentação, repetições, abreviação de sequências e duplicação de símbolos.",
  about_platform_title: "A Visão da Plataforma Global",
  about_platform_desc: "O Five Steps aspira a se tornar um hub mundial onde professores de musicografia Braille de todo o mundo possam compartilhar e organizar atividades didáticas pelas 23 etapas. Ao completar todas as etapas, o aluno deve atingir um nível médio/avançado de leitura musical em Braille, equivalente ao de um músico profissional.",

  inst_title: "Para Instituições",
  inst_subtitle: "Ofereça formação musical inclusiva com o método Five Steps",
  inst_why_title: "Por que oferecer o Five Steps?",
  inst_why_desc: "A musicografia Braille é uma área de conhecimento especializado e escasso. Ao adotar o método Five Steps, sua instituição passa a oferecer uma formação estruturada, baseada em pesquisa acadêmica, que beneficia tanto alunos com deficiência visual quanto professores de música que desejam ampliar sua atuação.",
  inst_offer_title: "O que oferecemos",
  inst_offer_1: "Aulas e oficinas de musicografia Braille para alunos com deficiência visual",
  inst_offer_2: "Formação de professores para aplicação do método Five Steps",
  inst_offer_3: "Consultoria para adaptação de materiais didáticos musicais",
  inst_offer_4: "Palestras e workshops sobre inclusão musical",
  inst_types_title: "Tipos de Instituições",
  inst_type_univ: "Universidades e Conservatórios",
  inst_type_school: "Escolas de Música",
  inst_type_culture: "Casas de Cultura e Centros Culturais",
  inst_type_ngo: "ONGs e Institutos de Inclusão",
  inst_cta: "Entrar em Contato",

  dv_title: "Para Músicos com Deficiência Visual",
  dv_subtitle: "Um caminho estruturado para a excelência musical",
  dv_what_title: "O que é a musicografia Braille?",
  dv_what_desc: "A musicografia Braille é o sistema de notação musical adaptado para pessoas com deficiência visual, baseado no código Braille. Permite que músicos cegos leiam e escrevam partituras com a mesma riqueza de informação que a notação musical convencional. O Five Steps organiza o aprendizado desse sistema de forma progressiva e cientificamente fundamentada.",
  dv_benefits_title: "Como o Five Steps ajuda",
  dv_benefit_1: "Progressão clara: cada etapa prepara para a seguinte, sem lacunas de aprendizado",
  dv_benefit_2: "Fundamentação cognitiva: baseado em como o cérebro processa a música",
  dv_benefit_3: "Independência: ao completar as 23 etapas, o músico lê qualquer partitura",
  dv_benefit_4: "Acesso ao acervo: materiais organizados por grau para prática autônoma",
  dv_journey_title: "A Jornada de Aprendizado",
  dv_cta: "Acessar o Acervo de Materiais",

  nodv_title: "Para Músicos sem Deficiência Visual",
  nodv_subtitle: "Contribua para uma comunidade musical mais inclusiva",
  nodv_why_title: "Por que aprender musicografia Braille?",
  nodv_why_desc: "Músicos sem deficiência visual que aprendem musicografia Braille ampliam sua capacidade de ensinar e colaborar com músicos cegos. Além disso, ao criar e organizar materiais didáticos de acordo com o método Five Steps, contribuem diretamente para a construção de um acervo global que beneficia toda a comunidade.",
  nodv_how_title: "Como você pode contribuir",
  nodv_how_1: "Aprender a ler e escrever em musicografia Braille com o método Five Steps",
  nodv_how_2: "Criar exercícios e materiais didáticos organizados pelas 23 etapas",
  nodv_how_3: "Compartilhar materiais no acervo colaborativo da plataforma",
  nodv_impact_title: "O Impacto da sua Contribuição",
  nodv_impact_desc: "Cada material que você cria e organiza de acordo com as etapas do Five Steps pode ser usado por professores e alunos em todo o mundo. Sua contribuição ajuda a construir o maior acervo colaborativo de musicografia Braille já criado.",
  nodv_cta: "Começar a Contribuir",

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
  library_subtitle: "Materiais didáticos organizados pelos 5 Graus e 23 etapas do método Five Steps",
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
  contact_type_dv: "Músico com Deficiência Visual",
  contact_type_nodv: "Músico sem Deficiência Visual",
  contact_type_general: "Informações Gerais",
  contact_submit: "Enviar Mensagem",
  contact_success: "Mensagem enviada com sucesso! Retornaremos em breve.",
  contact_error: "Erro ao enviar mensagem. Por favor, tente novamente.",

  footer_desc: "Five Steps é uma metodologia de ensino de musicografia Braille desenvolvida por Rafael Moreira Vanazzi de Souza, Mestre em Música pela UNICAMP.",
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
  nav_about: "About the Method",
  nav_institutions: "For Institutions",
  nav_musicians_dv: "For Musicians with VI",
  nav_musicians_nodv: "For Musicians without VI",
  nav_library: "Library",
  nav_activities: "Classes & Activities",
  nav_forum: "Forum",
  nav_contact: "Contact",
  nav_login: "Sign In",
  nav_logout: "Sign Out",
  nav_admin: "Administration",

  home_hero_title: "Five Steps",
  home_hero_subtitle: "A global pedagogical architecture for Braille music literacy",
  home_hero_cta: "Explore the Library",
  home_hero_cta2: "Learn the Method",
  home_what_title: "What is Five Steps?",
  home_what_desc: "Five Steps is a methodological framework developed from Master's research at UNICAMP (Brazil), organizing Braille Music Notation into 5 Difficulty Grades and 23 progressive stages. Grounded in John Sloboda's cognitive psychology, the method maps step by step what the Braille reader needs to understand to read different scores with excellence.",
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
  home_who_dv: "Musicians with Visual Impairment",
  home_who_dv_desc: "A structured path to achieve excellence in reading Braille music scores.",
  home_who_nodv: "Musicians without Visual Impairment",
  home_who_nodv_desc: "Contribute by generating and organizing teaching materials that benefit the entire community.",
  home_who_inst: "Institutions",
  home_who_inst_desc: "Universities, music schools, and cultural centers wishing to offer inclusive music education.",
  home_cta_title: "Join this global community",
  home_cta_desc: "Access the library of materials organized by the 23 stages or get in touch for a partnership.",
  home_cta_library: "Access the Library",
  home_cta_contact: "Contact Us",

  about_title: "About the Five Steps Method",
  about_subtitle: "A complete taxonomy for teaching Braille music notation",
  about_origin_title: "The Origin of the Method",
  about_origin_desc: "Five Steps was born from the observation of an injustice: when transcribed into Braille music notation, university entrance exams in music became artificially more difficult for visually impaired candidates, as they included concepts that could be avoided or introduced gradually. This finding motivated Master's research at UNICAMP (State University of Campinas, Brazil) that resulted in a complete map of what the Braille reader needs to master to read scores with excellence.",
  about_sloboda_title: "Scientific Foundation",
  about_sloboda_desc: "The method is grounded in the cognitive psychology of British musicologist John Sloboda, especially his work on how musicians process and read scores. Applying these concepts to the tactile context of Braille music notation, Five Steps maps cognitive processes cell by cell, ensuring each stage prepares the student for the next.",
  about_grades_title: "The 5 Grades and Their Stages",
  about_complementary_title: "Complementary Content",
  about_complementary_desc: "In addition to the 5 Grades, the method includes a grid of Complementary Content that should be addressed throughout all grades, as needed by the student. These contents vary according to the instrument (piano, flute, violin, etc.) and include: nuances, slurs, fingerings, dynamics, ornamentation, repetitions, sequence abbreviation, and symbol duplication.",
  about_platform_title: "The Global Platform Vision",
  about_platform_desc: "Five Steps aspires to become a worldwide hub where Braille music teachers from around the world can share and organize teaching activities by the 23 stages. Upon completing all stages, the student should reach an intermediate/advanced level of Braille music reading, equivalent to that of a professional musician.",

  inst_title: "For Institutions",
  inst_subtitle: "Offer inclusive music education with the Five Steps method",
  inst_why_title: "Why offer Five Steps?",
  inst_why_desc: "Braille music notation is a specialized and scarce area of knowledge. By adopting the Five Steps method, your institution begins to offer structured, research-based training that benefits both visually impaired students and music teachers who wish to expand their practice.",
  inst_offer_title: "What we offer",
  inst_offer_1: "Braille music notation classes and workshops for visually impaired students",
  inst_offer_2: "Teacher training for applying the Five Steps method",
  inst_offer_3: "Consulting for adapting musical teaching materials",
  inst_offer_4: "Lectures and workshops on musical inclusion",
  inst_types_title: "Types of Institutions",
  inst_type_univ: "Universities and Conservatories",
  inst_type_school: "Music Schools",
  inst_type_culture: "Cultural Centers",
  inst_type_ngo: "NGOs and Inclusion Institutes",
  inst_cta: "Get in Touch",

  dv_title: "For Musicians with Visual Impairment",
  dv_subtitle: "A structured path to musical excellence",
  dv_what_title: "What is Braille music notation?",
  dv_what_desc: "Braille music notation is the musical notation system adapted for visually impaired people, based on the Braille code. It allows blind musicians to read and write scores with the same richness of information as conventional musical notation. Five Steps organizes the learning of this system in a progressive and scientifically grounded way.",
  dv_benefits_title: "How Five Steps helps",
  dv_benefit_1: "Clear progression: each stage prepares for the next, with no learning gaps",
  dv_benefit_2: "Cognitive foundation: based on how the brain processes music",
  dv_benefit_3: "Independence: upon completing the 23 stages, the musician reads any score",
  dv_benefit_4: "Library access: materials organized by grade for autonomous practice",
  dv_journey_title: "The Learning Journey",
  dv_cta: "Access the Materials Library",

  nodv_title: "For Musicians without Visual Impairment",
  nodv_subtitle: "Contribute to a more inclusive musical community",
  nodv_why_title: "Why learn Braille music notation?",
  nodv_why_desc: "Musicians without visual impairment who learn Braille music notation expand their ability to teach and collaborate with blind musicians. Furthermore, by creating and organizing teaching materials according to the Five Steps method, they directly contribute to building a global library that benefits the entire community.",
  nodv_how_title: "How you can contribute",
  nodv_how_1: "Learn to read and write Braille music notation with the Five Steps method",
  nodv_how_2: "Create exercises and teaching materials organized by the 23 stages",
  nodv_how_3: "Share materials in the platform's collaborative library",
  nodv_impact_title: "The Impact of Your Contribution",
  nodv_impact_desc: "Each material you create and organize according to the Five Steps stages can be used by teachers and students worldwide. Your contribution helps build the largest collaborative Braille music library ever created.",
  nodv_cta: "Start Contributing",

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
  library_subtitle: "Teaching materials organized by the 5 Grades and 23 stages of the Five Steps method",
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
  contact_type_dv: "Musician with Visual Impairment",
  contact_type_nodv: "Musician without Visual Impairment",
  contact_type_general: "General Information",
  contact_submit: "Send Message",
  contact_success: "Message sent successfully! We will get back to you soon.",
  contact_error: "Error sending message. Please try again.",

  footer_desc: "Five Steps is a Braille music notation teaching methodology developed by Rafael Moreira Vanazzi de Souza, Master of Music from UNICAMP (Brazil).",
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
  nav_about: "Sobre el Método",
  nav_institutions: "Para Instituciones",
  nav_musicians_dv: "Para Músicos con DV",
  nav_musicians_nodv: "Para Músicos sin DV",
  nav_library: "Biblioteca",
  nav_activities: "Clases y Actividades",
  nav_forum: "Foro",
  nav_contact: "Contacto",
  nav_login: "Iniciar Sesión",
  nav_logout: "Cerrar Sesión",
  nav_admin: "Administración",

  home_hero_title: "Five Steps",
  home_hero_subtitle: "Una arquitectura pedagógica global para la alfabetización musical en Braille",
  home_hero_cta: "Explorar la Biblioteca",
  home_hero_cta2: "Conocer el Método",
  home_what_title: "¿Qué es Five Steps?",
  home_what_desc: "Five Steps es un marco metodológico desarrollado a partir de investigación de maestría en UNICAMP, que organiza la musicografía Braille en 5 Grados de Dificultad y 23 etapas progresivas. Fundamentado en la psicología cognitiva de John Sloboda, el método mapea paso a paso lo que el lector Braille necesita comprender para leer diferentes partituras con excelencia.",
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
  home_who_dv: "Músicos con Deficiencia Visual",
  home_who_dv_desc: "Un camino estructurado para lograr excelencia en la lectura de partituras en Braille.",
  home_who_nodv: "Músicos sin Deficiencia Visual",
  home_who_nodv_desc: "Contribuye generando y organizando material didáctico que beneficia a toda la comunidad.",
  home_who_inst: "Instituciones",
  home_who_inst_desc: "Universidades, escuelas de música y casas de cultura que desean ofrecer formación musical inclusiva.",
  home_cta_title: "Únete a esta comunidad global",
  home_cta_desc: "Accede a la biblioteca de materiales organizados por las 23 etapas o ponte en contacto para una asociación.",
  home_cta_library: "Acceder a la Biblioteca",
  home_cta_contact: "Contáctanos",

  about_title: "Sobre el Método Five Steps",
  about_subtitle: "Una taxonomía completa para la enseñanza de la musicografía Braille",
  about_origin_title: "El Origen del Método",
  about_origin_desc: "Five Steps nació de la observación de una injusticia: al transcribirse a la musicografía Braille, los exámenes de acceso a la universidad en música se volvían artificialmente más difíciles para candidatos con deficiencia visual, ya que incluían conceptos que podrían evitarse o introducirse gradualmente. Este hallazgo motivó una investigación de maestría en UNICAMP (Universidad Estatal de Campinas, Brasil) que resultó en un mapa completo de lo que el lector Braille necesita dominar para leer partituras con excelencia.",
  about_sloboda_title: "Fundamentación Científica",
  about_sloboda_desc: "El método se fundamenta en la psicología cognitiva del musicólogo británico John Sloboda, especialmente en su trabajo sobre cómo los músicos procesan y leen partituras. Aplicando estos conceptos al contexto táctil de la musicografía Braille, Five Steps mapea los procesos cognitivos célula por célula, asegurando que cada etapa prepare al estudiante para la siguiente.",
  about_grades_title: "Los 5 Grados y sus Etapas",
  about_complementary_title: "Contenidos Complementarios",
  about_complementary_desc: "Además de los 5 Grados, el método incluye una matriz de Contenidos Complementarios que deben abordarse a lo largo de todos los grados, según sea necesario para el estudiante. Estos contenidos varían según el instrumento (piano, flauta, violín, etc.) e incluyen: matices, ligaduras, digitaciones, dinámicas, ornamentación, repeticiones, abreviación de secuencias y duplicación de símbolos.",
  about_platform_title: "La Visión de la Plataforma Global",
  about_platform_desc: "Five Steps aspira a convertirse en un centro mundial donde profesores de musicografía Braille de todo el mundo puedan compartir y organizar actividades didácticas por las 23 etapas. Al completar todas las etapas, el estudiante debe alcanzar un nivel intermedio/avanzado de lectura musical en Braille, equivalente al de un músico profesional.",

  inst_title: "Para Instituciones",
  inst_subtitle: "Ofrece educación musical inclusiva con el método Five Steps",
  inst_why_title: "¿Por qué ofrecer Five Steps?",
  inst_why_desc: "La musicografía Braille es un área de conocimiento especializado y escaso. Al adoptar el método Five Steps, tu institución comienza a ofrecer formación estructurada, basada en investigación académica, que beneficia tanto a estudiantes con deficiencia visual como a profesores de música que desean ampliar su práctica.",
  inst_offer_title: "Lo que ofrecemos",
  inst_offer_1: "Clases y talleres de musicografía Braille para estudiantes con deficiencia visual",
  inst_offer_2: "Formación de profesores para la aplicación del método Five Steps",
  inst_offer_3: "Consultoría para la adaptación de materiales didácticos musicales",
  inst_offer_4: "Conferencias y talleres sobre inclusión musical",
  inst_types_title: "Tipos de Instituciones",
  inst_type_univ: "Universidades y Conservatorios",
  inst_type_school: "Escuelas de Música",
  inst_type_culture: "Casas de Cultura y Centros Culturales",
  inst_type_ngo: "ONGs e Institutos de Inclusión",
  inst_cta: "Ponerse en Contacto",

  dv_title: "Para Músicos con Deficiencia Visual",
  dv_subtitle: "Un camino estructurado hacia la excelencia musical",
  dv_what_title: "¿Qué es la musicografía Braille?",
  dv_what_desc: "La musicografía Braille es el sistema de notación musical adaptado para personas con deficiencia visual, basado en el código Braille. Permite que los músicos ciegos lean y escriban partituras con la misma riqueza de información que la notación musical convencional. Five Steps organiza el aprendizaje de este sistema de forma progresiva y científicamente fundamentada.",
  dv_benefits_title: "Cómo Five Steps ayuda",
  dv_benefit_1: "Progresión clara: cada etapa prepara para la siguiente, sin lagunas de aprendizaje",
  dv_benefit_2: "Fundamentación cognitiva: basado en cómo el cerebro procesa la música",
  dv_benefit_3: "Independencia: al completar las 23 etapas, el músico lee cualquier partitura",
  dv_benefit_4: "Acceso a la biblioteca: materiales organizados por grado para práctica autónoma",
  dv_journey_title: "El Viaje de Aprendizaje",
  dv_cta: "Acceder a la Biblioteca de Materiales",

  nodv_title: "Para Músicos sin Deficiencia Visual",
  nodv_subtitle: "Contribuye a una comunidad musical más inclusiva",
  nodv_why_title: "¿Por qué aprender musicografía Braille?",
  nodv_why_desc: "Los músicos sin deficiencia visual que aprenden musicografía Braille amplían su capacidad de enseñar y colaborar con músicos ciegos. Además, al crear y organizar materiales didácticos de acuerdo con el método Five Steps, contribuyen directamente a la construcción de una biblioteca global que beneficia a toda la comunidad.",
  nodv_how_title: "Cómo puedes contribuir",
  nodv_how_1: "Aprende a leer y escribir en musicografía Braille con el método Five Steps",
  nodv_how_2: "Crea ejercicios y materiales didácticos organizados por las 23 etapas",
  nodv_how_3: "Comparte materiales en la biblioteca colaborativa de la plataforma",
  nodv_impact_title: "El Impacto de tu Contribución",
  nodv_impact_desc: "Cada material que creas y organices de acuerdo con las etapas de Five Steps puede ser utilizado por profesores y estudiantes en todo el mundo. Tu contribución ayuda a construir la biblioteca colaborativa de musicografía Braille más grande jamás creada.",
  nodv_cta: "Comenzar a Contribuir",

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
  library_subtitle: "Materiales didácticos organizados por los 5 Grados y 23 etapas del método Five Steps",
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
  contact_type_dv: "Músico con Deficiencia Visual",
  contact_type_nodv: "Músico sin Deficiencia Visual",
  contact_type_general: "Información General",
  contact_submit: "Enviar Mensaje",
  contact_success: "¡Mensaje enviado exitosamente! Nos comunicaremos pronto.",
  contact_error: "Error al enviar el mensaje. Por favor, intenta de nuevo.",

  footer_desc: "Five Steps es una metodología de enseñanza de musicografía Braille desarrollada por Rafael Moreira Vanazzi de Souza, Maestro en Música por UNICAMP (Brasil).",
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
