import { LLMProviderError } from "@/src/ai/llm/types";

export type AgentId = "web_search" | "image_generation" | "data_analysis";

export type AgentDefinition = {
  id: AgentId;
  name: string;
  description: string;
};

export const agentDefinitions: AgentDefinition[] = [
  {
    id: "web_search",
    name: "网页搜索",
    description: "后端调用可配置搜索工具，把检索结果作为上下文交给模型。"
  },
  {
    id: "image_generation",
    name: "图像生成",
    description: "后端调用百炼 Qwen-Image 文生图接口，保存生成图片并返回。"
  },
  {
    id: "data_analysis",
    name: "数据分析",
    description: "后端先解析用户粘贴的表格或 CSV，再让模型基于结构化摘要分析。"
  }
];

export const agentIds = agentDefinitions.map((agent) => agent.id) as [AgentId, ...AgentId[]];

function extractLatestUserText(text: string) {
  return text.trim().slice(0, 4000);
}

async function webSearch(query: string) {
  const endpoint = process.env.WEB_SEARCH_ENDPOINT;
  if (!endpoint) {
    throw new LLMProviderError("LLM_PROVIDER_ERROR", "网页搜索 Agent 未配置 WEB_SEARCH_ENDPOINT，暂时不能执行真实搜索。");
  }

  const url = new URL(endpoint);
  url.searchParams.set("q", query);
  const response = await fetch(url, {
    headers: process.env.WEB_SEARCH_API_KEY ? { Authorization: `Bearer ${process.env.WEB_SEARCH_API_KEY}` } : undefined
  });
  if (!response.ok) {
    throw new LLMProviderError("LLM_PROVIDER_ERROR", `网页搜索服务异常：${response.status}`);
  }
  return JSON.stringify(await response.json()).slice(0, 6000);
}

function summarizeTableLikeText(text: string) {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, 80);
  const tableLines = lines.filter((line) => line.includes("|") || line.includes(",") || line.includes("\t"));
  if (tableLines.length < 2) {
    return "未检测到明显表格或 CSV。请基于用户文本给出分析框架，并提示用户补充结构化数据。";
  }
  const delimiter = tableLines[0].includes("|") ? "|" : tableLines[0].includes("\t") ? "\t" : ",";
  const rows = tableLines.map((line) => line.split(delimiter).map((cell) => cell.trim()).filter(Boolean));
  const columns = rows[0] ?? [];
  return [
    `检测到 ${rows.length} 行结构化数据。`,
    `字段：${columns.join("，") || "未识别"}`,
    "样例行：",
    ...rows.slice(1, 6).map((row, index) => `${index + 1}. ${row.join(" | ")}`)
  ].join("\n");
}

export async function buildAgentSystemPrompt(agentId: AgentId | undefined, userText: string) {
  const text = extractLatestUserText(userText);
  if (!agentId) {
    return "你是通义千问风格的中文 AI 助手。回答要准确、清晰、直接；遇到图片时先描述可见事实，再给出推断。";
  }

  if (agentId === "web_search") {
    const searchContext = await webSearch(text);
    return [
      "你正在执行网页搜索 Agent。",
      "下面是后端搜索工具返回的原始检索上下文，请只基于这些结果和用户问题回答。",
      "如果检索结果不足，要说明不足并给出下一步检索建议。",
      `检索上下文：\n${searchContext}`
    ].join("\n");
  }

  if (agentId === "image_generation") {
    return "你正在执行图像生成 Agent。该 Agent 会由后端专用图像生成接口处理，不应进入普通文本模型流程。";
  }

  const dataSummary = summarizeTableLikeText(text);
  return [
    "你正在执行数据分析 Agent。",
    "后端已先解析用户输入中的结构化数据。请基于数据摘要输出：指标口径、主要发现、异常点、建议补充的数据和下一步分析。",
    `数据摘要：\n${dataSummary}`
  ].join("\n");
}
