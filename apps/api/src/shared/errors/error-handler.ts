import type { FastifyError, FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { ZodError } from "zod";

import { AppError, sendError } from "./AppError.js";

export function registerErrorHandler(app: FastifyInstance) {
  app.setErrorHandler(
    async (error: FastifyError | Error, _request: FastifyRequest, reply: FastifyReply) => {
      if (error instanceof AppError) {
        return sendError(reply, error);
      }

      if (error instanceof ZodError) {
        return sendError(
          reply,
          new AppError(400, "VALIDATION_ERROR", "Request validation failed", error.flatten()),
        );
      }

      if ("validation" in error && error.validation) {
        return sendError(
          reply,
          new AppError(400, "VALIDATION_ERROR", "Request validation failed", error.validation),
        );
      }

      if ("statusCode" in error && error.statusCode === 429) {
        return sendError(reply, new AppError(429, "RATE_LIMITED", "Rate limit exceeded"));
      }

      app.log.error({ err: error }, "unhandled request error");
      return sendError(reply, new AppError(500, "INTERNAL_ERROR", "Internal server error"));
    },
  );

  app.setNotFoundHandler(async (_request, reply) => {
    return sendError(reply, new AppError(404, "NOT_FOUND", "Route not found"));
  });
}
