"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { AgentResult, DealComparable } from "@/types/hub";

export function BenchmarkingResults({ data }: { data: Extract<AgentResult, { agentId: "benchmarking" }> }) {
  const { comparables } = data;
  if (!comparables.length) return <p className="text-xs text-[#64748B]">No comparable deals found.</p>;

  return (
    <div className="space-y-2">
      <p className="text-xs font-medium text-[#94A3B8]">{comparables.length} comparable deals</p>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="text-[#64748B] border-b border-[#1E293B]">
              <th className="text-left py-1.5 pr-3 font-medium">Deal</th>
              <th className="text-right py-1.5 px-2 font-medium">Upfront</th>
              <th className="text-right py-1.5 px-2 font-medium">Total</th>
              <th className="text-right py-1.5 pl-2 font-medium">Royalty</th>
            </tr>
          </thead>
          <tbody>
            {comparables.map((c: DealComparable, i: number) => (
              <tr key={i} className="border-b border-[#1E293B]/50 hover:bg-[#1E293B]/30 transition">
                <td className="py-2 pr-3">
                  <div className="text-[#F1F5F9] font-medium">{c.dealName}</div>
                  <div className="text-[#64748B]">{c.stage} &middot; {c.indication} &middot; {c.date}</div>
                </td>
                <td className="text-right py-2 px-2 text-[#F1F5F9] font-mono">{c.upfront}</td>
                <td className="text-right py-2 px-2 text-[#F1F5F9] font-mono">{c.totalValue}</td>
                <td className="text-right py-2 pl-2 text-[#F1F5F9] font-mono">{c.royaltyRange}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Link
        href={`/benchmarks`}
        className="flex items-center justify-center gap-2 mt-3 px-4 py-2 rounded-lg bg-[#3B82F6]/10 text-[#60A5FA] text-xs font-medium hover:bg-[#3B82F6]/20 transition-colors"
      >
        View All Comparables
        <ArrowRight className="h-3 w-3" />
      </Link>
    </div>
  );
}
