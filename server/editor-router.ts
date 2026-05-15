import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { protectedProcedure, adminProcedure, router } from "./_core/trpc";
import {
  createBrailleProject,
  updateBrailleProject,
  deleteBrailleProject,
  getBrailleProjectById,
  listBrailleProjectsByUser,
  getAllBrailleProjects,
  getTotalBrailleProjects,
} from "./db";
import { storagePut } from "./storage";
import {
  exportAsBrf,
  exportAsPlainText,
  exportAsMusicXML,
  validateBrailleContent,
} from "./braille-export";

export const editorRouter = router({
  create: protectedProcedure
    .input(
      z.object({
        title: z.string().min(1).max(255),
        language: z.enum(["pt", "en", "es"]),
        contentBraille: z.string().default(""),
        contentText: z.string().default(""),
        contentMusicXml: z.string().default(""),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return await createBrailleProject({
        userId: ctx.user.id,
        title: input.title,
        language: input.language,
        contentBraille: input.contentBraille,
        contentText: input.contentText,
        contentMusicXml: input.contentMusicXml,
      });
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        title: z.string().min(1).max(255).optional(),
        contentBraille: z.string().optional(),
        contentText: z.string().optional(),
        contentMusicXml: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const project = await getBrailleProjectById(input.id);
      if (!project) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Projeto não encontrado",
        });
      }

      if (project.userId !== ctx.user.id && ctx.user.role !== "admin") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Acesso negado",
        });
      }

      return await updateBrailleProject(input.id, {
        title: input.title,
        contentBraille: input.contentBraille,
        contentText: input.contentText,
        contentMusicXml: input.contentMusicXml,
      });
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const project = await getBrailleProjectById(input.id);
      if (!project) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Projeto não encontrado",
        });
      }

      if (project.userId !== ctx.user.id && ctx.user.role !== "admin") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Acesso negado",
        });
      }

      await deleteBrailleProject(input.id);
      return { success: true };
    }),

  get: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ ctx, input }) => {
      const project = await getBrailleProjectById(input.id);
      if (!project) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Projeto não encontrado",
        });
      }

      if (project.userId !== ctx.user.id && ctx.user.role !== "admin") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Acesso negado",
        });
      }

      return project;
    }),

  list: protectedProcedure.query(({ ctx }) =>
    listBrailleProjectsByUser(ctx.user.id)
  ),

  all: adminProcedure.query(() => getAllBrailleProjects()),

  stats: adminProcedure.query(async () => {
    const total = await getTotalBrailleProjects();
    return { total };
  }),

  export: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        format: z.enum(["brf", "txt", "musicxml"]),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const project = await getBrailleProjectById(input.id);
      if (!project) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Projeto não encontrado",
        });
      }

      if (project.userId !== ctx.user.id && ctx.user.role !== "admin") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Acesso negado",
        });
      }

      const brailleContent = project.contentBraille || "";
      const textContent = project.contentText || "";

      // Validar conteúdo Braille
      const validation = validateBrailleContent(brailleContent);
      if (!validation.valid) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Conteúdo Braille inválido: ${validation.errors.join(", ")}`,
        });
      }

      let fileContent = "";
      let fileName = "";
      let mimeType = "text/plain";

      const exportOptions = {
        title: project.title,
        author: ctx.user.name || "Unknown",
        language: project.language,
      };

      switch (input.format) {
        case "brf":
          fileContent = exportAsBrf(brailleContent, exportOptions);
          fileName = `${project.title}.brf`;
          mimeType = "text/plain";
          break;

        case "txt":
          fileContent = exportAsPlainText(
            brailleContent,
            textContent,
            exportOptions
          );
          fileName = `${project.title}.txt`;
          mimeType = "text/plain";
          break;

        case "musicxml":
          fileContent = exportAsMusicXML(brailleContent, exportOptions);
          fileName = `${project.title}.musicxml`;
          mimeType = "application/vnd.recordare.musicxml+xml";
          break;

        default:
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Formato não suportado",
          });
      }

      // Upload para S3
      const suffix = Date.now().toString(36);
      const fileKey = `five-steps/braille-exports/${ctx.user.id}/${suffix}-${fileName}`;
      const buffer = Buffer.from(fileContent, "utf-8");

      try {
        const { url } = await storagePut(fileKey, buffer, mimeType);
        return { success: true, url, fileName };
      } catch (err) {
        console.error("Export failed:", err);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Falha ao exportar arquivo",
        });
      }
    }),
});
