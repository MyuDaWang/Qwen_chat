"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ChatHeader } from "@/src/features/chat/components/ChatHeader";
import { ChatInput } from "@/src/features/chat/components/ChatInput";
import { ConversationSidebar } from "@/src/features/chat/components/ConversationSidebar";
import { MessageList } from "@/src/features/chat/components/MessageList";
import { useUserPreferences } from "@/src/features/chat/hooks/useUserPreferences";
import type { AgentId } from "@/src/ai/agents";
import { chatModels, DEFAULT_CHAT_MODEL_ID, type ChatModelId } from "@/src/ai/models";
import { parseStreamEvents } from "@/src/shared/streamProtocol";
import { cn } from "@/src/shared/utils";
import type { ConversationDTO, MessageDTO, UploadedAttachment } from "@/src/shared/types";

type MePayload = {
  user: {
    customerId: string;
    name: string;
    planName: string;
    authenticated: boolean;
  };
  models: Array<{
    id: ChatModelId;
    allowed: boolean;
    requiredPlanName: string;
  }>;
};

function nowIso() {
  return new Date().toISOString();
}

function textMessage(text: string): MessageDTO {
  return {
    id: `temp-user-${crypto.randomUUID()}`,
    conversationId: "",
    role: "user",
    content: [{ type: "text", text }],
    status: "done",
    createdAt: nowIso(),
    updatedAt: nowIso()
  };
}

