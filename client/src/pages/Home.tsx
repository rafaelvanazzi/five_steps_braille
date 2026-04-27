import { Link } from "wouter";
import { useLanguage } from "@/contexts/LanguageContext";
import SiteLayout from "@/components/SiteLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  ArrowRight, BookOpen, Users, Building2, Music2,
  GraduationCap, Mic, FileMusic, Landmark, Globe,
  FlaskConical, Star, MessageSquare, Library,
} from "lucide-react";

const gradeColors = [
  "from-blue-600 to-blue-800",
  "from-emerald-600 to-emerald-800",
  "from-amber-500 to-amber-700",
  "from-orange-500 to-orange-700",
  "from-purple-600 to-purple-800",
];

export default function Home() {
  const { t } = useLanguage();

  const grades = [
    { title: t.home_grade1_title, desc: t.home_grade1_desc, stages: 2 },
    { title: t.home_grade2_title, desc: t.home_grade2_desc, stages: 5 },
    { title: t.home_grade3_title, desc: t.home_grade3_desc, stages: 5 },
    { title: t.home_grade4_title, desc: t.home_grade4_desc, stages: 3 },
    { title: t.home_grade5_title, desc: t.home_grade5_desc, stages: 8 },
  ];

  const audiences = [
    {
      icon: <Music2 className="w-8 h-8" aria-hidden="true" />,
      title: t.home_who_dv,
      desc: t.home_who_dv_desc,
      href: "/musicos-dv",
      color: "text-blue-700",
      bg: "bg-blue-50 border-blue-200",
    },
    {
      icon: <Users className="w-8 h-8" aria-hidden="true" />,
      title: t.home_who_nodv,
      desc: t.home_who_nodv_desc,
      href: "/musicos-sem-dv",
      color: "text-emerald-700",
      bg: "bg-emerald-50 border-emerald-200",
    },
    {
      icon: <Building2 className="w-8 h-8" aria-hidden="true" />,
      title: t.home_who_inst,
      desc: t.home_who_inst_desc,
      href: "/instituicoes",
      color: "text-purple-700",
      bg: "bg-purple-50 border-purple-200",
    },
  ];

  return (
    <SiteLayout>
      {/* Hero Section */}
      <section
        className="relative bg-primary text-primary-foreground overflow-hidden"
        aria-labelledby="hero-heading"
      >
        {/* Decorative Braille dots pattern */}
        <div className="absolute inset-0 opacity-5" aria-hidden="true">
          {Array.from({ length: 80 }).map((_, i) => (
            <span
              key={i}
              className="absolute w-2 h-2 rounded-full bg-primary-foreground"
              style={{
                left: `${(i % 10) * 10 + 5}%`,
                top: `${Math.floor(i / 10) * 12 + 6}%`,
              }}
            />
          ))}
        </div>

        <div className="container relative py-20 md:py-28">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 bg-secondary/20 text-secondary px-4 py-1.5 rounded-full text-sm font-semibold mb-6 border border-secondary/30">
              <Music2 className="w-4 h-4" aria-hidden="true" />
              <span>Musicografia Braille</span>
            </div>
            <h1
              id="hero-heading"
              className="text-5xl md:text-7xl font-bold mb-4 leading-tight"
            >
              {t.home_hero_title}
            </h1>
            <p className="text-xl md:text-2xl text-primary-foreground/85 mb-8 leading-relaxed max-w-2xl">
              {t.home_hero_subtitle}
            </p>
            <div className="flex flex-wrap gap-4">
              <Button
                asChild
                size="lg"
                className="bg-secondary text-secondary-foreground hover:bg-secondary/90 font-semibold text-base px-6"
              >
                <Link href="/acervo">
                  <BookOpen className="w-5 h-5 mr-2" aria-hidden="true" />
                  {t.home_hero_cta}
                </Link>
              </Button>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="border-primary-foreground/40 text-primary-foreground hover:bg-primary-foreground/10 font-semibold text-base px-6"
              >
                <Link href="/sobre">
                  {t.home_hero_cta2}
                  <ArrowRight className="w-5 h-5 ml-2" aria-hidden="true" />
                </Link>
              </Button>
            </div>
          </div>
        </div>

        {/* Wave divider */}
        <div className="absolute bottom-0 left-0 right-0" aria-hidden="true">
          <svg viewBox="0 0 1440 60" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full">
            <path d="M0 60L1440 60L1440 20C1200 60 960 0 720 20C480 40 240 0 0 20L0 60Z" fill="oklch(0.98 0.005 240)" />
          </svg>
        </div>
        <div className="h-12" aria-hidden="true" />
      </section>

      {/* Mission Section */}
      <section className="py-16 md:py-20" aria-labelledby="mission-heading">
        <div className="container">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
            <div>
              <h2 id="mission-heading" className="text-3xl md:text-4xl font-bold text-foreground mb-6">
                {t.home_mission_title}
              </h2>
              <p className="text-lg text-muted-foreground leading-relaxed mb-6">
                {t.home_mission_desc}
              </p>
            </div>
            <div className="bg-primary/5 border border-primary/15 rounded-2xl p-8">
              <div className="flex items-start gap-4 mb-6">
                <div className="bg-secondary/20 text-secondary rounded-xl p-3 shrink-0">
                  <Star className="w-6 h-6" aria-hidden="true" />
                </div>
                <div>
                  <h3 className="font-bold text-foreground text-lg mb-2">{t.home_dream_title}</h3>
                  <p className="text-muted-foreground leading-relaxed text-sm">
                    {t.home_dream_desc}
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4 pt-4 border-t border-border">
                {[
                  { num: "5", label: "Graus" },
                  { num: "23", label: "Etapas" },
                  { num: "3", label: "Idiomas" },
                ].map((stat) => (
                  <div key={stat.label} className="text-center" aria-label={`${stat.num} ${stat.label}`}>
                    <div className="text-3xl font-bold text-primary mb-1" aria-hidden="true">{stat.num}</div>
                    <div className="text-xs text-muted-foreground font-medium" aria-hidden="true">{stat.label}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Evidence Section */}
      <section className="py-16 bg-muted/50" aria-labelledby="evidence-heading">
        <div className="container">
          <div className="max-w-4xl mx-auto">
            <div className="flex items-center gap-3 mb-6">
              <div className="bg-amber-100 text-amber-700 rounded-xl p-3">
                <FlaskConical className="w-6 h-6" aria-hidden="true" />
              </div>
              <h2 id="evidence-heading" className="text-3xl md:text-4xl font-bold text-foreground">
                {t.home_evidence_title}
              </h2>
            </div>
            <p className="text-lg text-muted-foreground leading-relaxed mb-8">
              {t.home_evidence_desc}
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-card border border-border rounded-xl p-5">
                <div className="text-xs font-semibold text-amber-700 uppercase tracking-wider mb-2">Artigo Publicado</div>
                <p className="text-sm text-foreground leading-relaxed">{t.home_evidence_article}</p>
              </div>
              <div className="bg-card border border-border rounded-xl p-5">
                <div className="text-xs font-semibold text-primary uppercase tracking-wider mb-2">Dissertação de Mestrado — UNICAMP</div>
                <p className="text-sm text-foreground leading-relaxed">{t.home_evidence_thesis}</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Quotes Section */}
      <section className="py-16 md:py-20" aria-labelledby="quotes-heading">
        <div className="container">
          <h2 id="quotes-heading" className="sr-only">Perspectivas do Projeto</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {[
              { quote: t.home_quote1, ctx: t.home_quote1_context },
              { quote: t.home_quote2, ctx: t.home_quote2_context },
              { quote: t.home_quote3, ctx: t.home_quote3_context },
            ].map((item, i) => (
              <figure key={i} className="bg-card border border-border rounded-2xl p-6 flex flex-col gap-4">
                <span className="text-4xl text-primary/30 font-serif leading-none" aria-hidden="true">&ldquo;</span>
                <blockquote className="text-foreground leading-relaxed text-sm flex-1">
                  {item.quote}
                </blockquote>
                <figcaption className="text-xs text-muted-foreground font-medium border-t border-border pt-3">
                  {item.ctx}
                </figcaption>
              </figure>
            ))}
          </div>
        </div>
      </section>

      {/* Community Section */}
      <section className="py-16 md:py-20" aria-labelledby="community-heading">
        <div className="container">
          <h2 id="community-heading" className="text-3xl md:text-4xl font-bold text-center mb-12">
            {t.home_community_title}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl mx-auto">
            <Link href="/forum" aria-label={t.home_community_forum}>
              <Card className="border border-blue-200 bg-blue-50 hover:shadow-lg transition-all cursor-pointer group h-full">
                <CardContent className="p-6">
                  <div className="text-blue-700 mb-4">
                    <MessageSquare className="w-8 h-8" aria-hidden="true" />
                  </div>
                  <h3 className="font-bold text-lg text-foreground mb-2 group-hover:text-primary transition-colors">
                    {t.home_community_forum}
                  </h3>
                  <p className="text-muted-foreground text-sm leading-relaxed mb-4">
                    {t.home_community_forum_desc}
                  </p>
                  <span className="text-sm font-semibold text-blue-700 flex items-center gap-1">
                    {t.common_read_more}
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" aria-hidden="true" />
                  </span>
                </CardContent>
              </Card>
            </Link>
            <Link href="/acervo" aria-label={t.home_community_library}>
              <Card className="border border-emerald-200 bg-emerald-50 hover:shadow-lg transition-all cursor-pointer group h-full">
                <CardContent className="p-6">
                  <div className="text-emerald-700 mb-4">
                    <Library className="w-8 h-8" aria-hidden="true" />
                  </div>
                  <h3 className="font-bold text-lg text-foreground mb-2 group-hover:text-primary transition-colors">
                    {t.home_community_library}
                  </h3>
                  <p className="text-muted-foreground text-sm leading-relaxed mb-4">
                    {t.home_community_library_desc}
                  </p>
                  <span className="text-sm font-semibold text-emerald-700 flex items-center gap-1">
                    {t.common_read_more}
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" aria-hidden="true" />
                  </span>
                </CardContent>
              </Card>
            </Link>
          </div>
        </div>
      </section>

      {/* Who is it for */}
      <section className="py-16 bg-muted/50" aria-labelledby="who-heading">
        <div className="container">
          <h2 id="who-heading" className="text-3xl md:text-4xl font-bold text-center mb-12">
            {t.home_who_title}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {audiences.map((aud) => (
              <Link key={aud.href} href={aud.href} aria-label={aud.title}>
                <Card className={`border ${aud.bg} hover:shadow-lg transition-all cursor-pointer group h-full`}>
                  <CardContent className="p-6">
                    <div className={`${aud.color} mb-4`}>{aud.icon}</div>
                    <h3 className="font-bold text-lg text-foreground mb-2 group-hover:text-primary transition-colors">
                      {aud.title}
                    </h3>
                    <p className="text-muted-foreground text-sm leading-relaxed mb-4">
                      {aud.desc}
                    </p>
                    <span className={`text-sm font-semibold ${aud.color} flex items-center gap-1`}>
                      {t.common_read_more}
                      <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" aria-hidden="true" />
                    </span>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Method Overview */}
      <section className="py-16 md:py-20" aria-labelledby="what-heading">
        <div className="container">
          <div className="max-w-3xl mx-auto text-center mb-12">
            <h2 id="what-heading" className="text-3xl md:text-4xl font-bold text-foreground mb-6">
              {t.home_what_title}
            </h2>
            <p className="text-lg text-muted-foreground leading-relaxed">
              {t.home_what_desc}
            </p>
          </div>

          <section aria-labelledby="grades-heading">
          <h3 id="grades-heading" className="text-2xl font-bold text-center mb-8">{t.home_grades_title}</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {grades.map((grade, i) => (
              <Card
                key={i}
                className="border-0 shadow-md overflow-hidden hover:shadow-lg transition-shadow"
              >
                <div className={`bg-gradient-to-br ${gradeColors[i]} p-4 text-white`}>
                  <div className="text-3xl font-bold mb-1">{i + 1}</div>
                  <div className="text-xs font-semibold uppercase tracking-wider opacity-80">
                    {grade.stages} {grade.stages === 1 ? "etapa" : "etapas"}
                  </div>
                </div>
                <CardContent className="p-4">
                  <h4 className="font-semibold text-sm text-foreground mb-2 leading-tight">
                    {grade.title}
                  </h4>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {grade.desc}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
           <div className="text-center mt-8">
            <Button asChild variant="outline" size="lg">
              <Link href="/sobre">
                {t.common_read_more}
                <ArrowRight className="w-4 h-4 ml-2" aria-hidden="true" />
              </Link>
            </Button>
          </div>
          </section>
        </div>
      </section>
      {/* Services Section */}
      <section className="py-16 bg-muted/50" aria-labelledby="services-heading">
        <div className="container">
          <div className="text-center mb-10">
            <h2 id="services-heading" className="text-3xl md:text-4xl font-bold text-foreground mb-3">
              {t.home_services_title}
            </h2>
            <p className="text-muted-foreground text-lg">
              {t.home_services_subtitle}
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {[
              {
                icon: <GraduationCap className="w-7 h-7" aria-hidden="true" />,
                title: t.home_services_lessons,
                desc: t.home_services_lessons_desc,
                color: "text-blue-700",
                bg: "bg-blue-50",
              },
              {
                icon: <Mic className="w-7 h-7" aria-hidden="true" />,
                title: t.home_services_workshops,
                desc: t.home_services_workshops_desc,
                color: "text-emerald-700",
                bg: "bg-emerald-50",
              },
              {
                icon: <FileMusic className="w-7 h-7" aria-hidden="true" />,
                title: t.home_services_transcription,
                desc: t.home_services_transcription_desc,
                color: "text-amber-700",
                bg: "bg-amber-50",
              },
              {
                icon: <Landmark className="w-7 h-7" aria-hidden="true" />,
                title: t.home_services_consulting,
                desc: t.home_services_consulting_desc,
                color: "text-purple-700",
                bg: "bg-purple-50",
              },
            ].map((service) => (
              <Card key={service.title} className="border border-border shadow-sm hover:shadow-md transition-shadow">
                <CardContent className="p-5">
                  <div className={`${service.bg} ${service.color} w-12 h-12 rounded-lg flex items-center justify-center mb-4`}>
                    {service.icon}
                  </div>
                  <h3 className="font-bold text-foreground mb-2">{service.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{service.desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="text-center mt-8 space-y-3">
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <Globe className="w-4 h-4" aria-hidden="true" />
              <span>{t.home_services_languages}</span>
            </div>
            <Button asChild size="lg" className="font-semibold">
              <Link href="/contato">
                {t.home_services_cta}
                <ArrowRight className="w-4 h-4 ml-2" aria-hidden="true" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* CTA Banner */}
      <section className="py-16 bg-primary text-primary-foreground" aria-labelledby="cta-heading">
        <div className="container text-center">
          <h2 id="cta-heading" className="text-3xl md:text-4xl font-bold mb-4">
            {t.home_cta_title}
          </h2>
          <p className="text-lg text-primary-foreground/80 mb-8 max-w-2xl mx-auto">
            {t.home_cta_desc}
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Button asChild size="lg" className="bg-secondary text-secondary-foreground hover:bg-secondary/90 font-semibold">
              <Link href="/acervo">
                <BookOpen className="w-5 h-5 mr-2" aria-hidden="true" />
                {t.home_cta_library}
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="border-primary-foreground/40 text-primary-foreground hover:bg-primary-foreground/10 font-semibold">
              <Link href="/contato">
                {t.home_cta_contact}
              </Link>
            </Button>
          </div>
        </div>
      </section>
    </SiteLayout>
  );
}
