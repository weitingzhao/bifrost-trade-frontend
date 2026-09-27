/**
 * The Desk's Writes table — kind · change · thread · result — as pure functions.
 *
 * Design (`design/trade/Copilot.dc.html`, Today, Writes): one row per write the
 * chat asked for, the thread it came from (a row opens it), and what became of
 * it. The rows are `/research/copilot/writes`; the counts in the panel's meta
 * are the standing's, both read from the same ledger with the same filter.
 *
 * Times read in New York, like Ran today beside it. The day goes on the thread
 * ("yesterday · …") and the clock on the result, as the design places them.
 */
import type { CopilotWriteRow, CopilotWrites } from '@/api/research/copilotWrites'
import { ET_ZONE, fmtIsoDateToken } from '@/lib/format'
import { nyDate } from '@/pages/research/seats/agentActivity'

export type WriteResultTone = 'green' | 'warn' | 'danger' | 'muted'

export interface WriteResult {
  text: string
  tone: WriteResultTone
  title: string
}

export interface WriteThread {
  text: string
  openable: boolean
  title: string
}

const CLOCK = new Intl.DateTimeFormat('en-US', {
  timeZone: ET_ZONE,
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
})

function parsed(iso: string | null | undefined): Date | null {
  if (!iso) return null
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? null : d
}

function dayBefore(ymd: string): string {
  const d = new Date(`${ymd}T12:00:00Z`)
  d.setUTCDate(d.getUTCDate() - 1)
  return d.toISOString().slice(0, 10)
}

/** `null` for today (New York), `yesterday`, else the §14.4 date token. */
export function writeDay(iso: string | null | undefined, now: Date): string | null {
  const d = parsed(iso)
  if (!d) return '—'
  const day = nyDate(d)
  const today = nyDate(now)
  if (day === today) return null
  if (day === dayBefore(today)) return 'yesterday'
  return fmtIsoDateToken(day)
}

/** What became of the write, with the clock it happened at. */
export function writeResult(row: CopilotWriteRow): WriteResult {
  const at = parsed(row.executed_at) ?? parsed(row.created_at)
  const clock = at ? ` · ${CLOCK.format(at)}` : ''
  const make = (label: string, tone: WriteResultTone, title: string): WriteResult => ({
    text: `${label}${clock}`,
    tone,
    title,
  })
  switch (row.status) {
    case 'executed':
      return row.ok === false
        ? make('failed', 'danger', row.error ?? 'Executed, but the tool reported a failure')
        : make('ran', 'green', 'Approved on the card and executed')
    case 'approved':
      return make(
        'approved · not run',
        'warn',
        'The approval was issued but no execution was recorded — the write may not have happened',
      )
    case 'proposed':
      return make('awaiting', 'warn', 'Proposed on a card and not answered yet')
    case 'rejected':
      return make('refused', 'muted', 'Declined on the card — nothing was written')
    case 'error':
      return make('failed', 'danger', row.error ?? 'The write failed')
    case 'expired':
      return make('expired', 'muted', 'The approval expired before it ran')
    default:
      return make(row.status, 'muted', row.status)
  }
}

/** The thread the write came from, with the day in front when it was not today. */
export function writeThread(row: CopilotWriteRow, now: Date): WriteThread {
  const day = writeDay(row.created_at, now)
  const prefix = day ? `${day} · ` : ''
  if (!row.session_id) {
    return {
      text: `${prefix}no thread`,
      openable: false,
      title: 'Recorded without its thread — there is nothing to open',
    }
  }
  const name = row.thread_title ?? `thread ${row.session_id.slice(0, 8)}`
  const archived = row.thread_archived ? ' · archived' : ''
  return {
    text: `${prefix}${name}${archived}`,
    openable: true,
    title: `Open this thread in the Copilot panel — ${name}`,
  }
}

/** The panel's meta: today's counts from the standing (UTC day, same filter). */
export function writesMeta(approvals: Record<string, number> | null | undefined): string {
  if (!approvals) return '—'
  const n = (k: string) => approvals[k] ?? 0
  const parts = [`today ${n('executed')} ran`, `${n('rejected')} refused`]
  if (n('error')) parts.push(`${n('error')} failed`)
  if (n('approved')) parts.push(`${n('approved')} not run`)
  if (n('proposed')) parts.push(`${n('proposed')} awaiting`)
  return parts.join(' · ')
}

/** What an empty window says — including when the last write was, if ever. */
export function writesEmptyLine(data: Pick<CopilotWrites, 'days' | 'last_write_at'>): string {
  const head = `No chat writes in the last ${data.days} day${data.days === 1 ? '' : 's'}.`
  const last = parsed(data.last_write_at)
  return last
    ? `${head} The last one was ${fmtIsoDateToken(nyDate(last))}.`
    : `${head} The chat has not written anything yet.`
}
