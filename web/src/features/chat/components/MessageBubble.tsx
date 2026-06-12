"use client";

import { Bot, FileText, UserRound } from "lucide-react";
import { MarkdownMessage } from "@/src/features/chat/components/MarkdownMessage";
import { cn } from "@/src/shared/utils";
import type { MessageDTO } from "@/src/shared/types";

function textFromMessage(message: MessageDTO) {
  return message.content
    .filter((block) => block.type === "text")
    .map((block) => block.text)
    .join("\n");
}

function imagesFromMessage(message: MessageDTO) {
  return message.content.filter((block) => block.type === "image");
}

function filesFromMessage(message: MessageDTO) {
  return message.content.filter((block) => block.type === "file");
}

export function MessageBubble({ message }: { message: MessageDTO }) {
  const isUser = message.role === "user";
  const text = textFromMessage(message);
  const images = imagesFromMessage(message);
  const files = filesFromMessage(message);

  return (
    <div className={cn("flex gap-3 px-6 py-4", isUser ? "justify-end" : "justify-start")}>
      {!isUser && (
        <div className="qwen-gradient-br mt-1 grid h-9 w-9 shrink-0 place-items-center rounded-2xl text-white shadow-sm">
          <Bot className="h-4 w-4" />
        </div>
      )}
      <div
        className={cn(
          "max-w-[78%] rounded-3xl px-4 py-3 shadow-sm",
          isUser
            ? "qwen-gradient-br text-white"
            : "border border-white/70 bg-white/80 text-slate-900 backdrop-blur-xl"
        )}
      >
        {images.length > 0 && (
          <div className={cn("mb-3 grid gap-2", images.length > 1 ? "grid-cols-2" : "grid-cols-1")}>
            {images.map((image) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={image.url}
                src={image.url}
                alt={image.alt ?? "uploaded image"}
                className="max-h-56 rounded-2xl border border-white/50 object-cover"
              />
            ))}
          </div>
        )}
        {files.length > 0 && (
          <div className="mb-3 space-y-2">
            {files.map((file) => (
              <a
                key={file.url}
                href={file.url}
                target="_blank"
                rel="noreferrer"
                className={cn(
                  "flex items-start gap-3 rounded-2xl border px-3 py-2 text-left",
                  isUser ? "border-white/30 bg-white/15 text-white" : "border-slate-100 bg-slate-50 text-slate-700"
                )}
              >
                <FileText className="mt-0.5 h-4 w-4 shrink-0" />
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium">{file.originalName}</span>
                  <span className={cn("block text-xs", isUser ? "text-white/75" : "text-slate-500")}>
                    已解析 {file.extractedText.length} 字 · {(file.size / 1024).toFixed(1)} KB
                  </span>
                  {file.summary && <span className={cn("mt-1 line-clamp-2 block text-xs", isUser ? "text-white/75" : "text-slate-500")}>{file.summary}</span>}
                </span>
              </a>
            ))}
          </div>
        )}
        {isUser ? (
          <div className="whitespace-pre-wrap text-sm leading-7">{text}</div>
        ) : text ? (
          <MarkdownMessage content={text} />
        ) : message.status === "streaming" ? (
          <div className="flex items-center gap-2 py-1 text-sm text-slate-500">
            <span className="h-2 w-2 animate-pulse rounded-full bg-violet-400" />
            {message.progress ?? "正在思考"}
          </div>
        ) : null}
        {message.status === "error" && <div className="mt-2 text-sm text-red-500">生成失败：{message.error}</div>}
        {message.status === "cancelled" && <div className="mt-2 text-sm text-slate-400">已停止生成</div>}
      </div>
      {isUser && (
        <div className="mt-1 grid h-9 w-9 shrink-0 place-items-center rounded-2xl bg-slate-900 text-white shadow-sm">
          <UserRound className="h-4 w-4" />
        </div>
      )}
    </div>
  );
}
