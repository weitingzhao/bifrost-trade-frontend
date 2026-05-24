import type { Execution, OpenOptionPosition } from '@/types/positions'

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

    const qty = ex.qty
    group.net_qty += qty
    if (ex.side === 'Buy') {
      group.buy_cost += Math.abs(qty) * ex.price
    } else {
      group.sell_premium += Math.abs(qty) * ex.price
    }
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
