import type { MainTab } from './ledgerTypes'

export const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
export const PAGE_SIZE = 50

export const TAB_GROUPS: { label: string; tabs: { id: MainTab; label: string }[] }[] = [
  {
    label: 'Attribution',
    tabs: [
      { id: 'strategy', label: 'Strategy' },
      { id: 'instance', label: 'Instance' },
    ],
  },
  {
    label: 'Instruments',
    tabs: [
      { id: 'options', label: 'Options' },
      { id: 'stocks', label: 'Stocks' },
      { id: 'fixed_income', label: 'Fixed Income' },
      { id: 'cash_like', label: 'Cash-like' },
    ],
  },
]
