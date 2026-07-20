/**
 * Computed value levers.
 *
 * These levers are CALCULATED from real data joined through the RxNorm
 * identifier backbone — not reasoned by the language model. The engine's rule is
 * that the deterministic layer owns the numbers and the LLM may only narrate
 * them, so anything produced here is handed to the assessment agent as
 * established fact with provenance, and anything that cannot be computed is
 * returned as an explicit data gap rather than guessed.
 *
 * Currently computed:
 *   - Reimbursement / pricing  (CMS NADAC series + backtested erosion forecast)
 *   - Geographic expansion     (WHO national EML footprint + US retail presence)
 *   - Formulary positioning    (CMS Medicare Part D spend, utilisation, competition)
 *
 * The remaining seven levers stay LLM-reasoned until their adapters land; they
 * are reported as such so the two are never confused.
 */

import { resolveMolecule, type MoleculeIdentity } from "@/server/services/adapters/rxnorm";
import { getNadacSeriesBatch, type NadacSeries } from "@/server/services/adapters/nadac";
import { forecastErosion, type ErosionResult } from "@/server/services/forecast/erosion";
import { getEmlFootprint, type EmlMatch } from "@/server/services/adapters/who-eml";
import { getPartDProfile, type PartDProfile } from "@/server/services/adapters/part-d";
import { getDrugsFdaProfile, type DrugsFdaProfile } from "@/server/services/adapters/drugsfda";
import { getDailyMedProfile, type DailyMedProfile } from "@/server/services/adapters/dailymed";
import { getPartDGeoProfile, type PartDGeoProfile } from "@/server/services/adapters/part-d-geo";

export interface ComputedLever {
  lever:
    | "Reimbursement / pricing"
    | "Geographic expansion"
    | "Formulary positioning"
    | "Administration / formulation"
    | "Lifecycle / IP defense"
    | "Distribution channels"
    | "Sales-force effectiveness";
  computed: true;
  score: number;
  confidence: "High" | "Medium" | "Low";
  evidence: { finding: string; source: string }[];
  recommendedActions: string[];
  estValueRange: string;
  dataGap?: string;
  notComputable?: boolean;
  /** Measured model performance, when a forecast underpins the lever. */
  modelAudit?: {
    selectedModel: string;
    smape: number;
    mape: number;
    rmse: number;
    heldOutPredictions: number;
    liftOverNaivePp: number;
    intervalCoverage80: number;
    leaderboard: { model: string; smape: number }[];
  };
}

export interface ComputedEvidence {
  molecule: string;
  identity: {
    ingredientRxcui: string | null;
    ingredientName: string | null;
    atc: string[];
    productCount: number;
    ndcCount: number;
    hasBrandedProduct: boolean;
  };
  levers: ComputedLever[];
  /** Rendered block injected into the assessment prompt as established fact. */
  promptBlock: string;
  resolved: boolean;
}

const clamp = (n: number) => Math.max(0, Math.min(100, Math.round(n)));

// ─── Reimbursement / pricing ────────────────────────────────────────────────

