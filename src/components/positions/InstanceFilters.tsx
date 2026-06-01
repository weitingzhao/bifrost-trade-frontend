import { bubbleButtonClass, bubbleGroupClass } from './charts/BubbleSwitch'
import { Button } from '@/components/ui/button'
import styles from './InstanceStrategyPanel.module.css'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'

import type { InstanceFilterValues } from '@/utils/filterInstanceGroups'

export type { InstanceFilterValues }

interface Props {
  structureTypes: string[]
  oppNames: string[]
  scopeTypes: string[]
  values: InstanceFilterValues
  onChange: (values: InstanceFilterValues) => void
}

function BubbleRadio({
  label,
  options,
  value,
  onChange,
}: {
  label: string
  options: { value: string; label: string }[]
  value: string
  onChange: (v: string) => void
}) {
  return (
    <div className={styles.filterBubbleRow}>
      <span className={styles.filterBubbleLabel}>{label}</span>
      <div className={bubbleGroupClass()}>
        {options.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className={bubbleButtonClass(value === opt.value)}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  )
}

export function InstanceFilters({ structureTypes, oppNames, scopeTypes, values, onChange }: Props) {
  const hasActiveFilter =
    values.structureType !== 'all' ||
    values.oppName !== 'all' ||
    values.scopeType !== 'all' ||
    values.attributionType !== 'all'

  function update(partial: Partial<InstanceFilterValues>) {
    onChange({ ...values, ...partial })
  }

  const scopeOptions = [
    { value: 'all', label: 'All' },
    { value: '__none__', label: 'None' },
    ...scopeTypes.filter((s) => s !== '').map((s) => ({
      value: s,
      label: s === 'watchlist_stk' ? 'Watchlist' : s === 'explicit_symbols' ? 'Explicit' : s,
    })),
  ]

  const attrOptions = [
    { value: 'all', label: 'All' },
    { value: 'single', label: 'Single' },
    { value: 'mixed', label: 'Mixed' },
    { value: 'unassigned', label: 'Unassigned' },
  ]

  return (
    <div className={styles.filters}>
      <Select value={values.structureType} onValueChange={(v) => update({ structureType: v })}>
        <SelectTrigger className="h-7 text-xs w-40 shrink-0">
          <SelectValue placeholder="All Contract Types" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Contract Types</SelectItem>
          {structureTypes.map((st) => (
            <SelectItem key={st} value={st}>
              {st.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={values.oppName} onValueChange={(v) => update({ oppName: v })}>
        <SelectTrigger className="h-7 text-xs w-44 shrink-0">
          <SelectValue placeholder="All Opportunities" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Opportunities</SelectItem>
          {oppNames.map((n) => (
            <SelectItem key={n} value={n}>{n}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      <BubbleRadio
        label="Symbol scope"
        options={scopeOptions.map((o) =>
          o.value === 'watchlist_stk'
            ? { ...o, label: 'Watchlist (stocks)' }
            : o.value === 'explicit_symbols'
              ? { ...o, label: 'Explicit symbols' }
              : o,
        )}
        value={values.scopeType}
        onChange={(v) => update({ scopeType: v })}
      />

      <BubbleRadio
        label="Attribution"
        options={attrOptions}
        value={values.attributionType}
        onChange={(v) => update({ attributionType: v })}
      />

      {hasActiveFilter && (
        <Button
          variant="outline"
          size="sm"
          className="h-7 text-xs"
          onClick={() => onChange({ structureType: 'all', oppName: 'all', scopeType: 'all', attributionType: 'all' })}
        >
          Clear Filters
        </Button>
      )}
    </div>
  )
}
