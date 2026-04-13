import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import {
  getMaterials,
  getMaterialById,
  insertMaterial,
  deleteMaterial,
  insertContactMessage,
  getContactMessages,
  upsertRating,
  getRatingsForMaterial,
  getUserRating,
  insertComment,
  getCommentsForMaterial,
  deleteComment,
  getCommentById,
  insertDownloadLog,
  getDownloadCountByMaterial,
  getTotalDownloads,
  getAllUsers,
  getTotalUsers,
  getTotalMaterials,
  getTotalMessages,
  getMaterialsWithUploader,
  getRecentComments,
  getRecentDownloads,
  getAllRatingsWithDetails,
} from "./db";
import { storagePut } from "./storage";
import { notifyOwner } from "./_core/notification";
import { sendContactEmail } from "./email";

// Admin-only guard
const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== "admin") {
    throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
  }
  return next({ ctx });
});

export const appRouter = router({
  system: systemRouter,

  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),

  // ─── Materials (Library/Archive) ─────────────────────────────────────────
  materials: router({
    // Public: list all materials (grade filter optional)
    list: publicProcedure
      .input(z.object({ grade: z.number().min(1).max(5).optional() }))
      .query(({ input }) => getMaterials(input.grade)),

    // Protected: get download URL for a specific material (also logs the download)
    getDownloadUrl: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input, ctx }) => {
        const material = await getMaterialById(input.id);
        if (!material) throw new TRPCError({ code: "NOT_FOUND" });
        // Log the download
        try {
          await insertDownloadLog({ materialId: input.id, userId: ctx.user.id });
        } catch (e) {
          console.warn("[Download Log] Failed to log download:", e);
        }
        return { url: material.fileUrl, fileName: material.fileName };
      }),

    // Admin: upload a new material
    upload: adminProcedure
      .input(
        z.object({
          title: z.string().min(1).max(255),
          description: z.string().optional(),
          grade: z.number().min(1).max(5),
          stage: z.number().min(1).max(8).optional(),
          language: z.enum(["pt", "en", "both"]).default("pt"),
          fileBase64: z.string(),
          fileName: z.string(),
          mimeType: z.string(),
          fileSize: z.number(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const buffer = Buffer.from(input.fileBase64, "base64");
        const suffix = Date.now().toString(36);
        const fileKey = `five-steps/grade-${input.grade}/${suffix}-${input.fileName}`;
        const { url } = await storagePut(fileKey, buffer, input.mimeType);
        await insertMaterial({
          title: input.title,
          description: input.description ?? null,
          grade: input.grade,
          stage: input.stage ?? null,
          fileKey,
          fileUrl: url,
          fileName: input.fileName,
          fileSize: input.fileSize,
          mimeType: input.mimeType,
          language: input.language,
          uploadedBy: ctx.user.id,
        });
        return { success: true };
      }),

    // Admin: delete a material
    delete: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await deleteMaterial(input.id);
        return { success: true };
      }),
  }),

  // ─── Ratings ──────────────────────────────────────────────────────────────
  ratings: router({
    // Public: get ratings for a material
    getForMaterial: publicProcedure
      .input(z.object({ materialId: z.number() }))
      .query(({ input }) => getRatingsForMaterial(input.materialId)),

    // Protected: get current user's rating for a material
    getUserRating: protectedProcedure
      .input(z.object({ materialId: z.number() }))
      .query(({ input, ctx }) => getUserRating(input.materialId, ctx.user.id)),

    // Protected: set/update rating
    rate: protectedProcedure
      .input(z.object({
        materialId: z.number(),
        rating: z.number().min(1).max(5),
      }))
      .mutation(async ({ input, ctx }) => {
        await upsertRating({
          materialId: input.materialId,
          userId: ctx.user.id,
          rating: input.rating,
        });
        return { success: true };
      }),
  }),

  // ─── Comments ─────────────────────────────────────────────────────────────
  comments: router({
    // Public: get comments for a material
    getForMaterial: publicProcedure
      .input(z.object({ materialId: z.number() }))
      .query(({ input }) => getCommentsForMaterial(input.materialId)),

    // Protected: add a comment
    add: protectedProcedure
      .input(z.object({
        materialId: z.number(),
        content: z.string().min(1).max(2000),
      }))
      .mutation(async ({ input, ctx }) => {
        await insertComment({
          materialId: input.materialId,
          userId: ctx.user.id,
          content: input.content,
        });
        return { success: true };
      }),

    // Protected: delete own comment (or admin can delete any)
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input, ctx }) => {
        const comment = await getCommentById(input.id);
        if (!comment) throw new TRPCError({ code: "NOT_FOUND" });
        if (comment.userId !== ctx.user.id && ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN" });
        }
        await deleteComment(input.id);
        return { success: true };
      }),
  }),

  // ─── Contact ─────────────────────────────────────────────────────────────
  contact: router({
    send: publicProcedure
      .input(
        z.object({
          name: z.string().min(1).max(255),
          email: z.string().email().max(320),
          institution: z.string().max(255).optional(),
          subject: z.string().min(1).max(255),
          message: z.string().min(10),
          type: z.enum(["institution", "musician_dv", "musician_nodv", "general"]).default("general"),
        })
      )
      .mutation(async ({ input }) => {
        await insertContactMessage(input);
        await notifyOwner({
          title: `Nova mensagem: ${input.subject}`,
          content: `De: ${input.name} (${input.email})\nInstituição: ${input.institution ?? "—"}\n\n${input.message}`,
        });
        // Send email notification to Rafael (non-blocking — DB + Manus notification already done)
        sendContactEmail(input).catch((err) =>
          console.error("[contact] email send failed:", err)
        );
        return { success: true };
      }),

    // Admin: list all contact messages
    list: adminProcedure.query(() => getContactMessages()),
  }),

  // ─── Admin Dashboard ──────────────────────────────────────────────────────
  admin: router({
    // Get dashboard stats
    stats: adminProcedure.query(async () => {
      const [totalUsers, totalMaterials, totalDownloads, totalMessages] = await Promise.all([
        getTotalUsers(),
        getTotalMaterials(),
        getTotalDownloads(),
        getTotalMessages(),
      ]);
      return { totalUsers, totalMaterials, totalDownloads, totalMessages };
    }),

    // Get all users with emails
    users: adminProcedure.query(() => getAllUsers()),

    // Get materials with uploader info
    materialsWithUploader: adminProcedure.query(() => getMaterialsWithUploader()),

    // Get download counts per material (most downloaded)
    downloadRanking: adminProcedure.query(() => getDownloadCountByMaterial()),

    // Get recent comments
    recentComments: adminProcedure
      .input(z.object({ limit: z.number().min(1).max(100).default(20) }).optional())
      .query(({ input }) => getRecentComments(input?.limit ?? 20)),

    // Get recent downloads
    recentDownloads: adminProcedure
      .input(z.object({ limit: z.number().min(1).max(100).default(20) }).optional())
      .query(({ input }) => getRecentDownloads(input?.limit ?? 20)),

    // Get all ratings with details
    ratingsOverview: adminProcedure.query(() => getAllRatingsWithDetails()),

    // Delete a comment (admin)
    deleteComment: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await deleteComment(input.id);
        return { success: true };
      }),
  }),
});

export type AppRouter = typeof appRouter;
