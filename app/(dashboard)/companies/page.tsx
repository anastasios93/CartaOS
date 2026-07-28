"use client";

import { useState } from "react";
import Link from "next/link";
import { trpc } from "@/lib/trpc";
import { Card, CardContent } from "@/components/ui/card";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PARTNER_STATUS_LABELS } from "@/lib/constants";
import { Search, Plus, Building2 } from "lucide-react";

const COMPANY_TYPE_LABELS: Record<string, string> = {
  PHARMA: "Pharma",
  BIOTECH: "Biotech",
  CDMO: "CDMO",
  CRO: "CRO",
  FINANCIAL: "Financial",
};

const statusColorMap: Record<string, string> = {
  IDENTIFIED: "secondary",
  CONTACTED: "outline",
  IN_DISCUSSION: "default",
  ACTIVE: "default",
  DECLINED: "destructive",
};

export default function CompaniesPage() {
  const [search, setSearch] = useState("");
  const [type, setType] = useState<string>("all");
  const [status, setStatus] = useState<string>("all");

  const companies = trpc.company.list.useQuery({
    search: search || undefined,
    type: type !== "all" ? (type as any) : undefined,
    status: status !== "all" ? (status as any) : undefined,
    limit: 50,
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Companies</h1>
          <p className="text-sm text-muted-foreground">
            Partner CRM and company profiles
          </p>
        </div>
        <Button asChild>
          <Link href="/companies/new">
            <Plus className="mr-2 h-4 w-4" /> Add Company
          </Link>
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search companies..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={type} onValueChange={(v) => setType(v ?? "all")}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {Object.entries(COMPANY_TYPE_LABELS).map(([k, v]) => (
                  <SelectItem key={k} value={k}>{v}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={status} onValueChange={(v) => setStatus(v ?? "all")}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                {Object.entries(PARTNER_STATUS_LABELS).map(([k, v]) => (
                  <SelectItem key={k} value={k}>{v}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {companies.isLoading ? (
            <div className="p-6 space-y-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : companies.data?.items?.length ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Company</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Focus Areas</TableHead>
                  <TableHead className="text-right">Deals</TableHead>
                  <TableHead>Score</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {companies.data.items.map((company) => (
                  <TableRow key={company.id}>
                    <TableCell>
                      <span className="font-medium">{company.name}</span>
                      {company.headquarters && (
                        <p className="text-xs text-muted-foreground">{company.headquarters}</p>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">
                        {COMPANY_TYPE_LABELS[company.type] ?? company.type}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={statusColorMap[company.partnerStatus] as any ?? "secondary"}
                        className="text-xs"
                      >
                        {PARTNER_STATUS_LABELS[company.partnerStatus] ?? company.partnerStatus}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {company.therapeuticFocus.slice(0, 2).map((area) => (
                          <Badge key={area} variant="secondary" className="text-xs">
                            {area}
                          </Badge>
                        ))}
                        {company.therapeuticFocus.length > 2 && (
                          <Badge variant="secondary" className="text-xs">
                            +{company.therapeuticFocus.length - 2}
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right text-sm">
                      {company._count.dealsAsLicensor + company._count.dealsAsLicensee}
                    </TableCell>
                    <TableCell>
                      {company.partnerScore != null ? (
                        <span className="text-sm font-medium">
                          {company.partnerScore.toFixed(0)}
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="flex flex-col items-center justify-center py-16">
              <Building2 className="h-10 w-10 text-muted-foreground/50" />
              <p className="mt-3 text-sm text-muted-foreground">No companies found</p>
              <Button size="sm" className="mt-3" asChild>
                <Link href="/companies/new">Add your first company</Link>
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
