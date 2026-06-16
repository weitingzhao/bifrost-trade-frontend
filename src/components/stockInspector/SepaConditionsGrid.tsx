import { cn } from '@/lib/utils'
import { Skeleton } from '@/components/ui/skeleton'
import type {
  FundamentalConditionRow,
  FundGroupSummary,
  TechnicalConditionsData,
} from '@/types/research'
import type { DisplayCondition } from '@/hooks/useStockInspector'
import { FUND_EXT_GROUP_ORDER } from './stockInspectorCatalog'
import { ConditionIcon } from './ConditionIcon'
import { ConditionList } from './ConditionList'
import { SummaryStrip } from './SummaryStrip'
import styles from './stock-inspector.module.css'
import { inspectorShell } from '@/components/layout/rightInspectorUi'
import { fmtCondVal, humanizeId } from './stockInspectorUtils'

interface FundProps {
  loading: boolean
  error: boolean
  hasData: boolean
  asOfDate?: string
  insufficient?: boolean
  conditions: DisplayCondition[]
  overallPass: boolean | null
  passCount: number | null
  groups: Record<string, FundGroupSummary> | null | undefined
  extConditions: FundamentalConditionRow[]
  activeCond: string | null
  onActiveCond: (id: string | null) => void
  rawAvailable: boolean
}

function FundColumn({
  loading,
  error,
  hasData,
  asOfDate,
  insufficient,
  conditions,
  overallPass,
  passCount,
  groups,
  extConditions,
  activeCond,
  onActiveCond,
  rawAvailable,
}: FundProps) {
  return (
    <div className={styles.conditionsCol}>
      <div className={inspectorShell.sectionTitle}>
        <span>SEPA Fundamental Conditions</span>
        {asOfDate && <span className={inspectorShell.sectionTitleAsOf}>{asOfDate}</span>}
      </div>

      {loading && !hasData && <p className={styles.hint}>Loading conditions…</p>}
      {error && !hasData && <p className={cn(styles.hint, styles.hintErr)}>Failed to load fundamentals.</p>}
      {!loading && !error && !hasData && (
        <p className={styles.hint}>No fundamentals snapshot recorded for this symbol yet.</p>
      )}

      {hasData && (
        <>
          {insufficient && (
            <p className={cn(styles.condSummary, styles.condSummaryWarn)} style={{ marginBottom: '0.5rem' }}>
              Insufficient data: not all required statements are available.
            </p>
          )}
          {rawAvailable && (
            <p className={styles.hint} style={{ marginBottom: '0.35rem' }}>
              Click a condition to highlight source data below.
            </p>
          )}
          <ConditionList
            conditions={conditions}
            activeId={activeCond}
            onSelect={onActiveCond}
            clickable={rawAvailable}
          />
          {overallPass != null && (
            <SummaryStrip
              label="Overall"
              value={overallPass ? 'PASS (8/8)' : `${passCount ?? 0} / 8`}
              ok={!!overallPass}
            />
          )}
          {groups && extConditions.length > 0 && (
            <div className="mt-2 space-y-1">
              {FUND_EXT_GROUP_ORDER.map(({ key, label }) => {
                const gs = groups[key]
                if (!gs) return null
                const groupConds = extConditions.filter((c) => c.group === key)
                if (groupConds.length === 0) return null
                const badgeClass = gs.pass
                  ? styles.extGroupBadgePass
                  : gs.insufficient
                    ? styles.extGroupBadgeInsuf
                    : styles.extGroupBadgeFail
                return (
                  <details key={key} className={styles.extGroup}>
                    <summary className={styles.extGroupSummary}>
                      <span>{label}</span>
                      <span className={cn(styles.extGroupBadge, badgeClass)}>
                        {gs.pass_count}/{gs.total}
                      </span>
                    </summary>
                    <ul className={cn(styles.condList, 'px-2 pb-1')}>
                      {groupConds.map((c) => (
                        <li key={c.id} className={styles.condRow}>
                          <ConditionIcon pass={c.pass} />
                          <span className="truncate">{humanizeId(c.id)}</span>
                          {(c.actual != null || c.threshold != null) && (
                            <span className={styles.condMetric}>
                              {fmtCondVal(c.actual)} / {fmtCondVal(c.threshold)}
                            </span>
                          )}
                        </li>
                      ))}
                    </ul>
                  </details>
                )
              })}
            </div>
          )}
        </>
      )}
    </div>
  )
}

interface TechProps {
  loading: boolean
  error: boolean
  hasData: boolean
  asOfDate?: string
  insufficient?: boolean
  conditions: DisplayCondition[]
  overallPass: boolean | null
  passCount: number | null
  tech: TechnicalConditionsData | undefined
}

