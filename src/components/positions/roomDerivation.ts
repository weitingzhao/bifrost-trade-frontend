/**
 * Room to add as derivations the reader can walk - one per step, so the ?
 * beside a row answers that row's question and nothing else: which contracts
 * make up "31 calls, 8 puts", where the premium came from, why pressure is
 * 26%, and what the two bars behind the row are drawing.
 *
 * Every figure here is a page estimate and is badged as one; the broker sums
 * the pressure arithmetic runs on are badged IB. Nothing is recomputed: each
 * value is quoted from the same object the table reads.
 */
import type { Derivation, Variable, VariableItem } from '@/utils/derivation'
import type { CoverRow } from '@/utils/bookVsBase'
import { fmtExpiry, fmtUsd } from '@/utils/positions'
import type { LegPremium, RoomToAdd } from '@/utils/roomToAdd'

/** Which step's numbers to walk; 'all' is the whole model, from the section header. */
export type RoomView = 'now' | 'backed' | 'margin' | 'all'

const money = (v: number | null | undefined) => (v == null || !Number.isFinite(v) ? '—' : fmtUsd(v))
const money0 = (v: number | null | undefined) => (v == null || !Number.isFinite(v) ? '—' : fmtUsd(v, true))
const percent1 = (v: number | null | undefined) => (v == null || !Number.isFinite(v) ? '—' : `${(v * 100).toFixed(1)}%`)
const percent0 = (v: number | null | undefined) => (v == null || !Number.isFinite(v) ? '—' : `${Math.round(v * 100)}%`)
const plus = (n: number | null | undefined) => (n == null ? '—' : `${n >= 0 ? '+' : ''}${n.toLocaleString()}`)
const count = (n: number | null | undefined) => (n == null ? '—' : n.toLocaleString())
const num = (n: number) => n.toLocaleString(undefined, { maximumFractionDigits: 2 })

/** How the two meters behind every row read - the same lines on each step. */
const BAR_SCALE = [
  "Wide bar - premium per cycle, cumulative: this step's bar is every step up to it, each in its own colour, all three on one scale.",
  "Thin bar - pressure after this step, on the gauge's own 0-100% scale; ticks at 10, 50 and 75%, and the broker liquidates at 100%.",
]

const legLabel = (l: LegPremium) => `${l.accountId} ${l.underlying} ${l.strike}${l.right} ${fmtExpiry(l.expiry)}`

/** One row per contract line, most premium first - the legs a total was summed over. */
function legItems(legs: readonly LegPremium[], side: 'short' | 'long' | 'all' = 'all'): VariableItem[] {
  return legs
    .filter((l) => side === 'all' || l.side === side)
    .slice()
    .sort((a, b) => b.premium - a.premium)
    .map((l) => ({
      label: legLabel(l),
      sub: `${l.side === 'short' ? 'sold' : 'bought'} ${l.contracts} × ${money(l.premium / l.contracts / 100)}/share × 100`,
      value: `${l.side === 'short' ? '+' : '−'}${money(l.premium)}`,
      warn: l.premium === 0,
    }))
}

/** Contracts by account and symbol, so "31 calls" can be read off the book. */
function contractItems(legs: readonly LegPremium[], right: 'C' | 'P'): VariableItem[] {
  const by = new Map<string, { label: string; contracts: number; strikes: number[] }>()
  for (const l of legs) {
    if (l.side !== 'short' || l.right !== right) continue
    const key = `${l.accountId} ${l.underlying}`
    const cur = by.get(key) ?? { label: key, contracts: 0, strikes: [] }
    cur.contracts += l.contracts
    cur.strikes.push(l.strike)
    by.set(key, cur)
  }
  return [...by.values()]
    .sort((a, b) => b.contracts - a.contracts || a.label.localeCompare(b.label))
    .map((r) => ({
      label: r.label,
      sub: `strike${r.strikes.length === 1 ? '' : 's'} ${[...new Set(r.strikes)].sort((a, b) => a - b).join(', ')}`,
      value: count(r.contracts),
      dim: r.contracts === 0,
    }))
}

/**
 * Every holding that was considered, with the ones that actually add a contract
 * in the open and the rest dimmed — the reader asking "which twenty-five?" needs
 * to see that RKLB carries sixteen of them and that NVDA was looked at and had
 * nothing spare.
 */
