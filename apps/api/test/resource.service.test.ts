import { describe, expect, it, vi } from "vitest";
import type { MatchReason, ResourceProfile, ResourceQuery } from "@campus-os/shared-types";

vi.mock("../src/db/models.js", () => ({
  Booking: {
    find: vi.fn().mockReturnThis(),
    sort: vi.fn().mockReturnThis(),
    lean: vi.fn().mockResolvedValue([]),
    countDocuments: vi.fn().mockResolvedValue(0),
  },
  Resource: {
    find: vi.fn().mockReturnThis(),
    findOne: vi.fn().mockReturnThis(),
    sort: vi.fn().mockReturnThis(),
    lean: vi.fn().mockResolvedValue([]),
    create: vi.fn(),
  },
}));

vi.mock("../src/config/env.js", () => ({
  env: {
    DATA_MODE: "live",
    CAMPUS_TIMEZONE: "UTC",
  },
  corsOrigins: [],
  isCorsAllowed: vi.fn().mockReturnValue(true),
}));

vi.mock("../src/modules/bookings/time.js", () => ({
  dateForDayLabel: vi.fn().mockReturnValue("2026-08-09"),
  dayLabelFor: vi.fn().mockReturnValue("Today"),
  fromMinutes: vi.fn().mockReturnValue("08:00"),
  toMinutes: vi.fn().mockReturnValue(480),
  overlapMinutes: vi.fn().mockReturnValue(0),
  shiftDate: vi.fn().mockReturnValue("2026-08-09"),
  TIMELINE_HOURS: [8, 10, 12, 14, 16, 18],
  BLOCKING_STATUSES: ["confirmed", "approved"],
}));

import { scoreResource } from "../src/modules/resources/resource.service.js";

const sampleProfile: ResourceProfile = {
  id: "res-test-1",
  name: "Innovation Lab A",
  type: "Innovation Space",
  building: "Tech Center",
  floor: "2",
  capacity: 30,
  amenities: ["Wi-Fi", "Air Conditioning"],
  equipment: ["4K Laser Projector", "Mobile Whiteboard"],
  status: "available",
  utilization: 45,
  nextBooking: null,
  trend: [10, 20, 30, 40, 50, 45, 45],
  description: "A collaborative lab equipped for workshops.",
  accessibility: {
    wheelchair: true,
    hearingLoop: false,
    stepFreeRoute: true,
    note: "Elevator access",
  },
  walkMinutes: 3,
  bookingPressure: "Low",
  conflictRate: 0.5,
  cancellationRate: 1.0,
  upcomingBookings: 2,
  maintenance: "Normal",
  maintenanceNote: null,
  healthScore: 98,
  trendDelta: 2,
  peakWindow: "14:00-16:00",
  lowWindow: "08:00-10:00",
  demandByDay: [],
  demandByPart: [],
  predictedDemand: {
    window: "14:00-16:00",
    level: "Low",
    note: "Normal demand",
  },
};

const baseQuery: ResourceQuery = {
  text: "",
  capacity: null,
  equipment: [],
  type: null,
  dayLabel: null,
  start: null,
  end: null,
  accessible: false,
};

describe("scoreResource equipment matching", () => {
  it("matches equipment with case-insensitivity ('projector' -> 'Projector')", async () => {
    const profile: ResourceProfile = {
      ...sampleProfile,
      equipment: ["Projector"],
    };
    const query: ResourceQuery = {
      ...baseQuery,
      equipment: ["projector"],
    };

    const baseResult = await scoreResource(profile, baseQuery);
    const result = await scoreResource(profile, query);

    const missingReason = result.reasons.find((r: MatchReason) => r.label === "Missing equipment");
    const matchedReason = result.reasons.find((r: MatchReason) => r.label === "All requested equipment present");

    expect(missingReason).toBeUndefined();
    expect(matchedReason).toBeDefined();
    expect(matchedReason?.met).toBe(true);
    expect(matchedReason?.detail).toBe("projector");
    expect(result.score).toBeGreaterThan(baseResult.score);
  });

  it("matches equipment with partial-name substring matching ('projector' -> '4K Laser Projector', 'whiteboard' -> 'Mobile Whiteboard')", async () => {
    const profile: ResourceProfile = {
      ...sampleProfile,
      equipment: ["4K Laser Projector", "Mobile Whiteboard"],
    };
    const query: ResourceQuery = {
      ...baseQuery,
      equipment: ["projector"],
    };

    const result = await scoreResource(profile, query);
    const missingReason = result.reasons.find((r: MatchReason) => r.label === "Missing equipment");
    const matchedReason = result.reasons.find((r: MatchReason) => r.label === "All requested equipment present");

    expect(missingReason).toBeUndefined();
    expect(matchedReason).toBeDefined();
    expect(matchedReason?.met).toBe(true);
    expect(matchedReason?.detail).toBe("projector");
  });

  it("matches multiple requested equipment items when all are present as substrings", async () => {
    const profile: ResourceProfile = {
      ...sampleProfile,
      equipment: ["4K Laser Projector", "Mobile Whiteboard"],
    };
    const query: ResourceQuery = {
      ...baseQuery,
      equipment: ["projector", "whiteboard"],
    };

    const result = await scoreResource(profile, query);
    const missingReason = result.reasons.find((r: MatchReason) => r.label === "Missing equipment");
    const matchedReason = result.reasons.find((r: MatchReason) => r.label === "All requested equipment present");

    expect(missingReason).toBeUndefined();
    expect(matchedReason).toBeDefined();
    expect(matchedReason?.met).toBe(true);
    expect(matchedReason?.detail).toBe("projector · whiteboard");
  });

  it("identifies genuinely missing equipment and applies penalty", async () => {
    const profile: ResourceProfile = {
      ...sampleProfile,
      equipment: ["4K Laser Projector"],
    };
    const query: ResourceQuery = {
      ...baseQuery,
      equipment: ["whiteboard", "microscope"],
    };

    const baseResult = await scoreResource(profile, baseQuery);
    const result = await scoreResource(profile, query);
    const missingReason = result.reasons.find((r: MatchReason) => r.label === "Missing equipment");

    expect(missingReason).toBeDefined();
    expect(missingReason?.met).toBe(false);
    expect(missingReason?.detail).toBe("whiteboard · microscope");
    // Missing 2 equipment items subtracts 2 * 12 = 24 points from base score
    expect(result.score).toBe(baseResult.score - 24);
  });

  it("does not introduce penalty or missing equipment reason when equipment query is empty", async () => {
    const emptyQuery: ResourceQuery = {
      ...baseQuery,
      equipment: [],
    };

    const result = await scoreResource(sampleProfile, emptyQuery);
    const equipmentReason = result.reasons.find(
      (r: MatchReason) => r.label === "Missing equipment" || r.label === "All requested equipment present",
    );

    expect(equipmentReason).toBeUndefined();
  });
});
