import { z } from "zod/v4";
import { TRPCError } from "@trpc/server";
import { router, protectedProcedure } from "../trpc";
import { supabaseAdmin, STORAGE_BUCKET } from "@/lib/supabase";
import { extractDealTerms } from "../services/claude";

export const documentRouter = router({
  // ─── Get a signed upload URL and create a pending Document record ─────────
  getUploadUrl: protectedProcedure
    .input(
      z.object({
        filename: z.string().min(1),
        mimeType: z.string().min(1),
        fileSize: z.number().int().positive(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      const path = `${userId}/${Date.now()}-${input.filename}`;

      const { data, error } = await supabaseAdmin.storage
        .from(STORAGE_BUCKET)
        .createSignedUploadUrl(path);

      if (error || !data) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Failed to create upload URL: ${error?.message ?? "unknown error"}`,
        });
      }

      const document = await ctx.db.document.create({
        data: {
          userId,
          filename: input.filename,
          mimeType: input.mimeType,
          fileSize: input.fileSize,
          storageUrl: path,
          status: "PENDING",
        },
      });

      return {
        uploadUrl: data.signedUrl,
        documentId: document.id,
        path,
      };
    }),

  // ─── List all documents for the current user ─────────────────────────────
  list: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.session.user.id;

    return ctx.db.document.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      include: { extractedDeal: true },
    });
  }),

  // ─── Get a single document by ID (with ownership check) ──────────────────
  getById: protectedProcedure
    .input(z.string())
    .query(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;

      const document = await ctx.db.document.findUnique({
        where: { id: input },
        include: { extractedDeal: true },
      });

      if (!document || document.userId !== userId) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Document not found",
        });
      }

      return document;
    }),

  // ─── Extract deal terms from the document using Claude ────────────────────
  extract: protectedProcedure
    .input(z.object({ documentId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;

      const document = await ctx.db.document.findUnique({
        where: { id: input.documentId },
      });

      if (!document || document.userId !== userId) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Document not found",
        });
      }

      // Mark as extracting
      await ctx.db.document.update({
        where: { id: document.id },
        data: { status: "EXTRACTING" },
      });

      try {
        // Download the file content from Supabase Storage
        const { data: fileData, error: downloadError } = await supabaseAdmin.storage
          .from(STORAGE_BUCKET)
          .download(document.storageUrl);

        if (downloadError || !fileData) {
          throw new Error(
            `Failed to download file: ${downloadError?.message ?? "unknown error"}`
          );
        }

        const text = await fileData.text();

        // Extract deal terms via Claude
        const extracted = await extractDealTerms(text);

        // Map extracted data to a Deal record
        const deal = await ctx.db.deal.create({
          data: {
            title: `${extracted.licensorName ?? "Unknown"} / ${extracted.licenseeName ?? "Unknown"} — ${extracted.therapeuticArea ?? "Deal"}`,
            dealType: extracted.dealType ?? "OUT_LICENSE",
            announcedDate: new Date(),
            status: "ANNOUNCED",

            // Parties
            licensorName: extracted.licensorName ?? "Unknown",
            licenseeName: extracted.licenseeName ?? "Unknown",

            // Asset info
            assetName: extracted.assetName ?? null,
            therapeuticArea: extracted.therapeuticArea ?? "Unknown",
            modality: extracted.modality ?? null,
            indication: extracted.indication ?? null,
            developmentStage: extracted.developmentStage ?? "PRECLINICAL",

            // Financial terms
            upfrontPayment: extracted.financialTerms?.upfrontPaymentUsdMm ?? null,
            totalDealValue: extracted.financialTerms?.totalDealValueUsdMm ?? null,
            developmentMilestones:
              extracted.financialTerms?.developmentMilestonesUsdMm ?? null,
            commercialMilestones:
              extracted.financialTerms?.commercialMilestonesUsdMm ?? null,
            royaltyRangeLow: extracted.financialTerms?.royaltyRangeLowPct ?? null,
            royaltyRangeHigh: extracted.financialTerms?.royaltyRangeHighPct ?? null,
            royaltyStepDowns: extracted.financialTerms?.royaltyStepDowns ?? undefined,
            equityInvestment: extracted.financialTerms?.equityInvestmentUsdMm ?? null,

            // Structure & governance
            territoryScope: extracted.structure?.territoryScope ?? null,
            exclusivity: extracted.structure?.exclusivity ?? null,
            coDevRights: extracted.structure?.coDevRights ?? null,
            coPromoteRights: extracted.structure?.coPromoteRights ?? null,
            optionStructure: extracted.structure?.optionStructure ?? null,
            developmentResponsibilities: extracted.structure?.developmentResponsibilities
              ? { summary: extracted.structure.developmentResponsibilities }
              : undefined,

            // Clauses
            terminationClauses: extracted.clauses
              ? {
                  forCause: extracted.clauses.terminationForCause ?? null,
                  forConvenience: extracted.clauses.terminationForConvenience ?? null,
                  changeOfControl: extracted.clauses.changeOfControl ?? null,
                }
              : undefined,
            diligenceObligations: extracted.clauses?.diligenceObligations ?? null,
            sublicensingRights: extracted.clauses?.sublicensingRights ?? null,
            ipOwnership: extracted.clauses?.ipOwnership ?? null,
            disputeResolution: extracted.clauses?.disputeResolution ?? null,
            antiShelving: extracted.clauses?.antiShelving ?? null,

            // Source tracking
            sourceType: "MANUAL",
            rawText: text,
            confidence: extracted.confidenceScore ?? null,
          },
        });

        // Update the document with the extracted deal reference and mark as done
        await ctx.db.document.update({
          where: { id: document.id },
          data: {
            extractedDealId: deal.id,
            extractedText: text,
            status: "DONE",
          },
        });

        return deal;
      } catch (err) {
        // On any error, mark the document as FAILED
        const message = err instanceof Error ? err.message : "Unknown extraction error";
        await ctx.db.document.update({
          where: { id: document.id },
          data: { status: "FAILED", errorMessage: message },
        });

        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Extraction failed: ${message}`,
        });
      }
    }),

  // ─── Delete a document (storage + DB) ─────────────────────────────────────
  delete: protectedProcedure
    .input(z.string())
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;

      const document = await ctx.db.document.findUnique({
        where: { id: input },
      });

      if (!document || document.userId !== userId) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Document not found",
        });
      }

      // Delete from Supabase Storage
      const { error: storageError } = await supabaseAdmin.storage
        .from(STORAGE_BUCKET)
        .remove([document.storageUrl]);

      if (storageError) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Failed to delete from storage: ${storageError.message}`,
        });
      }

      // Delete from database
      await ctx.db.document.delete({
        where: { id: document.id },
      });

      return { success: true };
    }),
});
