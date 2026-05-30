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
 * Converte texto puro em HTML limpo.
 * - Remove marcadores visuais (•, -, *) do início das linhas.
 * - Transforma quebras de linha duplas em parágrafos.
 * - Força alinhamento à esquerda em todos os elementos.
 */
function plainTextToHtml(text: string): string {
  if (!text) return "";
  
  // 1. Escapar caracteres HTML para segurança
  let safeText = text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

  // 2. Dividir por parágrafos (duas quebras de linha consecutivas)
  const paragraphs = safeText.split(/\n\s*\n/);
  
  return paragraphs
    .map(p => {
      const trimmed = p.trim();
      if (!trimmed) return "";

      // 3. Limpar marcadores de lista manuais (•, -, *) do início de CADA linha dentro do parágrafo
      // Isso garante que não apareçam bolinhas indesejadas
      const lines = trimmed.split("\n").map(line => {
        // Regex remove •, - ou * se estiverem no começo da linha, seguidos de espaço opcional
        return line.replace(/^[\s\u2022\-*]\s*/, "");
      });
      
      // 4. Juntar as linhas com <br> e envolver em <p> com estilo inline forte
      // Usamos align="left" (atributo HTML antigo) E text-align: left !important (CSS)
      return `<p align="left" style="margin: 0 0 18px 0; font-family: Arial, Helvetica, sans-serif; font-size: 16px; line-height: 1.6; color: #333333; text-align: left !important;">${lines.join("<br>")}</p>`;
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
  
  // Converte o texto do usuário para HTML limpo
  const messageBody = plainTextToHtml(payload.message);

  // TEMPLATE DE E-MAIL ROBUSTO COM TABELA
  // Usamos table-layout e align="left" explícito para evitar centralização
  const html = `
    <!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
    <html xmlns="http://www.w3.org/1999/xhtml">
    <head>
      <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
      <title>Five Steps Contact</title>
    </head>
    <body style="margin: 0; padding: 0; background-color: #ffffff; font-family: Arial, Helvetica, sans-serif;">
      
      <!-- Tabela Mestra: Ocupa 100% da largura, alinhada à esquerda -->
      <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" align="left" style="background-color: #ffffff; text-align: left;">
        <tr>
          <td align="left" style="padding: 20px 20px 40px 20px;">
            
            <!-- Container Interno: Limita a largura para legibilidade, mas mantém alinhamento à esquerda -->
            <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" align="left" style="max-width: 700px; text-align: left;">
              
              <!-- Cabeçalho Discreto com Dados do Remetente -->
              <tr>
                <td align="left" style="padding-bottom: 20px; border-bottom: 1px solid #eeeeee; font-family: Arial, sans-serif; font-size: 14px; color: #666666; text-align: left;">
                  <strong style="color: #1a2a5e;">De:</strong> ${escapeHtml(payload.name)} &lt;${escapeHtml(payload.email)}&gt;<br/>
                  ${payload.institution ? `<strong style="color: #1a2a5e;">Instituição:</strong> ${escapeHtml(payload.institution)}<br/>` : ""}
                  <strong style="color: #1a2a5e;">Tipo:</strong> ${escapeHtml(typeLabel)}
                </td>
              </tr>

              <!-- Corpo da Mensagem -->
              <tr>
                <td align="left" style="padding-top: 20px; font-family: Arial, sans-serif; font-size: 16px; line-height: 1.6; color: #333333; text-align: left !important;">
                  ${messageBody}
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
      to: CONTACT_RECIPIENTS, // Envia para TODOS na lista
      replyTo: [payload.email, REPLY_TO],
      subject: `[Five Steps] ${payload.subject}`,
      html: html,
    });
  } catch (err) {
    console.error("[email] Erro ao enviar:", err);
  }
}

// Funções auxiliares para outros tipos de envio (Bulk, etc.)
export async function sendEmail(opts: { to: string; subject: string; html: string; replyTo?: string }): Promise<void> {
  const client = getResend();
  if (!client) throw new Error("RESEND_API_KEY not configured");
  
  // Se for texto puro, converte. Se já for HTML, usa direto.
  const finalHtml = opts.html.includes('<') ? opts.html : plainTextToHtml(opts.html);
  
  // Usa um template simples para e-mails avulsos
  const fullHtml = `<!DOCTYPE html><html><head><meta charset="utf-8"></head><body style="margin:0;padding:20px;font-family:Arial,sans-serif;background:#fff;"><div style="max-width:700px;margin:0 auto;text-align:left;">${finalHtml}</div></body></html>`;
  
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

  const finalHtml = payload.htmlContent.includes('<') ? payload.htmlContent : plainTextToHtml(payload.htmlContent);
  const fullHtml = `<!DOCTYPE html><html><head><meta charset="utf-8"></head><body style="margin:0;padding:20px;font-family:Arial,sans-serif;background:#fff;"><div style="max-width:700px;margin:0 auto;text-align:left;">${finalHtml}</div></body></html>`;

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
