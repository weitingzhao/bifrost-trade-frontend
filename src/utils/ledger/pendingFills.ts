import type { Execution } from '@/types/positions'

/**
 * TWS fills Flex has not confirmed yet ("pending"), as the Ledger shows them.
 *
 * The server's `source_scope=on_the_fly` (core 0.61.0 `executions_fly`) holds them: a TWS fill
 * whose exec_id Flex does not have and whose trading day is after the last day Flex covers for
 * its account. The Ledger applies the same rule again to what it read, for two reasons: the two
 * lists are fetched separately, so a fill Flex imported between the two reads would otherwise be
 * counted twice; and an env whose view still has the older definition (before its DB step) must
 * not show TWS rows Flex already has under another exec_id.
 *
 * A pending option fill is given the contract key of the Flex rows for the same contract when
 * there are any: Flex writes the OCC root padded to six (`AMD   261120C…`), TWS pads to two
 * (`AMD  261120C…`), and grouping by the raw key would split one contract into two rows.
 */

/** symbol root | expiry digits | strike | C/P; null when a part is missing. */
export function optIdentity(
  symbol: string | null | undefined,
  expiry: string | number | null | undefined,
  strike: number | string | null | undefined,
  right: string | null | undefined,
): string | null {
  const root = (symbol ?? '').trim().split(/\s+/)[0]?.toUpperCase() ?? ''
  const exp = String(expiry ?? '').replace(/\D/g, '')
  const k = strike == null || strike === '' ? NaN : Number(strike)
  const r = (right ?? '').trim().toUpperCase().slice(0, 1)
  if (!root || exp.length < 6 || !Number.isFinite(k) || (r !== 'C' && r !== 'P')) return null
  return `${root}|${exp}|${k}|${r}`
}

export function execOptIdentity(e: Execution): string | null {
  if ((e.sec_type ?? '').toUpperCase() !== 'OPT') return null
  return optIdentity(e.symbol, e.expiry, e.strike, e.option_right)
}

const NY_DATE = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'America/New_York',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
})

/** The US/Eastern date (YYYY-MM-DD) of a Unix time: IB's session date for a TWS fill. */
export function nyTradeDate(epochSeconds: number): string {
  return NY_DATE.format(new Date(epochSeconds * 1000))
}

/** A Flex row (positive id) as opposed to a TWS row (negative) or a journal row (< -1e9). */
function isFlexRow(e: Execution): boolean {
  return (e.account_executions_id ?? 0) > 0
}

export function pendingTwsFills(book: readonly Execution[], onTheFly: readonly Execution[]): Execution[] {
  const bookExecIds = new Set<string>()
  const flexThrough = new Map<string, string>()
  const keyByIdentity = new Map<string, string>()
  for (const e of book) {
    const eid = (e.exec_id ?? '').trim()
    if (eid) bookExecIds.add(eid)
    const acct = (e.account_id ?? '').trim()
    const day = (e.trade_date ?? '').slice(0, 10)
    if (acct && day && isFlexRow(e) && day > (flexThrough.get(acct) ?? '')) flexThrough.set(acct, day)
    const id = execOptIdentity(e)
    const ck = (e.contract_key ?? '').trim()
    if (id && ck && !keyByIdentity.has(id)) keyByIdentity.set(id, ck)
  }

  const out: Execution[] = []
  for (const e of onTheFly) {
    if ((e.sec_type ?? '').toUpperCase() === 'BAG') continue
    const acct = (e.account_id ?? '').trim()
    if (!acct) continue
    const eid = (e.exec_id ?? '').trim()
    if (eid && bookExecIds.has(eid)) continue
    const day = (e.trade_date ?? '').slice(0, 10) || (e.time != null ? nyTradeDate(e.time) : '')
    const through = flexThrough.get(acct)
    if (day && through && day <= through) continue
    const id = execOptIdentity(e)
    const bookKey = id ? keyByIdentity.get(id) : undefined
    out.push({
      ...e,
      trade_date: day || e.trade_date,
      contract_key: bookKey ?? e.contract_key,
      pending: true,
    })
  }
  return out
}
