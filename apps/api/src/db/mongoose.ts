import mongoose from "mongoose";

import { env } from "../config/env.js";
import { logger } from "../config/logger.js";

mongoose.set("strictQuery", true);
mongoose.set("toJSON", {
  virtuals: true,
  versionKey: false,
  transform(_doc, ret: Record<string, unknown>) {
    const id = typeof ret.externalId === "string" ? ret.externalId : String(ret._id ?? ret.id ?? "");
    delete ret._id;
    delete ret.__v;
    delete ret.externalId;
    ret.id = id;
    return ret;
  },
});
mongoose.set("toObject", {
  virtuals: true,
  versionKey: false,
  transform(_doc, ret: Record<string, unknown>) {
    const id = typeof ret.externalId === "string" ? ret.externalId : String(ret._id ?? ret.id ?? "");
    delete ret._id;
    delete ret.__v;
    delete ret.externalId;
    ret.id = id;
    return ret;
  },
});

export async function connectMongo(uri = env.MONGO_URI, retries = 3): Promise<typeof mongoose> {
  if (mongoose.connection.readyState === 1) return mongoose;
  let attempt = 0;
  while (attempt < retries) {
    try {
      attempt++;
      await mongoose.connect(uri, {
        autoIndex: env.NODE_ENV !== "production",
        family: 4,
        serverSelectionTimeoutMS: 10000,
      });
      logger.info({ db: mongoose.connection.name }, "mongo connected");
      return mongoose;
    } catch (err) {
      logger.warn({ err, attempt, retries }, "mongo connection attempt failed");
      if (attempt >= retries) throw err;
      await new Promise((res) => setTimeout(res, 2000));
    }
  }
  return mongoose;
}

export async function disconnectMongo(): Promise<void> {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
}

export async function isMongoReady(): Promise<boolean> {
  try {
    await mongoose.connection.db?.admin().ping();
    return mongoose.connection.readyState === 1;
  } catch {
    return false;
  }
}
