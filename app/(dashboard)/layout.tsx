"use client";

import { useSession } from "next-auth/react";
import { useRouter, usePathname } from "next/navigation";
import { useEffect, useState, useRef, useCallback } from "react";
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { Bell, Search, Plus, Loader2, Command, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const isHub = false; // Hub now lives at "/" — no longer needs special layout
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, router]);

  // Cmd+K / Ctrl+K to open search
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setSearchOpen(true);
      }
      if (e.key === "Escape") {
        setSearchOpen(false);
        setSearchQuery("");
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Auto-focus when search opens
  useEffect(() => {
    if (searchOpen) {
      setTimeout(() => searchInputRef.current?.focus(), 50);
    }
  }, [searchOpen]);

  const handleSearchSubmit = useCallback(() => {
    if (searchQuery.trim()) {
      router.push(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
      setSearchOpen(false);
      setSearchQuery("");
    }
  }, [searchQuery, router]);

  if (status === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#FAFAFA]">
        <div className="flex flex-col items-center gap-4">
          <div className="relative flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-[#F97316] to-[#EA580C] shadow-lg shadow-[#F97316]/20">
            <Loader2 className="h-5 w-5 animate-spin text-white" />
          </div>
          <p className="text-sm font-medium text-muted-foreground">Loading CartaOS...</p>
        </div>
      </div>
    );
  }

  if (!session) return null;

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center gap-3 border-b border-border/40 bg-white/80 backdrop-blur-xl px-4">
          <SidebarTrigger className="-ml-1 text-muted-foreground hover:text-foreground" />

          {/* Search bar trigger */}
          <div className="flex-1 flex items-center justify-center">
            <button
              onClick={() => setSearchOpen(true)}
              className="flex items-center gap-2 h-9 w-full max-w-md rounded-lg border border-border/60 bg-[#F8F9FA] px-3 text-sm text-muted-foreground hover:border-border hover:bg-[#F3F4F6] transition-all"
            >
              <Search className="h-3.5 w-3.5" />
              <span className="flex-1 text-left">Search deals, partners, assets...</span>
              <kbd className="hidden sm:inline-flex h-5 items-center gap-0.5 rounded border border-border/60 bg-white px-1.5 text-[10px] font-medium text-muted-foreground/70">
                <Command className="h-2.5 w-2.5" />K
              </kbd>
            </button>
          </div>

          {/* Right actions */}
          <div className="flex items-center gap-1.5">
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
              asChild
            >
              <Link href="/">
                <Plus className="h-4 w-4" />
              </Link>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="relative h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
            >
              <Bell className="h-4 w-4" />
              <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-[#F97316] ring-2 ring-white" />
            </Button>
          </div>
        </header>

        {/* Search overlay / command palette */}
        {searchOpen && (
          <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh]">
            {/* Backdrop */}
            <div
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
              onClick={() => {
                setSearchOpen(false);
                setSearchQuery("");
              }}
            />
            {/* Search panel */}
            <div className="relative w-full max-w-xl mx-4 rounded-xl border border-border/60 bg-white shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
              <div className="flex items-center gap-3 px-4 py-3 border-b border-border/40">
                <Search className="h-4 w-4 text-muted-foreground shrink-0" />
                <input
                  ref={searchInputRef}
                  type="text"
                  placeholder="Search deals, companies, therapeutic areas, SEC filings..."
                  className="flex-1 text-sm bg-transparent outline-none placeholder:text-muted-foreground/60"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleSearchSubmit();
                  }}
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
                <kbd className="hidden sm:inline-flex h-5 items-center rounded border border-border/60 bg-[#F8F9FA] px-1.5 text-[10px] font-medium text-muted-foreground/70">
                  ESC
                </kbd>
              </div>

              {/* Quick navigation */}
              <div className="p-2 max-h-[50vh] overflow-y-auto">
                {searchQuery.trim() ? (
                  <button
                    onClick={handleSearchSubmit}
                    className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg hover:bg-[#F97316]/5 text-left transition-colors"
                  >
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#F97316]/10 text-[#F97316]">
                      <Search className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">
                        Search &ldquo;{searchQuery}&rdquo;
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Search across deals, SEC filings, clinical trials, patents, and news
                      </p>
                    </div>
                  </button>
                ) : (
                  <div className="space-y-1">
                    <p className="px-3 py-1.5 text-[10px] font-semibold tracking-widest uppercase text-muted-foreground/50">
                      Quick Links
                    </p>
                    {[
                      { label: "Comparable Deals & Benchmarks", href: "/benchmarks", icon: "chart" },
                      { label: "Live Search (SEC, ClinicalTrials, Patents)", href: "/search", icon: "search" },
                      { label: "AI Companion", href: "/conductor", icon: "ai" },
                      { label: "Deal Workspace", href: "/workspace", icon: "folder" },
                      { label: "Market Trends", href: "/trends", icon: "trend" },
                    ].map((item) => (
                      <button
                        key={item.href}
                        onClick={() => {
                          router.push(item.href);
                          setSearchOpen(false);
                        }}
                        className="flex items-center gap-3 w-full px-3 py-2 rounded-lg hover:bg-[#F8F9FA] text-left transition-colors"
                      >
                        <div className="flex h-7 w-7 items-center justify-center rounded-md bg-secondary/50 text-muted-foreground">
                          <Search className="h-3.5 w-3.5" />
                        </div>
                        <span className="text-sm">{item.label}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        <main className={`flex-1 overflow-auto ${isHub ? "" : "bg-[#FAFAFA]"}`}>
          {isHub ? children : <div className="mx-auto max-w-[1400px] p-6">{children}</div>}
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
