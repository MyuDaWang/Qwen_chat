"use client";

import React from "react";
import ReactMarkdown from "react-markdown";
import rehypeHighlight from "rehype-highlight";
import rehypeSanitize, { defaultSchema } from "rehype-sanitize";
import remarkGfm from "remark-gfm";

const safeSchema = {
  ...defaultSchema,
  protocols: {
    ...defaultSchema.protocols,
    href: ["http", "https", "mailto"]
  },
  attributes: {
    ...defaultSchema.attributes,
    code: [...(defaultSchema.attributes?.code ?? []), ["className"]],
    span: [...(defaultSchema.attributes?.span ?? []), ["className"]]
  }
};

export function MarkdownMessage({ content }: { content: string }) {
  return (
    <div className="max-w-none text-[15px] leading-7 text-slate-800">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[[rehypeSanitize, safeSchema], rehypeHighlight]}
        components={{
          a: ({ href, children }) => (
            <a className="font-medium text-blue-600 underline-offset-4 hover:underline" href={href} target="_blank" rel="noreferrer">
              {children}
            </a>
          ),
          h1: ({ children }) => <h1 className="mb-3 mt-4 text-2xl font-semibold text-slate-950">{children}</h1>,
          h2: ({ children }) => <h2 className="mb-2 mt-4 text-xl font-semibold text-slate-950">{children}</h2>,
          h3: ({ children }) => <h3 className="mb-2 mt-3 text-lg font-semibold text-slate-950">{children}</h3>,
          p: ({ children }) => <p className="my-2">{children}</p>,
          ul: ({ children }) => <ul className="my-2 list-disc space-y-1 pl-6">{children}</ul>,
          ol: ({ children }) => <ol className="my-2 list-decimal space-y-1 pl-6">{children}</ol>,
          blockquote: ({ children }) => (
            <blockquote className="my-3 border-l-4 border-cyan-300 bg-cyan-50/70 py-2 pl-4 text-slate-700">{children}</blockquote>
          ),
          code: ({ className, children }) => {
            const inline = !className;
            if (inline) {
              return <code className="rounded-md bg-violet-50 px-1.5 py-0.5 text-[0.92em] text-violet-700">{children}</code>;
            }
            return <code className={className}>{children}</code>;
          },
          pre: ({ children }) => (
            <pre className="my-3 overflow-x-auto rounded-2xl bg-slate-950 p-4 text-sm leading-6 text-slate-100 shadow-inner">
              {children}
            </pre>
          ),
          table: ({ children }) => (
            <div className="my-3 overflow-x-auto rounded-2xl border border-slate-200">
              <table className="w-full border-collapse text-sm">{children}</table>
            </div>
          ),
          th: ({ children }) => <th className="border-b border-slate-200 bg-slate-50 px-3 py-2 text-left font-semibold">{children}</th>,
          td: ({ children }) => <td className="border-b border-slate-100 px-3 py-2 align-top">{children}</td>
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
