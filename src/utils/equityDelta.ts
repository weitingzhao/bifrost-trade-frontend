/**
 * Δ as stocks + options (design Rev .114 for the menu bar, Rev .119 for Risk ›
 * Portfolio and Backing & Model, §5.1.4b).
 *
 * A bond or T-bill ETF carries no equity delta, but the model service counts
 * its shares like any stock. So every page that shows the book's Δ takes those
 * shares back out — the funds the Owner registered as fixed income or
 * cash-like (core 0.27.0) — and an option written on such a fund stays in.
 * Keyed per account × symbol because the model service answers per account. The model service's own figures are left unchanged; this is the
 * one place the deduction is made.
 */
import { stockBookBucket } from '@/utils/bookLive'
import type { UnderlyingEntry } from '@/types/modelAnalysis'

/** The label suffix every reading on this basis carries. */
export const EQUITY_DELTA_LABEL = 'stocks + options'
export const EQUITY_DELTA_TITLE =
  'Stocks and options only — fixed-income and cash-like shares are left out, the same count as the menu bar’s Book Δ'

const keyOf = (accountId: string, symbol: string) => `${accountId.trim()}|${symbol.trim().toUpperCase()}`

/** `account|SYMBOL` for every stock holding registered as fixed income or cash-like. */
export function noEquityDeltaKeys(
  accounts: readonly {
    account_id?: string | null
    positions?: readonly { secType?: string | null; symbol?: string | null; instrument_class?: string | null }[] | null
  }[],
): Set<string> {
  const out = new Set<string>()
  for (const a of accounts) {
    for (const p of a.positions ?? []) {
      if ((p.secType ?? '') !== 'STK') continue
      const b = stockBookBucket(p)
      if (b === 'fi' || b === 'cash') out.add(keyOf(a.account_id ?? '', p.symbol ?? ''))
    }
  }
  return out
}

/** One underlying's Δ (share equivalent) and Δ$ with a fixed-income or cash-like holding's shares taken out. */
export function equityDeltaOf(
  u: Pick<UnderlyingEntry, 'symbol' | 'stock_qty' | 'spot'> & { greeks?: { delta?: number | null; delta_dollars?: number | null } | null },
  accountId: string,
  keys: ReadonlySet<string>,
): { delta: number | null; dollars: number | null } {
  const delta = u.greeks?.delta ?? null
  const dollars = u.greeks?.delta_dollars ?? null
  if (!keys.has(keyOf(accountId, u.symbol ?? ''))) return { delta, dollars }
  const shares = u.stock_qty ?? 0
  return {
    delta: delta == null ? null : delta - shares,
    dollars: dollars == null ? null : u.spot == null ? dollars : dollars - shares * u.spot,
  }
}

/** An account's Δ and Δ$ on this basis: its rollups less every fixed-income and cash-like holding's shares. */
export function equityDeltaRollup(
  perUnderlying: readonly Parameters<typeof equityDeltaOf>[0][],
  accountId: string,
  keys: ReadonlySet<string>,
  rollup: { delta: number | null; dollars: number | null },
): { delta: number | null; dollars: number | null } {
  let delta = rollup.delta
  let dollars = rollup.dollars
  for (const u of perUnderlying) {
    if (!keys.has(keyOf(accountId, u.symbol ?? ''))) continue
    const shares = u.stock_qty ?? 0
    if (delta != null) delta -= shares
    if (dollars != null && u.spot != null) dollars -= shares * u.spot
  }
  return { delta, dollars }
}
