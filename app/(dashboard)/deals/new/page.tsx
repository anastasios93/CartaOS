"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DEAL_TYPES,
  DEAL_TYPE_LABELS,
  DEAL_STAGES,
  STAGE_LABELS,
  THERAPEUTIC_AREAS,
  MODALITIES,
} from "@/lib/constants";
import { toast } from "sonner";
import { ArrowLeft, Sparkles } from "lucide-react";
import Link from "next/link";

export default function NewDealPage() {
  const router = useRouter();
  const createDeal = trpc.deal.create.useMutation({
    onSuccess: () => {
      toast.success("Deal created");
      router.push("/deals");
    },
    onError: (err) => toast.error(err.message),
  });

  const extractDeal = trpc.ai.extractDeal.useMutation({
    onSuccess: (data) => {
      toast.success("Terms extracted — review and save");
      if (data.licensorName) setForm((f) => ({ ...f, licensorName: data.licensorName }));
      if (data.licenseeName) setForm((f) => ({ ...f, licenseeName: data.licenseeName }));
      if (data.therapeuticArea) setForm((f) => ({ ...f, therapeuticArea: data.therapeuticArea }));
      if (data.assetName) setForm((f) => ({ ...f, assetName: data.assetName }));
      if (data.modality) setForm((f) => ({ ...f, modality: data.modality }));
      if (data.indication) setForm((f) => ({ ...f, indication: data.indication }));
      if (data.dealType) setForm((f) => ({ ...f, dealType: data.dealType }));
      if (data.developmentStage) setForm((f) => ({ ...f, developmentStage: data.developmentStage }));
      if (data.financialTerms) {
        const ft = data.financialTerms;
        setForm((f) => ({
          ...f,
          upfrontPayment: ft.upfrontPaymentUsdMm?.toString() ?? "",
          totalDealValue: ft.totalDealValueUsdMm?.toString() ?? "",
          developmentMilestones: ft.developmentMilestonesUsdMm?.toString() ?? "",
          commercialMilestones: ft.commercialMilestonesUsdMm?.toString() ?? "",
          royaltyRangeLow: ft.royaltyRangeLowPct?.toString() ?? "",
          royaltyRangeHigh: ft.royaltyRangeHighPct?.toString() ?? "",
        }));
      }
      if (data.structure?.territoryScope) {
        setForm((f) => ({ ...f, territoryScope: data.structure.territoryScope }));
      }
    },
    onError: (err) => toast.error(err.message),
  });

  const [documentText, setDocumentText] = useState("");
  const [form, setForm] = useState({
    title: "",
    dealType: "OUT_LICENSE" as string,
    announcedDate: "",
    status: "ANNOUNCED" as string,
    licensorName: "",
    licenseeName: "",
    therapeuticArea: "",
    developmentStage: "PRECLINICAL" as string,
    sourceType: "MANUAL" as string,
    assetName: "",
    modality: "",
    indication: "",
    upfrontPayment: "",
    totalDealValue: "",
    developmentMilestones: "",
    commercialMilestones: "",
    royaltyRangeLow: "",
    royaltyRangeHigh: "",
    territoryScope: "",
    exclusivity: true,
    sourceUrl: "",
  });

  const updateField = (field: string, value: string | null) =>
    setForm((f) => ({ ...f, [field]: value ?? "" }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createDeal.mutate({
      ...form,
      dealType: form.dealType as any,
      status: form.status as any,
      developmentStage: form.developmentStage as any,
      sourceType: form.sourceType as any,
      upfrontPayment: form.upfrontPayment ? parseFloat(form.upfrontPayment) : undefined,
      totalDealValue: form.totalDealValue ? parseFloat(form.totalDealValue) : undefined,
      developmentMilestones: form.developmentMilestones
        ? parseFloat(form.developmentMilestones)
        : undefined,
      commercialMilestones: form.commercialMilestones
        ? parseFloat(form.commercialMilestones)
        : undefined,
      royaltyRangeLow: form.royaltyRangeLow
        ? parseFloat(form.royaltyRangeLow)
        : undefined,
      royaltyRangeHigh: form.royaltyRangeHigh
        ? parseFloat(form.royaltyRangeHigh)
        : undefined,
    });
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/deals">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Add Deal</h1>
          <p className="text-sm text-muted-foreground">
            Enter manually or extract from a document
          </p>
        </div>
      </div>

      <Tabs defaultValue="manual">
        <TabsList>
          <TabsTrigger value="manual">Manual Entry</TabsTrigger>
          <TabsTrigger value="extract">AI Extract</TabsTrigger>
        </TabsList>

        <TabsContent value="extract">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Extract Deal Terms</CardTitle>
              <CardDescription>
                Paste a press release, 8-K, or agreement text and CartaOS will extract structured terms
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Textarea
                placeholder="Paste document text here..."
                value={documentText}
                onChange={(e) => setDocumentText(e.target.value)}
                rows={12}
              />
              <Button
                onClick={() => extractDeal.mutate({ documentText })}
                disabled={extractDeal.isPending || documentText.length < 20}
              >
                <Sparkles className="mr-2 h-4 w-4" />
                {extractDeal.isPending ? "Extracting..." : "Extract Terms"}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="manual">
          <form onSubmit={handleSubmit}>
            <div className="space-y-6">
              {/* Basic Info */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Deal Information</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-4 sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <Label htmlFor="title">Deal Title</Label>
                    <Input
                      id="title"
                      value={form.title}
                      onChange={(e) => updateField("title", e.target.value)}
                      placeholder="e.g., Pfizer-BioNTech COVID-19 Vaccine Collaboration"
                      required
                    />
                  </div>
                  <div>
                    <Label>Deal Type</Label>
                    <Select value={form.dealType} onValueChange={(v) => updateField("dealType", v)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {DEAL_TYPES.map((t) => (
                          <SelectItem key={t} value={t}>{DEAL_TYPE_LABELS[t]}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="announcedDate">Announced Date</Label>
                    <Input
                      id="announcedDate"
                      type="date"
                      value={form.announcedDate}
                      onChange={(e) => updateField("announcedDate", e.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="licensorName">Licensor</Label>
                    <Input
                      id="licensorName"
                      value={form.licensorName}
                      onChange={(e) => updateField("licensorName", e.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="licenseeName">Licensee</Label>
                    <Input
                      id="licenseeName"
                      value={form.licenseeName}
                      onChange={(e) => updateField("licenseeName", e.target.value)}
                      required
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Asset Info */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Asset & Indication</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <Label htmlFor="assetName">Asset Name</Label>
                    <Input
                      id="assetName"
                      value={form.assetName}
                      onChange={(e) => updateField("assetName", e.target.value)}
                    />
                  </div>
                  <div>
                    <Label>Therapeutic Area</Label>
                    <Select
                      value={form.therapeuticArea}
                      onValueChange={(v) => updateField("therapeuticArea", v)}
                    >
                      <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                      <SelectContent>
                        {THERAPEUTIC_AREAS.map((area) => (
                          <SelectItem key={area} value={area}>{area}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Modality</Label>
                    <Select value={form.modality} onValueChange={(v) => updateField("modality", v)}>
                      <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                      <SelectContent>
                        {MODALITIES.map((m) => (
                          <SelectItem key={m} value={m}>{m}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Development Stage</Label>
                    <Select
                      value={form.developmentStage}
                      onValueChange={(v) => updateField("developmentStage", v)}
                    >
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {DEAL_STAGES.map((s) => (
                          <SelectItem key={s} value={s}>{STAGE_LABELS[s]}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="sm:col-span-2">
                    <Label htmlFor="indication">Indication</Label>
                    <Input
                      id="indication"
                      value={form.indication}
                      onChange={(e) => updateField("indication", e.target.value)}
                      placeholder="e.g., Non-small cell lung cancer"
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Financial Terms */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Financial Terms (USD millions)</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <Label htmlFor="upfrontPayment">Upfront Payment</Label>
                    <Input
                      id="upfrontPayment"
                      type="number"
                      step="0.1"
                      value={form.upfrontPayment}
                      onChange={(e) => updateField("upfrontPayment", e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="totalDealValue">Total Deal Value</Label>
                    <Input
                      id="totalDealValue"
                      type="number"
                      step="0.1"
                      value={form.totalDealValue}
                      onChange={(e) => updateField("totalDealValue", e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="developmentMilestones">Development Milestones</Label>
                    <Input
                      id="developmentMilestones"
                      type="number"
                      step="0.1"
                      value={form.developmentMilestones}
                      onChange={(e) => updateField("developmentMilestones", e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="commercialMilestones">Commercial Milestones</Label>
                    <Input
                      id="commercialMilestones"
                      type="number"
                      step="0.1"
                      value={form.commercialMilestones}
                      onChange={(e) => updateField("commercialMilestones", e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="royaltyRangeLow">Royalty Range Low (%)</Label>
                    <Input
                      id="royaltyRangeLow"
                      type="number"
                      step="0.1"
                      value={form.royaltyRangeLow}
                      onChange={(e) => updateField("royaltyRangeLow", e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="royaltyRangeHigh">Royalty Range High (%)</Label>
                    <Input
                      id="royaltyRangeHigh"
                      type="number"
                      step="0.1"
                      value={form.royaltyRangeHigh}
                      onChange={(e) => updateField("royaltyRangeHigh", e.target.value)}
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <Label htmlFor="territoryScope">Territory Scope</Label>
                    <Input
                      id="territoryScope"
                      value={form.territoryScope}
                      onChange={(e) => updateField("territoryScope", e.target.value)}
                      placeholder="e.g., Worldwide ex-Greater China"
                    />
                  </div>
                </CardContent>
              </Card>

              <div className="flex justify-end gap-3">
                <Button variant="outline" asChild>
                  <Link href="/deals">Cancel</Link>
                </Button>
                <Button type="submit" disabled={createDeal.isPending}>
                  {createDeal.isPending ? "Creating..." : "Create Deal"}
                </Button>
              </div>
            </div>
          </form>
        </TabsContent>
      </Tabs>
    </div>
  );
}
