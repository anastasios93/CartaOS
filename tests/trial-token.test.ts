import { describe, it, expect, beforeAll, afterAll } from "vitest";

const ORIGINAL_SECRET = process.env.NEXTAUTH_SECRET;

beforeAll(() => {
  process.env.NEXTAUTH_SECRET = "test-secret-for-trial-tokens";
});

afterAll(() => {
  process.env.NEXTAUTH_SECRET = ORIGINAL_SECRET;
});

describe("trial invite tokens", () => {
  it("round-trips a future expiry", async () => {
    const { mintTrialToken, verifyTrialToken } = await import("@/lib/trial");
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    const token = mintTrialToken(expiresAt);
    const check = verifyTrialToken(token);
    expect(check.valid).toBe(true);
    if (check.valid) {
      expect(check.expiresAt.getTime()).toBe(expiresAt.getTime());
    }
  });

  it("rejects an expired token with reason 'expired'", async () => {
    const { mintTrialToken, verifyTrialToken } = await import("@/lib/trial");
    const token = mintTrialToken(new Date(Date.now() - 1000));
    const check = verifyTrialToken(token);
    expect(check.valid).toBe(false);
    if (!check.valid) expect(check.reason).toBe("expired");
  });

  it("rejects a tampered expiry (signature no longer matches)", async () => {
    const { mintTrialToken, verifyTrialToken } = await import("@/lib/trial");
    const token = mintTrialToken(new Date(Date.now() - 1000));
    const [v, , sig] = token.split(".");
    const forgedExp = (Date.now() + 365 * 24 * 60 * 60 * 1000).toString(36);
    const check = verifyTrialToken(`${v}.${forgedExp}.${sig}`);
    expect(check.valid).toBe(false);
    if (!check.valid) expect(check.reason).toBe("bad_signature");
  });

  it("rejects garbage and wrong-version tokens as malformed", async () => {
    const { verifyTrialToken } = await import("@/lib/trial");
    for (const bad of ["", "abc", "v1.only-two", "v2.a.b", "v1.a.b.c.d"]) {
      const check = verifyTrialToken(bad);
      expect(check.valid).toBe(false);
      if (!check.valid) expect(check.reason).not.toBe("expired");
    }
  });

  it("rejects a token signed with a different secret", async () => {
    const { mintTrialToken, verifyTrialToken } = await import("@/lib/trial");
    const token = mintTrialToken(new Date(Date.now() + 1000 * 60));
    process.env.NEXTAUTH_SECRET = "a-rotated-secret";
    const check = verifyTrialToken(token);
    process.env.NEXTAUTH_SECRET = "test-secret-for-trial-tokens";
    expect(check.valid).toBe(false);
    if (!check.valid) expect(check.reason).toBe("bad_signature");
  });
});
