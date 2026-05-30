import { Resend } from "resend";

function getResend() {
  const key = process.env.RESEND_API_KEY;
  if (!key) return null;
  return new Resend(key);
}

const CONTACT_RECIPIENTS = [
  "contato@braille5steps.com",
  "rafaelvanazzi@gmail.com",
];

const FROM_ADDRESS = "Five Steps <noreply@braille5steps.com>";
const REPLY_TO = "contato@braille5steps.com";

export interface ContactEmailPayload {
  name: string;
  email: string;
  institution?: string;
  subject: string;
  message: string;
  type: string;
}

const typeLabels: Record<string, string> = {
  institution: "Parceria Institucional",
  musician_dv: "Músico com Deficiência Visual",
  musician_nodv: "Músico sem Deficiência Visual",
  general: "Informação Geral",
};

/**
 * Converte texto puro em HTML simples, removendo marcadores e formatando parágrafos.
 */
function formatMessageToHtml(text: string): string {
  if (!text) return "";
  
  // Escapar HTML
  let safeText = text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

  // Dividir por parágrafos (duas quebras de linha)
  const paragraphs = safeText.split(/\n\s*\n/);
  
  return paragraphs
    .map(p => {
      const trimmed = p.trim();
      if (!trimmed) return "";

      // Remover marcadores visuais (•, -, *) do início das linhas
      const lines = trimmed.split("\n").map(line => line.replace(/^[\s\u2022\-*]\s*/, ""));
      
      // Usar <p> simples com estilo mínimo e alinhamento à esquerda explícito
      return `<p style="margin: 0 0 16px 0; font-family: Arial, sans-serif; font-size: 14px; line-height: 1.5; color: #333333; text-align: left;">${lines.join("<br>")}</p>`;
    })
    .join("");
}

export async function sendContactEmail(payload: ContactEmailPayload): Promise<void> {
  const client = getResend();
  if (!client) return;

  const typeLabel = typeLabels[payload.type] ?? payload.type;
  const formattedMessage = formatMessageToHtml(payload.message);

  // TEMPLATE MINIMALISTA EM XHTML PARA EVITAR TRUNCAMENTO DO GMAIL
  const html = `
<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
<meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
<title>Five Steps Contact</title>
</head>
<body style="margin: 0; padding: 0; background-color: #ffffff; font-family: Arial, sans-serif;">
  <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #ffffff;">
    <tr>
      <td align="left" style="padding: 20px;">
        <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px;">
          <!-- Cabeçalho Discreto -->
          <tr>
            <td style="padding-bottom: 15px; border-bottom: 1px solid #eeeeee; font-size: 12px; color: #666666; text-align: left;">
              <strong>De:</strong> ${escapeHtml(payload.name)} &lt;${escapeHtml(payload.email)}&gt;<br/>
              ${payload.institution ? `<strong>Instituição:</strong> ${escapeHtml(payload.institution)}<br/>` : ""}
              <strong>Tipo:</strong> ${escapeHtml(typeLabel)}
            </td>
          </tr>
          <!-- Corpo da Mensagem -->
          <tr>
            <td style="padding-top: 20px; font-size: 14px; line-height: 1.5; color: #333333; text-align: left;">
              ${formattedMessage}
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;

  try {
    await client.emails.send({
      from: FROM_ADDRESS,
      to: CONTACT_RECIPIENTS,
      replyTo: [payload.email, REPLY_TO],
      subject: `[Five Steps] ${payload.subject}`,
      html: html,
    });
  } catch (err) {
    console.error("[email] Erro ao enviar:", err);
  }
}

// Funções auxiliares simplificadas
export async function sendEmail(opts: { to: string; subject: string; html: string; replyTo?: string }): Promise<void> {
  const client = getResend();
  if (!client) throw new Error("RESEND_API_KEY not configured");
  
  const { error } = await client.emails.send({
    from: FROM_ADDRESS,
    to: opts.to,
    replyTo: opts.replyTo ? [opts.replyTo] : [REPLY_TO],
    subject: opts.subject,
    html: opts.html,
  });
  
  if (error) throw new Error(error.message);
}

export async function sendBulkEmail(payload: any): Promise<any> {
  return { success: 0, failed: 0, errors: ["Não implementado nesta versão simplificada"] };
}

function escapeHtml(str: string): string {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}
