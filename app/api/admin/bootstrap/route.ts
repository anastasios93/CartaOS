/**
 * POST /api/admin/bootstrap
 *
 * Admin promotion endpoint. Promotes the configured owner email
 * (ADMIN_EMAIL env var) to isAdmin=true. Idempotent.
 *
 * Never open: callable only with the ADMIN_BOOTSTRAP_SECRET query param, or
 * by an authenticated session whose email IS the owner email (so the owner
 * can self-promote after signing up without configuring a secret).
 */

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/server/db";

const OWNER_EMAIL = (process.env.ADMIN_EMAIL || "anastasios.mastroanastasiou@gmail.com").toLowerCase();

export async function POST(req: Request) {
  const expectedSecret = process.env.ADMIN_BOOTSTRAP_SECRET;
  const { searchParams } = new URL(req.url);
  const secretOk = !!expectedSecret && searchParams.get("secret") === expectedSecret;

  let sessionOk = false;
  if (!secretOk) {
    const session = await getServerSession(authOptions);
    sessionOk = session?.user?.email?.toLowerCase() === OWNER_EMAIL;
  }

  if (!secretOk && !sessionOk) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const user = await db.user.findUnique({ where: { email: OWNER_EMAIL } });
    if (!user) {
      return NextResponse.json(
        {
          error: `No account found for ${OWNER_EMAIL}. Sign up first, then re-run this endpoint.`,
        },
        { status: 404 }
      );
    }

    const updated = await db.user.update({
      where: { email: OWNER_EMAIL },
      data: { isAdmin: true },
      select: { id: true, email: true, name: true, isAdmin: true },
    });

    return NextResponse.json({ promoted: updated });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Bootstrap failed" },
      { status: 500 }
    );
  }
}
