/**
 * Universal document extraction (§3.2): turn any uploaded file into either
 * location-tagged text segments (docx/xlsx/pptx/txt/md/json/xml/csv/tsv/zip)
 * or a binary block (pdf/images) passed straight to the model, which reads
 * PDFs and images natively — no OCR dependency needed.
 *
 * Failed extraction is an explicit, actionable ExtractionError — never a
 * silent partial parse. Legacy binary formats (.doc/.xls/.ppt) and TIFF have
 * no clean server-side parser / model support: the error tells the user the
 * one-step fix instead of pretending.
 */

import mammoth from "mammoth";
import ExcelJS from "exceljs";
import JSZip from "jszip";

export interface DocSegment {
  /** e.g. `sheet "Portfolio"`, "slide 3", "¶ 1–50", "document" */
  location: string;
  text: string;
}

export interface BinaryDoc {
  kind: "pdf" | "image";
  mediaType: string;
  base64: string;
}

export interface ExtractedDoc {
  fileName: string;
  segments?: DocSegment[];
  binary?: BinaryDoc;
}

export class ExtractionError extends Error {
  constructor(
    message: string,
    /** What the user should do about it — surfaced verbatim in the UI. */
    public actionable: string,
  ) {
    super(message);
    this.name = "ExtractionError";
  }
}

const MAX_TEXT_CHARS = 60_000; // per document, keeps the extraction prompt bounded
const MAX_BINARY_BYTES = 8 * 1024 * 1024;
const MAX_ZIP_ENTRIES = 20;

const IMAGE_TYPES: Record<string, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  webp: "image/webp",
  gif: "image/gif",
};

function ext(fileName: string): string {
  return fileName.split(".").pop()?.toLowerCase() ?? "";
}

function decodeText(buf: Buffer): string {
  return buf.toString("utf8").replace(/^﻿/, "");
}

function decodeXmlEntities(s: string): string {
  return s
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&amp;/g, "&");
}

async function extractDocx(buf: Buffer): Promise<DocSegment[]> {
  const { value } = await mammoth.extractRawText({ buffer: buf });
  const paragraphs = value.split(/\n\n+/).map((p) => p.trim()).filter(Boolean);
  const segments: DocSegment[] = [];
  const CHUNK = 50;
  for (let i = 0; i < paragraphs.length; i += CHUNK) {
    segments.push({
      location: paragraphs.length > CHUNK ? `¶ ${i + 1}–${Math.min(i + CHUNK, paragraphs.length)}` : "document",
      text: paragraphs.slice(i, i + CHUNK).join("\n\n").slice(0, MAX_TEXT_CHARS),
    });
  }
  return segments;
}

async function extractXlsx(buf: Buffer): Promise<DocSegment[]> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buf as unknown as ArrayBuffer);
  const segments: DocSegment[] = [];
  workbook.eachSheet((sheet) => {
    const lines: string[] = [];
    let rows = 0;
    sheet.eachRow({ includeEmpty: false }, (row) => {
      if (rows >= 2000) return;
      rows++;
      const cells: string[] = [];
      row.eachCell({ includeEmpty: true }, (cell, col) => {
        if (col > 50) return;
        let v = "";
        try {
          v = cell.text ?? "";
        } catch {
          v = String(cell.value ?? "");
        }
        cells.push(v.replace(/[\t\n]/g, " "));
      });
      lines.push(cells.join("\t"));
    });
    if (lines.length) {
      segments.push({
        location: `sheet "${sheet.name}"`,
        text: lines.join("\n").slice(0, MAX_TEXT_CHARS),
      });
    }
  });
  return segments;
}

async function extractPptx(buf: Buffer): Promise<DocSegment[]> {
  const zip = await JSZip.loadAsync(buf);
  const slideFiles = Object.keys(zip.files)
    .filter((n) => /^ppt\/slides\/slide\d+\.xml$/.test(n))
    .sort((a, b) => Number(a.match(/\d+/)?.[0] ?? 0) - Number(b.match(/\d+/)?.[0] ?? 0));
  const segments: DocSegment[] = [];
  for (const name of slideFiles) {
    const xml = await zip.files[name].async("string");
    const texts = [...xml.matchAll(/<a:t>([^<]*)<\/a:t>/g)].map((m) => decodeXmlEntities(m[1]));
    const text = texts.join(" ").trim();
    if (text) {
      segments.push({
        location: `slide ${name.match(/\d+/)?.[0]}`,
        text: text.slice(0, MAX_TEXT_CHARS),
      });
    }
  }
  return segments;
}

