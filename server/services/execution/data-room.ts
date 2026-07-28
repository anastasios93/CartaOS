/**
 * Pillar 3 — the data-room generator (§6, Option C).
 *
 * Composes the document index a counterparty will ask for, and marks each item
 * with where it actually stands. Both halves are deterministic: the document
 * list comes from config/data-room.ts, and readiness comes from the execution
 * tracker's own milestone statuses. Nothing here is narrated, so the index can
 * never claim a document is ready because a model said so.
 *
 * The honest case matters most. An item whose category no workstream in the
 * plan covers is reported as `untracked` — not `outstanding`, and certainly not
 * ready. A generated index that quietly implies coverage it does not have is
 * worse than no index, because someone will take it to a counterparty.
 *
 * PURE and client-safe: no clock, no randomness, no server imports.
 */

import { dataRoomFor, type DataRoomItemDef } from "@/config/data-room";
import type { Milestone } from "@/types/run";

export type ItemReadiness = "ready" | "in_progress" | "blocked" | "outstanding" | "untracked";

export interface DataRoomItem extends DataRoomItemDef {
  readiness: ItemReadiness;
  /** Titles of the milestones this readiness was derived from. */
  evidence: string[];
}

export interface DataRoomSection {
  key: string;
  label: string;
  description: string;
  items: DataRoomItem[];
}

export interface DataRoomIndex {
  sections: DataRoomSection[];
  total: number;
  ready: number;
  outstanding: number;
  blocked: number;
  untracked: number;
  /**
   * Item categories with no matching workstream in the plan. Surfaced so the
   * gap is visible on the page, not just implicit in per-item states.
   */
  uncoveredWorkstreams: string[];
  percentReady: number;
}

/** "Market access & pricing" and "market-access" are the same workstream. */
function norm(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

/**
 * A plan workstream covers an item category when either name contains the
 * other. Deliberately loose in one direction only: "Regulatory" covers
 * "Regulatory affairs & submissions", but neither covers "Supply".
 */
function covers(workstream: string, category: string): boolean {
  const w = norm(workstream);
  const c = norm(category);
  if (!w || !c) return false;
  return w === c || w.includes(c) || c.includes(w);
}

/**
 * Readiness of a set of milestones, taken as the weakest link: a document is
 * only ready when everything producing it is done, and one blocked milestone
 * makes the whole item blocked. Optimism here would be the failure mode.
 */
function readinessOf(ms: Milestone[]): ItemReadiness {
  if (!ms.length) return "untracked";
  if (ms.some((m) => m.status === "blocked")) return "blocked";
  if (ms.every((m) => m.status === "done")) return "ready";
  if (ms.some((m) => m.status === "in_progress" || m.status === "done")) return "in_progress";
  return "outstanding";
}

export function buildDataRoom(
  branch: "off_patent" | "innovative",
  milestones: Milestone[],
  routeKey?: string,
): DataRoomIndex {
  const template = dataRoomFor(branch);
  const uncovered = new Set<string>();

  const sections: DataRoomSection[] = template.map((section) => ({
    key: section.key,
    label: section.label,
    description: section.description,
    items: section.items
      // A route-specific document on the wrong route is noise. With no route
      // known, keep everything rather than guess what to hide.
      .filter((item) => !item.routes || !routeKey || item.routes.includes(routeKey))
      .map((item) => {
        const matched = milestones.filter((m) => m.workstream && covers(m.workstream, item.workstream));
        if (!matched.length) uncovered.add(item.workstream);
        return {
          ...item,
          readiness: readinessOf(matched),
          evidence: matched.map((m) => m.title),
        };
      }),
  }));

  const all = sections.flatMap((s) => s.items);
  const count = (r: ItemReadiness) => all.filter((i) => i.readiness === r).length;
  const ready = count("ready");

  return {
    sections,
    total: all.length,
    ready,
    outstanding: count("outstanding"),
    blocked: count("blocked"),
    untracked: count("untracked"),
    uncoveredWorkstreams: [...uncovered].sort(),
    percentReady: all.length === 0 ? 0 : Math.round((ready / all.length) * 100),
  };
}

const READINESS_LABEL: Record<ItemReadiness, string> = {
  ready: "Ready",
  in_progress: "In progress",
  blocked: "Blocked",
  outstanding: "Not started",
  untracked: "Not tracked in this plan",
};

export function readinessLabel(r: ItemReadiness): string {
  return READINESS_LABEL[r];
}

/**
 * The index as a Markdown checklist — the format that pastes straight into the
 * shared drive or the counterparty's request list.
 */
export function dataRoomMarkdown(index: DataRoomIndex, assetName: string, routeLabel?: string): string {
  const lines: string[] = [
    `# Data room index — ${assetName}`,
    "",
    routeLabel ? `Prepared for: **${routeLabel}**` : "",
    `${index.ready} of ${index.total} documents ready (${index.percentReady}%).`,
    "",
    "Readiness is derived from the execution plan's milestone statuses. Items marked",
    "*not tracked* have no corresponding workstream in the plan — their status is unknown,",
    "not complete.",
    "",
  ];

  for (const section of index.sections) {
    if (!section.items.length) continue;
    lines.push(`## ${section.label}`, "", `_${section.description}_`, "");
    for (const item of section.items) {
      lines.push(`- [${item.readiness === "ready" ? "x" : " "}] **${item.title}** — ${readinessLabel(item.readiness)}`);
      lines.push(`  - ${item.purpose}`);
      if (item.evidence.length) lines.push(`  - Tracked by: ${item.evidence.join("; ")}`);
    }
    lines.push("");
  }

  if (index.uncoveredWorkstreams.length) {
    lines.push(
      "## Gaps in coverage",
      "",
      "No workstream in the execution plan covers these categories, so the documents",
      "under them are unassessed:",
      "",
      ...index.uncoveredWorkstreams.map((w) => `- ${w}`),
      "",
    );
  }

  return lines.filter((l) => l !== undefined).join("\n");
}
