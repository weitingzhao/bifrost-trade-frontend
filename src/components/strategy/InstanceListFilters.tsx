import { cn } from '@/lib/utils'
import { structureChipStyle } from '@/utils/structureColor'
import styles from '@/components/strategy/instances/instancesFilters.module.css'

export type StatusFilter = '' | 'open' | 'closed'
export type SinceFilter = '' | '1m' | 'q' | 'half' | '1y' | 'ytd'
export type RightFilter = '' | 'C' | 'P'

export interface InstanceFilterOptions {
  structures: string[]
  symbols: string[]
  rights: ('C' | 'P')[]
  expiryMonths: string[]
}

export interface InstanceListFilterValues {
  status: StatusFilter
  structure: string
  symbol: string
  right: RightFilter
  expiry: string
  since: SinceFilter
}

interface Props {
  options: InstanceFilterOptions
  values: InstanceListFilterValues
  sinceRangeText: string | null
  filteredCount: number
  totalCount: number
  onChange: (patch: Partial<InstanceListFilterValues>) => void
  onClear: () => void
}

const SINCE_OPTIONS: { key: SinceFilter; label: string }[] = [
  { key: '', label: 'All' },
  { key: '1m', label: '1 month' },
  { key: 'q', label: 'Quarter' },
  { key: 'half', label: 'Half year' },
  { key: '1y', label: '1 year' },
  { key: 'ytd', label: 'YTD' },
]

function fmtExpiryMonthBubble(ym: string): string {
  const [year, month] = ym.split('-')
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  const m = parseInt(month ?? '', 10) - 1
  if (!year || m < 0 || m > 11 || Number.isNaN(m)) return ym
  return `${months[m]} '${year.slice(2)}`
}

function BubbleButton({
  active,
  onClick,
  children,
  style,
  title,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
  style?: React.CSSProperties
  title?: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={style}
      title={title}
      className={cn(styles.bubbleBtn, active && styles.bubbleBtnActive)}
    >
      {children}
    </button>
  )
}

function FilterRow({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <div className={styles.filterPanelRow} role="group">
      <span className={styles.filterPanelLabel}>{label}</span>
      <div className={styles.bubbleRow}>{children}</div>
    </div>
  )
}

export function InstanceListFilters({
  options,
  values,
  sinceRangeText,
  filteredCount,
  totalCount,
  onChange,
  onClear,
}: Props) {
  const hasActive =
    values.status !== '' ||
    values.structure !== '' ||
    values.symbol !== '' ||
    values.right !== '' ||
    values.expiry !== '' ||
    values.since !== ''

  return (
    <div className={styles.filterPanel}>
      <FilterRow label="Status">
        {(['', 'open', 'closed'] as StatusFilter[]).map((key) => (
          <BubbleButton
            key={key || 'all'}
            active={values.status === key}
            onClick={() => onChange({ status: values.status === key ? '' : key })}
          >
            {key === '' ? 'All' : key === 'open' ? 'Open' : 'Closed'}
          </BubbleButton>
        ))}
      </FilterRow>

      {options.structures.length > 0 && (
        <FilterRow label="Structure">
          <BubbleButton
            active={values.structure === ''}
            onClick={() => onChange({ structure: '' })}
          >
            All
          </BubbleButton>
          {options.structures.map((s) => (
            <BubbleButton
              key={s}
              active={values.structure === s}
              onClick={() => onChange({ structure: values.structure === s ? '' : s })}
              style={structureChipStyle(s, values.structure === s)}
            >
              {s}
            </BubbleButton>
          ))}
        </FilterRow>
      )}

      {options.symbols.length > 0 && (
        <FilterRow label="Symbol">
          <BubbleButton
            active={values.symbol === ''}
            onClick={() => onChange({ symbol: '' })}
          >
            All
          </BubbleButton>
          {options.symbols.map((sym) => (
            <BubbleButton
              key={sym}
              active={values.symbol === sym}
              onClick={() => onChange({ symbol: values.symbol === sym ? '' : sym })}
            >
              {sym}
            </BubbleButton>
          ))}
        </FilterRow>
      )}

      {options.rights.length > 1 && (
        <FilterRow label="Type">
          <BubbleButton
            active={values.right === ''}
            onClick={() => onChange({ right: '' })}
          >
            All
          </BubbleButton>
          <BubbleButton
            active={values.right === 'C'}
            onClick={() => onChange({ right: values.right === 'C' ? '' : 'C' })}
          >
            Call
          </BubbleButton>
          <BubbleButton
            active={values.right === 'P'}
            onClick={() => onChange({ right: values.right === 'P' ? '' : 'P' })}
          >
            Put
          </BubbleButton>
        </FilterRow>
      )}

      <FilterRow label="Since">
        {SINCE_OPTIONS.map(({ key, label }) => (
          <BubbleButton
            key={key || 'all'}
            active={values.since === key}
            onClick={() => onChange({ since: values.since === key ? '' : key })}
          >
            {label}
          </BubbleButton>
        ))}
        {sinceRangeText != null && (
          <span className={styles.sinceHint}>{sinceRangeText}</span>
        )}
      </FilterRow>

      {options.expiryMonths.length > 1 && (
        <FilterRow label="Expiry">
          <BubbleButton
            active={values.expiry === ''}
            onClick={() => onChange({ expiry: '' })}
          >
            All
          </BubbleButton>
          {options.expiryMonths.map((m) => (
            <BubbleButton
              key={m}
              active={values.expiry === m}
              onClick={() => onChange({ expiry: values.expiry === m ? '' : m })}
              title={m}
            >
              {fmtExpiryMonthBubble(m)}
            </BubbleButton>
          ))}
        </FilterRow>
      )}

      {hasActive && (
        <div className={styles.filterMeta}>
          <span>
            Showing {filteredCount} of {totalCount} instances
          </span>
          <button type="button" className={styles.clearBtn} onClick={onClear}>
            Clear filters
          </button>
        </div>
      )}
    </div>
  )
}
