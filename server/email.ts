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
 * - Transforma quebras de linha simples em <br>.
 * - Força alinhamento à esquerda em cada parágrafo.
 */
function plainTextToHtml(text: string): string {
  if (!text) return "";
  
  // 1. Escapar caracteres HTML para segurança (evita XSS)
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
      return `<p style="margin: 0 0 18px 0; font-family: Arial, Helvetica, sans-serif; font-size: 16px; line-height: 1.6; color: #333333; text-align: left;">${lines.join("<br>")}</p>`;
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

  // TEMPLATE DE E-MAIL ROBUSTO COM TABELA
  // Usamos table-layout: fixed e width: 100% para garantir que ocupe a tela toda
  // mas com um max-width interno para legibilidade, alinhado à ESQUERDA.
  const html = `
    <!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
    <html xmlns="http://www.w3.org/1999/xhtml">
    <head>
      <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
      <title>Five Steps Contact</title>
    </head>
    <body style="margin: 0; padding: 0; background-color: #ffffff; font-family: Arial, Helvetica, sans-serif;">
      
      <!-- Tabela Mestra: Ocupa 100% da largura, fundo branco -->
      <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #ffffff;">
        <tr>
          <td align="left" style="padding: 20px 20px 40px 20px;">
            
            <!-- Container Interno: Limita a largura para não ficar esticado demais em telas grandes, mas alinhado à esquerda -->
            <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 700px;">
              
              <!-- Cabeçalho Discreto com Dados do Remetente -->
              <tr>
                <td style="padding-bottom: 20px; border-bottom: 1px solid #eeeeee; font-family: Arial, sans-serif; font-size: 14px; color: #666666; text-align: left;">
                  <strong style="color: #1a2a5e;">De:</strong> ${escapeHtml(payload.name)} &lt;${escapeHtml(payload.email)}&gt;<br/>
                  ${payload.institution ? `<strong style="color: #1a2a5e;">Instituição:</strong> ${escapeHtml(payload.institution)}<br/>` : ""}
                  <strong style="color: #1a2a5e;">Tipo:</strong> ${escapeHtml(typeLabel)}
                </td>
              </tr>

              <!-- Corpo da Mensagem -->
              <tr>
                <td style="padding-top: 20px; font-family: Arial, sans-serif; font-size: 16px; line-height: 1.6; color: #333333; text-align: left;">
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
  
  // Usa o mesmo template robusto para consistência
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

function escapeHtml(str: string): string {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}
