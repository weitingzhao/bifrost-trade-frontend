import { InfoTooltip } from '@/components/ui/InfoTooltip'
import { SegmentControl } from '@/components/data-display'
import { TAB_GROUPS } from './ledgerConstants'
import { LedgerTabFilterRow, type LedgerTabFilterProps } from './LedgerTabFilters'
import type { MainTab } from './ledgerTypes'
import { ledgerShell, ledgerSplitTabClass } from './ledgerShellUi'

const DETAIL_VIEW_TOOLTIP =
  'Accordion keeps one expandable panel open (strategy group, instance card, option detail rows, or other sections on this tab). Multi allows several.'

type Props = {
  activeTab: MainTab
  onTabChange: (tab: MainTab) => void
  hasOptExecs: boolean
  hasStkExecs: boolean
  hasFixedIncomeExecs: boolean
  hasCashLikeExecs: boolean
  accordionMode: boolean
  onAccordionModeChange: (accordion: boolean) => void
  filters: LedgerTabFilterProps
}

export function LedgerTabToolbar({
  activeTab,
  onTabChange,
  hasOptExecs,
  hasStkExecs,
  hasFixedIncomeExecs,
  hasCashLikeExecs,
  accordionMode,
  onAccordionModeChange,
  filters,
}: Props) {
  function isDisabled(tabId: MainTab): boolean {
    if (tabId === 'strategy' || tabId === 'instance' || tabId === 'options') return !hasOptExecs
    if (tabId === 'stocks') return !hasStkExecs
    if (tabId === 'fixed_income') return !hasFixedIncomeExecs
    if (tabId === 'cash_like') return !hasCashLikeExecs
    return false
  }

  const attrTabs = TAB_GROUPS[0].tabs
  const instTabs = TAB_GROUPS[1].tabs

  return (
    <div className={ledgerShell.toolbarPanel}>
      <div className={ledgerShell.toolbarTop}>
        <div className={ledgerShell.toolbarSplit}>
          <div className={ledgerShell.toolbarAttr}>
            <div className={ledgerShell.tabGroupCaption}>Attribution</div>
            <div className={ledgerShell.attrTabRow} role="tablist" aria-label="Attribution tabs">
              {attrTabs.map(t => {
                const disabled = isDisabled(t.id)
                const active = activeTab === t.id
                return (
                  <button
                    key={t.id}
                    type="button"
                    role="tab"
                    aria-selected={active}
                    disabled={disabled}
                    onClick={() => onTabChange(t.id)}
                    className={ledgerSplitTabClass(active)}
                  >
                    {t.label}
                  </button>
                )
              })}
            </div>
          </div>

          <div className={ledgerShell.toolbarInst}>
            <div className={ledgerShell.tabGroupCaption}>Instruments</div>
            <div className={ledgerShell.instTabRow} role="tablist" aria-label="Instrument tabs">
              {instTabs.map((t, i) => {
                const disabled = isDisabled(t.id)
                const active = activeTab === t.id
                return (
                  <button
                    key={t.id}
                    type="button"
                    role="tab"
                    aria-selected={active}
                    disabled={disabled}
                    onClick={() => onTabChange(t.id)}
                    className={ledgerSplitTabClass(active, i === 0)}
                  >
                    {t.label}
                  </button>
                )
              })}
            </div>
          </div>
        </div>

        <div className={ledgerShell.detailViewToolbar} role="toolbar" aria-label="Detail view mode">
          <span className={ledgerShell.detailViewLabel}>Detail view</span>
          <InfoTooltip text={DETAIL_VIEW_TOOLTIP} />
          <SegmentControl
            size="sm"
            ariaLabel="Detail view mode"
            options={[
              { value: 'accordion', label: 'Accordion' },
              { value: 'multi', label: 'Multi' },
            ]}
            value={accordionMode ? 'accordion' : 'multi'}
            onChange={v => onAccordionModeChange(v === 'accordion')}
          />
        </div>
      </div>

      <LedgerTabFilterRow {...filters} />
    </div>
  )
}
