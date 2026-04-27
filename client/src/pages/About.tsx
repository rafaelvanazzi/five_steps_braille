import { useLanguage } from "@/contexts/LanguageContext";
import SiteLayout from "@/components/SiteLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { BookOpen, Brain, Globe, ArrowRight, Music } from "lucide-react";

const gradesData = [
  {
    grade: 1,
    titlePt: "Notas e suas Alturas",
    titleEn: "Notes and Pitches",
    stages: [
      { n: 1, pt: "Identificação das notas musicais no sistema Braille", en: "Identification of musical notes in the Braille system" },
      { n: 2, pt: "Leitura das alturas e posições na escala", en: "Reading pitches and positions on the scale" },
    ],
    color: "border-blue-400 bg-blue-50",
    badge: "grade-badge-1",
  },
  {
    grade: 2,
    titlePt: "Tempo",
    titleEn: "Time",
    stages: [
      { n: 1, pt: "Figuras rítmicas básicas (semibreve, mínima, semínima)", en: "Basic rhythmic figures (whole, half, quarter notes)" },
      { n: 2, pt: "Colcheia e semicolcheia", en: "Eighth and sixteenth notes" },
      { n: 3, pt: "Pausas e silêncios", en: "Rests and silences" },
      { n: 4, pt: "Compassos simples e compostos", en: "Simple and compound meters" },
      { n: 5, pt: "Síncopes e contratempos", en: "Syncopations and off-beats" },
    ],
    color: "border-emerald-400 bg-emerald-50",
    badge: "grade-badge-2",
  },
  {
    grade: 3,
    titlePt: "Intervalos Diatônicos e Oitavas",
    titleEn: "Diatonic Intervals and Octaves",
    stages: [
      { n: 1, pt: "Intervalos de 2ª e 3ª diatônicos", en: "Diatonic 2nd and 3rd intervals" },
      { n: 2, pt: "Intervalos de 4ª e 5ª diatônicos", en: "Diatonic 4th and 5th intervals" },
      { n: 3, pt: "Intervalos de 6ª e 7ª diatônicos", en: "Diatonic 6th and 7th intervals" },
      { n: 4, pt: "Marcas de oitava e navegação entre oitavas", en: "Octave marks and navigation between octaves" },
      { n: 5, pt: "Leitura fluente com intervalos e oitavas combinados", en: "Fluent reading with combined intervals and octaves" },
    ],
    color: "border-amber-400 bg-amber-50",
    badge: "grade-badge-3",
  },
  {
    grade: 4,
    titlePt: "Intervalos Cromáticos e Inversões",
    titleEn: "Chromatic Intervals and Inversions",
    stages: [
      { n: 1, pt: "Acidentes (sustenidos, bemóis, bequadros)", en: "Accidentals (sharps, flats, naturals)" },
      { n: 2, pt: "Intervalos cromáticos e enarmonia", en: "Chromatic intervals and enharmonics" },
      { n: 3, pt: "Inversões de intervalos e acordes", en: "Interval and chord inversions" },
    ],
    color: "border-orange-400 bg-orange-50",
    badge: "grade-badge-4",
  },
  {
    grade: 5,
    titlePt: "Tópicos Diversos",
    titleEn: "Diverse Topics",
    stages: [
      { n: 1, pt: "Percepção bidimensional da linha melódica", en: "Bidimensional perception of the melodic line" },
      { n: 2, pt: "Agrupamentos simples", en: "Simple groupings" },
      { n: 3, pt: "Agrupamentos complexos", en: "Complex groupings" },
      { n: 4, pt: "Contraponto", en: "Counterpoint" },
      { n: 5, pt: "Polirritmia", en: "Polyrhythm" },
      { n: 6, pt: "Harmonia tonal e polifônica", en: "Tonal and polyphonic harmony" },
      { n: 7, pt: "Memória mecânica/espacial em instrumento musical", en: "Mechanical/spatial memory on a musical instrument" },
      { n: 8, pt: "Solfejo em musicografia Braille", en: "Solfège in Braille music notation" },
    ],
    color: "border-purple-400 bg-purple-50",
    badge: "grade-badge-5",
  },
];

const complementaryContent = [
  "Nuances", "Ligaduras", "Dedilhados", "Dinâmicas",
  "Ornamentação", "Repetições", "Abreviação de sequências", "Duplicação de símbolos",
];

