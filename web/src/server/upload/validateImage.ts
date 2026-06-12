import { ALLOWED_IMAGE_TYPES, MAX_UPLOAD_SIZE } from "@/src/shared/validation";

export function validateImageFile(file: File) {
  if (!ALLOWED_IMAGE_TYPES.includes(file.type as (typeof ALLOWED_IMAGE_TYPES)[number])) {
    return { ok: false as const, code: "UNSUPPORTED_FILE_TYPE" as const, message: "仅支持 PNG、JPEG、WEBP 图片。" };
  }
  if (file.size > MAX_UPLOAD_SIZE) {
    return { ok: false as const, code: "UPLOAD_TOO_LARGE" as const, message: "图片不能超过 5MB。" };
  }
  return { ok: true as const };
}

export function extensionForMimeType(mimeType: string) {
  if (mimeType === "image/png") return "png";
  if (mimeType === "image/webp") return "webp";
  return "jpg";
}
