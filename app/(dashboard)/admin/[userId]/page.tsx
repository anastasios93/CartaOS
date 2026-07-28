"use client";

import { use } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import {
  ArrowLeft,
  Mail,
  Building2,
  Briefcase,
  Calendar,
  Activity,
  Loader2,
  Sparkles,
  FileText,
  Handshake,
  AlertCircle,
} from "lucide-react";

function format(date: Date | string | null) {
  if (!date) return "—";
  return new Date(date).toLocaleString();
}

const RUN_STATUS_LABEL: Record<string, string> = {
  draft: "Draft",
  diagnosis_running: "Diagnosis running",
  diagnosed: "Diagnosed",
  strategy_running: "Strategy running",
  strategized: "Awaiting plan",
  execution_running: "Planning",
  complete: "In execution",
  error: "Error",
};

export default function AdminUserPage({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  const { userId } = use(params);
  const q = trpc.admin.getUser.useQuery({ userId });

  if (q.isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }
  if (q.error) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-6">
        <div className="flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-red-500 mt-0.5" />
          <p className="text-sm font-semibold text-red-700">{q.error.message}</p>
        </div>
      </div>
    );
  }
  const data = q.data;
  if (!data) return null;
  const { user, runs, deals, negotiations, companies } = data;

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/admin"
          className="inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-[#F97316] transition-colors mb-1"
        >
          <ArrowLeft className="h-3 w-3" />
          All users
        </Link>
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-[#F97316] to-[#EA580C] text-white font-bold text-base">
            {(user.name || user.email || "U").slice(0, 2).toUpperCase()}
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-[#1A1A2E] flex items-center gap-2">
              {user.name || "Unnamed"}
              {user.isAdmin && (
                <Badge className="bg-[#F97316]/10 text-[#F97316] border-0 text-[10px]">ADMIN</Badge>
              )}
            </h1>
            <p className="text-sm text-muted-foreground">{user.email}</p>
          </div>
        </div>
      </div>

      {/* Profile facts */}
      <Card className="border-border/40 shadow-sm">
        <CardContent className="p-5 grid grid-cols-2 sm:grid-cols-4 gap-4">
          <Fact icon={<Building2 className="h-3.5 w-3.5" />} label="Company" value={user.company || "—"} />
          <Fact icon={<Briefcase className="h-3.5 w-3.5" />} label="Role" value={user.role || "—"} />
          <Fact icon={<Activity className="h-3.5 w-3.5" />} label="Last Login" value={format(user.lastLoginAt)} />
          <Fact icon={<Calendar className="h-3.5 w-3.5" />} label="Joined" value={format(user.createdAt)} />
        </CardContent>
      </Card>

      {/* Runs — the spine replaced HubRequest as the record of activity */}
      <Section icon={<Sparkles className="h-4 w-4" />} title={`Runs (${runs.length})`} color="#0EA5E9">
        {runs.length === 0 ? (
          <p className="text-[12px] text-muted-foreground italic">No runs yet.</p>
        ) : (
          <div className="space-y-2">
            {runs.map((r) => (
              <div key={r.id} className="rounded-lg border border-border/40 bg-white p-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[13px] font-semibold text-[#1A1A2E]">{r.assetQuery || "Untitled"}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {r.assetType === "innovative" ? "Innovative" : "Off-patent"} ·{" "}
                      {(r.geographies || []).join(", ") || "—"}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <Badge variant="outline" className="text-[9px] h-5">
                      {RUN_STATUS_LABEL[r.status] ?? r.status}
                    </Badge>
                    <p className="text-[10px] text-muted-foreground mt-1">{format(r.createdAt)}</p>
                  </div>
                </div>
                {r.error && <p className="text-[10px] text-red-700 mt-2">{r.error}</p>}
              </div>
            ))}
          </div>
        )}
      </Section>

      {/* Deals */}
      <Section
        icon={<FileText className="h-4 w-4" />}
        title={`Deals (${deals.length})`}
        color="#10B981"
      >
        {deals.length === 0 ? (
          <p className="text-[12px] text-muted-foreground italic">No deals yet.</p>
        ) : (
          <div className="space-y-1">
            {deals.map((d) => (
              <div key={d.id} className="flex items-center gap-3 py-1.5 border-b border-border/20 last:border-0">
                <span className="text-[12px] font-semibold text-[#1A1A2E] flex-1 truncate">{d.title}</span>
                <Badge variant="outline" className="text-[9px] h-5">{d.dealType}</Badge>
                <span className="text-[10px] text-muted-foreground w-24 text-right">{format(d.announcedDate).slice(0, 10)}</span>
              </div>
            ))}
          </div>
        )}
      </Section>

      {/* Negotiations */}
      <Section
        icon={<Handshake className="h-4 w-4" />}
        title={`Negotiations (${negotiations.length})`}
        color="#8B5CF6"
      >
        {negotiations.length === 0 ? (
          <p className="text-[12px] text-muted-foreground italic">No negotiations yet.</p>
        ) : (
          <div className="space-y-1">
            {negotiations.map((n) => (
              <div key={n.id} className="flex items-center gap-3 py-1.5 border-b border-border/20 last:border-0">
                <span className="text-[12px] font-semibold text-[#1A1A2E] flex-1 truncate">{n.title}</span>
                <span className="text-[11px] text-muted-foreground">{n.company?.name}</span>
                <Badge variant="outline" className="text-[9px] h-5">{n.status}</Badge>
              </div>
            ))}
          </div>
        )}
      </Section>

      {/* Companies */}
      <Section
        icon={<Building2 className="h-4 w-4" />}
        title={`Tracked Companies (${companies.length})`}
        color="#3B82F6"
      >
        {companies.length === 0 ? (
          <p className="text-[12px] text-muted-foreground italic">None tracked.</p>
        ) : (
          <div className="space-y-1">
            {companies.map((c) => (
              <div key={c.id} className="flex items-center gap-3 py-1.5 border-b border-border/20 last:border-0">
                <span className="text-[12px] font-semibold text-[#1A1A2E] flex-1 truncate">{c.name}</span>
                <Badge variant="outline" className="text-[9px] h-5">{c.type}</Badge>
              </div>
            ))}
          </div>
        )}
      </Section>
    </div>
  );
}

function Fact({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div>
      <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70 mb-1">
        {icon}
        {label}
      </div>
      <p className="text-[13px] font-semibold text-[#1A1A2E] truncate">{value}</p>
    </div>
  );
}

function Section({
  icon,
  title,
  color,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  color: string;
  children: React.ReactNode;
}) {
  return (
    <Card className="border-border/40 shadow-sm">
      <CardContent className="p-5">
        <div className="flex items-center gap-2 mb-4 pb-3 border-b border-border/30">
          <div className="flex h-7 w-7 items-center justify-center rounded-md" style={{ backgroundColor: `${color}15`, color }}>
            {icon}
          </div>
          <h3 className="text-sm font-bold text-[#1A1A2E]">{title}</h3>
        </div>
        {children}
      </CardContent>
    </Card>
  );
}
