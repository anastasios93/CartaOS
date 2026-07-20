/**
 * Client-portfolio synergy engine.
 *
 * Takes an uploaded client extract (already parsed + entity-extracted by
 * ./portfolio) and joins it to open data THROUGH THE RXNORM BACKBONE, then
 * computes synergies deterministically. The language model is not involved in
 * producing these findings — every synergy below is derived from a join or an
 * arithmetic comparison, so each one is reproducible and traceable.
 *
 * Confidentiality: the caller must keep uploaded content in-tenant. Nothing here
 * sends client data to a third party — the only outbound calls are molecule-name
 * lookups against RxNav and NDC lookups against CMS, both of which are public
 * reference queries. Revenue, units and customer columns never leave the process.
 */

import { resolveMolecule } from "@/server/services/adapters/rxnorm";
import { getNadacSeriesBatch } from "@/server/services/adapters/nadac";
import { forecastErosion } from "@/server/services/forecast/erosion";
import type { PortfolioExtract } from "./portfolio";

export type SynergyKind =
  | "unresolved-molecule"
  | "price-erosion-exposure"
  | "price-floored"
  | "cross-ndc-spread"
  | "geographic-gap"
  | "portfolio-adjacency"
  | "no-us-footprint";

export interface Synergy {
  kind: SynergyKind;
  molecule: string;
  headline: string;
  detail: string;
  /** Named open-data sources this finding was joined against. */
  matchedSources: string[];
  /** Client revenue at stake, when the upload carried a revenue column. */
  revenueAtRisk?: number;
  severity: "High" | "Medium" | "Low";
}

export interface SynergyReport {
  moleculesAnalysed: number;
  moleculesResolved: number;
  synergies: Synergy[];
  /** Per-molecule identity + price summary, for the UI table. */
  matches: {
    molecule: string;
    rxcui: string | null;
    atc: string[];
    ndcsOnFile: number;
    ndcsWithPriceHistory: number;
    lastPrice?: number;
    annualisedErosionPct?: number;
    priceRegime?: string;
    modelSmape?: number;
  }[];
  disclaimer: string;
}

const DISCLAIMER =
  "Internal strategic decision support only. Synergies are computed joins against public reference data, not advice. Uploaded client data was processed in-session and not sent to any third party.";

/** Sum client revenue attributable to a molecule, when the upload had revenue. */
function revenueFor(extract: PortfolioExtract, molecule: string): number | undefined {
  const target = molecule.toLowerCase();
  let total = 0;
  let hit = false;
  for (const row of extract.rows) {
    const name = (row.molecule || row.product || "").toLowerCase();
    if (!name.includes(target) && !target.includes(name)) continue;
    if (typeof row.revenue === "number" && Number.isFinite(row.revenue)) {
      total += row.revenue;
      hit = true;
    }
  }
  return hit ? total : undefined;
}

/**
 * Compute synergies for an uploaded portfolio.
 * `cap` bounds how many molecules we resolve against the live APIs per upload.
 */
