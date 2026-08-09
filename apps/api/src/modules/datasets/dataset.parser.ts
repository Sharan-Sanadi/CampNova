import { once } from "node:events";
import { Readable } from "node:stream";

import * as yauzl from "yauzl";

import type { DatasetFileType, ParsedDataset, RawRecord } from "./dataset.types.js";

function stripBom(value: string): string {
  return value.charCodeAt(0) === 0xfeff ? value.slice(1) : value;
}

function decodeXml(value: string): string {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#x([0-9a-f]+);/gi, (_, hex: string) => String.fromCodePoint(Number.parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, code: string) => String.fromCodePoint(Number.parseInt(code, 10)));
}

function nonEmptyRows(rows: string[][]): string[][] {
  return rows.filter((row) => row.some((cell) => cell.trim().length > 0));
}

export function parseCsv(text: string): RawRecord[] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let inQuotes = false;
  const input = stripBom(text.replace(/\r\n/g, "\n").replace(/\r/g, "\n"));

  for (let i = 0; i < input.length; i += 1) {
    const char = input[i]!;
    const next = input[i + 1];
    if (inQuotes) {
      if (char === '"' && next === '"') {
        cell += '"';
        i += 1;
      } else if (char === '"') {
        inQuotes = false;
      } else {
        cell += char;
      }
      continue;
    }

    if (char === '"') {
      inQuotes = true;
    } else if (char === ",") {
      row.push(cell);
      cell = "";
    } else if (char === "\n") {
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else {
      cell += char;
    }
  }
  row.push(cell);
  rows.push(row);

  const usefulRows = nonEmptyRows(rows);
  if (usefulRows.length === 0) return [];
  const headers = usefulRows[0]!.map((header, index) => header.trim() || `Column ${index + 1}`);
  return usefulRows.slice(1).map((cells, index) => {
    const values: Record<string, string> = {};
    for (let i = 0; i < Math.max(headers.length, cells.length); i += 1) {
      const key = headers[i] ?? `Extra Column ${i + 1}`;
      values[key] = (cells[i] ?? "").trim();
    }
    return { rowNumber: index + 2, values };
  });
}

function rowsToRecords(rows: string[][], rowOffset = 1): RawRecord[] {
  const usefulRows = nonEmptyRows(rows);
  if (usefulRows.length < 2) return [];
  const headers = usefulRows[0]!.map((header, index) => header.trim() || `Column ${index + 1}`);
  return usefulRows.slice(1).map((cells, index) => {
    const values: Record<string, string> = {};
    for (let i = 0; i < Math.max(headers.length, cells.length); i += 1) {
      const key = headers[i] ?? `Extra Column ${i + 1}`;
      values[key] = (cells[i] ?? "").trim();
    }
    return { rowNumber: index + rowOffset + 1, values };
  });
}

function parseDelimitedLines(text: string): RawRecord[] {
  const lines = text
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean);
  const tableLines = lines.filter((line) => /[|\t,]/.test(line) || /\S\s{2,}\S/.test(line));
  const rows = tableLines.map((line) => {
    if (line.includes("|")) return line.split("|").map((cell) => cell.trim()).filter(Boolean);
    if (line.includes("\t")) return line.split("\t").map((cell) => cell.trim());
    if (line.includes(",")) return line.split(",").map((cell) => cell.trim());
    return line.split(/\s{2,}/).map((cell) => cell.trim());
  });
  return rowsToRecords(rows);
}

function decodePdfLiteral(input: string): string {
  return input
    .replace(/\\n/g, "\n")
    .replace(/\\r/g, "\r")
    .replace(/\\t/g, "\t")
    .replace(/\\\(/g, "(")
    .replace(/\\\)/g, ")")
    .replace(/\\\\/g, "\\");
}

function extractPdfText(buffer: Buffer): string {
  const body = buffer.toString("latin1");
  const literals = [...body.matchAll(/\((?:\\.|[^\\)])*\)/g)]
    .map((match) => decodePdfLiteral(match[0].slice(1, -1)))
    .filter((value) => /[A-Za-z]{2}/.test(value));
  return literals.join("\n").replace(/[^\S\n]+/g, " ").trim();
}

async function readZipEntry(filePath: string, wantedEntry: string): Promise<Buffer | undefined> {
  return new Promise((resolve, reject) => {
    yauzl.open(filePath, { lazyEntries: true }, (openError, zipFile) => {
      if (openError) {
        reject(openError);
        return;
      }
      let settled = false;
      const finish = (value: Buffer | undefined) => {
        if (settled) return;
        settled = true;
        zipFile.close();
        resolve(value);
      };
      zipFile.on("entry", (entry) => {
        if (entry.fileName !== wantedEntry) {
          zipFile.readEntry();
          return;
        }
        zipFile.openReadStream(entry, async (streamError, stream) => {
          if (streamError) {
            reject(streamError);
            return;
          }
          const chunks: Buffer[] = [];
          stream.on("data", (chunk: Buffer) => chunks.push(chunk));
          await once(stream, "end");
          finish(Buffer.concat(chunks));
        });
      });
      zipFile.on("end", () => finish(undefined));
      zipFile.on("error", reject);
      zipFile.readEntry();
    });
  });
}

