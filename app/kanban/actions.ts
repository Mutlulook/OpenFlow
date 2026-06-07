"use server";

import { and, asc, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import {
  calendarItems,
  db,
  kanbanBoards,
  kanbanColumns,
  kanbanTasks,
} from "@/db";
import { syncCurrentUserToDatabase } from "@/lib/auth/sync-user";

export type KanbanPriority = "Low" | "Medium" | "High";

export type KanbanLabel = {
  id: string;
  name: string;
  color: string;
};

export type KanbanTaskView = {
  id: number;
  columnId: number;
  title: string;
  description: string | null;
  dueDate: string;
  priority: KanbanPriority;
  labels: KanbanLabel[];
  syncToCalendar: boolean;
  linkToNotes: boolean;
  calendarItemId: number | null;
  position: number;
};

export type KanbanColumnView = {
  id: number;
  boardId: number;
  name: string;
  position: number;
  tasks: KanbanTaskView[];
};

export type KanbanBoardView = {
  id: number;
  name: string;
  color: string;
  columns: KanbanColumnView[];
};

export type BoardInput = {
  name: string;
  color: string;
};

export type TaskInput = {
  columnId: number;
  title: string;
  description?: string;
  dueDate: string;
  priority: KanbanPriority;
  labels: KanbanLabel[];
  syncToCalendar: boolean;
  linkToNotes: boolean;
};

const defaultColumnNames = ["Todo", "In Progress", "Done"];
const maxColumnsPerBoard = 5;
const priorities = new Set<KanbanPriority>(["Low", "Medium", "High"]);
const colorPattern = /^#[0-9a-fA-F]{6}$/;
const labelColors = new Set([
  "#38bdf8",
  "#34d399",
  "#f59e0b",
  "#fb7185",
  "#8b5cf6",
]);

function assertId(value: number, label: string) {
  if (!Number.isInteger(value) || value <= 0) {
    throw new Error(`${label} is invalid.`);
  }
}

function assertDateValue(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new Error("Use a date in YYYY-MM-DD format.");
  }
}

function normalizeBoardInput(input: BoardInput) {
  const name = input.name.trim();
  const color = input.color.trim();

  if (!name) {
    throw new Error("Board name is required.");
  }

  if (!colorPattern.test(color)) {
    throw new Error("Choose a valid board color.");
  }

  return { name, color };
}

function normalizeLabels(labels: KanbanLabel[]) {
  return labels
    .map((label) => ({
      id: label.id.trim(),
      name: label.name.trim(),
      color: label.color.trim(),
    }))
    .filter((label) => label.name)
    .slice(0, 4)
    .map((label, index) => ({
      id: label.id || `label-${index + 1}`,
      name: label.name.slice(0, 24),
      color: labelColors.has(label.color) ? label.color : "#38bdf8",
    }));
}

function normalizeTaskInput(input: TaskInput) {
  const title = input.title.trim();
  const description = input.description?.trim() || null;
  const dueDate = input.dueDate.trim();

  assertId(input.columnId, "Column");

  if (!title) {
    throw new Error("Task title is required.");
  }

  assertDateValue(dueDate);

  if (!priorities.has(input.priority)) {
    throw new Error("Choose a valid priority.");
  }

  return {
    columnId: input.columnId,
    title,
    description,
    dueDate,
    priority: input.priority,
    labels: normalizeLabels(input.labels),
    syncToCalendar: input.syncToCalendar,
    linkToNotes: input.linkToNotes,
  };
}

function parseLabels(value: string): KanbanLabel[] {
  try {
    const parsed = JSON.parse(value);

    if (!Array.isArray(parsed)) {
      return [];
    }

    return normalizeLabels(parsed);
  } catch {
    return [];
  }
}

function toTaskView(task: typeof kanbanTasks.$inferSelect): KanbanTaskView {
  return {
    id: task.id,
    columnId: task.columnId,
    title: task.title,
    description: task.description,
    dueDate: task.dueDate,
    priority: task.priority as KanbanPriority,
    labels: parseLabels(task.labels),
    syncToCalendar: task.syncToCalendar,
    linkToNotes: task.linkToNotes,
    calendarItemId: task.calendarItemId,
    position: task.position,
  };
}

