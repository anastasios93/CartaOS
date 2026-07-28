"use client";

/**
 * Deal Workspace — the home of the EXECUTION pillar.
 *
 * A workspace is not its own object: it is a Run that has got far enough to have
 * something to execute. So this list is `run.list` filtered to the two statuses
 * that mean "there is a strategy behind this" — `strategized` (a plan can be
 * built) and `complete` (a plan exists and is being tracked).
 *
 * `run.list` deliberately does not select the strategy/execution payloads, so
 * there is no plan progress to show here. Rather than invent a percentage, the
 * card shows the run's status and defers the detail to the workspace itself.
 */

import { useMemo, useState } from "react";
import Link from "next/link";
import { trpc } from "@/lib/trpc";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { countryByCode } from "@/config/geographies";
import {
  ArrowRight,
  ArrowUpRight,
  CheckCircle2,
  Clock,
  FolderKanban,
  ListChecks,
  Search,
} from "lucide-react";

const TINY = "text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70";

/** The only two run statuses that carry a workspace. */
const WORKSPACE_STATUSES = ["strategized", "complete"] as const;
type WorkspaceStatus = (typeof WORKSPACE_STATUSES)[number];

const STATUS_META: Record<WorkspaceStatus, { label: string; className: string }> = {
  strategized: {
    label: "Awaiting plan",
    className: "border-[#F97316]/50 bg-[#FFF7ED] text-[#C2410C]",
  },
  complete: {
    label: "In execution",
    className: "border-emerald-300 bg-emerald-50 text-emerald-800",
  },
};

const ASSET_TYPE_LABEL: Record<string, string> = {
  off_patent: "Off-patent",
  innovative: "Innovative",
};

function geoLine(codes: string[]): string {
  const shown = codes.slice(0, 5).map((c) => countryByCode(c)?.flag ?? c);
  return `${shown.join(" ")}${codes.length > 5 ? ` +${codes.length - 5}` : ""}`;
}

function StatTile({
  icon: Icon,
  value,
  label,
  tint,
}: {
  icon: typeof FolderKanban;
  value: number;
  label: string;
  tint: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <div
        className="flex h-9 w-9 items-center justify-center rounded-lg"
        style={{ backgroundColor: `${tint}1A` }}
      >
        <Icon className="h-4 w-4" style={{ color: tint }} aria-hidden="true" />
      </div>
      <div>
        <p className="text-lg font-bold font-mono tabular-nums text-[#1A1A2E]">{value}</p>
        <p className={TINY}>{label}</p>
      </div>
    </div>
  );
}

