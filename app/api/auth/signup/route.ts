import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { db } from "@/server/db";
import { verifyTrialToken } from "@/lib/trial";

export async function POST(req: Request) {
  try {
    const { name, email, password, company, role, department, inviteToken } =
      await req.json();

    // Invite handling. When INVITE_ONLY_SIGNUP=1 a valid, unexpired invite
    // token is the only way in; otherwise a token is optional but, when
    // present, still stamps the account with the invite's expiry.
    let trialExpiresAt: Date | null = null;
    if (inviteToken) {
      const check = verifyTrialToken(String(inviteToken));
      if (!check.valid) {
        return NextResponse.json(
          {
            error:
              check.reason === "expired"
                ? "This test invite has expired. Ask your CartaOS contact for a new link."
                : "This invite link is invalid. Ask your CartaOS contact for a new link.",
          },
          { status: 403 }
        );
      }
      trialExpiresAt = check.expiresAt;
    } else if (process.env.INVITE_ONLY_SIGNUP?.trim() === "1") {
      return NextResponse.json(
        { error: "Signups are currently invite-only. Ask your CartaOS contact for an invite link." },
        { status: 403 }
      );
    }

    if (!email || !password || !name) {
      return NextResponse.json(
        { error: "Name, email, and password are required" },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters" },
        { status: 400 }
      );
    }

    const existing = await db.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json(
        { error: "An account with this email already exists" },
        { status: 409 }
      );
    }

    const passwordHash = await bcrypt.hash(password, 12);

    await db.user.create({
      data: {
        name,
        email,
        passwordHash,
        company: company || null,
        role: role || null,
        department: department || null,
        trialExpiresAt,
      },
    });

    return NextResponse.json({ success: true }, { status: 201 });
  } catch (error) {
    console.error("Signup error:", error);
    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 }
    );
  }
}