function pricingLever(
  identity: MoleculeIdentity,
  series: NadacSeries[],
  forecast: ErosionResult | null,
  leadSeries: NadacSeries | null,
): ComputedLever {
  const evidence: { finding: string; source: string }[] = [];
  const actions: string[] = [];

  if (!series.length) {
    return {
      lever: "Reimbursement / pricing",
      computed: true,
      score: 0,
      confidence: "Low",
      notComputable: true,
      evidence: [],
      recommendedActions: [],
      estValueRange: "Not computable from the open pricing layer",
      dataGap:
        "No CMS NADAC price history matched this molecule's NDCs. NADAC covers US retail acquisition cost only — a US-unmarketed or hospital-only product will legitimately have none. Supply an NDC list or a non-US price source to compute this lever.",
    };
  }

  const generics = series.filter(s => s.classification === "G").length;
  const brands = series.filter(s => s.classification === "B").length;
  const prices = series.map(s => s.points[s.points.length - 1]?.pricePerUnit).filter(Number.isFinite) as number[];
  const lo = Math.min(...prices);
  const hi = Math.max(...prices);
  const spreadPct = lo > 0 ? ((hi - lo) / lo) * 100 : 0;

  evidence.push({
    finding: `${series.length} NDCs carry CMS NADAC price history (${generics} classified generic, ${brands} brand). Latest acquisition cost ranges $${lo.toFixed(5)}–$${hi.toFixed(5)} per ${leadSeries?.pricingUnit || "unit"}.`,
    source: "CMS NADAC",
  });

  let score = 40;
  let confidence: "High" | "Medium" | "Low" = "Medium";
  let modelAudit: ComputedLever["modelAudit"];

  if (forecast?.ok) {
    modelAudit = {
      selectedModel: forecast.selectedModel,
      smape: forecast.accuracy.smape,
      mape: forecast.accuracy.mape,
      rmse: forecast.accuracy.rmse,
      heldOutPredictions: forecast.accuracy.evaluations,
      liftOverNaivePp: forecast.liftOverNaive,
      intervalCoverage80: forecast.intervalCoverage80,
      leaderboard: forecast.leaderboard.map(l => ({ model: l.model, smape: l.smape })),
    };

    evidence.push({
      finding: `Price trajectory validated out of sample: model "${forecast.selectedModel}" selected by rolling-origin backtest over ${forecast.accuracy.evaluations} held-out predictions, sMAPE ${forecast.accuracy.smape}% (80% interval empirical coverage ${forecast.intervalCoverage80}%). Series spans ${forecast.firstDate} to ${forecast.lastDate} across ${forecast.observations} observations.`,
      source: "CMS NADAC + CartaOS backtested forecast",
    });

    if (forecast.priceRegime === "floored") {
      evidence.push({
        finding: `No trend model beats the naive benchmark, and implied annualised price change is ${forecast.annualisedErosionPct}%. The price has floored — this molecule's remaining value is NOT in price defence.`,
        source: "CartaOS erosion model selection",
      });
      score = 22;
      confidence = "High";
      actions.push(
        "Stop treating price as the lever — the acquisition-cost curve is flat and further price defence will not move value.",
        "Redirect effort to volume, channel mix and formulary tier, where a floored-price generic still has recoverable margin.",
      );
    } else if (forecast.priceRegime === "eroding") {
      evidence.push({
        finding: `Price is actively eroding at an implied ${forecast.annualisedErosionPct}% per year (model beats naive by ${forecast.liftOverNaive} pp sMAPE).`,
        source: "CartaOS erosion model selection",
      });
      score = 72;
      confidence = "High";
      actions.push(
        `Erosion is live at ~${Math.abs(forecast.annualisedErosionPct)}%/yr — model a contract repricing now rather than at renewal.`,
        "Protect net price through channel and contract terms before the curve reaches its floor.",
      );
    } else {
      evidence.push({
        finding: `Price is rising at an implied ${forecast.annualisedErosionPct}% per year — unusual for an off-patent molecule and often a supply-constraint or shortage signal worth exploiting.`,
        source: "CartaOS erosion model selection",
      });
      score = 78;
      confidence = "Medium";
      actions.push(
        "Investigate the upward price move as a possible shortage window — a second-source or capacity play may capture it.",
      );
    }
  } else {
    confidence = "Low";
    evidence.push({
      finding: forecast && !forecast.ok
        ? `Price history too short to validate a forecast out of sample (${forecast.observations} observations).`
        : "Price history insufficient to validate a forecast.",
      source: "CMS NADAC",
    });
    score = 30;
  }

  if (spreadPct > 25) {
    evidence.push({
      finding: `Acquisition cost varies ${spreadPct.toFixed(0)}% across NDCs of the same molecule — a presentation/pack-level pricing spread.`,
      source: "CMS NADAC",
    });
    actions.push("Exploit the cross-NDC price spread: reprice or reposition the presentations sitting at the bottom of the range.");
    score = clamp(score + 8);
  }

  return {
    lever: "Reimbursement / pricing",
    computed: true,
    score: clamp(score),
    confidence,
    evidence,
    recommendedActions: actions,
    estValueRange:
      forecast?.ok && forecast.priceRegime === "eroding"
        ? `Erosion exposure ≈ ${Math.abs(forecast.annualisedErosionPct)}% of US acquisition-cost base per year`
        : "Price-side upside limited; value sits in volume and channel rather than unit price",
    dataGap:
      "NADAC is US retail acquisition cost. It does not capture net price after confidential rebates, 340B, or any ex-US market — those require client contract data.",
    modelAudit,
  };
}

// ─── Geographic expansion ───────────────────────────────────────────────────

