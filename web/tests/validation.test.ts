import { describe, expect, it } from "vitest";
import { chatRequestSchema } from "@/src/shared/validation";
import { composeChatSystemPrompt } from "@/src/server/chatPrompt";
import { buildPersonalizationPrompt, memoryCreateSchema, preferenceSchema } from "@/src/server/userPreferences";

describe("chatRequestSchema", () => {
  it("rejects empty text and empty images", () => {
    expect(() => chatRequestSchema.parse({ conversationId: "c1", text: "", images: [] })).toThrow();
  });

  it("rejects too long text", () => {
    expect(() => chatRequestSchema.parse({ conversationId: "c1", text: "x".repeat(8001), images: [] })).toThrow();
  });

  it("rejects unsupported image mime", () => {
    expect(() =>
      chatRequestSchema.parse({
        conversationId: "c1",
        images: [{ url: "/uploads/a.gif", mimeType: "image/gif", size: 10 }]
      })
    ).toThrow();
  });

  it("accepts text with a valid image", () => {
    const parsed = chatRequestSchema.parse({
      conversationId: "c1",
      modelId: "qwen3-vl-plus",
      text: "解释图片",
      images: [{ type: "image", url: "/uploads/a.png", mimeType: "image/png", size: 10 }]
    });
    expect(parsed.images).toHaveLength(1);
    expect(parsed.modelId).toBe("qwen3-vl-plus");
  });

  it("accepts parsed file attachments", () => {
    const parsed = chatRequestSchema.parse({
      conversationId: "c1",
      text: "总结附件",
      images: [
        {
          type: "file",
          url: "/uploads/a.pdf",
          mimeType: "application/pdf",
          size: 100,
          originalName: "a.pdf",
          extractedText: "这是一段 PDF 解析文本"
        }
      ]
    });
    expect(parsed.images[0]?.type).toBe("file");
  });

  it("accepts newer Qwen 3.7 model ids", () => {
    const parsed = chatRequestSchema.parse({ conversationId: "c1", modelId: "qwen3.7-plus", text: "hello" });
    expect(parsed.modelId).toBe("qwen3.7-plus");
  });

  it("accepts per-request thinking mode", () => {
    const parsed = chatRequestSchema.parse({ conversationId: "c1", text: "hello", enableThinking: false });
    expect(parsed.enableThinking).toBe(false);
  });

  it("accepts supported agent ids as explicit routing params", () => {
    const parsed = chatRequestSchema.parse({ conversationId: "c1", agentId: "data_analysis", text: "a,b\n1,2" });
    expect(parsed.agentId).toBe("data_analysis");
  });

  it("accepts image generation agent ids", () => {
    const parsed = chatRequestSchema.parse({ conversationId: "c1", agentId: "image_generation", text: "一张蓝紫色科技感海报" });
    expect(parsed.agentId).toBe("image_generation");
  });

  it("rejects unknown model ids", () => {
    expect(() => chatRequestSchema.parse({ conversationId: "c1", modelId: "unknown-model", text: "hello" })).toThrow();
  });

  it("rejects removed model ids", () => {
    expect(() => chatRequestSchema.parse({ conversationId: "c1", modelId: "qwen-plus", text: "hello" })).toThrow();
  });

  it("rejects unknown agent ids", () => {
    expect(() => chatRequestSchema.parse({ conversationId: "c1", agentId: "unknown_agent", text: "hello" })).toThrow();
  });

  it("validates personalization preferences", () => {
    const parsed = preferenceSchema.parse({
      theme: "dark",
      tone: "professional",
      nickname: "小明",
      memoryEnabled: true
    });
    expect(parsed.theme).toBe("dark");
    expect(parsed.tone).toBe("professional");
    expect(parsed.nickname).toBe("小明");
    expect(() => preferenceSchema.parse({ theme: "system" })).toThrow();
    expect(() => preferenceSchema.parse({ tone: "random" })).toThrow();
  });

  it("validates manual memory length", () => {
    expect(memoryCreateSchema.parse({ content: "我喜欢简洁的中文回答" }).content).toBe("我喜欢简洁的中文回答");
    expect(() => memoryCreateSchema.parse({ content: "" })).toThrow();
    expect(() => memoryCreateSchema.parse({ content: "x".repeat(501) })).toThrow();
  });

  it("builds personalization prompt with enabled memories", () => {
    const preference = {
      ...preferenceSchema.parse({ nickname: "Hanmy", language: "en-US", tone: "concise", memoryEnabled: true }),
      userId: "u1",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    const prompt = buildPersonalizationPrompt(preference, [
      {
        id: "m1",
        userId: "u1",
        content: "用户正在开发 Qwen 客户端。",
        source: "manual",
        enabled: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    ]);
    expect(prompt).toContain("称呼用户为：Hanmy");
    expect(prompt).toContain("Response language hard rule");
    expect(prompt).toContain("reply in English even when the user writes in Chinese");
    expect(prompt).toContain("先给结论");
    expect(prompt).toContain("用户正在开发 Qwen 客户端");
  });

  it("changes the prompt when quick answer is disabled", () => {
    const basePreference = {
      ...preferenceSchema.parse({ quickAnswer: true }),
      userId: "u1",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    const quickPrompt = buildPersonalizationPrompt(basePreference, []);
    const normalPrompt = buildPersonalizationPrompt({ ...basePreference, quickAnswer: false }, []);

    expect(quickPrompt).toContain("优先给出直接答案");
    expect(normalPrompt).not.toContain("优先给出直接答案");
  });

  it("builds prompt instructions for personalization controls", () => {
    const preference = {
      ...preferenceSchema.parse({
        nickname: "Alex",
        occupation: "产品经理",
        details: "正在评审一个 AI 客户端。",
        tone: "professional",
        warmth: "direct",
        enthusiasm: "low",
        emojiStyle: "none",
        customInstructions: "每次回答都先列出风险。"
      }),
      userId: "u1",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    const prompt = buildPersonalizationPrompt(preference, []);

    expect(prompt).toContain("称呼用户为：Alex");
    expect(prompt).toContain("用户职业/角色：产品经理");
    expect(prompt).toContain("用户详情：正在评审一个 AI 客户端。");
    expect(prompt).toContain("专业严谨");
    expect(prompt).toContain("直接指出重点");
    expect(prompt).toContain("避免兴奋式措辞");
    expect(prompt).toContain("不要使用 emoji");
    expect(prompt).toContain("自定义指令：每次回答都先列出风险。");
  });

  it("keeps personalization instructions at the end of the chat system prompt", () => {
    const prompt = composeChatSystemPrompt({
      agentSystemPrompt: "Agent base prompt",
      personalizationPrompt: "Personalization hard rules",
      customerId: "CUST-1",
      plan: "free",
      modelName: "Qwen 3.6 Plus"
    });

    expect(prompt).toContain("当前模型：Qwen 3.6 Plus");
    expect(prompt.split("\n").at(-1)).toBe("Personalization hard rules");
  });
});
