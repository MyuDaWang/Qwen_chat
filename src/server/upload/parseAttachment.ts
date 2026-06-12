import path from "node:path";
import { createRequire } from "node:module";
import readXlsxFile from "read-excel-file/node";

const require = createRequire(import.meta.url);

export const MAX_ATTACHMENT_SIZE = 10 * 1024 * 1024;
export const MAX_EXTRACTED_TEXT = 30000;

export const ALLOWED_ATTACHMENT_TYPES = [
  "text/plain",
  "text/markdown",
  "text/csv",
  "application/json",
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
] as const;

export function safeOriginalName(name: string) {
  return name.replace(/[^\w.\-\u4e00-\u9fa5]/g, "_").slice(0, 160) || "attachment";
}

export function extensionForAttachment(file: File) {
  const extension = path.extname(file.name).replace(".", "").toLowerCase();
  if (extension) return extension;
  if (file.type === "application/pdf") return "pdf";
  if (file.type.includes("wordprocessingml")) return "docx";
  if (file.type.includes("spreadsheetml")) return "xlsx";
  if (file.type === "application/json") return "json";
  if (file.type === "text/csv") return "csv";
  if (file.type === "text/markdown") return "md";
  return "txt";
}

export function validateAttachmentFile(file: File) {
  if (!ALLOWED_ATTACHMENT_TYPES.includes(file.type as (typeof ALLOWED_ATTACHMENT_TYPES)[number])) {
    return { ok: false as const, code: "UNSUPPORTED_FILE_TYPE" as const, message: "仅支持 PDF、DOCX、XLSX、TXT、MD、CSV、JSON 附件。" };
  }
  if (file.size > MAX_ATTACHMENT_SIZE) {
    return { ok: false as const, code: "UPLOAD_TOO_LARGE" as const, message: "附件不能超过 10MB。" };
  }
  return { ok: true as const };
}

function clampText(text: string) {
  const normalized = text.replace(/\u0000/g, "").replace(/[ \t]+\n/g, "\n").trim();
  if (normalized.length <= MAX_EXTRACTED_TEXT) return normalized;
  return `${normalized.slice(0, MAX_EXTRACTED_TEXT)}\n\n[内容过长，已截取前 ${MAX_EXTRACTED_TEXT} 字符]`;
}

function summarize(text: string) {
  const lines = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  return lines.slice(0, 5).join("\n").slice(0, 500);
}

async function parsePdf(buffer: Buffer) {
  const pdfParse = require("pdf-parse/lib/pdf-parse.js") as (data: Buffer) => Promise<{ text?: string }>;
  const result = await pdfParse(buffer);
  return result.text || "";
}

async function parseDocx(buffer: Buffer) {
  const mammoth = await import("mammoth");
  const result = await mammoth.extractRawText({ buffer });
  return result.value || "";
}

async function parseXlsx(buffer: Buffer) {
  const sheets = await readXlsxFile(buffer);
  const rows = sheets.flatMap((sheet) => sheet.data);
  return rows
    .slice(0, 300)
    .map((row) => row.map((cell: unknown) => (cell == null ? "" : String(cell))).join(","))
    .join("\n");
}

export async function extractAttachmentText(file: File, buffer: Buffer) {
  let text = "";
  if (file.type === "application/pdf") {
    text = await parsePdf(buffer);
  } else if (file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") {
    text = await parseDocx(buffer);
  } else if (file.type === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet") {
    text = await parseXlsx(buffer);
  } else {
    text = buffer.toString("utf8");
  }

  const extractedText = clampText(text);
  if (!extractedText) {
    throw new Error("未能从附件中解析出文本内容。");
  }

  return {
    extractedText,
    summary: summarize(extractedText)
  };
}
