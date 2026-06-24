/**
 * Client-side exporters for the Simulated Plan outputs — redesigned to a
 * top-tier strategy-consulting standard (think MBB pitch decks): a restrained
 * navy/ink base, brand colours used only as accents, eyebrow kickers, action
 * (so-what) titles, Harvey-ball / dot rating scales, KPI bands, clean
 * horizontal-rule tables, section dividers, and consistent source footnotes.
 *
 * Three deliverables (signatures unchanged):
 *  - exportStrategyReportPDF — full Out-Licensing Strategy report.
 *  - exportExecutionPlanPDF — full Execution Plan.
 *  - exportClientDeck — a board-ready PowerPoint combining both.
 */

import type {
  OutLicensingReport,
  ExecutionPlanOutput,
} from "@/types/hub";

// ─── Brand & design tokens ───────────────────────────────────────────────────

const BRAND = "CartaOS";

// Design-system palette (consulting spec): Ink + a strict gray ramp + exactly
// TWO accents (brand orange). No third hue anywhere.
const INK = "#1A1A1A";        // primary text / structure
const INK_2 = "#1A1A1A";      // lead/secondary text = ink (spec: body is ink)
const BODY = "#1A1A1A";       // body copy = ink
const MUTED = "#6E6E6E";      // labels / kickers (gray)
const FAINT = "#9A9A9A";      // footnotes / source / page number (gray)
const LINE = "#D9D9D9";       // hairlines (gray)
const LINE_SOFT = "#F2F2F2";  // zebra fill (gray)
const BG_SOFT = "#F2F2F2";    // panel fill (gray)
const GOLD = "#F97316";       // accent rule (cover) — Accent 1

// Accent 1 (primary brand) + Accent 2 (highlight/callout). Two accents max.
const STRATEGY_COLOR = "#F97316"; // Accent 1
const EXEC_COLOR = "#C2410C";     // Accent 2
const POS = "#C2410C";            // Accent 2 (highlight)
const NEG = "#C2410C";            // Accent 2 (callout)

const TODAY = () =>
  new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

const safeFilename = (s: string) =>
  s.replace(/[^\w\-]+/g, "_").replace(/^_+|_+$/g, "") || "untitled";

const truncate = (s: string, max: number): string =>
  !s ? "" : s.length <= max ? s : s.slice(0, max - 1) + "…";

// ════════════════════════════════════════════════════════════════════════════
//  PDF ENGINE
// ════════════════════════════════════════════════════════════════════════════

async function loadPdfDeps() {
  const [{ default: jsPDF }, autoTableModule] = await Promise.all([
    import("jspdf"),
    import("jspdf-autotable"),
  ]);
  const autoTable = (autoTableModule as any).default ?? autoTableModule;
  return { jsPDF, autoTable };
}

interface PdfState {
  doc: any;
  y: number;
  pageWidth: number;
  pageHeight: number;
  margin: number;
  reportName: string;
  asset: string;
  accent: string;
}

const HEADER_TOP = 88;   // content start on decorated pages
const FOOTER_PAD = 84;   // reserve ≥ 2 cm clear at the page bottom

function newPdf(jsPDF: any, reportName: string, asset: string, accent: string): PdfState {
  const doc = new jsPDF({ unit: "pt", format: "letter", compress: true });
  return {
    doc,
    y: HEADER_TOP,
    pageWidth: doc.internal.pageSize.getWidth(),
    pageHeight: doc.internal.pageSize.getHeight(),
    margin: 56,
    reportName,
    asset,
    accent,
  };
}

const contentW = (s: PdfState) => s.pageWidth - s.margin * 2;

/** Running header + footer drawn on every content page (not the cover). */
function decorate(state: PdfState) {
  const { doc, pageWidth, pageHeight, margin, accent } = state;

  // Top accent hairline + kicker
  doc.setFillColor(accent);
  doc.rect(0, 0, pageWidth, 3, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(FAINT);
  doc.text(state.reportName.toUpperCase(), margin, 40, { charSpace: 1.4 });
  doc.text(state.asset.toUpperCase(), pageWidth - margin, 40, {
    align: "right",
    charSpace: 1.2,
  });
  doc.setDrawColor(LINE);
  doc.setLineWidth(0.5);
  doc.line(margin, 50, pageWidth - margin, 50);

  // Footer (kept ≥ 2 cm above the page bottom)
  const fy = pageHeight - 58;
  doc.setDrawColor(LINE);
  doc.line(margin, fy - 12, pageWidth - margin, fy - 12);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(FAINT);
  doc.text(`${BRAND}  ·  Confidential`, margin, fy);
  doc.text(`${doc.internal.getNumberOfPages()}`, pageWidth - margin, fy, {
    align: "right",
  });
}

function newPage(state: PdfState) {
  state.doc.addPage();
  state.y = HEADER_TOP;
  decorate(state);
}

function ensureSpace(state: PdfState, needed: number) {
  if (state.y + needed > state.pageHeight - FOOTER_PAD) newPage(state);
}

// ─── Cover ───────────────────────────────────────────────────────────────────

function coverPage(
  state: PdfState,
  eyebrow: string,
  title: string,
  subtitle: string,
  asset: string,
  kpis: { label: string; value: string }[],
) {
  const { doc, pageWidth, pageHeight, margin, accent } = state;

  // Full navy side band on the left edge
  doc.setFillColor(INK);
  doc.rect(0, 0, 14, pageHeight, "F");
  doc.setFillColor(accent);
  doc.rect(0, 0, 14, 150, "F");

  // Eyebrow
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(accent);
  doc.text(eyebrow.toUpperCase(), margin, 110, { charSpace: 2 });

  // Brand
  doc.setFontSize(9);
  doc.setTextColor(MUTED);
  doc.text(BRAND.toUpperCase(), pageWidth - margin, 110, { align: "right", charSpace: 2 });

  // Title — FLOWS down by measured line count (never fixed offsets), so a
  // wrapped title or subtitle can never overlap the element beneath it.
  let cy = 178;
  const titleLH = 31;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(25);
  doc.setTextColor(INK);
  const titleLines = doc.splitTextToSize(title, contentW(state));
  doc.text(titleLines, margin, cy);
  cy += (titleLines.length - 1) * titleLH + 8;

  // Gold premium rule
  doc.setDrawColor(GOLD);
  doc.setLineWidth(1.5);
  doc.line(margin, cy + 14, margin + 64, cy + 14);
  cy += 34;

  // Subtitle — flows
  const subLH = 14;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10.5);
  doc.setTextColor(MUTED);
  const subLines = doc.splitTextToSize(subtitle, contentW(state));
  doc.text(subLines, margin, cy);
  cy += (subLines.length - 1) * subLH + 30;

  // Asset (the subject) — flows; clamped so it can never reach the KPI band
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.setTextColor(accent);
  doc.text(doc.splitTextToSize(asset, contentW(state)), margin, Math.min(cy, pageHeight - 290));

  // KPI band
  if (kpis.length) {
    const bandY = pageHeight - 230;
    const cellW = contentW(state) / kpis.length;
    doc.setDrawColor(LINE);
    doc.setLineWidth(0.5);
    doc.line(margin, bandY, pageWidth - margin, bandY);
    kpis.forEach((k, i) => {
      const x = margin + i * cellW;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.setTextColor(MUTED);
      doc.text(k.label.toUpperCase(), x, bandY + 22, { charSpace: 1 });
      // value — shrink to the cell width so it never bleeds into the next KPI cell
      const val = truncate(k.value, 22);
      let vfs = 19;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(vfs);
      while (vfs > 11 && doc.getTextWidth(val) > cellW - 12) { vfs -= 1; doc.setFontSize(vfs); }
      doc.setTextColor(INK);
      doc.text(val, x, bandY + 50);
    });
    doc.line(margin, bandY + 66, pageWidth - margin, bandY + 66);
  }

  // Meta block
  const metaY = pageHeight - 128;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(MUTED);
  doc.text("PREPARED BY", margin, metaY, { charSpace: 1 });
  doc.text("DATE", pageWidth / 2, metaY, { charSpace: 1 });
  doc.setFontSize(11);
  doc.setTextColor(INK);
  doc.text(BRAND, margin, metaY + 18);
  doc.text(TODAY(), pageWidth / 2, metaY + 18);

  // Confidentiality
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(FAINT);
  doc.text(
    "Confidential — prepared from public regulatory, clinical and pricing sources. Figures marked [estimated] are AI-derived; verify against primary sources before transacting.",
    margin,
    pageHeight - 72,
    { maxWidth: contentW(state) },
  );

  newPage(state);
}

