/**
 * The session and the Alerts count — the menu bar's clock, the notification
 * centre's door (design Rev .60 §4 and §7). The last item on the bar, and the
 * one that never collapses.
 *
 * - **The session is an icon**: sunrise PRE · sun RTH · sunset POST · moon
 *   CLOSED; the regular session green, the extended ones sky, closed grey.
 * - **Then the time to the next boundary**, compact — `6h00` · `42m` ·
 *   `2d14h`; amber in the last half hour of the regular session.
 * - **Then Alerts**, a red count when there is anything, grey when not.
 *
 * Exchange holidays are not modelled; the tip says what the countdown is to.
 */
import { useEffect, useState } from 'react'
import { AlertsPopover } from '@/components/MessageCenter/AlertsPopover'
import type { AlertGroup, AlertsSummary } from '@/hooks/useAlerts'
import { menubarSession, type MenubarPhase } from '@/lib/marketSession'
import { cn } from '@/lib/utils'
import { MenubarTip } from './MenubarTip'
import css from './menubar.module.css'

const PHASE_INK: Record<MenubarPhase, string> = {
  RTH: 'var(--color-lamp-green)',
  PRE: 'var(--sk-contract)',
  POST: 'var(--sk-contract)',
  CLOSED: 'var(--sk-faint)',
}

const PHASE_ICON: Record<MenubarPhase, React.ReactNode> = {
  PRE: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
      <path d="M7 17a5 5 0 0 1 10 0" />
      <path d="M3 20h18M12 3v5M9.5 5.5 12 3l2.5 2.5M4.9 11.1l1.4 1.4M19.1 11.1l-1.4 1.4" />
    </svg>
  ),
  RTH: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M5.3 18.7l1.4-1.4M17.3 6.7l1.4-1.4" />
    </svg>
  ),
  POST: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
      <path d="M7 17a5 5 0 0 1 10 0" />
      <path d="M3 20h18M12 8V3M9.5 5.5 12 8l2.5-2.5M4.9 11.1l1.4 1.4M19.1 11.1l-1.4 1.4" />
    </svg>
  ),
  CLOSED: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" aria-hidden>
      <path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5Z" />
    </svg>
  ),
}

const PHASE_NAME: Record<MenubarPhase, string> = {
  PRE: 'Pre-market',
  RTH: 'Regular session',
  POST: 'After hours',
  CLOSED: 'Closed',
}

/** The clock, a second at a time while someone might read the seconds — every 15s otherwise. */
function useNow(fast: boolean): Date {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), fast ? 1_000 : 15_000)
    return () => window.clearInterval(id)
  }, [fast])
  return now
}

export function SessionClock({
  groups,
  alerts,
  onDismissAll,
}: {
  groups: AlertGroup[]
  alerts: AlertsSummary
  onDismissAll: () => void
}) {
  const [open, setOpen] = useState(false)
  const s = menubarSession(useNow(open))
  const n = alerts.count
  const tip = [
    `${PHASE_NAME[s.phase]} · ${s.left} ${s.toWhat} · now ${s.clock} ET`,
    `Alerts ${n}${alerts.incomplete ? `+? — ${alerts.unreachable.join(', ')} unreachable, the count may be short` : ''}`,
    'Exchange holidays are not modelled.',
  ].join('\n')

  return (
    <AlertsPopover groups={groups} count={n} onDismissAll={onDismissAll} contentClassName={css.pop} onOpenChange={setOpen}>
      <MenubarTip tip={tip}>
        <button type="button" className={cn(css.item, 'gap-[7px]')} aria-label="Session and alerts">
          <span className="inline-flex" style={{ color: PHASE_INK[s.phase] }}>
            {PHASE_ICON[s.phase]}
          </span>
          <span className={cn(css.mono, css.fs12)} style={{ color: s.closing ? 'var(--color-lamp-yellow)' : 'var(--sk-soft)' }}>
            {s.left}
          </span>
          <span
            className={cn(
              css.mono,
              css.fs10,
              'inline-flex h-4 min-w-4 items-center justify-center rounded-full px-[5px] font-bold',
              n > 0 ? 'bg-destructive text-white' : 'bg-[color-mix(in_srgb,var(--sk-ink)_8%,transparent)] text-[var(--sk-mute2)]',
            )}
          >
            {n}
            {alerts.incomplete ? '+?' : ''}
          </span>
        </button>
      </MenubarTip>
    </AlertsPopover>
  )
}
