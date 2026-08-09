import { clerkClient } from "@clerk/fastify";

import { env } from "../../config/env.js";
import { User } from "../../db/models.js";
import type { AuthUser } from "../../shared/middleware/auth.js";

export type PublicUser = {
  id: string;
  clerkUserId: string;
  email: string;
  name: string;
  role: AuthUser["role"];
  department: string;
  campusId: string;
  avatarUrl: string | null;
};

export function toPublicUser(user: {
  _id: unknown;
  clerkUserId: string;
  email: string;
  name: string;
  role: string;
  department: string;
  campusId?: string;
  avatarUrl?: string | null;
}): PublicUser {
  return {
    id: String(user._id),
    clerkUserId: user.clerkUserId,
    email: user.email,
    name: user.name,
    role: user.role as AuthUser["role"],
    department: user.department,
    campusId: user.campusId ?? env.DEFAULT_CAMPUS_ID,
    avatarUrl: user.avatarUrl ?? null,
  };
}

export async function resolveOrCreateProfile(clerkUserId: string): Promise<AuthUser> {
  let user = await User.findOne({ clerkUserId });
  if (!user) {
    if (env.NODE_ENV === "test") {
      user = await User.create({
        clerkUserId,
        email: `${clerkUserId}@test.campusos.local`,
        name: "Test User",
        role: "CAMPUS_ADMIN",
        department: "Operations",
        campusId: env.DEFAULT_CAMPUS_ID,
        avatarUrl: null,
      });
    } else {
      const clerkUser = await clerkClient.users.getUser(clerkUserId);
      const email = clerkUser.emailAddresses.find((item) => item.id === clerkUser.primaryEmailAddressId)?.emailAddress;
      user = await User.create({
        clerkUserId,
        email: email ?? `${clerkUserId}@clerk.local`,
        name:
          [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(" ") ||
          clerkUser.username ||
          "CampusOS User",
        role: (clerkUser.publicMetadata.role as AuthUser["role"] | undefined) ?? "STUDENT",
        department: (clerkUser.publicMetadata.department as string | undefined) ?? "Unassigned",
        campusId: (clerkUser.publicMetadata.campusId as string | undefined) ?? env.DEFAULT_CAMPUS_ID,
        avatarUrl: clerkUser.imageUrl ?? null,
      });
    }
  }

  return {
    id: String(user._id),
    mongoId: String(user._id),
    clerkUserId: user.clerkUserId,
    email: user.email,
    name: user.name,
    role: user.role as AuthUser["role"],
    department: user.department,
    campusId: user.campusId ?? env.DEFAULT_CAMPUS_ID,
  };
}
