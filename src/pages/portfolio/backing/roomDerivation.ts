/**
 * Room to add as a derivation the reader can walk: each figure in the table,
 * the formula in the names of its inputs, and the rows a sum was taken over —
 * the spare shares per account × symbol, the headroom per account, the Reg T
 * requirement per short put. Every number is a page estimate and is badged
 * as one; the broker sums the pressure arithmetic runs on are badged IB.
 */
import type { Derivation, Variable, VariableItem } from '@/utils/derivation'
import type { CoverRow } from '@/utils/bookVsBase'
import { fmtExpiry, fmtUsd } from '@/utils/positions'
import type { RoomToAdd } from './roomToAdd'

const money = (v: number | null | undefined) => (v == null || !Number.isFinite(v) ? '—' : fmtUsd(v))
const money0 = (v: number | null | undefined) => (v == null || !Number.isFinite(v) ? '—' : fmtUsd(v, true))
const percent1 = (v: number | null | undefined) => (v == null || !Number.isFinite(v) ? '—' : `${(v * 100).toFixed(1)}%`)
const percent0 = (v: number | null | undefined) => (v == null || !Number.isFinite(v) ? '—' : `${Math.round(v * 100)}%`)
const contracts = (n: number | null | undefined) => (n == null ? '—' : `${n >= 0 ? '+' : ''}${n.toLocaleString()}`)
const num = (n: number) => n.toLocaleString(undefined, { maximumFractionDigits: 2 })

function callItems(rows: readonly CoverRow[]): VariableItem[] {
  return rows
    .filter((r) => r.held > 0)
    .map((r) => ({
      label: `${r.accountId} ${r.symbol}`,
      sub: `${num(r.held)} held − ${num(r.backing)} backing = ${num(r.spare)} spare ÷ 100`,
      value: contracts(r.moreCalls),
    }))
}

export function roomDerivation(r: RoomToAdd, coverRows: readonly CoverRow[]): Derivation {
  const tenor = r.now.tenor ? `${r.now.tenor.min}–${r.now.tenor.max} days` : 'the current expiries'
  const variables: Variable[] = [
    {
      name: 'Calls',
      source: 'page',
      value: contracts(r.backed.calls),
      formula: 'Σ spare shares ÷ 100, per account × symbol',
      meaning: 'Covered calls the shares not already behind a call could back: whole 100-share lots, settled inside one account and one symbol — spare RKLB shares cannot back an NVDA call.',
      items: callItems(coverRows),
      itemsCaption: `${num(r.backed.freeShares)} free shares in all`,
    },
    {
      name: 'Puts',
      source: 'page',
      value: contracts(r.backed.puts),
      formula: '{CashFree} ÷ {CashPerPut}',
      meaning: 'Cash-secured puts the free cash-like could stand behind, sized like the puts already held.',
      note: r.backed.puts == null ? 'No short put is held, so there is no size to extrapolate from; the free cash is shown on its own.' : undefined,
    },
    { name: 'CashFree', source: 'page', value: money(r.backed.cashFree), formula: '{CashLike} − {PutCashNeeded}', meaning: 'Cash-like not already reserved for a put assignment.' },
    {
      name: 'CashPerPut',
      source: 'page',
      value: money(r.backed.cashPerPut),
      formula: '{PutCashNeeded} ÷ {ShortPuts}',
      meaning: 'Average strike × 100 of the short puts held — the cash one more put of the same kind would reserve.',
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
      meaning: `Shares behind calls at price ${money(r.pool.usedSharesValue)} plus cash behind puts ${money(r.pool.usedPutCash)} — the backing the current contracts hold.`,
    },
    {
      name: 'NetPremium',
      source: 'page',
      value: money(r.now.netPremium),
      meaning: 'Short credits less long debits at entry, over the legs in scope, from each leg’s average cost.',
    },
    {
      name: 'MarginPuts',
      source: 'page',
      value: contracts(r.margin.puts),
      formula: '{HeadroomLeft} ÷ {MarginPerPut}',
      meaning: 'Short puts on margin the headroom could carry before the Pressure gauge reaches the ceiling. Calls are not here: a call needs shares, not margin.',
      note: r.margin.unmodelledPuts > 0 ? `${r.margin.unmodelledPuts} short put${r.margin.unmodelledPuts === 1 ? '' : 's'} without a spot price could not be modelled.` : undefined,
    },
    {
      name: 'HeadroomLeft',
      source: 'page',
      value: money(r.margin.headroomAfterBacked),
      formula: '{Headroom} − {Puts} × {MarginPerPut}',
      meaning: 'The backed puts take Reg T margin too — cash on hand does not exempt a short put from the requirement — so they come off the headroom first.',
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
      meaning: "IB's Reg T requirement for a naked put: premium + max(20% × spot − out-of-the-money amount, 10% × strike), × 100. Run on each short put held, weighted by contracts.",
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
      formula: '{ShortPutPremium} ÷ {ShortPuts}',
      meaning: 'Average entry credit of the short puts held.',
    },
    {
      name: 'PressureAfter',
      source: 'page',
      value: percent0(r.margin.pressureAfter),
      formula: '1 − ({ExcessLiquidity} − ({Puts} + {MarginPuts}) × {MarginPerPut}) ÷ {NetLiquidation}',
      meaning: 'Where the Pressure gauge lands with every put above added: each takes its Reg T margin out of excess liquidity.',
      note: 'By construction it lands just under the ceiling; the backed step alone is the same arithmetic with only its puts.',
    },
    { name: 'CashLike', source: 'page', value: money(r.backed.cashFree + r.pool.usedPutCash), meaning: 'TotalCashValue plus SGOV-class holdings, as the cockpit counts cash-like.' },
    { name: 'PutCashNeeded', source: 'page', value: money(r.pool.usedPutCash), meaning: 'Σ strike × 100 over the short puts held: the cash a full assignment would take.' },
    { name: 'ShortPuts', source: 'page', value: r.now.puts.toLocaleString(), meaning: 'Short put contracts in scope.' },
    { name: 'ShortPutPremium', source: 'page', value: money(r.now.shortPutPremium), meaning: 'Entry credit of the short puts held.' },
    { name: 'Ceiling', source: 'page', value: percent0(r.ceiling), meaning: 'The pressure the margin step may run up to — your setting on this section.' },
    { name: 'ExcessLiquidity', source: 'broker', value: money(r.now.excessLiquidity), meaning: 'Σ ExcessLiquidity over the accounts in scope, as the broker reports it.' },
    { name: 'NetLiquidation', source: 'broker', value: money(r.now.netLiquidation), meaning: 'Σ NetLiquidation over the accounts in scope, as the broker reports it.' },
  ]
  return {
    title: 'Room to add',
    intro: 'Estimates from the book’s own numbers: the base as the Backing ring draws it, the entry premium of the legs in scope, and IB’s Reg T formula on the short puts held. Not the broker’s what-if.',
    roots: ['Calls', 'Puts', 'Income', 'MarginPuts', 'MarginIncome', 'PressureAfter'],
    variables: Object.fromEntries(variables.map((v) => [v.name, v])),
  }
}
