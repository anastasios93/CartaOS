"use client";

/**
 * Evidence surfaces (§3.3): every generated figure is either Evidence (sourced)
 * or Estimate (model inference) — visually unmissable — and a dimension with no
 * connected source renders NoSourceState, never a fabricated number.
 */

import { FileText, ExternalLink, Unplug } from "lucide-react";
import type { Confidence, EvidenceItem } from "@/types/run";

// ── EvidenceBadge ────────────────────────────────────────────────────────────

const CONFIDENCE_DOT: Record<Confidence, { color: string; label: string }> = {
  high: { color: "#16A34A", label: "High confidence" },
  medium: { color: "#F97316", label: "Medium confidence" },
  low: { color: "#9CA3AF", label: "Low confidence" },
};

interface EvidenceBadgeProps {
  kind: "evidence" | "estimate";
  tier?: 1 | 2 | 3;
  confidence?: Confidence;
}

export function EvidenceBadge({ kind, tier, confidence }: EvidenceBadgeProps) {
  const dot = confidence ? CONFIDENCE_DOT[confidence] : null;
  return (
    <span className="inline-flex items-center gap-1 align-middle">
      {kind === "evidence" ? (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#1A1A2E] text-[10px] font-bold uppercase tracking-wider text-white">
          <FileText className="h-3 w-3" aria-hidden="true" />
          Evidence
        </span>
      ) : (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md border border-[#F97316] bg-white text-[10px] font-bold uppercase tracking-wider text-[#C2410C]">
          <span aria-hidden="true" className="text-[11px] leading-none font-mono">
            ≈
          </span>
          Estimate
        </span>
      )}
      {tier !== undefined && (
        <span
          className="px-1.5 py-0.5 rounded-md bg-[#F8F9FA] border border-border/40 text-[10px] font-mono font-bold text-muted-foreground"
          title={`Source tier ${tier}`}
        >
          T{tier}
        </span>
      )}
      {dot && (
        <span className="inline-flex items-center" title={dot.label}>
          <span
            className="h-2 w-2 rounded-full"
            style={{ backgroundColor: dot.color }}
            aria-hidden="true"
          />
          <span className="sr-only">{dot.label}</span>
        </span>
      )}
    </span>
  );
}

// ── EvidenceList ─────────────────────────────────────────────────────────────

export function EvidenceList({ items }: { items: EvidenceItem[] }) {
  if (items.length === 0) return null;
  return (
    <ul className="space-y-2">
      {items.map((item, i) => (
        <li
          key={i}
          className="rounded-xl border border-border/40 bg-white px-3 py-2.5"
        >
          <div className="flex items-start gap-2">
            <div className="shrink-0 pt-px">
              <EvidenceBadge kind={item.kind} tier={item.tier} confidence={item.confidence} />
            </div>
            <p className="flex-1 min-w-0 text-[12px] text-[#1A1A2E] leading-relaxed">
              {item.claim}
            </p>
          </div>
          {(item.source || item.publishedAt || item.accessedAt || item.url) && (
            <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-1.5 pl-0.5">
              {item.source && (
                <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70">
                  {item.source}
                </span>
              )}
              {item.publishedAt && (
                <span className="text-[10px] text-muted-foreground/70 font-mono">
                  published {item.publishedAt}
                </span>
              )}
              {item.accessedAt && (
                <span className="text-[10px] text-muted-foreground/70 font-mono">
                  accessed {item.accessedAt}
                </span>
              )}
              {item.url && (
                <a
                  href={item.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-0.5 text-[10px] font-medium text-[#C2410C] hover:text-[#EA580C] hover:underline underline-offset-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F97316]/50 rounded"
                >
                  <ExternalLink className="h-2.5 w-2.5" aria-hidden="true" />
                  source
                </a>
              )}
            </div>
          )}
        </li>
      ))}
    </ul>
  );
}

// ── NoSourceState ────────────────────────────────────────────────────────────

export function NoSourceState({
  sourceLabel,
  envKey,
}: {
  sourceLabel: string;
  envKey?: string;
}) {
  return (
    <div className="rounded-xl border-2 border-dashed border-border/60 bg-[#FAFAFA] px-4 py-3 flex items-start gap-3">
      <Unplug className="h-4 w-4 shrink-0 mt-0.5 text-muted-foreground/60" aria-hidden="true" />
      <div className="min-w-0">
        <p className="text-[12px] font-medium text-muted-foreground">
          No source connected — {sourceLabel}
        </p>
        {envKey && (
          <p className="text-[11px] text-muted-foreground/70 mt-0.5">
            Set <code className="font-mono text-[10px] px-1 py-px rounded bg-[#F8F9FA] border border-border/40 text-[#1A1A2E]">{envKey}</code>{" "}
            to enable this source (see API_KEYS.md)
          </p>
        )}
      </div>
    </div>
  );
}
