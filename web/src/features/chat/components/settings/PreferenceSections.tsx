"use client";

import type { ReactNode } from "react";
import { cn } from "@/src/shared/utils";
import type { UserPreferenceDTO } from "@/src/shared/types";

type PatchPreference = (next: Partial<UserPreferenceDTO>) => void;

export const selectClass = "w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none transition focus:border-violet-300 sm:w-auto";
export const inputClass = "w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-violet-300";

export function Toggle({ checked, onChange }: { checked: boolean; onChange: (checked: boolean) => void }) {
  return (
    <button
      type="button"
      aria-pressed={checked}
      onClick={() => onChange(!checked)}
      className={cn("relative h-7 w-12 rounded-full transition", checked ? "qwen-accent-solid" : "bg-slate-200")}
    >
      <span className={cn("absolute top-1 h-5 w-5 rounded-full bg-white shadow transition", checked ? "left-6" : "left-1")} />
    </button>
  );
}

export function Row({ title, description, children }: { title: string; description?: string; children: ReactNode }) {
  return (
    <div className="grid gap-3 border-b border-slate-100 py-5 sm:grid-cols-[1fr_auto] sm:items-center">
      <div>
        <div className="text-base font-semibold text-slate-950">{title}</div>
        {description && <div className="mt-1 max-w-xl text-sm leading-6 text-slate-500">{description}</div>}
      </div>
      <div className="justify-self-start sm:justify-self-end">{children}</div>
    </div>
  );
}

export function GeneralSettings({ preferences, patchPreference }: { preferences: UserPreferenceDTO; patchPreference: PatchPreference }) {
  return (
    <div>
      <Row title="外观">
        <select className={selectClass} value={preferences.theme} onChange={(event) => patchPreference({ theme: event.target.value as UserPreferenceDTO["theme"] })}>
          <option value="light">浅色</option>
          <option value="dark">深色</option>
        </select>
      </Row>
      <Row title="语言">
        <select className={selectClass} value={preferences.language} onChange={(event) => patchPreference({ language: event.target.value as UserPreferenceDTO["language"] })}>
          <option value="auto">自动检测</option>
          <option value="zh-CN">中文</option>
          <option value="en-US">英文</option>
        </select>
      </Row>
      <Row title="快速回答" description="开启后，模型会优先给出结论，再补充解释。">
        <Toggle checked={preferences.quickAnswer} onChange={(checked) => patchPreference({ quickAnswer: checked })} />
      </Row>
    </div>
  );
}

export function PersonalizationSettings({ preferences, patchPreference }: { preferences: UserPreferenceDTO; patchPreference: PatchPreference }) {
  return (
    <div className="space-y-8">
      <section>
        <h3 className="text-xl font-semibold text-slate-950">基本风格和语调</h3>
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <label className="space-y-2 text-sm font-medium text-slate-700">
            回复风格
            <select className={selectClass} value={preferences.tone} onChange={(event) => patchPreference({ tone: event.target.value as UserPreferenceDTO["tone"] })}>
              <option value="default">默认</option>
              <option value="concise">简洁直接</option>
              <option value="professional">专业严谨</option>
              <option value="friendly">自然友好</option>
            </select>
          </label>
          <label className="space-y-2 text-sm font-medium text-slate-700">
            温和体贴
            <select className={selectClass} value={preferences.warmth} onChange={(event) => patchPreference({ warmth: event.target.value as UserPreferenceDTO["warmth"] })}>
              <option value="default">默认</option>
              <option value="calm">冷静</option>
              <option value="warm">温和</option>
              <option value="direct">直接</option>
            </select>
          </label>
          <label className="space-y-2 text-sm font-medium text-slate-700">
            热情程度
            <select className={selectClass} value={preferences.enthusiasm} onChange={(event) => patchPreference({ enthusiasm: event.target.value as UserPreferenceDTO["enthusiasm"] })}>
              <option value="default">默认</option>
              <option value="low">低</option>
              <option value="medium">中</option>
              <option value="high">高</option>
            </select>
          </label>
          <label className="space-y-2 text-sm font-medium text-slate-700">
            表情符号
            <select className={selectClass} value={preferences.emojiStyle} onChange={(event) => patchPreference({ emojiStyle: event.target.value as UserPreferenceDTO["emojiStyle"] })}>
              <option value="default">默认</option>
              <option value="none">不用</option>
              <option value="minimal">少量</option>
            </select>
          </label>
        </div>
      </section>

      <section>
        <h3 className="text-xl font-semibold text-slate-950">关于你</h3>
        <div className="mt-4 space-y-4">
          <input className={inputClass} placeholder="昵称：希望千问怎么称呼你" value={preferences.nickname ?? ""} onChange={(event) => patchPreference({ nickname: event.target.value })} />
          <input className={inputClass} placeholder="职业或角色，例如产品经理、律师、开发者" value={preferences.occupation ?? ""} onChange={(event) => patchPreference({ occupation: event.target.value })} />
          <textarea className={cn(inputClass, "min-h-24 resize-none")} placeholder="你的详情：兴趣、价值观、长期项目、沟通偏好" value={preferences.details ?? ""} onChange={(event) => patchPreference({ details: event.target.value })} />
          <textarea className={cn(inputClass, "min-h-28 resize-none")} placeholder="自定义指令：希望模型长期遵守的回答方式" value={preferences.customInstructions ?? ""} onChange={(event) => patchPreference({ customInstructions: event.target.value })} />
        </div>
      </section>
    </div>
  );
}
