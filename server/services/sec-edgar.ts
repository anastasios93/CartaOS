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
  forms: string[] = ["8-K", "10-K"],
  startDate?: string,
  endDate?: string,
  limit = 20
): Promise<SecFilingResult[]> {
  const params = new URLSearchParams({
    q: query,
    forms: forms.join(","),
    dateRange: startDate || endDate ? "custom" : "",
    startdt: startDate ?? "",
    enddt: endDate ?? "",
  });
  params.set("from", "0");
  params.set("size", String(limit));

  const url = `${BASE_URL}/LATEST/search-index?${params}`;
  const res = await secFetch(url);
  if (!res.ok) throw new Error(`EDGAR search failed: ${res.status}`);

  const data = await res.json();
  const hits = data?.hits?.hits ?? [];

  return hits.map((h: any) => {
    const id: string = h._id ?? "";
    const cik: string = h._source?.entity_id ?? "";
    // _id format is typically "accession:filename"
    const [accPart, filename] = id.includes(":") ? id.split(":") : [id, ""];
    const accNoDashes = accPart.replace(/-/g, "");
    const documentUrl =
      cik && accPart && filename
        ? `${EDGAR_BASE}/Archives/edgar/data/${cik}/${accNoDashes}/${filename}`
        : cik
          ? `${EDGAR_BASE}/cgi-bin/browse-edgar?action=getcompany&CIK=${cik}&type=${h._source?.form_type ?? ""}&dateb=&owner=include&count=10`
          : "";
    return {
      accessionNumber: id,
      filingDate: h._source?.file_date,
      form: h._source?.form_type,
      companyName: h._source?.entity_name,
      cik,
      description: h._source?.file_description ?? "",
      documentUrl,
    };
  });
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