// ─── Section / content primitives ────────────────────────────────────────────

function sectionTitle(state: PdfState, eyebrow: string, title: string, takeaway?: string) {
  ensureSpace(state, takeaway ? 84 : 60);
  const { doc, margin } = state;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(state.accent);
  doc.text(eyebrow.toUpperCase(), margin, state.y, { charSpace: 1.6 });

  doc.setFontSize(17);
  doc.setTextColor(INK);
  const titleLines = doc.splitTextToSize(title, contentW(state));
  doc.text(titleLines, margin, state.y + 18);
  state.y += 18 + titleLines.length * 18;

  if (takeaway) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10.5);
    doc.setTextColor(BODY);
    const tl = doc.splitTextToSize(takeaway, contentW(state));
    doc.text(tl, margin, state.y + 4);
    state.y += tl.length * 14 + 4;
  }

  doc.setDrawColor(LINE);
  doc.setLineWidth(0.75);
  doc.line(margin, state.y + 6, state.pageWidth - margin, state.y + 6);
  state.y += 20;
}

function lead(state: PdfState, text: string) {
  const { doc, margin } = state;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10.5);
  doc.setTextColor(INK_2);
  const lines = doc.splitTextToSize(text, contentW(state));
  const lh = 14.5;
  ensureSpace(state, lines.length * lh + 8);
  doc.text(lines, margin, state.y + lh);
  state.y += lines.length * lh + 12;
}

function paragraph(state: PdfState, text: string, sizePt = 10.5, color = BODY) {
  if (!text) return;
  const { doc, margin } = state;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(sizePt);
  doc.setTextColor(color);
  const lines = doc.splitTextToSize(text, contentW(state));
  const lh = sizePt * 1.4;
  ensureSpace(state, lines.length * lh + 6);
  doc.text(lines, margin, state.y + lh);
  state.y += lines.length * lh + 6;
}

function bullets(state: PdfState, items: string[], accent = state.accent) {
  const { doc, margin } = state;
  for (const item of items) {
    if (!item) continue;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    const lines = doc.splitTextToSize(item, contentW(state) - 14);
    const lh = 13.5;
    ensureSpace(state, lines.length * lh + 3);
    // tick mark
    doc.setFillColor(accent);
    doc.circle(margin + 2.5, state.y + lh - 4, 1.6, "F");
    doc.setTextColor(BODY);
    doc.text(lines, margin + 14, state.y + lh);
    state.y += lines.length * lh + 3;
  }
}

function subHeader(state: PdfState, label: string, color = INK) {
  ensureSpace(state, 26);
  state.doc.setFont("helvetica", "bold");
  state.doc.setFontSize(12);
  state.doc.setTextColor(color);
  state.doc.text(label, state.margin, state.y + 13);
  state.y += 22;
}

function tinyLabel(state: PdfState, label: string) {
  ensureSpace(state, 16);
  state.doc.setFont("helvetica", "bold");
  state.doc.setFontSize(7.5);
  state.doc.setTextColor(MUTED);
  state.doc.text(label.toUpperCase(), state.margin, state.y + 9, { charSpace: 1 });
  state.y += 13;
}

function sourceNote(state: PdfState, text: string) {
  if (!text) return;
  ensureSpace(state, 16);
  state.doc.setFont("helvetica", "italic");
  state.doc.setFontSize(7.5);
  state.doc.setTextColor(FAINT);
  const lines = state.doc.splitTextToSize(`Source: ${text}`, contentW(state));
  state.doc.text(lines, state.margin, state.y + 9);
  state.y += lines.length * 10 + 6;
}

/** Shared table renderer — navy header, horizontal rules, zebra, auto header/footer. */
function table(state: PdfState, opts: any, autoTable: any) {
  autoTable(state.doc, {
    startY: state.y,
    theme: "plain",
    headStyles: {
      fillColor: INK,
      textColor: "#FFFFFF",
      fontStyle: "bold",
      fontSize: 8.5,
      cellPadding: { top: 7, bottom: 7, left: 8, right: 8 },
      lineWidth: 0,
    },
    bodyStyles: {
      fontSize: 8.5,
      textColor: BODY,
      cellPadding: { top: 6, bottom: 6, left: 8, right: 8 },
      lineColor: LINE,
      lineWidth: { bottom: 0.5 },
    },
    alternateRowStyles: { fillColor: LINE_SOFT },
    margin: { left: state.margin, right: state.margin, top: HEADER_TOP, bottom: FOOTER_PAD },
    didDrawPage: () => decorate(state),
    ...opts,
  });
  state.y = (state.doc as any).lastAutoTable.finalY + 16;
}

const attractivenessHex = (level: string): string =>
  level === "Very High" ? "#C2410C"
    : level === "High" ? "#F97316"
    : level === "Medium" ? "#6E6E6E"
    : "#9A9A9A";

// ════════════════════════════════════════════════════════════════════════════
//  STRATEGY REPORT PDF
// ════════════════════════════════════════════════════════════════════════════

