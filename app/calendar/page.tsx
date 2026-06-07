import { redirect } from "next/navigation";

import {
  listCalendarItems,
  type CalendarItemView,
} from "@/app/calendar/actions";
import { CalendarBoard } from "@/app/calendar/calendar-board";
import { AppShell } from "@/components/app-shell";
import { UnauthenticatedUserError } from "@/lib/auth/sync-user";

export default async function CalendarPage() {
  let items: CalendarItemView[] = [];

  try {
    items = await listCalendarItems();
  } catch (error) {
    if (error instanceof UnauthenticatedUserError) {
      redirect("/sign-in");
    }

    throw error;
  }

  return (
    <AppShell>
      <CalendarBoard initialItems={items} />
    </AppShell>
  );
}
