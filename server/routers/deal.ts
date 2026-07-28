import { z } from "zod/v4";
import { router, protectedProcedure, getOwnerScope } from "../trpc";

export const dealRouter = router({
  list: protectedProcedure
    .input(
      z
        .object({
          therapeuticArea: z.string().optional(),
          dealType: z.enum(["OUT_LICENSE", "IN_LICENSE", "COLLABORATION", "M_AND_A", "OPTION"]).optional(),
          stage: z.enum(["PRECLINICAL", "PHASE_1", "PHASE_2", "PHASE_3", "APPROVED"]).optional(),
          search: z.string().optional(),
          cursor: z.string().optional(),
          limit: z.number().min(1).max(100).default(20),
        })
        .optional()
    )
    .query(async ({ ctx, input }) => {
      const limit = input?.limit ?? 20;
      const ownerScope = await getOwnerScope(ctx);
      const where: any = { ...ownerScope };

      if (input?.therapeuticArea) where.therapeuticArea = input.therapeuticArea;
      if (input?.dealType) where.dealType = input.dealType;
      if (input?.stage) where.developmentStage = input.stage;
      if (input?.search) {
        where.OR = [
          { title: { contains: input.search, mode: "insensitive" } },
          { licensorName: { contains: input.search, mode: "insensitive" } },
          { licenseeName: { contains: input.search, mode: "insensitive" } },
          { assetName: { contains: input.search, mode: "insensitive" } },
        ];
      }

      const items = await ctx.db.deal.findMany({
        where,
        take: limit + 1,
        cursor: input?.cursor ? { id: input.cursor } : undefined,
        orderBy: { announcedDate: "desc" },
        include: { tags: true },
      });

      let nextCursor: string | undefined;
      if (items.length > limit) {
        const next = items.pop()!;
        nextCursor = next.id;
      }

      return { items, nextCursor };
    }),

  create: protectedProcedure
    .input(
      z.object({
        title: z.string().min(1),
        dealType: z.enum(["OUT_LICENSE", "IN_LICENSE", "COLLABORATION", "M_AND_A", "OPTION"]),
        announcedDate: z.string().transform((s) => new Date(s)),
        status: z.enum(["ANNOUNCED", "CLOSED", "TERMINATED"]),
        licensorName: z.string().min(1),
        licenseeName: z.string().min(1),
        therapeuticArea: z.string().min(1),
        developmentStage: z.enum(["PRECLINICAL", "PHASE_1", "PHASE_2", "PHASE_3", "APPROVED"]),
        sourceType: z.enum(["SEC_FILING", "PRESS_RELEASE", "EARNINGS_CALL", "MANUAL"]),
        assetName: z.string().optional(),
        modality: z.string().optional(),
        indication: z.string().optional(),
        upfrontPayment: z.number().optional(),
        totalDealValue: z.number().optional(),
        developmentMilestones: z.number().optional(),
        commercialMilestones: z.number().optional(),
        royaltyRangeLow: z.number().optional(),
        royaltyRangeHigh: z.number().optional(),
        territoryScope: z.string().optional(),
        exclusivity: z.boolean().optional(),
        sourceUrl: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.db.deal.create({
        data: { ...input, ownerId: ctx.session.user.id },
      });
    }),

});
