import type { FastifyPluginAsync } from "fastify";

let serverSettings = {
  campus: "NMIT Bengaluru",
  timezone: "Asia/Kolkata (GMT+5:30)",
  operatingHoursStart: "08:00",
  operatingHoursEnd: "20:00",
  aiAutonomyEnabled: false,
  conflictAlertsEnabled: true,
  dailyDigestEnabled: true,
  approvalRemindersEnabled: true,
  theme: "dark",
  compactDensity: false,
  twoFactorEnabled: true,
  activeSessionsCount: 2,
};

export const settingsRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get("/settings", async () => {
    return { data: serverSettings };
  });

  fastify.patch("/settings", async (request) => {
    const body = (request.body as Record<string, any>) || {};
    serverSettings = { ...serverSettings, ...body };
    return { data: serverSettings };
  });

  fastify.post("/settings/revoke-sessions", async () => {
    serverSettings.activeSessionsCount = 1;
    return { data: { activeSessionsCount: 1, message: "Secondary sessions revoked" } };
  });
};
