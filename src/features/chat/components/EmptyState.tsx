"use client";

export function EmptyState() {
  return (
    <div className="flex h-full items-center justify-center px-6">
      <div className="w-full max-w-3xl text-center">
        <h1 className="text-4xl font-semibold tracking-normal text-slate-950">你好，我是千问 Chat</h1>
        <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-slate-500">
          可以直接提问，也可以上传图片让我分析。回复会以流式 Markdown 展示，并保存在当前会话中。
        </p>
      </div>
    </div>
  );
}
