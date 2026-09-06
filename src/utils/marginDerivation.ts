/**
 * Where one account's margin figures come from: the strip's pressure,
 * cushion, excess and buying power, as a derivation the reader can walk.
 *
 * Every number is a field of IB's account summary read verbatim from the
 * account snapshot; the page adds exactly one step, pressure = 1 − Cushion.
 * The broker documents identities between its own fields — Cushion is
 * ExcessLiquidity over NetLiquidation, ExcessLiquidity is equity with loan
 * value less maintenance margin, AvailableFunds the same less initial margin,
 * BuyingPower four times that for a margin account. Each is re-run here on
 * the reported inputs and the result compared with the reported figure, so
 * the reader sees the numbers agree with each other and by how much they do
 * not. The broker's figure is always the one on the strip; a re-run never
 * replaces it.
 */
import type { MarginFacts } from './marginPressure'
import { pct0 as pct } from './marginByAccount'
import { PRESSURE_BANDS } from './bookVsBase'
import { fmtExpiry, fmtUsd } from './positions'
import type { Derivation, Variable, VariableCheck, VariableItem } from './derivation'
import type { SpotResolver, SpotSource } from './spotPrice'
import { fmtSpotDate } from './spotPrice'
import type { LivePositionRow } from '@/types/positions'

const usd = (v: number | null) => (v == null || !Number.isFinite(v) ? '—' : fmtUsd(v))
const ratio = (v: number | null) => (v == null || !Number.isFinite(v) ? '—' : v.toFixed(4))
const sub = (a: number | null, b: number | null) => (a == null || b == null ? null : a - b)
const qtyText = (q: number) => q.toLocaleString(undefined, { maximumFractionDigits: 2 })

/** Within `near` of the reported figure is timing noise, not a discrepancy. */
const NEAR = 0.02

function runCheck(
  computed: number | null,
  reported: number | null,
  fmt: (v: number) => string,
  tolerance: number,
  gapNote: string,
  agreeNote = "Re-run on the broker's own fields, it lands on the broker's figure.",
): VariableCheck {
  if (computed == null || reported == null) {
    return {
      verdict: 'unchecked',
      computed: computed == null ? '—' : fmt(computed),
      note: 'Cannot be checked: the broker did not report one of the inputs.',
    }
  }
  const gap = Math.abs(computed - reported)
  if (gap < tolerance) return { verdict: 'agrees', computed: fmt(computed), note: agreeNote }
  const relGap = reported !== 0 ? gap / Math.abs(reported) : null
  const rel = relGap == null ? '' : ` (${(100 * relGap).toFixed(2)}%)`
  return {
    verdict: relGap != null && relGap < NEAR ? 'near' : 'differs',
    computed: fmt(computed),
    gap: `${fmt(gap)}${rel}`,
    note: gapNote,
  }
}

/** One stock or ETF row of the account, at the page's price. */
export interface StockHolding {
  symbol: string
  category: string | null
  qty: number
  price: number | null
  source: SpotSource | null
  asOf: number | null
  /** qty × price; null when unpriced. */
  value: number | null
}

export interface OptionHolding {
  symbol: string
  right: string
  strike: number
  expiry: string
  qty: number
}

export interface AccountHoldings {
  stocks: StockHolding[]
  options: OptionHolding[]
}

const finite = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v)

/**
 * The account's holdings as the page prices them: stocks and ETFs at the
 * resolver's spot (live, else the latest close, else the broker's mark — the
 * rows are already repriced, the resolver only says which it was), options by
 * contract without a value, since the snapshot carries no option marks.
 */
