"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import {
  LayoutDashboard,
  FileInput,
  Sparkles,
  BarChart3,
  Users,
  MessageSquare,
  FolderKanban,
  Search,
  TrendingUp,
  Lightbulb,
  Settings,
  LogOut,
  ChevronRight,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarHeader,
  SidebarFooter,
} from "@/components/ui/sidebar";
import { Badge } from "@/components/ui/badge";

const mainNav = [
  {
    title: "Dashboard",
    href: "/",
    icon: LayoutDashboard,
    description: "Portfolio overview",
  },
];

const dealFlow = [
  {
    title: "Asset Intake",
    href: "/deals/new",
    icon: FileInput,
    description: "Upload & analyze assets",
  },
  {
    title: "Deal Twin",
    href: "/deals",
    icon: Sparkles,
    description: "AI-generated deal structures",
    badge: "AI",
  },
  {
    title: "Comparable Deals",
    href: "/benchmarks",
    icon: BarChart3,
    description: "Benchmark & explore",
  },
  {
    title: "Partner Matching",
    href: "/partners",
    icon: Users,
    description: "Find ideal partners",
  },
];

const tools = [
  {
    title: "AI Companion",
    href: "/conductor",
    icon: MessageSquare,
    description: "Ask anything about deals",
    badge: "New",
  },
  {
    title: "Deal Workspace",
    href: "/workspace",
    icon: FolderKanban,
    description: "Notes, files & tasks",
    badge: "3",
  },
  {
    title: "Market Trends",
    href: "/trends",
    icon: TrendingUp,
    description: "Industry insights",
  },
  {
    title: "Deal Insights",
    href: "/insights",
    icon: Lightbulb,
    description: "Structure & value analysis",
    badge: "New",
  },
  {
    title: "Live Search",
    href: "/search",
    icon: Search,
    description: "SEC & ClinicalTrials",
  },
];

export function AppSidebar() {
  const pathname = usePathname();

  function isActive(href: string) {
    if (href === "/") return pathname === "/";
    return pathname === href || pathname.startsWith(href + "/");
  }

  return (
    <Sidebar className="border-r-0">
      <SidebarHeader className="px-4 py-4">
        <Link href="/" className="flex items-center gap-3 group">
          <div className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-[#F97316] to-[#EA580C] shadow-lg shadow-[#F97316]/25 transition-transform group-hover:scale-105">
            <svg width="18" height="18" viewBox="0 0 16 16" fill="none">
              <circle cx="8" cy="8" r="2.5" fill="white" />
              <circle cx="8" cy="3" r="1.2" fill="white" opacity="0.8" />
              <circle cx="8" cy="13" r="1.2" fill="white" opacity="0.8" />
              <circle cx="3" cy="8" r="1.2" fill="white" opacity="0.8" />
              <circle cx="13" cy="8" r="1.2" fill="white" opacity="0.8" />
            </svg>
          </div>
          <div>
            <p className="text-[15px] font-bold leading-none tracking-tight">CartaOS</p>
            <p className="text-[10px] font-medium text-muted-foreground/70 tracking-widest uppercase mt-0.5">
              Deal Intelligence
            </p>
          </div>
        </Link>
      </SidebarHeader>

      <SidebarContent className="px-2">
        {/* Main */}
        <SidebarGroup className="py-1">
          <SidebarGroupContent>
            <SidebarMenu>
              {mainNav.map((item) => (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton
                    isActive={isActive(item.href)}
                    className="h-9 rounded-lg px-3 transition-all duration-150"
                  >
                    <Link href={item.href} className="flex items-center gap-3 w-full">
                      <item.icon className="h-4 w-4 shrink-0" />
                      <span className="text-[13px] font-medium">{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Deal Flow */}
        <SidebarGroup className="py-1">
          <SidebarGroupLabel className="text-[10px] font-semibold tracking-widest uppercase text-muted-foreground/50 px-3 mb-1">
            Deal Flow
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {dealFlow.map((item) => (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton
                    isActive={isActive(item.href)}
                    className="h-9 rounded-lg px-3 transition-all duration-150"
                  >
                    <Link href={item.href} className="flex items-center gap-3 w-full">
                      <item.icon className="h-4 w-4 shrink-0" />
                      <span className="text-[13px] font-medium flex-1">{item.title}</span>
                      {"badge" in item && item.badge && (
                        <Badge
                          variant="secondary"
                          className={`h-5 px-1.5 text-[10px] font-semibold ${
                            item.badge === "AI"
                              ? "bg-gradient-to-r from-[#F97316]/15 to-[#F59E0B]/15 text-[#F97316] border-0"
                              : ""
                          }`}
                        >
                          {item.badge}
                        </Badge>
                      )}
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Tools */}
        <SidebarGroup className="py-1">
          <SidebarGroupLabel className="text-[10px] font-semibold tracking-widest uppercase text-muted-foreground/50 px-3 mb-1">
            Tools
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {tools.map((item) => (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton
                    isActive={isActive(item.href)}
                    className="h-9 rounded-lg px-3 transition-all duration-150"
                  >
                    <Link href={item.href} className="flex items-center gap-3 w-full">
                      <item.icon className="h-4 w-4 shrink-0" />
                      <span className="text-[13px] font-medium flex-1">{item.title}</span>
                      {"badge" in item && item.badge && (
                        <Badge
                          variant="secondary"
                          className={`h-5 px-1.5 text-[10px] font-semibold ${
                            item.badge === "New"
                              ? "bg-[#10B981]/10 text-[#10B981] border-0"
                              : ""
                          }`}
                        >
                          {item.badge}
                        </Badge>
                      )}
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border/50 p-3">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              isActive={isActive("/settings")}
              className="h-9 rounded-lg px-3"
            >
              <Link href="/settings" className="flex items-center gap-3 w-full">
                <Settings className="h-4 w-4" />
                <span className="text-[13px] font-medium">Settings</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
        <div className="flex items-center gap-3 px-3 py-2 mt-1 rounded-lg hover:bg-sidebar-accent/50 transition-colors cursor-pointer group">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-[#F97316] to-[#EA580C] text-[11px] font-bold text-white shadow-sm">
            AK
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-medium leading-none truncate">Alex Kim</p>
            <p className="text-[10px] text-muted-foreground truncate mt-0.5">CBO</p>
          </div>
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="text-muted-foreground/50 hover:text-foreground transition-colors"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