export default function About() {
  const { t, language } = useLanguage();

  return (
    <SiteLayout>
      {/* Hero */}
      <section className="bg-primary text-primary-foreground py-14" aria-labelledby="about-heading">
        <div className="container">
          <h1 id="about-heading" className="text-4xl md:text-5xl font-bold mb-4">{t.about_title}</h1>
          <p className="text-xl text-primary-foreground/80 max-w-2xl">{t.about_subtitle}</p>
        </div>
      </section>

      {/* Origin */}
      <section className="py-14" aria-labelledby="origin-heading">
        <div className="container">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-10 items-center">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <BookOpen className="w-6 h-6 text-primary" aria-hidden="true" />
                <h2 id="origin-heading" className="text-2xl md:text-3xl font-bold">{t.about_origin_title}</h2>
              </div>
              <p className="text-muted-foreground leading-relaxed">{t.about_origin_desc}</p>
            </div>
            <div className="bg-primary/5 border border-primary/20 rounded-2xl p-8">
              <div className="flex items-center gap-3 mb-4">
                <Brain className="w-6 h-6 text-primary" aria-hidden="true" />
                <h2 className="text-2xl font-bold">{t.about_sloboda_title}</h2>
              </div>
              <p className="text-muted-foreground leading-relaxed">{t.about_sloboda_desc}</p>
              <div className="mt-4 p-4 bg-secondary/20 rounded-lg border border-secondary/30">
                <p className="text-sm font-semibold text-foreground">John Sloboda</p>
                <p className="text-xs text-muted-foreground mt-1">
                  <em>The Musical Mind: The Cognitive Psychology of Music</em> (1985)
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Dalcroze Foundation */}
      <section className="py-14" aria-labelledby="dalcroze-heading">
        <div className="container">
          <div className="max-w-3xl mx-auto">
            <div className="flex items-center gap-3 mb-4">
              <Music className="w-6 h-6 text-secondary" aria-hidden="true" />
              <h2 id="dalcroze-heading" className="text-2xl md:text-3xl font-bold">{t.about_dalcroze_title}</h2>
            </div>
            <p className="text-muted-foreground leading-relaxed mb-6">{t.about_dalcroze_desc}</p>
            <div className="bg-secondary/10 border border-secondary/30 rounded-xl p-5">
              <p className="text-sm font-semibold text-foreground">Institut Jacques-Dalcroze — Genebra, Suíça</p>
              <p className="text-xs text-muted-foreground mt-1">Diploma em Rítmica Jacques-Dalcroze · Rafael Vanazzi · Santiago, Chile, 2018</p>
            </div>
          </div>
        </div>
      </section>

      {/* 5 Grades Detail */}
      <section className="py-14 bg-muted/40" aria-labelledby="grades-detail-heading">
        <div className="container">
          <h2 id="grades-detail-heading" className="text-3xl md:text-4xl font-bold text-center mb-12">
            {t.about_grades_title}
          </h2>
          <div className="space-y-6">
            {gradesData.map((g) => (
              <Card key={g.grade} className={`border-l-4 ${g.color} shadow-sm`}>
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0">
                      <span className={`inline-flex items-center justify-center w-12 h-12 rounded-full text-xl font-bold ${g.badge}`}>
                        {g.grade}
                      </span>
                    </div>
                    <div className="flex-1">
                      <h3 className="text-xl font-bold text-foreground mb-1">
                        {language === "pt" ? g.titlePt : g.titleEn}
                      </h3>
                      <p className="text-sm text-muted-foreground mb-4">
                        {g.stages.length} {g.stages.length === 1 ? "etapa" : "etapas"}
                      </p>
                      <ol className="space-y-2">
                        {g.stages.map((stage) => (
                          <li key={stage.n} className="flex items-start gap-3">
                            <span className={`flex-shrink-0 inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold ${g.badge}`}>
                              {stage.n}
                            </span>
                            <span className="text-sm text-foreground leading-relaxed">
                              {language === "pt" ? stage.pt : stage.en}
                            </span>
                          </li>
                        ))}
                      </ol>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Complementary Content */}
      <section className="py-14" aria-labelledby="complementary-heading">
        <div className="container">
          <div className="max-w-3xl mx-auto">
            <h2 id="complementary-heading" className="text-2xl md:text-3xl font-bold mb-4">{t.about_complementary_title}</h2>
            <p className="text-muted-foreground leading-relaxed mb-6">{t.about_complementary_desc}</p>
            <div className="flex flex-wrap gap-2">
              {complementaryContent.map((item) => (
                <span key={item} className="px-3 py-1.5 bg-secondary/20 text-foreground rounded-full text-sm font-medium border border-secondary/30">
                  {item}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Platform Vision */}
      <section className="py-14 bg-primary text-primary-foreground" aria-labelledby="platform-heading">
        <div className="container">
          <div className="max-w-3xl mx-auto text-center">
            <Globe className="w-12 h-12 text-secondary mx-auto mb-4" aria-hidden="true" />
            <h2 id="platform-heading" className="text-2xl md:text-3xl font-bold mb-4">{t.about_platform_title}</h2>
            <p className="text-primary-foreground/80 leading-relaxed mb-8">{t.about_platform_desc}</p>
            <div className="flex flex-wrap justify-center gap-4">
              <Button asChild size="lg" className="bg-secondary text-secondary-foreground hover:bg-secondary/90 font-semibold">
                <Link href="/acervo">
                  <BookOpen className="w-5 h-5 mr-2" aria-hidden="true" />
                  {t.nav_library}
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="border-primary-foreground/40 text-primary-foreground hover:bg-primary-foreground/10">
                <Link href="/contato">
                  {t.nav_contact}
                  <ArrowRight className="w-4 h-4 ml-2" aria-hidden="true" />
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>
    </SiteLayout>
  );
}
