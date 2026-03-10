"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { NEGOTIATION_STATUS_LABELS } from "@/lib/constants";
import { useNegotiations } from "@/hooks/use-data";
import {
  Bot,
  AlertTriangle,
  Clock,
  Shield,
  Zap,
  Calendar,
  Target,
  TrendingUp,
  Sparkles,
  Users,
  FileText,
  Languages,
  Heart,
  Brain,
  MessageSquare,
  ArrowRight,
  Activity,
  BarChart3,
  Eye,
  Lightbulb,
  UserCheck,
  UserX,
  Gauge,
  Network,
} from "lucide-react";

/* ---------- helpers ---------- */

function formatDate(date: string | null | undefined) {
  if (!date) return "\u2014";
  return new Date(date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function healthColor(score: number) {
  if (score > 70) return "text-green-500";
  if (score >= 40) return "text-yellow-500";
  return "text-red-500";
}

function healthBarColor(score: number) {
  if (score > 70) return "bg-green-500";
  if (score >= 40) return "bg-yellow-500";
  return "bg-red-500";
}

function healthBarBg(score: number) {
  if (score > 70) return "bg-green-500/20";
  if (score >= 40) return "bg-yellow-500/20";
  return "bg-red-500/20";
}

/* ---------- Communication Translator data ---------- */

type Department = "rd" | "bd" | "legal" | "finance";

const DEPARTMENTS: { value: Department; label: string; icon: string }[] = [
  { value: "rd", label: "R&D / Science", icon: "🔬" },
  { value: "bd", label: "Business Development", icon: "🤝" },
  { value: "legal", label: "Legal / IP", icon: "⚖️" },
  { value: "finance", label: "Finance / FP&A", icon: "📊" },
];

const DEPT_PROFILES: Record<
  Department,
  { style: string; vocabulary: string[]; tone: string }
> = {
  rd: {
    style: "Data-heavy, cautious, precise scientific language",
    vocabulary: [
      "mechanism of action",
      "preclinical data",
      "assay results",
      "biomarker validation",
      "dose-response",
      "therapeutic window",
    ],
    tone: "Detailed, evidence-based, uncertainty-aware",
  },
  bd: {
    style: "Narrative-driven, strategic framing, persuasive",
    vocabulary: [
      "value inflection points",
      "deal structure",
      "comparables",
      "strategic fit",
      "BATNA",
      "partnership synergy",
    ],
    tone: "Strategic, outcome-oriented, relationship-focused",
  },
  legal: {
    style: "Precise, risk-focused, formal contractual language",
    vocabulary: [
      "indemnification",
      "IP ownership",
      "exclusivity clause",
      "sublicensing",
      "representations & warranties",
      "force majeure",
    ],
    tone: "Formal, risk-mitigating, clause-specific",
  },
  finance: {
    style: "Quantitative, analytical, conservative projections",
    vocabulary: [
      "NPV",
      "risk adjustment",
      "capital allocation",
      "milestone probabilities",
      "IRR",
      "royalty waterfall",
    ],
    tone: "Numbers-driven, ROI-focused, conservative",
  },
};

const TRANSLATION_EXAMPLES: Record<string, Record<Department, string>> = {
  "uncertain biomarker validation": {
    rd: "The biomarker assay shows a coefficient of variation above 15%, with insufficient correlation to clinical endpoints in the Phase 1b cohort (r\u00B2=0.42). Additional validation studies are recommended before advancing.",
    bd: "Scientific validation risk may reduce milestone valuation. The current biomarker data doesn\u2019t yet support premium deal terms. We should frame this as an opportunity for risk-shared milestone structures.",
    legal: "Biomarker validation uncertainty creates risk around development milestone triggers. Consider adding objective performance criteria and fallback endpoints in the milestone schedule.",
    finance: "Biomarker uncertainty increases the probability-adjusted discount on development milestones from 30% to approximately 50%. This reduces the risk-adjusted NPV of the milestone package by ~$45M.",
  },
  "partner requesting expanded territory": {
    rd: "Broader geographic studies will require region-specific regulatory submissions and potentially modified formulations for different markets. The CMC workstream would need to be expanded.",
    bd: "Territory expansion creates additional upfront value opportunity of $15\u201325M based on comparable deal precedents. Consider tiered pricing with performance-based expansion triggers.",
    legal: "Expanding territory scope modifies the exclusivity framework and requires additional sublicensing rights provisions. We need to review anti-shelving obligations for each new territory.",
    finance: "Territory expansion increases total addressable market by ~40% but requires an additional $8M in regulatory costs. Net incremental NPV is projected at $35\u201350M with a 3-year payback period.",
  },
  "CMC manufacturing delay": {
    rd: "The process chemistry team has identified a yield issue at the 500L scale. Current batch success rate is 60% vs. the 85% target. Root cause analysis points to temperature control during crystallization.",
    bd: "Manufacturing delays may push the partner data package delivery by 4\u20136 weeks. This creates risk to the negotiation timeline. Consider proactive disclosure with a revised milestone schedule.",
    legal: "CMC delays may trigger the force majeure or delay notification provisions in the term sheet. Review the cure period and whether penalties apply if delivery milestones are missed.",
    finance: "A 6-week manufacturing delay shifts revenue recognition by one quarter and increases COGS by ~$2.3M due to additional batch runs. Working capital impact is approximately $5M.",
  },
};

/* ---------- Relationship Companion data ---------- */

interface StakeholderProfile {
  name: string;
  role: string;
  company: string;
  behaviorPattern: string;
  communicationStyle: string;
  decisionSpeed: "Fast" | "Moderate" | "Slow";
  ownershipScore: number;
  reliabilityScore: number;
  influence: "High" | "Medium" | "Low";
  sentiment: "Positive" | "Neutral" | "Cautious" | "Declining";
  recentSignals: string[];
}

const STAKEHOLDER_PROFILES: StakeholderProfile[] = [
  {
    name: "Dr. Sarah Chen",
    role: "VP, Business Development",
    company: "Pfizer",
    behaviorPattern: "Drives decisions quickly but requires CFO alignment before committing to terms above $200M",
    communicationStyle: "Direct, data-driven, prefers structured proposals",
    decisionSpeed: "Fast",
    ownershipScore: 92,
    reliabilityScore: 88,
    influence: "High",
    sentiment: "Positive",
    recentSignals: [
      "Responded within 2 hours to last proposal",
      "Initiated ad-hoc call to discuss milestones",
      "Forwarded materials to internal legal team",
    ],
  },
  {
    name: "James Morrison",
    role: "CFO",
    company: "Pfizer",
    behaviorPattern: "Requires detailed financial models before engagement. Never approves without 2+ weeks of internal review.",
    communicationStyle: "Formal, requests structured financial summaries",
    decisionSpeed: "Slow",
    ownershipScore: 65,
    reliabilityScore: 95,
    influence: "High",
    sentiment: "Neutral",
    recentSignals: [
      "Requested additional NPV scenarios last week",
      "Has not yet reviewed the revised term sheet",
      "Historically blocks deals lacking risk-adjusted projections",
    ],
  },
  {
    name: "Dr. Maria Santos",
    role: "Chief Scientific Officer",
    company: "AstraZeneca",
    behaviorPattern: "Approves only after thorough scientific validation review. Champions deals when data is compelling.",
    communicationStyle: "Detailed, technical, needs MOA deep-dives",
    decisionSpeed: "Moderate",
    ownershipScore: 78,
    reliabilityScore: 91,
    influence: "High",
    sentiment: "Cautious",
    recentSignals: [
      "Scientific review feedback delayed by 5 days",
      "Asked for additional preclinical data package",
      "Tone in last email was more formal than usual",
    ],
  },
  {
    name: "Robert Kim",
    role: "Head of Legal, Licensing",
    company: "Merck",
    behaviorPattern: "Escalates immediately when exclusivity clauses appear. Very thorough but slow on first-pass review.",
    communicationStyle: "Precise, formal, focuses on risk provisions",
    decisionSpeed: "Slow",
    ownershipScore: 70,
    reliabilityScore: 82,
    influence: "Medium",
    sentiment: "Neutral",
    recentSignals: [
      "Flagged 3 IP ownership concerns in redline",
      "Requested call to discuss sublicensing terms",
      "Sent detailed markup within 48 hours of receiving draft",
    ],
  },
  {
    name: "Lisa Park",
    role: "BD Associate",
    company: "AstraZeneca",
    behaviorPattern: "Fast responder, handles day-to-day coordination. Escalates decisions to Dr. Santos.",
    communicationStyle: "Friendly, responsive, action-oriented",
    decisionSpeed: "Fast",
    ownershipScore: 85,
    reliabilityScore: 94,
    influence: "Low",
    sentiment: "Positive",
    recentSignals: [
      "Acknowledged receipt of all documents same day",
      "Proactively scheduled follow-up meeting",
      "Shared internal timeline for next review cycle",
    ],
  },
];

interface SentimentEvent {
  date: string;
  partner: string;
  signal: string;
  type: "positive" | "neutral" | "warning" | "risk";
  interpretation: string;
}

const SENTIMENT_TIMELINE: SentimentEvent[] = [
  {
    date: "Mar 8, 2024",
    partner: "Pfizer",
    signal: "BD emails became shorter and more formal",
    type: "warning",
    interpretation: "Negotiation pressure building \u2014 likely preparing counter-offer or internal alignment",
  },
  {
    date: "Mar 7, 2024",
    partner: "AstraZeneca",
    signal: "Scientific review feedback delayed without explanation",
    type: "risk",
    interpretation: "Possible internal pipeline conflict or reprioritization. Consider escalation.",
  },
  {
    date: "Mar 6, 2024",
    partner: "Pfizer",
    signal: "CFO requested 3 additional NPV scenarios",
    type: "neutral",
    interpretation: "Standard due diligence pattern for this stakeholder. Consistent with previous deal behavior.",
  },
  {
    date: "Mar 5, 2024",
    partner: "AstraZeneca",
    signal: "BD associate proactively shared internal timeline",
    type: "positive",
    interpretation: "Strong engagement signal. Operational team remains committed to advancing the deal.",
  },
  {
    date: "Mar 4, 2024",
    partner: "Merck",
    signal: "Legal team sent detailed redline within 48 hours",
    type: "positive",
    interpretation: "Fast turnaround indicates active internal engagement and prioritization.",
  },
  {
    date: "Mar 3, 2024",
    partner: "Pfizer",
    signal: "Partner tone in calls shows declining enthusiasm over 3 weeks",
    type: "risk",
    interpretation: "Enthusiasm erosion pattern detected. May indicate competitive alternatives or internal pushback.",
  },
];

const ACCOUNTABILITY_METRICS = [
  {
    metric: "Decision Ownership",
    description: "Who drives deal outcomes forward",
    leaders: ["Dr. Sarah Chen (92%)", "Lisa Park (85%)"],
    laggards: ["James Morrison (65%)"],
  },
  {
    metric: "Response Reliability",
    description: "Who responds within expected windows",
    leaders: ["James Morrison (95%)", "Lisa Park (94%)"],
    laggards: ["Dr. Maria Santos (delayed 5d)"],
  },
  {
    metric: "Cross-team Collaboration",
    description: "Who connects across departments",
    leaders: ["Dr. Sarah Chen", "Lisa Park"],
    laggards: ["Robert Kim (siloed in legal)"],
  },
];

/* ---------- mock AI insights ---------- */

const MOCK_INSIGHTS = [
  {
    id: "ins-1",
    timestamp: "2024-03-10 09:15 AM",
    title: "Pfizer upfront offer below market",
    content:
      "CRX-100 Pfizer negotiation: Their $200M counter-offer is 35% below median for comparable Phase 2 oncology out-licenses ($310M median). Recommend counter at $275M with enhanced milestone structure.",
    type: "RISK",
  },
  {
    id: "ins-2",
    timestamp: "2024-03-10 09:12 AM",
    title: "AstraZeneca scientific review overdue",
    content:
      "CRX-200 AZ workspace: Scientific review feedback was expected 5 days ago. This delay pattern often correlates with internal competitive pipeline conflicts. Suggest escalation call with AZ BD lead.",
    type: "ACTION",
  },
  {
    id: "ins-3",
    timestamp: "2024-03-10 09:10 AM",
    title: "Merck parallel track opportunity",
    content:
      "CRX-100 Merck backup: Given the Pfizer negotiation challenges, accelerating Merck engagement could strengthen BATNA. Recommend sending NDA and intro materials this week.",
    type: "STRATEGY",
  },
  {
    id: "ins-4",
    timestamp: "2024-03-09 04:30 PM",
    title: "CMC timeline risk detected",
    content:
      "CRX-100 CMC data package is 60% complete with 10 days to deadline. At current velocity, completion by March 20 is at risk. Recommend reallocating resources from QC team.",
    type: "RISK",
  },
  {
    id: "ins-5",
    timestamp: "2024-03-09 02:15 PM",
    title: "Sublicensing clause precedent found",
    content:
      "Found 3 recent comparable deals with sublicensing provisions matching your negotiation position. Merck-Kelun and BMS-SystImmune both include affiliate-only automatic sublicensing with third-party consent requirement.",
    type: "BENCHMARK",
  },
];

const MOCK_MEETING_RECS = [
  {
    id: "mtg-1",
    title: "Pfizer Counter-proposal Strategy Call",
    participants: "BD Lead, IP Counsel, CMC Lead",
    suggested: "Mar 12, 2024",
    reason:
      "Align on counter-proposal strategy before March 15 partner call deadline",
    priority: "HIGH",
  },
  {
    id: "mtg-2",
    title: "AstraZeneca Escalation Call",
    participants: "BD Lead, CSO",
    suggested: "Mar 13, 2024",
    reason:
      "Address delayed scientific review feedback; 5 days overdue",
    priority: "MEDIUM",
  },
  {
    id: "mtg-3",
    title: "Merck NDA Kick-off",
    participants: "BD Lead, Legal",
    suggested: "Mar 14, 2024",
    reason: "Initiate parallel track to strengthen BATNA position",
    priority: "LOW",
  },
];

const MOCK_AGENDA_ITEMS = [
  "Review Pfizer counter-proposal terms and prepare response strategy",
  "Assess CMC data package completion timeline and resource reallocation",
  "Discuss AstraZeneca scientific review escalation approach",
  "Evaluate Merck parallel engagement timeline and NDA status",
  "Review sublicensing clause precedents from Merck-Kelun and BMS-SystImmune deals",
];

const insightTypeColors: Record<string, string> = {
  RISK: "bg-red-500/15 text-red-500 border-red-500/30",
  ACTION: "bg-blue-500/15 text-blue-500 border-blue-500/30",
  STRATEGY: "bg-purple-500/15 text-purple-500 border-purple-500/30",
  BENCHMARK: "bg-teal-500/15 text-teal-500 border-teal-500/30",
};

const sentimentColors: Record<string, string> = {
  positive: "border-l-green-500 bg-green-500/5",
  neutral: "border-l-gray-400 bg-gray-500/5",
  warning: "border-l-yellow-500 bg-yellow-500/5",
  risk: "border-l-red-500 bg-red-500/5",
};

const sentimentDotColors: Record<string, string> = {
  positive: "bg-green-500",
  neutral: "bg-gray-400",
  warning: "bg-yellow-500",
  risk: "bg-red-500",
};

/* ---------- component ---------- */

export default function ConductorPage() {
  const { negotiations } = useNegotiations();
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // Communication Translator state
  const [sourceInput, setSourceInput] = useState("");
  const [sourceDept, setSourceDept] = useState<Department>("rd");
  const [targetDept, setTargetDept] = useState<Department>("bd");
  const [translatedOutput, setTranslatedOutput] = useState<string | null>(null);
  const [isTranslating, setIsTranslating] = useState(false);
  const [selectedExample, setSelectedExample] = useState<string | null>(null);

  const activeNegotiations = negotiations.filter(
    (n) => n.status !== "CLOSED" && n.status !== "DEAD"
  );

  const allBlockers = activeNegotiations.flatMap((n) =>
    n.blockers.map((b) => ({ ...b, negotiation: n.title, negotiationId: n.id }))
  );

  const allNextSteps = activeNegotiations.flatMap((n) =>
    n.nextSteps.map((s) => ({ ...s, negotiation: n.title, negotiationId: n.id }))
  );

  const allRiskFlags = activeNegotiations.flatMap((n) =>
    n.riskFlags.map((flag) => ({
      flag,
      negotiation: n.title,
      negotiationId: n.id,
    }))
  );

  const priorityActions = allNextSteps
    .sort((a, b) => new Date(a.due).getTime() - new Date(b.due).getTime())
    .slice(0, 6);

  function handleRunAnalysis() {
    setIsAnalyzing(true);
    setTimeout(() => setIsAnalyzing(false), 2000);
  }

  function handleTranslate() {
    if (!sourceInput.trim()) return;
    setIsTranslating(true);
    setTranslatedOutput(null);

    // Simulate AI translation
    setTimeout(() => {
      const srcLabel = DEPARTMENTS.find((d) => d.value === sourceDept)?.label ?? sourceDept;
      const tgtLabel = DEPARTMENTS.find((d) => d.value === targetDept)?.label ?? targetDept;
      const tgtProfile = DEPT_PROFILES[targetDept];

      setTranslatedOutput(
        `[Translated from ${srcLabel} to ${tgtLabel}]\n\n` +
        `${tgtProfile.tone} framing:\n\n` +
        `"${sourceInput.trim()}" \u2192 This maps to a ${tgtLabel.toLowerCase()} concern about ` +
        `${targetDept === "finance" ? "risk-adjusted value impact and capital allocation implications" :
           targetDept === "legal" ? "contractual risk provisions and obligation triggers" :
           targetDept === "bd" ? "deal positioning, partner perception, and strategic negotiation leverage" :
           "scientific validation requirements and data package completeness"}.\n\n` +
        `Key ${tgtLabel} vocabulary to use: ${tgtProfile.vocabulary.slice(0, 3).join(", ")}.\n\n` +
        `Recommended tone: ${tgtProfile.tone}.`
      );
      setIsTranslating(false);
    }, 1200);
  }

  function handleLoadExample(key: string) {
    setSelectedExample(key);
    setSourceInput(key);
  }

  const avgHealth =
    activeNegotiations.length > 0
      ? Math.round(
          activeNegotiations.reduce((sum, n) => sum + n.healthScore, 0) /
            activeNegotiations.length
        )
      : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
            <Bot className="h-6 w-6 text-[#F97316]" />
            AI Deal Conductor
          </h1>
          <p className="text-sm text-muted-foreground">
            Cross-deal intelligence, behavioral analysis, and strategic communication
          </p>
        </div>
        <Button onClick={handleRunAnalysis} disabled={isAnalyzing}>
          <Zap className="mr-2 h-4 w-4" />
          {isAnalyzing ? "Analyzing..." : "Run Analysis"}
        </Button>
      </div>

      {/* Main Tabs */}
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3 max-w-xl">
          <TabsTrigger value="overview" className="flex items-center gap-1.5">
            <Activity className="h-3.5 w-3.5" />
            Deal Overview
          </TabsTrigger>
          <TabsTrigger value="translator" className="flex items-center gap-1.5">
            <Languages className="h-3.5 w-3.5" />
            Communication Translator
          </TabsTrigger>
          <TabsTrigger value="relationships" className="flex items-center gap-1.5">
            <Heart className="h-3.5 w-3.5" />
            Relationship Companion
          </TabsTrigger>
        </TabsList>

        {/* ═══════════════════ TAB 1: Deal Overview ═══════════════════ */}
        <TabsContent value="overview" className="space-y-6">
          {/* Summary stat cards */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Active Deals</CardTitle>
                <FileText className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{activeNegotiations.length}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Avg Health</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${healthColor(avgHealth)}`}>{avgHealth}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Open Blockers</CardTitle>
                <AlertTriangle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-500">{allBlockers.length}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Risk Flags</CardTitle>
                <Shield className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-yellow-500">{allRiskFlags.length}</div>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            {/* Left column (2/3) */}
            <div className="lg:col-span-2 space-y-6">
              {/* Deal Health Chart */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Deal Health Overview</CardTitle>
                  <CardDescription>Health score by active negotiation</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {activeNegotiations.map((n) => (
                    <div key={n.id} className="space-y-1.5">
                      <div className="flex items-center justify-between text-sm">
                        <Link
                          href={`/workspace/${n.id}`}
                          className="font-medium hover:underline truncate max-w-[60%]"
                        >
                          {n.title}
                        </Link>
                        <span className={`font-bold ${healthColor(n.healthScore)}`}>
                          {n.healthScore}
                        </span>
                      </div>
                      <div className={`h-3 w-full rounded-full ${healthBarBg(n.healthScore)}`}>
                        <div
                          className={`h-3 rounded-full transition-all ${healthBarColor(n.healthScore)}`}
                          style={{ width: `${n.healthScore}%` }}
                        />
                      </div>
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>{n.companyName}</span>
                        <Badge variant="outline" className="text-[10px]">
                          {NEGOTIATION_STATUS_LABELS[n.status] ?? n.status}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>

              {/* Priority Action Items */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Target className="h-4 w-4 text-[#F97316]" />
                    Priority Action Items
                  </CardTitle>
                  <CardDescription>Upcoming actions sorted by deadline across all deals</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {priorityActions.map((action, i) => (
                      <div key={i} className="flex items-start gap-3 rounded-lg border p-3">
                        <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#F97316]/15 text-xs font-bold text-[#F97316]">
                          {i + 1}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium">{action.action}</p>
                          <div className="mt-1 flex flex-wrap gap-x-3 text-xs text-muted-foreground">
                            <span>{action.owner}</span>
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {formatDate(action.due)}
                            </span>
                          </div>
                        </div>
                        <Link href={`/workspace/${action.negotiationId}`}>
                          <Badge variant="outline" className="text-[10px] whitespace-nowrap">
                            {action.negotiation.split("\u2014")[0].trim()}
                          </Badge>
                        </Link>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Blockers */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-red-500" />
                    Active Blockers
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {allBlockers.length > 0 ? (
                    <div className="space-y-2">
                      {allBlockers.map((b, i) => (
                        <div key={i} className="flex items-start gap-3 rounded-lg border p-3">
                          <Badge
                            variant={
                              b.severity === "HIGH"
                                ? "destructive"
                                : b.severity === "MEDIUM"
                                  ? "default"
                                  : "secondary"
                            }
                            className="text-xs shrink-0"
                          >
                            {b.severity}
                          </Badge>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm">{b.item}</p>
                            <div className="mt-1 flex gap-3 text-xs text-muted-foreground">
                              <span>Owner: {b.owner}</span>
                              <Link
                                href={`/workspace/${b.negotiationId}`}
                                className="text-[#F97316] hover:underline"
                              >
                                {b.negotiation.split("\u2014")[0].trim()}
                              </Link>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">No active blockers across deals</p>
                  )}
                </CardContent>
              </Card>

              {/* Risk Flags */}
              {allRiskFlags.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <Shield className="h-4 w-4 text-yellow-500" />
                      Risk Flags Summary
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {allRiskFlags.map((r, i) => (
                        <div
                          key={i}
                          className="flex items-start gap-3 rounded-lg border border-yellow-500/20 bg-yellow-500/5 p-3"
                        >
                          <AlertTriangle className="h-4 w-4 text-yellow-500 shrink-0 mt-0.5" />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm">{r.flag}</p>
                            <Link
                              href={`/workspace/${r.negotiationId}`}
                              className="text-xs text-[#F97316] hover:underline mt-1 inline-block"
                            >
                              {r.negotiation}
                            </Link>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Right column (1/3) */}
            <div className="space-y-6">
              {/* Meeting Recommendations */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-[#F97316]" />
                    Meeting Recommendations
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {MOCK_MEETING_RECS.map((mtg) => (
                    <div key={mtg.id} className="rounded-lg border p-3 space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm font-medium">{mtg.title}</p>
                        <Badge
                          variant={
                            mtg.priority === "HIGH"
                              ? "destructive"
                              : mtg.priority === "MEDIUM"
                                ? "default"
                                : "secondary"
                          }
                          className="text-[10px] shrink-0"
                        >
                          {mtg.priority}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Users className="h-3 w-3" />
                        {mtg.participants}
                      </div>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Calendar className="h-3 w-3" />
                        {mtg.suggested}
                      </div>
                      <p className="text-xs text-muted-foreground">{mtg.reason}</p>
                    </div>
                  ))}
                </CardContent>
              </Card>

              {/* Suggested Agenda */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    Suggested Agenda
                  </CardTitle>
                  <CardDescription>For next BD team sync</CardDescription>
                </CardHeader>
                <CardContent>
                  <ol className="space-y-2">
                    {MOCK_AGENDA_ITEMS.map((item, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm">
                        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium text-muted-foreground">
                          {i + 1}
                        </span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ol>
                </CardContent>
              </Card>

              {/* AI Insights Feed */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-[#F97316]" />
                    AI Insights
                  </CardTitle>
                  <CardDescription>Recent analysis results</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {MOCK_INSIGHTS.map((insight) => (
                    <div key={insight.id} className="rounded-lg border p-3 space-y-1.5">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm font-medium">{insight.title}</p>
                        <Badge
                          className={`text-[10px] shrink-0 border ${insightTypeColors[insight.type] ?? ""}`}
                        >
                          {insight.type}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">{insight.content}</p>
                      <p className="text-[10px] text-muted-foreground/70">{insight.timestamp}</p>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* ═══════════════════ TAB 2: Communication Translator ═══════════════════ */}
        <TabsContent value="translator" className="space-y-6">
          {/* Intro */}
          <Card className="border-[#F97316]/20 bg-[#F97316]/5">
            <CardContent className="pt-5 pb-4">
              <div className="flex items-start gap-3">
                <div className="rounded-lg bg-[#F97316]/15 p-2">
                  <Languages className="h-5 w-5 text-[#F97316]" />
                </div>
                <div>
                  <p className="font-medium">AI Communication Translator</p>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    Translate deal language between R&D, Business Development, Legal, and Finance.
                    Each department speaks a different &ldquo;language&rdquo; &mdash; this tool bridges the gap.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-6 lg:grid-cols-2">
            {/* Left: Translator input */}
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <MessageSquare className="h-4 w-4 text-[#F97316]" />
                    Translate Message
                  </CardTitle>
                  <CardDescription>
                    Enter a message from one department and translate it for another
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                        From Department
                      </label>
                      <Select value={sourceDept} onValueChange={(v) => setSourceDept(v as Department)}>
                        <SelectTrigger className="w-full">
                          <SelectValue>
                            {DEPARTMENTS.find((d) => d.value === sourceDept)?.icon}{" "}
                            {DEPARTMENTS.find((d) => d.value === sourceDept)?.label}
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          {DEPARTMENTS.map((d) => (
                            <SelectItem key={d.value} value={d.value}>
                              {d.icon} {d.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <ArrowRight className="h-4 w-4 text-muted-foreground mt-5 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                        To Department
                      </label>
                      <Select value={targetDept} onValueChange={(v) => setTargetDept(v as Department)}>
                        <SelectTrigger className="w-full">
                          <SelectValue>
                            {DEPARTMENTS.find((d) => d.value === targetDept)?.icon}{" "}
                            {DEPARTMENTS.find((d) => d.value === targetDept)?.label}
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          {DEPARTMENTS.map((d) => (
                            <SelectItem key={d.value} value={d.value}>
                              {d.icon} {d.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                      Message to Translate
                    </label>
                    <Textarea
                      placeholder="Enter a message, concern, or update from one department..."
                      value={sourceInput}
                      onChange={(e) => setSourceInput(e.target.value)}
                      rows={4}
                    />
                  </div>

                  <Button
                    onClick={handleTranslate}
                    disabled={!sourceInput.trim() || isTranslating}
                    className="w-full"
                  >
                    {isTranslating ? (
                      <>
                        <Brain className="mr-2 h-4 w-4 animate-pulse" />
                        Translating...
                      </>
                    ) : (
                      <>
                        <Languages className="mr-2 h-4 w-4" />
                        Translate
                      </>
                    )}
                  </Button>

                  {/* Translation output */}
                  {translatedOutput && (
                    <div className="rounded-lg border border-[#F97316]/30 bg-[#F97316]/5 p-4">
                      <p className="text-xs font-medium text-[#F97316] mb-2">Translation Result</p>
                      <p className="text-sm whitespace-pre-wrap">{translatedOutput}</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Quick examples */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Lightbulb className="h-4 w-4 text-yellow-500" />
                    Quick Examples
                  </CardTitle>
                  <CardDescription>
                    Try these common cross-department translation scenarios
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                  {Object.keys(TRANSLATION_EXAMPLES).map((key) => (
                    <button
                      key={key}
                      onClick={() => handleLoadExample(key)}
                      className={`w-full text-left rounded-lg border p-3 text-sm hover:border-[#F97316]/50 transition-colors ${
                        selectedExample === key ? "border-[#F97316] bg-[#F97316]/5" : ""
                      }`}
                    >
                      <span className="font-medium">&ldquo;{key}&rdquo;</span>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Click to load and see how each department interprets this
                      </p>
                    </button>
                  ))}
                </CardContent>
              </Card>
            </div>

            {/* Right: Department profiles + example translations */}
            <div className="space-y-4">
              {/* Department Profiles */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Users className="h-4 w-4 text-[#F97316]" />
                    Department Communication Profiles
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {DEPARTMENTS.map((dept) => {
                    const profile = DEPT_PROFILES[dept.value];
                    return (
                      <div key={dept.value} className="rounded-lg border p-3 space-y-2">
                        <div className="flex items-center gap-2">
                          <span className="text-lg">{dept.icon}</span>
                          <span className="font-medium text-sm">{dept.label}</span>
                        </div>
                        <p className="text-xs text-muted-foreground">{profile.style}</p>
                        <div className="flex flex-wrap gap-1">
                          {profile.vocabulary.map((word) => (
                            <Badge key={word} variant="secondary" className="text-[10px]">
                              {word}
                            </Badge>
                          ))}
                        </div>
                        <p className="text-[10px] text-muted-foreground italic">
                          Tone: {profile.tone}
                        </p>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>

              {/* Example multi-dept view */}
              {selectedExample && TRANSLATION_EXAMPLES[selectedExample] && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">
                      Cross-Department Interpretation
                    </CardTitle>
                    <CardDescription>
                      How each department interprets: &ldquo;{selectedExample}&rdquo;
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {DEPARTMENTS.map((dept) => (
                      <div
                        key={dept.value}
                        className="rounded-lg border p-3 space-y-1"
                      >
                        <div className="flex items-center gap-2">
                          <span>{dept.icon}</span>
                          <span className="text-xs font-medium text-[#F97316]">
                            {dept.label}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {TRANSLATION_EXAMPLES[selectedExample][dept.value]}
                        </p>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </TabsContent>

        {/* ═══════════════════ TAB 3: Relationship Companion ═══════════════════ */}
        <TabsContent value="relationships" className="space-y-6">
          {/* Intro */}
          <Card className="border-[#F97316]/20 bg-[#F97316]/5">
            <CardContent className="pt-5 pb-4">
              <div className="flex items-start gap-3">
                <div className="rounded-lg bg-[#F97316]/15 p-2">
                  <Heart className="h-5 w-5 text-[#F97316]" />
                </div>
                <div>
                  <p className="font-medium">AI Relationship Companion</p>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    Behavioral intelligence layer that maps communication patterns, emotional signals,
                    stakeholder dynamics, and accountability across your deal network.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Summary metrics */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Stakeholders Tracked</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{STAKEHOLDER_PROFILES.length}</div>
                <p className="text-xs text-muted-foreground">Across 3 partners</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Sentiment Signals</CardTitle>
                <Activity className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{SENTIMENT_TIMELINE.length}</div>
                <p className="text-xs text-muted-foreground">Last 7 days</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Risk Signals</CardTitle>
                <Eye className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-500">
                  {SENTIMENT_TIMELINE.filter((e) => e.type === "risk").length}
                </div>
                <p className="text-xs text-muted-foreground">Require attention</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Avg Reliability</CardTitle>
                <Gauge className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-500">
                  {Math.round(
                    STAKEHOLDER_PROFILES.reduce((s, p) => s + p.reliabilityScore, 0) /
                      STAKEHOLDER_PROFILES.length
                  )}%
                </div>
                <p className="text-xs text-muted-foreground">Response reliability</p>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            {/* Left column (2/3) */}
            <div className="lg:col-span-2 space-y-6">
              {/* Stakeholder Behavioral Map */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Network className="h-4 w-4 text-[#F97316]" />
                    Stakeholder Behavioral Map
                  </CardTitle>
                  <CardDescription>
                    Communication styles, decision patterns, and influence analysis
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {STAKEHOLDER_PROFILES.map((person) => (
                    <div
                      key={person.name}
                      className="rounded-lg border p-4 space-y-3 hover:border-[#F97316]/30 transition-colors"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-medium text-sm">{person.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {person.role} &middot; {person.company}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge
                            variant={
                              person.sentiment === "Positive"
                                ? "default"
                                : person.sentiment === "Declining"
                                  ? "destructive"
                                  : "secondary"
                            }
                            className="text-[10px]"
                          >
                            {person.sentiment}
                          </Badge>
                          <Badge variant="outline" className="text-[10px]">
                            {person.influence} Influence
                          </Badge>
                        </div>
                      </div>

                      <p className="text-xs text-muted-foreground">{person.behaviorPattern}</p>

                      <div className="grid grid-cols-3 gap-3">
                        <div className="text-center rounded-md bg-muted/50 p-2">
                          <div className="text-xs text-muted-foreground">Decision</div>
                          <div className={`text-sm font-bold ${
                            person.decisionSpeed === "Fast" ? "text-green-500" :
                            person.decisionSpeed === "Moderate" ? "text-yellow-500" : "text-red-500"
                          }`}>
                            {person.decisionSpeed}
                          </div>
                        </div>
                        <div className="text-center rounded-md bg-muted/50 p-2">
                          <div className="text-xs text-muted-foreground">Ownership</div>
                          <div className={`text-sm font-bold ${
                            person.ownershipScore >= 80 ? "text-green-500" :
                            person.ownershipScore >= 60 ? "text-yellow-500" : "text-red-500"
                          }`}>
                            {person.ownershipScore}%
                          </div>
                        </div>
                        <div className="text-center rounded-md bg-muted/50 p-2">
                          <div className="text-xs text-muted-foreground">Reliability</div>
                          <div className={`text-sm font-bold ${
                            person.reliabilityScore >= 85 ? "text-green-500" :
                            person.reliabilityScore >= 70 ? "text-yellow-500" : "text-red-500"
                          }`}>
                            {person.reliabilityScore}%
                          </div>
                        </div>
                      </div>

                      <div>
                        <p className="text-[10px] font-medium text-muted-foreground mb-1">
                          RECENT SIGNALS
                        </p>
                        <div className="space-y-1">
                          {person.recentSignals.map((signal, i) => (
                            <div key={i} className="flex items-start gap-1.5 text-xs text-muted-foreground">
                              <span className="text-[#F97316] mt-0.5">&bull;</span>
                              {signal}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>

              {/* Accountability Analytics */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <BarChart3 className="h-4 w-4 text-[#F97316]" />
                    Accountability Analytics
                  </CardTitle>
                  <CardDescription>
                    Who drives outcomes, who responds reliably, who collaborates across teams
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {ACCOUNTABILITY_METRICS.map((metric) => (
                    <div key={metric.metric} className="rounded-lg border p-4 space-y-2">
                      <div>
                        <p className="text-sm font-medium">{metric.metric}</p>
                        <p className="text-xs text-muted-foreground">{metric.description}</p>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <p className="text-[10px] font-medium flex items-center gap-1 text-green-500 mb-1">
                            <UserCheck className="h-3 w-3" /> Leaders
                          </p>
                          {metric.leaders.map((l) => (
                            <p key={l} className="text-xs text-muted-foreground">{l}</p>
                          ))}
                        </div>
                        <div>
                          <p className="text-[10px] font-medium flex items-center gap-1 text-yellow-500 mb-1">
                            <UserX className="h-3 w-3" /> Needs Attention
                          </p>
                          {metric.laggards.map((l) => (
                            <p key={l} className="text-xs text-muted-foreground">{l}</p>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>

            {/* Right column (1/3) */}
            <div className="space-y-6">
              {/* Sentiment Timeline */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Activity className="h-4 w-4 text-[#F97316]" />
                    Sentiment Timeline
                  </CardTitle>
                  <CardDescription>
                    Emotional and behavioral signals detected across partners
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {SENTIMENT_TIMELINE.map((event, i) => (
                    <div
                      key={i}
                      className={`rounded-lg border-l-4 p-3 space-y-1.5 ${sentimentColors[event.type]}`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className={`h-2 w-2 rounded-full ${sentimentDotColors[event.type]}`} />
                          <span className="text-xs font-medium">{event.partner}</span>
                        </div>
                        <span className="text-[10px] text-muted-foreground">{event.date}</span>
                      </div>
                      <p className="text-xs font-medium">{event.signal}</p>
                      <p className="text-[10px] text-muted-foreground italic">
                        {event.interpretation}
                      </p>
                    </div>
                  ))}
                </CardContent>
              </Card>

              {/* Alliance Health */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Heart className="h-4 w-4 text-red-500" />
                    Alliance Health Prediction
                  </CardTitle>
                  <CardDescription>
                    Overall partnership health based on behavioral signals
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {[
                    { partner: "Pfizer", score: 72, trend: "declining", signals: 4 },
                    { partner: "AstraZeneca", score: 58, trend: "cautious", signals: 3 },
                    { partner: "Merck", score: 85, trend: "positive", signals: 2 },
                  ].map((alliance) => (
                    <div key={alliance.partner} className="rounded-lg border p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">{alliance.partner}</span>
                        <span className={`text-sm font-bold ${healthColor(alliance.score)}`}>
                          {alliance.score}
                        </span>
                      </div>
                      <div className={`h-2 w-full rounded-full ${healthBarBg(alliance.score)}`}>
                        <div
                          className={`h-2 rounded-full ${healthBarColor(alliance.score)}`}
                          style={{ width: `${alliance.score}%` }}
                        />
                      </div>
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>Trend: {alliance.trend}</span>
                        <span>{alliance.signals} signals</span>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>

              {/* Communication Pattern Insights */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Brain className="h-4 w-4 text-purple-500" />
                    Behavioral Insights
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {[
                    {
                      insight: "BD emails become shorter before negotiations",
                      meaning: "Negotiation pressure building",
                      type: "warning",
                    },
                    {
                      insight: "Legal team joins late in AZ discussions",
                      meaning: "Governance bottleneck risk",
                      type: "risk",
                    },
                    {
                      insight: "R&D emails highly technical in Pfizer thread",
                      meaning: "Communication gap with finance",
                      type: "neutral",
                    },
                    {
                      insight: "Partner tone shifts detected in Pfizer comms",
                      meaning: "Alliance risk indicator",
                      type: "risk",
                    },
                    {
                      insight: "Merck legal turnaround faster than historical average",
                      meaning: "High engagement and prioritization",
                      type: "positive",
                    },
                  ].map((item, i) => (
                    <div
                      key={i}
                      className={`rounded-lg border-l-4 p-3 ${sentimentColors[item.type]}`}
                    >
                      <p className="text-xs font-medium">{item.insight}</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        {item.meaning}
                      </p>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
