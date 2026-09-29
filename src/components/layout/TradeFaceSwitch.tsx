/**
 * `Facts | Review` — one instance, two faces (design Rev .110 `_Part Face`
 * kind="trade"): what happened (the Instance page) and was it right (Review ›
 * Trade review). Not a Reading / Method pair: no ⧉, no violet back-of-page —
 * both sides are doors to the same #NNN.
 */
import { Link } from 'react-router-dom'
import { cn } from '@/lib/utils'

const BTN = 'inline-flex h-6 items-center px-2.75 text-dense-label font-semibold leading-none whitespace-nowrap'

export function tradeFactsPath(instanceId: number): string {
  return `/trade/${instanceId}`
}

export function tradeReviewPath(instanceId: number, extra?: Record<string, string>): string {
  const qs = new URLSearchParams({ t: `#${instanceId}`, ...extra })
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
      <span className={cn(BTN, 'bg-[var(--sk-surface)] text-foreground shadow-[inset_0_-2px_0_var(--primary)]')}>
        {label}
      </span>
    ) : (
      <Link
        to={to}
        title={title}
        className={cn(BTN, 'text-muted-foreground no-underline hover:bg-[var(--sk-surface)] hover:text-foreground')}
      >
        {label}
      </Link>
    )
  return (
    <span
      role="group"
      aria-label="Facts or Review"
      className={cn(
        'inline-flex flex-none items-center overflow-hidden rounded-[8px] bg-[var(--mat-card-fill-hover)]',
        className,
      )}
    >
      {face('facts', 'Facts', tradeFactsPath(tradeId), 'What happened — path, every leg and roll, every fill, the ledger by leg.')}
      {face('review', 'Review', tradeReviewPath(tradeId), 'Was it right — against my own plan and the best the trade offered.')}
    </span>
  )
}
