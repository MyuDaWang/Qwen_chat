import { mkdir } from "node:fs/promises";
import path from "node:path";

const UPLOAD_URL_PREFIX = "/api/uploads";

export function uploadRootDir() {
  return path.resolve(process.env.QWEN_UPLOAD_DIR || path.join(process.cwd(), "data", "uploads"));
}

export async function ensureUploadRootDir() {
  const dir = uploadRootDir();
  await mkdir(dir, { recursive: true });
  return dir;
}

export function uploadUrl(filename: string) {
  return `${UPLOAD_URL_PREFIX}/${encodeURIComponent(filename)}`;
}

export function filenameFromUploadUrl(url: string) {
  if (url.startsWith("/uploads/")) {
    return decodeURIComponent(url.slice("/uploads/".length));
  }
  if (url.startsWith(`${UPLOAD_URL_PREFIX}/`)) {
    return decodeURIComponent(url.slice(`${UPLOAD_URL_PREFIX}/`.length));
  }
  return null;
}

export function resolveUploadPath(filename: string) {
  const root = uploadRootDir();
  const filePath = path.resolve(root, filename);
  if (filePath !== root && !filePath.startsWith(`${root}${path.sep}`)) {
    throw new Error("上传文件路径不合法。");
  }
  return filePath;
}

export function isLocalUploadUrl(url: string) {
  return url.startsWith("/uploads/") || url.startsWith(`${UPLOAD_URL_PREFIX}/`);
}
