import type { Execution } from '@/types/positions'
import { executionStrategyInstanceIds } from '@/utils/ledger/ledgerOptHelpers'
import { isBuySide, isSellSide } from '@/utils/instanceDetail/executionSide'
import { fmtIsoDateToken } from '@/lib/format'
import { ledgerExecutionDateKey } from '@/utils/ledger/summaryPeriod'

export type LedgerSourceBucket = 'flex' | 'tws' | 'journal' | 'other'

export function ledgerSourceBucket(source: string | undefined | null): LedgerSourceBucket {
  const s = (source ?? '').toLowerCase()
  if (s === 'flex_trades' || s === 'flex') return 'flex'
  if (s === 'tws_client' || s === 'tws') return 'tws'
  if (s === 'journal_closed' || s === 'journal' || s === 'manual') return 'journal'
  return 'other'
}

export function isUndatedExecution(e: Execution): boolean {
  return ledgerExecutionDateKey(e.trade_date) == null
}

export function isUnlinkedExecution(e: Execution): boolean {
  return executionStrategyInstanceIds(e).length === 0
}

export function secTypeOf(e: Execution): string {
  return (e.sec_type ?? '').toUpperCase()
}

export type LedgerUnlinkBasis = 'all' | 'options'

export const LEDGER_UNLINK_BASIS_TABS: { id: LedgerUnlinkBasis; label: string }[] = [
  { id: 'all', label: 'All fills' },
  { id: 'options', label: 'Options only' },
]

export function unlinkUniverse(rows: Execution[], basis: LedgerUnlinkBasis): Execution[] {
  if (basis === 'all') return rows
  return rows.filter(e => secTypeOf(e) === 'OPT')
}

export function unlinkCounts(rows: Execution[], basis: LedgerUnlinkBasis): {
  n: number
  of: number
  stock: number
  option: number
  combo: number
} {
  const universe = unlinkUniverse(rows, basis)
  let n = 0
  let stock = 0
  let option = 0
  let combo = 0
  for (const e of universe) {
    if (!isUnlinkedExecution(e)) continue
    n += 1
    const sec = secTypeOf(e)
    if (sec === 'STK') stock += 1
    else if (sec === 'OPT') option += 1
    else if (sec === 'BAG') combo += 1
  }
  return { n, of: universe.length, stock, option, combo }
}

export function unlinkNote(counts: { n: number; of: number; stock: number; option: number; combo: number }, basis: LedgerUnlinkBasis): string {
  if (basis === 'options') {
    return `Options only: ${counts.n} unlinked of ${counts.of} option fills. This is the basis that changes what you would do today — every one of these can be linked from the row actions.`
  }
  return `All ${counts.n} unlinked rows over ${counts.of}: ${counts.stock} stock fills, ${counts.option} option fills, ${counts.combo} combo orders. Stock fills dominate the number — if a share purchase is not meant to carry a strategy, this basis overstates the problem.`
}

function sideKey(e: Execution): string {
  if (isBuySide(e)) return 'BUY'
  if (isSellSide(e)) return 'SELL'
  return (e.side ?? '').toUpperCase()
}

export function flexMatchKey(e: Execution): string {
  const qty = Math.abs(Number(e.quantity ?? e.qty) || 0)
  const price = Number(e.price) || 0
  const date = ledgerExecutionDateKey(e.trade_date) ?? ''
  return [e.account_id ?? '', e.contract_key ?? '', sideKey(e), String(qty), String(price), date].join('|')
}

export type LedgerReconcileRow = {
  name: string
  date: string
  fields: string
  fieldsMuted: boolean
}

export type LedgerReconcileGroup = {
  id: 'bag' | 'also_flex' | 'unconfirmed'
  label: string
  count: number
  note: string
  rows: LedgerReconcileRow[]
}

export type LedgerReconcileModel = {
  canonical: number
  book: number
  onlyTws: number
  groups: LedgerReconcileGroup[]
  undated: Execution[]
}

function rowName(e: Execution): string {
  const ck = (e.contract_key ?? '').trim()
  if (ck) return ck
  return (e.symbol ?? '—').trim() || '—'
}

function rowDate(e: Execution): string {
  const d = ledgerExecutionDateKey(e.trade_date)
  return d ? fmtIsoDateToken(d) : 'no trade date'
}

export function buildLedgerReconcile(canon: Execution[], book: Execution[]): LedgerReconcileModel {
  const tws = canon.filter(e => ledgerSourceBucket(e.source) === 'tws')
  const flex = canon.filter(e => ledgerSourceBucket(e.source) === 'flex')
  const flexKeys = new Set(flex.map(flexMatchKey))
  const bag = tws.filter(e => secTypeOf(e) === 'BAG')
  const twsOpt = tws.filter(e => secTypeOf(e) === 'OPT')
  const alsoFlex = twsOpt.filter(e => flexKeys.has(flexMatchKey(e)))
  const unconfirmed = twsOpt.filter(e => !flexKeys.has(flexMatchKey(e)))

  const alsoN = alsoFlex.length
  const unN = unconfirmed.length
  const twsOptN = twsOpt.length

  const undated = canon.filter(isUndatedExecution)

  const bagGroup: LedgerReconcileGroup = {
    id: 'bag',
    label: 'Combo orders · BAG',
    count: bag.length,
    note: 'Multi-leg TWS orders. No expiry, no realized P&L, never linked. These will not arrive through Flex as combos — Flex reports their legs separately, which is why the count does not shrink.',
    rows: bag.map(e => ({
      name: rowName(e),
      date: rowDate(e),
      fields: 'expiry — · realized —',
      fieldsMuted: true,
    })),
  }

  const alsoGroup: LedgerReconcileGroup = {
    id: 'also_flex',
    label: 'Also in Flex',
    count: alsoN,
    note: `TWS option fills that match a Flex row on account, contract, side, |qty|, price and trade date. Same fill, second copy. Book scope is unchanged — the book does not include TWS.`,
    rows: alsoFlex.map(e => ({
      name: rowName(e),
      date: rowDate(e),
      fields: 'same fill as Flex',
      fieldsMuted: false,
    })),
  }

  const dates = unconfirmed
    .map(e => ledgerExecutionDateKey(e.trade_date))
    .filter((d): d is string => d != null)
    .sort()
  const rangeNote =
    dates.length > 0
      ? `Fills from ${fmtIsoDateToken(dates[0])} → ${fmtIsoDateToken(dates[dates.length - 1])}. `
      : ''

  const unGroup: LedgerReconcileGroup = {
    id: 'unconfirmed',
    label: 'Single option fills Flex never confirmed',
    count: unN,
    note: `${rangeNote}Matched against Flex on (account, contract, side, |qty|, price, trade date): ${alsoN} of ${twsOptN} TWS option fills also in Flex. The rest are not late — they are not reported in this shape.`,
    rows: unconfirmed.map(e => ({
      name: rowName(e),
      date: rowDate(e),
      fields: 'flex: no match',
      fieldsMuted: false,
    })),
  }

  return {
    canonical: canon.length,
    book: book.length,
    onlyTws: tws.length,
    groups: [bagGroup, alsoGroup, unGroup],
    undated,
  }
}

export function undatedSummaryNote(rows: Execution[]): string {
  const n = rows.length
  const allJournal = n > 0 && rows.every(e => ledgerSourceBucket(e.source) === 'journal')
  const who = allJournal ? 'journal rows' : 'rows'
  return `${n} ${who} carry no trade date, so they fall into no month. They are counted in the total and listed here — a row with no date must not vanish from a page organised by date.`
}
