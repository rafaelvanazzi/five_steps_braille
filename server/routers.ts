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
  createEvent,
  updateEvent,
  deleteEvent,
  listEvents,
  getEventById,
  createRegistration,
  countRegistrations,
  listRegistrationsByEvent,
  getUserRegistration,
  cancelRegistration,
  listUserRegistrations,
  getForumCategories,
  getForumCategoryBySlug,
  getForumTopics,
  getForumTopicById,
  createForumTopic,
  toggleForumTopicPin,
  toggleForumTopicHidden,
  deleteForumTopic,
  getForumPosts,
  createForumPost,
  toggleForumPostHidden,
  deleteForumPost,
  getUserDisplayName,
  setUserDisplayName,
  seedForumCategories,
  incrementTopicView,
  getTopicViewCount,
  toggleForumReaction,
  getReactionsForPosts,
  searchForumTopics,
} from "./db";
import { storagePut, storageGet } from "./storage";
import { notifyOwner } from "./_core/notification";
import { sendContactEmail, sendBulkEmail } from "./email";
import { editorRouter } from "./editor-router";

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

const eventsRouter = router({
  list: publicProcedure
    .input(z.object({ includeAll: z.boolean().optional() }).optional())
    .query(({ ctx, input }) => {
      const isAdmin = ctx.user?.role === "admin";
      return listEvents(isAdmin && input?.includeAll ? false : true);
    }),
  get: publicProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const ev = await getEventById(input.id);
      if (!ev) throw new TRPCError({ code: "NOT_FOUND" });
      return ev;
    }),
  create: adminProcedure
    .input(z.object({
      title: z.string().min(1).max(255),
      description: z.string().min(1),
      eventDate: z.date(),
      format: z.enum(["online", "presencial", "hibrido"]),
      targetAudience: z.enum(["videntes", "pdv", "ambos"]),
      maxSpots: z.number().min(1).max(10000).default(100),
      meetingLink: z.string().url().optional().nullable(),
      status: z.enum(["draft", "published"]).default("draft"),
      pastEventText: z.string().optional().nullable(),
    }))
    .mutation(async ({ input }) => {
      await createEvent(input as any);
      return { success: true };
    }),
  update: adminProcedure
    .input(z.object({
      id: z.number(),
      title: z.string().min(1).max(255).optional(),
      description: z.string().min(1).optional(),
      eventDate: z.date().optional(),
      format: z.enum(["online", "presencial", "hibrido"]).optional(),
      targetAudience: z.enum(["videntes", "pdv", "ambos"]).optional(),
      maxSpots: z.number().min(1).max(10000).optional(),
      meetingLink: z.string().url().optional().nullable(),
      status: z.enum(["draft", "published"]).optional(),
      pastEventText: z.string().optional().nullable(),
    }))
    .mutation(async ({ input }) => {
      const { id, ...data } = input;
      await updateEvent(id, data as any);
      return { success: true };
    }),
  delete: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      await deleteEvent(input.id);
      return { success: true };
    }),
  register: protectedProcedure
    .input(z.object({
      eventId: z.number(),
      country: z.string().min(1).max(100),
      instrument: z.string().min(1).max(100),
      brailleLevel: z.enum(["none", "basic", "intermediate", "advanced"]),
      isVisuallyImpaired: z.boolean(),
      motivation: z.string().max(2000).optional().nullable(),
    }))
    .mutation(async ({ ctx, input }) => {
      const ev = await getEventById(input.eventId);
      if (!ev || ev.status !== "published") throw new TRPCError({ code: "NOT_FOUND", message: "Evento não encontrado" });
      const existing = await getUserRegistration(input.eventId, ctx.user.id);
      if (existing) throw new TRPCError({ code: "CONFLICT", message: "Você já está inscrito neste evento" });
      const counts = await countRegistrations(input.eventId);
      const waitlisted = (counts.confirmed ?? 0) >= ev.maxSpots;
      await createRegistration({ ...input, userId: ctx.user.id, waitlisted });
      // Send notification email to admin
      const brailleLevelLabel: Record<string, string> = { none: "Nenhum", basic: "Básico", intermediate: "Intermediário", advanced: "Avançado" };
      try {
        const { Resend } = await import("resend");
        const resend = new Resend(process.env.RESEND_API_KEY);
        const adminBody = `Nova inscrição em "${ev.title}"\n\nNome: ${ctx.user.name}\nE-mail: ${ctx.user.email}\nPaís: ${input.country}\nInstrumento: ${input.instrument}\nNível de braille: ${brailleLevelLabel[input.brailleLevel]}\nPessoa com DV: ${input.isVisuallyImpaired ? "Sim" : "Não"}\nMotivação: ${input.motivation ?? "—"}\nStatus: ${waitlisted ? "Lista de espera" : "Confirmado"}\n\nEvento: ${ev.eventDate.toLocaleDateString("pt-BR")} — ${ev.format}`;
        await resend.emails.send({ from: "Five Steps <noreply@braille5steps.com>", replyTo: "contato@braille5steps.com", to: "rafaelvanazzi@gmail.com", subject: `[Five Steps] Nova inscrição: ${ev.title}`, text: adminBody });
        // Confirmation to student
        const linkLine = ev.meetingLink ? `\nLink da aula: ${ev.meetingLink}` : "";
        const studentBody = `Olá, ${ctx.user.name}!\n\nSua inscrição em "${ev.title}" foi ${waitlisted ? "registrada na lista de espera" : "confirmada"}.\n\nDetalhes do evento:\nData: ${ev.eventDate.toLocaleDateString("pt-BR")} às ${ev.eventDate.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}\nFormato: ${ev.format}${linkLine}\n\nAté breve!\nEquipe Five Steps — braille5steps.com`;
        await resend.emails.send({ from: "Five Steps <noreply@braille5steps.com>", replyTo: "contato@braille5steps.com", to: ctx.user.email!, subject: `Inscrição confirmada: ${ev.title}`, text: studentBody });
      } catch (e) { console.warn("[Email] Failed to send registration emails:", e); }
      return { success: true, waitlisted };
    }),
  cancelRegistration: protectedProcedure
    .input(z.object({ eventId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      await cancelRegistration(input.eventId, ctx.user.id);
      return { success: true };
    }),
  myRegistrations: protectedProcedure
    .query(({ ctx }) => listUserRegistrations(ctx.user.id)),
  getMyRegistration: protectedProcedure
    .input(z.object({ eventId: z.number() }))
    .query(({ ctx, input }) => getUserRegistration(input.eventId, ctx.user.id)),
  listRegistrations: adminProcedure
    .input(z.object({ eventId: z.number() }))
    .query(({ input }) => listRegistrationsByEvent(input.eventId)),
  countRegistrations: publicProcedure
    .input(z.object({ eventId: z.number() }))
    .query(({ input }) => countRegistrations(input.eventId)),
});


