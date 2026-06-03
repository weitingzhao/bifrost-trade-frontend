import { useMemo, useState } from 'react'
import type { SepaCriteriaStats } from '@/types/stockScreener'
import type { SepaReadinessSummaryResponse } from '@/types/stockDataReadiness'
import {
  SEPA_FUNDAMENTAL_CRITERIA,
  SEPA_TECHNICAL_CRITERIA,
  TECH_COND_LABELS,
  criterionStatusDotClass,
  criterionStatusLabel,
  deriveCriterionStatus,
  type CriterionStatus,
} from '@/utils/stockDataReadiness/sepaCriterionDefs'
import { cn } from '@/lib/utils'
import { CriteriaConditionList } from './CriteriaConditionRows'

function CriteriaGroupHeader({
  badge,
  badgeClass,
  label,
  count,
}: {
  badge: string
  badgeClass: string
  label: string
  count: string
}) {
  return (
    <div className="flex flex-wrap items-center gap-2 text-xs">
      <span className={cn('rounded px-1.5 py-0.5 font-bold uppercase tracking-wide', badgeClass)}>
        {badge}
      </span>
      <span className="text-muted-foreground">{label}</span>
      <span className="ml-auto font-mono tabular-nums text-foreground">{count}</span>
    </div>
  )
}

