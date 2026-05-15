// Este arquivo contém a procedure de exportação para ser adicionada ao router
// Adicione isto ao router do editor em server/routers.ts

export const exportProcedure = `
    export: protectedProcedure
      .input(z.object({
        id: z.number(),
        format: z.enum(["brf", "txt", "unicode"]),
      }))
      .mutation(async ({ ctx, input }) => {
        const project = await getBrailleProjectById(input.id);
        if (!project) throw new TRPCError({ code: "NOT_FOUND", message: "Projeto nao encontrado" });
        if (project.userId !== ctx.user.id && ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: "Acesso negado" });
        }

        const brailleContent = project.contentBraille || "";
        const textContent = project.contentText || "";

        // Validar conteudo
        const validation = validateBrailleContent(brailleContent);
        if (!validation.valid) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: \`Conteudo Braille invalido: \${validation.errors.join(", ")}\`,
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
            fileName = \`\${project.title}.brf\`;
            break;
          case "txt":
            fileContent = exportAsPlainText(brailleContent, textContent, exportOptions);
            fileName = \`\${project.title}.txt\`;
            break;
          case "unicode":
            fileContent = brailleContent;
            fileName = \`\${project.title}-braille.txt\`;
            break;
          default:
            throw new TRPCError({ code: "BAD_REQUEST", message: "Formato nao suportado" });
        }

        // Upload para S3
        const suffix = Date.now().toString(36);
        const fileKey = \`five-steps/braille-exports/\${ctx.user.id}/\${suffix}-\${fileName}\`;
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
`;