function geographicLever(
  identity: MoleculeIdentity,
  series: NadacSeries[],
  eml: EmlMatch | null,
): ComputedLever {
  const evidence: { finding: string; source: string }[] = [];
  const actions: string[] = [];

  if (!identity.ingredientRxcui) {
    return {
      lever: "Geographic expansion",
      computed: true,
      score: 0,
      confidence: "Low",
      notComputable: true,
      evidence: [],
      recommendedActions: [],
      estValueRange: "Not computable — molecule did not resolve in RxNorm",
      dataGap: "The molecule name did not resolve to an RxNorm ingredient, so no registration footprint could be computed. Check spelling or supply an INN.",
    };
  }

  const marketedUS = series.length > 0;
  evidence.push({
    finding: `Resolved to RxNorm ingredient ${identity.ingredientRxcui} (${identity.ingredientName}) with ${identity.products.length} marketed product presentations and ${identity.allNdcs.length} distinct NDCs on the US market.`,
    source: "RxNorm (NLM RxNav)",
  });

  let score = marketedUS ? 45 : 55;
  let confidence: "High" | "Medium" | "Low" = "Medium";

  if (eml) {
    const n = eml.countries.length;
    const regions = Object.entries(eml.byRegion)
      .sort((a, b) => b[1] - a[1])
      .map(([r, c]) => `${r} ${c}`)
      .join(", ");

    evidence.push({
      finding: `${eml.medicineName} appears on the national essential medicines list of ${n} countries (${regions}).${eml.onWhoList ? " It is also on the WHO Model List of Essential Medicines." : " It is NOT on the WHO Model List."}`,
      source: "WHO Repository of National Essential Medicines Lists",
    });

    // A wide national-EML footprint means demonstrated public-sector demand in
    // markets the client may not serve — the clearest computed entry signal.
    const recent = eml.countries.filter(c => c.nemlYear >= 2015);
    if (recent.length) {
      evidence.push({
        finding: `${recent.length} of those national lists are from 2015 or later, including ${recent.slice(0, 8).map(c => c.name).join(", ")}${recent.length > 8 ? ` and ${recent.length - 8} more` : ""}.`,
        source: "WHO Repository of National Essential Medicines Lists",
      });
    }

    if (n >= 50) {
      score = 82;
      confidence = "High";
      actions.push(
        `Broad public-sector demand is demonstrated across ${n} national essential medicines lists — prioritise tender and public-procurement entry in the regions where you do not currently supply (${regions}).`,
      );
    } else if (n >= 15) {
      score = 68;
      confidence = "High";
      actions.push(
        `${n} countries list this molecule nationally — a mid-sized but real public-procurement footprint. Screen the ${regions} markets against your current registrations for entry gaps.`,
      );
    } else if (n > 0) {
      score = 48;
      actions.push(`Only ${n} countries list this molecule nationally; public-sector demand is narrow, so geographic upside rests on private/retail channels rather than tender.`);
    } else {
      score = 30;
      actions.push("No national essential medicines listings found — treat ex-US public-sector entry as unproven for this molecule.");
    }

    if (eml.onWhoList && n < 40) {
      actions.push(
        "The molecule is on the WHO Model List but carried by comparatively few national lists — that divergence is a classic under-adoption gap worth testing with health ministries.",
      );
      score = clamp(score + 6);
    }
  } else {
    evidence.push({
      finding: "No matching entry found in the WHO national essential medicines list repository for this ingredient name.",
      source: "WHO Repository of National Essential Medicines Lists",
    });
  }

  if (marketedUS) {
    evidence.push({
      finding: `Molecule is actively marketed in US retail with live acquisition-cost reporting on ${series.length} NDCs — US entry is established, so the geographic upside lies ex-US.`,
      source: "CMS NADAC",
    });
    actions.push("US retail presence is established; point geographic-expansion effort at ex-US markets rather than US entry.");
  } else {
    evidence.push({
      finding: "No US retail acquisition-cost reporting found against this molecule's NDCs — consistent with a product not sold into US retail.",
      source: "CMS NADAC",
    });
    actions.push("Assess US retail entry: the molecule resolves in RxNorm but shows no US retail acquisition-cost footprint.");
  }

  return {
    lever: "Geographic expansion",
    computed: true,
    score: clamp(score),
    confidence,
    evidence,
    recommendedActions: actions,
    estValueRange: eml
      ? `Demonstrated public-sector demand in ${eml.countries.length} national markets; per-market sizing needs local tender volumes`
      : "Sizing requires national tender volumes",
    dataGap:
      "National EML listing proves a country prioritises the molecule; it does NOT prove you hold a registration there, nor give tender price or volume. Confirm registration status and local tender data before committing to a market.",
  };
}

// ─── Formulary positioning ──────────────────────────────────────────────────

