import { z } from "zod/v4";
import { router, adminProcedure } from "../trpc";

export const adminRouter = router({
  /** List every registered user with activity counts. */
  listUsers: adminProcedure
    .input(
      z
        .object({
          search: z.string().optional(),
          limit: z.number().min(1).max(200).default(100),
        })
        .optional()
    )
    .query(async ({ ctx, input }) => {
      const limit = input?.limit ?? 100;
      const where: any = {};
      if (input?.search) {
        where.OR = [
          { name: { contains: input.search, mode: "insensitive" } },
          { email: { contains: input.search, mode: "insensitive" } },
          { company: { contains: input.search, mode: "insensitive" } },
        ];
      }
      const users = await ctx.db.user.findMany({
        where,
        take: limit,
        orderBy: [{ lastLoginAt: "desc" }, { createdAt: "desc" }],
        select: {
          id: true,
          name: true,
          email: true,
          company: true,
          role: true,
          isAdmin: true,
          createdAt: true,
          lastLoginAt: true,
          _count: {
            select: {
              runs: true,
              deals: true,
              companies: true,
              negotiations: true,
              documents: true,
            },
          },
        },
      });
      return users;
    }),

  /** Detail view: a single user's profile and recent activity. */
  getUser: adminProcedure
    .input(z.object({ userId: z.string() }))
    .query(async ({ ctx, input }) => {
      const user = await ctx.db.user.findUnique({
        where: { id: input.userId },
        select: {
          id: true,
          name: true,
          email: true,
          company: true,
          role: true,
          department: true,
          isAdmin: true,
          createdAt: true,
          lastLoginAt: true,
        },
      });
      if (!user) throw new Error("User not found");

      const [runs, deals, negotiations, companies] = await Promise.all([
        // The Run spine replaced HubRequest as the record of a user's activity.
        // Payloads are large Json blobs and nothing here renders them, so this
        // selects the summary columns rather than pulling whole reports back.
        ctx.db.run.findMany({
          where: { userId: input.userId },
          orderBy: { createdAt: "desc" },
          take: 25,
          select: {
            id: true,
            assetQuery: true,
            assetType: true,
            geographies: true,
            status: true,
            error: true,
            createdAt: true,
            updatedAt: true,
          },
        }),
        ctx.db.deal.findMany({
          where: { ownerId: input.userId },
          orderBy: { announcedDate: "desc" },
          take: 25,
        }),
        ctx.db.negotiation.findMany({
          where: { ownerId: input.userId },
          orderBy: { updatedAt: "desc" },
          take: 25,
          include: { company: { select: { name: true } } },
        }),
        ctx.db.company.findMany({
          where: { ownerId: input.userId },
          orderBy: { updatedAt: "desc" },
          take: 25,
        }),
      ]);

      return { user, runs, deals, negotiations, companies };
    }),

  /** Overall platform stats. */
  platformStats: adminProcedure.query(async ({ ctx }) => {
    const [users, runs, deals, negotiations, companies] = await Promise.all([
      ctx.db.user.count(),
      ctx.db.run.count(),
      ctx.db.deal.count(),
      ctx.db.negotiation.count(),
      ctx.db.company.count(),
    ]);
    return { users, runs, deals, negotiations, companies };
  }),
});