export async function computeSynergies(
  extract: PortfolioExtract,
  cap = 6,
): Promise<SynergyReport> {
  const molecules = extract.moleculeCandidates.slice(0, cap);
  const synergies: Synergy[] = [];
  const matches: SynergyReport["matches"] = [];
  let resolved = 0;

  for (const molecule of molecules) {
    let identity;
    try {
      identity = await resolveMolecule(molecule, 10);
    } catch {
      identity = null;
    }

    if (!identity?.ingredientRxcui) {
      matches.push({ molecule, rxcui: null, atc: [], ndcsOnFile: 0, ndcsWithPriceHistory: 0 });
      synergies.push({
        kind: "unresolved-molecule",
        molecule,
        headline: `"${molecule}" did not resolve to a known ingredient`,
        detail:
          "This row could not be joined to open data through RxNorm, so no lever can be computed for it. It is most often a local brand name, a device, or a typo. Supplying the INN or an NDC would resolve it.",
        matchedSources: ["RxNorm (NLM RxNav)"],
        severity: "Low",
      });
      continue;
    }
    resolved++;

    const series = identity.allNdcs.length
      ? await getNadacSeriesBatch(identity.allNdcs, 12).catch(() => [])
      : [];
    const lead = [...series].sort((a, b) => b.points.length - a.points.length)[0] ?? null;
    const forecast = lead ? forecastErosion(lead.points, 12) : null;
    const revenue = revenueFor(extract, molecule);

    const prices = series
      .map(s => s.points[s.points.length - 1]?.pricePerUnit)
      .filter((v): v is number => Number.isFinite(v));
    const lo = prices.length ? Math.min(...prices) : undefined;
    const hi = prices.length ? Math.max(...prices) : undefined;

    matches.push({
      molecule,
      rxcui: identity.ingredientRxcui,
      atc: identity.atc.map(a => `${a.classId} ${a.className}`),
      ndcsOnFile: identity.allNdcs.length,
      ndcsWithPriceHistory: series.length,
      lastPrice: forecast?.ok ? forecast.lastPrice : undefined,
      annualisedErosionPct: forecast?.ok ? forecast.annualisedErosionPct : undefined,
      priceRegime: forecast?.ok ? forecast.priceRegime : undefined,
      modelSmape: forecast?.ok ? forecast.accuracy.smape : undefined,
    });

    if (!series.length) {
      synergies.push({
        kind: "no-us-footprint",
        molecule,
        headline: `${molecule}: no US acquisition-cost footprint`,
        detail:
          "The molecule resolves in RxNorm but no CMS NADAC price history matched its NDCs — consistent with a product not sold into US retail. If you hold rights here, US retail entry is an untested geography.",
        matchedSources: ["RxNorm (NLM RxNav)", "CMS NADAC"],
        revenueAtRisk: revenue,
        severity: "Medium",
      });
      continue;
    }

    if (forecast?.ok && forecast.priceRegime === "eroding") {
      const pct = Math.abs(forecast.annualisedErosionPct);
      synergies.push({
        kind: "price-erosion-exposure",
        molecule,
        headline: `${molecule}: acquisition cost eroding ~${pct}%/yr`,
        detail:
          `A backtested forecast (model "${forecast.selectedModel}", measured out-of-sample sMAPE ${forecast.accuracy.smape}% over ${forecast.accuracy.evaluations} held-out predictions) shows live price erosion.` +
          (revenue !== undefined
            ? ` Against the ${formatMoney(revenue)} you report on this molecule, that is roughly ${formatMoney((revenue * pct) / 100)} of annual exposure if volume holds flat.`
            : " Add a revenue column to your upload to quantify the exposure against your own book."),
        matchedSources: ["CMS NADAC", "CartaOS backtested forecast"],
        revenueAtRisk: revenue !== undefined ? (revenue * pct) / 100 : undefined,
        severity: pct > 10 ? "High" : "Medium",
      });
    }

    if (forecast?.ok && forecast.priceRegime === "floored") {
      synergies.push({
        kind: "price-floored",
        molecule,
        headline: `${molecule}: price has floored — stop defending unit price`,
        detail:
          `No trend model beat the naive benchmark on this series (best measured sMAPE ${forecast.accuracy.smape}% over ${forecast.accuracy.evaluations} held-out predictions), and implied annualised change is ${forecast.annualisedErosionPct}%. Further price defence will not move value; the recoverable margin is in volume, channel mix and formulary tier.`,
        matchedSources: ["CMS NADAC", "CartaOS backtested forecast"],
        revenueAtRisk: revenue,
        severity: "Medium",
      });
    }

    if (lo !== undefined && hi !== undefined && lo > 0 && (hi - lo) / lo > 0.25) {
      synergies.push({
        kind: "cross-ndc-spread",
        molecule,
        headline: `${molecule}: ${(((hi - lo) / lo) * 100).toFixed(0)}% acquisition-cost spread across presentations`,
        detail: `Latest NADAC ranges $${lo.toFixed(5)}–$${hi.toFixed(5)} per unit across ${series.length} NDCs of the same molecule. Presentations sitting at the bottom of that range are candidates for repricing or repositioning.`,
        matchedSources: ["CMS NADAC"],
        revenueAtRisk: revenue,
        severity: "Medium",
      });
    }
  }

  // Portfolio adjacency: molecules the client already sells that share an ATC
  // class are cross-sell / bundling candidates.
  const byAtc = new Map<string, string[]>();
  for (const m of matches) {
    for (const a of m.atc) {
      const cls = a.split(" ")[0];
      byAtc.set(cls, [...(byAtc.get(cls) ?? []), m.molecule]);
    }
  }
  for (const [cls, mols] of byAtc) {
    const unique = [...new Set(mols)];
    if (unique.length >= 2) {
      synergies.push({
        kind: "portfolio-adjacency",
        molecule: unique.join(", "),
        headline: `Portfolio adjacency in ATC ${cls}: ${unique.join(", ")}`,
        detail: `You already hold ${unique.length} molecules in the same ATC class. That is a bundling, co-pay and shared-call-plan opportunity — one field force and one payer conversation can carry all of them.`,
        matchedSources: ["RxClass / ATC"],
        severity: "Medium",
      });
    }
  }

  // Geography gaps declared in the upload but with no computed footprint.
  if (extract.geographies.length > 1) {
    synergies.push({
      kind: "geographic-gap",
      molecule: molecules.join(", "),
      headline: `${extract.geographies.length} geographies present in your file`,
      detail: `Your upload spans ${extract.geographies.join(", ")}. National essential-medicines footprint is computed per molecule in the full assessment, but a national EML listing proves a country prioritises the molecule — it does not prove you hold a registration there, nor give tender price or volume. Confirm registration status locally before acting on a cross-market gap.`,
      matchedSources: ["Client upload"],
      severity: "Low",
    });
  }

  const rank = { High: 0, Medium: 1, Low: 2 } as const;
  synergies.sort((a, b) => rank[a.severity] - rank[b.severity]);

  return {
    moleculesAnalysed: molecules.length,
    moleculesResolved: resolved,
    synergies,
    matches,
    disclaimer: DISCLAIMER,
  };
}

function formatMoney(v: number): string {
  if (!Number.isFinite(v)) return "—";
  if (Math.abs(v) >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
  if (Math.abs(v) >= 1_000) return `${(v / 1_000).toFixed(0)}K`;
  return v.toFixed(0);
}
