import { writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { ensureUploadRootDir, uploadUrl } from "@/src/server/upload/storage";
import { extensionForMimeType } from "@/src/server/upload/validateImage";

export async function saveImageFile(file: File) {
  const bytes = Buffer.from(await file.arrayBuffer());
  const extension = extensionForMimeType(file.type);
  const filename = `${randomUUID()}.${extension}`;
  const uploadDir = await ensureUploadRootDir();
  await writeFile(path.join(uploadDir, filename), bytes);

  return {
    url: uploadUrl(filename),
    mimeType: file.type,
    size: file.size,
    originalName: file.name.replace(/[^\w.\-\u4e00-\u9fa5]/g, "_").slice(0, 120)
  };
}
