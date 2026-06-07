"use server";

import { and, asc, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { db, calendarItems } from "@/db";
import { syncCurrentUserToDatabase } from "@/lib/auth/sync-user";

export type CalendarItemType = "task" | "reminder";
export type CalendarItemStatus = "scheduled" | "draft";
export type CalendarCategory =
  | "focus"
  | "meeting"
  | "personal"
  | "follow-up"
  | "creative";

export type CalendarItemView = {
  id: number;
  title: string;
  description: string | null;
  itemType: CalendarItemType;
  category: CalendarCategory;
  scheduledDate: string | null;
  scheduledTime: string | null;
  status: CalendarItemStatus;
};

type CalendarItemInput = {
  title: string;
  description?: string;
  itemType: CalendarItemType;
  category: CalendarCategory;
  scheduledDate?: string;
  scheduledTime?: string;
  status: CalendarItemStatus;
};

const itemTypes = new Set<CalendarItemType>(["task", "reminder"]);
const categories = new Set<CalendarCategory>([
  "focus",
  "meeting",
  "personal",
  "follow-up",
  "creative",
]);

function toCalendarItemView(item: typeof calendarItems.$inferSelect) {
  return {
    id: item.id,
    title: item.title,
    description: item.description,
    itemType: item.itemType as CalendarItemType,
    category: item.category as CalendarCategory,
    scheduledDate: item.scheduledDate,
    scheduledTime: item.scheduledTime,
    status: item.status as CalendarItemStatus,
  };
}

function assertDateValue(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new Error("Use a date in YYYY-MM-DD format.");
  }
}

function normalizeInput(input: CalendarItemInput) {
  const title = input.title.trim();
  const description = input.description?.trim() || null;
  const scheduledDate = input.scheduledDate?.trim() || null;
  const scheduledTime = input.scheduledTime?.trim() || null;

  if (!title) {
    throw new Error("Title is required.");
  }

  if (!itemTypes.has(input.itemType)) {
    throw new Error("Choose a valid item type.");
  }

  if (!categories.has(input.category)) {
    throw new Error("Choose a valid category.");
  }

  if (input.status !== "draft" && input.status !== "scheduled") {
    throw new Error("Choose whether this is a draft or scheduled item.");
  }

  if (scheduledDate) {
    assertDateValue(scheduledDate);
  }

  if (scheduledTime && !/^\d{2}:\d{2}$/.test(scheduledTime)) {
    throw new Error("Use a time in HH:MM format.");
  }

  if (input.status === "scheduled" && !scheduledDate) {
    throw new Error("Scheduled items need a date.");
  }

  return {
    title,
    description,
    itemType: input.itemType,
    category: input.category,
    scheduledDate: input.status === "draft" ? null : scheduledDate,
    scheduledTime: input.status === "draft" ? null : scheduledTime,
    status: input.status,
  };
}

export async function listCalendarItems() {
  const user = await syncCurrentUserToDatabase();

  const items = await db
    .select()
    .from(calendarItems)
    .where(eq(calendarItems.userId, user.id))
    .orderBy(asc(calendarItems.scheduledDate), asc(calendarItems.createdAt));

  return items.map(toCalendarItemView);
}

export async function createCalendarItem(input: CalendarItemInput) {
  const user = await syncCurrentUserToDatabase();
  const values = normalizeInput(input);
  const now = new Date();

  const [item] = await db
    .insert(calendarItems)
    .values({
      userId: user.id,
      title: values.title,
      description: values.description,
      itemType: values.itemType,
      category: values.category,
      scheduledDate: values.scheduledDate,
      scheduledTime: values.scheduledTime,
      status: values.status,
      updatedAt: now,
    })
    .returning();

  revalidatePath("/calendar");

  return toCalendarItemView(item);
}

export async function updateCalendarItem(
  itemId: number,
  input: CalendarItemInput,
) {
  const user = await syncCurrentUserToDatabase();
  const values = normalizeInput(input);

  const [item] = await db
    .update(calendarItems)
    .set({
      title: values.title,
      description: values.description,
      itemType: values.itemType,
      category: values.category,
      scheduledDate: values.scheduledDate,
      scheduledTime: values.scheduledTime,
      status: values.status,
      updatedAt: new Date(),
    })
    .where(and(eq(calendarItems.id, itemId), eq(calendarItems.userId, user.id)))
    .returning();

  if (!item) {
    throw new Error("Calendar item was not found.");
  }

  revalidatePath("/calendar");

  return toCalendarItemView(item);
}

export async function scheduleCalendarItem(
  itemId: number,
  scheduledDate: string,
) {
  const user = await syncCurrentUserToDatabase();
  assertDateValue(scheduledDate);

  const [item] = await db
    .update(calendarItems)
    .set({
      scheduledDate,
      status: "scheduled",
      updatedAt: new Date(),
    })
    .where(and(eq(calendarItems.id, itemId), eq(calendarItems.userId, user.id)))
    .returning();

  if (!item) {
    throw new Error("Calendar item was not found.");
  }

  revalidatePath("/calendar");

  return toCalendarItemView(item);
}
