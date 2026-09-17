import { InfoTooltip } from '@/components/ui/InfoTooltip'
import { SegmentControl } from '@/components/data-display'
import { LedgerTabFilterRow, type LedgerTabFilterProps } from './LedgerTabFilters'
import type { LedgerViewChip } from './ledgerViewChips'
import type { MainTab } from './ledgerTypes'
import { ledgerShell, ledgerSplitTabClass } from './ledgerShellUi'

const DETAIL_VIEW_TOOLTIP =
  'Accordion keeps one expandable panel open (strategy group, instance card, option detail rows, or other sections on this tab). Multi allows several.'

type Props = {
  attributionChips: LedgerViewChip[]
  instrumentChips: LedgerViewChip[]
  activeTab: MainTab
  onTabChange: (tab: MainTab) => void
  accordionMode: boolean
  onAccordionModeChange: (accordion: boolean) => void
  filters: LedgerTabFilterProps
}

function ViewChipButton({
  chip,
  active,
  instrumentsFirst,
  onSelect,
}: {
  chip: LedgerViewChip
  active: boolean
  instrumentsFirst?: boolean
  onSelect: () => void
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      title={chip.title}
      onClick={onSelect}
      className={ledgerSplitTabClass(active, instrumentsFirst, chip.empty)}
    >
      {chip.label}
      <span className="ml-1 font-mono font-normal opacity-80">{chip.countLabel}</span>
    </button>
  )
}

export function LedgerTabToolbar({
  attributionChips,
  instrumentChips,
  activeTab,
  onTabChange,
  accordionMode,
  onAccordionModeChange,
  filters,
}: Props) {
  return (
    <div className={ledgerShell.toolbarPanel}>
      <div className={ledgerShell.toolbarTop}>
        <div className={ledgerShell.toolbarSplit}>
          <div className={ledgerShell.toolbarAttr}>
            <div className={ledgerShell.tabGroupCaption}>Attribution</div>
            <div className={ledgerShell.attrTabRow} role="tablist" aria-label="Attribution tabs">
              {attributionChips.map(chip => (
                <ViewChipButton
                  key={chip.id}
                  chip={chip}
                  active={activeTab === chip.id}
                  onSelect={() => onTabChange(chip.id)}
                />
              ))}
            </div>
          </div>

          <div className={ledgerShell.toolbarInst}>
            <div className={ledgerShell.tabGroupCaption}>Instruments</div>
            <div className={ledgerShell.instTabRow} role="tablist" aria-label="Instrument tabs">
              {instrumentChips.map((chip, i) => (
                <ViewChipButton
                  key={chip.id}
                  chip={chip}
                  active={activeTab === chip.id}
                  instrumentsFirst={i === 0}
                  onSelect={() => onTabChange(chip.id)}
                />
              ))}
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
