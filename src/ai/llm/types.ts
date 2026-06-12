import type { MessageRole } from "@/src/shared/types";

export type LLMContentBlock =
  | { type: "text"; text: string }
  | {
      type: "image";
      url: string;
      mimeType: string;
      size: number;
      width?: number;
      height?: number;
    };

export type LLMMessage = {
  role: MessageRole;
  content: LLMContentBlock[];
};

export type LLMChatInput = {
  messages: LLMMessage[];
  model?: string;
  enableThinking?: boolean;
  signal?: AbortSignal;
};

export type LLMStreamEvent =
  | { type: "reasoning_delta"; delta: string }
  | { type: "delta"; delta: string }
  | { type: "done"; usage?: unknown };

export type LLMProvider = {
  name: string;
  model: string;
  supportsImages: boolean;
  streamChat(input: LLMChatInput): AsyncIterable<LLMStreamEvent>;
};

export class LLMProviderError extends Error {
  code: "LLM_TIMEOUT" | "LLM_RATE_LIMITED" | "LLM_PROVIDER_ERROR";

  constructor(code: LLMProviderError["code"], message: string) {
    super(message);
    this.name = "LLMProviderError";
    this.code = code;
  }
}
