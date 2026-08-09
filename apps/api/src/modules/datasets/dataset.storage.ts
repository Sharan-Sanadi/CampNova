import { createHash, randomUUID } from "node:crypto";
import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";

import { env } from "../../config/env.js";
import type { DatasetFileType } from "./dataset.types.js";

export type StoredUpload = {
  objectKey: string;
  absolutePath: string;
  checksum: string;
  size: number;
};

export interface StorageProvider {
  put(buffer: Buffer, filename: string, fileType: DatasetFileType): Promise<StoredUpload>;
  get(objectKey: string): Promise<Buffer>;
  resolvePath(objectKey: string): string;
}

function sanitizeFilename(filename: string): string {
  const cleaned = filename
    .normalize("NFKD")
    .replace(/[^\w.\- ]+/g, "")
    .replace(/\s+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();
  return cleaned || "campus-dataset";
}

export class LocalStorageProvider implements StorageProvider {
  private readonly root = path.resolve(env.UPLOAD_DIR);

  async put(buffer: Buffer, filename: string, fileType: DatasetFileType): Promise<StoredUpload> {
    const now = new Date();
    const folder = path.join(
      String(now.getUTCFullYear()),
      String(now.getUTCMonth() + 1).padStart(2, "0"),
      String(now.getUTCDate()).padStart(2, "0"),
    );
    const safeName = sanitizeFilename(filename);
    const objectKey = path.join(folder, `${randomUUID()}-${safeName}`);
    const absolutePath = path.resolve(this.root, objectKey);
    if (!absolutePath.startsWith(this.root)) {
      throw new Error("Resolved upload path escaped the configured storage root");
    }
    await mkdir(path.dirname(absolutePath), { recursive: true });
    await writeFile(absolutePath, buffer);
    const checksum = createHash("sha256").update(buffer).digest("hex");
    const info = await stat(absolutePath);
    return {
      objectKey,
      absolutePath,
      checksum,
      size: info.size,
    };
  }

  async get(objectKey: string): Promise<Buffer> {
    return readFile(this.resolvePath(objectKey));
  }

  resolvePath(objectKey: string): string {
    const absolutePath = path.resolve(this.root, objectKey);
    if (!absolutePath.startsWith(this.root)) {
      throw new Error("Resolved upload path escaped the configured storage root");
    }
    return absolutePath;
  }
}

export function getStorageProvider(): StorageProvider {
  if (env.UPLOAD_STORAGE === "s3") {
    throw new Error("S3-compatible upload storage is not configured in this deployment");
  }
  return new LocalStorageProvider();
}
