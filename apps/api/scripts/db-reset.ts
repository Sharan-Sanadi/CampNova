import mongoose from "mongoose";

import { env } from "../src/config/env.js";
import { connectMongo, disconnectMongo } from "../src/db/mongoose.js";

await connectMongo(env.MONGO_URI);
await mongoose.connection.dropDatabase();
await disconnectMongo();
await import("./seed.js");
