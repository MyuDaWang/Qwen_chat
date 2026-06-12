"use client";

import { ChangeEvent, KeyboardEvent, useEffect, useRef, useState } from "react";
import { BarChart3, FileText, Globe2, ImagePlus, Plus, SendHorizontal, Sparkles, Square, X } from "lucide-react";
import { Button } from "@/src/shared/ui/button";
import { Textarea } from "@/src/shared/ui/textarea";
import type { AgentId } from "@/src/ai/agents";
import type { UploadedAttachment } from "@/src/shared/types";

type Props = {
  disabled?: boolean;
  isStreaming: boolean;
  draft?: string;
  onDraftConsumed?: () => void;
  onSend: (text: string, attachments: UploadedAttachment[], options?: { agentId?: AgentId }) => void;
  onStop: () => void;
};

const capabilities = [
  {
    id: "web_search",
    name: "网页搜索",
    description: "整理检索路径，标出需要联网核验的信息。",
    icon: Globe2,
    agentId: "web_search" as const
  },
  {
    id: "image_generation",
    name: "图像生成",
    description: "调用 Qwen-Image 生成图片并保存到当前会话。",
    icon: Sparkles,
    agentId: "image_generation" as const
  },
  {
    id: "data",
    name: "数据分析",
    description: "定义指标口径，输出表格结构和分析结论。",
    icon: BarChart3,
    agentId: "data_analysis" as const
  }
] as const;

