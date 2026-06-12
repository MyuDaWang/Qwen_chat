import { readFile } from "node:fs/promises";
import { LLMProviderError, type LLMChatInput, type LLMProvider, type LLMStreamEvent } from "@/src/ai/llm/types";
import { filenameFromUploadUrl, isLocalUploadUrl, resolveUploadPath } from "@/src/server/upload/storage";

type GatewayStreamEvent =
  | { event: "delta"; data: { delta: string } }
  | { event: "reasoning_delta"; data: { delta: string } }
  | { event: "done"; data?: unknown }
  | { event: "error"; data: { message?: string } };

async function toGatewayImageUrl(url: string, mimeType: string) {
  if (url.startsWith("data:") || url.startsWith("http://") || url.startsWith("https://")) return url;

  if (isLocalUploadUrl(url)) {
    const filename = filenameFromUploadUrl(url);
    if (!filename) {
      throw new LLMProviderError("LLM_PROVIDER_ERROR", "图片路径不合法。");
    }
    const file = await readFile(resolveUploadPath(filename));
    return `data:${mimeType};base64,${file.toString("base64")}`;
  }

  throw new LLMProviderError("LLM_PROVIDER_ERROR", "图片 URL 不合法，请使用上传接口保存图片。");
}

async function toGatewayMessage(message: LLMChatInput["messages"][number]) {
  return {
    role: message.role,
    content: await Promise.all(message.content.map(async (block) => {
      if (block.type === "text") return block;
      return {
        ...block,
        url: await toGatewayImageUrl(block.url, block.mimeType)
      };
    }))
  };
}

function parseGatewayEvents(input: string): GatewayStreamEvent[] {
  return input
    .split(/\n\n+/)
    .map((chunk) => chunk.trim())
    .filter(Boolean)
    .map((chunk) => {
      const eventLine = chunk.split("\n").find((line) => line.startsWith("event: "));
      const dataLine = chunk.split("\n").find((line) => line.startsWith("data: "));
      if (!eventLine || !dataLine) {
        throw new LLMProviderError("LLM_PROVIDER_ERROR", "模型网关返回了无效流事件。");
      }
      return {
        event: eventLine.slice("event: ".length),
        data: JSON.parse(dataLine.slice("data: ".length))
      } as GatewayStreamEvent;
    });
}

export function createGatewayProvider(): LLMProvider {
  const gatewayUrl = process.env.MODEL_GATEWAY_URL?.replace(/\/$/, "");
  const gatewayToken = process.env.MODEL_GATEWAY_TOKEN;
  const model = process.env.MODEL_NAME || "qwen3-vl-plus";
  const supportsImages = process.env.MODEL_GATEWAY_SUPPORTS_IMAGES !== "0";

  return {
    name: "model-gateway",
    model,
    supportsImages,
    async *streamChat(input: LLMChatInput): AsyncIterable<LLMStreamEvent> {
      if (!gatewayUrl) {
        throw new LLMProviderError("LLM_PROVIDER_ERROR", "模型网关未配置：请设置 MODEL_GATEWAY_URL。");
      }

      const response = await fetch(`${gatewayUrl}/v1/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(gatewayToken ? { Authorization: `Bearer ${gatewayToken}` } : {})
        },
        body: JSON.stringify({
          model: input.model || model,
          enableThinking: input.enableThinking,
          messages: await Promise.all(input.messages.map(toGatewayMessage))
        }),
        signal: input.signal
      });

      if (response.status === 401 || response.status === 403) {
        throw new LLMProviderError("LLM_PROVIDER_ERROR", "模型网关鉴权失败，请检查 MODEL_GATEWAY_TOKEN。");
      }
      if (response.status === 429) {
        throw new LLMProviderError("LLM_RATE_LIMITED", "模型网关限流，请稍后再试。");
      }
      if (!response.ok || !response.body) {
        const text = await response.text().catch(() => "");
        throw new LLMProviderError("LLM_PROVIDER_ERROR", text ? `模型网关返回异常：${response.status}，${text}` : `模型网关返回异常：${response.status}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const chunks = buffer.split(/\n\n+/);
        buffer = chunks.pop() ?? "";

        for (const event of parseGatewayEvents(chunks.join("\n\n"))) {
          if (event.event === "reasoning_delta") {
            yield { type: "reasoning_delta", delta: event.data.delta };
          }
          if (event.event === "delta") {
            yield { type: "delta", delta: event.data.delta };
          }
          if (event.event === "error") {
            throw new LLMProviderError("LLM_PROVIDER_ERROR", event.data.message || "模型网关异常");
          }
          if (event.event === "done") {
            yield { type: "done" };
            return;
          }
        }
      }
      yield { type: "done" };
    }
  };
}
