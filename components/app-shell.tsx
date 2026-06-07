"use client";

import {
  Bot,
  CalendarDays,
  ChevronRight,
  Columns3,
  FolderKanban,
  LayoutDashboard,
  PanelLeftClose,
  PenTool,
  Plus,
  Settings,
  Sparkles,
  StickyNote,
  Users,
  WandSparkles,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import type { ComponentType, ReactNode, SVGProps } from "react";

import { cn } from "@/lib/utils";

type MenuItem = {
  label: string;
  href: string;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  color: string;
};

type MenuGroup = {
  label: string;
  items: MenuItem[];
};

const menuGroups: MenuGroup[] = [
  {
    label: "Workspace",
    items: [
      {
        label: "Dashboard",
        href: "/",
        icon: LayoutDashboard,
        color: "text-sky-500",
      },
      { label: "AI Assistant", href: "/", icon: Bot, color: "text-violet-500" },
      {
        label: "Calendar",
        href: "/calendar",
        icon: CalendarDays,
        color: "text-emerald-500",
      },
      {
        label: "Task / Kanban",
        href: "/",
        icon: Columns3,
        color: "text-orange-500",
      },
    ],
  },
  {
    label: "Create",
    items: [
      { label: "Notes", href: "/", icon: StickyNote, color: "text-amber-500" },
      { label: "Whiteboard", href: "/", icon: PenTool, color: "text-rose-500" },
      {
        label: "Pages / Spaces",
        href: "/",
        icon: FolderKanban,
        color: "text-teal-500",
      },
      {
        label: "AI Template Builder",
        href: "/",
        icon: WandSparkles,
        color: "text-fuchsia-500",
      },
    ],
  },
  {
    label: "System",
    items: [
      { label: "Settings", href: "/", icon: Settings, color: "text-slate-500" },
    ],
  },
];

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,#fff8e7_0,#f7fbf4_34%,#eef7ff_72%,#fbf7ff_100%)] text-slate-900">
      <div className="flex min-h-screen">
        <aside
          className={cn(
            "sticky top-0 hidden h-screen shrink-0 flex-col border-r border-white/70 bg-white/78 px-3 py-4 shadow-[0_20px_60px_rgba(55,65,81,0.10)] backdrop-blur-xl transition-[width] duration-300 sm:flex",
            collapsed ? "w-[72px]" : "w-[248px]",
          )}
        >
          <div className="flex h-10 items-center justify-between gap-2">
            <div className="flex min-w-0 items-center gap-2">
              <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-gradient-to-br from-emerald-400 via-sky-400 to-violet-400 text-white shadow-sm">
                <Sparkles className="h-4 w-4" aria-hidden="true" />
              </div>
              {!collapsed && (
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-slate-950">
                    OpenFlow
                  </p>
                  <p className="truncate text-[11px] font-medium text-slate-500">
                    Cozy productivity
                  </p>
                </div>
              )}
            </div>
            <button
              type="button"
              title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
              aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
              onClick={() => setCollapsed((value) => !value)}
              className={cn(
                "grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:border-sky-200 hover:bg-sky-50 hover:text-sky-600",
                collapsed && "mx-auto",
              )}
            >
              {collapsed ? (
                <ChevronRight className="h-4 w-4" aria-hidden="true" />
              ) : (
                <PanelLeftClose className="h-4 w-4" aria-hidden="true" />
              )}
            </button>
          </div>

          <nav className="mt-6 flex-1 space-y-5 overflow-y-auto">
            {menuGroups.map((group) => (
              <div key={group.label}>
                {!collapsed && (
                  <p className="mb-2 px-2 text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400">
                    {group.label}
                  </p>
                )}
                <div className="space-y-1">
                  {group.items.map((item) => {
                    const Icon = item.icon;
                    const active =
                      item.href === "/"
                        ? item.label === "Dashboard" && pathname === "/"
                        : pathname.startsWith(item.href);

                    return (
                      <Link
                        key={item.label}
                        href={item.href}
                        title={collapsed ? item.label : undefined}
                        aria-label={item.label}
                        className={cn(
                          "flex h-9 w-full items-center rounded-lg text-sm font-medium transition",
                          collapsed
                            ? "justify-center px-0"
                            : "justify-start gap-2.5 px-2.5",
                          active
                            ? "bg-slate-950 text-white shadow-sm"
                            : "text-slate-600 hover:bg-white hover:text-slate-950 hover:shadow-sm",
                        )}
                      >
                        <Icon
                          className={cn(
                            "h-4 w-4 shrink-0",
                            active ? "text-amber-300" : item.color,
                          )}
                          aria-hidden="true"
                        />
                        {!collapsed && (
                          <span className="truncate">{item.label}</span>
                        )}
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
          </nav>

          <footer
            className={cn(
              "mt-4 rounded-lg border border-emerald-100 bg-emerald-50/80 p-2",
              collapsed && "p-1.5",
            )}
          >
            {collapsed ? (
              <button
                type="button"
                title="Team workspace"
                aria-label="Team workspace"
                className="grid h-9 w-full place-items-center rounded-lg bg-white text-emerald-600 shadow-sm"
              >
                <Users className="h-4 w-4" aria-hidden="true" />
              </button>
            ) : (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className="grid h-8 w-8 place-items-center rounded-lg bg-white text-emerald-600 shadow-sm">
                    <Users className="h-4 w-4" aria-hidden="true" />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-xs font-semibold text-slate-800">
                      Team Studio
                    </p>
                    <p className="truncate text-[11px] text-slate-500">
                      8 collaborators online
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  className="flex h-8 w-full items-center justify-center gap-1.5 rounded-lg bg-white text-xs font-semibold text-slate-700 shadow-sm transition hover:text-emerald-700"
                >
                  <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                  New space
                </button>
              </div>
            )}
          </footer>
        </aside>

        <section className="min-w-0 flex-1 px-4 py-4 sm:px-5 sm:py-5 lg:px-8">
          {children}
        </section>
      </div>
    </main>
  );
}
