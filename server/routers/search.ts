import { z } from "zod/v4";
import { router, protectedProcedure } from "../trpc";
import { searchEdgarForDeals } from "../services/sec-edgar";
import { searchClinicalTrials } from "../services/clinical-trials";
import { searchPatents } from "../services/patents";
import { searchLiterature, searchEuropePmc } from "../services/pubmed";
import { searchGoogleNews } from "../services/news";

const sourceEnum = z.enum([
  "database",
  "sec_edgar",
  "clinical_trials",
  "patents",
  "pubmed",
  "news",
]);

export const searchRouter = router({
  /**
   * Unified search across multiple data sources.
   * Runs selected sources in parallel; individual failures are isolated
   * so one source going down doesn't break the others.
   */
  unified: protectedProcedure
    .input(
      z.object({
        query: z.string().min(1),
        sources: z.array(sourceEnum).optional(),
        limit: z.number().min(1).max(1000).default(200),
      })
    )
    .query(async ({ ctx, input }) => {
      const { query, limit } = input;
      const sources = input.sources ?? [
        "database",
        "sec_edgar",
        "clinical_trials",
        "patents",
        "pubmed",
        "news",
      ];

      // Build an array of promises keyed by source name
      const tasks: Record<string, Promise<any>> = {};

      if (sources.includes("database")) {
        // Split query into words and match any word against any field
        const words = query.split(/\s+/).filter((w) => w.length >= 2);
        const wordConditions = words.flatMap((word) => [
          { title: { contains: word, mode: "insensitive" as const } },
          { licensorName: { contains: word, mode: "insensitive" as const } },
          { licenseeName: { contains: word, mode: "insensitive" as const } },
          { assetName: { contains: word, mode: "insensitive" as const } },
          { therapeuticArea: { contains: word, mode: "insensitive" as const } },
          { indication: { contains: word, mode: "insensitive" as const } },
          { modality: { contains: word, mode: "insensitive" as const } },
        ]);
        tasks.database = ctx.db.deal.findMany({
          where: { OR: wordConditions },
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

      if (sources.includes("patents")) {
        tasks.patents = searchPatents(query, limit);
      }

      if (sources.includes("pubmed")) {
        tasks.pubmed = searchLiterature(query, limit);
      }

      if (sources.includes("news")) {
        tasks.news = searchGoogleNews(query, limit);
      }

      // Run all selected sources in parallel; catch each individually
      const keys = Object.keys(tasks);
      const settled = await Promise.allSettled(Object.values(tasks));

      const results: Record<string, { data: any[]; error: string | null; nextToken: string | null; totalCount: number | null }> = {};
      for (let i = 0; i < keys.length; i++) {
        const key = keys[i];
        const outcome = settled[i];
        if (outcome.status === "fulfilled") {
          const value = outcome.value;
          // Database returns plain array; services return { results, nextToken, totalCount }
          if (key === "database") {
            results[key] = { data: value, error: null, nextToken: null, totalCount: null };
          } else {
            results[key] = {
              data: value.results,
              error: null,
              nextToken: value.nextToken ?? null,
              totalCount: value.totalCount ?? null,
            };
          }
        } else {
          results[key] = {
            data: [],
            error: outcome.reason instanceof Error ? outcome.reason.message : String(outcome.reason),
            nextToken: null,
            totalCount: null,
          };
        }
      }

      return {
        database: results.database ?? { data: [], error: null, nextToken: null, totalCount: null },
        secEdgar: results.sec_edgar ?? { data: [], error: null, nextToken: null, totalCount: null },
        clinicalTrials: results.clinical_trials ?? { data: [], error: null, nextToken: null, totalCount: null },
        patents: results.patents ?? { data: [], error: null, nextToken: null, totalCount: null },
        pubmed: results.pubmed ?? { data: [], error: null, nextToken: null, totalCount: null },
        news: results.news ?? { data: [], error: null, nextToken: null, totalCount: null },
      };
    }),

  /**
   * Load more results for a specific source using its pagination token.
   */
  loadMore: protectedProcedure
    .input(
      z.object({
        source: sourceEnum,
        query: z.string().min(1),
        nextToken: z.string(),
        limit: z.number().min(1).max(1000).default(200),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { source, query, nextToken, limit } = input;

      switch (source) {
        case "database": {
          // cursor-based pagination using ID
          const deals = await ctx.db.deal.findMany({
            where: { id: { gt: nextToken } },
            take: limit,
            orderBy: { id: "asc" },
          });
          return {
            data: deals,
            nextToken: deals.length === limit ? deals[deals.length - 1].id : null,
            totalCount: null,
          };
        }
        case "sec_edgar": {
          const result = await searchEdgarForDeals(query, undefined, undefined, undefined, limit, parseInt(nextToken));
          return { data: result.results, nextToken: result.nextToken, totalCount: result.totalCount };
        }
        case "clinical_trials": {
          const result = await searchClinicalTrials(query, undefined, limit, nextToken);
          return { data: result.results, nextToken: result.nextToken, totalCount: result.totalCount };
        }
        case "patents": {
          const result = await searchPatents(query, limit, nextToken);
          return { data: result.results, nextToken: result.nextToken, totalCount: result.totalCount };
        }
        case "pubmed": {
          // Load More paginates Europe PMC only (superset)
          const result = await searchEuropePmc(query, limit, nextToken);
          return { data: result.results, nextToken: result.nextToken, totalCount: result.totalCount };
        }
        case "news":
          return { data: [], nextToken: null, totalCount: null };
      }
    }),

  /**
   * Search for comparable deals using filter criteria.
   * Used by the benchmarks page to find external comparable data.
   */
  comparables: protectedProcedure
    .input(
      z.object({
        therapeuticArea: z.string().optional(),
        stage: z.string().optional(),
        modality: z.string().optional(),
        dealType: z.string().optional(),
        indication: z.string().optional(),
        territory: z.string().optional(),
        dateFrom: z.string().optional(),
        dateTo: z.string().optional(),
        company: z.string().optional(),
        limit: z.number().min(1).max(1000).default(200),
      })
    )
    .query(async ({ ctx, input }) => {
      // Build search query from filters
      const queryParts: string[] = [];
      if (input.therapeuticArea && input.therapeuticArea !== "all")
        queryParts.push(input.therapeuticArea);
      if (input.modality && input.modality !== "all")
        queryParts.push(input.modality);
      if (input.stage && input.stage !== "all")
        queryParts.push(input.stage.replace(/_/g, " "));
      if (input.dealType && input.dealType !== "all")
        queryParts.push(input.dealType.replace(/_/g, " "));
      if (input.indication) queryParts.push(input.indication);
      if (input.company) queryParts.push(input.company);

      const query = queryParts.length > 0
        ? queryParts.join(" ") + " pharma licensing"
        : "pharma licensing deal collaboration";

      // Local DB query with filters
      const dbWhere: any = {};
      if (input.therapeuticArea && input.therapeuticArea !== "all")
        dbWhere.therapeuticArea = { contains: input.therapeuticArea, mode: "insensitive" };
      if (input.stage && input.stage !== "all")
        dbWhere.developmentStage = input.stage;
      if (input.modality && input.modality !== "all")
        dbWhere.modality = { contains: input.modality, mode: "insensitive" };
      if (input.dealType && input.dealType !== "all")
        dbWhere.dealType = input.dealType;
      if (input.indication)
        dbWhere.indication = { contains: input.indication, mode: "insensitive" };
      if (input.territory && input.territory !== "all")
        dbWhere.territoryScope = { contains: input.territory, mode: "insensitive" };
      if (input.dateFrom || input.dateTo) {
        dbWhere.announcedDate = {};
        if (input.dateFrom) dbWhere.announcedDate.gte = new Date(input.dateFrom);
        if (input.dateTo) dbWhere.announcedDate.lte = new Date(input.dateTo);
      }
      if (input.company) {
        dbWhere.OR = [
          { licensorName: { contains: input.company, mode: "insensitive" } },
          { licenseeName: { contains: input.company, mode: "insensitive" } },
        ];
      }

      const [dbResult, edgarResult, trialsResult, patentsResult, pubmedResult, newsResult] =
        await Promise.allSettled([
          ctx.db.deal.findMany({
            where: dbWhere,
            take: input.limit,
            orderBy: { announcedDate: "desc" },
            include: { tags: true },
          }),
          searchEdgarForDeals(
            query + " collaboration agreement license",
            ["8-K", "8-K/A"],
            undefined,
            undefined,
            input.limit
          ),
          searchClinicalTrials(
            queryParts.join(" ") || "pharma",
            undefined,
            input.limit
          ),
          searchPatents(
            queryParts.join(" ") || "pharmaceutical",
            input.limit
          ),
          searchLiterature(
            queryParts.join(" ") || "pharma licensing",
            input.limit
          ),
          searchGoogleNews(
            query,
            input.limit
          ),
        ]);

      const wrap = (r: PromiseSettledResult<any>, isDb = false) => {
        if (r.status === "fulfilled") {
          if (isDb) return { data: r.value, error: null, nextToken: null, totalCount: null };
          return {
            data: r.value.results,
            error: null,
            nextToken: r.value.nextToken ?? null,
            totalCount: r.value.totalCount ?? null,
          };
        }
        return { data: [], error: (r.reason as Error)?.message ?? String(r.reason), nextToken: null, totalCount: null };
      };

      return {
        database: wrap(dbResult, true),
        secEdgar: wrap(edgarResult),
        clinicalTrials: wrap(trialsResult),
        patents: wrap(patentsResult),
        pubmed: wrap(pubmedResult),
        news: wrap(newsResult),
      };
    }),
});
