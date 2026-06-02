import { InfoTooltip } from '@/components/ui/InfoTooltip'
import { SegmentControl, segmentButtonClass, segmentGroupClass } from '@/components/data-display'
import { LedgerSortIcon as SortIcon } from './LedgerSortIcon'
import type { GroupBy, InstanceSubTab, MainTab, OptInstanceFilter, OptSortCol, OptSubTab } from './ledgerTypes'
import { ledgerShell } from './ledgerShellUi'

export type LedgerTabFilterProps = {
  activeTab: MainTab
  hasOptExecs: boolean
  isStkTab: boolean
  groupBy: GroupBy
  setGroupBy: (v: GroupBy) => void
  optRightFilter: '' | 'C' | 'P'
  setOptRightFilter: (v: '' | 'C' | 'P' | ((prev: '' | 'C' | 'P') => '' | 'C' | 'P')) => void
  strategyPanelOptionRights: ('C' | 'P')[]
  strategyOpportunityGroupsLength: number
  filteredStrategyOpportunityGroupsLength: number
  instanceSubTab: InstanceSubTab
  setInstanceSubTab: (v: InstanceSubTab) => void
  instanceGroupsWithCount: number
  noInstanceOptGroupsLength: number
  instanceContainOpenFilter: 'all' | 'yes' | 'no'
  setInstanceContainOpenFilter: (v: 'all' | 'yes' | 'no') => void
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
  stkCategoryOptions: string[]
  effectiveStkCategoryTab: string
  setStkCategoryTab: (v: string) => void
  setStkPage: (v: number) => void
}

function FilterRow({
  label,
  tooltip,
  children,
}: {
  label: string
  tooltip?: string
  children: React.ReactNode
}) {
  return (
    <div className={ledgerShell.filterSegmentRow} role="group">
      <span className={ledgerShell.tabFilterLabel}>{label}</span>
      {tooltip ? <InfoTooltip text={tooltip} /> : null}
      {children}
    </div>
  )
}

