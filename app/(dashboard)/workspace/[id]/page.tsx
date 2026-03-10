"use client";

import { use, useState } from "react";
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
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { NEGOTIATION_STATUS_LABELS } from "@/lib/constants";
import { useNegotiations } from "@/hooks/use-data";
import {
  ArrowLeft,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Mail,
  FileText,
  FileSpreadsheet,
  FileImage,
  File,
  Download,
  Send,
  ArrowRightLeft,
  Calendar,
  DollarSign,
  Globe,
  Shield,
  ChevronRight,
} from "lucide-react";

/* ---------- helpers ---------- */

function formatCurrency(value: number | null | undefined) {
  if (value == null) return "\u2014";
  if (value >= 1000) return `$${(value / 1000).toFixed(1)}B`;
  return `$${value.toFixed(0)}M`;
}

function formatDate(date: string | null | undefined) {
  if (!date) return "\u2014";
  return new Date(date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

const STATUS_COLORS: Record<string, string> = {
  INITIATED: "bg-gray-500/15 text-gray-400 border-gray-500/30",
  TERM_SHEET_DRAFTING: "bg-blue-500/15 text-blue-400 border-blue-500/30",
  TERM_SHEET_EXCHANGED: "bg-teal-500/15 text-teal-400 border-teal-500/30",
  DUE_DILIGENCE: "bg-purple-500/15 text-purple-400 border-purple-500/30",
  DEFINITIVE_AGREEMENT: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  CLOSED: "bg-green-500/15 text-green-400 border-green-500/30",
  DEAD: "bg-red-500/15 text-red-400 border-red-500/30",
};

function healthColor(score: number) {
  if (score > 70) return "text-green-400";
  if (score >= 40) return "text-yellow-400";
  return "text-red-400";
}

function healthBg(score: number) {
  if (score > 70) return "bg-green-500/20";
  if (score >= 40) return "bg-yellow-500/20";
  return "bg-red-500/20";
}

/* ---------- mock emails ---------- */

const MOCK_EMAILS = [
  {
    id: "email-1",
    from: "Sarah Chen <s.chen@pfizer.com>",
    subject: "Re: CRX-100 Term Sheet \u2014 Sublicensing Clause Feedback",
    date: "2024-03-10",
    preview:
      "Thanks for sending the revised term sheet. We have reviewed the sublicensing provisions and have a few comments...",
    read: true,
  },
  {
    id: "email-2",
    from: "IP Counsel <ip.counsel@internal.com>",
    subject: "Legal review update on sublicensing clause",
    date: "2024-03-08",
    preview:
      "I completed the initial review of the sublicensing clause. There are two areas that need further clarification before...",
    read: true,
  },
  {
    id: "email-3",
    from: "Sarah Chen <s.chen@pfizer.com>",
    subject: "CMC Data Package \u2014 Timeline Update",
    date: "2024-03-06",
    preview:
      "Following up on our call yesterday. Our CMC team needs the complete stability data by end of March to stay on...",
    read: false,
  },
  {
    id: "email-4",
    from: "BD Lead <bd.lead@internal.com>",
    subject: "Benchmarking analysis for royalty counter-proposal",
    date: "2024-03-04",
    preview:
      "I have completed the benchmarking analysis for comparable Phase 2 oncology out-licenses. The median upfront is...",
    read: true,
  },
  {
    id: "email-5",
    from: "CMC Lead <cmc.lead@internal.com>",
    subject: "CMC Data Package Status",
    date: "2024-03-02",
    preview:
      "Current status of CMC deliverables: Stability data (60% complete), Process validation (80% complete), Analytical...",
    read: true,
  },
];

/* ---------- mock documents ---------- */

const MOCK_DOCUMENTS = [
  {
    id: "doc-1",
    name: "CRX-100_TermSheet_v3_DRAFT.docx",
    type: "DOCX",
    date: "2024-03-09",
    size: "245 KB",
  },
  {
    id: "doc-2",
    name: "Pfizer_CDA_Executed.pdf",
    type: "PDF",
    date: "2024-02-15",
    size: "1.2 MB",
  },
  {
    id: "doc-3",
    name: "CRX-100_CMC_DataPackage.xlsx",
    type: "XLSX",
    date: "2024-03-06",
    size: "3.8 MB",
  },
  {
    id: "doc-4",
    name: "Deal_Benchmarking_Analysis.pptx",
    type: "PPTX",
    date: "2024-03-04",
    size: "5.1 MB",
  },
  {
    id: "doc-5",
    name: "IP_Landscape_Assessment.pdf",
    type: "PDF",
    date: "2024-02-20",
    size: "890 KB",
  },
  {
    id: "doc-6",
    name: "Meeting_Notes_2024-03-01.docx",
    type: "DOCX",
    date: "2024-03-01",
    size: "78 KB",
  },
];

const DOC_ICONS: Record<string, React.ReactNode> = {
  PDF: <FileText className="h-5 w-5 text-red-400" />,
  DOCX: <FileText className="h-5 w-5 text-blue-400" />,
  XLSX: <FileSpreadsheet className="h-5 w-5 text-green-400" />,
  PPTX: <FileImage className="h-5 w-5 text-amber-400" />,
  CSV: <FileSpreadsheet className="h-5 w-5 text-teal-400" />,
};

/* ---------- mock negotiation log ---------- */

const MOCK_NEG_LOG = [
  {
    id: "log-1",
    date: "2024-03-08",
    type: "COUNTEROFFER",
    party: "Pfizer",
    summary: "Counter-proposed upfront of $200M (down from $250M initial ask)",
    terms: {
      upfront: "$200M",
      milestones: "$1,600M",
      royalties: "8\u201314%",
      territory: "Worldwide",
    },
  },
  {
    id: "log-2",
    date: "2024-02-28",
    type: "OFFER",
    party: "CartaOS (Us)",
    summary: "Initial term sheet sent with proposed deal structure",
    terms: {
      upfront: "$250M",
      milestones: "$1,800M",
      royalties: "10\u201316%",
      territory: "Worldwide",
    },
  },
  {
    id: "log-3",
    date: "2024-02-20",
    type: "MEETING",
    party: "Both",
    summary:
      "Introductory scientific presentation and high-level deal discussion",
    terms: null,
  },
  {
    id: "log-4",
    date: "2024-01-15",
    type: "INITIATED",
    party: "CartaOS (Us)",
    summary: "Workspace created. NDA executed with Pfizer BD team.",
    terms: null,
  },
];

/* ---------- component ---------- */

export default function WorkspaceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { negotiations } = useNegotiations();
  const [activeTab, setActiveTab] = useState("overview");

  const negotiation = negotiations.find((n) => n.id === id);

  if (!negotiation) {
    return (
      <div className="flex flex-col items-center py-16">
        <p className="text-sm text-muted-foreground">Workspace not found</p>
        <Button size="sm" className="mt-3" asChild>
          <Link href="/workspace">Back to Workspaces</Link>
        </Button>
      </div>
    );
  }

  const n = negotiation;

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      {/* Header */}
      <div className="flex items-start gap-3">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/workspace">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-semibold tracking-tight">{n.title}</h1>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <span className="text-sm text-muted-foreground">
              {n.companyName}
            </span>
            <Badge
              className={`text-xs border ${STATUS_COLORS[n.status] ?? "bg-gray-500/15 text-gray-400 border-gray-500/30"}`}
            >
              {NEGOTIATION_STATUS_LABELS[n.status] ?? n.status}
            </Badge>
            <div
              className={`flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ${healthBg(n.healthScore)} ${healthColor(n.healthScore)}`}
            >
              <span>Health: {n.healthScore}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="emails">
            Emails ({MOCK_EMAILS.length})
          </TabsTrigger>
          <TabsTrigger value="documents">
            Documents ({MOCK_DOCUMENTS.length})
          </TabsTrigger>
          <TabsTrigger value="log">Negotiation Log</TabsTrigger>
        </TabsList>

        {/* ===== OVERVIEW TAB ===== */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-3">
            {/* Left column: Key Terms + Blockers + Risk */}
            <div className="lg:col-span-2 space-y-6">
              {/* Key Terms */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <DollarSign className="h-4 w-4 text-[#F97316]" />
                    Key Terms
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <TermField
                      label="Proposed Upfront"
                      value={formatCurrency(n.proposedUpfront)}
                    />
                    <TermField
                      label="Milestones"
                      value={formatCurrency(n.proposedMilestones)}
                    />
                    <TermField
                      label="Royalties"
                      value={
                        n.proposedRoyaltyLow != null
                          ? `${n.proposedRoyaltyLow}% \u2013 ${n.proposedRoyaltyHigh ?? "?"}%`
                          : "\u2014"
                      }
                    />
                    <TermField
                      label="Territory"
                      value={n.proposedTerritory || "\u2014"}
                      icon={<Globe className="h-3.5 w-3.5 text-muted-foreground" />}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Blockers */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-red-500" />
                    Blockers ({n.blockers.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {n.blockers.length > 0 ? (
                    <div className="space-y-2">
                      {n.blockers.map((b, i) => (
                        <div
                          key={i}
                          className="flex items-start gap-3 rounded-lg border p-3"
                        >
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
                            <p className="text-xs text-muted-foreground mt-0.5">
                              Owner: {b.owner}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      No active blockers
                    </p>
                  )}
                </CardContent>
              </Card>

              {/* Risk Flags */}
              {n.riskFlags.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <Shield className="h-4 w-4 text-yellow-500" />
                      Risk Flags
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {n.riskFlags.map((flag, i) => (
                        <div
                          key={i}
                          className="flex items-start gap-3 rounded-lg border border-yellow-500/20 bg-yellow-500/5 p-3"
                        >
                          <AlertTriangle className="h-4 w-4 text-yellow-500 shrink-0 mt-0.5" />
                          <p className="text-sm">{flag}</p>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Right column: Next Steps + Action Items */}
            <div className="space-y-6">
              {/* Next Steps Timeline */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                    Next Steps
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {n.nextSteps.length > 0 ? (
                    <div className="relative space-y-4">
                      {/* Timeline line */}
                      <div className="absolute left-[7px] top-2 bottom-2 w-px bg-border" />
                      {n.nextSteps.map((step, i) => (
                        <div key={i} className="relative flex gap-3 pl-6">
                          <div className="absolute left-0 top-1.5 h-3.5 w-3.5 rounded-full border-2 border-[#F97316] bg-background" />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium">{step.action}</p>
                            <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                              <span>{step.owner}</span>
                              <span className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {formatDate(step.due)}
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      No next steps defined
                    </p>
                  )}
                </CardContent>
              </Card>

              {/* Quick Info */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    Timeline
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Start Date</span>
                    <span className="font-medium">{formatDate(n.startDate)}</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Target Close</span>
                    <span className="font-medium">
                      {formatDate(n.targetCloseDate)}
                    </span>
                  </div>
                  <Separator />
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Health Score</span>
                    <span className={`font-bold ${healthColor(n.healthScore)}`}>
                      {n.healthScore}/100
                    </span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* ===== EMAILS TAB ===== */}
        <TabsContent value="emails" className="space-y-3">
          {MOCK_EMAILS.map((email) => (
            <Card
              key={email.id}
              className={`transition-colors hover:bg-muted/50 cursor-pointer ${!email.read ? "border-[#F97316]/40" : ""}`}
            >
              <CardContent className="flex items-start gap-4 py-4">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p
                      className={`text-sm truncate ${!email.read ? "font-semibold" : "font-medium"}`}
                    >
                      {email.from}
                    </p>
                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                      {formatDate(email.date)}
                    </span>
                  </div>
                  <p
                    className={`text-sm mt-0.5 truncate ${!email.read ? "font-medium" : ""}`}
                  >
                    {email.subject}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
                    {email.preview}
                  </p>
                </div>
                {!email.read && (
                  <div className="h-2 w-2 rounded-full bg-[#F97316] shrink-0 mt-2" />
                )}
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        {/* ===== DOCUMENTS TAB ===== */}
        <TabsContent value="documents" className="space-y-3">
          {MOCK_DOCUMENTS.map((doc) => (
            <Card
              key={doc.id}
              className="transition-colors hover:bg-muted/50 cursor-pointer"
            >
              <CardContent className="flex items-center gap-4 py-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted">
                  {DOC_ICONS[doc.type] ?? (
                    <File className="h-5 w-5 text-muted-foreground" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{doc.name}</p>
                  <div className="flex items-center gap-3 mt-0.5 text-xs text-muted-foreground">
                    <Badge variant="outline" className="text-[10px] px-1.5">
                      {doc.type}
                    </Badge>
                    <span>{formatDate(doc.date)}</span>
                    <span>{doc.size}</span>
                  </div>
                </div>
                <Button variant="ghost" size="icon" className="shrink-0">
                  <Download className="h-4 w-4" />
                </Button>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        {/* ===== NEGOTIATION LOG TAB ===== */}
        <TabsContent value="log" className="space-y-4">
          <div className="relative">
            {/* Timeline line */}
            <div className="absolute left-[19px] top-0 bottom-0 w-px bg-border" />

            {MOCK_NEG_LOG.map((entry, i) => (
              <div key={entry.id} className="relative flex gap-4 pb-6">
                {/* Timeline dot */}
                <div
                  className={`relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 bg-background ${
                    entry.type === "COUNTEROFFER"
                      ? "border-amber-500"
                      : entry.type === "OFFER"
                        ? "border-[#F97316]"
                        : entry.type === "MEETING"
                          ? "border-purple-500"
                          : "border-gray-500"
                  }`}
                >
                  {entry.type === "COUNTEROFFER" ? (
                    <ArrowRightLeft className="h-4 w-4 text-amber-500" />
                  ) : entry.type === "OFFER" ? (
                    <Send className="h-4 w-4 text-[#F97316]" />
                  ) : entry.type === "MEETING" ? (
                    <Calendar className="h-4 w-4 text-purple-500" />
                  ) : (
                    <CheckCircle2 className="h-4 w-4 text-gray-500" />
                  )}
                </div>

                {/* Content */}
                <Card className="flex-1">
                  <CardContent className="py-4">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <Badge
                          variant="outline"
                          className="text-xs"
                        >
                          {entry.type.replace("_", " ")}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {entry.party}
                        </span>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {formatDate(entry.date)}
                      </span>
                    </div>
                    <p className="text-sm mt-2">{entry.summary}</p>

                    {entry.terms && (
                      <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-3 rounded-lg bg-muted/50 p-3">
                        <div>
                          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                            Upfront
                          </p>
                          <p className="text-sm font-medium">
                            {entry.terms.upfront}
                          </p>
                        </div>
                        <div>
                          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                            Milestones
                          </p>
                          <p className="text-sm font-medium">
                            {entry.terms.milestones}
                          </p>
                        </div>
                        <div>
                          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                            Royalties
                          </p>
                          <p className="text-sm font-medium">
                            {entry.terms.royalties}
                          </p>
                        </div>
                        <div>
                          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                            Territory
                          </p>
                          <p className="text-sm font-medium">
                            {entry.terms.territory}
                          </p>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

/* ---------- sub-components ---------- */

function TermField({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon?: React.ReactNode;
}) {
  return (
    <div>
      <p className="text-xs text-muted-foreground flex items-center gap-1">
        {icon}
        {label}
      </p>
      <p className="text-sm font-medium mt-0.5">{value}</p>
    </div>
  );
}
