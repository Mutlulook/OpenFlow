import { redirect } from "next/navigation";

import {
  listKanbanBoards,
  type KanbanBoardView,
} from "@/app/kanban/actions";
import { KanbanBoard } from "@/app/kanban/kanban-board";
import { AppShell } from "@/components/app-shell";
import { UnauthenticatedUserError } from "@/lib/auth/sync-user";

export default async function KanbanPage() {
  let boards: KanbanBoardView[] = [];

  try {
    boards = await listKanbanBoards();
  } catch (error) {
    if (error instanceof UnauthenticatedUserError) {
      redirect("/sign-in");
    }

    throw error;
  }

  return (
    <AppShell>
      <KanbanBoard initialBoards={boards} />
    </AppShell>
  );
}
