"use client";

/**
 * Run file upload: drag-and-drop + picker, presentational over the `files`
 * prop. Extraction state is always explicit — pending shows a spinner with a
 * label, failure shows the error text and a Retry action. Never silent.
 */

import { useRef, useState } from "react";
import {
  Upload,
  File as FileIcon,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  RotateCw,
  X,
} from "lucide-react";
import type { RunFile } from "@/types/run";

interface RunFileUploadProps {
  files: RunFile[];
  onFiles: (files: File[]) => void;
  onRetry?: (file: RunFile) => void;
  disabled?: boolean;
  accept?: string;
  maxSizeMb?: number;
}

const DEFAULT_ACCEPT =
  ".pdf,.docx,.xlsx,.csv,.tsv,.pptx,.txt,.md,.json,.xml,.png,.jpg,.jpeg,.zip";

function formatSize(bytes?: number): string {
  if (bytes === undefined || !Number.isFinite(bytes)) return "—";
  if (bytes >= 1_048_576) return `${(bytes / 1_048_576).toFixed(1)} MB`;
  if (bytes >= 1_024) return `${(bytes / 1_024).toFixed(0)} KB`;
  return `${bytes} B`;
}

export function RunFileUpload({
  files,
  onFiles,
  onRetry,
  disabled,
  accept = DEFAULT_ACCEPT,
  maxSizeMb = 8,
}: RunFileUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);
  const [rejected, setRejected] = useState<{ name: string; reason: string }[]>([]);

  function handleIncoming(list: FileList | File[]) {
    const incoming = Array.from(list);
    const limit = maxSizeMb * 1_048_576;
    const ok: File[] = [];
    const bad: { name: string; reason: string }[] = [];
    for (const f of incoming) {
      if (f.size > limit) {
        bad.push({
          name: f.name,
          reason: `${formatSize(f.size)} exceeds the ${maxSizeMb} MB limit`,
        });
      } else {
        ok.push(f);
      }
    }
    if (bad.length) setRejected(prev => [...prev, ...bad]);
    if (ok.length) onFiles(ok);
  }

  return (
    <div className="space-y-2">
      {/* Drop zone */}
      <div
        onDragOver={e => {
          e.preventDefault();
          if (!disabled) setDragActive(true);
        }}
        onDragLeave={() => setDragActive(false)}
        onDrop={e => {
          e.preventDefault();
          setDragActive(false);
          if (!disabled && e.dataTransfer.files.length) handleIncoming(e.dataTransfer.files);
        }}
        className={`rounded-xl border-2 border-dashed p-6 text-center transition ${
          dragActive
            ? "border-[#F97316] bg-[#FFF7ED]"
            : "border-border/60 bg-[#FAFAFA]"
        } ${disabled ? "opacity-50" : ""}`}
      >
        <Upload
          className={`mx-auto h-6 w-6 mb-2 ${dragActive ? "text-[#EA580C]" : "text-muted-foreground/60"}`}
          aria-hidden="true"
        />
        <p className="text-[13px] font-medium text-[#1A1A2E]">
          Drag files here, or{" "}
          <button
            type="button"
            disabled={disabled}
            onClick={() => inputRef.current?.click()}
            className="font-semibold text-[#C2410C] underline underline-offset-2 hover:text-[#EA580C] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F97316]/50 rounded disabled:pointer-events-none"
          >
            browse
          </button>
        </p>
        <p className="text-[11px] text-muted-foreground mt-1">
          Briefs, TPPs, portfolio sheets, decks · up to {maxSizeMb} MB each
        </p>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept={accept}
          disabled={disabled}
          className="hidden"
          aria-label="Upload run documents"
          onChange={e => {
            if (e.target.files?.length) handleIncoming(e.target.files);
            e.target.value = "";
          }}
        />
      </div>

      {/* Client-side rejections (size) — explicit, dismissible */}
      {rejected.map((r, i) => (
        <div
          key={`${r.name}-${i}`}
          className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2"
        >
          <AlertTriangle className="h-4 w-4 shrink-0 text-red-600" aria-hidden="true" />
          <p className="flex-1 min-w-0 text-[12px] text-red-800 truncate">
            <span className="font-semibold">{r.name}</span> — {r.reason}
          </p>
          <button
            type="button"
            onClick={() => setRejected(prev => prev.filter((_, j) => j !== i))}
            aria-label={`Dismiss error for ${r.name}`}
            className="rounded p-0.5 text-red-600 hover:bg-red-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400"
          >
            <X className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
        </div>
      ))}

      {/* Uploaded files with extraction status */}
      {files.length > 0 && (
        <ul className="rounded-xl border border-border/40 divide-y divide-border/30 bg-white">
          {files.map(file => (
            <li key={file.id} className="flex items-center gap-3 px-3 py-2.5">
              <FileIcon className="h-4 w-4 shrink-0 text-muted-foreground/60" aria-hidden="true" />
              <div className="flex-1 min-w-0">
                <p className="text-[12px] font-medium text-[#1A1A2E] truncate">{file.name}</p>
                <p className="text-[10px] text-muted-foreground/70 font-mono">
                  {formatSize(file.size)}
                </p>
              </div>

              {file.extractionStatus === "pending" && (
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-[#FFF7ED] text-[10px] font-semibold text-[#C2410C]">
                  <Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" />
                  extracting
                </span>
              )}
              {file.extractionStatus === "extracted" && (
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-50 text-[10px] font-semibold text-emerald-700">
                  <CheckCircle2 className="h-3 w-3" aria-hidden="true" />
                  extracted
                </span>
              )}
              {file.extractionStatus === "failed" && (
                <div className="flex items-center gap-2 max-w-[55%]">
                  <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-red-50 text-[10px] font-semibold text-red-700 shrink-0">
                    <AlertTriangle className="h-3 w-3" aria-hidden="true" />
                    failed
                  </span>
                  <span className="text-[11px] text-red-700 truncate" title={file.extractionError}>
                    {file.extractionError ?? "Extraction failed"}
                  </span>
                  {onRetry && (
                    <button
                      type="button"
                      disabled={disabled}
                      onClick={() => onRetry(file)}
                      className="inline-flex items-center gap-1 shrink-0 rounded-lg border border-border px-2 py-1 text-[11px] font-semibold text-[#1A1A2E] transition hover:border-[#F97316]/50 hover:bg-[#FFF7ED] hover:text-[#C2410C] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F97316]/50 disabled:opacity-50 disabled:pointer-events-none"
                    >
                      <RotateCw className="h-3 w-3" aria-hidden="true" />
                      Retry
                    </button>
                  )}
                </div>
              )}
              {!file.extractionStatus && (
                <span className="px-2 py-0.5 rounded-full bg-[#F8F9FA] border border-border/40 text-[10px] font-semibold text-muted-foreground">
                  uploaded
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
