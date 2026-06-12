export function BrandLogo() {
  return (
    <div className="flex items-center gap-3">
      <div className="relative grid h-10 w-10 shrink-0 place-items-center rounded-[14px] border border-white/80 bg-white shadow-[0_14px_30px_rgba(99,102,241,0.18)]">
        <svg className="h-7 w-7" width="28" height="28" viewBox="0 0 64 64" aria-hidden="true">
          <defs>
            <linearGradient id="qwenMarkGradient" x1="8" x2="56" y1="8" y2="56" gradientUnits="userSpaceOnUse">
              <stop stopColor="#3B82F6" />
              <stop offset="0.48" stopColor="#7C3AED" />
              <stop offset="1" stopColor="#A855F7" />
            </linearGradient>
            <linearGradient id="qwenMarkHighlight" x1="18" x2="47" y1="12" y2="46" gradientUnits="userSpaceOnUse">
              <stop stopColor="#C4B5FD" />
              <stop offset="1" stopColor="#22D3EE" />
            </linearGradient>
          </defs>
          <g fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="8">
            <path d="M31 8h16l7 12-8 13H31L23 20z" stroke="url(#qwenMarkGradient)" />
            <path d="M17 15h18l8 13-8 13H18L10 28z" stroke="url(#qwenMarkGradient)" />
            <path d="M28 29h18l8 13-8 14H29l-8-14z" stroke="url(#qwenMarkGradient)" />
            <path d="M19 44 10 28 17 15" stroke="url(#qwenMarkHighlight)" />
            <path d="M46 33 54 20 47 8" stroke="url(#qwenMarkHighlight)" />
            <path d="M29 56 21 42 28 29" stroke="url(#qwenMarkHighlight)" />
          </g>
        </svg>
        <span className="absolute -right-0.5 top-1.5 h-2 w-2 rounded-full bg-cyan-300 shadow-[0_0_14px_rgba(45,212,191,0.75)]" />
      </div>
      <div className="min-w-0">
        <div className="truncate text-[15px] font-semibold leading-5 text-slate-950">通义千问</div>
        <div className="truncate text-xs leading-5 text-slate-500">Qwen 客户端</div>
      </div>
    </div>
  );
}
