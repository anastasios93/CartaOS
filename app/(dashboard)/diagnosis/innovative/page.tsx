"use client";

/**
 * Pillar 1 — Diagnosis, branch 1B (innovative). The branch ships in the next
 * phase with its own dimension set, source routing and prompts (§4.2, §7) —
 * this page states that honestly instead of presenting a dead control.
 */

import Link from "next/link";
import { INNOVATIVE_DIMENSIONS } from "@/config/dimensions";
import { Microscope, ArrowRight } from "lucide-react";

export default function InnovativeDiagnosisPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-[#1A1A2E] flex items-center gap-2">
          <Microscope className="h-6 w-6 text-[#F97316]" />
          Diagnosis — Innovative
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Market worthiness for novel compounds — science, IP and partnerability weighted.
        </p>
      </div>

      <div className="rounded-2xl border-2 border-dashed border-border/60 bg-[#FAFAFA] p-8 text-center">
        <p className="text-[15px] font-semibold text-[#1A1A2E]">This branch is being built next.</p>
        <p className="text-[13px] text-muted-foreground mt-1 max-w-xl mx-auto">
          The innovative engine uses a different question set from off-patent — no shared dimensions, sources or
          prompts. Off-patent diagnoses are live today.
        </p>
        <Link
          href="/diagnosis"
          className="inline-flex items-center gap-2 mt-4 px-5 h-10 rounded-lg bg-[#F97316] hover:bg-[#EA580C] text-white text-[13px] font-semibold transition-colors"
        >
          Run an off-patent diagnosis <ArrowRight className="h-4 w-4" />
        </Link>
      </div>

      <div className="rounded-xl border border-border/40 bg-white p-5">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70 mb-3">
          The dimensions this branch will score
        </p>
        <ul className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2">
          {INNOVATIVE_DIMENSIONS.map((d) => (
            <li key={d.key} className="text-[13px] text-[#1A1A2E] leading-snug">
              <span className="font-medium">{d.label}</span>
              <span className="text-muted-foreground"> — {d.question.split(",")[0].split(";")[0]}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
