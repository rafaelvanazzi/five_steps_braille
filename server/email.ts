import { Resend } from "resend";

// Resend is initialized lazily so the server doesn't crash when the key is not yet set
function getResend() {
  const key = process.env.RESEND_API_KEY;
  if (!key) return null;
  return new Resend(key);
}

// Recipients who receive all contact form submissions
const CONTACT_RECIPIENTS = [
  "acervo.musicografia@gmail.com",
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
  const { error } = await client.emails.send({
    from: FROM_ADDRESS,
    to: opts.to,
    replyTo: opts.replyTo ? [opts.replyTo] : [REPLY_TO],
    subject: opts.subject,
    html: opts.html,
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

  const results = { success: 0, failed: 0, errors: [] as string[] };

  // Send emails one by one to track individual failures
  for (const recipient of payload.recipients) {
    try {
      const { error } = await client.emails.send({
        from: FROM_ADDRESS,
        to: recipient,
        replyTo: payload.replyTo ? [payload.replyTo] : [REPLY_TO],
        subject: payload.subject,
        html: payload.htmlContent,
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