function GroupSwitch({
  groupBy,
  setGroupBy,
}: {
  groupBy: GroupBy
  setGroupBy: (v: GroupBy) => void
}) {
  return (
    <FilterRow
      label="Group"
      tooltip="Group rows by opportunity (default), by strategy structure name, or by watchlist symbols on the opportunity."
    >
      <SegmentControl
        size="sm"
        value={groupBy}
        onChange={v => setGroupBy(v as GroupBy)}
        options={[
          { value: 'opportunity', label: 'Opportunity' },
          { value: 'structure', label: 'Structure' },
          { value: 'watchlist_symbol', label: 'Watchlist symbol' },
        ]}
      />
    </FilterRow>
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

  const options: { value: string; label: string }[] = [{ value: '', label: 'All' }]
  if (optionRights.includes('C') || optRightFilter === 'C') {
    options.push({ value: 'C', label: 'Call' })
  }
  if (optionRights.includes('P') || optRightFilter === 'P') {
    options.push({ value: 'P', label: 'Put' })
  }

  return (
    <FilterRow label="Type">
      <div className={segmentGroupClass('sm')}>
        {options.map(opt => (
          <button
            key={opt.value || 'all'}
            type="button"
            className={segmentButtonClass(optRightFilter === (opt.value as '' | 'C' | 'P'), 'sm')}
            aria-pressed={optRightFilter === opt.value}
            onClick={() => {
              if (opt.value === '') {
                setOptRightFilter('')
              } else {
                setOptRightFilter(prev =>
                  prev === opt.value ? '' : (opt.value as 'C' | 'P'),
                )
              }
            }}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </FilterRow>
  )
}

function GroupTypeInlineRow({
  groupBy,
  setGroupBy,
  optRightFilter,
  setOptRightFilter,
  optionRights,
}: {
  groupBy: GroupBy
  setGroupBy: (v: GroupBy) => void
  optRightFilter: '' | 'C' | 'P'
  setOptRightFilter: LedgerTabFilterProps['setOptRightFilter']
  optionRights: ('C' | 'P')[]
}) {
  const showType = optionRights.length > 1 || !!optRightFilter
  return (
    <div className={ledgerShell.filterSegmentInlineRow}>
      <GroupSwitch groupBy={groupBy} setGroupBy={setGroupBy} />
      {showType && (
        <TypeSwitch
          optRightFilter={optRightFilter}
          setOptRightFilter={setOptRightFilter}
          optionRights={optionRights}
        />
      )}
    </div>
  )
}

export function LedgerTabFilterRow(props: LedgerTabFilterProps) {
  const {
    activeTab,
    hasOptExecs,
    isStkTab,
    groupBy,
    setGroupBy,
    optRightFilter,
    setOptRightFilter,
    strategyPanelOptionRights,
    strategyOpportunityGroupsLength,
    filteredStrategyOpportunityGroupsLength,
    instanceSubTab,
    setInstanceSubTab,
    instanceGroupsWithCount,
    noInstanceOptGroupsLength,
    instanceContainOpenFilter,
    setInstanceContainOpenFilter,
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
    stkCategoryOptions,
    effectiveStkCategoryTab,
    setStkCategoryTab,
    setStkPage,
  } = props

  const showStrategyInst = activeTab === 'strategy' && hasOptExecs
  const showInstance = activeTab === 'instance' && hasOptExecs
  const showOptions = activeTab === 'options' && hasOptExecs
  const showStk = isStkTab && stkCategoryOptions.length > 2

  if (!showStrategyInst && !showInstance && !showOptions && !showStk) return null

  return (
    <div className={ledgerShell.toolbarFilters} aria-label="Tab filters">
      <div className={ledgerShell.toolbarFiltersInner}>
        {showStrategyInst && (
          <>
            <GroupTypeInlineRow
              groupBy={groupBy}
              setGroupBy={setGroupBy}
              optRightFilter={optRightFilter}
              setOptRightFilter={setOptRightFilter}
              optionRights={strategyPanelOptionRights}
            />
            {optRightFilter ? (
              <span className={ledgerShell.filterMetaInline}>
                Showing {filteredStrategyOpportunityGroupsLength} of {strategyOpportunityGroupsLength} opportunities
              </span>
            ) : null}
          </>
        )}

        {showInstance && (
          <>
            <div className={ledgerShell.filterSegmentInlineRow}>
              <SegmentControl
                size="sm"
                ariaLabel="With instance and No instance"
                value={instanceSubTab}
                onChange={v => setInstanceSubTab(v as InstanceSubTab)}
                options={[
                  {
                    value: 'with_instance',
                    label: `With instance (${instanceGroupsWithCount})`,
                    disabled: instanceGroupsWithCount === 0,
                  },
                  {
                    value: 'no_instance',
                    label: `No instance (${noInstanceOptGroupsLength})`,
                    disabled: noInstanceOptGroupsLength === 0,
                  },
                ]}
              />
              <div className={instanceSubTab === 'no_instance' ? ledgerShell.containOpenDisabled : undefined}>
                <FilterRow
                  label="Contain open"
                  tooltip="Filters the With instance list: Yes = at least one open (unrealized) option contract; No = only closed legs; All = every instance."
                >
                  <SegmentControl
                    size="sm"
                    ariaLabel="Contain open"
                    value={instanceContainOpenFilter}
                    onChange={v => setInstanceContainOpenFilter(v as 'all' | 'yes' | 'no')}
                    options={[
                      { value: 'all', label: 'All', disabled: instanceSubTab === 'no_instance' },
                      { value: 'yes', label: 'Yes', disabled: instanceSubTab === 'no_instance' },
                      { value: 'no', label: 'No', disabled: instanceSubTab === 'no_instance' },
                    ]}
                  />
                </FilterRow>
              </div>
            </div>
            {instanceSubTab === 'with_instance' && (
              <GroupTypeInlineRow
                groupBy={groupBy}
                setGroupBy={setGroupBy}
                optRightFilter={optRightFilter}
                setOptRightFilter={setOptRightFilter}
                optionRights={strategyPanelOptionRights}
              />
            )}
            {instanceSubTab === 'with_instance'
              && instanceContainOpenFilter !== 'all'
              && instanceGroupsLength > 0 && (
              <span className={ledgerShell.filterMetaInline}>
                Showing {filteredInstanceGroupsLength} of {instanceGroupsLength}
              </span>
            )}
          </>
        )}

        {showOptions && (
          <>
            <SegmentControl
              size="sm"
              ariaLabel="Closed Option and Open Option"
              value={optSubTab}
              onChange={v => setOptSubTab(v as OptSubTab)}
              options={[
                { value: 'contracts', label: `Closed Option (${filteredClosedOptGroupsLength})` },
                {
                  value: 'orphans',
                  label: `Open Option (${allOrphanGroupsLength})`,
                  disabled: allOrphanGroupsLength === 0,
                },
              ]}
            />
            <div className={ledgerShell.filterSegmentInlineRow}>
              {optSubTab === 'contracts' && (
                <>
                  <FilterRow label="Instance">
                    <SegmentControl
                      size="sm"
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
                  </FilterRow>
                  <FilterRow label="Sort">
                    <div className={segmentGroupClass('sm')}>
                      {(['expiry', 'trade_date'] as const).map(col => (
                        <button
                          key={col}
                          type="button"
                          className={segmentButtonClass(optSort.col === col, 'sm')}
                          aria-pressed={optSort.col === col}
                          onClick={() => toggleOptSort(col)}
                        >
                          {col === 'expiry' ? 'Expiry' : 'Trade Date'}{' '}
                          <SortIcon active={optSort.col === col} dir={optSort.dir} />
                        </button>
                      ))}
                    </div>
                  </FilterRow>
                </>
              )}
              <FilterRow label="Type">
                <SegmentControl
                  size="sm"
                  value={optRightFilter}
                  onChange={v => setOptRightFilter(v as '' | 'C' | 'P')}
                  options={[
                    { value: '', label: 'All' },
                    { value: 'C', label: 'Call' },
                    { value: 'P', label: 'Put' },
                  ]}
                />
              </FilterRow>
            </div>
          </>
        )}

        {showStk && (
          <div className={ledgerShell.filterSegmentInlineRow}>
            <SegmentControl
              size="sm"
              ariaLabel="Stock view mode"
              value={groupByPosition ? 'position' : 'flat'}
              onChange={v => setGroupByPosition(v === 'position')}
              options={[
                { value: 'flat', label: 'Flat' },
                { value: 'position', label: 'Position' },
              ]}
            />
            <SegmentControl
              size="sm"
              ariaLabel="Stock category"
              value={effectiveStkCategoryTab}
              onChange={v => {
                setStkCategoryTab(v)
                setStkPage(0)
              }}
              options={stkCategoryOptions.map(cat => ({ value: cat, label: cat }))}
            />
          </div>
        )}
      </div>
    </div>
  )
}
