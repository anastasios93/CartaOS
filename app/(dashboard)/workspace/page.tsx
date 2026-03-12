"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { NEGOTIATION_STATUS_LABELS } from "@/lib/constants";
import { useNegotiations } from "@/hooks/use-data";
import {
  Search,
  Plus,
  FolderKanban,
  CalendarClock,
  Target,
  AlertTriangle,
  ArrowUpRight,
  Clock,
  FileText,
  MessageSquare,
  Users,
} from "lucide-react";

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
  });
}

const STATUS_COLORS: Record<string, string> = {
  INITIATED: "bg-gray-100 text-gray-600 border-gray-200",
  TERM_SHEET_DRAFTING: "bg-blue-50 text-blue-600 border-blue-200",
  TERM_SHEET_EXCHANGED: "bg-teal-50 text-teal-600 border-teal-200",
  DUE_DILIGENCE: "bg-purple-50 text-purple-600 border-purple-200",
  DEFINITIVE_AGREEMENT: "bg-amber-50 text-amber-600 border-amber-200",
  CLOSED: "bg-green-50 text-green-600 border-green-200",
  DEAD: "bg-red-50 text-red-600 border-red-200",
};

function healthColor(score: number) {
  if (score > 70) return "text-[#10B981]";
  if (score >= 40) return "text-[#F59E0B]";
  return "text-[#EF4444]";
}

function healthStroke(score: number) {
  if (score > 70) return "stroke-[#10B981]";
  if (score >= 40) return "stroke-[#F59E0B]";
  return "stroke-[#EF4444]";
}

function healthBg(score: number) {
  if (score > 70) return "stroke-[#10B981]/15";
  if (score >= 40) return "stroke-[#F59E0B]/15";
  return "stroke-[#EF4444]/15";
}

