import { z } from "zod/v4";
import { router, protectedProcedure, getOwnerScope } from "../trpc";

/**
 * The Run spine's read surface: every pillar lists and reopens the same runs.
 * Owner-scoped like the rest of the app (admins see all tenants).
 */
export const runRouter = router({
  list: protectedProcedure
    .input(
      z
        .object({
          assetType: z.enum(["off_patent", "innovative"]).optional(),
          limit: z.number().min(1).max(50).default(20),
        })
        .optional(),
    )
    .query(async ({ ctx, input }) => {
      const scope = await getOwnerScope(ctx);
      const where: Record<string, unknown> = { ...scope };
      if (scope.ownerId) {
        // Run rows use userId, not ownerId, as the tenant column.
        delete where.ownerId;
        where.userId = scope.ownerId;
      }
      if (input?.assetType) where.assetType = input.assetType;
      return ctx.db.run.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: input?.limit ?? 20,
        select: {
          id: true,
          assetQuery: true,
          assetType: true,
          geographies: true,
          status: true,
          createdAt: true,
          legacySource: true,
        },
      });
    }),

  getById: protectedProcedure.input(z.string()).query(async ({ ctx, input }) => {
    const scope = await getOwnerScope(ctx);
    const run = await ctx.db.run.findFirst({
      where: { id: input, ...(scope.ownerId ? { userId: scope.ownerId } : {}) },
    });
    if (!run) throw new Error("Not found");
    return run;
  }),
});
