import type { FastifyInstance } from "fastify";

import {
  CampusInsight,
  CampusOpportunity,
  CampusPrediction,
  CampusRecommendation,
  CampusRisk,
  CampusSignal,
  PulsePoint,
} from "../../db/models.js";
import { requireAuth } from "../../shared/middleware/auth.js";

function mapExternal<T extends { externalId?: string; _id?: unknown }>(doc: T) {
  const { _id, externalId, ...rest } = doc as T & Record<string, unknown>;
  return { id: externalId ?? String(_id ?? ""), ...rest };
}

const healthReport = {
  overall: 94,
  categories: [
    { label: "Operations", score: 96 },
    { label: "Resources", score: 91 },
    { label: "Scheduling", score: 94 },
    { label: "Demand", score: 88 },
  ],
};

const crossSystemChain = [
  { step: "Resource", value: "Computer Lab 04", source: "Resource Intelligence" },
  { step: "Booking", value: "14:00-16:00", source: "Booking Intelligence" },
  { step: "Demand", value: "High", source: "Demand signals" },
  { step: "Prediction", value: "Pressure increasing", source: "Campus Intelligence" },
  { step: "Recommendation", value: "Open Computer Lab 05", source: "CampusOS" },
];

export async function intelligenceRoutes(app: FastifyInstance) {
  app.get("/insights", { preHandler: requireAuth, schema: { tags: ["Dashboard"] } }, async () => {
    const docs = await CampusInsight.find().sort({ externalId: 1 }).lean();
    return docs.map(mapExternal);
  });

  app.get("/intelligence/signals", { preHandler: requireAuth, schema: { tags: ["Intelligence"] } }, async () => {
    const docs = await CampusSignal.find().sort({ externalId: 1 }).lean();
    return docs.map(mapExternal);
  });

  app.get("/intelligence/predictions", { preHandler: requireAuth, schema: { tags: ["Intelligence"] } }, async () => {
    const docs = await CampusPrediction.find().sort({ externalId: 1 }).lean();
    return docs.map(mapExternal);
  });

  app.get("/intelligence/risks", { preHandler: requireAuth, schema: { tags: ["Intelligence"] } }, async () => {
    const docs = await CampusRisk.find().sort({ externalId: 1 }).lean();
    return docs.map(mapExternal);
  });

  app.get("/intelligence/opportunities", { preHandler: requireAuth, schema: { tags: ["Intelligence"] } }, async () => {
    const docs = await CampusOpportunity.find().sort({ externalId: 1 }).lean();
    return docs.map(mapExternal);
  });

  app.get("/intelligence/recommendations", { preHandler: requireAuth, schema: { tags: ["Intelligence"] } }, async () => {
    const docs = await CampusRecommendation.find().sort({ externalId: 1 }).lean();
    return docs.map(mapExternal);
  });

  app.get("/intelligence/pulse", { preHandler: requireAuth, schema: { tags: ["Intelligence"] } }, async () => {
    const docs = await PulsePoint.find().sort({ externalId: 1 }).lean();
    return docs.map(mapExternal);
  });

  app.get("/intelligence/health-report", { preHandler: requireAuth, schema: { tags: ["Intelligence"] } }, async () => healthReport);
  app.get("/intelligence/cross-system-chain", { preHandler: requireAuth, schema: { tags: ["Intelligence"] } }, async () => crossSystemChain);
}
