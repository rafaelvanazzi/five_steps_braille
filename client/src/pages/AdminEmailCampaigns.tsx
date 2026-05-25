import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { trpc } from "@/lib/trpc";
import { AlertCircle, CheckCircle2, Mail, Clock, Trash2, Play, Pause } from "lucide-react";
import { toast } from "sonner";

export default function AdminEmailCampaigns() {
  const [showForm, setShowForm] = useState(false);
  const [recipients, setRecipients] = useState("");
  const [name, setName] = useState("");
  const [subject, setSubject] = useState("");
  const [htmlContent, setHtmlContent] = useState("");
  const [replyTo, setReplyTo] = useState("contato@braille5steps.com");
  const [intervalMinutes, setIntervalMinutes] = useState(2);
  const [isPreview, setIsPreview] = useState(false);

  const utils = trpc.useUtils();
  const { data: campaigns = [], isLoading } = trpc.emailCampaigns.list.useQuery();
  const createMutation = trpc.emailCampaigns.create.useMutation();
  const scheduleMutation = trpc.emailCampaigns.schedule.useMutation();
  const cancelMutation = trpc.emailCampaigns.cancel.useMutation();
  const deleteMutation = trpc.emailCampaigns.delete.useMutation();

  const parseRecipients = (text: string): string[] => {
    return text
      .split(/[\n,;]/)
      .map((email) => email.trim())
      .filter((email) => email.length > 0 && email.includes("@"));
  };

  const recipientList = parseRecipients(recipients);

  const handleCreate = async () => {
    if (!name.trim()) {
      toast.error("Por favor, insira um nome para a campanha");
      return;
    }
    if (!subject.trim()) {
      toast.error("Por favor, insira um assunto");
      return;
    }
    if (!htmlContent.trim()) {
      toast.error("Por favor, insira o conteúdo do email");
      return;
    }
    if (recipientList.length === 0) {
      toast.error("Por favor, insira pelo menos um email válido");
      return;
    }

    try {
      await createMutation.mutateAsync({
        name,
        subject,
        htmlContent,
        replyTo: replyTo || undefined,
        recipients: recipientList,
        intervalMinutes,
      });

      toast.success("Campanha criada com sucesso!");
      setShowForm(false);
      setRecipients("");
      setName("");
      setSubject("");
      setHtmlContent("");
      setReplyTo("contato@braille5steps.com");
      setIntervalMinutes(2);
      utils.emailCampaigns.list.invalidate();
    } catch (error) {
      toast.error(`Erro ao criar campanha: ${error instanceof Error ? error.message : "Erro desconhecido"}`);
    }
  };

  const handleSchedule = async (campaignId: number) => {
    try {
      await scheduleMutation.mutateAsync({ id: campaignId });
      toast.success("Campanha agendada com sucesso!");
      utils.emailCampaigns.list.invalidate();
    } catch (error) {
      toast.error(`Erro ao agendar: ${error instanceof Error ? error.message : "Erro desconhecido"}`);
    }
  };

  const handleCancel = async (campaignId: number) => {
    if (!confirm("Tem certeza que deseja cancelar esta campanha?")) return;
    try {
      await cancelMutation.mutateAsync({ id: campaignId });
      toast.success("Campanha cancelada!");
      utils.emailCampaigns.list.invalidate();
    } catch (error) {
      toast.error(`Erro ao cancelar: ${error instanceof Error ? error.message : "Erro desconhecido"}`);
    }
  };

  const handleDelete = async (campaignId: number) => {
    if (!confirm("Tem certeza que deseja deletar esta campanha?")) return;
    try {
      await deleteMutation.mutateAsync({ id: campaignId });
      toast.success("Campanha deletada!");
      utils.emailCampaigns.list.invalidate();
    } catch (error) {
      toast.error(`Erro ao deletar: ${error instanceof Error ? error.message : "Erro desconhecido"}`);
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
      draft: "secondary",
      scheduled: "default",
      running: "default",
      completed: "default",
      cancelled: "destructive",
    };
    const labels: Record<string, string> = {
      draft: "Rascunho",
      scheduled: "Agendada",
      running: "Enviando",
      completed: "Concluída",
      cancelled: "Cancelada",
    };
    return <Badge variant={variants[status] || "secondary"}>{labels[status] || status}</Badge>;
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Campanhas de Email Agendadas</h1>
        <p className="text-muted-foreground mt-2">Crie e gerencie campanhas de envio de emails com intervalo customizável</p>
      </div>

      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle>Criar Nova Campanha</CardTitle>
            <CardDescription>Emails serão enviados com intervalo de N minutos entre cada um</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium">Nome da Campanha</label>
              <Input
                placeholder="Ex: Contato com Universidades"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            <div>
              <label className="text-sm font-medium">Destinatários</label>
              <Textarea
                placeholder="email1@example.com&#10;email2@example.com"
                value={recipients}
                onChange={(e) => setRecipients(e.target.value)}
                className="min-h-24 font-mono text-sm"
              />
              <p className="text-sm text-muted-foreground mt-1">{recipientList.length} email(s) válido(s)</p>
            </div>

            <div>
              <label className="text-sm font-medium">Assunto</label>
              <Input
                placeholder="Assunto do email"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
              />
            </div>

            <div>
              <label className="text-sm font-medium">Intervalo entre emails (minutos)</label>
              <Input
                type="number"
                min={1}
                max={1440}
                value={intervalMinutes}
                onChange={(e) => setIntervalMinutes(parseInt(e.target.value) || 2)}
              />
              <p className="text-sm text-muted-foreground mt-1">
                Tempo de espera entre cada email (1-1440 minutos)
              </p>
            </div>

            <div>
              <label className="text-sm font-medium">Responder Para</label>
              <Input
                type="email"
                placeholder="contato@braille5steps.com"
                value={replyTo}
                onChange={(e) => setReplyTo(e.target.value)}
              />
            </div>

            <div>
              <label className="text-sm font-medium">Conteúdo do Email (HTML)</label>
              <Textarea
                placeholder="<h1>Olá!</h1><p>Este é um email de teste.</p>"
                value={htmlContent}
                onChange={(e) => setHtmlContent(e.target.value)}
                className="min-h-48 font-mono text-sm"
              />
            </div>

            {isPreview && htmlContent.trim() && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Visualização</CardTitle>
                </CardHeader>
                <CardContent>
                  <div
                    className="border rounded p-4 bg-white text-sm max-h-96 overflow-y-auto"
                    dangerouslySetInnerHTML={{ __html: htmlContent }}
                  />
                </CardContent>
              </Card>
            )}

            <div className="flex gap-2">
              <Button
                onClick={() => setIsPreview(!isPreview)}
                variant="outline"
                disabled={!htmlContent.trim()}
              >
                {isPreview ? "Editar" : "Visualizar"}
              </Button>
              <Button
                onClick={handleCreate}
                disabled={
                  createMutation.isPending ||
                  !name.trim() ||
                  !subject.trim() ||
                  !htmlContent.trim() ||
                  recipientList.length === 0
                }
              >
                {createMutation.isPending ? "Criando..." : "Criar Campanha"}
              </Button>
              <Button variant="outline" onClick={() => setShowForm(false)}>
                Cancelar
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {!showForm && (
        <Button onClick={() => setShowForm(true)}>
          <Mail className="w-4 h-4 mr-2" />
          Nova Campanha
        </Button>
      )}

      {isLoading ? (
        <div className="space-y-2">{[1, 2, 3].map((i) => <div key={i} className="h-16 bg-muted animate-pulse rounded" />)}</div>
      ) : campaigns.length === 0 ? (
        <p className="text-muted-foreground italic">Nenhuma campanha criada ainda.</p>
      ) : (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Assunto</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Destinatários</TableHead>
                <TableHead>Enviados</TableHead>
                <TableHead>Intervalo</TableHead>
                <TableHead>Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {campaigns.map((campaign) => (
                <TableRow key={campaign.id}>
                  <TableCell className="font-medium max-w-xs truncate">{campaign.name}</TableCell>
                  <TableCell className="text-sm max-w-xs truncate">{campaign.subject}</TableCell>
                  <TableCell>{getStatusBadge(campaign.status)}</TableCell>
                  <TableCell className="text-sm">{campaign.totalRecipients}</TableCell>
                  <TableCell className="text-sm">
                    {campaign.sentCount}/{campaign.totalRecipients}
                  </TableCell>
                  <TableCell className="text-sm">
                    <div className="flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      {campaign.intervalMinutes}m
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      {campaign.status === "draft" && (
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7"
                          onClick={() => handleSchedule(campaign.id)}
                          disabled={scheduleMutation.isPending}
                          title="Agendar campanha"
                        >
                          <Play className="w-4 h-4 text-green-600" />
                        </Button>
                      )}
                      {(campaign.status === "scheduled" || campaign.status === "running") && (
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7"
                          onClick={() => handleCancel(campaign.id)}
                          disabled={cancelMutation.isPending}
                          title="Cancelar campanha"
                        >
                          <Pause className="w-4 h-4 text-amber-600" />
                        </Button>
                      )}
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 text-destructive hover:text-destructive"
                        onClick={() => handleDelete(campaign.id)}
                        disabled={deleteMutation.isPending}
                        title="Deletar campanha"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
