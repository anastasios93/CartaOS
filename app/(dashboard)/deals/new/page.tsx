"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DEAL_TYPES,
  DEAL_TYPE_LABELS,
  DEAL_STAGES,
  STAGE_LABELS,
  THERAPEUTIC_AREAS,
  MODALITIES,
} from "@/lib/constants";
import { toast } from "sonner";
import {
  FileInput,
  Sparkles,
  Upload,
  FileText,
  Wand2,
  ArrowRight,
  ArrowLeft,
  Check,
  Loader2,
  Lightbulb,
} from "lucide-react";
import Link from "next/link";

type Step = "method" | "details" | "financial" | "review";

export default function AssetIntakePage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("method");
  const [method, setMethod] = useState<"extract" | "manual" | null>(null);

  const createDeal = trpc.deal.create.useMutation({
    onSuccess: () => {
      toast.success("Deal Twin generated successfully!");
      router.push("/deals");
    },
    onError: (err) => toast.error(err.message),
  });

  const extractDeal = trpc.ai.extractDeal.useMutation({
    onSuccess: (data) => {
      toast.success("Terms extracted — review below");
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
      setStep("details");
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

  const handleSubmit = () => {
    createDeal.mutate({
      ...form,
      dealType: form.dealType as any,
      status: form.status as any,
      developmentStage: form.developmentStage as any,
      sourceType: form.sourceType as any,
      upfrontPayment: form.upfrontPayment ? parseFloat(form.upfrontPayment) : undefined,
      totalDealValue: form.totalDealValue ? parseFloat(form.totalDealValue) : undefined,
      developmentMilestones: form.developmentMilestones ? parseFloat(form.developmentMilestones) : undefined,
      commercialMilestones: form.commercialMilestones ? parseFloat(form.commercialMilestones) : undefined,
      royaltyRangeLow: form.royaltyRangeLow ? parseFloat(form.royaltyRangeLow) : undefined,
      royaltyRangeHigh: form.royaltyRangeHigh ? parseFloat(form.royaltyRangeHigh) : undefined,
    });
  };

  const steps: { key: Step; label: string; num: number }[] = [
    { key: "method", label: "Method", num: 1 },
    { key: "details", label: "Asset Details", num: 2 },
    { key: "financial", label: "Financial Terms", num: 3 },
    { key: "review", label: "Generate Twin", num: 4 },
  ];

  const currentIdx = steps.findIndex((s) => s.key === step);

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" className="shrink-0 rounded-xl" asChild>
          <Link href="/">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#1A1A2E]">Asset Intake</h1>
          <p className="text-sm text-muted-foreground">Upload an asset to generate its Deal Twin</p>
        </div>
      </div>

      {/* Progress stepper */}
      <div className="flex items-center gap-2">
        {steps.map((s, i) => (
          <div key={s.key} className="flex items-center gap-2 flex-1">
            <button
              onClick={() => i <= currentIdx && setStep(s.key)}
              className={`flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium transition-all ${
                s.key === step
                  ? "bg-[#F97316] text-white shadow-sm shadow-[#F97316]/25"
                  : i < currentIdx
                  ? "bg-[#F97316]/10 text-[#F97316] cursor-pointer hover:bg-[#F97316]/20"
                  : "bg-[#F3F4F6] text-muted-foreground"
              }`}
            >
              {i < currentIdx ? (
                <Check className="h-3 w-3" />
              ) : (
                <span className="flex h-4 w-4 items-center justify-center rounded-full text-[10px] font-bold">
                  {s.num}
                </span>
              )}
              <span className="hidden sm:inline">{s.label}</span>
            </button>
            {i < steps.length - 1 && (
              <div className={`h-px flex-1 ${i < currentIdx ? "bg-[#F97316]/30" : "bg-border/40"}`} />
            )}
          </div>
        ))}
      </div>

      {/* Step 1: Method */}
      {step === "method" && (
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <button
              onClick={() => setMethod("extract")}
              className={`group text-left rounded-xl border-2 p-6 transition-all hover:shadow-md ${
                method === "extract"
                  ? "border-[#F97316] bg-[#FFF7ED] shadow-sm"
                  : "border-border/40 hover:border-border"
              }`}
            >
              <div className={`flex h-12 w-12 items-center justify-center rounded-xl mb-4 ${
                method === "extract" ? "bg-[#F97316] text-white" : "bg-[#F97316]/10 text-[#F97316]"
              }`}>
                <Wand2 className="h-6 w-6" />
              </div>
              <h3 className="text-base font-semibold text-[#1A1A2E]">AI Extract</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Paste a press release, 8-K, or agreement and AI will extract all deal terms automatically
              </p>
              <Badge className="mt-3 bg-[#F97316]/10 text-[#F97316] border-0 text-[10px] font-semibold">
                Recommended
              </Badge>
            </button>

            <button
              onClick={() => setMethod("manual")}
              className={`group text-left rounded-xl border-2 p-6 transition-all hover:shadow-md ${
                method === "manual"
                  ? "border-[#F97316] bg-[#FFF7ED] shadow-sm"
                  : "border-border/40 hover:border-border"
              }`}
            >
              <div className={`flex h-12 w-12 items-center justify-center rounded-xl mb-4 ${
                method === "manual" ? "bg-[#3B82F6] text-white" : "bg-[#3B82F6]/10 text-[#3B82F6]"
              }`}>
                <FileInput className="h-6 w-6" />
              </div>
              <h3 className="text-base font-semibold text-[#1A1A2E]">Manual Entry</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Enter deal terms manually with a guided form for full control over every field
              </p>
            </button>
          </div>

          {method === "extract" && (
            <Card className="border-border/40 shadow-sm">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-[#F97316]" />
                  <CardTitle className="text-sm font-semibold">Paste Document Text</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <Textarea
                  placeholder="Paste a press release, 8-K filing, or partnership agreement text here..."
                  value={documentText}
                  onChange={(e) => setDocumentText(e.target.value)}
                  rows={10}
                  className="resize-none text-sm"
                />
                <div className="flex items-center justify-between">
                  <p className="text-[11px] text-muted-foreground">
                    {documentText.length > 0 ? `${documentText.length} characters` : "Min. 20 characters required"}
                  </p>
                  <Button
                    onClick={() => extractDeal.mutate({ documentText })}
                    disabled={extractDeal.isPending || documentText.length < 20}
                    className="gap-2 bg-[#F97316] hover:bg-[#EA580C] text-white"
                  >
                    {extractDeal.isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Extracting...
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-4 w-4" />
                        Extract Terms
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {method === "manual" && (
            <div className="flex justify-end">
              <Button onClick={() => setStep("details")} className="gap-2 bg-[#F97316] hover:bg-[#EA580C] text-white">
                Continue <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Step 2: Asset Details */}
      {step === "details" && (
        <div className="space-y-5">
          <Card className="border-border/40 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold">Deal Information</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <Label className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">Deal Title</Label>
                <Input
                  value={form.title}
                  onChange={(e) => updateField("title", e.target.value)}
                  placeholder="e.g., Pfizer-BioNTech COVID-19 Vaccine Collaboration"
                  className="mt-1.5 h-10"
                  required
                />
              </div>
              <div>
                <Label className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">Deal Type</Label>
                <Select value={form.dealType} onValueChange={(v) => updateField("dealType", v)}>
                  <SelectTrigger className="mt-1.5 h-10"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {DEAL_TYPES.map((t) => (
                      <SelectItem key={t} value={t}>{DEAL_TYPE_LABELS[t]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">Announced Date</Label>
                <Input type="date" value={form.announcedDate} onChange={(e) => updateField("announcedDate", e.target.value)} className="mt-1.5 h-10" required />
              </div>
              <div>
                <Label className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">Licensor</Label>
                <Input value={form.licensorName} onChange={(e) => updateField("licensorName", e.target.value)} className="mt-1.5 h-10" required />
              </div>
              <div>
                <Label className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">Licensee</Label>
                <Input value={form.licenseeName} onChange={(e) => updateField("licenseeName", e.target.value)} className="mt-1.5 h-10" required />
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/40 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold">Asset & Indication</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">Asset Name</Label>
                <Input value={form.assetName} onChange={(e) => updateField("assetName", e.target.value)} className="mt-1.5 h-10" />
              </div>
              <div>
                <Label className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">Therapeutic Area</Label>
                <Select value={form.therapeuticArea} onValueChange={(v) => updateField("therapeuticArea", v)}>
                  <SelectTrigger className="mt-1.5 h-10"><SelectValue placeholder="Select..." /></SelectTrigger>
                  <SelectContent>
                    {THERAPEUTIC_AREAS.map((area) => (
                      <SelectItem key={area} value={area}>{area}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">Modality</Label>
                <Select value={form.modality} onValueChange={(v) => updateField("modality", v)}>
                  <SelectTrigger className="mt-1.5 h-10"><SelectValue placeholder="Select..." /></SelectTrigger>
                  <SelectContent>
                    {MODALITIES.map((m) => (
                      <SelectItem key={m} value={m}>{m}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">Development Stage</Label>
                <Select value={form.developmentStage} onValueChange={(v) => updateField("developmentStage", v)}>
                  <SelectTrigger className="mt-1.5 h-10"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {DEAL_STAGES.map((s) => (
                      <SelectItem key={s} value={s}>{STAGE_LABELS[s]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="sm:col-span-2">
                <Label className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">Indication</Label>
                <Input value={form.indication} onChange={(e) => updateField("indication", e.target.value)} placeholder="e.g., Non-small cell lung cancer" className="mt-1.5 h-10" />
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-between">
            <Button variant="outline" onClick={() => setStep("method")} className="gap-2">
              <ArrowLeft className="h-4 w-4" /> Back
            </Button>
            <Button onClick={() => setStep("financial")} className="gap-2 bg-[#F97316] hover:bg-[#EA580C] text-white">
              Continue <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Step 3: Financial Terms */}
      {step === "financial" && (
        <div className="space-y-5">
          <Card className="border-border/40 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold">Financial Terms (USD millions)</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">Upfront Payment</Label>
                <Input type="number" step="0.1" value={form.upfrontPayment} onChange={(e) => updateField("upfrontPayment", e.target.value)} className="mt-1.5 h-10" />
              </div>
              <div>
                <Label className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">Total Deal Value</Label>
                <Input type="number" step="0.1" value={form.totalDealValue} onChange={(e) => updateField("totalDealValue", e.target.value)} className="mt-1.5 h-10" />
              </div>
              <div>
                <Label className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">Development Milestones</Label>
                <Input type="number" step="0.1" value={form.developmentMilestones} onChange={(e) => updateField("developmentMilestones", e.target.value)} className="mt-1.5 h-10" />
              </div>
              <div>
                <Label className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">Commercial Milestones</Label>
                <Input type="number" step="0.1" value={form.commercialMilestones} onChange={(e) => updateField("commercialMilestones", e.target.value)} className="mt-1.5 h-10" />
              </div>
              <div>
                <Label className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">Royalty Range Low (%)</Label>
                <Input type="number" step="0.1" value={form.royaltyRangeLow} onChange={(e) => updateField("royaltyRangeLow", e.target.value)} className="mt-1.5 h-10" />
              </div>
              <div>
                <Label className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">Royalty Range High (%)</Label>
                <Input type="number" step="0.1" value={form.royaltyRangeHigh} onChange={(e) => updateField("royaltyRangeHigh", e.target.value)} className="mt-1.5 h-10" />
              </div>
              <div className="sm:col-span-2">
                <Label className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">Territory Scope</Label>
                <Input value={form.territoryScope} onChange={(e) => updateField("territoryScope", e.target.value)} placeholder="e.g., Worldwide ex-Greater China" className="mt-1.5 h-10" />
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-between">
            <Button variant="outline" onClick={() => setStep("details")} className="gap-2">
              <ArrowLeft className="h-4 w-4" /> Back
            </Button>
            <Button onClick={() => setStep("review")} className="gap-2 bg-[#F97316] hover:bg-[#EA580C] text-white">
              Continue <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Step 4: Review & Generate */}
      {step === "review" && (
        <div className="space-y-5">
          {/* AI Tip */}
          <div className="flex items-start gap-3 rounded-xl border border-[#F97316]/20 bg-[#FFF7ED] p-4">
            <Lightbulb className="h-5 w-5 text-[#F97316] shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-[#1A1A2E]">Ready to generate your Deal Twin</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                CartaOS will create an AI-powered digital twin of this deal, including comparable deals, partner matches, and benchmarking data.
              </p>
            </div>
          </div>

          {/* Summary */}
          <Card className="border-border/40 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold">Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-2">
                <ReviewField label="Title" value={form.title} />
                <ReviewField label="Deal Type" value={DEAL_TYPE_LABELS[form.dealType] ?? form.dealType} />
                <ReviewField label="Licensor" value={form.licensorName} />
                <ReviewField label="Licensee" value={form.licenseeName} />
                <ReviewField label="Asset" value={form.assetName} />
                <ReviewField label="Therapeutic Area" value={form.therapeuticArea} />
                <ReviewField label="Modality" value={form.modality} />
                <ReviewField label="Stage" value={STAGE_LABELS[form.developmentStage] ?? form.developmentStage} />
                <ReviewField label="Indication" value={form.indication} />
                <ReviewField label="Territory" value={form.territoryScope} />
                <ReviewField label="Upfront" value={form.upfrontPayment ? `$${form.upfrontPayment}M` : ""} />
                <ReviewField label="Total Value" value={form.totalDealValue ? `$${form.totalDealValue}M` : ""} />
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-between">
            <Button variant="outline" onClick={() => setStep("financial")} className="gap-2">
              <ArrowLeft className="h-4 w-4" /> Back
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={createDeal.isPending}
              className="gap-2 bg-gradient-to-r from-[#F97316] to-[#EA580C] hover:from-[#EA580C] hover:to-[#C2410C] text-white shadow-md shadow-[#F97316]/25"
            >
              {createDeal.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  Generate Deal Twin
                </>
              )}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function ReviewField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">{label}</p>
      <p className="text-sm font-medium mt-0.5 text-[#1A1A2E]">{value || "\u2014"}</p>
    </div>
  );
}
