import { z } from "zod/v4";
import { router, adminProcedure } from "../trpc";

export const adminRouter = router({
  /** Whether the current session is an admin (used by sidebar gating). */
  whoami: adminProcedure.query(async ({ ctx }) => {
    const me = await ctx.db.user.findUnique({
      where: { id: ctx.session.user.id },
      select: { id: true, name: true, email: true, isAdmin: true },
    });
    return me;
  }),

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
              hubRequests: true,
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

      const [hubRequests, deals, negotiations, companies] = await Promise.all([
        ctx.db.hubRequest.findMany({
          where: { userId: input.userId },
          orderBy: { createdAt: "desc" },
          take: 25,
          include: { results: true },
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

      return { user, hubRequests, deals, negotiations, companies };
    }),

  /** Overall platform stats. */
  platformStats: adminProcedure.query(async ({ ctx }) => {
    const [users, hubRequests, deals, negotiations, companies] = await Promise.all([
      ctx.db.user.count(),
      ctx.db.hubRequest.count(),
      ctx.db.deal.count(),
      ctx.db.negotiation.count(),
      ctx.db.company.count(),
    ]);
    return { users, hubRequests, deals, negotiations, companies };
  }),
});
