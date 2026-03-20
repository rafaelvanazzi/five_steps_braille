import { useLanguage } from "@/contexts/LanguageContext";
import SiteLayout from "@/components/SiteLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Link } from "wouter";
import { Building2, GraduationCap, Music, Heart, CheckCircle2, ArrowRight } from "lucide-react";

export default function ForInstitutions() {
  const { t } = useLanguage();

  const offers = [t.inst_offer_1, t.inst_offer_2, t.inst_offer_3, t.inst_offer_4];
  const types = [
    { label: t.inst_type_univ, icon: <GraduationCap className="w-6 h-6" aria-hidden="true" /> },
    { label: t.inst_type_school, icon: <Music className="w-6 h-6" aria-hidden="true" /> },
    { label: t.inst_type_culture, icon: <Building2 className="w-6 h-6" aria-hidden="true" /> },
    { label: t.inst_type_ngo, icon: <Heart className="w-6 h-6" aria-hidden="true" /> },
  ];

  return (
    <SiteLayout>
      <section className="bg-primary text-primary-foreground py-14" aria-labelledby="inst-heading">
        <div className="container">
          <h1 id="inst-heading" className="text-4xl md:text-5xl font-bold mb-4">{t.inst_title}</h1>
          <p className="text-xl text-primary-foreground/80 max-w-2xl">{t.inst_subtitle}</p>
        </div>
      </section>

      <section className="py-14" aria-labelledby="why-inst-heading">
        <div className="container max-w-3xl mx-auto">
          <h2 id="why-inst-heading" className="text-2xl md:text-3xl font-bold mb-4">{t.inst_why_title}</h2>
          <p className="text-muted-foreground leading-relaxed text-lg">{t.inst_why_desc}</p>
        </div>
      </section>

      <section className="py-14 bg-muted/40" aria-labelledby="offer-heading">
        <div className="container">
          <h2 id="offer-heading" className="text-2xl md:text-3xl font-bold text-center mb-10">{t.inst_offer_title}</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-3xl mx-auto">
            {offers.map((offer, i) => (
              <div key={i} className="flex items-start gap-3 bg-card border border-border rounded-xl p-5 shadow-sm">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" aria-hidden="true" />
                <span className="text-foreground leading-relaxed">{offer}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-14" aria-labelledby="types-heading">
        <div className="container">
          <h2 id="types-heading" className="text-2xl md:text-3xl font-bold text-center mb-10">{t.inst_types_title}</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-3xl mx-auto">
            {types.map((type, i) => (
              <Card key={i} className="text-center border-border shadow-sm hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="text-primary mx-auto mb-3 flex justify-center">{type.icon}</div>
                  <p className="text-sm font-medium text-foreground leading-tight">{type.label}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="py-14 bg-primary text-primary-foreground" aria-label="Chamada para ação">
        <div className="container text-center">
          <h2 className="text-2xl md:text-3xl font-bold mb-6">Pronto para oferecer formação inclusiva?</h2>
          <Button asChild size="lg" className="bg-secondary text-secondary-foreground hover:bg-secondary/90 font-semibold">
            <Link href="/contato">
              {t.inst_cta}
              <ArrowRight className="w-5 h-5 ml-2" aria-hidden="true" />
            </Link>
          </Button>
        </div>
      </section>
    </SiteLayout>
  );
}
