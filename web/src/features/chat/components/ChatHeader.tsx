"use client";

import { BrainCircuit, Cpu, Sparkles } from "lucide-react";
import { ModelSelector } from "@/src/features/chat/components/ModelSelector";
import type { ChatModelId } from "@/src/ai/models";
import type { ConversationDTO } from "@/src/shared/types";

export function ChatHeader({
  conversation,
  isStreaming,
  selectedModelId,
  enableThinking,
  modelAccess,
  onModelChange,
  onThinkingChange
}: {
  conversation?: ConversationDTO;
  isStreaming: boolean;
  selectedModelId: ChatModelId;
  enableThinking: boolean;
  modelAccess?: Partial<Record<ChatModelId, { allowed: boolean; requiredPlanName: string }>>;
  onModelChange: (modelId: ChatModelId) => void;
  onThinkingChange: (enabled: boolean) => void;
}) {
  return (
    <header className="flex min-h-16 flex-col gap-3 border-b border-white/65 bg-white/55 px-4 py-3 backdrop-blur-2xl lg:flex-row lg:items-center lg:justify-between lg:px-6">
      <div className="min-w-0 flex-1">
        <div className="truncate text-base font-semibold text-slate-950">{conversation?.title ?? "千问灵犀"}</div>
        <div className="text-xs text-slate-500">Qwen 模型服务 · Markdown 流式输出 · 历史自动保存</div>
      </div>
      <div className="flex max-w-full flex-wrap items-center gap-2">
        <ModelSelector selectedModelId={selectedModelId} modelAccess={modelAccess} disabled={isStreaming} onSelect={onModelChange} />
        <button
          type="button"
          disabled={isStreaming}
          onClick={() => onThinkingChange(!enableThinking)}
          className="flex items-center gap-2 rounded-full border border-white/70 bg-white/70 px-3 py-1.5 text-xs text-slate-600 transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-60"
          aria-pressed={enableThinking}
          aria-label="切换思考模式"
        >
          <BrainCircuit className={enableThinking ? "h-3.5 w-3.5 text-violet-500" : "h-3.5 w-3.5 text-slate-400"} />
          思考{enableThinking ? "开" : "关"}
        </button>
        <div className="flex items-center gap-2 rounded-full border border-white/70 bg-white/70 px-3 py-1.5 text-xs text-slate-600">
          <Cpu className="h-3.5 w-3.5 text-violet-500" />
          百炼接入
        </div>
        <div className="flex items-center gap-2 rounded-full border border-cyan-100 bg-cyan-50/80 px-3 py-1.5 text-xs text-cyan-700">
          <Sparkles className="h-3.5 w-3.5" />
          {isStreaming ? "生成中" : "就绪"}
        </div>
      </div>
    </header>
  );
}
