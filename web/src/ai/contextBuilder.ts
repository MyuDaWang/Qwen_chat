import type { MessageContent, MessageRole, MessageStatus } from "@/src/shared/types";
import type { LLMMessage } from "@/src/ai/llm/types";

export type ContextMessage = {
  role: MessageRole;
  content: MessageContent;
  status: MessageStatus;
  createdAt: Date | string;
};

export function buildContext(messages: ContextMessage[], options: { maxMessages?: number } = {}): LLMMessage[] {
  const maxMessages = options.maxMessages ?? 20;

  return messages
    .filter((message) => message.status === "done")
    .filter((message) => message.role === "user" || message.role === "assistant" || message.role === "system")
    .slice(-maxMessages)
    .map((message) => ({
      role: message.role,
      content: message.content
        .filter((block) => block.type === "text" || block.type === "image" || block.type === "file")
        .map((block) => {
          if (block.type === "text") {
            return { type: "text" as const, text: block.text };
          }
          if (block.type === "file") {
            return {
              type: "text" as const,
              text: [
                `用户上传附件：${block.originalName}`,
                `MIME：${block.mimeType}`,
                "附件解析内容：",
                block.extractedText
              ].join("\n")
            };
          }
          return {
            type: "image" as const,
            url: block.url,
            mimeType: block.mimeType,
            size: block.size,
            width: block.width,
            height: block.height
          };
        })
    }));
}

export function contentToPlainText(content: MessageContent) {
  return content
    .filter((block) => block.type === "text" || block.type === "file")
    .map((block) => (block.type === "text" ? block.text : `附件 ${block.originalName}：\n${block.extractedText}`))
    .join("\n")
    .trim();
}
