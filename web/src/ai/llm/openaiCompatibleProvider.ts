import { readFile } from "node:fs/promises";
import { LLMProviderError, type LLMChatInput, type LLMProvider, type LLMStreamEvent } from "@/src/ai/llm/types";
import { filenameFromUploadUrl, isLocalUploadUrl, resolveUploadPath } from "@/src/server/upload/storage";

type OpenAIStreamChunk = {
  choices?: Array<{
    delta?: {
      content?: string;
      reasoning_content?: string;
    };
  }>;
  error?: {
    message?: string;
    type?: string;
    code?: string;
  };
};

function enableThinkingForRequest(model: string, override?: boolean) {
  if (override !== undefined) return override;
  const configured = process.env.LLM_ENABLE_THINKING;
  if (configured === "1" || configured?.toLowerCase() === "true") return true;
  if (configured === "0" || configured?.toLowerCase() === "false") return false;
  if (configured === "unset") return undefined;
  if (/qwen|deepseek|kimi|glm/i.test(model)) return true;
  return undefined;
}

async function toProviderImageUrl(url: string, mimeType: string) {
  if (url.startsWith("http://") || url.startsWith("https://")) return url;

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

async function toOpenAIMessage(message: LLMChatInput["messages"][number]) {
  if (message.role === "assistant") {
    return {
      role: message.role,
      content: message.content
        .filter((block) => block.type === "text")
        .map((block) => block.text)
        .join("\n")
    };
  }

  return {
    role: message.role,
    content: await Promise.all(message.content.map(async (block) => {
      if (block.type === "text") {
        return { type: "text", text: block.text };
      }
      return {
        type: "image_url",
        image_url: {
          url: await toProviderImageUrl(block.url, block.mimeType)
        }
      };
    }))
  };
}

export function createOpenAICompatibleProvider(): LLMProvider {
  const apiKey = process.env.OPENAI_API_KEY;
  const baseUrl = (process.env.OPENAI_BASE_URL || "https://api.openai.com/v1").replace(/\/$/, "");
  const model = process.env.MODEL_NAME || "qwen-plus";
  const supportsImages = process.env.MODEL_SUPPORTS_IMAGES === "1";

  return {
    name: "openai-compatible",
    model,
    supportsImages,
    async *streamChat(input: LLMChatInput): AsyncIterable<LLMStreamEvent> {
      if (!apiKey) {
        throw new LLMProviderError("LLM_PROVIDER_ERROR", "模型服务未配置：请在服务端配置 OPENAI_API_KEY，或接入你的模型服务网关。");
      }

      const hasImage = input.messages.some((message) => message.content.some((block) => block.type === "image"));
      if (hasImage && !supportsImages) {
        throw new LLMProviderError("LLM_PROVIDER_ERROR", "当前模型未声明支持图片，请切换视觉模型并设置 MODEL_SUPPORTS_IMAGES=1。");
      }

      const requestModel = input.model || model;
      const enableThinking = enableThinkingForRequest(requestModel, input.enableThinking);
      const response = await fetch(`${baseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: requestModel,
          stream: true,
          messages: await Promise.all(input.messages.map(toOpenAIMessage)),
          ...(enableThinking === undefined ? {} : { enable_thinking: enableThinking })
        }),
        signal: input.signal
      });

      if (response.status === 429) {
        throw new LLMProviderError("LLM_RATE_LIMITED", "模型服务限流，请稍后再试。");
      }
      if (!response.ok || !response.body) {
        const errorText = await response.text().catch(() => "");
        let providerMessage = "";
        try {
          providerMessage = JSON.parse(errorText).error?.message ?? "";
        } catch {
          providerMessage = errorText;
        }
        throw new LLMProviderError(
          "LLM_PROVIDER_ERROR",
          providerMessage ? `模型服务返回异常：${response.status}，${providerMessage}` : `模型服务返回异常：${response.status}`
        );
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const events = buffer.split("\n\n");
        buffer = events.pop() ?? "";

        for (const event of events) {
          for (const line of event.split("\n")) {
            const trimmed = line.trim();
            if (!trimmed.startsWith("data: ")) continue;
            const data = trimmed.slice(6);
            if (data === "[DONE]") {
              yield { type: "done" };
              return;
            }
            const parsed = JSON.parse(data) as OpenAIStreamChunk;
            if (parsed.error) {
              throw new LLMProviderError("LLM_PROVIDER_ERROR", parsed.error.message || "模型服务异常");
            }
            const reasoningDelta = parsed.choices?.[0]?.delta?.reasoning_content;
            if (reasoningDelta) yield { type: "reasoning_delta", delta: reasoningDelta };
            const delta = parsed.choices?.[0]?.delta?.content;
            if (delta) yield { type: "delta", delta };
          }
        }
      }

      yield { type: "done" };
    }
  };
}
