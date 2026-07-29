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
import type { Strategy, Diagnosis, DimensionScore, MarketScore, EvidenceItem } from "@/types/run";
import { OFF_PATENT_DIMENSIONS, INNOVATIVE_DIMENSIONS } from "@/config/dimensions";
import { countryByCode } from "@/config/geographies";

/** What the user chose to include. All default to true. */
export interface ExportOptions {
  /** Per-market detail in the appendix. */
  includeMarkets?: boolean;
  /** Evidence tables in the appendix. */
  includeEvidence?: boolean;
  /** Detail behind the summary. Default true; false yields a summary-only file. */
  includeAppendix?: boolean;
}

/**
 * Every deliverable is built in two parts: a short decision-ready summary a
 * reader can stop at, and — behind one unmistakable divider — the full detail
 * the summary was drawn from. Appendix sections are numbered A1, A2, … so the
 * reader always knows which part they are in, and the word "Appendix" itself is
 * reserved for the divider so it stays findable.
 */
const APPENDIX_LINE =
  "Everything the summary is drawn from: per-market detail, all ten levers, the evidence and the sources.";

/** Numbers appendix sections in emission order: A1, A2, A3 … */
function appendixCounter(): (label: string) => string {
  let n = 0;
  return (label: string) => `A${++n} — ${label}`;
}

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

const truncate = (s: string, max: number): string => {
  if (!s) return "";
  if (s.length <= max) return s;
  const cut = s.slice(0, max - 1);
  const sp = cut.lastIndexOf(" ");
  return (sp > max * 0.55 ? cut.slice(0, sp) : cut).replace(/[\s,;:.–-]+$/, "") + "…";
};

// The standard PDF (WinAnsi) fonts can't encode glyphs like "→" — they render as
// mojibake. Map the common ones to safe equivalents, then strip anything else
// outside the WinAnsi-renderable range so the PDF never shows garbage.
const PDF_GLYPHS: [RegExp, string][] = [
  [/[→⟶➔➙➜⇒▶⮕]/g, ">"],
  [/[←⇐]/g, "<"],
  [/[↔↕⬌]/g, "-"],
  [/[•●■▪⁃∙·]/g, "-"],
  [/[○◦]/g, "o"],
  [/[✓✔]/g, "v"],
  [/[‘’‛]/g, "'"],
  [/[“”‟]/g, '"'],
  [/[–—]/g, "-"],
  [/[…]/g, "..."],
  [/[   ]/g, " "],
];

/**
 * Letters that must survive as words, not as stripped stems. jsPDF's standard
 * fonts are WinAnsi, and the text was reaching them as UTF-8 — so "genetiques
 * repertoire" arrived as "gA©nA©riques rA©pertoire" in a client deck. German
 * takes its conventional two-letter forms; everything else decomposes to its
 * base letter.
 */
const PDF_LETTERS: [RegExp, string][] = [
  [/ß/g, "ss"],
  [/ä/g, "ae"],
  [/ö/g, "oe"],
  [/ü/g, "ue"],
  [/æ/g, "ae"], [/Æ/g, "AE"],
  [/œ/g, "oe"], [/Œ/g, "OE"],
  [/ø/g, "o"],  [/Ø/g, "O"],
  [/å/g, "aa"], [/Å/g, "Aa"],
  [/ł/g, "l"],  [/Ł/g, "L"],
  [/ð/g, "d"],  [/þ/g, "th"],
  [/€/g, "EUR"], [/£/g, "GBP"], [/¥/g, "JPY"],
];

/**
 * Everything written into a PDF goes through here. The output is pure ASCII,
 * which the standard fonts can always render — anything richer silently turned
 * into mojibake, which is worse than a transliteration because it is unreadable
 * rather than merely approximate.
 */
/**
 * A capital umlaut expands differently depending on the word around it:
 * "PACKUNGSGROESSEN" in an all-caps heading, "Oesterreich" in running text.
 * A flat mapping gets one of the two wrong every time, so look at what follows.
 */
function expandCapitalUmlauts(s: string): string {
  return s.replace(/[ÄÖÜ]([A-ZÄÖÜß]||$)?/g, (_m, next = "") => {
    const base = _m[0] === "Ä" ? "A" : _m[0] === "Ö" ? "O" : "U";
    const shouting = typeof next === "string" && next !== "" && next === next.toUpperCase() && /[A-Z]/.test(next);
    return (shouting ? `${base}E` : `${base}e`) + (next ?? "");
  });
}

export function pdfSafe(s: any): string {
  let out = String(s ?? "");
  out = expandCapitalUmlauts(out);
  for (const [re, rep] of PDF_GLYPHS) out = out.replace(re, rep);
  for (const [re, rep] of PDF_LETTERS) out = out.replace(re, rep);
  // Decompose the remaining accents and drop the combining marks, so
  // "repertoire" keeps its letters instead of losing them to the strip below.
  out = out.normalize("NFD").replace(new RegExp("[\\u0300-\\u036f]", "g"), "");
  return out.replace(new RegExp("[^\\x09\\x0A\\x0D\\x20-\\x7E]", "g"), "");
}


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
  decoratedPages: Set<number>;
}

const HEADER_TOP = 88;   // content start on decorated pages
const FOOTER_PAD = 84;   // reserve ≥ 2 cm clear at the page bottom

function newPdf(jsPDF: any, reportName: string, asset: string, accent: string): PdfState {
  const doc = new jsPDF({ unit: "pt", format: "letter", compress: true });

  // Sanitise at the lowest level rather than at every call site. The standard
  // fonts are WinAnsi, so a stray non-ASCII character renders as mojibake — and
  // it only takes one helper that forgets pdfSafe (or one that uppercases after
  // it, turning "fuer" back into "FÜR") for that to reach a client deck. Here,
  // nothing can bypass it.
  const rawText = doc.text.bind(doc);
  doc.text = (text: any, ...rest: any[]) =>
    rawText(Array.isArray(text) ? text.map(pdfSafe) : pdfSafe(text), ...rest);

  return {
    doc,
    y: HEADER_TOP,
    pageWidth: doc.internal.pageSize.getWidth(),
    pageHeight: doc.internal.pageSize.getHeight(),
    margin: 56,
    reportName,
    asset,
    accent,
    decoratedPages: new Set<number>(),
  };
}

const contentW = (s: PdfState) => s.pageWidth - s.margin * 2;

/** Running header + footer drawn on every content page (not the cover). */
function decorate(state: PdfState) {
  const { doc, pageWidth, pageHeight, margin, accent } = state;

  // Draw the running header/footer EXACTLY ONCE per physical page — autoTable's
  // didDrawPage and newPage() both call this, so without the guard a page with
  // several tables would stamp the header many times.
  const pageNum = doc.internal.getNumberOfPages();
  if (state.decoratedPages.has(pageNum)) return;
  state.decoratedPages.add(pageNum);

  // Top accent hairline + kicker
  doc.setFillColor(accent);
  doc.rect(0, 0, pageWidth, 3, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9.5);
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
  doc.setFontSize(9.5);
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

/** Start the next section on a fresh page — unless this one already is one. */
function pageBreak(state: PdfState) {
  if (state.y > HEADER_TOP + 4) newPage(state);
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
  doc.text(pdfSafe(eyebrow.toUpperCase()), margin, 110, { charSpace: 2 });

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
  const titleLines = doc.splitTextToSize(pdfSafe(title), contentW(state));
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
  const subLines = doc.splitTextToSize(pdfSafe(subtitle), contentW(state));
  doc.text(subLines, margin, cy);
  cy += (subLines.length - 1) * subLH + 30;

  // Asset (the subject) — flows; clamped so it can never reach the KPI band
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.setTextColor(accent);
  doc.text(doc.splitTextToSize(pdfSafe(asset), contentW(state)), margin, Math.min(cy, pageHeight - 290));

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
      doc.setFontSize(9.5);
      doc.setTextColor(MUTED);
      doc.text(pdfSafe(k.label.toUpperCase()), x, bandY + 20, { charSpace: 1 });
      // value — WRAP + shrink to the cell so nothing is clipped or cut mid-word
      const val = pdfSafe(k.value);
      let vfs = 18;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(vfs);
      let vlines = doc.splitTextToSize(val, cellW - 14);
      while (vfs > 9 && vlines.length > 2) { vfs -= 1; doc.setFontSize(vfs); vlines = doc.splitTextToSize(val, cellW - 14); }
      doc.setTextColor(INK);
      doc.text(vlines.slice(0, 2), x, bandY + 42);
    });
    doc.line(margin, bandY + 66, pageWidth - margin, bandY + 66);
  }

  // Meta block
  const metaY = pageHeight - 128;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9.5);
  doc.setTextColor(MUTED);
  doc.text("PREPARED BY", margin, metaY, { charSpace: 1 });
  doc.text("DATE", pageWidth / 2, metaY, { charSpace: 1 });
  doc.setFontSize(11);
  doc.setTextColor(INK);
  doc.text(BRAND, margin, metaY + 18);
  doc.text(TODAY(), pageWidth / 2, metaY + 18);

  // Confidentiality
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9.5);
  doc.setTextColor(FAINT);
  doc.text(
    "Confidential — prepared by CartaOS from public regulatory, clinical and pricing sources. Figures noted as estimates are CartaOS-derived; verify against primary sources before transacting.",
    margin,
    pageHeight - 72,
    { maxWidth: contentW(state) },
  );

  newPage(state);
}

// ─── Section / content primitives ────────────────────────────────────────────

function sectionTitle(state: PdfState, eyebrow: string, title: string, takeaway?: string) {
  // Keep-with-next: a heading may never be the last thing on a page. Reserve the
  // heading itself plus room for the first two lines of whatever follows it.
  ensureSpace(state, (takeaway ? 96 : 64) + 60);
  const { doc, margin } = state;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9.5);
  doc.setTextColor(state.accent);
  doc.text(pdfSafe(eyebrow.toUpperCase()), margin, state.y, { charSpace: 1.6 });

  doc.setFontSize(17);
  doc.setTextColor(INK);
  const titleLines = doc.splitTextToSize(pdfSafe(title), contentW(state));
  doc.text(titleLines, margin, state.y + 18);
  state.y += 18 + titleLines.length * 18;

  if (takeaway) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10.5);
    doc.setTextColor(BODY);
    const tl = doc.splitTextToSize(pdfSafe(takeaway), contentW(state));
    doc.text(tl, margin, state.y + 4);
    state.y += tl.length * 14 + 4;
  }

  doc.setDrawColor(LINE);
  doc.setLineWidth(0.75);
  doc.line(margin, state.y + 6, state.pageWidth - margin, state.y + 6);
  state.y += 20;
}

/**
 * The one page that separates the decision-ready summary from the detail. It
 * always starts a fresh page and always says what is behind it, so a reader who
 * stops at the summary knows exactly what they are choosing not to read.
 */
function appendixDivider(state: PdfState) {
  newPage(state);
  const { doc, margin } = state;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9.5);
  doc.setTextColor(state.accent);
  doc.text("PART 2 OF 2", margin, state.y, { charSpace: 2 });

  doc.setFontSize(30);
  doc.setTextColor(INK);
  doc.text("Appendix", margin, state.y + 40);
  state.y += 40 + 16;

  doc.setDrawColor(GOLD);
  doc.setLineWidth(1.5);
  doc.line(margin, state.y, margin + 64, state.y);
  state.y += 22;

  paragraph(state, APPENDIX_LINE, 11, MUTED);
  paragraph(
    state,
    "Sections are numbered A1 onwards. Nothing in the summary is missing from here; everything here is the basis for something in the summary.",
    9.5,
    MUTED,
  );
}

function lead(state: PdfState, text: string) {
  const { doc, margin } = state;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10.5);
  doc.setTextColor(INK_2);
  const lines = doc.splitTextToSize(pdfSafe(text), contentW(state));
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
  const lines = doc.splitTextToSize(pdfSafe(text), contentW(state));
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
    const lines = doc.splitTextToSize(pdfSafe(item), contentW(state) - 14);
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
  state.doc.text(pdfSafe(label), state.margin, state.y + 13);
  state.y += 22;
}

function tinyLabel(state: PdfState, label: string) {
  ensureSpace(state, 20);
  state.doc.setFont("helvetica", "bold");
  state.doc.setFontSize(9.5);
  state.doc.setTextColor(MUTED);
  state.doc.text(label.toUpperCase(), state.margin, state.y + 11, { charSpace: 1 });
  state.y += 16;
}

function sourceNote(state: PdfState, text: string) {
  if (!text) return;
  ensureSpace(state, 20);
  state.doc.setFont("helvetica", "italic");
  state.doc.setFontSize(9.5);
  state.doc.setTextColor(FAINT);
  const lines = state.doc.splitTextToSize(pdfSafe(`Source: ${text}`), contentW(state));
  state.doc.text(lines, state.margin, state.y + 11);
  state.y += lines.length * 13 + 6;
}

