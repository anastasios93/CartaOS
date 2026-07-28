"use client";

/**
 * Portfolio Overview — the run list (§7).
 *
 * This page used to host a second, complete copy of the orchestrator UI: its
 * own intake form, its own agent stream, its own results panel, all parallel to
 * the pillar pages. Two places to start a run meant two places to keep correct,
 * and the copy here wrote nothing a pillar page could reopen.
 *
 * It is now what the front door should be: every run the user has, what stage
 * each has reached, and the one link that continues it. The Run is the spine —
 * this is the list of spines.
 */

import { useMemo, useState } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { countryByCode } from "@/config/geographies";
import {
  ArrowRight,
  FlaskConical,
  Gauge,
  GitBranch,
  ListChecks,
  Search,
  Stethoscope,
} from "lucide-react";

const TINY = "text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70";

/**
 * Where a run goes next, by status. The label is an instruction, not a noun —
 * the point of this list is that every row tells you what to do with it.
 */
const NEXT_STEP: Record<
  string,
  { label: string; stage: string; href: (branch: string, id: string) => string; tone: string }
> = {
  draft: {
    label: "Finish the diagnosis",
    stage: "Draft",
    tone: "bg-muted text-muted-foreground",
    href: (b) => (b === "innovative" ? "/diagnosis/innovative" : "/diagnosis"),
  },
  diagnosis_running: {
    label: "Diagnosis was interrupted — run it again",
    stage: "Interrupted",
    tone: "bg-red-500/10 text-red-700",
    href: (b) => (b === "innovative" ? "/diagnosis/innovative" : "/diagnosis"),
  },
  diagnosed: {
    label: "Model the strategy",
    stage: "Diagnosed",
    tone: "bg-[#F97316]/15 text-[#C2410C]",
    href: (b) => (b === "innovative" ? "/strategy/innovative" : "/strategy"),
  },
  strategy_running: {
    label: "Strategy was interrupted — run it again",
    stage: "Interrupted",
    tone: "bg-red-500/10 text-red-700",
    href: (b) => (b === "innovative" ? "/strategy/innovative" : "/strategy"),
  },
  strategized: {
    label: "Build the execution plan",
    stage: "Strategised",
    tone: "bg-[#F97316]/15 text-[#C2410C]",
    href: (b) => (b === "innovative" ? "/execution/innovative" : "/execution"),
  },
  execution_running: {
    label: "Planning was interrupted — run it again",
    stage: "Interrupted",
    tone: "bg-red-500/10 text-red-700",
    href: (b) => (b === "innovative" ? "/execution/innovative" : "/execution"),
  },
  complete: {
    label: "Open the workspace",
    stage: "In execution",
    tone: "bg-[#EA580C]/15 text-[#C2410C]",
    href: (_b, id) => `/workspace/${id}`,
  },
  error: {
    label: "This run failed — start it again",
    stage: "Failed",
    tone: "bg-red-500/10 text-red-700",
    href: (b) => (b === "innovative" ? "/diagnosis/innovative" : "/diagnosis"),
  },
};

function stepFor(status: string) {
  return NEXT_STEP[status] ?? NEXT_STEP.draft;
}

function geoLine(codes: string[]): string {
  const shown = codes.slice(0, 6).map((c) => countryByCode(c)?.flag ?? c);
  return `${shown.join(" ")}${codes.length > 6 ? ` +${codes.length - 6}` : ""}`;
}

function StatTile({ value, label }: { value: number; label: string }) {
  return (
    <div className="rounded-xl border border-border bg-white px-4 py-3">
      <p className="text-2xl font-bold font-mono tabular-nums text-[#1A1A2E]">{value}</p>
      <p className={TINY}>{label}</p>
    </div>
  );
}

