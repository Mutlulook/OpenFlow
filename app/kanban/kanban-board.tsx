"use client";

import {
  CalendarDays,
  Check,
  Columns3,
  Edit3,
  GripVertical,
  ListPlus,
  NotebookTabs,
  Plus,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import { FormEvent, useMemo, useRef, useState } from "react";

import {
  addKanbanColumn,
  createKanbanBoard,
  createKanbanTask,
  deleteKanbanColumn,
  deleteKanbanTask,
  moveKanbanTask,
  renameKanbanColumn,
  updateKanbanTask,
  type KanbanBoardView,
  type KanbanColumnView,
  type KanbanLabel,
  type KanbanPriority,
  type KanbanTaskView,
  type TaskInput,
} from "@/app/kanban/actions";
import { cn } from "@/lib/utils";

type BoardForm = {
  name: string;
  color: string;
};

type TaskDialogState = {
  open: boolean;
  columnId: number | null;
  task: KanbanTaskView | null;
};

type TaskForm = {
  title: string;
  description: string;
  dueDate: string;
  priority: KanbanPriority;
  labels: KanbanLabel[];
  syncToCalendar: boolean;
  linkToNotes: boolean;
};

const boardColors = ["#f97316", "#38bdf8", "#34d399", "#f59e0b", "#fb7185", "#8b5cf6"];
const priorityStyles: Record<KanbanPriority, string> = {
  Low: "border-emerald-100 bg-emerald-50 text-emerald-700",
  Medium: "border-amber-100 bg-amber-50 text-amber-700",
  High: "border-rose-100 bg-rose-50 text-rose-700",
};
const labelOptions: KanbanLabel[] = [
  { id: "focus", name: "Focus", color: "#38bdf8" },
  { id: "writing", name: "Writing", color: "#34d399" },
  { id: "review", name: "Review", color: "#f59e0b" },
  { id: "urgent", name: "Urgent", color: "#fb7185" },
  { id: "creative", name: "Creative", color: "#8b5cf6" },
];

function pad(value: number) {
  return String(value).padStart(2, "0");
}

function todayKey() {
  const date = new Date();
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
  }).format(new Date(`${value}T00:00:00`));
}

function emptyTaskForm(): TaskForm {
  return {
    title: "",
    description: "",
    dueDate: todayKey(),
    priority: "Medium",
    labels: [],
    syncToCalendar: false,
    linkToNotes: false,
  };
}

function taskToForm(task: KanbanTaskView): TaskForm {
  return {
    title: task.title,
    description: task.description ?? "",
    dueDate: task.dueDate,
    priority: task.priority,
    labels: task.labels,
    syncToCalendar: task.syncToCalendar,
    linkToNotes: task.linkToNotes,
  };
}

function makeTaskInput(columnId: number, form: TaskForm): TaskInput {
  return {
    columnId,
    title: form.title,
    description: form.description,
    dueDate: form.dueDate,
    priority: form.priority,
    labels: form.labels,
    syncToCalendar: form.syncToCalendar,
    linkToNotes: form.linkToNotes,
  };
}

function getTaskCount(board: KanbanBoardView | undefined) {
  return board?.columns.reduce((count, column) => count + column.tasks.length, 0) ?? 0;
}

function sortColumns(columns: KanbanColumnView[]) {
  return [...columns].sort((a, b) => a.position - b.position || a.id - b.id);
}

function sortTasks(tasks: KanbanTaskView[]) {
  return [...tasks].sort((a, b) => a.position - b.position || a.id - b.id);
}

