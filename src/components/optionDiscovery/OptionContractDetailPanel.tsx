import { bsComputeDetail } from '@/utils/optionDiscovery/bsCalc'
import { DiscoveryHint } from '@/components/optionDiscovery/DiscoveryHint'
import { DiscoveryIconButton } from '@/components/optionDiscovery/DiscoveryIconButton'
/* eslint-disable react-hooks/purity -- relative timestamps use Date.now() during render */
import { useCallback, useState } from 'react'
import type { GreeksCoverageResponse, LiquiditySummaryResponse, RelativeValueResponse, OptionSnapshotRow } from '@/types/optionDiscovery'
import { InfoTooltip } from '@/components/ui/InfoTooltip'
import { fmtUsd } from '@/lib/format'
import { cn } from '@/lib/utils'
import { SegmentControl, DenseTag } from '@/components/data-display'
import { DiscoveryContractGreeksTable } from './DiscoveryContractGreeksTable'
import { DiscoveryScenarioTable } from './DiscoveryScenarioTable'
import {
  optionDiscoveryCardGridClass,
  optionDiscoveryCardSectionClass,
  optionDiscoveryCardSectionTitleClass,
  optionDiscoveryDetailChartHintClass,
  optionDiscoveryDetailRootClass,
  optionDiscoveryExecGuidanceClass,
  optionDiscoveryExecGuidanceTitleClass,
  optionDiscoveryKvDimClass,
  optionDiscoveryKvGridClass,
  optionDiscoveryKvKeyClass,
  optionDiscoveryKvValueClass,
  optionDiscoveryScenarioWrapClass,
  optionDiscoveryTradabilityFactorClass,
  optionDiscoveryTradabilityFactorsClass,
  optionDiscoveryTradabilityLabelClass,
  optionDiscoveryTradabilityScoreClass,
  optionDiscoveryTradabilityValueClass,
} from './optionDiscoveryUi'
import { IvSmileChart, IvSmileLegend } from './OptionDiscoveryAnalytics'
import { OdChartExpandOnHover } from './OdChartExpandOnHover'
import { expirationDaysFromToday, parseExpirationDateParts } from '@/utils/optionDiscovery/expirationMeta'
import { RightInspectorHeader } from '@/components/layout/RightInspectorHeader'
import { InspectorSectionNav } from '@/components/layout/InspectorSectionNav'
import { RightInspectorCollapsibleSection } from '@/components/layout/RightInspectorCollapsibleSection'
import { inspectorShell } from '@/components/layout/rightInspectorUi'
import {
  defaultOptionExpandedSections,
  focusOptionSection,
  OPTION_INSPECTOR_NAV,
  OPTION_INSPECTOR_NAV_BY_ID,
  OPTION_INSPECTOR_SECTION_DOM_ID,
  soleOptionExpandedSection,
  type OptionInspectorSectionId,
} from './optionInspectorSections'
import { OptionDataQualityBadge } from './OptionDataQualityBadge'
import { OptionDiscoveryContractChartPanel } from './OptionDiscoveryContractChartPanel'
import {
  computeRelativeValue,
  computeScenarios,
  computeTradabilityScore,
  effectiveQuotePremium,
  fmtIV,
  fmtOptNum,
  type DerivedMetrics,
} from '@/utils/optionDiscovery/optionContractMetrics'

export interface OptionContractDetailPanelProps {
  symbol: string
  expiration: string
  underlyingPrice: number | null
  selectedRow: OptionSnapshotRow
  selectedDerived: DerivedMetrics
  snapshotRows: OptionSnapshotRow[]
  greeksCoverage: GreeksCoverageResponse | null
  eventContextWarnings: string[]
  greeksSource: 'snapshot' | 'bs'
  onGreeksSourceChange: (v: 'snapshot' | 'bs') => void
  liquidityLastTrade: Record<string, unknown> | null
  liquidityQuoteCount: number | null
  liquidityLoading: boolean
  serverLiquidity: LiquiditySummaryResponse | null
  serverRelativeValue: RelativeValueResponse | null
  onClose: () => void
  onAddToWatchlist: () => void
  onAddToCompare: () => void
}

