"use client";

import {
  CalendarDays,
  ChevronRight,
  CircleCheck,
  FileText,
  MessageSquare,
  PenTool,
  Search,
  Sparkles,
  WandSparkles,
} from "lucide-react";

import { AppShell } from "@/components/app-shell";
import { cn } from "@/lib/utils";

const stats = [
  {
    label: "Open tasks",
    value: "28",
    detail: "8 due today",
    color: "bg-sky-100 text-sky-700",
  },
  {
    label: "Shared pages",
    value: "14",
    detail: "3 updated",
    color: "bg-emerald-100 text-emerald-700",
  },
  {
    label: "Board ideas",
    value: "63",
    detail: "12 clustered",
    color: "bg-violet-100 text-violet-700",
  },
  {
    label: "AI drafts",
    value: "7",
    detail: "2 ready",
    color: "bg-amber-100 text-amber-700",
  },
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
  return (
    <AppShell>
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
            <MessageSquare
              className="h-4 w-4 text-amber-300"
              aria-hidden="true"
            />
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
            <div
              className={cn(
                "mb-5 inline-flex rounded-lg px-2 py-1 text-xs font-semibold",
                stat.color,
              )}
            >
              {stat.detail}
            </div>
            <p className="text-3xl font-semibold text-slate-950">
              {stat.value}
            </p>
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
                    <p className="mt-1 text-xs text-slate-500">{task.stage}</p>
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
            Summarize this week&apos;s boards, notes, and tasks into a launch
            brief.
          </div>
          <button
            type="button"
            className="mt-4 flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-white text-sm font-semibold text-slate-950 transition hover:bg-amber-100"
          >
            <WandSparkles
              className="h-4 w-4 text-violet-600"
              aria-hidden="true"
            />
            Generate brief
          </button>
        </article>
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-3">
        <article className="rounded-lg border border-white/70 bg-white/76 p-5 shadow-sm backdrop-blur">
          <div className="flex items-center gap-2">
            <CalendarDays
              className="h-4 w-4 text-emerald-500"
              aria-hidden="true"
            />
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
              <span className="font-medium text-slate-800">
                AI draft polish
              </span>
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
                <CircleCheck
                  className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500"
                  aria-hidden="true"
                />
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
    </AppShell>
  );
}
