/**
 * Data-room templates per branch (§6, Option C) as configuration.
 *
 * What a counterparty asks for is a stable fact about the transaction type, not
 * something to generate fresh each run — so it lives here. The generator in
 * server/services/execution/data-room.ts composes the index from this template
 * and marks each item's readiness from the execution tracker. Adding a document
 * or changing which routes need it is a config edit, not a code change (§7).
 *
 * `workstream` is the category the item belongs to. The generator matches it
 * against the plan's own workstream names to decide readiness — an item whose
 * category nothing in the plan covers is reported as untracked rather than
 * silently assumed ready.
 */

export interface DataRoomItemDef {
  id: string;
  title: string;
  /** Why a counterparty asks for this — shown next to the item. */
  purpose: string;
  /** Category, matched against the plan's workstreams to derive readiness. */
  workstream: string;
  /**
   * Route keys this item is required for. Omit for "every route in the branch".
   * A route-specific document on the wrong route is noise in a data room.
   */
  routes?: string[];
}

export interface DataRoomSectionDef {
  key: string;
  label: string;
  description: string;
  items: DataRoomItemDef[];
}

// ── Off-patent: the buyer/partner is diligencing a marketable product ────────

export const OFF_PATENT_DATA_ROOM: DataRoomSectionDef[] = [
  {
    key: "regulatory",
    label: "Regulatory",
    description: "The right to sell the product, market by market.",
    items: [
      {
        id: "ma-certificates",
        title: "Marketing authorisation certificates per market",
        purpose: "Proves the product may legally be sold in each territory in scope.",
        workstream: "Regulatory",
      },
      {
        id: "ma-variations",
        title: "Variation history and open commitments",
        purpose: "Shows what the authority has already required and what is still outstanding.",
        workstream: "Regulatory",
      },
      {
        id: "ma-transfer-pack",
        title: "MA transfer pack and transfer timetable",
        purpose: "The mechanics and elapsed time of moving the authorisation to the counterparty.",
        workstream: "Regulatory",
        routes: ["out_license_ma", "asset_sale", "in_license_ma"],
      },
      {
        id: "smpc-labelling",
        title: "Approved SmPC, labelling and artwork",
        purpose: "Fixes what may be claimed and what must be re-artworked on transfer.",
        workstream: "Regulatory",
      },
    ],
  },
  {
    key: "quality",
    label: "Quality & pharmacovigilance",
    description: "The obligations that continue after the deal closes.",
    items: [
      {
        id: "qp-release",
        title: "QP release arrangements and batch release history",
        purpose: "Confirms product can actually be released to market, and by whom.",
        workstream: "Quality",
      },
      {
        id: "psmf",
        title: "Pharmacovigilance system master file and QPPV arrangements",
        purpose: "PV liability transfers with the product; a gap here delays every closing.",
        workstream: "Quality",
      },
      {
        id: "quality-agreements",
        title: "Quality agreements with manufacturers and testers",
        purpose: "Shows which obligations are contracted out and on what terms.",
        workstream: "Quality",
      },
      {
        id: "inspection-history",
        title: "Inspection history and open deviations",
        purpose: "An unresolved finding is a closing condition, not a footnote.",
        workstream: "Quality",
      },
    ],
  },
  {
    key: "supply",
    label: "Supply & CMC",
    description: "Whether the product can be made, at what cost, and by whom.",
    items: [
      {
        id: "cmc-dossier",
        title: "CMC section of the dossier",
        purpose: "The technical basis of the product; the counterparty's CMC team reads this first.",
        workstream: "Supply",
      },
      {
        id: "supply-agreements",
        title: "API and finished-product supply agreements",
        purpose: "Establishes continuity of supply and whether it survives a change of control.",
        workstream: "Supply",
      },
      {
        id: "cogs-breakdown",
        title: "Landed cost breakdown per presentation",
        purpose: "The counterparty models margin from this; a vague number invites a price cut.",
        workstream: "Supply",
      },
      {
        id: "serialisation",
        title: "Serialisation and traceability set-up",
        purpose: "A market-access blocker in most territories if it is not already in place.",
        workstream: "Supply",
      },
    ],
  },
  {
    key: "commercial",
    label: "Commercial & access",
    description: "What the product actually earns, and on what terms it is reimbursed.",
    items: [
      {
        id: "sales-history",
        title: "Volume and net-sales history by market and channel",
        purpose: "The single most-scrutinised file in any off-patent deal.",
        workstream: "Commercial",
      },
      {
        id: "gross-to-net",
        title: "Gross-to-net bridge including rebates and clawbacks",
        purpose: "Headline price means nothing without the deductions behind it.",
        workstream: "Commercial",
      },
      {
        id: "reimbursement-status",
        title: "Reimbursement and formulary status per market",
        purpose: "Determines whether the revenue in the model is actually addressable.",
        workstream: "Pricing",
      },
      {
        id: "tender-history",
        title: "Tender participation and award history",
        purpose: "In tender-driven markets this is the demand picture.",
        workstream: "Commercial",
        routes: ["tender_agent", "distribution_agreement", "own_ma_own_distribution"],
      },
      {
        id: "distributor-contracts",
        title: "Distributor and wholesaler contracts",
        purpose: "Shows the channel that comes with the asset, and its termination terms.",
        workstream: "Channel",
        routes: ["distribution_agreement", "out_license_ma", "asset_sale", "own_ma_own_distribution"],
      },
    ],
  },
  {
    key: "legal",
    label: "Legal & IP",
    description: "What is owned, what is licensed, and what is disputed.",
    items: [
      {
        id: "trademarks",
        title: "Trademark register and brand ownership per market",
        purpose: "Brand rights are frequently held separately from the authorisation.",
        workstream: "Legal",
      },
      {
        id: "residual-ip",
        title: "Residual patent, SPC and data-exclusivity position",
        purpose: "Even off-patent assets carry formulation or process rights worth pricing.",
        workstream: "Legal",
      },
      {
        id: "litigation",
        title: "Litigation, product liability and recall history",
        purpose: "The counterparty prices unknown liability far above known liability.",
        workstream: "Legal",
      },
    ],
  },
];