function formularyLever(profile: PartDProfile | null): ComputedLever {
  if (!profile || !profile.latest) {
    return {
      lever: "Formulary positioning",
      computed: true,
      score: 0,
      confidence: "Low",
      notComputable: true,
      evidence: [],
      recommendedActions: [],
      estValueRange: "Not computable from the open formulary layer",
      dataGap:
        "No Medicare Part D spending record matched this molecule. Part D covers self-administered (retail) drugs only, so a clinician-administered or hospital-only product will legitimately have none.",
    };
  }

  const evidence: { finding: string; source: string }[] = [];
  const actions: string[] = [];
  const L = profile.latest;

  evidence.push({
    finding: `Medicare Part D ${L.year}: $${(L.totalSpend / 1e6).toFixed(1)}M total spend across ${L.totalClaims.toLocaleString()} claims and ${L.totalBeneficiaries.toLocaleString()} beneficiaries, at a weighted $${L.avgSpendPerDosageUnit.toFixed(4)} per dosage unit ($${L.avgSpendPerClaim.toFixed(2)} per claim).`,
    source: "CMS Medicare Part D Spending by Drug",
  });

  if (profile.manufacturerCount > 0) {
    evidence.push({
      finding: `${profile.manufacturerCount} manufacturers reported against this molecule in Part D — a direct read on competitive intensity in the retail channel.`,
      source: "CMS Medicare Part D Spending by Drug",
    });
  }
  if (profile.brandNames.length) {
    evidence.push({
      finding: `Brands present in Part D alongside the generic: ${profile.brandNames.slice(0, 6).join(", ")}.`,
      source: "CMS Medicare Part D Spending by Drug",
    });
  }
  if (profile.years.length > 1) {
    const first = profile.years[0];
    evidence.push({
      finding: `Trend ${first.year}→${L.year}: total spend ${profile.spendCagrPct !== null ? `${profile.spendCagrPct > 0 ? "+" : ""}${profile.spendCagrPct}% CAGR` : "n/a"}, weighted cost per dosage unit ${profile.unitCostChangePct !== null ? `${profile.unitCostChangePct > 0 ? "+" : ""}${profile.unitCostChangePct}%` : "n/a"} over the window.`,
      source: "CMS Medicare Part D Spending by Drug",
    });
  }

  // Score: real retail demand plus room to move on access.
  let score = 40;
  if (L.totalSpend > 5e8) score = 80;
  else if (L.totalSpend > 1e8) score = 70;
  else if (L.totalSpend > 1e7) score = 58;
  else if (L.totalSpend > 1e6) score = 46;

  if (profile.manufacturerCount >= 15) {
    score = clamp(score - 12);
    actions.push(
      `With ${profile.manufacturerCount} manufacturers competing, tier position is contested and price-led. Compete on supply reliability and contracting terms rather than list price.`,
    );
  } else if (profile.manufacturerCount > 0 && profile.manufacturerCount <= 4) {
    score = clamp(score + 10);
    actions.push(
      `Only ${profile.manufacturerCount} manufacturers are active — a concentrated field gives real leverage in PBM and plan negotiations.`,
    );
  }

  if (profile.unitCostChangePct !== null && profile.unitCostChangePct < -20) {
    actions.push(
      `Weighted cost per dosage unit has fallen ${Math.abs(profile.unitCostChangePct)}% across the observed window — the access battle here is volume and tier retention, not price.`,
    );
  }
  if (profile.spendCagrPct !== null && profile.spendCagrPct > 5) {
    actions.push(`Part D spend is growing at ${profile.spendCagrPct}% CAGR — demand is expanding, so defend and extend formulary coverage now.`);
  }
  actions.push(
    "Pull the quarterly Part D Formulary files to confirm actual tier, prior-authorisation and step-therapy placement before acting on this lever.",
  );

  return {
    lever: "Formulary positioning",
    computed: true,
    score: clamp(score),
    confidence: profile.years.length > 1 ? "High" : "Medium",
    evidence,
    recommendedActions: actions,
    estValueRange: `$${(L.totalSpend / 1e6).toFixed(1)}M addressable Part D spend in ${L.year} across ${L.totalBeneficiaries.toLocaleString()} beneficiaries`,
    dataGap:
      "This is spend and utilisation, NOT formulary placement. Tier, prior authorisation, step therapy and quantity limits live in the quarterly CMS Part D Formulary files, which have no public API and are not wired — placement itself remains unverified.",
  };
}

// ─── Administration / formulation ───────────────────────────────────────────

function formulationLever(fda: DrugsFdaProfile | null, dm: DailyMedProfile | null): ComputedLever {
  if (!fda && !dm) {
    return {
      lever: "Administration / formulation",
      computed: true,
      score: 0,
      confidence: "Low",
      notComputable: true,
      evidence: [],
      recommendedActions: [],
      estValueRange: "Not computable from the open label layer",
      dataGap:
        "Neither Drugs@FDA nor DailyMed returned records for this molecule, so the marketed dosage-form and route set could not be established. This is expected for a product not registered in the US.",
    };
  }

  const evidence: { finding: string; source: string }[] = [];
  const actions: string[] = [];
  const forms = fda?.dosageForms ?? [];
  const routes = fda?.routes ?? [];

  if (fda) {
    evidence.push({
      finding: `Marketed in ${forms.length} distinct dosage form(s) — ${forms.join(", ") || "none reported"} — across ${routes.length} route(s) of administration: ${routes.join(", ") || "none reported"}. ${fda.strengths.length} distinct strengths are approved.`,
      source: "openFDA Drugs@FDA",
    });
  }
  if (dm) {
    // Deliberately reporting label and labeller counts only: DailyMed title
    // parsing picks up combination-product and brand residue, so openFDA's
    // structured dosageForms above is the authoritative form list.
    evidence.push({
      finding: `DailyMed carries ${dm.totalLabels} distinct product labels for this molecule from ${dm.labelers.length} labellers — a direct read on how many companies are actually marketing it.`,
      source: "DailyMed (NLM)",
    });
  }

  // The reformulation wedge is widest where the molecule is stuck in one plain
  // form and one route — that is genuine galenic whitespace.
  let score = 45;
  const oralOnly = routes.length === 1 && /ORAL/i.test(routes[0] ?? "");
  const fewForms = forms.length <= 2;

  if (oralOnly && fewForms) {
    score = 78;
    actions.push(
      `Only ${forms.join(" and ") || "one form"} on a single oral route — this is the clearest reformulation whitespace. Test an extended/delayed-release, fixed-dose-combination or alternative-route (e.g. transdermal, SC) 505(b)(2) route, which carries its own regulatory exclusivity.`,
    );
  } else if (routes.length >= 3 || forms.length >= 5) {
    score = 35;
    actions.push(
      `The molecule already spans ${forms.length} forms and ${routes.length} routes — galenic space is well covered, so differentiation must come from device, adherence or presentation rather than a new dosage form.`,
    );
  } else {
    score = 58;
    actions.push(
      `Moderate formulation coverage (${forms.length} forms, ${routes.length} routes) — screen the unoccupied route/release profiles against the indication before committing to a 505(b)(2).`,
    );
  }

  if (dm && dm.labelers.length >= 15) {
    actions.push(
      `${dm.labelers.length} labellers market this molecule; a plain-form entry adds no differentiation, so any formulation play must be genuinely novel to be worth the filing.`,
    );
    score = clamp(score - 8);
  }

  return {
    lever: "Administration / formulation",
    computed: true,
    score: clamp(score),
    confidence: fda && dm ? "High" : "Medium",
    evidence,
    recommendedActions: actions,
    estValueRange: oralOnly && fewForms
      ? "Reformulation route open — a 505(b)(2) carries 3-year exclusivity on the new form"
      : "Formulation space largely occupied; value sits in device/adherence differentiation",
    dataGap:
      "Approved forms and routes are established fact here, but whether a specific reformulation is technically feasible or clinically differentiating requires formulation and medical assessment.",
  };
}

