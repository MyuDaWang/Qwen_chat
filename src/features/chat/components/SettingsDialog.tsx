"use client";

import type { FormEvent } from "react";
import { useEffect, useMemo, useState } from "react";
import { Bell, Brain, Database, Palette, Settings, Shield, Trash2, UserRound, X } from "lucide-react";
import { GeneralSettings, inputClass, PersonalizationSettings, Row, Toggle } from "@/src/features/chat/components/settings/PreferenceSections";
import { Button } from "@/src/shared/ui/button";
import { cn } from "@/src/shared/utils";
import type { UserMemoryDTO, UserPreferenceDTO } from "@/src/shared/types";

type Preference = UserPreferenceDTO;
type Memory = UserMemoryDTO;

type Props = {
  open: boolean;
  onClose: () => void;
  currentPreferences?: Preference | null;
  onPreferencesChange?: (preferences: Preference) => void;
};

const tabs = [
  { id: "general", label: "常规", icon: Settings },
  { id: "personalization", label: "个性化", icon: UserRound },
  { id: "memory", label: "记忆", icon: Brain },
  { id: "data", label: "数据管理", icon: Database },
  { id: "security", label: "安全", icon: Shield }
] as const;

export function SettingsDialog({ open, onClose, currentPreferences, onPreferencesChange }: Props) {
  const [activeTab, setActiveTab] = useState<(typeof tabs)[number]["id"]>("general");
  const [preferences, setPreferences] = useState<Preference | null>(null);
  const [memories, setMemories] = useState<Memory[]>([]);
  const [newMemory, setNewMemory] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const enabledMemories = useMemo(() => memories.filter((memory) => memory.enabled), [memories]);

  useEffect(() => {
    if (!open) return;
    setPreferences(currentPreferences ?? null);
  }, [currentPreferences, open]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setError(null);
    setSaved(false);
    fetch("/api/settings", { cache: "no-store" })
      .then((response) => response.json())
      .then((json) => {
        if (cancelled) return;
        setPreferences(json.preferences);
        if (json.preferences) onPreferencesChange?.(json.preferences);
        setMemories(json.memories ?? []);
      })
      .catch(() => {
        if (!cancelled) setError("设置加载失败");
      });
    return () => {
      cancelled = true;
    };
  }, [onPreferencesChange, open]);

  if (!open) return null;

  function patchPreference(next: Partial<Preference>) {
    setPreferences((current) => (current ? { ...current, ...next } : current));
  }

  async function savePreferences() {
    if (!preferences) return;
    setBusy(true);
    setError(null);
    setSaved(false);
    try {
      const response = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(preferences)
      });
      const json = await response.json().catch(() => null);
      if (!response.ok) throw new Error(json?.error?.message ?? "保存失败");
      setPreferences(json.preferences);
      if (json.preferences) onPreferencesChange?.(json.preferences);
      setSaved(true);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "保存失败");
    } finally {
      setBusy(false);
    }
  }

  async function addMemory(event: FormEvent) {
    event.preventDefault();
    if (!newMemory.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const response = await fetch("/api/memories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: newMemory.trim() })
      });
      const json = await response.json().catch(() => null);
      if (!response.ok) throw new Error(json?.error?.message ?? "添加记忆失败");
      setMemories((current) => [json.memory, ...current]);
      setNewMemory("");
    } catch (memoryError) {
      setError(memoryError instanceof Error ? memoryError.message : "添加记忆失败");
    } finally {
      setBusy(false);
    }
  }

  async function updateMemory(memory: Memory, patch: Partial<Memory>) {
    const optimistic = { ...memory, ...patch };
    setMemories((current) => current.map((item) => (item.id === memory.id ? optimistic : item)));
    const response = await fetch(`/api/memories/${memory.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch)
    });
    if (!response.ok) {
      setMemories((current) => current.map((item) => (item.id === memory.id ? memory : item)));
      setError("更新记忆失败");
    }
  }

  async function removeMemory(memory: Memory) {
    setMemories((current) => current.filter((item) => item.id !== memory.id));
    const response = await fetch(`/api/memories/${memory.id}`, { method: "DELETE" });
    if (!response.ok) {
      setMemories((current) => [memory, ...current]);
      setError("删除记忆失败");
    }
  }

  return (
    <div className="fixed inset-0 z-[200] bg-slate-950/20 p-0 backdrop-blur-sm sm:p-4">
      <div className="mx-auto flex h-full max-h-none w-full max-w-5xl flex-col overflow-hidden border border-white/80 bg-white shadow-[0_40px_120px_rgba(15,23,42,0.25)] sm:rounded-[28px] md:max-h-[860px]">
        <header className="shrink-0 border-b border-slate-100 bg-slate-50/90 p-3 sm:p-4">
          <div className="mb-3 flex items-center gap-3">
            <button className="grid h-10 w-10 shrink-0 place-items-center rounded-full hover:bg-white" onClick={onClose} aria-label="关闭设置">
              <X className="h-6 w-6" />
            </button>
            <div className="min-w-0">
              <div className="text-lg font-semibold text-slate-950">设置</div>
              <div className="truncate text-xs text-slate-500">个性化、记忆和数据</div>
            </div>
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  className={cn(
                    "flex shrink-0 items-center gap-2 rounded-2xl px-4 py-3 text-left text-sm font-medium text-slate-700 transition sm:text-base",
                    activeTab === tab.id ? "bg-white text-slate-950 shadow-sm" : "hover:bg-white/70"
                  )}
                  onClick={() => setActiveTab(tab.id)}
                >
                  <Icon className="h-5 w-5 shrink-0" />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </header>

        <section className="min-h-0 min-w-0 flex-1 overflow-y-auto px-4 py-5 sm:px-6 md:px-10 md:py-8">
          <div className="mb-5 border-b border-slate-200 pb-4 md:mb-8 md:pb-5">
            <h2 className="text-2xl font-semibold tracking-normal text-slate-950 md:text-3xl">
              {tabs.find((tab) => tab.id === activeTab)?.label}
            </h2>
          </div>

          {!preferences ? (
            <div className="rounded-3xl bg-slate-50 p-6 text-slate-500">正在加载设置...</div>
          ) : (
            <>
              {activeTab === "general" && <GeneralSettings preferences={preferences} patchPreference={patchPreference} />}

              {activeTab === "personalization" && <PersonalizationSettings preferences={preferences} patchPreference={patchPreference} />}

              {activeTab === "memory" && (
                <div>
                  <Row title="启用记忆" description="开启后，模型会读取下方启用的记忆，并在你明确说“记住...”时保存新记忆。">
                    <Toggle checked={preferences.memoryEnabled} onChange={(checked) => patchPreference({ memoryEnabled: checked })} />
                  </Row>
                  <div className="mt-6 rounded-3xl border border-slate-100 bg-slate-50/70 p-5">
                    <div className="mb-4 flex items-center justify-between">
                      <div>
                        <h3 className="text-lg font-semibold text-slate-950">记忆摘要</h3>
                        <p className="mt-1 text-sm text-slate-500">当前启用 {enabledMemories.length} 条，会进入下一次模型请求。</p>
                      </div>
                      <Brain className="h-5 w-5 text-violet-500" />
                    </div>
                    <form className="grid gap-2 sm:grid-cols-[1fr_auto]" onSubmit={addMemory}>
                      <input className={inputClass} placeholder="添加一条需要长期记住的信息" value={newMemory} onChange={(event) => setNewMemory(event.target.value)} />
                      <Button variant="gradient" disabled={busy || !newMemory.trim()}>添加</Button>
                    </form>
                    <div className="mt-4 space-y-2">
                      {memories.length === 0 && <div className="rounded-2xl bg-white p-4 text-sm text-slate-500">还没有记忆。你可以手动添加，也可以在聊天中说“请记住：...”</div>}
                      {memories.map((memory) => (
                        <div key={memory.id} className="flex items-start gap-3 rounded-2xl bg-white p-4 shadow-sm">
                          <Toggle checked={memory.enabled} onChange={(checked) => updateMemory(memory, { enabled: checked })} />
                          <div className="min-w-0 flex-1">
                            <textarea
                              key={`${memory.id}-${memory.updatedAt}`}
                              className="min-h-16 w-full resize-none rounded-xl border border-transparent bg-transparent text-sm leading-6 text-slate-800 outline-none focus:border-slate-200 focus:bg-slate-50"
                              defaultValue={memory.content}
                              onBlur={(event) => {
                                const next = event.target.value.trim();
                                if (next && next !== memory.content) updateMemory(memory, { content: next });
                              }}
                            />
                            <div className="text-xs text-slate-400">{memory.source === "chat" ? "聊天自动记忆" : "手动添加"} · {new Date(memory.updatedAt).toLocaleString()}</div>
                          </div>
                          <button className="rounded-xl p-2 text-slate-400 hover:bg-red-50 hover:text-red-500" onClick={() => removeMemory(memory)} aria-label="删除记忆">
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {activeTab === "data" && (
                <div className="space-y-4">
                  <div className="rounded-3xl border border-slate-100 bg-slate-50 p-5">
                    <div className="flex items-center gap-3 text-lg font-semibold text-slate-950">
                      <Database className="h-5 w-5 text-cyan-600" />
                      本地数据
                    </div>
                    <p className="mt-3 text-sm leading-6 text-slate-500">会话、设置和记忆保存在本地 SQLite。上传的图片和附件保存在本地 uploads 目录或桌面 App 的应用数据目录。</p>
                  </div>
                  <div className="rounded-3xl border border-slate-100 bg-slate-50 p-5">
                    <div className="flex items-center gap-3 text-lg font-semibold text-slate-950">
                      <Bell className="h-5 w-5 text-violet-600" />
                      数据边界
                    </div>
                    <p className="mt-3 text-sm leading-6 text-slate-500">启用记忆时，只会把已启用的记忆摘要和个性化设置发送给模型，不会无限发送全部历史。</p>
                  </div>
                </div>
              )}

              {activeTab === "security" && (
                <div className="rounded-3xl border border-slate-100 bg-slate-50 p-5">
                  <div className="flex items-center gap-3 text-lg font-semibold text-slate-950">
                    <Shield className="h-5 w-5 text-blue-600" />
                    安全
                  </div>
                  <p className="mt-3 text-sm leading-6 text-slate-500">API Key 只在服务端或本机应用配置目录读取，不进入前端 bundle。Markdown 渲染经过 sanitize，上传文件会限制类型和大小。</p>
                </div>
              )}

              <div className="sticky bottom-0 mt-8 flex flex-wrap items-center justify-end gap-3 border-t border-slate-100 bg-white/90 py-4 backdrop-blur">
                {error && <span className="w-full rounded-full bg-red-50 px-3 py-1 text-sm text-red-600 sm:mr-auto sm:w-auto">{error}</span>}
                {saved && <span className="w-full rounded-full bg-cyan-50 px-3 py-1 text-sm text-cyan-700 sm:mr-auto sm:w-auto">已保存</span>}
                <Button variant="secondary" onClick={onClose}>关闭</Button>
                <Button variant="gradient" disabled={busy} onClick={savePreferences}>
                  <Palette className="h-4 w-4" />
                  保存设置
                </Button>
              </div>
            </>
          )}
        </section>
      </div>
    </div>
  );
}
