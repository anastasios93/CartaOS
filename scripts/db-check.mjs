import { PrismaClient } from "@prisma/client";
const db = new PrismaClient();
try {
  await db.$queryRaw`SELECT 1`;
  console.log("QUERY OK via DATABASE_URL");
  const t =
    await db.$queryRaw`SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_name IN ('Run','Evaluation','HubRequest','HubResult')`;
  console.log("tables:", JSON.stringify(t));
} catch (e) {
  console.log("QUERY FAILED:", String(e.message).slice(0, 300));
} finally {
  await db.$disconnect();
}
