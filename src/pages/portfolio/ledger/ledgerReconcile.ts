import type { Execution } from '@/types/positions'
import { executionStrategyInstanceIds } from '@/utils/ledger/ledgerOptHelpers'
import { isBuySide, isSellSide } from '@/utils/instanceDetail/executionSide'
import { fmtIsoDateToken } from '@/lib/format'
import { ledgerExecutionDateKey } from '@/utils/ledger/summaryPeriod'
import { ledgerContractDisplay } from './ledgerContractMark'

export type LedgerSourceBucket = 'flex' | 'tws' | 'journal' | 'manual' | 'other'

/**
 * `manual` is not journal. The API stores a `manual` write beside TWS rows
 * (executions_raw_tws), so it is in canonical and outside the performance book,
 * which reads Flex and journal only. Counting it as journal made canonical − book
 * disagree with Only in TWS whenever one existed.
 */
export function ledgerSourceBucket(source: string | undefined | null): LedgerSourceBucket {
  const s = (source ?? '').toLowerCase()
  if (s === 'flex_trades' || s === 'flex') return 'flex'
  if (s === 'tws_client' || s === 'tws') return 'tws'
  if (s === 'journal_closed' || s === 'journal') return 'journal'
  if (s === 'manual') return 'manual'
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
  /** The stored contract key, for hover. */
  title?: string
  date: string
  fields: string
  fieldsMuted: boolean
}

export type LedgerReconcileGroup = {
  id: 'bag' | 'also_flex' | 'unconfirmed' | 'manual'
  label: string
  count: number
  note: string
  rows: LedgerReconcileRow[]
}

export type LedgerReconcileModel = {
  canonical: number
  book: number
  onlyTws: number
  manual: number
  groups: LedgerReconcileGroup[]
  undated: Execution[]
}

/** The contract token (§14.4), not the pipe-joined key; the key goes to hover. */
function rowName(e: Execution): string {
  const { mark } = ledgerContractDisplay(e)
  if (secTypeOf(e) === 'BAG') return `${mark} combo`
  if (secTypeOf(e) !== 'OPT') return mark
  const strike = Number(e.strike)
  const right = (e.option_right ?? e.right ?? '').trim().toUpperCase().slice(0, 1)
  return [mark, Number.isFinite(strike) && strike > 0 ? String(strike) : '', right].filter(Boolean).join(' ')
}

function rowDate(e: Execution): string {
  const d = ledgerExecutionDateKey(e.trade_date)
  return d ? fmtIsoDateToken(d) : 'no trade date'
}

/**
 * Canonical against book, for the rows the page's contract filters choose.
 *
 * Callers pass rows filtered by account, symbol, structure and expiry — not by the
 * date window or Type: Type=Trades removes every TWS row (they carry no
 * transaction_type), and a row reconciles or not regardless of the window.
 * `flexUniverse` is every Flex row, so a TWS fill still finds its Flex copy when
 * a filter has hidden that copy. TWS stock fills are matched like option fills;
 * combos never are.
 */
export function buildLedgerReconcile(
  canon: Execution[],
  book: Execution[],
  flexUniverse?: Execution[],
): LedgerReconcileModel {
  const tws = canon.filter(e => ledgerSourceBucket(e.source) === 'tws')
  const manual = canon.filter(e => ledgerSourceBucket(e.source) === 'manual')
  const flex = (flexUniverse ?? canon).filter(e => ledgerSourceBucket(e.source) === 'flex')
  const flexKeys = new Set(flex.map(flexMatchKey))
  const bag = tws.filter(e => secTypeOf(e) === 'BAG')
  const twsOpt = tws.filter(e => secTypeOf(e) !== 'BAG')
  const alsoFlex = twsOpt.filter(e => flexKeys.has(flexMatchKey(e)))
  const unconfirmed = twsOpt.filter(e => !flexKeys.has(flexMatchKey(e)))
  const allOptions = twsOpt.every(e => secTypeOf(e) === 'OPT')
  const fillWord = allOptions ? 'option fills' : 'fills'

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
      title: e.contract_key ?? undefined,
      date: rowDate(e),
      fields: 'expiry — · realized —',
      fieldsMuted: true,
    })),
  }

  const alsoGroup: LedgerReconcileGroup = {
    id: 'also_flex',
    label: 'Also in Flex',
    count: alsoN,
    note: `TWS ${fillWord} that match a Flex row on account, contract, side, |qty|, price and trade date. Same fill, second copy. Book scope is unchanged — the book does not include TWS.`,
    rows: alsoFlex.map(e => ({
      name: rowName(e),
      title: e.contract_key ?? undefined,
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
    label: allOptions ? 'Single option fills Flex never confirmed' : 'Single fills Flex never confirmed',
    count: unN,
    note: `${rangeNote}Matched against Flex on (account, contract, side, |qty|, price, trade date): ${alsoN} of ${twsOptN} TWS ${fillWord} also in Flex. The rest are not late — they are not reported in this shape.`,
    rows: unconfirmed.map(e => ({
      name: rowName(e),
      title: e.contract_key ?? undefined,
      date: rowDate(e),
      fields: 'flex: no match',
      fieldsMuted: false,
    })),
  }

  const groups: LedgerReconcileGroup[] = [bagGroup, alsoGroup, unGroup]
  if (manual.length > 0) {
    groups.push({
      id: 'manual',
      label: 'Manual rows outside the book',
      count: manual.length,
      note: 'Written with source manual (Quick close). The API stores them beside TWS rows, so they are in canonical and not in the performance book.',
      rows: manual.map(e => ({
        name: rowName(e),
        title: e.contract_key ?? undefined,
        date: rowDate(e),
        fields: 'manual · not in book',
        fieldsMuted: true,
      })),
    })
  }

  return {
    canonical: canon.length,
    book: book.length,
    onlyTws: tws.length,
    manual: manual.length,
    groups,
    undated,
  }
}

export function undatedSummaryNote(rows: Execution[]): string {
  const n = rows.length
  const allJournal = n > 0 && rows.every(e => ledgerSourceBucket(e.source) === 'journal')
  const who = allJournal ? 'journal rows' : 'rows'
  return `${n} ${who} carry no trade date, so they fall into no month. They are counted in the total and listed here — a row with no date must not vanish from a page organised by date.`
}
