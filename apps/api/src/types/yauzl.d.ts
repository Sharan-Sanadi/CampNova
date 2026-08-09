declare module "yauzl" {
  import type { Readable } from "node:stream";

  export type Entry = {
    fileName: string;
  };

  export type ZipFile = {
    readEntry(): void;
    close(): void;
    openReadStream(entry: Entry, callback: (error: Error | null, stream: Readable) => void): void;
    on(event: "entry", listener: (entry: Entry) => void): void;
    on(event: "end" | "close", listener: () => void): void;
    on(event: "error", listener: (error: Error) => void): void;
  };

  export function open(
    path: string,
    options: { lazyEntries: true },
    callback: (error: Error | null, zipFile: ZipFile) => void,
  ): void;
}
