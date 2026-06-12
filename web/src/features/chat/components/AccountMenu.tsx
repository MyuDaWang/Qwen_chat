"use client";

import { FormEvent, useState } from "react";
import { ChevronDown, Crown, LogOut, Settings, ShieldCheck, UserRound } from "lucide-react";
import { SettingsDialog } from "@/src/features/chat/components/SettingsDialog";
import { Button } from "@/src/shared/ui/button";
import { cn } from "@/src/shared/utils";
import type { UserPreferenceDTO } from "@/src/shared/types";

type Account = {
  customerId: string;
  name: string;
  planName: string;
  authenticated: boolean;
};

type Props = {
  account?: Account;
  onAuthChange: () => void;
  preferences?: UserPreferenceDTO | null;
  onPreferencesChange?: (preferences: UserPreferenceDTO) => void;
};

export function AccountMenu({ account, onAuthChange, preferences, onPreferencesChange }: Props) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const authenticated = account?.authenticated ?? false;

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(mode === "login" ? "/api/auth/login" : "/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(mode === "login" ? { email, password } : { email, password, name })
      });
      const json = await response.json().catch(() => null);
      if (!response.ok) throw new Error(json?.error?.message ?? "操作失败");
      setOpen(false);
      setEmail("");
      setName("");
      setPassword("");
      onAuthChange();
    } catch (authError) {
      setError(authError instanceof Error ? authError.message : "操作失败");
    } finally {
      setBusy(false);
    }
  }

  async function logout() {
    setBusy(true);
    await fetch("/api/auth/logout", { method: "POST" }).catch(() => undefined);
    setBusy(false);
    setOpen(false);
    onAuthChange();
  }

  async function updatePlan(plan: "free" | "pro" | "enterprise") {
    setBusy(true);
    setError(null);
    try {
      const response = await fetch("/api/account/plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan })
      });
      const json = await response.json().catch(() => null);
      if (!response.ok) throw new Error(json?.error?.message ?? "更新会员状态失败");
      onAuthChange();
    } catch (planError) {
      setError(planError instanceof Error ? planError.message : "更新会员状态失败");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="relative mt-3">
      <button
        className="flex w-full items-center gap-3 rounded-2xl border border-white/70 bg-white/65 p-3 text-left shadow-sm transition hover:bg-white"
        onClick={() => setOpen((current) => !current)}
      >
        <span className="qwen-gradient-br grid h-10 w-10 place-items-center rounded-full text-white">
          <UserRound className="h-5 w-5" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-semibold text-slate-950">{authenticated ? account?.name : "登录 / 注册"}</span>
          <span className="block truncate text-xs text-slate-500">{authenticated ? account?.planName : "使用账号保存个人会话"}</span>
        </span>
        <ChevronDown className={cn("h-4 w-4 text-slate-400 transition", open && "rotate-180")} />
      </button>

      {open && (
        <div className="absolute bottom-[68px] left-0 z-[80] w-full overflow-hidden rounded-3xl border border-white/80 bg-white/95 shadow-[0_24px_80px_rgba(79,70,229,0.22)] backdrop-blur-2xl">
          {authenticated ? (
            <div className="p-4">
              <div className="flex items-start gap-3">
                <div className="grid h-11 w-11 place-items-center rounded-2xl bg-violet-50 text-violet-600">
                  <ShieldCheck className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold text-slate-950">{account?.name}</div>
                  <div className="mt-1 truncate text-xs text-slate-500">{account?.customerId}</div>
                  <div className="mt-2 inline-flex rounded-full bg-cyan-50 px-2 py-1 text-xs text-cyan-700">{account?.planName}</div>
                </div>
              </div>
              <div className="mt-4 rounded-2xl bg-slate-50 px-3 py-2 text-xs leading-5 text-slate-600">会员及以上账号可使用 Qwen 3.7 Max。当前为本地演示配置，后续可接支付或后台会员系统。</div>
              <Button
                className="mt-3 w-full justify-center"
                variant="secondary"
                disabled={busy}
                onClick={() => {
                  setOpen(false);
                  setSettingsOpen(true);
                }}
              >
                <Settings className="h-4 w-4" />
                设置与记忆
              </Button>
              {account?.planName === "普通用户" && (
                <Button className="mt-3 w-full justify-center" variant="gradient" disabled={busy} onClick={() => updatePlan("pro")}>
                  <Crown className="h-4 w-4" />
                  升级为会员
                </Button>
              )}
              {account?.planName === "会员" && (
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <Button className="justify-center" variant="secondary" disabled={busy} onClick={() => updatePlan("free")}>
                    降为普通
                  </Button>
                  <Button className="justify-center" variant="secondary" disabled={busy} onClick={() => updatePlan("enterprise")}>
                    <Crown className="h-4 w-4" />
                    企业会员
                  </Button>
                </div>
              )}
              {account?.planName === "企业会员" && (
                <Button className="mt-3 w-full justify-center" variant="secondary" disabled={busy} onClick={() => updatePlan("free")}>
                  降级为普通用户
                </Button>
              )}
              {error && <div className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-xs text-red-600">{error}</div>}
              <Button className="mt-3 w-full justify-center" variant="secondary" disabled={busy} onClick={logout}>
                <LogOut className="h-4 w-4" />
                退出登录
              </Button>
            </div>
          ) : (
            <form className="space-y-3 p-4" onSubmit={submit}>
              <div className="grid grid-cols-2 rounded-2xl bg-slate-100 p-1 text-sm">
                <button type="button" className={cn("rounded-xl py-2", mode === "login" && "bg-white shadow-sm")} onClick={() => setMode("login")}>
                  登录
                </button>
                <button type="button" className={cn("rounded-xl py-2", mode === "register" && "bg-white shadow-sm")} onClick={() => setMode("register")}>
                  注册
                </button>
              </div>
              {mode === "register" && (
                <input className="w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-violet-300" placeholder="昵称" value={name} onChange={(event) => setName(event.target.value)} />
              )}
              <input className="w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-violet-300" placeholder="邮箱" value={email} onChange={(event) => setEmail(event.target.value)} />
              <input className="w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-violet-300" placeholder="密码，至少 8 位" type="password" value={password} onChange={(event) => setPassword(event.target.value)} />
              {error && <div className="rounded-xl bg-red-50 px-3 py-2 text-xs text-red-600">{error}</div>}
              <Button
                type="button"
                className="w-full justify-center"
                variant="secondary"
                disabled={busy}
                onClick={() => {
                  setOpen(false);
                  setSettingsOpen(true);
                }}
              >
                <Settings className="h-4 w-4" />
                设置与记忆
              </Button>
              <Button className="w-full justify-center" variant="gradient" disabled={busy}>
                {busy ? "处理中" : mode === "login" ? "登录" : "注册并登录"}
              </Button>
            </form>
          )}
        </div>
      )}
      <SettingsDialog
        open={settingsOpen}
        currentPreferences={preferences}
        onPreferencesChange={onPreferencesChange}
        onClose={() => setSettingsOpen(false)}
      />
    </div>
  );
}
