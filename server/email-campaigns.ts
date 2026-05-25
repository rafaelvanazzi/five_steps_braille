import { getDb } from "./db";
import { emailCampaigns, emailCampaignLogs, type EmailCampaign, type InsertEmailCampaign, type EmailCampaignLog, type InsertEmailCampaignLog } from "../drizzle/schema";
import { eq, and } from "drizzle-orm";

const getDatabase = async () => {
  const db = await getDb();
  if (!db) throw new Error("Database connection failed");
  return db;
};

/**
 * Create a new email campaign
 */
export async function createEmailCampaign(data: InsertEmailCampaign): Promise<EmailCampaign> {
  const db = await getDatabase();
  const [campaign] = await db.insert(emailCampaigns).values(data).$returningId();
  if (!campaign) throw new Error("Failed to create email campaign");
  return (await db.select().from(emailCampaigns).where(eq(emailCampaigns.id, campaign.id)).limit(1))[0];
}

/**
 * Get a campaign by ID
 */
export async function getEmailCampaignById(id: number): Promise<EmailCampaign | undefined> {
  const db = await getDatabase();
  return (await db.select().from(emailCampaigns).where(eq(emailCampaigns.id, id)).limit(1))[0];
}

/**
 * Get all campaigns for a user
 */
export async function getEmailCampaignsByUser(userId: number): Promise<EmailCampaign[]> {
  const db = await getDatabase();
  return db.select().from(emailCampaigns).where(eq(emailCampaigns.createdBy, userId));
}

/**
 * Update campaign status
 */
export async function updateCampaignStatus(id: number, status: EmailCampaign["status"]): Promise<void> {
  const db = await getDatabase();
  await db.update(emailCampaigns).set({ status, updatedAt: new Date() }).where(eq(emailCampaigns.id, id));
}

/**
 * Update campaign with Heartbeat task UID
 */
export async function updateCampaignWithTaskUid(id: number, taskUid: string): Promise<void> {
  const db = await getDatabase();
  await db.update(emailCampaigns).set({ scheduleCronTaskUid: taskUid, updatedAt: new Date() }).where(eq(emailCampaigns.id, id));
}

/**
 * Get campaign by Heartbeat task UID
 */
export async function getCampaignByTaskUid(taskUid: string): Promise<EmailCampaign | undefined> {
  const db = await getDatabase();
  return (await db.select().from(emailCampaigns).where(eq(emailCampaigns.scheduleCronTaskUid, taskUid)).limit(1))[0];
}

/**
 * Create email campaign logs for all recipients
 */
export async function createCampaignLogs(campaignId: number, recipients: string[]): Promise<void> {
  const db = await getDatabase();
  const logs: InsertEmailCampaignLog[] = recipients.map((recipient) => ({
    campaignId,
    recipient,
    status: "pending" as const,
  }));
  await db.insert(emailCampaignLogs).values(logs);
}

/**
 * Get pending logs for a campaign (oldest first)
 */
export async function getPendingCampaignLogs(campaignId: number, limit: number = 1): Promise<EmailCampaignLog[]> {
  const db = await getDatabase();
  return db
    .select()
    .from(emailCampaignLogs)
    .where(and(eq(emailCampaignLogs.campaignId, campaignId), eq(emailCampaignLogs.status, "pending")))
    .orderBy(emailCampaignLogs.createdAt)
    .limit(limit);
}

/**
 * Mark a log as sent
 */
export async function markLogAsSent(logId: number): Promise<void> {
  const db = await getDatabase();
  await db
    .update(emailCampaignLogs)
    .set({ status: "sent", sentAt: new Date() })
    .where(eq(emailCampaignLogs.id, logId));
}

/**
 * Mark a log as failed
 */
export async function markLogAsFailed(logId: number, errorMessage: string): Promise<void> {
  const db = await getDatabase();
  await db
    .update(emailCampaignLogs)
    .set({ status: "failed", errorMessage })
    .where(eq(emailCampaignLogs.id, logId));
}

/**
 * Get campaign stats
 */
export async function getCampaignStats(campaignId: number): Promise<{ sent: number; failed: number; pending: number }> {
  const db = await getDatabase();
  const logs = await db.select().from(emailCampaignLogs).where(eq(emailCampaignLogs.campaignId, campaignId));
  return {
    sent: logs.filter((l: EmailCampaignLog) => l.status === "sent").length,
    failed: logs.filter((l: EmailCampaignLog) => l.status === "failed").length,
    pending: logs.filter((l: EmailCampaignLog) => l.status === "pending").length,
  };
}

/**
 * Update campaign counters
 */
export async function updateCampaignCounters(campaignId: number): Promise<void> {
  const db = await getDatabase();
  const stats = await getCampaignStats(campaignId);
  const isCompleted = stats.pending === 0;
  
  await db
    .update(emailCampaigns)
    .set({
      sentCount: stats.sent,
      failedCount: stats.failed,
      status: isCompleted ? "completed" : "running",
      completedAt: isCompleted ? new Date() : undefined,
      updatedAt: new Date(),
    })
    .where(eq(emailCampaigns.id, campaignId));
}

/**
 * Delete a campaign and its logs
 */
export async function deleteEmailCampaign(id: number): Promise<void> {
  const db = await getDatabase();
  await db.delete(emailCampaignLogs).where(eq(emailCampaignLogs.campaignId, id));
  await db.delete(emailCampaigns).where(eq(emailCampaigns.id, id));
}
