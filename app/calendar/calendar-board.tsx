"use client";

import {
  Bell,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock3,
  GripVertical,
  ListChecks,
  Plus,
  StickyNote,
} from "lucide-react";
import { FormEvent, useMemo, useRef, useState } from "react";

import {
  createCalendarItem,
  scheduleCalendarItem,
  updateCalendarItem,
  type CalendarCategory,
  type CalendarItemStatus,
  type CalendarItemType,
  type CalendarItemView,
} from "@/app/calendar/actions";
import { cn } from "@/lib/utils";

type CalendarView = "month" | "week";

type DialogState = {
  open: boolean;
  date: string;
  mode: CalendarItemStatus;
  itemId: number | null;
};

type FormState = {
  title: string;
  description: string;
  itemType: CalendarItemType;
  category: CalendarCategory;
  scheduledDate: string;
  scheduledTime: string;
  status: CalendarItemStatus;
};

const categoryOptions: {
  value: CalendarCategory;
  label: string;
  badgeClass: string;
  chipClass: string;
  dotClass: string;
}[] = [
  {
    value: "focus",
    label: "Focus",
    badgeClass: "border-sky-100 bg-sky-50 text-sky-700",
    chipClass: "bg-sky-500",
    dotClass: "bg-sky-400",
  },
  {
    value: "meeting",
    label: "Meeting",
    badgeClass: "border-emerald-100 bg-emerald-50 text-emerald-700",
    chipClass: "bg-emerald-500",
    dotClass: "bg-emerald-400",
  },
  {
    value: "personal",
    label: "Personal",
    badgeClass: "border-rose-100 bg-rose-50 text-rose-700",
    chipClass: "bg-rose-500",
    dotClass: "bg-rose-400",
  },
  {
    value: "follow-up",
    label: "Follow-up",
    badgeClass: "border-amber-100 bg-amber-50 text-amber-700",
    chipClass: "bg-amber-500",
    dotClass: "bg-amber-400",
  },
  {
    value: "creative",
    label: "Creative",
    badgeClass: "border-violet-100 bg-violet-50 text-violet-700",
    chipClass: "bg-violet-500",
    dotClass: "bg-violet-400",
  },
];

const weekDayLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function pad(value: number) {
  return String(value).padStart(2, "0");
}

function toDateKey(date: Date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function fromDateKey(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function addDays(date: Date, amount: number) {
  const next = new Date(date);
  next.setDate(date.getDate() + amount);
  return next;
}

function addMonths(date: Date, amount: number) {
  const next = new Date(date);
  next.setMonth(date.getMonth() + amount, 1);
  return next;
}

function startOfWeek(date: Date) {
  return addDays(date, -date.getDay());
}

function formatMonthYear(date: Date) {
  return new Intl.DateTimeFormat("en", {
    month: "long",
    year: "numeric",
  }).format(date);
}

function formatShortDate(value: string) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
  }).format(fromDateKey(value));
}

function getCategory(value: CalendarCategory) {
  return (
    categoryOptions.find((category) => category.value === value) ??
    categoryOptions[0]
  );
}

function getEmptyForm(date: string, mode: CalendarItemStatus): FormState {
  return {
    title: "",
    description: "",
    itemType: "task",
    category: "focus",
    scheduledDate: date,
    scheduledTime: "",
    status: mode,
  };
}

function getFormFromItem(item: CalendarItemView): FormState {
  return {
    title: item.title,
    description: item.description ?? "",
    itemType: item.itemType,
    category: item.category,
    scheduledDate: item.scheduledDate ?? toDateKey(new Date()),
    scheduledTime: item.scheduledTime ?? "",
    status: item.status,
  };
}

function sortItems(items: CalendarItemView[]) {
  return [...items].sort((a, b) => {
    const timeA = a.scheduledTime ?? "";
    const timeB = b.scheduledTime ?? "";

    if (timeA !== timeB) {
      return timeA.localeCompare(timeB);
    }

    return a.title.localeCompare(b.title);
  });
}

