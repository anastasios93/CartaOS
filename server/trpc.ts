import { initTRPC, TRPCError } from "@trpc/server";
import { type FetchCreateContextFnOptions } from "@trpc/server/adapters/fetch";
import superjson from "superjson";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "./db";

export async function createContext(opts?: FetchCreateContextFnOptions) {
  const session = await getServerSession(authOptions);
  return { db, session };
}

export type Context = Awaited<ReturnType<typeof createContext>>;

const t = initTRPC.context<Context>().create({
  transformer: superjson,
});

export const router = t.router;
export const publicProcedure = t.procedure;

export const protectedProcedure = t.procedure.use(async ({ ctx, next }) => {
  if (!ctx.session?.user) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }
  return next({
    ctx: { ...ctx, session: ctx.session },
  });
});

export const adminProcedure = t.procedure.use(async ({ ctx, next }) => {
  if (!ctx.session?.user) throw new TRPCError({ code: "UNAUTHORIZED" });
  const user = await ctx.db.user.findUnique({
    where: { id: ctx.session.user.id },
    select: { isAdmin: true },
  });
  if (!user?.isAdmin) throw new TRPCError({ code: "FORBIDDEN" });
  return next({ ctx: { ...ctx, session: ctx.session } });
});

/**
 * Tenant-scope helper. Returns a Prisma `where` fragment that constrains a
 * query to the current user's records, EXCEPT when the user is admin — in
 * which case it returns `{}` so admins can see everyone's data. Pass it via
 * `where: { ...ownerScope, ...otherFilters }`.
 */
export async function getOwnerScope(
  ctx: Context
): Promise<{ ownerId?: string }> {
  if (!ctx.session?.user) return { ownerId: "__none__" }; // deny if unauth
  const me = await ctx.db.user.findUnique({
    where: { id: ctx.session.user.id },
    select: { isAdmin: true },
  });
  if (me?.isAdmin) return {}; // admin sees everything
  return { ownerId: ctx.session.user.id };
}
