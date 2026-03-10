import { z } from "zod/v4";
import { router, publicProcedure } from "../trpc";
import { searchEdgarForDeals } from "../services/sec-edgar";
import { searchClinicalTrials } from "../services/clinical-trials";

const sourceEnum = z.enum(["database", "sec_edgar", "clinical_trials"]);

export const searchRouter = router({
  /**
   * Unified search across multiple data sources.
   * Runs selected sources in parallel; individual failures are isolated
   * so one source going down doesn't break the others.
   */
  unified: publicProcedure
    .input(
      z.object({
        query: z.string().min(1),
        sources: z.array(sourceEnum).optional(),
        limit: z.number().min(1).max(100).default(20),
      })
    )
    .query(async ({ ctx, input }) => {
      const { query, limit } = input;
      const sources = input.sources ?? ["database", "sec_edgar", "clinical_trials"];

      // Build an array of promises keyed by source name
      const tasks: Record<string, Promise<any>> = {};

      if (sources.includes("database")) {
        tasks.database = ctx.db.deal.findMany({
          where: {
            OR: [
              { title: { contains: query, mode: "insensitive" } },
              { licensorName: { contains: query, mode: "insensitive" } },
              { licenseeName: { contains: query, mode: "insensitive" } },
              { assetName: { contains: query, mode: "insensitive" } },
            ],
          },
          take: limit,
          orderBy: { announcedDate: "desc" },
          include: { tags: true },
        });
      }

      if (sources.includes("sec_edgar")) {
        tasks.sec_edgar = searchEdgarForDeals(query, undefined, undefined, undefined, limit);
      }

      if (sources.includes("clinical_trials")) {
        tasks.clinical_trials = searchClinicalTrials(query, undefined, limit);
      }

      // Run all selected sources in parallel; catch each individually
      const keys = Object.keys(tasks);
      const settled = await Promise.allSettled(Object.values(tasks));

      const results: Record<string, { data: any[]; error: string | null }> = {};
      for (let i = 0; i < keys.length; i++) {
        const outcome = settled[i];
        if (outcome.status === "fulfilled") {
          results[keys[i]] = { data: outcome.value, error: null };
        } else {
          results[keys[i]] = {
            data: [],
            error: outcome.reason instanceof Error ? outcome.reason.message : String(outcome.reason),
          };
        }
      }

      return {
        database: results.database ?? { data: [], error: null },
        secEdgar: results.sec_edgar ?? { data: [], error: null },
        clinicalTrials: results.clinical_trials ?? { data: [], error: null },
      };
    }),
});
