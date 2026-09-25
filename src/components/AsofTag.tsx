/**
 * The asof badge and the quality flag — two halves of one component (contract
 * §2.1, `design/trade/_Part AsofTag.dc.html`).
 *
 * It renders a judgement and links back to where it was made; it decides
 * nothing. Both halves are links, because a verdict you cannot open is one you
 * have to take on trust. No session is grey, never red: an unreported session
 * is not a failed one.
 */
import { useEffect, useId } from 'react'
import { Link } from 'react-router-dom'
import { asofHolding, type AsofFlag } from '@/lib/asofTag'
import { asofRegistry } from '@/lib/copilotPageContext'
import { cn } from '@/lib/utils'

export interface AsofTagProps {
  /** The session the view shows, `YYYY-MM-DD`; null when none was reported. */
  asof: string | null
  /** The session that should have landed — only when a service reports it. */
  expected?: string | null
  /** Sessions behind — only when a service reports it. */
  sessions?: number | null
  flag?: AsofFlag | null
  /** Who judged: the service, by name. */
  judgedBy: string
  /** Where the judgement lives. */
  href: string
  className?: string
}

// Rev .67: no frame — the state is the fill (neutral ink 8%, holding amber
// 20%), radius 8.
const CHIP =
  'inline-flex h-6 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-[8px] border border-transparent px-2 font-mono text-dense-micro tracking-wide hover:brightness-125'

export function AsofTag({ asof, expected, sessions, flag, judgedBy, href, className }: AsofTagProps) {
  const behind = asofHolding(asof, expected, sessions)
  const holding = behind > 0

  // The tag is the page's statement of which session it shows, so it is also
  // the source the Copilot's page context reads the snapshot date from (§11.0).
  const registryId = useId()
  useEffect(() => {
    asofRegistry.publish(registryId, asof)
    return () => asofRegistry.publish(registryId, null)
  }, [registryId, asof])

  const asofTitle = !asof
    ? `No session reported for this view. Unknown is not the same as stale — open ${judgedBy}'s page to see why.`
    : holding
      ? `Holding session ${asof}${expected ? ` — ${expected} never landed` : ''} · ${behind} session${behind === 1 ? '' : 's'} behind · judged by ${judgedBy}`
      : `Session ${asof} · judged by ${judgedBy} · click to open where it was judged`

  return (
    <span className={cn('inline-flex min-w-0 items-center gap-2', className)}>
      <Link
        to={href}
        title={asofTitle}
        className={cn(
          CHIP,
          holding ? 'bg-warning/20 text-warning' : 'bg-[var(--mat-btn-fill)] text-muted-foreground',
        )}
      >
        ASOF {asof ?? '—'}
        {holding ? ' · HOLDING' : ''}
      </Link>
      {flag ? (
        <Link
          to={href}
          title={`${flag.detail} · judged by ${judgedBy} · click to open where it was judged`}
          className={cn(CHIP, 'bg-[var(--mat-btn-fill)]', flag.tone === 'warning' ? 'text-warning' : 'text-muted-foreground')}
        >
          ⚑ {flag.flag}
          <span className="font-sans tracking-normal text-muted-foreground">· judged by {judgedBy}</span>
        </Link>
      ) : null}
    </span>
  )
}
