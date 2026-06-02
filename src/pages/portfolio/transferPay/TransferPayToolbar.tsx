import {
  InlinePnl,
  SegmentControl,
  segmentButtonClass,
  segmentGroupClass,
} from '@/components/data-display'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { fmtUsd } from '@/lib/format'
import type { SummaryTypeKey } from '@/utils/transferPay'
import { transferPayUi } from './transferPayUi'

const ALL_TYPES: SummaryTypeKey[] = ['deposit', 'withdrawal', 'dividend', 'other']

const TYPE_LABELS: Record<SummaryTypeKey, string> = {
  deposit: 'Deposit',
  withdrawal: 'Withdrawal',
  dividend: 'Dividend',
  other: 'Other',
}

type Props = {
  accountIds: string[]
  activeAccountId: string
  onActiveAccountId: (id: string) => void
  typeFilter: Set<SummaryTypeKey>
  onToggleType: (t: SummaryTypeKey) => void
  onToggleAllTypes: (on: boolean) => void
  pageSize: number
  onPageSize: (n: number) => void
  totalNet: number
  visibleCount: number
  safePage: number
  totalPages: number
  onPage: (page: number) => void
}

export function TransferPayToolbar({
  accountIds,
  activeAccountId,
  onActiveAccountId,
  typeFilter,
  onToggleType,
  onToggleAllTypes,
  pageSize,
  onPageSize,
  totalNet,
  visibleCount,
  safePage,
  totalPages,
  onPage,
}: Props) {
  const accountOptions = [
    { value: 'all', label: 'All accounts' },
    ...accountIds.map(id => ({ value: id, label: id })),
  ]

  return (
    <div className={transferPayUi.toolbar}>
      <SegmentControl
        size="sm"
        ariaLabel="Account tabs"
        value={activeAccountId}
        onChange={onActiveAccountId}
        options={accountOptions}
      />

      <fieldset className={transferPayUi.typesFilter} aria-label="Transaction types">
        <span className={transferPayUi.typesLegend}>Types</span>
        <div className={segmentGroupClass('sm')}>
          <button
            type="button"
            className={segmentButtonClass(typeFilter.size === ALL_TYPES.length, 'sm')}
            aria-pressed={typeFilter.size === ALL_TYPES.length}
            onClick={() => onToggleAllTypes(typeFilter.size !== ALL_TYPES.length)}
          >
            All
          </button>
          {ALL_TYPES.map(t => (
            <button
              key={t}
              type="button"
              className={segmentButtonClass(typeFilter.has(t), 'sm')}
              aria-pressed={typeFilter.has(t)}
              onClick={() => onToggleType(t)}
            >
              {TYPE_LABELS[t]}
            </button>
          ))}
        </div>
      </fieldset>

      <div className={transferPayUi.toolbarRight}>
        <label className="inline-flex items-center gap-1.5">
          <span>Rows:</span>
          <Select
            value={String(pageSize)}
            onValueChange={v => onPageSize(Number(v) || 15)}
          >
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
        <span>
          Net cash:{' '}
          <InlinePnl value={totalNet} className="font-semibold">
            {fmtUsd(totalNet)}
          </InlinePnl>
        </span>
        {visibleCount > 0 && (
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
  )
}
