import { z } from "zod";
import { agentIds } from "@/src/ai/agents";
import { chatModelIds } from "@/src/ai/models";

export const imageSchema = z.object({
  type: z.literal("image").optional(),
  url: z.string().min(1).max(1024).refine((url) => url.startsWith("/uploads/") || url.startsWith("/api/uploads/") || url.startsWith("http://") || url.startsWith("https://"), {
    message: "图片 URL 不合法"
  }),
  mimeType: z.enum(["image/png", "image/jpeg", "image/webp"]),
  size: z.number().int().positive().max(5 * 1024 * 1024),
  width: z.number().int().positive().optional(),
  height: z.number().int().positive().optional(),
  alt: z.string().max(200).optional(),
  originalName: z.string().max(255).optional()
});

export const fileSchema = z.object({
  type: z.literal("file"),
  url: z.string().min(1).max(1024).refine((url) => url.startsWith("/uploads/") || url.startsWith("/api/uploads/"), {
    message: "附件 URL 不合法"
  }),
  mimeType: z.enum([
    "text/plain",
    "text/markdown",
    "text/csv",
    "application/json",
    "application/pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
  ]),
  size: z.number().int().positive().max(10 * 1024 * 1024),
  originalName: z.string().min(1).max(255),
  extractedText: z.string().min(1).max(32000),
  summary: z.string().max(800).optional()
});

export const attachmentSchema = z.discriminatedUnion("type", [
  imageSchema.extend({ type: z.literal("image") }),
  fileSchema
]);

export const chatRequestSchema = z
  .object({
    conversationId: z.string().min(1),
    modelId: z.enum(chatModelIds).optional(),
    agentId: z.enum(agentIds).optional(),
    enableThinking: z.boolean().optional(),
    text: z.string().max(8000).optional().default(""),
    images: z.array(attachmentSchema).max(6).optional().default([])
  })
  .refine((data) => data.text.trim().length > 0 || data.images.length > 0, {
    message: "请输入文本或上传图片"
  });

export const createConversationSchema = z.object({
  title: z.string().trim().min(1).max(80).optional().default("新会话")
});

export const conversationIdSchema = z.object({
  id: z.string().min(1)
});

export const MAX_UPLOAD_SIZE = 5 * 1024 * 1024;
export const ALLOWED_IMAGE_TYPES = ["image/png", "image/jpeg", "image/webp"] as const;

export function parseJsonBody<T>(schema: z.ZodType<T>, body: unknown): T {
  return schema.parse(body);
}
