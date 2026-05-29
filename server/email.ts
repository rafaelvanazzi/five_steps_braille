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
 * Converts plain text to clean HTML paragraphs.
 * NO lists, NO bullets, NO complex templates.
 * Just preserves line breaks and paragraphs exactly as written.
 */
function simpleTextToHtml(text: string): string {
  if (!text) return "";
  
  // Escape HTML entities to prevent XSS
  let safeText = text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

  // Split by double newlines to identify paragraphs
  const paragraphs = safeText.split(/\n\s*\n/);
  
  return paragraphs
    .map(p => {
      const trimmed = p.trim();
      if (!trimmed) return "";
      // Replace single newlines within the paragraph with <br>
      // This preserves the exact line structure without adding bullets
      const withBreaks = trimmed.replace(/\n/g, "<br>");
      return `<p style="margin: 0 0 16px 0; font-family: Arial, sans-serif; font-size: 16px; line-height: 1.5; color: #333;">${withBreaks}</p>`;
    })
    .join("");
}

export async function sendContactEmail(payload: ContactEmailPayload): Promise<void> {
  const typeLabel = typeLabels[payload.type] ?? payload.type;

  // Convert the user's message to clean HTML
  const messageHtml = simpleTextToHtml(payload.message);

  // Simple, clean HTML structure. No boxes, no heavy headers.
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
    </head>
    <body style="margin: 0; padding: 20px; font-family: Arial, sans-serif; background-color: #ffffff;">
      
      <!-- Meta Data (Small and discreet at the top) -->
      <div style="margin-bottom: 20px; padding-bottom: 10px; border-bottom: 1px solid #eeeeee; font-size: 13px; color: #666666;">
        <strong>De:</strong> ${escapeHtml(payload.name)} &lt;${escapeHtml(payload.email)}&gt;<br>
        ${payload.institution ? `<strong>Instituição:</strong> ${escapeHtml(payload.institution)}<br>` : ""}
        <strong>Tipo:</strong> ${escapeHtml(typeLabel)}
      </div>

      <!-- Message Body (Clean Text) -->
      <div style="font-family: Arial, sans-serif; font-size: 16px; line-height: 1.6; color: #333333;">
        ${messageHtml}
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
  
  // If the content is plain text, convert it simply. If it's already HTML, use it.
  const finalHtml = opts.html.includes('<') ? opts.html : simpleTextToHtml(opts.html);
  
  // For bulk emails, we still use a simple wrapper but less intrusive than the contact form
  const fullHtml = `
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"></head>
    <body style="margin: 0; padding: 20px; font-family: Arial, sans-serif; background-color: #ffffff;">
      <div style="max-width: 600px; margin: 0 auto;">
        ${finalHtml}
      </div>
    </body>
    </html>
  `;
  
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
  const finalHtml = payload.htmlContent.includes('<') ? payload.htmlContent : simpleTextToHtml(payload.htmlContent);
  
  const fullHtml = `
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"></head>
    <body style="margin: 0; padding: 20px; font-family: Arial, sans-serif; background-color: #ffffff;">
      <div style="max-width: 600px; margin: 0 auto;">
        ${finalHtml}
      </div>
    </body>
    </html>
  `;

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
