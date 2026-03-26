/**
 * Financial text parser — extracts deal values from news headlines/snippets
 * and SEC EDGAR filing descriptions using regex patterns.
 */

export interface ParsedDealSignal {
  source: "news" | "sec_edgar";
  title: string;
  link?: string;
  date?: string;
  company?: string;
  upfrontPayment?: number; // in $M
  totalDealValue?: number; // in $M
  royaltyLow?: number; // percentage
  royaltyHigh?: number; // percentage
  confidence: number; // 0-1
}

// Deal-context keywords that must appear near a dollar amount for it to count
const DEAL_CONTEXT =
  /licens|deal|collaborat|partner|agreement|acquisit|upfront|milestone|royalt|option|merger|pharma|biotech|therapeut|asset|pipeline/i;

/**
 * Extract a dollar amount in $M from text.
 * Matches: $500M, $2.3B, $500 million, $2.3 billion, $500mn, $2.3bn
 */
function extractDollarAmounts(
  text: string
): { value: number; raw: string; index: number }[] {
  const re =
    /\$\s*([\d,]+(?:\.\d+)?)\s*(?:-?\s*)?(million|billion|M|B|mn|bn)\b/gi;
  const results: { value: number; raw: string; index: number }[] = [];
  let m: RegExpExecArray | null;

  while ((m = re.exec(text)) !== null) {
    const num = parseFloat(m[1].replace(/,/g, ""));
    if (isNaN(num) || num <= 0) continue;
    const unit = m[2].toLowerCase();
    const inMillions =
      unit === "billion" || unit === "b" || unit === "bn"
        ? num * 1000
        : num;
    results.push({ value: inMillions, raw: m[0], index: m.index });
  }
  return results;
}

/**
 * Try to extract upfront payment from text with contextual clues.
 */
function extractUpfront(text: string): number | undefined {
  const re =
    /upfront\s+(?:payment\s+)?(?:of\s+)?\$\s*([\d,]+(?:\.\d+)?)\s*(million|billion|M|B|mn|bn)/i;
  const m = re.exec(text);
  if (!m) return undefined;
  const num = parseFloat(m[1].replace(/,/g, ""));
  const unit = m[2].toLowerCase();
  return unit === "billion" || unit === "b" || unit === "bn"
    ? num * 1000
    : num;
}

/**
 * Try to extract total deal value from text with contextual clues.
 */
function extractTotalValue(text: string): number | undefined {
  const re =
    /(?:total|aggregate|up\s+to|valued?\s+at|worth|potential(?:ly)?)\s+(?:deal\s+)?(?:value\s+)?(?:of\s+)?\$\s*([\d,]+(?:\.\d+)?)\s*(million|billion|M|B|mn|bn)/i;
  const m = re.exec(text);
  if (!m) return undefined;
  const num = parseFloat(m[1].replace(/,/g, ""));
  const unit = m[2].toLowerCase();
  return unit === "billion" || unit === "b" || unit === "bn"
    ? num * 1000
    : num;
}

/**
 * Try to extract royalty range from text.
 */
function extractRoyalties(
  text: string
): { low?: number; high?: number } | undefined {
  // Range pattern: "royalties of 5% to 15%" or "5-15% royalties"
  const rangeRe =
    /royalt(?:y|ies)\s+(?:of\s+)?(?:ranging\s+)?(?:from\s+)?([\d.]+)\s*%?\s*(?:to|-)\s*([\d.]+)\s*%/i;
  const rangeM = rangeRe.exec(text);
  if (rangeM) {
    return {
      low: parseFloat(rangeM[1]),
      high: parseFloat(rangeM[2]),
    };
  }

  // Alternative: "5-15% royalties" or "mid-single-digit to low-double-digit royalties"
  const altRe = /([\d.]+)\s*(?:%\s*)?(?:to|-)\s*([\d.]+)\s*%\s*royalt/i;
  const altM = altRe.exec(text);
  if (altM) {
    return {
      low: parseFloat(altM[1]),
      high: parseFloat(altM[2]),
    };
  }

  // Single royalty: "royalties of 10%"
  const singleRe = /royalt(?:y|ies)\s+(?:of\s+)?([\d.]+)\s*%/i;
  const singleM = singleRe.exec(text);
  if (singleM) {
    const val = parseFloat(singleM[1]);
    return { low: val, high: val };
  }

  return undefined;
}

