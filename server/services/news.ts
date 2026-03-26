/**
 * Google News RSS search for pharma/biotech press releases and news.
 * No API key required. Returns parsed RSS items.
 */

export interface NewsResult {
  title: string;
  link: string;
  source: string;
  publishedDate: string;
  snippet: string;
}

/**
 * Extract text content from an XML tag using regex.
 */
function extractTag(xml: string, tag: string): string {
  const match = xml.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i"));
  let content = match?.[1]?.trim() ?? "";
  // Strip CDATA wrappers
  content = content.replace(/^\s*<!\[CDATA\[/, "").replace(/\]\]>\s*$/, "");
  return content.trim();
}

/**
 * Strip HTML tags from a string.
 */
function stripHtml(html: string): string {
  // First decode HTML entities so encoded tags become real tags
  let text = html
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ");
  // Then strip all HTML tags (including freshly decoded ones)
  text = text.replace(/<[^>]*>/g, " ");
  // Collapse whitespace
  return text.replace(/\s+/g, " ").trim();
}

/**
 * Search Google News RSS for pharma/biotech news.
 *
 * @param query   Free-text search term
 * @param limit   Unused (kept for signature compatibility) — returns all RSS items
 */
export async function searchGoogleNews(
  query: string,
  limit = 20
): Promise<{ results: NewsResult[]; nextToken: null; totalCount: number }> {
  const enhancedQuery = `${query} pharma OR biotech OR deal OR license OR partnership`;
  const params = new URLSearchParams({
    q: enhancedQuery,
    hl: "en-US",
    gl: "US",
    ceid: "US:en",
  });

  const url = `https://news.google.com/rss/search?${params}`;

  const res = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (compatible; CartaOS/1.0; +https://cartaos.vercel.app)",
      Accept: "application/rss+xml, application/xml, text/xml",
    },
  });

  if (!res.ok) {
    throw new Error(`Google News RSS failed: ${res.status} ${res.statusText}`);
  }

  const xml = await res.text();

  // Parse RSS <item> elements using string splitting + regex
  const items = xml.split("<item>").slice(1); // skip preamble
  const results: NewsResult[] = [];

  for (const item of items) {
    const title = stripHtml(extractTag(item, "title"));
    // RSS <link> may not have a closing tag; grab URL after <link> until whitespace/newline/<
    const linkMatch = item.match(/<link[^>]*>\s*(https?:\/\/[^\s<]+)/i);
    const link = linkMatch?.[1]?.trim() ?? extractTag(item, "link");
    const pubDate = extractTag(item, "pubDate");
    const description = stripHtml(extractTag(item, "description"));

    // Source is in a <source> tag with a url attribute
    const sourceMatch = item.match(/<source[^>]*>([^<]*)<\/source>/i);
    const source = sourceMatch?.[1]?.trim() ?? "";

    if (!title) continue;

    results.push({
      title,
      link,
      source,
      publishedDate: pubDate ? new Date(pubDate).toISOString().split("T")[0] : "",
      snippet: description.slice(0, 200),
    });
  }

  return { results, nextToken: null, totalCount: results.length };
}
