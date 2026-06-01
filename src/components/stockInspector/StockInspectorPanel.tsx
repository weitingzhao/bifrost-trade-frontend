import { useState } from 'react'
import type { LivePositionRow } from '@/types/positions'
import type { StockInspectorFundamentalSeed } from '@/types/research'
import { useStockInspector } from '@/hooks/useStockInspector'
import { PassCountBadge } from './PassCountBadge'
import { StockOverviewSection } from './StockOverviewSection'
import { StockPositionSection } from './StockPositionSection'
import { SepaConditionsGrid } from './SepaConditionsGrid'
import { FundRawDataSection } from './FundRawDataSection'
import { StockBarDataSection } from './StockBarDataSection'
import { StockPutCallSection } from './StockPutCallSection'
import styles from './stock-inspector.module.css'

export interface StockInspectorPanelProps {
  symbol: string
  accountId?: string
  livePosition?: LivePositionRow
  fundamentalSeed?: StockInspectorFundamentalSeed
}

export function StockInspectorPanel({
  symbol,
  accountId,
  livePosition,
  fundamentalSeed,
}: StockInspectorPanelProps) {
  const [activeCond, setActiveCond] = useState<string | null>(null)
  const {
    sym,
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
  } = useStockInspector(symbol, fundamentalSeed)

  const rawAvailable = (raw.data?.quarterly?.length ?? 0) > 0

  return (
    <div className={styles.panel} aria-label="Stock detail">
      <header className={styles.header}>
        <div className={styles.headerTitle}>
          <span>{sym}</span>
          {accountId && <span className={styles.headerAccount}>· {accountId}</span>}
          <PassCountBadge prefix="F" count={fundPassCount} total={8} />
          {techPassCount != null && <PassCountBadge prefix="T" count={techPassCount} total={11} />}
        </div>
      </header>

      <div className={styles.stack}>
        <StockOverviewSection
          loading={overview.isLoading}
          overview={overview.data}
        />

        {livePosition && (
          <StockPositionSection accountId={accountId} position={livePosition} />
        )}

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

        <StockBarDataSection symbol={sym} />
        <StockPutCallSection symbol={sym} />
      </div>
    </div>
  )
}
