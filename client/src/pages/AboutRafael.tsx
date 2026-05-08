import { useLanguage } from "@/contexts/LanguageContext";
import SiteLayout from "@/components/SiteLayout";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import {
  GraduationCap, BookOpen, Mic, Music2, Globe,
  ArrowRight, FileText, Users, Award, Camera,
} from "lucide-react";
import { useAuth } from "@/_core/hooks/useAuth";

// ─── Static multilingual content ────────────────────────────────────────────

const content = {
  pt: {
    hero_title: "Rafael Vanazzi",
    hero_subtitle: "Músico, pesquisador e educador musical especializado em Musicografia Braille",
    bio_title: "Sobre Rafael",
    bio: "Rafael Moreira Vanazzi de Souza é músico, pesquisador e educador musical brasileiro com mais de vinte anos de experiência dedicados à Musicografia Braille e à educação musical inclusiva. Sua trajetória combina rigor acadêmico, formação pedagógica internacional e prática direta com músicos videntes e pessoas com deficiência visual (PDV) em universidades, centros de reabilitação e secretarias de cultura no Brasil.",
    formation_title: "Formação Acadêmica e Pedagógica",
    formation: [
      {
        title: "Mestrado em Música — UNICAMP",
        detail: "Dissertação: Particularidades da Musicografia Braille para o Auxílio de Novas Metodologias de Ensino (2014). Trabalho pioneiro que mapeia os processos cognitivos da leitura musical em Braille célula por célula, fundamentando novas abordagens pedagógicas para músicos com e sem deficiência visual.",
        year: "2014",
        url: "https://d2xsxph8kpxj0f.cloudfront.net/310519663185498023/nVUTu2sZHxzgC6GJeZdNgr/dissertacao_mestrado_rafael_vanazzi_051fb0c3.pdf",
        url_label: "Ler a dissertação (PDF)",
      },
      {
        title: "Diplomado em Metodologia Rítmica Jaques-Dalcroze",
        detail: "Escuela Moderna de Música de Santiago, Chile (2017–2018). Curso autorizado pela Fondation de l'Institut Jaques-Dalcroze, Suíça. Formação com os professores Iramar Rodrigues, Pablo Cernik e Alazne Arana.",
        year: "2018",
      },
      {
        title: "Graduação em Música — Habilitação em Composição",
        detail: "UNICAMP — Campinas, SP (2007).",
        year: "2007",
      },
    ],
    braille_title: "Experiência em Musicografia Braille",
    braille: [
      "Professor e consultor em Musicografia Braille desde 2006, com artigos e dissertação de mestrado citados em estudos da área.",
      "Coordenação de aulas para PDV na UEM — Universidade Estadual de Maringá (2010), com co-orientação de estágio de graduação sobre vivências musicais para deficientes visuais.",
      "Oficinas de \"Introdução à Musicografia Braille\" na Secretaria Municipal de Cultura de Santa Bárbara d'Oeste (2006), no Centro Cultural Louis Braille de Campinas (2007) e no Centro de Prevenção à Cegueira de Americana (2009).",
      "Curso de \"Musicalização Infantil para Crianças com Deficiência Visual\" no Centro de Prevenção à Cegueira de Americana (2009).",
      "Aulas de Musicografia Braille para PDV e graduandos em música na Biblioteca Comunitária da UFSCar junto ao PROVER (2008).",
      "Curso de Extensão em Musicografia Braille promovido pelo Departamento de Música e PROPAE da UEM (2009).",
      "Coordenação do projeto de acervo de partituras em Braille aprovado pelo FICC — Fundos de Investimentos Culturais de Campinas (2007 e 2008).",
      "Transcritor Braille da prova de aptidão musical do vestibular da UEM (2009, 2010 e 2011).",
      "Palestrante no evento \"Live Temática: Processos pedagógicos e meios de fruição inclusivos em Artes\" da UFSB — Universidade Federal do Sul da Bahia (2020).",
    ],
    articles_title: "Artigos Publicados",
    articles: [
      {
        ref: "Souza, Rafael. Educação musical para deficientes visuais: experiências no ensino da musicografia braille.",
        venue: "IV Encontro de Pesquisa em Música da UEM — EPEM, Maringá, 2009.",
      },
      {
        ref: "Souza, Rafael. Diferenças na notação musical em tinta e em braille: suas implicações na sala de aula.",
        venue: "XIII Encontro Regional da ABEM Sul, Porto Alegre, 2010.",
      },
      {
        ref: "Souza, Rafael. Música para pessoas com deficiência visual: desenvolvendo a memória musical.",
        venue: "IX Encontro Regional da ABEM Nordeste, Natal, 2010.",
        url: "http://www.musica.ufrn.br/revistas/index.php/abemnordeste2010/article/view/83/43",
      },
      {
        ref: "Ota, Raphael; Souza, Rafael. A inclusão do aluno cego em aulas de música: relatos e observações.",
        venue: "XIX Congresso Nacional da ABEM, Goiânia, 2010.",
      },
      {
        ref: "Ota, Raphael; Souza, Rafael. Didática musical para alunos com deficiência visual: material didático-musical e dinâmicas especiais.",
        venue: "XIV Encontro Regional da ABEM Sul, Maringá, 2011. p. 265–275.",
      },
    ],
    other_title: "Outras Atividades Relevantes",
    other: [
      "Formador em música para professores da rede pública de Campinas nos anos de 2023 e 2025, atendendo a mais de 200 professores e agentes educacionais e mais de 4.000 crianças indiretamente.",
      "Fundador do canal YouTube Apaixonados por Acordeon, com mais de 2.000 alunos atendidos e mais de 2 milhões de visualizações desde 2018.",
      "Fundador e integrante do Grupo Encantoré (www.encantore.com), de música infantil autoral, atuando ininterruptamente desde 2011.",
    ],
    contact_title: "Entre em contato",
    contact_desc: "Para propostas de parceria, cursos, palestras ou consultoria em Musicografia Braille:",
    contact_btn: "Enviar mensagem",
    library_btn: "Explorar o Acervo",
  },
  en: {
    hero_title: "Rafael Vanazzi",
    hero_subtitle: "Musician, researcher, and music educator specialized in Braille Music Notation",
    bio_title: "About Rafael",
    bio: "Rafael Moreira Vanazzi de Souza is a Brazilian musician, researcher, and music educator with over twenty years of experience dedicated to Braille Music Notation and inclusive music education. His trajectory combines academic rigor, international pedagogical training, and direct practice with sighted musicians and visually impaired people (VIP) in universities, rehabilitation centers, and cultural secretariats across Brazil.",
    formation_title: "Academic and Pedagogical Training",
    formation: [
      {
        title: "Master's Degree in Music — UNICAMP",
        detail: "Dissertation: Particularities of Braille Music Notation for the Support of New Teaching Methodologies (2014). Pioneering work that maps the cognitive processes of Braille music reading cell by cell, grounding new pedagogical approaches for musicians with and without visual impairment.",
        year: "2014",
        url: "https://d2xsxph8kpxj0f.cloudfront.net/310519663185498023/nVUTu2sZHxzgC6GJeZdNgr/dissertacao_mestrado_rafael_vanazzi_051fb0c3.pdf",
        url_label: "Read the dissertation (PDF)",
      },
      {
        title: "Diploma in Jacques-Dalcroze Rhythmic Methodology",
        detail: "Escuela Moderna de Música de Santiago, Chile (2017–2018). Course authorized by the Fondation de l'Institut Jaques-Dalcroze, Switzerland. Training with professors Iramar Rodrigues, Pablo Cernik, and Alazne Arana.",
        year: "2018",
      },
      {
        title: "Bachelor's Degree in Music — Composition",
        detail: "UNICAMP — Campinas, SP (2007).",
        year: "2007",
      },
    ],
    braille_title: "Experience in Braille Music Notation",
    braille: [
      "Professor and consultant in Braille Music Notation since 2006, with articles and Master's dissertation cited in studies in the field.",
      "Coordination of classes for VIP at UEM — State University of Maringá (2010), with co-supervision of an undergraduate internship on musical experiences for visually impaired people.",
      "Workshops on 'Introduction to Braille Music Notation' at the Municipal Culture Secretariat of Santa Bárbara d'Oeste (2006), the Louis Braille Cultural Center of Campinas (2007), and the Visual Impairment Prevention Center of Americana (2009).",
      "Course on 'Music Education for Visually Impaired Children' at the Visual Impairment Prevention Center of Americana (2009).",
      "Braille Music Notation classes for VIP and music undergraduates at the Community Library of UFSCar alongside PROVER (2008).",
      "Extension Course in Braille Music Notation promoted by the Music Department and PROPAE of UEM (2009).",
      "Coordination of the Braille score archive project approved by FICC — Cultural Investment Funds of Campinas (2007 and 2008).",
      "Braille transcriber for the UEM university entrance music aptitude exam (2009, 2010, and 2011).",
      "Speaker at the event 'Thematic Live: Inclusive Pedagogical Processes and Means of Fruition in Arts' at UFSB — Federal University of Southern Bahia (2020).",
    ],
    articles_title: "Published Articles",
    articles: [
      {
        ref: "Souza, Rafael. Music education for visually impaired people: experiences in teaching Braille music notation.",
        venue: "IV Music Research Meeting at UEM — EPEM, Maringá, 2009.",
      },
      {
        ref: "Souza, Rafael. Differences in ink and Braille music notation: their implications in the classroom.",
        venue: "XIII Regional ABEM South Meeting, Porto Alegre, 2010.",
      },
      {
        ref: "Souza, Rafael. Music for visually impaired people: developing musical memory.",
        venue: "IX Regional ABEM Northeast Meeting, Natal, 2010.",
        url: "http://www.musica.ufrn.br/revistas/index.php/abemnordeste2010/article/view/83/43",
      },
      {
        ref: "Ota, Raphael; Souza, Rafael. The inclusion of blind students in music classes: reports and observations.",
        venue: "XIX National ABEM Congress, Goiânia, 2010.",
      },
      {
        ref: "Ota, Raphael; Souza, Rafael. Musical didactics for students with visual impairment: didactic-musical materials and special dynamics.",
        venue: "XIV Regional ABEM South Meeting, Maringá, 2011. pp. 265–275.",
      },
    ],
    other_title: "Other Relevant Activities",
    other: [
      "Music trainer for public school teachers in Campinas in 2023 and 2025, reaching over 200 teachers and educational agents and more than 4,000 children indirectly.",
      "Founder of the YouTube channel Apaixonados por Acordeon, with over 2,000 students and more than 2 million views since 2018.",
      "Founder and member of Grupo Encantoré (www.encantore.com), a children's original music group, active continuously since 2011.",
    ],
    contact_title: "Get in touch",
    contact_desc: "For partnership proposals, courses, lectures, or consulting in Braille Music Notation:",
    contact_btn: "Send a message",
    library_btn: "Explore the Archive",
  },
  es: {
    hero_title: "Rafael Vanazzi",
    hero_subtitle: "Músico, investigador y educador musical especializado en Musicografía Braille",
    bio_title: "Sobre Rafael",
    bio: "Rafael Moreira Vanazzi de Souza es músico, investigador y educador musical brasileño con más de veinte años de experiencia dedicados a la Musicografía Braille y a la educación musical inclusiva. Su trayectoria combina rigor académico, formación pedagógica internacional y práctica directa con músicos videntes y personas con discapacidad visual (PDV) en universidades, centros de rehabilitación y secretarías de cultura en Brasil.",
    formation_title: "Formación Académica y Pedagógica",
    formation: [
      {
        title: "Maestría en Música — UNICAMP",
        detail: "Disertación: Particularidades de la Musicografía Braille para el Auxilio de Nuevas Metodologías de Enseñanza (2014). Trabajo pionero que mapea los procesos cognitivos de la lectura musical en Braille célula por célula, fundamentando nuevos enfoques pedagógicos para músicos con y sin discapacidad visual.",
        year: "2014",
        url: "https://d2xsxph8kpxj0f.cloudfront.net/310519663185498023/nVUTu2sZHxzgC6GJeZdNgr/dissertacao_mestrado_rafael_vanazzi_051fb0c3.pdf",
        url_label: "Leer la disertación (PDF)",
      },
      {
        title: "Diplomado en Metodología Rítmica Jaques-Dalcroze",
        detail: "Escuela Moderna de Música de Santiago, Chile (2017–2018). Curso autorizado por la Fondation de l'Institut Jaques-Dalcroze, Suiza. Formación con los profesores Iramar Rodrigues, Pablo Cernik y Alazne Arana.",
        year: "2018",
      },
      {
        title: "Licenciatura en Música — Composición",
        detail: "UNICAMP — Campinas, SP (2007).",
        year: "2007",
      },
    ],
    braille_title: "Experiencia en Musicografía Braille",
    braille: [
      "Profesor y consultor en Musicografía Braille desde 2006, con artículos y disertación de maestría citados en estudios del área.",
      "Coordinación de clases para PDV en la UEM — Universidad Estatal de Maringá (2010), con co-orientación de pasantía de graduación sobre vivencias musicales para personas con discapacidad visual.",
      "Talleres de \"Introducción a la Musicografía Braille\" en la Secretaría Municipal de Cultura de Santa Bárbara d'Oeste (2006), el Centro Cultural Louis Braille de Campinas (2007) y el Centro de Prevención a la Ceguera de Americana (2009).",
      "Curso de \"Musicalización Infantil para Niños con Discapacidad Visual\" en el Centro de Prevención a la Ceguera de Americana (2009).",
      "Clases de Musicografía Braille para PDV y estudiantes de graduación en música en la Biblioteca Comunitaria de la UFSCar junto al PROVER (2008).",
      "Curso de Extensión en Musicografía Braille promovido por el Departamento de Música y la PROPAE de la UEM (2009).",
      "Coordinación del proyecto de acervo de partituras en Braille aprobado por el FICC — Fondos de Inversiones Culturales de Campinas (2007 y 2008).",
      "Transcriptor Braille del examen de aptitud musical de ingreso universitario de la UEM (2009, 2010 y 2011).",
      "Ponente en el evento \"Live Temática: Procesos pedagógicos e medios de fruición inclusivos en Artes\" de la UFSB — Universidad Federal del Sur de Bahía (2020).",
    ],
    articles_title: "Artículos Publicados",
    articles: [
      {
        ref: "Souza, Rafael. Educación musical para personas con discapacidad visual: experiencias en la enseñanza de la musicografía braille.",
        venue: "IV Encuentro de Investigación en Música de la UEM — EPEM, Maringá, 2009.",
      },
      {
        ref: "Souza, Rafael. Diferencias en la notación musical en tinta y en braille: sus implicaciones en el aula.",
        venue: "XIII Encuentro Regional de la ABEM Sur, Porto Alegre, 2010.",
      },
      {
        ref: "Souza, Rafael. Música para personas con discapacidad visual: desarrollando la memoria musical.",
        venue: "IX Encuentro Regional de la ABEM Nordeste, Natal, 2010.",
        url: "http://www.musica.ufrn.br/revistas/index.php/abemnordeste2010/article/view/83/43",
      },
      {
        ref: "Ota, Raphael; Souza, Rafael. La inclusión del alumno ciego en clases de música: relatos y observaciones.",
        venue: "XIX Congreso Nacional de la ABEM, Goiânia, 2010.",
      },
      {
        ref: "Ota, Raphael; Souza, Rafael. Didáctica musical para alumnos con discapacidad visual: material didáctico-musical y dinámicas especiales.",
        venue: "XIV Encuentro Regional de la ABEM Sur, Maringá, 2011. pp. 265–275.",
      },
    ],
    other_title: "Otras Actividades Relevantes",
    other: [
      "Formador en música para profesores de escuelas públicas de Campinas en 2023 y 2025, atendiendo a más de 200 profesores y agentes educativos y más de 4.000 niños indirectamente.",
      "Fundador del canal de YouTube Apaixonados por Acordeon, con más de 2.000 alumnos atendidos y más de 2 millones de visualizaciones desde 2018.",
      "Fundador e integrante del Grupo Encantoré (www.encantore.com), de música infantil autoral, activo ininterrumpidamente desde 2011.",
    ],
    contact_title: "Contacto",
    contact_desc: "Para propuestas de asociación, cursos, conferencias o consultoría en Musicografía Braille:",
    contact_btn: "Enviar mensaje",
    library_btn: "Explorar el Acervo",
  },
};