export function OptionContractDetailPanel({
  symbol,
  expiration,
  underlyingPrice,
  selectedRow,
  selectedDerived,
  snapshotRows,
  greeksCoverage,
  eventContextWarnings,
  greeksSource,
  onGreeksSourceChange,
  liquidityLastTrade,
  liquidityQuoteCount,
  liquidityLoading,
  serverLiquidity,
  serverRelativeValue,
  onClose,
  onAddToWatchlist,
  onAddToCompare,
}: OptionContractDetailPanelProps) {
  const [expandedSections, setExpandedSections] = useState(defaultOptionExpandedSections)

  const toggleSection = useCallback((id: OptionInspectorSectionId) => {
    setExpandedSections((prev) => ({ ...prev, [id]: !prev[id] }))
  }, [])

  const focusSection = useCallback((id: OptionInspectorSectionId) => {
    setExpandedSections(focusOptionSection(id))
    requestAnimationFrame(() => {
      document.getElementById(OPTION_INSPECTOR_SECTION_DOM_ID[id])?.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      })
    })
  }, [])

  return (
    <div className={cn(optionDiscoveryDetailRootClass, inspectorShell.panel)} aria-label="Contract detail">
      {eventContextWarnings.length > 0 && (
        <div className={inspectorShell.alertBanner} role="alert">
          {eventContextWarnings.map((w, i) => (
            <div key={i} className={inspectorShell.alertBannerItem}>
              {w}
            </div>
          ))}
        </div>
      )}

      <RightInspectorHeader
        title={
          <>
            {symbol}{' '}
            {selectedRow.right === 'C' ? 'Call' : 'Put'} {selectedRow.strike.toFixed(2)}
            <span
              className={cn(
                'rounded-full border px-1.5 py-0.5 text-xs font-semibold uppercase',
                selectedDerived.moneynessLabel === 'ATM' && 'border-primary/50 bg-primary/10',
                selectedDerived.moneynessLabel === 'ITM' && 'border-success/40 bg-success-soft text-success',
                selectedDerived.moneynessLabel === 'OTM' && 'border-muted-foreground/40 bg-muted text-muted-foreground',
              )}
            >
              {selectedDerived.moneynessLabel}
            </span>
          </>
        }
        meta={`${expiration} · ${expirationDaysFromToday(expiration)} DTE`}
        actions={
          <>
            <DiscoveryIconButton
              onClick={() => void onAddToWatchlist()}
              aria-label={`Add ${selectedRow.right === 'C' ? 'Call' : 'Put'} ${selectedRow.strike} to Watchlist`}
              title={`Add ${selectedRow.right === 'C' ? 'Call' : 'Put'} ${selectedRow.strike} to Watchlist`}
            >
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="M5 12h14" />
                <path d="M12 5v14" />
              </svg>
            </DiscoveryIconButton>
            <DiscoveryIconButton
              onClick={onAddToCompare}
              aria-label="Add current contract to compare"
              title="Add current contract to compare"
            >
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="M6 4v16" />
                <path d="M18 4v16" />
                <path d="M9 7h6" />
                <path d="M9 12h6" />
                <path d="M9 17h6" />
              </svg>
            </DiscoveryIconButton>
            <span className={inspectorShell.headerMeta}>Massive · 15 min delayed</span>
          </>
        }
        onClose={onClose}
        closeLabel="Close contract detail"
      />

      <div className={inspectorShell.stack}>
        <InspectorSectionNav
          items={OPTION_INSPECTOR_NAV}
          activeId={soleOptionExpandedSection(expandedSections)}
          onFocus={focusSection}
        />

        <RightInspectorCollapsibleSection
          sectionId={OPTION_INSPECTOR_SECTION_DOM_ID.overview}
          navItem={OPTION_INSPECTOR_NAV_BY_ID.overview}
          expanded={expandedSections.overview}
          onToggle={() => toggleSection('overview')}
        >
            <div>
              <div className={cn(inspectorShell.cardGrid, inspectorShell.cardGrid2, inspectorShell.cardGrid4)}>
                <div className={inspectorShell.card}>
                  <div className={cn(inspectorShell.cardLabel, 'normal-case')}>
                    Price
                    <span className="rounded bg-muted px-1 py-0.5 text-dense-caption font-medium normal-case">Day</span>
                    <InfoTooltip text="Day bar OHLC from Massive (chain snapshot, 15 min delayed). Underlying spot for decomposition uses stock_day daily close when available." />
                  </div>
                  <div className="grid grid-cols-[auto_1fr] gap-x-2 gap-y-1 text-sm">
                    {selectedRow.snapshot_ts && (
                      <>
                        <span className="text-xs text-muted-foreground">As of</span>
                        <span className="text-xs text-muted-foreground tabular-nums">{new Date(selectedRow.snapshot_ts).toLocaleString()}</span>
                      </>
                    )}
                    <span className="text-xs text-muted-foreground">Open</span>
                    <span className="font-medium tabular-nums">{selectedRow.day_open != null ? fmtUsd(selectedRow.day_open) : '—'}</span>
                    <span className="text-xs text-muted-foreground">High</span>
                    <span className="font-medium tabular-nums">{selectedRow.day_high != null ? fmtUsd(selectedRow.day_high) : '—'}</span>
                    <span className="text-xs text-muted-foreground">Low</span>
                    <span className="font-medium tabular-nums">{selectedRow.day_low != null ? fmtUsd(selectedRow.day_low) : '—'}</span>
                    <span className="text-xs text-muted-foreground">Close</span>
                    <span className="font-medium tabular-nums">{selectedRow.day_close != null ? fmtUsd(selectedRow.day_close) : '—'}</span>
                    {selectedRow.day_volume != null && (
                      <>
                        <span className="text-xs text-muted-foreground">Vol</span>
                        <span className="font-medium tabular-nums">{selectedRow.day_volume.toLocaleString()}</span>
                      </>
                    )}
                  </div>
                </div>
                <div className={inspectorShell.card}>
                  <div className={inspectorShell.cardLabel}>Value Decomposition</div>
                  <div className="grid grid-cols-[auto_1fr] gap-x-2 gap-y-1 text-sm">
                    <span className="text-xs text-muted-foreground">Intrinsic</span>
                    <span className="font-medium tabular-nums">{selectedDerived.intrinsic != null ? fmtUsd(selectedDerived.intrinsic) : '—'}</span>
                    <span className="text-xs text-muted-foreground">Extrinsic</span>
                    <span className="font-medium tabular-nums">{selectedDerived.extrinsic != null ? fmtUsd(selectedDerived.extrinsic) : '—'}</span>
                    <span className="text-xs text-muted-foreground">Breakeven</span>
                    <span className="font-medium tabular-nums">{selectedDerived.breakeven != null ? fmtUsd(selectedDerived.breakeven) : '—'}</span>
                    <span className="text-xs text-muted-foreground">Moneyness</span>
                    <span className="font-medium tabular-nums">
                      {selectedDerived.moneyness != null
                        ? `${selectedDerived.moneyness > 0 ? '+' : ''}${selectedDerived.moneyness.toFixed(2)}%`
                        : '—'}
                    </span>
                  </div>
                </div>
                <div className={inspectorShell.card}>
                  <div className={inspectorShell.cardLabel}>Underlying</div>
                  <div className="grid grid-cols-[auto_1fr] gap-x-2 gap-y-1 text-sm">
                    <span className="text-xs text-muted-foreground">Symbol</span>
                    <span className="font-medium tabular-nums">{symbol}</span>
                    <span className="text-xs text-muted-foreground">Price</span>
                    <span className="font-medium tabular-nums">{underlyingPrice != null ? fmtUsd(underlyingPrice) : '—'}</span>
                    <span className="text-xs text-muted-foreground">Strike</span>
                    <span className="font-medium tabular-nums">{fmtUsd(selectedRow.strike)}</span>
                    <span className="text-xs text-muted-foreground">DTE</span>
                    <span className="font-medium tabular-nums">{expirationDaysFromToday(expiration)}</span>
                  </div>
                </div>
                <div className={optionDiscoveryCardSectionClass}>
                  <div className="mb-1.5 flex flex-wrap items-center gap-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Greeks
                    <SegmentControl
                      value={greeksSource}
                      onChange={v => {
                        if (v === 'snapshot' || v === 'bs') onGreeksSourceChange(v)
                      }}
                      options={[
                        { value: 'snapshot', label: 'Snapshot' },
                        { value: 'bs', label: 'BS' },
                      ]}
                    />
                  </div>
                  {(() => {
                    if (greeksSource === 'snapshot') {
                      return (
                        <div className="grid grid-cols-[auto_1fr] gap-x-2 gap-y-1 text-sm">
                          <span className="text-xs text-muted-foreground">IV</span>
                          <span className="font-medium tabular-nums">{fmtIV(selectedRow.iv)}</span>
                          <span className="text-xs text-muted-foreground">Delta</span>
                          <span className="font-medium tabular-nums">{fmtOptNum(selectedRow.delta, 4)}</span>
                          <span className="text-xs text-muted-foreground">Gamma</span>
                          <span className="font-medium tabular-nums">{fmtOptNum(selectedRow.gamma, 4)}</span>
                          <span className="text-xs text-muted-foreground">Theta</span>
                          <span className="font-medium tabular-nums">{fmtOptNum(selectedRow.theta, 4)}</span>
                          <span className="text-xs text-muted-foreground">Vega</span>
                          <span className="font-medium tabular-nums">{fmtOptNum(selectedRow.vega, 4)}</span>
                          <span className="text-xs text-muted-foreground">OI</span>
                          <span className="font-medium tabular-nums">{selectedRow.open_interest != null ? String(selectedRow.open_interest) : '—'}</span>
                        </div>
                      )
                    }
                    const bsParts = parseExpirationDateParts(expiration)
                    const bsDteDays = bsParts
                      ? Math.max(
                          0,
                          Math.round(
                            (new Date(bsParts.y, bsParts.m, bsParts.d).setHours(0, 0, 0, 0) - new Date().setHours(0, 0, 0, 0)) /
                              86400000,
                          ),
                        )
                      : 0
                    const bsMktPrice = effectiveQuotePremium(selectedRow)
                    const bsD =
                      underlyingPrice != null && bsMktPrice != null && bsDteDays > 0
                        ? bsComputeDetail({
                            marketPrice: bsMktPrice,
                            S: underlyingPrice,
                            K: selectedRow.strike,
                            tYears: bsDteDays / 365,
                            r: 0.045,
                            right: selectedRow.right,
                          })
                        : null
                    if (bsD == null || bsD.iv == null) {
                      return (
                        <div className="grid grid-cols-[auto_1fr] gap-x-2 gap-y-1 text-sm">
                          <span className={cn(optionDiscoveryKvKeyClass, optionDiscoveryKvDimClass, 'col-span-2 text-dense-label')}>
                            {bsDteDays === 0 ? 'Expired; cannot compute' : underlyingPrice == null ? 'Underlying price unknown' : 'IV solve failed'}
                          </span>
                          <span className="text-xs text-muted-foreground">OI</span>
                          <span className="font-medium tabular-nums">{selectedRow.open_interest != null ? String(selectedRow.open_interest) : '—'}</span>
                        </div>
                      )
                    }
                    return (
                      <div className="grid grid-cols-[auto_1fr] gap-x-2 gap-y-1 text-sm">
                        <span className="text-xs text-muted-foreground">IV</span>
                        <span className="font-medium tabular-nums">{bsD.iv != null ? (bsD.iv * 100).toFixed(2) + '%' : '—'}</span>
                        <span className="text-xs text-muted-foreground">Delta</span>
                        <span className="font-medium tabular-nums">{bsD.delta != null ? bsD.delta.toFixed(4) : '—'}</span>
                        <span className="text-xs text-muted-foreground">Gamma</span>
                        <span className="font-medium tabular-nums">{bsD.gamma != null ? bsD.gamma.toFixed(4) : '—'}</span>
                        <span className="text-xs text-muted-foreground">Theta</span>
                        <span className="font-medium tabular-nums">{bsD.thetaPerDay != null ? bsD.thetaPerDay.toFixed(4) : '—'}</span>
                        <span className="text-xs text-muted-foreground">Vega/1%</span>
                        <span className="font-medium tabular-nums">{bsD.vegaPer1Pct != null ? bsD.vegaPer1Pct.toFixed(4) : '—'}</span>
                        <span className="text-xs text-muted-foreground">OI</span>
                        <span className="font-medium tabular-nums">{selectedRow.open_interest != null ? String(selectedRow.open_interest) : '—'}</span>
                      </div>
                    )
                  })()}
                </div>
              </div>

              {greeksCoverage?.ok && greeksCoverage.total != null && greeksCoverage.total > 0 && (
                <OptionDataQualityBadge
                  items={[
                    {
                      label: `IV ${greeksCoverage.coverage?.iv_pct ?? 0}%`,
                      title: 'Percentage of contracts with IV data',
                    },
                    {
                      label: `Greeks ${greeksCoverage.coverage?.full_greeks_pct ?? 0}%`,
                      title: 'Percentage with full greeks (Δ,Γ,Θ,ν)',
                    },
                    ...(greeksCoverage.freshness?.newest_ts
                      ? [
                          {
                            label: `Fresh: ${new Date(greeksCoverage.freshness.newest_ts).toLocaleTimeString()}`,
                            title: 'Most recent snapshot timestamp',
                          },
                        ]
                      : []),
                  ]}
                />
              )}
            </div>
        </RightInspectorCollapsibleSection>

          {(() => {
            const parts = parseExpirationDateParts(expiration)
            if (!parts) return null
            const { y, m, d } = parts
            const expDate = new Date(y, m, d)
            expDate.setHours(0, 0, 0, 0)
            const todayMs = new Date()
            todayMs.setHours(0, 0, 0, 0)
            const dteDays = Math.max(0, Math.round((expDate.getTime() - todayMs.getTime()) / 86400000))
            if (dteDays === 0) return null
            const mktPrice = effectiveQuotePremium(selectedRow)
            if (mktPrice == null || underlyingPrice == null) return null

            const bsDetail = bsComputeDetail({
              marketPrice: mktPrice,
              S: underlyingPrice,
              K: selectedRow.strike,
              tYears: dteDays / 365,
              r: 0.045,
              right: selectedRow.right,
            })

            function diffPct(local: number | null, snap: number | null): number | null {
              if (local == null || snap == null || snap === 0) return null
              return ((local - snap) / Math.abs(snap)) * 100
            }

            const ivDiff = diffPct(bsDetail.iv, selectedRow.iv ?? null)
            const deltaDiff = diffPct(bsDetail.delta, selectedRow.delta ?? null)
            const gammaDiff = diffPct(bsDetail.gamma, selectedRow.gamma ?? null)
            const thetaDiff = diffPct(bsDetail.thetaPerDay, selectedRow.theta ?? null)
            const vegaDiff = diffPct(bsDetail.vegaPer1Pct, selectedRow.vega ?? null)

            let mktSrc = 'mark'
            if (selectedRow.mark != null) mktSrc = 'mark/day_close'
            else if (selectedRow.mid != null) mktSrc = 'mid'
            else if (selectedRow.bid != null && selectedRow.ask != null) mktSrc = '(bid+ask)/2'
            else if (selectedRow.last != null) mktSrc = 'last'
            else if (selectedRow.day_close != null) mktSrc = 'day_close'

            const iv = bsDetail.iv
            const bsRows = [
              { label: 'IV', snap: selectedRow.iv != null ? (selectedRow.iv * 100).toFixed(2) + '%' : '—', bs: iv != null ? (iv * 100).toFixed(2) + '%' : '—', diff: ivDiff },
              { label: 'Delta', snap: selectedRow.delta != null ? selectedRow.delta.toFixed(4) : '—', bs: bsDetail.delta != null ? bsDetail.delta.toFixed(4) : '—', diff: deltaDiff },
              { label: 'Gamma', snap: selectedRow.gamma != null ? selectedRow.gamma.toFixed(4) : '—', bs: bsDetail.gamma != null ? bsDetail.gamma.toFixed(4) : '—', diff: gammaDiff },
              { label: 'Theta/day', snap: selectedRow.theta != null ? selectedRow.theta.toFixed(4) : '—', bs: bsDetail.thetaPerDay != null ? bsDetail.thetaPerDay.toFixed(4) : '—', diff: thetaDiff },
              {
                label: 'Vega/1%',
                snap: selectedRow.vega != null ? selectedRow.vega.toFixed(4) : '—',
                bs: bsDetail.vegaPer1Pct != null ? bsDetail.vegaPer1Pct.toFixed(4) : '—',
                diff: vegaDiff,
                vegaHint: vegaDiff != null && Math.abs(vegaDiff) > 80,
              },
            ] as const

            return (
              <RightInspectorCollapsibleSection
                sectionId={OPTION_INSPECTOR_SECTION_DOM_ID.bs}
                navItem={OPTION_INSPECTOR_NAV_BY_ID.bs}
                expanded={expandedSections.bs}
                onToggle={() => toggleSection('bs')}
              >
                <p className="mb-2 text-xs font-normal normal-case text-muted-foreground">
                  Black-Scholes European approx. (American options; ATM error usually &lt;3%)
                </p>
                <DiscoveryHint className="mb-2 text-xs">
                  S={`$${underlyingPrice.toFixed(2)}`} · K={selectedRow.strike.toFixed(2)} · DTE={dteDays} · Mkt=
                  {mktPrice.toFixed(4)} ({mktSrc}) · r=4.50%
                </DiscoveryHint>
                {bsDetail.iv == null ? (
                  <DiscoveryHint className="text-destructive">BS IV solve failed (bad price or deep ITM/OTM)</DiscoveryHint>
                ) : (
                  <div className="overflow-x-auto">
                    <DiscoveryContractGreeksTable
                      rows={bsRows}
                      footer={
                        <>
                          <span className="text-success">■</span> &lt;3%&nbsp;&nbsp;
                          <span className="text-warning">■</span> 3–10%&nbsp;&nbsp;
                          <span className="text-destructive">■</span> &gt;10%
                          &nbsp;·&nbsp;NR {bsDetail.iterCount} iter {bsDetail.converged ? '✓' : '(not converged)'}
                          &nbsp;·&nbsp;BS model=
                          {bsDetail.bsModelPrice != null ? `$${bsDetail.bsModelPrice.toFixed(4)}` : '—'}
                        </>
                      }
                    />
                  </div>
                )}
              </RightInspectorCollapsibleSection>
            )
          })()}

          <RightInspectorCollapsibleSection
            sectionId={OPTION_INSPECTOR_SECTION_DOM_ID.chart}
            navItem={OPTION_INSPECTOR_NAV_BY_ID.chart}
            expanded={expandedSections.chart}
            onToggle={() => toggleSection('chart')}
          >
            <DiscoveryHint className={optionDiscoveryDetailChartHintClass}>
              OHLC below uses contract history. If the chart is empty, click Backfill from Massive (Celery worker on the massive queue required).
            </DiscoveryHint>
            <OptionDiscoveryContractChartPanel
              symbol={symbol}
              expiration={expiration}
              strike={selectedRow.strike}
              optionRight={selectedRow.right === 'P' ? 'P' : 'C'}
            />
          </RightInspectorCollapsibleSection>

          {(() => {
            const lastTradeTs =
              liquidityLastTrade?.sip_timestamp != null ? Number(liquidityLastTrade.sip_timestamp) / 1e9 : null
            const lastTradeAge = lastTradeTs != null ? Date.now() / 1000 - lastTradeTs : null
            const tradability = computeTradabilityScore(selectedRow, snapshotRows, lastTradeAge, liquidityQuoteCount)
            const spreadRows = snapshotRows
              .filter(r => {
                if (r.right !== selectedRow.right) return false
                const m = effectiveQuotePremium(r)
                return r.bid != null && r.ask != null && m != null && m > 0
              })
              .map(r => {
                const m = effectiveQuotePremium(r)!
                return ((r.ask! - r.bid!) / m) * 100
              })
              .sort((a, b) => a - b)
            const curSpreadPct = selectedDerived?.spreadPct
            let spreadPercentile: number | null = null
            if (curSpreadPct != null && spreadRows.length > 1) {
              const rank = spreadRows.filter(s => s <= curSpreadPct).length
              spreadPercentile = (rank / spreadRows.length) * 100
            }
            return (
              <RightInspectorCollapsibleSection
                sectionId={OPTION_INSPECTOR_SECTION_DOM_ID.liquidity}
                navItem={OPTION_INSPECTOR_NAV_BY_ID.liquidity}
                expanded={expandedSections.liquidity}
                onToggle={() => toggleSection('liquidity')}
              >
                {liquidityLoading && <DiscoveryHint className="">Loading liquidity data…</DiscoveryHint>}
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <div className={inspectorShell.card}>
                  <div className={inspectorShell.cardLabel}>Tradability Score</div>
                    <div className={optionDiscoveryTradabilityScoreClass}>
                      <span className={optionDiscoveryTradabilityValueClass(tradability.score)}>
                        {tradability.score}
                      </span>
                      <span className={optionDiscoveryTradabilityLabelClass}>/ 100</span>
                    </div>
                    <div className={optionDiscoveryTradabilityFactorsClass}>
                      {tradability.factors.map(f => (
                        <div key={f.label} className={optionDiscoveryTradabilityFactorClass}>
                          <span className="text-xs text-muted-foreground">{f.label}</span>
                          <span className="font-medium tabular-nums">
                            +{f.contribution} <span className={optionDiscoveryKvDimClass}>({f.detail})</span>
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                <div className={inspectorShell.card}>
                  <div className={inspectorShell.cardLabel}>Spread Analysis</div>
                    <div className="grid grid-cols-[auto_1fr] gap-x-2 gap-y-1 text-sm">
                      <span className="text-xs text-muted-foreground">Spread ($)</span>
                      <span className="font-medium tabular-nums">{selectedDerived?.spread != null ? fmtUsd(selectedDerived.spread) : '—'}</span>
                      <span className="text-xs text-muted-foreground">Spread (%)</span>
                      <span className="font-medium tabular-nums">
                        {serverLiquidity?.spread_pct != null
                          ? `${serverLiquidity.spread_pct.toFixed(1)}%`
                          : selectedDerived?.spreadPct != null
                            ? `${selectedDerived.spreadPct.toFixed(1)}%`
                            : '—'}
                      </span>
                      <span className="text-xs text-muted-foreground">Percentile</span>
                      <span className="font-medium tabular-nums">
                        {serverLiquidity?.spread_percentile != null
                          ? `${serverLiquidity.spread_percentile.toFixed(0)}th`
                          : spreadPercentile != null
                            ? `${spreadPercentile.toFixed(0)}th`
                            : '—'}
                        <span className={optionDiscoveryKvDimClass}> (vs {serverLiquidity?.contracts_compared ?? spreadRows.length} same-side contracts)</span>
                      </span>
                      <span className="text-xs text-muted-foreground">OI</span>
                      <span className="font-medium tabular-nums">
                        {serverLiquidity?.oi != null
                          ? String(serverLiquidity.oi)
                          : selectedRow.open_interest != null
                            ? String(selectedRow.open_interest)
                            : '—'}
                      </span>
                      {serverLiquidity?.oi_percentile != null && (
                        <>
                          <span className="text-xs text-muted-foreground">OI Percentile</span>
                          <span className="font-medium tabular-nums">{serverLiquidity.oi_percentile.toFixed(0)}th</span>
                        </>
                      )}
                      {serverLiquidity?.snapshot_ts && (
                        <>
                          <span className="text-xs text-muted-foreground">Snapshot</span>
                          <span className={cn('font-medium tabular-nums', optionDiscoveryKvDimClass)}>{new Date(serverLiquidity.snapshot_ts).toLocaleString()}</span>
                        </>
                      )}
                    </div>
                  </div>
                <div className={inspectorShell.card}>
                  <div className={inspectorShell.cardLabel}>Last Trade</div>
                    {liquidityLastTrade ? (
                      <div className="grid grid-cols-[auto_1fr] gap-x-2 gap-y-1 text-sm">
                        <span className="text-xs text-muted-foreground">Price</span>
                        <span className="font-medium tabular-nums">{fmtUsd(Number(liquidityLastTrade.price))}</span>
                        <span className="text-xs text-muted-foreground">Size</span>
                        <span className="font-medium tabular-nums">{String(liquidityLastTrade.size ?? '—')}</span>
                        <span className="text-xs text-muted-foreground">Age</span>
                        <span className="font-medium tabular-nums">
                          {lastTradeAge != null
                            ? lastTradeAge < 3600
                              ? `${Math.round(lastTradeAge / 60)}m ago`
                              : `${(lastTradeAge / 3600).toFixed(1)}h ago`
                            : '—'}
                        </span>
                        <span className="text-xs text-muted-foreground">Exchange</span>
                        <span className="font-medium tabular-nums">{String(liquidityLastTrade.exchange ?? '—')}</span>
                      </div>
                    ) : (
                      <DiscoveryHint className="">{liquidityLoading ? 'Loading…' : 'No last trade data available.'}</DiscoveryHint>
                    )}
                  </div>
                <div className={inspectorShell.card}>
                  <div className={inspectorShell.cardLabel}>Quote Activity</div>
                    <div className="grid grid-cols-[auto_1fr] gap-x-2 gap-y-1 text-sm">
                      <span className="text-xs text-muted-foreground">Recent Quotes</span>
                      <span className="font-medium tabular-nums">{liquidityQuoteCount != null ? `${liquidityQuoteCount} updates` : '—'}</span>
                    </div>
                  </div>
                </div>

                <div className={optionDiscoveryExecGuidanceClass}>
                  <span className={optionDiscoveryExecGuidanceTitleClass}>Execution Notes</span>
                  {selectedDerived?.spreadPct != null && selectedDerived.spreadPct > 10 && (
                    <DenseTag variant="warning" size="pill">Wide spread — use limit near mid</DenseTag>
                  )}
                  {selectedDerived?.spreadPct != null && selectedDerived.spreadPct <= 3 && (
                    <DenseTag variant="success" size="pill">Tight spread</DenseTag>
                  )}
                  {(selectedRow.open_interest == null || selectedRow.open_interest < 10) && (
                    <DenseTag variant="warning" size="pill">Low OI — thin liquidity</DenseTag>
                  )}
                  {lastTradeAge != null && lastTradeAge > 3600 && (
                    <DenseTag variant="warning" size="pill">Stale tape — last trade &gt;1h</DenseTag>
                  )}
                  {selectedRow.bid == null && selectedRow.ask == null && effectiveQuotePremium(selectedRow) != null && (
                    <DenseTag variant="warning" size="pill">No live NBBO — mark uses mid/day-bar fallback (not a live quote)</DenseTag>
                  )}
                  {selectedRow.bid == null && selectedRow.ask == null && effectiveQuotePremium(selectedRow) == null && (
                    <DenseTag variant="danger" size="pill">No bid/ask or day bar — illiquid or no data</DenseTag>
                  )}
                  {tradability.score >= 60 && selectedDerived?.spreadPct != null && selectedDerived.spreadPct <= 5 && (
                    <DenseTag variant="success" size="pill">Good tradability</DenseTag>
                  )}
                </div>
              </RightInspectorCollapsibleSection>
            )
          })()}

          {(() => {
            const scenarios = computeScenarios(selectedRow, underlyingPrice)
            const hasGreeks = selectedRow.delta != null && Number.isFinite(selectedRow.delta!)
            return (
              <RightInspectorCollapsibleSection
                sectionId={OPTION_INSPECTOR_SECTION_DOM_ID.risk}
                navItem={OPTION_INSPECTOR_NAV_BY_ID.risk}
                expanded={expandedSections.risk}
                onToggle={() => toggleSection('risk')}
              >
                {!hasGreeks && (
                  <DiscoveryHint className="">Greeks not available for this contract. Risk scenarios require at least delta.</DiscoveryHint>
                )}
                <div className={optionDiscoveryCardGridClass}>
                  <div className={optionDiscoveryCardSectionClass}>
                    <div className={optionDiscoveryCardSectionTitleClass}>Greeks (per contract)</div>
                    <div className={optionDiscoveryKvGridClass}>
                      <span className={optionDiscoveryKvKeyClass}>Delta (Δ)</span>
                      <span className={optionDiscoveryKvValueClass}>{fmtOptNum(selectedRow.delta, 4)}</span>
                      <span className={optionDiscoveryKvKeyClass}>Gamma (Γ)</span>
                      <span className={optionDiscoveryKvValueClass}>{fmtOptNum(selectedRow.gamma, 4)}</span>
                      <span className={optionDiscoveryKvKeyClass}>Theta (Θ)</span>
                      <span className={optionDiscoveryKvValueClass}>{fmtOptNum(selectedRow.theta, 4)}</span>
                      <span className={optionDiscoveryKvKeyClass}>Vega (ν)</span>
                      <span className={optionDiscoveryKvValueClass}>{fmtOptNum(selectedRow.vega, 4)}</span>
                      <span className={optionDiscoveryKvKeyClass}>IV</span>
                      <span className={optionDiscoveryKvValueClass}>{fmtIV(selectedRow.iv)}</span>
                    </div>
                  </div>
                  {scenarios.length > 0 && (
                    <div className={optionDiscoveryCardSectionClass}>
                      <div className={optionDiscoveryCardSectionTitleClass}>Scenario Analysis (1 contract = 100 shares)</div>
                      <div className={optionDiscoveryScenarioWrapClass}>
                        <DiscoveryScenarioTable scenarios={scenarios} />
                      </div>
                    </div>
                  )}
                  <div className={optionDiscoveryCardSectionClass}>
                    <div className={optionDiscoveryCardSectionTitleClass}>Exposure Summary</div>
                    <div className={optionDiscoveryKvGridClass}>
                      <span className={optionDiscoveryKvKeyClass}>Delta $ (per 1 lot)</span>
                      <span className={optionDiscoveryKvValueClass}>
                        {selectedRow.delta != null && underlyingPrice != null
                          ? fmtUsd(selectedRow.delta * underlyingPrice * 100)
                          : '—'}
                      </span>
                      <span className={optionDiscoveryKvKeyClass}>Theta $ / day</span>
                      <span className={optionDiscoveryKvValueClass}>{selectedRow.theta != null ? fmtUsd(selectedRow.theta * 100) : '—'}</span>
                      <span className={optionDiscoveryKvKeyClass}>Vega $ / 1pt IV</span>
                      <span className={optionDiscoveryKvValueClass}>{selectedRow.vega != null ? fmtUsd(selectedRow.vega * 100 * 0.01) : '—'}</span>
                    </div>
                  </div>
                </div>
              </RightInspectorCollapsibleSection>
            )
          })()}

          {(() => {
            const clientRv = computeRelativeValue(selectedRow, snapshotRows)
            const hasServer = serverRelativeValue?.ok && serverRelativeValue.label != null
            const rvLabel = hasServer ? serverRelativeValue!.label! : clientRv.label
            const rvZScore = hasServer ? serverRelativeValue!.iv_zscore : clientRv.ivZScore
            const rvAvgIv = hasServer ? serverRelativeValue!.avg_iv : clientRv.neighborAvgIv
            const rvCount = hasServer ? serverRelativeValue!.contracts_compared : clientRv.neighborCount
            const sameRight = snapshotRows.filter(r => r.right === selectedRow.right && r.iv != null && Number.isFinite(r.iv!))
            return (
              <RightInspectorCollapsibleSection
                sectionId={OPTION_INSPECTOR_SECTION_DOM_ID.relative}
                navItem={OPTION_INSPECTOR_NAV_BY_ID.relative}
                expanded={expandedSections.relative}
                onToggle={() => toggleSection('relative')}
              >
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <div className={inspectorShell.card}>
                  <div className={inspectorShell.cardLabel}>
                      IV Relative Value {hasServer && <span className={optionDiscoveryKvDimClass}>(server)</span>}
                    </div>
                    <div className="grid grid-cols-[auto_1fr] gap-x-2 gap-y-1 text-sm">
                      <span className="text-xs text-muted-foreground">Label</span>
                      <span
                        className={cn(
                          'font-medium tabular-nums',
                          rvLabel === 'Rich' && 'text-destructive',
                          rvLabel === 'Cheap' && 'text-success',
                          rvLabel === 'Neutral' && 'text-primary',
                          rvLabel === '—' && 'text-muted-foreground',
                        )}
                      >
                        {rvLabel}
                      </span>
                      <span className="text-xs text-muted-foreground">IV z-score</span>
                      <span className="font-medium tabular-nums">{rvZScore != null ? Number(rvZScore).toFixed(2) : '—'}</span>
                      <span className="text-xs text-muted-foreground">This IV</span>
                      <span className="font-medium tabular-nums">{fmtIV(selectedRow.iv)}</span>
                      <span className="text-xs text-muted-foreground">Avg IV (same side)</span>
                      <span className="font-medium tabular-nums">{rvAvgIv != null ? Number(rvAvgIv).toFixed(4) : '—'}</span>
                      {serverRelativeValue?.std_iv != null && (
                        <>
                          <span className="text-xs text-muted-foreground">Std IV</span>
                          <span className="font-medium tabular-nums">{Number(serverRelativeValue.std_iv).toFixed(4)}</span>
                        </>
                      )}
                      <span className="text-xs text-muted-foreground">Contracts compared</span>
                      <span className="font-medium tabular-nums">{rvCount ?? 0}</span>
                    </div>
                  </div>
                  {sameRight.length >= 3 && (
                <div className={inspectorShell.card}>
                  <div className={inspectorShell.cardLabel}>
                        IV Smile (same expiry, {selectedRow.right === 'C' ? 'Calls' : 'Puts'})
                      </div>
                      <OdChartExpandOnHover title={`IV Smile (same expiry, ${selectedRow.right === 'C' ? 'Calls' : 'Puts'})`}>
                        <>
                          <IvSmileLegend side={selectedRow.right === 'C' ? 'call' : 'put'} underlying={underlyingPrice} />
                          <IvSmileChart rows={sameRight} underlying={underlyingPrice} side={selectedRow.right === 'C' ? 'call' : 'put'} />
                        </>
                      </OdChartExpandOnHover>
                    </div>
                  )}
                </div>

                {greeksCoverage?.ok && greeksCoverage.total != null && greeksCoverage.total > 0 && (
                  <OptionDataQualityBadge
                    items={[
                      { label: `IV ${greeksCoverage.coverage?.iv_pct ?? 0}%` },
                      { label: `Greeks ${greeksCoverage.coverage?.full_greeks_pct ?? 0}%` },
                      { label: `OI ${greeksCoverage.coverage?.with_oi ?? 0} contracts` },
                    ]}
                  />
                )}
              </RightInspectorCollapsibleSection>
            )
          })()}
        </div>
    </div>
  )
}
