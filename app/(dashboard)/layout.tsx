"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { Bell, Search, Plus, Loader2, Command } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, router]);

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

          {/* Search bar */}
          <div className="flex-1 flex items-center justify-center">
            <button className="flex items-center gap-2 h-9 w-full max-w-md rounded-lg border border-border/60 bg-[#F8F9FA] px-3 text-sm text-muted-foreground hover:border-border hover:bg-[#F3F4F6] transition-all">
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
              <Link href="/deals/new">
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
        <main className="flex-1 overflow-auto bg-[#FAFAFA]">
          <div className="mx-auto max-w-[1400px] p-6">{children}</div>
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