function CalendarItemCard({
  item,
  compact = false,
  onOpen,
}: {
  item: CalendarItemView;
  compact?: boolean;
  onOpen: (item: CalendarItemView) => void;
}) {
  const category = getCategory(item.category);
  const TypeIcon = item.itemType === "reminder" ? Bell : ListChecks;
  const draggingRef = useRef(false);

  return (
    <div
      draggable
      onDragStart={(event) => {
        draggingRef.current = true;
        event.dataTransfer.setData("text/calendar-item-id", String(item.id));
        event.dataTransfer.effectAllowed = "move";
      }}
      onDragEnd={() => {
        window.setTimeout(() => {
          draggingRef.current = false;
        }, 0);
      }}
      onClick={() => {
        if (!draggingRef.current) {
          onOpen(item);
        }
      }}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onOpen(item);
        }
      }}
      role="button"
      tabIndex={0}
      className={cn(
        "group flex cursor-grab items-start gap-2 rounded-lg border px-2.5 py-2 text-left shadow-sm transition active:cursor-grabbing",
        category.badgeClass,
        compact ? "min-h-[42px]" : "min-h-[52px]",
      )}
    >
      <span
        className={cn("mt-1 h-2 w-2 shrink-0 rounded-full", category.dotClass)}
      />
      <div className="min-w-0 flex-1">
        <div className="flex min-w-0 items-center gap-1.5">
          <TypeIcon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          <p className="truncate text-xs font-semibold">{item.title}</p>
        </div>
        {!compact && item.description && (
          <p className="mt-1 line-clamp-2 text-[11px] opacity-75">
            {item.description}
          </p>
        )}
        <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[10px] font-semibold opacity-80">
          {item.scheduledTime && (
            <span className="inline-flex items-center gap-1">
              <Clock3 className="h-3 w-3" aria-hidden="true" />
              {item.scheduledTime}
            </span>
          )}
          <span>{category.label}</span>
          <span>{item.itemType === "reminder" ? "Reminder" : "Task"}</span>
        </div>
      </div>
      <GripVertical
        className="mt-0.5 h-3.5 w-3.5 shrink-0 opacity-45 transition group-hover:opacity-80"
        aria-hidden="true"
      />
    </div>
  );
}

