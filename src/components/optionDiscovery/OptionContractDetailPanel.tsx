import { bsComputeDetail } from '@/utils/optionDiscovery/bsCalc'
import { DiscoveryHint } from '@/components/optionDiscovery/DiscoveryHint'
import { DiscoveryIconButton } from '@/components/optionDiscovery/DiscoveryIconButton'
/* eslint-disable react-hooks/purity -- relative timestamps use Date.now() during render */
import type { GreeksCoverageResponse, LiquiditySummaryResponse, RelativeValueResponse, OptionSnapshotRow } from '@/types/optionDiscovery'
import { InfoTooltip } from '@/components/ui/InfoTooltip'
import { fmtUsd } from '@/lib/format'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { OptionDiscoveryContractChartPanel } from './OptionDiscoveryContractChartPanel'
import { IvSmileChart, IvSmileLegend } from './OptionDiscoveryAnalytics'
import { OdChartExpandOnHover } from './OdChartExpandOnHover'
import { expirationDaysFromToday, parseExpirationDateParts } from '@/utils/optionDiscovery/expirationMeta'
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
  return (
    <>
      {eventContextWarnings.length > 0 && (
        <div className="mb-2 space-y-1 rounded-md border border-amber-500/40 bg-amber-500/10 px-2 py-1.5 text-sm text-amber-900 dark:text-amber-100" role="alert">
          {eventContextWarnings.map((w, i) => (
            <div key={i}>
              {w}
            </div>
          ))}
        </div>
      )}

      <div className="min-w-0" aria-label="Contract detail">
        <div className="mb-3 flex flex-wrap items-center gap-2 border-b border-border pb-2">
          <h3 className="m-0 min-w-0 flex-1 text-base font-semibold">
            {symbol}{' '}
            {selectedRow.right === 'C' ? 'Call' : 'Put'} {selectedRow.strike.toFixed(2)}
            <span className="text-sm font-normal text-muted-foreground">
              {expiration} · {expirationDaysFromToday(expiration)} DTE
            </span>{' '}
            <span
              className={cn(
                'rounded-full border px-1.5 py-0.5 text-xs font-semibold uppercase',
                selectedDerived.moneynessLabel === 'ATM' && 'border-primary/50 bg-primary/10',
                selectedDerived.moneynessLabel === 'ITM' && 'border-green-500/40 bg-green-500/10 text-green-700 dark:text-green-400',
                selectedDerived.moneynessLabel === 'OTM' && 'border-muted-foreground/40 bg-muted text-muted-foreground',
              )}
            >
              {selectedDerived.moneynessLabel}
            </span>
          </h3>
          <DiscoveryIconButton
            className="od-detail-action-icon-btn"
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
            className="od-detail-action-icon-btn"
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
          <span className="text-xs text-muted-foreground">Massive · 15 min delayed</span>
          <Button type="button" variant="ghost" size="icon-xs" onClick={onClose} aria-label="Close contract detail">
            ✕
          </Button>
        </div>

        <div className="flex flex-col gap-4">
          <section aria-labelledby="od-contract-sec-overview">
            <h4 id="od-contract-sec-overview" className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Overview
            </h4>
            <div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <div className="rounded-lg border border-border bg-secondary/30 p-2">
                  <div className="mb-1.5 flex flex-wrap items-center gap-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Price
                    <span className="rounded bg-muted px-1 py-0.5 text-[0.65rem] font-medium normal-case">Day</span>
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
                <div className="rounded-lg border border-border bg-secondary/30 p-2">
                  <div className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Value Decomposition</div>
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
                <div className="rounded-lg border border-border bg-secondary/30 p-2">
                  <div className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Underlying</div>
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
                <div className="od-card-section">
                  <div className="mb-1.5 flex flex-wrap items-center gap-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Greeks
                    <ToggleGroup
                      type="single"
                      size="sm"
                      variant="outline"
                      value={greeksSource}
                      onValueChange={v => {
                        if (v === 'snapshot' || v === 'bs') onGreeksSourceChange(v)
                      }}
                    >
                      <ToggleGroupItem value="snapshot" title="Show IV & Greeks from Massive snapshot data">
                        Snapshot
                      </ToggleGroupItem>
                      <ToggleGroupItem value="bs" title="Show IV & Greeks computed locally via Black-Scholes">
                        BS
                      </ToggleGroupItem>
                    </ToggleGroup>
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
                          <span className="od-kv-k od-kv-dim" style={{ gridColumn: '1/-1', fontSize: '0.75rem' }}>
                            {bsDteDays === 0 ? '已到期，无法计算' : underlyingPrice == null ? '标的价格未知' : 'IV 求解失败'}
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
                <div className="od-quality-badge">
                  <span className="od-quality-badge-title">Data Quality</span>
                  <span className="od-quality-item" title="Percentage of contracts with IV data">
                    IV {greeksCoverage.coverage?.iv_pct ?? 0}%
                  </span>
                  <span className="od-quality-item" title="Percentage with full greeks (Δ,Γ,Θ,ν)">
                    Greeks {greeksCoverage.coverage?.full_greeks_pct ?? 0}%
                  </span>
                  {greeksCoverage.freshness?.newest_ts && (
                    <span className="od-quality-item" title="Most recent snapshot timestamp">
                      Fresh: {new Date(greeksCoverage.freshness.newest_ts).toLocaleTimeString()}
                    </span>
                  )}
                </div>
              )}
            </div>
          </section>

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
            function diffClass(pct: number | null): string {
              if (pct == null) return ''
              const abs = Math.abs(pct)
              if (abs < 3) return 'text-green-600 dark:text-green-500'
              if (abs < 10) return 'text-amber-600 dark:text-amber-400'
              return 'text-destructive'
            }
            function fmtDiff(pct: number | null): string {
              if (pct == null) return '—'
              return (pct > 0 ? '+' : '') + pct.toFixed(1) + '%'
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
              { label: 'Theta/日', snap: selectedRow.theta != null ? selectedRow.theta.toFixed(4) : '—', bs: bsDetail.thetaPerDay != null ? bsDetail.thetaPerDay.toFixed(4) : '—', diff: thetaDiff },
              {
                label: 'Vega/1%',
                snap: selectedRow.vega != null ? selectedRow.vega.toFixed(4) : '—',
                bs: bsDetail.vegaPer1Pct != null ? bsDetail.vegaPer1Pct.toFixed(4) : '—',
                diff: vegaDiff,
                vegaHint: vegaDiff != null && Math.abs(vegaDiff) > 80,
              },
            ] as const

            return (
              <section aria-labelledby="od-contract-sec-bs">
                <h4 id="od-contract-sec-bs" className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                  BS vs Snapshot
                  <span className="font-normal normal-case text-muted-foreground">
                    {' '}
                    · Black-Scholes 欧式近似（美式期权，ATM 误差通常 &lt;3%）
                  </span>
                </h4>
                <DiscoveryHint className="mb-2 text-xs">
                  S={`$${underlyingPrice.toFixed(2)}`} · K={selectedRow.strike.toFixed(2)} · DTE={dteDays} · 市场价=
                  {mktPrice.toFixed(4)} ({mktSrc}) · r=4.50%
                </DiscoveryHint>
                {bsDetail.iv == null ? (
                  <DiscoveryHint className="text-destructive">BS IV 求解失败（价格异常或深度 ITM/OTM）</DiscoveryHint>
                ) : (
                  <div className="overflow-x-auto rounded-md border border-border">
                    <Table className="text-xs">
                      <TableHeader>
                        <TableRow className="hover:bg-transparent">
                          <TableHead>Metric</TableHead>
                          <TableHead>Snapshot (Massive)</TableHead>
                          <TableHead>BS</TableHead>
                          <TableHead>Diff %</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {bsRows.map(row => (
                          <TableRow key={row.label}>
                            <TableCell className="font-medium">{row.label}</TableCell>
                            <TableCell className="tabular-nums">{row.snap}</TableCell>
                            <TableCell className="tabular-nums">{row.bs}</TableCell>
                            <TableCell className={cn('tabular-nums font-medium', diffClass(row.diff))}>
                              {fmtDiff(row.diff)}
                              {'vegaHint' in row && row.vegaHint ? (
                                <span className="text-muted-foreground"> 单位?</span>
                              ) : null}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                      <TableFooter>
                        <TableRow className="hover:bg-transparent">
                          <TableCell colSpan={4} className="text-xs text-muted-foreground">
                            <span className="text-green-600 dark:text-green-500">■</span> &lt;3%&nbsp;&nbsp;
                            <span className="text-amber-600 dark:text-amber-400">■</span> 3–10%&nbsp;&nbsp;
                            <span className="text-destructive">■</span> &gt;10%
                            &nbsp;·&nbsp;NR {bsDetail.iterCount} iter {bsDetail.converged ? '✓' : '(not converged)'}
                            &nbsp;·&nbsp;BS model=
                            {bsDetail.bsModelPrice != null ? `$${bsDetail.bsModelPrice.toFixed(4)}` : '—'}
                          </TableCell>
                        </TableRow>
                      </TableFooter>
                    </Table>
                  </div>
                )}
              </section>
            )
          })()}

          <section className="" aria-labelledby="od-contract-sec-chart">
            <h4 id="od-contract-sec-chart" className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Chart (K-line)
            </h4>
            <DiscoveryHint className=" od-detail-chart-hint" style={{ marginTop: 0, marginBottom: '0.5rem' }}>
              OHLC below uses contract history. If the chart is empty, click Backfill from Massive (Celery worker on the massive queue required).
            </DiscoveryHint>
            <OptionDiscoveryContractChartPanel
              symbol={symbol}
              expiration={expiration}
              strike={selectedRow.strike}
              optionRight={selectedRow.right === 'P' ? 'P' : 'C'}
            />
          </section>

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
              <section className="" aria-labelledby="od-contract-sec-liquidity">
                <h4 id="od-contract-sec-liquidity" className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                  Liquidity
                </h4>
                {liquidityLoading && <DiscoveryHint className="">Loading liquidity data…</DiscoveryHint>}
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <div className="rounded-lg border border-border bg-secondary/30 p-2">
                  <div className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Tradability Score</div>
                    <div className="od-tradability-score">
                      <span
                        className={`od-tradability-value od-tradability-${tradability.score >= 60 ? 'good' : tradability.score >= 30 ? 'fair' : 'poor'}`}
                      >
                        {tradability.score}
                      </span>
                      <span className="od-tradability-label">/ 100</span>
                    </div>
                    <div className="od-tradability-factors">
                      {tradability.factors.map(f => (
                        <div key={f.label} className="od-tradability-factor">
                          <span className="text-xs text-muted-foreground">{f.label}</span>
                          <span className="font-medium tabular-nums">
                            +{f.contribution} <span className="od-kv-dim">({f.detail})</span>
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                <div className="rounded-lg border border-border bg-secondary/30 p-2">
                  <div className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Spread Analysis</div>
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
                        <span className="od-kv-dim"> (vs {serverLiquidity?.contracts_compared ?? spreadRows.length} same-side contracts)</span>
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
                          <span className="font-medium tabular-nums od-kv-dim">{new Date(serverLiquidity.snapshot_ts).toLocaleString()}</span>
                        </>
                      )}
                    </div>
                  </div>
                <div className="rounded-lg border border-border bg-secondary/30 p-2">
                  <div className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Last Trade</div>
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
                <div className="rounded-lg border border-border bg-secondary/30 p-2">
                  <div className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Quote Activity</div>
                    <div className="grid grid-cols-[auto_1fr] gap-x-2 gap-y-1 text-sm">
                      <span className="text-xs text-muted-foreground">Recent Quotes</span>
                      <span className="font-medium tabular-nums">{liquidityQuoteCount != null ? `${liquidityQuoteCount} updates` : '—'}</span>
                    </div>
                  </div>
                </div>

                <div className="od-exec-guidance">
                  <span className="od-exec-guidance-title">Execution Notes</span>
                  {selectedDerived?.spreadPct != null && selectedDerived.spreadPct > 10 && (
                    <span className="od-exec-chip od-exec-chip--warn">Wide spread — use limit near mid</span>
                  )}
                  {selectedDerived?.spreadPct != null && selectedDerived.spreadPct <= 3 && (
                    <span className="od-exec-chip od-exec-chip--ok">Tight spread</span>
                  )}
                  {(selectedRow.open_interest == null || selectedRow.open_interest < 10) && (
                    <span className="od-exec-chip od-exec-chip--warn">Low OI — thin liquidity</span>
                  )}
                  {lastTradeAge != null && lastTradeAge > 3600 && (
                    <span className="od-exec-chip od-exec-chip--warn">Stale tape — last trade &gt;1h</span>
                  )}
                  {selectedRow.bid == null && selectedRow.ask == null && effectiveQuotePremium(selectedRow) != null && (
                    <span className="od-exec-chip od-exec-chip--warn">No live NBBO — mark uses mid/day-bar fallback (not a live quote)</span>
                  )}
                  {selectedRow.bid == null && selectedRow.ask == null && effectiveQuotePremium(selectedRow) == null && (
                    <span className="od-exec-chip od-exec-chip--danger">No bid/ask or day bar — illiquid or no data</span>
                  )}
                  {tradability.score >= 60 && selectedDerived?.spreadPct != null && selectedDerived.spreadPct <= 5 && (
                    <span className="od-exec-chip od-exec-chip--ok">Good tradability</span>
                  )}
                </div>
              </section>
            )
          })()}

          {(() => {
            const scenarios = computeScenarios(selectedRow, underlyingPrice)
            const hasGreeks = selectedRow.delta != null && Number.isFinite(selectedRow.delta!)
            return (
              <section className="" aria-labelledby="od-contract-sec-risk">
                <h4 id="od-contract-sec-risk" className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                  Risk
                </h4>
                {!hasGreeks && (
                  <DiscoveryHint className="">Greeks not available for this contract. Risk scenarios require at least delta.</DiscoveryHint>
                )}
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <div className="rounded-lg border border-border bg-secondary/30 p-2">
                  <div className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Greeks (per contract)</div>
                    <div className="grid grid-cols-[auto_1fr] gap-x-2 gap-y-1 text-sm">
                      <span className="text-xs text-muted-foreground">Delta (Δ)</span>
                      <span className="font-medium tabular-nums">{fmtOptNum(selectedRow.delta, 4)}</span>
                      <span className="text-xs text-muted-foreground">Gamma (Γ)</span>
                      <span className="font-medium tabular-nums">{fmtOptNum(selectedRow.gamma, 4)}</span>
                      <span className="text-xs text-muted-foreground">Theta (Θ)</span>
                      <span className="font-medium tabular-nums">{fmtOptNum(selectedRow.theta, 4)}</span>
                      <span className="text-xs text-muted-foreground">Vega (ν)</span>
                      <span className="font-medium tabular-nums">{fmtOptNum(selectedRow.vega, 4)}</span>
                      <span className="text-xs text-muted-foreground">IV</span>
                      <span className="font-medium tabular-nums">{fmtIV(selectedRow.iv)}</span>
                    </div>
                  </div>
                  {scenarios.length > 0 && (
                <div className="rounded-lg border border-border bg-secondary/30 p-2">
                  <div className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Scenario Analysis (1 contract = 100 shares)</div>
                      <table className="od-scenario-table">
                        <thead>
                          <tr>
                            <th>Scenario</th>
                            <th>Est. PnL</th>
                            <th>Detail</th>
                          </tr>
                        </thead>
                        <tbody>
                          {scenarios.map(s => (
                            <tr key={s.label}>
                              <td>{s.label}</td>
                              <td className={s.pnl != null && s.pnl >= 0 ? 'od-pnl-pos' : 'od-pnl-neg'}>
                                {s.pnl != null ? `${s.pnl >= 0 ? '+' : ''}${fmtUsd(s.pnl)}` : '—'}
                              </td>
                              <td className="od-kv-dim">{s.detail}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                <div className="rounded-lg border border-border bg-secondary/30 p-2">
                  <div className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Exposure Summary</div>
                    <div className="grid grid-cols-[auto_1fr] gap-x-2 gap-y-1 text-sm">
                      <span className="text-xs text-muted-foreground">Delta $ (per 1 lot)</span>
                      <span className="font-medium tabular-nums">
                        {selectedRow.delta != null && underlyingPrice != null
                          ? fmtUsd(selectedRow.delta * underlyingPrice * 100)
                          : '—'}
                      </span>
                      <span className="text-xs text-muted-foreground">Theta $ / day</span>
                      <span className="font-medium tabular-nums">{selectedRow.theta != null ? fmtUsd(selectedRow.theta * 100) : '—'}</span>
                      <span className="text-xs text-muted-foreground">Vega $ / 1pt IV</span>
                      <span className="font-medium tabular-nums">{selectedRow.vega != null ? fmtUsd(selectedRow.vega * 100 * 0.01) : '—'}</span>
                    </div>
                  </div>
                </div>
              </section>
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
              <section className="" aria-labelledby="od-contract-sec-relative">
                <h4 id="od-contract-sec-relative" className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                  Relative Value
                </h4>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <div className="rounded-lg border border-border bg-secondary/30 p-2">
                  <div className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      IV Relative Value {hasServer && <span className="od-kv-dim">(server)</span>}
                    </div>
                    <div className="grid grid-cols-[auto_1fr] gap-x-2 gap-y-1 text-sm">
                      <span className="text-xs text-muted-foreground">Label</span>
                      <span
                        className={cn(
                          'font-medium tabular-nums',
                          rvLabel === 'Rich' && 'text-destructive',
                          rvLabel === 'Cheap' && 'text-green-600 dark:text-green-500',
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
                <div className="rounded-lg border border-border bg-secondary/30 p-2">
                  <div className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
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
                  <div className="od-quality-badge">
                    <span className="od-quality-badge-title">Data Quality</span>
                    <span className="od-quality-item">IV {greeksCoverage.coverage?.iv_pct ?? 0}%</span>
                    <span className="od-quality-item">Greeks {greeksCoverage.coverage?.full_greeks_pct ?? 0}%</span>
                    <span className="od-quality-item">OI {greeksCoverage.coverage?.with_oi ?? 0} contracts</span>
                  </div>
                )}
              </section>
            )
          })()}
        </div>
      </div>
    </>
  )
}