/**
 * Parse a single text blob into a partial deal signal.
 */
function parseText(text: string): {
  upfrontPayment?: number;
  totalDealValue?: number;
  royaltyLow?: number;
  royaltyHigh?: number;
  confidence: number;
} {
  if (!text || !DEAL_CONTEXT.test(text)) {
    return { confidence: 0 };
  }

  const upfront = extractUpfront(text);
  const totalValue = extractTotalValue(text);
  const royalties = extractRoyalties(text);

  // If no contextual extraction worked, try generic dollar amounts
  let genericValue: number | undefined;
  if (!upfront && !totalValue) {
    const amounts = extractDollarAmounts(text);
    // Take the largest dollar amount as a proxy for total deal value
    if (amounts.length > 0) {
      const largest = amounts.reduce((a, b) =>
        a.value > b.value ? a : b
      );
      // Only count if it's a plausible deal size ($1M - $100B)
      if (largest.value >= 1 && largest.value <= 100000) {
        genericValue = largest.value;
      }
    }
  }

  const hasUpfront = upfront != null;
  const hasTotal = totalValue != null || genericValue != null;
  const hasRoyalty = royalties != null;

  // Confidence scoring
  let confidence = 0;
  if (hasUpfront && hasTotal) confidence = 1.0;
  else if (hasUpfront || (hasTotal && totalValue != null))
    confidence = 0.8;
  else if (hasRoyalty) confidence = 0.7;
  else if (genericValue != null) confidence = 0.5;

  return {
    upfrontPayment: upfront,
    totalDealValue: totalValue ?? genericValue,
    royaltyLow: royalties?.low,
    royaltyHigh: royalties?.high,
    confidence,
  };
}

/**
 * Parse financial signals from news items.
 */
export function parseNewsSignals(
  newsItems: Array<{
    title: string;
    link?: string;
    source?: string;
    publishedDate?: string;
    snippet?: string;
  }>
): ParsedDealSignal[] {
  const signals: ParsedDealSignal[] = [];

  for (const item of newsItems) {
    const text = `${item.title || ""} ${item.snippet || ""}`;
    const parsed = parseText(text);
    if (parsed.confidence === 0) continue;
    if (
      !parsed.upfrontPayment &&
      !parsed.totalDealValue &&
      !parsed.royaltyLow
    )
      continue;

    signals.push({
      source: "news",
      title: item.title,
      link: item.link,
      date: item.publishedDate,
      company: item.source,
      ...parsed,
    });
  }

  return signals;
}

/**
 * Parse financial signals from SEC EDGAR filings.
 */
export function parseEdgarSignals(
  edgarItems: Array<{
    description?: string;
    companyName?: string;
    filingDate?: string;
    documentUrl?: string;
    form?: string;
  }>
): ParsedDealSignal[] {
  const signals: ParsedDealSignal[] = [];

  for (const item of edgarItems) {
    const text = `${item.description || ""} ${item.companyName || ""}`;
    const parsed = parseText(text);
    if (parsed.confidence === 0) continue;
    if (
      !parsed.upfrontPayment &&
      !parsed.totalDealValue &&
      !parsed.royaltyLow
    )
      continue;

    signals.push({
      source: "sec_edgar",
      title:
        item.description ||
        `${item.companyName} ${item.form} Filing`,
      link: item.documentUrl,
      date: item.filingDate,
      company: item.companyName,
      ...parsed,
    });
  }

  return signals;
}