export async function exportStrategyReportPDF(
  report: OutLicensingReport,
  assetName: string,
) {
  const { jsPDF, autoTable } = await loadPdfDeps();
  const state = newPdf(jsPDF, "Market Opportunity Assessment", assetName, STRATEGY_COLOR);

  const regions = report.regionalAnalysis ?? [];
  const topRegion = regions.slice().sort((a, b) => (b.attractivenessScore ?? 0) - (a.attractivenessScore ?? 0))[0];
  const topRec = (report.recommendations ?? []).slice().sort((a, b) => a.priorityRank - b.priorityRank)[0];

  coverPage(
    state,
    "Market Opportunity Assessment",
    "Global Drug Opportunity Assessment",
    "Six-vector opportunity scoring across the US, EU-4 (DE/FR/IT/ES), Japan, China & ROW",
    assetName,
    [
      { label: "Verdict", value: report.verdict ?? "—" },
      { label: "Lead market", value: topRegion?.regionLabel ?? "—" },
      { label: "Peak value", value: topRec?.estimatedValue?.total ?? "—" },
      { label: "Data confidence", value: report.dataConfidence ?? "—" },
    ],
  );

  // Executive Summary — governing thought
  sectionTitle(
    state,
    "Executive Summary",
    report.opportunityThesis ?? (topRegion ? `${topRegion.regionLabel} presents the strongest market opportunity` : "Opportunity overview"),
  );
  lead(state, report.executiveSummary ?? "");

  // Asset Profile
  if (report.assetProfile) {
    const p = report.assetProfile;
    newPage(state);
    sectionTitle(state, "Asset Profile", p.name || "Asset profile", p.description);

    table(state, {
      body: [
        ["Modality", p.modality ?? "—"],
        ["Therapeutic area", p.therapeuticArea ?? "—"],
        ["Development stage", p.developmentStage ?? "—"],
        ["Mechanism", p.mechanism ?? "—"],
        ["Current markets", (p.currentMarkets ?? []).join(", ") || "—"],
      ],
      columnStyles: { 0: { fontStyle: "bold", textColor: INK, cellWidth: 150 } },
    }, autoTable);

    if (p.keyStrengths?.length) {
      subHeader(state, "Key strengths", POS);
      bullets(state, p.keyStrengths, POS);
    }
    if (p.keyChallenges?.length) {
      subHeader(state, "Key challenges", INK);
      bullets(state, p.keyChallenges, INK);
    }
    if (p.keyDataPoints?.length) {
      subHeader(state, "Evidence base");
      table(state, {
        head: [["Metric", "Value", "Source"]],
        body: p.keyDataPoints.map((d: any) => [d.label, d.value, d.source]),
        columnStyles: { 2: { textColor: MUTED, fontSize: 8 } },
      }, autoTable);
    }
  }

  // Regional Opportunity Matrix
  if (regions.length) {
    newPage(state);
    sectionTitle(
      state,
      "Regional Assessment",
      "Regional opportunity matrix",
      "Attractiveness reflects a blended market, regulatory, commercial and IP score (0–100).",
    );
    table(state, {
      head: [["Region", "Attractiveness", "Score", "Market size", "Growth", "Patent", "FTO"]],
      body: regions.map((r) => [
        r.regionLabel,
        r.attractiveness,
        String(r.attractivenessScore ?? "—"),
        r.market?.sizeUSD ?? "—",
        r.market?.growthRate ?? "—",
        r.ip?.patentStrength ?? "—",
        r.ip?.ftoStatus ?? "—",
      ]),
      columnStyles: {
        0: { fontStyle: "bold", textColor: INK },
        2: { halign: "right", fontStyle: "bold" },
      },
      didParseCell: (data: any) => {
        if (data.section === "body" && data.column.index === 1) {
          const hex = attractivenessHex(String(data.cell.raw));
          data.cell.styles.textColor = hex;
          data.cell.styles.fontStyle = "bold";
        }
      },
    }, autoTable);
    sourceNote(state, (report.sourcesUsed ?? []).join(", ") || "CartaOS global data aggregation");

    // One detailed page per region
    for (const region of regions) {
      newPage(state);
      sectionTitle(
        state,
        `${region.regionLabel} · ${region.attractiveness}`,
        `${region.regionLabel} — ${region.attractivenessScore}/100 attractiveness`,
      );

      writeDimension(state, autoTable, "Market", [
        ["Size", region.market?.sizeUSD],
        ["Growth", region.market?.growthRate],
        ["Unmet need", region.market?.unmetNeed],
      ], region.market?.drivers, region.market?.barriers);

      writeDimension(state, autoTable, "Legal & Regulatory", [
        ["Authority", region.legal?.regulatoryAuthority],
        ["Pathway", region.legal?.pathway],
        ["Timeline", region.legal?.estimatedTimeline],
      ], region.legal?.exclusivityOpportunities, region.legal?.barriers);

      writeDimension(state, autoTable, "Commercial", [
        ["Competitors", region.commercial?.competitorActivity],
        ["Pricing", region.commercial?.pricingDynamics],
        ["Reimbursement", region.commercial?.reimbursementLandscape],
        ["Distribution", region.commercial?.distributionChannels],
      ], region.commercial?.keyPartnerCandidates, []);

      writeDimension(state, autoTable, "IP & Exclusivity", [
        ["Patent strength", region.ip?.patentStrength],
        ["FTO status", region.ip?.ftoStatus],
        ["Est. exclusivity", region.ip?.estimatedExclusivityYears != null ? `${region.ip.estimatedExclusivityYears} years` : null],
      ], region.ip?.opportunities, region.ip?.expirationRisks);
    }
  }

  // Recommendations
  if (report.recommendations?.length) {
    newPage(state);
    sectionTitle(
      state,
      "Recommendations",
      topRec ? `Prioritise ${topRec.targetRegion} via ${topRec.recommendedDealStructure ?? "out-licensing"}` : "Prioritised recommendations",
    );

    const sorted = report.recommendations.slice().sort((a, b) => a.priorityRank - b.priorityRank);
    table(state, {
      head: [["Rank", "Region", "Structure", "Upfront", "Total", "Royalty", "Timeline"]],
      body: sorted.map((r) => [
        String(r.priorityRank),
        r.targetRegion,
        r.recommendedDealStructure ?? "—",
        r.estimatedValue?.upfront ?? "—",
        r.estimatedValue?.total ?? "—",
        r.estimatedValue?.royaltyRange ?? "—",
        r.estimatedTimeline ?? "—",
      ]),
      columnStyles: {
        0: { halign: "center", fontStyle: "bold", textColor: STRATEGY_COLOR, cellWidth: 36 },
        1: { fontStyle: "bold", textColor: INK },
        3: { textColor: POS, fontStyle: "bold" },
        4: { textColor: POS, fontStyle: "bold" },
        5: { textColor: POS },
      },
    }, autoTable);

    for (const r of sorted) {
      ensureSpace(state, 80);
      subHeader(state, `#${r.priorityRank}  ${r.targetRegion}`, STRATEGY_COLOR);
      paragraph(state, r.rationale ?? "");
      if (r.topPartnerCandidates?.length) {
        tinyLabel(state, "Top partner candidates");
        paragraph(state, r.topPartnerCandidates.join("   ·   "));
      }
      if (r.prerequisites?.length) {
        tinyLabel(state, "Prerequisites");
        bullets(state, r.prerequisites);
      }
      if (r.expectedROI) {
        tinyLabel(state, "Expected ROI");
        paragraph(state, r.expectedROI, 10, POS);
      }
    }
  }

  // Portfolio Risks
  if (report.portfolioRisks?.length) {
    newPage(state);
    sectionTitle(state, "Risk", "Portfolio risk register");
    table(state, {
      head: [["Category", "Risk", "Impact", "Likelihood", "Regions", "Mitigation"]],
      body: report.portfolioRisks.map((r) => [
        r.category, r.risk, r.impact, r.likelihood, (r.affectedRegions ?? []).join(", "), r.mitigation,
      ]),
      columnStyles: {
        0: { fontStyle: "bold", textColor: INK, cellWidth: 64 },
        1: { cellWidth: 120 },
        2: { cellWidth: 50 },
        3: { cellWidth: 58 },
        5: { cellWidth: 140 },
      },
      didParseCell: (data: any) => {
        if (data.section === "body" && data.column.index === 2) {
          if (String(data.cell.raw) === "High") { data.cell.styles.textColor = NEG; data.cell.styles.fontStyle = "bold"; }
        }
      },
    }, autoTable);
  }

  if (report.sourcesUsed?.length) {
    sectionTitle(state, "Appendix", "Data sources");
    paragraph(state, report.sourcesUsed.join("   ·   "), 9, MUTED);
  }

  state.doc.save(`${safeFilename(assetName)}_Strategy_Report.pdf`);
}

function writeDimension(
  state: PdfState,
  autoTable: any,
  title: string,
  rows: [string, string | undefined | null][],
  positives: string[] | undefined,
  negatives: string[] | undefined,
) {
  subHeader(state, title, INK_2);
  const filledRows = rows.filter(([, v]) => v != null && v !== "");
  if (filledRows.length) {
    table(state, {
      body: filledRows.map(([k, v]) => [k, v]),
      columnStyles: { 0: { fontStyle: "bold", textColor: MUTED, cellWidth: 120 } },
    }, autoTable);
  }
  if (positives?.length) {
    tinyLabel(state, "Drivers / opportunities");
    bullets(state, positives, POS);
  }
  if (negatives?.length) {
    tinyLabel(state, "Barriers / risks");
    bullets(state, negatives, INK);
  }
  state.y += 6;
}

