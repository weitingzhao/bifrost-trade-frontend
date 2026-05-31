import { ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react'
import type { Execution } from '@/types/positions'
import type { OptionStockLinkSummary } from '@/types/trading'
import type { OptExecutionGroup } from '@/utils/ledger/optExecutionGroups'
import { ledgerExecutionDateKey } from '@/utils/ledger/summaryPeriod'

// ── Type aliases ──────────────────────────────────────────────────────────────

export type MainTab = 'strategy' | 'instance' | 'options' | 'stocks' | 'fixed_income' | 'cash_like'
export type OptSortCol = 'expiry' | 'trade_date'
export type StkSortCol = 'trade_date' | 'realized_pnl'
export type GroupBy = 'opportunity' | 'structure' | 'watchlist_symbol'
export type OptSubTab = 'contracts' | 'orphans'
export type InstanceSubTab = 'with_instance' | 'no_instance'
export type OptInstanceFilter = 'all' | 'has_instance' | 'no_instance' | 'mixed'

// ── Callback interfaces ───────────────────────────────────────────────────────

export type OptGroupCallbacks = {
  onEdit?: (e: Execution) => void
  onDelete?: (e: Execution) => void
  onLinkStrategy?: (e: Execution) => void
  onViewLinks?: (ctx: { title: string; oid: number }) => void
  onExpiredClose?: (e: Execution) => void
  syncingId?: number | null
  onSyncOpposite?: (e: Execution, src: { opportunity_id: number; instance_id: number }) => void
}

// ── Domain interfaces ─────────────────────────────────────────────────────────

export type StkPositionGroup = {
  key: string
  accountId: string
  symbol: string
  fills: Execution[]
  realized: number
  unrealized: number | null
  snap: { position: number; avgCost: number; price: number | null } | undefined
}

export type StratOppGroup = {
  opportunityId: number | 'none'
  title: string
  structure: string
  instanceSubgroups: {
    instanceId: number | 'none'
    label: string | null
    groups: OptExecutionGroup[]
  }[]
}

export type InstGroup = {
  instanceId: number
  label: string | null
  oppName: string | null
  structure: string
  groups: OptExecutionGroup[]
  trades: Execution[]
}

// ── Constants ─────────────────────────────────────────────────────────────────

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

// ── Utility functions ─────────────────────────────────────────────────────────

export function fmtCcy(n: number): string {
  return n.toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0 })
}

export function fmtPrice(n: number | null | undefined): string {
  if (n == null) return '—'
  return n.toFixed(2)
}

export function pnlClass(n: number): string {
  return n >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-500 dark:text-red-400'
}

export function fmtMdHint(iso: string): string {
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (!m) return iso
  return `${parseInt(m[2], 10)}/${parseInt(m[3], 10)}`
}

export function execMonthKey(e: Execution): string {
  const d = ledgerExecutionDateKey(e.trade_date ?? null, e.time)
  if (!d) return '0000-00'
  return d.slice(0, 7)
}

export function SortIcon({ active, dir }: { active: boolean; dir: 'asc' | 'desc' }) {
  if (!active) return <ArrowUpDown className="inline h-3 w-3 ml-0.5 opacity-40" />
  return dir === 'asc'
    ? <ArrowUp className="inline h-3 w-3 ml-0.5 text-primary" />
    : <ArrowDown className="inline h-3 w-3 ml-0.5 text-primary" />
}

// Re-export shared type used across sub-components
export type { OptExecutionGroup, OptionStockLinkSummary }
