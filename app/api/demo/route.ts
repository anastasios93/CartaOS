/**
 * POST /api/demo
 * Idempotently ensures a shared demo account exists, then returns its
 * credentials so the client can be signed in with one click.
 *
 * This lets prospective clients explore the full product instantly without
 * registering. The demo account is read-mostly; it shares the same seeded
 * portfolio data as other users.
 */

import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { db } from "@/server/db";

export const dynamic = "force-dynamic";

const DEMO_EMAIL = "demo@cartaos.ai";
const DEMO_PASSWORD = "ExploreCartaOS2026";

// The endpoint is unauthenticated by design (it powers the one-click demo
// button on /login), so bound the work it can be made to do: the bcrypt hash
// is computed once per instance, and the upsert runs at most once per minute
// per instance — repeat calls just return the (public, shared) credentials.
let cachedHash: string | null = null;
let lastUpsertAt = 0;
const UPSERT_COOLDOWN_MS = 60_000;

export async function POST() {
  try {
    if (Date.now() - lastUpsertAt > UPSERT_COOLDOWN_MS) {
      cachedHash ??= await bcrypt.hash(DEMO_PASSWORD, 12);

      await db.user.upsert({
        where: { email: DEMO_EMAIL },
        update: {
          passwordHash: cachedHash,
          name: "Demo User",
          company: "CartaOS Demo",
          role: "Business Development",
          department: "Corporate Development",
          // The shared demo account must never carry admin rights, even if
          // someone flips the flag in the DB — every demo login resets it.
          isAdmin: false,
        },
        create: {
          name: "Demo User",
          email: DEMO_EMAIL,
          passwordHash: cachedHash,
          company: "CartaOS Demo",
          role: "Business Development",
          department: "Corporate Development",
          isAdmin: false,
        },
      });
      lastUpsertAt = Date.now();
    }

    return NextResponse.json({
      email: DEMO_EMAIL,
      password: DEMO_PASSWORD,
    });
  } catch (error) {
    console.error("Demo account error:", error);
    return NextResponse.json(
      { error: "Could not initialize demo account" },
      { status: 500 }
    );
  }
}
