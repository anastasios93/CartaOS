"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CLAUSE_TYPE_LABELS } from "@/lib/constants";
import { useClauses } from "@/hooks/use-data";
import {
  AlertTriangle,
  Search,
  ChevronDown,
  ChevronUp,
  Plus,
  FileText,
  ArrowLeft,
  Scale,
  BookOpen,
  StickyNote,
  Link2,
} from "lucide-react";

const FAVORABILITY_CONFIG: Record<
  string,
  { label: string; borderClass: string; badgeClass: string }
> = {
  LICENSOR_FAVORABLE: {
    label: "Licensor Favorable",
    borderClass: "border-l-emerald-500",
    badgeClass: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30",
  },
  BALANCED: {
    label: "Balanced",
    borderClass: "border-l-[#F97316]",
    badgeClass: "bg-[#F97316]/10 text-[#F97316] border-[#F97316]/30",
  },
  LICENSEE_FAVORABLE: {
    label: "Licensee Favorable",
    borderClass: "border-l-amber-500",
    badgeClass: "bg-amber-500/10 text-amber-400 border-amber-500/30",
  },
};

export default function ClauseLibraryPage() {
  const { clauses } = useClauses();
  const [search, setSearch] = useState("");
  const [clauseTypeFilter, setClauseTypeFilter] = useState<string>("all");
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  const filteredClauses = useMemo(() => {
    return clauses.filter((clause) => {
      // Filter by clause type
      if (clauseTypeFilter !== "all" && clause.clauseType !== clauseTypeFilter) return false;

      // Filter by keyword search
      if (search) {
        const term = search.toLowerCase();
        return (
          clause.title.toLowerCase().includes(term) ||
          clause.summary.toLowerCase().includes(term) ||
          clause.clauseText.toLowerCase().includes(term) ||
          clause.negotiationNotes.toLowerCase().includes(term) ||
          clause.dealTitle.toLowerCase().includes(term)
        );
      }

      return true;
    });
  }, [clauses, search, clauseTypeFilter]);

  const toggleExpanded = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const expandAll = () => {
    if (expandedIds.size === filteredClauses.length) {
      setExpandedIds(new Set());
    } else {
      setExpandedIds(new Set(filteredClauses.map((c) => c.id)));
    }
  };

  // Unique clause types present in the data
  const clauseTypes = useMemo(() => {
    const types = new Set(clauses.map((c) => c.clauseType));
    return Array.from(types).sort();
  }, [clauses]);

  return (
    <div className="space-y-6">
      {/* Legal Disclaimer */}
      <div className="flex items-start gap-3 rounded-lg border border-amber-500/30 bg-amber-500/5 p-4">
        <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-500" />
        <div className="text-sm text-amber-200/90">
          <span className="font-semibold">Legal Disclaimer:</span> This tool provides analytical
          assistance only. It does not constitute legal, financial, or investment advice. All
          outputs should be reviewed by qualified legal counsel.
        </div>
      </div>

      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon-sm" asChild>
            <Link href="/term-builder">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Clause Library</h1>
            <p className="text-sm text-muted-foreground">
              Browse, search, and reference standard contractual clauses from precedent deals
            </p>
          </div>
        </div>
        <Button>
          <Plus className="mr-2 h-4 w-4" /> Draft New Clause
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[250px]">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search clauses by keyword, title, or deal..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select
              value={clauseTypeFilter}
              onValueChange={(v) => setClauseTypeFilter(v ?? "all")}
            >
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Clause Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Clause Types</SelectItem>
                {clauseTypes.map((type) => (
                  <SelectItem key={type} value={type}>
                    {CLAUSE_TYPE_LABELS[type] ?? type}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" onClick={expandAll}>
              {expandedIds.size === filteredClauses.length ? (
                <>
                  <ChevronUp className="mr-1 h-3.5 w-3.5" /> Collapse All
                </>
              ) : (
                <>
                  <ChevronDown className="mr-1 h-3.5 w-3.5" /> Expand All
                </>
              )}
            </Button>
          </div>

          <div className="mt-3 flex items-center gap-4 text-xs text-muted-foreground">
            <span>{filteredClauses.length} clauses found</span>
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-emerald-500" /> Licensor Favorable
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-[#F97316]" /> Balanced
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-amber-500" /> Licensee Favorable
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Clause Cards */}
      {filteredClauses.length > 0 ? (
        <div className="space-y-4">
          {filteredClauses.map((clause) => {
            const isExpanded = expandedIds.has(clause.id);
            const favConfig = FAVORABILITY_CONFIG[clause.favorability] ?? FAVORABILITY_CONFIG.BALANCED;

            return (
              <Card
                key={clause.id}
                className={`border-l-4 ${favConfig.borderClass} transition-all`}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-1.5">
                        <Badge variant="outline" className="text-xs">
                          {CLAUSE_TYPE_LABELS[clause.clauseType] ?? clause.clauseType}
                        </Badge>
                        <Badge className={`text-xs border ${favConfig.badgeClass}`}>
                          <Scale className="mr-1 h-3 w-3" />
                          {favConfig.label}
                        </Badge>
                      </div>
                      <CardTitle className="text-base">{clause.title}</CardTitle>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => toggleExpanded(clause.id)}
                    >
                      {isExpanded ? (
                        <ChevronUp className="h-4 w-4" />
                      ) : (
                        <ChevronDown className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </CardHeader>

                <CardContent className="space-y-3">
                  {/* Summary always visible */}
                  <p className="text-sm text-muted-foreground">{clause.summary}</p>

                  {/* Expandable Content */}
                  {isExpanded && (
                    <div className="space-y-4 pt-2">
                      {/* Full Clause Text */}
                      <div className="rounded-lg border border-border/50 bg-muted/20 p-4">
                        <div className="mb-2 flex items-center gap-2 text-xs font-medium text-muted-foreground">
                          <FileText className="h-3.5 w-3.5" /> Full Clause Text
                        </div>
                        <p className="text-sm leading-relaxed whitespace-pre-wrap">
                          {clause.clauseText}
                        </p>
                      </div>

                      {/* Negotiation Notes */}
                      <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-4">
                        <div className="mb-2 flex items-center gap-2 text-xs font-medium text-amber-400">
                          <StickyNote className="h-3.5 w-3.5" /> Negotiation Notes
                        </div>
                        <p className="text-sm text-amber-200/80">{clause.negotiationNotes}</p>
                      </div>

                      {/* Source Deal */}
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Link2 className="h-3.5 w-3.5" />
                        <span>
                          Source Deal:{" "}
                          <span className="font-medium text-foreground">{clause.dealTitle}</span>
                        </span>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <BookOpen className="h-10 w-10 text-muted-foreground/50" />
            <p className="mt-3 text-sm text-muted-foreground">
              No clauses match your search criteria
            </p>
            <Button
              size="sm"
              variant="outline"
              className="mt-3"
              onClick={() => {
                setSearch("");
                setClauseTypeFilter("all");
              }}
            >
              Clear Filters
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
