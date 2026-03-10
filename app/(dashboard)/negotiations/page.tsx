"use client";

import { useState } from "react";
import Link from "next/link";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Skeleton } from "@/components/ui/skeleton";
import { NEGOTIATION_STATUS_LABELS } from "@/lib/constants";
import {
  Search,
  Plus,
  Handshake,
  CalendarClock,
  AlertTriangle,
  CheckCircle2,
} from "lucide-react";

function formatCurrency(value: number | null | undefined) {
  if (value == null) return "—";
  if (value >= 1000) return `$${(value / 1000).toFixed(1)}B`;
  return `$${value.toFixed(0)}M`;
}

const statusIcon: Record<string, React.ReactNode> = {
  INITIATED: <CalendarClock className="h-4 w-4 text-blue-500" />,
  TERM_SHEET_DRAFTING: <CalendarClock className="h-4 w-4 text-yellow-500" />,
  TERM_SHEET_EXCHANGED: <CalendarClock className="h-4 w-4 text-orange-500" />,
  DUE_DILIGENCE: <AlertTriangle className="h-4 w-4 text-orange-500" />,
  DEFINITIVE_AGREEMENT: <AlertTriangle className="h-4 w-4 text-purple-500" />,
  CLOSED: <CheckCircle2 className="h-4 w-4 text-green-500" />,
  DEAD: <AlertTriangle className="h-4 w-4 text-red-500" />,
};

export default function NegotiationsPage() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<string>("all");

  const negotiations = trpc.negotiation.list.useQuery({
    search: search || undefined,
    status: status !== "all" ? (status as any) : undefined,
    limit: 50,
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Negotiations</h1>
          <p className="text-sm text-muted-foreground">
            Active deal workspaces and negotiation tracking
          </p>
        </div>
        <Button asChild>
          <Link href="/negotiations/new">
            <Plus className="mr-2 h-4 w-4" /> New Negotiation
          </Link>
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search negotiations..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={status} onValueChange={(v) => setStatus(v ?? "all")}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            {Object.entries(NEGOTIATION_STATUS_LABELS).map(([k, v]) => (
              <SelectItem key={k} value={k}>{v}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Negotiation cards */}
      {negotiations.isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-48" />
          ))}
        </div>
      ) : negotiations.data?.items?.length ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {negotiations.data.items.map((neg) => (
            <Link key={neg.id} href={`/negotiations/${neg.id}`}>
              <Card className="h-full transition-colors hover:bg-muted/50 cursor-pointer">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-base truncate">{neg.title}</CardTitle>
                      <CardDescription className="mt-1">
                        {neg.company.name}
                      </CardDescription>
                    </div>
                    {statusIcon[neg.status]}
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Badge variant="outline" className="text-xs">
                    {NEGOTIATION_STATUS_LABELS[neg.status] ?? neg.status}
                  </Badge>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <p className="text-muted-foreground">Upfront</p>
                      <p className="font-medium">{formatCurrency(neg.proposedUpfront)}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Milestones</p>
                      <p className="font-medium">{formatCurrency(neg.proposedMilestones)}</p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>{neg._count.activities} activities</span>
                    <span>{neg._count.actionItems} actions</span>
                  </div>

                  {neg.targetCloseDate && (
                    <p className="text-xs text-muted-foreground">
                      Target: {new Date(neg.targetCloseDate).toLocaleDateString()}
                    </p>
                  )}
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Handshake className="h-10 w-10 text-muted-foreground/50" />
            <p className="mt-3 text-sm text-muted-foreground">No negotiations yet</p>
            <Button size="sm" className="mt-3" asChild>
              <Link href="/negotiations/new">Start your first negotiation</Link>
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
