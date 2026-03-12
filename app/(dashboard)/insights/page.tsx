"use client";

import { useState, useMemo } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useDeals } from "@/hooks/use-data";
import { THERAPEUTIC_AREAS, DEAL_TYPE_LABELS } from "@/lib/constants";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
  ReferenceLine,
} from "recharts";
import {
  Lightbulb,
  TrendingUp,
  DollarSign,
  Scale,
  CheckCircle2,
  AlertTriangle,
  Calculator,
  Target,
  Layers,
  Sparkles,
  ArrowUpRight,
  ArrowDownRight,
  Shield,
  Zap,
  PieChart as PieChartIcon,
  BarChart3,
  Shuffle,
  Handshake,
} from "lucide-react";

// ─── Shared helpers ───────────────────────────────────────────────────

function formatCurrency(value: number | null | undefined) {
  if (value == null) return "\u2014";
  if (value >= 1000) return `$${(value / 1000).toFixed(1)}B`;
  return `$${value.toFixed(0)}M`;
}

function median(arr: number[]) {
  if (!arr.length) return 0;
  const s = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 !== 0 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

function percentile(arr: number[], p: number) {
  if (!arr.length) return 0;
  const s = [...arr].sort((a, b) => a - b);
  const idx = (p / 100) * (s.length - 1);
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  return lo === hi ? s[lo] : s[lo] + (s[hi] - s[lo]) * (idx - lo);
}

const TOOLTIP_STYLE = {
  backgroundColor: "#FFFFFF",
  border: "1px solid #E5E7EB",
  borderRadius: "8px",
  fontSize: "12px",
  color: "#1A1A2E",
};

const CHART_COLORS = ["#F97316", "#10B981", "#8B5CF6", "#F59E0B", "#EC4899", "#06B6D4"];

const SLIDER_CLASS =
  "w-full h-2 bg-gray-200 rounded-full appearance-none cursor-pointer " +
  "[&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 " +
  "[&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:bg-[#F97316] " +
  "[&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:cursor-pointer " +
  "[&::-webkit-slider-thumb]:shadow-md";

// ─── Deal Type Profiles ───────────────────────────────────────────────

const DEAL_TYPE_PROFILES = [
  {
    type: "OUT_LICENSE",
    label: "Out-License",
    description: "Licensor grants rights to a partner for development and commercialization in defined territories. Retains IP ownership.",
    pros: [
      "Retains asset ownership & IP",
      "Upfront cash + ongoing royalties",
      "Partner bears development risk & cost",
      "Can retain rights in select territories",
    ],
    cons: [
      "Loss of control over development strategy",
      "Lower total economics if drug succeeds",
      "Partner may shelve the asset",
      "Royalty rates negotiated down at late stages",
    ],
    riskLevel: "Low" as const,
    riskScore: 2,
    optimalWhen: [
      "Early-stage biotech with limited commercial infrastructure",
      "Need to derisk balance sheet while retaining upside",
      "Asset fits partner's therapeutic focus",
      "Want to monetize non-core assets",
    ],
    typicalUpfrontPct: 15,
    typicalRoyaltyRange: [8, 20] as [number, number],
    color: "#F97316",
  },
  {
    type: "COLLABORATION",
    label: "Co-Development",
    description: "Both parties share development costs, risks, and rewards. Typically split by territory or function.",
    pros: [
      "Shared risk reduces financial exposure",
      "Access to partner's expertise & infrastructure",
      "Higher economics if drug succeeds (profit split)",
      "Stronger alignment of incentives",
    ],
    cons: [
      "Complex governance & decision-making",
      "Must fund your share of development costs",
      "IP ownership disputes possible",
      "Slower decision-making with joint committees",
    ],
    riskLevel: "Medium" as const,
    riskScore: 3,
    optimalWhen: [
      "Both parties have complementary capabilities",
      "Complex indications needing combined expertise",
      "Well-capitalized biotech wanting to share risk",
      "Platform deals with multiple assets",
    ],
    typicalUpfrontPct: 20,
    typicalRoyaltyRange: [10, 26] as [number, number],
    color: "#10B981",
  },
  {
    type: "OPTION",
    label: "Option Agreement",
    description: "Partner pays option fee for the right (not obligation) to license the asset after a data readout or milestone.",
    pros: [
      "Premium pricing post positive data",
      "Smaller upfront commitment from partner",
      "Flexibility to walk away if data disappoints",
      "Multiple option windows possible",
    ],
    cons: [
      "Lower guaranteed economics",
      "Partner may not exercise the option",
      "Development cost borne by licensor until exercise",
      "Valuation uncertainty during option period",
    ],
    riskLevel: "Medium-High" as const,
    riskScore: 3.5,
    optimalWhen: [
      "Upcoming catalyst (data readout, regulatory decision)",
      "Asset warrants premium post-data pricing",
      "Licensor can self-fund near-term development",
      "Want to preserve negotiating leverage",
    ],
    typicalUpfrontPct: 7,
    typicalRoyaltyRange: [5, 16] as [number, number],
    color: "#F59E0B",
  },
  {
    type: "M_AND_A",
    label: "M&A / Acquisition",
    description: "Full acquisition of the company or asset. Buyer gains complete control of development, IP, and commercialization.",
    pros: [
      "Maximum value capture for seller",
      "Clean exit with certainty of payment",
      "No ongoing governance complexity",
      "Earnouts can bridge valuation gaps",
    ],
    cons: [
      "Seller loses all future upside",
      "Integration risk for buyer",
      "Regulatory approval risk (antitrust)",
      "Premium paid upfront increases buyer risk",
    ],
    riskLevel: "High" as const,
    riskScore: 4,
    optimalWhen: [
      "Validated asset at Phase 2+ with strong data",
      "Strategic fit with buyer's pipeline",
      "Seller lacks resources for late-stage development",
      "Multiple bidders create competitive tension",
    ],
    typicalUpfrontPct: 75,
    typicalRoyaltyRange: [0, 0] as [number, number],
    color: "#8B5CF6",
  },
  {
    type: "IN_LICENSE",
    label: "In-License",
    description: "Acquire rights to an external asset to strengthen your pipeline. Mirror of out-license from the other side.",
    pros: [
      "Fills pipeline gaps without internal R&D",
      "De-risked if in-licensing later-stage assets",
      "Maintain control of development strategy",
      "Diversifies therapeutic portfolio",
    ],
    cons: [
      "Upfront capital required",
      "Ongoing milestone & royalty obligations",
      "Dependent on licensor for supply/IP support",
      "Competition for attractive assets drives up price",
    ],
    riskLevel: "Medium" as const,
    riskScore: 3,
    optimalWhen: [
      "Pipeline gaps in strategic therapeutic areas",
      "Capacity to fund and manage additional programs",
      "Commercial infrastructure ready for new assets",
      "Competitive advantage in specific indications",
    ],
    typicalUpfrontPct: 15,
    typicalRoyaltyRange: [8, 20] as [number, number],
    color: "#06B6D4",
  },
];

const RISK_COLORS: Record<string, string> = {
  Low: "bg-green-50 text-green-600 border-green-200",
  Medium: "bg-amber-50 text-amber-600 border-amber-200",
  "Medium-High": "bg-orange-50 text-orange-600 border-orange-200",
  High: "bg-red-50 text-red-600 border-red-200",
};

// ─── Clinical Success Rates ───────────────────────────────────────────

interface PhaseRates {
  PRECLINICAL_TO_PHASE1: number;
  PHASE1_TO_PHASE2: number;
  PHASE2_TO_PHASE3: number;
  PHASE3_TO_APPROVAL: number;
}

const CLINICAL_SUCCESS_RATES: Record<string, PhaseRates> = {
  all: { PRECLINICAL_TO_PHASE1: 0.65, PHASE1_TO_PHASE2: 0.52, PHASE2_TO_PHASE3: 0.29, PHASE3_TO_APPROVAL: 0.58 },
  Oncology: { PRECLINICAL_TO_PHASE1: 0.60, PHASE1_TO_PHASE2: 0.45, PHASE2_TO_PHASE3: 0.24, PHASE3_TO_APPROVAL: 0.50 },
  Immunology: { PRECLINICAL_TO_PHASE1: 0.62, PHASE1_TO_PHASE2: 0.55, PHASE2_TO_PHASE3: 0.32, PHASE3_TO_APPROVAL: 0.63 },
  "Rare Disease": { PRECLINICAL_TO_PHASE1: 0.68, PHASE1_TO_PHASE2: 0.65, PHASE2_TO_PHASE3: 0.38, PHASE3_TO_APPROVAL: 0.68 },
  Neurology: { PRECLINICAL_TO_PHASE1: 0.60, PHASE1_TO_PHASE2: 0.48, PHASE2_TO_PHASE3: 0.25, PHASE3_TO_APPROVAL: 0.52 },
  "Metabolic / Endocrinology": { PRECLINICAL_TO_PHASE1: 0.64, PHASE1_TO_PHASE2: 0.56, PHASE2_TO_PHASE3: 0.34, PHASE3_TO_APPROVAL: 0.64 },
  Cardiovascular: { PRECLINICAL_TO_PHASE1: 0.63, PHASE1_TO_PHASE2: 0.50, PHASE2_TO_PHASE3: 0.30, PHASE3_TO_APPROVAL: 0.57 },
  "Infectious Disease": { PRECLINICAL_TO_PHASE1: 0.66, PHASE1_TO_PHASE2: 0.58, PHASE2_TO_PHASE3: 0.36, PHASE3_TO_APPROVAL: 0.65 },
};

const MILESTONE_SCHEDULE = [
  { phase: "IND Filing", yearsFromStart: 1, defaultPayment: 10 },
  { phase: "Phase 1 Start", yearsFromStart: 1.5, defaultPayment: 15 },
  { phase: "Phase 1 Data", yearsFromStart: 2.5, defaultPayment: 25 },
  { phase: "Phase 2 Start", yearsFromStart: 3, defaultPayment: 40 },
  { phase: "Phase 2 Data", yearsFromStart: 4.5, defaultPayment: 75 },
  { phase: "Phase 3 Start", yearsFromStart: 5, defaultPayment: 100 },
  { phase: "NDA/BLA Filing", yearsFromStart: 7, defaultPayment: 125 },
  { phase: "First Approval", yearsFromStart: 8, defaultPayment: 200 },
];

// ─── Value Maximization Insights ──────────────────────────────────────

const VALUE_INSIGHTS = [
  {
    category: "Creative Structures",
    color: "#3B82F6",
    icon: Shuffle,
    items: [
      { title: "Step-Down Royalties", desc: "Start with higher royalties (e.g., 18%) that decrease after patent expiry or generic entry (e.g., to 8%). Captures premium value during exclusivity." },
      { title: "Option-to-Buy Clause", desc: "Licensor retains right to repurchase the asset at a pre-agreed multiple (e.g., 3x upfront) if partner underperforms. Prevents shelving." },
      { title: "Tiered Royalties", desc: "Escalating royalties based on sales thresholds (e.g., 12% on first $500M, 16% on $500M-$1B, 20% above $1B). Aligns incentives with blockbuster potential." },
      { title: "Equity Kicker", desc: "Include an equity investment component (e.g., $50M at a premium) alongside the license. Deepens partnership commitment and alignment." },
    ],
  },
  {
    category: "Pie Expansion",
    color: "#10B981",
    icon: TrendingUp,
    items: [
      { title: "Indication Expansion Milestones", desc: "Add $50-100M milestones for each new indication approved beyond the initial one. Incentivizes partner to pursue broader label." },
      { title: "Geographic Expansion Triggers", desc: "Additional milestones when entering new major markets (EU, Japan, China). Expands total addressable value beyond initial territory." },
      { title: "Platform Extension Bonuses", desc: "If licensing a platform, include payments for each additional target nominated. Rewards portfolio breadth without renegotiation." },
      { title: "Co-Investment in Manufacturing", desc: "Joint investment in dedicated manufacturing capacity reduces COGS, improving margins for both parties and increasing commercial viability." },
    ],
  },
  {
    category: "Risk Sharing",
    color: "#F59E0B",
    icon: Shield,
    items: [
      { title: "Contingent Value Rights (CVRs)", desc: "Tie a portion of payments to specific outcomes (e.g., $200M if Phase 3 primary endpoint met). Bridges valuation gaps while sharing risk." },
      { title: "Revenue-Based Milestones", desc: "Replace fixed commercial milestones with revenue triggers (e.g., $100M at $500M annual sales). Aligns payments with actual commercial success." },
      { title: "Cost-Sharing with Proportional Upside", desc: "Split development costs 50/50 but share profits proportionally. Both parties have skin in the game with balanced economics." },
      { title: "Anti-Dilution Protections", desc: "In equity components, include weighted-average anti-dilution to protect licensor's stake. Preserves alignment through future financings." },
    ],
  },
  {
    category: "Value Levers by Deal Type",
    color: "#8B5CF6",
    icon: Zap,
    items: [
      { title: "Out-License: Maximize Royalty Floor", desc: "Negotiate minimum royalty floors (e.g., $25M/year after first commercial sale) to guarantee ongoing income regardless of partner's commercial effort." },
      { title: "Co-Dev: Optimize Cost Split", desc: "Negotiate development cost shares that evolve with stage (e.g., 30/70 in Phase 2, shifting to 50/50 in Phase 3). Manages cash burn." },
      { title: "Option: Exercise Premium Escalation", desc: "Option exercise price should escalate with each positive data readout (e.g., +$100M per phase advancement). Captures value of de-risking." },
      { title: "M&A: Structured Earnouts", desc: "Tie 20-30% of total consideration to achievable milestones. Bridges valuation gaps while ensuring seller captures upside on success." },
    ],
  },
];

// ─── Main Component ───────────────────────────────────────────────────

export default function InsightsPage() {
  const { deals } = useDeals();

  // Milestone calculator state
  const [milestoneTA, setMilestoneTA] = useState("all");
  const [milestoneDiscount, setMilestoneDiscount] = useState(10);

  // NPV calculator state
  const [discountRate, setDiscountRate] = useState(12);
  const [peakSales, setPeakSales] = useState(2000);
  const [royaltyRate, setRoyaltyRate] = useState(15);
  const [patentLife, setPatentLife] = useState(12);
  const [revenueRamp, setRevenueRamp] = useState(4);
  const [probApproval, setProbApproval] = useState(15);

  // Deal simulator state
  const [simUpfront, setSimUpfront] = useState(300);
  const [simDevMS, setSimDevMS] = useState(800);
  const [simComMS, setSimComMS] = useState(1200);
  const [simRoyaltyLow, setSimRoyaltyLow] = useState(10);
  const [simRoyaltyHigh, setSimRoyaltyHigh] = useState(18);
  const [simExclusive, setSimExclusive] = useState(true);
  const [simCoDev, setSimCoDev] = useState(false);
  const [simCoPromote, setSimCoPromote] = useState(false);

  // Value decomposition state
  const [decompDealId, setDecompDealId] = useState("");

  // ─── Computed: Deal Type Stats ────────────────────────────────────

  const dealTypeStats = useMemo(() => {
    const stats: Record<string, { count: number; upfronts: number[]; totals: number[]; royaltyLows: number[]; royaltyHighs: number[] }> = {};
    for (const d of deals) {
      const t = d.dealType;
      if (!stats[t]) stats[t] = { count: 0, upfronts: [], totals: [], royaltyLows: [], royaltyHighs: [] };
      stats[t].count++;
      if (d.upfrontPayment != null) stats[t].upfronts.push(d.upfrontPayment);
      if (d.totalDealValue != null) stats[t].totals.push(d.totalDealValue);
      if (d.royaltyRangeLow != null) stats[t].royaltyLows.push(d.royaltyRangeLow);
      if (d.royaltyRangeHigh != null) stats[t].royaltyHighs.push(d.royaltyRangeHigh);
    }
    return stats;
  }, [deals]);

  const dealTypeChartData = useMemo(() => {
    return DEAL_TYPE_PROFILES.map((p) => {
      const s = dealTypeStats[p.type];
      return {
        name: p.label,
        Upfront: s ? median(s.upfronts) : 0,
        Milestones: s ? median(s.totals) - median(s.upfronts) : 0,
        color: p.color,
      };
    });
  }, [dealTypeStats]);

  // ─── Computed: Milestone Calculator ───────────────────────────────

  const milestoneData = useMemo(() => {
    const rates = CLINICAL_SUCCESS_RATES[milestoneTA] ?? CLINICAL_SUCCESS_RATES.all;
    const transitions = [
      rates.PRECLINICAL_TO_PHASE1,
      rates.PHASE1_TO_PHASE2,
      rates.PHASE2_TO_PHASE3,
      rates.PHASE3_TO_APPROVAL,
    ];

    // Map milestones to phases: 0-1=preclinical→Ph1, 2-3=Ph1→Ph2, 4-5=Ph2→Ph3, 6-7=Ph3→Approval
    const phaseMapping = [0, 0, 1, 1, 2, 2, 3, 3];

    let cumProb = 1;
    return MILESTONE_SCHEDULE.map((m, i) => {
      const phaseIdx = phaseMapping[i];
      // Apply transition probability when entering a new phase group
      if (i === 0 || phaseMapping[i] !== phaseMapping[i - 1]) {
        cumProb *= transitions[phaseIdx];
      }
      const ev = m.defaultPayment * cumProb;
      const pv = ev / Math.pow(1 + milestoneDiscount / 100, m.yearsFromStart);
      return {
        ...m,
        cumProb,
        expectedValue: ev,
        presentValue: pv,
      };
    });
  }, [milestoneTA, milestoneDiscount]);

  const milestoneChartData = milestoneData.map((m) => ({
    name: m.phase.replace("Phase ", "Ph "),
    Nominal: m.defaultPayment,
    "Expected Value": Math.round(m.expectedValue * 10) / 10,
  }));

  const totalNominal = MILESTONE_SCHEDULE.reduce((s, m) => s + m.defaultPayment, 0);
  const totalExpected = milestoneData.reduce((s, m) => s + m.expectedValue, 0);
  const totalPV = milestoneData.reduce((s, m) => s + m.presentValue, 0);

  // ─── Computed: Value Decomposition ────────────────────────────────

  const decompData = useMemo(() => {
    const deal = deals.find((d) => d.id === decompDealId);
    const up = deal?.upfrontPayment ?? 300;
    const dev = deal?.developmentMilestones ?? 500;
    const com = deal?.commercialMilestones ?? 800;
    const total = deal?.totalDealValue ?? up + dev + com;
    const royaltyEst = Math.max(0, total - up - dev - com);

    const components = [
      { name: "Upfront", value: up, color: "#F97316" },
      { name: "Dev Milestones", value: dev, color: "#10B981" },
      { name: "Com Milestones", value: com, color: "#3B82F6" },
      { name: "Royalty/Other", value: royaltyEst, color: "#8B5CF6" },
    ].filter((c) => c.value > 0);

    // Waterfall data
    let running = 0;
    const waterfall = components.map((c) => {
      const item = { name: c.name, base: running, value: c.value, color: c.color };
      running += c.value;
      return item;
    });
    waterfall.push({ name: "Total", base: 0, value: running, color: "#1A1A2E" });

    return { components, waterfall, total: running };
  }, [decompDealId, deals]);

  // ─── Computed: NPV Calculator ─────────────────────────────────────

  const npvData = useMemo(() => {
    const years: { year: number; revenue: number; royalty: number; pv: number }[] = [];
    let totalPV = 0;
    for (let t = 1; t <= patentLife; t++) {
      const revenue = peakSales * Math.min(1, t / revenueRamp);
      const royalty = revenue * (royaltyRate / 100);
      const pv = royalty / Math.pow(1 + discountRate / 100, t);
      totalPV += pv;
      years.push({ year: t, revenue: Math.round(revenue), royalty: Math.round(royalty), pv: Math.round(pv) });
    }
    const royaltyNPV = Math.round(totalPV);
    const rNPV = Math.round(totalPV * (probApproval / 100));

    // Sensitivity table
    const sensRates = [8, 10, 12, 15];
    const sensSales = [1000, 2000, 3000, 5000];
    const sensitivity = sensRates.map((r) => {
      const row: Record<string, number | string> = { wacc: `${r}%` };
      for (const s of sensSales) {
        let npv = 0;
        for (let t = 1; t <= patentLife; t++) {
          const rev = s * Math.min(1, t / revenueRamp);
          npv += (rev * (royaltyRate / 100)) / Math.pow(1 + r / 100, t);
        }
        row[`$${s >= 1000 ? `${s / 1000}B` : `${s}M`}`] = Math.round(npv * (probApproval / 100));
      }
      return row;
    });

    return { years, royaltyNPV, rNPV, sensitivity, sensRates, sensSales };
  }, [discountRate, peakSales, royaltyRate, patentLife, revenueRamp, probApproval]);

  // ─── Computed: Deal Simulator ─────────────────────────────────────

  const simBenchmarks = useMemo(() => {
    const upfronts = deals.filter((d) => d.upfrontPayment != null).map((d) => d.upfrontPayment!).sort((a, b) => a - b);
    const totals = deals.filter((d) => d.totalDealValue != null).map((d) => d.totalDealValue!).sort((a, b) => a - b);
    const rLows = deals.filter((d) => d.royaltyRangeLow != null).map((d) => d.royaltyRangeLow!).sort((a, b) => a - b);
    const rHighs = deals.filter((d) => d.royaltyRangeHigh != null).map((d) => d.royaltyRangeHigh!).sort((a, b) => a - b);
    return {
      upfront: { p25: percentile(upfronts, 25), med: median(upfronts), p75: percentile(upfronts, 75), min: upfronts[0] ?? 0, max: upfronts[upfronts.length - 1] ?? 0 },
      total: { p25: percentile(totals, 25), med: median(totals), p75: percentile(totals, 75) },
      royaltyLow: { p25: percentile(rLows, 25), med: median(rLows), p75: percentile(rLows, 75) },
      royaltyHigh: { p25: percentile(rHighs, 25), med: median(rHighs), p75: percentile(rHighs, 75) },
    };
  }, [deals]);

  const simTotalValue = simUpfront + simDevMS + simComMS;
  const estimatedProductNPV = peakSales * patentLife * 0.4; // Simplified product NPV
  const licensorValue = simTotalValue;
  const licenseeValue = Math.max(0, estimatedProductNPV - licensorValue);
  const totalPie = licensorValue + licenseeValue;
  const licensorPct = totalPie > 0 ? Math.round((licensorValue / totalPie) * 100) : 50;
  const licenseePct = 100 - licensorPct;
  const isWinWin = licensorPct >= 25 && licenseePct >= 25;

  const valuePieData = [
    { name: "Licensor", value: licensorValue, color: "#F97316" },
    { name: "Licensee", value: licenseeValue, color: "#10B981" },
  ];

  const scenarios = [
    { name: "Conservative", mult: 0.75, upfront: Math.round(simUpfront * 0.75), dev: Math.round(simDevMS * 0.6), com: Math.round(simComMS * 0.6), rLow: Math.round(simRoyaltyLow * 0.85), rHigh: Math.round(simRoyaltyHigh * 0.85) },
    { name: "Base", mult: 1, upfront: simUpfront, dev: simDevMS, com: simComMS, rLow: simRoyaltyLow, rHigh: simRoyaltyHigh },
    { name: "Aggressive", mult: 1.3, upfront: Math.round(simUpfront * 1.3), dev: Math.round(simDevMS * 1.4), com: Math.round(simComMS * 1.4), rLow: Math.round(simRoyaltyLow * 1.15), rHigh: Math.round(simRoyaltyHigh * 1.15) },
  ];

  // ─── Dynamic Takeaways ────────────────────────────────────────────

  const takeaways = useMemo(() => {
    const tips: string[] = [];
    if (simRoyaltyLow < (simBenchmarks.royaltyLow.med || 10))
      tips.push(`Your royalty floor of ${simRoyaltyLow}% is below the market median of ${simBenchmarks.royaltyLow.med.toFixed(0)}%. Consider step-down royalties starting at a higher base.`);
    if (simUpfront < (simBenchmarks.upfront.p25 || 100))
      tips.push(`Your upfront of ${formatCurrency(simUpfront)} is in the bottom quartile. Consider adding an option-to-buy clause or equity kicker to compensate.`);
    if (simUpfront > (simBenchmarks.upfront.p75 || 500))
      tips.push(`Your upfront of ${formatCurrency(simUpfront)} is in the top quartile. You have strong leverage \u2014 use it to negotiate favorable co-dev or co-promote rights.`);
    if (!simCoDev && !simCoPromote)
      tips.push("Consider adding co-development or co-promote rights to retain upside participation beyond royalties.");
    if (licensorPct > 65)
      tips.push("The value split is heavily tilted toward the licensor. Consider adding value-enhancing terms for the licensee (broader territory, longer exclusivity) to ensure deal closure.");
    if (licensorPct < 30)
      tips.push("The value split favors the licensee. Negotiate higher royalties, indication expansion milestones, or CVRs to capture more value.");
    if (tips.length === 0)
      tips.push("Your deal terms are well-balanced against market precedents. Focus on creative structures (tiered royalties, indication expansion milestones) to expand total deal value.");
    return tips;
  }, [simUpfront, simDevMS, simRoyaltyLow, simCoDev, simCoPromote, licensorPct, simBenchmarks]);

  // ─── Render ───────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#1A1A2E]">Deal Structure Insights</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Financial modeling, NPV analysis, and negotiation simulation tools
          </p>
        </div>
        <Badge variant="outline" className="text-xs h-7 gap-1.5 font-normal">
          <Calculator className="h-3 w-3 text-[#F97316]" />
          {deals.length} precedent deals
        </Badge>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="types" className="space-y-4">
        <TabsList className="bg-white border border-border/40 shadow-sm h-10 p-1">
          <TabsTrigger value="types" className="text-xs data-[state=active]:bg-[#F97316]/10 data-[state=active]:text-[#F97316]">Deal Types</TabsTrigger>
          <TabsTrigger value="milestones" className="text-xs data-[state=active]:bg-[#F97316]/10 data-[state=active]:text-[#F97316]">Milestone Calculator</TabsTrigger>
          <TabsTrigger value="decomposition" className="text-xs data-[state=active]:bg-[#F97316]/10 data-[state=active]:text-[#F97316]">Value Decomposition</TabsTrigger>
          <TabsTrigger value="npv" className="text-xs data-[state=active]:bg-[#F97316]/10 data-[state=active]:text-[#F97316]">NPV Calculator</TabsTrigger>
          <TabsTrigger value="simulator" className="text-xs data-[state=active]:bg-[#F97316]/10 data-[state=active]:text-[#F97316]">Deal Simulator</TabsTrigger>
          <TabsTrigger value="maximize" className="text-xs data-[state=active]:bg-[#F97316]/10 data-[state=active]:text-[#F97316]">Value Maximization</TabsTrigger>
        </TabsList>

        {/* ═══════ TAB 1: Deal Types ═══════ */}
        <TabsContent value="types" className="space-y-6">
          <div className="grid gap-4 lg:grid-cols-3">
            {DEAL_TYPE_PROFILES.slice(0, 3).map((p) => (
              <DealTypeCard key={p.type} profile={p} stats={dealTypeStats[p.type]} />
            ))}
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            {DEAL_TYPE_PROFILES.slice(3).map((p) => (
              <DealTypeCard key={p.type} profile={p} stats={dealTypeStats[p.type]} />
            ))}
          </div>

          {/* Comparison chart */}
          <Card className="border-border/40 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">Deal Economics Comparison</CardTitle>
              <p className="text-xs text-muted-foreground">Median upfront and milestone values by deal type from {deals.length} precedent deals</p>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={dealTypeChartData} barGap={4}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#6B7280" }} />
                  <YAxis tick={{ fontSize: 11, fill: "#6B7280" }} tickFormatter={(v) => `$${v >= 1000 ? `${v / 1000}B` : `${v}M`}`} />
                  <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v: number) => formatCurrency(v)} />
                  <Legend wrapperStyle={{ fontSize: "11px" }} />
                  <Bar dataKey="Upfront" fill="#F97316" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Milestones" fill="#10B981" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ═══════ TAB 2: Milestone Calculator ═══════ */}
        <TabsContent value="milestones" className="space-y-6">
          {/* Controls */}
          <div className="flex flex-wrap items-center gap-4">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-1">Therapeutic Area</p>
              <Select value={milestoneTA} onValueChange={setMilestoneTA}>
                <SelectTrigger className="w-[200px] h-9 border-border/40 bg-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Indications</SelectItem>
                  {Object.keys(CLINICAL_SUCCESS_RATES).filter((k) => k !== "all").map((k) => (
                    <SelectItem key={k} value={k}>{k}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-1">Discount Rate</p>
              <div className="flex items-center gap-2">
                <input type="range" min={6} max={18} step={1} value={milestoneDiscount} onChange={(e) => setMilestoneDiscount(Number(e.target.value))} className={SLIDER_CLASS + " w-32"} />
                <span className="text-sm font-mono font-semibold w-10">{milestoneDiscount}%</span>
              </div>
            </div>
          </div>

          {/* Summary cards */}
          <div className="grid gap-4 sm:grid-cols-3">
            <StatCard label="Total Nominal" value={formatCurrency(totalNominal)} sub="Sum of all milestones" color="#3B82F6" icon={<DollarSign className="h-4 w-4" />} />
            <StatCard label="Probability-Weighted" value={formatCurrency(Math.round(totalExpected))} sub={`Based on ${milestoneTA === "all" ? "all TA" : milestoneTA} rates`} color="#F97316" icon={<Target className="h-4 w-4" />} />
            <StatCard label="Risk-Adjusted NPV" value={formatCurrency(Math.round(totalPV))} sub={`At ${milestoneDiscount}% discount rate`} color="#10B981" icon={<Calculator className="h-4 w-4" />} />
          </div>

          {/* Milestone table */}
          <Card className="border-border/40 shadow-sm overflow-hidden">
            <CardContent className="p-0">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-[#F8F9FA]">
                    <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Milestone</th>
                    <th className="px-4 py-3 text-right text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Year</th>
                    <th className="px-4 py-3 text-right text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Payment</th>
                    <th className="px-4 py-3 text-right text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Cum. P(Success)</th>
                    <th className="px-4 py-3 text-right text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Expected Value</th>
                    <th className="px-4 py-3 text-right text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Present Value</th>
                  </tr>
                </thead>
                <tbody>
                  {milestoneData.map((m, i) => (
                    <tr key={m.phase} className={i % 2 === 0 ? "" : "bg-[#FAFAFA]"}>
                      <td className="px-4 py-2.5 font-medium text-[13px]">{m.phase}</td>
                      <td className="px-4 py-2.5 text-right font-mono text-[13px]">{m.yearsFromStart}</td>
                      <td className="px-4 py-2.5 text-right font-mono text-[13px] font-semibold">${m.defaultPayment}M</td>
                      <td className="px-4 py-2.5 text-right">
                        <span className={`font-mono text-[13px] font-semibold ${m.cumProb > 0.5 ? "text-[#10B981]" : m.cumProb > 0.2 ? "text-[#F59E0B]" : "text-[#EF4444]"}`}>
                          {(m.cumProb * 100).toFixed(1)}%
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-right font-mono text-[13px]">${m.expectedValue.toFixed(1)}M</td>
                      <td className="px-4 py-2.5 text-right font-mono text-[13px] text-[#F97316] font-semibold">${m.presentValue.toFixed(1)}M</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>

          <p className="text-[10px] text-muted-foreground italic">
            Source: BIO/Informa Clinical Development Success Rates 2011-2020. Individual program outcomes may vary significantly.
          </p>

          {/* Chart */}
          <Card className="border-border/40 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">Nominal vs Expected Milestone Values</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={milestoneChartData} barGap={2}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                  <XAxis dataKey="name" tick={{ fontSize: 10, fill: "#6B7280" }} />
                  <YAxis tick={{ fontSize: 11, fill: "#6B7280" }} tickFormatter={(v) => `$${v}M`} />
                  <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v: number) => `$${v}M`} />
                  <Legend wrapperStyle={{ fontSize: "11px" }} />
                  <Bar dataKey="Nominal" fill="#E5E7EB" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Expected Value" fill="#F97316" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ═══════ TAB 3: Value Decomposition ═══════ */}
        <TabsContent value="decomposition" className="space-y-6">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-1">Select a deal to decompose</p>
            <Select value={decompDealId} onValueChange={setDecompDealId}>
              <SelectTrigger className="w-[400px] h-9 border-border/40 bg-white">
                <SelectValue placeholder="Custom values (or select a deal)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Custom Values</SelectItem>
                {deals.map((d) => (
                  <SelectItem key={d.id} value={d.id}>
                    {d.title} \u2014 {formatCurrency(d.totalDealValue)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-6 lg:grid-cols-5">
            {/* Waterfall chart */}
            <Card className="border-border/40 shadow-sm lg:col-span-3">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold">Deal Value Waterfall</CardTitle>
                <p className="text-xs text-muted-foreground">How the total deal value is constructed</p>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={320}>
                  <BarChart data={decompData.waterfall} barSize={48}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                    <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#6B7280" }} />
                    <YAxis tick={{ fontSize: 11, fill: "#6B7280" }} tickFormatter={(v) => formatCurrency(v)} />
                    <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v: number, name: string) => name === "base" ? null : formatCurrency(v)} />
                    <Bar dataKey="base" stackId="a" fill="transparent" />
                    <Bar dataKey="value" stackId="a" radius={[4, 4, 0, 0]}>
                      {decompData.waterfall.map((entry, i) => (
                        <Cell key={i} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Pie chart */}
            <Card className="border-border/40 shadow-sm lg:col-span-2">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold">Component Breakdown</CardTitle>
                <p className="text-xs text-muted-foreground">Proportion of total deal value</p>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie data={decompData.components} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                      {decompData.components.map((c, i) => (
                        <Cell key={i} fill={c.color} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v: number) => formatCurrency(v)} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="space-y-2 mt-4">
                  {decompData.components.map((c) => (
                    <div key={c.name} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: c.color }} />
                        <span className="text-xs text-muted-foreground">{c.name}</span>
                      </div>
                      <span className="text-xs font-mono font-semibold">{formatCurrency(c.value)}</span>
                    </div>
                  ))}
                  <div className="flex items-center justify-between pt-2 border-t">
                    <span className="text-xs font-semibold">Total</span>
                    <span className="text-sm font-mono font-bold text-[#F97316]">{formatCurrency(decompData.total)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ═══════ TAB 4: NPV Calculator ═══════ */}
        <TabsContent value="npv" className="space-y-6">
          {/* Slider inputs */}
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            <SliderInput label="Discount Rate (WACC)" value={discountRate} min={6} max={20} step={0.5} unit="%" onChange={setDiscountRate} />
            <SliderInput label="Peak Annual Sales" value={peakSales} min={100} max={10000} step={100} unit="M" prefix="$" onChange={setPeakSales} />
            <SliderInput label="Effective Royalty Rate" value={royaltyRate} min={5} max={30} step={1} unit="%" onChange={setRoyaltyRate} />
            <SliderInput label="Patent Life Remaining" value={patentLife} min={5} max={20} step={1} unit=" yrs" onChange={setPatentLife} />
            <SliderInput label="Revenue Ramp Period" value={revenueRamp} min={2} max={8} step={1} unit=" yrs" onChange={setRevenueRamp} />
            <SliderInput label="P(Approval)" value={probApproval} min={5} max={100} step={1} unit="%" onChange={setProbApproval} />
          </div>

          {/* Results */}
          <div className="grid gap-4 sm:grid-cols-3">
            <StatCard label="Royalty Stream NPV" value={formatCurrency(npvData.royaltyNPV)} sub={`Undiscounted total: ${formatCurrency(npvData.years.reduce((s, y) => s + y.royalty, 0))}`} color="#3B82F6" icon={<DollarSign className="h-4 w-4" />} />
            <StatCard label="Risk-Adjusted NPV" value={formatCurrency(npvData.rNPV)} sub={`At ${probApproval}% probability of approval`} color="#F97316" icon={<Target className="h-4 w-4" />} />
            <StatCard label="Peak Royalty Income" value={formatCurrency(Math.round(peakSales * royaltyRate / 100))} sub={`${royaltyRate}% of $${peakSales >= 1000 ? `${(peakSales / 1000).toFixed(1)}B` : `${peakSales}M`} peak sales`} color="#10B981" icon={<TrendingUp className="h-4 w-4" />} />
          </div>

          {/* Royalty stream chart */}
          <Card className="border-border/40 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">Annual Royalty Income Stream</CardTitle>
              <p className="text-xs text-muted-foreground">Projected royalty income over patent life (discounted area shown)</p>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={npvData.years}>
                  <defs>
                    <linearGradient id="royaltyGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#F97316" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#F97316" stopOpacity={0.05} />
                    </linearGradient>
                    <linearGradient id="pvGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10B981" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#10B981" stopOpacity={0.05} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                  <XAxis dataKey="year" tick={{ fontSize: 11, fill: "#6B7280" }} label={{ value: "Year", position: "insideBottom", offset: -5, fontSize: 11, fill: "#6B7280" }} />
                  <YAxis tick={{ fontSize: 11, fill: "#6B7280" }} tickFormatter={(v) => `$${v}M`} />
                  <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v: number, name: string) => [`$${v}M`, name]} />
                  <Legend wrapperStyle={{ fontSize: "11px" }} />
                  <Area type="monotone" dataKey="royalty" name="Nominal Royalty" stroke="#F97316" fill="url(#royaltyGrad)" strokeWidth={2} />
                  <Area type="monotone" dataKey="pv" name="Present Value" stroke="#10B981" fill="url(#pvGrad)" strokeWidth={2} />
                  <ReferenceLine y={peakSales * royaltyRate / 100} stroke="#F97316" strokeDasharray="4 4" label={{ value: "Peak", fill: "#F97316", fontSize: 10 }} />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Sensitivity table */}
          <Card className="border-border/40 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">Sensitivity Analysis</CardTitle>
              <p className="text-xs text-muted-foreground">Risk-adjusted royalty NPV ($M) at different WACC and peak sales assumptions</p>
            </CardHeader>
            <CardContent>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-[#F8F9FA]">
                    <th className="px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">WACC</th>
                    {npvData.sensSales.map((s) => (
                      <th key={s} className="px-4 py-2.5 text-right text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                        {s >= 1000 ? `$${s / 1000}B` : `$${s}M`} Peak
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {npvData.sensitivity.map((row, i) => (
                    <tr key={i} className={i % 2 === 0 ? "" : "bg-[#FAFAFA]"}>
                      <td className="px-4 py-2 font-medium text-[13px]">{row.wacc}</td>
                      {npvData.sensSales.map((s) => {
                        const key = `$${s >= 1000 ? `${s / 1000}B` : `${s}M`}`;
                        const val = row[key] as number;
                        const isActive = Number(String(row.wacc).replace("%", "")) === discountRate && s === peakSales;
                        return (
                          <td key={s} className={`px-4 py-2 text-right font-mono text-[13px] ${isActive ? "bg-[#F97316]/10 font-bold text-[#F97316]" : ""}`}>
                            {formatCurrency(val)}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ═══════ TAB 5: Deal Simulator ═══════ */}
        <TabsContent value="simulator" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-5">
            {/* Left: Sliders */}
            <div className="lg:col-span-3 space-y-5">
              <Card className="border-border/40 shadow-sm">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <Scale className="h-4 w-4 text-[#F97316]" /> Deal Terms
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-5">
                  <SimSlider label="Upfront Payment" value={simUpfront} min={0} max={5000} step={25} unit="M" prefix="$" onChange={setSimUpfront} benchmark={simBenchmarks.upfront} />
                  <SimSlider label="Dev Milestones" value={simDevMS} min={0} max={5000} step={25} unit="M" prefix="$" onChange={setSimDevMS} />
                  <SimSlider label="Commercial Milestones" value={simComMS} min={0} max={5000} step={25} unit="M" prefix="$" onChange={setSimComMS} />
                  <SimSlider label="Royalty Floor" value={simRoyaltyLow} min={0} max={30} step={1} unit="%" onChange={setSimRoyaltyLow} benchmark={simBenchmarks.royaltyLow} />
                  <SimSlider label="Royalty Ceiling" value={simRoyaltyHigh} min={5} max={40} step={1} unit="%" onChange={setSimRoyaltyHigh} benchmark={simBenchmarks.royaltyHigh} />

                  <div className="flex items-center gap-6 pt-2">
                    <ToggleSwitch label="Exclusive" checked={simExclusive} onChange={setSimExclusive} />
                    <ToggleSwitch label="Co-Dev Rights" checked={simCoDev} onChange={setSimCoDev} />
                    <ToggleSwitch label="Co-Promote" checked={simCoPromote} onChange={setSimCoPromote} />
                  </div>
                </CardContent>
              </Card>

              {/* Scenarios */}
              <div className="grid gap-3 sm:grid-cols-3">
                {scenarios.map((sc) => (
                  <Card key={sc.name} className={`border-border/40 shadow-sm ${sc.name === "Base" ? "ring-2 ring-[#F97316]/30" : ""}`}>
                    <CardContent className="p-4">
                      <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">{sc.name}</p>
                      <p className="text-lg font-bold font-mono text-[#1A1A2E] mt-1">{formatCurrency(sc.upfront + sc.dev + sc.com)}</p>
                      <div className="space-y-1 mt-2 text-[11px] text-muted-foreground">
                        <p>Upfront: {formatCurrency(sc.upfront)}</p>
                        <p>Dev MS: {formatCurrency(sc.dev)}</p>
                        <p>Com MS: {formatCurrency(sc.com)}</p>
                        <p>Royalties: {sc.rLow}\u2013{sc.rHigh}%</p>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>

            {/* Right: Value Pie */}
            <div className="lg:col-span-2 space-y-4">
              <Card className="border-border/40 shadow-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <PieChartIcon className="h-4 w-4 text-[#F97316]" /> Value Split
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={220}>
                    <PieChart>
                      <Pie data={valuePieData} cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={4} dataKey="value">
                        {valuePieData.map((d, i) => (
                          <Cell key={i} fill={d.color} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v: number) => formatCurrency(v)} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="flex items-center justify-center gap-6 -mt-2">
                    <div className="text-center">
                      <p className="text-[10px] text-muted-foreground uppercase tracking-widest">Licensor</p>
                      <p className="text-lg font-bold font-mono text-[#F97316]">{licensorPct}%</p>
                    </div>
                    <div className="text-center">
                      <p className="text-[10px] text-muted-foreground uppercase tracking-widest">Licensee</p>
                      <p className="text-lg font-bold font-mono text-[#10B981]">{licenseePct}%</p>
                    </div>
                  </div>
                  <div className={`mt-4 flex items-center justify-center gap-2 rounded-lg py-2 text-xs font-medium ${isWinWin ? "bg-green-50 text-green-600" : "bg-amber-50 text-amber-600"}`}>
                    {isWinWin ? <CheckCircle2 className="h-3.5 w-3.5" /> : <AlertTriangle className="h-3.5 w-3.5" />}
                    {isWinWin ? "Win-Win Zone \u2014 Balanced value distribution" : "Imbalanced \u2014 Consider adjusting terms"}
                  </div>
                </CardContent>
              </Card>

              {/* Total deal value */}
              <Card className="border-border/40 shadow-sm">
                <CardContent className="p-4">
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Total Deal Value</p>
                  <p className="text-2xl font-bold font-mono text-[#1A1A2E] mt-1">{formatCurrency(simTotalValue)}</p>
                  <div className="flex items-center gap-1 mt-1">
                    {simTotalValue > simBenchmarks.total.med ? (
                      <><ArrowUpRight className="h-3 w-3 text-[#10B981]" /><span className="text-[11px] text-[#10B981]">Above median ({formatCurrency(simBenchmarks.total.med)})</span></>
                    ) : (
                      <><ArrowDownRight className="h-3 w-3 text-[#EF4444]" /><span className="text-[11px] text-[#EF4444]">Below median ({formatCurrency(simBenchmarks.total.med)})</span></>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Key Takeaways */}
              <Card className="border-border/40 shadow-sm border-l-4 border-l-[#F97316]">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-[#F97316]" /> Key Takeaways
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {takeaways.map((tip, i) => (
                    <p key={i} className="text-xs text-muted-foreground leading-relaxed">
                      <span className="text-[#F97316] font-semibold mr-1">{i + 1}.</span> {tip}
                    </p>
                  ))}
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* ═══════ TAB 6: Value Maximization ═══════ */}
        <TabsContent value="maximize" className="space-y-6">
          <div className="grid gap-4 lg:grid-cols-2">
            {VALUE_INSIGHTS.map((cat) => (
              <Card key={cat.category} className="border-border/40 shadow-sm" style={{ borderTopColor: cat.color, borderTopWidth: 3 }}>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <cat.icon className="h-4 w-4" style={{ color: cat.color }} />
                    {cat.category}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {cat.items.map((item) => (
                    <div key={item.title}>
                      <p className="text-[13px] font-medium text-[#1A1A2E]">{item.title}</p>
                      <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">{item.desc}</p>
                    </div>
                  ))}
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Dynamic takeaways based on simulator */}
          <Card className="border-border/40 shadow-sm bg-gradient-to-r from-[#F97316]/5 to-transparent">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Handshake className="h-4 w-4 text-[#F97316]" />
                Personalized Recommendations
              </CardTitle>
              <p className="text-xs text-muted-foreground">Based on your Deal Simulator inputs</p>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {takeaways.map((tip, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#F97316]/10 text-[10px] font-bold text-[#F97316]">
                      {i + 1}
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed pt-0.5">{tip}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ─── Sub-Components ─────────────────────────────────────────────────

function DealTypeCard({
  profile: p,
  stats,
}: {
  profile: (typeof DEAL_TYPE_PROFILES)[number];
  stats?: { count: number; upfronts: number[]; totals: number[]; royaltyLows: number[]; royaltyHighs: number[] };
}) {
  return (
    <Card className="border-border/40 shadow-sm h-full" style={{ borderTopColor: p.color, borderTopWidth: 3 }}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <CardTitle className="text-[15px] font-semibold">{p.label}</CardTitle>
          <Badge className={`text-[10px] font-medium border ${RISK_COLORS[p.riskLevel]}`}>
            {p.riskLevel} Risk
          </Badge>
        </div>
        <p className="text-[11px] text-muted-foreground leading-relaxed">{p.description}</p>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-[#10B981] mb-1">Advantages</p>
            {p.pros.map((pro) => (
              <p key={pro} className="text-[11px] text-muted-foreground flex items-start gap-1.5 mb-1">
                <CheckCircle2 className="h-3 w-3 text-[#10B981] shrink-0 mt-0.5" />
                {pro}
              </p>
            ))}
          </div>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-[#F59E0B] mb-1">Risks</p>
            {p.cons.map((con) => (
              <p key={con} className="text-[11px] text-muted-foreground flex items-start gap-1.5 mb-1">
                <AlertTriangle className="h-3 w-3 text-[#F59E0B] shrink-0 mt-0.5" />
                {con}
              </p>
            ))}
          </div>
        </div>

        <div>
          <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70 mb-1">Optimal When</p>
          {p.optimalWhen.map((w) => (
            <p key={w} className="text-[11px] text-muted-foreground flex items-start gap-1.5 mb-0.5">
              <Lightbulb className="h-3 w-3 text-[#F97316] shrink-0 mt-0.5" />
              {w}
            </p>
          ))}
        </div>

        {stats && stats.count > 0 && (
          <div className="rounded-lg bg-[#F8F9FA] p-3 mt-2">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70 mb-2">
              Precedent Economics <span className="text-[#F97316]">(n={stats.count})</span>
            </p>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <p className="text-[9px] text-muted-foreground">Median Upfront</p>
                <p className="text-sm font-semibold font-mono">{formatCurrency(median(stats.upfronts))}</p>
              </div>
              <div>
                <p className="text-[9px] text-muted-foreground">Median Total</p>
                <p className="text-sm font-semibold font-mono">{formatCurrency(median(stats.totals))}</p>
              </div>
              <div>
                <p className="text-[9px] text-muted-foreground">Royalties</p>
                <p className="text-sm font-semibold font-mono">
                  {stats.royaltyLows.length > 0
                    ? `${median(stats.royaltyLows).toFixed(0)}\u2013${median(stats.royaltyHighs).toFixed(0)}%`
                    : "\u2014"}
                </p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function StatCard({ label, value, sub, color, icon }: { label: string; value: string; sub: string; color: string; icon: React.ReactNode }) {
  return (
    <Card className="border-border/40 shadow-sm">
      <CardContent className="flex items-center gap-3 p-4">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl shrink-0" style={{ backgroundColor: `${color}15`, color }}>
          {icon}
        </div>
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70">{label}</p>
          <p className="text-xl font-bold font-mono text-[#1A1A2E] mt-0.5">{value}</p>
          <p className="text-[10px] text-muted-foreground">{sub}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function SliderInput({ label, value, min, max, step, unit, prefix, onChange }: {
  label: string; value: number; min: number; max: number; step: number; unit: string; prefix?: string; onChange: (v: number) => void;
}) {
  const display = prefix ? `${prefix}${value >= 1000 ? `${(value / 1000).toFixed(1)}B` : value.toLocaleString() + unit}` : `${value}${unit}`;
  return (
    <Card className="border-border/40 shadow-sm">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-2">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">{label}</p>
          <span className="text-sm font-mono font-bold text-[#F97316]">{display}</span>
        </div>
        <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} className={SLIDER_CLASS} />
      </CardContent>
    </Card>
  );
}

function SimSlider({ label, value, min, max, step, unit, prefix, onChange, benchmark }: {
  label: string; value: number; min: number; max: number; step: number; unit: string; prefix?: string;
  onChange: (v: number) => void; benchmark?: { p25: number; med: number; p75: number };
}) {
  const display = prefix ? `${prefix}${value >= 1000 ? `${(value / 1000).toFixed(1)}B` : `${value}${unit}`}` : `${value}${unit}`;
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <p className="text-[11px] font-medium text-muted-foreground">{label}</p>
        <span className="text-sm font-mono font-bold text-[#1A1A2E]">{display}</span>
      </div>
      <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} className={SLIDER_CLASS} />
      {benchmark && (
        <div className="flex items-center justify-between mt-1 text-[9px] text-muted-foreground">
          <span>P25: {prefix}{benchmark.p25.toFixed(0)}{unit}</span>
          <span className="font-semibold text-[#F97316]">Med: {prefix}{benchmark.med.toFixed(0)}{unit}</span>
          <span>P75: {prefix}{benchmark.p75.toFixed(0)}{unit}</span>
        </div>
      )}
    </div>
  );
}

function ToggleSwitch({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center gap-2 cursor-pointer">
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${checked ? "bg-[#F97316]" : "bg-gray-200"}`}
      >
        <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${checked ? "translate-x-4" : "translate-x-0.5"}`} />
      </button>
      <span className="text-[11px] text-muted-foreground">{label}</span>
    </label>
  );
}
