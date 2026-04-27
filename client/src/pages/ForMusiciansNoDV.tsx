import { useLanguage } from "@/contexts/LanguageContext";
import SiteLayout from "@/components/SiteLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Link } from "wouter";
import { CheckCircle2, GraduationCap, Globe, ArrowRight, Users, BookOpen, AlertTriangle } from "lucide-react";

export default function ForMusiciansNoDV() {
  const { t } = useLanguage();
  const howItems = [t.nodv_how_1, t.nodv_how_2, t.nodv_how_3];

  return (
    <SiteLayout>
      {/* Hero */}
      <section className="bg-primary text-primary-foreground py-14" aria-labelledby="nodv-heading">
        <div className="container">
          <h1 id="nodv-heading" className="text-4xl md:text-5xl font-bold mb-4">{t.nodv_title}</h1>
          <p className="text-xl text-primary-foreground/80 max-w-2xl">{t.nodv_subtitle}</p>
        </div>
      </section>

      {/* Why */}
      <section className="py-14" aria-labelledby="why-nodv-heading">
        <div className="container max-w-3xl mx-auto">
          <h2 id="why-nodv-heading" className="text-2xl md:text-3xl font-bold mb-4">{t.nodv_why_title}</h2>
          <p className="text-muted-foreground leading-relaxed text-lg">{t.nodv_why_desc}</p>
        </div>
      </section>

      {/* What you will learn */}
      <section className="py-14 bg-muted/40" aria-labelledby="how-nodv-heading">
        <div className="container max-w-3xl mx-auto">
          <h2 id="how-nodv-heading" className="text-2xl md:text-3xl font-bold mb-8">{t.nodv_how_title}</h2>
          <ol className="space-y-4" role="list">
            {howItems.map((item, i) => (
              <li key={i} className="flex items-start gap-4 bg-card border border-border rounded-xl p-5 shadow-sm">
                <span className="flex-shrink-0 flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground text-sm font-bold">
                  {i + 1}
                </span>
                <span className="text-foreground leading-relaxed pt-1">{item}</span>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Who this is for */}
      <section className="py-14" aria-labelledby="impact-nodv-heading">
        <div className="container max-w-3xl mx-auto">
          <div className="bg-secondary/10 border border-secondary/30 rounded-2xl p-8">
            <GraduationCap className="w-10 h-10 text-primary mb-4" aria-hidden="true" />
            <h2 id="impact-nodv-heading" className="text-2xl font-bold mb-4">{t.nodv_impact_title}</h2>
            <p className="text-muted-foreground leading-relaxed">{t.nodv_impact_desc}</p>
          </div>
        </div>
      </section>

      {/* University Critique */}
      <section className="py-14 bg-muted/40" aria-labelledby="university-nodv-heading">
        <div className="container max-w-3xl mx-auto">
          <div className="flex items-start gap-4">
            <div className="bg-orange-100 text-orange-700 rounded-xl p-3 shrink-0">
              <AlertTriangle className="w-6 h-6" aria-hidden="true" />
            </div>
            <div>
              <h2 id="university-nodv-heading" className="text-2xl md:text-3xl font-bold mb-4">{t.nodv_university_title}</h2>
              <p className="text-muted-foreground leading-relaxed text-lg">{t.nodv_university_desc}</p>
            </div>
          </div>
        </div>
      </section>

      {/* Volunteer block */}
      <section className="py-14 bg-muted/40" aria-labelledby="volunteer-nodv-heading">
        <div className="container max-w-3xl mx-auto">
          <Card className="border-l-4 border-secondary shadow-sm">
            <CardContent className="p-8">
              <div className="flex items-center gap-3 mb-4">
                <Users className="w-8 h-8 text-secondary flex-shrink-0" aria-hidden="true" />
                <h2 id="volunteer-nodv-heading" className="text-2xl font-bold">{t.nodv_volunteer_title}</h2>
              </div>
              <p className="text-muted-foreground leading-relaxed mb-6">{t.nodv_volunteer_desc}</p>
              <div className="flex flex-wrap gap-3">
                <Button asChild size="default" className="bg-secondary text-secondary-foreground hover:bg-secondary/90 font-semibold">
                  <Link href="/contato">
                    <CheckCircle2 className="w-4 h-4 mr-2" aria-hidden="true" />
                    {t.nodv_volunteer_cta}
                  </Link>
                </Button>
                <Button asChild size="default" variant="outline">
                  <Link href="/contato">
                    {t.nodv_volunteer_contact_cta}
                    <ArrowRight className="w-4 h-4 ml-2" aria-hidden="true" />
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* CTA */}
      <section className="py-14 bg-primary text-primary-foreground" aria-label="Chamada para ação">
        <div className="container text-center">
          <h2 className="text-2xl md:text-3xl font-bold mb-6">{t.nodv_cta}</h2>
          <div className="flex flex-wrap justify-center gap-4">
            <Button asChild size="lg" className="bg-secondary text-secondary-foreground hover:bg-secondary/90 font-semibold">
              <Link href="/contato">
                <BookOpen className="w-5 h-5 mr-2" aria-hidden="true" />
                {t.nodv_cta}
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="border-primary-foreground/40 text-primary-foreground hover:bg-primary-foreground/10">
              <Link href="/acervo">
                <Globe className="w-4 h-4 mr-2" aria-hidden="true" />
                {t.home_cta_library}
                <ArrowRight className="w-4 h-4 ml-2" aria-hidden="true" />
              </Link>
            </Button>
          </div>
        </div>
      </section>
    </SiteLayout>
  );
}
