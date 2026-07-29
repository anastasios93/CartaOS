/**
 * The whole point of the notes field is that it stays in the app. That promise
 * is made in the UI copy ("never included in the PDF or the PowerPoint"), so it
 * needs to be enforced by something other than everyone remembering.
 *
 * It is structural: notes live in their own `Run.notes` column, and the
 * exporters take the Diagnosis and Strategy envelopes. For notes to leak,
 * someone would have to teach the exporters about a field they have no reason
 * to know exists — which is exactly what these tests fail on.
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const read = (p: string) => readFileSync(join(__dirname, "..", p), "utf8");

describe("run notes never reach an export", () => {
  it("the exporters never mention notes at all", () => {
    const source = read("lib/exports.ts");
    // `.notes` on a milestone is a different, exportable thing (part of the
    // execution plan). What must never appear is the run-level notes payload.
    expect(source).not.toMatch(/\brun\.notes\b/);
    expect(source).not.toMatch(/\bRunNotes\b/);
    expect(source).not.toMatch(/updateNotes/);
  });

  it("the notes component is never imported by the export layer", () => {
    expect(read("lib/exports.ts")).not.toContain("run-notes");
  });

  it("keeps notes in their own column, out of the diagnosis and strategy envelopes", () => {
    const schema = read("prisma/schema.prisma");
    expect(schema).toMatch(/^\s*notes\s+Json\?/m);

    // If notes were ever added to either envelope, the exporters would pick
    // them up for free — these schemas are what the exporters consume.
    const runTypes = read("types/run.ts");
    const diagnosis = runTypes.slice(
      runTypes.indexOf("export const DiagnosisSchema"),
      runTypes.indexOf("export type Diagnosis "),
    );
    const strategy = runTypes.slice(
      runTypes.indexOf("export const StrategySchema"),
      runTypes.indexOf("export type Strategy "),
    );
    expect(diagnosis).not.toMatch(/\bnotes\b/);
    expect(strategy).not.toMatch(/\bnotes\b/);
  });

  it("only the run router may write notes, and only owner-scoped", () => {
    const router = read("server/routers/run.ts");
    expect(router).toContain("updateNotes");
    // The mutation must load the run through the owner scope before writing.
    const fn = router.slice(router.indexOf("updateNotes:"), router.indexOf("updateMilestone:"));
    expect(fn).toContain("getOwnerScope");
    expect(fn).toContain("protectedProcedure");
  });
});
