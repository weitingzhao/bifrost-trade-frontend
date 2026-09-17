/**
 * The two clocks, and the three readings the IB one can give.
 *
 * Pull and Rec are separate questions and never merge: Pull is when we last
 * asked a source, Rec is the newest record that arrived. A fresh pull with an
 * old record is the normal case, and one combined "updated" number would report
 * it as fresh.
 *
 * The IB clock's colour is the part worth reading twice. A disconnected TWS is
 * not a fault — the daemon polls every 5 seconds, so a snapshot frozen for
 * hours with `ib_connected: false` means nobody is logged in. That is grey. The
 * one case worth amber is connected and not advancing. Red is kept for a real
 * fault: the account-sync daemon itself not running, which is the only one of
 * the three the data lets us tell apart.
 */
import { clockLabel } from '@/utils/accountsFreshness'

export type ClockTone = 'ok' | 'warn' | 'muted' | 'fault'

export interface ClockReading {
  /** Source name; the IB row renames itself when the daemon is down. */
  name: string
  pull: string
  pullTone: ClockTone
  rec: string
  recTone: ClockTone
  title: string
}

/** Snapshot older than this while connected is amber: connected and not advancing. */
export const SNAPSHOT_STALE_SEC = 120
/** The daily Flex ingest has missed a run past this. */
export const FLEX_PULL_STALE_SEC = 36 * 3600
/** TWS executions older than this are amber — not broken, but not the live path either. */
export const TWS_REC_WARN_DAYS = 14

const ET = 'America/New_York'

function etTime(d: Date): string {
  return d.toLocaleTimeString('en-US', { hourCycle: 'h23', timeZone: ET })
}

function fetchedClock(ts: number): string {
  // A fetch time, not an as-of date: the wall clock at which we asked.
  return `FETCHED ${etTime(new Date(ts * 1000))} ET`
}

/**
 * `16SEP26 21:30:00 ET` — the same moment as the FETCHED clock, in the same zone
 * and the §14.4 date token. The date is read in ET too: after 20:00 ET the UTC
 * date is already tomorrow, and a band showing two zones reads an hour or a day apart.
 */
export function fetchedStamp(ts: number): string {
  const d = new Date(ts * 1000)
  const part = Object.fromEntries(
    new Intl.DateTimeFormat('en-US', { timeZone: ET, day: '2-digit', month: 'short', year: '2-digit' })
      .formatToParts(d)
      .map((p) => [p.type, p.value]),
  )
  return `${part.day}${String(part.month).toUpperCase()}${part.year} ${etTime(d)} ET`
}

function recLabel(days: number | null | undefined): string {
  if (days == null || !Number.isFinite(days)) return 'Rec —'
  if (days < 1) return `Rec ${Math.round(days * 24)}h`
  return `Rec ${days < 100 ? days.toFixed(1) : Math.round(days)}d`
}

export function ibClockReading({
  daemonAlive,
  ibConnected,
  fetchedAt,
  twsRecDays,
  nowSec = Date.now() / 1000,
}: {
  daemonAlive: boolean
  ibConnected: boolean
  fetchedAt: number | null | undefined
  twsRecDays: number | null | undefined
  nowSec?: number
}): ClockReading {
  const rec = recLabel(twsRecDays)
  const recTone: ClockTone =
    twsRecDays == null ? 'muted' : twsRecDays > TWS_REC_WARN_DAYS ? 'warn' : 'ok'
  const recWhy =
    twsRecDays != null && twsRecDays > TWS_REC_WARN_DAYS
      ? ` No TWS execution in ${Math.round(twsRecDays)} days. Not necessarily broken — TWS may simply be disconnected while Flex carries the trades.`
      : ''

  if (!daemonAlive) {
    return {
      name: 'IB Client offline',
      pull: 'DAEMON DOWN',
      pullTone: 'fault',
      rec,
      recTone,
      title:
        'The account-sync daemon is not reporting a heartbeat. Nothing is fetching accounts, and nothing will until it is back. This is the one red case: a fault, not a closed session.' +
        recWhy,
    }
  }

  if (!ibConnected) {
    return {
      name: 'IB Client',
      pull: 'DISCONNECTED',
      pullTone: 'muted',
      rec,
      recTone,
      title:
        'The daemon reports ib_connected: false — TWS is not logged in, so no snapshot is arriving. Grey, not red: nothing is broken, the session simply is not open.' +
        recWhy,
    }
  }

  const lagSec = fetchedAt == null ? null : nowSec - fetchedAt
  if (lagSec != null && lagSec > SNAPSHOT_STALE_SEC) {
    const mins = Math.round(lagSec / 60)
    return {
      name: 'IB Client',
      pull: `STALE ${mins}m`,
      pullTone: 'warn',
      rec,
      recTone,
      title: `Connected, but the snapshot has not advanced for ${mins} minutes while the poll interval is seconds. Connected and not advancing is the one case worth amber.${recWhy}`,
    }
  }

  return {
    name: 'IB Client',
    pull: fetchedAt == null ? 'Pull —' : fetchedClock(fetchedAt),
    pullTone: fetchedAt == null ? 'muted' : 'ok',
    rec,
    recTone,
    title:
      'Snapshot time from monitor — a fetch time, not an as-of date. Rec is the newest TWS execution in the DB.' +
      recWhy,
  }
}

export function flexClockReading({
  pullTs,
  recDays,
  nowSec = Date.now() / 1000,
}: {
  pullTs: number | null | undefined
  recDays: number | null | undefined
  nowSec?: number
}): ClockReading {
  const stale = pullTs != null && nowSec - pullTs >= FLEX_PULL_STALE_SEC
  return {
    name: 'Flex',
    pull: pullTs == null ? 'Pull —' : `Pull ${clockLabel(pullTs)}`,
    pullTone: pullTs == null ? 'muted' : stale ? 'warn' : 'ok',
    rec: recLabel(recDays),
    recTone: recDays == null ? 'muted' : 'ok',
    title: stale
      ? 'The last Flex ingest is more than 36 hours old, so a daily run has been missed. Pull is when we last asked; Rec is the newest Flex trade in the DB.'
      : 'Pull is the last Flex ingest, which warns past 36 hours. Rec is the newest Flex trade in the DB — not the same question.',
  }
}
