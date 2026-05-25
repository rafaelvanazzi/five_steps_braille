import type { Request, Response } from "express";
import { sdk, type AuthenticatedUser } from "./sdk";
import * as emailCampaigns from "../email-campaigns";
import { sendBulkEmail } from "../email";

/**
 * Handler for sending campaign emails on Heartbeat trigger
 * Called every N minutes based on campaign interval
 */
export async function sendCampaignEmailsHandler(req: Request, res: Response) {
  try {
    // Authenticate as cron
    const user = (await sdk.authenticateRequest(req)) as AuthenticatedUser;
    if (!user.isCron || !user.taskUid) {
      return res.status(403).json({ error: "cron-only" });
    }

    // Get campaign by task UID
    const campaign = await emailCampaigns.getCampaignByTaskUid(user.taskUid);
    if (!campaign) {
      return res.json({ ok: true, skipped: "orphan" }); // 2xx so forge stops retrying
    }

    // Get next pending email
    const logs = await emailCampaigns.getPendingCampaignLogs(campaign.id, 1);
    if (logs.length === 0) {
      // All emails sent, mark campaign as completed
      await emailCampaigns.updateCampaignStatus(campaign.id, "completed");
      await emailCampaigns.updateCampaignCounters(campaign.id);
      return res.json({ ok: true, message: "Campaign completed" });
    }

    const log = logs[0];

    // Send email
    try {
      const result = await sendBulkEmail({
        recipients: [log.recipient],
        subject: campaign.subject,
        htmlContent: campaign.htmlContent,
        replyTo: campaign.replyTo || undefined,
      });

      if (result.success > 0) {
        // Mark as sent
        await emailCampaigns.markLogAsSent(log.id);
        console.log(`[email-campaigns] Email sent to ${log.recipient}`);
      } else {
        // Mark as failed
        const errorMsg = (result.errors && result.errors[0]) || "Unknown error";
        await emailCampaigns.markLogAsFailed(log.id, errorMsg || "Unknown error");
        console.error(`[email-campaigns] Failed to send to ${log.recipient}: ${errorMsg}`);
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : "Unknown error";
      await emailCampaigns.markLogAsFailed(log.id, errorMsg);
      console.error(`[email-campaigns] Exception sending to ${log.recipient}:`, error);
    }

    // Update campaign counters
    await emailCampaigns.updateCampaignCounters(campaign.id);

    // Update campaign status if running
    if (campaign.status !== "running") {
      await emailCampaigns.updateCampaignStatus(campaign.id, "running");
    }

    res.json({ ok: true, sent: log.recipient });
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : "Unknown error";
    const stack = error instanceof Error ? error.stack : "";
    console.error("[email-campaigns] Handler error:", error);

    res.status(500).json({
      error: errorMsg,
      stack,
      context: {
        url: req.url,
        taskUid: (req as any).user?.taskUid,
      },
      timestamp: new Date().toISOString(),
    });
  }
}