async function extractOne(fileName: string, buf: Buffer): Promise<ExtractedDoc> {
  const e = ext(fileName);

  if (["txt", "md", "json", "xml", "csv", "tsv"].includes(e)) {
    return { fileName, segments: [{ location: "document", text: decodeText(buf).slice(0, MAX_TEXT_CHARS) }] };
  }
  if (e === "docx" || e === "dotx") {
    return { fileName, segments: await extractDocx(buf) };
  }
  if (e === "xlsx" || e === "xlsm" || e === "xltx") {
    return { fileName, segments: await extractXlsx(buf) };
  }
  if (e === "pptx" || e === "potx") {
    return { fileName, segments: await extractPptx(buf) };
  }
  if (e === "pdf") {
    if (buf.length > MAX_BINARY_BYTES) {
      throw new ExtractionError(`${fileName} is ${(buf.length / 1e6).toFixed(1)} MB`, "PDFs up to 8 MB are supported — split the document or extract the relevant pages.");
    }
    return { fileName, binary: { kind: "pdf", mediaType: "application/pdf", base64: buf.toString("base64") } };
  }
  if (e in IMAGE_TYPES) {
    if (buf.length > MAX_BINARY_BYTES) {
      throw new ExtractionError(`${fileName} is ${(buf.length / 1e6).toFixed(1)} MB`, "Images up to 8 MB are supported — downscale or compress the image.");
    }
    return { fileName, binary: { kind: "image", mediaType: IMAGE_TYPES[e], base64: buf.toString("base64") } };
  }
  if (e === "tiff" || e === "tif") {
    throw new ExtractionError(`${fileName}: TIFF is not supported`, "Convert the image to PNG or JPEG and re-upload.");
  }
  if (["doc", "xls", "ppt"].includes(e)) {
    throw new ExtractionError(
      `${fileName}: legacy binary Office format`,
      `Save the file as .${e}x (e.g. in Word/Excel/PowerPoint: File → Save As) and re-upload.`,
    );
  }
  throw new ExtractionError(`${fileName}: unsupported file type ".${e}"`, "Supported: pdf, docx, xlsx, csv, tsv, pptx, txt, md, json, xml, png, jpg, zip.");
}

export interface ExtractionResult {
  docs: ExtractedDoc[];
  /** Per-file failures — explicit, never silently dropped. */
  errors: { fileName: string; error: string; actionable: string }[];
}

/**
 * Extract every file; zip archives are flattened one level deep. Failures are
 * collected per file so one bad file never sinks the batch.
 */
export async function extractDocuments(
  files: { fileName: string; buffer: Buffer }[],
): Promise<ExtractionResult> {
  const docs: ExtractedDoc[] = [];
  const errors: ExtractionResult["errors"] = [];

  async function handle(fileName: string, buffer: Buffer, depth: number): Promise<void> {
    if (ext(fileName) === "zip") {
      if (depth > 0) {
        errors.push({ fileName, error: "nested zip archives are not supported", actionable: "Unpack the inner archive and upload its files directly." });
        return;
      }
      const zip = await JSZip.loadAsync(buffer);
      const entries = Object.values(zip.files).filter((f) => !f.dir).slice(0, MAX_ZIP_ENTRIES + 1);
      if (entries.length > MAX_ZIP_ENTRIES) {
        errors.push({ fileName, error: `archive has more than ${MAX_ZIP_ENTRIES} files`, actionable: `Only the first ${MAX_ZIP_ENTRIES} files are read — upload the relevant files directly.` });
      }
      for (const entry of entries.slice(0, MAX_ZIP_ENTRIES)) {
        const inner = Buffer.from(await entry.async("nodebuffer"));
        await handle(`${fileName}/${entry.name}`, inner, depth + 1);
      }
      return;
    }
    try {
      const doc = await extractOne(fileName, buffer);
      if (doc.binary || (doc.segments && doc.segments.length > 0)) {
        docs.push(doc);
      } else {
        errors.push({ fileName, error: "no readable content found", actionable: "The file parsed but contained no text — check it isn't empty or image-only." });
      }
    } catch (err) {
      if (err instanceof ExtractionError) {
        errors.push({ fileName, error: err.message, actionable: err.actionable });
      } else {
        errors.push({
          fileName,
          error: err instanceof Error ? err.message : "extraction failed",
          actionable: "The file could not be parsed — check it opens correctly, or paste the relevant text instead.",
        });
      }
    }
  }

  for (const f of files) await handle(f.fileName, f.buffer, 0);
  return { docs, errors };
}
