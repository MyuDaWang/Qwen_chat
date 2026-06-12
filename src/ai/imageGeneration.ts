import { writeFile } from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import { LLMProviderError } from "@/src/ai/llm/types";
import { ensureUploadRootDir, uploadUrl } from "@/src/server/upload/storage";

type QwenImageResponse = {
  request_id?: string;
  requestId?: string;
  code?: string;
  message?: string;
  output?: {
    choices?: Array<{
      message?: {
        content?: Array<{
          image?: string;
        }>;
      };
    }>;
    results?: Array<{
      url?: string;
      image?: string;
    }>;
  };
  usage?: {
    width?: number;
    height?: number;
    image_count?: number;
  };
};

function imageApiKey() {
  return process.env.IMAGE_GENERATION_API_KEY || process.env.DASHSCOPE_API_KEY || process.env.OPENAI_API_KEY;
}

type ImageGenerationStatus = (message: string) => void;

async function generateViaGateway(prompt: string, onStatus?: ImageGenerationStatus) {
  const gatewayUrl = process.env.MODEL_GATEWAY_URL?.replace(/\/$/, "");
  if (!gatewayUrl) return null;

  const model = process.env.IMAGE_GENERATION_MODEL || "qwen-image-2.0-pro";
  const size = process.env.IMAGE_GENERATION_SIZE || "1328*1328";
  onStatus?.("正在提交到图像生成网关");
  const response = await fetch(`${gatewayUrl}/v1/images`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(process.env.MODEL_GATEWAY_TOKEN ? { Authorization: `Bearer ${process.env.MODEL_GATEWAY_TOKEN}` } : {})
    },
    body: JSON.stringify({ prompt, model, size })
  });

  const payload = await response.json().catch(() => null) as { imageUrl?: string; model?: string; requestId?: string; width?: number; height?: number; error?: { message?: string } } | null;
  if (!response.ok || !payload?.imageUrl) {
    throw new LLMProviderError("LLM_PROVIDER_ERROR", payload?.error?.message ? `图像网关返回异常：${payload.error.message}` : `图像网关返回异常：${response.status}`);
  }

  const downloaded = await downloadImage(payload.imageUrl, onStatus);
  return {
    ...downloaded,
    model: payload.model || model,
    requestId: payload.requestId,
    width: payload.width,
    height: payload.height
  };
}

function firstImageUrl(payload: QwenImageResponse) {
  const fromChoices = payload.output?.choices?.flatMap((choice) => choice.message?.content ?? []).find((item) => item.image)?.image;
  const fromResults = payload.output?.results?.find((item) => item.url || item.image);
  return fromChoices || fromResults?.url || fromResults?.image;
}

async function downloadImage(url: string, onStatus?: ImageGenerationStatus) {
  onStatus?.("正在下载生成图片");
  const response = await fetch(url);
  if (!response.ok) {
    throw new LLMProviderError("LLM_PROVIDER_ERROR", `生成图片下载失败：${response.status}`);
  }

  const contentType = response.headers.get("content-type") || "image/png";
  const extension = contentType.includes("jpeg") ? "jpg" : contentType.includes("webp") ? "webp" : "png";
  const bytes = Buffer.from(await response.arrayBuffer());
  const filename = `generated-${crypto.randomUUID()}.${extension}`;
  const uploadsDir = await ensureUploadRootDir();
  await writeFile(path.join(uploadsDir, filename), bytes);

  return {
    url: uploadUrl(filename),
    mimeType: contentType,
    size: bytes.length
  };
}

export async function generateQwenImage(prompt: string, onStatus?: ImageGenerationStatus) {
  const gatewayResult = await generateViaGateway(prompt, onStatus);
  if (gatewayResult) return gatewayResult;

  const apiKey = imageApiKey();
  if (!apiKey) {
    throw new LLMProviderError("LLM_PROVIDER_ERROR", "图像生成未配置 API Key，请配置 OPENAI_API_KEY、IMAGE_GENERATION_API_KEY 或 DASHSCOPE_API_KEY。");
  }

  const endpoint = process.env.IMAGE_GENERATION_ENDPOINT || "https://dashscope.aliyuncs.com/api/v1/services/aigc/multimodal-generation/generation";
  const model = process.env.IMAGE_GENERATION_MODEL || "qwen-image-2.0-pro";
  const size = process.env.IMAGE_GENERATION_SIZE || "1328*1328";

  onStatus?.("正在提交到百炼图像模型");
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model,
      input: {
        messages: [
          {
            role: "user",
            content: [{ text: prompt }]
          }
        ]
      },
      parameters: {
        n: 1,
        size,
        prompt_extend: true,
        watermark: false
      }
    })
  });

  onStatus?.("正在等待百炼返回生成结果");
  const rawText = await response.text();
  let payload: QwenImageResponse;
  try {
    payload = JSON.parse(rawText) as QwenImageResponse;
  } catch {
    throw new LLMProviderError("LLM_PROVIDER_ERROR", `图像生成服务返回异常：${response.status}，${rawText.slice(0, 200)}`);
  }

  if (!response.ok || payload.code) {
    throw new LLMProviderError("LLM_PROVIDER_ERROR", payload.message ? `图像生成失败：${payload.message}` : `图像生成失败：${response.status}`);
  }

  const imageUrl = firstImageUrl(payload);
  if (!imageUrl) {
    throw new LLMProviderError("LLM_PROVIDER_ERROR", "图像生成服务未返回图片 URL。");
  }

  const downloaded = await downloadImage(imageUrl, onStatus);
  return {
    ...downloaded,
    model,
    requestId: payload.request_id || payload.requestId,
    width: payload.usage?.width,
    height: payload.usage?.height
  };
}
