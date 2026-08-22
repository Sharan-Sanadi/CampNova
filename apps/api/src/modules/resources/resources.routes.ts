import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { ResourceQuerySchema } from "@campus-os/shared-types";

import { notFound } from "../../shared/errors/AppError.js";
import { requireAuth } from "../../shared/middleware/auth.js";
import {
  createResource,
  findResourceAlternatives,
  getAvailability,
  getResourceProfile,
  listResourceProfiles,
  listResources,
  matchCampusResources,
  matchResources,
} from "./resource.service.js";

const createResourceSchema = z.object({
  name: z.string().min(1),
  type: z.string().min(1),
  building: z.string().min(1),
  floor: z.string().min(1),
  capacity: z.coerce.number().int().positive(),
  description: z.string().min(1),
  amenities: z.array(z.string()).optional(),
  equipment: z.array(z.string()).optional(),
});

export async function resourcesRoutes(app: FastifyInstance) {
  app.get("/resources", { preHandler: requireAuth, schema: { tags: ["Resources"] } }, async (request) =>
    listResources(request.user!.campusId),
  );

  app.post(
    "/resources",
    { preHandler: requireAuth, schema: { tags: ["Resources"], body: createResourceSchema } },
    async (request) => {
      const body = createResourceSchema.parse(request.body);
      return createResource(body as Parameters<typeof createResource>[0], request.user!);
    },
  );

  app.get(
    "/resources/profiles",
    { preHandler: requireAuth, schema: { tags: ["Resources"] } },
    async (request) => listResourceProfiles(request.user!.campusId),
  );

  app.get(
    "/resources/:id",
    { preHandler: requireAuth, schema: { tags: ["Resources"], params: z.object({ id: z.string() }) } },
    async (request) => {
      const { id } = z.object({ id: z.string() }).parse(request.params);
      const resource = await getResourceProfile(id, request.user!.campusId);
      if (!resource) throw notFound("Resource not found");
      return resource;
    },
  );

  app.get(
    "/resources/:id/availability",
    {
      preHandler: requireAuth,
      schema: {
        tags: ["Resources"],
        params: z.object({ id: z.string() }),
        querystring: z.object({ dayIndex: z.coerce.number().int().min(0).max(13).optional() }),
      },
    },
    async (request) => {
      const { id } = z.object({ id: z.string() }).parse(request.params);
      const { dayIndex } = z.object({ dayIndex: z.coerce.number().int().min(0).max(13).optional() }).parse(request.query);
      return getAvailability(id, dayIndex ?? 0, request.user!.campusId);
    },
  );

  app.post(
    "/resources/search",
    { preHandler: requireAuth, schema: { tags: ["Resources"], body: ResourceQuerySchema } },
    async (request) => matchCampusResources(request.user!.campusId, ResourceQuerySchema.parse(request.body)),
  );

  app.get(
    "/resources/:id/alternatives",
    {
      preHandler: requireAuth,
      schema: {
        tags: ["Resources"],
        params: z.object({ id: z.string() }),
        querystring: z.object({ limit: z.coerce.number().int().positive().max(10).optional() }),
      },
    },
    async (request) => {
      const { id } = z.object({ id: z.string() }).parse(request.params);
      const { limit } = z.object({ limit: z.coerce.number().int().positive().max(10).optional() }).parse(request.query);
      return findResourceAlternatives(id, limit ?? 3, request.user!.campusId);
    },
  );
}
