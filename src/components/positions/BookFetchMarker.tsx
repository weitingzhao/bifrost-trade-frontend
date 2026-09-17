/**
 * When the book was fetched — the header marker Positions and Backing & Model
 * carry (§4.6). The monitor reports no session, so this is a FETCH instant and
 * never an ASOF: `FETCHED 16:04:22 ET · judged by monitor`.
 *
 * The reading is the Accounts page's IB clock, not a second one: connected and
 * not advancing is amber, a closed session is grey, and only the account-sync
 * daemon being down is red.
 */
import { cn } from '@/lib/utils'
import { useMonitorStatus } from '@/hooks/useMonitorStatus'
import { ibClockReading, type ClockTone } from '@/utils/accountsClocks'

const TONE: Record<ClockTone, string> = {
  ok: 'border-border text-muted-foreground',
  muted: 'border-border text-muted-foreground',
  warn: 'border-warning/45 bg-warning/10 text-warning',
  fault: 'border-lamp-red/45 text-lamp-red',
}

export function BookFetchMarker() {
  const { data } = useMonitorStatus()
  if (!data) return null
  const reading = ibClockReading({
    daemonAlive: data.account_sync_daemon?.heartbeat.daemon_alive === true,
    ibConnected: data.daemon.heartbeat?.ib_connected === true,
    fetchedAt: data.portfolio.accounts_fetched_at,
    twsRecDays: null,
  })
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.25 whitespace-nowrap rounded-[5px] border px-2 py-0.5',
        'font-mono text-dense-caption leading-normal tracking-[0.05em]',
        TONE[reading.pullTone],
      )}
      title={reading.title.replace(' Rec is the newest TWS execution in the DB.', '')}
    >
      {reading.pull}
      <span className="font-sans tracking-normal text-muted-foreground">· judged by monitor</span>
    </span>
  )
}
