"use client";

import { Check, ChevronDown, ImageIcon, Lock, Sparkles } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Button } from "@/src/shared/ui/button";
import { chatModels, type ChatModelId } from "@/src/ai/models";
import { cn } from "@/src/shared/utils";

type Props = {
  selectedModelId: ChatModelId;
  modelAccess?: Partial<Record<ChatModelId, { allowed: boolean; requiredPlanName: string }>>;
  disabled?: boolean;
  onSelect: (modelId: ChatModelId) => void;
};

export function ModelSelector({ selectedModelId, modelAccess, disabled, onSelect }: Props) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [panelStyle, setPanelStyle] = useState({ top: 80, right: 24 });
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const selected = chatModels.find((model) => model.id === selectedModelId) ?? chatModels[0];

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    function updatePanelPosition() {
      const rect = wrapperRef.current?.getBoundingClientRect();
      if (!rect) return;
      setPanelStyle({
        top: Math.round(rect.bottom + 12),
        right: Math.max(24, Math.round(window.innerWidth - rect.right))
      });
    }
    if (!open) return;
    updatePanelPosition();
    window.addEventListener("resize", updatePanelPosition);
    window.addEventListener("scroll", updatePanelPosition, true);
    return () => {
      window.removeEventListener("resize", updatePanelPosition);
      window.removeEventListener("scroll", updatePanelPosition, true);
    };
  }, [open]);

  useEffect(() => {
    function onPointerDown(event: PointerEvent) {
      const target = event.target as Node;
      if (wrapperRef.current?.contains(target)) return;
      if (target instanceof Element && target.closest("[data-model-selector-panel='true']")) return;
      setOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, []);

  return (
    <div className="relative" ref={wrapperRef}>
      <Button
        type="button"
        variant="secondary"
        className="h-9 rounded-full border-white/70 bg-white/75 px-3 text-xs"
        disabled={disabled}
        onClick={() => setOpen((current) => !current)}
        aria-expanded={open}
      >
        <Sparkles className="h-3.5 w-3.5 text-violet-500" />
        <span className="hidden max-w-36 truncate sm:inline">{selected.name}</span>
        <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
      </Button>

      {mounted && open &&
        createPortal(
          <>
            <button
              className="fixed inset-0 z-[80] cursor-default bg-slate-900/10 backdrop-blur-[1px]"
              aria-label="关闭模型选择器"
              onClick={() => setOpen(false)}
            />
            <div
              data-model-selector-panel="true"
              className="fixed z-[90] w-[min(460px,calc(100vw-32px))] overflow-hidden rounded-3xl border border-white/80 bg-white/95 shadow-[0_28px_90px_rgba(79,70,229,0.25)] backdrop-blur-2xl"
              style={{
                top: panelStyle.top,
                right: panelStyle.right,
                maxHeight: `min(620px, calc(100vh - ${panelStyle.top + 16}px))`
              }}
            >
          <div className="border-b border-slate-100 bg-gradient-to-r from-blue-50 via-violet-50 to-cyan-50 px-4 py-3">
            <div className="text-sm font-semibold text-slate-950">选择模型</div>
            <div className="mt-1 text-xs text-slate-500">选择本次对话使用的模型。</div>
          </div>
          <div className="max-h-[calc(min(620px,100vh-120px)-72px)] space-y-2 overflow-y-auto p-3">
            {chatModels.map((model) => {
              const active = model.id === selectedModelId;
              const access = modelAccess?.[model.id];
              const locked = access ? !access.allowed : false;
              return (
                <button
                  key={model.id}
                  disabled={locked}
                  className={cn(
                    "w-full rounded-2xl border p-3 text-left transition",
                    locked && "cursor-not-allowed opacity-55",
                    active ? "border-violet-200 bg-violet-50/80 shadow-sm" : "border-slate-100 bg-white hover:border-cyan-200 hover:bg-cyan-50/40"
                  )}
                  onClick={() => {
                    if (locked) return;
                    onSelect(model.id);
                    setOpen(false);
                  }}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-semibold text-slate-950">{model.name}</span>
                        {model.supportsImages && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-cyan-50 px-2 py-0.5 text-[11px] text-cyan-700">
                            <ImageIcon className="h-3 w-3" />
                            图片
                          </span>
                        )}
                        {locked && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] text-slate-600">
                            <Lock className="h-3 w-3" />
                            需要{access?.requiredPlanName ?? "会员"}
                          </span>
                        )}
                      </div>
                      <p className="mt-1 text-xs leading-5 text-slate-500">{model.description}</p>
                    </div>
                    {active && <Check className="mt-1 h-4 w-4 shrink-0 text-violet-600" />}
                  </div>
                </button>
              );
            })}
          </div>
            </div>
          </>,
          document.body
        )}
    </div>
  );
}
