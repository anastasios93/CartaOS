/**
 * Global Pharma Data Aggregator
 * Unifies data from 12+ public databases across all major markets.
 *
 * Sources:
 * 🇺🇸 FDA: OpenFDA (approvals, labels, adverse events), Orange Book (patents/exclusivity), DailyMed (labels)
 * 🇪🇺 EMA: ePI API (European authorized products)
 * 🇨🇦 Health Canada: DPD (Canadian approvals)
 * 🌍 Global: ClinicalTrials.gov, PubMed, ChEMBL (targets/mechanisms), RxNorm (nomenclature), SEC EDGAR (deals)
 */

import { searchDrugApplications, searchDrugLabels } from "./openfda";
import { searchAdverseEvents, getTopAdverseReactions, getAdverseEventTotal } from "./fda-adverse-events";
import { searchOrangeBook, getExpiringPatents } from "./orange-book";
import { searchDailyMed } from "./dailymed";
import { searchDrugs as searchRxNorm, getIngredients, getDrugClasses } from "./rxnorm";
import { searchEmaProducts } from "./ema";
import { searchByBrandName as searchHealthCanada, searchByIngredient as searchHcIngredient } from "./health-canada";
import { searchMolecules, getMechanisms, searchTargets } from "./chembl";
import { searchClinicalTrials } from "./clinical-trials";
import { searchLiterature } from "./pubmed";
import { searchEdgarForDeals } from "./sec-edgar";
import { searchPatents } from "./patents";
import { searchGoogleNews } from "./news";
import { searchOpenTargets, type OpenTargetsProfile } from "./open-targets";
import { searchPubChem, type PubChemCompound } from "./pubchem";
import { searchCima, type CimaMedicine } from "./cima-spain";
import { searchCmsSpending, type CmsDrugSpending } from "./cms-pricing";
import { searchGhoIndicators, type GhoIndicator } from "./who-gho";
import { searchUnii, type UniiSubstance } from "./unii-gsrs";

// ─── Unified types ──────────────────────────────────────────────────────────

export interface GlobalDrugProfile {
  query: string;
  timestamp: string;
  fdaApprovals: any[];
  fdaLabels: any[];
  adverseEvents: { total: number; topReactions: { term: string; count: number }[] };
  patents: any[];
  dailyMedLabels: any[];
  rxNormData: any[];
  emaProducts: any[];
  healthCanada: any[];
  chemblData: { molecules: any[]; mechanisms: any[] };
  clinicalTrials: any[];
  literature: any[];
  secFilings: any[];
  patentData: any[];
  news: any[];
  openTargets: OpenTargetsProfile | null;
  pubchem: PubChemCompound | null;
  cimaSpain: CimaMedicine[];
  cmsSpending: CmsDrugSpending[];
  whoGho: GhoIndicator[];
  unii: UniiSubstance[];
  sources: { name: string; count: number; status: "success" | "error" | "empty" }[];
}

/**
 * Aggregate all data for a drug/compound across every available public database.
 * Runs all queries in parallel for maximum speed.
 */
