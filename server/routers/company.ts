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
});
