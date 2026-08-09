import type { FastifyInstance } from "fastify";
import { Server } from "socket.io";
import { createAdapter } from "@socket.io/redis-adapter";
import { verifyToken } from "@clerk/backend";

import { corsOrigins, env } from "../../config/env.js";
import { getRedis } from "../../db/redis.js";
import { setRealtimeServer } from "./realtime.service.js";

export async function registerRealtime(app: FastifyInstance) {
  const io = new Server(app.server, {
    path: "/socket.io",
    cors: { origin: corsOrigins, credentials: true },
  });
  const pubClient = getRedis();
  const subClient = pubClient.duplicate();
  io.adapter(createAdapter(pubClient, subClient));

  const namespace = io.of("/realtime");
  namespace.use((socket, next) => {
    const token = socket.handshake.auth.token;
    if (!token || typeof token !== "string") return next(new Error("UNAUTHORIZED"));
    verifyToken(token, { secretKey: env.CLERK_SECRET_KEY, jwtKey: env.CLERK_JWT_KEY })
      .then((payload) => {
        socket.data.userId = payload.sub;
        socket.data.role = (payload.metadata as { role?: string } | undefined)?.role ?? "STUDENT";
        return next();
      })
      .catch(() => next(new Error("UNAUTHORIZED")));
  });
  namespace.on("connection", (socket) => {
    socket.join("campus");
    socket.join(`user:${socket.data.userId}`);
    socket.join(`role:${socket.data.role}`);
  });
  setRealtimeServer(io);
}
