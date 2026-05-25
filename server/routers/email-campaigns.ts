import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { parse as parseCookie } from "cookie";
import { COOKIE_NAME } from "@shared/const";
import { router, protectedProcedure } from "../_core/trpc";
import { createHeartbeatJob, updateHeartbeatJob, deleteHeartbeatJob } from "../_core/heartbeat";
import * as emailCampaigns from "../email-campaigns";

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
   * List campaigns for the current user
   */
  list: adminProcedure.query(async ({ ctx }) => {
    try {
      const campaigns = await emailCampaigns.getEmailCampaignsByUser(ctx.user.id);
      return campaigns.map((c) => ({
        ...c,
        recipients: JSON.parse(c.recipients || "[]"),
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
   * Get a specific campaign
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
        return {
          ...campaign,
          recipients: JSON.parse(campaign.recipients || "[]"),
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
   * Schedule a campaign to start sending emails
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

        // Get session token for Heartbeat
        const sessionToken = parseCookie(ctx.req.headers.cookie ?? "")[COOKIE_NAME] ?? "";
        if (!sessionToken) {
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "Session token not found",
          });
        }

        // Calculate cron expression based on interval
        // For simplicity, start immediately and repeat every N minutes
        // Format: "sec min hour dom mon dow" (UTC)
        const cronExpression = `0 */${campaign.intervalMinutes} * * * *`;

        // Create Heartbeat job
        const job = await createHeartbeatJob(
          {
            name: `email-campaign-${campaign.id}`,
            cron: cronExpression,
            path: "/api/scheduled/sendCampaignEmails",
            payload: { campaignId: campaign.id },
            description: `Send ${campaign.totalRecipients} emails for campaign "${campaign.name}"`,
          },
          sessionToken
        );

        // Update campaign with task UID and status
        await emailCampaigns.updateCampaignWithTaskUid(campaign.id, job.taskUid);
        await emailCampaigns.updateCampaignStatus(campaign.id, "scheduled");

        return {
          id: campaign.id,
          taskUid: job.taskUid,
          nextExecutionAt: job.nextExecutionAt,
        };
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        console.error("[email-campaigns] Failed to schedule campaign:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to schedule campaign",
        });
      }
    }),

  /**
   * Cancel a scheduled campaign
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

        // Delete Heartbeat job if exists
        if (campaign.scheduleCronTaskUid) {
          const sessionToken = parseCookie(ctx.req.headers.cookie ?? "")[COOKIE_NAME] ?? "";
          if (sessionToken) {
            try {
              await deleteHeartbeatJob(campaign.scheduleCronTaskUid, sessionToken);
            } catch (err) {
              console.error("[email-campaigns] Failed to delete Heartbeat job:", err);
              // Continue anyway
            }
          }
        }

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

        // Delete Heartbeat job if exists
        if (campaign.scheduleCronTaskUid) {
          const sessionToken = parseCookie(ctx.req.headers.cookie ?? "")[COOKIE_NAME] ?? "";
          if (sessionToken) {
            try {
              await deleteHeartbeatJob(campaign.scheduleCronTaskUid, sessionToken);
            } catch (err) {
              console.error("[email-campaigns] Failed to delete Heartbeat job:", err);
              // Continue anyway
            }
          }
        }

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
});
