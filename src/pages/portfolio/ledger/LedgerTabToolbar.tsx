import { cn } from '@/lib/utils'
import { InfoTooltip } from '@/components/ui/InfoTooltip'
import { SegmentControl } from '@/components/data-display'
import { LedgerTabFilterRow, type LedgerTabFilterProps } from './LedgerTabFilters'
import type { LedgerViewChip } from './ledgerViewChips'
import type { MainTab } from './ledgerTypes'
import { ledgerChipClass, ledgerShell } from './ledgerShellUi'

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

function ViewChipGroup({
  caption,
  captionClass,
  ariaLabel,
  chips,
  activeTab,
  onTabChange,
}: {
  caption: string
  captionClass: string
  ariaLabel: string
  chips: LedgerViewChip[]
  activeTab: MainTab
  onTabChange: (tab: MainTab) => void
}) {
  return (
    <div className={ledgerShell.selectorGroup}>
      <span className={cn(ledgerShell.cap, captionClass)}>{caption}</span>
      <div className={ledgerShell.chipRow} role="tablist" aria-label={ariaLabel}>
        {chips.map(chip => {
          const active = activeTab === chip.id
          return (
            <button
              key={chip.id}
              type="button"
              role="tab"
              aria-selected={active}
              title={chip.title}
              onClick={() => onTabChange(chip.id)}
              className={ledgerChipClass(active, chip.empty)}
            >
              {chip.label}
              <span className="font-mono font-normal opacity-80">{chip.countLabel}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

/** "Which question": two lenses (attribution, instruments), four views, and the active view's own filters. */
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
    <section className="space-y-1.5" aria-label="Which question">
      <div className={ledgerShell.tierRow}>
        <span className={ledgerShell.tierLabel}>Which question</span>
        <span className={ledgerShell.tierRule} />
        <span className={ledgerShell.tierNote}>
          two lenses, four views — the share buckets are one view with a bucket filter, not separate tabs
        </span>
      </div>

      <div className={ledgerShell.panel}>
        <div className={ledgerShell.selectorTop}>
          <ViewChipGroup
            caption="Attribution — whose trade was it"
            captionClass={ledgerShell.capAttribution}
            ariaLabel="Attribution views"
            chips={attributionChips}
            activeTab={activeTab}
            onTabChange={onTabChange}
          />
          <span className={ledgerShell.selectorDivider} aria-hidden />
          <ViewChipGroup
            caption="Instruments — what was traded"
            captionClass={ledgerShell.capInstruments}
            ariaLabel="Instrument views"
            chips={instrumentChips}
            activeTab={activeTab}
            onTabChange={onTabChange}
          />

          <div className={ledgerShell.selectorDetail} role="group" aria-label="Detail view mode">
            <span className="inline-flex items-center gap-1">
              <span className={ledgerShell.cap}>Detail view</span>
              <InfoTooltip text={DETAIL_VIEW_TOOLTIP} />
            </span>
            <SegmentControl
              size="xs"
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
    </section>
  )
}
