"use client";

import {
  Bot,
  CalendarDays,
  ChevronRight,
  CircleCheck,
  Columns3,
  FileText,
  FolderKanban,
  LayoutDashboard,
  MessageSquare,
  PanelLeftClose,
  PenTool,
  Plus,
  Search,
  Settings,
  Sparkles,
  StickyNote,
  Users,
  WandSparkles,
} from "lucide-react";
import { useState } from "react";
import type { ComponentType, SVGProps } from "react";

import { cn } from "@/lib/utils";

type MenuItem = {
  label: string;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  color: string;
  active?: boolean;
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
        icon: LayoutDashboard,
        color: "text-sky-500",
        active: true,
      },
      { label: "AI Assistant", icon: Bot, color: "text-violet-500" },
      { label: "Calendar", icon: CalendarDays, color: "text-emerald-500" },
      { label: "Task / Kanban", icon: Columns3, color: "text-orange-500" },
    ],
  },
  {
    label: "Create",
    items: [
      { label: "Notes", icon: StickyNote, color: "text-amber-500" },
      { label: "Whiteboard", icon: PenTool, color: "text-rose-500" },
      { label: "Pages / Spaces", icon: FolderKanban, color: "text-teal-500" },
      {
        label: "AI Template Builder",
        icon: WandSparkles,
        color: "text-fuchsia-500",
      },
    ],
  },
  {
    label: "System",
    items: [{ label: "Settings", icon: Settings, color: "text-slate-500" }],
  },
];

const stats = [
  { label: "Open tasks", value: "28", detail: "8 due today", color: "bg-sky-100 text-sky-700" },
  { label: "Shared pages", value: "14", detail: "3 updated", color: "bg-emerald-100 text-emerald-700" },
  { label: "Board ideas", value: "63", detail: "12 clustered", color: "bg-violet-100 text-violet-700" },
  { label: "AI drafts", value: "7", detail: "2 ready", color: "bg-amber-100 text-amber-700" },
];

const tasks = [
  { name: "Map product launch flow", stage: "Whiteboard", progress: "86%" },
  { name: "Draft onboarding knowledge base", stage: "Pages", progress: "64%" },
  { name: "Review Q3 planning board", stage: "Kanban", progress: "42%" },
];

const notes = [
  "Synthesize customer interview notes into opportunity themes.",
  "Turn campaign retro into reusable AI template.",
  "Sketch workspace permissions for shared client spaces.",
];

