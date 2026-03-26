/**
 * PubMed E-Utilities + Europe PMC API client
 * PubMed: free, < 3 req/sec without API key
 * Europe PMC: free, includes bioRxiv preprints
 */

const EUTILS_BASE = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils";
const EUROPEPMC_BASE = "https://www.ebi.ac.uk/europepmc/webservices/rest";

export interface PubMedResult {
  pmid: string;
  title: string;
  authors: string[];
  journal: string;
  publicationDate: string;
  abstract: string;
  doi: string | null;
  pubmedUrl: string;
  source: "pubmed" | "europepmc";
  isPreprint: boolean;
}

/**
 * Search PubMed via E-Utilities (2-step: esearch -> esummary).
 */
export async function searchPubMed(
  query: string,
  limit = 20,
  retstart = 0
): Promise<{ results: PubMedResult[]; nextToken: string | null; totalCount: number }> {
  // Step 1: esearch to get PMIDs
  const searchParams = new URLSearchParams({
    db: "pubmed",
    term: query,
    retmax: String(Math.min(limit, 200)),
    retstart: String(retstart),
    retmode: "json",
    sort: "date",
  });

  const searchRes = await fetch(`${EUTILS_BASE}/esearch.fcgi?${searchParams}`, {
    headers: { Accept: "application/json" },
  });

  if (!searchRes.ok) {
    throw new Error(`PubMed esearch failed: ${searchRes.status}`);
  }

  const searchData = await searchRes.json();
  const pmids: string[] = searchData.esearchresult?.idlist ?? [];
  const totalCount: number = parseInt(searchData.esearchresult?.count ?? "0", 10);

  if (pmids.length === 0) return { results: [], nextToken: null, totalCount };

  // Brief delay to stay within rate limits
  await new Promise((r) => setTimeout(r, 350));

  // Step 2: esummary to get metadata — batch in chunks of 100
  const chunks: string[][] = [];
  for (let i = 0; i < pmids.length; i += 100) {
    chunks.push(pmids.slice(i, i + 100));
  }

  const allResults: PubMedResult[] = [];

  for (let ci = 0; ci < chunks.length; ci++) {
    if (ci > 0) {
      // Rate limit delay between chunks
      await new Promise((r) => setTimeout(r, 350));
    }

    const chunk = chunks[ci];
    const summaryParams = new URLSearchParams({
      db: "pubmed",
      id: chunk.join(","),
      retmode: "json",
    });

    const summaryRes = await fetch(`${EUTILS_BASE}/esummary.fcgi?${summaryParams}`, {
      headers: { Accept: "application/json" },
    });

    if (!summaryRes.ok) {
      throw new Error(`PubMed esummary failed: ${summaryRes.status}`);
    }

    const summaryData = await summaryRes.json();
    const result = summaryData.result ?? {};

    for (const pmid of chunk) {
      const article = result[pmid];
      if (!article || article.error) continue;

      const authors: string[] = (article.authors ?? [])
        .slice(0, 3)
        .map((a: any) => a.name ?? "");

      const doi =
        (article.elocationid ?? "")
          .replace(/^doi:\s*/i, "")
          .trim() || null;

      allResults.push({
        pmid,
        title: article.title ?? "",
        authors,
        journal: article.source ?? article.fulljournalname ?? "",
        publicationDate: article.pubdate ?? article.sortpubdate ?? "",
        abstract: "",
        doi,
        pubmedUrl: `https://pubmed.ncbi.nlm.nih.gov/${pmid}/`,
        source: "pubmed",
        isPreprint: false,
      });
    }
  }

  const nextRetstart = retstart + pmids.length;
  const nextToken = nextRetstart < totalCount ? String(nextRetstart) : null;

  return { results: allResults, nextToken, totalCount };
}

/**
 * Search Europe PMC (includes bioRxiv/medRxiv preprints).
 */
