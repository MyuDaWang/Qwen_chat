"use client";

import { useMemo, useState } from "react";
import { MessageSquarePlus, Search, Trash2 } from "lucide-react";
import { AccountMenu } from "@/src/features/chat/components/AccountMenu";
import { BrandLogo } from "@/src/features/chat/components/BrandLogo";
import { Button } from "@/src/shared/ui/button";
import { cn } from "@/src/shared/utils";
import type { ConversationDTO, UserPreferenceDTO } from "@/src/shared/types";

type Props = {
  conversations: ConversationDTO[];
  activeConversationId: string | null;
  account?: {
    customerId: string;
    name: string;
    planName: string;
    authenticated: boolean;
  };
  onCreate: () => void;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
  onAuthChange: () => void;
  preferences?: UserPreferenceDTO | null;
  onPreferencesChange?: (preferences: UserPreferenceDTO) => void;
};

export function ConversationSidebar({
  conversations,
  activeConversationId,
  account,
  onCreate,
  onSelect,
  onDelete,
  onAuthChange,
  preferences,
  onPreferencesChange
}: Props) {
  const [searchKeyword, setSearchKeyword] = useState("");
  const [authPrompt, setAuthPrompt] = useState<string | null>(null);
  const [authPromptSignal, setAuthPromptSignal] = useState(0);
  const filteredConversations = useMemo(() => {
    const keyword = searchKeyword.trim().toLowerCase();
    if (!keyword) return conversations;

    return conversations.filter((conversation) => {
      const updatedAt = new Date(conversation.updatedAt).toLocaleString();
      return [conversation.title, updatedAt].some((value) => value.toLowerCase().includes(keyword));
    });
  }, [conversations, searchKeyword]);

  function handleCreate() {
    if (!account?.authenticated) {
      setAuthPrompt("请先登录或注册账号，登录后即可新建对话并保存历史记录。");
      setAuthPromptSignal((current) => current + 1);
      return;
    }
    setAuthPrompt(null);
    onCreate();
  }

  return (
    <aside className="flex h-full w-[300px] shrink-0 flex-col border-r border-white/60 bg-white/60 px-4 pb-4 pt-14 shadow-panel backdrop-blur-2xl">
      <BrandLogo />
      <Button className="mt-5 w-full" variant="gradient" onClick={handleCreate}>
        <MessageSquarePlus className="h-4 w-4" />
        新建对话
      </Button>
      <div className="mt-4 flex items-center gap-2 rounded-2xl border border-white/60 bg-white/70 px-3 py-2 text-sm text-slate-500 shadow-sm transition focus-within:border-cyan-200 focus-within:bg-white focus-within:ring-2 focus-within:ring-cyan-100">
        <Search className="h-4 w-4 shrink-0" />
        <input
          value={searchKeyword}
          onChange={(event) => setSearchKeyword(event.target.value)}
          className="min-w-0 flex-1 bg-transparent text-sm font-medium text-slate-700 outline-none placeholder:text-slate-400"
          placeholder="搜索会话"
          aria-label="搜索会话"
        />
      </div>
      <div className="scrollbar-thin mt-3 flex-1 space-y-2 overflow-y-auto pr-1">
        {filteredConversations.map((conversation) => (
          <button
            key={conversation.id}
            className={cn(
              "group relative flex w-full items-center gap-3 rounded-2xl border px-3 py-3 text-left transition",
              activeConversationId === conversation.id
                ? "qwen-accent-soft-bg border-violet-200 text-slate-950 shadow-sm"
                : "border-transparent bg-white/45 text-slate-600 hover:border-white hover:bg-white/75"
            )}
            onClick={() => onSelect(conversation.id)}
          >
            <span
              className={cn(
                "h-8 w-1 rounded-full",
                activeConversationId === conversation.id ? "qwen-accent-bar" : "bg-transparent"
              )}
            />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-medium">{conversation.title}</span>
              <span className="block truncate text-xs text-slate-400">{new Date(conversation.updatedAt).toLocaleString()}</span>
            </span>
            <span
              role="button"
              tabIndex={0}
              className="rounded-lg p-1.5 text-slate-400 opacity-0 transition hover:bg-red-50 hover:text-red-500 group-hover:opacity-100"
              onClick={(event) => {
                event.stopPropagation();
                onDelete(conversation.id);
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.stopPropagation();
                  onDelete(conversation.id);
                }
              }}
              aria-label="删除会话"
            >
              <Trash2 className="h-4 w-4" />
            </span>
          </button>
        ))}
        {filteredConversations.length === 0 && (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-white/50 px-4 py-6 text-center text-sm text-slate-400">
            没有找到匹配的会话
          </div>
        )}
      </div>
      <AccountMenu
        account={account}
        preferences={preferences}
        onPreferencesChange={onPreferencesChange}
        onAuthChange={onAuthChange}
        authPrompt={authPrompt}
        authPromptSignal={authPromptSignal}
      />
    </aside>
  );
}
