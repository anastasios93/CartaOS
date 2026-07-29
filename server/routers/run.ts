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

  /**
   * Tracking a milestone: status, owner and notes are the user's to set.
   *
   * Deliberately narrow. Dates stay computed — letting the client post an
   * arbitrary dueDate would put the schedule back in narrated hands, which is
   * the thing the deterministic layer exists to prevent. Re-plan to move dates.
   */
  updateMilestone: protectedProcedure
    .input(
      z.object({
        runId: z.string().min(1),
        milestoneId: z.string().min(1),
        status: z.enum(["not_started", "in_progress", "blocked", "done"]).optional(),
        owner: z.string().max(80).optional(),
        notes: z.string().max(600).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const scope = await getOwnerScope(ctx);
      const run = await ctx.db.run.findFirst({
        where: { id: input.runId, ...(scope.ownerId ? { userId: scope.ownerId } : {}) },
        select: { id: true, execution: true },
      });
      if (!run) throw new Error("Not found");

      const execution = (run.execution ?? {}) as { milestones?: Record<string, unknown>[] };
      const milestones = Array.isArray(execution.milestones) ? execution.milestones : [];
      const idx = milestones.findIndex((m) => m?.id === input.milestoneId);
      if (idx === -1) throw new Error("Milestone not found");

      const patch: Record<string, unknown> = {};
      if (input.status !== undefined) patch.status = input.status;
      if (input.owner !== undefined) patch.owner = input.owner;
      if (input.notes !== undefined) patch.notes = input.notes;

      const next = milestones.map((m, i) => (i === idx ? { ...m, ...patch } : m));
      const updated = await ctx.db.run.update({
        where: { id: run.id },
        data: { execution: { ...execution, milestones: next } as never },
        select: { execution: true },
      });
      return updated.execution;
    }),
});
