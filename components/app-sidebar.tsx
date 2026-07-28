"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import {
  LayoutDashboard,
  Users,
  MessageSquare,
  FolderKanban,
  Search,
  Lightbulb,
  Settings,
  LogOut,
  Rocket,
  Shield,
  Gauge,
  Microscope,
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

const mainNav = [
  {
    title: "Portfolio Overview",
    href: "/",
    icon: LayoutDashboard,
  },
];

const diagnosis = [
  {
    title: "Off-patent",
    href: "/diagnosis",
    icon: Gauge,
  },
  {
    title: "Innovative",
    href: "/diagnosis/innovative",
    icon: Microscope,
  },
];

const strategy = [
  {
    title: "Partners & Synergies",
    href: "/partners",
    icon: Users,
  },
  {
    title: "Commercial Maximization",
    href: "/insights",
    icon: Lightbulb,
  },
  {
    title: "AI Advisor",
    href: "/conductor",
    icon: MessageSquare,
  },
];

const execution = [
  {
    title: "Simulated Plan",
    href: "/simulated-plan",
    icon: Rocket,
  },
  {
    title: "Deal Workspace",
    href: "/workspace",
    icon: FolderKanban,
  },
];

const tools = [
  {
    title: "Live Search",
    href: "/search",
    icon: Search,
  },
];

function getInitials(name?: string | null): string {
  if (!name) return "U";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

type NavItem = { title: string; href: string; icon: React.ComponentType<{ className?: string }> };

function NavGroup({
  label,
  items,
  isActive,
}: {
  label?: string;
  items: NavItem[];
  isActive: (href: string) => boolean;
}) {
  return (
    <SidebarGroup className="py-1">
      {label && (
        <SidebarGroupLabel className="text-[10px] font-semibold tracking-widest uppercase text-muted-foreground/50 px-3 mb-1">
          {label}
        </SidebarGroupLabel>
      )}
      <SidebarGroupContent>
        <SidebarMenu>
          {items.map((item, i) => (
            <SidebarMenuItem key={`${item.href}-${i}`}>
              <SidebarMenuButton
                isActive={isActive(item.href)}
                className="h-9 rounded-lg px-3 transition-all duration-150"
              >
                <Link href={item.href} className="flex items-center gap-3 w-full">
                  <item.icon className="h-4 w-4 shrink-0" />
                  <span className="text-[13px] font-medium flex-1">{item.title}</span>
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
        <NavGroup items={mainNav} isActive={isActive} />
        <NavGroup label="Diagnosis" items={diagnosis} isActive={isActive} />
        <NavGroup label="Strategy" items={strategy} isActive={isActive} />
        <NavGroup label="Execution" items={execution} isActive={isActive} />
        <NavGroup label="Tools" items={tools} isActive={isActive} />
        {session?.user?.isAdmin && (
          <NavGroup
            label="Admin"
            items={[{ title: "Customer Activity", href: "/admin", icon: Shield }]}
            isActive={isActive}
          />
        )}
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
