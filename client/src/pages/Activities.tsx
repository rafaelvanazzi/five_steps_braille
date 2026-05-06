import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { useLanguage } from "@/contexts/LanguageContext";
import { CalendarDays, Clock, Globe, Users, MapPin, CheckCircle, AlertCircle, Video } from "lucide-react";
import SiteLayout from "@/components/SiteLayout";

// ─── Types ────────────────────────────────────────────────────────────────────
type EventItem = {
  id: number;
  title: string;
  description: string;
  eventDate: Date;
  format: "online" | "presencial" | "hibrido";
  targetAudience: "videntes" | "pdv" | "ambos";
  maxSpots: number;
  meetingLink?: string | null;
  status: "draft" | "published";
  pastEventText?: string | null;
  createdAt: Date;
};

// ─── Translations ─────────────────────────────────────────────────────────────
const t = {
  pt: {
    pageTitle: "Aulas e Atividades",
    pageSubtitle: "Formações em Musicografia Braille para músicos videntes e pessoas com deficiência visual.",
    pastTitle: "Aulas e Palestras Realizadas",
    pastEmpty: "Nenhuma atividade registrada ainda.",
    upcomingTitle: "Próximas Atividades",
    upcomingEmpty: "Nenhuma atividade futura programada no momento.",
    register: "Inscrever-se",
    cancelReg: "Cancelar inscrição",
    registered: "Inscrito",
    waitlist: "Lista de espera",
    spotsLeft: (n: number) => `${n} vagas disponíveis`,
    spotsNone: "Vagas esgotadas",
    loginRequired: "Faça login para se inscrever",
    format: { online: "Online", presencial: "Presencial", hibrido: "Híbrido" },
    audience: { videntes: "Músicos videntes", pdv: "Pessoas com DV", ambos: "Todos os públicos" },
    dialogTitle: "Inscrição no evento",
    country: "País",
    instrument: "Instrumento",
    brailleLevel: "Nível de Musicografia Braille",
    brailleLevels: { none: "Nenhum", basic: "Básico", intermediate: "Intermediário", advanced: "Avançado" },
    isDV: "Sou pessoa com deficiência visual",
    motivation: "Motivação (opcional)",
    motivationPlaceholder: "Por que você quer participar deste evento?",
    submit: "Confirmar inscrição",
    submitting: "Enviando...",
    successTitle: "Inscrição realizada!",
    successMsg: "Você receberá um e-mail de confirmação em breve.",
    waitlistMsg: "Você foi adicionado à lista de espera.",
    cancelSuccess: "Inscrição cancelada.",
    errorMsg: "Ocorreu um erro. Tente novamente.",
    alreadyRegistered: "Você já está inscrito neste evento.",
    watchRecording: "Assistir à gravação",
  },
  en: {
    pageTitle: "Classes & Activities",
    pageSubtitle: "Braille Music Notation training for sighted musicians and visually impaired people.",
    pastTitle: "Past Classes & Lectures",
    pastEmpty: "No past activities recorded yet.",
    upcomingTitle: "Upcoming Activities",
    upcomingEmpty: "No upcoming activities scheduled at the moment.",
    register: "Register",
    cancelReg: "Cancel registration",
    registered: "Registered",
    waitlist: "Waitlist",
    spotsLeft: (n: number) => `${n} spots available`,
    spotsNone: "No spots left",
    loginRequired: "Log in to register",
    format: { online: "Online", presencial: "In-person", hibrido: "Hybrid" },
    audience: { videntes: "Sighted musicians", pdv: "Visually impaired", ambos: "All audiences" },
    dialogTitle: "Event registration",
    country: "Country",
    instrument: "Instrument",
    brailleLevel: "Braille Music Notation level",
    brailleLevels: { none: "None", basic: "Basic", intermediate: "Intermediate", advanced: "Advanced" },
    isDV: "I am visually impaired",
    motivation: "Motivation (optional)",
    motivationPlaceholder: "Why do you want to attend this event?",
    submit: "Confirm registration",
    submitting: "Sending...",
    successTitle: "Registration confirmed!",
    successMsg: "You will receive a confirmation email shortly.",
    waitlistMsg: "You have been added to the waitlist.",
    cancelSuccess: "Registration cancelled.",
    errorMsg: "An error occurred. Please try again.",
    alreadyRegistered: "You are already registered for this event.",
    watchRecording: "Watch recording",
  },
  es: {
    pageTitle: "Clases y Actividades",
    pageSubtitle: "Formación en Musicografía Braille para músicos videntes y personas con discapacidad visual.",
    pastTitle: "Clases y Conferencias Realizadas",
    pastEmpty: "Aún no hay actividades registradas.",
    upcomingTitle: "Próximas Actividades",
    upcomingEmpty: "No hay actividades futuras programadas en este momento.",
    register: "Inscribirse",
    cancelReg: "Cancelar inscripción",
    registered: "Inscrito",
    waitlist: "Lista de espera",
    spotsLeft: (n: number) => `${n} plazas disponibles`,
    spotsNone: "Sin plazas disponibles",
    loginRequired: "Inicia sesión para inscribirte",
    format: { online: "En línea", presencial: "Presencial", hibrido: "Híbrido" },
    audience: { videntes: "Músicos videntes", pdv: "Personas con DV", ambos: "Todo el público" },
    dialogTitle: "Inscripción al evento",
    country: "País",
    instrument: "Instrumento",
    brailleLevel: "Nivel de Musicografía Braille",
    brailleLevels: { none: "Ninguno", basic: "Básico", intermediate: "Intermedio", advanced: "Avanzado" },
    isDV: "Soy persona con discapacidad visual",
    motivation: "Motivación (opcional)",
    motivationPlaceholder: "¿Por qué quieres participar en este evento?",
    submit: "Confirmar inscripción",
    submitting: "Enviando...",
    successTitle: "¡Inscripción realizada!",
    successMsg: "Recibirás un correo de confirmación en breve.",
    waitlistMsg: "Has sido añadido a la lista de espera.",
    cancelSuccess: "Inscripción cancelada.",
    errorMsg: "Ocurrió un error. Inténtalo de nuevo.",
    alreadyRegistered: "Ya estás inscrito en este evento.",
    watchRecording: "Ver grabación",
  },
};

