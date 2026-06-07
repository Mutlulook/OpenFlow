import { redirect } from "next/navigation";
import {
  syncCurrentUserToDatabase,
  UnauthenticatedUserError,
} from "@/lib/auth/sync-user";

export default async function SyncUserPage() {
  try {
    await syncCurrentUserToDatabase();
  } catch (error) {
    if (error instanceof UnauthenticatedUserError) {
      redirect("/sign-in");
    }

    throw error;
  }

  redirect("/");
}
