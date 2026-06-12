import { readFile, stat } from "node:fs/promises";
import { NextResponse } from "next/server";
import { apiError } from "@/src/shared/apiResponse";
import { resolveUploadPath } from "@/src/server/upload/storage";

export const runtime = "nodejs";

const mimeByExtension: Record<string, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  webp: "image/webp",
  pdf: "application/pdf",
  txt: "text/plain; charset=utf-8",
  md: "text/markdown; charset=utf-8",
  csv: "text/csv; charset=utf-8",
  json: "application/json",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
};

export async function GET(_request: Request, { params }: { params: Promise<{ filename: string }> }) {
  const { filename } = await params;
  const safeFilename = decodeURIComponent(filename);
  if (!/^[\w.-]+$/.test(safeFilename)) {
    return apiError("VALIDATION_ERROR", "文件名不合法", 400);
  }

  try {
    const filePath = resolveUploadPath(safeFilename);
    const [file, fileStat] = await Promise.all([readFile(filePath), stat(filePath)]);
    const extension = safeFilename.split(".").pop()?.toLowerCase() ?? "";
    return new NextResponse(file, {
      headers: {
        "Content-Type": mimeByExtension[extension] ?? "application/octet-stream",
        "Content-Length": String(fileStat.size),
        "Cache-Control": "private, max-age=31536000, immutable"
      }
    });
  } catch {
    return apiError("NOT_FOUND", "文件不存在", 404);
  }
}