async function assertBoardForUser(boardId: number, userId: number) {
  assertId(boardId, "Board");

  const [board] = await db
    .select()
    .from(kanbanBoards)
    .where(and(eq(kanbanBoards.id, boardId), eq(kanbanBoards.userId, userId)));

  if (!board) {
    throw new Error("Board was not found.");
  }

  return board;
}

async function assertColumnForUser(columnId: number, userId: number) {
  assertId(columnId, "Column");

  const [row] = await db
    .select({
      column: kanbanColumns,
      board: kanbanBoards,
    })
    .from(kanbanColumns)
    .innerJoin(kanbanBoards, eq(kanbanColumns.boardId, kanbanBoards.id))
    .where(and(eq(kanbanColumns.id, columnId), eq(kanbanBoards.userId, userId)));

  if (!row) {
    throw new Error("Column was not found.");
  }

  return row;
}

async function assertTaskForUser(taskId: number, userId: number) {
  assertId(taskId, "Task");

  const [row] = await db
    .select({
      task: kanbanTasks,
      column: kanbanColumns,
      board: kanbanBoards,
    })
    .from(kanbanTasks)
    .innerJoin(kanbanColumns, eq(kanbanTasks.columnId, kanbanColumns.id))
    .innerJoin(kanbanBoards, eq(kanbanColumns.boardId, kanbanBoards.id))
    .where(and(eq(kanbanTasks.id, taskId), eq(kanbanBoards.userId, userId)));

  if (!row) {
    throw new Error("Task was not found.");
  }

  return row;
}

async function getNextTaskPosition(columnId: number) {
  const tasks = await db
    .select({ position: kanbanTasks.position })
    .from(kanbanTasks)
    .where(eq(kanbanTasks.columnId, columnId))
    .orderBy(asc(kanbanTasks.position));

  return tasks.length ? Math.max(...tasks.map((task) => task.position)) + 1 : 0;
}

async function syncTaskToCalendar(
  userId: number,
  input: ReturnType<typeof normalizeTaskInput>,
  calendarItemId: number | null,
) {
  if (!input.syncToCalendar) {
    if (calendarItemId) {
      await db
        .delete(calendarItems)
        .where(
          and(
            eq(calendarItems.id, calendarItemId),
            eq(calendarItems.userId, userId),
          ),
        );
    }

    return null;
  }

  const values = {
    userId,
    title: input.title,
    description: input.description,
    itemType: "task",
    category: "focus",
    scheduledDate: input.dueDate,
    scheduledTime: null,
    status: "scheduled",
    updatedAt: new Date(),
  };

  if (calendarItemId) {
    const [item] = await db
      .update(calendarItems)
      .set(values)
      .where(and(eq(calendarItems.id, calendarItemId), eq(calendarItems.userId, userId)))
      .returning();

    if (item) {
      return item.id;
    }
  }

  const [item] = await db.insert(calendarItems).values(values).returning();

  return item.id;
}

