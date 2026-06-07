import { currentUser } from "@clerk/nextjs/server";
import { db, users } from "@/db";

export class UnauthenticatedUserError extends Error {
  constructor() {
    super("No authenticated Clerk user is available.");
    this.name = "UnauthenticatedUserError";
  }
}

export class MissingPrimaryEmailError extends Error {
  constructor() {
    super(
      "The authenticated Clerk user does not have a primary email address.",
    );
    this.name = "MissingPrimaryEmailError";
  }
}

export async function syncCurrentUserToDatabase() {
  const clerkUser = await currentUser();

  if (!clerkUser) {
    throw new UnauthenticatedUserError();
  }

  const email = clerkUser.primaryEmailAddress?.emailAddress;

  if (!email) {
    throw new MissingPrimaryEmailError();
  }

  const now = new Date();
  const name =
    clerkUser.fullName ||
    [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(" ") ||
    null;

  const [user] = await db
    .insert(users)
    .values({
      clerkUserId: clerkUser.id,
      email,
      name,
      firstName: clerkUser.firstName,
      lastName: clerkUser.lastName,
      imageUrl: clerkUser.imageUrl,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: users.clerkUserId,
      set: {
        email,
        name,
        firstName: clerkUser.firstName,
        lastName: clerkUser.lastName,
        imageUrl: clerkUser.imageUrl,
        updatedAt: now,
      },
    })
    .returning();

  return user;
}
