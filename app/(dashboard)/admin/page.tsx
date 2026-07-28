"use client";

import { useState } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc";
import {
  Shield,
  Users,
  Search,
  ArrowRight,
  Activity,
  FileText,
  Building2,
  Handshake,
  Sparkles,
  Loader2,
  AlertCircle,
} from "lucide-react";

function timeAgo(date: Date | string | null): string {
  if (!date) return "Never";
  const now = new Date();
  const d = new Date(date);
  const diff = Math.floor((now.getTime() - d.getTime()) / 1000);
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  return d.toLocaleDateString();
}

export default function AdminPage() {
  const [search, setSearch] = useState("");
  const statsQ = trpc.admin.platformStats.useQuery();
  const usersQ = trpc.admin.listUsers.useQuery({ search: search || undefined });

  if (usersQ.isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (usersQ.error) {
    const forbidden = usersQ.error.data?.code === "FORBIDDEN";
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-6">
        <div className="flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-red-500 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-red-700">
              {forbidden ? "Admin access required" : "Could not load admin data"}
            </p>
            <p className="text-xs text-red-600 mt-1">{usersQ.error.message}</p>
          </div>
        </div>
      </div>
    );
  }

  const users = usersQ.data ?? [];
  const stats = statsQ.data;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Shield className="h-5 w-5 text-[#F97316]" />
            <span className="text-[10px] font-bold tracking-widest uppercase text-[#F97316]">
              Admin Console
            </span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-[#1A1A2E]">Customer Activity</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            All registered users and their activity across the platform
          </p>
        </div>
      </div>

      {/* Platform stats */}
      {stats && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <StatCard label="Users" value={stats.users} icon={<Users className="h-4 w-4" />} color="#F97316" />
          <StatCard label="Runs" value={stats.runs} icon={<Sparkles className="h-4 w-4" />} color="#0EA5E9" />
          <StatCard label="Deals" value={stats.deals} icon={<FileText className="h-4 w-4" />} color="#10B981" />
          <StatCard label="Negotiations" value={stats.negotiations} icon={<Handshake className="h-4 w-4" />} color="#8B5CF6" />
          <StatCard label="Companies" value={stats.companies} icon={<Building2 className="h-4 w-4" />} color="#3B82F6" />
        </div>
      )}

      {/* Search */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Search by name, email, or company..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-9"
          />
        </div>
        <span className="text-[12px] text-muted-foreground">{users.length} users</span>
      </div>

      {/* Users table */}
      <Card className="border-border/40 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-border/40 bg-[#FAFAFA]">
                <Th>User</Th>
                <Th>Company</Th>
                <Th className="text-center">Diagnostics</Th>
                <Th className="text-center">Deals</Th>
                <Th className="text-center">Negotiations</Th>
                <Th>Last Login</Th>
                <Th>Joined</Th>
                <Th></Th>
              </tr>
            </thead>
            <tbody>
              {users.length === 0 && (
                <tr>
                  <td colSpan={8} className="text-center py-12 text-muted-foreground text-sm">
                    No users match this search
                  </td>
                </tr>
              )}
              {users.map((u) => (
                <tr key={u.id} className="border-b border-border/20 hover:bg-[#F0F9FF] transition-colors">
                  <td className="px-4 py-3">
                    <p className="text-[13px] font-semibold text-[#1A1A2E] flex items-center gap-2">
                      {u.name || "—"}
                      {u.isAdmin && (
                        <Badge className="bg-[#F97316]/10 text-[#F97316] border-0 text-[9px] h-4">
                          ADMIN
                        </Badge>
                      )}
                    </p>
                    <p className="text-[11px] text-muted-foreground">{u.email}</p>
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-[12px] text-[#475569]">{u.company || "—"}</p>
                    <p className="text-[10px] text-muted-foreground">{u.role || ""}</p>
                  </td>
                  <td className="px-4 py-3 text-center font-mono text-[12px] text-[#1A1A2E]">{u._count.runs}</td>
                  <td className="px-4 py-3 text-center font-mono text-[12px] text-[#1A1A2E]">{u._count.deals}</td>
                  <td className="px-4 py-3 text-center font-mono text-[12px] text-[#1A1A2E]">{u._count.negotiations}</td>
                  <td className="px-4 py-3 text-[12px] text-muted-foreground">{timeAgo(u.lastLoginAt)}</td>
                  <td className="px-4 py-3 text-[12px] text-muted-foreground">{timeAgo(u.createdAt)}</td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/admin/${u.id}`}
                      className="inline-flex items-center gap-1 text-[12px] font-semibold text-[#F97316] hover:underline"
                    >
                      View
                      <ArrowRight className="h-3 w-3" />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

function StatCard({ label, value, icon, color }: { label: string; value: number; icon: React.ReactNode; color: string }) {
  return (
    <Card className="border-border/40 shadow-sm relative overflow-hidden">
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70">{label}</p>
            <p className="text-2xl font-bold font-mono mt-1.5 text-[#1A1A2E]">{value}</p>
          </div>
          <div className="flex h-8 w-8 items-center justify-center rounded-lg" style={{ backgroundColor: `${color}10`, color }}>
            {icon}
          </div>
        </div>
      </CardContent>
      <div className="absolute bottom-0 left-0 right-0 h-[2px]" style={{ backgroundColor: color, opacity: 0.4 }} />
    </Card>
  );
}

function Th({ children, className = "" }: { children?: React.ReactNode; className?: string }) {
  return (
    <th className={`px-4 py-2.5 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70 ${className}`}>
      {children}
    </th>
  );
}
