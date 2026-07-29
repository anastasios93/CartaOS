"use client";

/**
 * Free-text criteria that refine a run.
 *
 * This is an INPUT, not an annotation: whatever is written here is passed to the
 * agents as additional context, so it shapes what they look for and how they
 * weigh what they find. It is captured before the run, stored on the Run so a
 * reopened run shows what it was actually asked, and shown read-only afterwards
 * because editing it later would not change a search that has already happened.
 *
 * It is deliberately kept out of the diagnosis and strategy envelopes, which is
 * what the exporters read — so the brief itself never appears in a PDF or a
 * deck, even though its influence does.
 */

import { Search } from "lucide-react";

const TINY = "text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70";

export const REFINEMENT_MAX = 4000;

export interface CriteriaRefinementInputProps {
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
  /** What this pillar is actually searching, so the hint is not generic. */
  placeholder?: string;
}

export function CriteriaRefinementInput({
  value,
  onChange,
  disabled,
  placeholder,
}: CriteriaRefinementInputProps) {
  return (
    <div>
      <label htmlFor="run-refinement" className={`block ${TINY} mb-1.5`}>
        Additional search criteria <span className="normal-case tracking-normal">(optional)</span>
      </label>
      <p className="text-[12px] text-muted-foreground leading-relaxed mb-2 max-w-3xl">
        Free text that narrows or steers the search — the angle you care about, constraints to respect, things to
        prioritise or ignore. It is read by the engines as part of the brief.{" "}
        <span className="font-medium text-[#1A1A2E]">It is never printed in the PDF or the PowerPoint.</span>
      </p>
      <textarea
        id="run-refinement"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        rows={4}
        maxLength={REFINEMENT_MAX}
        placeholder={
          placeholder ??
          "e.g. focus on hospital tender channels, ignore US retail; we already hold the German MA; only partners who can supply their own API"
        }
        className="w-full rounded-lg border border-border bg-white px-3 py-2 text-[13px] leading-relaxed outline-none transition focus-visible:border-[#F97316] focus-visible:ring-2 focus-visible:ring-[#F97316]/40 disabled:opacity-60"
      />
      <p className="mt-1 text-[11px] text-muted-foreground">
        {value.length.toLocaleString()} / {REFINEMENT_MAX.toLocaleString()}
      </p>
    </div>
  );
}

/** What a stored run was asked, shown when it is reopened. */
export function CriteriaRefinementSummary({ text }: { text: string }) {
  if (!text.trim()) return null;
  return (
    <section className="rounded-xl border border-border bg-[#FAFAFA] p-4">
      <p className={`${TINY} flex items-center gap-1.5 mb-1.5`}>
        <Search className="h-3.5 w-3.5" aria-hidden="true" /> Search criteria used for this run
      </p>
      <p className="text-[13px] text-[#1A1A2E] leading-relaxed whitespace-pre-wrap">{text}</p>
      <p className="mt-2 text-[11px] text-muted-foreground">
        Shaped what the engines looked for. Not included in any export.
      </p>
    </section>
  );
}
