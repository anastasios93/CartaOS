"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import {
  LayoutDashboard,
  BarChart3,
  Users,
  MessageSquare,
  FolderKanban,
  Search,
  TrendingUp,
  Lightbulb,
  Settings,
  LogOut,
  Zap,
  Target,
  Briefcase,
  Rocket,
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
    title: "Portfolio Overview",
    href: "/",
    icon: LayoutDashboard,
    description: "Portfolio health & unrealized value",
  },
];

const diagnosticPhase = [
  {
    title: "Intelligence Hub",
    href: "/hub",
    icon: Zap,
    description: "AI portfolio diagnostic",
    badge: "AI",
  },
  {
    title: "Comparable Deals",
    href: "/benchmarks",
    icon: BarChart3,
    description: "Benchmark & market potential",
  },
  {
    title: "Market Trends",
    href: "/trends",
    icon: TrendingUp,
    description: "Patent cliff & market signals",
  },
];

const strategyPhase = [
  {
    title: "Partner Matching",
    href: "/partners",
    icon: Users,
    description: "Strategic fit & positioning",
  },
  {
    title: "Deal Insights",
    href: "/insights",
    icon: Lightbulb,
    description: "Value optimization strategy",
    badge: "New",
  },
  {
    title: "AI Advisor",
    href: "/conductor",
    icon: MessageSquare,
    description: "Ask anything about your portfolio",
  },
];

const executionPhase = [
  {
    title: "Deal Workspace",
    href: "/workspace",
    icon: FolderKanban,
    description: "Notes, files & tasks",
    badge: "3",
  },
  {
    title: "Live Search",
    href: "/search",
    icon: Search,
    description: "SEC, ClinicalTrials, Patents",
  },
];

/** Get initials from a name string, e.g. "Jane Smith" -> "JS" */
function getInitials(name?: string | null): string {
  if (!name) return "U";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function NavGroup({
  label,
  phaseNumber,
  items,
  isActive,
}: {
  label: string;
  phaseNumber?: number;
  items: { title: string; href: string; icon: React.ComponentType<{ className?: string }>; description: string; badge?: string }[];
  isActive: (href: string) => boolean;
}) {
  return (
    <SidebarGroup className="py-1">
      <SidebarGroupLabel className="text-[10px] font-semibold tracking-widest uppercase text-muted-foreground/50 px-3 mb-1 flex items-center gap-2">
        {phaseNumber && (
          <span className="flex h-4 w-4 items-center justify-center rounded-full bg-[#F97316]/15 text-[9px] font-bold text-[#F97316]">
            {phaseNumber}
          </span>
        )}
        {label}
      </SidebarGroupLabel>
      <SidebarGroupContent>
        <SidebarMenu>
          {items.map((item) => (
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
                          : item.badge === "New"
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
  );
}

export function AppSidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();

  const userName = session?.user?.name || "User";
  const userRole = session?.user?.role || session?.user?.company || "Member";
  const initials = getInitials(session?.user?.name);

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
              Portfolio Intelligence
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

        {/* Phase 1: Diagnostic */}
        <NavGroup
          label="Diagnostic"
          phaseNumber={1}
          items={diagnosticPhase}
          isActive={isActive}
        />

        {/* Phase 2: Strategy */}
        <NavGroup
          label="Strategy"
          phaseNumber={2}
          items={strategyPhase}
          isActive={isActive}
        />

        {/* Phase 3: Execution */}
        <NavGroup
          label="Execution"
          phaseNumber={3}
          items={executionPhase}
          isActive={isActive}
        />
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
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-medium leading-none truncate">{userName}</p>
            <p className="text-[10px] text-muted-foreground truncate mt-0.5">{userRole}</p>
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
