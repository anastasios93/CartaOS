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

export async function POST() {
  try {
    // Always (re)set the password hash so the returned credentials are
    // guaranteed to authenticate — even if the demo user was seeded earlier
    // with a different password. Idempotent upsert.
    const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 12);

    await db.user.upsert({
      where: { email: DEMO_EMAIL },
      update: {
        passwordHash,
        name: "Demo User",
        company: "CartaOS Demo",
        role: "Business Development",
        department: "Corporate Development",
      },
      create: {
        name: "Demo User",
        email: DEMO_EMAIL,
        passwordHash,
        company: "CartaOS Demo",
        role: "Business Development",
        department: "Corporate Development",
      },
    });

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
