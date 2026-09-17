import type { ReactNode } from 'react'
import { InfoTooltip } from '@/components/ui/InfoTooltip'
import { SegmentControl, segmentButtonClass, segmentGroupClass } from '@/components/data-display'
import { LedgerSortIcon as SortIcon } from './LedgerSortIcon'
import type {
  GroupBy,
  InstanceSubTab,
  MainTab,
  OptInstanceFilter,
  OptSortCol,
  OptSubTab,
  StrategyScope,
} from './ledgerTypes'
import { isSharesTab } from './ledgerTypes'
import { ledgerChipClass, ledgerShell } from './ledgerShellUi'

export type LedgerTabFilterProps = {
  activeTab: MainTab
  hasOptExecs: boolean
  groupBy: GroupBy
  setGroupBy: (v: GroupBy) => void
  optRightFilter: '' | 'C' | 'P'
  setOptRightFilter: (v: '' | 'C' | 'P' | ((prev: '' | 'C' | 'P') => '' | 'C' | 'P')) => void
  strategyPanelOptionRights: ('C' | 'P')[]
  strategyOpportunityGroupsLength: number
  filteredStrategyOpportunityGroupsLength: number
  strategyScope: StrategyScope
  setStrategyScope: (v: StrategyScope) => void
  strategyUnlinkedCount: number
  instanceSubTab: InstanceSubTab
  setInstanceSubTab: (v: InstanceSubTab) => void
  instanceGroupsWithCount: number
  noInstanceOptGroupsLength: number
  containsOpenCount: number
  filteredInstanceGroupsLength: number
  instanceGroupsLength: number
  optSubTab: OptSubTab
  setOptSubTab: (v: OptSubTab) => void
  filteredClosedOptGroupsLength: number
  allOrphanGroupsLength: number
  optInstanceFilter: OptInstanceFilter
  setOptInstanceFilter: (v: OptInstanceFilter) => void
  optSort: { col: OptSortCol; dir: 'asc' | 'desc' }
  toggleOptSort: (col: OptSortCol) => void
  groupByPosition: boolean
  setGroupByPosition: (v: boolean) => void
  stkCategoryTab: string
  setStkCategoryTab: (v: string) => void
  uncategorizedCount: number
  stkFillCount: number
  stkGroupCount: number
}

const VIEW_HINT = {
  strategy: 'three levels: opportunity → instance → contract',
  instance: 'row actions write to the ledger only',
  options: 'both sides of a closed contract on one row · the fills are below',
  shares: 'stocks, fixed income, cash-like and combos share one table',
} as const

type SubChip<T extends string> = { value: T; label: string; count: string; empty: boolean }

function Control({ label, tooltip, children }: { label: string; tooltip?: string; children: ReactNode }) {
  return (
    <span className={ledgerShell.inlineControl} role="group" aria-label={label}>
      <span className={ledgerShell.cap}>{label}</span>
      {tooltip ? <InfoTooltip text={tooltip} /> : null}
      {children}
    </span>
  )
}

function SubChips<T extends string>({
  label,
  value,
  onChange,
  chips,
}: {
  label: string
  value: T
  onChange: (v: T) => void
  chips: SubChip<T>[]
}) {
  return (
    <span className={ledgerShell.inlineControl}>
      <span className={ledgerShell.cap}>{label}</span>
      <span className={ledgerShell.chipRow} role="radiogroup" aria-label={label}>
        {chips.map(chip => {
          const active = chip.value === value
          return (
            <button
              key={chip.value}
              type="button"
              role="radio"
              aria-checked={active}
              title={chip.empty ? 'Nothing here for the current filters' : chip.label}
              onClick={() => onChange(chip.value)}
              className={ledgerChipClass(active, chip.empty, false)}
            >
              {chip.label}
              {chip.count ? <span className="font-mono font-normal opacity-80">{chip.count}</span> : null}
            </button>
          )
        })}
      </span>
    </span>
  )
}

function countChip<T extends string>(value: T, label: string, n: number, unit = ''): SubChip<T> {
  return { value, label, count: unit ? `${n} ${unit}` : String(n), empty: n === 0 }
}

