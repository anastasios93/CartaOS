/**
 * RFC-4180 delimited-text parser for uploaded client files (CSV / TSV / semicolon).
 * Pure and dependency-free — no I/O, no network.
 *
 * Handles quoted fields containing delimiters or newlines, escaped double-quotes,
 * CRLF or LF endings, a leading UTF-8 BOM, and trailing blank lines.
 */

export type Delimiter = "," | "\t" | ";";

export interface ParsedTable {
  headers: string[];
  rows: Record<string, string>[];
  delimiter: Delimiter;
  rowCount: number;
}

const CANDIDATES: Delimiter[] = [",", "\t", ";"];
const DEFAULT_MAX_ROWS = 50000;

/**
 * Count delimiter occurrences on the first line that has content, ignoring
 * anything inside quotes. Blank leading lines reset the tally.
 */
function detectDelimiter(text: string): Delimiter {
  const counts: Record<string, number> = { ",": 0, "\t": 0, ";": 0 };
  let inQuotes = false;
  let hasContent = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];

    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') i++; // escaped quote
        else inQuotes = false;
      }
      continue;
    }

    if (ch === '"') {
      inQuotes = true;
      hasContent = true;
      continue;
    }

    if (ch === "\r" || ch === "\n") {
      if (hasContent) break;
      counts[","] = 0;
      counts["\t"] = 0;
      counts[";"] = 0;
      continue;
    }

    if (ch === "," || ch === "\t" || ch === ";") {
      counts[ch]++;
      hasContent = true;
      continue;
    }

    if (ch.trim() !== "") hasContent = true;
  }

  let best: Delimiter = ",";
  for (const c of CANDIDATES) {
    if (counts[c] > counts[best]) best = c;
  }
  return best;
}

/**
 * Split delimited text into records. `maxRecords` bounds memory by stopping
 * early; it counts the header row as well.
 */
function tokenize(text: string, delimiter: Delimiter, maxRecords: number): string[][] {
  const records: string[][] = [];
  let cells: string[] = [];
  let inner = ""; // characters captured inside quotes
  let outer = ""; // characters captured outside quotes
  let quoted = false;
  let inQuotes = false;

  const pushCell = () => {
    if (!quoted) {
      cells.push(outer.trim());
    } else {
      const tail = outer.trim();
      cells.push(tail ? inner + tail : inner);
    }
    inner = "";
    outer = "";
    quoted = false;
  };

  const pushRecord = () => {
    pushCell();
    // A record of one empty cell is a blank line — drop it.
    if (!(cells.length === 1 && cells[0] === "")) records.push(cells);
    cells = [];
  };

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];

    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          inner += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        inner += ch;
      }
      continue;
    }

    if (ch === '"') {
      inQuotes = true;
      quoted = true;
      outer = ""; // discard whitespace preceding the opening quote
      continue;
    }

    if (ch === delimiter) {
      pushCell();
      continue;
    }

    if (ch === "\r" || ch === "\n") {
      if (ch === "\r" && text[i + 1] === "\n") i++;
      pushRecord();
      if (records.length >= maxRecords) return records;
      continue;
    }

    outer += ch;
  }

  // Flush whatever remains when the file does not end with a newline.
  if (inner !== "" || outer !== "" || quoted || cells.length > 0) pushRecord();

  return records;
}

/**
 * Normalize header labels: trim, name blanks, and disambiguate duplicates
 * with _2, _3 … suffixes so every column yields a distinct object key.
 */
function normalizeHeaders(raw: string[]): string[] {
  const seen = new Map<string, number>();
  return raw.map((h, i) => {
    const base = h.trim() || `column_${i + 1}`;
    const count = (seen.get(base) ?? 0) + 1;
    seen.set(base, count);
    return count === 1 ? base : `${base}_${count}`;
  });
}

/**
 * Parse CSV/TSV/semicolon text into headers plus row objects.
 *
 * @param text  Raw file contents (BOM tolerated).
 * @param opts  `maxRows` caps parsed data rows (default 50000).
 * @throws If no header line can be found.
 */
export function parseDelimited(text: string, opts?: { maxRows?: number }): ParsedTable {
  const maxRows = Math.max(0, opts?.maxRows ?? DEFAULT_MAX_ROWS);
  const source = typeof text === "string" ? text.replace(/^﻿/, "") : "";

  const delimiter = detectDelimiter(source);
  const records = tokenize(source, delimiter, maxRows + 1);

  const headerRecord = records[0];
  if (!headerRecord || headerRecord.every((c) => c.trim() === "")) {
    throw new Error("No parseable header line found in delimited text.");
  }

  const headers = normalizeHeaders(headerRecord);
  const rows: Record<string, string>[] = [];

  for (let r = 1; r < records.length && rows.length < maxRows; r++) {
    const record = records[r];
    const row: Record<string, string> = {};
    for (let c = 0; c < headers.length; c++) {
      row[headers[c]] = record[c] ?? ""; // short rows fill with empty strings
    }
    rows.push(row);
  }

  return { headers, rows, delimiter, rowCount: rows.length };
}
