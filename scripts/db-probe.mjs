/**
 * After a Supabase restore the pooler cluster can change. Probe candidate
 * hosts with the existing credentials and report which one accepts them.
 * Prints hosts only — never credentials.
 */
import { PrismaClient } from "@prisma/client";
import { readFileSync } from "node:fs";

const env = readFileSync(".env", "utf8");
const current = env.match(/^DATABASE_URL="?([^"\r\n]+)"?/m)?.[1];
if (!current) throw new Error("no DATABASE_URL in .env");
const u = new URL(current);
const ref = u.username.split(".")[1] ?? "";
const pass = u.password;

const candidates = [];
for (const region of ["aws-1-eu-central-1", "aws-0-eu-central-1", "aws-1-eu-west-1", "aws-0-eu-west-1"]) {
  for (const port of [6543, 5432]) {
    candidates.push({
      label: `${region}.pooler.supabase.com:${port}`,
      url: `postgresql://postgres.${ref}:${pass}@${region}.pooler.supabase.com:${port}/postgres${port === 6543 ? "?pgbouncer=true" : ""}`,
    });
  }
}
candidates.push({
  label: `db.${ref}.supabase.co:5432 (direct)`,
  url: `postgresql://postgres:${pass}@db.${ref}.supabase.co:5432/postgres`,
});

for (const c of candidates) {
  const db = new PrismaClient({ datasources: { db: { url: c.url } } });
  try {
    await db.$queryRaw`SELECT 1`;
    console.log(`OK      ${c.label}`);
  } catch (e) {
    console.log(`FAIL    ${c.label} — ${String(e.message).split("\n").filter(Boolean).pop()?.slice(0, 90)}`);
  } finally {
    await db.$disconnect();
  }
}