// ─── Registration Dialog ──────────────────────────────────────────────────────
function RegistrationDialog({
  event,
  open,
  onClose,
  lang,
}: {
  event: EventItem;
  open: boolean;
  onClose: () => void;
  lang: keyof typeof t;
}) {
  const tx = t[lang];
  const utils = trpc.useUtils();
  const [country, setCountry] = useState("");
  const [instrument, setInstrument] = useState("");
  const [brailleLevel, setBrailleLevel] = useState<"none" | "basic" | "intermediate" | "advanced">("none");
  const [isDV, setIsDV] = useState(false);
  const [motivation, setMotivation] = useState("");

  const registerMutation = trpc.events.register.useMutation({
    onSuccess: (data) => {
      toast.success(data.waitlisted ? tx.waitlistMsg : tx.successMsg);
      utils.events.list.invalidate();
      utils.events.countRegistrations.invalidate();
      utils.events.getMyRegistration.invalidate();
      onClose();
    },
    onError: (err) => {
      toast.error(err.message || tx.errorMsg);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!country || !instrument || !brailleLevel) return;
    registerMutation.mutate({
      eventId: event.id,
      country,
      instrument,
      brailleLevel,
      isVisuallyImpaired: isDV,
      motivation: motivation || null,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg" aria-labelledby="reg-dialog-title">
        <DialogHeader>
          <DialogTitle id="reg-dialog-title">{tx.dialogTitle}</DialogTitle>
          <DialogDescription className="font-medium text-foreground">{event.title}</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div>
            <Label htmlFor="reg-country">{tx.country} *</Label>
            <Input
              id="reg-country"
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              required
              placeholder="Brasil"
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="reg-instrument">{tx.instrument} *</Label>
            <Input
              id="reg-instrument"
              value={instrument}
              onChange={(e) => setInstrument(e.target.value)}
              required
              placeholder="Piano, violão, flauta..."
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="reg-braille">{tx.brailleLevel} *</Label>
            <Select value={brailleLevel} onValueChange={(v) => setBrailleLevel(v as typeof brailleLevel)}>
              <SelectTrigger id="reg-braille" className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(["none", "basic", "intermediate", "advanced"] as const).map((l) => (
                  <SelectItem key={l} value={l}>{tx.brailleLevels[l]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2">
            <Checkbox
              id="reg-dv"
              checked={isDV}
              onCheckedChange={(v) => setIsDV(!!v)}
            />
            <Label htmlFor="reg-dv" className="cursor-pointer">{tx.isDV}</Label>
          </div>
          <div>
            <Label htmlFor="reg-motivation">{tx.motivation}</Label>
            <Textarea
              id="reg-motivation"
              value={motivation}
              onChange={(e) => setMotivation(e.target.value)}
              placeholder={tx.motivationPlaceholder}
              rows={3}
              className="mt-1"
            />
          </div>
          <Button
            type="submit"
            className="w-full"
            disabled={registerMutation.isPending || !country || !instrument}
          >
            {registerMutation.isPending ? tx.submitting : tx.submit}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Event Card ───────────────────────────────────────────────────────────────
function EventCard({ event, lang }: { event: EventItem; lang: keyof typeof t }) {
  const tx = t[lang];
  const { user } = useAuth();
  const [regOpen, setRegOpen] = useState(false);
  const utils = trpc.useUtils();

  const { data: myReg } = trpc.events.getMyRegistration.useQuery(
    { eventId: event.id },
    { enabled: !!user }
  );
  const { data: counts } = trpc.events.countRegistrations.useQuery({ eventId: event.id });

  const cancelMutation = trpc.events.cancelRegistration.useMutation({
    onSuccess: () => {
      toast.success(tx.cancelSuccess);
      utils.events.countRegistrations.invalidate();
      utils.events.getMyRegistration.invalidate();
    },
    onError: (err) => toast.error(err.message || tx.errorMsg),
  });

  const isPast = new Date(event.eventDate) < new Date();
  const spotsLeft = event.maxSpots - (counts?.confirmed ?? 0);
  const isFull = spotsLeft <= 0;

  const formatDate = (d: Date) =>
    new Date(d).toLocaleDateString(lang === "pt" ? "pt-BR" : lang === "es" ? "es-ES" : "en-US", {
      weekday: "long", day: "numeric", month: "long", year: "numeric",
    });
  const formatTime = (d: Date) =>
    new Date(d).toLocaleTimeString(lang === "pt" ? "pt-BR" : lang === "es" ? "es-ES" : "en-US", {
      hour: "2-digit", minute: "2-digit",
    });

  return (
    <article className="border border-border rounded-lg p-5 bg-card text-card-foreground space-y-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <h3 className="text-lg font-semibold leading-tight">{event.title}</h3>
        <div className="flex flex-wrap gap-1">
          <Badge variant="secondary">{tx.format[event.format]}</Badge>
          <Badge variant="outline">{tx.audience[event.targetAudience]}</Badge>
        </div>
      </div>

      <p className="text-sm text-muted-foreground">{event.description}</p>

      <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
        <span className="flex items-center gap-1">
          <CalendarDays className="h-4 w-4" aria-hidden="true" />
          {formatDate(event.eventDate)}
        </span>
        <span className="flex items-center gap-1">
          <Clock className="h-4 w-4" aria-hidden="true" />
          {formatTime(event.eventDate)}
        </span>
        {!isPast && (
          <span className="flex items-center gap-1">
            <Users className="h-4 w-4" aria-hidden="true" />
            {isFull ? tx.spotsNone : tx.spotsLeft(spotsLeft)}
          </span>
        )}
      </div>

      {!isPast && (
        <div className="pt-1">
          {myReg ? (
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1 text-sm font-medium text-green-600 dark:text-green-400">
                {myReg.waitlisted ? (
                  <><AlertCircle className="h-4 w-4" aria-hidden="true" /> {tx.waitlist}</>
                ) : (
                  <><CheckCircle className="h-4 w-4" aria-hidden="true" /> {tx.registered}</>
                )}
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => cancelMutation.mutate({ eventId: event.id })}
                disabled={cancelMutation.isPending}
                className="text-destructive hover:text-destructive"
              >
                {tx.cancelReg}
              </Button>
            </div>
          ) : user ? (
            <Button
              size="sm"
              onClick={() => setRegOpen(true)}
              disabled={isFull}
            >
              {isFull ? tx.spotsNone : tx.register}
            </Button>
          ) : (
            <p className="text-sm text-muted-foreground italic">{tx.loginRequired}</p>
          )}
        </div>
      )}

      {regOpen && (
        <RegistrationDialog
          event={event}
          open={regOpen}
          onClose={() => setRegOpen(false)}
          lang={lang}
        />
      )}
    </article>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function Activities() {
  const { language } = useLanguage();
  const lang = (language as keyof typeof t) in t ? (language as keyof typeof t) : "pt";
  const tx = t[lang];

  const { data: events = [], isLoading } = trpc.events.list.useQuery(undefined, {
    refetchOnWindowFocus: false,
  });

  const now = new Date();
  const pastEvents = events.filter((e) => new Date(e.eventDate) < now).sort(
    (a, b) => new Date(b.eventDate).getTime() - new Date(a.eventDate).getTime()
  );
  const upcomingEvents = events.filter((e) => new Date(e.eventDate) >= now).sort(
    (a, b) => new Date(a.eventDate).getTime() - new Date(b.eventDate).getTime()
  );

  return (
    <SiteLayout>
    <main id="main-content" className="min-h-screen bg-background text-foreground">
      {/* Hero */}
      <section className="bg-muted/40 border-b border-border py-12 px-4">
        <div className="max-w-3xl mx-auto text-center">
          <h1 className="text-3xl font-bold tracking-tight mb-3">{tx.pageTitle}</h1>
          <p className="text-muted-foreground text-base leading-relaxed">{tx.pageSubtitle}</p>
        </div>
      </section>

      <div className="max-w-3xl mx-auto px-4 py-10 space-y-14">

        {/* Upcoming */}
        <section aria-labelledby="upcoming-heading">
          <h2 id="upcoming-heading" className="text-2xl font-semibold mb-6 border-b border-border pb-2">
            {tx.upcomingTitle}
          </h2>
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2].map((i) => (
                <div key={i} className="h-32 rounded-lg bg-muted animate-pulse" />
              ))}
            </div>
          ) : upcomingEvents.length === 0 ? (
            <p className="text-muted-foreground italic">{tx.upcomingEmpty}</p>
          ) : (
            <div className="space-y-4">
              {upcomingEvents.map((ev) => (
                <EventCard key={ev.id} event={ev as EventItem} lang={lang} />
              ))}
            </div>
          )}
        </section>

        {/* Past */}
        <section aria-labelledby="past-heading">
          <h2 id="past-heading" className="text-2xl font-semibold mb-6 border-b border-border pb-2">
            {tx.pastTitle}
          </h2>
          {isLoading ? (
            <div className="h-24 rounded-lg bg-muted animate-pulse" />
          ) : pastEvents.length === 0 ? (
            <p className="text-muted-foreground italic">{tx.pastEmpty}</p>
          ) : (
            <div className="space-y-6">
              {pastEvents.map((ev) => (
                <article key={ev.id} className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-base font-semibold">{ev.title}</h3>
                    <Badge variant="secondary" className="text-xs">{tx.format[ev.format]}</Badge>
                    <Badge variant="outline" className="text-xs">{tx.audience[ev.targetAudience]}</Badge>
                    <span className="text-xs text-muted-foreground ml-auto">
                      {new Date(ev.eventDate).toLocaleDateString(
                        lang === "pt" ? "pt-BR" : lang === "es" ? "es-ES" : "en-US"
                      )}
                    </span>
                  </div>
                  {ev.pastEventText ? (
                    <div className="prose prose-sm dark:prose-invert max-w-none text-sm text-muted-foreground whitespace-pre-wrap">
                      {ev.pastEventText}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">{ev.description}</p>
                  )}
                  {ev.meetingLink && (
                    <a
                      href={ev.meetingLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline mt-1"
                    >
                      <Video className="h-4 w-4" aria-hidden="true" />
                      {tx.watchRecording}
                    </a>
                  )}
                </article>
              ))}
            </div>
          )}
        </section>

      </div>
    </main>
    </SiteLayout>
  );
}
