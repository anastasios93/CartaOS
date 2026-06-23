/**
 * Client-side exporters for the Simulated Plan outputs.
 *
 * Three deliverables:
 *  - exportStrategyReportPDF — full Out-Licensing Strategy report (cover, exec
 *    summary, asset profile, regional analyses, recommendations, risks).
 *  - exportExecutionPlanPDF — full Execution Plan (phases, stakeholders,
 *    milestones, risks, connections).
 *  - exportClientDeck — actionable PowerPoint that combines both: exec summary,
 *    regional opportunities, prioritized recommendations, phased timeline,
 *    stakeholder matrix, critical risks, next steps.
 */

import type {
  OutLicensingReport,
  ExecutionPlanOutput,
  RegionalAnalysis,
} from "@/types/hub";

// Brand
const BRAND = "CartaOS";
const PRIMARY = "#F97316";
const PRIMARY_DARK = "#EA580C";
const STRATEGY_COLOR = "#0EA5E9";
const EXEC_COLOR = "#F97316";
const TEXT_DARK = "#1A1A2E";
const MUTED = "#64748B";

const TODAY = () =>
  new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

const safeFilename = (s: string) =>
  s.replace(/[^\w\-]+/g, "_").replace(/^_+|_+$/g, "") || "untitled";

// ─── PDF helpers (lazy-loaded to keep client bundle small) ─────────────────

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
}

function newPdf(jsPDF: any): PdfState {
  const doc = new jsPDF({ unit: "pt", format: "letter" });
  return {
    doc,
    y: 0,
    pageWidth: doc.internal.pageSize.getWidth(),
    pageHeight: doc.internal.pageSize.getHeight(),
    margin: 48,
  };
}

function ensureSpace(state: PdfState, needed: number) {
  if (state.y + needed > state.pageHeight - state.margin) {
    state.doc.addPage();
    state.y = state.margin;
    drawFooter(state);
  }
}

function drawFooter(state: PdfState) {
  const { doc, pageWidth, pageHeight } = state;
  const pageNum = doc.internal.getNumberOfPages();
  doc.setFontSize(8);
  doc.setTextColor(MUTED);
  doc.text(
    `${BRAND} · Confidential`,
    state.margin,
    pageHeight - 24,
  );
  doc.text(`${pageNum}`, pageWidth - state.margin, pageHeight - 24, {
    align: "right",
  });
}

function coverPage(
  state: PdfState,
  title: string,
  subtitle: string,
  asset: string,
  accent: string
) {
  const { doc, pageWidth, pageHeight, margin } = state;

  // Header bar
  doc.setFillColor(accent);
  doc.rect(0, 0, pageWidth, 8, "F");

  // Brand
  doc.setFontSize(11);
  doc.setTextColor(MUTED);
  doc.setFont("helvetica", "normal");
  doc.text(BRAND.toUpperCase(), margin, 80);

  // Title
  doc.setFontSize(34);
  doc.setTextColor(TEXT_DARK);
  doc.setFont("helvetica", "bold");
  const titleLines = doc.splitTextToSize(title, pageWidth - margin * 2);
  doc.text(titleLines, margin, 160);

  // Subtitle
  doc.setFontSize(14);
  doc.setTextColor(MUTED);
  doc.setFont("helvetica", "normal");
  doc.text(subtitle, margin, 220);

  // Asset name (large)
  doc.setFontSize(22);
  doc.setTextColor(accent);
  doc.setFont("helvetica", "bold");
  const assetLines = doc.splitTextToSize(asset, pageWidth - margin * 2);
  doc.text(assetLines, margin, pageHeight / 2);

  // Meta block at bottom
  const metaY = pageHeight - 140;
  doc.setDrawColor(225, 230, 235);
  doc.line(margin, metaY, pageWidth - margin, metaY);

  doc.setFontSize(9);
  doc.setTextColor(MUTED);
  doc.text("PREPARED BY", margin, metaY + 22);
  doc.text("DATE", pageWidth / 2, metaY + 22);

  doc.setFontSize(12);
  doc.setTextColor(TEXT_DARK);
  doc.setFont("helvetica", "bold");
  doc.text(BRAND, margin, metaY + 42);
  doc.text(TODAY(), pageWidth / 2, metaY + 42);

  doc.setFontSize(8);
  doc.setTextColor(MUTED);
  doc.setFont("helvetica", "normal");
  doc.text(
    "Confidential — Generated from public regulatory and pricing sources. Verify against primary sources before transacting.",
    margin,
    pageHeight - 48,
    { maxWidth: pageWidth - margin * 2 },
  );

  doc.addPage();
  state.y = margin;
  drawFooter(state);
}

function sectionHeader(state: PdfState, label: string, accent: string) {
  ensureSpace(state, 50);
  const { doc, pageWidth, margin } = state;

  doc.setFillColor(accent);
  doc.rect(margin, state.y, 4, 22, "F");

  doc.setFontSize(16);
  doc.setTextColor(TEXT_DARK);
  doc.setFont("helvetica", "bold");
  doc.text(label, margin + 12, state.y + 16);
  state.y += 36;
}

function paragraph(state: PdfState, text: string, sizePt = 10.5) {
  const { doc, pageWidth, margin } = state;
  doc.setFontSize(sizePt);
  doc.setTextColor(TEXT_DARK);
  doc.setFont("helvetica", "normal");
  const lines = doc.splitTextToSize(text, pageWidth - margin * 2);
  const lineHeight = sizePt * 1.35;
  ensureSpace(state, lines.length * lineHeight + 6);
  doc.text(lines, margin, state.y + lineHeight);
  state.y += lines.length * lineHeight + 6;
}

function bullets(state: PdfState, items: string[]) {
  for (const item of items) {
    paragraph(state, `• ${item}`, 10);
  }
}