function StaticCriteriaTable({
  rows,
}: {
  rows: Array<{
    id: string
    criteria: string
    condition: string
    explain: string
    dataFields: string[]
    minBars?: number
    status: CriterionStatus
    note: string
  }>
}) {
  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <table className="w-full text-xs border-collapse">
        <thead>
          <tr className="border-b border-border text-left text-[10px] uppercase tracking-wide text-muted-foreground">
            <th className="w-8 p-2" />
            <th className="p-2">Criteria</th>
            <th className="p-2">Condition</th>
            <th className="p-2">Explain</th>
            <th className="p-2">Required fields</th>
            <th className="p-2">Status</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(c => (
            <tr key={c.id} className="border-b border-border/60 last:border-0">
              <td className="p-2">
                <span
                  className={cn('inline-block h-2 w-2 rounded-full', criterionStatusDotClass(c.status))}
                />
              </td>
              <td className="p-2 font-medium">{c.criteria}</td>
              <td className="p-2">
                <code className="text-[10px] text-sky-300/90">{c.condition}</code>
              </td>
              <td className="p-2 text-muted-foreground">{c.explain}</td>
              <td className="p-2">
                <div className="flex flex-wrap gap-1">
                  {c.dataFields.map(f => (
                    <span
                      key={f}
                      className="rounded bg-muted px-1 py-px font-mono text-[10px]"
                    >
                      {f}
                    </span>
                  ))}
                  {c.minBars != null && (
                    <span className="rounded bg-muted px-1 py-px font-mono text-[10px] text-amber-400/90">
                      ≥{c.minBars}d
                    </span>
                  )}
                </div>
              </td>
              <td className="p-2">
                <span className="font-medium">{criterionStatusLabel(c.status)}</span>
                {c.note && (
                  <div className="text-[10px] text-muted-foreground mt-0.5">{c.note}</div>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export function SepaScreeningChecklist({
  summary,
  criteriaStats,
}: {
  summary: SepaReadinessSummaryResponse | null
  criteriaStats: SepaCriteriaStats | null
}) {
  const [activeTab, setActiveTab] = useState<'technical' | 'fundamental'>('technical')

  const techStatuses = useMemo(
    () =>
      SEPA_TECHNICAL_CRITERIA.map(c => ({
        ...c,
        ...deriveCriterionStatus(c, summary),
      })),
    [summary],
  )
  const fundStatuses = useMemo(
    () =>
      SEPA_FUNDAMENTAL_CRITERIA.map(c => ({
        ...c,
        ...deriveCriterionStatus(c, summary),
      })),
    [summary],
  )

  const techOk = techStatuses.filter(c => c.status === 'supported').length
  const fundOk = fundStatuses.filter(c => c.status === 'supported').length
  const techTotal = techStatuses.length
  const fundTotal = fundStatuses.length
  const allOk = techOk + fundOk
  const allTotal = techTotal + fundTotal
  const overallStatus: CriterionStatus =
    allOk === allTotal ? 'supported' : allOk === 0 ? 'missing' : 'partial'
  const overallClass =
    overallStatus === 'supported'
      ? 'text-lamp-green'
      : overallStatus === 'missing'
        ? 'text-lamp-red'
        : 'text-lamp-yellow'

  const tech = criteriaStats?.technical
  const hasTechConds = (tech?.conditions?.length ?? 0) > 0

  return (
    <div className="rounded-xl border border-border bg-secondary/50 overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 border-b border-border">
        <span className="text-sm font-semibold">SEPA Screening Criteria Checklist</span>
        <span className={cn('text-xs font-mono tabular-nums', overallClass)}>
          {allOk} / {allTotal} supported
        </span>
      </div>

      <div className="flex border-b border-border" role="tablist" aria-label="SEPA checklist groups">
        {(['technical', 'fundamental'] as const).map(tab => {
          const ok = tab === 'technical' ? techOk : fundOk
          const total = tab === 'technical' ? techTotal : fundTotal
          return (
            <button
              key={tab}
              type="button"
              role="tab"
              aria-selected={activeTab === tab}
              className={cn(
                'flex-1 px-4 py-2.5 text-xs font-bold uppercase tracking-wide transition-colors',
                activeTab === tab
                  ? 'bg-secondary text-foreground border-b-2 border-sidebar-primary'
                  : 'text-muted-foreground hover:text-foreground',
              )}
              onClick={() => setActiveTab(tab)}
            >
              {tab === 'technical' ? 'Technical' : 'Fundamental'}{' '}
              <span className="font-mono font-normal opacity-80">
                {ok}/{total}
              </span>
            </button>
          )
        })}
      </div>

      <div className="p-4 space-y-4">
        {activeTab === 'technical' && (
          <div className="space-y-4">
            <CriteriaGroupHeader
              badge="Technical"
              badgeClass="bg-emerald-500/15 text-emerald-400"
              label="Price / Volume / Trend"
              count={
                tech?.tech_pass_count != null
                  ? `${(tech.tech_pass_count ?? 0).toLocaleString()} pass all 11`
                  : `${techOk} / ${techTotal}`
              }
            />
            <p className="text-[11px] text-muted-foreground">
              Data source: <code className="text-sky-300/90">stock_readiness_daily.technical_eval</code>{' '}
              (Phase-1 stock_day + CRS percentile rank)
            </p>

            {hasTechConds ? (
              <CriteriaConditionList
                conditions={tech!.conditions}
                labelForId={(id, fb) => TECH_COND_LABELS[id] ?? fb ?? id}
              />
            ) : (
              <StaticCriteriaTable rows={techStatuses} />
            )}

            {!hasTechConds && (
              <p className="text-xs text-muted-foreground">
                No technical snapshot yet — run Evaluate &amp; Publish or POST{' '}
                <code className="text-sky-300/90">/research/data/readiness/backfill-technical</code> to
                populate.
              </p>
            )}

            {(tech?.momentum_conditions?.length ?? 0) > 0 && (
              <div className="space-y-2 pt-2 border-t border-border">
                <CriteriaGroupHeader
                  badge="Momentum"
                  badgeClass="bg-blue-500/15 text-blue-400"
                  label="Scored 0–10 (RSI, MACD, ROC, Relative Strength)"
                  count=""
                />
                <CriteriaConditionList conditions={tech!.momentum_conditions!} />
              </div>
            )}

            {(tech?.structure_conditions?.length ?? 0) > 0 && (
              <div className="space-y-2 pt-2 border-t border-border">
                <CriteriaGroupHeader
                  badge="Structure"
                  badgeClass="bg-violet-500/15 text-violet-400"
                  label="Volatility Contraction, Trend Strength, Accumulation"
                  count=""
                />
                <CriteriaConditionList conditions={tech!.structure_conditions!} />
              </div>
            )}

            {(tech?.sentiment_conditions?.length ?? 0) > 0 && (
              <div className="space-y-2 pt-2 border-t border-border">
                <CriteriaGroupHeader
                  badge="Sentiment"
                  badgeClass="bg-orange-500/15 text-orange-400"
                  label="Short Interest & Short Volume Signals"
                  count=""
                />
                <CriteriaConditionList conditions={tech!.sentiment_conditions!} />
              </div>
            )}
          </div>
        )}

        {activeTab === 'fundamental' && (
          <div className="space-y-3">
            <CriteriaGroupHeader
              badge="Fundamental"
              badgeClass="bg-amber-500/15 text-amber-400"
              label="EPS / Revenue Growth & Acceleration"
              count={`${fundOk} / ${fundTotal}`}
            />
            <p className="text-[11px] text-muted-foreground">
              Data source: <code className="text-sky-300/90">stock_readiness_daily.fundamental_eval</code>{' '}
              (evaluated from <code className="text-sky-300/90">stock_income_statements</code> by Phase 1)
            </p>
            <StaticCriteriaTable rows={fundStatuses} />
          </div>
        )}
      </div>
    </div>
  )
}
