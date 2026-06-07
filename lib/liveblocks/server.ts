import { Liveblocks } from "@liveblocks/node";

import { db, kanbanBoardCollaborators, kanbanBoards } from "@/db";
import { asc, eq } from "drizzle-orm";

const fullRoomAccess: ["room:write"] = ["room:write"];

let liveblocksClient: Liveblocks | null = null;

export function getKanbanRoomId(boardId: number) {
  return `openflow:kanban-board:${boardId}`;
}

export function getLiveblocksClient() {
  if (!process.env.LIVEBLOCKS_SECRET_KEY) {
    throw new Error("LIVEBLOCKS_SECRET_KEY is not configured.");
  }

  liveblocksClient ??= new Liveblocks({
    secret: process.env.LIVEBLOCKS_SECRET_KEY,
  });

  return liveblocksClient;
}

export async function syncKanbanRoomAccess(boardId: number) {
  if (!process.env.LIVEBLOCKS_SECRET_KEY) {
    return;
  }

  const [board] = await db
    .select()
    .from(kanbanBoards)
    .where(eq(kanbanBoards.id, boardId));

  if (!board) {
    return;
  }

  const collaborators = await db
    .select()
    .from(kanbanBoardCollaborators)
    .where(eq(kanbanBoardCollaborators.boardId, boardId))
    .orderBy(asc(kanbanBoardCollaborators.createdAt));

  const usersAccesses: Record<string, ["room:write"]> = {
    [`user:${board.userId}`]: [...fullRoomAccess],
  };

  for (const collaborator of collaborators) {
    if (collaborator.userId) {
      usersAccesses[`user:${collaborator.userId}`] = [...fullRoomAccess];
    }
  }

  await getLiveblocksClient().upsertRoom(getKanbanRoomId(boardId), {
    create: {
      defaultAccesses: [],
      usersAccesses,
      metadata: {
        feature: "kanban",
        boardId: String(boardId),
      },
    },
    update: {
      defaultAccesses: [],
      usersAccesses,
      metadata: {
        feature: "kanban",
        boardId: String(boardId),
      },
    },
  });
}
