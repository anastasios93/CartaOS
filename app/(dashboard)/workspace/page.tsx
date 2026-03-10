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
  FolderOpen,
  CalendarClock,
  Target,
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
  if (score > 70) return "text-green-400 stroke-green-400";
  if (score >= 40) return "text-yellow-400 stroke-yellow-400";
  return "text-red-400 stroke-red-400";
}

function healthBg(score: number) {
  if (score > 70) return "stroke-green-400/20";
  if (score >= 40) return "stroke-yellow-400/20";
  return "stroke-red-400/20";
}

/* ---------- component ---------- */

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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Deal Workspaces
          </h1>
          <p className="text-sm text-muted-foreground">
            Active negotiation workspaces and deal rooms
          </p>
        </div>
        <Button>
          <Plus className="mr-2 h-4 w-4" /> Create Workspace
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search workspaces..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={status} onValueChange={(v) => setStatus(v ?? "all")}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            {Object.entries(NEGOTIATION_STATUS_LABELS).map(([k, v]) => (
              <SelectItem key={k} value={k}>
                {v}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Workspace cards */}
      {filtered.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((neg) => (
            <Link key={neg.id} href={`/workspace/${neg.id}`}>
              <Card className="h-full transition-colors hover:bg-muted/50 cursor-pointer">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-base truncate">
                        {neg.title}
                      </CardTitle>
                      <CardDescription className="mt-1">
                        {neg.companyName}
                      </CardDescription>
                    </div>
                    {/* Circular health indicator */}
                    <div className="relative flex h-11 w-11 shrink-0 items-center justify-center">
                      <svg
                        className="h-11 w-11 -rotate-90"
                        viewBox="0 0 36 36"
                      >
                        <circle
                          cx="18"
                          cy="18"
                          r="15.5"
                          fill="none"
                          strokeWidth="3"
                          className={healthBg(neg.healthScore)}
                        />
                        <circle
                          cx="18"
                          cy="18"
                          r="15.5"
                          fill="none"
                          strokeWidth="3"
                          strokeDasharray={`${(neg.healthScore / 100) * 97.4} 97.4`}
                          strokeLinecap="round"
                          className={healthColor(neg.healthScore)}
                        />
                      </svg>
                      <span
                        className={`absolute text-xs font-bold ${healthColor(neg.healthScore)}`}
                      >
                        {neg.healthScore}
                      </span>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Badge
                    className={`text-xs border ${STATUS_COLORS[neg.status] ?? "bg-gray-500/15 text-gray-400 border-gray-500/30"}`}
                  >
                    {NEGOTIATION_STATUS_LABELS[neg.status] ?? neg.status}
                  </Badge>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <p className="text-muted-foreground">Upfront</p>
                      <p className="font-medium">
                        {formatCurrency(neg.proposedUpfront)}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Milestones</p>
                      <p className="font-medium">
                        {formatCurrency(neg.proposedMilestones)}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs text-muted-foreground">
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
                  </div>

                  {neg.blockers.length > 0 && (
                    <p className="text-xs text-red-400">
                      {neg.blockers.length} blocker{neg.blockers.length > 1 ? "s" : ""}
                    </p>
                  )}
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <FolderOpen className="h-10 w-10 text-muted-foreground/50" />
            <p className="mt-3 text-sm text-muted-foreground">
              No workspaces found
            </p>
            <Button size="sm" className="mt-3">
              <Plus className="mr-2 h-4 w-4" /> Create Workspace
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