// ─── Lifecycle / IP defence ─────────────────────────────────────────────────

function lifecycleLever(fda: DrugsFdaProfile | null): ComputedLever {
  if (!fda) {
    return {
      lever: "Lifecycle / IP defense",
      computed: true,
      score: 0,
      confidence: "Low",
      notComputable: true,
      evidence: [],
      recommendedActions: [],
      estValueRange: "Not computable from the open approval layer",
      dataGap:
        "No Drugs@FDA applications matched this molecule, so generic-entrant depth could not be counted. Expected for a molecule not registered in the US.",
    };
  }

  const evidence: { finding: string; source: string }[] = [];
  const actions: string[] = [];

  evidence.push({
    finding: `${fda.totalApplications} FDA applications on file: ${fda.andaCount} ANDA (generic), ${fda.ndaCount} NDA (brand)${fda.blaCount ? `, ${fda.blaCount} BLA (biologic)` : ""}. ${fda.activeProductCount} products are actively marketed and ${fda.discontinuedProductCount} are discontinued.`,
    source: "openFDA Drugs@FDA",
  });
  if (fda.teCodes.length) {
    evidence.push({
      finding: `Therapeutic-equivalence codes present: ${fda.teCodes.join(", ")}. ${fda.hasSubstitutableAB ? "An A-rated code means products are substitutable at the pharmacy counter, so share moves on price and availability rather than promotion." : "No A-rated equivalence code found, which limits automatic substitution."}`,
      source: "openFDA Drugs@FDA",
    });
  }
  if (fda.sponsors.length) {
    evidence.push({
      finding: `Sponsors on file include ${fda.sponsors.slice(0, 8).join(", ")}${fda.sponsors.length > 8 ? ` and ${fda.sponsors.length - 8} more` : ""}.`,
      source: "openFDA Drugs@FDA",
    });
  }

  // Many ANDAs = exclusivity is long gone and defence is futile; few = there may
  // still be a defensible position.
  let score: number;
  if (fda.andaCount >= 20) {
    score = 18;
    actions.push(
      `${fda.andaCount} generic applications are on file — exclusivity is comprehensively gone and IP defence is not a live lever. Redirect to supply reliability, cost position and channel.`,
    );
  } else if (fda.andaCount >= 5) {
    score = 38;
    actions.push(
      `${fda.andaCount} generic entrants are approved — the market is genuinely multi-source. Defence should focus on authorised-generic and contracting strategy rather than litigation.`,
    );
  } else if (fda.andaCount >= 1) {
    score = 62;
    actions.push(
      `Only ${fda.andaCount} generic application(s) on file — entry is early. There may still be a defensible window worth protecting with lifecycle filings and contracting.`,
    );
  } else {
    score = 74;
    actions.push(
      "No generic applications on file — the molecule is still effectively single-source in the US, so lifecycle and exclusivity strategy remain live levers.",
    );
  }

  if (fda.discontinuedProductCount > fda.activeProductCount && fda.activeProductCount > 0) {
    actions.push(
      `More products are discontinued (${fda.discontinuedProductCount}) than active (${fda.activeProductCount}) — suppliers are exiting, which can open a supply-gap or shortage opportunity for a reliable manufacturer.`,
    );
    score = clamp(score + 10);
  }

  return {
    lever: "Lifecycle / IP defense",
    computed: true,
    score: clamp(score),
    confidence: "High",
    evidence,
    recommendedActions: actions,
    estValueRange:
      fda.andaCount >= 20
        ? "No defensible exclusivity remains; value is in cost and supply, not IP"
        : "Exclusivity position may still be defensible — confirm against patent and exclusivity filings",
    dataGap:
      "Application counts and equivalence codes are established fact, but PATENT and EXCLUSIVITY expiry dates are not: the Orange Book patent/exclusivity tables are published as downloadable files with no public API and are not wired. Confirm remaining exclusivity against the Orange Book before relying on this lever.",
  };
}