export async function searchEuropePmc(
  query: string,
  limit = 20,
  pageToken?: string
): Promise<{ results: PubMedResult[]; nextToken: string | null; totalCount: number }> {
  const pageSize = Math.min(limit, 1000);
  const page = pageToken ? parseInt(pageToken, 10) : 1;

  const params = new URLSearchParams({
    query,
    format: "json",
    pageSize: String(pageSize),
    sort: "P_PDATE_D desc",
    page: String(page),
  });

  const res = await fetch(`${EUROPEPMC_BASE}/search?${params}`, {
    headers: { Accept: "application/json" },
  });

  if (!res.ok) {
    throw new Error(`Europe PMC search failed: ${res.status}`);
  }

  const data = await res.json();
  const articles: any[] = data.resultList?.result ?? [];
  const totalCount: number = data.hitCount ?? 0;

  const results: PubMedResult[] = articles.map((a): PubMedResult => {
    const authors = (a.authorString ?? "")
      .split(",")
      .slice(0, 3)
      .map((s: string) => s.trim())
      .filter(Boolean);

    const isPreprint = a.source === "PPR";
    const articleSource = a.source ?? "MED";
    const articleId = a.id ?? a.pmid ?? "";

    return {
      pmid: a.pmid ?? articleId,
      title: a.title ?? "",
      authors,
      journal: a.journalTitle ?? (isPreprint ? "bioRxiv / medRxiv" : ""),
      publicationDate: a.firstPublicationDate ?? "",
      abstract: (a.abstractText ?? "").slice(0, 300),
      doi: a.doi ?? null,
      pubmedUrl: a.pmid
        ? `https://pubmed.ncbi.nlm.nih.gov/${a.pmid}/`
        : `https://europepmc.org/article/${articleSource}/${articleId}`,
      source: "europepmc" as const,
      isPreprint,
    };
  });

  // Page-based pagination: if we got a full page, there's likely more
  const itemsSoFar = (page - 1) * pageSize + articles.length;
  const nextToken = itemsSoFar < totalCount && articles.length === pageSize ? String(page + 1) : null;

  return { results, nextToken, totalCount };
}

/**
 * Combined search across PubMed + Europe PMC.
 * Deduplicates by DOI (prefers PubMed version).
 * Returns combined results sorted by date.
 * nextToken is the Europe PMC cursorMark for Load More pagination.
 * totalCount is approximate sum of both sources.
 */
export async function searchLiterature(
  query: string,
  limit = 20
): Promise<{ results: PubMedResult[]; nextToken: string | null; totalCount: number }> {
  const [pubmedResult, epmcResult] = await Promise.allSettled([
    searchPubMed(query, limit),
    searchEuropePmc(query, limit),
  ]);

  const pubmedData =
    pubmedResult.status === "fulfilled" ? pubmedResult.value : { results: [], nextToken: null, totalCount: 0 };
  const epmcData =
    epmcResult.status === "fulfilled" ? epmcResult.value : { results: [], nextToken: null, totalCount: 0 };

  const pubmedArticles = pubmedData.results;
  const epmcArticles = epmcData.results;

  // Deduplicate by DOI (keep PubMed version when available)
  const seenDois = new Set<string>();
  const combined: PubMedResult[] = [];

  for (const article of pubmedArticles) {
    if (article.doi) seenDois.add(article.doi);
    combined.push(article);
  }

  for (const article of epmcArticles) {
    if (article.doi && seenDois.has(article.doi)) continue;
    if (article.doi) seenDois.add(article.doi);
    combined.push(article);
  }

  // Sort by date descending
  combined.sort(
    (a, b) =>
      new Date(b.publicationDate).getTime() -
      new Date(a.publicationDate).getTime()
  );

  // totalCount is approximate sum of both sources
  const totalCount = pubmedData.totalCount + epmcData.totalCount;

  // nextToken is the Europe PMC cursorMark (for Load More, we paginate Europe PMC only)
  const nextToken = epmcData.nextToken;

  return { results: combined, nextToken, totalCount };
}
