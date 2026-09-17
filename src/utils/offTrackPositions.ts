import type { Execution, OpenOptionPosition } from '@/types/positions'
import { signedFillQty } from '@/components/positions/quickCloseOffset'

export const OFF_TRACK_ACCOUNT_ID = 'Off-Track'

interface ContractGroup {
  contract_key: string
  symbol: string
  expiry: string
  strike: number
  right: string
  net_qty: number
  buy_cost: number
  sell_premium: number
}

export function buildOffTrackPositions(
  executions: Execution[],
  filterSymbol?: string,
  filterExpiry?: string,
): OpenOptionPosition[] {
  const offTrackExecs = executions.filter(
    (e) => e.account_id === OFF_TRACK_ACCOUNT_ID && e.sec_type?.toUpperCase() === 'OPT'
  )

  const groups = new Map<string, ContractGroup>()

  for (const ex of offTrackExecs) {
    const ck = ex.contract_key
    if (!ck) continue

    let group = groups.get(ck)
    if (!group) {
      group = {
        contract_key: ck,
        symbol: ex.symbol,
        expiry: ex.expiry ?? '',
        strike: ex.strike ?? 0,
        right: ex.right ?? '',
        net_qty: 0,
        buy_cost: 0,
        sell_premium: 0,
      }
      groups.set(ck, group)
    }

    // The API sends `quantity` and IB sides (BUY / SELL / BOT / SLD); reading `qty`
    // and comparing to 'Buy' summed undefined into NaN, which disabled Close.
    const signed = signedFillQty(ex)
    if (signed === 0) continue
    group.net_qty += signed
    const notional = Math.abs(signed) * (Number(ex.price) || 0)
    if (signed > 0) group.buy_cost += notional
    else group.sell_premium += notional
  }

  let positions: OpenOptionPosition[] = []

  for (const g of groups.values()) {
    if (g.net_qty === 0) continue

    positions.push({
      kind: 'offtrack',
      contract_key: g.contract_key,
      symbol: g.symbol.toUpperCase(),
      strike: g.strike,
      expiry: g.expiry,
      right: g.right,
      qty: g.net_qty,
      avg_cost: null,
      mark_price: null,
      unrealized_pnl: g.sell_premium - g.buy_cost,
      pool_label: 'Off',
      account_id: OFF_TRACK_ACCOUNT_ID,
    })
  }

  if (filterSymbol) {
    const upper = filterSymbol.toUpperCase()
    positions = positions.filter((p) => p.symbol.includes(upper))
  }

  if (filterExpiry) {
    const f = filterExpiry.replace(/\D/g, '')
    if (f) {
      positions = positions.filter((p) => {
        const ex = p.expiry.replace(/\D/g, '')
        return ex.startsWith(f) || f.startsWith(ex)
      })
    }
  }

  return positions
}
