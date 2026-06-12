import { describe, expect, it } from "vitest";
import { buildContext } from "@/src/ai/contextBuilder";
import type { ContextMessage } from "@/src/ai/contextBuilder";

function msg(index: number, status: ContextMessage["status"] = "done"): ContextMessage {
  return {
    role: index % 2 === 0 ? "user" : "assistant",
    status,
    createdAt: new Date(index),
    content: [{ type: "text", text: `message-${index}` }]
  };
}

describe("buildContext", () => {
  it("filters failed messages and keeps recent done messages in order", () => {
    const messages = Array.from({ length: 25 }, (_, index) => msg(index));
    messages[5] = msg(5, "error");
    messages[6] = msg(6, "cancelled");

    const result = buildContext(messages, { maxMessages: 20 });

    expect(result).toHaveLength(20);
    expect(result.some((message) => message.content.some((block) => block.type === "text" && block.text === "message-5"))).toBe(false);
    expect(result.at(0)?.content[0]).toEqual({ type: "text", text: "message-3" });
    expect(result.at(-1)?.content[0]).toEqual({ type: "text", text: "message-24" });
  });

  it("keeps image blocks for multimodal providers", () => {
    const result = buildContext([
      {
        role: "user",
        status: "done",
        createdAt: new Date(),
        content: [
          { type: "text", text: "解释图片" },
          { type: "image", url: "/uploads/a.png", mimeType: "image/png", size: 10 }
        ]
      }
    ]);

    expect(result[0]?.content).toEqual([
      { type: "text", text: "解释图片" },
      { type: "image", url: "/uploads/a.png", mimeType: "image/png", size: 10, width: undefined, height: undefined }
    ]);
  });
});