function callItems(rows: readonly CoverRow[]): VariableItem[] {
  return rows
    .filter((r) => r.held > 0)
    .slice()
    .sort((a, b) => b.moreCalls - a.moreCalls || a.accountId.localeCompare(b.accountId) || a.symbol.localeCompare(b.symbol))
    .map((r) => ({
      label: `${r.accountId} ${r.symbol}`,
      sub: `${num(r.held)} held − ${num(r.backing)} backing = ${num(r.spare)} spare ÷ 100`,
      value: plus(r.moreCalls),
      dim: r.moreCalls === 0,
    }))
}

function accountPressureItems(r: RoomToAdd): VariableItem[] {
  return r.margin.accounts.map((a) => ({
    label: a.accountId,
    sub: `excess ${money(a.excessLiquidity)} ÷ NLV ${money(a.netLiquidation)} = cushion ${a.cushion == null ? '—' : a.cushion.toFixed(4)}`,
    value: percent0(a.pressure),
    warn: a.pressure == null,
  }))
}

export function roomDerivation(r: RoomToAdd, coverRows: readonly CoverRow[], view: RoomView = 'all'): Derivation {
  const tenor = r.now.tenor ? `${r.now.tenor.min}–${r.now.tenor.max} days` : 'the current expiries'
  const shortLegs = r.now.legs.filter((l) => l.side === 'short').length
  const longLegs = r.now.legs.length - shortLegs
  const callLines = contractItems(r.now.legs, 'C')
  const putLines = contractItems(r.now.legs, 'P')
  const variables: Variable[] = [
    {
      name: 'CallsNow',
      source: 'page',
      value: count(r.now.calls),
      formula: 'Σ short call contracts, per account × symbol',
      meaning: 'Every short call in scope, covered or naked - the contracts that could be called away.',
      items: callLines,
      itemsCaption: `${count(r.now.calls)} contracts over ${callLines.length} account × symbol line${callLines.length === 1 ? '' : 's'}`,
    },
    {
      name: 'PutsNow',
      source: 'page',
      value: count(r.now.puts),
      formula: 'Σ short put contracts, per account × symbol',
      meaning: 'Every short put in scope - the contracts that could put shares to you.',
      items: putLines,
      itemsCaption: `${count(r.now.puts)} contracts over ${putLines.length} account × symbol line${putLines.length === 1 ? '' : 's'}`,
    },
    {
      name: 'NetPremium',
      source: 'page',
      value: money(r.now.netPremium),
      formula: 'Σ credits sold − Σ debits bought, at entry',
      meaning:
        "What the open legs brought in when they were opened, from each leg's average cost per share × 100 × contracts. It is the entry credit, not today's mark-to-market: the account snapshot carries no option marks.",
      note: `${shortLegs} short leg${shortLegs === 1 ? '' : 's'}${longLegs > 0 ? ` less ${longLegs} long leg${longLegs === 1 ? '' : 's'}` : ''}, over ${tenor}.`,
      items: legItems(r.now.legs),
      itemsCaption: `Σ = ${money(r.now.netPremium)} per cycle`,
    },
    {
      name: 'PressureNow',
      source: 'page',
      value: percent0(r.now.pressure),
      formula: '1 − Cushion, over the accounts in scope',
      meaning:
        "How much of the accounts' liquidation value the broker's margin model has taken. Cushion is the broker's own field, ExcessLiquidity ÷ NetLiquidation; at 100% pressure the broker starts closing positions.",
      note: `Scope totals: excess ${money(r.now.excessLiquidity)} of ${money(r.now.netLiquidation)}. Margin by account walks each account's fields one by one.`,
      items: accountPressureItems(r),
    },
    {
      name: 'Calls',
      source: 'page',
      value: plus(r.backed.calls),
      formula: 'Σ spare shares ÷ 100, per account × symbol',
      meaning:
        'Covered calls the shares not already behind a call could back: whole 100-share lots, settled inside one account and one symbol - spare RKLB shares cannot back an NVDA call.',
      items: callItems(coverRows),
      itemsCaption: (() => {
        const rows = callItems(coverRows)
        const adds = rows.filter((i) => !i.dim).length
        return `${plus(r.backed.calls)} calls from ${adds} of ${rows.length} holdings · ${num(r.backed.freeShares)} free shares in all`
      })(),
    },
    {
      name: 'Puts',
      source: 'page',
      value: plus(r.backed.puts),
      formula: '{CashFree} ÷ {CashPerPut}',
      meaning: 'Cash-secured puts the free cash-like could stand behind, sized like the puts already held.',
      note: r.backed.puts == null ? 'No short put is held, so there is no size to extrapolate from; the free cash is shown on its own.' : undefined,
    },
    { name: 'CashFree', source: 'page', value: money(r.backed.cashFree), formula: '{CashLike} − {PutCashNeeded}', meaning: 'Cash-like not already reserved for a put assignment.' },
    {
      name: 'CashPerPut',
      source: 'page',
      value: money(r.backed.cashPerPut),
      formula: '{PutCashNeeded} ÷ {PutsNow}',
      meaning: 'Average strike × 100 of the short puts held - the cash one more put of the same kind would reserve.',
    },
    {
      name: 'Income',
      source: 'page',
      value: money0(r.backed.income),
      formula: '{PoolFree} × {Yield}',
      meaning: `Premium the free base would earn per cycle if sold at the yield the current book was sold at. A cycle is ${tenor} here.`,
      note: 'An extrapolation of entry premium, not a forecast: the same strikes, tenors and volatility as today.',
    },
    {
      name: 'Yield',
      source: 'page',
      value: percent1(r.pool.yieldPerCycle),
      formula: '{NetPremium} ÷ {PoolUsed}',
      meaning: 'What a dollar of backing in use earned at entry this cycle.',
    },
    {
      name: 'PoolFree',
      source: 'page',
      value: money(r.pool.free),
      formula: `free shares ${money(r.pool.freeSharesValue)} + {CashFree}`,
      meaning: 'Free shares at price plus free cash-like. Income ETFs are left out: they back nothing without margin.',
    },
    {
      name: 'PoolUsed',
      source: 'page',
      value: money(r.pool.used),
      meaning: `Shares behind calls at price ${money(r.pool.usedSharesValue)} plus cash behind puts ${money(r.pool.usedPutCash)} - the backing the current contracts hold.`,
    },
    {
      name: 'PressureBacked',
      source: 'page',
      value: percent0(r.backed.pressureAfter),
      formula: '1 − ({ExcessLiquidity} − {Puts} × {MarginPerPut}) ÷ {NetLiquidation}',
      meaning:
        'Where the gauge lands once the backed puts are on. Cash standing behind a put does not exempt it from margin, so each one still takes its Reg T requirement out of excess liquidity.',
      note:
        r.backed.putMargin == null
          ? undefined
          : `${money(r.backed.putMargin)} of margin for ${count(r.backed.puts)} put${r.backed.puts === 1 ? '' : 's'}, against excess ${money(r.now.excessLiquidity)}.`,
    },
    {
      name: 'MarginPuts',
      source: 'page',
      value: plus(r.margin.puts),
      formula: '{HeadroomLeft} ÷ {MarginPerPut}',
      meaning: 'Short puts on margin the headroom could carry before the Pressure gauge reaches the ceiling. Calls are not here: a call needs shares, not margin.',
      note: r.margin.unmodelledPuts > 0 ? `${r.margin.unmodelledPuts} short put${r.margin.unmodelledPuts === 1 ? '' : 's'} without a spot price could not be modelled.` : undefined,
    },
    {
      name: 'HeadroomLeft',
      source: 'page',
      value: money(r.margin.headroomAfterBacked),
      formula: '{Headroom} − {Puts} × {MarginPerPut}',
      meaning: 'The backed puts take Reg T margin too, so they come off the headroom first.',
    },
    {
      name: 'Headroom',
      source: 'page',
      value: money(r.margin.headroom),
      formula: 'Σ ({Ceiling} − pressure) × NetLiquidation, capped by AvailableFunds',
      meaning: 'Maintenance margin each account in scope could still take on before its pressure reaches the ceiling; never more than its available funds.',
      items: r.margin.accounts.map((a) => ({
        label: a.accountId,
        sub: `(${percent0(r.ceiling)} − ${percent0(a.pressure)}) × ${money(a.netLiquidation)}${a.availableFunds != null ? ` · available ${money(a.availableFunds)}` : ''}`,
        value: money(a.headroom),
        warn: a.headroom == null,
      })),
    },
    {
      name: 'MarginPerPut',
      source: 'page',
      value: money(r.margin.marginPerPut),
      formula: `average Reg T requirement over ${r.margin.models.reduce((n, m) => n + m.contracts, 0)} short puts held`,
      meaning:
        "IB's Reg T requirement for a naked put: premium + max(20% × spot − out-of-the-money amount, 10% × strike), × 100. Run on each short put held, weighted by contracts.",
      note: r.margin.leverage != null ? `${r.margin.leverage.toFixed(1)}× less than the ${money(r.backed.cashPerPut)} a cash-secured put reserves.` : undefined,
      items: r.margin.models.map((m) => ({
        label: `${m.underlying} ${m.strike}P ${fmtExpiry(m.expiry)}`,
        sub: `max(20% × ${money(m.spot)} − OTM ${money(m.otm)}, 10% × ${money(m.strike)}) + ${money(m.premiumPerShare)} premium, × 100 · ${m.contracts} contract${m.contracts === 1 ? '' : 's'}`,
        value: money(m.margin),
      })),
    },
    {
      name: 'MarginIncome',
      source: 'page',
      value: money0(r.margin.income),
      formula: '{MarginPuts} × {PremiumPerPut}',
      meaning: 'Premium those puts would bring at the average entry premium of the puts held.',
    },
    {
      name: 'PremiumPerPut',
      source: 'page',
      value: money(r.margin.premiumPerPut),
      formula: '{ShortPutPremium} ÷ {PutsNow}',
      meaning: 'Average entry credit of the short puts held.',
    },
    {
      name: 'PressureAfter',
      source: 'page',
      value: percent0(r.margin.pressureAfter),
      formula: '1 − ({ExcessLiquidity} − ({Puts} + {MarginPuts}) × {MarginPerPut}) ÷ {NetLiquidation}',
      meaning: 'Where the Pressure gauge lands with every put above added: each takes its Reg T margin out of excess liquidity.',
      note: 'By construction it lands just under the ceiling.',
    },
    { name: 'CashLike', source: 'page', value: money(r.backed.cashFree + r.pool.usedPutCash), meaning: 'TotalCashValue plus SGOV-class holdings, as the cockpit counts cash-like.' },
    { name: 'PutCashNeeded', source: 'page', value: money(r.pool.usedPutCash), meaning: 'Σ strike × 100 over the short puts held: the cash a full assignment would take.' },
    {
      name: 'ShortPutPremium',
      source: 'page',
      value: money(r.now.shortPutPremium),
      meaning: 'Entry credit of the short puts held.',
      items: legItems(r.now.legs.filter((l) => l.right === 'P'), 'short'),
    },
    { name: 'Ceiling', source: 'page', value: percent0(r.ceiling), meaning: 'The pressure the margin step may run up to - your setting on this section.' },
    { name: 'ExcessLiquidity', source: 'broker', value: money(r.now.excessLiquidity), meaning: 'Σ ExcessLiquidity over the accounts in scope, as the broker reports it.' },
    { name: 'NetLiquidation', source: 'broker', value: money(r.now.netLiquidation), meaning: 'Σ NetLiquidation over the accounts in scope, as the broker reports it.' },
  ]

  const ROOTS: Record<RoomView, string[]> = {
    now: ['CallsNow', 'PutsNow', 'NetPremium', 'PressureNow'],
    backed: ['Calls', 'Puts', 'Income', 'PressureBacked'],
    margin: ['MarginPuts', 'MarginIncome', 'PressureAfter'],
    all: ['CallsNow', 'PutsNow', 'NetPremium', 'PressureNow', 'Calls', 'Puts', 'Income', 'MarginPuts', 'MarginIncome', 'PressureAfter'],
  }
  const TITLE: Record<RoomView, string> = {
    now: 'Now — the book in scope',
    backed: 'Backed — what the free base carries',
    margin: `Margin — headroom to ${percent0(r.ceiling)}`,
    all: 'Room to add',
  }
  const INTRO: Record<RoomView, string> = {
    now: 'The contracts open in scope and what they brought in at entry, with the pressure the broker reports against them.',
    backed: 'What the shares and cash-like not already backing something could carry, at the yield this book was sold at.',
    margin: "What the maintenance headroom to your ceiling could carry, at IB's Reg T requirement for a naked put.",
    all: "Estimates from the book's own numbers: the base as the Backing ring draws it, the entry premium of the legs in scope, and IB's Reg T formula on the short puts held. Not the broker's what-if.",
  }
  return {
    title: TITLE[view],
    intro: `${INTRO[view]} Click a variable for what it means and how it checks out.`,
    roots: ROOTS[view],
    variables: Object.fromEntries(variables.map((v) => [v.name, v])),
    scale: BAR_SCALE,
  }
}
