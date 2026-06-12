type ChatSystemPromptInput = {
  agentSystemPrompt: string;
  personalizationPrompt: string;
  customerId: string;
  plan: string;
  modelName: string;
};

export function composeChatSystemPrompt({
  agentSystemPrompt,
  personalizationPrompt,
  customerId,
  plan,
  modelName
}: ChatSystemPromptInput) {
  return [
    agentSystemPrompt,
    `当前客户 ID：${customerId}，会员等级：${plan}。`,
    `当前模型：${modelName}。请保持专业、清晰、可执行。`,
    personalizationPrompt
  ].join("\n");
}