function TechColumn({
  loading,
  error,
  hasData,
  asOfDate,
  insufficient,
  conditions,
  overallPass,
  passCount,
  tech,
}: TechProps) {
  const tiers = tech?.tiers

  return (
    <div className={styles.conditionsCol}>
      <div className={inspectorShell.sectionTitle}>
        <span>SEPA Technical Conditions</span>
        {asOfDate && <span className={inspectorShell.sectionTitleAsOf}>{asOfDate}</span>}
      </div>

      {loading && !hasData && <p className={styles.hint}>Loading conditions…</p>}
      {error && !hasData && <p className={cn(styles.hint, styles.hintErr)}>Failed to load technical data.</p>}
      {!loading && !error && !hasData && (
        <p className={styles.hint}>No technical snapshot recorded. Run the technical backfill.</p>
      )}

      {hasData && (
        <>
          {insufficient && (
            <p className={cn(styles.condSummary, styles.condSummaryWarn)} style={{ marginBottom: '0.5rem' }}>
              Insufficient data: fewer than 252 bars available.
            </p>
          )}
          <ConditionList conditions={conditions} />
          {overallPass != null && (
            <SummaryStrip
              label="Overall"
              value={overallPass ? 'PASS (11/11)' : `${passCount ?? 0} / 11`}
              ok={!!overallPass}
            />
          )}

          {tiers?.momentum && tiers.momentum.indicators.length > 0 && (
            <details className={styles.tierDetails}>
              <summary className={styles.tierSummary}>
                <span>Momentum</span>
                <span className="font-mono text-dense-caption">{tiers.momentum.score} / {tiers.momentum.max}</span>
              </summary>
              <TierIndicatorList indicators={tiers.momentum.indicators} />
            </details>
          )}

          {tiers?.structure && (tiers.structure.diagnostics.length > 0 || tiers.structure.patterns.length > 0) && (
            <details className={styles.tierDetails}>
              <summary className={styles.tierSummary}>
                <span>Structure & Patterns</span>
                <span className="font-mono text-dense-caption">
                  {tiers.structure.diagnostics.filter((d) => d.active).length} active
                </span>
              </summary>
              <ul className={cn(styles.condList, 'px-2 pb-1')}>
                {tiers.structure.diagnostics.map((d) => (
                  <li key={d.id} className={styles.condRow}>
                    <span className={d.active ? styles.condIconPass : 'text-muted-foreground'} aria-hidden>
                      {d.active ? '●' : '○'}
                    </span>
                    <span>{humanizeId(d.id)}</span>
                    <span className={styles.condMetric}>
                      {d.value != null ? Number(d.value).toFixed(3) : '—'}
                    </span>
                  </li>
                ))}
                {tiers.structure.patterns.map((p) => (
                  <li key={p.id} className={styles.condRow}>
                    <span aria-hidden>◆</span>
                    <span>{humanizeId(p.id)}</span>
                  </li>
                ))}
              </ul>
            </details>
          )}

          {tiers?.sentiment?.indicators && tiers.sentiment.indicators.length > 0 && (
            <details className={styles.tierDetails}>
              <summary className={styles.tierSummary}>
                <span>Sentiment (Short)</span>
                {tiers.sentiment.short.staleness_days != null && (
                  <span className="font-mono text-dense-caption">{tiers.sentiment.short.staleness_days}d stale</span>
                )}
              </summary>
              <TierIndicatorList indicators={tiers.sentiment.indicators} />
              {tiers.sentiment.short.days_to_cover != null && (
                <p className={cn(styles.hint, 'px-2 pb-1')}>
                  Days to Cover: <span className="font-mono text-foreground">{tiers.sentiment.short.days_to_cover}</span>
                </p>
              )}
            </details>
          )}
        </>
      )}
    </div>
  )
}

function TierIndicatorList({
  indicators,
}: {
  indicators: Array<{ id: string; pass: boolean; actual: number | boolean | null; reason?: string }>
}) {
  return (
    <ul className={cn(styles.condList, 'px-2 pb-1')}>
      {indicators.map((ind) => (
        <li key={ind.id} className={styles.condRow}>
          <ConditionIcon pass={ind.pass} />
          <span>{humanizeId(ind.id)}</span>
          <span className={styles.condMetric} title={ind.reason}>
            {ind.actual != null ? String(ind.actual) : '—'}
          </span>
        </li>
      ))}
    </ul>
  )
}

interface GridProps {
  fund: FundProps
  tech: TechProps
  fundLoading: boolean
  techLoading: boolean
}

export function SepaConditionsGrid({ fund, tech, fundLoading, techLoading }: GridProps) {
  if (fundLoading && techLoading && !fund.hasData && !tech.hasData) {
    return (
      <div className={styles.conditionsGrid}>
        <div className={styles.conditionsCol}><Skeleton className="h-40 w-full" /></div>
        <div className={styles.conditionsCol}><Skeleton className="h-40 w-full" /></div>
      </div>
    )
  }
  return (
    <div className={styles.conditionsGrid}>
      <FundColumn {...fund} />
      <TechColumn {...tech} />
    </div>
  )
}
