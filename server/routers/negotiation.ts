import { z } from "zod/v4";
import { router, protectedProcedure, getOwnerScope } from "../trpc";
import { runDealConductor } from "../services/claude";

export const negotiationRouter = router({
  list: protectedProcedure
    .input(
      z
        .object({
          status: z
            .enum([
              "INITIATED",
              "TERM_SHEET_DRAFTING",
              "TERM_SHEET_EXCHANGED",
              "DUE_DILIGENCE",
              "DEFINITIVE_AGREEMENT",
              "CLOSED",
              "DEAD",
            ])
            .optional(),
          search: z.string().optional(),
          limit: z.number().min(1).max(50).default(20),
          cursor: z.string().optional(),
        })
        .optional()
    )
    .query(async ({ ctx, input }) => {
      const limit = input?.limit ?? 20;
      const ownerScope = await getOwnerScope(ctx);
      const where: any = { ...ownerScope };

      if (input?.status) where.status = input.status;
      if (input?.search) {
        where.title = { contains: input.search, mode: "insensitive" };
      }

      const items = await ctx.db.negotiation.findMany({
        where,
        take: limit + 1,
        cursor: input?.cursor ? { id: input.cursor } : undefined,
        orderBy: { updatedAt: "desc" },
        include: {
          company: { select: { id: true, name: true, type: true } },
          _count: { select: { activities: true, actionItems: true } },
        },
      });

      let nextCursor: string | undefined;
      if (items.length > limit) {
        const next = items.pop()!;
        nextCursor = next.id;
      }

      return { items, nextCursor };
    }),

  getById: protectedProcedure.input(z.string()).query(async ({ ctx, input }) => {
    const ownerScope = await getOwnerScope(ctx);
    const n = await ctx.db.negotiation.findFirst({
      where: { id: input, ...ownerScope },
      include: {
        company: true,
        activities: { orderBy: { occurredAt: "desc" }, take: 50 },
        actionItems: { orderBy: { dueDate: "asc" } },
        benchmarkDeals: { include: { deal: true } },
      },
    });
    if (!n) throw new Error("Not found");
    return n;
  }),

  create: protectedProcedure
    .input(
      z.object({
        title: z.string().min(1),
        companyId: z.string(),
        orgId: z.string(),
        proposedUpfront: z.number().optional(),
        proposedMilestones: z.number().optional(),
        proposedRoyaltyLow: z.number().optional(),
        proposedRoyaltyHigh: z.number().optional(),
        proposedTerritory: z.string().optional(),
        targetCloseDate: z
          .string()
          .transform((s) => new Date(s))
          .optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.db.negotiation.create({
        data: { ...input, ownerId: ctx.session.user.id },
        include: { company: true },
      });
    }),

  updateStatus: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        status: z.enum([
          "INITIATED",
          "TERM_SHEET_DRAFTING",
          "TERM_SHEET_EXCHANGED",
          "DUE_DILIGENCE",
          "DEFINITIVE_AGREEMENT",
          "CLOSED",
          "DEAD",
        ]),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.db.negotiation.update({
        where: { id: input.id },
        data: { status: input.status },
      });
    }),

  addActivity: protectedProcedure
    .input(
      z.object({
        negotiationId: z.string(),
        type: z.string(),
        title: z.string(),
        description: z.string().optional(),
        metadata: z.any().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.db.negotiationActivity.create({ data: input });
    }),

  runConductor: protectedProcedure.input(z.string()).mutation(async ({ ctx, input }) => {
    const negotiation = await ctx.db.negotiation.findUniqueOrThrow({
      where: { id: input },
      include: {
        company: true,
        activities: { orderBy: { occurredAt: "desc" }, take: 20 },
        actionItems: { where: { status: { in: ["OPEN", "IN_PROGRESS", "OVERDUE"] } } },
        benchmarkDeals: { include: { deal: true } },
      },
    });

    const conductorResult = await runDealConductor(negotiation);

    await ctx.db.negotiation.update({
      where: { id: input },
      data: {
        currentBlockers: conductorResult.blockers,
        nextSteps: conductorResult.nextSteps,
        riskFlags: conductorResult.riskFlags,
      },
    });

    return conductorResult;
  }),
});
