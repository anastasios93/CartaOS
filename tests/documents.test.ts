import { describe, expect, it } from "vitest";
import ExcelJS from "exceljs";
import JSZip from "jszip";
import { Document, Packer, Paragraph, TextRun } from "docx";
import { extractDocuments } from "../server/services/ingest/documents";
import {
  criteriaToSearchCriteria,
  searchCriteriaToCriteria,
} from "../server/services/ingest/run-criteria";
import type { Criterion } from "../types/run";

// Fixtures are generated in-test with the same libraries the app ships, so the
// suite round-trips real file formats without binary blobs in git.

async function makeXlsx(): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Portfolio");
  ws.addRow(["Molecule", "Geography", "Priority"]);
  ws.addRow(["atorvastatin", "Germany", 80]);
  ws.addRow(["metformin", "India", 60]);
  return Buffer.from(await wb.xlsx.writeBuffer());
}

async function makeDocx(): Promise<Buffer> {
  const doc = new Document({
    sections: [
      {
        children: [
          new Paragraph({ children: [new TextRun("Assessment brief")] }),
          new Paragraph({ children: [new TextRun("Focus compounds: atorvastatin and simvastatin.")] }),
        ],
      },
    ],
  });
  return Packer.toBuffer(doc);
}

describe("extractDocuments", () => {
  it("reads xlsx into sheet-located segments", async () => {
    const { docs, errors } = await extractDocuments([{ fileName: "portfolio.xlsx", buffer: await makeXlsx() }]);
    expect(errors).toEqual([]);
    expect(docs).toHaveLength(1);
    const seg = docs[0].segments![0];
    expect(seg.location).toBe('sheet "Portfolio"');
    expect(seg.text).toContain("atorvastatin\tGermany\t80");
  });

  it("reads docx paragraphs", async () => {
    const { docs, errors } = await extractDocuments([{ fileName: "brief.docx", buffer: await makeDocx() }]);
    expect(errors).toEqual([]);
    expect(docs[0].segments!.map((s) => s.text).join("\n")).toContain("atorvastatin and simvastatin");
  });

  it("passes PDFs through as binary for native model reading", async () => {
    const { docs, errors } = await extractDocuments([{ fileName: "doc.pdf", buffer: Buffer.from("%PDF-1.4 fake") }]);
    expect(errors).toEqual([]);
    expect(docs[0].binary).toMatchObject({ kind: "pdf", mediaType: "application/pdf" });
  });

  it("flattens zip archives one level deep", async () => {
    const zip = new JSZip();
    zip.file("notes.txt", "tender-driven markets preferred");
    zip.file("data.csv", "molecule,geo\natorvastatin,DE");
    const buffer = Buffer.from(await zip.generateAsync({ type: "nodebuffer" }));
    const { docs, errors } = await extractDocuments([{ fileName: "bundle.zip", buffer }]);
    expect(errors).toEqual([]);
    expect(docs.map((d) => d.fileName).sort()).toEqual(["bundle.zip/data.csv", "bundle.zip/notes.txt"]);
  });

  it("rejects legacy .doc with an actionable message instead of a silent parse", async () => {
    const { docs, errors } = await extractDocuments([{ fileName: "old.doc", buffer: Buffer.from("junk") }]);
    expect(docs).toEqual([]);
    expect(errors[0].actionable).toMatch(/Save the file as \.docx/);
  });

  it("rejects TIFF (model reads png/jpeg/webp/gif only)", async () => {
    const { errors } = await extractDocuments([{ fileName: "scan.tiff", buffer: Buffer.from("II*") }]);
    expect(errors[0].actionable).toMatch(/PNG or JPEG/);
  });

  it("one bad file never sinks the batch", async () => {
    const { docs, errors } = await extractDocuments([
      { fileName: "ok.txt", buffer: Buffer.from("hello") },
      { fileName: "bad.xyz", buffer: Buffer.from("???") },
    ]);
    expect(docs).toHaveLength(1);
    expect(errors).toHaveLength(1);
  });
});

describe("criteria bridges", () => {
  const mk = (over: Partial<Criterion>): Criterion => ({
    id: "c1",
    category: "other",
    value: "",
    weight: 50,
    ...over,
  });

  it("maps criteria onto the legacy SearchCriteria shape", () => {
    const sc = criteriaToSearchCriteria([
      mk({ category: "compound", value: "atorvastatin" }),
      mk({ category: "geography", value: "Germany" }),
      mk({ category: "geography", value: "EU" }),
      mk({ category: "lever_weight", value: "Reimbursement / pricing: 80" }),
      mk({ category: "lever_weight", value: "Made-up lever: 90" }),
      mk({ category: "constraint", value: "no injectables" }),
    ]);
    expect(sc.assets).toEqual(["atorvastatin"]);
    expect(sc.geographies).toContain("DE");
    expect(sc.geographies).toEqual(expect.arrayContaining(["DE", "FR", "IT", "ES"]));
    expect(sc.leverWeights).toEqual([{ lever: "Reimbursement / pricing", weight: 80 }]);
    expect(sc.constraints).toEqual(["no injectables"]);
  });

  it("round-trips legacy SearchCriteria into provenance-tagged criteria", () => {
    const criteria = searchCriteriaToCriteria(
      { assets: ["metformin"], geographies: ["IN"], leverWeights: [], constraints: ["oral only"] },
      "brief.pdf"
    );
    expect(criteria.find((c) => c.category === "compound")?.value).toBe("metformin");
    expect(criteria.every((c) => c.provenance?.fileName === "brief.pdf")).toBe(true);
  });
});
