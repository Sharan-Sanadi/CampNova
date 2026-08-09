import { getAuth } from "@clerk/fastify";
import type { FastifyReply, FastifyRequest } from "fastify";

import { forbidden, unauthorized } from "../errors/AppError.js";
import { resolveOrCreateProfile } from "../../modules/auth/auth.service.js";

export type AuthUser = {
  id: string;
  mongoId: string;
  clerkUserId: string;
  email: string;
  name: string;
  role: "STUDENT" | "FACULTY" | "DEPT_LEAD" | "CAMPUS_ADMIN";
  department: string;
  campusId: string;
};

export const roleRank: Record<AuthUser["role"], number> = {
  STUDENT: 1,
  FACULTY: 2,
  DEPT_LEAD: 3,
  CAMPUS_ADMIN: 4,
};

export async function requireAuth(request: FastifyRequest, _reply: FastifyReply) {
  const auth = getAuth(request);
  if (!auth.userId) throw unauthorized();

  (request as any).clerk = {
    userId: auth.userId,
    sessionId: auth.sessionId ?? null,
    organizationId: auth.orgId ?? null,
  };
  request.user = await resolveOrCreateProfile(auth.userId);
}

export function requireRole(...roles: AuthUser["role"][]) {
  const min = Math.min(...roles.map((role) => roleRank[role]));
  return async (request: FastifyRequest, reply: FastifyReply) => {
    await requireAuth(request, reply);
    if (!request.user || roleRank[request.user.role] < min) {
      throw forbidden();
    }
  };
}

export function requireAnyRole(...roles: AuthUser["role"][]) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    await requireAuth(request, reply);
    if (!request.user || !roles.includes(request.user.role)) {
      throw forbidden();
    }
  };
}

export function canManageBooking(user: AuthUser, organiserId: string): boolean {
  return user.mongoId === organiserId || roleRank[user.role] >= roleRank.DEPT_LEAD;
}
