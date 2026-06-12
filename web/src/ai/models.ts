import type { UserPlan } from "@/src/server/plans";

export type ChatModelId =
  | "qwen3.6-plus"
  | "qwen3.7-plus"
  | "qwen3.7-max"
  | "qwen3-vl-plus";

export type ChatModel = {
  id: ChatModelId;
  name: string;
  providerModel: string;
  badge: string;
  description: string;
  priceTier: "经济" | "均衡" | "高性能" | "视觉" | "长上下文" | "代码";
  requiredPlan: UserPlan;
  context: string;
  supportsImages: boolean;
  recommendedFor: string[];
};

export const chatModels: ChatModel[] = [
  {
    id: "qwen3.6-plus",
    name: "Qwen 3.6 Plus",
    providerModel: "qwen3.6-plus",
    badge: "3.6 主力",
    description: "Qwen 3.6 主力模型，适合知识问答、写作分析和稳定生产调用。",
    priceTier: "均衡",
    requiredPlan: "free",
    context: "增强上下文",
    supportsImages: false,
    recommendedFor: ["生产主力", "分析", "写作"]
  },
  {
    id: "qwen3.7-plus",
    name: "Qwen 3.7 Plus",
    providerModel: "qwen3.7-plus",
    badge: "3.7 主力",
    description: "Qwen 3.7 系列主力模型，适合更强的通用问答、分析和 Agent 编排。",
    priceTier: "高性能",
    requiredPlan: "free",
    context: "增强上下文",
    supportsImages: false,
    recommendedFor: ["Agent", "复杂分析", "企业场景"]
  },
  {
    id: "qwen3.7-max",
    name: "Qwen 3.7 Max",
    providerModel: "qwen3.7-max",
    badge: "3.7 旗舰",
    description: "Qwen 3.7 高性能模型，适合复杂方案、深度推理和高价值企业任务。",
    priceTier: "高性能",
    requiredPlan: "pro",
    context: "增强上下文",
    supportsImages: false,
    recommendedFor: ["旗舰能力", "深度推理", "企业高级版"]
  },
  {
    id: "qwen3-vl-plus",
    name: "Qwen3 VL Plus",
    providerModel: "qwen3-vl-plus",
    badge: "多模态",
    description: "支持图片理解，适合截图分析、图表解读和视觉问答。",
    priceTier: "视觉",
    requiredPlan: "pro",
    context: "视觉上下文",
    supportsImages: true,
    recommendedFor: ["图片理解", "截图分析", "图表解读"]
  }
];

export const DEFAULT_CHAT_MODEL_ID: ChatModelId = "qwen3.6-plus";

export function getChatModel(id?: string | null) {
  return chatModels.find((model) => model.id === id) ?? chatModels.find((model) => model.id === DEFAULT_CHAT_MODEL_ID)!;
}

export const chatModelIds = chatModels.map((model) => model.id) as [ChatModelId, ...ChatModelId[]];
