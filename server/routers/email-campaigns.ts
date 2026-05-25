import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, protectedProcedure } from "../_core/trpc";
import * as emailCampaigns from "../email-campaigns";
import { startCampaignSending, cancelCampaignSending, getCampaignQueueStatus, getActiveCampaignIds } from "../email-queue";

const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== "admin") {
    throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
  }
  return next({ ctx });
});

export const emailCampaignsRouter = router({
  /**
   * Create a new email campaign with scheduled sending
   */
  create: adminProcedure
    .input(
      z.object({
        name: z.string().min(1),
        subject: z.string().min(1),
        htmlContent: z.string().min(1),
        replyTo: z.string().email().optional(),
        recipients: z.array(z.string().email()).min(1),
        intervalMinutes: z.number().min(1).max(1440).default(2), // 1 minute to 1 day
      })
    )
    .mutation(async ({ input, ctx }) => {
      try {
        // Create campaign in database
        const campaign = await emailCampaigns.createEmailCampaign({
          createdBy: ctx.user.id,
          name: input.name,
          subject: input.subject,
          htmlContent: input.htmlContent,
          replyTo: input.replyTo,
          recipients: JSON.stringify(input.recipients),
          intervalMinutes: input.intervalMinutes,
          totalRecipients: input.recipients.length,
          status: "draft",
        });

        // Create logs for each recipient
        await emailCampaigns.createCampaignLogs(campaign.id, input.recipients);

        return campaign;
      } catch (error) {
        console.error("[email-campaigns] Failed to create campaign:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to create campaign",
        });
      }
    }),

  /**
   * Update an existing campaign (only if draft)
   */
  update: adminProcedure
    .input(
      z.object({
        id: z.number(),
        name: z.string().min(1).optional(),
        subject: z.string().min(1).optional(),
        htmlContent: z.string().min(1).optional(),
        replyTo: z.string().email().optional(),
        recipients: z.array(z.string().email()).min(1).optional(),
        intervalMinutes: z.number().min(1).max(1440).optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const campaign = await emailCampaigns.getEmailCampaignById(input.id);
      if (!campaign) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Campaign not found" });
      }
      if (campaign.createdBy !== ctx.user.id && ctx.user.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Access denied" });
      }
      if (campaign.status !== "draft") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Só é possível editar campanhas em rascunho." });
      }

      // If recipients changed, delete old logs and recreate
      if (input.recipients) {
        await emailCampaigns.deleteEmailCampaign(campaign.id);
        const updatedCampaign = await emailCampaigns.createEmailCampaign({
          createdBy: ctx.user.id,
          name: input.name || campaign.name,
          subject: input.subject || campaign.subject,
          htmlContent: input.htmlContent || campaign.htmlContent,
          replyTo: input.replyTo || campaign.replyTo,
          recipients: JSON.stringify(input.recipients),
          intervalMinutes: input.intervalMinutes || campaign.intervalMinutes,
          totalRecipients: input.recipients.length,
          status: "draft",
        });
        await emailCampaigns.createCampaignLogs(updatedCampaign.id, input.recipients);
        return updatedCampaign;
      }

      // Otherwise just update the fields
      // Simple field update via raw DB access
      const { getDb } = await import("../db");
      const { emailCampaigns: emailCampaignsTable } = await import("../../drizzle/schema");
      const { eq } = await import("drizzle-orm");
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB error" });

      const updateData: Record<string, unknown> = { updatedAt: new Date() };
      if (input.name) updateData.name = input.name;
      if (input.subject) updateData.subject = input.subject;
      if (input.htmlContent) updateData.htmlContent = input.htmlContent;
      if (input.replyTo) updateData.replyTo = input.replyTo;
      if (input.intervalMinutes) updateData.intervalMinutes = input.intervalMinutes;

      await db.update(emailCampaignsTable).set(updateData).where(eq(emailCampaignsTable.id, campaign.id));
      return await emailCampaigns.getEmailCampaignById(campaign.id);
    }),

  /**
   * List campaigns for the current user
   */
  list: adminProcedure.query(async ({ ctx }) => {
    try {
      const campaigns = await emailCampaigns.getEmailCampaignsByUser(ctx.user.id);
      const activeIds = getActiveCampaignIds();
      return campaigns.map((c) => ({
        ...c,
        recipients: JSON.parse(c.recipients || "[]"),
        isActive: activeIds.includes(c.id),
        queueStatus: getCampaignQueueStatus(c.id),
      }));
    } catch (error) {
      console.error("[email-campaigns] Failed to list campaigns:", error);
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to list campaigns",
      });
    }
  }),

  /**
   * Get a specific campaign with stats
   */
  getById: adminProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input, ctx }) => {
      try {
        const campaign = await emailCampaigns.getEmailCampaignById(input.id);
        if (!campaign) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Campaign not found" });
        }
        if (campaign.createdBy !== ctx.user.id && ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: "Access denied" });
        }
        const stats = await emailCampaigns.getCampaignStats(input.id);
        const queueStatus = getCampaignQueueStatus(input.id);
        return {
          ...campaign,
          recipients: JSON.parse(campaign.recipients || "[]"),
          stats,
          queueStatus,
        };
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        console.error("[email-campaigns] Failed to get campaign:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to get campaign",
        });
      }
    }),

  /**
   * Start sending a campaign (uses in-memory queue with interval)
   */
  schedule: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      try {
        const campaign = await emailCampaigns.getEmailCampaignById(input.id);
        if (!campaign) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Campaign not found" });
        }
        if (campaign.createdBy !== ctx.user.id && ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: "Access denied" });
        }

        // Start sending using in-memory queue
        const result = await startCampaignSending(campaign.id);

        if (!result.success) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: result.message,
          });
        }

        return {
          id: campaign.id,
          message: result.message,
          totalEmails: result.totalEmails,
        };
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        console.error("[email-campaigns] Failed to start campaign:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error instanceof Error ? error.message : "Failed to start campaign",
        });
      }
    }),

  /**
   * Cancel a running campaign
   */
  cancel: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      try {
        const campaign = await emailCampaigns.getEmailCampaignById(input.id);
        if (!campaign) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Campaign not found" });
        }
        if (campaign.createdBy !== ctx.user.id && ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: "Access denied" });
        }

        // Cancel in-memory queue
        cancelCampaignSending(campaign.id);

        // Update campaign status
        await emailCampaigns.updateCampaignStatus(campaign.id, "cancelled");

        return { id: campaign.id, status: "cancelled" };
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        console.error("[email-campaigns] Failed to cancel campaign:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to cancel campaign",
        });
      }
    }),

  /**
   * Delete a campaign
   */
  delete: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      try {
        const campaign = await emailCampaigns.getEmailCampaignById(input.id);
        if (!campaign) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Campaign not found" });
        }
        if (campaign.createdBy !== ctx.user.id && ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: "Access denied" });
        }

        // Cancel if running
        cancelCampaignSending(campaign.id);

        // Delete campaign and logs
        await emailCampaigns.deleteEmailCampaign(campaign.id);

        return { id: campaign.id };
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        console.error("[email-campaigns] Failed to delete campaign:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to delete campaign",
        });
      }
    }),

  /**
   * Get real-time status of a running campaign
   */
  status: adminProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input, ctx }) => {
      const campaign = await emailCampaigns.getEmailCampaignById(input.id);
      if (!campaign) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Campaign not found" });
      }
      if (campaign.createdBy !== ctx.user.id && ctx.user.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Access denied" });
      }

      const stats = await emailCampaigns.getCampaignStats(input.id);
      const queueStatus = getCampaignQueueStatus(input.id);

      return {
        campaign: {
          ...campaign,
          recipients: JSON.parse(campaign.recipients || "[]"),
        },
        stats,
        queueStatus,
        isActive: queueStatus !== null,
      };
    }),
});
