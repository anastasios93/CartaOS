"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { THERAPEUTIC_AREAS, MODALITIES } from "@/lib/constants";
import { toast } from "sonner";
import { ArrowLeft, X } from "lucide-react";

const COMPANY_TYPES = [
  { value: "PHARMA", label: "Pharma" },
  { value: "BIOTECH", label: "Biotech" },
  { value: "CDMO", label: "CDMO" },
  { value: "CRO", label: "CRO" },
  { value: "FINANCIAL", label: "Financial" },
];

export default function NewCompanyPage() {
  const router = useRouter();
  const createCompany = trpc.company.create.useMutation({
    onSuccess: () => {
      toast.success("Company created");
      router.push("/companies");
    },
    onError: (err) => toast.error(err.message),
  });

  const [form, setForm] = useState({
    name: "",
    type: "PHARMA" as string,
    headquarters: "",
    website: "",
    notes: "",
  });
  const [therapeuticFocus, setTherapeuticFocus] = useState<string[]>([]);
  const [modalityFocus, setModalityFocus] = useState<string[]>([]);

  const updateField = (field: string, value: string | null) =>
    setForm((f) => ({ ...f, [field]: value ?? "" }));

  const toggleItem = (
    list: string[],
    setList: React.Dispatch<React.SetStateAction<string[]>>,
    item: string
  ) => {
    setList((prev) =>
      prev.includes(item) ? prev.filter((i) => i !== item) : [...prev, item]
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createCompany.mutate({
      name: form.name,
      type: form.type as any,
      headquarters: form.headquarters || undefined,
      website: form.website || undefined,
      notes: form.notes || undefined,
      therapeuticFocus,
      modalityFocus,
    });
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/companies">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <h1 className="text-2xl font-semibold tracking-tight">Add Company</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Company Details</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Label htmlFor="name">Company Name</Label>
              <Input
                id="name"
                value={form.name}
                onChange={(e) => updateField("name", e.target.value)}
                required
              />
            </div>
            <div>
              <Label>Type</Label>
              <Select value={form.type} onValueChange={(v) => updateField("type", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {COMPANY_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="headquarters">Headquarters</Label>
              <Input
                id="headquarters"
                value={form.headquarters}
                onChange={(e) => updateField("headquarters", e.target.value)}
                placeholder="e.g., Cambridge, MA"
              />
            </div>
            <div className="sm:col-span-2">
              <Label htmlFor="website">Website</Label>
              <Input
                id="website"
                value={form.website}
                onChange={(e) => updateField("website", e.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Focus Areas</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label className="mb-2 block">Therapeutic Focus</Label>
              <div className="flex flex-wrap gap-2">
                {THERAPEUTIC_AREAS.map((area) => (
                  <Badge
                    key={area}
                    variant={therapeuticFocus.includes(area) ? "default" : "outline"}
                    className="cursor-pointer"
                    onClick={() => toggleItem(therapeuticFocus, setTherapeuticFocus, area)}
                  >
                    {area}
                    {therapeuticFocus.includes(area) && <X className="ml-1 h-3 w-3" />}
                  </Badge>
                ))}
              </div>
            </div>
            <div>
              <Label className="mb-2 block">Modality Focus</Label>
              <div className="flex flex-wrap gap-2">
                {MODALITIES.map((mod) => (
                  <Badge
                    key={mod}
                    variant={modalityFocus.includes(mod) ? "default" : "outline"}
                    className="cursor-pointer"
                    onClick={() => toggleItem(modalityFocus, setModalityFocus, mod)}
                  >
                    {mod}
                    {modalityFocus.includes(mod) && <X className="ml-1 h-3 w-3" />}
                  </Badge>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              value={form.notes}
              onChange={(e) => updateField("notes", e.target.value)}
              rows={4}
              placeholder="Internal notes about this company..."
            />
          </CardContent>
        </Card>

        <div className="flex justify-end gap-3">
          <Button variant="outline" asChild>
            <Link href="/companies">Cancel</Link>
          </Button>
          <Button type="submit" disabled={createCompany.isPending}>
            {createCompany.isPending ? "Creating..." : "Create Company"}
          </Button>
        </div>
      </form>
    </div>
  );
}