export function CalendarBoard({
  initialItems,
}: {
  initialItems: CalendarItemView[];
}) {
  const todayKey = toDateKey(new Date());
  const [items, setItems] = useState(initialItems);
  const [view, setView] = useState<CalendarView>("month");
  const [anchorDate, setAnchorDate] = useState(() => new Date());
  const [dialog, setDialog] = useState<DialogState>({
    open: false,
    date: todayKey,
    mode: "scheduled",
    itemId: null,
  });
  const [form, setForm] = useState<FormState>(() =>
    getEmptyForm(todayKey, "scheduled"),
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<string | null>(null);

  const scheduledItems = useMemo(
    () => items.filter((item) => item.status === "scheduled"),
    [items],
  );
  const draftItems = useMemo(
    () => sortItems(items.filter((item) => item.status === "draft")),
    [items],
  );

  const itemsByDate = useMemo(() => {
    return scheduledItems.reduce<Record<string, CalendarItemView[]>>(
      (groups, item) => {
        if (!item.scheduledDate) {
          return groups;
        }

        groups[item.scheduledDate] = groups[item.scheduledDate] ?? [];
        groups[item.scheduledDate].push(item);

        return groups;
      },
      {},
    );
  }, [scheduledItems]);

  const visibleDates = useMemo(() => {
    if (view === "week") {
      const first = startOfWeek(anchorDate);
      return Array.from({ length: 7 }, (_, index) => addDays(first, index));
    }

    const firstOfMonth = new Date(
      anchorDate.getFullYear(),
      anchorDate.getMonth(),
      1,
    );
    const first = startOfWeek(firstOfMonth);

    return Array.from({ length: 42 }, (_, index) => addDays(first, index));
  }, [anchorDate, view]);

  const currentMonth = anchorDate.getMonth();
  const headerTitle =
    view === "month"
      ? formatMonthYear(anchorDate)
      : `${formatShortDate(toDateKey(visibleDates[0]))} - ${formatShortDate(
          toDateKey(visibleDates[6]),
        )}`;

  function openCreateDialog(date: string, mode: CalendarItemStatus) {
    setError(null);
    setDialog({ open: true, date, mode, itemId: null });
    setForm(getEmptyForm(date, mode));
  }

  function openEditDialog(item: CalendarItemView) {
    const fallbackDate = item.scheduledDate ?? todayKey;

    setError(null);
    setDialog({
      open: true,
      date: fallbackDate,
      mode: item.status,
      itemId: item.id,
    });
    setForm(getFormFromItem(item));
  }

  function closeDialog() {
    setDialog((value) => ({ ...value, open: false }));
    setError(null);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);

    try {
      if (dialog.itemId) {
        const updated = await updateCalendarItem(dialog.itemId, form);
        setItems((current) =>
          current.map((item) => (item.id === updated.id ? updated : item)),
        );
      } else {
        const created = await createCalendarItem(form);
        setItems((current) => [...current, created]);
      }
      closeDialog();
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "The item could not be saved.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleDrop(date: string, itemId: number) {
    const existing = items.find((item) => item.id === itemId);

    if (!existing) {
      return;
    }

    const before = items;
    setError(null);
    setDropTarget(null);
    setItems((current) =>
      current.map((item) =>
        item.id === itemId
          ? { ...item, status: "scheduled", scheduledDate: date }
          : item,
      ),
    );

    try {
      const updated = await scheduleCalendarItem(itemId, date);
      setItems((current) =>
        current.map((item) => (item.id === itemId ? updated : item)),
      );
    } catch (caught) {
      setItems(before);
      setError(
        caught instanceof Error
          ? caught.message
          : "The item could not be rescheduled.",
      );
    }
  }

  function navigate(direction: -1 | 1) {
    setAnchorDate((date) =>
      view === "month"
        ? addMonths(date, direction)
        : addDays(date, direction * 7),
    );
  }

  function renderDateCell(date: Date) {
    const dateKey = toDateKey(date);
    const dayItems = sortItems(itemsByDate[dateKey] ?? []);
    const isToday = dateKey === todayKey;
    const isOutsideMonth = view === "month" && date.getMonth() !== currentMonth;
    const isDropTarget = dropTarget === dateKey;

    return (
      <div
        key={dateKey}
        onDragOver={(event) => {
          event.preventDefault();
          event.dataTransfer.dropEffect = "move";
          setDropTarget(dateKey);
        }}
        onDragLeave={() => setDropTarget(null)}
        onDrop={(event) => {
          event.preventDefault();
          const itemId = Number(
            event.dataTransfer.getData("text/calendar-item-id"),
          );

          if (itemId) {
            void handleDrop(dateKey, itemId);
          }
        }}
        className={cn(
          "flex min-h-[118px] min-w-0 flex-col gap-2 border-r border-b border-slate-100 bg-white/72 p-2 transition sm:min-h-[138px]",
          view === "week" && "min-h-[380px]",
          isOutsideMonth && "bg-white/38 text-slate-400",
          isDropTarget && "bg-emerald-50 ring-2 ring-inset ring-emerald-300",
        )}
      >
        <div className="flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => openCreateDialog(dateKey, "scheduled")}
            className={cn(
              "grid h-7 w-7 place-items-center rounded-lg text-xs font-semibold transition hover:bg-sky-50 hover:text-sky-700",
              isToday
                ? "bg-slate-950 text-amber-300 shadow-sm"
                : "text-slate-700",
              isOutsideMonth && "text-slate-400",
            )}
            title={`Add item on ${dateKey}`}
            aria-label={`Add item on ${dateKey}`}
          >
            {date.getDate()}
          </button>
          <button
            type="button"
            onClick={() => openCreateDialog(dateKey, "scheduled")}
            className="grid h-7 w-7 shrink-0 place-items-center rounded-lg text-slate-400 transition hover:bg-white hover:text-emerald-600"
            title="Add task or reminder"
            aria-label="Add task or reminder"
          >
            <Plus className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
        </div>
        <div className="space-y-1.5 overflow-hidden">
          {dayItems.slice(0, view === "month" ? 3 : 10).map((item) => (
            <CalendarItemCard
              key={item.id}
              item={item}
              compact={view === "month"}
              onOpen={openEditDialog}
            />
          ))}
          {view === "month" && dayItems.length > 3 && (
            <button
              type="button"
              onClick={() => openCreateDialog(dateKey, "scheduled")}
              className="w-full rounded-lg bg-slate-50 px-2 py-1 text-left text-[11px] font-semibold text-slate-500 hover:bg-slate-100"
            >
              +{dayItems.length - 3} more
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-w-0">
      <header className="flex flex-col gap-4 rounded-lg border border-white/70 bg-white/72 p-4 shadow-sm backdrop-blur xl:flex-row xl:items-center xl:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-emerald-600">
            Calendar
          </p>
          <h1 className="mt-1 text-2xl font-semibold text-slate-950">
            Plan dates, drafts, and reminders in one view.
          </h1>
        </div>
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-end">
          <div className="grid grid-cols-2 rounded-lg border border-slate-200 bg-white p-1 shadow-sm">
            {(["month", "week"] as CalendarView[]).map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => setView(option)}
                className={cn(
                  "h-8 rounded-md px-3 text-xs font-semibold capitalize transition",
                  view === option
                    ? "bg-slate-950 text-white shadow-sm"
                    : "text-slate-500 hover:text-slate-900",
                )}
              >
                {option}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="grid h-9 w-9 place-items-center rounded-lg border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:text-sky-600"
              title="Previous"
              aria-label="Previous"
            >
              <ChevronLeft className="h-4 w-4" aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={() => setAnchorDate(new Date())}
              className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-600 shadow-sm transition hover:text-emerald-700"
            >
              Today
            </button>
            <button
              type="button"
              onClick={() => navigate(1)}
              className="grid h-9 w-9 place-items-center rounded-lg border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:text-sky-600"
              title="Next"
              aria-label="Next"
            >
              <ChevronRight className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
          <button
            type="button"
            onClick={() => openCreateDialog(toDateKey(anchorDate), "scheduled")}
            className="flex h-9 items-center justify-center gap-2 rounded-lg bg-slate-950 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800"
          >
            <Plus className="h-4 w-4 text-amber-300" aria-hidden="true" />
            Add item
          </button>
        </div>
      </header>

      {error && (
        <div className="mt-4 rounded-lg border border-rose-100 bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700">
          {error}
        </div>
      )}

      <div className="mt-5 grid min-w-0 gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
        <section className="min-w-0 overflow-hidden rounded-lg border border-white/70 bg-white/70 shadow-sm backdrop-blur">
          <div className="flex flex-col gap-3 border-b border-slate-100 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 items-center gap-2">
              <CalendarDays
                className="h-4 w-4 shrink-0 text-emerald-500"
                aria-hidden="true"
              />
              <h2 className="truncate text-lg font-semibold text-slate-950">
                {headerTitle}
              </h2>
            </div>
            <div className="flex flex-wrap gap-2">
              {categoryOptions.map((category) => (
                <span
                  key={category.value}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-lg border px-2 py-1 text-[11px] font-semibold",
                    category.badgeClass,
                  )}
                >
                  <span
                    className={cn(
                      "h-1.5 w-1.5 rounded-full",
                      category.dotClass,
                    )}
                  />
                  {category.label}
                </span>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-7 border-b border-slate-100 bg-white/80">
            {weekDayLabels.map((day) => (
              <div
                key={day}
                className="px-2 py-2 text-center text-[11px] font-bold uppercase tracking-[0.08em] text-slate-400"
              >
                {day}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7">
            {visibleDates.map(renderDateCell)}
          </div>
        </section>

        <aside className="min-w-0 rounded-lg border border-white/70 bg-white/76 p-4 shadow-sm backdrop-blur xl:sticky xl:top-5 xl:max-h-[calc(100vh-40px)] xl:overflow-y-auto">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-amber-600">
                Draft Task Panel
              </p>
              <h2 className="mt-1 text-lg font-semibold text-slate-950">
                Unscheduled ideas
              </h2>
            </div>
            <button
              type="button"
              onClick={() => openCreateDialog(todayKey, "draft")}
              className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-slate-950 text-amber-300 shadow-sm transition hover:bg-slate-800"
              title="Add draft"
              aria-label="Add draft"
            >
              <Plus className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
          <p className="mt-2 text-sm text-slate-500">
            Save quick thoughts here, then drag them onto a date when they are
            ready.
          </p>

          <div className="mt-4 space-y-2">
            {draftItems.length === 0 ? (
              <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50/80 p-4 text-sm text-slate-500">
                <StickyNote
                  className="mb-2 h-4 w-4 text-amber-500"
                  aria-hidden="true"
                />
                No drafts yet. Add one now or save a new item as a draft.
              </div>
            ) : (
              draftItems.map((item) => (
                <CalendarItemCard
                  key={item.id}
                  item={item}
                  onOpen={openEditDialog}
                />
              ))
            )}
          </div>
        </aside>
      </div>

      {dialog.open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/32 p-3 backdrop-blur-sm sm:items-center">
          <form
            onSubmit={handleSubmit}
            className="max-h-[92vh] w-full max-w-xl overflow-y-auto rounded-lg border border-white/80 bg-white p-4 shadow-2xl sm:p-5"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-emerald-600">
                  {dialog.itemId ? "Edit calendar item" : "New calendar item"}
                </p>
                <h2 className="mt-1 text-xl font-semibold text-slate-950">
                  {dialog.itemId
                    ? "View and edit task"
                    : "Add task or reminder"}
                </h2>
              </div>
              <button
                type="button"
                onClick={closeDialog}
                className="h-8 rounded-lg px-3 text-sm font-semibold text-slate-500 transition hover:bg-slate-50 hover:text-slate-900"
              >
                Close
              </button>
            </div>

            <div className="mt-5 grid gap-4">
              <label className="grid gap-1.5">
                <span className="text-sm font-semibold text-slate-700">
                  Title
                </span>
                <input
                  required
                  value={form.title}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      title: event.target.value,
                    }))
                  }
                  className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-sky-300 focus:ring-2 focus:ring-sky-100"
                  placeholder="Follow up on launch checklist"
                />
              </label>

              <label className="grid gap-1.5">
                <span className="text-sm font-semibold text-slate-700">
                  Description
                </span>
                <textarea
                  value={form.description}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      description: event.target.value,
                    }))
                  }
                  className="min-h-24 resize-none rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-sky-300 focus:ring-2 focus:ring-sky-100"
                  placeholder="Add useful context, links, or notes"
                />
              </label>

              <div className="grid gap-3 sm:grid-cols-2">
                <label className="grid gap-1.5">
                  <span className="text-sm font-semibold text-slate-700">
                    Type
                  </span>
                  <select
                    value={form.itemType}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        itemType: event.target.value as CalendarItemType,
                      }))
                    }
                    className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-sky-300 focus:ring-2 focus:ring-sky-100"
                  >
                    <option value="task">Task</option>
                    <option value="reminder">Reminder</option>
                  </select>
                </label>

                <label className="grid gap-1.5">
                  <span className="text-sm font-semibold text-slate-700">
                    Save as
                  </span>
                  <select
                    value={form.status}
                    onChange={(event) => {
                      const status = event.target.value as CalendarItemStatus;
                      setForm((current) => ({ ...current, status }));
                    }}
                    className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-sky-300 focus:ring-2 focus:ring-sky-100"
                  >
                    <option value="scheduled">Schedule on calendar</option>
                    <option value="draft">Save to draft panel</option>
                  </select>
                </label>
              </div>

              <div className="grid gap-2">
                <span className="text-sm font-semibold text-slate-700">
                  Task category
                </span>
                <div className="grid gap-2 sm:grid-cols-5">
                  {categoryOptions.map((category) => (
                    <button
                      key={category.value}
                      type="button"
                      onClick={() =>
                        setForm((current) => ({
                          ...current,
                          category: category.value,
                        }))
                      }
                      className={cn(
                        "flex min-h-10 items-center justify-center gap-2 rounded-lg border px-2 text-xs font-semibold transition",
                        category.badgeClass,
                        form.category === category.value
                          ? "ring-2 ring-slate-900/10"
                          : "opacity-78 hover:opacity-100",
                      )}
                    >
                      <span
                        className={cn(
                          "h-2 w-2 rounded-full",
                          category.dotClass,
                        )}
                      />
                      {category.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <label className="grid gap-1.5">
                  <span className="text-sm font-semibold text-slate-700">
                    Date
                  </span>
                  <input
                    type="date"
                    required={form.status === "scheduled"}
                    disabled={form.status === "draft"}
                    value={form.scheduledDate}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        scheduledDate: event.target.value,
                      }))
                    }
                    className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition disabled:bg-slate-50 disabled:text-slate-400 focus:border-sky-300 focus:ring-2 focus:ring-sky-100"
                  />
                </label>
                <label className="grid gap-1.5">
                  <span className="text-sm font-semibold text-slate-700">
                    Time
                  </span>
                  <input
                    type="time"
                    disabled={form.status === "draft"}
                    value={form.scheduledTime}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        scheduledTime: event.target.value,
                      }))
                    }
                    className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition disabled:bg-slate-50 disabled:text-slate-400 focus:border-sky-300 focus:ring-2 focus:ring-sky-100"
                  />
                </label>
              </div>
            </div>

            {error && (
              <div className="mt-4 rounded-lg border border-rose-100 bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700">
                {error}
              </div>
            )}

            <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={closeDialog}
                className="h-10 rounded-lg border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-600 shadow-sm transition hover:text-slate-950"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="h-10 rounded-lg bg-slate-950 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 disabled:opacity-60"
              >
                {saving
                  ? "Saving..."
                  : dialog.itemId
                    ? "Save changes"
                    : form.status === "draft"
                      ? "Save draft"
                      : "Schedule item"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