// ════════════════════════════════════════════════════════════════════════════
//  EXECUTION PLAN PDF
// ════════════════════════════════════════════════════════════════════════════

export async function exportExecutionPlanPDF(
  plan: ExecutionPlanOutput,
  assetName: string,
) {
  const { jsPDF, autoTable } = await loadPdfDeps();
  const state = newPdf(jsPDF, "Execution Plan", assetName, EXEC_COLOR);

  coverPage(
    state,
    "Execution Plan",
    "Deal Execution Roadmap",
    "Phased timeline, accountable owners, dependencies and milestones to signing",
    assetName,
    [
      { label: "Timeline", value: `${plan.totalDurationWeeks ?? "—"} wks` },
      { label: "Phases", value: String(plan.phases?.length ?? 0) },
      { label: "Stakeholders", value: String(plan.stakeholders?.length ?? 0) },
      { label: "Milestones", value: String(plan.criticalMilestones?.length ?? 0) },
    ],
  );

  sectionTitle(state, "Overview", "Recommended execution path");
  lead(state, plan.overview ?? "");

  // Phases
  if (plan.phases?.length) {
    sectionTitle(state, "Timeline", "Phased delivery plan");
    table(state, {
      head: [["#", "Phase", "Pillar", "Start", "End", "Owner"]],
      body: plan.phases.map((p, i) => [
        String(i + 1), p.name, p.pillar, `W${p.startWeek}`, `W${p.endWeek}`, p.owner,
      ]),
      columnStyles: {
        0: { halign: "center", textColor: EXEC_COLOR, fontStyle: "bold", cellWidth: 30 },
        1: { fontStyle: "bold", textColor: INK },
        3: { halign: "center" }, 4: { halign: "center" },
      },
    }, autoTable);

    for (const p of plan.phases) {
      ensureSpace(state, 90);
      subHeader(state, `${p.name}  ·  Weeks ${p.startWeek}–${p.endWeek}`, EXEC_COLOR);
      paragraph(state, p.description ?? "");
      tinyLabel(state, "Owner");
      paragraph(state, p.owner);
      if (p.contributors?.length) {
        tinyLabel(state, "Contributors");
        paragraph(state, p.contributors.join("   ·   "));
      }
      if (p.deliverables?.length) {
        tinyLabel(state, "Deliverables");
        bullets(state, p.deliverables);
      }
      if (p.successCriteria) {
        tinyLabel(state, "Success criteria");
        paragraph(state, p.successCriteria, 10, POS);
      }
    }
  }

  // Stakeholders
  if (plan.stakeholders?.length) {
    newPage(state);
    sectionTitle(state, "Organisation", "Stakeholder responsibility matrix");
    table(state, {
      head: [["Role", "Involvement", "Int / Ext", "Phases", "Key responsibilities"]],
      body: plan.stakeholders.map((s) => [
        s.role, s.involvement, s.internalOrExternal, String(s.phaseIds?.length ?? 0),
        (s.responsibilities ?? []).join("; "),
      ]),
      columnStyles: {
        0: { fontStyle: "bold", textColor: INK },
        3: { halign: "center" },
        4: { cellWidth: 210, textColor: MUTED },
      },
    }, autoTable);
  }

  // Milestones
  if (plan.criticalMilestones?.length) {
    sectionTitle(state, "Milestones", "Critical milestones");
    table(state, {
      head: [["Week", "Milestone", "Owner", "Deliverable"]],
      body: plan.criticalMilestones.slice().sort((a, b) => a.week - b.week)
        .map((m) => [`W${m.week}`, m.milestone, m.owner, m.deliverable]),
      columnStyles: {
        0: { halign: "center", fontStyle: "bold", textColor: EXEC_COLOR, cellWidth: 44 },
        1: { fontStyle: "bold", textColor: INK },
      },
    }, autoTable);
  }

  // Risks
  if (plan.risks?.length) {
    sectionTitle(state, "Risk", "Execution risk register");
    table(state, {
      head: [["Risk", "Impact", "Likelihood", "Mitigation", "Owner"]],
      body: plan.risks.map((r) => [r.risk, r.impact, r.likelihood, r.mitigation, r.owner]),
      columnStyles: { 0: { cellWidth: 130, fontStyle: "bold", textColor: INK }, 3: { cellWidth: 170 } },
      didParseCell: (data: any) => {
        if (data.section === "body" && data.column.index === 1 && String(data.cell.raw) === "High") {
          data.cell.styles.textColor = NEG; data.cell.styles.fontStyle = "bold";
        }
      },
    }, autoTable);
  }

  // Connections
  if (plan.connections?.length) {
    sectionTitle(state, "Dependencies", "How the phases connect");
    table(state, {
      head: [["From", "To", "Type", "Rationale"]],
      body: plan.connections.map((c) => {
        const from = plan.phases?.find((p) => p.id === c.from)?.name ?? c.from;
        const to = plan.phases?.find((p) => p.id === c.to)?.name ?? c.to;
        return [from, to, c.type, c.description];
      }),
      columnStyles: {
        0: { fontStyle: "bold", textColor: INK },
        1: { fontStyle: "bold", textColor: INK },
        3: { cellWidth: 230, textColor: MUTED },
      },
    }, autoTable);
  }

  state.doc.save(`${safeFilename(assetName)}_Execution_Plan.pdf`);
}

// ════════════════════════════════════════════════════════════════════════════
//  POWERPOINT DECK
// ════════════════════════════════════════════════════════════════════════════

// ── Design-system tokens (consulting spec) ──────────────────────────────────
// Fully sans (Arial) for deterministic cross-format rendering — Georgia headline
// option declined to avoid silent font fallback in jsPDF.
const F = "Arial";

// Strict gray ramp + exactly TWO accents (brand orange). No third hue.
const P = {
  bg: "FFFFFF",
  ink: "1A1A1A",        // primary text
  body: "1A1A1A",       // body = ink
  muted: "6E6E6E",      // labels / kickers
  faint: "9A9A9A",      // footnotes / source / page number
  line: "D9D9D9",       // hairlines
  panel: "F2F2F2",      // fills / zebra
  zebra: "F2F2F2",
  accent: "F97316",     // Accent 1 (brand orange)
  accent2: "C2410C",    // Accent 2 (highlight / callout)
  calloutBg: "FCEEE6",  // light Accent-2 wash for the single highlighted figure
  white: "FFFFFF",
};

// 16:9 grid (inches). Outer margin 0.6 all sides; body 1.6–6.7; footer 6.9–7.1.
const SLIDE_W = 13.333;
const MX = 0.6;                       // outer margin
const MW = SLIDE_W - MX * 2;          // 12.133 content width
const GUT = 0.2;                      // gutter
const HALF = (MW - GUT) / 2;          // two-column width
const COL_R = MX + HALF + GUT;        // right-column x
const BODY_TOP = 1.6;
const FOOTER_Y = 6.95;                // source (left) + page number (right)

const MASTER = "CARTA";

const dotScale = (score: number): string => {
  const filled = Math.max(0, Math.min(5, Math.round((score ?? 0) / 20)));
  return "●".repeat(filled) + "○".repeat(5 - filled);
};

/**
 * Conservative char-estimate font sizer (no font metrics needed in-browser):
 * the largest size ≤ maxPt whose wrapped text fits the box height, with a 15%
 * export safety margin and a hard floor. Accounts for forced line breaks.
 */
