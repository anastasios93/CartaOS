import { z } from "zod/v4";
import { router, protectedProcedure, getOwnerScope } from "../trpc";

export const companyRouter = router({
  list: protectedProcedure
    .input(
      z
        .object({
          type: z.enum(["PHARMA", "BIOTECH", "CDMO", "CRO", "FINANCIAL"]).optional(),
          status: z.enum(["IDENTIFIED", "CONTACTED", "IN_DISCUSSION", "ACTIVE", "DECLINED"]).optional(),
          search: z.string().optional(),
          limit: z.number().min(1).max(100).default(20),
          cursor: z.string().optional(),
        })
        .optional()
    )
    .query(async ({ ctx, input }) => {
      const limit = input?.limit ?? 20;
      const ownerScope = await getOwnerScope(ctx);
      const where: any = { ...ownerScope };

      if (input?.type) where.type = input.type;
      if (input?.status) where.partnerStatus = input.status;
      if (input?.search) {
        where.name = { contains: input.search, mode: "insensitive" };
      }

      const items = await ctx.db.company.findMany({
        where,
        take: limit + 1,
        cursor: input?.cursor ? { id: input.cursor } : undefined,
        orderBy: { updatedAt: "desc" },
        include: {
          contacts: { take: 3 },
          _count: { select: { dealsAsLicensor: true, dealsAsLicensee: true, negotiations: true } },
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
    const company = await ctx.db.company.findFirst({
      where: { id: input, ...ownerScope },
      include: {
        contacts: true,
        dealsAsLicensor: { take: 10, orderBy: { announcedDate: "desc" } },
        dealsAsLicensee: { take: 10, orderBy: { announcedDate: "desc" } },
        pipelineAssets: true,
        negotiations: { take: 5, orderBy: { updatedAt: "desc" } },
      },
    });
    if (!company) throw new Error("Not found");
    return company;
  }),

  create: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1),
        type: z.enum(["PHARMA", "BIOTECH", "CDMO", "CRO", "FINANCIAL"]),
        headquarters: z.string().optional(),
        website: z.string().optional(),
        therapeuticFocus: z.array(z.string()).default([]),
        modalityFocus: z.array(z.string()).default([]),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.db.company.create({
        data: { ...input, ownerId: ctx.session.user.id },
      });
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        partnerStatus: z.enum(["IDENTIFIED", "CONTACTED", "IN_DISCUSSION", "ACTIVE", "DECLINED"]).optional(),
        notes: z.string().optional(),
        nextAction: z.string().optional(),
        nextActionDate: z.string().transform((s) => new Date(s)).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      return ctx.db.company.update({ where: { id }, data });
    }),

  stats: protectedProcedure.query(async ({ ctx }) => {
    const [totalCompanies, byType, byStatus] = await Promise.all([
      ctx.db.company.count(),
      ctx.db.company.groupBy({ by: ["type"], _count: true }),
      ctx.db.company.groupBy({ by: ["partnerStatus"], _count: true }),
    ]);
    return { totalCompanies, byType, byStatus };
  }),
});
