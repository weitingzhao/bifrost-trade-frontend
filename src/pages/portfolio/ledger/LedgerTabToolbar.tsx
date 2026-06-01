import { cn } from '@/lib/utils'
import { InfoTooltip } from '@/components/ui/InfoTooltip'
import { TAB_GROUPS } from './ledgerConstants'
import { LedgerTabFilterRow, type LedgerTabFilterProps } from './LedgerTabFilters'
import type { MainTab } from './ledgerTypes'
import styles from './ledgerStyles'

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
    <div className={styles.ledgerToolbarPanel}>
      <div className={styles.ledgerToolbarTop}>
        <div className={styles.ledgerToolbarSplit}>
          <div className={styles.ledgerToolbarAttr}>
            <div className={styles.tabGroupCaptionAttr}>Attribution</div>
            <div className={styles.attrTabRow} role="tablist" aria-label="Attribution tabs">
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
                    className={cn(styles.splitTabBtn, active && styles.splitTabBtnActive)}
                  >
                    {t.label}
                  </button>
                )
              })}
            </div>
          </div>

          <div className={styles.ledgerToolbarInst}>
            <div className={styles.tabGroupCaptionInst}>Instruments</div>
            <div className={styles.instTabRow} role="tablist" aria-label="Instrument tabs">
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
                    className={cn(
                      styles.splitTabBtn,
                      active && styles.splitTabBtnActive,
                      i === 0 && styles.splitTabBtnInstruments,
                    )}
                  >
                    {t.label}
                  </button>
                )
              })}
            </div>
          </div>
        </div>

        <div className={styles.detailViewToolbar} role="toolbar" aria-label="Detail view mode">
          <span className={styles.detailViewLabel}>Detail view</span>
          <InfoTooltip text={DETAIL_VIEW_TOOLTIP} />
          <LedgerSegmentRadios
            accordionMode={accordionMode}
            onAccordionModeChange={onAccordionModeChange}
          />
        </div>
      </div>

      <LedgerTabFilterRow {...filters} />
    </div>
  )
}

function LedgerSegmentRadios({
  accordionMode,
  onAccordionModeChange,
}: {
  accordionMode: boolean
  onAccordionModeChange: (accordion: boolean) => void
}) {
  return (
    <div className={styles.segmentSwitch} role="radiogroup" aria-label="Detail view mode">
      <button
        type="button"
        role="radio"
        aria-checked={accordionMode}
        className={cn(styles.segmentBtn, accordionMode && styles.segmentBtnActive)}
        onClick={() => onAccordionModeChange(true)}
      >
        Accordion
      </button>
      <button
        type="button"
        role="radio"
        aria-checked={!accordionMode}
        className={cn(styles.segmentBtn, !accordionMode && styles.segmentBtnActive)}
        onClick={() => onAccordionModeChange(false)}
      >
        Multi
      </button>
    </div>
  )
}