// ─── Distribution channels ──────────────────────────────────────────────────

/**
 * CMS reports geography rows that are not addressable commercial territories:
 * "Unknown", "Foreign Country" and the Armed Forces APO/FPO groupings. They carry
 * tiny denominators that distort productivity ratios, and recommending a call
 * plan weighted toward "Unknown" would be an instant credibility failure. Strip
 * them before any commercial interpretation.
 */
const NON_COMMERCIAL_GEO = /^(unknown|foreign country|armed forces)/i;

function commercialStates<T extends { state: string }>(rows: T[]): T[] {
  return rows.filter(r => r.state && !NON_COMMERCIAL_GEO.test(r.state.trim()));
}

function distributionLever(geo: PartDGeoProfile | null): ComputedLever {
  if (!geo || !commercialStates(geo.states).length) {
    return {
      lever: "Distribution channels",
      computed: true,
      score: 0,
      confidence: "Low",
      notComputable: true,
      evidence: [],
      recommendedActions: [],
      estValueRange: "Not computable from the open utilisation layer",
      dataGap:
        "No Medicare Part D geographic prescribing records matched this molecule. Part D covers the US retail channel only — hospital, tender and ex-US channels are outside this dataset entirely.",
    };
  }

  const evidence: { finding: string; source: string }[] = [];
  const actions: string[] = [];
  const states = commercialStates(geo.states);
  const top = commercialStates(geo.topStates).slice(0, 5);

  evidence.push({
    finding: `US retail demand spans ${states.length} addressable states and territories. The top five — ${top.map(s => `${s.state} (${s.claims.toLocaleString()} claims)`).join(", ")} — carry ${geo.top5ClaimSharePct}% of all state-level claims.`,
    source: "CMS Part D Prescribers by Geography",
  });
  evidence.push({
    finding: `Geographic concentration of claims measures ${geo.claimConcentrationHhi} on a Herfindahl-Hirschman scale (0–10,000), where a higher value means demand is concentrated in fewer states.`,
    source: "CMS Part D Prescribers by Geography (CartaOS concentration calculation)",
  });
  if (geo.national) {
    evidence.push({
      finding: `Nationally: ${geo.national.claims.toLocaleString()} claims from ${geo.national.prescribers.toLocaleString()} prescribers covering ${geo.national.beneficiaries.toLocaleString()} beneficiaries, at $${geo.national.drugCost.toLocaleString(undefined, { maximumFractionDigits: 0 })} total drug cost.`,
      source: "CMS Part D Prescribers by Geography",
    });
  }

  // Concentrated demand is cheap to serve; diffuse demand needs breadth.
  let score: number;
  if (geo.top5ClaimSharePct >= 45) {
    score = 74;
    actions.push(
      `Demand is concentrated: ${geo.top5ClaimSharePct}% of claims sit in five states. Distribution and contracting effort should be focused there rather than spread nationally — a small number of regional payers and chains controls most of the volume.`,
    );
  } else if (geo.top5ClaimSharePct >= 30) {
    score = 60;
    actions.push(
      `Demand is moderately concentrated (${geo.top5ClaimSharePct}% in the top five states). Prioritise those markets for wholesaler and chain negotiation while maintaining national availability.`,
    );
  } else {
    score = 44;
    actions.push(
      `Demand is diffuse (${geo.top5ClaimSharePct}% in the top five states) — national wholesaler coverage matters more than regional targeting, and breadth of stocking is the binding constraint.`,
    );
  }

  const costSpread = top.length > 1
    ? Math.max(...top.map(s => s.costPerClaim)) - Math.min(...top.map(s => s.costPerClaim))
    : 0;
  if (costSpread > 0 && top.length > 1) {
    const hi = top.reduce((a, b) => (a.costPerClaim > b.costPerClaim ? a : b));
    const lo = top.reduce((a, b) => (a.costPerClaim < b.costPerClaim ? a : b));
    evidence.push({
      finding: `Cost per claim varies across major states — ${hi.state} at $${hi.costPerClaim.toFixed(2)} versus ${lo.state} at $${lo.costPerClaim.toFixed(2)}.`,
      source: "CMS Part D Prescribers by Geography",
    });
    actions.push(
      `Investigate why cost per claim in ${hi.state} runs above ${lo.state} — state-level plan mix and channel differences of this size usually signal a contracting or dispensing-mix opportunity.`,
    );
  }

  return {
    lever: "Distribution channels",
    computed: true,
    score: clamp(score),
    confidence: "High",
    evidence,
    recommendedActions: actions,
    estValueRange: geo.national
      ? `$${(geo.national.drugCost / 1e6).toFixed(1)}M of US retail drug cost flows through this channel`
      : "US retail channel sized at state level",
    dataGap:
      "This is the Medicare Part D retail channel only. It excludes commercial payers, cash-pay, 340B, hospital and tender channels, and says nothing about wholesaler or GPO share.",
  };
}