// ─── Forum Router ────────────────────────────────────────────────────────────
const forumRouter = router({
  categories: publicProcedure.query(async () => {
    await seedForumCategories();
    return getForumCategories();
  }),
  topics: publicProcedure
    .input(z.object({ slug: z.string() }))
    .query(async ({ input }) => {
      const cat = await getForumCategoryBySlug(input.slug);
      if (!cat) throw new TRPCError({ code: "NOT_FOUND" });
      const topics = await getForumTopics(cat.id, false);
      return { category: cat, topics };
    }),
  posts: protectedProcedure
    .input(z.object({ topicId: z.number() }))
    .query(async ({ input, ctx }) => {
      const topic = await getForumTopicById(input.topicId);
      if (!topic || topic.hidden) throw new TRPCError({ code: "NOT_FOUND" });
      const posts = await getForumPosts(input.topicId, ctx.user.role === "admin");
      return { topic, posts };
    }),
  createTopic: protectedProcedure
    .input(z.object({
      categorySlug: z.string(),
      title: z.string().min(3).max(255),
      body: z.string().min(1).max(10000),
      language: z.enum(["pt", "en", "es"]).default("pt"),
    }))
    .mutation(async ({ input, ctx }) => {
      const cat = await getForumCategoryBySlug(input.categorySlug);
      if (!cat) throw new TRPCError({ code: "NOT_FOUND" });
      await createForumTopic({ categoryId: cat.id, userId: ctx.user.id, title: input.title, language: input.language });
      const topics = await getForumTopics(cat.id, true);
      const newTopic = topics.find(t => t.title === input.title && t.userId === ctx.user.id);
      if (!newTopic) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      await createForumPost({ topicId: newTopic.id, userId: ctx.user.id, body: input.body });
      return { topicId: newTopic.id };
    }),
  reply: protectedProcedure
    .input(z.object({ topicId: z.number(), body: z.string().min(1).max(10000) }))
    .mutation(async ({ input, ctx }) => {
      const topic = await getForumTopicById(input.topicId);
      if (!topic || topic.hidden) throw new TRPCError({ code: "NOT_FOUND" });
      await createForumPost({ topicId: input.topicId, userId: ctx.user.id, body: input.body });
      return { success: true };
    }),
  pinTopic: adminProcedure
    .input(z.object({ topicId: z.number(), pinned: z.boolean() }))
    .mutation(({ input }) => toggleForumTopicPin(input.topicId, input.pinned)),
  hideTopic: adminProcedure
    .input(z.object({ topicId: z.number(), hidden: z.boolean() }))
    .mutation(({ input }) => toggleForumTopicHidden(input.topicId, input.hidden)),
  deleteTopic: adminProcedure
    .input(z.object({ topicId: z.number() }))
    .mutation(({ input }) => deleteForumTopic(input.topicId)),
  hidePost: adminProcedure
    .input(z.object({ postId: z.number(), hidden: z.boolean() }))
    .mutation(({ input }) => toggleForumPostHidden(input.postId, input.hidden)),
  deletePost: adminProcedure
    .input(z.object({ postId: z.number() }))
    .mutation(({ input }) => deleteForumPost(input.postId)),
  allTopics: adminProcedure.query(async () => {
    const cats = await getForumCategories();
    const results: any[] = [];
    for (const cat of cats) {
      const topics = await getForumTopics(cat.id, true);
      results.push(...topics.map(t => ({ ...t, categorySlug: cat.slug, categoryNamePt: cat.namePt })));
    }
    return results.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }),
  getDisplayName: protectedProcedure.query(({ ctx }) => getUserDisplayName(ctx.user.id)),
  setDisplayName: protectedProcedure
    .input(z.object({ displayName: z.string().min(1).max(64) }))
    .mutation(({ input, ctx }) => setUserDisplayName(ctx.user.id, input.displayName)),

  // ── Search ────────────────────────────────────────────────────────────────
  search: publicProcedure
    .input(z.object({ query: z.string().min(1).max(200) }))
    .query(({ input }) => searchForumTopics(input.query)),

  // ── Views ─────────────────────────────────────────────────────────────────
  incrementView: publicProcedure
    .input(z.object({ topicId: z.number() }))
    .mutation(({ input }) => incrementTopicView(input.topicId)),
  getViewCount: publicProcedure
    .input(z.object({ topicId: z.number() }))
    .query(({ input }) => getTopicViewCount(input.topicId)),

  // ── Reactions ─────────────────────────────────────────────────────────────
  toggleReaction: protectedProcedure
    .input(z.object({
      postId: z.number(),
      emoji: z.enum(["thumbsup", "heart", "bulb", "music", "hands", "question"]),
    }))
    .mutation(({ input, ctx }) => toggleForumReaction(input.postId, ctx.user.id, input.emoji)),
  getReactions: publicProcedure
    .input(z.object({ postIds: z.array(z.number()) }))
    .query(({ input }) => getReactionsForPosts(input.postIds)),
});

