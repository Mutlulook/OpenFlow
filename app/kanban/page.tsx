import { redirect } from "next/navigation";

import {
  listKanbanBoards,
  type KanbanBoardView,
} from "@/app/kanban/actions";
import { KanbanBoard } from "@/app/kanban/kanban-board";
import { AppShell } from "@/components/app-shell";
import { UnauthenticatedUserError } from "@/lib/auth/sync-user";

export default async function KanbanPage({
  searchParams,
}: {
  searchParams: Promise<{ boardId?: string }>;
}) {
  let boards: KanbanBoardView[] = [];
  const params = await searchParams;
  const selectedBoardId = params.boardId ? Number(params.boardId) : null;

  try {
    boards = await listKanbanBoards(
      Number.isInteger(selectedBoardId) ? selectedBoardId : null,
    );
  } catch (error) {
    if (error instanceof UnauthenticatedUserError) {
      redirect("/sign-in");
    }

    throw error;
  }

  return (
    <AppShell>
      <KanbanBoard
        initialBoards={boards}
        initialSelectedBoardId={
          Number.isInteger(selectedBoardId) ? selectedBoardId : null
        }
      />
    </AppShell>
  );
}
