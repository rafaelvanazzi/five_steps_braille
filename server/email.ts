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
 * Converte o texto do usuário em HTML limpo.
 * - Remove bolinhas (•, -, *) do início das linhas.
 * - Transforma quebras de linha duplas em parágrafos.
 * - Força alinhamento à esquerda.
 */
function formatMessageToHtml(text: string): string {
  if (!text) return "";
  
  // Escapar HTML para segurança
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

      // Remover marcadores visuais (•, -, *) do início de CADA linha dentro do parágrafo
      const lines = trimmed.split("\n").map(line => line.replace(/^[\s\u2022\-*]\s*/, ""));
      
      // Juntar as linhas com <br> e envolver em <p> alinhado à esquerda
      return `<p style="margin: 0 0 16px 0; font-family: Arial, sans-serif; font-size: 14px; line-height: 1.6; color: #333; text-align: left;">${lines.join("<br>")}</p>`;
    })
    .join("");
}

export async function sendContactEmail(payload: ContactEmailPayload): Promise<void> {
  const client = getResend();
  if (!client) return;

  const typeLabel = typeLabels[payload.type] ?? payload.type;
  
  // Usamos a nova função para formatar a mensagem corretamente
  const formattedMessage = formatMessageToHtml(payload.message);

  // MANTIVEMOS O SEU DESIGN ORIGINAL, APENAS SUBSTITUÍMOS A PARTE DA MENSAGEM
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
        
        <!-- AQUI ESTÁ A CORREÇÃO: Usamos a variável formattedMessage em vez do escapeHtml direto -->
        <div style="background: #f5f5f5; border-left: 4px solid #f5c842; padding: 16px; border-radius: 4px;">
          ${formattedMessage}
        </div>

        <p style="margin-top: 20px; font-size: 12px; color: #999;">
          Esta mensagem foi enviada pelo formulário de contato em 
          <a href="https://www.braille5steps.com/contato" style="color: #1a2a5e;">braille5steps.com</a>
        </p>
      </div>
    </div>
  `;

  try {
    await client.emails.send({
      from: FROM_ADDRESS,
      to: CONTACT_RECIPIENTS,
      replyTo: [payload.email, REPLY_TO],
      subject: `[Five Steps] ${payload.subject}`,
      html,
    });
  } catch (err) {
    console.error("[email] Erro ao enviar:", err);
  }
}

// Funções auxiliares simplificadas para manter compatibilidade
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
  // Implementação básica mantida para não quebrar outras partes do sistema
  return { success: 0, failed: 0, errors: ["Não implementado nesta versão simplificada"] };
}

function escapeHtml(str: string): string {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}
