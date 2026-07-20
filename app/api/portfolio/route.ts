/**
 * POST /api/portfolio
 * Upload a client portfolio / sales extract (CSV or TSV), extract entities,
 * join them to open data through the RxNorm backbone, and return computed
 * synergies.
 *
 * Confidentiality (per the engine's guardrails): the file is parsed IN-SESSION
 * and never persisted, never forwarded to a third-party endpoint, and never
 * placed in a URL or query string. Only molecule names and NDCs are used for
 * public reference lookups; revenue, units and any customer columns stay in
 * this process and are returned solely to the uploading user.
 */

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { parseDelimited } from "@/server/services/ingest/csv";
import { extractPortfolio } from "@/server/services/ingest/portfolio";
import { computeSynergies } from "@/server/services/ingest/synergy";

export const maxDuration = 300;
export const dynamic = "force-dynamic";

const MAX_BYTES = 8 * 1024 * 1024; // 8 MB

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  let text: string;
  let filename = "upload.csv";
  try {
    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof File)) {
      return Response.json({ error: "No file supplied." }, { status: 400 });
    }
    if (file.size > MAX_BYTES) {
      return Response.json(
        { error: `File is ${(file.size / 1024 / 1024).toFixed(1)} MB; the limit is 8 MB.` },
        { status: 413 },
      );
    }
    filename = file.name || filename;
    if (!/\.(csv|tsv|txt)$/i.test(filename)) {
      return Response.json(
        { error: "Only CSV and TSV uploads are supported at present. Export your sheet as CSV and retry." },
        { status: 415 },
      );
    }
    text = await file.text();
  } catch {
    return Response.json({ error: "Could not read the uploaded file." }, { status: 400 });
  }

  try {
    const table = parseDelimited(text);
    const extract = extractPortfolio(table);

    if (!extract.moleculeCandidates.length) {
      return Response.json(
        {
          error:
            "No molecule or product column could be identified. Include a column named something like 'Molecule', 'INN', 'Product' or 'Brand'.",
          mappings: extract.mappings,
          unmappedHeaders: extract.unmappedHeaders,
        },
        { status: 422 },
      );
    }

    const report = await computeSynergies(extract);

    return Response.json({
      filename,
      rowCount: table.rowCount,
      delimiter: table.delimiter,
      mappings: extract.mappings,
      unmappedHeaders: extract.unmappedHeaders,
      geographies: extract.geographies,
      totalRevenue: extract.totalRevenue,
      moleculeCandidates: extract.moleculeCandidates,
      ...report,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Could not process the upload.";
    return Response.json({ error: msg }, { status: 400 });
  }
}