export default function PortfolioOverviewPage() {
  const runsQuery = trpc.run.list.useQuery({ limit: 50 }, { refetchOnWindowFocus: false });
  const [query, setQuery] = useState("");

  const runs = useMemo(() => runsQuery.data ?? [], [runsQuery.data]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return runs;
    return runs.filter((r) => r.assetQuery.toLowerCase().includes(q));
  }, [runs, query]);

  const counts = useMemo(
    () => ({
      total: runs.length,
      diagnosed: runs.filter((r) => r.status === "diagnosed").length,
      strategised: runs.filter((r) => r.status === "strategized").length,
      executing: runs.filter((r) => r.status === "complete").length,
    }),
    [runs],
  );

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-[#1A1A2E]">Portfolio Overview</h1>
          <p className="text-[13px] text-muted-foreground mt-1 max-w-2xl leading-relaxed">
            Every asset you have put through the pillars, and what each one is waiting on. A run carries its
            diagnosis, its strategy and its plan on one object — open it wherever it stopped.
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/diagnosis"
            className="inline-flex items-center gap-1.5 rounded-lg bg-[#F97316] px-3.5 py-2 text-[12px] font-semibold text-white transition hover:bg-[#EA580C] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F97316]/50"
          >
            <Stethoscope className="h-3.5 w-3.5" aria-hidden="true" />
            Diagnose an off-patent asset
          </Link>
          <Link
            href="/diagnosis/innovative"
            className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-white px-3.5 py-2 text-[12px] font-semibold text-[#1A1A2E] transition hover:border-[#F97316] hover:text-[#C2410C] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F97316]/50"
          >
            <FlaskConical className="h-3.5 w-3.5" aria-hidden="true" />
            Innovative
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatTile value={counts.total} label="Runs" />
        <StatTile value={counts.diagnosed} label="Awaiting strategy" />
        <StatTile value={counts.strategised} label="Awaiting a plan" />
        <StatTile value={counts.executing} label="In execution" />
      </div>

      {runs.length > 0 && (
        <div className="relative">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <label htmlFor="run-search" className="sr-only">
            Search runs by asset
          </label>
          <input
            id="run-search"
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by asset…"
            className="w-full rounded-lg border border-border bg-white py-2 pl-9 pr-3 text-[13px] outline-none transition focus-visible:border-[#F97316] focus-visible:ring-2 focus-visible:ring-[#F97316]/40"
          />
        </div>
      )}

      {runsQuery.isLoading ? (
        <div className="space-y-2">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-[76px] animate-pulse rounded-xl border border-border bg-muted/40" />
          ))}
        </div>
      ) : runsQuery.isError ? (
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-[13px] text-red-700">Your runs could not be loaded. Reload the page to try again.</p>
          </CardContent>
        </Card>
      ) : runs.length === 0 ? (
        <Card>
          <CardContent className="py-14 text-center">
            <Gauge className="mx-auto h-8 w-8 text-muted-foreground/40" aria-hidden="true" />
            <p className="mt-3 text-[14px] font-medium text-[#1A1A2E]">No runs yet</p>
            <p className="mx-auto mt-1 max-w-md text-[13px] text-muted-foreground leading-relaxed">
              Everything starts with a diagnosis — whether the asset is worth pursuing at all. Strategy and Execution
              read from it, so they cannot be entered cold.
            </p>
            <Link
              href="/diagnosis"
              className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-[#F97316] px-3.5 py-2 text-[12px] font-semibold text-white transition hover:bg-[#EA580C]"
            >
              Run your first diagnosis
              <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
            </Link>
          </CardContent>
        </Card>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center">
            <p className="text-[13px] text-muted-foreground">No run matches “{query}”.</p>
          </CardContent>
        </Card>
      ) : (
        <ul className="space-y-2">
          {filtered.map((run) => {
            const step = stepFor(run.status);
            const Icon = run.assetType === "innovative" ? FlaskConical : Gauge;
            return (
              <li key={run.id}>
                <Link
                  href={step.href(run.assetType, run.id)}
                  className="group flex flex-wrap items-center gap-x-4 gap-y-2 rounded-xl border border-border bg-white px-4 py-3.5 transition hover:border-[#F97316] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F97316]/50"
                >
                  <Icon className="h-4 w-4 shrink-0 text-[#C2410C]" aria-hidden="true" />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[14px] font-semibold text-[#1A1A2E]">{run.assetQuery}</span>
                      <span className={TINY}>{run.assetType === "innovative" ? "Innovative" : "Off-patent"}</span>
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${step.tone}`}>
                        {step.stage}
                      </span>
                    </div>
                    <p className="mt-0.5 text-[12px] text-muted-foreground">
                      {geoLine(run.geographies)} · started {new Date(run.createdAt).toLocaleDateString("en-GB")}
                    </p>
                  </div>
                  <span className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-[#C2410C]">
                    {step.label}
                    <ArrowRight className="h-3.5 w-3.5 transition group-hover:translate-x-0.5" aria-hidden="true" />
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}

      <div className="grid gap-3 sm:grid-cols-3">
        {[
          { href: "/diagnosis", icon: Stethoscope, title: "Diagnosis", body: "Is this asset worth pursuing?" },
          { href: "/strategy", icon: GitBranch, title: "Strategy", body: "Which route realises the value?" },
          { href: "/execution", icon: ListChecks, title: "Execution", body: "Who does what, by when?" },
        ].map((p) => (
          <Link
            key={p.href}
            href={p.href}
            className="rounded-xl border border-border bg-white p-4 transition hover:border-[#F97316] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F97316]/50"
          >
            <p.icon className="h-4 w-4 text-[#C2410C]" aria-hidden="true" />
            <p className="mt-2 text-[13px] font-semibold text-[#1A1A2E]">{p.title}</p>
            <p className="text-[12px] text-muted-foreground leading-relaxed">{p.body}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