export async function listKanbanBoards() {
  const user = await syncCurrentUserToDatabase();

  const [boards, columns, tasks] = await Promise.all([
    db
      .select()
      .from(kanbanBoards)
      .where(eq(kanbanBoards.userId, user.id))
      .orderBy(asc(kanbanBoards.createdAt), asc(kanbanBoards.id)),
    db
      .select({
        column: kanbanColumns,
        board: kanbanBoards,
      })
      .from(kanbanColumns)
      .innerJoin(kanbanBoards, eq(kanbanColumns.boardId, kanbanBoards.id))
      .where(eq(kanbanBoards.userId, user.id))
      .orderBy(asc(kanbanColumns.position), asc(kanbanColumns.id)),
    db
      .select({
        task: kanbanTasks,
        board: kanbanBoards,
      })
      .from(kanbanTasks)
      .innerJoin(kanbanColumns, eq(kanbanTasks.columnId, kanbanColumns.id))
      .innerJoin(kanbanBoards, eq(kanbanColumns.boardId, kanbanBoards.id))
      .where(eq(kanbanBoards.userId, user.id))
      .orderBy(asc(kanbanTasks.position), asc(kanbanTasks.id)),
  ]);

  const tasksByColumn = new Map<number, KanbanTaskView[]>();

  for (const row of tasks) {
    const group = tasksByColumn.get(row.task.columnId) ?? [];
    group.push(toTaskView(row.task));
    tasksByColumn.set(row.task.columnId, group);
  }

  const columnsByBoard = new Map<number, KanbanColumnView[]>();

  for (const row of columns) {
    const group = columnsByBoard.get(row.column.boardId) ?? [];
    group.push({
      id: row.column.id,
      boardId: row.column.boardId,
      name: row.column.name,
      position: row.column.position,
      tasks: tasksByColumn.get(row.column.id) ?? [],
    });
    columnsByBoard.set(row.column.boardId, group);
  }

  return boards.map<KanbanBoardView>((board) => ({
    id: board.id,
    name: board.name,
    color: board.color,
    columns: columnsByBoard.get(board.id) ?? [],
  }));
}

export async function createKanbanBoard(input: BoardInput) {
  const user = await syncCurrentUserToDatabase();
  const values = normalizeBoardInput(input);
  const now = new Date();

  const [board] = await db
    .insert(kanbanBoards)
    .values({
      userId: user.id,
      name: values.name,
      color: values.color,
      updatedAt: now,
    })
    .returning();

  const insertedColumns = await db
    .insert(kanbanColumns)
    .values(
      defaultColumnNames.map((name, position) => ({
        boardId: board.id,
        name,
        position,
        updatedAt: now,
      })),
    )
    .returning();

  revalidatePath("/kanban");

  return {
    id: board.id,
    name: board.name,
    color: board.color,
    columns: insertedColumns.map((column) => ({
      id: column.id,
      boardId: column.boardId,
      name: column.name,
      position: column.position,
      tasks: [],
    })),
  } satisfies KanbanBoardView;
}

export async function addKanbanColumn(boardId: number, name: string) {
  const user = await syncCurrentUserToDatabase();
  await assertBoardForUser(boardId, user.id);

  const currentColumns = await db
    .select()
    .from(kanbanColumns)
    .where(eq(kanbanColumns.boardId, boardId))
    .orderBy(asc(kanbanColumns.position));

  if (currentColumns.length >= maxColumnsPerBoard) {
    throw new Error("Boards can have up to 5 columns.");
  }

  const columnName = name.trim();

  if (!columnName) {
    throw new Error("Column name is required.");
  }

  const [column] = await db
    .insert(kanbanColumns)
    .values({
      boardId,
      name: columnName,
      position: currentColumns.length,
      updatedAt: new Date(),
    })
    .returning();

  revalidatePath("/kanban");

  return {
    id: column.id,
    boardId: column.boardId,
    name: column.name,
    position: column.position,
    tasks: [],
  } satisfies KanbanColumnView;
}

export async function renameKanbanColumn(columnId: number, name: string) {
  const user = await syncCurrentUserToDatabase();
  await assertColumnForUser(columnId, user.id);
  const columnName = name.trim();

  if (!columnName) {
    throw new Error("Column name is required.");
  }

  const [column] = await db
    .update(kanbanColumns)
    .set({ name: columnName, updatedAt: new Date() })
    .where(eq(kanbanColumns.id, columnId))
    .returning();

  revalidatePath("/kanban");

  return column;
}

