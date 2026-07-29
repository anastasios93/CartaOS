"use client";

/**
 * The user's own working notes on a run.
 *
 * These are deliberately NOT part of the diagnosis or strategy envelope. The
 * exporters take those envelopes, so keeping notes in their own column is what
 * makes "never leaves the app" a structural property rather than a filter
 * someone has to remember to apply. The label on the box says so, because a
 * private field the user does not trust is a field they will not use.
 *
 * Saves on blur and on an explicit Save, not on every keystroke — a note is
 * something you finish writing, and per-keystroke writes would fight the
 * cursor over a slow connection.
 */

import { useState } from "react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { EyeOff, Loader2 } from "lucide-react";

const TINY = "text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70";

export interface RunNotesProps {
  runId: string;
  scope: "diagnosis" | "strategy";
  /** Whatever is already stored for this scope. */
  initial?: string;
  title?: string;
  placeholder?: string;
}

export function RunNotes({ runId, scope, initial = "", title, placeholder }: RunNotesProps) {
  const [text, setText] = useState(initial);
  const [saved, setSaved] = useState(initial);
  const [busy, setBusy] = useState(false);

  // A different run means a different note; remount via key rather than syncing.
  const dirty = text !== saved;

  const save = trpc.run.updateNotes.useMutation({
    onSuccess: () => {
      setSaved(text);
      setBusy(false);
    },
    onError: (err) => {
      setBusy(false);
      toast.error("Your note could not be saved", { description: err.message });
    },
  });

  const commit = () => {
    if (!dirty || busy) return;
    setBusy(true);
    save.mutate({ runId, scope, text });
  };

  return (
    <section className="rounded-2xl border border-border bg-white p-5">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-1">
        <p className={`${TINY} flex items-center gap-1.5`}>
          <EyeOff className="h-3.5 w-3.5" aria-hidden="true" />
          {title ?? "Your notes"}
        </p>
        <span className="text-[11px] text-muted-foreground">
          {busy ? (
            <span className="inline-flex items-center gap-1.5">
              <Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" /> Saving…
            </span>
          ) : dirty ? (
            "Unsaved"
          ) : saved ? (
            "Saved"
          ) : (
            ""
          )}
        </span>
      </div>

      <p className="text-[12px] text-muted-foreground leading-relaxed mb-3 max-w-3xl">
        Working detail that stays in CartaOS. This is kept separately from the run itself, so it is{" "}
        <span className="font-semibold text-[#1A1A2E]">never included in the PDF or the PowerPoint</span> — write
        freely here without it reaching a client deck.
      </p>

      <label htmlFor={`notes-${scope}`} className="sr-only">
        {title ?? "Your notes"}
      </label>
      <textarea
        id={`notes-${scope}`}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onBlur={commit}
        rows={5}
        maxLength={20000}
        placeholder={
          placeholder ??
          "Context, caveats, who said what, what to check before this goes anywhere…"
        }
        className="w-full rounded-lg border border-border bg-white px-3 py-2 text-[13px] leading-relaxed outline-none transition focus-visible:border-[#F97316] focus-visible:ring-2 focus-visible:ring-[#F97316]/40"
      />

      <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
        <span className="text-[11px] text-muted-foreground">{text.length.toLocaleString()} / 20,000</span>
        <button
          type="button"
          onClick={commit}
          disabled={!dirty || busy}
          className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-white px-3 py-1.5 text-[12px] font-semibold text-[#1A1A2E] transition hover:border-[#F97316] hover:text-[#C2410C] disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F97316]/50"
        >
          Save note
        </button>
      </div>
    </section>
  );
}
