/**
 * GET /api/market-trends
 * Aggregates real-time market intelligence from public APIs.
 * Returns: deal volume, trial activity, competitor signals, patent cliff, commercial news.
 */

import { NextResponse } from "next/server";
import { searchEdgarForDeals } from "@/server/services/sec-edgar";
import { searchClinicalTrials } from "@/server/services/clinical-trials";
import { searchGoogleNews } from "@/server/services/news";
import { getExpiringPatents } from "@/server/services/orange-book";
import { searchDrugApplications } from "@/server/services/openfda";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const THERAPEUTIC_AREAS = [
  "oncology",
  "immunology",
  "neuroscience",
  "rare disease",
  "cardiovascular",
  "metabolic",
];

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const therapeuticArea = searchParams.get("ta") || "oncology";

  try {
    // Run all queries in parallel
    const [
      recentDealsResult,
      activeTrialsResult,
      newsResult,
      patentCliffResult,
      fdaApprovalsResult,
      ...taTrialCounts
    ] = await Promise.allSettled([
      // SEC EDGAR — recent licensing deals
      searchEdgarForDeals(`license agreement ${therapeuticArea}`, ["8-K"], "2025-01-01", undefined, 50),
      // Clinical Trials — active trials
      searchClinicalTrials(therapeuticArea, "RECRUITING", 100),
      // News — commercial signals
      searchGoogleNews(`${therapeuticArea} pharmaceutical deal acquisition`, 20),
      // Orange Book — patent expiries 2026-2030
      getExpiringPatents(2026, 2030, 50),
      // FDA — recent approvals
      searchDrugApplications(therapeuticArea, 20),
      // Trial counts per TA
      ...THERAPEUTIC_AREAS.map(ta => searchClinicalTrials(ta, "RECRUITING", 1)),
    ]);

    const recentDeals = recentDealsResult.status === "fulfilled" ? recentDealsResult.value.results : [];
    const activeTrials = activeTrialsResult.status === "fulfilled" ? activeTrialsResult.value.results : [];
    const news = newsResult.status === "fulfilled" ? newsResult.value.results : [];
    const expiringPatents = patentCliffResult.status === "fulfilled" ? patentCliffResult.value : [];
    const fdaApprovals = fdaApprovalsResult.status === "fulfilled" ? fdaApprovalsResult.value.results : [];

    // Trial counts per TA
    const taActivity = THERAPEUTIC_AREAS.map((ta, i) => {
      const result = taTrialCounts[i];
      const total = result?.status === "fulfilled" ? result.value.totalCount : 0;
      return { area: ta.charAt(0).toUpperCase() + ta.slice(1), trials: total };
    });

    // Aggregate top sponsors from active trials
    const sponsorCounts = new Map<string, number>();
    for (const t of activeTrials) {
      const s = t.sponsor;
      if (!s) continue;
      sponsorCounts.set(s, (sponsorCounts.get(s) ?? 0) + 1);
    }
    const topSponsors = [...sponsorCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([sponsor, count]) => ({ sponsor, trials: count }));

    // Phase distribution
    const phaseCounts = new Map<string, number>();
    for (const t of activeTrials) {
      const phase = t.phase || "Not Specified";
      phaseCounts.set(phase, (phaseCounts.get(phase) ?? 0) + 1);
    }
    const phaseDistribution = [...phaseCounts.entries()]
      .map(([phase, count]) => ({ phase, count }))
      .sort((a, b) => a.phase.localeCompare(b.phase));

    // Deal volume by month (last 12 months)
    const monthCounts = new Map<string, number>();
    const now = new Date();
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = d.toISOString().slice(0, 7);
      monthCounts.set(key, 0);
    }
    for (const deal of recentDeals) {
      const filed = deal.filingDate?.slice(0, 7);
      if (!filed) continue;
      if (monthCounts.has(filed)) {
        monthCounts.set(filed, (monthCounts.get(filed) ?? 0) + 1);
      }
    }
    const dealVolume = [...monthCounts.entries()].map(([month, count]) => ({
      month: new Date(month + "-01").toLocaleDateString("en-US", { month: "short", year: "2-digit" }),
      deals: count,
    }));

    // Patent cliff by year
    const patentByYear = new Map<number, number>();
    for (const p of expiringPatents) {
      const year = parseInt(p.patentExpireDate?.slice(0, 4) || "0");
      if (year >= 2026 && year <= 2030) {
        patentByYear.set(year, (patentByYear.get(year) ?? 0) + 1);
      }
    }
    const patentCliff = [2026, 2027, 2028, 2029, 2030].map(year => ({
      year: year.toString(),
      patents: patentByYear.get(year) ?? 0,
    }));

    return NextResponse.json({
      timestamp: new Date().toISOString(),
      therapeuticArea,
      summary: {
        recentDeals: recentDeals.length,
        activeTrials: activeTrials.length,
        newsArticles: news.length,
        expiringPatents: expiringPatents.length,
        fdaApprovals: fdaApprovals.length,
      },
      taActivity,
      topSponsors,
      phaseDistribution,
      dealVolume,
      patentCliff,
      recentDeals: recentDeals.slice(0, 15).map(d => ({
        company: d.companyName,
        form: d.form,
        date: d.filingDate,
        description: d.description?.slice(0, 200) ?? "",
        url: d.documentUrl,
      })),
      news: news.slice(0, 12).map((n: any) => ({
        title: n.title,
        source: n.source,
        date: n.publishedDate,
        url: n.link,
        snippet: n.snippet,
      })),
      activeTrials: activeTrials.slice(0, 10).map(t => ({
        nctId: t.nctId,
        title: t.title,
        sponsor: t.sponsor,
        phase: t.phase,
        status: t.status,
        conditions: t.conditions,
      })),
      fdaApprovals: fdaApprovals.slice(0, 10).map(f => ({
        applicationNumber: f.applicationNumber,
        brandName: f.brandName,
        sponsor: f.sponsorName,
        approvalDate: f.approvalDate,
        productType: f.productType,
      })),
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to fetch market data" },
      { status: 500 }
    );
  }
}
