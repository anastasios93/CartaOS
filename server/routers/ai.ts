import { z } from "zod/v4";
import { router, protectedProcedure } from "../trpc";
import {
  extractDealTerms,
  draftClause,
  scorePartnerFit,
  chatWithCartaOS,
} from "../services/claude";

export const aiRouter = router({
  extractDeal: protectedProcedure
    .input(z.object({ documentText: z.string().min(10) }))
    .mutation(async ({ input }) => {
      return extractDealTerms(input.documentText);
    }),

  draftClause: protectedProcedure
    .input(
      z.object({
        clauseType: z.string(),
        dealContext: z.string(),
        comparableExamples: z.array(z.string()).default([]),
      })
    )
    .mutation(async ({ input }) => {
      return draftClause(input.clauseType, input.dealContext, input.comparableExamples);
    }),

  scorePartner: protectedProcedure
    .input(
      z.object({
        assetProfile: z.record(z.string(), z.any()),
        partnerProfile: z.record(z.string(), z.any()),
      })
    )
    .mutation(async ({ input }) => {
      return scorePartnerFit(input.assetProfile, input.partnerProfile);
    }),

  chat: protectedProcedure
    .input(
      z.object({
        messages: z.array(
          z.object({
            role: z.enum(["user", "assistant"]),
            content: z.string(),
          })
        ),
      })
    )
    .mutation(async ({ input }) => {
      return chatWithCartaOS(input.messages);
    }),
});
