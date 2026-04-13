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

// Sender address — must be a verified domain in Resend.
// Using onboarding@resend.dev works for testing; once a custom domain
// is verified in Resend, replace with e.g. "Five Steps <noreply@braille5steps.com>"
const FROM_ADDRESS = "Five Steps <onboarding@resend.dev>";

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
    replyTo: payload.email,
    subject: `[Five Steps] ${payload.subject}`,
    html,
  });

  if (error) {
    // Log but don't throw — contact is already saved in DB and Manus notified
    console.error("[email] Failed to send contact email:", error);
  }
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