/** Shared table renderer — navy header, horizontal rules, zebra, auto header/footer. */
function table(state: PdfState, opts: any, autoTable: any) {
  // Sanitize every string cell so no glyph (e.g. "→") renders as mojibake.
  const san = (rows: any) =>
    Array.isArray(rows) ? rows.map((r: any[]) => r.map((c) => (typeof c === "string" ? pdfSafe(c) : c))) : rows;
  opts = { ...opts, body: san(opts.body), head: san(opts.head) };
  // Nothing a reader must read drops below 9.5pt — call sites that ask for
  // smaller are clamped here rather than each being chased individually.
  //
  // The fixed column widths are also normalised: at 9.5pt a set of widths that
  // was comfortable at 8.5pt can exceed the text block, which autoTable resolves
  // by breaking header words mid-word ("Confidenc / e"). Scaling the fixed
  // widths back into the available space keeps every column readable.
  if (opts.columnStyles) {
    const clamped: any = {};
    for (const [k, v] of Object.entries(opts.columnStyles as Record<string, any>)) {
      clamped[k] = v && typeof v.fontSize === "number" ? { ...v, fontSize: Math.max(9.5, v.fontSize) } : v;
    }
    const colCount = (opts.head?.[0]?.length ?? opts.body?.[0]?.length ?? 0) as number;
    if (colCount > 0) {
      let fixed = 0;
      let fixedCount = 0;
      for (const v of Object.values(clamped) as any[]) {
        if (v && typeof v.cellWidth === "number") { fixed += v.cellWidth; fixedCount++; }
      }
      const budget = contentW(state) - Math.max(0, colCount - fixedCount) * 74;
      if (fixed > budget && budget > 0) {
        const k = budget / fixed;
        for (const key of Object.keys(clamped)) {
          const v = clamped[key];
          if (v && typeof v.cellWidth === "number") {
            clamped[key] = { ...v, cellWidth: Math.max(30, Math.round(v.cellWidth * k)) };
          }
        }
      }
    }
    opts = { ...opts, columnStyles: clamped };
  }
  autoTable(state.doc, {
    startY: state.y,
    theme: "plain",
    // Long cells wrap inside their column rather than spilling into the next.
    styles: { overflow: "linebreak", cellWidth: "auto", minCellHeight: 14 },
    headStyles: {
      fillColor: INK,
      textColor: "#FFFFFF",
      fontStyle: "bold",
      fontSize: 9.5,
      cellPadding: { top: 7, bottom: 7, left: 8, right: 8 },
      lineWidth: 0,
    },
    bodyStyles: {
      fontSize: 9.5,
      textColor: BODY,
      cellPadding: { top: 7, bottom: 7, left: 8, right: 8 },
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
  const state = newPdf(jsPDF, "Off-Patent Value Assessment", assetName, STRATEGY_COLOR);

  const regions = report.regionalAnalysis ?? [];
  const topRegion = regions.slice().sort((a, b) => (b.attractivenessScore ?? 0) - (a.attractivenessScore ?? 0))[0];
  const topRec = (report.recommendations ?? []).slice().sort((a, b) => a.priorityRank - b.priorityRank)[0];

  coverPage(
    state,
    "Off-Patent Value Assessment",
    "Maximising the value of an already-approved medicine",
    "Ten-lever value scan and six-vector market scoring across the US, EU-4 (DE/FR/IT/ES), Japan, China & ROW",
    assetName,
    [
      { label: "Verdict", value: report.verdict ?? "—" },
      { label: "Archetype", value: report.archetype?.mode ?? "—" },
      { label: "Verdict confidence", value: report.verdictConfidence ?? report.dataConfidence ?? "—" },
      { label: "Lead market", value: topRegion?.regionLabel ?? "—" },
    ],
  );

  // Compliance — decision support, not advice (required on every export)
  paragraph(
    state,
    "Internal strategic decision support only. Not medical advice, not promotional material, and not a substitute for regulatory or legal review. Any off-label or pricing analysis is for internal strategy only and requires regulatory and legal review before action.",
    8.5,
    MUTED,
  );

  // Executive Summary — governing thought
  sectionTitle(
    state,
    "Executive Summary",
    report.opportunityThesis ?? (topRegion ? `${topRegion.regionLabel} presents the strongest value opportunity` : "Value overview"),
  );
  lead(state, report.executiveSummary ?? "");

  // Opportunity framing — the narrow trade vs the client's broad question
  if (report.opportunityFraming) {
    const f = report.opportunityFraming;
    subHeader(state, "Framing — two distinct questions", STRATEGY_COLOR);
    if (f.narrowVerdict) { tinyLabel(state, "Narrow — off-patent in-license trade"); paragraph(state, f.narrowVerdict); }
    if (f.broadVerdict) { tinyLabel(state, "Broad — any real market value"); paragraph(state, f.broadVerdict); }
    if (f.note) paragraph(state, f.note, 9.5, MUTED);
  }
  if (report.archetype?.rubricNote) {
    tinyLabel(state, "Scoring lens (archetype-adjusted)");
    paragraph(state, report.archetype.rubricNote, 9.5, MUTED);
  }
  if (report.whatWouldFlipIt?.length) {
    subHeader(state, "What would flip the verdict", STRATEGY_COLOR);
    bullets(state, report.whatWouldFlipIt, STRATEGY_COLOR);
  }
  if (report.consideredAndRejected?.length) {
    subHeader(state, "Considered & rejected (steelman)", INK);
    bullets(state, report.consideredAndRejected.map(c => `${c.opportunity} — ${c.reason}`), INK);
  }

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

  // Ten-lever value scan — where value still sits in the approved asset
  if (report.valueLevers?.length) {
    newPage(state);
    const live = report.valueLevers.filter(l => !l.notComputable);
    const lead = live.slice().sort((a, b) => (b.score ?? 0) - (a.score ?? 0))[0];
    sectionTitle(
      state,
      "Value Levers",
      lead ? `${lead.lever} is the strongest value play` : "Ten-lever value scan",
      "Residual and incremental value in an already-approved, off-patent medicine. Levers that cannot be computed from the evidence base are marked rather than estimated.",
    );
    table(state, {
      head: [["Lever", "Score", "Confidence", "Est. value", "Status"]],
      body: report.valueLevers.map(l => [
        l.lever,
        String(l.score ?? "—"),
        l.confidence ?? "—",
        l.estValueRange ?? "—",
        l.notComputable ? "Not computable" : "Scored",
      ]),
      columnStyles: {
        0: { fontStyle: "bold", textColor: INK },
        1: { halign: "right", fontStyle: "bold" },
        4: { textColor: MUTED, fontSize: 8 },
      },
    }, autoTable);

    for (const l of report.valueLevers.filter(x => !x.notComputable).sort((a, b) => (b.score ?? 0) - (a.score ?? 0))) {
      ensureSpace(state, 70);
      subHeader(state, `${l.lever} — ${l.score ?? "—"}/100`, STRATEGY_COLOR);
      if (l.evidence?.length) {
        tinyLabel(state, "Evidence");
        bullets(state, l.evidence.map(e => (e.source ? `${e.finding} — ${e.source}` : e.finding)));
      }
      if (l.recommendedActions?.length) {
        tinyLabel(state, "Recommended plays");
        bullets(state, l.recommendedActions, STRATEGY_COLOR);
      }
      if (l.estValueRange) { tinyLabel(state, "Estimated value"); paragraph(state, l.estValueRange); }
      if (l.dataGap) { tinyLabel(state, "Evidence needed"); paragraph(state, l.dataGap, 9.5, MUTED); }
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

    if (report.marketWorthinessSummary) {
      subHeader(state, "Market worthiness — commercial read", STRATEGY_COLOR);
      paragraph(state, report.marketWorthinessSummary, 10.5, INK);
    }

    // One detailed page per region
    for (const region of regions) {
      newPage(state);
      sectionTitle(
        state,
        `${region.regionLabel} · ${region.attractiveness}`,
        `${region.regionLabel} — ${region.attractivenessScore}/100 attractiveness`,
      );

      // Business case — the rational value proposition and where the profit is
      if (region.businessCase) {
        const bc = region.businessCase;
        subHeader(state, `Business case — ${bc.verdict}`, STRATEGY_COLOR);
        paragraph(state, bc.valueProposition, 10.5, INK);
        if (bc.profitWedge) {
          tinyLabel(state, "Where the profitable case is");
          paragraph(state, bc.profitWedge);
        }
        if (bc.economics) {
          tinyLabel(state, "Economics");
          paragraph(state, bc.economics);
        }
        state.y += 6;
      }

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

      // Market worthiness — purely-commercial read against the live legal &
      // healthcare landscape, with partnership room, channels, sizing-vs-
      // competition and novel paths.
      if (region.marketWorthiness) {
        const w = region.marketWorthiness;
        ensureSpace(state, 60);
        subHeader(state, `Market Worthiness — ${w.rating ?? "—"}${w.score != null ? `  (${w.score}/100)` : ""}`, STRATEGY_COLOR);
        if (w.thesis) paragraph(state, w.thesis, 10.5, INK);
        const wRows: [string, string | undefined | null][] = [
          ["Healthcare landscape", w.healthcareLandscape],
          ["Legal landscape", w.legalLandscape],
          ["Market size vs competitors", w.marketSizeVsCompetitors],
          ["Room for partnerships", w.partnershipRoom],
          ["Distribution channels", w.distributionChannels],
        ];
        table(state, {
          body: wRows.map(([k, v]) => [k, v ?? "—"]),
          columnStyles: { 0: { fontStyle: "bold", textColor: INK, cellWidth: 150 } },
        }, autoTable);
        if (w.novelPaths?.length) {
          tinyLabel(state, "Novel paths to capture the market");
          bullets(state, w.novelPaths, STRATEGY_COLOR);
        }
      }
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

  // Business case — commercial channels & how to proceed
  if (report.commercialPlan) {
    const cp = report.commercialPlan;
    newPage(state);
    sectionTitle(state, "Business Case", "Commercial channels & go-to-market", cp.summary);
    if (cp.channels?.length) {
      subHeader(state, "Commercial channels", STRATEGY_COLOR);
      table(state, {
        head: [["Channel", "Geographies", "Where the value is", "How to win it"]],
        body: cp.channels.map((c) => [
          c.channel,
          (c.geographies ?? []).join(", "),
          c.valueRole,
          c.accessMechanics + (c.keyPlayers?.length ? `  Players: ${c.keyPlayers.join(", ")}` : ""),
        ]),
        columnStyles: {
          0: { fontStyle: "bold", textColor: INK, cellWidth: 92 },
          1: { cellWidth: 60 },
          2: { cellWidth: 140 },
        },
      }, autoTable);
    }
    if (cp.howToProceed?.length) {
      subHeader(state, "How to proceed", STRATEGY_COLOR);
      table(state, {
        head: [["#", "Action", "Geo", "Approach", "Timing", "Owner"]],
        body: cp.howToProceed.slice().sort((a, b) => a.step - b.step).map((s) => [
          String(s.step), s.action, s.geography, s.approach, s.timing, s.owner,
        ]),
        columnStyles: {
          0: { halign: "center", fontStyle: "bold", textColor: STRATEGY_COLOR, cellWidth: 24 },
          1: { cellWidth: 150 },
          3: { textColor: POS },
        },
      }, autoTable);
    }
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
//  PILLAR 2 — STRATEGY SUMMARY PDF (§5)
// ════════════════════════════════════════════════════════════════════════════

/** Compact USD for tables — the engine returns plain numbers. */
const compactUsd = (n: number | null | undefined): string => {
  if (n == null || !Number.isFinite(n)) return "n/a";
  const sign = n < 0 ? "-" : "";
  const abs = Math.abs(n);
  if (abs >= 1e12) return `${sign}$${(abs / 1e12).toFixed(1)}T`;
  if (abs >= 1e9) return `${sign}$${(abs / 1e9).toFixed(abs >= 1e10 ? 0 : 1)}B`;
  if (abs >= 1e6) return `${sign}$${(abs / 1e6).toFixed(abs >= 1e7 ? 0 : 1)}M`;
  if (abs >= 1e3) return `${sign}$${(abs / 1e3).toFixed(0)}K`;
  return `${sign}$${abs.toFixed(0)}`;
};

const sText = (v: unknown): string => (typeof v === "string" && v.trim() ? v.trim() : "");

/** One instruction on the "What to do next" list. */
export interface StrategyAction {
  action: string;
  owner: string;
  detail: string;
}

/**
 * The strategy equivalent of the diagnosis action list: what to commit to, what
 * would break it, which variable to nail down first, and which inputs are still
 * the model's own guess. Assembled only from what this run actually produced —
 * a run with nothing computable produces a list about closing that gap, not
 * filler.
 */
export function strategyNextActions(ctx: {
  recommended: any;
  best: any;
  byKey: Map<string, any>;
  missing: string[];
  labelOf: (key: string) => string;
  sens: any[];
  partners: any[];
  assumptions: any[];
  uncomputable: any[];
  strategy: Strategy;
  limit?: number;
}): StrategyAction[] {
  const out: StrategyAction[] = [];
  const limit = ctx.limit ?? 9;
  const push = (action: string, owner = "", detail = "") => {
    if (action && out.length < limit) out.push({ action, owner, detail });
  };

  if (ctx.best) {
    const label = sText(ctx.recommended?.label) || sText(ctx.best.label) || ctx.best.key;
    push(
      `Commit to ${label} and build the plan against it`,
      "Deal lead",
      [
        `modelled NPV ${compactUsd(ctx.best.npv)}`,
        ctx.best.breakEvenYear != null ? `break-even year ${ctx.best.breakEvenYear}` : "no break-even inside the horizon",
      ].join(" · "),
    );
    const dependency = sText(ctx.recommended?.keyDependency) || sText(ctx.best.keyDependency);
    if (dependency) push(`De-risk the dependency that would break the plan: ${dependency}`, "Deal lead", "");
  } else {
    push(
      `Supply the inputs no route can be modelled without: ${ctx.missing.map(ctx.labelOf).join(", ") || "none recorded"}`,
      "Finance",
      "Until then no route has an economic case at all.",
    );
  }

  if (ctx.sens.length) {
    const s = ctx.sens[0];
    push(
      `Nail down ${ctx.labelOf(s.key)} before anything else — it dominates the outcome`,
      "Finance",
      `Swings NPV by ${compactUsd(s.swing)} across ±20%.`,
    );
  }

  for (const p of ctx.partners.slice(0, 2)) {
    const name = sText(p?.name);
    if (!name) continue;
    push(
      `Open a conversation with ${name}`,
      "Business development lead",
      [sText(p?.kind), p?.score != null ? `fit ${p.score}` : ""].filter(Boolean).join(" · "),
    );
  }

  const sequence = Array.isArray((ctx.strategy as Record<string, unknown>).approachSequence)
    ? ((ctx.strategy as Record<string, unknown>).approachSequence as unknown[]).map(sText).filter(Boolean)
    : [];
  for (const [i, s] of sequence.slice(0, 2).entries()) push(`Approach step ${i + 1}: ${s}`, "Deal lead", "");

  for (const r of ctx.uncomputable.slice(0, 2)) {
    const e = ctx.byKey.get(r.key);
    const miss = e && !e.computable ? e.missing : [];
    push(
      `Obtain ${miss.map(ctx.labelOf).join(", ") || "the missing inputs"} so ${sText(r.label) || r.key} can be compared on economics`,
      "Finance",
      "Currently excluded from the comparison rather than defaulted to zero.",
    );
  }

  const assumed = ctx.assumptions.filter((a) => a?.basis !== "sourced").slice(0, 2);
  for (const a of assumed) {
    push(
      `Source "${sText(a.label) || a.key}" — it is the model's own estimate today`,
      "Finance",
      String(a.value ?? "").trim() === "" ? "Not supplied at all." : `Currently ${a.value}${sText(a.unit) ? ` ${sText(a.unit)}` : ""}.`,
    );
  }

  return out;
}

/** The slice of autoTable's didParseCell hook this module actually reads. */
interface ParsedCell {
  section: string;
  column: { index: number };
  row: { index: number };
  cell: { raw: unknown; styles: { textColor?: string; fontStyle?: string } };
}

/**
 * A clean 2–3 page consulting summary of a Strategy: the recommended route, the
 * route comparison, the assumptions behind every figure (with their basis), the
 * variables that dominate the outcome, and the partner shortlist.
 *
 * Every number here is recomputed from `strategy.assumptions` by the same pure
 * deterministic engine the screen uses — so a PDF taken after the user has
 * edited assumptions reflects exactly what they were looking at.
 */
export async function buildStrategyPdf(
  strategy: Strategy,
  branch: "off_patent" | "innovative",
  assetName: string,
  opts?: ExportOptions,
): Promise<any> {
  const [{ jsPDF, autoTable }, engine] = await Promise.all([
    loadPdfDeps(),
    import("@/server/services/strategy/model"),
  ]);

  const branchLabel = branch === "off_patent" ? "Off-Patent" : "Innovative";
  const state = newPdf(jsPDF, `${branchLabel} Route Strategy`, assetName, STRATEGY_COLOR);

  // ── Recompute from the assumptions as they stand ──────────────────────────
  const assumptions = Array.isArray(strategy.assumptions) ? strategy.assumptions : [];
  const values: Record<string, number> = {};
  for (const a of assumptions) {
    if (String(a.value).trim() === "") continue;
    const n = Number(a.value);
    if (Number.isFinite(n)) values[a.key] = n;
  }
  const required = branch === "off_patent" ? engine.OFF_PATENT_REQUIRED : engine.INNOVATIVE_REQUIRED;
  const results = engine.modelAllRoutes(branch, values);
  const byKey = new Map(results.map((r) => [r.key, r]));
  const routes = Array.isArray(strategy.routes) ? strategy.routes : [];
  /** Fit gates which route may be recommended; economics rank the survivors. */
  const fit = Object.fromEntries(routes.map((r) => [r.key, r.score] as [string, number | null | undefined]));
  const recommendation = engine.recommend(results, fit);
  const best = recommendation?.route ?? null;
  const scen = engine.runScenarios(branch, values, 20);
  const scenNpv = (set: typeof scen.base, key: string) => {
    const r = set.find((x) => x.key === key);
    return r && r.computable ? compactUsd(r.npv) : "n/a";
  };
  const sens = best ? engine.sensitivity(branch, values, best.key, 20).slice(0, 6) : [];
  const recommendedKey = best?.key ?? sText(strategy.recommendedRoute);
  const recommended = routes.find((r) => r.key === recommendedKey);
  const missing = required.filter((k) => !Number.isFinite(values[k]));
  const labelOf = (key: string) => sText(assumptions.find((a) => a.key === key)?.label) || key;

  const computable = routes.filter((r) => byKey.get(r.key)?.computable);
  const uncomputable = routes.filter((r) => byKey.get(r.key)?.computable === false);
  const partners = Array.isArray(strategy.partnerShortlist) ? strategy.partnerShortlist : [];
  const includeAppendix = opts?.includeAppendix !== false;
  const routeLabel = (key: string) =>
    sText(routes.find((r) => r.key === key)?.label) || sText(byKey.get(key)?.label) || key;

  coverPage(
    state,
    `${branchLabel} Route Strategy`,
    best
      ? `${sText(recommended?.label) || routeLabel(best.key)} is the route that realises the most value`
      : "Route comparison and modelled economics",
    "Every commercialisation and partnering route modelled from one assumption set — NPV, IRR, break-even and the dependency that would break the plan",
    assetName,
    [
      // The engine can recommend a route the narrated payload never described.
      // Fall back to the engine's own label rather than reporting the
      // recommendation itself as not computable while printing its NPV below.
      { label: "Recommended route", value: sText(recommended?.label) || (best ? routeLabel(best.key) : "Not computable") },
      { label: "Modelled NPV", value: best ? compactUsd(best.npv) : "n/a" },
      { label: "Break-even", value: best?.breakEvenYear != null ? `Year ${best.breakEvenYear}` : "n/a" },
      { label: "Routes modelled", value: `${computable.length} of ${routes.length}` },
    ],
  );

  paragraph(
    state,
    "Internal strategic decision support only. The assumptions below are the model's inputs; every financial figure is computed deterministically from them and moves when they move. Figures marked as assumed are not sourced — verify them before transacting.",
    9.5,
    MUTED,
  );

  // ══════════════════════════════════════════════════════════════════════════
  //  PART 1 — EXECUTIVE SUMMARY. Short enough to stop here.
  // ══════════════════════════════════════════════════════════════════════════

  sectionTitle(
    state,
    "Executive summary",
    best
      ? `${sText(recommended?.label) || routeLabel(best.key)} is the route to commit to`
      : "No route can be modelled on the current assumptions",
    best
      ? [
          `Modelled NPV ${compactUsd(best.npv)}`,
          `IRR ${best.irr != null ? `${best.irr.toFixed(1)}%` : "n/a"}`,
          `break-even ${best.breakEvenYear != null ? `year ${best.breakEvenYear}` : "never within the horizon"}`,
          `${computable.length} of ${routes.length} routes modelled`,
        ].join("   ·   ")
      : `Missing inputs: ${missing.map(labelOf).join(", ") || "none recorded"}`,
  );
  if (recommendation?.lowFit) {
    tinyLabel(state, "No route cleared the fit bar");
    paragraph(
      state,
      "No route was judged actually open to this asset. The figures above are the best economics available, not a route to execute — read them as a ceiling on value.",
      10.5,
      NEG,
    );
  }
  if (best) {
    const summaryDependency = sText(recommended?.keyDependency) || sText(best.keyDependency);
    if (summaryDependency) {
      tinyLabel(state, "Key dependency — what would break this plan");
      paragraph(state, summaryDependency);
    }
  } else {
    paragraph(
      state,
      "Until those inputs are supplied no route has an economic case at all, and nothing below should be read as one.",
      10.5,
      NEG,
    );
  }
  if (includeAppendix) {
    paragraph(state, "Full route economics, every assumption and the evidence behind them are in the appendix.", 9.5, MUTED);
  }

  // ── What to do next ───────────────────────────────────────────────────────
  const nextSteps = strategyNextActions({
    recommended,
    best,
    byKey,
    missing,
    labelOf,
    sens,
    partners,
    assumptions,
    uncomputable,
    strategy,
  });
  if (nextSteps.length) {
    sectionTitle(
      state,
      "What to do next",
      recommended
        ? `Commit to ${recommended.label} and close the inputs that could still move it`
        : "Close the missing inputs before this decision can be taken",
      "Every line is derived from this model run: the recommended route and its dependency, the variables that dominate the outcome, and the inputs still to be sourced.",
    );
    table(state, {
      head: [["#", "Do this", "Owner", "Because"]],
      body: nextSteps.map((a, i) => [String(i + 1), a.action, a.owner || "Not assigned", a.detail || "—"]),
      columnStyles: {
        0: { halign: "center", fontStyle: "bold", textColor: STRATEGY_COLOR, cellWidth: 26 },
        1: { fontStyle: "bold", textColor: INK, cellWidth: 188 },
        2: { cellWidth: 86, textColor: MUTED },
        3: { textColor: BODY },
      },
    }, autoTable);
  }

  // ── Route comparison — the top four, on the three figures that decide it ──
  const summaryRoutes = computable
    .slice()
    .sort((a, b) => {
      const ea = byKey.get(a.key);
      const eb = byKey.get(b.key);
      return ((eb?.computable ? eb.npv : 0) ?? 0) - ((ea?.computable ? ea.npv : 0) ?? 0);
    })
    .slice(0, 4);
  if (summaryRoutes.length) {
    sectionTitle(
      state,
      "Route comparison",
      summaryRoutes.length === 1
        ? "One route clears the model on the current assumptions"
        : `The ${summaryRoutes.length} strongest routes on one assumption set`,
      computable.length > summaryRoutes.length || uncomputable.length
        ? "The strongest routes by modelled NPV. Every route, including those still missing an input, is in the appendix."
        : "Score is the fit read for this asset; NPV, IRR and break-even are model output.",
    );
    table(state, {
      head: [["Route", "Fit", "NPV", "IRR", "Break-even"]],
      body: summaryRoutes.map((r) => {
        const e = byKey.get(r.key);
        const econ = e && e.computable ? e : null;
        return [
          r.label + (r.key === recommendedKey ? "  (recommended)" : ""),
          r.score != null ? String(r.score) : "n/a",
          compactUsd(econ?.npv),
          econ?.irr != null ? `${econ.irr.toFixed(1)}%` : "n/a",
          econ?.breakEvenYear != null ? `Year ${econ.breakEvenYear}` : "never",
        ];
      }),
      columnStyles: {
        0: { fontStyle: "bold", textColor: INK, cellWidth: 190 },
        1: { halign: "right", cellWidth: 50 },
        2: { halign: "right", fontStyle: "bold", textColor: POS },
        3: { halign: "right" },
        4: { halign: "center" },
      },
    }, autoTable);
  }

  // ── The assumptions that decide the answer ────────────────────────────────
  const dominant = sens.slice(0, 3);
  if (dominant.length && best) {
    sectionTitle(
      state,
      "What the answer turns on",
      `${labelOf(dominant[0].key)} dominates the outcome — settle it first`,
      `Each driver moved ±20% on its own against ${sText(recommended?.label) || routeLabel(best.key)}. These are the inputs worth arguing about; the rest barely move the answer.`,
    );
    table(state, {
      head: [["Variable", "NPV swing across ±20%", "Basis today"]],
      body: dominant.map((s) => [
        labelOf(s.key),
        compactUsd(s.swing),
        assumptions.find((a) => a.key === s.key)?.basis === "sourced" ? "Sourced" : "Assumed — not sourced",
      ]),
      columnStyles: {
        0: { fontStyle: "bold", textColor: INK, cellWidth: 200 },
        1: { halign: "right", fontStyle: "bold", textColor: POS, cellWidth: 150 },
        2: { textColor: MUTED },
      },
    }, autoTable);
  }

  // ── Partner shortlist — the three to open with ────────────────────────────
  if (partners.length) {
    const shortlist = partners.slice(0, 3);
    sectionTitle(
      state,
      "Counterparties",
      `Open with ${sText(shortlist[0]?.name) || "the top-ranked counterparty"}`,
      partners.length > shortlist.length
        ? `The three highest-fit counterparties; the full shortlist of ${partners.length} is in the appendix.`
        : "Ranked by fit against this asset and this route.",
    );
    table(state, {
      head: [["#", "Partner", "Type", "Fit", "Why them"]],
      body: shortlist.map((p, i) => [
        String(i + 1),
        p.name,
        sText(p.kind) || "—",
        p.score != null ? String(p.score) : "n/a",
        truncate(sText(p.rationale), 130) || "Not stated",
      ]),
      columnStyles: {
        0: { halign: "center", fontStyle: "bold", textColor: STRATEGY_COLOR, cellWidth: 24 },
        1: { fontStyle: "bold", textColor: INK, cellWidth: 110 },
        2: { cellWidth: 90, textColor: MUTED },
        3: { halign: "right", cellWidth: 36 },
        4: { textColor: BODY },
      },
    }, autoTable);
  }

  // A summary-only file stops here: no divider, no appendix.
  if (!includeAppendix) return state.doc;

  // ══════════════════════════════════════════════════════════════════════════
  //  PART 2 — APPENDIX
  // ══════════════════════════════════════════════════════════════════════════
  appendixDivider(state);
  const ax = appendixCounter();

  // ── Recommendation ────────────────────────────────────────────────────────
  sectionTitle(
    state,
    ax("Recommendation"),
    sText(recommended?.label) || (best ? routeLabel(best.key) : "No route is computable on the current assumptions"),
    best
      ? `NPV ${compactUsd(best.npv)} · IRR ${best.irr != null ? `${best.irr.toFixed(1)}%` : "n/a"} · break-even ${best.breakEvenYear != null ? `year ${best.breakEvenYear}` : "never within the horizon"} · peak revenue ${compactUsd(best.peakRevenue)}`
      : `Missing inputs: ${missing.map(labelOf).join(", ") || "none recorded"}`,
  );
  if (recommended) {
    const rationale = sText((recommended as Record<string, unknown>).rationale);
    if (rationale) lead(state, rationale);
    const dependency = sText(recommended.keyDependency) || sText(byKey.get(recommended.key)?.keyDependency);
    if (dependency) {
      tinyLabel(state, "Key dependency — what would break this plan");
      paragraph(state, dependency);
    }
    if (best) {
      tinyLabel(state, "Scenario range (every driver moved together by ±20%)");
      paragraph(
        state,
        `Downside ${scenNpv(scen.downside, best.key)}   ·   Base ${compactUsd(best.npv)}   ·   Upside ${scenNpv(scen.upside, best.key)}`,
      );
    }
  }

  // ── Route comparison ──────────────────────────────────────────────────────
  sectionTitle(
    state,
    ax("Route comparison"),
    "Every route, one assumption set",
    "Score is the fit read for this asset at this stage; all financial figures are model output.",
  );
  if (computable.length) {
    table(state, {
      head: [["Route", "Score", "NPV", "IRR", "Break-even", "Peak revenue", "Downside / Upside"]],
      body: computable.map((r) => {
        const e = byKey.get(r.key)!;
        const econ = e.computable ? e : null;
        return [
          r.label,
          r.score != null ? String(r.score) : "n/a",
          compactUsd(econ?.npv),
          econ?.irr != null ? `${econ.irr.toFixed(1)}%` : "n/a",
          econ?.breakEvenYear != null ? `Y${econ.breakEvenYear}` : "never",
          compactUsd(econ?.peakRevenue),
          `${scenNpv(scen.downside, r.key)} / ${scenNpv(scen.upside, r.key)}`,
        ];
      }),
      columnStyles: {
        0: { fontStyle: "bold", textColor: INK, cellWidth: 130 },
        1: { halign: "right" },
        2: { halign: "right", fontStyle: "bold", textColor: POS },
        3: { halign: "right" },
        4: { halign: "center" },
        5: { halign: "right" },
        6: { halign: "right", textColor: MUTED, fontSize: 8 },
      },
      didParseCell: (data: ParsedCell) => {
        if (data.section === "body" && data.row.index != null) {
          const route = computable[data.row.index];
          if (route && route.key === recommendedKey) data.cell.styles.fontStyle = "bold";
        }
      },
    }, autoTable);
  }
  // A route missing a required input is never shown as a zero or a dash.
  if (uncomputable.length) {
    subHeader(state, "Routes that cannot be modelled yet", INK);
    table(state, {
      head: [["Route", "Missing inputs", "Key dependency"]],
      body: uncomputable.map((r) => {
        const e = byKey.get(r.key);
        const miss = e && !e.computable ? e.missing : required;
        return [r.label, miss.map(labelOf).join(", "), sText(r.keyDependency)];
      }),
      columnStyles: {
        0: { fontStyle: "bold", textColor: INK, cellWidth: 130 },
        1: { textColor: NEG, cellWidth: 160 },
        2: { textColor: MUTED, fontSize: 8 },
      },
    }, autoTable);
  }

  // ── Assumptions ───────────────────────────────────────────────────────────
  newPage(state);
  sectionTitle(
    state,
    ax("Assumptions"),
    "What every figure above rests on",
    "Sourced assumptions carry a citation; assumed ones are the model's own estimate and are the first thing to challenge.",
  );
  table(state, {
    head: [["Assumption", "Value", "Unit", "Basis", "Source"]],
    body: assumptions.map((a) => [
      sText(a.label) || a.key,
      String(a.value ?? "").trim() === "" ? "not supplied" : String(a.value),
      sText(a.unit) || "—",
      a.basis === "sourced" ? "Sourced" : "Assumed",
      sText(a.source) || "—",
    ]),
    columnStyles: {
      0: { fontStyle: "bold", textColor: INK, cellWidth: 150 },
      1: { halign: "right", cellWidth: 80 },
      2: { cellWidth: 46, textColor: MUTED },
      3: { cellWidth: 54 },
      4: { textColor: MUTED, fontSize: 8 },
    },
    didParseCell: (data: ParsedCell) => {
      if (data.section === "body" && data.column.index === 3 && String(data.cell.raw) === "Assumed") {
        data.cell.styles.textColor = NEG;
        data.cell.styles.fontStyle = "bold";
      }
    },
  }, autoTable);
  if (missing.length) {
    tinyLabel(state, "Still missing");
    paragraph(state, missing.map(labelOf).join("   ·   "), 9.5, NEG);
  }

  // ── Sensitivity ───────────────────────────────────────────────────────────
  if (sens.length && best) {
    sectionTitle(
      state,
      ax("Sensitivity"),
      sens[0] ? `${labelOf(sens[0].key)} dominates the outcome` : "Which variables dominate the outcome",
      `Each driver moved ±20% on its own, everything else held, against ${best.label}.`,
    );
    table(state, {
      head: [["Rank", "Variable", "NPV at -20%", "NPV at +20%", "Swing"]],
      body: sens.map((s, i) => [
        String(i + 1),
        labelOf(s.key),
        compactUsd(s.low),
        compactUsd(s.high),
        compactUsd(s.swing),
      ]),
      columnStyles: {
        0: { halign: "center", fontStyle: "bold", textColor: STRATEGY_COLOR, cellWidth: 34 },
        1: { fontStyle: "bold", textColor: INK },
        2: { halign: "right" },
        3: { halign: "right" },
        4: { halign: "right", fontStyle: "bold", textColor: POS },
      },
    }, autoTable);
  }

  // ── Partner shortlist ─────────────────────────────────────────────────────
  if (partners.length) {
    sectionTitle(state, ax("Counterparties"), "Partner shortlist");
    table(state, {
      head: [["#", "Partner", "Type", "Score", "Geographies", "Why them"]],
      body: partners.map((p, i) => [
        String(i + 1),
        p.name,
        sText(p.kind) || "—",
        p.score != null ? String(p.score) : "n/a",
        (p.geographies ?? []).join(", ") || "—",
        sText(p.rationale) || "—",
      ]),
      columnStyles: {
        0: { halign: "center", fontStyle: "bold", textColor: STRATEGY_COLOR, cellWidth: 24 },
        1: { fontStyle: "bold", textColor: INK, cellWidth: 110 },
        2: { cellWidth: 64, textColor: MUTED },
        3: { halign: "right", cellWidth: 36 },
        4: { cellWidth: 74, textColor: MUTED, fontSize: 8 },
        5: { textColor: BODY },
      },
    }, autoTable);
  }

  const sequence = Array.isArray((strategy as Record<string, unknown>).approachSequence)
    ? ((strategy as Record<string, unknown>).approachSequence as unknown[]).map(sText).filter(Boolean)
    : [];
  if (sequence.length) {
    subHeader(state, "Recommended sequence of approach", STRATEGY_COLOR);
    bullets(state, sequence.map((s, i) => `${i + 1}. ${s}`), STRATEGY_COLOR);
  }

  // Appendix: what the route scores and the shortlist were actually built on.
  // Dropping it makes a shorter board document; keeping it makes one that
  // survives a reviewer asking "on what basis?".
  if (opts?.includeEvidence !== false) {
    const rows: string[][] = [];
    for (const r of routes) {
      for (const e of Array.isArray(r.evidence) ? r.evidence : []) {
        if (!sText(e?.claim)) continue;
        rows.push([r.label ?? r.key, sText(e.claim), e.kind === "estimate" ? "Estimate" : "Evidence", sText(e.source) || "—"]);
      }
    }
    for (const p of partners) {
      for (const e of Array.isArray(p.evidence) ? p.evidence : []) {
        if (!sText(e?.claim)) continue;
        rows.push([p.name, sText(e.claim), e.kind === "estimate" ? "Estimate" : "Evidence", sText(e.source) || "—"]);
      }
    }
    if (rows.length) {
      sectionTitle(state, ax("Evidence"), "Evidence behind the routes", "Every claim, and whether it is sourced or inferred.");
      table(state, {
        head: [["Route / partner", "Claim", "Kind", "Source"]],
        body: rows,
        columnStyles: {
          0: { fontStyle: "bold", textColor: INK, cellWidth: 104 },
          1: { textColor: BODY },
          2: { cellWidth: 52, textColor: MUTED },
          3: { cellWidth: 96, textColor: MUTED, fontSize: 8 },
        },
      }, autoTable);
    }
  }

  return state.doc;
}

export async function exportStrategyPDF(
  strategy: Strategy,
  branch: "off_patent" | "innovative",
  assetName: string,
  opts?: ExportOptions,
) {
  const doc = await buildStrategyPdf(strategy, branch, assetName, opts);
  doc.save(`${safeFilename(assetName)}_Strategy_Summary.pdf`);
}

// ════════════════════════════════════════════════════════════════════════════
//  PILLAR 1 — DIAGNOSIS (shared helpers, then PDF)
// ════════════════════════════════════════════════════════════════════════════

const DIAGNOSIS_REPORT_NAME = (branch: "off_patent" | "innovative") =>
  branch === "off_patent" ? "Market Worthiness Diagnosis" : "Innovative Asset Diagnosis";

const VERDICT_LABELS: Record<string, string> = {
  GO: "Go",
  CONDITIONAL: "Conditional",
  NO_GO: "No-go",
};

const verdictLabel = (v: unknown): string => {
  const raw = sText(v);
  return VERDICT_LABELS[raw] ?? (raw || "Not stated");
};

/** Sentence-case a low-cardinality enum ("high" → "High"). */
const cap = (v: unknown): string => {
  const t = sText(v);
  return t ? t.charAt(0).toUpperCase() + t.slice(1) : "";
};

/** Resolve a dimension key to its configured human label; the key is the fallback. */
function dimensionLabel(branch: "off_patent" | "innovative", key: unknown): string {
  const k = sText(key);
  const defs = branch === "off_patent" ? OFF_PATENT_DIMENSIONS : INNOVATIVE_DIMENSIONS;
  return defs.find((d) => d.key === k)?.label ?? (k || "Unnamed dimension");
}

/** Country NAME, never the emoji flag — the WinAnsi PDF fonts cannot encode flags. */
const countryLabel = (code: unknown): string => {
  const c = sText(code);
  return countryByCode(c)?.name ?? (c || "Unknown market");
};

/**
 * The governing rule in one function: a null score never renders as 0 or as a
 * blank — it renders the reason it could not be computed.
 */
const scoreCell = (score: number | null | undefined, notComputable: unknown): string => {
  if (score != null && Number.isFinite(score)) return String(Math.round(score));
  const why = sText(notComputable);
  return why ? `Not computable — ${why}` : "Not computable — no reason recorded";
};

/** Score descending, with unscored rows last (they are never sorted as zeros). */
const byScoreDesc = (a: { score?: number | null }, b: { score?: number | null }): number => {
  const as = a.score == null ? null : a.score;
  const bs = b.score == null ? null : b.score;
  if (as == null && bs == null) return 0;
  if (as == null) return 1;
  if (bs == null) return -1;
  return bs - as;
};

/** notComputable arrives as `true`, as a reason string, or absent. */
function readNotComputable(raw: unknown): { flag: boolean; reason: string } {
  if (raw === true) return { flag: true, reason: "" };
  const s = sText(raw);
  return s ? { flag: true, reason: s } : { flag: false, reason: "" };
}

const DIAGNOSIS_DISCLAIMER =
  "CartaOS — this diagnosis is internal decision support, not medical, regulatory or legal advice. Every score is generated by CartaOS from the sources listed against it; dimensions and markets that could not be computed are stated as such rather than estimated.";

// ════════════════════════════════════════════════════════════════════════════
//  OFF-PATENT REPORT FACADE
//  `Diagnosis.report` carries the whole OutLicensingReport for an off-patent
//  run — the same payload the results screen renders. It is stored as a loose
//  record, so every read below is defensive: a field that is absent produces an
//  empty string / empty array, and callers skip the block entirely rather than
//  printing a heading with nothing under it.
// ════════════════════════════════════════════════════════════════════════════

const asRec = (v: unknown): Record<string, any> =>
  v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, any>) : {};
const asArr = (v: unknown): any[] => (Array.isArray(v) ? v : []);
const asStrs = (v: unknown): string[] => asArr(v).map(sText).filter(Boolean);
const asNum = (v: unknown): number | null => {
  if (v == null || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

/** Non-empty when at least one of the values carries content. */
const anyOf = (...vals: unknown[]): boolean => vals.some((v) => (Array.isArray(v) ? v.length > 0 : !!v));

export interface OffPatentFacade {
  present: boolean;
  verdict: string;
  verdictConfidence: string;
  dataConfidence: string;
  opportunityThesis: string;
  executiveSummary: string;
  marketWorthinessSummary: string;
  archetype: { mode: string; rationale: string; rubricNote: string } | null;
  framing: { narrow: string; broad: string; note: string } | null;
  assetProfile: any | null;
  regions: any[];
  levers: any[];
  recommendations: any[];
  risks: any[];
  commercialPlan: any | null;
  whatWouldFlipIt: string[];
  consideredAndRejected: { opportunity: string; reason: string }[];
  sourcesUsed: string[];
  weightedWorthiness: any | null;
  appliedCriteria: any | null;
}

const EMPTY_FACADE: OffPatentFacade = {
  present: false,
  verdict: "",
  verdictConfidence: "",
  dataConfidence: "",
  opportunityThesis: "",
  executiveSummary: "",
  marketWorthinessSummary: "",
  archetype: null,
  framing: null,
  assetProfile: null,
  regions: [],
  levers: [],
  recommendations: [],
  risks: [],
  commercialPlan: null,
  whatWouldFlipIt: [],
  consideredAndRejected: [],
  sourcesUsed: [],
  weightedWorthiness: null,
  appliedCriteria: null,
};

function readRegion(raw: unknown): any {
  const r = asRec(raw);
  const w = asRec(r.marketWorthiness);
  const bc = asRec(r.businessCase);
  return {
    code: sText(r.region),
    label: sText(r.regionLabel) || sText(r.region) || "Market",
    attractiveness: sText(r.attractiveness),
    score: asNum(r.attractivenessScore),
    market: {
      size: sText(asRec(r.market).sizeUSD),
      growth: sText(asRec(r.market).growthRate),
      unmetNeed: sText(asRec(r.market).unmetNeed),
      drivers: asStrs(asRec(r.market).drivers),
      barriers: asStrs(asRec(r.market).barriers),
    },
    legal: {
      authority: sText(asRec(r.legal).regulatoryAuthority),
      pathway: sText(asRec(r.legal).pathway),
      timeline: sText(asRec(r.legal).estimatedTimeline),
      opportunities: asStrs(asRec(r.legal).exclusivityOpportunities),
      barriers: asStrs(asRec(r.legal).barriers),
    },
    commercial: {
      competitors: sText(asRec(r.commercial).competitorActivity),
      pricing: sText(asRec(r.commercial).pricingDynamics),
      reimbursement: sText(asRec(r.commercial).reimbursementLandscape),
      distribution: sText(asRec(r.commercial).distributionChannels),
      partners: asStrs(asRec(r.commercial).keyPartnerCandidates),
    },
    ip: {
      patentStrength: sText(asRec(r.ip).patentStrength),
      fto: sText(asRec(r.ip).ftoStatus),
      years: asNum(asRec(r.ip).estimatedExclusivityYears),
      opportunities: asStrs(asRec(r.ip).opportunities),
      risks: asStrs(asRec(r.ip).expirationRisks),
    },
    cos: r.cos
      ? {
          marketSize: asNum(asRec(r.cos).marketSize),
          regulatory: asNum(asRec(r.cos).regulatory),
          ip: asNum(asRec(r.cos).ip),
          marketAccess: asNum(asRec(r.cos).marketAccess),
          competition: asNum(asRec(r.cos).competition),
        }
      : null,
    manufacturing: r.manufacturing
      ? { complexity: sText(asRec(r.manufacturing).complexity), notes: sText(asRec(r.manufacturing).notes) }
      : null,
    provenanceFlags: asStrs(r.provenanceFlags),
    businessCase: anyOf(bc.valueProposition, bc.profitWedge, bc.economics, bc.verdict)
      ? {
          valueProposition: sText(bc.valueProposition),
          profitWedge: sText(bc.profitWedge),
          economics: sText(bc.economics),
          verdict: sText(bc.verdict),
        }
      : null,
    worthiness: anyOf(w.rating, w.score, w.thesis, w.healthcareLandscape, w.legalLandscape)
      ? {
          rating: sText(w.rating),
          score: asNum(w.score),
          thesis: sText(w.thesis),
          healthcareLandscape: sText(w.healthcareLandscape),
          legalLandscape: sText(w.legalLandscape),
          marketSizeVsCompetitors: sText(w.marketSizeVsCompetitors),
          partnershipRoom: sText(w.partnershipRoom),
          distributionChannels: sText(w.distributionChannels),
          novelPaths: asStrs(w.novelPaths),
        }
      : null,
  };
}

function readLever(raw: unknown): any {
  const l = asRec(raw);
  const nc = readNotComputable(l.notComputable);
  const score = nc.flag ? null : asNum(l.score);
  return {
    name: sText(l.lever) || sText(l.label) || sText(l.key) || "Unnamed lever",
    score,
    notComputable: nc.flag || score == null,
    reason: nc.reason || sText(l.dataGap),
    confidence: cap(l.confidence) || sText(l.confidence),
    computed: l.computed === true,
    evidence: asArr(l.evidence)
      .map((e) => ({ finding: sText(asRec(e).finding) || sText(asRec(e).claim), source: sText(asRec(e).source) }))
      .filter((e) => e.finding),
    actions: asStrs(l.recommendedActions),
    estValue: sText(l.estValueRange),
    dataGap: sText(l.dataGap),
  };
}

/**
 * Pull the off-patent report off a Diagnosis. Returns a facade whose `present`
 * flag is false when there is nothing to render (innovative runs, or an
 * off-patent run stored before the report rode along).
 */
export function readOffPatentReport(diagnosis: Diagnosis): OffPatentFacade {
  const raw = asRec((diagnosis as Record<string, unknown>)?.report);
  if (!Object.keys(raw).length) return EMPTY_FACADE;

  const arch = asRec(raw.archetype);
  const fr = asRec(raw.opportunityFraming);
  const prof = asRec(raw.assetProfile);
  const plan = asRec(raw.commercialPlan);
  const ww = asRec(raw.weightedWorthiness);

  const facade: OffPatentFacade = {
    present: true,
    verdict: sText(raw.verdict),
    verdictConfidence: sText(raw.verdictConfidence),
    dataConfidence: sText(raw.dataConfidence),
    opportunityThesis: sText(raw.opportunityThesis),
    executiveSummary: sText(raw.executiveSummary),
    marketWorthinessSummary: sText(raw.marketWorthinessSummary),
    archetype: anyOf(arch.mode, arch.rationale, arch.rubricNote)
      ? { mode: sText(arch.mode), rationale: sText(arch.rationale), rubricNote: sText(arch.rubricNote) }
      : null,
    framing: anyOf(fr.narrowVerdict, fr.broadVerdict, fr.note)
      ? { narrow: sText(fr.narrowVerdict), broad: sText(fr.broadVerdict), note: sText(fr.note) }
      : null,
    assetProfile: Object.keys(prof).length
      ? {
          name: sText(prof.name),
          description: sText(prof.description),
          modality: sText(prof.modality),
          therapeuticArea: sText(prof.therapeuticArea),
          developmentStage: sText(prof.developmentStage),
          mechanism: sText(prof.mechanism),
          currentMarkets: asStrs(prof.currentMarkets),
          strengths: asStrs(prof.keyStrengths),
          challenges: asStrs(prof.keyChallenges),
          dataPoints: asArr(prof.keyDataPoints)
            .map((d) => ({
              label: sText(asRec(d).label),
              value: sText(asRec(d).value),
              source: sText(asRec(d).source),
              tier: sText(asRec(d).tier),
              basis: sText(asRec(d).basis),
            }))
            .filter((d) => d.label || d.value),
        }
      : null,
    regions: asArr(raw.regionalAnalysis).map(readRegion),
    levers: asArr(raw.valueLevers).map(readLever),
    recommendations: asArr(raw.recommendations)
      .map((x) => {
        const r = asRec(x);
        const v = asRec(r.estimatedValue);
        return {
          rank: asNum(r.priorityRank) ?? 0,
          region: sText(r.targetRegion) || "Market",
          rationale: sText(r.rationale),
          structure: sText(r.recommendedDealStructure),
          upfront: sText(v.upfront),
          total: sText(v.total),
          royalty: sText(v.royaltyRange),
          partners: asStrs(r.topPartnerCandidates),
          prerequisites: asStrs(r.prerequisites),
          timeline: sText(r.estimatedTimeline),
          roi: sText(r.expectedROI),
        };
      })
      .sort((a, b) => a.rank - b.rank),
    risks: asArr(raw.portfolioRisks)
      .map((x) => {
        const r = asRec(x);
        return {
          category: sText(r.category),
          risk: sText(r.risk),
          regions: asStrs(r.affectedRegions),
          impact: sText(r.impact),
          likelihood: sText(r.likelihood),
          mitigation: sText(r.mitigation),
        };
      })
      .filter((r) => r.risk),
    commercialPlan: anyOf(plan.summary, asArr(plan.channels).length, asArr(plan.howToProceed).length)
      ? {
          summary: sText(plan.summary),
          channels: asArr(plan.channels)
            .map((c) => ({
              channel: sText(asRec(c).channel),
              geographies: asStrs(asRec(c).geographies),
              valueRole: sText(asRec(c).valueRole),
              accessMechanics: sText(asRec(c).accessMechanics),
              keyPlayers: asStrs(asRec(c).keyPlayers),
            }))
            .filter((c) => c.channel),
          steps: asArr(plan.howToProceed)
            .map((s) => ({
              step: asNum(asRec(s).step) ?? 0,
              action: sText(asRec(s).action),
              geography: sText(asRec(s).geography),
              approach: sText(asRec(s).approach),
              timing: sText(asRec(s).timing),
              owner: sText(asRec(s).owner),
            }))
            .filter((s) => s.action)
            .sort((a, b) => a.step - b.step),
        }
      : null,
    whatWouldFlipIt: asStrs(raw.whatWouldFlipIt),
    consideredAndRejected: asArr(raw.consideredAndRejected)
      .map((c) => ({ opportunity: sText(asRec(c).opportunity), reason: sText(asRec(c).reason) }))
      .filter((c) => c.opportunity),
    sourcesUsed: asStrs(raw.sourcesUsed),
    weightedWorthiness: anyOf(ww.score, ww.method, asArr(ww.byLever).length)
      ? {
          score: asNum(ww.score),
          method: sText(ww.method),
          note: sText(ww.note),
          byLever: asArr(ww.byLever).map((l) => ({
            lever: sText(asRec(l).lever),
            score: asNum(asRec(l).score),
            weight: asNum(asRec(l).weight),
            computed: asRec(l).computed === true,
          })),
        }
      : null,
    appliedCriteria: Object.keys(asRec(raw.appliedCriteria)).length ? asRec(raw.appliedCriteria) : null,
  };
  return facade;
}

/** Levers that scored, strongest first. */
const scoredLevers = (f: OffPatentFacade): any[] =>
  f.levers.filter((l) => !l.notComputable && l.score != null).sort((a, b) => (b.score ?? 0) - (a.score ?? 0));

/** The region that leads the set, by worthiness where present, else by COS. */
function leadRegion(f: OffPatentFacade): any | null {
  const ranked = f.regions
    .slice()
    .sort((a, b) => (b.worthiness?.score ?? b.score ?? -1) - (a.worthiness?.score ?? a.score ?? -1));
  return ranked[0] ?? null;
}

// ── Executive-summary selections ────────────────────────────────────────────
// The summary is a selection from the same payload the appendix renders in
// full — never a separate, re-worded version of it. These helpers make that
// selection once so the PDF and the deck cannot drift apart.

/** The markets that lead the set: score-ranked, with the verdict and one line. */
function summaryMarkets(
  diagnosis: Diagnosis,
  f: OffPatentFacade,
  limit = 3,
): { label: string; score: string; verdict: string; read: string }[] {
  const perMarket: MarketScore[] = Array.isArray(diagnosis.perMarket) ? diagnosis.perMarket : [];
  if (perMarket.length) {
    return perMarket
      .slice()
      .sort(byScoreDesc)
      .slice(0, limit)
      .map((m) => ({
        label: countryLabel(m.country),
        score: scoreCell(m.score, (m as Record<string, unknown>).notComputable),
        verdict: verdictLabel(m.verdict),
        read: sText(m.summary) || "No read recorded",
      }));
  }
  return f.regions
    .slice()
    .sort((a: any, b: any) => (b.worthiness?.score ?? b.score ?? -1) - (a.worthiness?.score ?? a.score ?? -1))
    .slice(0, limit)
    .map((r: any) => ({
      label: r.label,
      score: r.score != null ? String(Math.round(r.score)) : "Not computable — no score recorded",
      verdict: r.businessCase?.verdict || r.worthiness?.rating || "Not stated",
      read: r.worthiness?.thesis || r.businessCase?.valueProposition || "No read recorded",
    }));
}

/** Top levers (off-patent) or top dimensions (innovative), each with one play. */
function summaryPlays(
  diagnosis: Diagnosis,
  f: OffPatentFacade,
  branch: "off_patent" | "innovative",
  limit = 3,
): { name: string; score: string; play: string }[] {
  if (branch === "off_patent" && f.levers.length) {
    return scoredLevers(f)
      .slice(0, limit)
      .map((l: any) => ({
        name: l.name,
        score: `${Math.round(l.score)}/100`,
        play: sText(l.actions[0]) || (l.estValue ? `Estimated value ${l.estValue}` : "") || "No play recorded for this lever",
      }));
  }
  const dims: DimensionScore[] = Array.isArray(diagnosis.dimensions) ? diagnosis.dimensions : [];
  return dims
    .filter((d) => d.score != null)
    .sort(byScoreDesc)
    .slice(0, limit)
    .map((d) => ({
      name: dimensionLabel(branch, d.key),
      score: `${Math.round(d.score as number)}/100`,
      play:
        sText(d.summary)
        || sText((Array.isArray(d.evidence) ? d.evidence : [])[0]?.claim)
        || "No read recorded for this dimension",
    }));
}

/** The falsifiers: what would change the answer rather than the confidence. */
function summaryFlips(diagnosis: Diagnosis, f: OffPatentFacade, limit = 3): string[] {
  const swing = (Array.isArray(diagnosis.swingFactors) ? diagnosis.swingFactors : []).map(sText).filter(Boolean);
  return (f.whatWouldFlipIt.length ? f.whatWouldFlipIt : swing).slice(0, limit);
}

/** The biggest risks, high-impact first, capped so the summary stays a summary. */
function summaryRisks(diagnosis: Diagnosis, f: OffPatentFacade, limit = 4): string[] {
  const out: string[] = [];
  const push = (s: string) => {
    if (s && out.length < limit && !out.includes(s)) out.push(s);
  };
  const line = (r: any) => `${r.risk}${r.mitigation ? ` — mitigation: ${r.mitigation}` : ""}`;
  for (const r of f.risks.filter((x: any) => x.impact === "High")) push(line(r));
  for (const r of f.risks.filter((x: any) => x.impact !== "High")) push(line(r));
  for (const r of (Array.isArray(diagnosis.topRisks) ? diagnosis.topRisks : []).map(sText)) push(r);
  return out;
}

/**
 * Where the evidence is thin, phrased as what to connect. Null when nothing is
 * missing — an empty "gaps" section reads as a gap that was not looked for.
 */
function summaryGaps(
  diagnosis: Diagnosis,
  branch: "off_patent" | "innovative",
): { notComputable: number; total: number; lines: string[] } | null {
  const dims: DimensionScore[] = Array.isArray(diagnosis.dimensions) ? diagnosis.dimensions : [];
  const notComputable = dims.filter((d) => d.score == null).length;
  const coverage = Array.isArray(diagnosis.coverage) ? diagnosis.coverage : [];
  const lines = coverage
    .filter((c) => (c.unwired ?? []).length > 0)
    .map(
      (c) =>
        `Connect ${(c.unwired ?? []).join(", ")} — "${sText(c.label) || dimensionLabel(branch, c.key)}" is scored without it today.`,
    );
  if (!notComputable && !lines.length) return null;
  return { notComputable, total: dims.length, lines };
}

// ── "What to do next" ───────────────────────────────────────────────────────

export interface NextAction {
  /** The instruction itself — imperative, and specific to this run. */
  action: string;
  /** Who carries it, when the payload says. Empty when it does not. */
  owner: string;
  /** The dependency, evidence or figure that qualifies the instruction. */
  detail: string;
}

/**
 * The "so what do we actually do" list, assembled only from what the payload
 * contains. Nothing here is boilerplate: every line names a region, a lever, a
 * dependency or a source that this run produced. An empty list means the run
 * carried nothing actionable, and the section is skipped rather than padded.
 */
export function buildNextActions(
  diagnosis: Diagnosis,
  f: OffPatentFacade,
  branch: "off_patent" | "innovative",
  limit = 10,
): NextAction[] {
  const out: NextAction[] = [];
  const push = (action: string, owner = "", detail = "") => {
    if (action && out.length < limit) out.push({ action, owner, detail });
  };

  // 1. The recommended route and the dependency that gates it.
  const top = f.recommendations[0];
  if (top) {
    push(
      `Pursue ${top.structure || "market entry"} in ${top.region}`,
      "Business development lead",
      [top.total ? `target total value ${top.total}` : "", top.timeline ? `over ${top.timeline}` : ""]
        .filter(Boolean)
        .join(", "),
    );
    if (top.prerequisites.length) {
      push(`Clear the gating prerequisite before opening talks: ${top.prerequisites[0]}`, "Deal team", top.prerequisites[1] ?? "");
    }
    if (top.partners.length) {
      push(`Open outreach to ${top.partners.slice(0, 3).join(", ")}`, "Business development lead", top.roi);
    }
  }
  const second = f.recommendations[1];
  if (second) {
    push(
      `Keep ${second.region} warm as the fallback route (${second.structure || "structure to be set"})`,
      "Business development lead",
      second.upfront ? `modelled upfront ${second.upfront}` : "",
    );
  }

  // 2. The highest-scoring levers, each with its own recommended play.
  for (const l of scoredLevers(f).slice(0, 3)) {
    if (!l.actions.length) continue;
    push(
      `Capture "${l.name}" (${Math.round(l.score)}/100): ${l.actions[0]}`,
      "Commercial lead",
      [l.estValue ? `est. value ${l.estValue}` : "", l.confidence ? `${l.confidence} confidence` : ""]
        .filter(Boolean)
        .join(" · "),
    );
  }

  // 3. Sequenced commercial plan — these already carry an owner.
  for (const s of (f.commercialPlan?.steps ?? []).slice(0, 2)) {
    push(
      `Step ${s.step}: ${s.action}`,
      s.owner,
      [s.geography, s.approach, s.timing].filter(Boolean).join(" · "),
    );
  }

  // 4. Falsifiers — what would change the answer.
  for (const w of f.whatWouldFlipIt.slice(0, 2)) {
    push(`Commission the evidence that settles this: ${w}`, "Research lead", "This would flip the verdict.");
  }

  // 5. Kill criteria — the high-impact risks, with the mitigation as the instruction.
  for (const r of f.risks.filter((x) => x.impact === "High").slice(0, 2)) {
    push(
      `Kill criterion — stop if unresolved: ${r.risk}`,
      "Risk owner",
      r.mitigation ? `Mitigation: ${r.mitigation}` : "",
    );
  }

  // 6. Close the stated gaps rather than leaving a dead end.
  for (const l of f.levers.filter((x) => x.notComputable && (x.reason || x.dataGap)).slice(0, 2)) {
    push(`Obtain the missing input for "${l.name}": ${l.reason || l.dataGap}`, "Data owner", "Lever is not computable until then.");
  }
  const gaps = asArr((diagnosis as Record<string, unknown>)?.coverage)
    .map(asRec)
    .filter((c) => asStrs(c.unwired).length);
  for (const g of gaps.slice(0, 2)) {
    push(
      `Connect ${asStrs(g.unwired).join(", ")} so ${sText(g.label) || sText(g.key) || "this dimension"} can be scored on full evidence`,
      "Data owner",
      "Scored today without that source.",
    );
  }

  // 7. Branch fallbacks — a run with no report still gets a next step.
  const swing = asStrs((diagnosis as Record<string, unknown>)?.swingFactors);
  for (const s of swing.slice(0, 2)) push(`Resolve first — it moves the answer, not just the confidence: ${s}`, "", "");
  const risks = asStrs((diagnosis as Record<string, unknown>)?.topRisks);
  for (const r of risks.slice(0, 1)) push(`Put a mitigation owner against the lead risk: ${r}`, "", "");
  if (branch === "innovative") {
    const lever = sText((diagnosis as Record<string, unknown>)?.inflectionLever);
    if (lever) push(`Fund the value-inflection lever: ${lever}`, "", "");
  }

  return out;
}

/**
 * The defensible version of the diagnosis: the verdict and its thesis, every
 * dimension score with the basis behind it, the per-market read, the risks, the
 * branch-specific flags or levers, and — the part that makes the rest
 * inspectable — the evidence and the source-coverage log.
 */
export async function buildDiagnosisPdf(
  diagnosis: Diagnosis,
  branch: "off_patent" | "innovative",
  assetName: string,
  opts?: ExportOptions,
): Promise<any> {
  const { jsPDF, autoTable } = await loadPdfDeps();

  const includeMarkets = opts?.includeMarkets !== false;
  const includeEvidence = opts?.includeEvidence !== false;
  const includeAppendix = opts?.includeAppendix !== false;

  const reportName = DIAGNOSIS_REPORT_NAME(branch);
  const state = newPdf(jsPDF, reportName, assetName, STRATEGY_COLOR);

  const dimensions: DimensionScore[] = Array.isArray(diagnosis.dimensions) ? diagnosis.dimensions : [];
  const perMarket: MarketScore[] = Array.isArray(diagnosis.perMarket) ? diagnosis.perMarket : [];
  const topRisks = (Array.isArray(diagnosis.topRisks) ? diagnosis.topRisks : []).map(sText).filter(Boolean);
  const swingFactors = (Array.isArray(diagnosis.swingFactors) ? diagnosis.swingFactors : []).map(sText).filter(Boolean);
  const ipFlags = Array.isArray(diagnosis.ipFlags) ? diagnosis.ipFlags : [];
  const valueLevers = Array.isArray(diagnosis.valueLevers) ? diagnosis.valueLevers : [];
  const rejected = Array.isArray(diagnosis.consideredAndRejected) ? diagnosis.consideredAndRejected : [];
  const coverage = Array.isArray(diagnosis.coverage) ? diagnosis.coverage : [];

  // The full off-patent report, when the run carried one. Every section built
  // from it is skipped silently when the corresponding field is absent.
  const f = readOffPatentReport(diagnosis);
  const leadReg = leadRegion(f);
  const bestLever = scoredLevers(f)[0];
  const actions = buildNextActions(diagnosis, f, branch, 10);

  const scored = dimensions.filter((d) => d.score != null);
  const notComputable = dimensions.length - scored.length;
  const topDimension = scored.slice().sort(byScoreDesc)[0];

  // ── Cover ─────────────────────────────────────────────────────────────────
  coverPage(
    state,
    reportName,
    branch === "off_patent"
      ? "Is this asset worth taking into these markets?"
      : "What is this asset worth, and what would change that?",
    "Every scored dimension with the evidence behind it, the per-market read, and an explicit account of what could not be computed",
    assetName,
    [
      { label: "Verdict", value: f.verdict || verdictLabel(diagnosis.verdict) },
      {
        label: "Worthiness score",
        value: diagnosis.worthinessScore != null ? `${Math.round(diagnosis.worthinessScore)}/100` : "n/a",
      },
      { label: "Verdict confidence", value: f.verdictConfidence || cap(diagnosis.verdictConfidence) || "n/a" },
      { label: "Lead market", value: leadReg?.label ?? (perMarket.length ? `${perMarket.length} assessed` : "n/a") },
    ],
  );

  paragraph(
    state,
    "Internal strategic decision support only. Not medical advice, not promotional material, and not a substitute for regulatory, IP or legal review. Scores are generated from the named sources; anything the evidence base could not support is marked not computable rather than estimated.",
    9.5,
    MUTED,
  );

  // ══════════════════════════════════════════════════════════════════════════
  //  PART 1 — EXECUTIVE SUMMARY. Short enough to stop here.
  // ══════════════════════════════════════════════════════════════════════════

  const headlineThesis = sText(diagnosis.thesis) || f.opportunityThesis;
  sectionTitle(
    state,
    "Executive summary",
    `${f.verdict || verdictLabel(diagnosis.verdict)} — ${assetName}`,
    [
      diagnosis.worthinessScore != null
        ? `Worthiness ${Math.round(diagnosis.worthinessScore)}/100`
        : "Worthiness not computable from the connected evidence",
      `verdict confidence ${(f.verdictConfidence || cap(diagnosis.verdictConfidence) || "not stated").toLowerCase()}`,
      `${scored.length} of ${dimensions.length} dimensions scored`,
    ]
      .filter(Boolean)
      .join("   ·   "),
  );
  if (headlineThesis) lead(state, headlineThesis);
  if (f.opportunityThesis && f.opportunityThesis !== headlineThesis) {
    tinyLabel(state, "Opportunity thesis");
    paragraph(state, f.opportunityThesis);
  }
  if (branch === "innovative" && sText(diagnosis.inflectionLever)) {
    tinyLabel(state, "Biggest value-inflection lever");
    paragraph(state, sText(diagnosis.inflectionLever));
  }
  if (includeAppendix) {
    paragraph(
      state,
      "This is the decision in five sections. The full assessment — every dimension, every market, every lever and the evidence behind them — is in the appendix.",
      9.5,
      MUTED,
    );
  }

  // ── What to do next — the centrepiece of the summary ──────────────────────
  if (actions.length) {
    sectionTitle(
      state,
      "What to do next",
      f.recommendations[0]
        ? `Open ${f.recommendations[0].region} first, then work the list below in order`
        : bestLever
          ? `Start with "${bestLever.name}" — the highest-scoring play in this run`
          : "The moves this diagnosis actually supports",
      "Every line below is drawn from this run's own output — the recommended route and its dependency, the strongest levers, the evidence that would flip the verdict, and the gaps to close.",
    );
    table(state, {
      head: [["#", "Do this", "Owner", "Because"]],
      body: actions.map((a, i) => [String(i + 1), a.action, a.owner || "Not assigned", a.detail || "—"]),
      columnStyles: {
        0: { halign: "center", fontStyle: "bold", textColor: STRATEGY_COLOR, cellWidth: 26 },
        1: { fontStyle: "bold", textColor: INK, cellWidth: 188 },
        2: { cellWidth: 86, textColor: MUTED },
        3: { textColor: BODY },
      },
    }, autoTable);
  }

  // ── Lead markets ──────────────────────────────────────────────────────────
  const leadMarkets = summaryMarkets(diagnosis, f, 3);
  if (leadMarkets.length) {
    sectionTitle(
      state,
      "Lead markets",
      `${leadMarkets[0].label} leads the set — take it first`,
      includeAppendix
        ? "The three strongest markets in this run. Full per-market detail is in the appendix."
        : "The three strongest markets in this run, ranked by score.",
    );
    table(state, {
      head: [["Market", "Score", "Verdict", "The read"]],
      body: leadMarkets.map((m) => [m.label, m.score, m.verdict, truncate(m.read, 150)]),
      columnStyles: {
        0: { fontStyle: "bold", textColor: INK, cellWidth: 96 },
        1: { cellWidth: 120 },
        2: { cellWidth: 66 },
        3: { textColor: BODY },
      },
    }, autoTable);
  }

  // ── The plays that carry the value ────────────────────────────────────────
  const plays = summaryPlays(diagnosis, f, branch, 3);
  if (plays.length) {
    sectionTitle(
      state,
      branch === "off_patent" && f.levers.length ? "Top value levers" : "Strongest dimensions",
      `Start with "${plays[0].name}" — the strongest play in this run`,
      includeAppendix
        ? "The three highest-scoring, each with the single move it supports. Every lever and dimension, with its evidence, is in the appendix."
        : "The three highest-scoring, each with the single move it supports.",
    );
    table(state, {
      head: [[branch === "off_patent" && f.levers.length ? "Lever" : "Dimension", "Score", "Recommended play"]],
      body: plays.map((p) => [p.name, p.score, truncate(p.play, 150)]),
      columnStyles: {
        0: { fontStyle: "bold", textColor: INK, cellWidth: 150 },
        1: { halign: "right", fontStyle: "bold", cellWidth: 60 },
        2: { textColor: BODY },
      },
    }, autoTable);
  }

  // ── The binding constraint and the biggest risks ──────────────────────────
  const flipsSummary = summaryFlips(diagnosis, f, 3);
  const risksSummary = summaryRisks(diagnosis, f, 4);
  if (flipsSummary.length || risksSummary.length) {
    sectionTitle(
      state,
      "What would change this",
      flipsSummary[0] ? `The binding constraint: ${truncate(flipsSummary[0], 110)}` : "What could kill this",
      "Obtaining the evidence below either confirms the verdict or overturns it; the risks are what has to be owned either way.",
    );
    if (flipsSummary.length) {
      tinyLabel(state, "What would flip the verdict");
      bullets(state, flipsSummary.map((s) => truncate(s, 170)), STRATEGY_COLOR);
    }
    if (risksSummary.length) {
      tinyLabel(state, "Biggest risks");
      bullets(state, risksSummary.map((s) => truncate(s, 170)), INK);
    }
  }

  // ── Where the evidence is thin. Skipped entirely when nothing is missing. ──
  const gaps = summaryGaps(diagnosis, branch);
  if (gaps) {
    sectionTitle(
      state,
      "Where the evidence is thin",
      gaps.lines.length
        ? `Connect ${gaps.lines.length} source set${gaps.lines.length === 1 ? "" : "s"} to firm up this verdict`
        : `${gaps.notComputable} of ${gaps.total} dimensions could not be computed`,
      gaps.notComputable
        ? `${gaps.notComputable} of ${gaps.total} dimensions state why they could not be computed rather than showing a number.`
        : "Every dimension was computable, but sources that apply to this asset are not connected.",
    );
    if (gaps.lines.length) bullets(state, gaps.lines, NEG);
  }

  // A summary-only file stops here: no divider, no appendix.
  if (!includeAppendix) {
    sourceNote(state, DIAGNOSIS_DISCLAIMER);
    return state.doc;
  }

  // ══════════════════════════════════════════════════════════════════════════
  //  PART 2 — APPENDIX
  // ══════════════════════════════════════════════════════════════════════════
  appendixDivider(state);
  const ax = appendixCounter();

  // ── Verdict & thesis ──────────────────────────────────────────────────────
  sectionTitle(
    state,
    ax("Verdict"),
    `${f.verdict || verdictLabel(diagnosis.verdict)} — ${assetName}`,
    [
      diagnosis.worthinessScore != null
        ? `Worthiness ${Math.round(diagnosis.worthinessScore)}/100`
        : "Worthiness score not computable from the connected evidence",
      diagnosis.verdictConfidence ? `verdict confidence ${sText(diagnosis.verdictConfidence)}` : "",
      `${scored.length} of ${dimensions.length} dimensions scored`,
    ]
      .filter(Boolean)
      .join("   ·   "),
  );
  if (sText(diagnosis.thesis)) lead(state, sText(diagnosis.thesis));
  if (f.opportunityThesis && f.opportunityThesis !== sText(diagnosis.thesis)) {
    tinyLabel(state, "Opportunity thesis");
    paragraph(state, f.opportunityThesis);
  }
  if (f.executiveSummary) {
    tinyLabel(state, "Executive summary");
    paragraph(state, f.executiveSummary);
  }
  if (f.archetype) {
    tinyLabel(state, `Value-capture archetype${f.archetype.mode ? ` — ${f.archetype.mode}` : ""}`);
    if (f.archetype.rationale) paragraph(state, f.archetype.rationale);
    if (f.archetype.rubricNote) paragraph(state, `Scoring lens: ${f.archetype.rubricNote}`, 9.5, MUTED);
  }
  if (f.framing) {
    subHeader(state, "Two questions — framing the verdict", STRATEGY_COLOR);
    if (f.framing.narrow) { tinyLabel(state, "Narrow — the off-patent in-license trade"); paragraph(state, f.framing.narrow); }
    if (f.framing.broad) { tinyLabel(state, "Broad — is there any real market value"); paragraph(state, f.framing.broad); }
    if (f.framing.note) paragraph(state, f.framing.note, 9.5, MUTED);
  }
  if (branch === "innovative" && sText(diagnosis.inflectionLever)) {
    tinyLabel(state, "Biggest value-inflection lever");
    paragraph(state, sText(diagnosis.inflectionLever));
  }
  if (f.weightedWorthiness && f.weightedWorthiness.score != null) {
    subHeader(state, `Client-weighted worthiness — ${Math.round(f.weightedWorthiness.score)}/100`, STRATEGY_COLOR);
    if (f.weightedWorthiness.method) paragraph(state, f.weightedWorthiness.method, 9.5, MUTED);
    if (f.weightedWorthiness.byLever.length) {
      table(state, {
        head: [["Lever", "Score", "Weight", "Basis"]],
        body: f.weightedWorthiness.byLever.map((l: any) => [
          l.lever || "Unnamed lever",
          l.score != null ? String(Math.round(l.score)) : "n/a",
          l.weight != null ? String(Math.round(l.weight)) : "n/a",
          l.computed ? "Computed" : "Reasoned",
        ]),
        columnStyles: {
          0: { fontStyle: "bold", textColor: INK, cellWidth: 200 },
          1: { halign: "right", cellWidth: 60 },
          2: { halign: "right", cellWidth: 60 },
          3: { textColor: MUTED },
        },
      }, autoTable);
    }
    if (f.weightedWorthiness.note) paragraph(state, f.weightedWorthiness.note, 9.5, MUTED);
  }

  // ── Asset profile (off-patent report) ─────────────────────────────────────
  if (f.assetProfile) {
    const p = f.assetProfile;
    sectionTitle(
      state,
      ax("Asset profile"),
      p.name ? `${p.name}${p.developmentStage ? ` — ${p.developmentStage}` : ""}` : "The asset under assessment",
      p.description || undefined,
    );
    const facts: [string, string][] = [
      ["Modality", p.modality],
      ["Mechanism", p.mechanism],
      ["Therapeutic area", p.therapeuticArea],
      ["Development stage", p.developmentStage],
      ["Current markets", p.currentMarkets.join(", ")],
    ];
    const filled = facts.filter(([, v]) => !!v);
    if (filled.length) {
      table(state, {
        body: filled,
        columnStyles: { 0: { fontStyle: "bold", textColor: INK, cellWidth: 150 }, 1: { textColor: BODY } },
      }, autoTable);
    }
    if (p.strengths.length) { subHeader(state, "Key strengths — lead with these", POS); bullets(state, p.strengths, POS); }
    if (p.challenges.length) { subHeader(state, "Key challenges — plan around these", INK); bullets(state, p.challenges, INK); }
    if (p.dataPoints.length) {
      subHeader(state, "Key data points", INK);
      const tier3 = p.dataPoints.filter((d: any) => d.tier === "Tier 3").length;
      if (tier3) {
        paragraph(
          state,
          `${tier3} of ${p.dataPoints.length} data points rest on Tier-3 sources — verify these independently before relying on them.`,
          9.5,
          MUTED,
        );
      }
      table(state, {
        head: [["Metric", "Value", "Source", "Tier", "Basis"]],
        body: p.dataPoints.map((d: any) => [
          d.label || "—",
          d.value || "—",
          d.source || "Not stated",
          d.tier || "Not tiered",
          d.basis === "inference" ? "Inference" : d.basis === "evidence" ? "Evidence" : "—",
        ]),
        columnStyles: {
          0: { fontStyle: "bold", textColor: INK, cellWidth: 104 },
          2: { textColor: MUTED },
          3: { cellWidth: 56 },
          4: { cellWidth: 64, textColor: MUTED },
        },
      }, autoTable);
    }
  }

  // ── Dimension scores ──────────────────────────────────────────────────────
  if (dimensions.length) {
    sectionTitle(
      state,
      ax("Dimension scores"),
      topDimension
        ? `${dimensionLabel(branch, topDimension.key)} is the strongest dimension`
        : "No dimension could be scored from the connected evidence",
      notComputable
        ? `${notComputable} of ${dimensions.length} dimensions could not be computed; each states why in place of a number — connect the named source to close it.`
        : "Computed dimensions are owned by the deterministic layer; reasoned dimensions are the model's read of the cited evidence.",
    );
    table(state, {
      head: [["Dimension", "Score", "Confidence", "Basis"]],
      body: dimensions.map((d) => [
        dimensionLabel(branch, d.key),
        scoreCell(d.score, d.notComputable),
        cap(d.confidence) || "—",
        d.computed === true ? "Computed" : "Reasoned",
      ]),
      columnStyles: {
        0: { fontStyle: "bold", textColor: INK, cellWidth: 118 },
        1: { cellWidth: 148 },
        2: { cellWidth: 76 },
        3: { cellWidth: 72, textColor: MUTED },
      },
      didParseCell: (data: ParsedCell) => {
        if (data.section !== "body" || data.column.index !== 1) return;
        const d = dimensions[data.row.index];
        if (!d) return;
        if (d.score == null) {
          data.cell.styles.textColor = NEG;
          data.cell.styles.fontStyle = "italic";
        } else {
          data.cell.styles.fontStyle = "bold";
        }
      },
    }, autoTable);
  }

  // ── Value levers ──────────────────────────────────────────────────────────
  const leverRows = f.present && f.levers.length ? f.levers : null;
  if (branch === "off_patent" && (leverRows || valueLevers.length)) {
    pageBreak(state);
    const live = leverRows ? scoredLevers(f) : [];
    sectionTitle(
      state,
      ax("Value levers"),
      live[0]
        ? `"${live[0].name}" is the strongest play — start there`
        : "Where value still sits in an already-approved asset",
      "Levers the evidence base cannot support are marked with the input that would make them computable, never scored to a plausible-looking number.",
    );
    if (leverRows) {
      table(state, {
        head: [["Lever", "Score", "Confidence", "Est. value", "Basis"]],
        body: leverRows.map((l: any) => [
          l.name,
          l.notComputable ? `Not computable — ${l.reason || "no reason recorded"}` : String(Math.round(l.score)),
          l.notComputable ? "—" : (l.confidence || "—"),
          l.estValue || "—",
          l.notComputable ? "Not computable" : l.computed ? "Computed" : "Reasoned",
        ]),
        columnStyles: {
          0: { fontStyle: "bold", textColor: INK, cellWidth: 104 },
          1: { cellWidth: 132 },
          2: { cellWidth: 76 },
          4: { cellWidth: 76, textColor: MUTED },
        },
        didParseCell: (data: ParsedCell) => {
          if (data.section !== "body" || data.column.index !== 1) return;
          const l = leverRows[data.row.index];
          if (l && l.notComputable) {
            data.cell.styles.textColor = NEG;
            data.cell.styles.fontStyle = "italic";
          }
        },
      }, autoTable);

      // Per-lever detail — evidence, plays, value and the gap that limits it.
      for (const l of [...scoredLevers(f), ...f.levers.filter((x: any) => x.notComputable)]) {
        ensureSpace(state, 90);
        subHeader(
          state,
          l.notComputable ? `${l.name} — not computable` : `${l.name} — ${Math.round(l.score)}/100`,
          l.notComputable ? INK : STRATEGY_COLOR,
        );
        if (l.evidence.length) {
          tinyLabel(state, "Evidence");
          bullets(state, l.evidence.map((e: any) => (e.source ? `${e.finding} — ${e.source}` : e.finding)));
        }
        if (l.actions.length) {
          tinyLabel(state, "Recommended plays");
          bullets(state, l.actions, STRATEGY_COLOR);
        }
        if (l.estValue) { tinyLabel(state, "Estimated value"); paragraph(state, l.estValue); }
        if (l.dataGap || l.reason) {
          tinyLabel(state, "Evidence needed to close this");
          paragraph(state, `Obtain: ${l.dataGap || l.reason}`, 9.5, MUTED);
        }
      }
    } else {
      table(state, {
        head: [["Lever", "Score", "Confidence", "Basis"]],
        body: valueLevers.map((l) => {
          const nc = readNotComputable(l.notComputable);
          const raw = Number(l.score);
          const hasScore = !nc.flag && Number.isFinite(raw);
          return [
            sText(l.lever) || sText(l.label) || sText(l.key) || "Unnamed lever",
            hasScore
              ? String(Math.round(raw))
              : `Not computable — ${nc.reason || sText(l.dataGap) || "no reason recorded"}`,
            cap(l.confidence) || "—",
            nc.flag ? "Not computable" : l.computed === true ? "Computed" : "Reasoned",
          ];
        }),
        columnStyles: {
          0: { fontStyle: "bold", textColor: INK, cellWidth: 118 },
          1: { cellWidth: 158 },
          2: { cellWidth: 76 },
          3: { cellWidth: 72, textColor: MUTED },
        },
      }, autoTable);
    }
  }

  // ── Markets ───────────────────────────────────────────────────────────────
  if (includeMarkets && perMarket.length) {
    const ranked = perMarket.slice().sort(byScoreDesc);
    const leadMarket = ranked.find((m) => m.score != null);
    sectionTitle(
      state,
      ax("Markets"),
      leadMarket
        ? `${countryLabel(leadMarket.country)} leads the market set — take it first`
        : "No market could be scored from the connected evidence",
      "Ranked by score; markets the evidence could not support are listed last and say why.",
    );
    table(state, {
      head: [["Market", "Score", "Verdict", "Read"]],
      body: ranked.map((m) => [
        countryLabel(m.country),
        scoreCell(m.score, (m as Record<string, unknown>).notComputable),
        verdictLabel(m.verdict),
        sText(m.summary) || "Not stated",
      ]),
      columnStyles: {
        0: { fontStyle: "bold", textColor: INK, cellWidth: 96 },
        1: { cellWidth: 120 },
        2: { cellWidth: 66 },
        3: { textColor: BODY },
      },
      didParseCell: (data: ParsedCell) => {
        if (data.section !== "body" || data.column.index !== 1) return;
        const m = ranked[data.row.index];
        if (m && m.score == null) {
          data.cell.styles.textColor = NEG;
          data.cell.styles.fontStyle = "italic";
        }
      },
    }, autoTable);
  }

  // ── Regional assessment (off-patent report) ───────────────────────────────
  if (f.regions.length) {
    pageBreak(state);
    sectionTitle(
      state,
      ax("Regional assessment"),
      leadReg
        ? `${leadReg.label} leads on ${leadReg.worthiness ? "commercial worthiness" : "commercial opportunity"} — concentrate effort there`
        : "Regional opportunity matrix",
      "Attractiveness blends market, regulatory, commercial and IP into one 0–100 read; market worthiness is the separate purely-commercial verdict.",
    );
    table(state, {
      head: [["Region", "Rating", "COS", "Worthiness", "Market size", "Growth", "Patent", "FTO"]],
      body: f.regions.map((r: any) => [
        r.label,
        r.attractiveness || "—",
        r.score != null ? String(Math.round(r.score)) : "n/a",
        r.worthiness ? `${r.worthiness.rating || "—"}${r.worthiness.score != null ? ` (${Math.round(r.worthiness.score)})` : ""}` : "Not assessed",
        r.market.size || "—",
        r.market.growth || "—",
        r.ip.patentStrength || "—",
        r.ip.fto || "—",
      ]),
      columnStyles: {
        0: { fontStyle: "bold", textColor: INK, cellWidth: 62 },
        2: { halign: "right", fontStyle: "bold", cellWidth: 40 },
        3: { cellWidth: 88 },
      },
    }, autoTable);
    if (f.marketWorthinessSummary) {
      subHeader(state, "Market worthiness — the cross-market read", STRATEGY_COLOR);
      paragraph(state, f.marketWorthinessSummary, 10.5, INK);
    }
    if (f.sourcesUsed.length) sourceNote(state, f.sourcesUsed.join(", "));

    for (const r of f.regions) {
      pageBreak(state);
      sectionTitle(
        state,
        ax(`${r.label} · ${r.attractiveness || "not rated"}`),
        r.businessCase?.verdict
          ? `${r.label} — ${r.businessCase.verdict}${r.score != null ? ` (${Math.round(r.score)}/100)` : ""}`
          : `${r.label}${r.score != null ? ` — ${Math.round(r.score)}/100` : ""}`,
        r.worthiness?.thesis || r.businessCase?.valueProposition || undefined,
      );

      if (r.provenanceFlags.length) {
        subHeader(state, "Provenance flags — verify before relying", INK);
        bullets(state, r.provenanceFlags, INK);
      }

      if (r.businessCase) {
        subHeader(state, `Business case — ${r.businessCase.verdict || "call not stated"}`, STRATEGY_COLOR);
        if (r.businessCase.valueProposition) paragraph(state, r.businessCase.valueProposition, 10.5, INK);
        if (r.businessCase.profitWedge) { tinyLabel(state, "Where the profitable case is"); paragraph(state, r.businessCase.profitWedge); }
        if (r.businessCase.economics) { tinyLabel(state, "Economics"); paragraph(state, r.businessCase.economics); }
      }

      if (r.cos) {
        const cosRows: [string, number | null][] = [
          ["Market size", r.cos.marketSize],
          ["Regulatory", r.cos.regulatory],
          ["IP runway", r.cos.ip],
          ["Market access", r.cos.marketAccess],
          ["Low competition", r.cos.competition],
        ];
        const present = cosRows.filter(([, v]) => v != null);
        if (present.length) {
          subHeader(state, "Commercial opportunity score — drivers", INK_2);
          table(state, {
            head: [["Driver", "Score"]],
            body: present.map(([k, v]) => [k, String(Math.round(v as number))]),
            columnStyles: { 0: { fontStyle: "bold", textColor: INK, cellWidth: 180 }, 1: { halign: "right", cellWidth: 70 } },
          }, autoTable);
        }
      }

      writeDimension(state, autoTable, "Market & epidemiology", [
        ["Size", r.market.size],
        ["Growth", r.market.growth],
        ["Unmet need", r.market.unmetNeed],
      ], r.market.drivers, r.market.barriers);

      writeDimension(state, autoTable, "Regulatory pathway", [
        ["Authority", r.legal.authority],
        ["Pathway", r.legal.pathway],
        ["Timeline", r.legal.timeline],
      ], r.legal.opportunities, r.legal.barriers);

      writeDimension(state, autoTable, "Market access & competition", [
        ["Competitive density", r.commercial.competitors],
        ["Pricing / HTA", r.commercial.pricing],
        ["Reimbursement", r.commercial.reimbursement],
        ["Distribution", r.commercial.distribution],
      ], r.commercial.partners, []);

      writeDimension(state, autoTable, "IP & exclusivity", [
        ["Patent strength", r.ip.patentStrength],
        ["FTO status", r.ip.fto],
        ["Est. exclusivity", r.ip.years != null ? `${r.ip.years} years` : null],
      ], r.ip.opportunities, r.ip.risks);

      if (r.manufacturing && (r.manufacturing.complexity || r.manufacturing.notes)) {
        writeDimension(state, autoTable, "Manufacturing & CMC", [
          ["Complexity", r.manufacturing.complexity],
          ["Notes", r.manufacturing.notes],
        ], [], []);
      }

      if (r.worthiness) {
        const w = r.worthiness;
        ensureSpace(state, 80);
        subHeader(
          state,
          `Market worthiness — ${w.rating || "not rated"}${w.score != null ? `  (${Math.round(w.score)}/100)` : ""}`,
          STRATEGY_COLOR,
        );
        if (w.thesis) paragraph(state, w.thesis, 10.5, INK);
        const wRows: [string, string][] = [
          ["Healthcare landscape", w.healthcareLandscape],
          ["Legal landscape", w.legalLandscape],
          ["Market size vs competitors", w.marketSizeVsCompetitors],
          ["Room for partnerships", w.partnershipRoom],
          ["Distribution channels", w.distributionChannels],
        ];
        const wPresent = wRows.filter(([, v]) => !!v);
        if (wPresent.length) {
          table(state, {
            body: wPresent,
            columnStyles: { 0: { fontStyle: "bold", textColor: INK, cellWidth: 150 }, 1: { textColor: BODY } },
          }, autoTable);
        }
        if (w.novelPaths.length) {
          tinyLabel(state, "Novel paths to capture the market");
          bullets(state, w.novelPaths, STRATEGY_COLOR);
        }
      }
    }
  }

  // ── Recommendations (off-patent report) ───────────────────────────────────
  if (f.recommendations.length) {
    pageBreak(state);
    const first = f.recommendations[0];
    sectionTitle(
      state,
      ax("Recommendations"),
      `Prioritise ${first.region} via ${first.structure || "out-licensing"}`,
      "Ranked by priority; each row is a route to open, not an option to consider.",
    );
    table(state, {
      head: [["#", "Region", "Structure", "Upfront", "Total", "Royalty", "Timeline"]],
      body: f.recommendations.map((r: any) => [
        String(r.rank || "—"),
        r.region,
        r.structure || "—",
        r.upfront || "—",
        r.total || "—",
        r.royalty || "—",
        r.timeline || "—",
      ]),
      columnStyles: {
        0: { halign: "center", fontStyle: "bold", textColor: STRATEGY_COLOR, cellWidth: 30 },
        1: { fontStyle: "bold", textColor: INK, cellWidth: 66 },
        3: { textColor: POS, fontStyle: "bold" },
        4: { textColor: POS, fontStyle: "bold" },
        5: { textColor: POS },
      },
    }, autoTable);
    for (const r of f.recommendations) {
      ensureSpace(state, 90);
      subHeader(state, `#${r.rank} ${r.region}`, STRATEGY_COLOR);
      if (r.rationale) paragraph(state, r.rationale);
      if (r.partners.length) { tinyLabel(state, "Top partner candidates — open these conversations"); paragraph(state, r.partners.join("   ·   ")); }
      if (r.prerequisites.length) { tinyLabel(state, "Prerequisites to clear first"); bullets(state, r.prerequisites); }
      if (r.roi) { tinyLabel(state, "Expected ROI"); paragraph(state, r.roi, 10, POS); }
    }
  }

  // ── Business case / commercial plan (off-patent report) ───────────────────
  if (f.commercialPlan) {
    const cp = f.commercialPlan;
    pageBreak(state);
    const firstStep = cp.steps[0];
    sectionTitle(
      state,
      ax("Business case"),
      firstStep ? `Start with step ${firstStep.step} — ${firstStep.action}` : "Commercial channels and go-to-market",
      cp.summary || undefined,
    );
    if (cp.channels.length) {
      subHeader(state, "Commercial channels", STRATEGY_COLOR);
      table(state, {
        head: [["Channel", "Geos", "Where the value is", "How to win it"]],
        body: cp.channels.map((c: any) => [
          c.channel,
          c.geographies.join(", ") || "—",
          c.valueRole || "—",
          [c.accessMechanics, c.keyPlayers.length ? `Players: ${c.keyPlayers.join(", ")}` : ""].filter(Boolean).join("  "),
        ]),
        columnStyles: {
          0: { fontStyle: "bold", textColor: INK, cellWidth: 92 },
          1: { cellWidth: 66 },
          2: { cellWidth: 130 },
        },
      }, autoTable);
    }
    if (cp.steps.length) {
      subHeader(state, "How to proceed", STRATEGY_COLOR);
      table(state, {
        head: [["#", "Action", "Geography", "Approach", "Timing", "Owner"]],
        body: cp.steps.map((s: any) => [
          String(s.step),
          s.action,
          s.geography || "—",
          s.approach || "—",
          s.timing || "—",
          s.owner || "Not assigned",
        ]),
        columnStyles: {
          0: { halign: "center", fontStyle: "bold", textColor: STRATEGY_COLOR, cellWidth: 24 },
          1: { cellWidth: 150, fontStyle: "bold", textColor: INK },
          3: { textColor: POS },
          5: { textColor: MUTED },
        },
      }, autoTable);
    }
  }

  // ── Flaws & blockers ──────────────────────────────────────────────────────
  if (f.risks.length || topRisks.length || swingFactors.length) {
    pageBreak(state);
    const high = f.risks.filter((r: any) => r.impact === "High");
    sectionTitle(
      state,
      ax("Flaws & blockers"),
      high.length
        ? `${high.length} high-impact blocker${high.length === 1 ? "" : "s"} must be owned before committing`
        : "What could kill this, and what most moves the score",
      "Swing factors are the variables to resolve first — they change the answer, not just the confidence.",
    );
    if (f.risks.length) {
      table(state, {
        head: [["Category", "Risk", "Impact", "Likely", "Regions", "Mitigation — do this"]],
        body: f.risks.map((r: any) => [
          r.category || "—",
          r.risk,
          r.impact || "—",
          r.likelihood || "—",
          r.regions.join(", ") || "—",
          r.mitigation || "No mitigation recorded — assign an owner to define one",
        ]),
        columnStyles: {
          0: { fontStyle: "bold", textColor: INK, cellWidth: 62 },
          1: { cellWidth: 106 },
          2: { cellWidth: 48 },
          3: { cellWidth: 48 },
          4: { cellWidth: 56 },
          5: { cellWidth: 120 },
        },
        didParseCell: (data: ParsedCell) => {
          if (data.section === "body" && data.column.index === 2 && String(data.cell.raw) === "High") {
            data.cell.styles.textColor = NEG;
            data.cell.styles.fontStyle = "bold";
          }
        },
      }, autoTable);
    }
    if (topRisks.length) { subHeader(state, "Top risks", INK); bullets(state, topRisks, INK); }
    if (swingFactors.length) { subHeader(state, "Swing factors — resolve these first", STRATEGY_COLOR); bullets(state, swingFactors, STRATEGY_COLOR); }
  }

  // ── IP / freedom-to-operate flags (innovative) ────────────────────────────
  if (branch === "innovative" && ipFlags.length) {
    pageBreak(state);
    sectionTitle(
      state,
      ax("IP & freedom to operate"),
      "Flags counsel must clear before any commitment",
      "A screen of public patent and regulatory records, not a legal opinion. Nothing below clears freedom to operate.",
    );
    table(state, {
      head: [["Severity", "Claim / flag", "Why it matters", "Citation"]],
      body: ipFlags.map((fl) => [
        (sText(fl.severity) || "not stated").toUpperCase(),
        sText(fl.flag) || sText(fl.claim) || sText(fl.label) || "Unnamed flag",
        sText(fl.note) || sText(fl.whyItMatters) || sText(fl.why) || "Not stated",
        sText(fl.citation) || sText(fl.source) || "Not cited",
      ]),
      columnStyles: {
        0: { fontStyle: "bold", cellWidth: 62, textColor: NEG },
        1: { fontStyle: "bold", textColor: INK, cellWidth: 140 },
        2: { textColor: BODY },
        3: { cellWidth: 92, textColor: MUTED },
      },
    }, autoTable);
  }

  // ── What would flip the verdict / considered and rejected ─────────────────
  const flips = f.whatWouldFlipIt.length ? f.whatWouldFlipIt : swingFactors;
  if (f.whatWouldFlipIt.length) {
    sectionTitle(
      state,
      ax("What would flip the verdict"),
      "The evidence that would change this answer — go and get it",
      "Each item is falsifiable: obtaining it either confirms the verdict or overturns it.",
    );
    bullets(state, f.whatWouldFlipIt, STRATEGY_COLOR);
  }
  const rejectedRows = f.consideredAndRejected.length
    ? f.consideredAndRejected
    : rejected.map((r) => ({ opportunity: sText(r.opportunity), reason: sText(r.reason) }));
  if (rejectedRows.length) {
    sectionTitle(
      state,
      ax("Considered and rejected"),
      "The angles argued for and then excluded — do not reopen these without new evidence",
      "Each was steelmanned before being set aside; the reason is the bar new evidence has to clear.",
    );
    table(state, {
      head: [["Opportunity", "Why it was rejected"]],
      body: rejectedRows.map((r: any) => [r.opportunity || "—", r.reason || "Not stated"]),
      columnStyles: { 0: { fontStyle: "bold", textColor: INK, cellWidth: 180 }, 1: { textColor: BODY } },
    }, autoTable);
  }

  // ── Evidence & sources ────────────────────────────────────────────────────
  if (includeEvidence) {
    const evidenceRows = dimensions.flatMap((d) =>
      (Array.isArray(d.evidence) ? d.evidence : []).map((e: EvidenceItem) => [
        dimensionLabel(branch, d.key),
        sText(e.claim) || "—",
        e.kind === "estimate" ? "Estimate" : "Evidence",
        sText(e.source) || "Not stated",
        e.tier != null ? `Tier ${e.tier}` : "—",
      ]),
    );
    if (evidenceRows.length) {
      pageBreak(state);
      const estimates = evidenceRows.filter((r) => r[2] === "Estimate").length;
      sectionTitle(
        state,
        ax("Evidence"),
        estimates
          ? `${estimates} of ${evidenceRows.length} claims are inferences — source them before they carry a decision`
          : "Every claim is sourced",
        "Items marked Estimate are CartaOS inferences, not sourced findings; a claim with no named source is shown as such rather than dressed as evidence.",
      );
      table(state, {
        head: [["Dimension", "Claim", "Type", "Source", "Tier"]],
        body: evidenceRows,
        columnStyles: {
          0: { fontStyle: "bold", textColor: INK, cellWidth: 86 },
          1: { textColor: BODY },
          2: { cellWidth: 60 },
          3: { cellWidth: 88, textColor: MUTED },
          4: { cellWidth: 44, textColor: MUTED },
        },
        didParseCell: (data: ParsedCell) => {
          if (data.section === "body" && data.column.index === 2 && String(data.cell.raw) === "Estimate") {
            data.cell.styles.textColor = NEG;
            data.cell.styles.fontStyle = "bold";
          }
        },
      }, autoTable);
    }
  }

  // ── Source coverage ───────────────────────────────────────────────────────
  if (coverage.length) {
    const gaps = coverage.filter((c) => (c.unwired ?? []).length > 0);
    sectionTitle(
      state,
      ax("Source coverage"),
      gaps.length
        ? `Connect ${gaps.length} missing source set${gaps.length === 1 ? "" : "s"} to firm up the score`
        : "Every applicable source was connected",
      "Which registry sources were actually consulted per dimension, and which apply to this asset but have no connected client.",
    );
    table(state, {
      head: [["Dimension", "Sources consulted", "Applicable but not connected"]],
      body: coverage.map((c) => [
        sText(c.label) || dimensionLabel(branch, c.key),
        (c.consulted ?? []).length ? `${(c.consulted ?? []).length} — ${(c.consulted ?? []).join(", ")}` : "None",
        (c.unwired ?? []).length ? (c.unwired ?? []).join(", ") : "None",
      ]),
      columnStyles: {
        0: { fontStyle: "bold", textColor: INK, cellWidth: 120 },
        1: { textColor: BODY },
        2: { textColor: NEG },
      },
    }, autoTable);
    if (gaps.length) {
      paragraph(
        state,
        "The sources listed above as applicable but not connected do apply to this asset and were not consulted — no client is wired to them. Connect them and re-run before treating those dimensions as settled.",
        9.5,
        MUTED,
      );
    }
  }

  if (f.sourcesUsed.length) {
    sectionTitle(state, ax("Data sources"), "Every source behind this assessment");
    paragraph(state, f.sourcesUsed.join("   ·   "), 9.5, MUTED);
  }
  if (!flips.length && !actions.length) {
    // Nothing actionable was recorded — say so rather than leaving the reader
    // to conclude the run simply had nothing to add.
    paragraph(state, "This run recorded no explicit next steps or falsifiers.", 9.5, MUTED);
  }

  sourceNote(state, DIAGNOSIS_DISCLAIMER);

  return state.doc;
}

export async function exportDiagnosisPDF(
  diagnosis: Diagnosis,
  branch: "off_patent" | "innovative",
  assetName: string,
  opts?: ExportOptions,
) {
  const doc = await buildDiagnosisPdf(diagnosis, branch, assetName, opts);
  doc.save(`${safeFilename(assetName)}_Diagnosis.pdf`);
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

/**
 * Hard layout contract for every deck this module builds:
 *  - body content lives between the section rule and BODY_LIMIT;
 *  - the only things allowed at or below BODY_LIMIT are the footer band
 *    (source note + slide number), which must still finish inside the slide;
 *  - nothing extends right of RIGHT_LIMIT;
 *  - nothing is set below PPT_MIN_PT.
 * tests/export-layout.test.ts asserts all four against the generated XML.
 */
const BODY_LIMIT = 6.85;
const BLOCK_GAP = 0.18;               // minimum gutter between stacked blocks
const PPT_MIN_PT = 10;

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
function fitFont(text: string, wIn: number, hIn: number, maxPt: number, minPt = PPT_MIN_PT): number {
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
  const o: any = { fontFace: F, wrap: true, fit: "shrink", margin: 5, lineSpacingMultiple: 1.15, ...opts };
  if (typeof o.fontSize === "number") o.fontSize = Math.max(PPT_MIN_PT, o.fontSize);
  if (typeof o.w === "number" && typeof o.h === "number") {
    if (typeof text === "string") {
      const maxPt = typeof o.fontSize === "number" ? o.fontSize : 14;
      o.fontSize = Math.max(PPT_MIN_PT, fitFont(text, o.w - 0.15, o.h, maxPt));
    } else if (Array.isArray(text)) {
      for (const r of text) {
        if (r && r.options && typeof r.options.fontSize === "number") {
          r.options.fontSize = Math.max(PPT_MIN_PT, r.options.fontSize);
        }
      }
      const full = text.map((r: any) => (r && r.text) || "").join("");
      const maxRun = Math.max(PPT_MIN_PT, ...text.map((r: any) => (r && r.options && r.options.fontSize) || 12));
      const fitted = fitFont(full, o.w - 0.15, o.h, maxRun);
      if (fitted < maxRun) {
        const ratio = fitted / maxRun;
        for (const r of text) {
          if (r && r.options && typeof r.options.fontSize === "number") {
            r.options.fontSize = Math.max(PPT_MIN_PT, Math.round(r.options.fontSize * ratio * 10) / 10);
          }
        }
      }
    }
  }
  return slide.addText(text, o);
}

// ════════════════════════════════════════════════════════════════════════════
//  PPTX LAYOUT ENGINE
//  PowerPoint is absolutely positioned, so overlap is a real failure mode, not
//  a styling nit. Every deck below is built through one downward cursor per
//  slide: a block is measured, checked against the body floor, drawn, and the
//  cursor advanced past it by its own height plus a gutter. No block is ever
//  hard-coded into a vertical band another block also claims.
// ════════════════════════════════════════════════════════════════════════════

/** Conservative wrapped-height estimate (inches) for text in a box of width wIn. */
function boxH(text: string, wIn: number, fontPt: number, lineSpacing = 1.15): number {
  const t = String(text ?? "");
  const usable = Math.max(0.6, wIn - 0.2);
  const cpl = Math.max(6, Math.floor((usable * 72) / (fontPt * 0.52)));
  let lines = 0;
  for (const p of t.split("\n")) lines += Math.max(1, Math.ceil(p.length / cpl));
  return (lines * fontPt * 1.24 * lineSpacing) / 72 + 0.14;
}

/** Trim until the text fits maxH — used only where a block genuinely cannot page. */
function clampText(text: string, wIn: number, fontPt: number, maxH: number): string {
  let t = String(text ?? "");
  let guard = 0;
  while (t.length > 24 && boxH(t, wIn, fontPt) > maxH && guard++ < 60) {
    t = truncate(t, Math.max(24, Math.floor(t.length * 0.82)));
  }
  return t;
}

interface Sec {
  pptx: any;
  slide: any;
  /** The downward cursor. Nothing is ever drawn above it on this slide. */
  y: number;
  kicker: string;
  title: string;
  accent: string;
  source: string;
  slides: number;
}

/** Header, rule and footer band. Returns the slide and where the body starts. */
function frameSlide(pptx: any, kicker: string, title: string, accent: string, source: string) {
  const slide = pptx.addSlide({ masterName: MASTER });
  slide.addShape("rect", { x: 0, y: 0, w: SLIDE_W, h: 0.14, fill: { color: accent } });

  txt(slide, kicker.toUpperCase(), {
    x: MX, y: 0.34, w: MW, h: 0.28, fontFace: F, fontSize: 11, bold: true, color: P.muted, charSpacing: 2, valign: "middle",
  });

  const titleText = clampText(title, MW, 20, 0.95);
  const titleH = Math.max(0.58, Math.min(0.95, boxH(titleText, MW, 20, 1.1)));
  txt(slide, titleText, {
    x: MX, y: 0.72, w: MW, h: titleH, fontFace: F, fontSize: 20, bold: true, color: P.ink, valign: "top",
  });

  const ruleY = 0.72 + titleH + 0.06;
  slide.addShape("line", { x: MX, y: ruleY, w: MW, h: 0, line: { color: P.line, width: 1 } } as any);

  txt(slide, `Source: ${source || "CartaOS — public regulatory, clinical, IP & pricing sources"}`, {
    x: MX, y: FOOTER_Y, w: MW - 1.0, h: 0.3, fontFace: F, fontSize: PPT_MIN_PT, color: P.faint, valign: "middle",
  });

  return { slide, bodyTop: Math.max(1.55, ruleY + 0.18) };
}

/** Open a section. Everything after this is placed through the cursor. */
function beginSection(
  pptx: any,
  kicker: string,
  title: string,
  accent: string,
  source: string,
  takeaway?: string,
): Sec {
  const { slide, bodyTop } = frameSlide(pptx, kicker, title, accent, source);
  const sec: Sec = { pptx, slide, y: bodyTop, kicker, title, accent, source, slides: 1 };
  if (takeaway) {
    const text = clampText(takeaway, MW - 0.3, 12, 0.9);
    const h = Math.min(0.9, boxH(text, MW - 0.3, 12));
    sec.slide.addShape("rect", { x: MX, y: sec.y, w: MW, h, fill: { color: P.calloutBg }, line: { type: "none" } });
    sec.slide.addShape("rect", { x: MX, y: sec.y, w: 0.07, h, fill: { color: accent } });
    txt(sec.slide, text, {
      x: MX + 0.22, y: sec.y, w: MW - 0.34, h, fontFace: F, fontSize: 12, bold: true, color: P.ink, valign: "middle",
    });
    sec.y += h + BLOCK_GAP;
  }
  return sec;
}

/** Continue on a fresh slide carrying the same heading, marked as a continuation. */
function continueSection(sec: Sec) {
  const title = sec.title.endsWith(" (cont.)") ? sec.title : `${sec.title} (cont.)`;
  const { slide, bodyTop } = frameSlide(sec.pptx, sec.kicker, title, sec.accent, sec.source);
  sec.slide = slide;
  sec.y = bodyTop;
  sec.title = title;
  sec.slides += 1;
}

const secRemaining = (sec: Sec) => BODY_LIMIT - sec.y;

/** Reserve h inches; page first when the block would cross the body floor. */
function secRoom(sec: Sec, h: number) {
  if (sec.y + h > BODY_LIMIT) continueSection(sec);
}

/** Place one measured block and advance the cursor past it. */
function secBlock(sec: Sec, h: number, draw: (y: number) => void) {
  secRoom(sec, h);
  draw(sec.y);
  sec.y += h + BLOCK_GAP;
}

/**
 * A small uppercase label above a block. Keep-with-next: it pages first rather
 * than stranding itself at the bottom of a slide with its content overleaf.
 */
function secLabel(sec: Sec, label: string, color = P.muted) {
  secRoom(sec, 0.26 + 0.7);
  secBlock(sec, 0.26, (y) =>
    txt(sec.slide, label.toUpperCase(), {
      x: MX, y, w: MW, h: 0.26, fontFace: F, fontSize: PPT_MIN_PT, bold: true, color, charSpacing: 1, valign: "middle",
    }),
  );
  sec.y -= BLOCK_GAP - 0.04; // a label hugs the block it introduces
}

/** Body copy. Splits across continuation slides rather than shrinking to fit. */
function secText(
  sec: Sec,
  text: string,
  opts: { fontSize?: number; color?: string; bold?: boolean; italic?: boolean } = {},
) {
  const body = sText(text);
  if (!body) return;
  const fs = Math.max(PPT_MIN_PT, opts.fontSize ?? 12);
  let rest = body;
  let guard = 0;
  while (rest && guard++ < 12) {
    if (secRemaining(sec) < 0.6) continueSection(sec);
    const avail = secRemaining(sec);
    const full = boxH(rest, MW, fs);
    const chunk = full <= avail ? rest : clampText(rest, MW, fs, avail);
    const h = Math.min(avail, boxH(chunk, MW, fs));
    const yy = sec.y;
    txt(sec.slide, chunk, {
      x: MX, y: yy, w: MW, h, fontFace: F, fontSize: fs, color: opts.color ?? P.ink,
      bold: opts.bold, italic: opts.italic, valign: "top", lineSpacingMultiple: 1.15,
    });
    sec.y += h + BLOCK_GAP;
    if (chunk.length >= rest.length) break;
    // Continue from where the chunk stopped, dropping the ellipsis marker.
    rest = rest.slice(chunk.replace(/…$/, "").length).trim();
    if (rest) continueSection(sec);
  }
}

/** Bulleted list, packed into as many boxes/slides as the items need. */
function secBullets(
  sec: Sec,
  items: string[],
  opts: { fontSize?: number; color?: string; x?: number; w?: number } = {},
) {
  const fs = Math.max(PPT_MIN_PT, opts.fontSize ?? 11);
  const x = opts.x ?? MX;
  const w = opts.w ?? MW;
  const queue = items.map(sText).filter(Boolean);
  let guard = 0;
  while (queue.length && guard++ < 40) {
    if (secRemaining(sec) < 0.5) continueSection(sec);
    const avail = secRemaining(sec);
    const batch: string[] = [];
    let h = 0.06;
    while (queue.length) {
      const item = clampText(queue[0], w - 0.3, fs, Math.max(0.4, avail - 0.1));
      const hi = boxH(item, w - 0.3, fs);
      if (h + hi > avail && batch.length) break;
      queue.shift();
      batch.push(item);
      h += hi;
      if (h > avail) break;
    }
    if (!batch.length) break;
    const boxHeight = Math.min(avail, h);
    const yy = sec.y;
    txt(
      sec.slide,
      batch.map((t) => ({ text: t, options: { bullet: { code: "2022" }, fontSize: fs, color: opts.color ?? P.ink } })),
      { x, y: yy, w, h: boxHeight, fontFace: F, valign: "top", paraSpaceAfter: 3, lineSpacingMultiple: 1.15 },
    );
    sec.y += boxHeight + BLOCK_GAP;
  }
}

/**
 * A table, paginated by rows across continuation slides. Rows keep their height
 * (and therefore their type size) rather than being squeezed to fit one slide.
 */
function secTable(
  sec: Sec,
  head: string[],
  rows: any[][],
  colW: number[],
  opts: { rowH?: number; fontSize?: number } = {},
) {
  if (!rows.length) return;
  const rowH = opts.rowH ?? 0.44;
  const headRow = head.map((t) => ({ text: t, options: cellHead() }));
  let i = 0;
  let guard = 0;
  while (i < rows.length && guard++ < 60) {
    if (secRemaining(sec) < rowH * 2 + 0.1) continueSection(sec);
    const perSlide = Math.max(1, Math.floor((secRemaining(sec) - rowH) / rowH));
    const chunk = rows.slice(i, i + perSlide);
    i += chunk.length;
    const h = rowH * (chunk.length + 1);
    const yy = sec.y;
    sec.slide.addTable([headRow, ...chunk], {
      x: MX, y: yy, w: MW, h, colW, rowH,
      valign: "middle", border: { type: "none" }, fontFace: F, autoPage: false,
    });
    sec.y += h + BLOCK_GAP;
  }
}

/** Two side-by-side lists. Columns never share an x range, so they cannot collide. */
function secColumns(
  sec: Sec,
  left: { label: string; items: string[]; color?: string } | null,
  right: { label: string; items: string[]; color?: string } | null,
) {
  const cols = [left, right].filter(Boolean) as { label: string; items: string[]; color?: string }[];
  if (!cols.length) return;
  const fs = 11;
  const height = (c: { items: string[] }) =>
    c.items.reduce((a, t) => a + boxH(t, HALF - 0.3, fs), 0.06);
  const needed = Math.max(...cols.map(height)) + 0.3;
  // Ask for the room first, then size against what is actually left. Capping
  // against a constant assumed the block always started near the top of a
  // slide; on a real run these columns began at 2.16in, ran 5.03in, and landed
  // on the source line and the page number.
  secRoom(sec, Math.min(needed, BODY_LIMIT - 1.5));
  const avail = Math.max(0.6, Math.min(needed, secRemaining(sec)));
  const y = sec.y;
  const place = (c: { label: string; items: string[]; color?: string }, x: number) => {
    txt(sec.slide, c.label.toUpperCase(), {
      x, y, w: HALF, h: 0.26, fontFace: F, fontSize: PPT_MIN_PT, bold: true, color: c.color ?? P.muted, charSpacing: 1, valign: "middle",
    });
    const listH = Math.max(0.4, avail - 0.32);
    const items = c.items.map((t) => clampText(t, HALF - 0.3, fs, listH));
    txt(
      sec.slide,
      items.map((t) => ({ text: t, options: { bullet: { code: "2022" }, fontSize: fs, color: P.ink } })),
      { x, y: y + 0.3, w: HALF, h: listH, fontFace: F, valign: "top", paraSpaceAfter: 3, lineSpacingMultiple: 1.15 },
    );
  };
  if (left) place(left, MX);
  if (right) place(right, COL_R);
  sec.y += avail + BLOCK_GAP;
}

/** A row of labelled statistics. */
function secStats(sec: Sec, cards: [string, string, boolean][]) {
  if (!cards.length) return;
  const h = 1.25;
  const cw = (MW - (cards.length - 1) * GUT) / cards.length;
  secBlock(sec, h, (y) => {
    cards.forEach(([label, value, hi], i) => {
      statCard(sec.slide, MX + i * (cw + GUT), y, cw, h, label, value, hi);
    });
  });
}

/** A single highlighted line — used for the one figure or call that matters. */
function secCallout(sec: Sec, label: string, text: string, accent = P.accent) {
  const body = sText(text);
  if (!body) return;
  const clamped = clampText(body, MW - 0.6, 11, 0.9);
  const h = Math.max(0.5, Math.min(1.0, boxH(clamped, MW - 0.6, 11) + 0.1));
  secBlock(sec, h, (y) => {
    sec.slide.addShape("rect", { x: MX, y, w: MW, h, fill: { color: P.calloutBg }, line: { type: "none" } });
    sec.slide.addShape("rect", { x: MX, y, w: 0.07, h, fill: { color: accent } });
    txt(sec.slide, [
      { text: `${label.toUpperCase()}   `, options: { fontSize: PPT_MIN_PT, bold: true, color: P.accent2, charSpacing: 1 } },
      { text: clamped, options: { fontSize: 11, color: P.ink } },
    ], { x: MX + 0.22, y, w: MW - 0.34, h, fontFace: F, valign: "middle" });
  });
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
    slideNumber: { x: SLIDE_W - MX - 0.6, y: FOOTER_Y, w: 0.6, h: 0.3, fontFace: F, fontSize: PPT_MIN_PT, color: P.faint, align: "right" },
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
      slide.addShape("line", { x, y: 4.5, w: 0, h: 1.1, line: { color: P.line, width: 1 } } as any);
      txt(slide,label, { x: x + 0.15, y: 4.54, w: cellW - 0.3, h: 0.28, fontFace: F, fontSize: PPT_MIN_PT, bold: true, color: P.muted, charSpacing: 1, valign: "middle" });
      txt(slide,value, { x: x + 0.15, y: 4.86, w: cellW - 0.3, h: 0.72, fontFace: F, fontSize: 19, bold: true, color: hi ? P.accent2 : P.ink, valign: "top" });
    });

    txt(slide,`${BRAND}  ·  ${TODAY()}  ·  Confidential`, { x: MX, y: FOOTER_Y, w: MW, h: 0.3, fontFace: F, fontSize: PPT_MIN_PT, color: P.faint });
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
        txt(slide,truncate(r.recommendedDealStructure ?? "", 90), { x: x + 0.2, y: 5.6, w: cw - 0.35, h: 0.6, fontFace: F, fontSize: 11, color: P.muted, valign: "top" });
      });
    }
  }

  // ─── Framing & calibration (archetype, two-question framing, falsifiers, steelman) ──
  if (strategy?.archetype || strategy?.opportunityFraming || strategy?.whatWouldFlipIt?.length || strategy?.consideredAndRejected?.length) {
    const slide = contentSlide(
      pptx, "Strategy · Framing",
      strategy?.archetype?.mode ? `Archetype — ${strategy.archetype.mode}` : "Framing & calibration",
      P.accent, "CartaOS quality framework",
    );
    let y = BODY_TOP + 0.1;
    if (strategy?.archetype?.rubricNote) {
      slide.addShape("rect", { x: MX, y, w: MW, h: 0.62, fill: { color: P.calloutBg }, line: { type: "none" } });
      slide.addShape("rect", { x: MX, y, w: 0.07, h: 0.62, fill: { color: P.accent } });
      txt(slide, [
        { text: "SCORING LENS   ", options: { fontSize: 9, bold: true, color: P.accent2, charSpacing: 1 } },
        { text: strategy.archetype.rubricNote, options: { fontSize: 10.5, color: P.ink } },
      ], { x: MX + 0.25, y: y + 0.04, w: MW - 0.45, h: 0.54, fontFace: F, valign: "middle" });
      y += 0.82;
    }
    const f = strategy?.opportunityFraming;
    if (f) {
      txt(slide, "NARROW — off-patent in-license trade", { x: MX, y, w: HALF, h: 0.3, fontFace: F, fontSize: 9.5, bold: true, color: P.muted, charSpacing: 1 });
      txt(slide, "BROAD — any real market value", { x: COL_R, y, w: HALF, h: 0.3, fontFace: F, fontSize: 9.5, bold: true, color: P.accent2, charSpacing: 1 });
      txt(slide, truncate(f.narrowVerdict ?? "—", 320), { x: MX, y: y + 0.3, w: HALF - 0.2, h: 1.2, fontFace: F, fontSize: 10.5, color: P.ink, valign: "top", lineSpacingMultiple: 1.1 });
      txt(slide, truncate(f.broadVerdict ?? "—", 320), { x: COL_R, y: y + 0.3, w: HALF - 0.2, h: 1.2, fontFace: F, fontSize: 10.5, bold: true, color: P.ink, valign: "top", lineSpacingMultiple: 1.1 });
      y += 1.7;
    }
    if (strategy?.whatWouldFlipIt?.length) {
      txt(slide, "WHAT WOULD FLIP THE VERDICT", { x: MX, y, w: HALF, h: 0.3, fontFace: F, fontSize: 9.5, bold: true, color: P.accent2, charSpacing: 1 });
      txt(slide, strategy.whatWouldFlipIt.slice(0, 4).map(t => ({ text: truncate(t, 150), options: { bullet: { code: "2022" }, fontSize: 10, color: P.ink } })),
        { x: MX, y: y + 0.3, w: HALF - 0.2, h: 1.6, fontFace: F, valign: "top", paraSpaceAfter: 3 });
    }
    if (strategy?.consideredAndRejected?.length) {
      txt(slide, "CONSIDERED & REJECTED", { x: COL_R, y, w: HALF, h: 0.3, fontFace: F, fontSize: 9.5, bold: true, color: P.ink, charSpacing: 1 });
      txt(slide, strategy.consideredAndRejected.slice(0, 4).map(c => ({ text: truncate(`${c.opportunity} — ${c.reason}`, 150), options: { bullet: { code: "2022" }, fontSize: 10, color: P.ink } })),
        { x: COL_R, y: y + 0.3, w: HALF - 0.2, h: 1.6, fontFace: F, valign: "top", paraSpaceAfter: 3 });
    }
  }

  // ─── Ten-lever value scan ───────────────────────────────────────────────
  if (strategy?.valueLevers?.length) {
    const levers = strategy.valueLevers;
    const live = levers.filter((l: any) => !l.notComputable);
    const lead = live.slice().sort((a: any, b: any) => (b.score ?? 0) - (a.score ?? 0))[0];
    const slide = contentSlide(
      pptx, "Strategy · Value levers",
      lead ? `${lead.lever} is the strongest value play` : "Ten-lever value scan",
      P.accent, "openFDA · DailyMed · Orange Book · CMS pricing & formulary · WHO nEML",
    );
    const rows: any[][] = [
      ["Value lever", "Score", "Confidence", "Estimated value"].map(t => ({ text: t, options: cellHead() })),
      ...levers
        .slice()
        .sort((a: any, b: any) => (a.notComputable === b.notComputable ? (b.score ?? 0) - (a.score ?? 0) : a.notComputable ? 1 : -1))
        .map((l: any) => [
          { text: l.lever, options: cellBody({ bold: true, color: l.notComputable ? P.faint : P.ink }) },
          { text: l.notComputable ? "—" : ` ${dotScale(l.score ?? 0)}  ${l.score ?? "—"}`, options: cellBody({ bold: true, color: l.notComputable ? P.faint : P.accent2 }) },
          { text: l.notComputable ? "Not computable" : (l.confidence ?? "—"), options: cellBody({ color: l.notComputable ? P.faint : P.muted, fontSize: 10 }) },
          { text: truncate(l.notComputable ? (l.dataGap ?? "Evidence needed") : (l.estValueRange ?? "—"), 90), options: cellBody({ fontSize: 10, color: l.notComputable ? P.faint : P.ink }) },
        ]),
    ];
    slide.addTable(rows, {
      x: MX, y: BODY_TOP + 0.15, w: MW, colW: [3.6, 1.7, 1.8, 5.03],
      rowH: 0.42, valign: "middle", border: { type: "none" }, fontFace: F, autoPage: false,
    });
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
        region.market?.unmetNeed ? `Unmet need — ${truncate(region.market.unmetNeed, 170)}` : "",
      ].filter(Boolean) },
      { title: "Regulatory pathway", color: P.muted, lines: [
        region.legal?.regulatoryAuthority ? `Authority — ${region.legal.regulatoryAuthority}` : "",
        region.legal?.pathway ? `Pathway — ${region.legal.pathway}` : "",
        region.legal?.estimatedTimeline ? `Timeline — ${region.legal.estimatedTimeline}` : "",
      ].filter(Boolean) },
      { title: "Access & competition", color: P.accent2, lines: [
        region.commercial?.competitorActivity ? `Competition — ${truncate(region.commercial.competitorActivity, 170)}` : "",
        region.commercial?.pricingDynamics ? `Pricing — ${truncate(region.commercial.pricingDynamics, 150)}` : "",
        region.commercial?.reimbursementLandscape ? `Access — ${truncate(region.commercial.reimbursementLandscape, 140)}` : "",
      ].filter(Boolean) },
      { title: "IP & exclusivity", color: P.accent, lines: [
        region.ip?.patentStrength ? `Patent — ${region.ip.patentStrength}` : "",
        region.ip?.ftoStatus ? `FTO — ${region.ip.ftoStatus}` : "",
        region.ip?.estimatedExclusivityYears != null ? `Exclusivity — ${region.ip.estimatedExclusivityYears} years` : "",
      ].filter(Boolean) },
    ];

    // Business case strip — the rational value proposition + per-region call
    let qTop = 1.7, qGap = 2.25, qH = 2.05;
    if (region.businessCase) {
      const bc = region.businessCase;
      slide.addShape("rect", { x: MX, y: 1.62, w: MW, h: 0.66, fill: { color: P.calloutBg }, line: { type: "none" } });
      slide.addShape("rect", { x: MX, y: 1.62, w: 0.07, h: 0.66, fill: { color: P.accent } });
      txt(slide, [
        { text: "BUSINESS CASE   ", options: { fontSize: 9, bold: true, color: P.accent2, charSpacing: 1 } },
        { text: bc.valueProposition, options: { fontSize: 10.5, color: P.ink } },
      ], { x: MX + 0.25, y: 1.66, w: MW - 1.3, h: 0.58, fontFace: F, valign: "middle" });
      txt(slide, bc.verdict.toUpperCase(), { x: SLIDE_W - MX - 1.05, y: 1.74, w: 1.0, h: 0.4, fontFace: F, fontSize: 11, bold: true, color: P.accent2, align: "right", valign: "middle" });
      qTop = 2.45; qGap = 2.05; qH = 1.85;
    }

    quads.forEach((q, i) => {
      const x = i % 2 === 0 ? MX : COL_R;
      const y = qTop + Math.floor(i / 2) * qGap;
      slide.addShape("rect", { x, y, w: HALF, h: qH, fill: { color: P.panel }, line: { type: "none" } });
      slide.addShape("rect", { x, y, w: 0.07, h: qH, fill: { color: q.color } });
      txt(slide,q.title, { x: x + 0.25, y: y + 0.12, w: HALF - 0.4, h: 0.38, fontFace: F, fontSize: 12.5, bold: true, color: q.color });
      txt(slide,
        q.lines.length
          ? q.lines.map((t) => ({ text: t, options: { bullet: { code: "2022" }, fontSize: 10, color: P.ink } }))
          : [{ text: "No data available", options: { fontSize: 10, italic: true, color: P.faint } }],
        { x: x + 0.28, y: y + 0.52, w: HALF - 0.5, h: qH - 0.62, fontFace: F, valign: "top", paraSpaceAfter: 2 },
      );
    });
  }

  // ─── Market worthiness — purely-commercial read by market ────────────────
  const worthy = regions.filter((r) => r.marketWorthiness);
  if (worthy.length) {
    const sortedWorthy = worthy
      .slice()
      .sort((a, b) => (b.marketWorthiness?.score ?? 0) - (a.marketWorthiness?.score ?? 0));
    const lead = sortedWorthy[0];
    const slide = contentSlide(
      pptx, "Strategy · Market worthiness",
      lead ? `${lead.regionLabel} is the worthiest market on commercial grounds` : "Market worthiness — commercial read",
      P.accent, "openFDA · EMA · NRDL/VBP · NHI · HTA bodies · ClinicalTrials.gov",
    );

    let tableTop = BODY_TOP + 0.15;
    if (strategy?.marketWorthinessSummary) {
      slide.addShape("rect", { x: MX, y: tableTop, w: MW, h: 0.66, fill: { color: P.calloutBg }, line: { type: "none" } });
      slide.addShape("rect", { x: MX, y: tableTop, w: 0.07, h: 0.66, fill: { color: P.accent } });
      txt(slide, strategy.marketWorthinessSummary, { x: MX + 0.25, y: tableTop + 0.05, w: MW - 0.5, h: 0.56, fontFace: F, fontSize: 10.5, color: P.ink, valign: "middle" });
      tableTop += 0.86;
    }

    const rows: any[][] = [
      ["Market", "Worthiness", "Healthcare & legal landscape", "Partnerships & channels", "Novel path"].map((t) => ({ text: t, options: cellHead() })),
      ...sortedWorthy.map((r) => {
        const w = r.marketWorthiness!;
        return [
          { text: r.regionLabel, options: cellBody({ bold: true, color: P.ink }) },
          { text: `${dotScale(w.score ?? 0)}  ${w.rating ?? "—"}`, options: cellBody({ color: worthinessPpt(w.rating), bold: true }) },
          { text: truncate([w.healthcareLandscape, w.legalLandscape].filter(Boolean).join(" · "), 150), options: cellBody({ fontSize: 9.5 }) },
          { text: truncate([w.partnershipRoom, w.distributionChannels].filter(Boolean).join(" · "), 130), options: cellBody({ fontSize: 9.5 }) },
          { text: truncate(w.novelPaths?.[0] ?? "—", 70), options: cellBody({ fontSize: 9.5, color: P.accent2 }) },
        ];
      }),
    ];
    slide.addTable(rows, {
      x: MX, y: tableTop, w: MW, colW: [1.6, 1.9, 3.5, 3.0, 2.13],
      rowH: 0.5, valign: "middle", border: { type: "none" }, fontFace: F, autoPage: false,
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
        { text: truncate(r.recommendedDealStructure ?? "—", 72), options: cellBody() },
        { text: r.estimatedValue?.upfront ?? "—", options: cellBody({ color: P.accent2, bold: true }) },
        { text: r.estimatedValue?.total ?? "—", options: cellBody({ color: P.accent2, bold: true }) },
        { text: r.estimatedValue?.royaltyRange ?? "—", options: cellBody({ color: P.accent2 }) },
        { text: truncate((r.topPartnerCandidates ?? []).slice(0, 3).join(", ") || "—", 72), options: cellBody({ fontSize: 10 }) },
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

  // ─── Business case: commercial channels ─────────────────────────────────
  if (strategy?.commercialPlan?.channels?.length) {
    const cp = strategy.commercialPlan;
    const slide = contentSlide(pptx, "Business Case · Channels", "Where the value sits across commercial channels", P.accent, SRC);
    const rows: any[][] = [
      ["Channel", "Geographies", "Where the value is", "How to win it"].map((t) => ({ text: t, options: cellHead() })),
      ...cp.channels.slice(0, 6).map((c) => [
        { text: truncate(c.channel, 28), options: cellBody({ bold: true, color: P.ink }) },
        { text: (c.geographies ?? []).join(", "), options: cellBody({ fontSize: 10 }) },
        { text: truncate(c.valueRole, 130), options: cellBody({ fontSize: 10 }) },
        { text: truncate((c.accessMechanics || "") + (c.keyPlayers?.length ? ` (${c.keyPlayers.join(", ")})` : ""), 170), options: cellBody({ fontSize: 10 }) },
      ]),
    ];
    slide.addTable(rows, { x: MX, y: BODY_TOP + 0.15, w: MW, colW: [2.3, 1.7, 3.5, 4.633], valign: "middle", border: { type: "none" }, fontFace: F, autoPage: false });
  }

  // ─── Business case: how to proceed ──────────────────────────────────────
  if (strategy?.commercialPlan?.howToProceed?.length) {
    const slide = contentSlide(pptx, "Business Case · How to proceed", "The sequenced path to capture", P.accent, "CartaOS go-to-market model");
    const steps = strategy.commercialPlan.howToProceed.slice().sort((a, b) => a.step - b.step).slice(0, 7);
    steps.forEach((s, i) => {
      const y = 1.75 + i * 0.66;
      slide.addShape("rect", { x: MX, y, w: 0.46, h: 0.46, fill: { color: P.accent }, line: { type: "none" } });
      txt(slide, String(s.step), { x: MX, y, w: 0.46, h: 0.46, fontFace: F, fontSize: 15, bold: true, color: P.white, align: "center", valign: "middle" });
      txt(slide, [
        { text: `${s.action}   `, options: { fontSize: 13, bold: true, color: P.ink } },
        { text: [s.geography, s.approach, s.timing, s.owner].filter(Boolean).join(" · "), options: { fontSize: 10.5, color: P.muted } },
      ], { x: MX + 0.66, y, w: MW - 0.66, h: 0.5, fontFace: F, valign: "middle" });
    });
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
        { text: truncate(r.label, 160), options: { fontSize: 12.5, bold: true, color: P.ink } },
        { text: `   ${r.source}${r.impact ? " · " + r.impact + " impact" : ""}`, options: { fontSize: 10, color: P.accent2 } },
        { text: `\n→ ${truncate(r.mitigation ?? "—", 170)}`, options: { fontSize: 11, color: P.muted } },
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

  await pptx.writeFile({ fileName: `${safeFilename(assetName)}_Value_Assessment.pptx` });
}

// ─── PPT helpers ─────────────────────────────────────────────────────────────

function contentSlide(pptx: any, kicker: string, title: string, accent: string, source?: string): any {
  const slide = pptx.addSlide({ masterName: MASTER });
  slide.addShape("rect", { x: 0, y: 0, w: SLIDE_W, h: 0.14, fill: { color: accent } });
  txt(slide,kicker.toUpperCase(), { x: MX, y: 0.42, w: MW, h: 0.3, fontFace: F, fontSize: 12, bold: true, color: P.muted, charSpacing: 2 });
  txt(slide,title, { x: MX, y: 0.74, w: MW, h: 0.78, fontFace: F, fontSize: 24, bold: true, color: P.ink, valign: "top" });
  slide.addShape("line", { x: MX, y: 1.55, w: MW, h: 0, line: { color: P.line, width: 1 } } as any);
  txt(slide,`Source: ${source ?? "CartaOS — public regulatory, clinical, IP & pricing sources"}`, {
    x: MX, y: FOOTER_Y, w: MW - 1, h: 0.3, fontFace: F, fontSize: PPT_MIN_PT, color: P.faint,
  });
  return slide;
}

/**
 * A full-bleed divider. The bands are stacked with a real gap between them and
 * kept inside the right margin — a divider is still a slide, and the layout
 * contract in tests/export-layout.test.ts applies to it like any other.
 */
function dividerSlide(pptx: any, num: string, label: string, takeaway: string, accent: string) {
  const slide = pptx.addSlide();
  slide.background = { color: P.ink };
  slide.addShape("rect", { x: 0, y: 0, w: SLIDE_W, h: 0.14, fill: { color: accent } });
  txt(slide, num, { x: MX, y: 1.75, w: 4, h: 2.0, fontFace: F, fontSize: 120, bold: true, color: "3A3A3A" });
  txt(slide, label, { x: MX, y: 3.95, w: MW - 0.1, h: 0.85, fontFace: F, fontSize: 32, bold: true, color: P.white, valign: "top" });
  slide.addShape("rect", { x: MX, y: 4.95, w: 0.9, h: 0.05, fill: { color: accent } });
  txt(slide, takeaway, { x: MX, y: 5.15, w: MW - 0.1, h: 1.1, fontFace: F, fontSize: 17, color: "C9C9C9", valign: "top" });
}

/**
 * The divider between the summary a reader may stop at and the detail behind
 * it. The word "Appendix" appears here and only here, so "which part am I in?"
 * is answerable from any slide.
 */
function appendixDividerSlide(pptx: any, accent: string) {
  dividerSlide(pptx, "A", "Appendix", APPENDIX_LINE, accent);
}

function cellHead(): any {
  return { bold: true, fontSize: 11, color: "FFFFFF", fill: { color: P.ink }, align: "left", valign: "middle", fontFace: F, margin: [6, 8, 6, 8] };
}

/** Trim a cell to what its column and row height can actually show. */
function cellFit(text: unknown, colWIn: number, rowHIn: number, fs = 11): string {
  const cpl = Math.max(6, Math.floor(((colWIn - 0.28) * 72) / (fs * 0.52)));
  const lines = Math.max(1, Math.floor((rowHIn * 72) / (fs * 1.4)));
  return truncate(String(text ?? ""), Math.max(14, cpl * lines));
}

/** Table cells never drop below the readable floor, whatever a call site asks for. */
function cellBody(extra: any = {}): any {
  const merged = { fontSize: 11, color: P.ink, valign: "middle", fontFace: F, fill: { color: "FFFFFF" }, margin: [6, 8, 6, 8], ...extra };
  merged.fontSize = Math.max(PPT_MIN_PT, typeof merged.fontSize === "number" ? merged.fontSize : PPT_MIN_PT);
  return merged;
}

const attractivenessPpt = (level: string): string =>
  level === "Very High" ? "C2410C" : level === "High" ? "F97316" : level === "Medium" ? "6E6E6E" : "9A9A9A";

const worthinessPpt = (rating?: string): string =>
  rating === "Highly Worthy" ? "C2410C" : rating === "Worthy" ? "F97316" : rating === "Marginal" ? "6E6E6E" : "9A9A9A";

const involvementPpt = (level: string): string =>
  level === "Lead" ? "C2410C" : level === "Contributor" ? "1A1A1A" : level === "Approver" ? "6E6E6E" : "9A9A9A";

const pillarPpt = (pillar: string): string =>
  pillar === "Diagnosis" ? "1A1A1A" : pillar === "Strategy" ? "C2410C" : pillar === "Execution" ? "F97316" : "9A9A9A";

// ════════════════════════════════════════════════════════════════════════════
//  RUN-ERA DECKS (Diagnosis · Strategy)
// ════════════════════════════════════════════════════════════════════════════

/** A deck with the house master applied — same construction as exportClientDeck. */
function newDeck(PptxGenJS: any, title: string): any {
  const pptx = new PptxGenJS();
  pptx.layout = "LAYOUT_WIDE"; // 13.333 × 7.5 in
  pptx.title = title;
  pptx.company = BRAND;
  pptx.defineSlideMaster({
    title: MASTER,
    background: { color: P.bg },
    objects: [
      { rect: { x: MX, y: 6.85, w: MW, h: 0.008, fill: { color: P.line } } },
    ],
    slideNumber: {
      x: SLIDE_W - MX - 0.6, y: FOOTER_Y, w: 0.6, h: 0.3,
      fontFace: F, fontSize: PPT_MIN_PT, color: P.faint, align: "right",
    },
  });
  return pptx;
}

/** The cover: eyebrow, asset, one-line framing and a four-cell KPI band. */
function titleSlide(
  pptx: any,
  eyebrow: string,
  assetName: string,
  subtitle: string,
  kpis: [string, string, boolean][],
  accent: string,
) {
  const slide = pptx.addSlide();
  slide.background = { color: P.bg };
  slide.addShape("rect", { x: 0, y: 0, w: 0.16, h: 7.5, fill: { color: P.ink } });
  slide.addShape("rect", { x: 0, y: 0, w: 0.16, h: 1.6, fill: { color: accent } });

  txt(slide, eyebrow.toUpperCase(), {
    x: MX, y: 0.9, w: MW, h: 0.4, fontFace: F, fontSize: 11, bold: true, color: accent, charSpacing: 3,
  });
  txt(slide, assetName, {
    x: MX, y: 1.55, w: MW, h: 1.4, fontFace: F, fontSize: 32, bold: true, color: P.ink, valign: "top",
  });
  slide.addShape("rect", { x: MX + 0.02, y: 3.05, w: 0.9, h: 0.04, fill: { color: accent } });
  txt(slide, subtitle, { x: MX, y: 3.25, w: MW, h: 0.7, fontFace: F, fontSize: 13, color: P.muted, valign: "top" });

  const cellW = MW / Math.max(1, kpis.length);
  kpis.forEach(([label, value, hi], i) => {
    const x = MX + i * cellW;
    slide.addShape("line", { x, y: 4.5, w: 0, h: 1.1, line: { color: P.line, width: 1 } } as any);
    txt(slide, label, { x: x + 0.15, y: 4.54, w: cellW - 0.3, h: 0.28, fontFace: F, fontSize: PPT_MIN_PT, bold: true, color: P.muted, charSpacing: 1, valign: "middle" });
    txt(slide, value, { x: x + 0.15, y: 4.86, w: cellW - 0.3, h: 0.72, fontFace: F, fontSize: 19, bold: true, color: hi ? P.accent2 : P.ink, valign: "top" });
  });

  txt(slide, `${BRAND}  ·  ${TODAY()}  ·  Confidential`, {
    x: MX, y: FOOTER_Y, w: MW, h: 0.3, fontFace: F, fontSize: PPT_MIN_PT, color: P.faint, valign: "middle",
  });
  return slide;
}

/** A labelled statistic in a panel — used for the modelled economics. */
function statCard(slide: any, x: number, y: number, w: number, h: number, label: string, value: string, hi = false) {
  slide.addShape("rect", { x, y, w, h, fill: { color: hi ? P.calloutBg : P.panel }, line: { type: "none" } });
  slide.addShape("rect", { x, y, w: 0.06, h, fill: { color: hi ? P.accent2 : P.accent } });
  txt(slide, label.toUpperCase(), { x: x + 0.22, y: y + 0.12, w: w - 0.4, h: 0.28, fontFace: F, fontSize: 9.5, bold: true, color: P.muted, charSpacing: 1 });
  txt(slide, value, { x: x + 0.22, y: y + 0.42, w: w - 0.4, h: h - 0.55, fontFace: F, fontSize: 20, bold: true, color: P.ink, valign: "top" });
}

/**
 * Board-ready diagnosis deck. Every slide whose data is absent is skipped
 * rather than emitted empty, and a dimension or market the evidence could not
 * support says so in place of a number.
 */
export async function buildDiagnosisPptx(
  diagnosis: Diagnosis,
  branch: "off_patent" | "innovative",
  assetName: string,
  opts?: ExportOptions,
): Promise<any> {
  const PptxGenJS = (await import("pptxgenjs")).default;

  const includeMarkets = opts?.includeMarkets !== false;
  const includeEvidence = opts?.includeEvidence !== false;
  const includeAppendix = opts?.includeAppendix !== false;

  const reportName = DIAGNOSIS_REPORT_NAME(branch);
  const pptx = newDeck(PptxGenJS, `${assetName} — ${reportName}`);

  const dimensions: DimensionScore[] = Array.isArray(diagnosis.dimensions) ? diagnosis.dimensions : [];
  const perMarket: MarketScore[] = Array.isArray(diagnosis.perMarket) ? diagnosis.perMarket : [];
  const topRisks = (Array.isArray(diagnosis.topRisks) ? diagnosis.topRisks : []).map(sText).filter(Boolean);
  const swingFactors = (Array.isArray(diagnosis.swingFactors) ? diagnosis.swingFactors : []).map(sText).filter(Boolean);
  const ipFlags = Array.isArray(diagnosis.ipFlags) ? diagnosis.ipFlags : [];
  const valueLevers = Array.isArray(diagnosis.valueLevers) ? diagnosis.valueLevers : [];
  const rejectedEnvelope = Array.isArray(diagnosis.consideredAndRejected) ? diagnosis.consideredAndRejected : [];
  const coverage = Array.isArray(diagnosis.coverage) ? diagnosis.coverage : [];

  const f = readOffPatentReport(diagnosis);
  const leadReg = leadRegion(f);
  const liveLevers = scoredLevers(f);
  const actions = buildNextActions(diagnosis, f, branch, 8);

  const scored = dimensions.filter((d) => d.score != null);
  const uncomputed = dimensions.length - scored.length;
  const topDimension = scored.slice().sort(byScoreDesc)[0];

  const consulted = Array.from(
    new Set(dimensions.flatMap((d) => (Array.isArray(d.sourcesConsulted) ? d.sourcesConsulted : []).map(sText).filter(Boolean))),
  );
  const SRC = (f.sourcesUsed.length ? f.sourcesUsed : consulted).slice(0, 8).join(" · ")
    || "CartaOS — public regulatory, clinical, IP & pricing sources";

  // ─── Title ──────────────────────────────────────────────────────────────
  titleSlide(
    pptx,
    reportName,
    assetName,
    branch === "off_patent"
      ? "Is this asset worth taking into these markets — and what does the evidence actually support?"
      : "What is this asset worth, what would change that, and where is the evidence thin?",
    [
      ["VERDICT", f.verdict || verdictLabel(diagnosis.verdict), true],
      ["WORTHINESS", diagnosis.worthinessScore != null ? `${Math.round(diagnosis.worthinessScore)}/100` : "n/a", false],
      ["CONFIDENCE", f.verdictConfidence || cap(diagnosis.verdictConfidence) || "n/a", false],
      ["LEAD MARKET", leadReg?.label ?? `${perMarket.length} assessed`, false],
    ],
    P.accent,
  );

  // ══════════════════════════════════════════════════════════════════════════
  //  PART 1 — EXECUTIVE SUMMARY. Short enough to stop here.
  // ══════════════════════════════════════════════════════════════════════════
  {
    const thesis = sText(diagnosis.thesis) || f.opportunityThesis;
    const sec = beginSection(
      pptx,
      "Executive summary",
      thesis || `${f.verdict || verdictLabel(diagnosis.verdict)} on ${assetName}`,
      P.accent,
      SRC,
    );
    secStats(sec, [
      ["Verdict", f.verdict || verdictLabel(diagnosis.verdict), true],
      ["Worthiness", diagnosis.worthinessScore != null ? `${Math.round(diagnosis.worthinessScore)}/100` : "Not computable", false],
      ["Verdict confidence", f.verdictConfidence || cap(diagnosis.verdictConfidence) || "Not stated", false],
      ["Dimensions scored", `${scored.length} of ${dimensions.length}`, false],
    ]);
    if (f.opportunityThesis && f.opportunityThesis !== thesis) {
      secLabel(sec, "Opportunity thesis");
      secText(sec, f.opportunityThesis, { fontSize: 12 });
    }
    if (branch === "innovative" && sText(diagnosis.inflectionLever)) {
      secCallout(sec, "Biggest value-inflection lever", sText(diagnosis.inflectionLever), P.accent2);
    }
    if (includeAppendix) {
      secText(
        sec,
        "This is the decision in five slides. Every dimension, market and lever, with the evidence behind it, is in the appendix that follows.",
        { fontSize: 11, color: P.muted },
      );
    }
  }

  // ─── What to do next — the centrepiece of the summary ────────────────────
  if (actions.length) {
    const sec = beginSection(
      pptx,
      "What to do next",
      f.recommendations[0]
        ? `Open ${f.recommendations[0].region} first, then work down this list`
        : liveLevers[0]
          ? `Start with "${liveLevers[0].name}" — the strongest play in this run`
          : "The moves this diagnosis actually supports",
      P.accent,
      "Assembled from this run's own recommendations, levers, falsifiers and gaps",
      "Nothing on this list is generic: each line names the route, lever, evidence or source this run produced.",
    );
    secTable(
      sec,
      ["#", "Do this", "Owner", "Because"],
      actions.map((a, i) => [
        { text: String(i + 1), options: cellBody({ bold: true, color: P.accent, align: "center" }) },
        { text: cellFit(a.action, 5.6, 0.62), options: cellBody({ bold: true }) },
        { text: cellFit(a.owner || "Not assigned", 2.0, 0.62, 10), options: cellBody({ fontSize: 10, color: P.muted }) },
        { text: cellFit(a.detail || "—", 4.0, 0.62, 10), options: cellBody({ fontSize: 10, color: P.muted }) },
      ]),
      [0.5, 5.633, 2.0, 4.0],
      { rowH: 0.62 },
    );
  }

  // ─── Lead markets ───────────────────────────────────────────────────────
  const leadMarkets = summaryMarkets(diagnosis, f, 3);
  if (leadMarkets.length) {
    const sec = beginSection(
      pptx,
      "Lead markets",
      `${leadMarkets[0].label} leads the set — take it first`,
      P.accent,
      SRC,
      includeAppendix
        ? "The three strongest markets in this run. Full per-market detail is in the appendix."
        : "The three strongest markets in this run, ranked by score.",
    );
    secTable(
      sec,
      ["Market", "Score", "Verdict", "The read"],
      leadMarkets.map((m) => [
        { text: cellFit(m.label, 2.6, 0.56), options: cellBody({ bold: true }) },
        { text: cellFit(m.score, 2.6, 0.56, 10), options: cellBody({ fontSize: 10, bold: true, color: P.accent2 }) },
        { text: cellFit(m.verdict, 1.6, 0.56, 10), options: cellBody({ fontSize: 10, color: P.muted }) },
        { text: cellFit(m.read, 5.333, 0.56, 10), options: cellBody({ fontSize: 10 }) },
      ]),
      [2.6, 2.6, 1.6, 5.333],
      { rowH: 0.56 },
    );
  }

  // ─── The plays that carry the value ─────────────────────────────────────
  const plays = summaryPlays(diagnosis, f, branch, 3);
  const playsAreLevers = branch === "off_patent" && f.levers.length > 0;
  if (plays.length) {
    const sec = beginSection(
      pptx,
      playsAreLevers ? "Top value levers" : "Strongest dimensions",
      `Start with "${plays[0].name}" — the strongest play in this run`,
      P.accent,
      SRC,
      includeAppendix
        ? "The three highest-scoring, each with the single move it supports. Every lever and dimension, with its evidence, is in the appendix."
        : "The three highest-scoring, each with the single move it supports.",
    );
    secTable(
      sec,
      [playsAreLevers ? "Lever" : "Dimension", "Score", "Recommended play"],
      plays.map((p) => [
        { text: cellFit(p.name, 3.4, 0.56), options: cellBody({ bold: true }) },
        { text: p.score, options: cellBody({ bold: true, color: P.accent2, align: "right" }) },
        { text: cellFit(p.play, 7.133, 0.56, 10), options: cellBody({ fontSize: 10 }) },
      ]),
      [3.4, 1.6, 7.133],
      { rowH: 0.56 },
    );
  }

  // ─── The binding constraint and the biggest risks ───────────────────────
  const flipsSummary = summaryFlips(diagnosis, f, 3);
  const risksSummary = summaryRisks(diagnosis, f, 4);
  if (flipsSummary.length || risksSummary.length) {
    const sec = beginSection(
      pptx,
      "What would change this",
      flipsSummary[0] ? `The binding constraint: ${truncate(flipsSummary[0], 100)}` : "What could kill this",
      P.accent,
      SRC,
      "Obtaining the evidence on the left either confirms the verdict or overturns it; the risks on the right have to be owned either way.",
    );
    secColumns(
      sec,
      flipsSummary.length ? { label: "What would flip the verdict", items: flipsSummary, color: P.accent2 } : null,
      risksSummary.length ? { label: "Biggest risks", items: risksSummary } : null,
    );
  }

  // ─── Where the evidence is thin. Skipped when nothing is missing. ───────
  const gaps = summaryGaps(diagnosis, branch);
  if (gaps) {
    const sec = beginSection(
      pptx,
      "Where the evidence is thin",
      gaps.lines.length
        ? `Connect ${gaps.lines.length} source set${gaps.lines.length === 1 ? "" : "s"} to firm up this verdict`
        : `${gaps.notComputable} of ${gaps.total} dimensions could not be computed`,
      P.accent,
      "CartaOS source-coverage log",
      gaps.notComputable
        ? `${gaps.notComputable} of ${gaps.total} dimensions state why they could not be computed rather than showing a number.`
        : "Every dimension was computable, but sources that apply to this asset are not connected.",
    );
    if (gaps.lines.length) secBullets(sec, gaps.lines, { fontSize: 12 });
  }

  // A summary-only deck stops here: no divider, no appendix.
  if (!includeAppendix) return pptx;

  // ══════════════════════════════════════════════════════════════════════════
  //  PART 2 — APPENDIX
  // ══════════════════════════════════════════════════════════════════════════
  appendixDividerSlide(pptx, P.accent);
  const ax = appendixCounter();

  // ─── Verdict ────────────────────────────────────────────────────────────
  {
    const sec = beginSection(
      pptx,
      ax("Diagnosis · Verdict"),
      f.opportunityThesis || sText(diagnosis.thesis) || `${verdictLabel(diagnosis.verdict)} on ${assetName}`,
      P.accent,
      SRC,
    );
    secStats(sec, [
      ["Verdict", f.verdict || verdictLabel(diagnosis.verdict), true],
      ["Worthiness", diagnosis.worthinessScore != null ? `${Math.round(diagnosis.worthinessScore)}/100` : "Not computable", false],
      ["Verdict confidence", f.verdictConfidence || cap(diagnosis.verdictConfidence) || "Not stated", false],
      ["Evidence confidence", f.dataConfidence || "Not stated", false],
    ]);
    if (sText(diagnosis.thesis)) {
      secLabel(sec, "Thesis");
      secText(sec, sText(diagnosis.thesis), { fontSize: 12 });
    }
    if (f.executiveSummary) {
      secLabel(sec, "Executive summary");
      secText(sec, f.executiveSummary, { fontSize: 11 });
    }
    if (branch === "innovative" && sText(diagnosis.inflectionLever)) {
      secCallout(sec, "Biggest value-inflection lever", sText(diagnosis.inflectionLever), P.accent2);
    }
  }

  // ─── Framing & calibration (off-patent report) ──────────────────────────
  if (f.archetype || f.framing || f.weightedWorthiness) {
    const sec = beginSection(
      pptx,
      ax("Diagnosis · Framing"),
      f.archetype?.mode
        ? `Scored as "${f.archetype.mode}" — the rubric follows the archetype, not a default`
        : "How this verdict was framed",
      P.accent,
      "CartaOS quality framework",
    );
    if (f.archetype?.rubricNote) secCallout(sec, "Scoring lens", f.archetype.rubricNote, P.accent);
    if (f.archetype?.rationale) {
      secLabel(sec, "Why this archetype");
      secText(sec, f.archetype.rationale, { fontSize: 11 });
    }
    if (f.framing) {
      secColumns(
        sec,
        f.framing.narrow ? { label: "Narrow — the off-patent in-license trade", items: [f.framing.narrow] } : null,
        f.framing.broad ? { label: "Broad — is there any real market value", items: [f.framing.broad], color: P.accent2 } : null,
      );
      if (f.framing.note) secText(sec, f.framing.note, { fontSize: 11, color: P.muted });
    }
    if (f.weightedWorthiness) {
      if (f.weightedWorthiness.score != null) {
        secCallout(
          sec,
          "Client-weighted worthiness",
          `${Math.round(f.weightedWorthiness.score)}/100 — ${f.weightedWorthiness.method || "weighted with the criteria supplied for this run"}`,
          P.accent2,
        );
      }
      if (f.weightedWorthiness.byLever.length) {
        secTable(
          sec,
          ["Lever", "Score", "Weight", "Basis"],
          f.weightedWorthiness.byLever.map((l: any) => [
            { text: cellFit(l.lever || "Unnamed lever", 5.0, 0.44), options: cellBody({ bold: true }) },
            { text: l.score != null ? String(Math.round(l.score)) : "n/a", options: cellBody({ align: "right" }) },
            { text: l.weight != null ? String(Math.round(l.weight)) : "n/a", options: cellBody({ align: "right" }) },
            { text: l.computed ? "Computed" : "Reasoned", options: cellBody({ fontSize: 10, color: P.muted }) },
          ]),
          [5.133, 2.0, 2.0, 3.0],
        );
      }
      if (f.weightedWorthiness.note) secText(sec, f.weightedWorthiness.note, { fontSize: 11, color: P.muted });
    }
  }

  // ─── Asset profile (off-patent report) ──────────────────────────────────
  if (f.assetProfile) {
    const p = f.assetProfile;
    const sec = beginSection(
      pptx,
      ax("Diagnosis · Asset profile"),
      p.name ? `${p.name}${p.developmentStage ? ` — ${p.developmentStage}` : ""}` : "The asset under assessment",
      P.accent,
      SRC,
      p.description || undefined,
    );
    const facts: [string, string][] = [
      ["Modality", p.modality],
      ["Mechanism", p.mechanism],
      ["Therapeutic area", p.therapeuticArea],
      ["Development stage", p.developmentStage],
      ["Current markets", p.currentMarkets.join(", ")],
    ];
    const filled = facts.filter(([, v]) => !!v);
    if (filled.length) {
      secTable(
        sec,
        ["Attribute", "Value"],
        filled.map(([k, v]) => [
          { text: k, options: cellBody({ bold: true }) },
          { text: cellFit(v, 8.5, 0.44), options: cellBody() },
        ]),
        [3.133, 9.0],
      );
    }
    if (p.strengths.length || p.challenges.length) {
      secColumns(
        sec,
        p.strengths.length ? { label: "Key strengths — lead with these", items: p.strengths, color: P.accent2 } : null,
        p.challenges.length ? { label: "Key challenges — plan around these", items: p.challenges } : null,
      );
    }
    if (p.dataPoints.length) {
      secTable(
        sec,
        ["Metric", "Value", "Source", "Tier", "Basis"],
        p.dataPoints.map((d: any) => [
          { text: cellFit(d.label || "—", 3.2, 0.44), options: cellBody({ bold: true }) },
          { text: cellFit(d.value || "—", 2.6, 0.44), options: cellBody() },
          { text: cellFit(d.source || "Not stated", 3.6, 0.44, 10), options: cellBody({ fontSize: 10, color: P.muted }) },
          { text: d.tier || "Not tiered", options: cellBody({ fontSize: 10, color: d.tier === "Tier 3" ? P.accent2 : P.muted }) },
          { text: d.basis === "inference" ? "Inference" : d.basis === "evidence" ? "Evidence" : "—", options: cellBody({ fontSize: 10, color: P.muted }) },
        ]),
        [3.2, 2.6, 3.6, 1.4, 1.333],
      );
    }
  }

  // ─── Dimension scorecard ────────────────────────────────────────────────
  if (dimensions.length) {
    const sec = beginSection(
      pptx,
      ax("Diagnosis · Scorecard"),
      topDimension
        ? `${dimensionLabel(branch, topDimension.key)} is the strongest dimension`
        : "No dimension could be scored from the connected evidence",
      P.accent,
      uncomputed ? `${uncomputed} of ${dimensions.length} dimensions not computable · ${SRC}` : SRC,
      uncomputed
        ? `${uncomputed} of ${dimensions.length} dimensions state why they could not be computed — connect the named source to close them.`
        : undefined,
    );
    secTable(
      sec,
      ["Dimension", "Score", "Confidence", "Basis"],
      dimensions.map((d) => {
        const nc = d.score == null;
        return [
          { text: cellFit(dimensionLabel(branch, d.key), 3.4, 0.46), options: cellBody({ bold: true, color: nc ? P.faint : P.ink }) },
          {
            text: nc ? "Not computable" : ` ${dotScale(d.score ?? 0)}  ${Math.round(d.score ?? 0)}`,
            options: cellBody({ bold: true, color: nc ? P.faint : P.accent2 }),
          },
          { text: nc ? "—" : (cap(d.confidence) || "—"), options: cellBody({ fontSize: 10, color: P.muted }) },
          {
            text: nc
              ? cellFit(sText(d.notComputable) || "No reason recorded", 4.633, 0.46, 10)
              : d.computed === true ? "Computed" : "Reasoned",
            options: cellBody({ fontSize: 10, color: nc ? P.accent2 : P.muted }),
          },
        ];
      }),
      [3.4, 2.6, 1.5, 4.633],
      { rowH: 0.46 },
    );
  }

  // ─── Value levers ───────────────────────────────────────────────────────
  if (branch === "off_patent" && (f.levers.length || valueLevers.length)) {
    const levers = f.levers.length
      ? [...liveLevers, ...f.levers.filter((l: any) => l.notComputable)]
      : valueLevers.map(readLever);
    const strongest = levers.find((l: any) => !l.notComputable);
    const sec = beginSection(
      pptx,
      ax("Diagnosis · Value levers"),
      strongest
        ? `"${strongest.name}" is the strongest play — start there`
        : "Where value still sits in an already-approved asset",
      P.accent,
      SRC,
      "A lever the evidence cannot support names the input that would make it computable instead of showing a number.",
    );
    secTable(
      sec,
      ["Lever", "Score", "Confidence", "Est. value", "Basis"],
      levers.map((l: any) => [
        { text: cellFit(l.name, 3.0, 0.46), options: cellBody({ bold: true, color: l.notComputable ? P.faint : P.ink }) },
        {
          text: l.notComputable ? "Not computable" : ` ${dotScale(l.score ?? 0)}  ${Math.round(l.score)}`,
          options: cellBody({ bold: true, color: l.notComputable ? P.faint : P.accent2 }),
        },
        { text: l.notComputable ? "—" : (l.confidence || "—"), options: cellBody({ fontSize: 10, color: P.muted }) },
        { text: cellFit(l.estValue || "—", 2.8, 0.46, 10), options: cellBody({ fontSize: 10 }) },
        {
          text: l.notComputable
            ? cellFit(`Needs: ${l.reason || l.dataGap || "no reason recorded"}`, 3.4, 0.46, 10)
            : l.computed ? "Computed" : "Reasoned",
          options: cellBody({ fontSize: 10, color: l.notComputable ? P.accent2 : P.muted }),
        },
      ]),
      [3.0, 2.3, 1.6, 2.8, 2.433],
      { rowH: 0.46 },
    );

    // Per-lever detail — the evidence, the plays and the gap behind each score.
    for (const l of levers) {
      if (!l.evidence.length && !l.actions.length && !l.dataGap && !l.reason) continue;
      const det = beginSection(
        pptx,
        ax("Diagnosis · Value levers"),
        l.notComputable
          ? `${l.name} — not computable, and this is what would change that`
          : `${l.name} — ${Math.round(l.score)}/100${l.actions.length ? `: ${truncate(l.actions[0], 70)}` : ""}`,
        P.accent,
        l.evidence.map((e: any) => e.source).filter(Boolean).slice(0, 5).join(" · ") || SRC,
        l.estValue ? `Estimated value: ${l.estValue}` : undefined,
      );
      if (l.evidence.length) {
        secLabel(det, "Evidence");
        secBullets(det, l.evidence.map((e: any) => (e.source ? `${e.finding} — ${e.source}` : e.finding)));
      }
      if (l.actions.length) {
        secLabel(det, "Recommended plays", P.accent2);
        secBullets(det, l.actions, { color: P.ink });
      }
      if (l.dataGap || l.reason) {
        secCallout(det, "Evidence needed", `Obtain: ${l.dataGap || l.reason}`, P.accent2);
      }
    }
  }

  // ─── Markets ────────────────────────────────────────────────────────────
  if (includeMarkets && perMarket.length) {
    const ranked = perMarket.slice().sort(byScoreDesc);
    const leadMarket = ranked.find((m) => m.score != null);
    const sec = beginSection(
      pptx,
      ax("Diagnosis · Markets"),
      leadMarket ? `${countryLabel(leadMarket.country)} leads the market set — take it first` : "No market could be scored from the connected evidence",
      P.accent,
      SRC,
    );
    secTable(
      sec,
      ["Market", "Score", "Verdict", "Read"],
      ranked.map((m) => {
        const nc = m.score == null;
        return [
          { text: cellFit(countryLabel(m.country), 2.6, 0.5), options: cellBody({ bold: true, color: nc ? P.faint : P.ink }) },
          {
            text: nc ? "Not computable" : ` ${dotScale(m.score ?? 0)}  ${Math.round(m.score ?? 0)}`,
            options: cellBody({ bold: true, color: nc ? P.faint : P.accent2 }),
          },
          { text: verdictLabel(m.verdict), options: cellBody({ fontSize: 10, color: P.muted }) },
          {
            text: cellFit(
              nc ? (sText((m as Record<string, unknown>).notComputable) || sText(m.summary) || "Not stated") : (sText(m.summary) || "Not stated"),
              5.733, 0.5, 10,
            ),
            options: cellBody({ fontSize: 10 }),
          },
        ];
      }),
      [2.6, 2.2, 1.6, 5.733],
      { rowH: 0.5 },
    );
  }

  // ─── Regional matrix (off-patent report) ────────────────────────────────
  if (f.regions.length) {
    const sec = beginSection(
      pptx,
      ax("Diagnosis · Regional assessment"),
      leadReg ? `${leadReg.label} leads the regional set — concentrate effort there` : "Regional opportunity matrix",
      P.accent,
      SRC,
      f.marketWorthinessSummary || undefined,
    );
    secTable(
      sec,
      ["Region", "Attractiveness", "COS", "Worthiness", "Market size", "Growth", "Patent", "FTO"],
      f.regions.map((r: any) => [
        { text: cellFit(r.label, 1.7, 0.5), options: cellBody({ bold: true }) },
        { text: cellFit(r.attractiveness || "—", 1.9, 0.5), options: cellBody({ bold: true, color: attractivenessPpt(r.attractiveness) }) },
        { text: r.score != null ? String(Math.round(r.score)) : "n/a", options: cellBody({ align: "center", bold: true }) },
        {
          text: r.worthiness ? cellFit(`${r.worthiness.rating || "—"}${r.worthiness.score != null ? ` ${Math.round(r.worthiness.score)}` : ""}`, 2.0, 0.5, 10) : "Not assessed",
          options: cellBody({ fontSize: 10, color: r.worthiness ? worthinessPpt(r.worthiness.rating) : P.faint }),
        },
        { text: cellFit(r.market.size || "—", 1.7, 0.5, 10), options: cellBody({ fontSize: 10 }) },
        { text: cellFit(r.market.growth || "—", 1.3, 0.5, 10), options: cellBody({ fontSize: 10 }) },
        { text: cellFit(r.ip.patentStrength || "—", 1.3, 0.5, 10), options: cellBody({ fontSize: 10 }) },
        { text: cellFit(r.ip.fto || "—", 1.233, 0.5, 10), options: cellBody({ fontSize: 10 }) },
      ]),
      [1.7, 1.9, 0.8, 2.0, 1.7, 1.3, 1.3, 1.433],
      { rowH: 0.5 },
    );

    // ─── One section per region ───────────────────────────────────────────
    for (const r of f.regions) {
      const sub = beginSection(
        pptx,
        ax(`Diagnosis · ${r.label}`),
        r.businessCase?.verdict
          ? `${r.label} — ${r.businessCase.verdict}${r.score != null ? ` (COS ${Math.round(r.score)}/100)` : ""}`
          : `${r.label}${r.score != null ? ` — COS ${Math.round(r.score)}/100` : ""}`,
        P.accent,
        SRC,
        r.worthiness?.thesis || r.businessCase?.valueProposition || undefined,
      );

      if (r.businessCase) {
        if (r.businessCase.valueProposition && r.businessCase.valueProposition !== (r.worthiness?.thesis ?? "")) {
          secCallout(sub, `Business case — ${r.businessCase.verdict || "call not stated"}`, r.businessCase.valueProposition, P.accent);
        }
        if (r.businessCase.profitWedge) {
          secLabel(sub, "Where the profitable case is");
          secText(sub, r.businessCase.profitWedge, { fontSize: 11 });
        }
        if (r.businessCase.economics) {
          secLabel(sub, "Economics");
          secText(sub, r.businessCase.economics, { fontSize: 11 });
        }
      }

      const vectors: [string, string][] = [
        ["Market — size", r.market.size],
        ["Market — growth", r.market.growth],
        ["Market — unmet need", r.market.unmetNeed],
        ["Regulatory — authority", r.legal.authority],
        ["Regulatory — pathway", r.legal.pathway],
        ["Regulatory — timeline", r.legal.timeline],
        ["Commercial — competitive density", r.commercial.competitors],
        ["Commercial — pricing / HTA", r.commercial.pricing],
        ["Commercial — reimbursement", r.commercial.reimbursement],
        ["Commercial — distribution", r.commercial.distribution],
        ["IP — patent strength", r.ip.patentStrength],
        ["IP — freedom to operate", r.ip.fto],
        ["IP — estimated exclusivity", r.ip.years != null ? `${r.ip.years} years` : ""],
        ["Manufacturing — complexity", r.manufacturing?.complexity ?? ""],
        ["Manufacturing — notes", r.manufacturing?.notes ?? ""],
      ];
      const present = vectors.filter(([, v]) => !!v);
      if (present.length) {
        secTable(
          sub,
          ["Vector", "What this run found"],
          present.map(([k, v]) => [
            { text: k, options: cellBody({ bold: true, fontSize: 10 }) },
            { text: cellFit(v, 8.4, 0.46, 10), options: cellBody({ fontSize: 10 }) },
          ]),
          [3.733, 8.4],
          { rowH: 0.46 },
        );
      }
      if (r.cos) {
        const cosRows: [string, number | null][] = [
          ["Market size", r.cos.marketSize],
          ["Regulatory", r.cos.regulatory],
          ["IP runway", r.cos.ip],
          ["Market access", r.cos.marketAccess],
          ["Low competition", r.cos.competition],
        ];
        const cosPresent = cosRows.filter(([, v]) => v != null);
        if (cosPresent.length) {
          secTable(
            sub,
            ["Commercial opportunity driver", "Score"],
            cosPresent.map(([k, v]) => [
              { text: k, options: cellBody({ bold: true }) },
              { text: ` ${dotScale(v as number)}  ${Math.round(v as number)}`, options: cellBody({ color: P.accent2, bold: true }) },
            ]),
            [8.133, 4.0],
          );
        }
      }
      if (r.market.drivers.length || r.market.barriers.length) {
        secColumns(
          sub,
          r.market.drivers.length ? { label: "Market drivers", items: r.market.drivers, color: P.accent2 } : null,
          r.market.barriers.length ? { label: "Market barriers", items: r.market.barriers } : null,
        );
      }
      if (r.legal.opportunities.length || r.legal.barriers.length) {
        secColumns(
          sub,
          r.legal.opportunities.length ? { label: "Exclusivity opportunities", items: r.legal.opportunities, color: P.accent2 } : null,
          r.legal.barriers.length ? { label: "Regulatory barriers", items: r.legal.barriers } : null,
        );
      }
      if (r.commercial.partners.length || r.ip.opportunities.length) {
        secColumns(
          sub,
          r.commercial.partners.length ? { label: "Partner candidates — approach these", items: r.commercial.partners, color: P.accent2 } : null,
          r.ip.opportunities.length ? { label: "IP opportunities", items: r.ip.opportunities } : null,
        );
      }
      if (r.ip.risks.length || r.provenanceFlags.length) {
        secColumns(
          sub,
          r.ip.risks.length ? { label: "Expiration risks", items: r.ip.risks } : null,
          r.provenanceFlags.length ? { label: "Provenance flags — verify before relying", items: r.provenanceFlags, color: P.accent2 } : null,
        );
      }

      if (r.worthiness) {
        const w = r.worthiness;
        const wsec = beginSection(
          pptx,
          ax(`Diagnosis · ${r.label} market worthiness`),
          `${r.label} — ${w.rating || "not rated"}${w.score != null ? ` (${Math.round(w.score)}/100)` : ""} on purely commercial grounds`,
          P.accent,
          SRC,
          w.thesis || undefined,
        );
        const wRows: [string, string][] = [
          ["Healthcare landscape", w.healthcareLandscape],
          ["Legal landscape", w.legalLandscape],
          ["Market size vs competitors", w.marketSizeVsCompetitors],
          ["Room for partnerships", w.partnershipRoom],
          ["Distribution channels", w.distributionChannels],
        ];
        const wPresent = wRows.filter(([, v]) => !!v);
        if (wPresent.length) {
          secTable(
            wsec,
            ["Lens", "The current picture"],
            wPresent.map(([k, v]) => [
              { text: k, options: cellBody({ bold: true, fontSize: 10 }) },
              { text: cellFit(v, 8.6, 0.62, 10), options: cellBody({ fontSize: 10 }) },
            ]),
            [3.533, 8.6],
            { rowH: 0.62 },
          );
        }
        if (w.novelPaths.length) {
          secLabel(wsec, "Novel paths to capture this market", P.accent2);
          secBullets(wsec, w.novelPaths);
        }
      }
    }
  }

  // ─── Recommendations (off-patent report) ────────────────────────────────
  if (f.recommendations.length) {
    const first = f.recommendations[0];
    const sec = beginSection(
      pptx,
      ax("Diagnosis · Recommendations"),
      `Prioritise ${first.region} — ${first.structure || "market entry"}`,
      P.accent,
      SRC,
      "Ranked by priority; each row is a route to open, not an option to weigh.",
    );
    secTable(
      sec,
      ["#", "Region", "Route", "Upfront", "Total", "Royalty", "Timeline"],
      f.recommendations.map((r: any) => [
        { text: String(r.rank || "—"), options: cellBody({ bold: true, color: P.accent, align: "center" }) },
        { text: cellFit(r.region, 1.6, 0.5), options: cellBody({ bold: true }) },
        { text: cellFit(r.structure || "—", 3.0, 0.5, 10), options: cellBody({ fontSize: 10 }) },
        { text: cellFit(r.upfront || "—", 1.5, 0.5, 10), options: cellBody({ fontSize: 10, bold: true, color: P.accent2 }) },
        { text: cellFit(r.total || "—", 1.5, 0.5, 10), options: cellBody({ fontSize: 10, bold: true, color: P.accent2 }) },
        { text: cellFit(r.royalty || "—", 1.5, 0.5, 10), options: cellBody({ fontSize: 10, color: P.accent2 }) },
        { text: cellFit(r.timeline || "—", 2.433, 0.5, 10), options: cellBody({ fontSize: 10, color: P.muted }) },
      ]),
      [0.6, 1.6, 3.0, 1.5, 1.5, 1.5, 2.433],
      { rowH: 0.5 },
    );
    for (const r of f.recommendations) {
      if (!r.rationale && !r.partners.length && !r.prerequisites.length && !r.roi) continue;
      const det = beginSection(
        pptx,
        ax(`Diagnosis · Recommendation #${r.rank}`),
        `${r.region} — ${r.structure || "structure to be set"}${r.total ? `, target ${r.total}` : ""}`,
        P.accent,
        SRC,
        r.roi ? `Expected ROI: ${r.roi}` : undefined,
      );
      if (r.rationale) secText(det, r.rationale, { fontSize: 12 });
      if (r.partners.length) {
        secLabel(det, "Top partner candidates — open these conversations", P.accent2);
        secBullets(det, r.partners);
      }
      if (r.prerequisites.length) {
        secLabel(det, "Prerequisites to clear first");
        secBullets(det, r.prerequisites);
      }
    }
  }

  // ─── Business case (off-patent report) ──────────────────────────────────
  if (f.commercialPlan) {
    const cp = f.commercialPlan;
    const firstStep = cp.steps[0];
    const sec = beginSection(
      pptx,
      ax("Diagnosis · Business case"),
      firstStep ? `Start with step ${firstStep.step} — ${truncate(firstStep.action, 80)}` : "Commercial channels and go-to-market",
      P.accent,
      SRC,
      cp.summary || undefined,
    );
    if (cp.channels.length) {
      secLabel(sec, "Commercial channels");
      secTable(
        sec,
        ["Channel", "Geographies", "Where the value is", "How to win it"],
        cp.channels.map((c: any) => [
          { text: cellFit(c.channel, 2.3, 0.56), options: cellBody({ bold: true }) },
          { text: cellFit(c.geographies.join(", ") || "—", 1.7, 0.56, 10), options: cellBody({ fontSize: 10 }) },
          { text: cellFit(c.valueRole || "—", 3.5, 0.56, 10), options: cellBody({ fontSize: 10 }) },
          {
            text: cellFit(
              [c.accessMechanics, c.keyPlayers.length ? `(${c.keyPlayers.join(", ")})` : ""].filter(Boolean).join(" "),
              4.633, 0.56, 10,
            ),
            options: cellBody({ fontSize: 10 }),
          },
        ]),
        [2.3, 1.7, 3.5, 4.633],
        { rowH: 0.56 },
      );
    }
    if (cp.steps.length) {
      secLabel(sec, "How to proceed", P.accent2);
      secTable(
        sec,
        ["#", "Action", "Geography", "Approach", "Timing", "Owner"],
        cp.steps.map((s: any) => [
          { text: String(s.step), options: cellBody({ bold: true, color: P.accent, align: "center" }) },
          { text: cellFit(s.action, 4.4, 0.52), options: cellBody({ bold: true }) },
          { text: cellFit(s.geography || "—", 1.6, 0.52, 10), options: cellBody({ fontSize: 10 }) },
          { text: cellFit(s.approach || "—", 2.6, 0.52, 10), options: cellBody({ fontSize: 10, color: P.accent2 }) },
          { text: cellFit(s.timing || "—", 1.6, 0.52, 10), options: cellBody({ fontSize: 10 }) },
          { text: cellFit(s.owner || "Not assigned", 1.333, 0.52, 10), options: cellBody({ fontSize: 10, color: P.muted }) },
        ]),
        [0.6, 4.4, 1.6, 2.6, 1.6, 1.333],
        { rowH: 0.52 },
      );
    }
  }

  // ─── Flaws & blockers ───────────────────────────────────────────────────
  if (f.risks.length || topRisks.length || swingFactors.length) {
    const high = f.risks.filter((r: any) => r.impact === "High");
    const sec = beginSection(
      pptx,
      ax("Diagnosis · Flaws & blockers"),
      high.length
        ? `${high.length} high-impact blocker${high.length === 1 ? "" : "s"} need an owner before any commitment`
        : "What could kill this, and what most moves the score",
      P.accent,
      SRC,
      "Swing factors are the variables to resolve first — they change the answer, not just the confidence.",
    );
    if (f.risks.length) {
      secTable(
        sec,
        ["Category", "Risk", "Impact", "Likelihood", "Mitigation — do this"],
        f.risks.map((r: any) => [
          { text: cellFit(r.category || "—", 1.5, 0.58, 10), options: cellBody({ fontSize: 10, bold: true }) },
          { text: cellFit(r.risk, 3.6, 0.58, 10), options: cellBody({ fontSize: 10, bold: true }) },
          { text: r.impact || "—", options: cellBody({ fontSize: 10, bold: r.impact === "High", color: r.impact === "High" ? P.accent2 : P.muted }) },
          { text: r.likelihood || "—", options: cellBody({ fontSize: 10, color: P.muted }) },
          { text: cellFit(r.mitigation || "No mitigation recorded — assign an owner to define one", 4.033, 0.58, 10), options: cellBody({ fontSize: 10 }) },
        ]),
        [1.5, 3.6, 1.4, 1.6, 4.033],
        { rowH: 0.58 },
      );
    }
    if (topRisks.length || swingFactors.length) {
      secColumns(
        sec,
        topRisks.length ? { label: "Top risks", items: topRisks } : null,
        swingFactors.length ? { label: "Swing factors — resolve these first", items: swingFactors, color: P.accent2 } : null,
      );
    }
  }

  // ─── IP flags (innovative) ──────────────────────────────────────────────
  if (branch === "innovative" && ipFlags.length) {
    const sec = beginSection(
      pptx,
      ax("Diagnosis · IP & FTO"),
      "Flags counsel must clear before any commitment",
      P.accent,
      "A screen of public patent and regulatory records — not a legal opinion",
    );
    secTable(
      sec,
      ["Severity", "Claim / flag", "Why it matters", "Citation"],
      ipFlags.map((fl) => [
        { text: (sText(fl.severity) || "not stated").toUpperCase(), options: cellBody({ bold: true, color: P.accent2, fontSize: 10 }) },
        { text: cellFit(sText(fl.flag) || sText(fl.claim) || sText(fl.label) || "Unnamed flag", 3.6, 0.56, 10), options: cellBody({ bold: true, fontSize: 10 }) },
        { text: cellFit(sText(fl.note) || sText(fl.whyItMatters) || sText(fl.why) || "Not stated", 4.533, 0.56, 10), options: cellBody({ fontSize: 10 }) },
        { text: cellFit(sText(fl.citation) || sText(fl.source) || "Not cited", 2.7, 0.56, 10), options: cellBody({ fontSize: 10, color: P.muted }) },
      ]),
      [1.5, 3.6, 4.533, 2.5],
      { rowH: 0.56 },
    );
  }

  // ─── What would flip it / considered & rejected ─────────────────────────
  const rejectedRows = f.consideredAndRejected.length
    ? f.consideredAndRejected
    : rejectedEnvelope.map((r) => ({ opportunity: sText(r.opportunity), reason: sText(r.reason) })).filter((r) => r.opportunity);
  if (f.whatWouldFlipIt.length || rejectedRows.length) {
    const sec = beginSection(
      pptx,
      ax("Diagnosis · Calibration"),
      f.whatWouldFlipIt.length
        ? "The evidence that would change this answer — go and get it"
        : "The angles argued for and then set aside",
      P.accent,
      "CartaOS quality framework",
      "A verdict that nothing could overturn is not a verdict. These are the falsifiers.",
    );
    if (f.whatWouldFlipIt.length) {
      secLabel(sec, "What would flip the verdict", P.accent2);
      secBullets(sec, f.whatWouldFlipIt);
    }
    if (rejectedRows.length) {
      secLabel(sec, "Considered & rejected — do not reopen without new evidence");
      secTable(
        sec,
        ["Opportunity", "Why it was rejected"],
        rejectedRows.map((r: any) => [
          { text: cellFit(r.opportunity, 4.0, 0.52), options: cellBody({ bold: true }) },
          { text: cellFit(r.reason || "Not stated", 8.133, 0.52, 10), options: cellBody({ fontSize: 10 }) },
        ]),
        [4.0, 8.133],
        { rowH: 0.52 },
      );
    }
  }

  // ─── Evidence ───────────────────────────────────────────────────────────
  if (includeEvidence) {
    const items = dimensions.flatMap((d) =>
      (Array.isArray(d.evidence) ? d.evidence : []).map((e: EvidenceItem) => ({ dim: dimensionLabel(branch, d.key), e })),
    );
    const strongest = items
      .slice()
      .sort((a, b) => {
        const kind = (a.e.kind === "evidence" ? 0 : 1) - (b.e.kind === "evidence" ? 0 : 1);
        if (kind !== 0) return kind;
        return (a.e.tier ?? 9) - (b.e.tier ?? 9);
      })
      .slice(0, 18);

    if (strongest.length) {
      const estimates = strongest.filter((x) => x.e.kind === "estimate").length;
      const sec = beginSection(
        pptx,
        ax("Diagnosis · Evidence"),
        estimates
          ? `${estimates} of ${strongest.length} shown claims are inferences — source them before they carry a decision`
          : "The evidence the verdict rests on",
        P.accent,
        `${items.length} evidence items recorded across ${dimensions.length} dimensions`,
      );
      secTable(
        sec,
        ["Claim", "Dimension", "Type", "Source", "Tier"],
        strongest.map(({ dim, e }) => [
          { text: cellFit(sText(e.claim) || "—", 4.6, 0.52, 10), options: cellBody({ fontSize: 10 }) },
          { text: cellFit(dim, 2.4, 0.52, 10), options: cellBody({ fontSize: 10, bold: true }) },
          {
            text: e.kind === "estimate" ? "Estimate" : "Evidence",
            options: cellBody({ fontSize: 10, bold: true, color: e.kind === "estimate" ? P.accent2 : P.muted }),
          },
          { text: cellFit(sText(e.source) || "Not stated", 2.6, 0.52, 10), options: cellBody({ fontSize: 10, color: P.muted }) },
          { text: e.tier != null ? `T${e.tier}` : "—", options: cellBody({ fontSize: 10, color: P.muted, align: "center" }) },
        ]),
        [4.6, 2.4, 1.3, 2.6, 1.233],
        { rowH: 0.52 },
      );
    }
  }

  // ─── Basis of preparation ───────────────────────────────────────────────
  {
    const gaps = coverage.filter((c) => (c.unwired ?? []).length > 0);
    const sec = beginSection(
      pptx,
      ax("Basis of preparation"),
      gaps.length
        ? `Connect ${gaps.length} missing source set${gaps.length === 1 ? "" : "s"} before treating these scores as settled`
        : "How to read this diagnosis",
      P.accent,
      "CartaOS diagnosis engine",
    );
    secBullets(
      sec,
      [
        "Internal strategic decision support only — not medical, regulatory or legal advice, and not promotional material.",
        "Every score is generated by CartaOS from the sources named against it. Items marked Estimate are model inferences, not sourced findings.",
        "Dimensions, levers and markets the evidence base could not support are stated as not computable, with the reason — they are never estimated, defaulted or shown as zero.",
        uncomputed
          ? `${uncomputed} of ${dimensions.length} dimensions could not be computed in this run.`
          : "Every dimension in this run was computable from the connected evidence.",
        gaps.length
          ? `${gaps.length} dimension${gaps.length === 1 ? "" : "s"} had applicable sources with no connected client — connect ${Array.from(new Set(gaps.flatMap((g) => g.unwired ?? []))).join(", ")} and re-run.`
          : "",
        "Verify every figure against primary sources before transacting.",
      ].filter(Boolean),
      { fontSize: 12 },
    );
    if (coverage.length) {
      secTable(
        sec,
        ["Dimension", "Sources consulted", "Applicable but not connected"],
        coverage.map((c) => [
          { text: cellFit(sText(c.label) || dimensionLabel(branch, c.key), 3.5, 0.5, 10), options: cellBody({ fontSize: 10, bold: true }) },
          { text: cellFit((c.consulted ?? []).join(", ") || "None", 4.8, 0.5, 10), options: cellBody({ fontSize: 10 }) },
          { text: cellFit((c.unwired ?? []).join(", ") || "None", 3.833, 0.5, 10), options: cellBody({ fontSize: 10, color: (c.unwired ?? []).length ? P.accent2 : P.muted }) },
        ]),
        [3.5, 4.8, 3.833],
        { rowH: 0.5 },
      );
    }
  }

  return pptx;
}

export async function exportDiagnosisPPTX(
  diagnosis: Diagnosis,
  branch: "off_patent" | "innovative",
  assetName: string,
  opts?: ExportOptions,
) {
  const pptx = await buildDiagnosisPptx(diagnosis, branch, assetName, opts);
  await pptx.writeFile({ fileName: `${safeFilename(assetName)}_Diagnosis.pptx` });
}

/**
 * The PPT counterpart of exportStrategyPDF. Same deterministic discipline: the
 * economics are recomputed here from `strategy.assumptions` by the pure engine,
 * never read off narrated route objects, and a route missing a required input
 * names that input instead of showing a number.
 */
export async function buildStrategyPptx(
  strategy: Strategy,
  branch: "off_patent" | "innovative",
  assetName: string,
  opts?: ExportOptions,
): Promise<any> {
  const [PptxGenJS, engine] = await Promise.all([
    import("pptxgenjs").then((m) => m.default),
    import("@/server/services/strategy/model"),
  ]);

  const includeEvidence = opts?.includeEvidence !== false;
  const includeAppendix = opts?.includeAppendix !== false;
  const branchLabel = branch === "off_patent" ? "Off-Patent" : "Innovative";
  const deckName = `${branchLabel} Route Strategy`;
  const pptx = newDeck(PptxGenJS, `${assetName} — ${deckName}`);

  // ── Recompute from the assumptions as they stand ──────────────────────────
  const assumptions = Array.isArray(strategy.assumptions) ? strategy.assumptions : [];
  const values: Record<string, number> = {};
  for (const a of assumptions) {
    if (String(a.value).trim() === "") continue;
    const n = Number(a.value);
    if (Number.isFinite(n)) values[a.key] = n;
  }
  const required = branch === "off_patent" ? engine.OFF_PATENT_REQUIRED : engine.INNOVATIVE_REQUIRED;
  const results = engine.modelAllRoutes(branch, values);
  const byKey = new Map(results.map((r) => [r.key, r]));
  const routes = Array.isArray(strategy.routes) ? strategy.routes : [];
  /** Fit gates which route may be recommended; economics rank the survivors. */
  const fit = Object.fromEntries(routes.map((r) => [r.key, r.score] as [string, number | null | undefined]));
  const recommendation = engine.recommend(results, fit);
  const best = recommendation?.route ?? null;
  const scen = engine.runScenarios(branch, values, 20);
  const sens = best ? engine.sensitivity(branch, values, best.key, 20).slice(0, 6) : [];

  const recommendedKey = best?.key ?? sText(strategy.recommendedRoute);
  const recommended = routes.find((r) => r.key === recommendedKey);
  const missing = required.filter((k) => !Number.isFinite(values[k]));
  const labelOf = (key: string) => sText(assumptions.find((a) => a.key === key)?.label) || key;
  const routeLabel = (key: string) =>
    sText(routes.find((r) => r.key === key)?.label) || sText(byKey.get(key)?.label) || key;
  const scenNpv = (set: typeof scen.base, key: string) => {
    const r = set.find((x) => x.key === key);
    return r && r.computable ? compactUsd(r.npv) : "n/a";
  };
  const computableRoutes = routes.filter((r) => byKey.get(r.key)?.computable);
  const uncomputable = routes.filter((r) => byKey.get(r.key)?.computable !== true);
  const partners = Array.isArray(strategy.partnerShortlist) ? strategy.partnerShortlist : [];
  const sequence = Array.isArray((strategy as Record<string, unknown>).approachSequence)
    ? ((strategy as Record<string, unknown>).approachSequence as unknown[]).map(sText).filter(Boolean)
    : [];
  const SRC = "Deterministic CartaOS strategy model, computed from the assumption set in this deck";

  // ─── Title ──────────────────────────────────────────────────────────────
  titleSlide(
    pptx,
    deckName,
    assetName,
    "Every commercialisation and partnering route modelled from one assumption set — NPV, IRR, break-even and the dependency that would break the plan",
    [
      ["RECOMMENDED ROUTE", recommended?.label ?? (best ? best.label : "Not computable"), true],
      ["MODELLED NPV", best ? compactUsd(best.npv) : "n/a", false],
      ["BREAK-EVEN", best?.breakEvenYear != null ? `Year ${best.breakEvenYear}` : "n/a", false],
      ["ROUTES MODELLED", `${computableRoutes.length} of ${routes.length}`, false],
    ],
    P.accent,
  );

  // ══════════════════════════════════════════════════════════════════════════
  //  PART 1 — EXECUTIVE SUMMARY. Short enough to stop here.
  // ══════════════════════════════════════════════════════════════════════════
  {
    const sec = beginSection(
      pptx,
      "Executive summary",
      best
        ? `${sText(recommended?.label) || routeLabel(best.key)} is the route to commit to`
        : "No route can be modelled on the current assumptions",
      P.accent,
      SRC,
    );
    if (recommendation?.lowFit) {
      secCallout(
        sec,
        "No route cleared the fit bar",
        "No route was judged actually open to this asset. The figures below are the best economics available, not a route to execute — read them as a ceiling on value.",
        P.accent2,
      );
    }
    if (best) {
      secStats(sec, [
        ["Modelled NPV", compactUsd(best.npv), true],
        ["IRR", best.irr != null ? `${best.irr.toFixed(1)}%` : "n/a", false],
        ["Break-even", best.breakEvenYear != null ? `Year ${best.breakEvenYear}` : "Never in horizon", false],
        ["Routes modelled", `${computableRoutes.length} of ${routes.length}`, false],
      ]);
      const summaryDependency = sText(recommended?.keyDependency) || sText(best.keyDependency);
      if (summaryDependency) secCallout(sec, "Key dependency — what would break this plan", summaryDependency, P.accent2);
    } else {
      secText(
        sec,
        `No route can be modelled until these assumptions are supplied: ${missing.map(labelOf).join(", ") || "none recorded"}. Until then no route has an economic case at all.`,
        { fontSize: 13, color: P.accent2 },
      );
    }
    if (includeAppendix) {
      secText(sec, "Every route, every assumption and the evidence behind them are in the appendix that follows.", {
        fontSize: 11,
        color: P.muted,
      });
    }
  }

  // ─── What to do next — the centrepiece of the summary ────────────────────
  const nextSteps = strategyNextActions({
    recommended, best, byKey, missing, labelOf, sens, partners, assumptions, uncomputable, strategy, limit: 8,
  });
  if (nextSteps.length) {
    const sec = beginSection(
      pptx,
      "What to do next",
      best
        ? `Commit to ${routeLabel(best.key)} and close the inputs that could still move it`
        : "Close the missing inputs before this decision can be taken",
      P.accent,
      SRC,
      "Each line names the route, variable, counterparty or input this model run produced — not a generic checklist.",
    );
    secTable(
      sec,
      ["#", "Do this", "Owner", "Because"],
      nextSteps.map((a, i) => [
        { text: String(i + 1), options: cellBody({ bold: true, color: P.accent, align: "center" }) },
        { text: cellFit(a.action, 5.633, 0.62), options: cellBody({ bold: true }) },
        { text: cellFit(a.owner || "Not assigned", 2.0, 0.62, 10), options: cellBody({ fontSize: 10, color: P.muted }) },
        { text: cellFit(a.detail || "—", 4.0, 0.62, 10), options: cellBody({ fontSize: 10, color: P.muted }) },
      ]),
      [0.5, 5.633, 2.0, 4.0],
      { rowH: 0.62 },
    );
  }

  // ─── Route comparison — the top four, on the figures that decide it ─────
  const summaryRoutes = computableRoutes
    .slice()
    .sort((a, b) => {
      const ea = byKey.get(a.key);
      const eb = byKey.get(b.key);
      return ((eb?.computable ? eb.npv : 0) ?? 0) - ((ea?.computable ? ea.npv : 0) ?? 0);
    })
    .slice(0, 4);
  if (summaryRoutes.length) {
    const sec = beginSection(
      pptx,
      "Route comparison",
      summaryRoutes.length === 1
        ? "One route clears the model on the current assumptions"
        : `The ${summaryRoutes.length} strongest routes on one assumption set`,
      P.accent,
      SRC,
      computableRoutes.length > summaryRoutes.length || uncomputable.length
        ? "The strongest routes by modelled NPV. Every route, including those still missing an input, is in the appendix."
        : "Fit is the read for this asset; NPV, IRR and break-even are model output.",
    );
    secTable(
      sec,
      ["Route", "Fit", "NPV", "IRR", "Break-even"],
      summaryRoutes.map((r) => {
        const e = byKey.get(r.key);
        const econ = e && e.computable ? e : null;
        const isRec = r.key === recommendedKey;
        return [
          { text: cellFit(`${r.label}${isRec ? "  (recommended)" : ""}`, 4.333, 0.56), options: cellBody({ bold: true }) },
          { text: r.score != null ? String(r.score) : "n/a", options: cellBody({ align: "center" }) },
          { text: compactUsd(econ?.npv), options: cellBody({ bold: true, color: P.accent2, align: "right" }) },
          { text: econ?.irr != null ? `${econ.irr.toFixed(1)}%` : "n/a", options: cellBody({ align: "right" }) },
          { text: econ?.breakEvenYear != null ? `Year ${econ.breakEvenYear}` : "never", options: cellBody({ align: "center" }) },
        ];
      }),
      [4.333, 1.4, 2.4, 1.8, 2.2],
      { rowH: 0.56 },
    );
  }

  // ─── The assumptions that decide the answer ─────────────────────────────
  const dominant = sens.slice(0, 3);
  if (dominant.length && best) {
    const sec = beginSection(
      pptx,
      "What the answer turns on",
      `${labelOf(dominant[0].key)} dominates the outcome — settle it first`,
      P.accent,
      `Each driver moved ±20% on its own, everything else held, against ${sText(recommended?.label) || routeLabel(best.key)}`,
      "These are the inputs worth arguing about; every other driver barely moves the answer.",
    );
    secTable(
      sec,
      ["Variable", "NPV swing across ±20%", "Basis today"],
      dominant.map((s) => {
        const sourced = assumptions.find((a) => a.key === s.key)?.basis === "sourced";
        return [
          { text: cellFit(labelOf(s.key), 4.733, 0.56), options: cellBody({ bold: true }) },
          { text: compactUsd(s.swing), options: cellBody({ bold: true, color: P.accent2, align: "right" }) },
          {
            text: sourced ? "Sourced" : "Assumed — not sourced, source it",
            options: cellBody({ fontSize: 10, color: sourced ? P.muted : P.accent2, bold: !sourced }),
          },
        ];
      }),
      [4.733, 3.4, 4.0],
      { rowH: 0.56 },
    );
  }

  // ─── Partner shortlist — the three to open with ─────────────────────────
  if (partners.length) {
    const shortlist = partners.slice(0, 3);
    const sec = beginSection(
      pptx,
      "Counterparties",
      `Open with ${sText(shortlist[0]?.name) || "the top-ranked counterparty"}`,
      P.accent,
      SRC,
      partners.length > shortlist.length
        ? `The three highest-fit counterparties; the full shortlist of ${partners.length} is in the appendix.`
        : "Ranked by fit against this asset and this route.",
    );
    secTable(
      sec,
      ["#", "Partner", "Type", "Fit", "Why them"],
      shortlist.map((p, i) => [
        { text: String(i + 1), options: cellBody({ bold: true, color: P.accent, align: "center" }) },
        { text: cellFit(p.name, 2.4, 0.56), options: cellBody({ bold: true }) },
        { text: cellFit(sText(p.kind) || "—", 1.8, 0.56, 10), options: cellBody({ fontSize: 10, color: P.muted }) },
        { text: p.score != null ? String(p.score) : "n/a", options: cellBody({ align: "center" }) },
        { text: cellFit(sText(p.rationale) || "Not stated", 6.433, 0.56, 10), options: cellBody({ fontSize: 10 }) },
      ]),
      [0.6, 2.4, 1.8, 0.9, 6.433],
      { rowH: 0.56 },
    );
  }

  // A summary-only deck stops here: no divider, no appendix.
  if (!includeAppendix) return pptx;

  // ══════════════════════════════════════════════════════════════════════════
  //  PART 2 — APPENDIX
  // ══════════════════════════════════════════════════════════════════════════
  appendixDividerSlide(pptx, P.accent);
  const ax = appendixCounter();

  // ─── Recommendation ─────────────────────────────────────────────────────
  {
    const sec = beginSection(
      pptx,
      ax("Strategy · Recommendation"),
      best ? `${routeLabel(best.key)} realises the most value` : "No route is computable on the current assumptions",
      P.accent,
      SRC,
    );

    if (recommendation?.lowFit) {
      secCallout(
        sec,
        "No route cleared the fit bar",
        "This is the best economics available, not a route judged open to this asset. Treat it as a ceiling on value, not a recommendation to execute.",
        P.accent2,
      );
    }

    if (best) {
      secStats(sec, [
        ["NPV", compactUsd(best.npv), true],
        ["IRR", best.irr != null ? `${best.irr.toFixed(1)}%` : "n/a", false],
        ["Break-even", best.breakEvenYear != null ? `Year ${best.breakEvenYear}` : "Never in horizon", false],
        ["Peak revenue", compactUsd(best.peakRevenue), false],
      ]);
      secLabel(sec, "Scenario range — every driver moved together by ±20%");
      secText(
        sec,
        `Downside ${scenNpv(scen.downside, best.key)}     ·     Base ${compactUsd(best.npv)}     ·     Upside ${scenNpv(scen.upside, best.key)}`,
        { fontSize: 14, bold: true },
      );
      const dependency = sText(recommended?.keyDependency) || sText(best.keyDependency);
      if (dependency) secCallout(sec, "Key dependency — what would break this plan", dependency, P.accent2);
      const rationale = sText((recommended as Record<string, unknown> | undefined)?.rationale);
      if (rationale) secText(sec, rationale, { fontSize: 11 });
    } else {
      secText(
        sec,
        `No route can be modelled until these assumptions are supplied: ${missing.map(labelOf).join(", ") || "none recorded"}.`,
        { fontSize: 13, color: P.accent2 },
      );
    }

    if (recommendation?.setAside.length) {
      secLabel(sec, "Passed over on fit despite higher NPV");
      secBullets(
        sec,
        recommendation.setAside.map((s) => `${routeLabel(s.key)} — ${compactUsd(s.npv)}, fit ${s.score}`),
        { color: P.muted },
      );
    }
  }

  // ─── Route comparison ───────────────────────────────────────────────────
  if (routes.length) {
    const ordered = [...computableRoutes, ...uncomputable];
    const sec = beginSection(
      pptx,
      ax("Strategy · Route comparison"),
      "Every route, one assumption set",
      P.accent,
      SRC,
      "A route missing a required input names that input — it is never shown as a zero or ranked as one.",
    );
    secTable(
      sec,
      ["Route", "Fit", "NPV", "IRR", "Break-even", "Peak revenue"],
      ordered.map((r) => {
        const e = byKey.get(r.key);
        const isRec = r.key === recommendedKey;
        if (!e || !e.computable) {
          const miss = e && !e.computable ? e.missing : required;
          return [
            { text: cellFit(r.label, 3.4, 0.5), options: cellBody({ bold: true, color: P.faint }) },
            { text: r.score != null ? String(r.score) : "n/a", options: cellBody({ color: P.faint, align: "center" }) },
            { text: cellFit(`Not computable — needs ${miss.map(labelOf).join(", ")}`, 5.2, 0.5, 10), options: cellBody({ fontSize: 10, color: P.accent2 }) },
            { text: "—", options: cellBody({ color: P.faint, align: "center" }) },
            { text: "—", options: cellBody({ color: P.faint, align: "center" }) },
            { text: "—", options: cellBody({ color: P.faint, align: "center" }) },
          ];
        }
        return [
          { text: cellFit(r.label, 3.4, 0.5), options: cellBody({ bold: true }) },
          { text: r.score != null ? String(r.score) : "n/a", options: cellBody({ align: "center" }) },
          { text: compactUsd(e.npv), options: cellBody({ bold: true, color: P.accent2, align: "right" }) },
          { text: e.irr != null ? `${e.irr.toFixed(1)}%` : "n/a", options: cellBody({ align: "right" }) },
          { text: e.breakEvenYear != null ? `Y${e.breakEvenYear}` : "never", options: cellBody({ align: "center" }) },
          { text: compactUsd(e.peakRevenue), options: cellBody({ align: "right", bold: isRec }) },
        ];
      }),
      [3.4, 1.0, 2.6, 1.2, 1.4, 2.533],
      { rowH: 0.5 },
    );
  }

  // ─── Assumptions ────────────────────────────────────────────────────────
  if (assumptions.length) {
    const assumed = assumptions.filter((a) => a.basis !== "sourced").length;
    const sec = beginSection(
      pptx,
      ax("Strategy · Assumptions"),
      assumed
        ? `${assumed} of ${assumptions.length} inputs are the model's own estimate — challenge those first`
        : "Every input in this deck is sourced",
      P.accent,
      SRC,
    );
    secTable(
      sec,
      ["Assumption", "Value", "Unit", "Basis"],
      assumptions.map((a) => {
        const supplied = String(a.value ?? "").trim() !== "";
        const sourced = a.basis === "sourced";
        return [
          { text: cellFit(sText(a.label) || a.key, 4.2, 0.46), options: cellBody({ bold: true }) },
          {
            text: supplied ? String(a.value) : "Not supplied",
            options: cellBody({ align: "right", bold: supplied, color: supplied ? P.ink : P.accent2 }),
          },
          { text: cellFit(sText(a.unit) || "—", 1.6, 0.46, 10), options: cellBody({ fontSize: 10, color: P.muted }) },
          {
            text: cellFit(sourced ? `Sourced — ${sText(a.source) || "source not named"}` : "Assumed — not sourced, source it", 4.333, 0.46, 10),
            options: cellBody({ fontSize: 10, color: sourced ? P.muted : P.accent2, bold: !sourced }),
          },
        ];
      }),
      [4.2, 2.0, 1.6, 4.333],
      { rowH: 0.46 },
    );
    if (missing.length) {
      secCallout(sec, "Still missing", `${missing.map(labelOf).join(", ")} — supply these to unlock the routes above.`, P.accent2);
    }
  }

  // ─── Scenarios ──────────────────────────────────────────────────────────
  if (computableRoutes.length) {
    const sec = beginSection(
      pptx,
      ax("Strategy · Scenarios"),
      "How the routes hold up when every driver moves together",
      P.accent,
      "Every scenario driver moved ±20% at once; routes that cannot be modelled are excluded rather than defaulted",
    );
    secTable(
      sec,
      ["Route", "Downside NPV", "Base NPV", "Upside NPV"],
      computableRoutes.map((r) => {
        const isRec = r.key === recommendedKey;
        return [
          { text: cellFit(r.label, 4.333, 0.5), options: cellBody({ bold: true }) },
          { text: scenNpv(scen.downside, r.key), options: cellBody({ align: "right", color: P.muted }) },
          { text: scenNpv(scen.base, r.key), options: cellBody({ align: "right", bold: true, color: isRec ? P.accent2 : P.ink }) },
          { text: scenNpv(scen.upside, r.key), options: cellBody({ align: "right", color: P.muted }) },
        ];
      }),
      [4.333, 2.6, 2.6, 2.6],
      { rowH: 0.5 },
    );
  }

  // ─── Sensitivity ────────────────────────────────────────────────────────
  if (sens.length && best) {
    const sec = beginSection(
      pptx,
      ax("Strategy · Sensitivity"),
      `${labelOf(sens[0].key)} dominates the outcome — settle it first`,
      P.accent,
      `Each driver moved ±20% on its own, everything else held, against ${routeLabel(best.key)}`,
    );
    secTable(
      sec,
      ["#", "Variable", "NPV at -20%", "NPV at +20%", "Swing"],
      sens.map((s, i) => [
        { text: String(i + 1), options: cellBody({ bold: true, color: P.accent, align: "center" }) },
        { text: cellFit(labelOf(s.key), 4.333, 0.52), options: cellBody({ bold: true }) },
        { text: compactUsd(s.low), options: cellBody({ align: "right" }) },
        { text: compactUsd(s.high), options: cellBody({ align: "right" }) },
        { text: compactUsd(s.swing), options: cellBody({ align: "right", bold: true, color: P.accent2 }) },
      ]),
      [0.8, 4.333, 2.4, 2.4, 2.2],
      { rowH: 0.52 },
    );
  }

  // ─── Partner shortlist ──────────────────────────────────────────────────
  if (partners.length) {
    const sec = beginSection(
      pptx,
      ax("Strategy · Counterparties"),
      `Open with ${sText(partners[0]?.name) || "the top-ranked counterparty"}`,
      P.accent,
      SRC,
    );
    secTable(
      sec,
      ["#", "Partner", "Type", "Fit", "Geographies", "Why them"],
      partners.map((p, i) => [
        { text: String(i + 1), options: cellBody({ bold: true, color: P.accent, align: "center" }) },
        { text: cellFit(p.name, 2.4, 0.52), options: cellBody({ bold: true }) },
        { text: cellFit(sText(p.kind) || "—", 1.6, 0.52, 10), options: cellBody({ fontSize: 10, color: P.muted }) },
        { text: p.score != null ? String(p.score) : "n/a", options: cellBody({ align: "center" }) },
        { text: cellFit((p.geographies ?? []).map(countryLabel).join(", ") || "—", 2.0, 0.52, 10), options: cellBody({ fontSize: 10 }) },
        { text: cellFit(sText(p.rationale) || "Not stated", 4.633, 0.52, 10), options: cellBody({ fontSize: 10 }) },
      ]),
      [0.6, 2.4, 1.6, 0.9, 2.0, 4.633],
      { rowH: 0.52 },
    );
  }

  // ─── Sequence of approach ───────────────────────────────────────────────
  if (sequence.length) {
    const sec = beginSection(
      pptx,
      ax("Strategy · Sequence"),
      "The order to run this in",
      P.accent,
      SRC,
      "Each step assumes the one before it has landed — running them in parallel forfeits the leverage.",
    );
    secBullets(sec, sequence.map((s, i) => `${i + 1}. ${s}`), { fontSize: 12 });
  }

  // ─── Evidence behind the routes ─────────────────────────────────────────
  if (includeEvidence) {
    const items = [
      ...routes.flatMap((r) => (Array.isArray(r.evidence) ? r.evidence : []).map((e: EvidenceItem) => ({ subject: r.label, e }))),
      ...partners.flatMap((p) => (Array.isArray(p.evidence) ? p.evidence : []).map((e: EvidenceItem) => ({ subject: p.name, e }))),
    ];
    const strongest = items
      .slice()
      .sort((a, b) => {
        const kind = (a.e.kind === "evidence" ? 0 : 1) - (b.e.kind === "evidence" ? 0 : 1);
        if (kind !== 0) return kind;
        return (a.e.tier ?? 9) - (b.e.tier ?? 9);
      })
      .slice(0, 18);

    if (strongest.length) {
      const estimates = strongest.filter((x) => x.e.kind === "estimate").length;
      const sec = beginSection(
        pptx,
        ax("Strategy · Evidence"),
        estimates
          ? `${estimates} of ${strongest.length} shown claims are inferences — source them before they carry a decision`
          : "What the route reads are built on",
        P.accent,
        "Items marked Estimate are CartaOS inferences, not sourced findings",
      );
      secTable(
        sec,
        ["Subject", "Claim", "Type", "Source"],
        strongest.map(({ subject, e }) => [
          { text: cellFit(subject, 3.0, 0.52, 10), options: cellBody({ bold: true, fontSize: 10 }) },
          { text: cellFit(sText(e.claim) || "—", 5.0, 0.52, 10), options: cellBody({ fontSize: 10 }) },
          {
            text: e.kind === "estimate" ? "Estimate" : "Evidence",
            options: cellBody({ fontSize: 10, bold: true, color: e.kind === "estimate" ? P.accent2 : P.muted }),
          },
          { text: cellFit(sText(e.source) || "Not stated", 2.833, 0.52, 10), options: cellBody({ fontSize: 10, color: P.muted }) },
        ]),
        [3.0, 5.0, 1.3, 2.833],
        { rowH: 0.52 },
      );
    }
  }

  // ─── Basis of preparation ───────────────────────────────────────────────
  {
    const sec = beginSection(
      pptx,
      ax("Basis of preparation"),
      "How to read this strategy",
      P.accent,
      SRC,
    );
    secBullets(
      sec,
      [
        "Internal strategic decision support only — not investment, legal or regulatory advice.",
        "Every financial figure is recomputed here from the assumption set in this deck by the same deterministic engine the screen uses; change an assumption and the figures move with it.",
        "A route missing a required input is named as not computable with the input it needs — it is never defaulted to zero or dropped silently.",
        missing.length
          ? `Still missing across the model: ${missing.map(labelOf).join(", ")}.`
          : "Every required input for this branch was supplied.",
        "Verify every assumption marked Assumed against a primary source before transacting.",
      ].filter(Boolean),
      { fontSize: 12 },
    );
  }

  return pptx;
}

export async function exportStrategyPPTX(
  strategy: Strategy,
  branch: "off_patent" | "innovative",
  assetName: string,
  opts?: ExportOptions,
) {
  const pptx = await buildStrategyPptx(strategy, branch, assetName, opts);
  await pptx.writeFile({ fileName: `${safeFilename(assetName)}_Strategy.pptx` });
}
