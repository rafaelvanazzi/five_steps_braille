import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { trpc } from "@/lib/trpc";
import { AlertCircle, CheckCircle2, Mail } from "lucide-react";

export default function AdminBulkEmail() {
  const [recipients, setRecipients] = useState("");
  const [subject, setSubject] = useState("");
  const [htmlContent, setHtmlContent] = useState("");
  const [replyTo, setReplyTo] = useState("contato@braille5steps.com");
  const [isPreview, setIsPreview] = useState(false);

  const sendBulkEmailMutation = trpc.admin.sendBulkEmail.useMutation();

  const parseRecipients = (text: string): string[] => {
    return text
      .split(/[\n,;]/)
      .map((email) => email.trim())
      .filter((email) => email.length > 0 && email.includes("@"));
  };

  const recipientList = parseRecipients(recipients);

  const handleSend = async () => {
    if (!subject.trim()) {
      alert("Por favor, insira um assunto");
      return;
    }

    if (!htmlContent.trim()) {
      alert("Por favor, insira o conteúdo do email");
      return;
    }

    if (recipientList.length === 0) {
      alert("Por favor, insira pelo menos um email válido");
      return;
    }

    if (!confirm(`Enviar email para ${recipientList.length} destinatários?`)) {
      return;
    }

    try {
      const result = await sendBulkEmailMutation.mutateAsync({
        recipients: recipientList,
        subject,
        htmlContent,
        replyTo: replyTo || undefined,
      });

      alert(
        `Emails enviados com sucesso!\n\nEnviados: ${result.success}\nFalhados: ${result.failed}${
          result.errors.length > 0 ? `\n\nErros:\n${result.errors.join("\n")}` : ""
        }`
      );

      if (result.success === recipientList.length) {
        // Clear form on complete success
        setRecipients("");
        setSubject("");
        setHtmlContent("");
      }
    } catch (error) {
      alert(`Erro ao enviar emails: ${error instanceof Error ? error.message : "Erro desconhecido"}`);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Envio de Emails em Massa</h1>
        <p className="text-muted-foreground mt-2">Envie emails para múltiplos destinatários</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          {/* Recipients */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="w-5 h-5" />
                Destinatários
              </CardTitle>
              <CardDescription>
                Insira emails separados por vírgula, ponto-e-vírgula ou quebra de linha
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Textarea
                placeholder="email1@example.com&#10;email2@example.com&#10;email3@example.com"
                value={recipients}
                onChange={(e) => setRecipients(e.target.value)}
                className="min-h-32 font-mono text-sm"
              />
              <p className="text-sm text-muted-foreground mt-2">
                {recipientList.length} email(s) válido(s) detectado(s)
              </p>
            </CardContent>
          </Card>

          {/* Subject */}
          <Card>
            <CardHeader>
              <CardTitle>Assunto</CardTitle>
            </CardHeader>
            <CardContent>
              <Input
                placeholder="Assunto do email"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
              />
            </CardContent>
          </Card>

          {/* Reply-To */}
          <Card>
            <CardHeader>
              <CardTitle>Responder Para</CardTitle>
              <CardDescription>Email para onde as respostas serão enviadas</CardDescription>
            </CardHeader>
            <CardContent>
              <Input
                type="email"
                placeholder="contato@braille5steps.com"
                value={replyTo}
                onChange={(e) => setReplyTo(e.target.value)}
              />
            </CardContent>
          </Card>

          {/* HTML Content */}
          <Card>
            <CardHeader>
              <CardTitle>Conteúdo do Email (HTML)</CardTitle>
              <CardDescription>Você pode usar HTML para formatar o email</CardDescription>
            </CardHeader>
            <CardContent>
              <Textarea
                placeholder="<h1>Olá!</h1><p>Este é um email de teste.</p>"
                value={htmlContent}
                onChange={(e) => setHtmlContent(e.target.value)}
                className="min-h-64 font-mono text-sm"
              />
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="flex gap-3">
            <Button
              onClick={() => setIsPreview(!isPreview)}
              variant="outline"
              disabled={!htmlContent.trim()}
            >
              {isPreview ? "Editar" : "Visualizar"}
            </Button>
            <Button
              onClick={handleSend}
              disabled={
                sendBulkEmailMutation.isPending ||
                !subject.trim() ||
                !htmlContent.trim() ||
                recipientList.length === 0
              }
            >
              {sendBulkEmailMutation.isPending ? "Enviando..." : "Enviar Emails"}
            </Button>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Status */}
          {sendBulkEmailMutation.isSuccess && (
            <Alert className="border-green-200 bg-green-50">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">
                Emails enviados com sucesso!
              </AlertDescription>
            </Alert>
          )}

          {sendBulkEmailMutation.isError && (
            <Alert className="border-red-200 bg-red-50">
              <AlertCircle className="h-4 w-4 text-red-600" />
              <AlertDescription className="text-red-800">
                Erro ao enviar emails. Tente novamente.
              </AlertDescription>
            </Alert>
          )}

          {/* Preview */}
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

          {/* Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Resumo</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div>
                <span className="text-muted-foreground">Destinatários:</span>
                <span className="font-semibold ml-2">{recipientList.length}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Assunto:</span>
                <span className="font-semibold ml-2">{subject || "—"}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Responder Para:</span>
                <span className="font-semibold ml-2">{replyTo || "—"}</span>
              </div>
            </CardContent>
          </Card>

          {/* Template Suggestions */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Templates Rápidos</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button
                variant="outline"
                size="sm"
                className="w-full justify-start text-left"
                onClick={() => {
                  setSubject("Conheça o Five Steps - Musicografia Braille");
                  setHtmlContent(`
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
  <h1 style="color: #1a2a5e;">Five Steps</h1>
  <p>Olá,</p>
  <p>Gostaria de compartilhar com você o <strong>Five Steps</strong>, uma plataforma inovadora de musicografia Braille.</p>
  <p>Visite nosso site: <a href="https://www.braille5steps.com" style="color: #f5c842;">braille5steps.com</a></p>
  <p>Atenciosamente,<br>Equipe Five Steps</p>
</div>
                  `);
                }}
              >
                Template: Apresentação
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="w-full justify-start text-left"
                onClick={() => {
                  setSubject("Convite para Colaboração - Five Steps");
                  setHtmlContent(`
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
  <h1 style="color: #1a2a5e;">Convite para Colaboração</h1>
  <p>Olá,</p>
  <p>Estamos convidando você a colaborar com o projeto <strong>Five Steps</strong>.</p>
  <p>Para mais informações, entre em contato conosco em <a href="mailto:contato@braille5steps.com">contato@braille5steps.com</a></p>
  <p>Atenciosamente,<br>Equipe Five Steps</p>
</div>
                  `);
                }}
              >
                Template: Colaboração
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
