import { Resend } from "resend";

// Inicialização segura do Resend
function getResend() {
  const key = process.env.RESEND_API_KEY;
  if (!key) return null;
  return new Resend(key);
}

// DESTINATÁRIOS: Certifique-se de que estes e-mails estão verificados no domínio do Resend
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
  message: string; // Pode vir como texto puro ou HTML
  type: string;
}

const typeLabels: Record<string, string> = {
  institution: "Parceria Institucional",
  musician_dv: "Músico com Deficiência Visual",
  musician_nodv: "Músico sem Deficiência Visual",
  general: "Informação Geral",
};

/**
 * Converte texto puro em HTML básico, preservando parágrafos e removendo marcadores visuais indesejados.
 */
function plainTextToHtml(text: string): string {
  if (!text) return "";
  
  // Escapar caracteres HTML para segurança
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

      // Remover marcadores de lista manuais (•, -, *) do início das linhas para evitar as "bolinhas"
      const lines = trimmed.split("\n").map(line => line.replace(/^[\s\u2022\-*]\s*/, ""));
      
      // Juntar linhas com <br> e envolver em <p>
      return `<p style="margin: 0 0 16px 0; font-family: Arial, sans-serif; font-size: 16px; line-height: 1.6; color: #333; text-align: left;">${lines.join("<br>")}</p>`;
    })
    .join("");
}

export async function sendContactEmail(payload: ContactEmailPayload): Promise<void> {
  const client = getResend();
  if (!client) {
    console.warn("[email] RESEND_API_KEY not set");
    return;
  }

  const typeLabel = typeLabels[payload.type] ?? payload.type;
  
  // Decide se converte ou usa o HTML direto
  const isHtml = payload.message.includes('<');
  const messageBody = isHtml ? payload.message : plainTextToHtml(payload.message);

  // Template minimalista e profissional
  const html = `
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"></head>
    <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #ffffff;">
      <div style="max-width: 650px; margin: 0 auto; padding: 20px;">
        
        <!-- Cabeçalho Discreto -->
        <div style="margin-bottom: 20px; padding-bottom: 10px; border-bottom: 1px solid #eeeeee; font-size: 14px; color: #666;">
          <strong>De:</strong> ${escapeHtml(payload.name)} &lt;${escapeHtml(payload.email)}&gt;<br>
          ${payload.institution ? `<strong>Instituição:</strong> ${escapeHtml(payload.institution)}<br>` : ""}
          <strong>Tipo:</strong> ${escapeHtml(typeLabel)}
        </div>

        <!-- Corpo da Mensagem -->
        <div style="font-size: 16px; line-height: 1.6; color: #333; text-align: left;">
          ${messageBody}
        </div>

      </div>
    </body>
    </html>
  `;

  try {
    const { data, error } = await client.emails.send({
      from: FROM_ADDRESS,
      to: CONTACT_RECIPIENTS, // Envia para TODOS na lista
      replyTo: [payload.email, REPLY_TO],
      subject: `[Five Steps] ${payload.subject}`,
      html: html,
    });

    if (error) {
      console.error("[email] Erro ao enviar:", error);
    } else {
      console.log("[email] Enviado com sucesso para:", CONTACT_RECIPIENTS);
    }
  } catch (err) {
    console.error("[email] Exceção ao enviar:", err);
  }
}

// Funções auxiliares para outros tipos de envio (Bulk, etc.)
export async function sendEmail(opts: { to: string; subject: string; html: string; replyTo?: string }): Promise<void> {
  const client = getResend();
  if (!client) throw new Error("RESEND_API_KEY not configured");
  
  const finalHtml = opts.html.includes('<') ? opts.html : plainTextToHtml(opts.html);
  
  const { error } = await client.emails.send({
    from: FROM_ADDRESS,
    to: opts.to,
    replyTo: opts.replyTo ? [opts.replyTo] : [REPLY_TO],
    subject: opts.subject,
    html: finalHtml,
  });
  
  if (error) throw new Error(error.message);
}

function escapeHtml(str: string): string {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}
