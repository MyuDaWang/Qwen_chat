import { NextResponse } from "next/server";
import { apiError } from "@/src/shared/apiResponse";
import { saveAttachmentFile } from "@/src/server/upload/saveAttachment";
import { saveImageFile } from "@/src/server/upload/saveImage";
import { validateAttachmentFile } from "@/src/server/upload/parseAttachment";
import { validateImageFile } from "@/src/server/upload/validateImage";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const formData = await request.formData().catch(() => null);
  const file = formData?.get("file");
  if (!(file instanceof File)) {
    return apiError("VALIDATION_ERROR", "请上传文件", 400);
  }

  const imageValidation = validateImageFile(file);
  if (imageValidation.ok) {
    const saved = await saveImageFile(file);
    return NextResponse.json({ file: { type: "image", ...saved } });
  }

  const attachmentValidation = validateAttachmentFile(file);
  if (!attachmentValidation.ok) {
    return apiError(attachmentValidation.code, attachmentValidation.message, attachmentValidation.code === "UPLOAD_TOO_LARGE" ? 413 : 415);
  }

  try {
    const saved = await saveAttachmentFile(file);
    return NextResponse.json({ file: { type: "file", ...saved } });
  } catch (error) {
    return apiError("VALIDATION_ERROR", error instanceof Error ? error.message : "附件解析失败", 400);
  }
}
