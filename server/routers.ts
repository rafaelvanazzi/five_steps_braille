import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import {
  getMaterials,
  getMaterialsAll,
  getMaterialById,
  insertMaterial,
  deleteMaterial,
  updateMaterial,
  replaceMaterialFile,
  toggleMaterialVisibility,
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
  addFileToMaterial,
  getFilesByMaterial,
  deleteFile,
  getFileById,
} from "./db";
import { storagePut } from "./storage";
import { notifyOwner } from "./_core/notification";
import { sendContactEmail } from "./email";

// ─── Permission helpers ───────────────────────────────────────────────────────

/** Admin-only guard */
const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== "admin") {
    throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
  }
  return next({ ctx });
});

/**
 * Verify that the current user is either the material owner or an admin.
 * Throws FORBIDDEN if neither condition is met.
 */
async function assertOwnerOrAdmin(materialId: number, userId: number, role: string) {
  const material = await getMaterialById(materialId);
  if (!material) throw new TRPCError({ code: "NOT_FOUND", message: "Material não encontrado" });
  if (material.uploadedBy !== userId && role !== "admin") {
    throw new TRPCError({ code: "FORBIDDEN", message: "Apenas o autor ou um administrador pode realizar esta ação" });
  }
  return material;
}

// ─── Router ───────────────────────────────────────────────────────────────────

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
    // Public: list visible materials (hidden=false). Grade filter optional.
    list: publicProcedure
      .input(z.object({ grade: z.number().min(1).max(5).optional() }))
      .query(({ input }) => getMaterials(input.grade)),

    // Protected (owner/admin): list all materials including hidden ones
    listAll: protectedProcedure
      .input(z.object({ grade: z.number().min(1).max(5).optional() }))
      .query(async ({ input, ctx }) => {
        if (ctx.user.role === "admin") {
          return getMaterialsAll(input.grade);
        }
        // Regular users: return visible + their own hidden materials
        const all = await getMaterialsAll(input.grade);
        return all.filter((m) => !m.hidden || m.uploadedBy === ctx.user.id);
      }),

    // Protected: get download URL for a specific material (also logs the download)
    getDownloadUrl: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input, ctx }) => {
        const material = await getMaterialById(input.id);
        if (!material) throw new TRPCError({ code: "NOT_FOUND" });
        // Hidden materials: only owner or admin can download
        if (material.hidden && material.uploadedBy !== ctx.user.id && ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: "Material oculto" });
        }
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
          materialType: z.enum(["partitura", "atividade"]).default("atividade"),
          creatorVision: z.enum(["vidente", "pdv"]).default("vidente"),
          creatorName: z.string().max(255).optional(),
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
          materialType: input.materialType,
          creatorVision: input.creatorVision,
          creatorName: input.creatorName ?? null,
          uploadedBy: ctx.user.id,
        });
        return { success: true };
      }),

    // Protected (owner or admin): edit material attributes
    edit: protectedProcedure
      .input(
        z.object({
          id: z.number(),
          title: z.string().min(1).max(255).optional(),
          description: z.string().nullable().optional(),
          grade: z.number().min(1).max(5).optional(),
          stage: z.number().min(1).max(8).nullable().optional(),
          language: z.enum(["pt", "en", "both"]).optional(),
          materialType: z.enum(["partitura", "atividade"]).optional(),
          creatorVision: z.enum(["vidente", "pdv"]).optional(),
          creatorName: z.string().max(255).nullable().optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        await assertOwnerOrAdmin(input.id, ctx.user.id, ctx.user.role);
        const { id, ...data } = input;
        await updateMaterial(id, data);
        return { success: true };
      }),

    // Protected (owner or admin): replace the file of a material
    replaceFile: protectedProcedure
      .input(
        z.object({
          id: z.number(),
          fileBase64: z.string(),
          fileName: z.string(),
          mimeType: z.string(),
          fileSize: z.number(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const material = await assertOwnerOrAdmin(input.id, ctx.user.id, ctx.user.role);
        const buffer = Buffer.from(input.fileBase64, "base64");
        const suffix = Date.now().toString(36);
        const fileKey = `five-steps/grade-${material.grade}/${suffix}-${input.fileName}`;
        const { url } = await storagePut(fileKey, buffer, input.mimeType);
        await replaceMaterialFile(input.id, {
          fileKey,
          fileUrl: url,
          fileName: input.fileName,
          fileSize: input.fileSize,
          mimeType: input.mimeType,
        });
        return { success: true };
      }),

    // Protected (owner or admin): toggle visibility (hidden/visible)
    toggleVisibility: protectedProcedure
      .input(z.object({ id: z.number(), hidden: z.boolean() }))
      .mutation(async ({ input, ctx }) => {
        await assertOwnerOrAdmin(input.id, ctx.user.id, ctx.user.role);
        await toggleMaterialVisibility(input.id, input.hidden);
        return { success: true };
      }),

    // Protected (owner or admin): delete a material
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input, ctx }) => {
        await assertOwnerOrAdmin(input.id, ctx.user.id, ctx.user.role);
        await deleteMaterial(input.id);
        return { success: true };
      }),

    // Protected (owner only): add a file to an existing material
    addFile: protectedProcedure
      .input(
        z.object({
          materialId: z.number(),
          fileBase64: z.string(),
          fileName: z.string(),
          mimeType: z.string(),
          fileSize: z.number(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const material = await getMaterialById(input.materialId);
        if (!material) throw new TRPCError({ code: "NOT_FOUND", message: "Material nao encontrado" });
        if (material.uploadedBy !== ctx.user.id) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Apenas o autor pode adicionar arquivos a este material" });
        }
        const buffer = Buffer.from(input.fileBase64, "base64");
        const suffix = Date.now().toString(36);
        const fileKey = `five-steps/grade-${material.grade}/${suffix}-${input.fileName}`;
        const { url } = await storagePut(fileKey, buffer, input.mimeType);
        await addFileToMaterial({
          materialId: input.materialId,
          fileKey,
          fileUrl: url,
          fileName: input.fileName,
          fileSize: input.fileSize,
          mimeType: input.mimeType,
          uploadedBy: ctx.user.id,
        });
        return { success: true };
      }),

    // Public: get files for a material
    getFiles: publicProcedure
      .input(z.object({ materialId: z.number() }))
      .query(({ input }) => getFilesByMaterial(input.materialId)),

    // Protected (owner only): delete a file from a material
    deleteFile: protectedProcedure
      .input(z.object({ fileId: z.number() }))
      .mutation(async ({ input, ctx }) => {
        const file = await getFileById(input.fileId);
        if (!file) throw new TRPCError({ code: "NOT_FOUND", message: "Arquivo nao encontrado" });
        if (file.uploadedBy !== ctx.user.id) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Apenas o autor pode deletar este arquivo" });
        }
        await deleteFile(input.fileId);
        return { success: true };
      }),
  }),

  // ─── Ratings ──────────────────────────────────────────────────────────────
  ratings: router({
    getForMaterial: publicProcedure
      .input(z.object({ materialId: z.number() }))
      .query(({ input }) => getRatingsForMaterial(input.materialId)),

    getUserRating: protectedProcedure
      .input(z.object({ materialId: z.number() }))
      .query(({ input, ctx }) => getUserRating(input.materialId, ctx.user.id)),

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
    getForMaterial: publicProcedure
      .input(z.object({ materialId: z.number() }))
      .query(({ input }) => getCommentsForMaterial(input.materialId)),

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
        sendContactEmail(input).catch((err) =>
          console.error("[contact] email send failed:", err)
        );
        return { success: true };
      }),

    list: adminProcedure.query(() => getContactMessages()),
  }),

  // ─── Admin Dashboard ──────────────────────────────────────────────────────
  admin: router({
    stats: adminProcedure.query(async () => {
      const [totalUsers, totalMaterials, totalDownloads, totalMessages] = await Promise.all([
        getTotalUsers(),
        getTotalMaterials(),
        getTotalDownloads(),
        getTotalMessages(),
      ]);
      return { totalUsers, totalMaterials, totalDownloads, totalMessages };
    }),

    users: adminProcedure.query(() => getAllUsers()),

    materialsWithUploader: adminProcedure.query(() => getMaterialsWithUploader()),

    downloadRanking: adminProcedure.query(() => getDownloadCountByMaterial()),

    recentComments: adminProcedure
      .input(z.object({ limit: z.number().min(1).max(100).default(20) }).optional())
      .query(({ input }) => getRecentComments(input?.limit ?? 20)),

    recentDownloads: adminProcedure
      .input(z.object({ limit: z.number().min(1).max(100).default(20) }).optional())
      .query(({ input }) => getRecentDownloads(input?.limit ?? 20)),

    ratingsOverview: adminProcedure.query(() => getAllRatingsWithDetails()),

    deleteComment: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await deleteComment(input.id);
        return { success: true };
      }),
  }),
});

export type AppRouter = typeof appRouter;
