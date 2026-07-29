/**
 * The free-text criteria box steers a run: it is handed to the agents as part
 * of the brief, so its influence shows up in the results. The text itself must
 * not. That promise is made in the UI copy ("never printed in the PDF or the
 * PowerPoint"), so it needs enforcing by something other than everyone
 * remembering.
 *
 * The guarantee is structural: the brief is stored on `Run.notes`, and the
 * exporters take the Diagnosis and Strategy envelopes. For the brief to leak,
 * someone would have to teach the exporters about a field they have no reason
 * to know exists — which is what these tests fail on.
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const read = (p: string) => readFileSync(join(__dirname, "..", p), "utf8");

describe("the run brief never reaches an export", () => {
  it("the exporters never read the run's brief", () => {
    const source = read("lib/exports.ts");
    // `.notes` on a milestone is a different, exportable thing (part of the
    // execution plan). What must never appear is the run-level brief.
    expect(source).not.toMatch(/\brun\.notes\b/);
    expect(source).not.toMatch(/criteria-refinement/);
    expect(source).not.toMatch(/CriteriaRefinement/);
  });

  it("keeps the brief out of the diagnosis and strategy envelopes", () => {
    expect(read("prisma/schema.prisma")).toMatch(/^\s*notes\s+Json\?/m);

    // These schemas are exactly what the exporters consume — if the brief were
    // ever added to either, it would be exported for free.
    const runTypes = read("types/run.ts");
    const slice = (from: string, to: string) =>
      runTypes.slice(runTypes.indexOf(from), runTypes.indexOf(to));
    expect(slice("export const DiagnosisSchema", "export type Diagnosis ")).not.toMatch(/\bnotes\b/);
    expect(slice("export const StrategySchema", "export type Strategy ")).not.toMatch(/\bnotes\b/);
  });
});

describe("the brief actually reaches the agents", () => {
  it("diagnosis sends the box's text as run context, not an empty string", () => {
    const shell = read("components/run/diagnosis-shell.tsx");
    expect(shell).toContain("CriteriaRefinementInput");
    // The regression this guards: `context: ""` was hardcoded, so the field the
    // intake schema and the agent both already supported could never be set.
    expect(shell).toMatch(/context:\s*refinement\.trim\(\)/);
    expect(shell).not.toMatch(/context:\s*""/);
  });

  it("the off-patent assessment agent reads that context", () => {
    expect(read("server/agents/out-licensing-strategy.ts")).toMatch(/intake\.context/);
  });

  it("both endpoints persist the brief onto the run", () => {
    expect(read("app/api/orchestrator/route.ts")).toMatch(/notes:\s*\(intake\.context/);
    const strategy = read("app/api/run/strategy/route.ts");
    expect(strategy).toContain("body.context.trim()");
    // Merged, so a strategy brief cannot wipe the diagnosis one.
    expect(strategy).toMatch(/\.\.\.existingNotes/);
  });
});
