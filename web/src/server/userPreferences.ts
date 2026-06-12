import { z } from "zod";
import type { UserMemory, UserPreference } from "@prisma/client";
import { prisma } from "@/src/server/db";
import type { UserMemoryDTO, UserPreferenceDTO } from "@/src/shared/types";

export const preferenceSchema = z.object({
  theme: z.enum(["light", "dark"]).default("light"),
  language: z.enum(["auto", "zh-CN", "en-US"]).default("auto"),
  tone: z.enum(["default", "concise", "professional", "friendly"]).default("default"),
  warmth: z.enum(["default", "calm", "warm", "direct"]).default("default"),
  enthusiasm: z.enum(["default", "low", "medium", "high"]).default("default"),
  titleStyle: z.enum(["default", "short", "structured"]).default("default"),
  emojiStyle: z.enum(["default", "none", "minimal"]).default("default"),
  quickAnswer: z.boolean().default(true),
  customInstructions: z.string().max(1200).optional().nullable(),
  nickname: z.string().max(80).optional().nullable(),
  occupation: z.string().max(120).optional().nullable(),
  details: z.string().max(1200).optional().nullable(),
  memoryEnabled: z.boolean().default(true)
});

export const updatePreferenceSchema = preferenceSchema.partial();

const storedPreferenceSchema = preferenceSchema.extend({
  theme: z.enum(["system", "light", "dark"]).default("light")
});

export const memoryCreateSchema = z.object({
  content: z.string().trim().min(1).max(500)
});

export const memoryPatchSchema = z.object({
  content: z.string().trim().min(1).max(500).optional(),
  enabled: z.boolean().optional()
});

function serializePreference(row: UserPreference): UserPreferenceDTO {
  const preference = storedPreferenceSchema.parse(row);
  return {
    ...preference,
    theme: preference.theme === "system" ? "light" : preference.theme,
    userId: row.userId,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString()
  };
}

function serializeMemory(row: UserMemory): UserMemoryDTO {
  return {
    ...row,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString()
  };
}

export async function getPreference(userId: string) {
  const row = await prisma.userPreference.upsert({
    where: { userId },
    create: { userId },
    update: {}
  });
  return serializePreference(row);
}

export async function updatePreference(userId: string, input: z.infer<typeof updatePreferenceSchema>) {
  const data = updatePreferenceSchema.parse(input);
  const row = await prisma.userPreference.upsert({
    where: { userId },
    create: { userId, ...data },
    update: data
  });
  return serializePreference(row);
}

export async function listMemories(userId: string) {
  const rows = await prisma.userMemory.findMany({
    where: { userId },
    orderBy: { updatedAt: "desc" },
    take: 80
  });
  return rows.map(serializeMemory);
}

export async function listEnabledMemories(userId: string, take = 12) {
  const rows = await prisma.userMemory.findMany({
    where: { userId, enabled: true },
    orderBy: { updatedAt: "desc" },
    take
  });
  return rows.map(serializeMemory);
}

export async function createMemory(userId: string, content: string, source = "manual") {
  const row = await prisma.userMemory.create({
    data: {
      id: crypto.randomUUID(),
      userId,
      content: content.trim(),
      source
    }
  });
  return serializeMemory(row);
}

export async function updateMemory(userId: string, id: string, input: z.infer<typeof memoryPatchSchema>) {
  const data = memoryPatchSchema.parse(input);
  if (Object.keys(data).length === 0) return null;

  const updated = await prisma.userMemory.updateMany({
    where: { id, userId },
    data
  });
  if (updated.count === 0) return null;

  const row = await prisma.userMemory.findFirst({ where: { id, userId } });
  return row ? serializeMemory(row) : null;
}

export async function deleteMemory(userId: string, id: string) {
  await prisma.userMemory.deleteMany({ where: { id, userId } });
}

