"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Search,
  BarChart3,
  TrendingUp,
  Users,
  Layers,
  FileText,
  BookOpen,
  Target,
  FolderOpen,
  Bot,
  Upload,
  Settings,
  LogOut,
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

const layers = [
  {
    label: "L1 · Deal Intelligence",
    items: [
      { title: "Deal Search", href: "/deals", icon: Search },
      { title: "Benchmarks", href: "/benchmarks", icon: BarChart3 },
      { title: "Trends", href: "/trends", icon: TrendingUp },
      { title: "Partner Intel", href: "/partners", icon: Users },
      { title: "Structure Rec.", href: "/structure", icon: Layers },
    ],
  },
  {
    label: "L2 · Term Sheet Builder",
    items: [
      { title: "Term Sheet", href: "/term-builder", icon: FileText },
      { title: "Clause Library", href: "/term-builder/clauses", icon: BookOpen },
      { title: "Milestones", href: "/term-builder/milestones", icon: Target },
    ],
  },
  {
    label: "L3 · Deal Workspace",
    items: [
      { title: "Workspaces", href: "/workspace", icon: FolderOpen, badge: "3" },
    ],
  },
  {
    label: "L4 · AI Conductor",
    items: [
      { title: "AI Conductor", href: "/conductor", icon: Bot, badge: "5" },
    ],
  },
  {
    label: "Data",
    items: [
      { title: "Upload & Data", href: "/upload", icon: Upload },
    ],
  },
];

export function AppSidebar() {
  const pathname = usePathname();

  function isActive(href: string) {
    if (href === "/") return pathname === "/";
    return pathname === href || pathname.startsWith(href + "/");
  }

  return (
    <Sidebar>
      <SidebarHeader className="border-b border-sidebar-border px-4 py-3">
        <Link href="/" className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-[#F97316] to-[#C2410C]">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <circle cx="8" cy="8" r="2" fill="white" />
              <circle cx="8" cy="3" r="1.5" fill="white" opacity="0.7" />
              <circle cx="8" cy="13" r="1.5" fill="white" opacity="0.7" />
              <circle cx="3" cy="8" r="1.5" fill="white" opacity="0.7" />
              <circle cx="13" cy="8" r="1.5" fill="white" opacity="0.7" />
              <line x1="8" y1="4.5" x2="8" y2="6" stroke="white" strokeWidth="0.8" opacity="0.5" />
              <line x1="8" y1="10" x2="8" y2="11.5" stroke="white" strokeWidth="0.8" opacity="0.5" />
              <line x1="4.5" y1="8" x2="6" y2="8" stroke="white" strokeWidth="0.8" opacity="0.5" />
              <line x1="10" y1="8" x2="11.5" y2="8" stroke="white" strokeWidth="0.8" opacity="0.5" />
            </svg>
          </div>
          <div>
            <p className="text-sm font-bold leading-none tracking-tight">CartaOS</p>
            <p className="text-[10px] font-medium text-muted-foreground tracking-wider uppercase mt-0.5">
              Deal Intelligence
            </p>
          </div>
        </Link>
      </SidebarHeader>

      <SidebarContent className="py-1">
        {layers.map((layer) => (
          <SidebarGroup key={layer.label} className="py-1">
            <SidebarGroupLabel className="text-[10px] font-semibold tracking-wider uppercase text-muted-foreground/70 px-3">
              {layer.label}
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {layer.items.map((item) => (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton isActive={isActive(item.href)} className="h-8">
                      <Link href={item.href} className="flex items-center gap-2 w-full">
                        <item.icon className="h-3.5 w-3.5" />
                        <span className="text-[13px]">{item.title}</span>
                        {"badge" in item && item.badge && (
                          <Badge variant="secondary" className="ml-auto h-4 min-w-4 px-1 text-[10px] font-medium">
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
        ))}
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border p-2">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton isActive={isActive("/settings")} className="h-8">
              <Link href="/settings" className="flex items-center gap-2 w-full">
                <Settings className="h-3.5 w-3.5" />
                <span className="text-[13px]">Settings</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
        <div className="flex items-center gap-2 px-2 py-1.5 mt-1">
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-[#F97316] to-[#C2410C] text-[11px] font-semibold text-white">
            AK
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium leading-none truncate">Alex Kim</p>
            <p className="text-[10px] text-muted-foreground truncate">Chief Business Officer</p>
          </div>
          <button className="text-muted-foreground hover:text-foreground transition-colors">
            <LogOut className="h-3.5 w-3.5" />
          </button>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