export function holdingsOf(
  rows: readonly LivePositionRow[],
  accountId: string,
  resolveSpot?: SpotResolver | null,
): AccountHoldings {
  const mine = rows.filter((r) => (r.account_id ?? r.account) === accountId && finite(r.position) && r.position !== 0)
  const stocks: StockHolding[] = mine
    .filter((r) => (r.secType ?? '').toUpperCase() === 'STK')
    .map((r) => {
      const symbol = (r.symbol ?? '').toUpperCase()
      const spot = resolveSpot?.(symbol) ?? null
      const price = spot?.price ?? (finite(r.price) && r.price > 0 ? r.price : null)
      const source: SpotSource | null = spot?.source ?? (price != null ? 'mark' : null)
      const asOf = spot?.asOf ?? r.price_updated_at ?? null
      const qty = r.position as number
      return { symbol, category: r.category ?? null, qty, price, source, asOf, value: price == null ? null : qty * price }
    })
    .sort((a, b) => Math.abs(b.value ?? -1) - Math.abs(a.value ?? -1))
  const options: OptionHolding[] = mine
    .filter((r) => (r.secType ?? '').toUpperCase() === 'OPT')
    .map((r) => ({
      symbol: (r.symbol ?? '').toUpperCase(),
      right: (r.right ?? '').toUpperCase(),
      strike: finite(r.strike) ? r.strike : 0,
      expiry: r.lastTradeDateOrContractMonth ?? r.expiry ?? '',
      qty: r.position as number,
    }))
    .sort((a, b) => a.symbol.localeCompare(b.symbol) || a.expiry.localeCompare(b.expiry) || a.strike - b.strike)
  return { stocks, options }
}

const pricedAs = (h: StockHolding): string => {
  if (h.source == null) return 'no price'
  if (h.source === 'live') return 'live'
  return `${h.source} ${fmtSpotDate(h.asOf, h.source)}`
}

function stockItems(stocks: readonly StockHolding[]): VariableItem[] {
  return stocks.map((h) => ({
    label: h.symbol,
    sub: `${qtyText(h.qty)} sh × ${usd(h.price)} · ${pricedAs(h)}${h.category ? ` · ${h.category}` : ''}`,
    value: usd(h.value),
    warn: h.value == null,
  }))
}

function optionItems(options: readonly OptionHolding[]): VariableItem[] {
  return options.map((o) => ({
    label: `${o.symbol} ${o.strike}${o.right} ${fmtExpiry(o.expiry)}`,
    sub: `${qtyText(o.qty)} contract${Math.abs(o.qty) === 1 ? '' : 's'} · mark not in snapshot`,
    value: '—',
  }))
}

