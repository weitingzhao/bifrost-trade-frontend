import { InfoTooltip } from '@/components/ui/InfoTooltip'
import { LedgerSegmentBtn, LedgerSegmentSwitch } from './LedgerSegmentSwitch'
import { LedgerSortIcon as SortIcon } from './LedgerSortIcon'
import type { GroupBy, InstanceSubTab, MainTab, OptInstanceFilter, OptSortCol, OptSubTab } from './ledgerTypes'
import styles from './ledgerStyles'

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
    <div className={styles.filterSegmentRow} role="group">
      <span className={styles.tabFilterLabel}>{label}</span>
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
      <LedgerSegmentSwitch>
        {(['opportunity', 'structure', 'watchlist_symbol'] as const).map(v => (
          <LedgerSegmentBtn
            key={v}
            active={groupBy === v}
            onClick={() => setGroupBy(v)}
          >
            {v === 'opportunity' ? 'Opportunity' : v === 'structure' ? 'Structure' : 'Watchlist symbol'}
          </LedgerSegmentBtn>
        ))}
      </LedgerSegmentSwitch>
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
  return (
    <FilterRow label="Type">
      <LedgerSegmentSwitch>
        <LedgerSegmentBtn active={optRightFilter === ''} onClick={() => setOptRightFilter('')}>
          All
        </LedgerSegmentBtn>
        {(optionRights.includes('C') || optRightFilter === 'C') && (
          <LedgerSegmentBtn
            active={optRightFilter === 'C'}
            onClick={() => setOptRightFilter(prev => (prev === 'C' ? '' : 'C'))}
          >
            Call
          </LedgerSegmentBtn>
        )}
        {(optionRights.includes('P') || optRightFilter === 'P') && (
          <LedgerSegmentBtn
            active={optRightFilter === 'P'}
            onClick={() => setOptRightFilter(prev => (prev === 'P' ? '' : 'P'))}
          >
            Put
          </LedgerSegmentBtn>
        )}
      </LedgerSegmentSwitch>
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
    <div className={styles.filterSegmentInlineRow}>
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
    <div className={styles.ledgerToolbarFilters} aria-label="Tab filters">
      <div className={styles.ledgerToolbarFiltersInner}>
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
              <span className={styles.filterMetaInline}>
                Showing {filteredStrategyOpportunityGroupsLength} of {strategyOpportunityGroupsLength} opportunities
              </span>
            ) : null}
          </>
        )}

        {showInstance && (
          <>
            <div className={styles.filterSegmentInlineRow}>
              <LedgerSegmentSwitch role="tablist" aria-label="With instance and No instance">
                <LedgerSegmentBtn
                  role="tab"
                  aria-selected={instanceSubTab === 'with_instance'}
                  active={instanceSubTab === 'with_instance'}
                  disabled={instanceGroupsWithCount === 0}
                  onClick={() => setInstanceSubTab('with_instance')}
                >
                  With instance ({instanceGroupsWithCount})
                </LedgerSegmentBtn>
                <LedgerSegmentBtn
                  role="tab"
                  aria-selected={instanceSubTab === 'no_instance'}
                  active={instanceSubTab === 'no_instance'}
                  disabled={noInstanceOptGroupsLength === 0}
                  onClick={() => setInstanceSubTab('no_instance')}
                >
                  No instance ({noInstanceOptGroupsLength})
                </LedgerSegmentBtn>
              </LedgerSegmentSwitch>
              <div className={instanceSubTab === 'no_instance' ? styles.containOpenDisabled : undefined}>
                <FilterRow
                  label="Contain open"
                  tooltip="Filters the With instance list: Yes = at least one open (unrealized) option contract; No = only closed legs; All = every instance."
                >
                  <LedgerSegmentSwitch role="radiogroup" aria-label="Contain open">
                    {(['all', 'yes', 'no'] as const).map(v => (
                      <LedgerSegmentBtn
                        key={v}
                        role="radio"
                        aria-checked={instanceContainOpenFilter === v}
                        active={instanceContainOpenFilter === v}
                        disabled={instanceSubTab === 'no_instance'}
                        onClick={() => setInstanceContainOpenFilter(v)}
                      >
                        {v === 'all' ? 'All' : v === 'yes' ? 'Yes' : 'No'}
                      </LedgerSegmentBtn>
                    ))}
                  </LedgerSegmentSwitch>
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
              <span className={styles.filterMetaInline}>
                Showing {filteredInstanceGroupsLength} of {instanceGroupsLength}
              </span>
            )}
          </>
        )}

        {showOptions && (
          <>
            <LedgerSegmentSwitch role="tablist" aria-label="Closed Option and Open Option">
              <LedgerSegmentBtn
                role="tab"
                aria-selected={optSubTab === 'contracts'}
                active={optSubTab === 'contracts'}
                onClick={() => setOptSubTab('contracts')}
              >
                Closed Option ({filteredClosedOptGroupsLength})
              </LedgerSegmentBtn>
              <LedgerSegmentBtn
                role="tab"
                aria-selected={optSubTab === 'orphans'}
                active={optSubTab === 'orphans'}
                disabled={allOrphanGroupsLength === 0}
                onClick={() => setOptSubTab('orphans')}
              >
                Open Option ({allOrphanGroupsLength})
              </LedgerSegmentBtn>
            </LedgerSegmentSwitch>
            <div className={styles.filterSegmentInlineRow}>
              {optSubTab === 'contracts' && (
                <>
                  <FilterRow label="Instance">
                    <LedgerSegmentSwitch role="radiogroup" aria-label="Filter contracts by strategy instance status">
                      {([
                        { v: 'all' as const, label: 'All' },
                        { v: 'has_instance' as const, label: 'Has instance' },
                        { v: 'no_instance' as const, label: 'No instance' },
                        { v: 'mixed' as const, label: 'Mixed' },
                      ]).map(({ v, label }) => (
                        <LedgerSegmentBtn
                          key={v}
                          role="radio"
                          aria-checked={optInstanceFilter === v}
                          active={optInstanceFilter === v}
                          onClick={() => setOptInstanceFilter(v)}
                        >
                          {label}
                        </LedgerSegmentBtn>
                      ))}
                    </LedgerSegmentSwitch>
                  </FilterRow>
                  <FilterRow label="Sort">
                    <LedgerSegmentSwitch>
                      {(['expiry', 'trade_date'] as const).map(col => (
                        <LedgerSegmentBtn
                          key={col}
                          active={optSort.col === col}
                          onClick={() => toggleOptSort(col)}
                        >
                          {col === 'expiry' ? 'Expiry' : 'Trade Date'}{' '}
                          <SortIcon active={optSort.col === col} dir={optSort.dir} />
                        </LedgerSegmentBtn>
                      ))}
                    </LedgerSegmentSwitch>
                  </FilterRow>
                </>
              )}
              <FilterRow label="Type">
                <LedgerSegmentSwitch>
                  {(['', 'C', 'P'] as const).map(r => (
                    <LedgerSegmentBtn
                      key={r || 'all'}
                      active={optRightFilter === r}
                      onClick={() => setOptRightFilter(r)}
                    >
                      {r === '' ? 'All' : r === 'C' ? 'Call' : 'Put'}
                    </LedgerSegmentBtn>
                  ))}
                </LedgerSegmentSwitch>
              </FilterRow>
            </div>
          </>
        )}

        {showStk && (
          <div className={styles.filterSegmentInlineRow}>
            <LedgerSegmentSwitch role="tablist" aria-label="Stock view mode">
              <LedgerSegmentBtn
                role="tab"
                aria-selected={!groupByPosition}
                active={!groupByPosition}
                onClick={() => setGroupByPosition(false)}
              >
                Flat
              </LedgerSegmentBtn>
              <LedgerSegmentBtn
                role="tab"
                aria-selected={groupByPosition}
                active={groupByPosition}
                onClick={() => setGroupByPosition(true)}
              >
                Position
              </LedgerSegmentBtn>
            </LedgerSegmentSwitch>
            <LedgerSegmentSwitch role="tablist" aria-label="Stock category">
              {stkCategoryOptions.map(cat => (
                <LedgerSegmentBtn
                  key={cat}
                  role="tab"
                  aria-selected={effectiveStkCategoryTab === cat}
                  active={effectiveStkCategoryTab === cat}
                  onClick={() => { setStkCategoryTab(cat); setStkPage(0) }}
                >
                  {cat}
                </LedgerSegmentBtn>
              ))}
            </LedgerSegmentSwitch>
          </div>
        )}
      </div>
    </div>
  )
}
