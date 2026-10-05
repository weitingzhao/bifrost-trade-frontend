/**
 * Working orders at IB, as the Account control reads them (design Rev .155,
 * Shell Spec §4 — the retired market strip's `Open orders N`).
 *
 * The source is the one the strip read: the monitor status's
 * `portfolio.open_orders`, the `brokerage.open_orders` snapshot in PostgreSQL
 * (the same rows `GET /open-orders` answers for Live and Orders & Fills). The
 * Book control already polls that status, so the count costs no request.
 *
 * Neutral, not a warning: a working order is something the book is doing, not
 * something wrong with it.
 *
 * The snapshot is rewritten whole on every sync (TRUNCATE + INSERT, `now()`),
 * so `updated_ts` is when the row was last *seen*, not when the order went in.
 * The design's "working 14m" has no field behind it; a row says its IB status
 * where the age would go, and the snapshot's age rides in the title.
 */
import type { OpenOrderRow } from '@/types/monitor'
import { inAccountScope, type AccountScope } from '@/lib/accountScope'
import { accountTag } from '@/utils/accountTag'
import { parseOptionContractKey } from '@/lib/format'
import { formatExpiryIbGroupLabel } from '@/utils/marketStreamsSort'

export interface WorkingOrderRow {
  key: string
  /** The contract, the way the book's own rows name it: `NVDA Oct 17'26 PUT 120`. */
  name: string
  /** `SELL 2 · Submitted · HOST`. */
  sub: string
  /** `LMT 1.45`, or — when the snapshot has no limit price. */
  price: string
  title: string
}

function num(v: number | null | undefined): number | null {
  return v != null && Number.isFinite(v) ? v : null
}

function trimNum(v: number): string {
  return String(Number(v.toFixed(4)))
}

/** The contract's name — an option from its key, anything else by its symbol. */
export function orderContractName(o: OpenOrderRow): string {
  const symbol = (o.symbol ?? '').trim() || (o.contract_key ?? '').split('|')[0]?.trim() || '—'
  const sec = (o.sec_type ?? '').trim().toUpperCase()
  if (sec === 'OPT' || sec === 'FOP') {
    const p = parseOptionContractKey(o.contract_key)
    if (p.expiry !== '—' && p.strike !== '—' && (p.right === 'C' || p.right === 'P')) {
      return `${symbol} ${formatExpiryIbGroupLabel(p.expiry)} ${p.rightLabel} ${p.strike}`
    }
  }
  return sec && sec !== 'STK' ? `${symbol} ${sec}` : symbol
}

/**
 * The working orders in the account scope, newest snapshot first (the order
 * the monitor returns them in). An order with no account stays under every
 * scope — `inAccountScope`'s rule, the book rows' too.
 */
export function workingOrderRows(
  orders: readonly OpenOrderRow[] | null | undefined,
  scope: AccountScope,
  hostId: string,
  secondaryId: string,
  nowSec: number,
): WorkingOrderRow[] {
  return (orders ?? [])
    .filter((o) => inAccountScope(o.account_id, scope, hostId, secondaryId))
    .map((o, i) => {
      const name = orderContractName(o)
      const qty = num(o.remaining) ?? num(o.total_quantity)
      const side = [(o.action ?? '').trim().toUpperCase(), qty == null ? '' : trimNum(qty)].filter(Boolean).join(' ') || '—'
      const acct = (o.account_id ?? '').trim()
      const tag = acct ? accountTag(acct, hostId, secondaryId) : 'no account'
      const status = (o.status ?? '').trim()
      const lmt = num(o.limit_price)
      const seen = num(o.updated_ts)
      const ago = seen == null ? null : Math.max(0, Math.round((nowSec - seen) / 60))
      const filled = num(o.filled)
      const total = num(o.total_quantity)
      return {
        key: `${o.perm_id ?? o.order_id ?? 'x'}|${acct}|${i}`,
        name,
        sub: [side, status || null, tag].filter(Boolean).join(' · '),
        price: lmt == null ? '—' : `LMT ${trimNum(lmt)}`,
        title: [
          `${name} — Trading › Orders & Fills`,
          filled ? `${trimNum(filled)} filled of ${total == null ? '?' : trimNum(total)}` : null,
          lmt == null ? 'No limit price in the IB snapshot' : null,
          ago == null ? null : `IB snapshot ${ago}m ago — when the order was placed is not stored`,
        ]
          .filter(Boolean)
          .join('\n'),
      }
    })
}
