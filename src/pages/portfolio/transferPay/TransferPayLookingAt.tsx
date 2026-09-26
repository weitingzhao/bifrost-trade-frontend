import { HelpCircle } from 'lucide-react'
import { InlinePnl, SegmentControl } from '@/components/data-display'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { fmtUsd } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { SummaryTypeKey } from '@/utils/transferPay'
import { KIND_BLURB, KIND_NAMES, KIND_RULE, type TransactionKind } from '@/utils/transactionKind'
import { transferPayUi } from './transferPayUi'
import { SectionHead } from '@/components/layout'

const ALL_TYPES: SummaryTypeKey[] = ['deposit', 'withdrawal', 'dividend', 'other']

const TYPE_LABELS: Record<SummaryTypeKey, string> = {
  deposit: 'Deposit',
  withdrawal: 'Withdrawal',
  dividend: 'Dividend',
  other: 'Other',
}

const TYPE_TITLE =
  'Type is multi-select — looking at transfers without the fee noise is a real use'

type Props = {
  accountIds: string[]
  activeAccountId: string
  onActiveAccountId: (id: string) => void
  accountCounts: Record<string, number>
  totalCount: number
  scopeCount: number
  typeFilter: Set<SummaryTypeKey>
  typeCounts: Record<SummaryTypeKey, number>
  onToggleType: (t: SummaryTypeKey) => void
  onToggleAllTypes: (on: boolean) => void
  kindFilter: Set<TransactionKind>
  kindCounts: Record<TransactionKind, number>
  onToggleKind: (k: TransactionKind) => void
  kindsOpen: boolean
  onKindsOpen: (open: boolean) => void
  pageSize: number
  onPageSize: (n: number) => void
  groupByMonth: boolean
  onGroupByMonth: (on: boolean) => void
  totalNet: number
  filteredCount: number
  safePage: number
  totalPages: number
  onPage: (page: number) => void
}

function Chip({
  label,
  count,
  active,
  title,
  onClick,
}: {
  label: string
  count: number
  active: boolean
  title: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      className={cn(transferPayUi.chip, active ? transferPayUi.chipOn : transferPayUi.chipOff)}
      aria-pressed={active}
      /* Spelled out, because the label and the count are separate text nodes and
         would otherwise be announced run together as "All accounts116". */
      aria-label={`${label}, ${count} events`}
      title={title}
      onClick={onClick}
    >
      {label}
      <span className={cn(transferPayUi.chipCount, count === 0 && 'opacity-50')}>{count}</span>
    </button>
  )
}

