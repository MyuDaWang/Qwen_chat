import { describe, expect, it } from "vitest";
import { encodeStreamEvent, parseStreamEvents } from "@/src/shared/streamProtocol";

describe("stream protocol", () => {
  it("encodes and parses delta events with Chinese text", () => {
    const encoded = encodeStreamEvent({
      event: "delta",
      data: { conversationId: "c1", messageId: "m1", delta: "你好，世界" }
    });

    expect(parseStreamEvents(encoded)).toEqual([
      { event: "delta", data: { conversationId: "c1", messageId: "m1", delta: "你好，世界" } }
    ]);
  });

  it("parses done and error events", () => {
    const payload =
      encodeStreamEvent({ event: "done", data: { conversationId: "c1", messageId: "m1" } }) +
      encodeStreamEvent({ event: "error", data: { message: "failed" } });
    const events = parseStreamEvents(payload);

    expect(events.map((event) => event.event)).toEqual(["done", "error"]);
  });

  it("allows done events to carry final message content", () => {
    const encoded = encodeStreamEvent({
      event: "done",
      data: {
        conversationId: "c1",
        messageId: "m1",
        content: [
          { type: "image", url: "/api/uploads/generated.png", mimeType: "image/png", size: 100 },
          { type: "text", text: "图像生成完成。" }
        ]
      }
    });

    expect(parseStreamEvents(encoded)[0]).toEqual({
      event: "done",
      data: {
        conversationId: "c1",
        messageId: "m1",
        content: [
          { type: "image", url: "/api/uploads/generated.png", mimeType: "image/png", size: 100 },
          { type: "text", text: "图像生成完成。" }
        ]
      }
    });
  });
});
