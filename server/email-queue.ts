/**
 * In-memory email queue that sends emails one at a time with configurable delay.
 * This avoids Resend rate limits and doesn't depend on external scheduling services.
 */
import { sendEmail } from "./email";
import * as emailCampaigns from "./email-campaigns";

interface QueuedEmail {
  campaignId: number;
  logId: number;
  to: string;
  subject: string;
  htmlContent: string;
  replyTo?: string;
}

interface ActiveCampaign {
  campaignId: number;
  intervalMs: number;
  queue: QueuedEmail[];
  timer: ReturnType<typeof setTimeout> | null;
  isProcessing: boolean;
  sentCount: number;
  failedCount: number;
}

// Store active campaigns being processed
const activeCampaigns = new Map<number, ActiveCampaign>();

/**
 * Start sending emails for a campaign with the configured interval
 */
export async function startCampaignSending(campaignId: number): Promise<{
  success: boolean;
  message: string;
  totalEmails: number;
}> {
  // Check if campaign is already being processed
  if (activeCampaigns.has(campaignId)) {
    return {
      success: false,
      message: "Esta campanha já está sendo enviada.",
      totalEmails: 0,
    };
  }

  // Get campaign details
  const campaign = await emailCampaigns.getEmailCampaignById(campaignId);
  if (!campaign) {
    return { success: false, message: "Campanha não encontrada.", totalEmails: 0 };
  }

  // Get pending logs (emails not yet sent)
  const logs = await emailCampaigns.getCampaignLogs(campaignId);
  const pendingLogs = logs.filter((log) => log.status === "pending");

  if (pendingLogs.length === 0) {
    return { success: false, message: "Nenhum email pendente para enviar.", totalEmails: 0 };
  }

  // Build queue
  const queue: QueuedEmail[] = pendingLogs.map((log) => ({
    campaignId: campaign.id,
    logId: log.id,
    to: log.recipient,
    subject: campaign.subject,
    htmlContent: campaign.htmlContent,
    replyTo: campaign.replyTo || undefined,
  }));

  const intervalMs = (campaign.intervalMinutes || 2) * 60 * 1000; // Convert minutes to ms

  const activeCampaign: ActiveCampaign = {
    campaignId,
    intervalMs,
    queue,
    timer: null,
    isProcessing: true,
    sentCount: 0,
    failedCount: 0,
  };

  activeCampaigns.set(campaignId, activeCampaign);

  // Update campaign status to "running"
  await emailCampaigns.updateCampaignStatus(campaignId, "running");

  // Start processing immediately (first email sent right away)
  processNextEmail(campaignId);

  return {
    success: true,
    message: `Iniciando envio de ${queue.length} emails com intervalo de ${campaign.intervalMinutes} minutos.`,
    totalEmails: queue.length,
  };
}

/**
 * Process the next email in the queue
 */
async function processNextEmail(campaignId: number): Promise<void> {
  const active = activeCampaigns.get(campaignId);
  if (!active || !active.isProcessing) return;

  const email = active.queue.shift();
  if (!email) {
    // Queue is empty - campaign complete
    await completeCampaign(campaignId);
    return;
  }

  try {
    // Send the email
    await sendEmail({
      to: email.to,
      subject: email.subject,
      html: email.htmlContent,
      replyTo: email.replyTo,
    });

    // Update log status to "sent"
    await emailCampaigns.updateCampaignLogStatus(email.logId, "sent");
    active.sentCount++;

    // Update campaign sent count
    await emailCampaigns.incrementCampaignSentCount(campaignId);

    console.log(
      `[email-queue] Campaign ${campaignId}: Sent to ${email.to} (${active.sentCount}/${active.sentCount + active.failedCount + active.queue.length})`
    );
  } catch (error) {
    // Update log status to "failed"
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    await emailCampaigns.updateCampaignLogStatus(email.logId, "failed", errorMessage);
    active.failedCount++;

    console.error(`[email-queue] Campaign ${campaignId}: Failed to send to ${email.to}: ${errorMessage}`);
  }

  // Schedule next email if queue is not empty
  if (active.queue.length > 0 && active.isProcessing) {
    active.timer = setTimeout(() => {
      processNextEmail(campaignId);
    }, active.intervalMs);
  } else if (active.queue.length === 0) {
    // All emails processed
    await completeCampaign(campaignId);
  }
}

/**
 * Complete a campaign (all emails sent or failed)
 */
async function completeCampaign(campaignId: number): Promise<void> {
  const active = activeCampaigns.get(campaignId);
  if (active) {
    if (active.timer) clearTimeout(active.timer);
    activeCampaigns.delete(campaignId);
  }

  await emailCampaigns.updateCampaignStatus(campaignId, "completed");
  console.log(
    `[email-queue] Campaign ${campaignId} completed. Sent: ${active?.sentCount || 0}, Failed: ${active?.failedCount || 0}`
  );
}

/**
 * Cancel a running campaign
 */
export function cancelCampaignSending(campaignId: number): boolean {
  const active = activeCampaigns.get(campaignId);
  if (!active) return false;

  active.isProcessing = false;
  if (active.timer) {
    clearTimeout(active.timer);
    active.timer = null;
  }
  activeCampaigns.delete(campaignId);

  console.log(`[email-queue] Campaign ${campaignId} cancelled.`);
  return true;
}

/**
 * Get the status of an active campaign
 */
export function getCampaignQueueStatus(campaignId: number): {
  isActive: boolean;
  sentCount: number;
  failedCount: number;
  remainingCount: number;
} | null {
  const active = activeCampaigns.get(campaignId);
  if (!active) return null;

  return {
    isActive: active.isProcessing,
    sentCount: active.sentCount,
    failedCount: active.failedCount,
    remainingCount: active.queue.length,
  };
}

/**
 * Get all active campaign IDs
 */
export function getActiveCampaignIds(): number[] {
  return Array.from(activeCampaigns.keys());
}