function subHeader(state: PdfState, label: string, color = TEXT_DARK) {
  ensureSpace(state, 28);
  state.doc.setFontSize(12);
  state.doc.setTextColor(color);
  state.doc.setFont("helvetica", "bold");
  state.doc.text(label, state.margin, state.y + 14);
  state.y += 22;
}

function tinyLabel(state: PdfState, label: string) {
  ensureSpace(state, 18);
  state.doc.setFontSize(8);
  state.doc.setTextColor(MUTED);
  state.doc.setFont("helvetica", "bold");
  state.doc.text(label.toUpperCase(), state.margin, state.y + 10);
  state.y += 14;
}

// ─── Strategy report PDF ─────────────────────────────────────────────────────

export async function exportStrategyReportPDF(
  report: OutLicensingReport,
  assetName: string,
) {
  const { jsPDF, autoTable } = await loadPdfDeps();
  const state = newPdf(jsPDF);

  coverPage(
    state,
    "Out-Licensing Strategy Report",
    "Regional opportunity assessment · Market / Legal / Commercial / IP",
    assetName,
    STRATEGY_COLOR,
  );

  // Executive Summary
  sectionHeader(state, "Executive Summary", STRATEGY_COLOR);
  paragraph(state, report.executiveSummary);

  // Asset Profile
  if (report.assetProfile) {
    const p = report.assetProfile;
    sectionHeader(state, "Asset Profile", STRATEGY_COLOR);
    paragraph(state, p.description ?? "");

    autoTable(state.doc, {
      startY: state.y,
      head: [["Field", "Value"]],
      body: [
        ["Modality", p.modality ?? "—"],
        ["Therapeutic Area", p.therapeuticArea ?? "—"],
        ["Stage", p.developmentStage ?? "—"],
        ["Mechanism", p.mechanism ?? "—"],
        ["Current Markets", (p.currentMarkets ?? []).join(", ") || "—"],
      ],
      theme: "grid",
      headStyles: { fillColor: STRATEGY_COLOR, textColor: 255 },
      styles: { fontSize: 9, cellPadding: 6 },
      margin: { left: state.margin, right: state.margin },
    });
    state.y = (state.doc as any).lastAutoTable.finalY + 14;

    if (p.keyStrengths?.length) {
      subHeader(state, "Key Strengths", "#059669");
      bullets(state, p.keyStrengths);
    }
    if (p.keyChallenges?.length) {
      subHeader(state, "Key Challenges", "#D97706");
      bullets(state, p.keyChallenges);
    }
    if (p.keyDataPoints?.length) {
      subHeader(state, "Key Data Points");
      autoTable(state.doc, {
        startY: state.y,
        head: [["Metric", "Value", "Source"]],
        body: p.keyDataPoints.map((d: any) => [
          d.label,
          d.value,
          d.source,
        ]),
        theme: "striped",
        headStyles: { fillColor: STRATEGY_COLOR, textColor: 255 },
        styles: { fontSize: 9, cellPadding: 5 },
        margin: { left: state.margin, right: state.margin },
      });
      state.y = (state.doc as any).lastAutoTable.finalY + 14;
    }
  }

  // Regional Opportunity Matrix (overview table)
  if (report.regionalAnalysis?.length) {
    state.doc.addPage();
    state.y = state.margin;
    drawFooter(state);
    sectionHeader(state, "Regional Opportunity Matrix", STRATEGY_COLOR);
    autoTable(state.doc, {
      startY: state.y,
      head: [["Region", "Attractiveness", "Score", "Market Size", "Growth"]],
      body: report.regionalAnalysis.map((r) => [
        r.regionLabel,
        r.attractiveness,
        String(r.attractivenessScore ?? "—"),
        r.market?.sizeUSD ?? "—",
        r.market?.growthRate ?? "—",
      ]),
      theme: "grid",
      headStyles: { fillColor: STRATEGY_COLOR, textColor: 255 },
      styles: { fontSize: 9, cellPadding: 6 },
      margin: { left: state.margin, right: state.margin },
    });
    state.y = (state.doc as any).lastAutoTable.finalY + 16;

    // One detailed section per region
    for (const region of report.regionalAnalysis) {
      state.doc.addPage();
      state.y = state.margin;
      drawFooter(state);
      sectionHeader(
        state,
        `${region.regionLabel} — ${region.attractiveness} (${region.attractivenessScore}/100)`,
        STRATEGY_COLOR,
      );

      writeDimension(state, autoTable, "Market", [
        ["Size", region.market?.sizeUSD],
        ["Growth", region.market?.growthRate],
        ["Unmet Need", region.market?.unmetNeed],
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
        ["Patent Strength", region.ip?.patentStrength],
        ["FTO Status", region.ip?.ftoStatus],
        ["Est. Exclusivity",
          region.ip?.estimatedExclusivityYears != null
            ? `${region.ip.estimatedExclusivityYears} years`
            : null],
      ], region.ip?.opportunities, region.ip?.expirationRisks);
    }
  }

  // Recommendations
  if (report.recommendations?.length) {
    state.doc.addPage();
    state.y = state.margin;
    drawFooter(state);
    sectionHeader(state, "Prioritized Recommendations", STRATEGY_COLOR);

    autoTable(state.doc, {
      startY: state.y,
      head: [["Rank", "Region", "Structure", "Upfront", "Total", "Royalty", "Timeline"]],
      body: report.recommendations
        .slice()
        .sort((a, b) => a.priorityRank - b.priorityRank)
        .map((r) => [
          String(r.priorityRank),
          r.targetRegion,
          r.recommendedDealStructure ?? "—",
          r.estimatedValue?.upfront ?? "—",
          r.estimatedValue?.total ?? "—",
          r.estimatedValue?.royaltyRange ?? "—",
          r.estimatedTimeline ?? "—",
        ]),
      theme: "grid",
      headStyles: { fillColor: STRATEGY_COLOR, textColor: 255 },
      styles: { fontSize: 8, cellPadding: 5 },
      margin: { left: state.margin, right: state.margin },
    });
    state.y = (state.doc as any).lastAutoTable.finalY + 16;

    for (const r of report.recommendations.slice().sort((a, b) => a.priorityRank - b.priorityRank)) {
      ensureSpace(state, 70);
      subHeader(state, `#${r.priorityRank} — ${r.targetRegion}`, STRATEGY_COLOR);
      paragraph(state, r.rationale ?? "");
      if (r.topPartnerCandidates?.length) {
        tinyLabel(state, "Top Partners");
        paragraph(state, r.topPartnerCandidates.join(" · "));
      }
      if (r.prerequisites?.length) {
        tinyLabel(state, "Prerequisites");
        bullets(state, r.prerequisites);
      }
      if (r.expectedROI) {
        tinyLabel(state, "Expected ROI");
        paragraph(state, r.expectedROI);
      }
    }
  }

  // Portfolio Risks
  if (report.portfolioRisks?.length) {
    state.doc.addPage();
    state.y = state.margin;
    drawFooter(state);
    sectionHeader(state, "Portfolio Risks", STRATEGY_COLOR);
    autoTable(state.doc, {
      startY: state.y,
      head: [["Category", "Risk", "Impact", "Likelihood", "Affected Regions", "Mitigation"]],
      body: report.portfolioRisks.map((r) => [
        r.category,
        r.risk,
        r.impact,
        r.likelihood,
        (r.affectedRegions ?? []).join(", "),
        r.mitigation,
      ]),
      theme: "grid",
      headStyles: { fillColor: STRATEGY_COLOR, textColor: 255 },
      styles: { fontSize: 8, cellPadding: 5 },
      columnStyles: {
        1: { cellWidth: 110 },
        5: { cellWidth: 140 },
      },
      margin: { left: state.margin, right: state.margin },
    });
    state.y = (state.doc as any).lastAutoTable.finalY + 14;
  }

  // Data sources
  if (report.sourcesUsed?.length) {
    sectionHeader(state, "Data Sources", STRATEGY_COLOR);
    paragraph(state, report.sourcesUsed.join(" · "));
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
  subHeader(state, title);
  const filledRows = rows.filter(([, v]) => v != null && v !== "");
  if (filledRows.length) {
    autoTable(state.doc, {
      startY: state.y,
      body: filledRows.map(([k, v]) => [k, v]),
      theme: "plain",
      styles: { fontSize: 9, cellPadding: 4 },
      columnStyles: {
        0: { fontStyle: "bold", textColor: MUTED, cellWidth: 110 },
      },
      margin: { left: state.margin, right: state.margin },
    });
    state.y = (state.doc as any).lastAutoTable.finalY + 4;
  }
  if (positives?.length) {
    tinyLabel(state, "Drivers / Opportunities");
    bullets(state, positives);
  }
  if (negatives?.length) {
    tinyLabel(state, "Barriers / Risks");
    bullets(state, negatives);
  }
  state.y += 4;
}

// ─── Execution plan PDF ────────────────────────────────────────────────────

export async function exportExecutionPlanPDF(
  plan: ExecutionPlanOutput,
  assetName: string,
) {
  const { jsPDF, autoTable } = await loadPdfDeps();
  const state = newPdf(jsPDF);

  coverPage(
    state,
    "Execution Plan",
    `${plan.totalDurationWeeks}-week timeline · ${plan.phases?.length ?? 0} phases · ${plan.stakeholders?.length ?? 0} stakeholders`,
    assetName,
    EXEC_COLOR,
  );

  // Overview
  sectionHeader(state, "Overview", EXEC_COLOR);
  paragraph(state, plan.overview);

  // Phases
  if (plan.phases?.length) {
    sectionHeader(state, "Phased Timeline", EXEC_COLOR);
    autoTable(state.doc, {
      startY: state.y,
      head: [["#", "Phase", "Pillar", "Start", "End", "Owner"]],
      body: plan.phases.map((p, i) => [
        String(i + 1),
        p.name,
        p.pillar,
        `W${p.startWeek}`,
        `W${p.endWeek}`,
        p.owner,
      ]),
      theme: "grid",
      headStyles: { fillColor: EXEC_COLOR, textColor: 255 },
      styles: { fontSize: 9, cellPadding: 6 },
      margin: { left: state.margin, right: state.margin },
    });
    state.y = (state.doc as any).lastAutoTable.finalY + 16;

    // Phase detail (one mini-section each)
    for (const p of plan.phases) {
      ensureSpace(state, 80);
      subHeader(state, `${p.name} — Weeks ${p.startWeek}–${p.endWeek} (${p.pillar})`, EXEC_COLOR);
      paragraph(state, p.description ?? "");
      tinyLabel(state, "Owner");
      paragraph(state, p.owner);
      if (p.contributors?.length) {
        tinyLabel(state, "Contributors");
        paragraph(state, p.contributors.join(" · "));
      }
      if (p.deliverables?.length) {
        tinyLabel(state, "Deliverables");
        bullets(state, p.deliverables);
      }
      if (p.successCriteria) {
        tinyLabel(state, "Success Criteria");
        paragraph(state, p.successCriteria);
      }
    }
  }

  // Stakeholders
  if (plan.stakeholders?.length) {
    state.doc.addPage();
    state.y = state.margin;
    drawFooter(state);
    sectionHeader(state, "Stakeholder Matrix", EXEC_COLOR);
    autoTable(state.doc, {
      startY: state.y,
      head: [["Role", "Involvement", "Internal/External", "Phases", "Key Responsibilities"]],
      body: plan.stakeholders.map((s) => [
        s.role,
        s.involvement,
        s.internalOrExternal,
        String(s.phaseIds?.length ?? 0),
        (s.responsibilities ?? []).join("; "),
      ]),
      theme: "grid",
      headStyles: { fillColor: EXEC_COLOR, textColor: 255 },
      styles: { fontSize: 8, cellPadding: 5 },
      columnStyles: { 4: { cellWidth: 220 } },
      margin: { left: state.margin, right: state.margin },
    });
    state.y = (state.doc as any).lastAutoTable.finalY + 14;
  }

  // Critical Milestones
  if (plan.criticalMilestones?.length) {
    sectionHeader(state, "Critical Milestones", EXEC_COLOR);
    autoTable(state.doc, {
      startY: state.y,
      head: [["Week", "Milestone", "Owner", "Deliverable"]],
      body: plan.criticalMilestones
        .slice()
        .sort((a, b) => a.week - b.week)
        .map((m) => [`W${m.week}`, m.milestone, m.owner, m.deliverable]),
      theme: "striped",
      headStyles: { fillColor: EXEC_COLOR, textColor: 255 },
      styles: { fontSize: 9, cellPadding: 5 },
      margin: { left: state.margin, right: state.margin },
    });
    state.y = (state.doc as any).lastAutoTable.finalY + 14;
  }

  // Risks
  if (plan.risks?.length) {
    sectionHeader(state, "Risk Register", EXEC_COLOR);
    autoTable(state.doc, {
      startY: state.y,
      head: [["Risk", "Impact", "Likelihood", "Mitigation", "Owner"]],
      body: plan.risks.map((r) => [
        r.risk,
        r.impact,
        r.likelihood,
        r.mitigation,
        r.owner,
      ]),
      theme: "grid",
      headStyles: { fillColor: EXEC_COLOR, textColor: 255 },
      styles: { fontSize: 8, cellPadding: 5 },
      columnStyles: { 0: { cellWidth: 130 }, 3: { cellWidth: 180 } },
      margin: { left: state.margin, right: state.margin },
    });
    state.y = (state.doc as any).lastAutoTable.finalY + 14;
  }

  // Connections
  if (plan.connections?.length) {
    sectionHeader(state, "Phase Connections", EXEC_COLOR);
    autoTable(state.doc, {
      startY: state.y,
      head: [["From", "To", "Type", "Why"]],
      body: plan.connections.map((c) => {
        const fromPhase = plan.phases?.find((p) => p.id === c.from)?.name ?? c.from;
        const toPhase = plan.phases?.find((p) => p.id === c.to)?.name ?? c.to;
        return [fromPhase, toPhase, c.type, c.description];
      }),
      theme: "striped",
      headStyles: { fillColor: EXEC_COLOR, textColor: 255 },
      styles: { fontSize: 8, cellPadding: 5 },
      columnStyles: { 3: { cellWidth: 240 } },
      margin: { left: state.margin, right: state.margin },
    });
    state.y = (state.doc as any).lastAutoTable.finalY + 14;
  }

  state.doc.save(`${safeFilename(assetName)}_Execution_Plan.pdf`);
}

// ─── PowerPoint deck ───────────────────────────────────────────────────────

const PPT_PALETTE = {
  bg: "FFFFFF",
  text: "1A1A2E",
  muted: "64748B",
  border: "E2E8F0",
  strategy: "0EA5E9",
  exec: "F97316",
  primary: "F97316",
  green: "10B981",
  red: "EF4444",
  amber: "F59E0B",
};

export async function exportClientDeck(
  assetName: string,
  strategy: OutLicensingReport | null,
  plan: ExecutionPlanOutput | null,
) {
  const PptxGenJS = (await import("pptxgenjs")).default;
  const pptx = new PptxGenJS();
  pptx.layout = "LAYOUT_WIDE"; // 13.33 × 7.5 in
  pptx.title = `${assetName} — Out-Licensing Briefing`;
  pptx.company = BRAND;

  // ─── Slide 1: Title ───────────────────────────────────────────────────────
  {
    const slide = pptx.addSlide();
    slide.background = { color: PPT_PALETTE.bg };
    slide.addShape("rect", { x: 0, y: 0, w: 13.33, h: 0.12, fill: { color: PPT_PALETTE.primary } });
    slide.addText(BRAND.toUpperCase(), {
      x: 0.6, y: 0.5, w: 12, h: 0.4,
      fontFace: "Calibri", fontSize: 12, color: PPT_PALETTE.muted, bold: true, charSpacing: 3,
    });
    slide.addText("Out-Licensing Briefing", {
      x: 0.6, y: 1.5, w: 12, h: 0.8,
      fontFace: "Calibri", fontSize: 20, color: PPT_PALETTE.muted,
    });
    slide.addText(assetName, {
      x: 0.6, y: 2.4, w: 12, h: 1.6,
      fontFace: "Calibri", fontSize: 48, bold: true, color: PPT_PALETTE.text, valign: "top",
    });
    slide.addText(
      "Strategy Report · Execution Plan · Recommended Actions",
      { x: 0.6, y: 4.3, w: 12, h: 0.5, fontFace: "Calibri", fontSize: 18, color: PPT_PALETTE.muted },
    );
    slide.addText(TODAY(), {
      x: 0.6, y: 6.5, w: 12, h: 0.4,
      fontFace: "Calibri", fontSize: 12, color: PPT_PALETTE.muted, italic: true,
    });
    slide.addText("Confidential", {
      x: 0.6, y: 6.9, w: 12, h: 0.3,
      fontFace: "Calibri", fontSize: 10, color: PPT_PALETTE.muted,
    });
  }

  // ─── Slide 2: Executive Summary ───────────────────────────────────────────
  if (strategy?.executiveSummary) {
    const slide = pptx.addSlide();
    addHeader(slide, "Executive Summary", PPT_PALETTE.strategy);
    slide.addText(strategy.executiveSummary, {
      x: 0.6, y: 1.4, w: 12.1, h: 5.5,
      fontFace: "Calibri", fontSize: 16, color: PPT_PALETTE.text, valign: "top",
      paraSpaceAfter: 8,
    });
  }

  // ─── Slide 3: Asset Profile ───────────────────────────────────────────────
  if (strategy?.assetProfile) {
    const p = strategy.assetProfile;
    const slide = pptx.addSlide();
    addHeader(slide, "Asset Profile", PPT_PALETTE.strategy);

    slide.addText(p.name, {
      x: 0.6, y: 1.3, w: 12.1, h: 0.5,
      fontFace: "Calibri", fontSize: 22, bold: true, color: PPT_PALETTE.text,
    });
    slide.addText(p.description, {
      x: 0.6, y: 1.9, w: 12.1, h: 1.3,
      fontFace: "Calibri", fontSize: 12, color: PPT_PALETTE.muted, valign: "top",
    });

    const facts: [string, string][] = [
      ["Modality", p.modality ?? "—"],
      ["Therapeutic Area", p.therapeuticArea ?? "—"],
      ["Stage", p.developmentStage ?? "—"],
      ["Mechanism", p.mechanism ?? "—"],
    ];
    facts.forEach(([label, value], i) => {
      const x = 0.6 + (i % 2) * 6.2;
      const y = 3.4 + Math.floor(i / 2) * 0.9;
      slide.addText(label.toUpperCase(), {
        x, y, w: 6, h: 0.3, fontFace: "Calibri", fontSize: 10, bold: true,
        color: PPT_PALETTE.muted, charSpacing: 2,
      });
      slide.addText(value, {
        x, y: y + 0.3, w: 6, h: 0.5, fontFace: "Calibri", fontSize: 14, color: PPT_PALETTE.text,
      });
    });

    if (p.keyStrengths?.length) {
      slide.addText("Key Strengths", {
        x: 0.6, y: 5.4, w: 6, h: 0.3, fontFace: "Calibri", fontSize: 11, bold: true,
        color: PPT_PALETTE.green, charSpacing: 2,
      });
      slide.addText(
        p.keyStrengths.map((s) => ({ text: s, options: { bullet: true, fontSize: 12, color: PPT_PALETTE.text } })),
        { x: 0.6, y: 5.7, w: 6, h: 1.5, fontFace: "Calibri", valign: "top" },
      );
    }
    if (p.keyChallenges?.length) {
      slide.addText("Key Challenges", {
        x: 7, y: 5.4, w: 6, h: 0.3, fontFace: "Calibri", fontSize: 11, bold: true,
        color: PPT_PALETTE.amber, charSpacing: 2,
      });
      slide.addText(
        p.keyChallenges.map((s) => ({ text: s, options: { bullet: true, fontSize: 12, color: PPT_PALETTE.text } })),
        { x: 7, y: 5.7, w: 6, h: 1.5, fontFace: "Calibri", valign: "top" },
      );
    }
  }

  // ─── Slide 4: Regional Opportunity Matrix ─────────────────────────────────
  if (strategy?.regionalAnalysis?.length) {
    const slide = pptx.addSlide();
    addHeader(slide, "Regional Opportunity Matrix", PPT_PALETTE.strategy);

    const rows: any[][] = [
      [
        { text: "Region", options: cellHead() },
        { text: "Attractiveness", options: cellHead() },
        { text: "Score", options: cellHead() },
        { text: "Market", options: cellHead() },
        { text: "Growth", options: cellHead() },
        { text: "Patent", options: cellHead() },
        { text: "FTO", options: cellHead() },
      ],
      ...strategy.regionalAnalysis.map((r) => [
        { text: r.regionLabel, options: cellBody({ bold: true }) },
        { text: r.attractiveness, options: cellBody({ color: attractivenessColor(r.attractiveness) }) },
        { text: String(r.attractivenessScore ?? "—"), options: cellBody({ bold: true }) },
        { text: r.market?.sizeUSD ?? "—", options: cellBody() },
        { text: r.market?.growthRate ?? "—", options: cellBody() },
        { text: r.ip?.patentStrength ?? "—", options: cellBody() },
        { text: r.ip?.ftoStatus ?? "—", options: cellBody() },
      ]),
    ];
    slide.addTable(rows, {
      x: 0.6, y: 1.3, w: 12.1,
      colW: [2.0, 1.8, 1.0, 1.7, 1.7, 1.6, 2.3],
      border: { type: "solid", pt: 0.5, color: PPT_PALETTE.border },
      fontFace: "Calibri",
    });
  }

  // ─── One slide per region (4-dimension assessment) ─────────────────────────
  if (strategy?.regionalAnalysis?.length) {
    for (const region of strategy.regionalAnalysis) {
      const slide = pptx.addSlide();
      addHeader(
        slide,
        `${region.regionLabel} — ${region.attractiveness} (${region.attractivenessScore}/100)`,
        PPT_PALETTE.strategy,
      );

      const quads: { title: string; color: string; lines: string[] }[] = [
        {
          title: "📈 Market",
          color: "3B82F6",
          lines: [
            region.market?.sizeUSD ? `Size: ${region.market.sizeUSD}` : "",
            region.market?.growthRate ? `Growth: ${region.market.growthRate}` : "",
            region.market?.unmetNeed ? `Unmet need: ${region.market.unmetNeed}` : "",
          ].filter(Boolean),
        },
        {
          title: "⚖️ Legal",
          color: "A855F7",
          lines: [
            region.legal?.regulatoryAuthority ? `Authority: ${region.legal.regulatoryAuthority}` : "",
            region.legal?.pathway ? `Pathway: ${region.legal.pathway}` : "",
            region.legal?.estimatedTimeline ? `Timeline: ${region.legal.estimatedTimeline}` : "",
          ].filter(Boolean),
        },
        {
          title: "🏢 Commercial",
          color: "10B981",
          lines: [
            region.commercial?.competitorActivity ? `Competitors: ${truncate(region.commercial.competitorActivity, 140)}` : "",
            region.commercial?.pricingDynamics ? `Pricing: ${truncate(region.commercial.pricingDynamics, 120)}` : "",
            region.commercial?.keyPartnerCandidates?.length
              ? `Partners: ${region.commercial.keyPartnerCandidates.slice(0, 4).join(", ")}`
              : "",
          ].filter(Boolean),
        },
        {
          title: "🛡️ IP",
          color: "F97316",
          lines: [
            region.ip?.patentStrength ? `Patent: ${region.ip.patentStrength}` : "",
            region.ip?.ftoStatus ? `FTO: ${region.ip.ftoStatus}` : "",
            region.ip?.estimatedExclusivityYears != null
              ? `Exclusivity: ${region.ip.estimatedExclusivityYears} years`
              : "",
          ].filter(Boolean),
        },
      ];

      quads.forEach((q, i) => {
        const x = 0.6 + (i % 2) * 6.2;
        const y = 1.3 + Math.floor(i / 2) * 2.95;
        slide.addShape("rect", {
          x, y, w: 6, h: 2.7,
          fill: { color: "FAFAFA" },
          line: { color: PPT_PALETTE.border, width: 0.5 },
        });
        slide.addText(q.title, {
          x: x + 0.2, y: y + 0.15, w: 5.7, h: 0.4,
          fontFace: "Calibri", fontSize: 14, bold: true, color: q.color,
        });
        slide.addText(
          q.lines.length
            ? q.lines.map((t) => ({ text: t, options: { bullet: true, fontSize: 11, color: PPT_PALETTE.text } }))
            : [{ text: "No data available", options: { fontSize: 11, italic: true, color: PPT_PALETTE.muted } }],
          { x: x + 0.25, y: y + 0.6, w: 5.7, h: 2.0, fontFace: "Calibri", valign: "top", paraSpaceAfter: 4 },
        );
      });
    }
  }

  // ─── Slide: Recommendations ────────────────────────────────────────────────
  if (strategy?.recommendations?.length) {
    const slide = pptx.addSlide();
    addHeader(slide, "Prioritized Recommendations", PPT_PALETTE.strategy);

    const sorted = strategy.recommendations.slice().sort((a, b) => a.priorityRank - b.priorityRank);
    const headRow = [
      { text: "#", options: cellHead() },
      { text: "Region", options: cellHead() },
      { text: "Structure", options: cellHead() },
      { text: "Upfront", options: cellHead() },
      { text: "Total", options: cellHead() },
      { text: "Royalty", options: cellHead() },
      { text: "Top Partners", options: cellHead() },
    ];
    const rows: any[][] = [
      headRow,
      ...sorted.map((r) => [
        { text: String(r.priorityRank), options: cellBody({ bold: true, color: PPT_PALETTE.primary }) },
        { text: r.targetRegion, options: cellBody({ bold: true }) },
        { text: r.recommendedDealStructure ?? "—", options: cellBody() },
        { text: r.estimatedValue?.upfront ?? "—", options: cellBody({ fontSize: 11, color: "059669" }) },
        { text: r.estimatedValue?.total ?? "—", options: cellBody({ fontSize: 11, color: "059669" }) },
        { text: r.estimatedValue?.royaltyRange ?? "—", options: cellBody({ fontSize: 11, color: "059669" }) },
        { text: (r.topPartnerCandidates ?? []).slice(0, 3).join(", ") || "—", options: cellBody() },
      ]),
    ];
    slide.addTable(rows, {
      x: 0.6, y: 1.3, w: 12.1,
      colW: [0.6, 1.3, 2.5, 1.4, 1.4, 1.4, 3.5],
      border: { type: "solid", pt: 0.5, color: PPT_PALETTE.border },
      fontFace: "Calibri",
    });
  }

  // ─── Slide: Top-1 Recommendation Detail ────────────────────────────────────
  if (strategy?.recommendations?.length) {
    const top = strategy.recommendations.slice().sort((a, b) => a.priorityRank - b.priorityRank)[0];
    const slide = pptx.addSlide();
    addHeader(slide, `#${top.priorityRank} Priority — ${top.targetRegion}`, PPT_PALETTE.strategy);
    slide.addText(top.rationale ?? "", {
      x: 0.6, y: 1.3, w: 12.1, h: 2.5,
      fontFace: "Calibri", fontSize: 14, color: PPT_PALETTE.text, valign: "top",
    });

    // Value cards
    const valueX = 0.6;
    const valueY = 4.1;
    const cards: [string, string][] = [
      ["UPFRONT", top.estimatedValue?.upfront ?? "—"],
      ["TOTAL DEAL VALUE", top.estimatedValue?.total ?? "—"],
      ["ROYALTY RANGE", top.estimatedValue?.royaltyRange ?? "—"],
    ];
    cards.forEach(([label, value], i) => {
      const x = valueX + i * 4.1;
      slide.addShape("rect", {
        x, y: valueY, w: 3.9, h: 1.5,
        fill: { color: "ECFDF5" },
        line: { color: "10B981", width: 1 },
      });
      slide.addText(label, {
        x: x + 0.2, y: valueY + 0.15, w: 3.5, h: 0.3,
        fontFace: "Calibri", fontSize: 10, bold: true, color: "059669", charSpacing: 2,
      });
      slide.addText(value, {
        x: x + 0.2, y: valueY + 0.45, w: 3.5, h: 1.0,
        fontFace: "Calibri", fontSize: 26, bold: true, color: "065F46", valign: "top",
      });
    });

    if (top.topPartnerCandidates?.length) {
      slide.addText("TOP PARTNERS", {
        x: 0.6, y: 5.9, w: 6, h: 0.3, fontFace: "Calibri", fontSize: 10, bold: true,
        color: PPT_PALETTE.muted, charSpacing: 2,
      });
      slide.addText(top.topPartnerCandidates.join(" · "), {
        x: 0.6, y: 6.2, w: 6, h: 0.5, fontFace: "Calibri", fontSize: 14, color: PPT_PALETTE.text,
      });
    }
    if (top.estimatedTimeline) {
      slide.addText("TIMELINE", {
        x: 7, y: 5.9, w: 6, h: 0.3, fontFace: "Calibri", fontSize: 10, bold: true,
        color: PPT_PALETTE.muted, charSpacing: 2,
      });
      slide.addText(top.estimatedTimeline, {
        x: 7, y: 6.2, w: 6, h: 0.5, fontFace: "Calibri", fontSize: 14, color: PPT_PALETTE.text,
      });
    }
  }

  // ─── Slide: Execution Timeline (Gantt) ─────────────────────────────────────
  if (plan?.phases?.length) {
    const slide = pptx.addSlide();
    addHeader(slide, "Execution Timeline", PPT_PALETTE.exec);

    slide.addText(plan.overview, {
      x: 0.6, y: 1.3, w: 12.1, h: 0.9,
      fontFace: "Calibri", fontSize: 12, color: PPT_PALETTE.muted, valign: "top",
    });

    const totalWeeks = Math.max(plan.totalDurationWeeks, ...plan.phases.map((p) => p.endWeek), 1);
    const trackX = 4.0;
    const trackY = 2.5;
    const trackW = 8.5;
    const rowH = 0.42;
    const maxPhases = 9;
    const phases = plan.phases.slice(0, maxPhases);

    // Week scale
    [0, 0.25, 0.5, 0.75, 1].forEach((p) => {
      slide.addText(`W${Math.round(totalWeeks * p)}`, {
        x: trackX + trackW * p - 0.3, y: trackY - 0.35, w: 0.6, h: 0.25,
        fontFace: "Calibri", fontSize: 9, color: PPT_PALETTE.muted, align: "center",
      });
    });

    phases.forEach((p, i) => {
      const y = trackY + i * rowH;
      // Label
      slide.addText(`${(i + 1).toString().padStart(2, "0")}. ${truncate(p.name, 38)}`, {
        x: 0.6, y, w: 3.3, h: rowH,
        fontFace: "Calibri", fontSize: 10, color: PPT_PALETTE.text, valign: "middle",
      });
      // Track
      slide.addShape("rect", {
        x: trackX, y: y + 0.08, w: trackW, h: rowH - 0.16,
        fill: { color: "F8F9FA" }, line: { color: PPT_PALETTE.border, width: 0.25 },
      });
      // Bar
      const left = trackX + (p.startWeek / totalWeeks) * trackW;
      const width = Math.max(((p.endWeek - p.startWeek) / totalWeeks) * trackW, 0.15);
      slide.addShape("rect", {
        x: left, y: y + 0.08, w: width, h: rowH - 0.16,
        fill: { color: pillarColor(p.pillar) },
        line: { type: "none" },
      });
    });

    // Legend
    const legendY = trackY + Math.min(phases.length, maxPhases) * rowH + 0.3;
    ["Diagnosis", "Strategy", "Execution"].forEach((pillar, i) => {
      slide.addShape("rect", {
        x: 0.6 + i * 2.5, y: legendY, w: 0.2, h: 0.2,
        fill: { color: pillarColor(pillar) },
        line: { type: "none" },
      });
      slide.addText(pillar, {
        x: 0.85 + i * 2.5, y: legendY - 0.05, w: 2.2, h: 0.3,
        fontFace: "Calibri", fontSize: 10, color: PPT_PALETTE.text,
      });
    });
  }

  // ─── Slide: Stakeholders ───────────────────────────────────────────────────
  if (plan?.stakeholders?.length) {
    const slide = pptx.addSlide();
    addHeader(slide, "Stakeholder Matrix", PPT_PALETTE.exec);

    const rows: any[][] = [
      [
        { text: "Role", options: cellHead() },
        { text: "Involvement", options: cellHead() },
        { text: "Int / Ext", options: cellHead() },
        { text: "Key Responsibility", options: cellHead() },
      ],
      ...plan.stakeholders.slice(0, 10).map((s) => [
        { text: s.role, options: cellBody({ bold: true }) },
        { text: s.involvement, options: cellBody({ color: involvementColor(s.involvement) }) },
        { text: s.internalOrExternal, options: cellBody() },
        { text: (s.responsibilities ?? [])[0] ?? "—", options: cellBody({ fontSize: 10 }) },
      ]),
    ];
    slide.addTable(rows, {
      x: 0.6, y: 1.3, w: 12.1,
      colW: [3.0, 1.8, 1.5, 5.8],
      border: { type: "solid", pt: 0.5, color: PPT_PALETTE.border },
      fontFace: "Calibri",
    });
  }

  // ─── Slide: Critical Milestones ────────────────────────────────────────────
  if (plan?.criticalMilestones?.length) {
    const slide = pptx.addSlide();
    addHeader(slide, "Critical Milestones", PPT_PALETTE.exec);

    const sorted = plan.criticalMilestones.slice().sort((a, b) => a.week - b.week);
    slide.addText(
      sorted.map((m) => ({
        text: `Week ${m.week} — ${m.milestone}  ·  ${m.owner}  ·  ${m.deliverable}`,
        options: { bullet: { code: "25B6" }, fontSize: 14, color: PPT_PALETTE.text, paraSpaceAfter: 8 },
      })),
      { x: 0.6, y: 1.3, w: 12.1, h: 5.5, fontFace: "Calibri", valign: "top" },
    );
  }

  // ─── Slide: Combined Critical Risks ────────────────────────────────────────
  const allRisks: { label: string; impact?: string; mitigation?: string; source: string }[] = [];
  for (const r of strategy?.portfolioRisks ?? []) {
    allRisks.push({ label: r.risk, impact: r.impact, mitigation: r.mitigation, source: r.category });
  }
  for (const r of plan?.risks ?? []) {
    allRisks.push({ label: r.risk, impact: r.impact, mitigation: r.mitigation, source: "Execution" });
  }
  if (allRisks.length) {
    const slide = pptx.addSlide();
    addHeader(slide, "Critical Risks", PPT_PALETTE.red);
    const top = allRisks.filter((r) => r.impact === "High").slice(0, 6);
    const list = top.length ? top : allRisks.slice(0, 6);
    slide.addText(
      list.map((r) => ({
        text: `[${r.source}${r.impact ? " · " + r.impact : ""}] ${r.label}\n   → ${r.mitigation ?? "—"}`,
        options: { bullet: true, fontSize: 12, color: PPT_PALETTE.text, paraSpaceAfter: 10 },
      })),
      { x: 0.6, y: 1.3, w: 12.1, h: 5.5, fontFace: "Calibri", valign: "top" },
    );
  }

  // ─── Slide: Next Steps ─────────────────────────────────────────────────────
  {
    const slide = pptx.addSlide();
    addHeader(slide, "Recommended Next Steps", PPT_PALETTE.primary);

    const steps: string[] = [];
    if (strategy?.recommendations?.length) {
      const top = strategy.recommendations.slice().sort((a, b) => a.priorityRank - b.priorityRank)[0];
      steps.push(
        `Pursue ${top.recommendedDealStructure ?? "out-licensing"} in ${top.targetRegion} (target ${top.estimatedValue?.total ?? "TBD"})`,
      );
      if (top.topPartnerCandidates?.length) {
        steps.push(`Initiate outreach to: ${top.topPartnerCandidates.slice(0, 3).join(", ")}`);
      }
      if (top.prerequisites?.length) {
        steps.push(`Complete prerequisites: ${top.prerequisites.slice(0, 2).join("; ")}`);
      }
    }
    if (plan?.phases?.length) {
      steps.push(
        `Kick off Phase 1 (${plan.phases[0].name}) — owner: ${plan.phases[0].owner}, duration: weeks ${plan.phases[0].startWeek}–${plan.phases[0].endWeek}`,
      );
    }
    if (plan?.criticalMilestones?.length) {
      const next = plan.criticalMilestones.slice().sort((a, b) => a.week - b.week)[0];
      steps.push(`First critical milestone: Week ${next.week} — ${next.milestone}`);
    }
    steps.push("Schedule weekly progress reviews with the BD/Exec steering committee");

    slide.addText(
      steps.map((s, i) => ({
        text: `${i + 1}.  ${s}`,
        options: { fontSize: 16, color: PPT_PALETTE.text, paraSpaceAfter: 14 },
      })),
      { x: 0.6, y: 1.4, w: 12.1, h: 5.5, fontFace: "Calibri", valign: "top" },
    );

    slide.addText(`${BRAND} · ${TODAY()} · Confidential`, {
      x: 0.6, y: 6.9, w: 12.1, h: 0.3,
      fontFace: "Calibri", fontSize: 9, color: PPT_PALETTE.muted, italic: true,
    });
  }

  await pptx.writeFile({ fileName: `${safeFilename(assetName)}_Briefing.pptx` });
}

// ─── PPT helpers ───────────────────────────────────────────────────────────

function addHeader(slide: any, title: string, accentHex: string) {
  slide.background = { color: PPT_PALETTE.bg };
  slide.addShape("rect", { x: 0, y: 0, w: 13.33, h: 0.12, fill: { color: accentHex } });
  slide.addText(title, {
    x: 0.6, y: 0.4, w: 12.1, h: 0.6,
    fontFace: "Calibri", fontSize: 24, bold: true, color: PPT_PALETTE.text,
  });
  slide.addText(`${BRAND}`, {
    x: 0.6, y: 6.9, w: 6, h: 0.3,
    fontFace: "Calibri", fontSize: 9, color: PPT_PALETTE.muted,
  });
  slide.addText(TODAY(), {
    x: 7, y: 6.9, w: 6, h: 0.3,
    fontFace: "Calibri", fontSize: 9, color: PPT_PALETTE.muted, align: "right",
  });
}

function cellHead(): any {
  return {
    bold: true,
    fontSize: 11,
    color: "FFFFFF",
    fill: { color: PPT_PALETTE.text },
    align: "left",
    valign: "middle",
    fontFace: "Calibri",
  };
}

function cellBody(extra: any = {}): any {
  return {
    fontSize: 12,
    color: PPT_PALETTE.text,
    valign: "middle",
    fontFace: "Calibri",
    ...extra,
  };
}

function attractivenessColor(level: string): string {
  switch (level) {
    case "Very High": return "059669";
    case "High": return "2563EB";
    case "Medium": return "D97706";
    default: return "DC2626";
  }
}

function involvementColor(level: string): string {
  switch (level) {
    case "Lead": return "F97316";
    case "Contributor": return "3B82F6";
    case "Approver": return "10B981";
    default: return "64748B";
  }
}

function pillarColor(pillar: string): string {
  switch (pillar) {
    case "Diagnosis": return "3B82F6";
    case "Strategy": return "10B981";
    case "Execution": return "F97316";
    default: return "64748B";
  }
}

function truncate(s: string, max: number): string {
  return s.length <= max ? s : s.slice(0, max - 1) + "…";
}
