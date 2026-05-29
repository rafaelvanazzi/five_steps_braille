import { Resend } from "resend";

// Resend is initialized lazily so the server doesn't crash when the key is not yet set
function getResend() {
  const key = process.env.RESEND_API_KEY;
  if (!key) return null;
  return new Resend(key);
}

// Recipients who receive all contact form submissions
const CONTACT_RECIPIENTS = [
  "contato@braille5steps.com",
  "rafaelvanazzi@gmail.com",
];

// Sender address — verified domain in Resend.
const FROM_ADDRESS = "Five Steps <noreply@braille5steps.com>";

// Reply-to address — replies to automated emails go here
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
 * Converts plain text to simple HTML, preserving paragraphs and line breaks.
 * Avoids aggressive list detection to prevent "bullet point" issues.
 */
function textToHtml(text: string): string {
  if (!text) return "";
  
  // Escape HTML entities to prevent XSS
  let safeText = text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

  // Convert double newlines to paragraph breaks
  // Convert single newlines to <br>
  const paragraphs = safeText.split(/\n\s*\n/);
  
  return paragraphs
    .map(p => {
      const trimmed = p.trim();
      if (!trimmed) return "";
      // Replace single newlines within the paragraph with <br>
      const withBreaks = trimmed.replace(/\n/g, "<br>");
      return `<p style="margin: 0 0 16px 0;">${withBreaks}</p>`;
    })
    .join("");
}

export async function sendContactEmail(payload: ContactEmailPayload): Promise<void> {
  const typeLabel = typeLabels[payload.type] ?? payload.type;

  // Convert the user's message to clean HTML
  const messageHtml = textToHtml(payload.message);

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="margin: 0; padding: 0; background-color: #f4f4f4; font-family: Arial, sans-serif;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f4f4f4;">
        <tr>
          <td align="center" style="padding: 20px 10px;">
            <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="max-width: 600px; width: 100%; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.05);">
              <!-- Header -->
              <tr>
                <td style="background-color: #1a2a5e; padding: 24px 30px; text-align: center;">
                  <h1 style="margin: 0; color: #f5c842; font-size: 24px; font-weight: bold;">Five Steps</h1>
                  <p style="margin: 5px 0 0; color: #ffffff; font-size: 14px; opacity: 0.9;">Nova Mensagem de Contato</p>
                </td>
              </tr>
              
              <!-- Content -->
              <tr>
                <td style="padding: 30px; font-size: 16px; line-height: 1.6; color: #333333;">
                  
                  <!-- Meta Data Table -->
                  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom: 25px; border-bottom: 1px solid #eeeeee; padding-bottom: 20px;">
                    <tr>
                      <td width="120" style="padding: 5px 0; color: #666666; font-size: 14px; font-weight: bold; vertical-align: top;">Nome:</td>
                      <td style="padding: 5px 0; color: #333333; font-size: 14px;">${escapeHtml(payload.name)}</td>
                    </tr>
                    <tr>
                      <td style="padding: 5px 0; color: #666666; font-size: 14px; font-weight: bold; vertical-align: top;">E-mail:</td>
                      <td style="padding: 5px 0; color: #333333; font-size: 14px;">
                        <a href="mailto:${escapeHtml(payload.email)}" style="color: #1a2a5e; text-decoration: none;">${escapeHtml(payload.email)}</a>
                      </td>
                    </tr>
                    ${payload.institution ? `
                    <tr>
                      <td style="padding: 5px 0; color: #666666; font-size: 14px; font-weight: bold; vertical-align: top;">Instituição:</td>
                      <td style="padding: 5px 0; color: #333333; font-size: 14px;">${escapeHtml(payload.institution)}</td>
                    </tr>` : ""}
                    <tr>
                      <td style="padding: 5px 0; color: #666666; font-size: 14px; font-weight: bold; vertical-align: top;">Tipo:</td>
                      <td style="padding: 5px 0; color: #333333; font-size: 14px;">${escapeHtml(typeLabel)}</td>
                    </tr>
                    <tr>
                      <td style="padding: 5px 0; color: #666666; font-size: 14px; font-weight: bold; vertical-align: top;">Assunto:</td>
                      <td style="padding: 5px 0; color: #333333; font-size: 14px;">${escapeHtml(payload.subject)}</td>
                    </tr>
                  </table>

                  <!-- Message Body -->
                  <div style="background-color: #f9f9f9; border-left: 4px solid #f5c842; padding: 20px; border-radius: 4px;">
                    <div style="font-size: 15px; line-height: 1.6; color: #333333;">
                      ${messageHtml}
                    </div>
                  </div>

                </td>
              </tr>

              <!-- Footer -->
              <tr>
                <td style="background-color: #f8f8f8; padding: 20px 30px; text-align: center; border-top: 1px solid #eeeeee;">
                  <p style="margin: 0; font-size: 12px; color: #999999;">
                    Esta mensagem foi enviada pelo formulário de contato em 
                    <a href="https://www.braille5steps.com/contato" style="color: #1a2a5e; text-decoration: none;">braille5steps.com</a>
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
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

export interface BulkEmailPayload {
  recipients: string[];
  subject: string;
  htmlContent: string;
  replyTo?: string;
}

/**
 * Send a single email - used by the email queue
 */
export async function sendEmail(opts: { to: string; subject: string; html: string; replyTo?: string }): Promise<void> {
  const client = getResend();
  if (!client) {
    throw new Error("RESEND_API_KEY not configured");
  }
  
  // If the content is plain text, convert it. If it's already HTML, use it.
  const finalHtml = opts.html.includes('<') ? opts.html : textToHtml(opts.html);
  
  const fullHtml = wrapEmailTemplate(finalHtml);
  
  const { error } = await client.emails.send({
    from: FROM_ADDRESS,
    to: opts.to,
    replyTo: opts.replyTo ? [opts.replyTo] : [REPLY_TO],
    subject: opts.subject,
    html: fullHtml,
  });
  
  if (error) {
    throw new Error(error.message);
  }
}

export async function sendBulkEmail(payload: BulkEmailPayload): Promise<{ success: number; failed: number; errors: string[] }> {
  const client = getResend();
  if (!client) {
    console.warn("[email] RESEND_API_KEY not set — skipping bulk email send");
    return { success: 0, failed: payload.recipients.length, errors: ["RESEND_API_KEY not configured"] };
  }

  // Ensure content is HTML
  const finalHtml = payload.htmlContent.includes('<') ? payload.htmlContent : textToHtml(payload.htmlContent);
  const fullHtml = wrapEmailTemplate(finalHtml);

  const results = { success: 0, failed: 0, errors: [] as string[] };

  for (const recipient of payload.recipients) {
    try {
      const { error } = await client.email