export function ChatInput({ disabled, isStreaming, draft, onDraftConsumed, onSend, onStop }: Props) {
  const [text, setText] = useState("");
  const [attachments, setAttachments] = useState<UploadedAttachment[]>([]);
  const [menuOpen, setMenuOpen] = useState(false);
  const [capabilityId, setCapabilityId] = useState<(typeof capabilities)[number]["id"] | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (draft) {
      setText(draft);
      onDraftConsumed?.();
    }
  }, [draft, onDraftConsumed]);

  async function uploadFile(file: File) {
    const formData = new FormData();
    formData.append("file", file);
    const response = await fetch("/api/upload", { method: "POST", body: formData });
    const json = await response.json();
    if (!response.ok) {
      throw new Error(json.error?.message ?? "图片上传失败");
    }
    return json.file as UploadedAttachment;
  }

  async function onFiles(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    event.target.value = "";
    if (files.length === 0) return;
    setUploading(true);
    setError(null);
    try {
      const uploaded = await Promise.all(files.slice(0, 6 - attachments.length).map(uploadFile));
      setAttachments((current) => [...current, ...uploaded].slice(0, 6));
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "图片上传失败");
    } finally {
      setUploading(false);
    }
  }

  function submit() {
    if (disabled || isStreaming || uploading) return;
    if (!text.trim() && attachments.length === 0) return;
    const capability = capabilities.find((item) => item.id === capabilityId);
    onSend(text, attachments, { agentId: capability?.agentId });
    setText("");
    setAttachments([]);
    setCapabilityId(null);
    setError(null);
  }

  function onKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      submit();
    }
  }

  return (
    <div className="border-t border-white/65 bg-white/45 p-4 backdrop-blur-2xl">
      <div className="mx-auto max-w-4xl rounded-[28px] border border-white/70 bg-white/75 p-3 shadow-panel">
        {attachments.length > 0 && (
          <div className="mb-3 flex flex-wrap gap-2">
            {attachments.map((attachment) => (
              <div key={attachment.url} className="group relative">
                {attachment.type === "image" ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={attachment.url} alt="preview" className="h-20 w-20 rounded-2xl border border-white object-cover" />
                ) : (
                  <div className="flex h-20 w-52 items-center gap-3 rounded-2xl border border-white bg-slate-50 px-3 text-left">
                    <FileText className="h-5 w-5 shrink-0 text-violet-600" />
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium text-slate-800">{attachment.originalName}</span>
                      <span className="block text-xs text-slate-500">已解析 {attachment.extractedText.length} 字</span>
                    </span>
                  </div>
                )}
                <button
                  className="absolute -right-2 -top-2 grid h-6 w-6 place-items-center rounded-full bg-slate-900 text-white opacity-90"
                  onClick={() => setAttachments((current) => current.filter((item) => item.url !== attachment.url))}
                  aria-label="移除附件"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
        {error && <div className="mb-2 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-600">{error}</div>}
        {capabilityId && (
          <div className="mb-2 flex items-center justify-between rounded-2xl border border-violet-100 bg-violet-50 px-3 py-2 text-sm text-violet-700">
            <span>已启用：{capabilities.find((item) => item.id === capabilityId)?.name}</span>
            <button className="rounded-lg p-1 hover:bg-white/70" onClick={() => setCapabilityId(null)} aria-label="关闭能力">
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
        <Textarea
          value={text}
          onChange={(event) => setText(event.target.value)}
          onKeyDown={onKeyDown}
          disabled={disabled || isStreaming}
          placeholder={disabled ? "请先新建或选择会话" : "输入问题，Shift + Enter 换行"}
          className="min-h-24 border-transparent bg-transparent shadow-none focus:ring-0"
        />
        <div className="mt-2 flex items-center justify-between">
          <div className="relative flex items-center gap-2 text-xs text-slate-500">
            <input
              ref={fileRef}
              className="hidden"
              type="file"
              accept="image/png,image/jpeg,image/webp,application/pdf,text/plain,text/markdown,text/csv,application/json,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,.txt,.md,.csv,.json,.pdf,.docx,.xlsx"
              multiple
              onChange={onFiles}
            />
            <Button type="button" variant="secondary" size="icon" disabled={isStreaming} onClick={() => setMenuOpen((current) => !current)} aria-label="打开能力菜单">
              <Plus className="h-4 w-4" />
            </Button>
            {menuOpen && (
              <div className="absolute bottom-11 left-0 z-[80] w-80 overflow-hidden rounded-3xl border border-white/80 bg-white/95 p-2 shadow-[0_24px_80px_rgba(15,23,42,0.18)] backdrop-blur-2xl">
                <button
                  className="flex w-full items-center gap-3 rounded-2xl px-3 py-2 text-left hover:bg-slate-50"
                  onClick={() => {
                    fileRef.current?.click();
                    setMenuOpen(false);
                  }}
                >
                  <ImagePlus className="h-5 w-5 text-cyan-600" />
                  <span>
                    <span className="block text-sm font-medium text-slate-900">添加图片或附件</span>
                    <span className="block text-xs text-slate-500">支持图片、PDF、Word、Excel、文本文件。</span>
                  </span>
                </button>
                <div className="my-2 h-px bg-slate-100" />
                {capabilities.map((item) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.id}
                      className="flex w-full items-center gap-3 rounded-2xl px-3 py-2 text-left hover:bg-slate-50"
                      onClick={() => {
                        setCapabilityId(item.id);
                        setMenuOpen(false);
                      }}
                    >
                      <Icon className="h-5 w-5 text-violet-600" />
                      <span>
                        <span className="block text-sm font-medium text-slate-900">{item.name}</span>
                        <span className="block text-xs leading-5 text-slate-500">{item.description}</span>
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
            <Button
              type="button"
              variant="secondary"
              size="sm"
              disabled={uploading || isStreaming || attachments.length >= 6}
              onClick={() => fileRef.current?.click()}
            >
              <ImagePlus className="h-4 w-4" />
              {uploading ? "解析中" : "附件"}
            </Button>
            <span>最多 6 个，图片 5MB，附件 10MB</span>
          </div>
          {isStreaming ? (
            <Button type="button" variant="destructive" onClick={onStop}>
              <Square className="h-4 w-4" />
              停止生成
            </Button>
          ) : (
            <Button type="button" variant="gradient" disabled={disabled || uploading || (!text.trim() && attachments.length === 0)} onClick={submit}>
              <SendHorizontal className="h-4 w-4" />
              发送
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
