import type { MainTab } from './ledgerTypes'

export type LedgerViewChip = {
  id: MainTab
  label: string
  countLabel: string
  title: string
  empty: boolean
}

export type LedgerInstrumentCounts = {
  closedOpt: number
  openOpt: number
  stocks: number
  fixedIncome: number
  cashLike: number
  combos: number
}

export function sharesAllCount(c: LedgerInstrumentCounts): number {
  return c.stocks + c.fixedIncome + c.cashLike + c.combos
}

export function buildAttributionChips(c: {
  opportunityCount: number
  instanceWith: number
  instanceWithout: number
}): LedgerViewChip[] {
  const instTotal = c.instanceWith + c.instanceWithout
  return [
    {
      id: 'strategy',
      label: 'Strategy',
      countLabel: String(c.opportunityCount),
      title: `${c.opportunityCount} opportunities`,
      empty: c.opportunityCount === 0,
    },
    {
      id: 'instance',
      label: 'Instance',
      countLabel: `${c.instanceWith} · ${c.instanceWithout}`,
      title: `${c.instanceWith} instances with · ${c.instanceWithout} without (${instTotal} total)`,
      empty: instTotal === 0,
    },
  ]
}

export function buildInstrumentChips(c: LedgerInstrumentCounts): LedgerViewChip[] {
  const all = sharesAllCount(c)
  const optTotal = c.closedOpt + c.openOpt
  return [
    {
      id: 'options',
      label: 'Options',
      countLabel: `${c.closedOpt} · ${c.openOpt}`,
      title: `${c.closedOpt} closed groups · ${c.openOpt} open groups`,
      empty: optTotal === 0,
    },
    {
      id: 'stocks',
      label: 'Stocks',
      countLabel: String(c.stocks),
      title: `${c.stocks} fills`,
      empty: c.stocks === 0,
    },
    {
      id: 'fixed_income',
      label: 'Fixed income',
      countLabel: String(c.fixedIncome),
      title: `${c.fixedIncome} fills`,
      empty: c.fixedIncome === 0,
    },
    {
      id: 'cash_like',
      label: 'Cash-like',
      countLabel: String(c.cashLike),
      title: `${c.cashLike} fills`,
      empty: c.cashLike === 0,
    },
    {
      id: 'combos',
      label: 'Combos',
      countLabel: String(c.combos),
      title: `${c.combos} fills`,
      empty: c.combos === 0,
    },
    {
      id: 'all',
      label: 'All',
      countLabel: String(all),
      title: `${all} fills (stocks, fixed income, cash-like, and combos)`,
      empty: all === 0,
    },
  ]
}
