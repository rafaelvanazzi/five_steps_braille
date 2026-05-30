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
 * Converte texto puro em HTML limpo, alinhado à esquerda e sem bolinhas.
 */
function cleanTextToHtml(text: string): string {
  if (!text) return "";
  
  // 1. Escapar HTML para segurança
  let safeText = text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

  // 2. Dividir em parágrafos (quebras de linha duplas)
  const paragraphs = safeText.split(/\n\s*\n/);
  
  return paragraphs
    .map(p => {
      const trimmed = p.trim();
      if (!trimmed) return "";

      // 3. Limpar marcadores de lista (•, -, *) do início de cada linha dentro do parágrafo
      // Isso remove as "bolinhas" visuais que você mencionou
      const lines = trimmed.split("\n").map(line => {
        // Remove •, - ou * se estiverem no começo da linha, seguidos de espaço
        return line.replace(/^[\s\u2022\-*]\s*/, "");
      });

      // 4. Juntar as linhas com <br> e envolver em <p> alinhado à esquerda
      const withBreaks = lines.join("<br>");
      
      return `<p style="margin: 0 0 16px 0; font-family: Arial, sans-serif; font-size: 16px; line-height: 1.6; color: #333; text-align: left;">${withBreaks}</p>`;
    })
    .join("");
}

export async function sendContactEmail(payload: ContactEmailPayload): Promise<void> {
  const typeLabel = typeLabels[payload.type] ?? payload.type;
  const messageHtml = cleanTextToHtml(payload.message);

  // Template minimalista, alinhado à esquerda, sem molduras pesadas
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
    </head>
    <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #ffffff;">
      
      <!-- Container principal com largura máxima para não ficar "esticado" demais -->
      <div style="max-width: 650px; margin: 0 auto; padding: 20px;">
        
        <!-- Cabeçalho discreto com dados do remetente -->
        <div style="margin-bottom: 25px; padding-bottom: 15px; border-bottom: 1px solid #eeeeee; font-size: 14px; color: #555555;">
          <strong>De:</strong> ${escapeHtml(payload.name)} &lt;${escapeHtml(payload.email)}&gt;<br>
          ${payload.institution ? `<strong>Instituição:</strong> ${escapeHtml(payload.institution)}<br>` : ""}
          <strong>Tipo:</strong> ${escapeHtml(typeLabel)}
        </div>

        <!-- Corpo da Mensagem (Alinhado à Esquerda) -->
        <div style="font-family: Arial, sans-serif; font-size: 16px; line-height: 1.6; color: #333333; text-align: left;">
          ${messageHtml}
        </div>

      </div>

    </body>
    </html>
  `;

  const client = getResend();
  if (!client) {
    console.warn("[email] RESEND_API_KEY not set — skipping email send");
    return;
  }

  const { error } = await client.emails.send({
    from: FROM_ADDRESS,
    to: CONTACT_RECIPIENTS,
    replyTo: [payload.email, REPLY_TO],
    subject: `[Five Steps] ${payload.subject}`,
    html,
  });

  if (error) {
    console.error("[email] Failed to send contact email:", error);
  }
}

// ... (O resto das funções sendEmail e sendBulkEmail pode permanecer igual, 
// mas certifique-se de usar cleanTextToHtml nelas também se forem usadas para textos puros)

export interface BulkEmailPayload {
  recipients: string[];
  subject: string;
  htmlContent: string;
  replyTo?: string;
}

export async function sendEmail(opts: { to: string; subject: string; html: string; replyTo?: string }): Promise<void> {
  const client = getResend();
  if (!client) throw new Error("RESEND_API_KEY not configured");
  
  // Se for texto puro, limpa. Se já for HTML, usa direto.
  const finalHtml = opts.html.includes('<') ? opts.html : cleanTextToHtml(opts.html);
  
  const fullHtml = `<!DOCTYPE html><html><head><meta charset="utf-8"></head><body style="margin:0;padding:20px;font-family:Arial,sans-serif;background:#fff;"><div style="max-width:650px;margin:0 auto;">${finalHtml}</div></body></html>`;
  
  const { error } = await client.emails.send({
    from: FROM_ADDRESS,
    to: opts.to,
    replyTo: opts.replyTo ? [opts.replyTo] : [REPLY_TO],
    subject: opts.subject,
    html: fullHtml,
  });
  
  if (error) throw new Error(error.message);
}

export async function sendBulkEmail(payload: BulkEmailPayload): Promise<{ success: number; failed: number; errors: string[] }> {
  const client = getResend();
  if (!client) return { success: 0, failed: payload.recipients.length, errors: ["RESEND_API_KEY not configured"] };

  const finalHtml = payload.htmlContent.includes('<') ? payload.htmlContent : cleanTextToHtml(payload.htmlContent);
  const fullHtml = `<!DOCTYPE html><html><head><meta charset="utf-8"></head><body style="margin:0;padding:20px;font-family:Arial,sans-serif;background:#fff;"><div style="max-width:650px;margin:0 auto;">${finalHtml}</div></body></html>`;

  const results = { success: 0, failed: 0, errors: [] as string[] };

  for (const recipient of payload.recipients) {
    try {
      const { error } = await client.emails.send({
        from: FROM_ADDRESS,
        to: recipient,
        replyTo: payload.replyTo ? [payload.replyTo] : [REPLY_TO],
        subject: payload.subject,
        html: fullHtml,
      });
      if (error) { results.failed++; results.errors.push(`${recipient}: ${error.message}`); } else { results.success++; }
    } catch (err) {
      results.failed++;
      results.errors.push(`${recipient}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }
  return results;
}

function escapeHtml(str: string): string {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}