function fitFont(text: string, wIn: number, hIn: number, maxPt: number, minPt = 9): number {
  const t = (text ?? "").trim();
  if (!t) return maxPt;
  const wPt = Math.max(36, wIn * 72);
  const hPt = hIn * 72;
  const breaks = (t.match(/\n/g) || []).length;
  for (let fs = maxPt; fs > minPt; fs -= 0.5) {
    const cpl = Math.max(1, Math.floor(wPt / (fs * 0.5))); // ~0.5em avg glyph width
    const lines = Math.max(1 + breaks, Math.ceil(t.length / cpl) + breaks);
    if (lines * fs * 1.2 * 1.15 <= hPt) return fs; // line-height 1.2 × 15% margin
  }
  return minPt;
}

/**
 * Anti-overlap text writer. The font is shrunk DETERMINISTICALLY to fit the
 * fixed box (baked into the file, so it holds even in renderers that ignore
 * PowerPoint auto-fit), and `fit:"shrink"` stays on as a secondary backstop.
 * Works for a plain string and for rich-text run arrays (runs scale together).
 */
function txt(slide: any, text: any, opts: any = {}): any {
  const o: any = { fontFace: F, wrap: true, fit: "shrink", margin: 5, lineSpacingMultiple: 1.1, ...opts };
  if (typeof o.w === "number" && typeof o.h === "number") {
    if (typeof text === "string") {
      const maxPt = typeof o.fontSize === "number" ? o.fontSize : 14;
      o.fontSize = fitFont(text, o.w - 0.15, o.h, maxPt);
    } else if (Array.isArray(text)) {
      const full = text.map((r: any) => (r && r.text) || "").join("");
      const maxRun = Math.max(8, ...text.map((r: any) => (r && r.options && r.options.fontSize) || 12));
      const fitted = fitFont(full, o.w - 0.15, o.h, maxRun);
      if (fitted < maxRun) {
        const ratio = fitted / maxRun;
        for (const r of text) {
          if (r && r.options && typeof r.options.fontSize === "number") {
            r.options.fontSize = Math.max(8, Math.round(r.options.fontSize * ratio * 10) / 10);
          }
        }
      }
    }
  }
  return slide.addText(text, o);
}

