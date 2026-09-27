/**
 * Two readings Assignment used to mark as missing, and which the data carries.
 *
 * **The early trigger.** A short call goes early when the dividend a holder
 * would miss is worth more than the time value they would give up. The page
 * had said the corporate-action feed carries no future ex-date; measured
 * 2026-09-26 it is the declarations that are absent, not the feed — the
 * plugin's nightly pull looks 60 days ahead and names that declare early come
 * back dated ahead (Corporate Actions' own finding, 2026-09-17). So each short
 * call now reads its name's rows and says one of three things: nothing is
 * declared before expiry, a declared dividend the time value covers, or one it
 * does not.
 *
 * **What was assigned before.** The broker books an expiry, an assignment and
 * an exercise the same way — a `BookTrade`, the option leg closed at 0.00 —
 * and the Flex ingest drops the Notes/Codes column that would say which. What
 * tells them apart is the stock: an assignment or exercise lands a stock leg
 * booked the same day on the same name, and an expiry lands none. Measured on
 * DEV 2026-09-26: 32 option legs booked, one with a stock leg beside it, every
 * one on its own expiry day.
 */
import type { CorporateActionRow } from '@/api/marketData/corporateActions'
import type { Execution } from '@/types/positions'
import { extractUnderlyingRootSymbol } from '@/utils/optionTicker'
import type { AssignmentLeg } from '@/utils/assignmentRisk'

/** `20261120` → `2026-11-20`; ISO passes through. */
export function isoDay(raw: string | null | undefined): string {
  const d = (raw ?? '').replace(/\D/g, '')
  return d.length >= 8 ? `${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6, 8)}` : ''
}

export type TriggerTone = 'quiet' | 'warn'

export interface TriggerReading {
  text: string
  tone: TriggerTone
  /** A dividend ahead of expiry that outweighs the time value — the row the design washes amber. */
  hot: boolean
  /** The declared ex-date this reading turns on, when one exists. */
  exDate: string | null
  title: string
}

const DECLARATION_LAG =
  'A dividend exists only once its issuer declares it; the plugin looks 60 days ahead each night, so a name that has not declared yet reads as nothing ahead.'

/**
 * The early-assignment reading for one short leg.
 *
 * `rows` is undefined while the name's corporate actions are in flight and
 * null when the read failed — both say so rather than reading as clean.
 */
export function earlyTrigger(
  leg: Pick<AssignmentLeg, 'right' | 'expiry' | 'extrinsic'>,
  rows: readonly CorporateActionRow[] | null | undefined,
  today: string,
): TriggerReading {
  if (leg.right === 'P') {
    return {
      text: 'no dividend trigger on a put',
      tone: 'quiet',
      hot: false,
      exDate: null,
      title: 'A put holder gains nothing from a dividend by exercising early; a deep put goes early on carry, which the time value column already shows.',
    }
  }
  if (rows === undefined) {
    return { text: 'reading the ex-dates…', tone: 'quiet', hot: false, exDate: null, title: 'Reading this name’s corporate actions' }
  }
  if (rows === null) {
    return {
      text: 'ex-dates unread',
      tone: 'warn',
      hot: false,
      exDate: null,
      title: 'The corporate-action read failed for this name — unread, not clear.',
    }
  }
  const expiry = isoDay(leg.expiry)
  const ahead = rows
    .filter((r) => /div/i.test(r.action_type ?? ''))
    .map((r) => ({ ex: (r.ex_date ?? '').slice(0, 10), amount: r.amount }))
    .filter((r) => r.ex > today && (!expiry || r.ex <= expiry))
    .sort((a, b) => a.ex.localeCompare(b.ex))
  const next = ahead[0]
  if (!next) {
    return { text: 'none declared before expiry', tone: 'quiet', hot: false, exDate: null, title: DECLARATION_LAG }
  }
  if (next.amount == null) {
    return {
      text: `ex ${next.ex} · amount unread`,
      tone: 'warn',
      hot: false,
      exDate: next.ex,
      title: 'A dividend is declared before expiry but the vendor row carries no amount, so it cannot be held against the time value.',
    }
  }
  const div = next.amount.toFixed(2)
  if (leg.extrinsic == null) {
    return {
      text: `ex ${next.ex} · ${div} vs unpriced time value`,
      tone: 'warn',
      hot: false,
      exDate: next.ex,
      title: 'The leg has no vendor mark, so its time value — the other side of the comparison — is unknown.',
    }
  }
  const room = leg.extrinsic - next.amount
  if (room < 0) {
    return {
      text: `ex ${next.ex} · ${div} dividend over ${leg.extrinsic.toFixed(2)} time value`,
      tone: 'warn',
      hot: true,
      exDate: next.ex,
      title: 'The dividend a holder would miss is worth more than the time value they would give up — the day before this ex-date is when an early exercise pays.',
    }
  }
  return {
    text: `ex ${next.ex} · time value holds by ${room.toFixed(2)}`,
    tone: 'warn',
    hot: false,
    exDate: next.ex,
    title: 'A dividend is declared before expiry, and today the time value still outweighs it. Time value shrinks toward expiry; the margin does too.',
  }
}

