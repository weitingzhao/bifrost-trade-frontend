import { fmtUsd } from '@/lib/format'
import { cn } from '@/lib/utils'
import { DiscoveryIconButton } from './DiscoveryIconButton'

export interface OdStickyTocProps {
  selectedSymbol: string
  selectedExpiration: string
  underlyingPrice: number | null
  compareCount: number
  onOpenCompare: () => void
}

export function OdStickyToc({
  selectedSymbol,
  selectedExpiration,
  underlyingPrice,
  compareCount,
  onOpenCompare,
}: OdStickyTocProps) {
  return (
    <div
      id="od-layer-context"
      className={cn(
        'static z-auto m-0 rounded-b-lg border-0 shadow-none',
        'px-3 py-2',
      )}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span
          className="text-sm font-semibold text-foreground"
          title="Current context"
        >
          {selectedSymbol.trim() || '—'}
          {selectedExpiration.trim() ? ` · ${selectedExpiration}` : ''}
          {underlyingPrice != null ? ` · ${fmtUsd(underlyingPrice)}` : ''}
        </span>
        <DiscoveryIconButton
          className="relative shrink-0"
          onClick={onOpenCompare}
          aria-label={`Open compare drawer (${compareCount} selected)`}
          title={`Open compare drawer (${compareCount} selected)`}
        >
          <svg
            viewBox="0 0 24 24"
            width="16"
            height="16"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
          >
            <path d="M6 4v16" />
            <path d="M18 4v16" />
            <path d="M9 7h6" />
            <path d="M9 12h6" />
            <path d="M9 17h6" />
          </svg>
          <span
            className="pointer-events-none absolute -top-1.5 -right-1.5 min-w-4 h-4 px-0.5 rounded-full bg-primary text-dense-caption leading-4 text-center text-primary-foreground border border-card font-mono tabular-nums"
            aria-hidden
          >
            {compareCount}
          </span>
        </DiscoveryIconButton>
      </div>
      <nav
        className="flex flex-wrap gap-x-3 gap-y-2 mt-2 pt-2 border-t border-border text-xs"
        aria-label="On this page"
      >
        <a href="#od-layer-1" className="text-primary hover:underline">
          1 · IV term
        </a>
        <a href="#od-layer-2" className="text-primary hover:underline">
          2 · Max pain
        </a>
        <a href="#od-layer-3" className="text-primary hover:underline">
          3 · Strike &amp; analytics
        </a>
        <a href="#od-layer-4" className="text-primary hover:underline">
          4 · Quotes &amp; contract
        </a>
      </nav>
    </div>
  )
}
