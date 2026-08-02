/**
 * Time-limited trial invite tokens.
 *
 * A token is `v1.<exp36>.<sig>` where exp36 is the expiry timestamp (ms since
 * epoch, base36) and sig is HMAC-SHA256 over "trial:v1:<exp36>" keyed with
 * NEXTAUTH_SECRET. Stateless by design: nothing to store or migrate, and the
 * expiry is tamper-proof because it is covered by the signature. Revoking all
 * outstanding invites = rotating NEXTAUTH_SECRET.
 *
 * Server-only (node:crypto) — the signup page decodes the expiry segment for
 * display but never verifies signatures client-side.
 */

import { createHmac, timingSafeEqual } from "crypto";

const VERSION = "v1";

function secret(): string {
  const s = process.env.NEXTAUTH_SECRET;
  if (!s) throw new Error("NEXTAUTH_SECRET is not set");
  return s;
}

function sign(exp36: string): string {
  return createHmac("sha256", secret())
    .update(`trial:${VERSION}:${exp36}`)
    .digest("hex");
}

export function mintTrialToken(expiresAt: Date): string {
  const exp36 = expiresAt.getTime().toString(36);
  return `${VERSION}.${exp36}.${sign(exp36)}`;
}

export type TrialTokenCheck =
  | { valid: true; expiresAt: Date }
  | { valid: false; reason: "malformed" | "bad_signature" | "expired"; expiresAt?: Date };

export function verifyTrialToken(token: string): TrialTokenCheck {
  const parts = token.split(".");
  if (parts.length !== 3 || parts[0] !== VERSION) {
    return { valid: false, reason: "malformed" };
  }
  const [, exp36, sig] = parts;

  const expected = sign(exp36);
  const a = Buffer.from(sig, "utf8");
  const b = Buffer.from(expected, "utf8");
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    return { valid: false, reason: "bad_signature" };
  }

  const expMs = parseInt(exp36, 36);
  if (!Number.isFinite(expMs)) {
    return { valid: false, reason: "malformed" };
  }
  const expiresAt = new Date(expMs);
  if (Date.now() >= expMs) {
    return { valid: false, reason: "expired", expiresAt };
  }
  return { valid: true, expiresAt };
}