export async function deleteKanbanColumn(columnId: number) {
  const user = await syncCurrentUserToDatabase();
  const { column } = await assertColumnForUser(columnId, user.id);
  const syncedTasks = await db
    .select({ calendarItemId: kanbanTasks.calendarItemId })
    .from(kanbanTasks)
    .where(eq(kanbanTasks.columnId, columnId));

  await Promise.all(
    syncedTasks
      .filter((task) => task.calendarItemId)
      .map((task) =>
        db
          .delete(calendarItems)
          .where(
            and(
              eq(calendarItems.id, task.calendarItemId!),
              eq(calendarItems.userId, user.id),
            ),
          ),
      ),
  );

  await db.delete(kanbanColumns).where(eq(kanbanColumns.id, columnId));

  const remaining = await db
    .select()
    .from(kanbanColumns)
    .where(eq(kanbanColumns.boardId, column.boardId))
    .orderBy(asc(kanbanColumns.position), asc(kanbanColumns.id));

  await Promise.all(
    remaining.map((item, position) =>
      db
        .update(kanbanColumns)
        .set({ position, updatedAt: new Date() })
        .where(eq(kanbanColumns.id, item.id)),
    ),
  );

  revalidatePath("/kanban");
}

export async function createKanbanTask(input: TaskInput) {
  const user = await syncCurrentUserToDatabase();
  const values = normalizeTaskInput(input);
  await assertColumnForUser(values.columnId, user.id);
  const calendarItemId = await syncTaskToCalendar(user.id, values, null);
  const now = new Date();

  const [task] = await db
    .insert(kanbanTasks)
    .values({
      columnId: values.columnId,
      calendarItemId,
      title: values.title,
      description: values.description,
      dueDate: values.dueDate,
      priority: values.priority,
      labels: JSON.stringify(values.labels),
      syncToCalendar: values.syncToCalendar,
      linkToNotes: values.linkToNotes,
      position: await getNextTaskPosition(values.columnId),
      updatedAt: now,
    })
    .returning();

  revalidatePath("/kanban");
  revalidatePath("/calendar");

  return toTaskView(task);
}

export async function updateKanbanTask(taskId: number, input: TaskInput) {
  const user = await syncCurrentUserToDatabase();
  const current = await assertTaskForUser(taskId, user.id);
  const values = normalizeTaskInput(input);
  const target = await assertColumnForUser(values.columnId, user.id);

  if (target.column.boardId !== current.board.id) {
    throw new Error("Tasks can only move within their board.");
  }

  const calendarItemId = await syncTaskToCalendar(
    user.id,
    values,
    current.task.calendarItemId,
  );
  const position =
    values.columnId === current.task.columnId
      ? current.task.position
      : await getNextTaskPosition(values.columnId);

  const [task] = await db
    .update(kanbanTasks)
    .set({
      columnId: values.columnId,
      calendarItemId,
      title: values.title,
      description: values.description,
      dueDate: values.dueDate,
      priority: values.priority,
      labels: JSON.stringify(values.labels),
      syncToCalendar: values.syncToCalendar,
      linkToNotes: values.linkToNotes,
      position,
      updatedAt: new Date(),
    })
    .where(eq(kanbanTasks.id, taskId))
    .returning();

  revalidatePath("/kanban");
  revalidatePath("/calendar");

  return toTaskView(task);
}

export async function deleteKanbanTask(taskId: number) {
  const user = await syncCurrentUserToDatabase();
  const current = await assertTaskForUser(taskId, user.id);

  if (current.task.calendarItemId) {
    await db
      .delete(calendarItems)
      .where(
        and(
          eq(calendarItems.id, current.task.calendarItemId),
          eq(calendarItems.userId, user.id),
        ),
      );
  }

  await db.delete(kanbanTasks).where(eq(kanbanTasks.id, taskId));

  revalidatePath("/kanban");
  revalidatePath("/calendar");
}

export async function moveKanbanTask(taskId: number, targetColumnId: number) {
  const user = await syncCurrentUserToDatabase();
  const current = await assertTaskForUser(taskId, user.id);
  const target = await assertColumnForUser(targetColumnId, user.id);

  if (target.column.boardId !== current.board.id) {
    throw new Error("Tasks can only move within their board.");
  }

  const [task] = await db
    .update(kanbanTasks)
    .set({
      columnId: targetColumnId,
      position: await getNextTaskPosition(targetColumnId),
      updatedAt: new Date(),
    })
    .where(eq(kanbanTasks.id, taskId))
    .returning();

  revalidatePath("/kanban");

  return toTaskView(task);
}
