import { writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { extensionForAttachment, extractAttachmentText, safeOriginalName } from "@/src/server/upload/parseAttachment";
import { ensureUploadRootDir, uploadUrl } from "@/src/server/upload/storage";

export async function saveAttachmentFile(file: File) {
  const bytes = Buffer.from(await file.arrayBuffer());
  const extension = extensionForAttachment(file);
  const filename = `${randomUUID()}.${extension}`;
  const uploadDir = await ensureUploadRootDir();
  await writeFile(path.join(uploadDir, filename), bytes);

  const parsed = await extractAttachmentText(file, bytes);

  return {
    url: uploadUrl(filename),
    mimeType: file.type,
    size: file.size,
    originalName: safeOriginalName(file.name),
    ...parsed
  };
}