function textFromWordXml(xml: string): string {
  return [...xml.matchAll(/<w:t[^>]*>([\s\S]*?)<\/w:t>/g)]
    .map((match) => decodeXml(match[1] ?? ""))
    .join("");
}

function parseDocxTables(xml: string): RawRecord[] {
  const records: RawRecord[] = [];
  for (const table of xml.matchAll(/<w:tbl[\s\S]*?<\/w:tbl>/g)) {
    const rows = [...table[0].matchAll(/<w:tr[\s\S]*?<\/w:tr>/g)].map((row) =>
      [...row[0].matchAll(/<w:tc[\s\S]*?<\/w:tc>/g)].map((cell) => textFromWordXml(cell[0]).trim()),
    );
    records.push(...rowsToRecords(rows, records.length + 1));
  }
  return records;
}

function columnNumber(column: string): number {
  return column.split("").reduce((sum, char) => sum * 26 + char.charCodeAt(0) - 64, 0) - 1;
}

function parseSharedStrings(xml: string): string[] {
  return [...xml.matchAll(/<si[\s\S]*?<\/si>/g)].map((item) =>
    [...item[0].matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)]
      .map((match) => decodeXml(match[1] ?? ""))
      .join("")
      .trim(),
  );
}

function parseXlsxSheet(sheetXml: string, sharedStrings: string[]): RawRecord[] {
  const rows = [...sheetXml.matchAll(/<row[^>]*>([\s\S]*?)<\/row>/g)].map((rowMatch) => {
    const row: string[] = [];
    for (const cellMatch of rowMatch[1]!.matchAll(/<c[^>]*r="([A-Z]+)\d+"([^>]*)>([\s\S]*?)<\/c>/g)) {
      const index = columnNumber(cellMatch[1]!);
      const attrs = cellMatch[2] ?? "";
      const rawValue = cellMatch[3]?.match(/<v>([\s\S]*?)<\/v>/)?.[1] ?? "";
      const value = attrs.includes('t="s"') ? sharedStrings[Number(rawValue)] ?? "" : decodeXml(rawValue);
      row[index] = value.trim();
    }
    return row;
  });
  return rowsToRecords(rows);
}

export async function parseDatasetFile(
  filePath: string,
  buffer: Buffer,
  fileType: DatasetFileType,
): Promise<ParsedDataset> {
  if (fileType === "csv") {
    return { parser: "csv:quoted-v1", rawRecords: parseCsv(buffer.toString("utf8")), warnings: [] };
  }

  if (fileType === "pdf") {
    const text = extractPdfText(buffer);
    if (!text) {
      throw new Error("Scanned PDF requires OCR processing.");
    }
    const rawRecords = parseDelimitedLines(text);
    return {
      parser: "pdf:text-literal-v1",
      rawRecords,
      warnings: rawRecords.length ? [] : ["PDF text was extracted, but no table-like campus records were detected."],
    };
  }

  if (fileType === "docx") {
    const documentXml = await readZipEntry(filePath, "word/document.xml");
    if (!documentXml) throw new Error("DOCX document.xml could not be read.");
    const xml = documentXml.toString("utf8");
    const tableRecords = parseDocxTables(xml);
    return {
      parser: "docx:table-xml-v1",
      rawRecords: tableRecords.length ? tableRecords : parseDelimitedLines(textFromWordXml(xml)),
      warnings: tableRecords.length ? [] : ["DOCX contained no tables; paragraph text was inspected instead."],
    };
  }

  const [sheetXml, stringsXml] = await Promise.all([
    readZipEntry(filePath, "xl/worksheets/sheet1.xml"),
    readZipEntry(filePath, "xl/sharedStrings.xml"),
  ]);
  if (!sheetXml) throw new Error("XLSX worksheet xl/worksheets/sheet1.xml could not be read.");
  return {
    parser: "xlsx:sheet1-xml-v1",
    rawRecords: parseXlsxSheet(sheetXml.toString("utf8"), stringsXml ? parseSharedStrings(stringsXml.toString("utf8")) : []),
    warnings: ["Only the first XLSX worksheet was imported."],
  };
}

export function streamToBuffer(stream: Readable): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    stream.on("data", (chunk: Buffer) => chunks.push(chunk));
    stream.on("end", () => resolve(Buffer.concat(chunks)));
    stream.on("error", reject);
  });
}
