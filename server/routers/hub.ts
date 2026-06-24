import { z } from "zod/v4";
import { router, protectedProcedure } from "../trpc";

/**
 * Hub router — read access to the current user's Simulated Plan / Intelligence
 * Hub requests so they can be listed and reopened from the UI.
 *
 * Requests are persisted by POST /api/orchestrator as they run. These are
 * scoped strictly to the signed-in user (admins use the admin router to view
 * other users' requests).
 */
export const hubRouter = router({
  /** List the current user's past requests, newest first. */
  list: protectedProcedure
    .input(
      z
        .object({
          limit: z.number().min(1).max(50).default(20),
        })
        .optional()
    )
    .query(async ({ ctx, input }) => {
      const limit = input?.limit ?? 20;
      return ctx.db.hubRequest.findMany({
        where: { userId: ctx.session.user.id },
        orderBy: { createdAt: "desc" },
        take: limit,
        select: {
          id: true,
          assetName: true,
          therapeuticArea: true,
          stage: true,
          dealDirection: true,
          geographies: true,
          status: true,
          createdAt: true,
          completedAt: true,
          _count: { select: { results: true } },
        },
      });
    }),

  /** Fetch a single past request with its stored agent results. */
  getById: protectedProcedure.input(z.string()).query(async ({ ctx, input }) => {
    const req = await ctx.db.hubRequest.findFirst({
      where: { id: input, userId: ctx.session.user.id },
      include: { results: true },
    });
    if (!req) throw new Error("Request not found");
    return req;
  }),
});
