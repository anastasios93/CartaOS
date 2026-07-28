"use client";

/**
 * Geography selector (§3.1): hierarchical World → Region → Country multi-select
 * over config/geographies. Selection is a list of ISO-3166 alpha-2 codes — the
 * same shape stored on the Run — and presets are additive shortcuts, never a
 * replacement for the explicit country list.
 */

import { useMemo, useRef, useState } from "react";
import { Globe, Search, X } from "lucide-react";
import {
  WORLD,
  GEO_PRESETS,
  ALL_COUNTRIES,
  countryByCode,
  expandPreset,
  type Region,
} from "@/config/geographies";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface GeographySelectorProps {
  value: string[];
  onChange: (codes: string[]) => void;
  disabled?: boolean;
}

/** Stable order for emitted codes: WORLD declaration order. */
const CANONICAL_ORDER = new Map(ALL_COUNTRIES.map((x, i) => [x.code, i]));

function sortCodes(codes: Iterable<string>): string[] {
  return [...new Set(codes)].sort(
    (a, b) => (CANONICAL_ORDER.get(a) ?? 999) - (CANONICAL_ORDER.get(b) ?? 999)
  );
}

export function GeographySelector({ value, onChange, disabled }: GeographySelectorProps) {
  const [query, setQuery] = useState("");
  const searchRef = useRef<HTMLInputElement>(null);

  const selected = useMemo(() => new Set(value.map(v => v.toUpperCase())), [value]);

  function emit(next: Iterable<string>) {
    onChange(sortCodes(next));
  }

  function addCodes(codes: string[]) {
    emit([...selected, ...codes]);
  }

  function toggleCountry(code: string) {
    const next = new Set(selected);
    if (next.has(code)) next.delete(code);
    else next.add(code);
    emit(next);
  }

  function setRegion(region: Region, on: boolean) {
    const next = new Set(selected);
    for (const c of region.countries) {
      if (on) next.add(c.code);
      else next.delete(c.code);
    }
    emit(next);
  }

  const q = query.trim().toLowerCase();
  const filteredRegions = useMemo(
    () =>
      WORLD.map(region => ({
        region,
        countries: q
          ? region.countries.filter(
              c => c.name.toLowerCase().includes(q) || c.code.toLowerCase() === q
            )
          : region.countries,
      })).filter(r => r.countries.length > 0),
    [q]
  );

  // Selection chips: collapse a fully-selected region into one region chip.
  const chips = useMemo(() => {
    const covered = new Set<string>();
    const out: (
      | { type: "region"; region: Region }
      | { type: "country"; code: string }
    )[] = [];
    for (const region of WORLD) {
      const all = region.countries.every(c => selected.has(c.code));
      if (all && region.countries.length > 0) {
        out.push({ type: "region", region });
        region.countries.forEach(c => covered.add(c.code));
      }
    }
    for (const code of sortCodes(selected)) {
      if (!covered.has(code)) out.push({ type: "country", code });
    }
    return out;
  }, [selected]);

  return (
    <TooltipProvider>
      <div className="rounded-xl border border-border/40 bg-white p-4">
        <div className="flex items-center gap-2 mb-3">
          <Globe className="h-4 w-4 text-[#C2410C]" aria-hidden="true" />
          <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70">
            Target geographies
          </p>
        </div>

        {/* Preset chips — clicking ADDS the preset countries to the selection */}
        <div className="flex flex-wrap gap-1.5 mb-3" role="group" aria-label="Geography presets">
          {GEO_PRESETS.map(preset => {
            const btn = (
              <button
                key={preset.key}
                type="button"
                disabled={disabled}
                onClick={() => addCodes(expandPreset(preset.key))}
                className="px-2.5 py-1 rounded-full border border-border/60 bg-[#FAFAFA] text-[11px] font-medium text-[#1A1A2E] transition hover:border-[#F97316]/50 hover:bg-[#FFF7ED] hover:text-[#9A3412] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F97316]/50 disabled:opacity-50 disabled:pointer-events-none"
              >
                {preset.label}
              </button>
            );
            if (!preset.note) return btn;
            return (
              <Tooltip key={preset.key}>
                <TooltipTrigger render={btn} />
                <TooltipContent className="max-w-64">{preset.note}</TooltipContent>
              </Tooltip>
            );
          })}
        </div>

        {/* Current selection as removable chips */}
        {chips.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5 mb-3" aria-label="Selected markets">
            {chips.map(chip =>
              chip.type === "region" ? (
                <span
                  key={`r-${chip.region.key}`}
                  className="inline-flex items-center gap-1 pl-2 pr-1 py-0.5 rounded-md bg-[#1A1A2E] text-[11px] font-medium text-white"
                >
                  {chip.region.label}
                  <span className="text-white/60 font-mono text-[10px]">
                    {chip.region.countries.length}
                  </span>
                  <button
                    type="button"
                    disabled={disabled}
                    onClick={() => setRegion(chip.region, false)}
                    aria-label={`Remove ${chip.region.label}`}
                    className="ml-0.5 rounded p-0.5 hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60 disabled:opacity-50 disabled:pointer-events-none"
                  >
                    <X className="h-3 w-3" aria-hidden="true" />
                  </button>
                </span>
              ) : (
                <span
                  key={chip.code}
                  className="inline-flex items-center gap-1 pl-2 pr-1 py-0.5 rounded-md bg-[#FFF7ED] border border-[#F97316]/20 text-[11px] font-medium text-[#9A3412]"
                >
                  <span aria-hidden="true">{countryByCode(chip.code)?.flag}</span>
                  {countryByCode(chip.code)?.name ?? chip.code}
                  <button
                    type="button"
                    disabled={disabled}
                    onClick={() => toggleCountry(chip.code)}
                    aria-label={`Remove ${countryByCode(chip.code)?.name ?? chip.code}`}
                    className="ml-0.5 rounded p-0.5 hover:bg-[#F97316]/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F97316]/50 disabled:opacity-50 disabled:pointer-events-none"
                  >
                    <X className="h-3 w-3" aria-hidden="true" />
                  </button>
                </span>
              )
            )}
            <button
              type="button"
              disabled={disabled}
              onClick={() => onChange([])}
              className="text-[11px] font-medium text-muted-foreground underline-offset-2 hover:text-[#C2410C] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F97316]/50 rounded px-1 disabled:opacity-50 disabled:pointer-events-none"
            >
              Clear all
            </button>
          </div>
        )}

        {/* Search */}
        <div className="relative mb-2">
          <Search
            className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/60"
            aria-hidden="true"
          />
          <input
            ref={searchRef}
            type="text"
            value={query}
            disabled={disabled}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search countries by name or ISO code…"
            aria-label="Search countries by name or ISO code"
            className="w-full h-8 pl-8 pr-8 rounded-lg bg-[#FAFAFA] border border-border text-[12px] text-[#1A1A2E] placeholder-muted-foreground/50 focus:border-[#F97316] focus:bg-white outline-none transition disabled:opacity-50"
          />
          {query && (
            <button
              type="button"
              onClick={() => {
                setQuery("");
                searchRef.current?.focus();
              }}
              aria-label="Clear search"
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-0.5 text-muted-foreground hover:text-[#1A1A2E] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F97316]/50"
            >
              <X className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          )}
        </div>

        {/* Region-grouped country list */}
        <div className="max-h-72 overflow-y-auto rounded-lg border border-border/40 divide-y divide-border/30">
          {filteredRegions.length === 0 && (
            <p className="px-3 py-4 text-[12px] text-muted-foreground italic">
              No countries match &ldquo;{query}&rdquo;.
            </p>
          )}
          {filteredRegions.map(({ region, countries }) => {
            const selectedCount = region.countries.filter(c => selected.has(c.code)).length;
            const allSelected = selectedCount === region.countries.length;
            const someSelected = selectedCount > 0 && !allSelected;
            return (
              <div key={region.key}>
                <label className="flex items-center gap-2 px-3 py-1.5 bg-[#FAFAFA] cursor-pointer select-none has-[:disabled]:cursor-default has-[:disabled]:opacity-60">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    disabled={disabled}
                    ref={el => {
                      if (el) el.indeterminate = someSelected;
                    }}
                    onChange={() => setRegion(region, !allSelected)}
                    aria-label={`Select all countries in ${region.label}`}
                    className="h-3.5 w-3.5 accent-[#F97316]"
                  />
                  <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70">
                    {region.label}
                  </span>
                  {selectedCount > 0 && (
                    <span className="ml-auto text-[10px] font-mono text-[#C2410C]">
                      {selectedCount}/{region.countries.length}
                    </span>
                  )}
                </label>
                <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-2 px-2 py-1">
                  {countries.map(country => (
                    <li key={country.code}>
                      <label className="flex items-center gap-2 px-1.5 py-1 rounded-md cursor-pointer hover:bg-[#FFF7ED] select-none has-[:disabled]:cursor-default has-[:disabled]:opacity-60">
                        <input
                          type="checkbox"
                          checked={selected.has(country.code)}
                          disabled={disabled}
                          onChange={() => toggleCountry(country.code)}
                          className="h-3.5 w-3.5 accent-[#F97316]"
                        />
                        <span aria-hidden="true" className="text-[13px] leading-none">
                          {country.flag}
                        </span>
                        <span className="text-[12px] text-[#1A1A2E]">{country.name}</span>
                        <span className="ml-auto text-[10px] font-mono text-muted-foreground/60">
                          {country.code}
                        </span>
                      </label>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>

        <p className="mt-2 text-[11px] text-muted-foreground" aria-live="polite">
          <span className="font-semibold font-mono text-[#1A1A2E]">{selected.size}</span>{" "}
          market{selected.size === 1 ? "" : "s"} selected
        </p>
      </div>
    </TooltipProvider>
  );
}
