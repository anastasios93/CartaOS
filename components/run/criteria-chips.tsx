"use client";

/**
 * Criteria review chips (§3.2): every extracted criterion is shown with its
 * provenance (file, location, snippet) and stays editable — value, weight,
 * delete — before the run. Extracted criteria are never applied silently.
 */

import { useState } from "react";
import { FileText, Plus, Trash2, PenLine, ShieldCheck } from "lucide-react";
import type { Criterion, CriterionCategory } from "@/types/run";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface CriteriaChipsProps {
  criteria: Criterion[];
  onChange: (next: Criterion[]) => void;
  disabled?: boolean;
}

const CATEGORY_LABELS: Record<CriterionCategory, string> = {
  compound: "Compound / INN",
  target: "Target",
  indication: "Indication",
  molecule_class: "Molecule class",
  dosage_form: "Dosage form",
  stage: "Stage",
  geography: "Geography",
  competitor: "Competitor",
  constraint: "Constraint",
  lever_weight: "Lever weight",
  other: "Other",
};

const CATEGORY_ORDER = Object.keys(CATEGORY_LABELS) as CriterionCategory[];

function newId(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `manual-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function CriteriaChips({ criteria, onChange, disabled }: CriteriaChipsProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Partial<Record<CriterionCategory, string>>>({});

  function update(id: string, patch: Partial<Criterion>) {
    onChange(criteria.map(c => (c.id === id ? { ...c, ...patch } : c)));
  }

  function remove(id: string) {
    if (expandedId === id) setExpandedId(null);
    onChange(criteria.filter(c => c.id !== id));
  }

  function add(category: CriterionCategory) {
    const value = (drafts[category] ?? "").trim();
    if (!value) return;
    onChange([...criteria, { id: newId(), category, value, weight: 50 }]);
    setDrafts(prev => ({ ...prev, [category]: "" }));
  }

  const groups = CATEGORY_ORDER.map(category => ({
    category,
    items: criteria.filter(c => c.category === category),
  }));

  return (
    <TooltipProvider>
      <div className="rounded-xl border border-border/40 bg-white p-4 space-y-4">
        <div className="flex items-start gap-2 rounded-lg bg-[#FFF7ED] border border-[#F97316]/20 px-3 py-2">
          <ShieldCheck className="h-4 w-4 shrink-0 mt-px text-[#C2410C]" aria-hidden="true" />
          <p className="text-[12px] text-[#9A3412] leading-relaxed">
            Extracted criteria are never used silently — review, edit and re-weight before running.
          </p>
        </div>

        {groups.map(({ category, items }) => (
          <div key={category}>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70 mb-1.5">
              {CATEGORY_LABELS[category]}
              {items.length > 0 && (
                <span className="ml-1.5 font-mono normal-case tracking-normal text-muted-foreground/60">
                  {items.length}
                </span>
              )}
            </p>

            <div className="flex flex-wrap items-center gap-1.5">
              {items.map(criterion => {
                const expanded = expandedId === criterion.id;
                return (
                  <div key={criterion.id} className={expanded ? "w-full" : ""}>
                    <div
                      className={`inline-flex items-center gap-1.5 pl-2.5 pr-1.5 py-1 rounded-lg border text-[12px] transition ${
                        expanded
                          ? "border-[#F97316]/50 bg-[#FFF7ED]"
                          : "border-border/60 bg-[#FAFAFA] hover:border-[#F97316]/40"
                      }`}
                    >
                      <button
                        type="button"
                        disabled={disabled}
                        onClick={() => setExpandedId(expanded ? null : criterion.id)}
                        aria-expanded={expanded}
                        aria-label={`Edit criterion ${criterion.value}`}
                        className="inline-flex items-center gap-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F97316]/50 rounded disabled:opacity-50 disabled:pointer-events-none"
                      >
                        <span className="font-medium text-[#1A1A2E] max-w-56 truncate">
                          {criterion.value}
                        </span>
                        <span className="px-1.5 py-px rounded-full bg-[#1A1A2E] text-white text-[10px] font-mono font-bold">
                          {criterion.weight}
                        </span>
                      </button>

                      {criterion.provenance ? (
                        <Tooltip>
                          <TooltipTrigger
                            render={
                              <button
                                type="button"
                                aria-label={`Provenance: extracted from ${criterion.provenance.fileName}`}
                                className="rounded p-0.5 text-[#C2410C] hover:bg-[#F97316]/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F97316]/50"
                              >
                                <FileText className="h-3.5 w-3.5" aria-hidden="true" />
                              </button>
                            }
                          />
                          <TooltipContent className="max-w-72">
                            <div className="space-y-0.5 py-0.5">
                              <p className="font-semibold">
                                {criterion.provenance.fileName}
                                {criterion.provenance.location && (
                                  <span className="font-normal opacity-70">
                                    {" "}
                                    · {criterion.provenance.location}
                                  </span>
                                )}
                              </p>
                              {criterion.provenance.snippet && (
                                <p className="italic opacity-80 leading-snug">
                                  &ldquo;{criterion.provenance.snippet}&rdquo;
                                </p>
                              )}
                            </div>
                          </TooltipContent>
                        </Tooltip>
                      ) : (
                        <span
                          className="inline-flex items-center gap-0.5 text-[9px] font-semibold uppercase tracking-wider text-muted-foreground/60"
                          title="Added manually — no source file"
                        >
                          <PenLine className="h-2.5 w-2.5" aria-hidden="true" />
                          manual
                        </span>
                      )}
                    </div>

                    {expanded && (
                      <div className="mt-1.5 mb-1 rounded-lg border border-border/40 bg-[#FAFAFA] p-3 flex flex-wrap items-center gap-3">
                        <label className="flex-1 min-w-48">
                          <span className="block text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70 mb-1">
                            Value
                          </span>
                          <input
                            type="text"
                            value={criterion.value}
                            disabled={disabled}
                            onChange={e => update(criterion.id, { value: e.target.value })}
                            className="w-full h-8 px-2.5 rounded-lg bg-white border border-border text-[12px] text-[#1A1A2E] focus:border-[#F97316] outline-none transition disabled:opacity-50"
                          />
                        </label>
                        <label className="flex-1 min-w-44">
                          <span className="block text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70 mb-1">
                            Weight · <span className="font-mono">{criterion.weight}</span>
                          </span>
                          <input
                            type="range"
                            min={0}
                            max={100}
                            value={criterion.weight}
                            disabled={disabled}
                            onChange={e => update(criterion.id, { weight: Number(e.target.value) })}
                            className="w-full accent-[#F97316] disabled:opacity-50"
                            aria-label={`Weight for ${criterion.value}, 0 to 100`}
                          />
                        </label>
                        <button
                          type="button"
                          disabled={disabled}
                          onClick={() => remove(criterion.id)}
                          aria-label={`Delete criterion ${criterion.value}`}
                          className="inline-flex items-center gap-1 self-end mb-1 rounded-lg border border-border px-2.5 py-1.5 text-[11px] font-semibold text-[#1A1A2E] transition hover:border-red-300 hover:bg-red-50 hover:text-red-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F97316]/50 disabled:opacity-50 disabled:pointer-events-none"
                        >
                          <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                          Delete
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Add control per group */}
              <form
                className="inline-flex items-center gap-1"
                onSubmit={e => {
                  e.preventDefault();
                  add(category);
                }}
              >
                <input
                  type="text"
                  value={drafts[category] ?? ""}
                  disabled={disabled}
                  onChange={e => setDrafts(prev => ({ ...prev, [category]: e.target.value }))}
                  placeholder={`Add ${CATEGORY_LABELS[category].toLowerCase()}…`}
                  aria-label={`Add ${CATEGORY_LABELS[category]} criterion`}
                  className="h-7 w-40 px-2 rounded-lg bg-white border border-dashed border-border text-[11px] text-[#1A1A2E] placeholder-muted-foreground/50 focus:border-[#F97316] focus:border-solid outline-none transition disabled:opacity-50"
                />
                <button
                  type="submit"
                  disabled={disabled || !(drafts[category] ?? "").trim()}
                  aria-label={`Add to ${CATEGORY_LABELS[category]}`}
                  className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-border text-[#1A1A2E] transition hover:border-[#F97316]/50 hover:bg-[#FFF7ED] hover:text-[#C2410C] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F97316]/50 disabled:opacity-40 disabled:pointer-events-none"
                >
                  <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                </button>
              </form>
            </div>
          </div>
        ))}
      </div>
    </TooltipProvider>
  );
}
