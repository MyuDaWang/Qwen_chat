"use client";

import { useEffect, useRef } from "react";
import { EmptyState } from "@/src/features/chat/components/EmptyState";
import { MessageBubble } from "@/src/features/chat/components/MessageBubble";
import type { MessageDTO } from "@/src/shared/types";

export function MessageList({ messages }: { messages: MessageDTO[] }) {
  const bottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages]);

  if (messages.length === 0) {
    return <EmptyState />;
  }

  return (
    <div className="scrollbar-thin h-full overflow-y-auto py-4">
      {messages.map((message) => (
        <MessageBubble key={message.id} message={message} />
      ))}
      <div ref={bottomRef} />
    </div>
  );
}
