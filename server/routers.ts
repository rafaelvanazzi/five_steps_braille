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
} from "./db";
import { storagePut } from "./storage";
import { notifyOwner } from "./_core/notification";

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

    // Protected: get download URL for a specific material
    getDownloadUrl: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        const material = await getMaterialById(input.id);
        if (!material) throw new TRPCError({ code: "NOT_FOUND" });
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
        return { success: true };
      }),

    // Admin: list all contact messages
    list: adminProcedure.query(() => getContactMessages()),
  }),
});

export type AppRouter = typeof appRouter;
