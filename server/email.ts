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
 * Prepara o texto da mensagem para exibição limpa.
 * Remove marcadores visuais e normaliza espaços.
 */
function cleanMessage(text: string): string {
  if (!text) return "";
  
  // Remove marcadores visuais (•, -, *) do início das linhas
  const lines = text.split("\n").map(line => line.replace(/^[\s\u2022\-*]\s*/, ""));
  
  // Junta as linhas, preservando parágrafos (linhas vazias)
  return lines.join("\n");
}

export async function sendContactEmail(payload: ContactEmailPayload): Promise<void> {
  const client = getResend();
  if (!client) return;

  const typeLabel = typeLabels[payload.type] ?? payload.type;
  const cleanMsg = cleanMessage(payload.message);

  // VERSÃO EM TEXTO PURO (O Gmail prioriza isso se o HTML for suspeito)
  const textBody = `Nova Mensagem de Contato - Five Steps

De: ${payload.name} <${payload.email}>
Instituição: ${payload.institution || "Não informada"}
Tipo: ${typeLabel}
Assunto: ${payload.subject}

--------------------------------------------------
${cleanMsg}
--------------------------------------------------

Enviado via braille5steps.com`;

  // VERSÃO HTML MINIMALISTA (Apenas para preservar quebras de linha visualmente)
  const htmlBody = `
    <div style="font-family: Arial, sans-serif; font-size: 14px; line-height: 1.5; color: #333;">
      <p><strong>Nova Mensagem de Contato - Five Steps</strong></p>
      <p>
        <strong>De:</strong> ${escapeHtml(payload.name)} &lt;${escapeHtml(payload.email)}&gt;<br>
        ${payload.institution ? `<strong>Instituição:</strong> ${escapeHtml(payload.institution)}<br>` : ""}
        <strong>Tipo:</strong> ${escapeHtml(typeLabel)}<br>
        <strong>Assunto:</strong> ${escapeHtml(payload.subject)}
      </p>
      <hr style="border: 0; border-top: 1px solid #eee; margin: 16px 0;">
      <div style="white-space: pre-wrap;">${escapeHtml(cleanMsg)}</div>
      <hr style="border: 0; border-top: 1px solid #eee; margin: 16px 0;">
      <p style="font-size: 12px; color: #999;">Enviado via <a href="https://www.braille5steps.com" style="color: #1a2a5e;">braille5steps.com</a></p>
    </div>
  `;

  try {
    await client.emails.send({
      from: FROM_ADDRESS,
      to: CONTACT_RECIPIENTS,
      replyTo: [payload.email, REPLY_TO],
      subject: `[Five Steps] ${payload.subject}`,
      text: textBody, // IMPORTANTE: Enviamos a versão em texto puro também
      html: htmlBody,
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
