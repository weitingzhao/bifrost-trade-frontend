/**
 * When the book was fetched — the head marker Positions and Backing & Model
 * carry (§4.6). The monitor reports no session, so this is a FETCH instant and
 * never an ASOF.
 *
 * Two readings compose here. The IB clock says whether anything *can* be
 * fetched: the account-sync daemon down is the one red case, a TWS nobody is
 * logged into is grey. Once connected, the snapshot is read by its kind
 * (§16.13): its age as text (`FETCHED 2m ago`), amber only past five minutes
 * in regular hours, and `CLOSED · 16:04` once the session has ended. The exact
 * instant and the source are in the title.
 */
import { cn } from '@/lib/utils'
import { useMonitorStatus } from '@/hooks/useMonitorStatus'
import { useTradingCalendar } from '@/hooks/useTradingCalendar'
import { ibClockReading } from '@/utils/accountsClocks'
import { STAMP_CLASS, STAMP_TONE } from '@/components/stampClasses'
import { useFreshReading } from '@/hooks/useFreshReading'

/** `quiet` (§16) keeps "judged by monitor" in the title instead of printing it. */
export function BookFetchMarker({ quiet = false }: { quiet?: boolean } = {}) {
  const { data } = useMonitorStatus()
  const calendar = useTradingCalendar()
  const fetchedAt = data?.portfolio.accounts_fetched_at ?? null
  const fresh = useFreshReading('snapshot', fetchedAt == null ? null : fetchedAt * 1000, {
    src: 'monitor accounts_fetched_at',
  })
  if (!data) return null
  const clock = ibClockReading({
    daemonAlive: data.account_sync_daemon?.heartbeat.daemon_alive === true,
    ibConnected: data.daemon.heartbeat?.ib_connected === true,
    fetchedAt,
    twsRecDays: null,
    calendar,
  })
  // Connected: the snapshot's own reading. Otherwise the clock's state is the
  // news — a fresh-looking age on a disconnected session would be a lie.
  const connected = clock.pullTone === 'ok' || clock.pullTone === 'warn'
  const label = connected ? fresh.label : clock.pull
  const tone = clock.pullTone === 'fault' ? STAMP_TONE.fault : connected && fresh.warn ? STAMP_TONE.warn : STAMP_TONE.quiet
  const title = connected ? fresh.title : clock.title.replace(' Rec is the newest TWS execution in the DB.', '')
  return (
    <span className={cn(STAMP_CLASS, 'gap-1.25', tone)} title={`${title}${quiet ? '\nJudged by monitor.' : ''}`}>
      {label}
      {quiet ? null : <span className="font-sans tracking-normal text-muted-foreground">· judged by monitor</span>}
    </span>
  )
}