export function marginDerivation(f: MarginFacts, label: string, holdings?: AccountHoldings): Derivation {
  const cushionRun = f.excessLiquidity != null && f.netLiquidation ? f.excessLiquidity / f.netLiquidation : null
  const excessRun = sub(f.equityWithLoanValue, f.maintMarginReq)
  const availableRun = sub(f.equityWithLoanValue, f.initMarginReq)
  const buyingPowerRun = f.availableFunds == null ? null : f.availableFunds * 4
  const initOverMaint = sub(f.initMarginReq, f.maintMarginReq)
  const ewlvAboveNlv =
    f.equityWithLoanValue != null && f.netLiquidation != null && f.equityWithLoanValue > f.netLiquidation

  // The holdings layer: the page's own valuation of the stock side, and the
  // option side implied by the broker's two equity figures.
  const stocks = holdings?.stocks ?? []
  const pricedStocks = stocks.filter((h) => h.value != null)
  const unpriced = stocks.length - pricedStocks.length
  const stockValue = holdings ? pricedStocks.reduce((acc, h) => acc + (h.value ?? 0), 0) : null
  const brokerStockValue = sub(f.equityWithLoanValue, f.totalCashValue)
  const optionValue = sub(f.netLiquidation, f.equityWithLoanValue)
  const allLong = stocks.length > 0 && stocks.every((h) => h.qty > 0)
  const grossOptions = allLong && f.grossPositionValue != null && brokerStockValue != null ? f.grossPositionValue - brokerStockValue : null
  const stockGap = stockValue != null && brokerStockValue != null ? stockValue - brokerStockValue : null
  const pricingNote =
    "The page prices holdings at the latest close or live quote; the broker marked them at the snapshot moment. A gap of a percent or so is that timing; more means a stale price or a holding the snapshot lacks."
  const equityFormula = holdings ? '{TotalCashValue} + {StockValue}' : undefined
  const equityCheck = holdings
    ? runCheck(
        stockValue == null || f.totalCashValue == null ? null : f.totalCashValue + stockValue,
        f.equityWithLoanValue,
        usd,
        1,
        pricingNote,
        "Cash plus the page's stock value lands on the broker's figure.",
      )
    : undefined

  const variables: Variable[] = [
    {
      name: 'Pressure',
      source: 'page',
      value: pct(f.pressure),
      formula: '1 − {Cushion}',
      meaning:
        "How much of the account's liquidation value margin has used up. At 100% excess liquidity is gone and the broker starts closing positions.",
      note:
        f.cushion == null
          ? 'The broker reported no Cushion for this account, so its pressure is unknown.'
          : `MaintMarginReq ÷ NetLiquidation = ${pct(f.maintToNlv)} is a different ratio and is not this.`,
      warn: f.pressure != null && f.pressure >= PRESSURE_BANDS.critical,
    },
    {
      name: 'Cushion',
      source: 'broker',
      value: ratio(f.cushion),
      formula: '{ExcessLiquidity} ÷ {NetLiquidation}',
      meaning: "The broker's own ratio of room to size. The strip's cushion percentage is this figure, rounded.",
      check: runCheck(cushionRun, f.cushion, ratio, 0.0005, 'The broker computes Cushion from the same two fields; a gap means one of them is from a different moment.'),
    },
    {
      name: 'ExcessLiquidity',
      source: 'broker',
      value: usd(f.excessLiquidity),
      formula: '{EquityWithLoanValue} − {MaintMarginReq}',
      meaning: 'The room before a margin call. When it reaches zero the broker starts closing positions; the strip bar is this over NetLiquidation.',
      check: runCheck(
        excessRun,
        f.excessLiquidity,
        usd,
        1,
        "A gap of a few hundred dollars is the broker's own adjustment and is normal; thousands would mean the fields are not from the same moment. NetLiquidation − MaintMarginReq is a different, larger number and is not used.",
      ),
      warn: f.excessLiquidity != null && f.excessLiquidity <= 0,
    },
    {
      name: 'NetLiquidation',
      source: 'broker',
      value: usd(f.netLiquidation),
      formula: holdings ? '{TotalCashValue} + {StockValue} + {OptionValue}' : undefined,
      meaning: "Every position at the broker's marks, plus cash: what the account is worth closed out now. Read verbatim; the page never recomputes it.",
      note: holdings ? 'Bond and mutual-fund value would be further terms; this account holds neither, so ETFs are the whole non-cash, non-option side.' : undefined,
      check: holdings
        ? runCheck(
            stockValue == null || f.totalCashValue == null || optionValue == null ? null : f.totalCashValue + stockValue + optionValue,
            f.netLiquidation,
            usd,
            1,
            `OptionValue is what the broker's own figures leave after cash and stock, so this identity tests the stock leg. ${pricingNote}`,
            "Cash, the page's stock value and the implied option value land on the broker's figure.",
          )
        : undefined,
    },
    {
      name: 'EquityWithLoanValue',
      source: 'broker',
      value: usd(f.equityWithLoanValue),
      formula: equityFormula,
      meaning: 'Cash + stock + bond + fund value: the part of the account the broker lends against.',
      note: ewlvAboveNlv
        ? `US option value is not in it, so with a net-short options book it sits above NetLiquidation (${usd(f.equityWithLoanValue)} vs ${usd(f.netLiquidation)}).`
        : 'US option value is not in it, which is why it can differ from NetLiquidation.',
      check: equityCheck,
    },
    ...(holdings
      ? ([
          {
            name: 'StockValue',
            source: 'page',
            value: usd(stockValue),
            formula: `Σ shares × price over ${stocks.length} holding${stocks.length === 1 ? '' : 's'}`,
            meaning:
              'Every stock and ETF in this account, shares held times the page\'s price: live while the market trades, else the latest close. The cash-like and income ETFs are stock to the broker, not cash and not bonds.',
            note:
              brokerStockValue == null
                ? undefined
                : `The broker's own stock value is EquityWithLoanValue − TotalCashValue = ${usd(brokerStockValue)} at its marks${stockGap == null ? '' : `; this sum is ${usd(Math.abs(stockGap))} ${stockGap >= 0 ? 'above' : 'below'} it`}.`,
            items: stockItems(stocks),
            itemsCaption:
              stocks.length === 0
                ? 'No stock rows for this account in the snapshot.'
                : `${pricedStocks.length} priced${unpriced > 0 ? `, ${unpriced} without a price and left out` : ''} · Σ ${usd(stockValue)}`,
            warn: unpriced > 0,
          },
          {
            name: 'OptionValue',
            source: 'implied',
            value: usd(optionValue),
            formula: '{NetLiquidation} − {EquityWithLoanValue}',
            meaning:
              "The broker's net value of the US options, long minus short — negative for a short book. Not a reported field: it is what is left of NetLiquidation once cash and stock are taken out.",
            note:
              grossOptions == null
                ? 'Per-contract marks are not in the account snapshot, so the split by contract is not shown.'
                : `Gross option value ${usd(grossOptions)} = GrossPositionValue ${usd(f.grossPositionValue)} − stock value; per-contract marks are not in the account snapshot, so the split by contract is not shown.`,
            items: optionItems(holdings.options),
            itemsCaption: holdings.options.length === 0 ? 'No option rows for this account in the snapshot.' : `${holdings.options.length} option position${holdings.options.length === 1 ? '' : 's'}`,
          },
        ] satisfies Variable[])
      : []),
    {
      name: 'MaintMarginReq',
      source: 'broker',
      value: usd(f.maintMarginReq),
      meaning: "Margin the broker's model requires to keep the current positions open; it moves with the marks and with volatility.",
      note: f.maintToNlv == null ? undefined : `${pct(f.maintToNlv)} of NetLiquidation.`,
    },
    {
      name: 'InitMarginReq',
      source: 'broker',
      value: usd(f.initMarginReq),
      meaning: 'Margin the same book would need to open today.',
      note:
        initOverMaint == null
          ? undefined
          : Math.abs(initOverMaint) < 1
            ? 'Equal to MaintMarginReq here.'
            : `${usd(Math.abs(initOverMaint))} ${initOverMaint > 0 ? 'above' : 'below'} MaintMarginReq.`,
    },
    {
      name: 'AvailableFunds',
      source: 'broker',
      value: usd(f.availableFunds),
      formula: '{EquityWithLoanValue} − {InitMarginReq}',
      meaning: 'What can go into new positions before the broker says no.',
      check: runCheck(availableRun, f.availableFunds, usd, 1, 'The broker computes AvailableFunds from the same two fields; a gap means one of them is from a different moment.'),
    },
    {
      name: 'TotalCashValue',
      source: 'broker',
      value: usd(f.totalCashValue),
      meaning: 'Settled cash in the account, as the broker counts it: cash recognised at trade time plus any futures P&L.',
      note: "SGOV-class ETFs are stock value to the broker, not cash; the cockpit's cash-like figure adds them to this.",
    },
    {
      name: 'BuyingPower',
      source: 'broker',
      value: usd(f.buyingPower),
      formula: '{AvailableFunds} × 4',
      meaning:
        "What the broker lets a margin account buy: (the lower of EquityWithLoanValue and yesterday's, less InitMarginReq) × 4 — AvailableFunds × 4 while today's equity is the lower.",
      note: 'The cockpit and the Asset mix ring show this figure unchanged; the page never scales it.',
      check: runCheck(buyingPowerRun, f.buyingPower, usd, 1, "Yesterday's equity with loan value was the lower of the two, so the broker used it instead of today's."),
    },
  ]

  return {
    title: `${label} — ${f.accountId}`,
    intro:
      'Every figure is an IB account-summary field read verbatim from the account snapshot; this page adds one step, pressure = 1 − Cushion. Click a variable for what it means and how it checks out.',
    roots: ['Pressure', 'BuyingPower'],
    variables: Object.fromEntries(variables.map((v) => [v.name, v])),
    scale: [
      `1/4 below ${pct(PRESSURE_BANDS.idle)} · 2/4 to ${pct(PRESSURE_BANDS.heavy)} · 3/4 to ${pct(PRESSURE_BANDS.critical)} · 4/4 from ${pct(PRESSURE_BANDS.critical)} (broker liquidates at 100%)`,
    ],
  }
}