export default function Home() {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,#fff8e7_0,#f7fbf4_34%,#eef7ff_72%,#fbf7ff_100%)] text-slate-900">
      <div className="flex min-h-screen">
        <aside
          className={cn(
            "sticky top-0 flex h-screen shrink-0 flex-col border-r border-white/70 bg-white/78 px-3 py-4 shadow-[0_20px_60px_rgba(55,65,81,0.10)] backdrop-blur-xl transition-[width] duration-300",
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

                    return (
                      <button
                        key={item.label}
                        type="button"
                        title={collapsed ? item.label : undefined}
                        aria-label={item.label}
                        className={cn(
                          "flex h-9 w-full items-center rounded-lg text-sm font-medium transition",
                          collapsed
                            ? "justify-center px-0"
                            : "justify-start gap-2.5 px-2.5",
                          item.active
                            ? "bg-slate-950 text-white shadow-sm"
                            : "text-slate-600 hover:bg-white hover:text-slate-950 hover:shadow-sm",
                        )}
                      >
                        <Icon
                          className={cn(
                            "h-4 w-4 shrink-0",
                            item.active ? "text-amber-300" : item.color,
                          )}
                          aria-hidden="true"
                        />
                        {!collapsed && (
                          <span className="truncate">{item.label}</span>
                        )}
                      </button>
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

        <section className="min-w-0 flex-1 px-5 py-5 lg:px-8">
          <header className="flex flex-col gap-4 rounded-lg border border-white/70 bg-white/70 p-4 shadow-sm backdrop-blur md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-emerald-600">
                Dashboard
              </p>
              <h1 className="mt-1 text-2xl font-semibold text-slate-950">
                Build, plan, and think in one flow.
              </h1>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <label className="flex h-10 min-w-0 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-500 shadow-sm">
                <Search className="h-4 w-4 text-sky-500" aria-hidden="true" />
                <span className="sr-only">Search workspace</span>
                <input
                  className="w-full min-w-[180px] bg-transparent text-sm text-slate-800 outline-none placeholder:text-slate-400"
                  placeholder="Search pages, boards, tasks"
                />
              </label>
              <button
                type="button"
                className="flex h-10 items-center justify-center gap-2 rounded-lg bg-slate-950 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800"
              >
                <MessageSquare className="h-4 w-4 text-amber-300" aria-hidden="true" />
                Ask AI
              </button>
            </div>
          </header>

          <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {stats.map((stat) => (
              <article
                key={stat.label}
                className="rounded-lg border border-white/70 bg-white/74 p-4 shadow-sm backdrop-blur"
              >
                <div className={cn("mb-5 inline-flex rounded-lg px-2 py-1 text-xs font-semibold", stat.color)}>
                  {stat.detail}
                </div>
                <p className="text-3xl font-semibold text-slate-950">{stat.value}</p>
                <p className="mt-1 text-sm text-slate-500">{stat.label}</p>
              </article>
            ))}
          </div>

          <div className="mt-5 grid gap-5 xl:grid-cols-[1.25fr_0.75fr]">
            <article className="rounded-lg border border-white/70 bg-white/78 p-5 shadow-sm backdrop-blur">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-sky-600">
                    Active work
                  </p>
                  <h2 className="mt-1 text-lg font-semibold text-slate-950">
                    Project momentum
                  </h2>
                </div>
                <button
                  type="button"
                  className="grid h-8 w-8 place-items-center rounded-lg border border-slate-200 bg-white text-slate-600 shadow-sm hover:text-sky-600"
                  title="View project momentum"
                  aria-label="View project momentum"
                >
                  <ChevronRight className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>
              <div className="space-y-3">
                {tasks.map((task) => (
                  <div
                    key={task.name}
                    className="rounded-lg border border-slate-100 bg-slate-50/80 p-3"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-slate-800">
                          {task.name}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          {task.stage}
                        </p>
                      </div>
                      <span className="rounded-md bg-white px-2 py-1 text-xs font-semibold text-slate-600 shadow-sm">
                        {task.progress}
                      </span>
                    </div>
                    <div className="mt-3 h-2 overflow-hidden rounded-full bg-white">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-sky-400"
                        style={{ width: task.progress }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </article>

            <article className="rounded-lg border border-white/70 bg-slate-950 p-5 text-white shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-amber-300">
                    AI Assistant
                  </p>
                  <h2 className="mt-1 text-lg font-semibold">
                    Turn messy work into next steps.
                  </h2>
                </div>
                <Sparkles className="h-5 w-5 text-violet-300" aria-hidden="true" />
              </div>
              <div className="mt-5 rounded-lg border border-white/10 bg-white/10 p-3 text-sm text-slate-200">
                Summarize this week&apos;s boards, notes, and tasks into a launch brief.
              </div>
              <button
                type="button"
                className="mt-4 flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-white text-sm font-semibold text-slate-950 transition hover:bg-amber-100"
              >
                <WandSparkles className="h-4 w-4 text-violet-600" aria-hidden="true" />
                Generate brief
              </button>
            </article>
          </div>

          <div className="mt-5 grid gap-5 lg:grid-cols-3">
            <article className="rounded-lg border border-white/70 bg-white/76 p-5 shadow-sm backdrop-blur">
              <div className="flex items-center gap-2">
                <CalendarDays className="h-4 w-4 text-emerald-500" aria-hidden="true" />
                <h2 className="text-sm font-semibold text-slate-950">
                  Today&apos;s rhythm
                </h2>
              </div>
              <div className="mt-4 space-y-3 text-sm">
                <div className="flex justify-between gap-3">
                  <span className="text-slate-500">10:00</span>
                  <span className="font-medium text-slate-800">Planning sync</span>
                </div>
                <div className="flex justify-between gap-3">
                  <span className="text-slate-500">13:30</span>
                  <span className="font-medium text-slate-800">Board review</span>
                </div>
                <div className="flex justify-between gap-3">
                  <span className="text-slate-500">16:00</span>
                  <span className="font-medium text-slate-800">AI draft polish</span>
                </div>
              </div>
            </article>

            <article className="rounded-lg border border-white/70 bg-white/76 p-5 shadow-sm backdrop-blur">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-amber-500" aria-hidden="true" />
                <h2 className="text-sm font-semibold text-slate-950">
                  Notes to shape
                </h2>
              </div>
              <ul className="mt-4 space-y-2">
                {notes.map((note) => (
                  <li key={note} className="flex gap-2 text-sm text-slate-600">
                    <CircleCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" aria-hidden="true" />
                    <span>{note}</span>
                  </li>
                ))}
              </ul>
            </article>

            <article className="rounded-lg border border-white/70 bg-white/76 p-5 shadow-sm backdrop-blur">
              <div className="flex items-center gap-2">
                <PenTool className="h-4 w-4 text-rose-500" aria-hidden="true" />
                <h2 className="text-sm font-semibold text-slate-950">
                  Whiteboard focus
                </h2>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-2">
                {["Brief", "Ideas", "Flows", "Risks"].map((label, index) => (
                  <div
                    key={label}
                    className={cn(
                      "rounded-lg border p-3 text-sm font-semibold",
                      [
                        "border-sky-100 bg-sky-50 text-sky-700",
                        "border-amber-100 bg-amber-50 text-amber-700",
                        "border-emerald-100 bg-emerald-50 text-emerald-700",
                        "border-violet-100 bg-violet-50 text-violet-700",
                      ][index],
                    )}
                  >
                    {label}
                  </div>
                ))}
              </div>
            </article>
          </div>
        </section>
      </div>
    </main>
  );
}
