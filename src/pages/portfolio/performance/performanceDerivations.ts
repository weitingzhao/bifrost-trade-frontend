import { fmtIsoDateToken, fmtUsd } from '@/lib/format'
import type { Derivation, Variable } from '@/utils/derivation'
import type { GrowthLayer, OptionsPnLMode } from '@/utils/ledger/equityGrowthChart'
import type { OptionsModeBridgeSummary } from '@/utils/ledger/optionsModeBridge'
import type { CalendarAssetTab } from './performanceCalendarModel'

export type PerformanceTree = 'bridge' | 'equity' | 'calendar' | 'otf'

export const PERFORMANCE_TREES: { id: PerformanceTree; label: string }[] = [
  { id: 'bridge', label: 'Options mode' },
  { id: 'equity', label: 'Equity growth' },
  { id: 'calendar', label: 'Day cell · R/U/N' },
  { id: 'otf', label: 'On the fly' },
]

const usd = (v: number | null | undefined) => (v == null ? '—' : fmtUsd(v))

function vars(list: Variable[]): Record<string, Variable> {
  return Object.fromEntries(list.map((v) => [v.name, v]))
}

/** Book, Economic and Total for the options layer, and how far apart they land. */
export function optionsModeDerivation(s: OptionsModeBridgeSummary | null, asOfDate: string | null): Derivation {
  const asOf = asOfDate ? fmtIsoDateToken(asOfDate) : 'today'
  return {
    title: 'Options mode',
    intro:
      'The options layer read three ways. Book is what the contracts realized; Economic nets same-day rolls to the cash that moved; Total adds what is still unpaired today.',
    roots: ['Total', 'Economic', 'Econ − Total'],
    variables: vars([
      { name: 'Book R', source: 'page', value: usd(s?.bookR), meaning: 'Option P&L realized in the range, contract by contract, FIFO.' },
      {
        name: 'Σ roll adj',
        source: 'page',
        value: usd(s?.sumRollAdj),
        meaning: 'For each same-day roll: the roll’s net cash minus the Book close it replaced.',
        note: 'Zero when no position was closed and reopened on the same day.',
      },
      {
        name: 'Open',
        source: 'page',
        value: usd(s?.open),
        meaning: `Premium still unpaired as of ${asOf}.`,
        note: 'An inventory, not a gain: it becomes realized only when the legs close.',
      },
      { name: 'Economic', source: 'page', value: usd(s?.economic), meaning: 'Book with each same-day roll counted at its cash.', formula: '{Book R} + {Σ roll adj}' },
      { name: 'Total', source: 'page', value: usd(s?.total), meaning: 'Book plus the premium still open.', formula: '{Book R} + {Open}' },
      {
        name: 'Econ − Total',
        source: 'page',
        value: usd(s?.econMinusTotal),
        meaning: 'How far the two non-Book readings sit apart.',
        formula: '{Economic} − {Total}',
      },
    ]),
  }
}

const LAYER_NAME: Record<GrowthLayer, string> = {
  options: 'Options',
  stocks: 'Stocks',
  fixed_income: 'FI Stream',
  cash_like: 'Cash-like',
}