export const appRouter = router({
  system: systemRouter,
  events: eventsRouter,
  forum: forumRouter,
  editor: editorRouter,

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
    // Public: list visible materials (hidden=false). Grade and search filters optional.
    list: publicProcedure
      .input(z.object({
        grade: z.number().min(1).max(5).optional(),
        search: z.string().max(100).optional(),
      }))
      .query(({ input }) => getMaterials(input.grade, input.search)),

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
        // Generate a fresh presigned download URL via storageGet
        let downloadUrl = material.fileUrl;
        try {
          const { url } = await storageGet(material.fileKey);
          downloadUrl = url;
        } catch (e) {
          console.warn("[Download] storageGet failed, falling back to stored URL:", e);
        }
        return { url: downloadUrl, fileName: material.fileName };
      }),

    // Any logged-in user can upload; non-admin uploads start hidden (pending approval)
    upload: protectedProcedure
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
        const isAdmin = ctx.user.role === "admin";
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
          hidden: !isAdmin,
        });
        if (!isAdmin) {
          await notifyOwner({
            title: "Novo material aguardando aprovação",
            content: `${ctx.user.name ?? "Um usuário"} enviou o material "${input.title}" (Grau ${input.grade}) para o acervo. Acesse o painel de administração para aprovar ou rejeitar.`,
          });
        }
        return { success: true, pendingApproval: !isAdmin };
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

    // Protected: get presigned download URL for an additional file
    getFileDownloadUrl: protectedProcedure
      .input(z.object({ fileId: z.number() }))
      .query(async ({ input, ctx }) => {
        const file = await getFileById(input.fileId);
        if (!file) throw new TRPCError({ code: "NOT_FOUND", message: "Arquivo não encontrado" });
        // Check if parent material is hidden
        const material = await getMaterialById(file.materialId);
        if (material?.hidden && material.uploadedBy !== ctx.user.id && ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: "Material oculto" });
        }
        let downloadUrl = file.fileUrl;
        try {
          const { url } = await storageGet(file.fileKey);
          downloadUrl = url;
        } catch (e) {
          console.warn("[Download] storageGet failed for additional file, falling back:", e);
        }
        return { url: downloadUrl, fileName: file.fileName };
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
    sendBulkEmail: adminProcedure
      .input(
        z.object({
          recipients: z.array(z.string().email()).min(1),
          subject: z.string().min(1),
          htmlContent: z.string().min(1),
          replyTo: z.string().email().optional(),
        })
      )
      .mutation(async ({ input }) => {
        return await sendBulkEmail({
          recipients: input.recipients,
          subject: input.subject,
          htmlContent: input.htmlContent,
          replyTo: input.replyTo,
        });
      }),
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