export default function WorkspacesPage() {
  const runs = trpc.run.list.useQuery({ limit: 50 });
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<string>("all");

  const workspaces = useMemo(
    () => (runs.data ?? []).filter((r) => (WORKSPACE_STATUSES as readonly string[]).includes(r.status)),
    [runs.data],
  );

  const filtered = useMemo(
    () =>
      workspaces.filter((r) => {
        const matchesSearch =
          !search || r.assetQuery.toLowerCase().includes(search.toLowerCase());
        const matchesStatus = status === "all" || r.status === status;
        return matchesSearch && matchesStatus;
      }),
    [workspaces, search, status],
  );

  const inExecution = workspaces.filter((r) => r.status === "complete").length;
  const awaitingPlan = workspaces.filter((r) => r.status === "strategized").length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#1A1A2E] flex items-center gap-2">
            <FolderKanban className="h-6 w-6 text-[#F97316]" aria-hidden="true" />
            Deal Workspace
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Every run that has a strategy behind it — track the plan, and the negotiation it feeds.
          </p>
        </div>
        {/* A workspace is not created here; it comes from planning a strategised run. */}
        <Link
          href="/execution"
          className="inline-flex items-center gap-2 h-10 px-5 rounded-lg bg-[#F97316] hover:bg-[#EA580C] text-white text-[14px] font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F97316]/50"
        >
          Build a plan
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      </div>

      {/* Stats bar */}
      <div className="flex flex-wrap items-center gap-6 rounded-xl border border-border/40 bg-white p-4 shadow-sm">
        <StatTile icon={FolderKanban} value={workspaces.length} label="Workspaces" tint="#F97316" />
        <div className="h-8 w-px bg-border/40" />
        <StatTile icon={CheckCircle2} value={inExecution} label="In execution" tint="#10B981" />
        <div className="h-8 w-px bg-border/40" />
        <StatTile icon={Clock} value={awaitingPlan} label="Awaiting plan" tint="#C2410C" />
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[220px]">
          <Search
            className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <Input
            placeholder="Search by asset..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-9 border-border/40 bg-white"
            aria-label="Search workspaces by asset"
          />
        </div>
        <Select value={status} onValueChange={(v) => setStatus(v ?? "all")}>
          <SelectTrigger className="w-[200px] h-9 border-border/40 bg-white">
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {WORKSPACE_STATUSES.map((s) => (
              <SelectItem key={s} value={s}>
                {STATUS_META[s].label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Cards */}
      {runs.isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-40" />
          ))}
        </div>
      ) : runs.error ? (
        <Card className="border-border/40 shadow-sm">
          <CardContent className="py-10 text-center">
            <p className="text-sm font-medium text-[#1A1A2E]">Could not load workspaces</p>
            <p className="text-xs text-muted-foreground mt-1">{runs.error.message}</p>
          </CardContent>
        </Card>
      ) : filtered.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((run) => {
            const meta = STATUS_META[run.status as WorkspaceStatus];
            return (
              <Link key={run.id} href={`/workspace/${run.id}`} className="group">
                <Card className="h-full border-border/40 bg-white shadow-sm transition-all hover:shadow-md hover:border-border/60 hover:-translate-y-0.5">
                  <CardContent className="p-5 space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <p className="text-[15px] font-semibold text-[#1A1A2E] leading-snug truncate group-hover:text-[#C2410C] transition-colors">
                        {run.assetQuery}
                      </p>
                      <ArrowUpRight
                        className="h-4 w-4 shrink-0 text-muted-foreground/30 group-hover:text-[#F97316] transition-colors"
                        aria-hidden="true"
                      />
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-md border border-border/60 bg-[#FAFAFA] px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-[#1A1A2E]">
                        {ASSET_TYPE_LABEL[run.assetType] ?? run.assetType}
                      </span>
                      <span
                        className={`rounded-md border px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest ${meta?.className ?? "border-border/60 bg-[#FAFAFA] text-[#1A1A2E]"}`}
                      >
                        {meta?.label ?? run.status}
                      </span>
                    </div>

                    <p className="text-[12px] text-[#1A1A2E]">{geoLine(run.geographies)}</p>

                    <p className="text-[11px] text-muted-foreground">
                      Started {new Date(run.createdAt).toLocaleDateString()}
                    </p>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      ) : (
        <Card className="border-border/40 shadow-sm">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#F97316]/10 mb-4">
              <ListChecks className="h-7 w-7 text-[#F97316]" aria-hidden="true" />
            </div>
            {workspaces.length > 0 ? (
              <>
                <p className="text-sm font-medium text-[#1A1A2E]">
                  No workspace matches those filters
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {workspaces.length} workspace{workspaces.length === 1 ? "" : "s"} exist — widen the
                  search or clear the status filter.
                </p>
              </>
            ) : (
              <>
                <p className="text-sm font-medium text-[#1A1A2E]">No workspaces yet</p>
                <p className="text-xs text-muted-foreground mt-1 max-w-md leading-relaxed">
                  A workspace opens once a run has a strategy behind it. Model a strategy first, then
                  build the execution plan for the route you commit to.
                </p>
                <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
                  <Link
                    href="/strategy"
                    className="inline-flex items-center gap-2 h-10 px-5 rounded-lg bg-[#F97316] hover:bg-[#EA580C] text-white text-[14px] font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F97316]/50"
                  >
                    Model a strategy
                    <ArrowRight className="h-4 w-4" aria-hidden="true" />
                  </Link>
                  <Link
                    href="/execution"
                    className="inline-flex items-center gap-2 h-10 px-5 rounded-lg border border-border bg-white text-[14px] font-medium text-[#1A1A2E] transition hover:border-[#F97316] hover:text-[#C2410C] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F97316]/50"
                  >
                    Then build a plan
                  </Link>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
