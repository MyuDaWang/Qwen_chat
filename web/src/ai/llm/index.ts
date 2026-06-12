import { createGatewayProvider } from "@/src/ai/llm/gatewayProvider";
import { createOpenAICompatibleProvider } from "@/src/ai/llm/openaiCompatibleProvider";
import type { LLMProvider } from "@/src/ai/llm/types";

export function getLLMProvider(): LLMProvider {
  if (process.env.MODEL_GATEWAY_URL) {
    return createGatewayProvider();
  }
  return createOpenAICompatibleProvider();
}