export default function WorkspacesPage() {
  const { negotiations } = useNegotiations();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<string>("all");

  const filtered = negotiations.filter((neg) => {
    const matchesSearch =
      !search ||
      neg.title.toLowerCase().includes(search.toLowerCase()) ||
      neg.companyName.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = status === "all" || neg.status === status;
    return matchesSearch && matchesStatus;
  });

  const activeCount = negotiations.filter(
    (n) => n.status !== "CLOSED" && n.status !== "DEAD"
  ).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#1A1A2E]">Deal Workspace</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Manage active negotiations, notes, files, and tasks
          </p>
        </div>
        <Button className="gap-2 bg-[#F97316] hover:bg-[#EA580C] text-white">
          <Plus className="h-4 w-4" /> New Workspace
        </Button>
      </div>

      {/* Stats bar */}
      <div className="flex items-center gap-6 rounded-xl border border-border/40 bg-white p-4 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#F97316]/10">
            <FolderKanban className="h-4 w-4 text-[#F97316]" />
          </div>
          <div>
            <p className="text-lg font-bold font-mono text-[#1A1A2E]">{negotiations.length}</p>
            <p className="text-[10px] text-muted-foreground uppercase tracking-widest">Total</p>
          </div>
        </div>
        <div className="h-8 w-px bg-border/40" />
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#10B981]/10">
            <Clock className="h-4 w-4 text-[#10B981]" />
          </div>
          <div>
            <p className="text-lg font-bold font-mono text-[#1A1A2E]">{activeCount}</p>
            <p className="text-[10px] text-muted-foreground uppercase tracking-widest">Active</p>
          </div>
        </div>
        <div className="h-8 w-px bg-border/40" />
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#EF4444]/10">
            <AlertTriangle className="h-4 w-4 text-[#EF4444]" />
          </div>
          <div>
            <p className="text-lg font-bold font-mono text-[#1A1A2E]">
              {negotiations.filter((n) => n.blockers.length > 0).length}
            </p>
            <p className="text-[10px] text-muted-foreground uppercase tracking-widest">Blocked</p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search workspaces..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-9 border-border/40 bg-white"
          />
        </div>
        <Select value={status} onValueChange={(v) => setStatus(v ?? "all")}>
          <SelectTrigger className="w-[200px] h-9 border-border/40 bg-white">
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            {Object.entries(NEGOTIATION_STATUS_LABELS).map(([k, v]) => (
              <SelectItem key={k} value={k}>{v}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Workspace cards */}
      {filtered.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((neg) => (
            <Link key={neg.id} href={`/workspace/${neg.id}`}>
              <Card className="group h-full border-border/40 bg-white shadow-sm transition-all hover:shadow-md hover:border-border/60 hover:-translate-y-0.5">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-[15px] font-semibold truncate group-hover:text-[#F97316] transition-colors">
                        {neg.title}
                      </CardTitle>
                      <p className="text-xs text-muted-foreground mt-1">{neg.companyName}</p>
                    </div>
                    {/* Health score ring */}
                    <div className="relative flex h-12 w-12 shrink-0 items-center justify-center">
                      <svg className="h-12 w-12 -rotate-90" viewBox="0 0 36 36">
                        <circle
                          cx="18" cy="18" r="15" fill="none" strokeWidth="2.5"
                          className={healthBg(neg.healthScore)}
                        />
                        <circle
                          cx="18" cy="18" r="15" fill="none" strokeWidth="2.5"
                          strokeDasharray={`${(neg.healthScore / 100) * 94.2} 94.2`}
                          strokeLinecap="round"
                          className={healthStroke(neg.healthScore)}
                        />
                      </svg>
                      <span className={`absolute text-xs font-bold ${healthColor(neg.healthScore)}`}>
                        {neg.healthScore}
                      </span>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Badge className={`text-[10px] font-medium border ${STATUS_COLORS[neg.status] ?? STATUS_COLORS.INITIATED}`}>
                    {NEGOTIATION_STATUS_LABELS[neg.status] ?? neg.status}
                  </Badge>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-lg bg-[#F8F9FA] p-2.5">
                      <p className="text-[10px] text-muted-foreground uppercase tracking-widest">Upfront</p>
                      <p className="text-sm font-semibold font-mono mt-0.5">{formatCurrency(neg.proposedUpfront)}</p>
                    </div>
                    <div className="rounded-lg bg-[#F8F9FA] p-2.5">
                      <p className="text-[10px] text-muted-foreground uppercase tracking-widest">Milestones</p>
                      <p className="text-sm font-semibold font-mono mt-0.5">{formatCurrency(neg.proposedMilestones)}</p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-1">
                    <span className="flex items-center gap-1">
                      <CalendarClock className="h-3 w-3" />
                      {formatDate(neg.startDate)}
                    </span>
                    {neg.targetCloseDate && (
                      <span className="flex items-center gap-1">
                        <Target className="h-3 w-3" />
                        {formatDate(neg.targetCloseDate)}
                      </span>
                    )}
                    <ArrowUpRight className="h-3.5 w-3.5 text-muted-foreground/30 group-hover:text-[#F97316] transition-colors" />
                  </div>

                  {neg.blockers.length > 0 && (
                    <div className="flex items-center gap-1.5 rounded-md bg-red-50 border border-red-100 px-2.5 py-1.5 text-[11px] text-red-600">
                      <AlertTriangle className="h-3 w-3 shrink-0" />
                      {neg.blockers.length} blocker{neg.blockers.length > 1 ? "s" : ""}
                      {typeof neg.blockers[0] === "string" ? ` — ${neg.blockers[0]}` : ""}
                    </div>
                  )}
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      ) : (
        <Card className="border-border/40 shadow-sm">
          <CardContent className="flex flex-col items-center justify-center py-20">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#F97316]/10 mb-4">
              <FolderKanban className="h-7 w-7 text-[#F97316]" />
            </div>
            <p className="text-sm font-medium text-[#1A1A2E]">No workspaces found</p>
            <p className="text-xs text-muted-foreground mt-1">Create a workspace to start tracking a negotiation</p>
            <Button size="sm" className="mt-4 gap-2 bg-[#F97316] hover:bg-[#EA580C] text-white">
              <Plus className="h-4 w-4" /> Create Workspace
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
