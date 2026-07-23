/**
 * POST /api/criteria
 * Extract customisable search parameters from ANY document the client already has
 * — a strategic brief, a target-product profile, a screening rubric, a parameters
 * sheet — or from pasted text. The returned SearchCriteria tailors the
 * market-worthiness search and the asset value assessment to what the client
 * actually wants to know.
 *
 * Accepts either:
 *   - multipart/form-data with a `file` (any text-based document), or
 *   - application/json { text: "..." } for pasted text.
 *
 * Confidentiality: the document is read in-session, used only to extract criteria,
 * and never persisted or forwarded to a third party.
 */

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { extractCriteria } from "@/server/services/ingest/criteria";

export const maxDuration = 120;
export const dynamic = "force-dynamic";

const MAX_BYTES = 8 * 1024 * 1024;

// Formats we can read as text without a binary parser. PDF/DOCX/XLSX are binary
// containers and would need a parser we deliberately don't bundle; for those we
// ask the user to paste the text instead of silently extracting garbage.
const TEXT_EXT = /\.(txt|md|markdown|csv|tsv|json|ya?ml|text|log|rtf)$/i;
const BINARY_EXT = /\.(pdf|docx?|xlsx?|pptx?|pages|numbers|key)$/i;

/** Heuristic: does this look like readable text rather than a binary blob? */
function looksLikeText(s: string): boolean {
  if (!s) return false;
  const sample = s.slice(0, 4000);
  let control = 0;
  for (let i = 0; i < sample.length; i++) {
    const c = sample.charCodeAt(i);
    if (c === 0) return false; // NUL → binary
    if (c < 9 || (c > 13 && c < 32)) control++;
  }
  return control / sample.length < 0.1;
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  let text = "";
  let filename = "pasted text";
  const contentType = req.headers.get("content-type") ?? "";

  try {
    if (contentType.includes("application/json")) {
      const body = await req.json();
      text = String(body?.text ?? "");
    } else {
      const form = await req.formData();
      const file = form.get("file");
      const pasted = form.get("text");
      if (file instanceof File) {
        if (file.size > MAX_BYTES) {
          return Response.json({ error: `File is ${(file.size / 1024 / 1024).toFixed(1)} MB; the limit is 8 MB.` }, { status: 413 });
        }
        filename = file.name || filename;
        if (BINARY_EXT.test(filename)) {
          return Response.json(
            {
              error:
                "That looks like a PDF/Word/Excel file, which can't be read directly here. Open it, copy the relevant text, and paste it instead — or save it as .txt/.md/.csv and re-upload.",
            },
            { status: 415 },
          );
        }
        text = await file.text();
        if (!TEXT_EXT.test(filename) && !looksLikeText(text)) {
          return Response.json(
            { error: "This file doesn't appear to be readable text. Paste the parameters as text instead." },
            { status: 415 },
          );
        }
      } else if (typeof pasted === "string") {
        text = pasted;
      }
    }
  } catch {
    return Response.json({ error: "Could not read the request." }, { status: 400 });
  }

  text = text.trim();
  if (!text) {
    return Response.json({ error: "No text found. Upload a text document or paste your parameters." }, { status: 400 });
  }
  if (!looksLikeText(text)) {
    return Response.json(
      { error: "The content looks like binary data rather than text. Paste the parameters as text instead." },
      { status: 415 },
    );
  }

  try {
    const { criteria, method } = await extractCriteria(text);
    return Response.json({
      filename,
      method,
      criteria,
      charCount: text.length,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Could not extract criteria.";
    return Response.json({ error: msg }, { status: 400 });
  }
}