export async function exportClientDeck(
  assetName: string,
  strategy: OutLicensingReport | null,
  plan: ExecutionPlanOutput | null,
) {
  const PptxGenJS = (await import("pptxgenjs")).default;
  const pptx = new PptxGenJS();
  pptx.layout = "LAYOUT_WIDE"; // 13.333 × 7.5 in
  pptx.title = `${assetName} — Market Opportunity Assessment`;
  pptx.company = BRAND;

  pptx.defineSlideMaster({
    title: MASTER,
    background: { color: P.bg },
    objects: [
      { rect: { x: MX, y: 6.85, w: MW, h: 0.008, fill: { color: P.line } } },
    ],
    slideNumber: { x: SLIDE_W - MX - 0.6, y: FOOTER_Y, w: 0.6, h: 0.3, fontFace: F, fontSize: 8, color: P.faint, align: "right" },
  });

  const regions = strategy?.regionalAnalysis ?? [];
  const topRegion = regions.slice().sort((a, b) => (b.attractivenessScore ?? 0) - (a.attractivenessScore ?? 0))[0];
  const sortedRecs = (strategy?.recommendations ?? []).slice().sort((a, b) => a.priorityRank - b.priorityRank);
  const topRec = sortedRecs[0];
  const SRC = (strategy?.sourcesUsed ?? []).slice(0, 8).join(" · ") || "CartaOS — public regulatory, clinical, IP & pricing sources";

  // ─── Title / cover ──────────────────────────────────────────────────────
  {
    const slide = pptx.addSlide();
    slide.background = { color: P.bg };
    slide.addShape("rect", { x: 0, y: 0, w: 0.16, h: 7.5, fill: { color: P.ink } });
    slide.addShape("rect", { x: 0, y: 0, w: 0.16, h: 1.6, fill: { color: P.accent } });

    txt(slide,"GLOBAL DRUG OPPORTUNITY ASSESSMENT", {
      x: MX, y: 0.9, w: MW, h: 0.4, fontFace: F, fontSize: 11, bold: true, color: P.accent, charSpacing: 3,
    });
    txt(slide,assetName, {
      x: MX, y: 1.55, w: MW, h: 1.4, fontFace: F, fontSize: 32, bold: true, color: P.ink, valign: "top",
    });
    slide.addShape("rect", { x: MX + 0.02, y: 3.05, w: 0.9, h: 0.04, fill: { color: P.accent } });
    txt(slide,"Board briefing — market-opportunity assessment and go-to-market plan", {
      x: MX, y: 3.25, w: MW, h: 0.6, fontFace: F, fontSize: 13, color: P.muted,
    });

    const kpis: [string, string, boolean][] = [
      ["VERDICT", strategy?.verdict ?? "—", true],
      ["LEAD MARKET", topRegion?.regionLabel ?? "—", false],
      ["PEAK VALUE", topRec?.estimatedValue?.total ?? "—", false],
      ["TIMELINE", topRec?.estimatedTimeline ?? (plan ? `${plan.totalDurationWeeks} wks` : "—"), false],
    ];
    const cellW = MW / 4;
    kpis.forEach(([label, value, hi], i) => {
      const x = MX + i * cellW;
      slide.addShape("line", { x, y: 4.5, w: 0, h: 1.0, line: { color: P.line, width: 1 } } as any);
      txt(slide,label, { x: x + 0.15, y: 4.55, w: cellW - 0.3, h: 0.3, fontFace: F, fontSize: 9.5, bold: true, color: P.muted, charSpacing: 1 });
      txt(slide,truncate(value, 16), { x: x + 0.15, y: 4.85, w: cellW - 0.3, h: 0.6, fontFace: F, fontSize: 19, bold: true, color: hi ? P.accent2 : P.ink });
    });

    txt(slide,`${BRAND}  ·  ${TODAY()}  ·  Confidential`, { x: MX, y: 6.6, w: MW, h: 0.3, fontFace: F, fontSize: 10, color: P.faint });
  }

  // ─── Divider: Opportunity ───────────────────────────────────────────────
  if (strategy) dividerSlide(pptx, "01", "Opportunity", "Where the market opportunity is — and what it's worth", P.accent);

  // ─── Executive summary ──────────────────────────────────────────────────
  if (strategy?.executiveSummary) {
    const slide = contentSlide(pptx, "Strategy", "Executive summary", P.accent, SRC);
    if (strategy.opportunityThesis) {
      txt(slide,strategy.opportunityThesis, { x: MX, y: BODY_TOP + 0.05, w: MW, h: 0.7, fontFace: F, fontSize: 12.5, bold: true, color: P.ink, valign: "top" });
    }
    txt(slide,strategy.executiveSummary, {
      x: MX, y: BODY_TOP + 0.85, w: MW, h: 2.6, fontFace: F, fontSize: 11, color: P.ink, valign: "top", lineSpacingMultiple: 1.15, paraSpaceAfter: 6,
    });
    if (sortedRecs.length) {
      const cw = (MW - 2 * GUT) / 3;
      sortedRecs.slice(0, 3).forEach((r, i) => {
        const x = MX + i * (cw + GUT);
        slide.addShape("rect", { x, y: 5.15, w: cw, h: 1.15, fill: { color: P.panel }, line: { type: "none" } });
        slide.addShape("rect", { x, y: 5.15, w: 0.06, h: 1.15, fill: { color: P.accent } });
        txt(slide,`#${r.priorityRank}  ${r.targetRegion}`, { x: x + 0.2, y: 5.28, w: cw - 0.35, h: 0.35, fontFace: F, fontSize: 14, bold: true, color: P.ink });
        txt(slide,truncate(r.recommendedDealStructure ?? "", 58), { x: x + 0.2, y: 5.6, w: cw - 0.35, h: 0.6, fontFace: F, fontSize: 11, color: P.muted, valign: "top" });
      });
    }
  }

  // ─── Asset profile ──────────────────────────────────────────────────────
  if (strategy?.assetProfile) {
    const p = strategy.assetProfile;
    const slide = contentSlide(pptx, "Strategy", "Asset profile", P.accent, "Open Targets · ChEMBL · openFDA · ClinicalTrials.gov");
    txt(slide,p.name, { x: MX, y: 1.7, w: MW, h: 0.5, fontFace: F, fontSize: 20, bold: true, color: P.ink });
    txt(slide,p.description, { x: MX, y: 2.2, w: MW, h: 1.1, fontFace: F, fontSize: 11, color: P.muted, valign: "top" });

    const facts: [string, string][] = [
      ["MODALITY", p.modality ?? "—"],
      ["THERAPEUTIC AREA", p.therapeuticArea ?? "—"],
      ["STAGE", p.developmentStage ?? "—"],
      ["MECHANISM", p.mechanism ?? "—"],
    ];
    facts.forEach(([label, value], i) => {
      const x = i % 2 === 0 ? MX : COL_R;
      const y = 3.45 + Math.floor(i / 2) * 0.85;
      txt(slide,label, { x, y, w: HALF, h: 0.3, fontFace: F, fontSize: 9.5, bold: true, color: P.muted, charSpacing: 1 });
      txt(slide,value, { x, y: y + 0.28, w: HALF, h: 0.5, fontFace: F, fontSize: 14, color: P.ink });
    });

    if (p.keyStrengths?.length) {
      txt(slide,"KEY STRENGTHS", { x: MX, y: 5.2, w: HALF, h: 0.3, fontFace: F, fontSize: 10, bold: true, color: P.accent2, charSpacing: 1 });
      txt(slide,p.keyStrengths.slice(0, 3).map((s) => ({ text: s, options: { bullet: { code: "2022" }, fontSize: 11, color: P.ink } })),
        { x: MX, y: 5.5, w: HALF, h: 0.85, fontFace: F, valign: "top", paraSpaceAfter: 2 });
    }
    if (p.keyChallenges?.length) {
      txt(slide,"KEY CHALLENGES", { x: COL_R, y: 5.2, w: HALF, h: 0.3, fontFace: F, fontSize: 10, bold: true, color: P.ink, charSpacing: 1 });
      txt(slide,p.keyChallenges.slice(0, 3).map((s) => ({ text: s, options: { bullet: { code: "2022" }, fontSize: 11, color: P.ink } })),
        { x: COL_R, y: 5.5, w: HALF, h: 0.85, fontFace: F, valign: "top", paraSpaceAfter: 2 });
    }
  }

  // ─── Regional opportunity matrix ────────────────────────────────────────
  if (regions.length) {
    const slide = contentSlide(
      pptx, "Strategy · Regional assessment",
      topRegion ? `${topRegion.regionLabel} leads the regional opportunity set` : "Regional opportunity matrix",
      P.accent, SRC,
    );
    const rows: any[][] = [
      ["Region", "Attractiveness", "COS", "Market size", "Growth", "Patent", "FTO"].map((t) => ({ text: t, options: cellHead() })),
      ...regions.map((r) => [
        { text: r.regionLabel, options: cellBody({ bold: true, color: P.ink }) },
        { text: ` ${dotScale(r.attractivenessScore ?? 0)}  ${r.attractiveness}`, options: cellBody({ color: attractivenessPpt(r.attractiveness), bold: true }) },
        { text: String(r.attractivenessScore ?? "—"), options: cellBody({ bold: true, align: "center" }) },
        { text: r.market?.sizeUSD ?? "—", options: cellBody() },
        { text: r.market?.growthRate ?? "—", options: cellBody() },
        { text: r.ip?.patentStrength ?? "—", options: cellBody() },
        { text: r.ip?.ftoStatus ?? "—", options: cellBody() },
      ]),
    ];
    slide.addTable(rows, {
      x: MX, y: BODY_TOP + 0.15, w: MW, colW: [1.9, 2.9, 0.95, 1.75, 1.5, 1.4, 1.73],
      rowH: 0.5, valign: "middle", border: { type: "none" }, fill: { color: P.bg }, fontFace: F, autoPage: false,
    });
  }

  // ─── Per-region six-vector assessment (2×2 grid) ────────────────────────
  for (const region of regions) {
    const slide = contentSlide(
      pptx, `Strategy · ${region.regionLabel}`,
      `${region.regionLabel} — ${region.attractiveness} (COS ${region.attractivenessScore}/100)`,
      P.accent, "openFDA · EMA · Orange/Purple Book · NRDL · PMDA · ClinicalTrials.gov",
    );
    const quads: { title: string; color: string; lines: string[] }[] = [
      { title: "Market & epidemiology", color: P.ink, lines: [
        region.market?.sizeUSD ? `Size — ${region.market.sizeUSD}` : "",
        region.market?.growthRate ? `Growth — ${region.market.growthRate}` : "",
        region.market?.unmetNeed ? `Unmet need — ${truncate(region.market.unmetNeed, 120)}` : "",
      ].filter(Boolean) },
      { title: "Regulatory pathway", color: P.muted, lines: [
        region.legal?.regulatoryAuthority ? `Authority — ${region.legal.regulatoryAuthority}` : "",
        region.legal?.pathway ? `Pathway — ${region.legal.pathway}` : "",
        region.legal?.estimatedTimeline ? `Timeline — ${region.legal.estimatedTimeline}` : "",
      ].filter(Boolean) },
      { title: "Access & competition", color: P.accent2, lines: [
        region.commercial?.competitorActivity ? `Competition — ${truncate(region.commercial.competitorActivity, 130)}` : "",
        region.commercial?.pricingDynamics ? `Pricing — ${truncate(region.commercial.pricingDynamics, 110)}` : "",
        region.commercial?.reimbursementLandscape ? `Access — ${truncate(region.commercial.reimbursementLandscape, 90)}` : "",
      ].filter(Boolean) },
      { title: "IP & exclusivity", color: P.accent, lines: [
        region.ip?.patentStrength ? `Patent — ${region.ip.patentStrength}` : "",
        region.ip?.ftoStatus ? `FTO — ${region.ip.ftoStatus}` : "",
        region.ip?.estimatedExclusivityYears != null ? `Exclusivity — ${region.ip.estimatedExclusivityYears} years` : "",
      ].filter(Boolean) },
    ];
    quads.forEach((q, i) => {
      const x = i % 2 === 0 ? MX : COL_R;
      const y = 1.7 + Math.floor(i / 2) * 2.25;
      slide.addShape("rect", { x, y, w: HALF, h: 2.05, fill: { color: P.panel }, line: { type: "none" } });
      slide.addShape("rect", { x, y, w: 0.07, h: 2.05, fill: { color: q.color } });
      txt(slide,q.title, { x: x + 0.25, y: y + 0.13, w: HALF - 0.4, h: 0.4, fontFace: F, fontSize: 13, bold: true, color: q.color });
      txt(slide,
        q.lines.length
          ? q.lines.map((t) => ({ text: t, options: { bullet: { code: "2022" }, fontSize: 10.5, color: P.ink } }))
          : [{ text: "No data available", options: { fontSize: 10.5, italic: true, color: P.faint } }],
        { x: x + 0.28, y: y + 0.55, w: HALF - 0.5, h: 1.4, fontFace: F, valign: "top", paraSpaceAfter: 2 },
      );
    });
  }

  // ─── Recommendations table ──────────────────────────────────────────────
  if (sortedRecs.length) {
    const slide = contentSlide(
      pptx, "Strategy · Recommendations",
      topRec ? `Prioritise ${topRec.targetRegion} — ${topRec.recommendedDealStructure ?? "market entry"}` : "Prioritised recommendations",
      P.accent, SRC,
    );
    const rows: any[][] = [
      ["#", "Region", "Recommended route", "Upfront", "Total", "Royalty", "Top partners"].map((t) => ({ text: t, options: cellHead() })),
      ...sortedRecs.map((r) => [
        { text: String(r.priorityRank), options: cellBody({ bold: true, color: P.accent, align: "center" }) },
        { text: r.targetRegion, options: cellBody({ bold: true, color: P.ink }) },
        { text: truncate(r.recommendedDealStructure ?? "—", 38), options: cellBody() },
        { text: r.estimatedValue?.upfront ?? "—", options: cellBody({ color: P.accent2, bold: true }) },
        { text: r.estimatedValue?.total ?? "—", options: cellBody({ color: P.accent2, bold: true }) },
        { text: r.estimatedValue?.royaltyRange ?? "—", options: cellBody({ color: P.accent2 }) },
        { text: truncate((r.topPartnerCandidates ?? []).slice(0, 3).join(", ") || "—", 46), options: cellBody({ fontSize: 10 }) },
      ]),
    ];
    slide.addTable(rows, {
      x: MX, y: BODY_TOP + 0.15, w: MW, colW: [0.6, 1.4, 2.63, 1.4, 1.4, 1.4, 3.3],
      rowH: 0.46, valign: "middle", border: { type: "none" }, fontFace: F, autoPage: false,
    });
  }

  // ─── Lead recommendation detail ─────────────────────────────────────────
  if (topRec) {
    const slide = contentSlide(pptx, "Strategy · Lead recommendation", `#${topRec.priorityRank} priority — ${topRec.targetRegion}`, P.accent, "SEC EDGAR · comparable transactions");
    txt(slide,topRec.rationale ?? "", { x: MX, y: 1.7, w: MW, h: 1.9, fontFace: F, fontSize: 12, color: P.ink, valign: "top", lineSpacingMultiple: 1.1 });

    const cards: [string, string][] = [
      ["UPFRONT", topRec.estimatedValue?.upfront ?? "—"],
      ["TOTAL VALUE", topRec.estimatedValue?.total ?? "—"],
      ["ROYALTY RANGE", topRec.estimatedValue?.royaltyRange ?? "—"],
    ];
    const cw = (MW - 2 * GUT) / 3;
    cards.forEach(([label, value], i) => {
      const x = MX + i * (cw + GUT);
      slide.addShape("rect", { x, y: 3.95, w: cw, h: 1.45, fill: { color: P.calloutBg }, line: { color: P.accent2, width: 1 } });
      txt(slide,label, { x: x + 0.25, y: 4.1, w: cw - 0.45, h: 0.3, fontFace: F, fontSize: 10, bold: true, color: P.accent2, charSpacing: 1 });
      txt(slide,value, { x: x + 0.25, y: 4.4, w: cw - 0.45, h: 0.85, fontFace: F, fontSize: 24, bold: true, color: P.ink, valign: "top" });
    });

    if (topRec.topPartnerCandidates?.length) {
      txt(slide,"TOP PARTNERS", { x: MX, y: 5.6, w: HALF, h: 0.3, fontFace: F, fontSize: 10, bold: true, color: P.muted, charSpacing: 1 });
      txt(slide,topRec.topPartnerCandidates.join("   ·   "), { x: MX, y: 5.88, w: HALF, h: 0.4, fontFace: F, fontSize: 13, color: P.ink });
    }
    if (topRec.estimatedTimeline) {
      txt(slide,"TIMELINE", { x: COL_R, y: 5.6, w: HALF, h: 0.3, fontFace: F, fontSize: 10, bold: true, color: P.muted, charSpacing: 1 });
      txt(slide,topRec.estimatedTimeline, { x: COL_R, y: 5.88, w: HALF, h: 0.4, fontFace: F, fontSize: 13, color: P.ink });
    }
  }

  // ─── Divider: Execution ─────────────────────────────────────────────────
  if (plan) dividerSlide(pptx, "02", "Execution", "How we get to market — phased, owned and time-bound", P.accent2);

  // ─── Execution timeline (Gantt) ─────────────────────────────────────────
  if (plan?.phases?.length) {
    const slide = contentSlide(
      pptx, "Execution · Timeline",
      `${plan.totalDurationWeeks}-week path to market across ${plan.phases.length} phases`,
      P.accent2, "CartaOS execution model",
    );
    const totalWeeks = Math.max(plan.totalDurationWeeks, ...plan.phases.map((p) => p.endWeek), 1);
    const trackX = 4.1, trackY = 2.0, trackW = SLIDE_W - MX - trackX, rowH = 0.4, maxPhases = 9;
    const phases = plan.phases.slice(0, maxPhases);

    [0, 0.25, 0.5, 0.75, 1].forEach((p) => {
      const x = trackX + trackW * p;
      slide.addShape("line", { x, y: trackY - 0.05, w: 0, h: phases.length * rowH + 0.1, line: { color: P.line, width: 0.5 } } as any);
      txt(slide,`W${Math.round(totalWeeks * p)}`, { x: x - 0.35, y: trackY - 0.4, w: 0.7, h: 0.25, fontFace: F, fontSize: 9, color: P.faint, align: "center" });
    });
    phases.forEach((p, i) => {
      const y = trackY + i * rowH;
      txt(slide,`${(i + 1).toString().padStart(2, "0")}  ${truncate(p.name, 34)}`, {
        x: MX, y, w: trackX - MX - 0.1, h: rowH, fontFace: F, fontSize: 10, color: P.ink, valign: "middle",
      });
      const left = trackX + (p.startWeek / totalWeeks) * trackW;
      const width = Math.max(((p.endWeek - p.startWeek) / totalWeeks) * trackW, 0.18);
      slide.addShape("rect", { x: left, y: y + 0.09, w: width, h: rowH - 0.18, fill: { color: pillarPpt(p.pillar) }, line: { type: "none" } });
    });
    const legendY = trackY + phases.length * rowH + 0.35;
    ["Diagnosis", "Strategy", "Execution"].forEach((pillar, i) => {
      slide.addShape("rect", { x: MX + i * 2.4, y: legendY, w: 0.22, h: 0.22, fill: { color: pillarPpt(pillar) }, line: { type: "none" } });
      txt(slide,pillar, { x: MX + 0.28 + i * 2.4, y: legendY - 0.04, w: 2, h: 0.3, fontFace: F, fontSize: 10, color: P.ink });
    });
  }

  // ─── Stakeholders ───────────────────────────────────────────────────────
  if (plan?.stakeholders?.length) {
    const slide = contentSlide(pptx, "Execution · Organisation", "Stakeholder responsibility matrix", P.accent2, "CartaOS execution model");
    const rows: any[][] = [
      ["Role", "Involvement", "Int / Ext", "Key responsibility"].map((t) => ({ text: t, options: cellHead() })),
      ...plan.stakeholders.slice(0, 9).map((s) => [
        { text: s.role, options: cellBody({ bold: true, color: P.ink }) },
        { text: s.involvement, options: cellBody({ color: involvementPpt(s.involvement), bold: true }) },
        { text: s.internalOrExternal, options: cellBody() },
        { text: truncate((s.responsibilities ?? [])[0] ?? "—", 92), options: cellBody({ fontSize: 10, color: P.muted }) },
      ]),
    ];
    slide.addTable(rows, { x: MX, y: BODY_TOP + 0.15, w: MW, colW: [2.9, 1.9, 1.5, 5.83], rowH: 0.42, valign: "middle", border: { type: "none" }, fontFace: F, autoPage: false });
  }

  // ─── Milestones ─────────────────────────────────────────────────────────
  if (plan?.criticalMilestones?.length) {
    const slide = contentSlide(pptx, "Execution · Milestones", "Critical milestones to market", P.accent2, "CartaOS execution model");
    const sorted = plan.criticalMilestones.slice().sort((a, b) => a.week - b.week).slice(0, 8);
    sorted.forEach((m, i) => {
      const y = 1.75 + i * 0.56;
      slide.addShape("rect", { x: MX, y, w: 1.1, h: 0.45, fill: { color: P.ink }, line: { type: "none" } });
      txt(slide,`W${m.week}`, { x: MX, y, w: 1.1, h: 0.45, fontFace: F, fontSize: 12, bold: true, color: P.white, align: "center", valign: "middle" });
      txt(slide,[
        { text: `${m.milestone}   `, options: { fontSize: 12, bold: true, color: P.ink } },
        { text: `${m.owner} · ${m.deliverable}`, options: { fontSize: 11, color: P.muted } },
      ], { x: MX + 1.35, y, w: MW - 1.35, h: 0.45, fontFace: F, valign: "middle" });
    });
  }

  // ─── Critical risks ─────────────────────────────────────────────────────
  const allRisks: { label: string; impact?: string; mitigation?: string; source: string }[] = [];
  for (const r of strategy?.portfolioRisks ?? []) allRisks.push({ label: r.risk, impact: r.impact, mitigation: r.mitigation, source: r.category });
  for (const r of plan?.risks ?? []) allRisks.push({ label: r.risk, impact: r.impact, mitigation: r.mitigation, source: "Execution" });
  if (allRisks.length) {
    const slide = contentSlide(pptx, "Risk", "Flaws and fatal blockers to address", P.accent2, SRC);
    const high = allRisks.filter((r) => r.impact === "High");
    const list = (high.length ? high : allRisks).slice(0, 5);
    list.forEach((r, i) => {
      const y = 1.75 + i * 0.95;
      slide.addShape("rect", { x: MX, y: y + 0.02, w: 0.07, h: 0.62, fill: { color: P.accent2 } });
      txt(slide,[
        { text: truncate(r.label, 120), options: { fontSize: 12.5, bold: true, color: P.ink } },
        { text: `   ${r.source}${r.impact ? " · " + r.impact + " impact" : ""}`, options: { fontSize: 10, color: P.accent2 } },
        { text: `\n→ ${truncate(r.mitigation ?? "—", 130)}`, options: { fontSize: 11, color: P.muted } },
      ], { x: MX + 0.25, y, w: MW - 0.25, h: 0.78, fontFace: F, valign: "top" });
    });
  }

  // ─── Next steps ─────────────────────────────────────────────────────────
  {
    const slide = contentSlide(pptx, "Actions", "Recommended next steps", P.accent2, "CartaOS execution model");
    const steps: string[] = [];
    if (topRec) {
      steps.push(`Pursue ${topRec.recommendedDealStructure ?? "market entry"} in ${topRec.targetRegion} (target ${topRec.estimatedValue?.total ?? "TBD"})`);
      if (topRec.topPartnerCandidates?.length) steps.push(`Initiate outreach to ${topRec.topPartnerCandidates.slice(0, 3).join(", ")}`);
      if (topRec.prerequisites?.length) steps.push(`Complete prerequisites: ${topRec.prerequisites.slice(0, 2).join("; ")}`);
    }
    if (plan?.phases?.length) steps.push(`Launch Phase 1 (${plan.phases[0].name}) — owner ${plan.phases[0].owner}, weeks ${plan.phases[0].startWeek}–${plan.phases[0].endWeek}`);
    if (plan?.criticalMilestones?.length) {
      const next = plan.criticalMilestones.slice().sort((a, b) => a.week - b.week)[0];
      steps.push(`Drive to first milestone: Week ${next.week} — ${next.milestone}`);
    }
    steps.push("Establish a weekly BD/Exec steering review to govern the process");

    steps.forEach((s, i) => {
      const y = 1.75 + i * 0.72;
      slide.addShape("rect", { x: MX, y, w: 0.5, h: 0.5, fill: { color: P.accent2 }, line: { type: "none" } });
      txt(slide,String(i + 1), { x: MX, y, w: 0.5, h: 0.5, fontFace: F, fontSize: 16, bold: true, color: P.white, align: "center", valign: "middle" });
      txt(slide,s, { x: MX + 0.8, y, w: MW - 0.8, h: 0.5, fontFace: F, fontSize: 13, color: P.ink, valign: "middle" });
    });
  }

  await pptx.writeFile({ fileName: `${safeFilename(assetName)}_Opportunity_Assessment.pptx` });
}

