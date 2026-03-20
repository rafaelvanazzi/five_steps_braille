import { useState } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import SiteLayout from "@/components/SiteLayout";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle2, Mail, MapPin } from "lucide-react";
import { toast } from "sonner";

export default function Contact() {
  const { t } = useLanguage();
  const [form, setForm] = useState({
    name: "", email: "", institution: "", subject: "", message: "",
    type: "general" as "institution" | "musician_dv" | "musician_nodv" | "general",
  });
  const [submitted, setSubmitted] = useState(false);

  const sendMutation = trpc.contact.send.useMutation({
    onSuccess: () => {
      setSubmitted(true);
      setForm({ name: "", email: "", institution: "", subject: "", message: "", type: "general" });
    },
    onError: () => toast.error(t.contact_error),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.subject || !form.message) {
      toast.error("Por favor, preencha todos os campos obrigatórios.");
      return;
    }
    sendMutation.mutate(form);
  };

  return (
    <SiteLayout>
      <section className="bg-primary text-primary-foreground py-14" aria-labelledby="contact-heading">
        <div className="container">
          <h1 id="contact-heading" className="text-4xl md:text-5xl font-bold mb-4">{t.contact_title}</h1>
          <p className="text-xl text-primary-foreground/80 max-w-2xl">{t.contact_subtitle}</p>
        </div>
      </section>

      <section className="py-14" aria-label="Formulário de contato">
        <div className="container">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
            {/* Contact Info */}
            <div className="space-y-6">
              <Card className="border-border shadow-sm">
                <CardContent className="p-6 space-y-4">
                  <div className="flex items-start gap-3">
                    <Mail className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" aria-hidden="true" />
                    <div>
                      <p className="font-semibold text-sm text-foreground">E-mail</p>
                      <a href="mailto:rafaelvanazzi@gmail.com" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                        rafaelvanazzi@gmail.com
                      </a>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <MapPin className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" aria-hidden="true" />
                    <div>
                      <p className="font-semibold text-sm text-foreground">Localização</p>
                      <p className="text-sm text-muted-foreground">Campinas, SP — Brasil</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-secondary/30 bg-secondary/10 shadow-sm">
                <CardContent className="p-6">
                  <p className="text-sm font-semibold text-foreground mb-2">Rafael Moreira Vanazzi de Souza</p>
                  <p className="text-sm text-muted-foreground">Mestre em Música — UNICAMP</p>
                  <p className="text-sm text-muted-foreground mt-1">Especialista em Musicografia Braille</p>
                </CardContent>
              </Card>
            </div>

            {/* Form */}
            <div className="lg:col-span-2">
              {submitted ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <CheckCircle2 className="w-16 h-16 text-emerald-600 mb-4" aria-hidden="true" />
                  <h2 className="text-2xl font-bold text-foreground mb-2">{t.contact_success}</h2>
                  <Button onClick={() => setSubmitted(false)} variant="outline" className="mt-4">
                    Enviar outra mensagem
                  </Button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} noValidate aria-label="Formulário de contato">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <div className="space-y-1.5">
                      <Label htmlFor="contact-name">{t.contact_name} <span aria-label="obrigatório" className="text-destructive">*</span></Label>
                      <Input
                        id="contact-name"
                        type="text"
                        required
                        autoComplete="name"
                        value={form.name}
                        onChange={(e) => setForm({ ...form, name: e.target.value })}
                        placeholder="Rafael Souza"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="contact-email">{t.contact_email} <span aria-label="obrigatório" className="text-destructive">*</span></Label>
                      <Input
                        id="contact-email"
                        type="email"
                        required
                        autoComplete="email"
                        value={form.email}
                        onChange={(e) => setForm({ ...form, email: e.target.value })}
                        placeholder="seu@email.com"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="contact-institution">{t.contact_institution}</Label>
                      <Input
                        id="contact-institution"
                        type="text"
                        autoComplete="organization"
                        value={form.institution}
                        onChange={(e) => setForm({ ...form, institution: e.target.value })}
                        placeholder="UNICAMP, Escola de Música..."
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="contact-type">{t.contact_type}</Label>
                      <Select
                        value={form.type}
                        onValueChange={(v) => setForm({ ...form, type: v as typeof form.type })}
                      >
                        <SelectTrigger id="contact-type">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="institution">{t.contact_type_inst}</SelectItem>
                          <SelectItem value="musician_dv">{t.contact_type_dv}</SelectItem>
                          <SelectItem value="musician_nodv">{t.contact_type_nodv}</SelectItem>
                          <SelectItem value="general">{t.contact_type_general}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5 sm:col-span-2">
                      <Label htmlFor="contact-subject">{t.contact_subject} <span aria-label="obrigatório" className="text-destructive">*</span></Label>
                      <Input
                        id="contact-subject"
                        type="text"
                        required
                        value={form.subject}
                        onChange={(e) => setForm({ ...form, subject: e.target.value })}
                        placeholder="Parceria institucional, informações sobre aulas..."
                      />
                    </div>
                    <div className="space-y-1.5 sm:col-span-2">
                      <Label htmlFor="contact-message">{t.contact_message} <span aria-label="obrigatório" className="text-destructive">*</span></Label>
                      <Textarea
                        id="contact-message"
                        required
                        rows={6}
                        value={form.message}
                        onChange={(e) => setForm({ ...form, message: e.target.value })}
                        placeholder="Descreva seu interesse ou dúvida..."
                        className="resize-none"
                      />
                    </div>
                  </div>
                  <Button
                    type="submit"
                    size="lg"
                    className="mt-6 bg-primary text-primary-foreground hover:bg-primary/90 font-semibold"
                    disabled={sendMutation.isPending}
                  >
                    {sendMutation.isPending ? t.common_loading : t.contact_submit}
                  </Button>
                </form>
              )}
            </div>
          </div>
        </div>
      </section>
    </SiteLayout>
  );
}
