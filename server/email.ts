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

export async function sendContactEmail(payload: ContactEmailPayload): Promise<void> {
  const typeLabel = typeLabels[payload.type] ?? payload.type;

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #f9f9f9;">
      <div style="background: #1a2a5e; padding: 20px 24px; border-radius: 8px 8px 0 0;">
        <h1 style="color: #f5c842; margin: 0; font-size: 20px;">Five Steps — Nova Mensagem de Contato</h1>
      </div>
      <div style="background: #ffffff; padding: 24px; border-radius: 0 0 8px 8px; border: 1px solid #e0e0e0;">
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
          <tr>
            <td style="padding: 8px 0; color: #666; font-size: 13px; width: 130px;"><strong>Nome</strong></td>
            <td style="padding: 8px 0; font-size: 14px;">${escapeHtml(payload.name)}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #666; font-size: 13px;"><strong>E-mail</strong></td>
            <td style="padding: 8px 0; font-size: 14px;"><a href="mailto:${escapeHtml(payload.email)}" style="color: #1a2a5e;">${escapeHtml(payload.email)}</a></td>
          </tr>
          ${payload.institution ? `
          <tr>
            <td style="padding: 8px 0; color: #666; font-size: 13px;"><strong>Instituição</strong></td>
            <td style="padding: 8px 0; font-size: 14px;">${escapeHtml(payload.institution)}</td>
          </tr>` : ""}
          <tr>
            <td style="padding: 8px 0; color: #666; font-size: 13px;"><strong>Tipo</strong></td>
            <td style="padding: 8px 0; font-size: 14px;">${escapeHtml(typeLabel)}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #666; font-size: 13px;"><strong>Assunto</strong></td>
            <td style="padding: 8px 0; font-size: 14px;">${escapeHtml(payload.subject)}</td>
          </tr>
        </table>
        <div style="background: #f5f5f5; border-left: 4px solid #f5c842; padding: 16px; border-radius: 4px;">
          <p style="margin: 0; font-size: 14px; line-height: 1.6; white-space: pre-wrap;">${escapeHtml(payload.message)}</p>
        </div>
        <p style="margin-top: 20px; font-size: 12px; color: #999;">
          Esta mensagem foi enviada pelo formulário de contato em 
          <a href="https://www.braille5steps.com/contato" style="color: #1a2a5e;">braille5steps.com</a>
        </p>
      </div>
    </div>
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
    // Log but don't throw — contact is already saved in DB and Manus notified
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
  // Ensure content is HTML and wrap in email template
  const htmlBody = ensureHtml(opts.html);
  const fullHtml = wrapEmailTemplate(htmlBody);
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

  // Ensure content is HTML and wrap in email template
  const htmlBody = ensureHtml(payload.htmlContent);
  const fullHtml = wrapEmailTemplate(htmlBody);

  const results = { success: 0, failed: 0, errors: [] as string[] };

  // Send emails one by one to track individual failures
  for (const recipient of payload.recipients) {
    try {
      const { error } = await client.emails.send({
        from: FROM_ADDRESS,
        to: recipient,
        replyTo: payload.replyTo ? [payload.replyTo] : [REPLY_TO],
        subject: payload.subject,
        html: fullHtml,
      });

      if (error) {
        results.failed++;
        results.errors.push(`${recipient}: ${error.message}`);
        console.error(`[email] Failed to send to ${recipient}:`, error);
      } else {
        results.success++;
      }
    } catch (err) {
      results.failed++;
      const errorMsg = err instanceof Error ? err.message : String(err);
      results.errors.push(`${recipient}: ${errorMsg}`);
      console.error(`[email] Exception sending to ${recipient}:`, err);
    }
  }

  return results;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/**
 * Convert plain text to HTML if not already HTML.
 * Handles paragraphs (double newlines), bullet lists (•, -, *), and line breaks.
 */
function ensureHtml(content: string): string {
  // If already contains HTML tags, return as-is
  if (/<[a-z][\s\S]*>/i.test(content)) {
    return content;
  }

  // Split by double newlines to identify paragraphs
  const paragraphs = content.split(/\n\s*\n/);

  const htmlParagraphs = paragraphs
    .map((para) => {
      const trimmed = para.trim();
      if (!trimmed) return "";

      // Check if this paragraph is a list (lines starting with •, -, or *)
      const lines = trimmed.split("\n");
      const isList = lines.some((line) => /^\s*[\u2022\-*]\s/.test(line));

      if (isList) {
        const listItems = lines
          .map((line) => {
            const cleaned = line.replace(/^\s*[\u2022\-*]\s*/, "").trim();
            return cleaned ? `<li>${cleaned}</li>` : "";
          })
          .filter((item) => item);
        return `<ul>${listItems.join("")}</ul>`;
      }

      // Regular paragraph - convert single newlines to <br>
      const withLineBreaks = trimmed
        .split("\n")
        .map((line) => line.trim())
        .filter((line) => line)
        .join("<br>");

      return `<p>${withLineBreaks}</p>`;
    })
    .filter((para) => para);

  return htmlParagraphs.join("");
}

/**
 * Wrap HTML content in a professional email template that renders
 * correctly across all email clients (Gmail, Outlook, Apple Mail, etc.)
 */
function wrapEmailTemplate(htmlContent: string): string {
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Five Steps</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f4f4f4; font-family: Arial, Helvetica, sans-serif; font-size: 15px; line-height: 1.6; color: #333333;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f4f4f4;">
    <tr>
      <td align="center" style="padding: 20px 10px;">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="max-width: 600px; width: 100%; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.05);">
          <!-- Header -->
          <tr>
            <td style="background-color: #1a2a5e; padding: 20px 30px; text-align: center;">
              <h1 style="margin: 0; color: #f5c842; font-size: 22px; font-weight: bold;">Five Steps</h1>
              <p style="margin: 4px 0 0; color: #ffffff; font-size: 12px; opacity: 0.8;">Musicografia Braille Global</p>
            </td>
          </tr>
          <!-- Content -->
          <tr>
            <td style="padding: 30px 30px 40px; font-size: 15px; line-height: 1.7; color: #333333;">
              ${htmlContent}
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="background-color: #f8f8f8; padding: 20px 30px; text-align: center; border-top: 1px solid #eeeeee;">
              <p style="margin: 0; font-size: 12px; color: #999999;">Five Steps — Musicografia Braille Global</p>
              <p style="margin: 4px 0 0; font-size: 11px; color: #bbbbbb;"><a href="https://www.braille5steps.com" style="color: #1a2a5e; text-decoration: none;">braille5steps.com</a></p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}
