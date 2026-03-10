"use client";

import { use, useState } from "react";
import Link from "next/link";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { NEGOTIATION_STATUS_LABELS } from "@/lib/constants";
import { toast } from "sonner";
import {
  ArrowLeft,
  Zap,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Send,
  MessageSquare,
  Calendar,
  Mail,
} from "lucide-react";

function formatCurrency(value: number | null | undefined) {
  if (value == null) return "—";
  if (value >= 1000) return `$${(value / 1000).toFixed(1)}B`;
  return `$${value.toFixed(0)}M`;
}

const activityIcons: Record<string, React.ReactNode> = {
  EMAIL: <Mail className="h-4 w-4" />,
  MEETING: <Calendar className="h-4 w-4" />,
  NOTE: <MessageSquare className="h-4 w-4" />,
  OFFER: <Send className="h-4 w-4" />,
  COUNTEROFFER: <Send className="h-4 w-4" />,
};

export default function NegotiationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const utils = trpc.useUtils();
  const neg = trpc.negotiation.getById.useQuery(id);
  const runConductor = trpc.negotiation.runConductor.useMutation({
    onSuccess: () => {
      toast.success("Deal Conductor analysis complete");
      utils.negotiation.getById.invalidate(id);
    },
    onError: (err) => toast.error(err.message),
  });

  const updateStatus = trpc.negotiation.updateStatus.useMutation({
    onSuccess: () => {
      toast.success("Status updated");
      utils.negotiation.getById.invalidate(id);
    },
  });

  const addActivity = trpc.negotiation.addActivity.useMutation({
    onSuccess: () => {
      toast.success("Activity added");
      utils.negotiation.getById.invalidate(id);
      setNewActivity({ type: "NOTE", title: "", description: "" });
    },
  });

  const [newActivity, setNewActivity] = useState({
    type: "NOTE",
    title: "",
    description: "",
  });

  if (neg.isLoading) {
    return (
      <div className="mx-auto max-w-5xl space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (neg.error) {
    return (
      <div className="flex flex-col items-center py-16">
        <p className="text-sm text-muted-foreground">Negotiation not found</p>
        <Button size="sm" className="mt-3" asChild>
          <Link href="/negotiations">Back</Link>
        </Button>
      </div>
    );
  }

  const n = neg.data!;
  const blockers = (n.currentBlockers as any[]) ?? [];
  const nextSteps = (n.nextSteps as any[]) ?? [];
  const riskFlags = (n.riskFlags as any[]) ?? [];

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      {/* Header */}
      <div className="flex items-start gap-3">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/negotiations">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-semibold tracking-tight">{n.title}</h1>
          <div className="mt-1 flex items-center gap-2">
            <Link
              href={`/companies/${n.company.id}`}
              className="text-sm text-primary hover:underline"
            >
              {n.company.name}
            </Link>
            <Badge variant="outline">
              {NEGOTIATION_STATUS_LABELS[n.status] ?? n.status}
            </Badge>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Select
            value={n.status}
            onValueChange={(v) => v && updateStatus.mutate({ id: n.id, status: v as any })}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(NEGOTIATION_STATUS_LABELS).map(([k, v]) => (
                <SelectItem key={k} value={k}>{v}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            variant="secondary"
            onClick={() => runConductor.mutate(n.id)}
            disabled={runConductor.isPending}
          >
            <Zap className="mr-2 h-4 w-4" />
            {runConductor.isPending ? "Analyzing..." : "Run Deal Conductor"}
          </Button>
        </div>
      </div>

      {/* Key Terms */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <TermField label="Upfront" value={formatCurrency(n.proposedUpfront)} />
            <TermField label="Milestones" value={formatCurrency(n.proposedMilestones)} />
            <TermField
              label="Royalties"
              value={
                n.proposedRoyaltyLow != null
                  ? `${n.proposedRoyaltyLow}% – ${n.proposedRoyaltyHigh ?? "?"}%`
                  : "—"
              }
            />
            <TermField label="Territory" value={n.proposedTerritory ?? "—"} />
            <TermField
              label="Target Close"
              value={
                n.targetCloseDate
                  ? new Date(n.targetCloseDate).toLocaleDateString()
                  : "—"
              }
            />
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="conductor">
        <TabsList>
          <TabsTrigger value="conductor">Deal Conductor</TabsTrigger>
          <TabsTrigger value="activity">Activity ({n.activities.length})</TabsTrigger>
          <TabsTrigger value="actions">
            Actions ({n.actionItems.length})
          </TabsTrigger>
          <TabsTrigger value="benchmarks">
            Benchmarks ({n.benchmarkDeals.length})
          </TabsTrigger>
        </TabsList>

        {/* Deal Conductor tab */}
        <TabsContent value="conductor" className="space-y-4">
          {blockers.length === 0 && nextSteps.length === 0 && riskFlags.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center py-12">
                <Zap className="h-10 w-10 text-muted-foreground/50" />
                <p className="mt-3 text-sm text-muted-foreground">
                  Run the Deal Conductor to get AI-powered analysis
                </p>
                <Button
                  size="sm"
                  className="mt-3"
                  onClick={() => runConductor.mutate(n.id)}
                  disabled={runConductor.isPending}
                >
                  {runConductor.isPending ? "Analyzing..." : "Analyze Now"}
                </Button>
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Blockers */}
              {blockers.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base">
                      <AlertTriangle className="h-4 w-4 text-red-500" />
                      Blockers
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {blockers.map((b: any, i: number) => (
                      <div key={i} className="flex items-start gap-3 rounded-lg border p-3">
                        <Badge
                          variant={
                            b.severity === "HIGH"
                              ? "destructive"
                              : b.severity === "MEDIUM"
                                ? "default"
                                : "secondary"
                          }
                          className="text-xs"
                        >
                          {b.severity}
                        </Badge>
                        <div>
                          <p className="text-sm">{b.item}</p>
                          {b.owner && (
                            <p className="text-xs text-muted-foreground">Owner: {b.owner}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}

              {/* Next Steps */}
              {nextSteps.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base">
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                      Next Steps
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {nextSteps.map((s: any, i: number) => (
                      <div key={i} className="rounded-lg border p-3">
                        <p className="text-sm font-medium">{s.action}</p>
                        <div className="mt-1 flex gap-4 text-xs text-muted-foreground">
                          {s.who && <span>Who: {s.who}</span>}
                          {s.by && <span>By: {s.by}</span>}
                        </div>
                        {s.rationale && (
                          <p className="mt-1 text-xs text-muted-foreground">{s.rationale}</p>
                        )}
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}

              {/* Risk Flags */}
              {riskFlags.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base">
                      <AlertTriangle className="h-4 w-4 text-yellow-500" />
                      Risk Flags
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {riskFlags.map((r: any, i: number) => (
                      <div key={i} className="rounded-lg border p-3">
                        <p className="text-sm font-medium">{r.term}</p>
                        <p className="mt-1 text-xs text-muted-foreground">{r.issue}</p>
                        {r.benchmark && (
                          <p className="mt-1 text-xs text-muted-foreground">
                            Benchmark: {r.benchmark}
                          </p>
                        )}
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </TabsContent>

        {/* Activity Feed */}
        <TabsContent value="activity" className="space-y-4">
          {/* Add Activity Form */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Log Activity</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex gap-3">
                <Select
                  value={newActivity.type}
                  onValueChange={(v) =>
                    v && setNewActivity((a) => ({ ...a, type: v }))
                  }
                >
                  <SelectTrigger className="w-[140px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="NOTE">Note</SelectItem>
                    <SelectItem value="EMAIL">Email</SelectItem>
                    <SelectItem value="MEETING">Meeting</SelectItem>
                    <SelectItem value="OFFER">Offer</SelectItem>
                    <SelectItem value="COUNTEROFFER">Counter-offer</SelectItem>
                  </SelectContent>
                </Select>
                <Input
                  placeholder="Activity title..."
                  value={newActivity.title}
                  onChange={(e) =>
                    setNewActivity((a) => ({ ...a, title: e.target.value }))
                  }
                  className="flex-1"
                />
              </div>
              <Textarea
                placeholder="Description (optional)..."
                value={newActivity.description}
                onChange={(e) =>
                  setNewActivity((a) => ({ ...a, description: e.target.value }))
                }
                rows={2}
              />
              <Button
                size="sm"
                disabled={!newActivity.title || addActivity.isPending}
                onClick={() =>
                  addActivity.mutate({
                    negotiationId: n.id,
                    type: newActivity.type,
                    title: newActivity.title,
                    description: newActivity.description || undefined,
                  })
                }
              >
                {addActivity.isPending ? "Adding..." : "Add Activity"}
              </Button>
            </CardContent>
          </Card>

          {/* Activity Timeline */}
          {n.activities.length > 0 ? (
            <div className="space-y-3">
              {n.activities.map((activity) => (
                <Card key={activity.id}>
                  <CardContent className="flex items-start gap-3 pt-4">
                    <div className="mt-0.5 text-muted-foreground">
                      {activityIcons[activity.type] ?? <MessageSquare className="h-4 w-4" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium">{activity.title}</p>
                        <Badge variant="outline" className="text-xs">
                          {activity.type}
                        </Badge>
                      </div>
                      {activity.description && (
                        <p className="mt-1 text-sm text-muted-foreground whitespace-pre-wrap">
                          {activity.description}
                        </p>
                      )}
                      <p className="mt-1 text-xs text-muted-foreground">
                        {new Date(activity.occurredAt).toLocaleString()}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="py-8 text-center">
                <p className="text-sm text-muted-foreground">No activities logged yet</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Action Items */}
        <TabsContent value="actions" className="space-y-4">
          {n.actionItems.length > 0 ? (
            <div className="space-y-2">
              {n.actionItems.map((item) => (
                <Card key={item.id}>
                  <CardContent className="flex items-center gap-3 py-3">
                    <div
                      className={`h-2 w-2 rounded-full ${
                        item.status === "COMPLETED"
                          ? "bg-green-500"
                          : item.status === "OVERDUE"
                            ? "bg-red-500"
                            : item.status === "IN_PROGRESS"
                              ? "bg-yellow-500"
                              : "bg-blue-500"
                      }`}
                    />
                    <div className="flex-1">
                      <p className="text-sm font-medium">{item.title}</p>
                      {item.description && (
                        <p className="text-xs text-muted-foreground">{item.description}</p>
                      )}
                    </div>
                    <div className="text-right text-xs text-muted-foreground">
                      {item.assignedTo && <p>{item.assignedTo}</p>}
                      {item.dueDate && (
                        <p>{new Date(item.dueDate).toLocaleDateString()}</p>
                      )}
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {item.status}
                    </Badge>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="py-8 text-center">
                <p className="text-sm text-muted-foreground">No action items</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Benchmark Deals */}
        <TabsContent value="benchmarks" className="space-y-4">
          {n.benchmarkDeals.length > 0 ? (
            <div className="space-y-2">
              {n.benchmarkDeals.map((comp) => (
                <Card key={comp.id}>
                  <CardContent className="flex items-center justify-between py-3">
                    <div>
                      <Link
                        href={`/deals/${comp.deal.id}`}
                        className="text-sm font-medium hover:underline"
                      >
                        {comp.deal.title}
                      </Link>
                      {comp.notes && (
                        <p className="text-xs text-muted-foreground">{comp.notes}</p>
                      )}
                    </div>
                    {comp.relevanceScore != null && (
                      <Badge variant="secondary" className="text-xs">
                        {(comp.relevanceScore * 100).toFixed(0)}% relevant
                      </Badge>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="py-8 text-center">
                <p className="text-sm text-muted-foreground">
                  No benchmark deals linked
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function TermField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm font-medium">{value}</p>
    </div>
  );
}
