import type { Execution } from '@/types/positions'
import { fmtIsoDateToken, fmtOccContractToken } from '@/lib/format'
import {
  executionDateStr,
  ledgerOptionExecutionDisplayPnl,
  stockOnTheFlyUnrealizedPnlLeg,
} from '@/utils/ledger/performanceUtils'

/** One On the fly fill, shaped for the prototype's Fill | Qty | Price | Comm | Realized row. */
export interface OtfRow {
  key: string
  /** Sec type as the row is grouped: OPT, STK, or whatever else the broker sent. */
  group: string
  sym: string
  /** `+400 sh` or `−2 19SEP26 228P`. */
  what: string
  qty: string
  price: string
  comm: string
  /** Broker realized P&L on the fill; null when the broker sent none. */
  realized: number | null
  /** Option premium by side, or stock shares × price — the leg the Unrealized line sums. */
  legValue: number | null
  date: string
  time: number | null
  account: string
  execId: string
}

const GROUP_ORDER = ['OPT', 'STK']
const MINUS = '−'

function isSell(e: Execution): boolean {
  return /^(S|SELL|SLD)$/i.test(String(e.side ?? '').trim())
}

function fmtSignedQty(e: Execution): string {
  const q = Math.abs(Number(e.quantity ?? e.qty) || 0)
  return `${isSell(e) ? MINUS : '+'}${q.toLocaleString('en-US')}`
}

function fmtStrike(strike: number | null | undefined): string {
  const n = Number(strike)
  return Number.isFinite(n) && n > 0 ? String(n) : '—'
}

function optionParts(e: Execution): { sym: string; contract: string } {
  const token = fmtOccContractToken(e.symbol)
  if (token !== String(e.symbol ?? '').trim()) {
    const [sym, ...rest] = token.split(' ')
    return { sym, contract: rest.join(' ') }
  }
  const right = String(e.option_right ?? e.right ?? '').trim().charAt(0).toUpperCase()
  return {
    sym: String(e.symbol ?? '').trim() || '—',
    contract: `${fmtIsoDateToken(e.expiry)} ${fmtStrike(e.strike)}${right}`,
  }
}

export function buildOtfRows(execs: Execution[]): OtfRow[] {
  const rows = execs.map((e, i): OtfRow => {
    const group = String(e.sec_type ?? '').trim().toUpperCase() || '—'
    const qty = fmtSignedQty(e)
    const opt = group === 'OPT' ? optionParts(e) : null
    const realized =
      typeof e.realized_pnl === 'number' && Number.isFinite(e.realized_pnl) ? e.realized_pnl : null
    const legValue = group === 'OPT' ? ledgerOptionExecutionDisplayPnl(e) : stockOnTheFlyUnrealizedPnlLeg(e)
    const price = Number(e.price)
    const comm = e.commission == null ? null : Math.abs(Number(e.commission))
    return {
      key: `${e.account_executions_id ?? e.exec_id ?? `${e.account_id}-${e.time}-${e.symbol}`}-${i}`,
      group,
      sym: opt ? opt.sym : String(e.symbol ?? '').trim() || '—',
      what: opt ? `${qty} ${opt.contract}` : group === 'STK' ? `${qty} sh` : qty,
      qty,
      price: Number.isFinite(price) ? price.toFixed(2) : '—',
      comm: comm != null && Number.isFinite(comm) ? comm.toFixed(2) : '—',
      realized,
      legValue,
      date: fmtIsoDateToken(executionDateStr(e)),
      time: e.time,
      account: e.account_id ?? '—',
      execId: String(e.exec_id ?? e.account_executions_id ?? '—'),
    }
  })
  const rank = (g: string) => {
    const i = GROUP_ORDER.indexOf(g)
    return i === -1 ? GROUP_ORDER.length : i
  }
  // Grouped by sec type; within a group the fills keep the order they came in (newest first).
  return rows
    .map((r, i) => ({ r, i }))
    .sort((a, b) => rank(a.r.group) - rank(b.r.group) || a.r.group.localeCompare(b.r.group) || a.i - b.i)
    .map(({ r }) => r)
}

/** `5 fills · 2 sec types` for the panel header. */
export function otfCountLabel(rows: OtfRow[]): string {
  if (rows.length === 0) return 'no fills'
  const types = new Set(rows.map((r) => r.group)).size
  return `${rows.length} ${rows.length === 1 ? 'fill' : 'fills'} · ${types} ${types === 1 ? 'sec type' : 'sec types'}`
}