// ─── Sales-force effectiveness ──────────────────────────────────────────────

function salesForceLever(geo: PartDGeoProfile | null): ComputedLever {
  if (!geo || !commercialStates(geo.states).length) {
    return {
      lever: "Sales-force effectiveness",
      computed: true,
      score: 0,
      confidence: "Low",
      notComputable: true,
      evidence: [],
      recommendedActions: [],
      estValueRange: "Not computable from the open prescriber layer",
      dataGap:
        "No Medicare Part D prescriber records matched this molecule, so prescriber density and productivity could not be computed. Targeting analysis on your own book requires uploading CRM or field data.",
    };
  }

  const evidence: { finding: string; source: string }[] = [];
  const actions: string[] = [];
  const states = commercialStates(geo.states);

  // Recompute the median over addressable territories only — the CMS "Unknown"
  // and Armed Forces rows would otherwise drag it.
  const perPrescriber = states
    .filter(s => s.prescribers > 0)
    .map(s => s.claimsPerPrescriber)
    .sort((a, b) => a - b);
  const median = perPrescriber.length
    ? Math.round(
        (perPrescriber.length % 2
          ? perPrescriber[(perPrescriber.length - 1) / 2]
          : (perPrescriber[perPrescriber.length / 2 - 1] + perPrescriber[perPrescriber.length / 2]) / 2) * 100,
      ) / 100
    : geo.medianClaimsPerPrescriber;

  evidence.push({
    finding: `Median prescriber productivity is ${median} claims per prescriber across addressable states and territories, on a base of ${states.reduce((a, s) => a + s.prescribers, 0).toLocaleString()} prescribers.`,
    source: "CMS Part D Prescribers by Geography (CartaOS productivity calculation)",
  });

  // States where each prescriber writes far more than median are where a rep
  // call is worth most; the reverse indicates thin, expensive coverage.
  const ranked = [...states]
    .filter(s => s.prescribers > 0)
    .sort((a, b) => b.claimsPerPrescriber - a.claimsPerPrescriber);
  const best = ranked.slice(0, 5);
  const worst = ranked.slice(-5).reverse();

  if (best.length) {
    evidence.push({
      finding: `Highest prescriber productivity: ${best.map(s => `${s.state} (${s.claimsPerPrescriber} claims/prescriber)`).join(", ")}.`,
      source: "CMS Part D Prescribers by Geography",
    });
    actions.push(
      `Weight call-plan and key-account effort toward ${best.slice(0, 3).map(s => s.state).join(", ")}, where each prescriber relationship carries materially more volume than the ${median}-claim median.`,
    );
  }
  if (worst.length) {
    evidence.push({
      finding: `Lowest prescriber productivity: ${worst.map(s => `${s.state} (${s.claimsPerPrescriber} claims/prescriber)`).join(", ")}.`,
      source: "CMS Part D Prescribers by Geography",
    });
    actions.push(
      `Coverage in ${worst.slice(0, 3).map(s => s.state).join(", ")} is thin per prescriber — serve these through digital or non-personal promotion rather than field headcount.`,
    );
  }
  if (geo.ge65ClaimSharePct !== null) {
    evidence.push({
      finding: `${geo.ge65ClaimSharePct}% of claims come from beneficiaries aged 65 and over, which fixes the prescriber specialty mix and the channel that actually reaches them.`,
      source: "CMS Part D Prescribers by Geography",
    });
  }

  // A wide productivity spread means targeting can be improved; a narrow one
  // means the field is already efficiently deployed.
  const spread = best.length && worst.length
    ? best[0].claimsPerPrescriber / Math.max(1, worst[worst.length - 1].claimsPerPrescriber)
    : 1;
  let score = 50;
  if (spread >= 3) {
    score = 76;
    actions.push(
      `Prescriber productivity varies roughly ${spread.toFixed(1)}x between the strongest and weakest states — that dispersion is the single clearest targeting inefficiency to attack.`,
    );
  } else if (spread >= 1.8) {
    score = 62;
  } else {
    score = 42;
    actions.push("Prescriber productivity is fairly uniform across states, so re-targeting will yield little; effort is better spent on message and channel than on territory redesign.");
  }

  return {
    lever: "Sales-force effectiveness",
    computed: true,
    score: clamp(score),
    confidence: "Medium",
    evidence,
    recommendedActions: actions,
    estValueRange: "Targeting efficiency gain scales with the productivity dispersion shown above",
    dataGap:
      "Prescriber counts and productivity are computed from public Medicare Part D data. They do not reflect your own call plan, territory design, share of voice or commercial-payer volume — upload CRM or field data to analyse those.",
  };
}

// ─── Assembly ───────────────────────────────────────────────────────────────

