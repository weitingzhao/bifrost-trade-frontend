/**
 * BifrostLogo — the app mark.
 *
 * Design language:
 *   • Two concentric arcs  → Bifrost, the Norse rainbow bridge
 *   • V shape beneath      → Long straddle payoff (what this system trades)
 *   • Together             → A bridge arch over a valley; arcs meet the V at center
 *   • Subtle glow filter   → The shimmering quality of the Bifrost
 */

interface BifrostLogoProps {
  /** Overall size of the containing square (default 28) */
  size?: number
  className?: string
}

export function BifrostLogoMark({ size = 28, className }: BifrostLogoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="Bifrost Trade logo"
    >
      <defs>
        <filter id="bf-glow" x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="1.1" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <linearGradient id="bf-arc-grad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%"   stopColor="#6ee7b7" stopOpacity="0.7" />
          <stop offset="40%"  stopColor="#a3e635" stopOpacity="1" />
          <stop offset="100%" stopColor="#7dd3fc" stopOpacity="0.7" />
        </linearGradient>
      </defs>

      {/* ── Background tile ── */}
      <rect x="1" y="1" width="30" height="30" rx="8" fill="#111720" />
      <rect x="1" y="1" width="30" height="30" rx="8"
        fill="none" stroke="#2a313c" strokeWidth="0.75" />

      {/* ── Outer arc — Bifrost bridge (gradient, glowing) ── */}
      <path
        d="M4.5 22.5 Q16 3.5 27.5 22.5"
        stroke="url(#bf-arc-grad)"
        strokeWidth="2.4"
        strokeLinecap="round"
        filter="url(#bf-glow)"
      />

      {/* ── Inner arc — shimmer / depth ── */}
      <path
        d="M8 22.5 Q16 10 24 22.5"
        stroke="#a3e635"
        strokeWidth="1.3"
        strokeLinecap="round"
        opacity="0.38"
      />

      {/* ── Straddle V — long-volatility payoff meets the bridge ── */}
      <path
        d="M10.5 28 L16 22.5 L21.5 28"
        stroke="url(#bf-arc-grad)"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* ── Center apex dot — ATM strike (gamma scalping focus point) ── */}
      <circle cx="16" cy="22.5" r="1.5" fill="#a3e635" filter="url(#bf-glow)" />
    </svg>
  )
}

/** Full lockup: mark + wordmark, for expanded sidebar header */
export function BifrostLogoFull({ className }: { className?: string }) {
  return (
    <div className={`flex items-center gap-2.5 ${className ?? ''}`}>
      <BifrostLogoMark size={30} />
      <div className="flex flex-col leading-tight">
        <span className="text-[13px] font-bold tracking-tight text-sidebar-primary">
          Bifrost
        </span>
        <span className="text-[9px] font-semibold uppercase tracking-[0.14em] text-sidebar-foreground/40 -mt-0.5">
          Trade
        </span>
      </div>
    </div>
  )
}
