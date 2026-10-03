/**
 * `Facts | Review` — one instance, two faces (design Rev .110 `_Part Face`
 * kind="trade"): what happened (the Instance page) and was it right (Review ›
 * Trade review). Not a Reading / Method pair: no ⧉, no violet back-of-page —
 * both sides are doors to the same #NNN.
 */
import { Link } from 'react-router-dom'
import { cn } from '@/lib/utils'

// Rev .142: a capsule segmented control, the side you are on a raised glass pill.
const BTN =
  'inline-flex h-[22px] items-center rounded-full px-3 text-xs font-semibold leading-none whitespace-nowrap transition-colors active:[filter:var(--press)]'

export function tradeFactsPath(tradeId: number): string {
  return `/trade/${tradeId}`
}

export function tradeReviewPath(tradeId: number, extra?: Record<string, string>): string {
  const qs = new URLSearchParams({ t: `#${tradeId}`, ...extra })
  return `/review/trade?${qs.toString()}`
}

export function TradeFaceSwitch({
  tradeId,
  side,
  className,
}: {
  tradeId: number
  side: 'facts' | 'review'
  className?: string
}) {
  const face = (which: 'facts' | 'review', label: string, to: string, title: string) =>
    which === side ? (
      <span
        className={cn(
          BTN,
          'bg-[color-mix(in_srgb,var(--foreground)_15%,transparent)] text-foreground shadow-[var(--glass-lens),0_1px_2px_rgba(0,0,0,0.22)]',
        )}
      >
        {label}
      </span>
    ) : (
      <Link
        to={to}
        title={title}
        className={cn(BTN, 'text-[var(--sk-mute2)] no-underline hover:text-foreground')}
      >
        {label}
      </Link>
    )
  return (
    <span
      role="group"
      aria-label="Facts or Review"
      className={cn(
        'inline-flex flex-none items-center gap-0.5 overflow-hidden rounded-full bg-[color-mix(in_srgb,var(--foreground)_7%,transparent)] p-0.5',
        className,
      )}
    >
      {face('facts', 'Facts', tradeFactsPath(tradeId), 'What happened — path, every leg and roll, every fill, the ledger by leg.')}
      {face('review', 'Review', tradeReviewPath(tradeId), 'Was it right — against my own plan and the best the trade offered.')}
    </span>
  )
}
