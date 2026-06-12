import { afterEach, describe, expect, it, vi } from "vitest";
import { createOpenAICompatibleProvider } from "@/src/ai/llm/openaiCompatibleProvider";

describe("openai-compatible provider", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    delete process.env.OPENAI_API_KEY;
    delete process.env.OPENAI_BASE_URL;
    delete process.env.MODEL_NAME;
    delete process.env.MODEL_SUPPORTS_IMAGES;
  });

  it("streams delta events from OpenAI-compatible SSE", async () => {
    process.env.OPENAI_API_KEY = "test-key";
    process.env.OPENAI_BASE_URL = "https://dashscope.aliyuncs.com/compatible-mode/v1";
    process.env.MODEL_NAME = "qwen3-vl-plus";
    process.env.MODEL_SUPPORTS_IMAGES = "1";

    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response('data: {"choices":[{"delta":{"content":"你好"}}]}\n\ndata: {"choices":[{"delta":{"content":"，千问"}}]}\n\ndata: [DONE]\n\n', {
        status: 200,
        headers: { "Content-Type": "text/event-stream" }
      })
    );

    const provider = createOpenAICompatibleProvider();
    let text = "";
    for await (const event of provider.streamChat({
      messages: [{ role: "user", content: [{ type: "text", text: "hello" }] }]
    })) {
      if (event.type === "delta") text += event.delta;
    }

    expect(text).toBe("你好，千问");
  });

  it("streams reasoning deltas separately from final answer", async () => {
    process.env.OPENAI_API_KEY = "test-key";
    process.env.OPENAI_BASE_URL = "https://dashscope.aliyuncs.com/compatible-mode/v1";
    process.env.MODEL_NAME = "qwen3.6-plus";

    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(
        'data: {"choices":[{"delta":{"reasoning_content":"先分析问题"}}]}\n\ndata: {"choices":[{"delta":{"content":"最终回答"}}]}\n\ndata: [DONE]\n\n',
        {
          status: 200,
          headers: { "Content-Type": "text/event-stream" }
        }
      )
    );

    const provider = createOpenAICompatibleProvider();
    const events = [];
    for await (const event of provider.streamChat({
      messages: [{ role: "user", content: [{ type: "text", text: "hello" }] }]
    })) {
      events.push(event);
    }

    expect(events).toContainEqual({ type: "reasoning_delta", delta: "先分析问题" });
    expect(events).toContainEqual({ type: "delta", delta: "最终回答" });
  });

  it("passes per-request thinking mode to provider", async () => {
    process.env.OPENAI_API_KEY = "test-key";
    process.env.OPENAI_BASE_URL = "https://dashscope.aliyuncs.com/compatible-mode/v1";
    process.env.MODEL_NAME = "qwen3.6-plus";

    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response("data: [DONE]\n\n", {
        status: 200,
        headers: { "Content-Type": "text/event-stream" }
      })
    );

    const provider = createOpenAICompatibleProvider();
    for await (const event of provider.streamChat({
      enableThinking: false,
      messages: [{ role: "user", content: [{ type: "text", text: "hello" }] }]
    })) {
      expect(event.type).toBe("done");
    }

    const body = JSON.parse(String(vi.mocked(fetch).mock.calls[0]?.[1]?.body));
    expect(body.enable_thinking).toBe(false);
  });

  it("throws explicit error when api key is missing", async () => {
    const provider = createOpenAICompatibleProvider();

    await expect(async () => {
      const stream = provider.streamChat({
        messages: [{ role: "user", content: [{ type: "text", text: "hello" }] }]
      });
      await stream[Symbol.asyncIterator]().next();
    }).rejects.toThrow("模型服务未配置");
  });
});