export function KanbanBoard({
  initialBoards,
}: {
  initialBoards: KanbanBoardView[];
}) {
  const [boards, setBoards] = useState(initialBoards);
  const [selectedBoardId, setSelectedBoardId] = useState<number | null>(
    initialBoards[0]?.id ?? null,
  );
  const [boardDialogOpen, setBoardDialogOpen] = useState(false);
  const [boardForm, setBoardForm] = useState<BoardForm>({
    name: "",
    color: boardColors[0],
  });
  const [taskDialog, setTaskDialog] = useState<TaskDialogState>({
    open: false,
    columnId: null,
    task: null,
  });
  const [taskForm, setTaskForm] = useState<TaskForm>(() => emptyTaskForm());
  const [newColumnName, setNewColumnName] = useState("");
  const [renamingColumnId, setRenamingColumnId] = useState<number | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dropTargetColumnId, setDropTargetColumnId] = useState<number | null>(null);

  const selectedBoard = useMemo(
    () => boards.find((board) => board.id === selectedBoardId) ?? boards[0],
    [boards, selectedBoardId],
  );

  function updateBoard(nextBoard: KanbanBoardView) {
    setBoards((current) =>
      current.map((board) => (board.id === nextBoard.id ? nextBoard : board)),
    );
  }

  function replaceColumn(boardId: number, nextColumn: KanbanColumnView) {
    setBoards((current) =>
      current.map((board) =>
        board.id === boardId
          ? {
              ...board,
              columns: board.columns.map((column) =>
                column.id === nextColumn.id ? nextColumn : column,
              ),
            }
          : board,
      ),
    );
  }

  function replaceTask(nextTask: KanbanTaskView) {
    setBoards((current) =>
      current.map((board) => ({
        ...board,
        columns: board.columns.map((column) => ({
          ...column,
          tasks:
            column.id === nextTask.columnId
              ? column.tasks.some((task) => task.id === nextTask.id)
                ? column.tasks.map((task) =>
                    task.id === nextTask.id ? nextTask : task,
                  )
                : [...column.tasks, nextTask]
              : column.tasks.filter((task) => task.id !== nextTask.id),
        })),
      })),
    );
  }

  function removeTask(taskId: number) {
    setBoards((current) =>
      current.map((board) => ({
        ...board,
        columns: board.columns.map((column) => ({
          ...column,
          tasks: column.tasks.filter((task) => task.id !== taskId),
        })),
      })),
    );
  }

  function openTaskDialog(columnId: number, task: KanbanTaskView | null = null) {
    setError(null);
    setTaskDialog({ open: true, columnId, task });
    setTaskForm(task ? taskToForm(task) : emptyTaskForm());
  }

  function closeTaskDialog() {
    setTaskDialog({ open: false, columnId: null, task: null });
    setError(null);
  }

  async function handleCreateBoard(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const board = await createKanbanBoard(boardForm);
      setBoards((current) => [...current, board]);
      setSelectedBoardId(board.id);
      setBoardForm({ name: "", color: boardColors[0] });
      setBoardDialogOpen(false);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Board could not be saved.");
    } finally {
      setSaving(false);
    }
  }

  async function handleAddColumn() {
    if (!selectedBoard) {
      return;
    }

    if (selectedBoard.columns.length >= 5) {
      setError("Boards can have up to 5 columns.");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const column = await addKanbanColumn(selectedBoard.id, newColumnName);
      updateBoard({ ...selectedBoard, columns: [...selectedBoard.columns, column] });
      setNewColumnName("");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Column could not be added.");
    } finally {
      setSaving(false);
    }
  }

  async function handleRenameColumn(column: KanbanColumnView) {
    setSaving(true);
    setError(null);

    try {
      const renamed = await renameKanbanColumn(column.id, renameValue);
      replaceColumn(column.boardId, {
        ...column,
        name: renamed.name,
        position: renamed.position,
      });
      setRenamingColumnId(null);
      setRenameValue("");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Column could not be renamed.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteColumn(column: KanbanColumnView) {
    if (!selectedBoard || !window.confirm(`Delete "${column.name}" and its tasks?`)) {
      return;
    }

    const before = boards;
    setBoards((current) =>
      current.map((board) =>
        board.id === selectedBoard.id
          ? {
              ...board,
              columns: board.columns
                .filter((item) => item.id !== column.id)
                .map((item, position) => ({ ...item, position })),
            }
          : board,
      ),
    );
    setError(null);

    try {
      await deleteKanbanColumn(column.id);
    } catch (caught) {
      setBoards(before);
      setError(caught instanceof Error ? caught.message : "Column could not be deleted.");
    }
  }

  async function handleSubmitTask(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!taskDialog.columnId) {
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const input = makeTaskInput(taskDialog.columnId, taskForm);
      const task = taskDialog.task
        ? await updateKanbanTask(taskDialog.task.id, input)
        : await createKanbanTask(input);

      replaceTask(task);
      closeTaskDialog();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Task could not be saved.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteTask(task: KanbanTaskView) {
    if (!window.confirm(`Delete "${task.title}"?`)) {
      return;
    }

    const before = boards;
    removeTask(task.id);
    setError(null);

    try {
      await deleteKanbanTask(task.id);
    } catch (caught) {
      setBoards(before);
      setError(caught instanceof Error ? caught.message : "Task could not be deleted.");
    }
  }

  async function handleDropTask(taskId: number, targetColumnId: number) {
    const before = boards;
    let movingTask: KanbanTaskView | null = null;

    for (const board of boards) {
      for (const column of board.columns) {
        const task = column.tasks.find((item) => item.id === taskId);

        if (task) {
          movingTask = task;
        }
      }
    }

    if (!movingTask || movingTask.columnId === targetColumnId) {
      setDropTargetColumnId(null);
      return;
    }

    replaceTask({ ...movingTask, columnId: targetColumnId, position: Date.now() });
    setDropTargetColumnId(null);
    setError(null);

    try {
      const moved = await moveKanbanTask(taskId, targetColumnId);
      replaceTask(moved);
    } catch (caught) {
      setBoards(before);
      setError(caught instanceof Error ? caught.message : "Task could not be moved.");
    }
  }

  function toggleLabel(label: KanbanLabel) {
    setTaskForm((current) => {
      const selected = current.labels.some((item) => item.id === label.id);

      return {
        ...current,
        labels: selected
          ? current.labels.filter((item) => item.id !== label.id)
          : [...current.labels, label],
      };
    });
  }

  return (
    <div className="min-w-0">
      <header className="flex flex-col gap-4 rounded-lg border border-white/70 bg-white/72 p-4 shadow-sm backdrop-blur xl:flex-row xl:items-center xl:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-orange-600">
            Kanban / Task
          </p>
          <h1 className="mt-1 text-2xl font-semibold text-slate-950">
            Shape tasks into calm, visible progress.
          </h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex h-9 items-center gap-2 rounded-lg border border-orange-100 bg-orange-50 px-3 text-xs font-semibold text-orange-700">
            <Columns3 className="h-4 w-4" aria-hidden="true" />
            {boards.length} boards
          </span>
          <span className="inline-flex h-9 items-center gap-2 rounded-lg border border-emerald-100 bg-emerald-50 px-3 text-xs font-semibold text-emerald-700">
            <Sparkles className="h-4 w-4" aria-hidden="true" />
            {getTaskCount(selectedBoard)} tasks
          </span>
          <button
            type="button"
            onClick={() => setBoardDialogOpen(true)}
            className="flex h-9 items-center justify-center gap-2 rounded-lg bg-slate-950 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800"
          >
            <Plus className="h-4 w-4 text-amber-300" aria-hidden="true" />
            New board
          </button>
        </div>
      </header>

      {error && (
        <div className="mt-4 rounded-lg border border-rose-100 bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700">
          {error}
        </div>
      )}

      <div className="mt-5 grid min-w-0 gap-5 xl:grid-cols-[280px_minmax(0,1fr)]">
        <aside className="min-w-0 rounded-lg border border-white/70 bg-white/76 p-3 shadow-sm backdrop-blur xl:sticky xl:top-5 xl:max-h-[calc(100vh-40px)] xl:overflow-y-auto">
          <div className="flex items-center justify-between gap-2 px-1">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">
                Boards
              </p>
              <h2 className="mt-1 text-lg font-semibold text-slate-950">
                Workspaces
              </h2>
            </div>
            <button
              type="button"
              onClick={() => setBoardDialogOpen(true)}
              className="grid h-9 w-9 place-items-center rounded-lg bg-slate-950 text-amber-300 shadow-sm transition hover:bg-slate-800"
              title="Create board"
              aria-label="Create board"
            >
              <Plus className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>

          <div className="mt-4 space-y-2">
            {boards.length === 0 ? (
              <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50/80 p-4 text-sm text-slate-500">
                <Columns3 className="mb-2 h-4 w-4 text-orange-500" aria-hidden="true" />
                Create a board to start organizing tasks.
              </div>
            ) : (
              boards.map((board) => {
                const active = selectedBoard?.id === board.id;

                return (
                  <button
                    key={board.id}
                    type="button"
                    onClick={() => setSelectedBoardId(board.id)}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-lg border px-3 py-2.5 text-left transition",
                      active
                        ? "border-slate-950 bg-slate-950 text-white shadow-sm"
                        : "border-transparent bg-white/70 text-slate-700 hover:border-orange-100 hover:bg-orange-50/70",
                    )}
                  >
                    <span
                      className="h-3 w-3 shrink-0 rounded-full shadow-sm"
                      style={{ backgroundColor: board.color }}
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold">
                        {board.name}
                      </span>
                      <span
                        className={cn(
                          "mt-0.5 block text-xs",
                          active ? "text-slate-300" : "text-slate-500",
                        )}
                      >
                        {getTaskCount(board)} tasks
                      </span>
                    </span>
                  </button>
                );
              })
            )}
          </div>
        </aside>

        <section className="min-w-0 overflow-hidden rounded-lg border border-white/70 bg-white/64 shadow-sm backdrop-blur">
          {selectedBoard ? (
            <>
              <div className="flex flex-col gap-3 border-b border-slate-100 bg-white/76 px-4 py-3 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex min-w-0 items-center gap-3">
                  <span
                    className="h-4 w-4 shrink-0 rounded-full shadow-sm"
                    style={{ backgroundColor: selectedBoard.color }}
                  />
                  <div className="min-w-0">
                    <h2 className="truncate text-lg font-semibold text-slate-950">
                      {selectedBoard.name}
                    </h2>
                    <p className="text-xs text-slate-500">
                      {selectedBoard.columns.length}/5 columns
                    </p>
                  </div>
                </div>
                <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center">
                  <input
                    value={newColumnName}
                    onChange={(event) => setNewColumnName(event.target.value)}
                    disabled={selectedBoard.columns.length >= 5}
                    className="h-9 min-w-0 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition disabled:bg-slate-50 disabled:text-slate-400 focus:border-orange-300 focus:ring-2 focus:ring-orange-100"
                    placeholder={
                      selectedBoard.columns.length >= 5
                        ? "Column limit reached"
                        : "New column name"
                    }
                  />
                  <button
                    type="button"
                    onClick={handleAddColumn}
                    disabled={saving || selectedBoard.columns.length >= 5}
                    className="flex h-9 items-center justify-center gap-2 rounded-lg bg-slate-950 px-3 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 disabled:opacity-55"
                  >
                    <ListPlus className="h-4 w-4 text-amber-300" aria-hidden="true" />
                    Add column
                  </button>
                </div>
              </div>

              <div className="min-w-0 overflow-x-auto">
                <div className="flex min-h-[calc(100vh-235px)] min-w-max gap-4 p-4">
                  {sortColumns(selectedBoard.columns).map((column) => (
                    <ColumnPanel
                      key={column.id}
                      column={column}
                      dropTargetColumnId={dropTargetColumnId}
                      renamingColumnId={renamingColumnId}
                      renameValue={renameValue}
                      saving={saving}
                      onRenameValueChange={setRenameValue}
                      onStartRename={() => {
                        setRenamingColumnId(column.id);
                        setRenameValue(column.name);
                      }}
                      onCancelRename={() => {
                        setRenamingColumnId(null);
                        setRenameValue("");
                      }}
                      onRename={() => void handleRenameColumn(column)}
                      onDeleteColumn={() => void handleDeleteColumn(column)}
                      onAddTask={() => openTaskDialog(column.id)}
                      onEditTask={(task) => openTaskDialog(column.id, task)}
                      onDeleteTask={(task) => void handleDeleteTask(task)}
                      onDragOver={() => setDropTargetColumnId(column.id)}
                      onDragLeave={() => setDropTargetColumnId(null)}
                      onDrop={(taskId) => void handleDropTask(taskId, column.id)}
                    />
                  ))}
                </div>
              </div>
            </>
          ) : (
            <div className="grid min-h-[420px] place-items-center p-8 text-center">
              <div className="max-w-sm">
                <div className="mx-auto grid h-12 w-12 place-items-center rounded-lg bg-orange-50 text-orange-600">
                  <Columns3 className="h-5 w-5" aria-hidden="true" />
                </div>
                <h2 className="mt-4 text-xl font-semibold text-slate-950">
                  Start with a board
                </h2>
                <p className="mt-2 text-sm text-slate-500">
                  Create a Kanban board and OpenFlow will add Todo, In Progress, and Done.
                </p>
                <button
                  type="button"
                  onClick={() => setBoardDialogOpen(true)}
                  className="mt-4 inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-slate-950 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800"
                >
                  <Plus className="h-4 w-4 text-amber-300" aria-hidden="true" />
                  New board
                </button>
              </div>
            </div>
          )}
        </section>
      </div>

      {boardDialogOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/32 p-3 backdrop-blur-sm sm:items-center">
          <form
            onSubmit={handleCreateBoard}
            className="w-full max-w-md rounded-lg border border-white/80 bg-white p-4 shadow-2xl"
          >
            <DialogHeader
              eyebrow="New board"
              title="Create Kanban board"
              onClose={() => setBoardDialogOpen(false)}
            />
            <label className="mt-5 grid gap-1.5">
              <span className="text-sm font-semibold text-slate-700">Board name</span>
              <input
                required
                value={boardForm.name}
                onChange={(event) =>
                  setBoardForm((current) => ({ ...current, name: event.target.value }))
                }
                className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-orange-300 focus:ring-2 focus:ring-orange-100"
                placeholder="Launch planning"
              />
            </label>
            <div className="mt-4 grid gap-2">
              <span className="text-sm font-semibold text-slate-700">Board color</span>
              <div className="flex flex-wrap gap-2">
                {boardColors.map((color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setBoardForm((current) => ({ ...current, color }))}
                    className={cn(
                      "grid h-9 w-9 place-items-center rounded-lg border border-white shadow-sm transition",
                      boardForm.color === color ? "ring-2 ring-slate-950/20" : "hover:scale-105",
                    )}
                    style={{ backgroundColor: color }}
                    title={color}
                    aria-label={`Select ${color}`}
                  >
                    {boardForm.color === color && (
                      <Check className="h-4 w-4 text-white" aria-hidden="true" />
                    )}
                  </button>
                ))}
              </div>
            </div>
            <DialogActions
              saving={saving}
              primaryLabel="Create board"
              onCancel={() => setBoardDialogOpen(false)}
            />
          </form>
        </div>
      )}

      {taskDialog.open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/32 p-3 backdrop-blur-sm sm:items-center">
          <form
            onSubmit={handleSubmitTask}
            className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-lg border border-white/80 bg-white p-4 shadow-2xl sm:p-5"
          >
            <DialogHeader
              eyebrow={taskDialog.task ? "Edit task" : "New task"}
              title={taskDialog.task ? "Update task details" : "Add task to column"}
              onClose={closeTaskDialog}
            />
            <div className="mt-5 grid gap-4">
              <label className="grid gap-1.5">
                <span className="text-sm font-semibold text-slate-700">Title</span>
                <input
                  required
                  value={taskForm.title}
                  onChange={(event) =>
                    setTaskForm((current) => ({ ...current, title: event.target.value }))
                  }
                  className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-orange-300 focus:ring-2 focus:ring-orange-100"
                  placeholder="Review launch checklist"
                />
              </label>

              <label className="grid gap-1.5">
                <span className="text-sm font-semibold text-slate-700">Description</span>
                <textarea
                  value={taskForm.description}
                  onChange={(event) =>
                    setTaskForm((current) => ({
                      ...current,
                      description: event.target.value,
                    }))
                  }
                  className="min-h-24 resize-none rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-orange-300 focus:ring-2 focus:ring-orange-100"
                  placeholder="Add context, links, and next steps"
                />
              </label>

              <div className="grid gap-3 sm:grid-cols-2">
                <label className="grid gap-1.5">
                  <span className="text-sm font-semibold text-slate-700">Due date</span>
                  <input
                    required
                    type="date"
                    value={taskForm.dueDate}
                    onChange={(event) =>
                      setTaskForm((current) => ({
                        ...current,
                        dueDate: event.target.value,
                      }))
                    }
                    className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-orange-300 focus:ring-2 focus:ring-orange-100"
                  />
                </label>
                <label className="grid gap-1.5">
                  <span className="text-sm font-semibold text-slate-700">Priority</span>
                  <select
                    value={taskForm.priority}
                    onChange={(event) =>
                      setTaskForm((current) => ({
                        ...current,
                        priority: event.target.value as KanbanPriority,
                      }))
                    }
                    className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-orange-300 focus:ring-2 focus:ring-orange-100"
                  >
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                  </select>
                </label>
              </div>

              <div className="grid gap-2">
                <span className="text-sm font-semibold text-slate-700">Labels</span>
                <div className="flex flex-wrap gap-2">
                  {labelOptions.map((label) => {
                    const selected = taskForm.labels.some((item) => item.id === label.id);

                    return (
                      <button
                        key={label.id}
                        type="button"
                        onClick={() => toggleLabel(label)}
                        className={cn(
                          "inline-flex h-9 items-center gap-2 rounded-lg border px-3 text-xs font-semibold transition",
                          selected
                            ? "border-slate-950 bg-slate-950 text-white"
                            : "border-slate-200 bg-white text-slate-600 hover:border-orange-200 hover:bg-orange-50",
                        )}
                      >
                        <span
                          className="h-2 w-2 rounded-full"
                          style={{ backgroundColor: label.color }}
                        />
                        {label.name}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="grid gap-2 sm:grid-cols-2">
                <ToggleRow
                  checked={taskForm.syncToCalendar}
                  icon={CalendarDays}
                  title="Sync with Calendar"
                  description="Create or update a scheduled calendar task."
                  onChange={(checked) =>
                    setTaskForm((current) => ({ ...current, syncToCalendar: checked }))
                  }
                />
                <ToggleRow
                  checked={taskForm.linkToNotes}
                  icon={NotebookTabs}
                  title="Link with Notes"
                  description="Show a saved notes-link indicator on the task."
                  onChange={(checked) =>
                    setTaskForm((current) => ({ ...current, linkToNotes: checked }))
                  }
                />
              </div>
            </div>
            <DialogActions
              saving={saving}
              primaryLabel={taskDialog.task ? "Save changes" : "Add task"}
              onCancel={closeTaskDialog}
            />
          </form>
        </div>
      )}
    </div>
  );
}

function ColumnPanel({
  column,
  dropTargetColumnId,
  renamingColumnId,
  renameValue,
  saving,
  onRenameValueChange,
  onStartRename,
  onCancelRename,
  onRename,
  onDeleteColumn,
  onAddTask,
  onEditTask,
  onDeleteTask,
  onDragOver,
  onDragLeave,
  onDrop,
}: {
  column: KanbanColumnView;
  dropTargetColumnId: number | null;
  renamingColumnId: number | null;
  renameValue: string;
  saving: boolean;
  onRenameValueChange: (value: string) => void;
  onStartRename: () => void;
  onCancelRename: () => void;
  onRename: () => void;
  onDeleteColumn: () => void;
  onAddTask: () => void;
  onEditTask: (task: KanbanTaskView) => void;
  onDeleteTask: (task: KanbanTaskView) => void;
  onDragOver: () => void;
  onDragLeave: () => void;
  onDrop: (taskId: number) => void;
}) {
  const isRenaming = renamingColumnId === column.id;
  const isDropTarget = dropTargetColumnId === column.id;

  return (
    <article
      onDragOver={(event) => {
        event.preventDefault();
        event.dataTransfer.dropEffect = "move";
        onDragOver();
      }}
      onDragLeave={onDragLeave}
      onDrop={(event) => {
        event.preventDefault();
        const taskId = Number(event.dataTransfer.getData("text/kanban-task-id"));

        if (taskId) {
          onDrop(taskId);
        }
      }}
      className={cn(
        "flex w-[292px] shrink-0 flex-col rounded-lg border bg-slate-50/80 shadow-sm transition",
        isDropTarget ? "border-orange-300 ring-2 ring-orange-100" : "border-slate-100",
      )}
    >
      <div className="border-b border-slate-100 p-3">
        {isRenaming ? (
          <div className="flex items-center gap-2">
            <input
              value={renameValue}
              onChange={(event) => onRenameValueChange(event.target.value)}
              className="h-9 min-w-0 flex-1 rounded-lg border border-slate-200 bg-white px-2 text-sm font-semibold text-slate-900 outline-none focus:border-orange-300 focus:ring-2 focus:ring-orange-100"
            />
            <button
              type="button"
              onClick={onRename}
              disabled={saving}
              className="grid h-9 w-9 place-items-center rounded-lg bg-slate-950 text-amber-300 disabled:opacity-55"
              title="Save column name"
              aria-label="Save column name"
            >
              <Check className="h-4 w-4" aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={onCancelRename}
              className="grid h-9 w-9 place-items-center rounded-lg border border-slate-200 bg-white text-slate-500"
              title="Cancel rename"
              aria-label="Cancel rename"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        ) : (
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h3 className="truncate text-sm font-semibold text-slate-950">
                {column.name}
              </h3>
              <p className="mt-1 text-xs text-slate-500">
                {column.tasks.length} tasks
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-1">
              <button
                type="button"
                onClick={onStartRename}
                className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 transition hover:bg-white hover:text-sky-600"
                title="Rename column"
                aria-label="Rename column"
              >
                <Edit3 className="h-4 w-4" aria-hidden="true" />
              </button>
              <button
                type="button"
                onClick={onDeleteColumn}
                className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 transition hover:bg-rose-50 hover:text-rose-600"
                title="Delete column"
                aria-label="Delete column"
              >
                <Trash2 className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-2 p-3">
        {sortTasks(column.tasks).length === 0 ? (
          <div className="rounded-lg border border-dashed border-slate-200 bg-white/70 p-4 text-sm text-slate-500">
            Drop tasks here or add a new one.
          </div>
        ) : (
          sortTasks(column.tasks).map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              onEdit={() => onEditTask(task)}
              onDelete={() => onDeleteTask(task)}
            />
          ))
        )}
      </div>

      <div className="border-t border-slate-100 p-3">
        <button
          type="button"
          onClick={onAddTask}
          className="flex h-9 w-full items-center justify-center gap-2 rounded-lg bg-white text-sm font-semibold text-slate-700 shadow-sm transition hover:text-orange-700"
        >
          <Plus className="h-4 w-4 text-orange-500" aria-hidden="true" />
          Add task
        </button>
      </div>
    </article>
  );
}

function TaskCard({
  task,
  onEdit,
  onDelete,
}: {
  task: KanbanTaskView;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const draggingRef = useRef(false);

  return (
    <div
      draggable
      onDragStart={(event) => {
        draggingRef.current = true;
        event.dataTransfer.setData("text/kanban-task-id", String(task.id));
        event.dataTransfer.effectAllowed = "move";
      }}
      onDragEnd={() => {
        window.setTimeout(() => {
          draggingRef.current = false;
        }, 0);
      }}
      onClick={() => {
        if (!draggingRef.current) {
          onEdit();
        }
      }}
      role="button"
      tabIndex={0}
      className="group cursor-grab rounded-lg border border-white bg-white p-3 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-orange-100 hover:shadow-md active:cursor-grabbing"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="line-clamp-2 text-sm font-semibold text-slate-950">
            {task.title}
          </p>
          {task.description && (
            <p className="mt-1 line-clamp-2 text-xs text-slate-500">
              {task.description}
            </p>
          )}
        </div>
        <GripVertical
          className="mt-0.5 h-4 w-4 shrink-0 text-slate-300 transition group-hover:text-slate-500"
          aria-hidden="true"
        />
      </div>

      <div className="mt-3 flex flex-wrap gap-1.5">
        <span
          className={cn(
            "inline-flex items-center rounded-md border px-2 py-1 text-[11px] font-semibold",
            priorityStyles[task.priority],
          )}
        >
          {task.priority}
        </span>
        <span className="inline-flex items-center gap-1 rounded-md border border-sky-100 bg-sky-50 px-2 py-1 text-[11px] font-semibold text-sky-700">
          <CalendarDays className="h-3 w-3" aria-hidden="true" />
          {formatDate(task.dueDate)}
        </span>
      </div>

      {task.labels.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {task.labels.map((label) => (
            <span
              key={label.id}
              className="inline-flex items-center gap-1 rounded-md bg-slate-50 px-2 py-1 text-[11px] font-semibold text-slate-600"
            >
              <span
                className="h-1.5 w-1.5 rounded-full"
                style={{ backgroundColor: label.color }}
              />
              {label.name}
            </span>
          ))}
        </div>
      )}

      <div className="mt-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          {task.syncToCalendar && (
            <span
              className="grid h-7 w-7 place-items-center rounded-lg bg-emerald-50 text-emerald-600"
              title="Synced with Calendar"
            >
              <CalendarDays className="h-3.5 w-3.5" aria-hidden="true" />
            </span>
          )}
          {task.linkToNotes && (
            <span
              className="grid h-7 w-7 place-items-center rounded-lg bg-amber-50 text-amber-600"
              title="Linked with Notes"
            >
              <NotebookTabs className="h-3.5 w-3.5" aria-hidden="true" />
            </span>
          )}
        </div>
        <div className="flex items-center gap-1 opacity-0 transition group-hover:opacity-100">
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onEdit();
            }}
            className="grid h-7 w-7 place-items-center rounded-lg text-slate-400 hover:bg-sky-50 hover:text-sky-600"
            title="Edit task"
            aria-label="Edit task"
          >
            <Edit3 className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onDelete();
            }}
            className="grid h-7 w-7 place-items-center rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-600"
            title="Delete task"
            aria-label="Delete task"
          >
            <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
        </div>
      </div>
    </div>
  );
}