// ─── PPT helpers ─────────────────────────────────────────────────────────────

function contentSlide(pptx: any, kicker: string, title: string, accent: string, source?: string): any {
  const slide = pptx.addSlide({ masterName: MASTER });
  slide.addShape("rect", { x: 0, y: 0, w: SLIDE_W, h: 0.14, fill: { color: accent } });
  txt(slide,kicker.toUpperCase(), { x: MX, y: 0.42, w: MW, h: 0.3, fontFace: F, fontSize: 12, bold: true, color: P.muted, charSpacing: 2 });
  txt(slide,title, { x: MX, y: 0.74, w: MW, h: 0.78, fontFace: F, fontSize: 24, bold: true, color: P.ink, valign: "top" });
  slide.addShape("line", { x: MX, y: 1.55, w: MW, h: 0, line: { color: P.line, width: 1 } } as any);
  txt(slide,`Source: ${source ?? "CartaOS — public regulatory, clinical, IP & pricing sources"}`, {
    x: MX, y: FOOTER_Y, w: MW - 1, h: 0.3, fontFace: F, fontSize: 8, color: P.faint,
  });
  return slide;
}

function dividerSlide(pptx: any, num: string, label: string, takeaway: string, accent: string) {
  const slide = pptx.addSlide();
  slide.background = { color: P.ink };
  slide.addShape("rect", { x: 0, y: 0, w: SLIDE_W, h: 0.14, fill: { color: accent } });
  txt(slide,num, { x: MX, y: 2.0, w: 4, h: 2.2, fontFace: F, fontSize: 120, bold: true, color: "3A3A3A" });
  txt(slide,label, { x: MX + 0.05, y: 4.1, w: MW, h: 0.9, fontFace: F, fontSize: 32, bold: true, color: P.white });
  slide.addShape("rect", { x: MX + 0.1, y: 5.0, w: 0.9, h: 0.05, fill: { color: accent } });
  txt(slide,takeaway, { x: MX + 0.1, y: 5.2, w: MW, h: 0.6, fontFace: F, fontSize: 17, color: "C9C9C9" });
}

function cellHead(): any {
  return { bold: true, fontSize: 11, color: "FFFFFF", fill: { color: P.ink }, align: "left", valign: "middle", fontFace: F, margin: [4, 6, 4, 6] };
}

function cellBody(extra: any = {}): any {
  return { fontSize: 11.5, color: P.ink, valign: "middle", fontFace: F, fill: { color: "FFFFFF" }, margin: [3, 6, 3, 6], ...extra };
}

const attractivenessPpt = (level: string): string =>
  level === "Very High" ? "C2410C" : level === "High" ? "F97316" : level === "Medium" ? "6E6E6E" : "9A9A9A";

const involvementPpt = (level: string): string =>
  level === "Lead" ? "C2410C" : level === "Contributor" ? "1A1A1A" : level === "Approver" ? "6E6E6E" : "9A9A9A";

const pillarPpt = (pillar: string): string =>
  pillar === "Diagnosis" ? "1A1A1A" : pillar === "Strategy" ? "C2410C" : pillar === "Execution" ? "F97316" : "9A9A9A";
