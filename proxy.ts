/**
 * Server-side auth gate for all dashboard pages (Next 16 proxy convention —
 * the successor to middleware.ts). Before this existed, route protection was
 * only a client-side redirect in the dashboard layout.
 *
 * /api/* is intentionally excluded: every API route enforces its own session
 * check and must return JSON 401s, not login redirects (the SSE orchestrator
 * and fetch callers depend on that).
 */

import { withAuth } from "next-auth/middleware";

export default withAuth({
  callbacks: {
    // Live sessions of trial accounts die at the invite's expiry instant,
    // not just the next login attempt.
    authorized: ({ token }) =>
      !!token &&
      (typeof token.trialExpiresAt !== "number" ||
        Date.now() < token.trialExpiresAt),
  },
  pages: { signIn: "/login" },
});

export const config = {
  matcher: [
    "/((?!api/|login|signup|landing.html|_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|svg|ico|webmanifest|txt|xml)).*)",
  ],
};
