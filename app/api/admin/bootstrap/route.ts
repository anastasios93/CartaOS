/**
 * POST /api/admin/bootstrap
 *
 * One-time admin promotion endpoint. Promotes the configured owner email
 * (ADMIN_EMAIL env var, defaults to anastasios.mastroanastasiou@gmail.com)
 * to isAdmin=true. Idempotent — safe to call multiple times.
 *
 * Protected by a one-time secret (ADMIN_BOOTSTRAP_SECRET) so a stranger can't
 * promote themselves; if not configured, falls back to "no auth" so the
 * owner can run it once after first deploy.
 */

import { NextResponse } from "next/server";
import { db } from "@/server/db";

const OWNER_EMAIL = (process.env.ADMIN_EMAIL || "anastasios.mastroanastasiou@gmail.com").toLowerCase();

export async function POST(req: Request) {
  const expectedSecret = process.env.ADMIN_BOOTSTRAP_SECRET;
  if (expectedSecret) {
    const { searchParams } = new URL(req.url);
    if (searchParams.get("secret") !== expectedSecret) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
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
