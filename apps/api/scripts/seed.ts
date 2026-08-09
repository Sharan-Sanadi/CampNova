import argon2 from "argon2";
import mongoose from "mongoose";

import {
  currentUser,
  getActivity,
  getBookings,
  getInsights,
  getNotifications,
  getResources,
} from "../../../src/data/campus.ts";
import { getResourceInsights, getResourceProfiles } from "../../../src/data/resources.ts";
import {
  getCampusOpportunities,
  getCampusPredictions,
  getCampusPulse,
  getCampusRecommendations,
  getCampusRisks,
  getCampusSignals,
} from "../../../src/data/intelligence.ts";
import { env } from "../src/config/env.js";
import { connectMongo, disconnectMongo } from "../src/db/mongoose.js";
import {
  ActivityEvent,
  Booking,
  Building,
  CampusInsight,
  CampusOpportunity,
  CampusPrediction,
  CampusRecommendation,
  CampusRisk,
  CampusSignal,
  Notification,
  PulsePoint,
  Resource,
  ResourceInsight,
  User,
} from "../src/db/models.js";
import { toMinutes } from "../src/modules/bookings/time.js";

const buildingCoordinates: Record<string, [number, number]> = {
  "Engineering Block": [77.5946, 12.9716],
  "Science Wing": [77.5964, 12.9724],
  "Central Block": [77.5937, 12.9711],
  Administration: [77.5929, 12.9707],
  "Humanities Block": [77.5919, 12.9721],
  "Sports Complex": [77.5988, 12.9698],
  "Innovation Hub": [77.5957, 12.9734],
};

function safeEmail(name: string): string {
  return `${name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ".")
    .replace(/^\.+|\.+$/g, "")}@northgate.edu`;
}

async function upsertDemoUser(name: string, department: string, passwordHash: string) {
  const email = name === currentUser.name ? currentUser.email : safeEmail(name);
  return User.findOneAndUpdate(
    { email },
    {
      $set: {
        email,
        name,
        department,
        role: name === currentUser.name ? "CAMPUS_ADMIN" : "FACULTY",
        passwordHash,
        avatarUrl: null,
      },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );
}

async function seed() {
  await connectMongo(env.MONGO_URI);
  const passwordHash = await argon2.hash(process.env.SEED_ADMIN_PASSWORD ?? "CampusOS!2026");
  const admin = await upsertDemoUser(currentUser.name, "Operations", passwordHash);

  const resources = getResources();
  const profiles = getResourceProfiles();
  const buildingNames = [...new Set(resources.map((resource) => resource.building))];
  const buildingByName = new Map<string, Awaited<ReturnType<typeof Building.findOneAndUpdate>>>();
  for (const name of buildingNames) {
    const floors = [...new Set(resources.filter((resource) => resource.building === name).map((resource) => resource.floor))].sort();
    const building = await Building.findOneAndUpdate(
      { name },
      { $set: { externalId: name.toLowerCase().replace(/[^a-z0-9]+/g, "-"), name, floors } },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );
    buildingByName.set(name, building);
  }

  for (const profile of profiles) {
    const base = resources.find((resource) => resource.id === profile.id)!;
    const building = buildingByName.get(base.building)!;
    await Resource.findOneAndUpdate(
      { externalId: profile.id },
      {
        $set: {
          ...profile,
          externalId: profile.id,
          buildingId: building._id,
          geo: {
            type: "Point",
            coordinates: buildingCoordinates[profile.building] ?? [77.5946, 12.9716],
          },
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );
  }

  const organiserByName = new Map<string, mongoose.Document>();
  for (const booking of getBookings()) {
    if (!organiserByName.has(booking.organiser)) {
      organiserByName.set(
        booking.organiser,
        await upsertDemoUser(booking.organiser, booking.department, passwordHash),
      );
    }
  }

  for (const booking of getBookings()) {
    const resource = await Resource.findOne({ externalId: booking.resourceId });
    if (!resource) continue;
    const organiser = organiserByName.get(booking.organiser) ?? admin;
    await Booking.findOneAndUpdate(
      { externalId: booking.id },
      {
        $set: {
          externalId: booking.id,
          title: booking.title,
          resourceRef: resource._id,
          resourceId: booking.resourceId,
          resourceName: booking.resourceName,
          organiserId: organiser._id,
          organiser: booking.organiser,
          department: booking.department,
          date: booking.date,
          start: booking.start,
          end: booking.end,
          startMinutes: toMinutes(booking.start),
          endMinutes: toMinutes(booking.end),
          attendees: booking.attendees,
          status: booking.status,
          riskLabel: booking.riskLabel,
          note: booking.note,
          purpose: booking.purpose,
          equipment: booking.equipment ?? [],
          conflictWith: booking.conflictWith ?? [],
          createdAt: booking.createdAt ? new Date(booking.createdAt) : new Date("2026-08-08T08:00:00.000Z"),
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );
  }

  for (const insight of getInsights()) {
    await CampusInsight.findOneAndUpdate(
      { externalId: insight.id },
      { $set: { ...insight, externalId: insight.id } },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );
  }

  for (const profile of profiles) {
    for (const insight of getResourceInsights(profile.id)) {
      await ResourceInsight.findOneAndUpdate(
        { externalId: insight.id },
        { $set: { ...insight, externalId: insight.id } },
        { upsert: true, new: true, setDefaultsOnInsert: true },
      );
    }
  }

  for (const event of getActivity()) {
    await ActivityEvent.findOneAndUpdate(
      { externalId: event.id },
      { $set: { ...event, externalId: event.id, createdAt: new Date("2026-08-09T08:00:00.000Z") } },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );
  }

  for (const item of getNotifications()) {
    await Notification.findOneAndUpdate(
      { externalId: item.id },
      { $set: { ...item, externalId: item.id, userId: null, createdAt: new Date("2026-08-09T08:00:00.000Z") } },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );
  }

  for (const signal of getCampusSignals()) {
    await CampusSignal.findOneAndUpdate(
      { externalId: signal.id },
      { $set: { ...signal, externalId: signal.id } },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );
  }
  for (const prediction of getCampusPredictions()) {
    await CampusPrediction.findOneAndUpdate(
      { externalId: prediction.id },
      { $set: { ...prediction, externalId: prediction.id } },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );
  }
  for (const risk of getCampusRisks()) {
    await CampusRisk.findOneAndUpdate(
      { externalId: risk.id },
      { $set: { ...risk, externalId: risk.id } },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );
  }
  for (const opportunity of getCampusOpportunities()) {
    await CampusOpportunity.findOneAndUpdate(
      { externalId: opportunity.id },
      { $set: { ...opportunity, externalId: opportunity.id } },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );
  }
  for (const recommendation of getCampusRecommendations()) {
    await CampusRecommendation.findOneAndUpdate(
      { externalId: recommendation.id },
      { $set: { ...recommendation, externalId: recommendation.id } },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );
  }
  for (const [index, point] of getCampusPulse().entries()) {
    await PulsePoint.findOneAndUpdate(
      { externalId: `pulse-${index}` },
      { $set: { ...point, externalId: `pulse-${index}` } },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );
  }

  console.log(`Seeded ${profiles.length} resources, ${getBookings().length} bookings, and admin ${currentUser.email}`);
}

seed()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await disconnectMongo();
  });
