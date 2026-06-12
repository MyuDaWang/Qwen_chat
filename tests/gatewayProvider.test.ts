import { afterEach, describe, expect, it, vi } from "vitest";
import { createGatewayProvider } from "@/src/ai/llm/gatewayProvider";

describe("gateway provider", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    delete process.env.MODEL_GATEWAY_URL;
    delete process.env.MODEL_GATEWAY_TOKEN;
    delete process.env.MODEL_NAME;
  });

  it("streams delta events from the model gateway", async () => {
    process.env.MODEL_GATEWAY_URL = "https://gateway.example.com";
    process.env.MODEL_GATEWAY_TOKEN = "client-token";
    process.env.MODEL_NAME = "qwen3-vl-plus";

    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response('event: delta\ndata: {"delta":"你好"}\n\nevent: delta\ndata: {"delta":"，网关"}\n\nevent: done\ndata: {}\n\n', {
        status: 200,
        headers: { "Content-Type": "text/event-stream" }
      })
    );

    const provider = createGatewayProvider();
    let text = "";
    for await (const event of provider.streamChat({
      messages: [{ role: "user", content: [{ type: "text", text: "hello" }] }]
    })) {
      if (event.type === "delta") text += event.delta;
    }

    expect(text).toBe("你好，网关");
    expect(vi.mocked(fetch).mock.calls[0]?.[0]).toBe("https://gateway.example.com/v1/chat");
    expect(vi.mocked(fetch).mock.calls[0]?.[1]?.headers).toMatchObject({ Authorization: "Bearer client-token" });
  });

  it("streams reasoning events from the model gateway", async () => {
    process.env.MODEL_GATEWAY_URL = "https://gateway.example.com";

    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response('event: reasoning_delta\ndata: {"delta":"先思考"}\n\nevent: delta\ndata: {"delta":"最终"}\n\nevent: done\ndata: {}\n\n', {
        status: 200,
        headers: { "Content-Type": "text/event-stream" }
      })
    );

    const provider = createGatewayProvider();
    const events = [];
    for await (const event of provider.streamChat({
      messages: [{ role: "user", content: [{ type: "text", text: "hello" }] }]
    })) {
      events.push(event);
    }

    expect(events).toContainEqual({ type: "reasoning_delta", delta: "先思考" });
    expect(events).toContainEqual({ type: "delta", delta: "最终" });
  });

  it("throws a clear error when gateway url is missing", async () => {
    const provider = createGatewayProvider();
    await expect(async () => {
      await provider.streamChat({
        messages: [{ role: "user", content: [{ type: "text", text: "hello" }] }]
      })[Symbol.asyncIterator]().next();
    }).rejects.toThrow("模型网关未配置");
  });
});
