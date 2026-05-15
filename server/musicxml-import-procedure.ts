/**
 * tRPC Procedure para importar e converter MusicXML
 * Adicionar este arquivo ao editor-router.ts
 */

import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { protectedProcedure } from "./_core/trpc";
import { parseMusicXML, validateMusicXML } from "./musicxml-parser";
import { updateBrailleProject } from "./db";

/**
 * Procedure para fazer upload e converter MusicXML
 * Uso: trpc.editor.importMusicXML.useMutation()
 */
export const importMusicXMLProcedure = protectedProcedure
  .input(
    z.object({
      projectId: z.number(),
      xmlContent: z.string().min(100), // Arquivo MusicXML como string
      fileName: z.string().optional(),
    })
  )
  .mutation(async ({ ctx, input }) => {
    try {
      // Validar arquivo MusicXML
      const validation = await validateMusicXML(input.xmlContent);
      if (!validation.valid) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Arquivo MusicXML inválido: ${validation.errors.join(", ")}`,
        });
      }

      // Fazer parse do arquivo
      const parsed = await parseMusicXML(input.xmlContent);

      // Atualizar projeto com conteúdo convertido
      const updated = await updateBrailleProject(input.projectId, {
        contentBraille: parsed.brailleContent,
        contentMusicXml: input.xmlContent,
        title: parsed.title || input.fileName?.replace(".musicxml", "") || "Imported Project",
      });

      return {
        success: true,
        project: updated,
        metadata: {
          title: parsed.title,
          composer: parsed.composer,
          notesCount: parsed.notes.length,
          timeSignature: `${parsed.timeSignature.beats}/${parsed.timeSignature.beatType}`,
          key: `${parsed.key.fifths} sharps/flats (${parsed.key.mode})`,
        },
      };
    } catch (error) {
      console.error("MusicXML import error:", error);
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: `Falha ao importar MusicXML: ${error instanceof Error ? error.message : "Erro desconhecido"}`,
      });
    }
  });

/**
 * Procedure para validar arquivo MusicXML antes de fazer upload
 * Uso: trpc.editor.validateMusicXML.useMutation()
 */
export const validateMusicXMLProcedure = protectedProcedure
  .input(
    z.object({
      xmlContent: z.string().min(100),
    })
  )
  .mutation(async ({ input }) => {
    try {
      const validation = await validateMusicXML(input.xmlContent);
      return validation;
    } catch (error) {
      return {
        valid: false,
        errors: [
          `Erro ao validar: ${error instanceof Error ? error.message : "Erro desconhecido"}`,
        ],
      };
    }
  });