export async function aggregateGlobalData(
  drugName: string,
  therapeuticArea?: string,
  options: { includeNews?: boolean; includePatents?: boolean; maxPerSource?: number } = {}
): Promise<GlobalDrugProfile> {
  const { includeNews = true, includePatents = true, maxPerSource = 15 } = options;
  const searchTerm = drugName;
  const broadTerm = therapeuticArea ? `${drugName} ${therapeuticArea}` : drugName;
  const sources: GlobalDrugProfile["sources"] = [];

  // Run ALL data sources in parallel
  const [
    fdaApprovals,
    fdaLabels,
    adverseTotal,
    topReactions,
    orangeBook,
    dailyMed,
    rxNorm,
    emaProducts,
    healthCanada,
    chemblMols,
    clinicalTrials,
    literature,
    secFilings,
    patentData,
    news,
    openTargetsRes,
    pubChemRes,
    cimaRes,
    cmsRes,
    ghoRes,
    uniiRes,
  ] = await Promise.allSettled([
    // 🇺🇸 FDA
    searchDrugApplications(searchTerm, maxPerSource),
    searchDrugLabels(searchTerm, 5),
    getAdverseEventTotal(searchTerm),
    getTopAdverseReactions(searchTerm, 10),
    searchOrangeBook(searchTerm, maxPerSource),
    searchDailyMed(searchTerm, maxPerSource),
    // 🇺🇸 NLM
    searchRxNorm(searchTerm),
    // 🇪🇺 EMA
    searchEmaProducts(searchTerm, maxPerSource),
    // 🇨🇦 Health Canada
    searchHealthCanada(searchTerm, maxPerSource),
    // 🌍 ChEMBL
    searchMolecules(searchTerm, maxPerSource),
    // 🌍 ClinicalTrials.gov
    searchClinicalTrials(broadTerm, undefined, maxPerSource),
    // 🌍 PubMed
    searchLiterature(broadTerm, maxPerSource),
    // 🇺🇸 SEC EDGAR
    searchEdgarForDeals(broadTerm, ["8-K", "10-K"], undefined, undefined, 10),
    // 🌍 Patents
    includePatents ? searchPatents(searchTerm, maxPerSource) : Promise.resolve({ results: [], totalCount: 0 }),
    // 🌍 News
    includeNews ? searchGoogleNews(searchTerm, 10) : Promise.resolve({ results: [] }),
    // 🔬 Science · chemistry · EU/US access · burden · substance identity
    searchOpenTargets(searchTerm),
    searchPubChem(searchTerm),
    searchCima(searchTerm, maxPerSource),
    searchCmsSpending(searchTerm, 10),
    searchGhoIndicators(therapeuticArea || searchTerm, 12),
    searchUnii(searchTerm, 10),
  ]);

  // Helper to safely extract result
  function extract<T>(result: PromiseSettledResult<T>, name: string, defaultVal: T): T {
    if (result.status === "fulfilled") {
      const val = result.value;
      const count = Array.isArray(val) ? val.length : typeof val === "object" && val !== null && "results" in (val as any) ? (val as any).results?.length ?? 0 : typeof val === "number" ? val : 1;
      sources.push({ name, count, status: count > 0 ? "success" : "empty" });
      return val;
    }
    sources.push({ name, count: 0, status: "error" });
    return defaultVal;
  }

  // Get ChEMBL mechanisms if we found molecules
  const mols = extract(chemblMols, "ChEMBL", []);
  let mechanisms: any[] = [];
  if (mols.length > 0 && mols[0]?.chemblId) {
    try {
      mechanisms = await getMechanisms(mols[0].chemblId);
    } catch { /* ignore */ }
  }

  // Get RxNorm drug classes if we found a match
  const rxData = extract(rxNorm, "RxNorm", []);
  if (rxData.length > 0 && rxData[0]?.rxcui) {
    try {
      const classes = await getDrugClasses(rxData[0].rxcui);
      for (const rx of rxData) {
        (rx as any).drugClasses = classes;
      }
    } catch { /* ignore */ }
  }

  const fdaApprovalData = extract(fdaApprovals, "OpenFDA Approvals", { results: [], totalCount: 0 });
  const fdaLabelData = extract(fdaLabels, "OpenFDA Labels", { results: [], totalCount: 0 });
  const aeTotal = extract(adverseTotal, "FAERS Adverse Events", 0);
  const aeTop = extract(topReactions, "FAERS Top Reactions", []);
  const obData = extract(orangeBook, "Orange Book (Patents)", { results: [], totalCount: 0 });
  const dmData = extract(dailyMed, "DailyMed Labels", { results: [], totalCount: 0 });
  const emaData = extract(emaProducts, "EMA Products", []);
  const hcData = extract(healthCanada, "Health Canada", { results: [], totalCount: 0 });
  const ctData = extract(clinicalTrials, "ClinicalTrials.gov", { results: [], nextToken: null, totalCount: 0 } as any);
  const litData = extract(literature, "PubMed/Europe PMC", { results: [], nextToken: null, totalCount: 0 } as any);
  const secData = extract(secFilings, "SEC EDGAR", { results: [], nextToken: null, totalCount: 0 } as any);
  const patData = extract(patentData, "Patents", { results: [], nextToken: null, totalCount: 0 } as any);
  const newsData = extract(news, "Google News", { results: [] } as any);

  // Object-or-null sources (handled outside extract so counts stay honest)
  const openTargets = openTargetsRes.status === "fulfilled" ? openTargetsRes.value : null;
  sources.push({
    name: "Open Targets",
    count: openTargets && (openTargets.drug || openTargets.associatedTargets.length) ? 1 : 0,
    status: openTargetsRes.status === "fulfilled" ? (openTargets?.drug || openTargets?.associatedTargets.length ? "success" : "empty") : "error",
  });
  const pubchem = pubChemRes.status === "fulfilled" ? pubChemRes.value : null;
  sources.push({ name: "PubChem", count: pubchem ? 1 : 0, status: pubChemRes.status === "fulfilled" ? (pubchem ? "success" : "empty") : "error" });

  const cimaSpain = extract(cimaRes, "Spain CIMA (AEMPS)", [] as CimaMedicine[]);
  const cmsSpending = extract(cmsRes, "CMS Medicare Part D", [] as CmsDrugSpending[]);
  const whoGho = extract(ghoRes, "WHO GHO", [] as GhoIndicator[]);
  const unii = extract(uniiRes, "FDA UNII (GSRS)", [] as UniiSubstance[]);

  return {
    query: drugName,
    timestamp: new Date().toISOString(),
    fdaApprovals: fdaApprovalData.results ?? [],
    fdaLabels: fdaLabelData.results ?? [],
    adverseEvents: { total: aeTotal, topReactions: aeTop },
    patents: obData.results,
    dailyMedLabels: dmData.results,
    rxNormData: rxData,
    emaProducts: emaData,
    healthCanada: hcData.results,
    chemblData: { molecules: mols, mechanisms },
    clinicalTrials: ctData.results,
    literature: litData.results,
    secFilings: secData.results,
    patentData: patData.results,
    news: (newsData as any).results ?? [],
    openTargets,
    pubchem,
    cimaSpain,
    cmsSpending,
    whoGho,
    unii,
    sources,
  };
}

