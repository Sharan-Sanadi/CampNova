import type { FastifyInstance } from "fastify";
import client from "prom-client";

export const registry = new client.Registry();
client.collectDefaultMetrics({ register: registry, prefix: "campusos_" });

export const httpDuration = new client.Histogram({
  name: "campusos_http_request_duration_seconds",
  help: "HTTP request duration by route",
  labelNames: ["method", "route", "status_code"],
  buckets: [0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2, 5],
});
export const bookingEngineConflicts = new client.Counter({
  name: "campusos_booking_conflicts_total",
  help: "Booking conflicts detected by the booking engine",
});
export const bookingEngineCreated = new client.Counter({
  name: "campusos_bookings_created_total",
  help: "Bookings created successfully",
});

registry.registerMetric(httpDuration);
registry.registerMetric(bookingEngineConflicts);
registry.registerMetric(bookingEngineCreated);

export function registerMetrics(app: FastifyInstance) {
  app.addHook("onRequest", async (request) => {
    request.startTime = process.hrtime.bigint();
  });

  app.addHook("onResponse", async (request, reply) => {
    const started = request.startTime;
    if (!started) return;
    const seconds = Number(process.hrtime.bigint() - started) / 1_000_000_000;
    httpDuration
      .labels(request.method, request.routeOptions.url ?? request.url, String(reply.statusCode))
      .observe(seconds);
  });

  app.get("/metrics", async (_request, reply) => {
    reply.header("content-type", registry.contentType);
    return registry.metrics();
  });
}

declare module "fastify" {
  interface FastifyRequest {
    startTime?: bigint;
  }
}