export function ChatShell() {
  const [conversations, setConversations] = useState<ConversationDTO[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [messagesByConversation, setMessagesByConversation] = useState<Record<string, MessageDTO[]>>({});
  const [isStreaming, setIsStreaming] = useState(false);
  const [selectedModelId, setSelectedModelId] = useState<ChatModelId>(DEFAULT_CHAT_MODEL_ID);
  const [enableThinking, setEnableThinking] = useState(true);
  const [me, setMe] = useState<MePayload | null>(null);
  const [draftPrompt, setDraftPrompt] = useState<string | undefined>();
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const { preferences, resolvedTheme, applyPreferences, refreshPreferences } = useUserPreferences();

  const activeConversation = useMemo(
    () => conversations.find((conversation) => conversation.id === activeConversationId),
    [activeConversationId, conversations]
  );
  const activeMessages = activeConversationId ? messagesByConversation[activeConversationId] ?? [] : [];
  const modelAccess = useMemo(
    () => Object.fromEntries((me?.models ?? []).map((model) => [model.id, { allowed: model.allowed, requiredPlanName: model.requiredPlanName }])) as Partial<Record<ChatModelId, { allowed: boolean; requiredPlanName: string }>>,
    [me?.models]
  );
  const refreshConversations = useCallback(async () => {
    const response = await fetch("/api/conversations", { cache: "no-store" });
    const json = await response.json();
    setConversations(json.conversations ?? []);
    if (!activeConversationId && json.conversations?.[0]) {
      setActiveConversationId(json.conversations[0].id);
    }
  }, [activeConversationId]);

  const loadMessages = useCallback(async (conversationId: string) => {
    const response = await fetch(`/api/conversations/${conversationId}/messages`, { cache: "no-store" });
    if (!response.ok) return;
    const json = await response.json();
    setMessagesByConversation((current) => ({ ...current, [conversationId]: json.messages ?? [] }));
  }, []);

  useEffect(() => {
    refreshConversations().catch(() => setError("会话列表加载失败"));
  }, [refreshConversations]);

  useEffect(() => {
    const stored = window.localStorage.getItem("qwen-chat-model") as ChatModelId | null;
    if (stored && chatModels.some((model) => model.id === stored)) setSelectedModelId(stored);
    const storedThinking = window.localStorage.getItem("qwen-enable-thinking");
    if (storedThinking === "0") setEnableThinking(false);
  }, []);

  const refreshMe = useCallback(async () => {
    const json = await fetch("/api/me", { cache: "no-store" })
      .then((response) => (response.ok ? response.json() : null))
      .catch(() => null);
    setMe(json);
    return json;
  }, []);

  useEffect(() => {
    refreshMe().catch(() => undefined);
    refreshPreferences().catch(() => undefined);
  }, [refreshMe, refreshPreferences]);

  useEffect(() => {
    const access = modelAccess[selectedModelId];
    if (access && !access.allowed) {
      const firstAllowed = chatModels.find((model) => modelAccess[model.id]?.allowed);
      changeModel(firstAllowed?.id ?? DEFAULT_CHAT_MODEL_ID);
    }
  }, [modelAccess, selectedModelId]);

  const handleAuthChange = useCallback(async () => {
    setActiveConversationId(null);
    setMessagesByConversation({});
    await refreshMe();
    await refreshPreferences();
    await refreshConversations();
  }, [refreshConversations, refreshMe, refreshPreferences]);

  function changeModel(modelId: ChatModelId) {
    setSelectedModelId(modelId);
    window.localStorage.setItem("qwen-chat-model", modelId);
  }

  function changeThinking(enabled: boolean) {
    setEnableThinking(enabled);
    window.localStorage.setItem("qwen-enable-thinking", enabled ? "1" : "0");
  }

  useEffect(() => {
    if (activeConversationId && !messagesByConversation[activeConversationId]) {
      loadMessages(activeConversationId).catch(() => setError("消息加载失败"));
    }
  }, [activeConversationId, loadMessages, messagesByConversation]);

  async function createNewConversation() {
    const response = await fetch("/api/conversations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "新会话" })
    });
    const json = await response.json();
    const conversation = json.conversation as ConversationDTO;
    setConversations((current) => [conversation, ...current]);
    setActiveConversationId(conversation.id);
    setMessagesByConversation((current) => ({ ...current, [conversation.id]: [] }));
    setError(null);
  }

  async function deleteConversation(id: string) {
    await fetch(`/api/conversations/${id}`, { method: "DELETE" });
    setConversations((current) => current.filter((conversation) => conversation.id !== id));
    setMessagesByConversation((current) => {
      const next = { ...current };
      delete next[id];
      return next;
    });
    if (activeConversationId === id) {
      const next = conversations.find((conversation) => conversation.id !== id);
      setActiveConversationId(next?.id ?? null);
    }
  }

  async function ensureConversation() {
    if (activeConversationId) return activeConversationId;
    const response = await fetch("/api/conversations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "新会话" })
    });
    const json = await response.json();
    const conversation = json.conversation as ConversationDTO;
    setConversations((current) => [conversation, ...current]);
    setActiveConversationId(conversation.id);
    setMessagesByConversation((current) => ({ ...current, [conversation.id]: [] }));
    return conversation.id;
  }

  async function sendMessage(text: string, attachments: UploadedAttachment[], options: { agentId?: AgentId } = {}) {
    const conversationId = await ensureConversation();
    if (!conversationId || isStreaming) return;

    const tempUser: MessageDTO = {
      ...textMessage(text),
      conversationId,
      content: [
        ...(text.trim() ? [{ type: "text" as const, text: text.trim() }] : []),
        ...attachments
      ]
    };
    const tempAssistantId = `temp-assistant-${crypto.randomUUID()}`;
    const tempAssistant: MessageDTO = {
      id: tempAssistantId,
      conversationId,
      role: "assistant",
      content: [],
      status: "streaming",
      createdAt: nowIso(),
      updatedAt: nowIso()
    };

    setMessagesByConversation((current) => ({
      ...current,
      [conversationId]: [...(current[conversationId] ?? []), tempUser, tempAssistant]
    }));
    setIsStreaming(true);
    setError(null);

    const controller = new AbortController();
    abortRef.current = controller;
    let assistantId = tempAssistantId;
    let buffer = "";

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversationId, text, images: attachments, modelId: selectedModelId, agentId: options.agentId, enableThinking }),
        signal: controller.signal
      });

      if (!response.ok || !response.body) {
        const json = await response.json().catch(() => null);
        throw new Error(json?.error?.message ?? "发送失败");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const chunks = buffer.split(/\n\n+/);
        buffer = chunks.pop() ?? "";

        for (const chunk of chunks) {
          const events = parseStreamEvents(`${chunk}\n\n`);
          for (const streamEvent of events) {
            if (streamEvent.event === "message_created") {
              assistantId = streamEvent.data.assistantMessageId;
              setMessagesByConversation((current) => ({
                ...current,
                [conversationId]: (current[conversationId] ?? []).map((message) =>
                  message.id === tempAssistantId ? { ...message, id: assistantId } : message
                )
              }));
            }
            if (streamEvent.event === "status") {
              const isThinking = streamEvent.data.message.startsWith("思考中：");
              setMessagesByConversation((current) => ({
                ...current,
                [conversationId]: (current[conversationId] ?? []).map((message) =>
                  message.id === streamEvent.data.messageId
                    ? {
                        ...message,
                        progress: isThinking ? "正在思考" : streamEvent.data.message
                      }
                    : message
                )
              }));
            }
            if (streamEvent.event === "delta") {
              setMessagesByConversation((current) => ({
                ...current,
                [conversationId]: (current[conversationId] ?? []).map((message) =>
                  message.id === streamEvent.data.messageId
                    ? {
                        ...message,
                        progress: undefined,
                        content: [{ type: "text", text: `${message.content.find((block) => block.type === "text")?.text ?? ""}${streamEvent.data.delta}` }]
                      }
                    : message
                )
              }));
            }
            if (streamEvent.event === "done") {
              setMessagesByConversation((current) => ({
                ...current,
                [conversationId]: (current[conversationId] ?? []).map((message) =>
                  message.id === streamEvent.data.messageId
                    ? {
                        ...message,
                        status: "done",
                        progress: undefined,
                        content: streamEvent.data.content ?? message.content
                      }
                    : message
                )
              }));
            }
            if (streamEvent.event === "error") {
              setError(streamEvent.data.message);
              setMessagesByConversation((current) => ({
                ...current,
                [conversationId]: (current[conversationId] ?? []).map((message) =>
                  message.id === assistantId ? { ...message, status: "error", error: streamEvent.data.message } : message
                )
              }));
            }
            if (streamEvent.event === "cancelled") {
              setMessagesByConversation((current) => ({
                ...current,
                [conversationId]: (current[conversationId] ?? []).map((message) =>
                  message.id === streamEvent.data.messageId ? { ...message, status: "cancelled" } : message
                )
              }));
            }
          }
        }
      }
      await refreshConversations();
    } catch (sendError) {
      if ((sendError as Error).name !== "AbortError") {
        const message = sendError instanceof Error ? sendError.message : "发送失败";
        setError(message);
        setMessagesByConversation((current) => ({
          ...current,
          [conversationId]: (current[conversationId] ?? []).map((item) =>
            item.id === assistantId ? { ...item, status: "error", error: message } : item
          )
        }));
      }
    } finally {
      setIsStreaming(false);
      abortRef.current = null;
      loadMessages(conversationId).catch(() => undefined);
    }
  }

  function stopGeneration() {
    abortRef.current?.abort();
    setIsStreaming(false);
  }

  return (
    <main
      data-theme={resolvedTheme}
      className={cn(
        "qwen-app relative h-screen overflow-hidden bg-[radial-gradient(circle_at_18%_10%,rgba(99,102,241,0.20),transparent_27%),radial-gradient(circle_at_82%_18%,rgba(45,212,191,0.18),transparent_29%),radial-gradient(circle_at_50%_92%,rgba(168,85,247,0.13),transparent_30%),linear-gradient(180deg,#f8f9ff,#edf3ff)]",
        resolvedTheme === "dark" && "dark"
      )}
    >
      <div className="pointer-events-none absolute left-[28%] top-10 h-32 w-[520px] rotate-6 rounded-[50%] border border-violet-300/30" />
      <div className="pointer-events-none absolute right-16 top-24 h-44 w-44 rounded-full border border-cyan-300/30" />
      <div className="relative z-10 flex h-full">
        <ConversationSidebar
          conversations={conversations}
          activeConversationId={activeConversationId}
          account={me?.user}
          onCreate={createNewConversation}
          onSelect={setActiveConversationId}
          onDelete={deleteConversation}
          onAuthChange={handleAuthChange}
          preferences={preferences}
          onPreferencesChange={applyPreferences}
        />
        <section className="flex min-w-0 flex-1 flex-col">
          <ChatHeader
            conversation={activeConversation}
            isStreaming={isStreaming}
            selectedModelId={selectedModelId}
            enableThinking={enableThinking}
            modelAccess={modelAccess}
            onModelChange={changeModel}
            onThinkingChange={changeThinking}
          />
          {error && <div className="mx-6 mt-3 rounded-2xl border border-red-100 bg-red-50 px-4 py-2 text-sm text-red-600">{error}</div>}
          <div className="min-h-0 flex-1">
            <MessageList messages={activeMessages} />
          </div>
          <ChatInput
            disabled={!activeConversationId}
            isStreaming={isStreaming}
            draft={draftPrompt}
            onDraftConsumed={() => setDraftPrompt(undefined)}
            onSend={sendMessage}
            onStop={stopGeneration}
          />
        </section>
      </div>
    </main>
  );
}