function GroupSwitch({ groupBy, setGroupBy }: { groupBy: GroupBy; setGroupBy: (v: GroupBy) => void }) {
  return (
    <Control
      label="Group"
      tooltip="Group rows by opportunity (default), by strategy structure name, or by watchlist symbols on the opportunity."
    >
      <SegmentControl
        size="xs"
        ariaLabel="Group by"
        value={groupBy}
        onChange={v => setGroupBy(v as GroupBy)}
        options={[
          { value: 'opportunity', label: 'Opportunity' },
          { value: 'structure', label: 'Structure' },
          { value: 'watchlist_symbol', label: 'Watchlist symbol' },
        ]}
      />
    </Control>
  )
}

function TypeSwitch({
  optRightFilter,
  setOptRightFilter,
  optionRights,
}: {
  optRightFilter: '' | 'C' | 'P'
  setOptRightFilter: LedgerTabFilterProps['setOptRightFilter']
  optionRights: ('C' | 'P')[]
}) {
  if (optionRights.length <= 1 && !optRightFilter) return null

  const options: { value: '' | 'C' | 'P'; label: string }[] = [{ value: '', label: 'All' }]
  if (optionRights.includes('C') || optRightFilter === 'C') options.push({ value: 'C', label: 'Call' })
  if (optionRights.includes('P') || optRightFilter === 'P') options.push({ value: 'P', label: 'Put' })

  return (
    <Control label="Type">
      <div className={segmentGroupClass('xs')}>
        {options.map(opt => (
          <button
            key={opt.value || 'all'}
            type="button"
            className={segmentButtonClass(optRightFilter === opt.value, 'xs')}
            aria-pressed={optRightFilter === opt.value}
            onClick={() => {
              if (opt.value === '') setOptRightFilter('')
              else setOptRightFilter(prev => (prev === opt.value ? '' : opt.value))
            }}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </Control>
  )
}

/** Second row of the view selector: the active view's sub-views, its axis, and what it is for. */
export function LedgerTabFilterRow(props: LedgerTabFilterProps) {
  const {
    activeTab,
    hasOptExecs,
    groupBy,
    setGroupBy,
    optRightFilter,
    setOptRightFilter,
    strategyPanelOptionRights,
    strategyOpportunityGroupsLength,
    filteredStrategyOpportunityGroupsLength,
    strategyScope,
    setStrategyScope,
    strategyUnlinkedCount,
    instanceSubTab,
    setInstanceSubTab,
    instanceGroupsWithCount,
    noInstanceOptGroupsLength,
    containsOpenCount,
    filteredInstanceGroupsLength,
    instanceGroupsLength,
    optSubTab,
    setOptSubTab,
    filteredClosedOptGroupsLength,
    allOrphanGroupsLength,
    optInstanceFilter,
    setOptInstanceFilter,
    optSort,
    toggleOptSort,
    groupByPosition,
    setGroupByPosition,
    stkCategoryTab,
    setStkCategoryTab,
    uncategorizedCount,
    stkFillCount,
    stkGroupCount,
  } = props

  const showStrategy = activeTab === 'strategy' && hasOptExecs
  const showInstance = activeTab === 'instance'
  const showOptions = activeTab === 'options'
  const showStk = isSharesTab(activeTab)

  if (!showStrategy && !showInstance && !showOptions && !showStk) return null

  const typeSwitch = (
    <TypeSwitch
      optRightFilter={optRightFilter}
      setOptRightFilter={setOptRightFilter}
      optionRights={strategyPanelOptionRights}
    />
  )
  const hint = showStrategy
    ? VIEW_HINT.strategy
    : showInstance
      ? VIEW_HINT.instance
      : showOptions
        ? VIEW_HINT.options
        : VIEW_HINT.shares

  const sharesLayout = stkCategoryTab === 'Uncategorized' ? 'uncat' : groupByPosition ? 'position' : 'flat'

  return (
    <div className={ledgerShell.selectorSub} aria-label="View filters">
      {showStrategy && (
        <>
          <SubChips<StrategyScope>
            label="Scope"
            value={strategyScope}
            onChange={setStrategyScope}
            chips={[
              countChip('all', 'All opportunities', filteredStrategyOpportunityGroupsLength),
              countChip('unlinked', 'No opportunity', strategyUnlinkedCount),
            ]}
          />
          <GroupSwitch groupBy={groupBy} setGroupBy={setGroupBy} />
          {typeSwitch}
          {optRightFilter ? (
            <span className={ledgerShell.filterMetaInline}>
              Showing {filteredStrategyOpportunityGroupsLength} of {strategyOpportunityGroupsLength} opportunities
            </span>
          ) : null}
        </>
      )}

      {showInstance && (
        <>
          <SubChips<InstanceSubTab>
            label="Instance"
            value={instanceSubTab}
            onChange={setInstanceSubTab}
            chips={[
              countChip('with_instance', 'With instance', instanceGroupsWithCount),
              countChip('no_instance', 'No instance', noInstanceOptGroupsLength),
              countChip('contains_open', 'Contains open', containsOpenCount),
            ]}
          />
          {instanceSubTab !== 'no_instance' && (
            <>
              <GroupSwitch groupBy={groupBy} setGroupBy={setGroupBy} />
              {typeSwitch}
            </>
          )}
          {instanceSubTab === 'contains_open' && instanceGroupsLength > 0 && (
            <span className={ledgerShell.filterMetaInline}>
              Showing {filteredInstanceGroupsLength} of {instanceGroupsLength}
            </span>
          )}
        </>
      )}

      {showOptions && (
        <>
          <SubChips<OptSubTab>
            label="State"
            value={optSubTab}
            onChange={setOptSubTab}
            chips={[
              countChip('contracts', 'Closed option', filteredClosedOptGroupsLength),
              countChip('orphans', 'Open option', allOrphanGroupsLength),
            ]}
          />
          {optSubTab === 'contracts' && (
            <>
              <Control label="Sort">
                <div className={segmentGroupClass('xs')}>
                  {(['expiry', 'trade_date'] as const).map(col => (
                    <button
                      key={col}
                      type="button"
                      className={segmentButtonClass(optSort.col === col, 'xs')}
                      aria-pressed={optSort.col === col}
                      onClick={() => toggleOptSort(col)}
                    >
                      {col === 'expiry' ? 'Expiry' : 'Trade date'}{' '}
                      <SortIcon active={optSort.col === col} dir={optSort.dir} />
                    </button>
                  ))}
                </div>
              </Control>
              <Control label="Instance">
                <SegmentControl
                  size="xs"
                  ariaLabel="Filter contracts by strategy instance status"
                  value={optInstanceFilter}
                  onChange={v => setOptInstanceFilter(v as OptInstanceFilter)}
                  options={[
                    { value: 'all', label: 'All' },
                    { value: 'has_instance', label: 'Has instance' },
                    { value: 'no_instance', label: 'No instance' },
                    { value: 'mixed', label: 'Mixed' },
                  ]}
                />
              </Control>
            </>
          )}
          <Control label="Type">
            <SegmentControl
              size="xs"
              ariaLabel="Option type"
              value={optRightFilter}
              onChange={v => setOptRightFilter(v as '' | 'C' | 'P')}
              options={[
                { value: '', label: 'All' },
                { value: 'C', label: 'Call' },
                { value: 'P', label: 'Put' },
              ]}
            />
          </Control>
        </>
      )}

      {showStk && (
        <SubChips<'position' | 'flat' | 'uncat'>
          label="Layout"
          value={sharesLayout}
          onChange={v => {
            if (v === 'uncat') {
              setStkCategoryTab('Uncategorized')
              return
            }
            setStkCategoryTab('All')
            setGroupByPosition(v === 'position')
          }}
          chips={[
            // Groups are only built while the layout is By position; elsewhere there is no count to show.
            sharesLayout === 'position'
              ? countChip('position', 'By position', stkGroupCount, stkGroupCount === 1 ? 'group' : 'groups')
              : { value: 'position', label: 'By position', count: '', empty: false },
            countChip('flat', 'Flat', stkFillCount, stkFillCount === 1 ? 'fill' : 'fills'),
            countChip('uncat', 'Uncategorized', uncategorizedCount),
          ]}
        />
      )}

      <span className={ledgerShell.viewHint}>{hint}</span>
    </div>
  )
}
