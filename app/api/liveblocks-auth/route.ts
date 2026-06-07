import { and, eq, or } from "drizzle-orm";

import { db, kanbanBoardCollaborators, kanbanBoards } from "@/db";
import { syncCurrentUserToDatabase } from "@/lib/auth/sync-user";
import { getLiveblocksClient, syncKanbanRoomAccess } from "@/lib/liveblocks/server";

const userColors = [
  "#38bdf8",
  "#34d399",
  "#f59e0b",
  "#fb7185",
  "#8b5cf6",
  "#14b8a6",
  "#f97316",
];

function getUserColor(seed: string) {
  let hash = 0;

  for (let index = 0; index < seed.length; index += 1) {
    hash = (hash + seed.charCodeAt(index) * (index + 1)) % userColors.length;
  }

  return userColors[hash];
}

function getBoardIdFromRoom(roomId: string) {
  const match = roomId.match(/^openflow:kanban-board:(\d+)$/);
  return match ? Number(match[1]) : null;
}

export async function POST(request: Request) {
  const { room } = (await request.json()) as { room?: string };
  const boardId = room ? getBoardIdFromRoom(room) : null;

  if (!room || !boardId) {
    return new Response("Invalid Liveblocks room.", { status: 400 });
  }

  const user = await syncCurrentUserToDatabase();
  const email = user.email.toLowerCase();

  await db
    .update(kanbanBoardCollaborators)
    .set({
      userId: user.id,
      status: "accepted",
      acceptedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(kanbanBoardCollaborators.email, email));

  const [owned] = await db
    .select({ id: kanbanBoards.id })
    .from(kanbanBoards)
    .where(and(eq(kanbanBoards.id, boardId), eq(kanbanBoards.userId, user.id)));

  const [shared] = owned
    ? []
    : await db
        .select({ id: kanbanBoardCollaborators.id })
        .from(kanbanBoardCollaborators)
        .where(
          and(
            eq(kanbanBoardCollaborators.boardId, boardId),
            or(
              eq(kanbanBoardCollaborators.userId, user.id),
              eq(kanbanBoardCollaborators.email, email),
            ),
          ),
        );

  if (!owned && !shared) {
    return new Response("You do not have access to this board.", { status: 403 });
  }

  await syncKanbanRoomAccess(boardId);

  const { status, body } = await getLiveblocksClient().identifyUser(
    {
      userId: `user:${user.id}`,
      groupIds: [],
    },
    {
      userInfo: {
        name: user.name || user.email,
        email: user.email,
        avatar: user.imageUrl || "",
        color: getUserColor(user.email),
      },
    },
  );

  return new Response(body, { status });
}
