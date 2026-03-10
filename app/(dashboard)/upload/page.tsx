"use client";

import { useState, useCallback, useRef } from "react";
import { trpc } from "@/lib/trpc";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Upload,
  FileText,
  FileSpreadsheet,
  FileImage,
  File,
  Trash2,
  CloudUpload,
  CheckCircle2,
  RefreshCw,
  Database,
  Globe,
  Link as LinkIcon,
  HardDrive,
  Mail,
  Loader2,
  Bot,
  ExternalLink,
} from "lucide-react";

function formatDate(date: string | Date) {
  return new Date(date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getFileType(mimeType: string): string {
  if (mimeType.includes("pdf")) return "PDF";
  if (mimeType.includes("word") || mimeType.includes("docx")) return "DOCX";
  if (mimeType.includes("sheet") || mimeType.includes("xlsx")) return "XLSX";
  if (mimeType.includes("presentation") || mimeType.includes("pptx")) return "PPTX";
  if (mimeType.includes("csv")) return "CSV";
  if (mimeType.includes("text")) return "TXT";
  return "FILE";
}

const DOC_ICONS: Record<string, React.ReactNode> = {
  PDF: <FileText className="h-5 w-5 text-red-400" />,
  DOCX: <FileText className="h-5 w-5 text-blue-400" />,
  XLSX: <FileSpreadsheet className="h-5 w-5 text-green-400" />,
  PPTX: <FileImage className="h-5 w-5 text-amber-400" />,
  CSV: <FileSpreadsheet className="h-5 w-5 text-teal-400" />,
  TXT: <File className="h-5 w-5 text-gray-400" />,
};

const STATUS_BADGES: Record<string, { label: string; className: string }> = {
  PENDING: { label: "Pending", className: "bg-yellow-500/15 text-yellow-600 border-yellow-500/30" },
  EXTRACTING: { label: "Extracting...", className: "bg-blue-500/15 text-blue-600 border-blue-500/30" },
  DONE: { label: "Extracted", className: "bg-green-500/15 text-green-600 border-green-500/30" },
  FAILED: { label: "Failed", className: "bg-red-500/15 text-red-600 border-red-500/30" },
};

const DATA_SOURCES = [
  {
    id: "src-1",
    name: "SEC EDGAR",
    description: "SEC filings, 10-K, 8-K, and deal announcements",
    icon: Database,
    connected: true,
    syncStatus: "synced" as const,
    lastSync: "2024-03-10 08:30 AM",
    records: 1247,
  },
  {
    id: "src-2",
    name: "ClinicalTrials.gov",
    description: "Clinical trial registrations and results data",
    icon: Globe,
    connected: true,
    syncStatus: "synced" as const,
    lastSync: "2024-03-09 11:45 PM",
    records: 892,
  },
  {
    id: "src-3",
    name: "SharePoint",
    description: "Internal document management and collaboration",
    icon: HardDrive,
    connected: false,
    syncStatus: "not_connected" as const,
    lastSync: null,
    records: 0,
  },
  {
    id: "src-4",
    name: "Outlook",
    description: "Email integration for deal correspondence tracking",
    icon: Mail,
    connected: false,
    syncStatus: "not_connected" as const,
    lastSync: null,
    records: 0,
  },
];

export default function UploadPage() {
  const [isDragOver, setIsDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [syncing, setSyncing] = useState<Record<string, boolean>>({});
  const [extracting, setExtracting] = useState<Record<string, boolean>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);

  const utils = trpc.useUtils();
  const documentsQuery = trpc.document.list.useQuery(undefined, {
    retry: false,
    refetchOnWindowFocus: false,
  });
  const getUploadUrlMutation = trpc.document.getUploadUrl.useMutation();
  const extractMutation = trpc.document.extract.useMutation();
  const deleteMutation = trpc.document.delete.useMutation();

  const documents = documentsQuery.data ?? [];

  async function handleFileUpload(fileList: FileList | null) {
    if (!fileList?.length) return;
    setUploading(true);

    try {
      for (const file of Array.from(fileList)) {
        const { uploadUrl } = await getUploadUrlMutation.mutateAsync({
          filename: file.name,
          mimeType: file.type || "application/octet-stream",
          fileSize: file.size,
        });

        await fetch(uploadUrl, {
          method: "PUT",
          headers: { "Content-Type": file.type || "application/octet-stream" },
          body: file,
        });
      }
      utils.document.list.invalidate();
    } catch (error) {
      console.error("Upload failed:", error);
    } finally {
      setUploading(false);
    }
  }

  async function handleExtract(documentId: string) {
    setExtracting((prev) => ({ ...prev, [documentId]: true }));
    try {
      await extractMutation.mutateAsync({ documentId });
      utils.document.list.invalidate();
    } catch (error) {
      console.error("Extraction failed:", error);
    } finally {
      setExtracting((prev) => ({ ...prev, [documentId]: false }));
    }
  }

  async function handleDelete(documentId: string) {
    try {
      await deleteMutation.mutateAsync(documentId);
      utils.document.list.invalidate();
    } catch {
      console.error("Delete failed");
    }
  }

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);
      handleFileUpload(e.dataTransfer.files);
    },
    [handleFileUpload]
  );

  const handleSyncNow = (sourceId: string) => {
    setSyncing((prev) => ({ ...prev, [sourceId]: true }));
    setTimeout(() => {
      setSyncing((prev) => ({ ...prev, [sourceId]: false }));
    }, 2000);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Upload & Data Sources
        </h1>
        <p className="text-sm text-muted-foreground">
          Upload documents for AI-powered deal term extraction
        </p>
      </div>

      {/* Upload zone */}
      <Card>
        <CardContent className="pt-6">
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept=".pdf,.docx,.xlsx,.pptx,.csv,.txt"
            className="hidden"
            onChange={(e) => handleFileUpload(e.target.files)}
          />
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-12 transition-colors ${
              isDragOver
                ? "border-[#F97316] bg-[#F97316]/5"
                : "border-border hover:border-[#F97316]/50 hover:bg-muted/30"
            }`}
          >
            {uploading ? (
              <Loader2 className="h-12 w-12 animate-spin text-[#F97316]" />
            ) : (
              <CloudUpload
                className={`h-12 w-12 ${isDragOver ? "text-[#F97316]" : "text-muted-foreground/50"}`}
              />
            )}
            <p className="mt-4 text-sm font-medium">
              {uploading ? "Uploading..." : "Drag and drop files here"}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              or click to browse
            </p>
            <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
              {["PDF", "DOCX", "XLSX", "PPTX", "CSV", "TXT"].map((fmt) => (
                <Badge key={fmt} variant="outline" className="text-[10px]">
                  {fmt}
                </Badge>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Uploaded Files */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Uploaded Files ({documents.length})
            </CardTitle>
            <CardDescription>
              Upload documents and run AI extraction to discover deal terms
            </CardDescription>
          </CardHeader>
          <CardContent>
            {documents.length > 0 ? (
              <div className="space-y-2">
                {documents.map((doc: any) => {
                  const fileType = getFileType(doc.mimeType);
                  const statusBadge = STATUS_BADGES[doc.status] ?? STATUS_BADGES.PENDING;
                  return (
                    <div
                      key={doc.id}
                      className="flex items-center gap-3 rounded-lg border p-3 transition-colors hover:bg-muted/50"
                    >
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted">
                        {DOC_ICONS[fileType] ?? (
                          <File className="h-5 w-5 text-muted-foreground" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {doc.filename}
                        </p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                          <Badge variant="outline" className="text-[10px] px-1.5">
                            {fileType}
                          </Badge>
                          <span>{formatFileSize(doc.fileSize)}</span>
                          <span>{formatDate(doc.createdAt)}</span>
                          <Badge className={`text-[10px] px-1.5 border ${statusBadge.className}`}>
                            {statusBadge.label}
                          </Badge>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        {doc.status === "PENDING" && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 text-xs"
                            onClick={() => handleExtract(doc.id)}
                            disabled={extracting[doc.id]}
                          >
                            {extracting[doc.id] ? (
                              <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                            ) : (
                              <Bot className="mr-1 h-3 w-3" />
                            )}
                            Extract
                          </Button>
                        )}
                        {doc.status === "DONE" && doc.extractedDealId && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 text-xs"
                            asChild
                          >
                            <a href={`/deals/${doc.extractedDealId}`}>
                              <ExternalLink className="mr-1 h-3 w-3" />
                              View Deal
                            </a>
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="shrink-0 text-muted-foreground hover:text-red-400 h-7 w-7"
                          onClick={() => handleDelete(doc.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-8">
                <File className="h-10 w-10 text-muted-foreground/50" />
                <p className="mt-3 text-sm text-muted-foreground">
                  No files uploaded yet
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Upload a PDF or document to extract deal terms with AI
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Connected Data Sources */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Connected Data Sources
            </CardTitle>
            <CardDescription>
              External data feeds and integrations
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {DATA_SOURCES.map((source) => {
                const Icon = source.icon;
                return (
                  <div
                    key={source.id}
                    className="rounded-lg border p-4 space-y-3"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted">
                          <Icon className="h-5 w-5 text-muted-foreground" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-medium">
                              {source.name}
                            </p>
                            {source.connected ? (
                              <Badge className="bg-green-500/15 text-green-400 border border-green-500/30 text-[10px]">
                                <CheckCircle2 className="mr-1 h-3 w-3" />
                                Connected
                              </Badge>
                            ) : (
                              <Badge
                                variant="outline"
                                className="text-[10px] text-muted-foreground"
                              >
                                Not Connected
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {source.description}
                          </p>
                        </div>
                      </div>
                    </div>

                    {source.connected ? (
                      <div className="flex items-center justify-between text-xs text-muted-foreground pl-[52px]">
                        <div className="flex items-center gap-4">
                          <span className="flex items-center gap-1">
                            <CheckCircle2 className="h-3 w-3 text-green-500" />
                            Synced
                          </span>
                          <span>Last: {source.lastSync}</span>
                          <span>
                            {source.records.toLocaleString()} records
                          </span>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 text-xs"
                          onClick={() => handleSyncNow(source.id)}
                          disabled={syncing[source.id]}
                        >
                          <RefreshCw
                            className={`mr-1 h-3 w-3 ${syncing[source.id] ? "animate-spin" : ""}`}
                          />
                          {syncing[source.id] ? "Syncing..." : "Sync Now"}
                        </Button>
                      </div>
                    ) : (
                      <div className="pl-[52px]">
                        <Button variant="outline" size="sm" className="h-7 text-xs">
                          <LinkIcon className="mr-1 h-3 w-3" />
                          Connect
                        </Button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