/**
 * Generate a text summary of all gathered data for use in AI agent prompts.
 */
export function summarizeGlobalData(profile: GlobalDrugProfile): string {
  const sections: string[] = [];

  sections.push(`# Global Drug Intelligence: ${profile.query}`);
  sections.push(`Generated: ${profile.timestamp}\n`);

  // FDA Approvals
  if (profile.fdaApprovals.length > 0) {
    sections.push(`## 🇺🇸 FDA Approvals (${profile.fdaApprovals.length} found)`);
    for (const app of profile.fdaApprovals.slice(0, 8)) {
      sections.push(`- ${app.brandName || app.genericName || "Unknown"} (${app.applicationNumber || ""}) by ${app.sponsorName || ""} — Approved: ${app.approvalDate || "N/A"}`);
    }
  }

  // Adverse Events
  if (profile.adverseEvents.total > 0) {
    sections.push(`\n## ⚠️ Adverse Events (${profile.adverseEvents.total.toLocaleString()} total FAERS reports)`);
    sections.push(`Top reactions: ${profile.adverseEvents.topReactions.map(r => `${r.term} (${r.count})`).join(", ")}`);
  }

  // Patent/Exclusivity
  if (profile.patents.length > 0) {
    sections.push(`\n## 📋 Orange Book Patents & Exclusivity (${profile.patents.length} products)`);
    for (const p of profile.patents.slice(0, 5)) {
      const patentInfo = p.patents?.map((pat: any) => `Patent ${pat.patentNumber} expires ${pat.patentExpireDate}`).join("; ") || "No patents listed";
      sections.push(`- ${p.proprietaryName || p.ingredientName} (${p.applicationNumber}): ${patentInfo}`);
    }
  }

  // DailyMed Labels
  if (profile.dailyMedLabels.length > 0) {
    sections.push(`\n## 💊 DailyMed Labels (${profile.dailyMedLabels.length} found)`);
    for (const dm of profile.dailyMedLabels.slice(0, 5)) {
      sections.push(`- ${dm.title} | Labeler: ${dm.labelerName} | Ingredients: ${dm.activeIngredients?.join(", ") || "N/A"}`);
    }
  }

  // RxNorm
  if (profile.rxNormData.length > 0) {
    sections.push(`\n## 🏷️ RxNorm Drug Classification`);
    for (const rx of profile.rxNormData.slice(0, 5)) {
      sections.push(`- ${rx.name} (RxCUI: ${rx.rxcui}, Type: ${rx.tty})`);
      if ((rx as any).drugClasses?.length > 0) {
        sections.push(`  Classes: ${(rx as any).drugClasses.map((c: any) => c.className).join(", ")}`);
      }
    }
  }

  // EMA Products
  if (profile.emaProducts.length > 0) {
    sections.push(`\n## 🇪🇺 EMA Authorized Products (${profile.emaProducts.length} found)`);
    for (const ema of profile.emaProducts.slice(0, 5)) {
      sections.push(`- ${ema.title || ema.productNames?.join(", ") || "Unknown"} | Substances: ${ema.activeSubstances?.join(", ") || "N/A"}`);
    }
  }

  // Health Canada
  if (profile.healthCanada.length > 0) {
    sections.push(`\n## 🇨🇦 Health Canada Approvals (${profile.healthCanada.length} found)`);
    for (const hc of profile.healthCanada.slice(0, 5)) {
      sections.push(`- ${hc.brandName} (DIN: ${hc.drugIdentificationNumber}) by ${hc.companyName} | Status: ${hc.status}`);
    }
  }

  // ChEMBL
  if (profile.chemblData.molecules.length > 0) {
    sections.push(`\n## 🧬 ChEMBL Drug Targets & Mechanisms`);
    for (const mol of profile.chemblData.molecules.slice(0, 5)) {
      sections.push(`- ${mol.prefName || mol.chemblId} | Phase: ${mol.maxPhase} | Type: ${mol.moleculeType} | First Approved: ${mol.firstApproval || "N/A"}`);
    }
    if (profile.chemblData.mechanisms.length > 0) {
      sections.push(`Mechanisms of action:`);
      for (const mech of profile.chemblData.mechanisms.slice(0, 5)) {
        sections.push(`  - ${mech.mechanismOfAction} (${mech.actionType}) → Target: ${mech.targetName}`);
      }
    }
  }

  // Clinical Trials
  if (profile.clinicalTrials.length > 0) {
    sections.push(`\n## 🏥 Clinical Trials (${profile.clinicalTrials.length} found)`);
    for (const ct of profile.clinicalTrials.slice(0, 8)) {
      sections.push(`- ${ct.nctId}: ${ct.title} | Phase: ${ct.phase} | Status: ${ct.status} | Sponsor: ${ct.sponsor}`);
    }
  }

  // Literature
  if (profile.literature.length > 0) {
    sections.push(`\n## 📚 Scientific Literature (${profile.literature.length} publications)`);
    for (const pub of profile.literature.slice(0, 5)) {
      sections.push(`- ${pub.title} (${pub.journal}, ${pub.date}) PMID: ${pub.pmid}`);
    }
  }

  // SEC Filings
  if (profile.secFilings.length > 0) {
    sections.push(`\n## 📄 SEC EDGAR Filings (${profile.secFilings.length} found)`);
    for (const sec of profile.secFilings.slice(0, 5)) {
      sections.push(`- ${sec.companyName}: ${sec.formType} filed ${sec.filedDate} (Accession: ${sec.accessionNumber})`);
    }
  }

  // Patents
  if (profile.patentData.length > 0) {
    sections.push(`\n## ⚖️ Patents (${profile.patentData.length} found)`);
    for (const pat of profile.patentData.slice(0, 5)) {
      sections.push(`- ${pat.patentNumber}: ${pat.title} | Assignee: ${pat.assignee} | Expires: ${pat.expiryDate || "N/A"}`);
    }
  }

  // News
  if (profile.news.length > 0) {
    sections.push(`\n## 📰 Recent News (${profile.news.length} articles)`);
    for (const n of profile.news.slice(0, 5)) {
      sections.push(`- ${n.title} (${n.source}, ${n.publishedDate})`);
    }
  }

  // Open Targets — asset science / mechanism
  if (profile.openTargets?.drug) {
    const d = profile.openTargets.drug;
    sections.push(`\n## 🎯 Open Targets — Asset Science`);
    sections.push(`- ${d.name} | Type: ${d.drugType || "N/A"} | Max clinical phase: ${d.maxPhase ?? "N/A"}`);
    if (d.mechanismsOfAction.length) sections.push(`  Mechanism of action: ${d.mechanismsOfAction.join("; ")}`);
    if (d.linkedTargets.length) sections.push(`  Molecular targets: ${d.linkedTargets.join(", ")}`);
    if (d.indications.length) sections.push(`  Indications: ${d.indications.slice(0, 6).join(", ")}`);
  }
  if (profile.openTargets?.associatedTargets?.length) {
    sections.push(`Top target–disease associations: ${profile.openTargets.associatedTargets.map(t => `${t.name} (${t.associationScore})`).join(", ")}`);
  }

  // PubChem — compound identity
  if (profile.pubchem) {
    const p = profile.pubchem;
    sections.push(`\n## 🧪 PubChem — Compound Identity`);
    sections.push(`- CID ${p.cid} | Formula: ${p.molecularFormula} | MW: ${p.molecularWeight} | ${p.iupacName}`);
  }

  // FDA UNII — substance-level identity (entity resolution)
  if (profile.unii?.length) {
    sections.push(`\n## 🔑 FDA UNII (substance identity)`);
    for (const u of profile.unii.slice(0, 3)) sections.push(`- ${u.name} | UNII: ${u.unii} | Class: ${u.substanceClass}`);
  }

  // Spain CIMA — EU national authorisation
  if (profile.cimaSpain?.length) {
    sections.push(`\n## 🇪🇸 Spain CIMA (AEMPS) — EU national authorisations`);
    for (const m of profile.cimaSpain.slice(0, 5)) sections.push(`- ${m.nombre} | ${m.labTitular} | Marketed: ${m.comercializado ? "yes" : "no"}${m.generico ? " | generic" : ""}`);
  }

  // CMS — US Medicare spend signal (rare open pricing proxy)
  if (profile.cmsSpending?.length) {
    sections.push(`\n## 💵 CMS Medicare Part D — US spend signal`);
    for (const c of profile.cmsSpending.slice(0, 5)) sections.push(`- ${c.brandName} (${c.genericName}) by ${c.manufacturer} — Total spend ${c.totalSpending} (${c.year})`);
  }

  // WHO GHO — disease-burden / epidemiology context for market sizing
  if (profile.whoGho?.length) {
    sections.push(`\n## 🌍 WHO GHO — burden / epidemiology indicators`);
    sections.push(profile.whoGho.slice(0, 6).map(i => i.name).join("; "));
  }

  // Source summary
  sections.push(`\n## 📊 Data Sources Summary`);
  for (const s of profile.sources) {
    const icon = s.status === "success" ? "✅" : s.status === "empty" ? "⚪" : "❌";
    sections.push(`${icon} ${s.name}: ${s.count} records`);
  }

  return sections.join("\n");
}