export function TransferPayLookingAt({
  accountIds,
  activeAccountId,
  onActiveAccountId,
  accountCounts,
  totalCount,
  scopeCount,
  typeFilter,
  typeCounts,
  onToggleType,
  onToggleAllTypes,
  kindFilter,
  kindCounts,
  onToggleKind,
  kindsOpen,
  onKindsOpen,
  pageSize,
  onPageSize,
  groupByMonth,
  onGroupByMonth,
  totalNet,
  filteredCount,
  safePage,
  totalPages,
  onPage,
}: Props) {
  const allTypesOn = typeFilter.size === ALL_TYPES.length

  return (
    <>
      <SectionHead note="Every chip carries its count — the distribution is the finding.">What I am looking at</SectionHead>

      <div className={transferPayUi.panel}>
        <div className={transferPayUi.chipRow}>
          <span className={transferPayUi.chipRowLabel}>Account</span>
          <div className={transferPayUi.chipGroup} role="group" aria-label="Account">
            <Chip
              label="All accounts"
              count={totalCount}
              active={activeAccountId === 'all'}
              title="Every account"
              onClick={() => onActiveAccountId('all')}
            />
            {accountIds.map(id => (
              <Chip
                key={id}
                label={id}
                count={accountCounts[id] ?? 0}
                active={activeAccountId === id}
                title="Cash events happen in an account even when it holds no positions"
                onClick={() => onActiveAccountId(id)}
              />
            ))}
          </div>
        </div>

        <div className={transferPayUi.chipRow}>
          <span className={transferPayUi.chipRowLabel}>Type</span>
          <div className={transferPayUi.chipGroup} role="group" aria-label="Type">
            <Chip
              label="All"
              count={scopeCount}
              active={allTypesOn}
              title="Select every type, or clear them all"
              onClick={() => onToggleAllTypes(!allTypesOn)}
            />
            {ALL_TYPES.map(t => (
              <Chip
                key={t}
                label={TYPE_LABELS[t]}
                count={typeCounts[t] ?? 0}
                active={typeFilter.has(t)}
                title={TYPE_TITLE}
                onClick={() => onToggleType(t)}
              />
            ))}
          </div>
          <button
            type="button"
            className={transferPayUi.iconToggle}
            aria-expanded={kindsOpen}
            title="How Other is broken down"
            aria-label="How Other is broken down"
            onClick={() => onKindsOpen(!kindsOpen)}
          >
            <HelpCircle className="h-3.5 w-3.5" />
          </button>
        </div>

        {kindsOpen && (
          <div className={transferPayUi.kindPanel}>
            <div className={transferPayUi.chipRow}>
              <span className={transferPayUi.chipRowLabel}>Kind · read from the description</span>
              <div className={transferPayUi.chipGroup} role="group" aria-label="Kind">
                {KIND_NAMES.map(k => (
                  <Chip
                    key={k}
                    label={k}
                    count={kindCounts[k] ?? 0}
                    active={kindFilter.has(k)}
                    title={KIND_BLURB[k] ?? k}
                    onClick={() => onToggleKind(k)}
                  />
                ))}
              </div>
            </div>
            <p className={transferPayUi.kindProse}>
              The broker labels three things — deposit, withdrawal, dividend — and everything else
              arrives as <span className="font-mono">other</span>: 73% of the 116 rows measured on
              DEV. Kind cuts across all four types and is read from the description, which every row
              has; it is a reading of this page, not a field from IB. Market-data fees are a cost and
              securities-lending income is income: one bucket cannot answer for both.{' '}
              <span className="font-mono">Financing</span> is the one class that deliberately holds
              both directions — interest earned, interest and borrow fees paid — so it can show a
              net; inside it the sign is coloured row by row.
            </p>
            <p className={transferPayUi.kindRule}>{KIND_RULE}</p>
          </div>
        )}

        <div className={transferPayUi.panelFoot}>
          <label className="inline-flex items-center gap-1.5">
            <span className={transferPayUi.chipRowLabel}>Rows</span>
            <Select value={String(pageSize)} onValueChange={v => onPageSize(Number(v) || 15)}>
              <SelectTrigger className="h-7 w-[4.5rem] text-xs" aria-label="Rows per page">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[10, 15, 30, 50, 100].map(n => (
                  <SelectItem key={n} value={String(n)}>
                    {n}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </label>

          <span className="inline-flex items-center gap-1.5">
            <span className={transferPayUi.chipRowLabel}>Group by month</span>
            <SegmentControl
              size="sm"
              ariaLabel="Group by month"
              value={groupByMonth ? 'on' : 'off'}
              onChange={v => onGroupByMonth(v === 'on')}
              options={[
                { value: 'on', label: 'On' },
                { value: 'off', label: 'Off' },
              ]}
            />
          </span>

          <span className={transferPayUi.netBlock}>
            <span className={transferPayUi.chipRowLabel}>Net cash · this selection</span>
            {filteredCount === 0 ? (
              <span className={transferPayUi.netDash}>—</span>
            ) : (
              <InlinePnl value={totalNet} className={transferPayUi.netValue}>
                {fmtUsd(totalNet)}
              </InlinePnl>
            )}
            <span className={transferPayUi.netNote}>
              {filteredCount} of {totalCount} events
            </span>
          </span>

          {filteredCount > 0 && (
            <div className={transferPayUi.paginationBar} aria-label="Transaction pages">
              <button
                type="button"
                className={transferPayUi.pageBtn}
                disabled={safePage <= 1}
                onClick={() => onPage(Math.max(1, safePage - 1))}
              >
                Prev
              </button>
              <span className={transferPayUi.pageInfo}>
                Page {safePage} of {totalPages}
              </span>
              <button
                type="button"
                className={transferPayUi.pageBtn}
                disabled={safePage >= totalPages}
                onClick={() => onPage(Math.min(totalPages, safePage + 1))}
              >
                Next
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