/** The Total line on the curve is only the layers switched on; Net PnL is always all four on Book. */
export function equityGrowthDerivation(p: {
  last: Record<GrowthLayer, number> | null
  netPnl: number | null
  bookR: number | null
  visible: Record<GrowthLayer, boolean>
  mode: OptionsPnLMode
}): Derivation {
  const layers = Object.keys(LAYER_NAME) as GrowthLayer[]
  const on = layers.filter((k) => p.visible[k])
  const totalValue = p.last ? on.reduce((sum, k) => sum + p.last![k], 0) : null
  return {
    title: 'Equity growth',
    intro:
      'Each layer is cumulative through the last day of the range. The switches change which layers the Total line adds up; Net PnL ignores them.',
    roots: ['Total line', 'Net PnL'],
    variables: vars([
      ...layers.map((k): Variable => ({
        name: LAYER_NAME[k],
        source: 'page',
        value: usd(p.last?.[k]),
        meaning:
          k === 'options'
            ? `Options in ${p.mode} mode.`
            : k === 'fixed_income'
              ? 'Money into and out of the fixed-income bucket (buy +, sell −) — a stream, not P&L.'
              : `Realized P&L on ${LAYER_NAME[k].toLowerCase()} fills.`,
        note: p.visible[k] ? 'Switched on.' : 'Switched off — not in the Total line.',
      })),
      { name: 'Options · Book', source: 'page', value: usd(p.bookR), meaning: 'Options realized, whatever the mode switch says.' },
      {
        name: 'Total line',
        source: 'page',
        value: usd(totalValue),
        meaning: 'The white line and the Total figure.',
        formula: on.length ? on.map((k) => `{${LAYER_NAME[k]}}`).join(' + ') : '0',
      },
      {
        name: 'Net PnL',
        source: 'page',
        value: usd(p.netPnl),
        meaning: 'The whole book on Book, never filtered by the switches.',
        formula: '{Options · Book} + {Stocks} + {FI Stream} + {Cash-like}',
      },
    ]),
  }
}

/** What a calendar cell holds on the current layer, read on the selected day when there is one. */
export function dayCellDerivation(tab: CalendarAssetTab, day: { date: string; realized: number; unrealized: number; notional: number } | null): Derivation {
  const on = day ? ` on ${fmtIsoDateToken(day.date)}` : ''
  const isStk = tab !== 'options'
  const flowName = tab === 'fixed_income' ? 'S' : 'N'
  return {
    title: 'Day cell',
    intro: day
      ? `The cell for ${fmtIsoDateToken(day.date)} on this layer. The two numbers are different kinds and are never added.`
      : 'Pick a day in the calendar to read its cell. The two numbers are different kinds and are never added.',
    roots: isStk ? ['R', flowName] : ['R', 'U'],
    variables: vars(
      isStk
        ? [
          { name: 'R', source: 'page', value: usd(day?.realized), meaning: `Broker realized_pnl summed over the fills in this bucket${on}.` },
          {
            name: flowName,
            source: 'page',
            value: usd(day?.notional),
            meaning:
              tab === 'fixed_income'
                ? `Money flow into the bucket${on}: buy +, sell −.`
                : tab === 'cash_like'
                  ? `Traded size${on}: Σ |qty| × price.`
                  : `Signed trade size${on}: sell +, buy −.`,
          },
        ]
        : [
          {
            name: 'R',
            source: 'page',
            value: usd(day?.realized),
            meaning: `P&L on option pairs that closed${on}, FIFO, plus prorated slippage of linked stock fills.`,
          },
          {
            name: 'U',
            source: 'page',
            value: usd(day?.unrealized),
            meaning: `Premium cash from fills${on} still unmatched.`,
            note: 'A path figure: it is not the open P&L as of today — that is Open in the options chip.',
          },
        ],
    ),
  }
}

/** What On the fly counts, and why its fills are not in the book. */
export function onTheFlyDerivation(): Derivation {
  return {
    title: 'On the fly',
    intro:
      'Fills the official book does not cover yet. They sit outside every strategy until Flex or a journal row records them.',
    roots: ['On the fly'],
    variables: vars([
      { name: 'TWS fills', source: 'broker', value: '—', meaning: 'Executions reported by TWS in the same range and strategy filters.' },
      {
        name: 'Covered by the book',
        source: 'page',
        value: '—',
        meaning: 'A TWS fill whose account and contract already have a row in the Flex or journal ledger.',
      },
      { name: 'BAG legs', source: 'broker', value: '—', meaning: 'Option combo legs, left out so a combo is not counted twice.' },
      {
        name: 'On the fly',
        source: 'page',
        value: '—',
        meaning: 'What is left. Open the On the fly panel for the fills and their P&L.',
        formula: '{TWS fills} − {Covered by the book} − {BAG legs}',
      },
    ]),
  }
}