// ─── Photo Slot Component ──────────────────────────────────────────────────

function PhotoSlot({ language }: { language: string }) {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";

  const altText =
    language === "en"
      ? "Professional photo of Rafael Vanazzi"
      : language === "es"
      ? "Foto profesional de Rafael Vanazzi"
      : "Foto profissional de Rafael Vanazzi";

  const uploadHint =
    language === "en"
      ? "Upload photo via Admin panel"
      : language === "es"
      ? "Sube la foto desde el panel de Administración"
      : "Envie a foto pelo painel de Administração";

  return (
    <div
      className="relative w-48 h-48 md:w-64 md:h-64 rounded-full overflow-hidden border-4 border-secondary/60 shadow-xl bg-primary-foreground/10 flex items-center justify-center"
      aria-label={altText}
    >
      {/* Placeholder shown until a real photo is set */}
      <div className="flex flex-col items-center justify-center gap-3 text-primary-foreground/50 px-4 text-center">
        <Camera className="w-12 h-12" aria-hidden="true" />
        {isAdmin && (
          <span className="text-xs leading-snug">{uploadHint}</span>
        )}
      </div>
    </div>
  );
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function AboutRafael() {
  const { language } = useLanguage();
  const c = content[language as keyof typeof content] ?? content.pt;

  return (
    <SiteLayout>
      {/* Hero */}
      <section className="bg-primary text-primary-foreground py-16 md:py-20" aria-labelledby="rafael-heading">
        <div className="container">
          <div className="flex flex-col md:flex-row items-center gap-10 md:gap-16">
            {/* Text */}
            <div className="flex-1 min-w-0">
              <div className="inline-flex items-center gap-2 bg-secondary/20 text-secondary px-4 py-1.5 rounded-full text-sm font-semibold mb-6 border border-secondary/30">
                <Music2 className="w-4 h-4" aria-hidden="true" />
                <span>Musicografia Braille</span>
              </div>
              <h1 id="rafael-heading" className="text-4xl md:text-6xl font-bold mb-4 leading-tight">
                {c.hero_title}
              </h1>
              <p className="text-xl text-primary-foreground/80 leading-relaxed">
                {c.hero_subtitle}
              </p>
            </div>

            {/* Photo */}
            <div className="flex-shrink-0">
              <PhotoSlot language={language} />
            </div>
          </div>
        </div>
      </section>

      {/* Bio */}
      <section className="py-14" aria-labelledby="bio-heading">
        <div className="container">
          <div className="max-w-3xl">
            <div className="flex items-center gap-3 mb-5">
              <Users className="w-6 h-6 text-primary" aria-hidden="true" />
              <h2 id="bio-heading" className="text-2xl md:text-3xl font-bold">{c.bio_title}</h2>
            </div>
            <p className="text-lg text-muted-foreground leading-relaxed">{c.bio}</p>
          </div>
        </div>
      </section>

      {/* Formation */}
      <section className="py-14 bg-muted/40" aria-labelledby="formation-heading">
        <div className="container">
          <div className="max-w-3xl mx-auto">
            <div className="flex items-center gap-3 mb-8">
              <GraduationCap className="w-6 h-6 text-primary" aria-hidden="true" />
              <h2 id="formation-heading" className="text-2xl md:text-3xl font-bold">{c.formation_title}</h2>
            </div>
            <ol className="space-y-5">
              {c.formation.map((item, i) => (
                <li key={i} className="flex gap-5 items-start">
                  <div className="flex-shrink-0 w-14 text-center">
                    <span className="inline-block bg-primary text-primary-foreground text-xs font-bold px-2 py-1 rounded-lg">
                      {item.year}
                    </span>
                  </div>
                  <div className="flex-1 border-l-2 border-primary/20 pl-5">
                    <h3 className="font-bold text-foreground text-base mb-1">{item.title}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">{item.detail}</p>
                    {(item as any).url && (
                      <a
                        href={(item as any).url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 mt-2 text-xs font-semibold text-primary hover:underline"
                        aria-label={(item as any).url_label}
                      >
                        <FileText className="w-3.5 h-3.5" aria-hidden="true" />
                        {(item as any).url_label}
                      </a>
                    )}
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </section>

      {/* Braille Experience */}
      <section className="py-14" aria-labelledby="braille-heading">
        <div className="container">
          <div className="max-w-3xl mx-auto">
            <div className="flex items-center gap-3 mb-8">
              <Award className="w-6 h-6 text-secondary" aria-hidden="true" />
              <h2 id="braille-heading" className="text-2xl md:text-3xl font-bold">{c.braille_title}</h2>
            </div>
            <ul className="space-y-3" role="list">
              {c.braille.map((item, i) => (
                <li key={i} className="flex items-start gap-3">
                  <span className="flex-shrink-0 mt-1.5 w-2 h-2 rounded-full bg-secondary" aria-hidden="true" />
                  <span className="text-muted-foreground leading-relaxed text-sm">{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* Articles */}
      <section className="py-14 bg-muted/40" aria-labelledby="articles-heading">
        <div className="container">
          <div className="max-w-3xl mx-auto">
            <div className="flex items-center gap-3 mb-8">
              <FileText className="w-6 h-6 text-primary" aria-hidden="true" />
              <h2 id="articles-heading" className="text-2xl md:text-3xl font-bold">{c.articles_title}</h2>
            </div>
            <ol className="space-y-5">
              {c.articles.map((article, i) => (
                <li key={i} className="bg-card border border-border rounded-xl p-5">
                  <div className="flex items-start gap-3">
                    <span className="flex-shrink-0 inline-flex items-center justify-center w-7 h-7 rounded-full bg-primary/10 text-primary text-xs font-bold">
                      {i + 1}
                    </span>
                    <div>
                      <p className="text-sm text-foreground leading-relaxed font-medium mb-1">{article.ref}</p>
                      <p className="text-xs text-muted-foreground leading-relaxed">{article.venue}</p>
                      {article.url && (
                        <a
                          href={article.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs text-primary font-semibold mt-2 hover:underline"
                          aria-label={`Acessar artigo: ${article.ref}`}
                        >
                          <Globe className="w-3 h-3" aria-hidden="true" />
                          {language === "pt" ? "Acessar artigo" : language === "en" ? "Access article" : "Acceder al artículo"}
                        </a>
                      )}
                    </div>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </section>

      {/* Other Activities */}
      <section className="py-14" aria-labelledby="other-heading">
        <div className="container">
          <div className="max-w-3xl mx-auto">
            <div className="flex items-center gap-3 mb-8">
              <Mic className="w-6 h-6 text-primary" aria-hidden="true" />
              <h2 id="other-heading" className="text-2xl md:text-3xl font-bold">{c.other_title}</h2>
            </div>
            <ul className="space-y-3" role="list">
              {c.other.map((item, i) => (
                <li key={i} className="flex items-start gap-3">
                  <span className="flex-shrink-0 mt-1.5 w-2 h-2 rounded-full bg-primary" aria-hidden="true" />
                  <span className="text-muted-foreground leading-relaxed text-sm">{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* Contact CTA */}
      <section className="py-14 bg-primary text-primary-foreground" aria-labelledby="contact-cta-heading">
        <div className="container">
          <div className="max-w-2xl mx-auto text-center">
            <BookOpen className="w-10 h-10 text-secondary mx-auto mb-4" aria-hidden="true" />
            <h2 id="contact-cta-heading" className="text-2xl md:text-3xl font-bold mb-3">{c.contact_title}</h2>
            <p className="text-primary-foreground/80 mb-8 leading-relaxed">{c.contact_desc}</p>
            <div className="flex flex-wrap justify-center gap-4">
              <Button asChild size="lg" className="bg-secondary text-secondary-foreground hover:bg-secondary/90 font-semibold">
                <Link href="/contato">
                  {c.contact_btn}
                  <ArrowRight className="w-4 h-4 ml-2" aria-hidden="true" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="border-primary-foreground/40 text-primary-foreground hover:bg-primary-foreground/10">
                <Link href="/acervo">
                  <BookOpen className="w-4 h-4 mr-2" aria-hidden="true" />
                  {c.library_btn}
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>
    </SiteLayout>
  );
}
