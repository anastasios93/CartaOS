/**
 * POST /api/run/criteria — universal criteria upload (§3.2).
 *
 * Accepts multipart/form-data with one or more "files" entries (pdf, docx,
 * xlsx, csv, tsv, pptx, txt, md, json, xml, png, jpg, zip) or JSON {text}.
 * Extracts location-tagged content, turns it into reviewable Criterion[]
 * with provenance, and reports per-file failures explicitly.
 *
 * In-session only: files are processed in memory and never persisted.
 */

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { extractDocuments } from "@/server/services/ingest/documents";
import { extractRunCriteria } from "@/server/services/ingest/run-criteria";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

const MAX_FILES = 5;
const MAX_FILE_BYTES = 8 * 1024 * 1024;

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const inputs: { fileName: string; buffer: Buffer }[] = [];
    const rejected: { fileName: string; error: string; actionable: string }[] = [];

    const contentType = req.headers.get("content-type") ?? "";
    if (contentType.includes("multipart/form-data")) {
      const form = await req.formData();
      const files = form.getAll("files").filter((f): f is File => f instanceof File);
      if (!files.length) {
        return NextResponse.json({ error: "No files provided" }, { status: 400 });
      }
      for (const file of files.slice(0, MAX_FILES)) {
        if (file.size > MAX_FILE_BYTES) {
          rejected.push({
            fileName: file.name,
            error: `file is ${(file.size / 1e6).toFixed(1)} MB`,
            actionable: "Files up to 8 MB are supported — split or compress the file.",
          });
          continue;
        }
        inputs.push({ fileName: file.name, buffer: Buffer.from(await file.arrayBuffer()) });
      }
      for (const file of files.slice(MAX_FILES)) {
        rejected.push({
          fileName: file.name,
          error: `more than ${MAX_FILES} files`,
          actionable: `Upload at most ${MAX_FILES} files per batch.`,
        });
      }
    } else {
      const body = await req.json().catch(() => null);
      const text = typeof body?.text === "string" ? body.text.trim() : "";
      if (!text) {
        return NextResponse.json({ error: "Provide multipart files or JSON {text}" }, { status: 400 });
      }
      inputs.push({ fileName: "pasted-text.txt", buffer: Buffer.from(text.slice(0, MAX_FILE_BYTES), "utf8") });
    }

    const { docs, errors } = await extractDocuments(inputs);
    const allErrors = [...rejected, ...errors];

    if (!docs.length) {
      return NextResponse.json(
        { error: "No file could be read", files: allErrors.map((e) => ({ name: e.fileName, status: "failed", error: `${e.error}. ${e.actionable}` })) },
        { status: 422 },
      );
    }

    const { criteria, method } = await extractRunCriteria(docs);

    return NextResponse.json({
      criteria,
      method,
      files: [
        ...docs.map((d) => ({ name: d.fileName, status: "extracted" as const })),
        ...allErrors.map((e) => ({ name: e.fileName, status: "failed" as const, error: `${e.error}. ${e.actionable}` })),
      ],
      note:
        method === "heuristic"
          ? "Model extraction was unavailable — criteria came from keyword heuristics. Review carefully before applying."
          : "Review and edit the extracted criteria before running — nothing is applied silently.",
    });
  } catch (err) {
    console.error("run/criteria error:", err);
    return NextResponse.json({ error: "Criteria extraction failed" }, { status: 500 });
  }
}