export type BookedKind = 'assigned' | 'exercised'

export interface BookedEvent {
  key: string
  /** The day the broker booked it, `YYYY-MM-DD`. */
  date: string
  underlying: string
  /** The option leg's own contract key, when the book carries it. */
  contractKey: string | null
  right: string
  expiry: string
  contracts: number
  /** Shares the stock leg moved: positive taken, negative delivered away. */
  shares: number
  kind: BookedKind
  /** Booked before the leg's own expiry — the early case the trigger column watches for. */
  early: boolean
}

export interface BookedHistory {
  /** Option legs the broker closed by a book entry rather than a trade. */
  optionLegs: number
  /** Of those, the ones with no stock leg beside them — expired. */
  expired: number
  events: BookedEvent[]
  /** The earliest fill in the book, so the window can be named. */
  since: string | null
}

const up = (v: string | null | undefined) => (v ?? '').trim().toUpperCase()
const qtyOf = (e: Execution) => Math.abs(Number(e.quantity ?? e.qty ?? 0)) || 0
const dayOf = (e: Execution) => (e.trade_date ?? '').slice(0, 10)

/**
 * Assignments and exercises, read off the book entries.
 *
 * The option side names which: a short closed by the broker (a BUY at 0.00)
 * with shares moving is an assignment; a long closed the same way (a SELL) is
 * the holder exercising. The stock leg's own side gives the direction.
 */
export function bookedHistory(executions: readonly Execution[]): BookedHistory {
  const booked = executions.filter((e) => up(e.transaction_type) === 'BOOKTRADE')
  const options = booked.filter((e) => up(e.sec_type) === 'OPT')
  const stocks = booked.filter((e) => up(e.sec_type) === 'STK')
  const events: BookedEvent[] = []
  const paired = new Set<Execution>()
  for (const s of stocks) {
    const name = up(s.symbol)
    const leg = options.find((o) => !paired.has(o) && dayOf(o) === dayOf(s) && up(extractUnderlyingRootSymbol(o.symbol)) === name)
    if (!leg) continue
    paired.add(leg)
    const shares = qtyOf(s) * (up(s.side).startsWith('B') ? 1 : -1)
    const expiry = isoDay(leg.expiry)
    events.push({
      key: `${dayOf(s)}:${name}:${leg.contract_key ?? ''}`,
      date: dayOf(s),
      underlying: name,
      contractKey: leg.contract_key || null,
      right: up(leg.option_right ?? leg.right),
      expiry,
      contracts: qtyOf(leg),
      shares,
      kind: up(leg.side).startsWith('B') ? 'assigned' : 'exercised',
      early: Boolean(expiry) && dayOf(s) < expiry,
    })
  }
  const dates = executions.map(dayOf).filter(Boolean).sort()
  return {
    optionLegs: options.length,
    expired: options.length - paired.size,
    events: events.sort((a, b) => b.date.localeCompare(a.date)),
    since: dates[0] ?? null,
  }
}
