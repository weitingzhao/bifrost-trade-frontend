import { useCallback, useState } from 'react'
import type { LivePositionRow } from '@/types/positions'
import type { StockInspectorFundamentalSeed } from '@/types/research'
import { useStockInspector } from '@/hooks/useStockInspector'
import { PassCountBadge } from './PassCountBadge'
import { StockOverviewSection } from './StockOverviewSection'
import { StockPositionSection } from './StockPositionSection'
import { StockBenchmarkSection } from './StockBenchmarkSection'
import { SepaConditionsGrid } from './SepaConditionsGrid'
import { FundRawDataSection } from './FundRawDataSection'
import { StockBarDataSection } from './StockBarDataSection'
import { StockPutCallSection } from './StockPutCallSection'
import { StockStatementsSection } from './StockStatementsSection'
import { StockInspectorSectionNav } from './StockInspectorSectionNav'
import { SectionCollapseToggle } from './SectionCollapseToggle'
import {
  defaultExpandedSections,
  focusOnlySection,
  INSPECTOR_SECTION_NAV_BY_ID,
  soleExpandedSection,
  type InspectorSectionId,
} from './stockInspectorSections'
import { inspectorShell } from '@/components/layout/rightInspectorUi'
import { RightInspectorHeader } from '@/components/layout/RightInspectorHeader'

export interface StockInspectorPanelProps {
  symbol: string
  accountId?: string
  livePosition?: LivePositionRow
  fundamentalSeed?: StockInspectorFundamentalSeed
  onClose?: () => void
}

const SECTION_DOM_ID: Record<InspectorSectionId, string> = {
  sepa: 'stock-inspector-sepa',
  barData: 'stock-inspector-bar-data',
  putCall: 'stock-inspector-put-call',
  statements: 'stock-inspector-statements',
}

interface BodyProps extends Omit<StockInspectorPanelProps, 'symbol'> {
  sym: string
}

function StockInspectorPanelBody({
  sym,
  accountId,
  livePosition,
  fundamentalSeed,
  onClose,
}: BodyProps) {
  const [activeCond, setActiveCond] = useState<string | null>(null)
  const [expandedSections, setExpandedSections] = useState(defaultExpandedSections)
  const {
    overview,
    fund,
    tech,
    raw,
    displayFundConditions,
    displayTechConditions,
    fundPassCount,
    techPassCount,
    fundOverallPass,
    techOverallPass,
    hasFundData,
    hasTechData,
    extFundConditions,
  } = useStockInspector(sym, fundamentalSeed)

  const rawAvailable =
    (raw.data?.quarterly?.length ?? 0) > 0 || (raw.data?.annual?.length ?? 0) > 0

  const toggleSection = useCallback((id: InspectorSectionId) => {
    setExpandedSections((prev) => ({ ...prev, [id]: !prev[id] }))
  }, [])

  const focusSection = useCallback((id: InspectorSectionId) => {
    setExpandedSections(focusOnlySection(id))
    requestAnimationFrame(() => {
      document.getElementById(SECTION_DOM_ID[id])?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    })
  }, [])

  return (
    <>
      <RightInspectorHeader
        title={
          <>
            <span>{sym}</span>
            <PassCountBadge prefix="F" count={fundPassCount} total={8} />
            {techPassCount != null && (
              <PassCountBadge prefix="T" count={techPassCount} total={11} />
            )}
          </>
        }
        meta={accountId ? `· ${accountId}` : undefined}
        onClose={onClose}
        closeLabel="Close stock inspector"
      />

      <div className={inspectorShell.stack}>
        <StockOverviewSection loading={overview.isLoading} overview={overview.data} />

        <StockInspectorSectionNav
          activeId={soleExpandedSection(expandedSections)}
          onFocus={focusSection}
        />

        {livePosition && <StockPositionSection position={livePosition} />}

        {livePosition && <StockBenchmarkSection symbol={sym} />}

        <section id={SECTION_DOM_ID.sepa} className={inspectorShell.section}>
          <SectionCollapseToggle
            navItem={INSPECTOR_SECTION_NAV_BY_ID.sepa}
            expanded={expandedSections.sepa}
            onToggle={() => toggleSection('sepa')}
            className="mb-2"
          />
          {expandedSections.sepa && (
            <>
              <SepaConditionsGrid
                fundLoading={fund.isLoading}
                techLoading={tech.isLoading}
                fund={{
                  loading: fund.isLoading,
                  error: fund.isError,
                  hasData: hasFundData,
                  asOfDate: fund.data?.as_of_date,
                  insufficient: fund.data?.insufficient_data ?? fundamentalSeed?.insufficientData,
                  conditions: displayFundConditions,
                  overallPass: fundOverallPass,
                  passCount: fundPassCount,
                  groups: fund.data?.groups,
                  extConditions: extFundConditions,
                  activeCond,
                  onActiveCond: setActiveCond,
                  rawAvailable,
                }}
                tech={{
                  loading: tech.isLoading,
                  error: tech.isError,
                  hasData: hasTechData,
                  asOfDate: tech.data?.as_of_date,
                  insufficient: tech.data?.insufficient_data,
                  conditions: displayTechConditions,
                  overallPass: techOverallPass,
                  passCount: techPassCount,
                  tech: tech.data,
                }}
              />
              {(raw.isLoading || rawAvailable || activeCond) && (
                <FundRawDataSection
                  loading={raw.isLoading}
                  data={raw.data}
                  activeCond={activeCond}
                />
              )}
            </>
          )}
        </section>

        <StockBarDataSection
          symbol={sym}
          sectionId={SECTION_DOM_ID.barData}
          expanded={expandedSections.barData}
          onExpandedChange={(v) => setExpandedSections((prev) => ({ ...prev, barData: v }))}
        />
        <StockPutCallSection
          symbol={sym}
          sectionId={SECTION_DOM_ID.putCall}
          expanded={expandedSections.putCall}
          onExpandedChange={(v) => setExpandedSections((prev) => ({ ...prev, putCall: v }))}
        />
        <StockStatementsSection
          symbol={sym}
          sectionId={SECTION_DOM_ID.statements}
          expanded={expandedSections.statements}
          onExpandedChange={(v) => setExpandedSections((prev) => ({ ...prev, statements: v }))}
        />
      </div>
    </>
  )
}

export function StockInspectorPanel({
  symbol,
  accountId,
  livePosition,
  fundamentalSeed,
  onClose,
}: StockInspectorPanelProps) {
  const sym = symbol.trim().toUpperCase()

  return (
    <div className={inspectorShell.panel} aria-label="Stock detail">
      <StockInspectorPanelBody
        key={sym}
        sym={sym}
        accountId={accountId}
        livePosition={livePosition}
        fundamentalSeed={fundamentalSeed}
        onClose={onClose}
      />
    </div>
  )
}
