/**
 * Database seed — intentionally a no-op.
 *
 * The app ships as a clean slate. All content reflects real user activity:
 * deals saved through the UI, partners tracked manually, AI agents that pull
 * live public data. Do NOT seed mock or example data here.
 *
 * Run with: pnpm prisma db seed
 */

export default async function seed() {
  console.log("Seed: no-op. The app starts with no example data.");
}

if (typeof require !== "undefined" && require.main === module) {
  seed().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
