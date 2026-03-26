import { z } from "zod";
import { router, protectedProcedure } from "../trpc";

export const userRouter = router({
  /** Get the current user's full profile from DB */
  me: protectedProcedure.query(async ({ ctx }) => {
    const user = await ctx.db.user.findUnique({
      where: { id: ctx.session.user.id },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        role: true,
        company: true,
        department: true,
        phone: true,
        createdAt: true,
      },
    });
    return user;
  }),

  /** Update the current user's profile */
  updateProfile: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1).max(100).optional(),
        role: z.string().max(100).optional(),
        company: z.string().max(100).optional(),
        department: z.string().max(100).optional(),
        phone: z.string().max(30).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const updated = await ctx.db.user.update({
        where: { id: ctx.session.user.id },
        data: {
          ...(input.name !== undefined && { name: input.name }),
          ...(input.role !== undefined && { role: input.role || null }),
          ...(input.company !== undefined && { company: input.company || null }),
          ...(input.department !== undefined && { department: input.department || null }),
          ...(input.phone !== undefined && { phone: input.phone || null }),
        },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          company: true,
          department: true,
          phone: true,
        },
      });
      return updated;
    }),
});