function DialogHeader({
  eyebrow,
  title,
  onClose,
}: {
  eyebrow: string;
  title: string;
  onClose: () => void;
}) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-orange-600">
          {eyebrow}
        </p>
        <h2 className="mt-1 text-xl font-semibold text-slate-950">{title}</h2>
      </div>
      <button
        type="button"
        onClick={onClose}
        className="grid h-8 w-8 place-items-center rounded-lg text-slate-500 transition hover:bg-slate-50 hover:text-slate-900"
        title="Close"
        aria-label="Close"
      >
        <X className="h-4 w-4" aria-hidden="true" />
      </button>
    </div>
  );
}

function DialogActions({
  saving,
  primaryLabel,
  onCancel,
}: {
  saving: boolean;
  primaryLabel: string;
  onCancel: () => void;
}) {
  return (
    <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
      <button
        type="button"
        onClick={onCancel}
        className="h-10 rounded-lg border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-600 shadow-sm transition hover:text-slate-950"
      >
        Cancel
      </button>
      <button
        type="submit"
        disabled={saving}
        className="h-10 rounded-lg bg-slate-950 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 disabled:opacity-60"
      >
        {saving ? "Saving..." : primaryLabel}
      </button>
    </div>
  );
}

function ToggleRow({
  checked,
  icon: Icon,
  title,
  description,
  onChange,
}: {
  checked: boolean;
  icon: typeof CalendarDays;
  title: string;
  description: string;
  onChange: (checked: boolean) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={cn(
        "flex items-start gap-3 rounded-lg border p-3 text-left transition",
        checked
          ? "border-slate-950 bg-slate-950 text-white shadow-sm"
          : "border-slate-200 bg-white text-slate-700 hover:border-orange-200 hover:bg-orange-50",
      )}
    >
      <span
        className={cn(
          "grid h-9 w-9 shrink-0 place-items-center rounded-lg",
          checked ? "bg-white/10 text-amber-300" : "bg-slate-50 text-orange-500",
        )}
      >
        <Icon className="h-4 w-4" aria-hidden="true" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold">{title}</span>
        <span className={cn("mt-1 block text-xs", checked ? "text-slate-300" : "text-slate-500")}>
          {description}
        </span>
      </span>
      <span
        className={cn(
          "mt-1 h-5 w-9 rounded-full p-0.5 transition",
          checked ? "bg-emerald-400" : "bg-slate-200",
        )}
      >
        <span
          className={cn(
            "block h-4 w-4 rounded-full bg-white shadow-sm transition",
            checked && "translate-x-4",
          )}
        />
      </span>
    </button>
  );
}