function extractExplicitMemory(text: string) {
  const normalized = text.replace(/\s+/g, " ").trim();
  const patterns = [/请记住[:：]?\s*(.+)$/u, /记住[:：]?\s*(.+)$/u, /以后叫我[:：]?\s*(.+)$/u, /我的偏好是[:：]?\s*(.+)$/u];
  for (const pattern of patterns) {
    const match = normalized.match(pattern);
    if (match?.[1]) return match[1].slice(0, 500);
  }
  return null;
}

export async function maybeRememberFromUserText(userId: string, text: string) {
  const preference = await getPreference(userId);
  if (!preference.memoryEnabled) return null;
  const memory = extractExplicitMemory(text);
  if (!memory) return null;
  return createMemory(userId, memory, "chat");
}

const languageInstructions: Record<UserPreferenceDTO["language"], string> = {
  auto: "- 回复语言：跟随用户本轮输入语言；如果用户没有明确语言，默认使用简体中文。",
  "zh-CN": "- 回复语言：使用简体中文。",
  "en-US": "- Response language hard rule: reply in English even when the user writes in Chinese. Switch away from English only when the user explicitly requests another language."
};

const toneInstructions: Record<Exclude<UserPreferenceDTO["tone"], "default">, string> = {
  concise: "- 回复风格：先给结论，减少铺垫，保留必要依据。",
  professional: "- 回复风格：专业严谨，明确前提、风险和可执行步骤。",
  friendly: "- 回复风格：自然友好，表达清楚但不过度口语化。"
};

const warmthInstructions: Record<Exclude<UserPreferenceDTO["warmth"], "default">, string> = {
  calm: "- 沟通温度：保持冷静克制，不夸张承诺。",
  warm: "- 沟通温度：语气温和，适当解释原因。",
  direct: "- 沟通温度：直接指出重点，避免不必要寒暄。"
};

const enthusiasmInstructions: Record<Exclude<UserPreferenceDTO["enthusiasm"], "default">, string> = {
  low: "- 热情程度：低，避免兴奋式措辞。",
  medium: "- 热情程度：中，保持积极但不过度。",
  high: "- 热情程度：高，可以更主动给建议和下一步。"
};

const titleStyleInstructions: Record<Exclude<UserPreferenceDTO["titleStyle"], "default">, string> = {
  short: "- 标题风格：使用短标题，层级不要过多。",
  structured: "- 标题风格：结构化输出，必要时使用小标题和列表。"
};

const emojiStyleInstructions: Record<Exclude<UserPreferenceDTO["emojiStyle"], "default">, string> = {
  none: "- 表情符号：不要使用 emoji。",
  minimal: "- 表情符号：只在确有帮助时少量使用 emoji。"
};

export function buildPersonalizationPrompt(preference: UserPreferenceDTO, memories: UserMemoryDTO[]) {
  const lines = [
    "用户个性化设置：",
    languageInstructions[preference.language],
    preference.nickname ? `- 称呼用户为：${preference.nickname}` : "",
    preference.occupation ? `- 用户职业/角色：${preference.occupation}` : "",
    preference.details ? `- 用户详情：${preference.details}` : "",
    preference.tone !== "default" ? toneInstructions[preference.tone] : "",
    preference.warmth !== "default" ? warmthInstructions[preference.warmth] : "",
    preference.enthusiasm !== "default" ? enthusiasmInstructions[preference.enthusiasm] : "",
    preference.titleStyle !== "default" ? titleStyleInstructions[preference.titleStyle] : "",
    preference.emojiStyle !== "default" ? emojiStyleInstructions[preference.emojiStyle] : "",
    preference.quickAnswer ? "- 优先给出直接答案，再补充必要解释。" : "",
    preference.customInstructions ? `- 自定义指令：${preference.customInstructions}` : "",
    preference.memoryEnabled && memories.length > 0 ? "已保存记忆：" : "",
    ...(preference.memoryEnabled ? memories.map((memory) => `- ${memory.content}`) : [])
  ].filter(Boolean);

  return lines.length > 1 ? lines.join("\n") : "用户未配置额外个性化设置。";
}
