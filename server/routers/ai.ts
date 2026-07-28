import { z } from "zod/v4";
import { router, protectedProcedure } from "../trpc";
import { extractDealTerms } from "../services/claude";

export const aiRouter = router({
  extractDeal: protectedProcedure
    .input(z.object({ documentText: z.string().min(10) }))
    .mutation(async ({ input }) => {
      return extractDealTerms(input.documentText);
    }),
});
