/**
 * GET /api/asymmetries  (aligned to CliffBridge PRD §5.2)
 *
 * Returns cross-border pharmaceutical patent asymmetry records with AIR scores.
 * Optionally enriches with live FDA Orange Book patent expiry data.
 *
 * Query params:
 *   ?minAir=N   — filter to records with AIR >= N
 *   ?molecule=  — filter to a single molecule (generic name, case-insensitive)
 *   ?live=1     — attempt live Orange Book enrichment for the molecule
 */

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { computeAsymmetries, getArbitrageStats, MOLECULES } from "@/lib/patent-arbitrage-data";
import { searchOrangeBook } from "@/server/services/orange-book";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const minAir = parseFloat(searchParams.get("minAir") || "0");
  const moleculeFilter = searchParams.get("molecule")?.toLowerCase();
  const live = searchParams.get("live") === "1";

  let records = computeAsymmetries({ minAir });
  if (moleculeFilter) {
    records = records.filter(r => r.moleculeName.toLowerCase().includes(moleculeFilter));
  }

  // Optional live Orange Book enrichment for the filtered molecule
  let liveOrangeBook: any = null;
  if (live && moleculeFilter) {
    try {
      const ob = await searchOrangeBook(moleculeFilter, 5);
      liveOrangeBook = ob.results.map(p => ({
        product: p.proprietaryName || p.ingredientName,
        applicant: p.applicant,
        applicationNumber: p.applicationNumber,
        patents: (p.patents || []).map((pat: any) => ({
          patentNumber: pat.patentNumber,
          expiry: pat.patentExpireDate,
          drugSubstance: pat.drugSubstanceFlag,
        })),
      }));
    } catch {
      liveOrangeBook = null;
    }
  }

  return NextResponse.json({
    timestamp: new Date().toISOString(),
    stats: getArbitrageStats(),
    asymmetry_records: records,
    molecules: MOLECULES.map(m => ({
      genericName: m.genericName,
      brandName: m.brandName,
      originator: m.originator,
      therapeuticCategory: m.therapeuticCategory,
      globalAnnualSalesUSDb: m.globalAnnualSalesUSDb,
    })),
    liveOrangeBook,
  });
}
