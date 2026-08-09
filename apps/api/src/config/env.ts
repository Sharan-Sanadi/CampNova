import "dotenv/config";

import { z } from "zod";

const envSchema = z
  .object({
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
    HOST: z.string().default("0.0.0.0"),
    PORT: z.coerce.number().int().positive().default(4000),
    MONGO_URI: z.string().min(1).default("mongodb://localhost:27017/campusos?replicaSet=rs0"),
    REDIS_URL: z.string().min(1).default("redis://localhost:6379"),
    MEILI_HOST: z.string().url().default("http://localhost:7700"),
    MEILI_MASTER_KEY: z.string().default("campusos-dev-meili-key"),
    COOKIE_SECRET: z.string().min(16).default("campusos-cookie-secret"),
    CLERK_SECRET_KEY: z.string().optional(),
    CLERK_PUBLISHABLE_KEY: z.string().optional(),
    CLERK_JWT_KEY: z.string().optional(),
    CLERK_SIGN_IN_URL: z.string().default("/login"),
    CLERK_SIGN_UP_URL: z.string().default("/login"),
    CORS_ORIGINS: z.string().default("http://localhost:8080,http://localhost:3000"),
    CAMPUS_TIMEZONE: z.string().default("Asia/Kolkata"),
    DEFAULT_CAMPUS_ID: z.string().default("demo-campus"),
    DEFAULT_CAMPUS_NAME: z.string().default("Demo Campus"),
    DATA_MODE: z.enum(["production", "demo"]).default("production"),
    SEED_DEMO_DATA: z.coerce.boolean().default(false),
    UPLOAD_STORAGE: z.enum(["local", "s3"]).default("local"),
    UPLOAD_DIR: z.string().default("./storage/uploads"),
    MAX_UPLOAD_MB: z.coerce.number().int().positive().max(100).default(20),
    IMPORT_BATCH_SIZE: z.coerce.number().int().positive().default(500),
    DATASET_RETENTION_DAYS: z.coerce.number().int().positive().default(30),
    ENABLE_XLSX_IMPORT: z.coerce.boolean().default(false),
    COPILOT_PROVIDER: z.enum(["ollama", "anthropic", "groq"]).default("ollama"),
    OLLAMA_BASE_URL: z.string().url().default("http://localhost:11434"),
    OLLAMA_MODEL: z.string().default("llama3.1:8b"),
    ANTHROPIC_API_KEY: z.string().optional(),
    ANTHROPIC_MODEL: z.string().default("claude-sonnet-4-6"),
    SEED_ADMIN_CLERK_USER_ID: z.string().optional(),
    LOG_LEVEL: z.string().default("info"),
    BCRYPT_COMPAT: z.coerce.boolean().default(false),
  })
  .superRefine((env, ctx) => {
    if (env.NODE_ENV !== "test" && !env.CLERK_SECRET_KEY) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["CLERK_SECRET_KEY"],
        message: "CLERK_SECRET_KEY is required outside test mode",
      });
    }
    if (env.COPILOT_PROVIDER === "anthropic" && !env.ANTHROPIC_API_KEY) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["ANTHROPIC_API_KEY"],
        message: "ANTHROPIC_API_KEY is required when COPILOT_PROVIDER=anthropic",
      });
    }
  });

export type AppEnv = z.infer<typeof envSchema>;

export const env = envSchema.parse(process.env);

export const corsOrigins = env.CORS_ORIGINS.split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);
