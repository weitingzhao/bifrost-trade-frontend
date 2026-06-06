import type { Execution } from '@/types/positions'

const NET_QTY_EPS = 1e-9

export interface OptExecutionGroup {
  contract_key: string
  strike: number
  expiry: string
  option_right: string
  symbol: string
  account_id: string
  net_qty: number
  buy_volume: number
  sell_volume: number
  buy_avg_price: number | null
  sell_avg_price: number | null
  buy_cost: number
  sell_premium: number
  realized_pnl: number
  status: 'realized' | 'unrealized'
  trades: Execution[]
}

function isBuySide(side: string): boolean {
  const s = side.toUpperCase()
  return s === 'BUY' || s === 'BOT' || s === 'B'
}

function isSellSide(side: string): boolean {
  const s = side.toUpperCase()
  return s === 'SELL' || s === 'SLD' || s === 'S'
}

function buildContractKey(e: Execution): string {
  if (e.contract_key?.trim()) return e.contract_key.trim()
  const sym = (e.symbol ?? '').split(' ')[0]
  const exp = (e.expiry ?? '').replace(/-/g, '')
  const strike = e.strike ?? 0
  const right = (e.option_right ?? e.right ?? 'C')[0].toUpperCase()
  return `${sym}|OPT|${exp}|${strike}|${right}`
}

export function isOptionExpired(expiryRaw: string | undefined | null): boolean {
  if (!expiryRaw) return false
  const clean = expiryRaw.replace(/-/g, '')
  if (!/^\d{6,8}$/.test(clean)) return false

  const y = parseInt(clean.slice(0, 4), 10)
  const m = parseInt(clean.slice(4, 6), 10)
  let d: number
  if (clean.length >= 8) {
    d = parseInt(clean.slice(6, 8), 10)
  } else {
    d = new Date(y, m, 0).getDate()
  }

  const expiryMs = Date.UTC(y, m - 1, d, 23, 59, 59)
  return Date.now() > expiryMs
}

function isOptExecution(e: Execution): boolean {
  return (e.sec_type ?? '').toUpperCase() === 'OPT'
}

export function buildOptExecutionGroups(sourceExecutions: Execution[]): OptExecutionGroup[] {
  const optExecs = sourceExecutions.filter(isOptExecution)

  const grouped = new Map<string, Execution[]>()
  for (const e of optExecs) {
    const ck = buildContractKey(e)
    const strike = Number.isFinite(e.strike) ? e.strike! : 0
    const key = `${ck}|${strike}`
    const arr = grouped.get(key) ?? []
    arr.push(e)
    grouped.set(key, arr)
  }

  const result: OptExecutionGroup[] = []

  for (const [, trades] of grouped) {
    const first = trades[0]
    const ck = buildContractKey(first)

    let net_qty = 0
    let buy_qty = 0
    let sell_qty = 0
    let buy_value = 0
    let sell_value = 0
    let buy_value_raw = 0
    let sell_value_raw = 0

    for (const t of trades) {
      const rawQty = Number(t.quantity ?? t.qty)
      const q = Number.isFinite(rawQty) ? Math.abs(rawQty) : 0
      if (q < NET_QTY_EPS) continue
      const p = Number(t.price) || 0
      const c = Number(t.commission) || 0

      if (isBuySide(t.side)) {
        buy_qty += q
        buy_value += p * q * 100 + c
        buy_value_raw += p * q
        net_qty += q
      } else if (isSellSide(t.side)) {
        sell_qty += q
        sell_value += p * q * 100 - c
        sell_value_raw += p * q
        net_qty -= q
      }
    }

    const sortedTrades = [...trades].sort((a, b) => (b.time ?? 0) - (a.time ?? 0))

    result.push({
      contract_key: ck,
      strike: Number.isFinite(first.strike) ? first.strike! : 0,
      expiry: first.expiry ?? '',
      option_right: first.option_right ?? first.right ?? '',
      symbol: first.symbol,
      account_id: first.account_id,
      net_qty,
      buy_volume: buy_qty,
      sell_volume: sell_qty,
      buy_avg_price: buy_qty > 0 ? buy_value_raw / buy_qty : null,
      sell_avg_price: sell_qty > 0 ? sell_value_raw / sell_qty : null,
      buy_cost: buy_value,
      sell_premium: sell_value,
      realized_pnl: sell_value - buy_value,
      status: Math.abs(net_qty) < NET_QTY_EPS ? 'realized' : 'unrealized',
      trades: sortedTrades,
    })
  }

  result.sort((a, b) => {
    const ta = a.trades[0]?.time ?? 0
    const tb = b.trades[0]?.time ?? 0
    return tb - ta
  })

  return result
}

/** Sort closed/open option groups — matches Legacy LedgerView trade_date / expiry columns. */
export function compareOptExecutionGroups(
  a: OptExecutionGroup,
  b: OptExecutionGroup,
  column: 'expiry' | 'trade_date',
  dir: 'asc' | 'desc',
): number {
  const mult = dir === 'asc' ? 1 : -1
  if (column === 'expiry') {
    const sa = (a.expiry ?? '').trim().replace(/-/g, '')
    const sb = (b.expiry ?? '').trim().replace(/-/g, '')
    return mult * sa.localeCompare(sb, undefined, { numeric: true })
  }
  const datesA = (a.trades ?? [])
    .map(t => t.trade_date)
    .filter((d): d is string => d != null && String(d).trim() !== '')
  datesA.sort()
  const datesB = (b.trades ?? [])
    .map(t => t.trade_date)
    .filter((d): d is string => d != null && String(d).trim() !== '')
  datesB.sort()
  const va = datesA.length > 0 ? datesA[0] : ''
  const vb = datesB.length > 0 ? datesB[0] : ''
  return mult * va.localeCompare(vb)
}
