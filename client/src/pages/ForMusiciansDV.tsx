import { useLanguage } from "@/contexts/LanguageContext";
import SiteLayout from "@/components/SiteLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Link } from "wouter";
import { CheckCircle2, BookOpen, ArrowRight, Users, Lightbulb } from "lucide-react";

export default function ForMusiciansDV() {
  const { t } = useLanguage();
  const benefits = [t.dv_benefit_1, t.dv_benefit_2, t.dv_benefit_3, t.dv_benefit_4];

  const journey = [
    { grade: 1, label: "Notas e Alturas", stages: 2, color: "bg-blue-600" },
    { grade: 2, label: "Tempo", stages: 5, color: "bg-emerald-600" },
    { grade: 3, label: "Intervalos Diatônicos", stages: 5, color: "bg-amber-500" },
    { grade: 4, label: "Intervalos Cromáticos", stages: 3, color: "bg-orange-500" },
    { grade: 5, label: "Tópicos Avançados", stages: 8, color: "bg-purple-600" },
  ];

  return (
    <SiteLayout>
      {/* Hero */}
      <section className="bg-primary text-primary-foreground py-14" aria-labelledby="dv-heading">
        <div className="container">
          <h1 id="dv-heading" className="text-4xl md:text-5xl font-bold mb-4">{t.dv_title}</h1>
          <p className="text-xl text-primary-foreground/80 max-w-2xl">{t.dv_subtitle}</p>
        </div>
      </section>

      {/* A different approach */}
      <section className="py-14" aria-labelledby="what-braille-heading">
        <div className="container max-w-3xl mx-auto">
          <h2 id="what-braille-heading" className="text-2xl md:text-3xl font-bold mb-4">{t.dv_what_title}</h2>
          <p className="text-muted-foreground leading-relaxed text-lg">{t.dv_what_desc}</p>
        </div>
      </section>

      {/* Benefits */}
      <section className="py-14 bg-muted/40" aria-labelledby="benefits-heading">
        <div className="container max-w-3xl mx-auto">
          <h2 id="benefits-heading" className="text-2xl md:text-3xl font-bold mb-8">{t.dv_benefits_title}</h2>
          <ul className="space-y-4" role="list">
            {benefits.map((b, i) => (
              <li key={i} className="flex items-start gap-3 bg-card border border-border rounded-xl p-5 shadow-sm">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" aria-hidden="true" />
                <span className="text-foreground leading-relaxed">{b}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Peer Learning Story */}
      <section className="py-14" aria-labelledby="peer-heading">
        <div className="container max-w-3xl mx-auto">
          <div className="flex items-start gap-4">
            <div className="bg-amber-100 text-amber-700 rounded-xl p-3 shrink-0">
              <Lightbulb className="w-6 h-6" aria-hidden="true" />
            </div>
            <div>
              <h2 id="peer-heading" className="text-2xl md:text-3xl font-bold mb-4">{t.dv_peer_title}</h2>
              <p className="text-muted-foreground leading-relaxed text-lg">{t.dv_peer_desc}</p>
            </div>
          </div>
        </div>
      </section>

      {/* Learning Journey */}
      <section className="py-14" aria-labelledby="journey-heading">
        <div className="container max-w-3xl mx-auto">
          <h2 id="journey-heading" className="text-2xl md:text-3xl font-bold mb-8">{t.dv_journey_title}</h2>
          <ol className="relative border-l-2 border-primary/30 space-y-6 pl-6" role="list">
            {journey.map((step) => (
              <li key={step.grade} className="relative">
                <span className={`absolute -left-[1.65rem] flex items-center justify-center w-8 h-8 rounded-full text-white text-sm font-bold ${step.color}`}>
                  {step.grade}
                </span>
                <div className="bg-card border border-border rounded-xl p-4 shadow-sm ml-2">
                  <h3 className="font-semibold text-foreground">{step.label}</h3>
                  <p className="text-sm text-muted-foreground">{step.stages} etapas progressivas</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* For musicians with VI who teach */}
      <section className="py-14 bg-muted/40" aria-labelledby="teacher-heading">
        <div className="container max-w-3xl mx-auto">
          <Card className="border border-primary/20 bg-primary/5">
            <CardContent className="p-8">
              <div className="flex items-start gap-4 mb-4">
                <div className="bg-primary/10 text-primary rounded-xl p-3 shrink-0">
                  <Users className="w-6 h-6" aria-hidden="true" />
                </div>
                <div>
                  <h2 id="teacher-heading" className="text-2xl font-bold text-foreground mb-3">
                    {t.dv_teacher_title}
                  </h2>
                  <p className="text-muted-foreground leading-relaxed">
                    {t.dv_teacher_desc}
                  </p>
                </div>
              </div>
              <div className="mt-6 pt-6 border-t border-primary/15">
                <div className="flex items-start gap-3">
                  <Lightbulb className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" aria-hidden="true" />
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    O acervo da plataforma inclui atividades criadas por pessoas com DV — identificadas com o badge de criador — para que você possa estudar e se inspirar nessa perspectiva única.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* CTA */}
      <section className="py-14 bg-primary text-primary-foreground" aria-label="Chamada para ação">
        <div className="container text-center">
          <h2 className="text-2xl md:text-3xl font-bold mb-6">Comece sua jornada musical</h2>
          <div className="flex flex-wrap justify-center gap-4">
            <Button asChild size="lg" className="bg-secondary text-secondary-foreground hover:bg-secondary/90 font-semibold">
              <Link href="/acervo">
                <BookOpen className="w-5 h-5 mr-2" aria-hidden="true" />
                {t.dv_cta}
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="border-primary-foreground/40 text-primary-foreground hover:bg-primary-foreground/10 font-semibold">
              <Link href="/contato">
                {t.common_read_more}
                <ArrowRight className="w-5 h-5 ml-2" aria-hidden="true" />
              </Link>
            </Button>
          </div>
        </div>
      </section>
    </SiteLayout>
  );
}