function renderPromptBlock(e: Omit<ComputedEvidence, "promptBlock">): string {
  const lines: string[] = [];
  lines.push(`### COMPUTED EVIDENCE — ${e.molecule}`);
  lines.push(
    "The following was CALCULATED deterministically from live data joined through the RxNorm identifier backbone. Treat every figure here as ESTABLISHED FACT: narrate it, never contradict it, never substitute your own estimate for it. Where a lever below is marked NOT COMPUTABLE, report the stated data gap rather than guessing a score.",
  );
  lines.push(
    `Identity: RxCUI ${e.identity.ingredientRxcui ?? "unresolved"} (${e.identity.ingredientName ?? "—"}); ATC ${e.identity.atc.join(", ") || "none"}; ${e.identity.productCount} products; ${e.identity.ndcCount} NDCs; branded product on market: ${e.identity.hasBrandedProduct ? "yes" : "no"}.`,
  );

  for (const l of e.levers) {
    lines.push("");
    lines.push(
      `LEVER "${l.lever}" — ${l.notComputable ? "NOT COMPUTABLE" : `COMPUTED score ${l.score}/100, confidence ${l.confidence}`}`,
    );
    for (const ev of l.evidence) lines.push(`  · ${ev.finding} [${ev.source}]`);
    if (l.modelAudit) {
      lines.push(
        `  · MODEL AUDIT: "${l.modelAudit.selectedModel}" won a rolling-origin backtest against ${l.modelAudit.leaderboard.length} candidates; measured out-of-sample sMAPE ${l.modelAudit.smape}%, RMSE ${l.modelAudit.rmse}, over ${l.modelAudit.heldOutPredictions} held-out predictions; lift over naive ${l.modelAudit.liftOverNaivePp} pp; 80% interval coverage ${l.modelAudit.intervalCoverage80}%. Quote these measured figures if you cite accuracy — never claim accuracy that is not stated here.`,
      );
    }
    for (const a of l.recommendedActions) lines.push(`  → ${a}`);
    if (l.dataGap) lines.push(`  ! Data gap: ${l.dataGap}`);
  }

  lines.push("");
  lines.push(
    `The other ${10 - e.levers.length} of the ten levers are NOT computed by an adapter — reason about them from the general evidence base and mark them accordingly. Do not present a reasoned lever as if it were computed.`,
  );
  return lines.join("\n");
}

/** Resolve a molecule and compute every lever that has a wired adapter. */
export async function computeEvidence(molecule: string): Promise<ComputedEvidence> {
  const identity = await resolveMolecule(molecule, 12);

  // The canonical RxNorm ingredient name is the join key into the ex-US EML and
  // Part D layers, so those run only once identity has resolved.
  const joinName = identity.ingredientName ?? molecule;

  const resolved = !!identity.ingredientRxcui;
  const [series, eml, partD, fda, dailyMed, geo] = await Promise.all([
    identity.allNdcs.length ? getNadacSeriesBatch(identity.allNdcs, 14) : Promise.resolve([]),
    resolved ? getEmlFootprint(joinName).catch(() => null) : Promise.resolve(null),
    resolved ? getPartDProfile(joinName).catch(() => null) : Promise.resolve(null),
    resolved ? getDrugsFdaProfile(joinName).catch(() => null) : Promise.resolve(null),
    resolved ? getDailyMedProfile(joinName).catch(() => null) : Promise.resolve(null),
    resolved ? getPartDGeoProfile(joinName).catch(() => null) : Promise.resolve(null),
  ]);

  // Forecast the richest series — the most observations gives the most reliable
  // out-of-sample validation.
  const leadSeries = [...series].sort((a, b) => b.points.length - a.points.length)[0] ?? null;
  const forecast = leadSeries ? forecastErosion(leadSeries.points, 12) : null;

  const levers: ComputedLever[] = [
    pricingLever(identity, series, forecast, leadSeries),
    geographicLever(identity, series, eml),
    formularyLever(partD),
    formulationLever(fda, dailyMed),
    lifecycleLever(fda),
    distributionLever(geo),
    salesForceLever(geo),
  ];

  const base: Omit<ComputedEvidence, "promptBlock"> = {
    molecule,
    identity: {
      ingredientRxcui: identity.ingredientRxcui,
      ingredientName: identity.ingredientName,
      atc: identity.atc.map(a => `${a.classId} ${a.className}`),
      productCount: identity.products.length,
      ndcCount: identity.allNdcs.length,
      hasBrandedProduct: identity.hasBrandedProduct,
    },
    levers,
    resolved: !!identity.ingredientRxcui,
  };

  return { ...base, promptBlock: renderPromptBlock(base) };
}

/** Compute evidence for several molecules, bounded to keep the run fast. */
export async function computeEvidenceForAll(molecules: string[], cap = 3): Promise<ComputedEvidence[]> {
  const target = molecules.slice(0, cap);
  const results = await Promise.all(
    target.map(m => computeEvidence(m).catch(() => null)),
  );
  return results.filter((r): r is ComputedEvidence => r !== null);
}
