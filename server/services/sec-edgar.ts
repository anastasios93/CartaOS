/**
 * SEC EDGAR API service
 * Rate limit: 10 req/sec. Always include User-Agent header.
 * Docs: https://efts.sec.gov/LATEST/search-index?q=%22collaboration+agreement%22&dateRange=custom&startdt=2020-01-01&enddt=2024-12-31&forms=8-K
 */

const BASE_URL = "https://efts.sec.gov";
const EDGAR_BASE = "https://www.sec.gov";
const USER_AGENT = process.env.SEC_USER_AGENT ?? "CartaOS contact@cartaos.com";

function secFetch(url: string) {
  return fetch(url, {
    headers: { "User-Agent": USER_AGENT, Accept: "application/json" },
  });
}

export interface SecFilingResult {
  accessionNumber: string;
  filingDate: string;
  form: string;
  companyName: string;
  cik: string;
  description: string;
  documentUrl: string;
}

/**
 * Full-text search EDGAR for collaboration/licensing agreements
 */
export async function searchEdgarForDeals(
  query: string,
  forms: string[] = ["8-K", "8-K/A", "10-K", "S-1", "6-K"],
  startDate?: string,
  endDate?: string,
  limit = 20,
  from = 0
): Promise<{ results: SecFilingResult[]; nextToken: string | null; totalCount: number }> {
  const params = new URLSearchParams({
    q: query,
    forms: forms.join(","),
  });
  if (startDate || endDate) {
    params.set("dateRange", "custom");
    if (startDate) params.set("startdt", startDate);
    if (endDate) params.set("enddt", endDate);
  }
  params.set("from", String(from));
  params.set("size", String(limit));

  const url = `${BASE_URL}/LATEST/search-index?${params}`;
  const res = await secFetch(url);
  if (!res.ok) throw new Error(`EDGAR search failed: ${res.status}`);

  const data = await res.json();
  const hits = data?.hits?.hits ?? [];
  const totalCount: number = data?.hits?.total?.value ?? 0;

  const results: SecFilingResult[] = hits.map((h: any) => {
    const src = h._source ?? {};
    const id: string = h._id ?? "";
    // ciks is an array; strip leading zeros for the URL path
    const rawCik: string = src.ciks?.[0] ?? "";
    const cik = rawCik.replace(/^0+/, "") || rawCik;
    // display_names is like "COMPANY NAME  (TICKER)  (CIK 0001234567)" — strip all trailing parenthetical groups
    const companyName: string =
      (src.display_names?.[0] ?? "").replace(/(\s*\([^)]*\))+\s*$/g, "").trim() || "";
    const form: string = src.form ?? src.root_forms?.[0] ?? "";
    // _id format is "accession:filename"
    const [accPart, filename] = id.includes(":") ? id.split(":") : [id, ""];
    const accNoDashes = accPart.replace(/-/g, "");
    const documentUrl =
      cik && accPart && filename
        ? `${EDGAR_BASE}/Archives/edgar/data/${cik}/${accNoDashes}/${filename}`
        : cik
          ? `${EDGAR_BASE}/cgi-bin/browse-edgar?action=getcompany&CIK=${cik}&type=${form}&dateb=&owner=include&count=10`
          : "";
    return {
      accessionNumber: id,
      filingDate: src.file_date,
      form,
      companyName,
      cik: rawCik,
      description: src.file_description ?? "",
      documentUrl,
    };
  });

  const nextFrom = from + hits.length;
  const nextToken = nextFrom < totalCount ? String(nextFrom) : null;

  return { results, nextToken, totalCount };
}

/**
 * Get filing index to find exhibits
 */
export async function getFilingIndex(cik: string, accessionNumber: string) {
  const acc = accessionNumber.replace(/-/g, "");
  const url = `${EDGAR_BASE}/Archives/edgar/data/${cik}/${acc}/${accessionNumber}-index.json`;
  const res = await secFetch(url);
  if (!res.ok) throw new Error(`Filing index fetch failed: ${res.status}`);
  return res.json();
}

/**
 * Fetch the text content of a specific exhibit (e.g., Exhibit 10.1)
 */
export async function fetchExhibitText(exhibitUrl: string): Promise<string> {
  const res = await secFetch(
    exhibitUrl.startsWith("http") ? exhibitUrl : `${EDGAR_BASE}${exhibitUrl}`
  );
  if (!res.ok) throw new Error(`Exhibit fetch failed: ${res.status}`);
  return res.text();
}

/**
 * Simple rate limiter — waits to stay under 10 req/sec
 */
const RATE_LIMIT_MS = 110; // ~9 req/sec to be safe
let lastRequest = 0;

export async function rateLimitedFetch(fn: () => Promise<any>) {
  const now = Date.now();
  const wait = RATE_LIMIT_MS - (now - lastRequest);
  if (wait > 0) await new Promise((r) => setTimeout(r, wait));
  lastRequest = Date.now();
  return fn();
}
