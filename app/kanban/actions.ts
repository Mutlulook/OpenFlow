"use server";

import { clerkClient } from "@clerk/nextjs/server";
import { and, asc, eq, inArray, or } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";

import {
  calendarItems,
  db,
  kanbanBoardCollaborators,
  kanbanBoards,
  kanbanColumns,
  kanbanTasks,
  users,
} from "@/db";
import { syncCurrentUserToDatabase } from "@/lib/auth/sync-user";
import { getKanbanRoomId, syncKanbanRoomAccess } from "@/lib/liveblocks/server";

export type KanbanPriority = "Low" | "Medium" | "High";
export type KanbanAccessRole = "owner" | "full_edit";

export type KanbanLabel = {
  id: string;
  name: string;
  color: string;
};

export type KanbanUserView = {
  id: number;
  email: string;
  name: string;
  imageUrl: string | null;
  color: string;
};

export type KanbanCollaboratorView = {
  id: number;
  email: string;
  role: "full_edit";
  status: "pending" | "accepted";
  user: KanbanUserView | null;
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
  roomId: string;
  accessRole: KanbanAccessRole;
  owner: KanbanUserView;
  collaborators: KanbanCollaboratorView[];
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

export type InviteCollaboratorResult = {
  collaborator: KanbanCollaboratorView;
  message: string;
};

const defaultColumnNames = ["Todo", "In Progress", "Done"];
const maxColumnsPerBoard = 5;
const priorities = new Set<KanbanPriority>(["Low", "Medium", "High"]);
const colorPattern = /^#[0-9a-fA-F]{6}$/;
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const labelColors = new Set([
  "#38bdf8",
  "#34d399",
  "#f59e0b",
  "#fb7185",
  "#8b5cf6",
]);
const userColors = [
  "#38bdf8",
  "#34d399",
  "#f59e0b",
  "#fb7185",
  "#8b5cf6",
  "#14b8a6",
  "#f97316",
];

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

function normalizeEmail(value: string) {
  const email = value.trim().toLowerCase();

  if (!emailPattern.test(email)) {
    throw new Error("Enter a valid email address.");
  }

  return email;
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

function getUserColor(seed: string | number) {
  const text = String(seed);
  let hash = 0;

  for (let index = 0; index < text.length; index += 1) {
    hash = (hash + text.charCodeAt(index) * (index + 1)) % userColors.length;
  }

  return userColors[hash];
}

function toUserView(user: typeof users.$inferSelect): KanbanUserView {
  return {
    id: user.id,
    email: user.email,
    name: user.name || user.email,
    imageUrl: user.imageUrl,
    color: getUserColor(user.email),
  };
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

async function attachCurrentUserToCollaborations(user: typeof users.$inferSelect) {
  await db
    .update(kanbanBoardCollaborators)
    .set({
      userId: user.id,
      status: "accepted",
      acceptedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(kanbanBoardCollaborators.email, user.email.toLowerCase()));
}

export async function assertKanbanBoardAccess(boardId: number) {
  const user = await syncCurrentUserToDatabase();
  await attachCurrentUserToCollaborations(user);

  const [owned] = await db
    .select({ board: kanbanBoards })
    .from(kanbanBoards)
    .where(and(eq(kanbanBoards.id, boardId), eq(kanbanBoards.userId, user.id)));

  if (owned) {
    return { board: owned.board, user, accessRole: "owner" as const };
  }

  const [shared] = await db
    .select({ board: kanbanBoards, collaborator: kanbanBoardCollaborators })
    .from(kanbanBoardCollaborators)
    .innerJoin(
      kanbanBoards,
      eq(kanbanBoardCollaborators.boardId, kanbanBoards.id),
    )
    .where(
      and(
        eq(kanbanBoards.id, boardId),
        or(
          eq(kanbanBoardCollaborators.userId, user.id),
          eq(kanbanBoardCollaborators.email, user.email.toLowerCase()),
        ),
      ),
    );

  if (!shared || shared.collaborator.role !== "full_edit") {
    throw new Error("Board was not found.");
  }

  return { board: shared.board, user, accessRole: "full_edit" as const };
}

async function assertColumnForUser(columnId: number) {
  assertId(columnId, "Column");

  const [row] = await db
    .select({
      column: kanbanColumns,
      board: kanbanBoards,
    })
    .from(kanbanColumns)
    .innerJoin(kanbanBoards, eq(kanbanColumns.boardId, kanbanBoards.id))
    .where(eq(kanbanColumns.id, columnId));

  if (!row) {
    throw new Error("Column was not found.");
  }

  const access = await assertKanbanBoardAccess(row.board.id);

  return { ...row, user: access.user, accessRole: access.accessRole };
}

async function assertTaskForUser(taskId: number) {
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
    .where(eq(kanbanTasks.id, taskId));

  if (!row) {
    throw new Error("Task was not found.");
  }

  const access = await assertKanbanBoardAccess(row.board.id);

  return { ...row, user: access.user, accessRole: access.accessRole };
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

async function getAccessibleBoardIds(user: typeof users.$inferSelect) {
  const [ownedBoards, sharedBoards] = await Promise.all([
    db
      .select({ id: kanbanBoards.id })
      .from(kanbanBoards)
      .where(eq(kanbanBoards.userId, user.id)),
    db
      .select({ id: kanbanBoardCollaborators.boardId })
      .from(kanbanBoardCollaborators)
      .where(
        or(
          eq(kanbanBoardCollaborators.userId, user.id),
          eq(kanbanBoardCollaborators.email, user.email.toLowerCase()),
        ),
      ),
  ]);

  return Array.from(
    new Set([
      ...ownedBoards.map((board) => board.id),
      ...sharedBoards.map((board) => board.id),
    ]),
  );
}

async function getBoardCollaborators(boardIds: number[]) {
  if (boardIds.length === 0) {
    return new Map<number, KanbanCollaboratorView[]>();
  }

  const rows = await db
    .select({
      collaborator: kanbanBoardCollaborators,
      user: users,
    })
    .from(kanbanBoardCollaborators)
    .leftJoin(users, eq(kanbanBoardCollaborators.userId, users.id))
    .where(inArray(kanbanBoardCollaborators.boardId, boardIds))
    .orderBy(asc(kanbanBoardCollaborators.createdAt));

  const collaboratorsByBoard = new Map<number, KanbanCollaboratorView[]>();

  for (const row of rows) {
    const collaborator = row.collaborator;
    const group = collaboratorsByBoard.get(collaborator.boardId) ?? [];

    group.push({
      id: collaborator.id,
      email: collaborator.email,
      role: "full_edit",
      status: collaborator.status === "accepted" ? "accepted" : "pending",
      user: row.user ? toUserView(row.user) : null,
    });
    collaboratorsByBoard.set(collaborator.boardId, group);
  }

  return collaboratorsByBoard;
}

async function getAppOrigin() {
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL.replace(/\/$/, "");
  }

  const requestHeaders = await headers();
  const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host");
  const protocol = requestHeaders.get("x-forwarded-proto") ?? "http";

  if (!host) {
    return "http://localhost:3000";
  }

  return `${protocol}://${host}`;
}

export async function listKanbanBoards(selectedBoardId?: number | null) {
  const user = await syncCurrentUserToDatabase();
  await attachCurrentUserToCollaborations(user);

  const accessibleBoardIds = await getAccessibleBoardIds(user);

  if (accessibleBoardIds.length === 0) {
    return [];
  }

  if (selectedBoardId) {
    assertId(selectedBoardId, "Board");
  }

  const [boards, columns, tasks, collaboratorsByBoard] = await Promise.all([
    db
      .select({
        board: kanbanBoards,
        owner: users,
      })
      .from(kanbanBoards)
      .innerJoin(users, eq(kanbanBoards.userId, users.id))
      .where(inArray(kanbanBoards.id, accessibleBoardIds))
      .orderBy(asc(kanbanBoards.createdAt), asc(kanbanBoards.id)),
    db
      .select({
        column: kanbanColumns,
      })
      .from(kanbanColumns)
      .where(inArray(kanbanColumns.boardId, accessibleBoardIds))
      .orderBy(asc(kanbanColumns.position), asc(kanbanColumns.id)),
    db
      .select({
        task: kanbanTasks,
        board: kanbanBoards,
      })
      .from(kanbanTasks)
      .innerJoin(kanbanColumns, eq(kanbanTasks.columnId, kanbanColumns.id))
      .innerJoin(kanbanBoards, eq(kanbanColumns.boardId, kanbanBoards.id))
      .where(inArray(kanbanBoards.id, accessibleBoardIds))
      .orderBy(asc(kanbanTasks.position), asc(kanbanTasks.id)),
    getBoardCollaborators(accessibleBoardIds),
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

  const view = boards.map<KanbanBoardView>((row) => ({
    id: row.board.id,
    name: row.board.name,
    color: row.board.color,
    roomId: getKanbanRoomId(row.board.id),
    accessRole: row.board.userId === user.id ? "owner" : "full_edit",
    owner: toUserView(row.owner),
    collaborators: collaboratorsByBoard.get(row.board.id) ?? [],
    columns: columnsByBoard.get(row.board.id) ?? [],
  }));

  if (selectedBoardId && view.some((board) => board.id === selectedBoardId)) {
    return [
      ...view.filter((board) => board.id === selectedBoardId),
      ...view.filter((board) => board.id !== selectedBoardId),
    ];
  }

  return view;
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

  await syncKanbanRoomAccess(board.id);
  revalidatePath("/kanban");

  return {
    id: board.id,
    name: board.name,
    color: board.color,
    roomId: getKanbanRoomId(board.id),
    accessRole: "owner",
    owner: toUserView(user),
    collaborators: [],
    columns: insertedColumns.map((column) => ({
      id: column.id,
      boardId: column.boardId,
      name: column.name,
      position: column.position,
      tasks: [],
    })),
  } satisfies KanbanBoardView;
}

export async function inviteKanbanBoardCollaborator(boardId: number, emailValue: string) {
  const { board, user } = await assertKanbanBoardAccess(boardId);

  if (board.userId !== user.id) {
    throw new Error("Only the board owner can invite collaborators.");
  }

  const email = normalizeEmail(emailValue);

  if (email === user.email.toLowerCase()) {
    throw new Error("You already own this board.");
  }

  const [existingUser] = await db
    .select()
    .from(users)
    .where(eq(users.email, email));

  const [existing] = await db
    .select()
    .from(kanbanBoardCollaborators)
    .where(
      and(
        eq(kanbanBoardCollaborators.boardId, boardId),
        eq(kanbanBoardCollaborators.email, email),
      ),
    );

  let clerkInvitationId = existing?.clerkInvitationId ?? null;
  let message = existing
    ? "Access is already granted for this email."
    : "Invite sent and board access granted.";

  if (!existingUser && !clerkInvitationId) {
    try {
      const client = await clerkClient();
      const origin = await getAppOrigin();
      const invitation = await client.invitations.createInvitation({
        emailAddress: email,
        notify: true,
        redirectUrl: `${origin}/kanban?boardId=${boardId}`,
        publicMetadata: {
          kanbanBoardId: boardId,
        },
      });

      clerkInvitationId = invitation.id;
    } catch {
      message =
        "Board access was granted. Clerk could not send a new invitation, likely because this email is already invited.";
    }
  } else if (existingUser) {
    message = "Access granted. This user can open the shared board now.";
  }

  const values = {
    boardId,
    email,
    userId: existingUser?.id ?? null,
    role: "full_edit",
    status: existingUser ? "accepted" : "pending",
    invitedByUserId: user.id,
    clerkInvitationId,
    acceptedAt: existingUser ? new Date() : null,
    updatedAt: new Date(),
  };

  const [collaborator] = existing
    ? await db
        .update(kanbanBoardCollaborators)
        .set(values)
        .where(eq(kanbanBoardCollaborators.id, existing.id))
        .returning()
    : await db.insert(kanbanBoardCollaborators).values(values).returning();

  await syncKanbanRoomAccess(boardId);
  revalidatePath("/kanban");

  return {
    collaborator: {
      id: collaborator.id,
      email: collaborator.email,
      role: "full_edit",
      status: collaborator.status === "accepted" ? "accepted" : "pending",
      user: existingUser ? toUserView(existingUser) : null,
    },
    message,
  } satisfies InviteCollaboratorResult;
}

export async function addKanbanColumn(boardId: number, name: string) {
  await assertKanbanBoardAccess(boardId);

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
  await assertColumnForUser(columnId);
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
  const { column, user } = await assertColumnForUser(columnId);
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
  const values = normalizeTaskInput(input);
  const { user } = await assertColumnForUser(values.columnId);
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
  const current = await assertTaskForUser(taskId);
  const values = normalizeTaskInput(input);
  const target = await assertColumnForUser(values.columnId);

  if (target.column.boardId !== current.board.id) {
    throw new Error("Tasks can only move within their board.");
  }

  const calendarItemId = await syncTaskToCalendar(
    current.user.id,
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
  const current = await assertTaskForUser(taskId);

  if (current.task.calendarItemId) {
    await db
      .delete(calendarItems)
      .where(
        and(
          eq(calendarItems.id, current.task.calendarItemId),
          eq(calendarItems.userId, current.user.id),
        ),
      );
  }

  await db.delete(kanbanTasks).where(eq(kanbanTasks.id, taskId));

  revalidatePath("/kanban");
  revalidatePath("/calendar");
}

export async function moveKanbanTask(taskId: number, targetColumnId: number) {
  const current = await assertTaskForUser(taskId);
  const target = await assertColumnForUser(targetColumnId);

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