// ── Innovative: the counterparty is diligencing a development programme ──────

export const INNOVATIVE_DATA_ROOM: DataRoomSectionDef[] = [
  {
    key: "science",
    label: "Science & data package",
    description: "The evidence the asset works, assembled the way a reviewer reads it.",
    items: [
      {
        id: "nonclinical",
        title: "Non-clinical pharmacology and toxicology package",
        purpose: "Establishes the safety basis for every study the counterparty would run next.",
        workstream: "Data room",
      },
      {
        id: "clinical-data",
        title: "Clinical study reports and underlying datasets",
        purpose: "Headline results are not diligence; the counterparty re-analyses the data.",
        workstream: "Data room",
      },
      {
        id: "target-validation",
        title: "Target validation dossier including human genetic evidence",
        purpose: "The difference between a mechanism story and a de-risked programme.",
        workstream: "Data room",
      },
      {
        id: "biomarker",
        title: "Biomarker and patient-selection strategy",
        purpose: "Determines trial size and therefore the cost of everything that follows.",
        workstream: "Data room",
      },
    ],
  },
  {
    key: "regulatory",
    label: "Regulatory",
    description: "Where the programme stands with the authorities.",
    items: [
      {
        id: "agency-minutes",
        title: "Agency meeting minutes and written advice",
        purpose: "What the regulator has actually agreed to, as opposed to what was hoped for.",
        workstream: "Regulatory",
      },
      {
        id: "ind-cta",
        title: "IND / CTA filings and their current status",
        purpose: "Confirms the programme is open and in good standing.",
        workstream: "Regulatory",
      },
      {
        id: "designations",
        title: "Designations held or applied for",
        purpose: "Orphan, expedited and paediatric status change both timeline and exclusivity.",
        workstream: "Regulatory",
      },
      {
        id: "reg-strategy",
        title: "Registration strategy and proposed pivotal design",
        purpose: "The plan the counterparty is being asked to fund or inherit.",
        workstream: "Regulatory",
      },
    ],
  },
  {
    key: "cmc",
    label: "CMC & manufacturing",
    description: "Whether the asset can be made at the scale the plan assumes.",
    items: [
      {
        id: "cmc-package",
        title: "Drug substance and drug product CMC package",
        purpose: "Modality-specific manufacturability is where valuations most often break.",
        workstream: "CMC",
      },
      {
        id: "comparability",
        title: "Comparability strategy across process changes",
        purpose: "A process change without a comparability plan can invalidate prior clinical data.",
        workstream: "CMC",
      },
      {
        id: "cdmo-contracts",
        title: "CDMO contracts, capacity commitments and tech-transfer status",
        purpose: "Establishes whether supply can follow the deal, and at what notice.",
        workstream: "CMC",
      },
    ],
  },
  {
    key: "ip",
    label: "IP & freedom to operate",
    description: "What is owned and whether it can be practised.",
    items: [
      {
        id: "patent-family",
        title: "Patent family, prosecution history and term projections",
        purpose: "Exclusivity runway is the backbone of every valuation of a novel asset.",
        workstream: "IP",
      },
      {
        id: "fto-opinion",
        title: "Freedom-to-operate analysis and third-party blocking claims",
        purpose: "A dominant third-party claim is a deal-level risk, not a legal detail.",
        workstream: "IP",
      },
      {
        id: "inbound-licences",
        title: "In-licences, platform rights and royalty stack",
        purpose: "The counterparty needs the net economics, not the gross ones.",
        workstream: "IP",
      },
      {
        id: "inventorship",
        title: "Inventorship, assignment and institutional rights chain",
        purpose: "A gap in the chain of title stops a transaction outright.",
        workstream: "IP",
      },
    ],
  },
  {
    key: "corporate",
    label: "Corporate & transaction",
    description: "The mechanics of the transaction itself.",
    items: [
      {
        id: "cap-table",
        title: "Capitalisation table and shareholder consents",
        purpose: "Determines who has to approve the deal and what they are owed.",
        workstream: "Transaction",
        routes: ["newco_spinout", "outright_sale", "non_dilutive_funded"],
      },
      {
        id: "spend-history",
        title: "Programme spend to date and committed forward spend",
        purpose: "Anchors the value conversation in what the asset has actually consumed.",
        workstream: "Transaction",
      },
      {
        id: "material-contracts",
        title: "Material contracts and change-of-control provisions",
        purpose: "A change-of-control clause can transfer or destroy the thing being bought.",
        workstream: "Transaction",
      },
      {
        id: "grant-obligations",
        title: "Grant and non-dilutive funding obligations",
        purpose: "Public funding usually carries strings that survive the transaction.",
        workstream: "Transaction",
        routes: ["non_dilutive_funded", "newco_spinout"],
      },
      {
        id: "term-sheet",
        title: "Draft term sheet and transaction structure paper",
        purpose: "The proposal the counterparty negotiates against.",
        workstream: "Negotiation",
      },
    ],
  },
];

export function dataRoomFor(branch: "off_patent" | "innovative"): DataRoomSectionDef[] {
  return branch === "innovative" ? INNOVATIVE_DATA_ROOM : OFF_PATENT_DATA_ROOM;
}
