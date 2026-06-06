import { ChevronDown, ChevronRight, Info } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { fmtUsd } from '@/utils/positions'
import {
  buildPortfolioAccountTable,
  buildPortfolioCashRollup,
  portfolioCashPieFromRow,
} from '@/utils/accountsSnapshot'
import type { StatusResponse } from '@/types/monitor'
import { WatchlistMetricTable } from './WatchlistMetricTable'
import {
  HELP_CASH_PIE,
  HELP_MAX_DD_SCENARIO,
  HELP_PORTFOLIO_TABLE,
  sizingCashPieClass,
  sizingCashPieDotCashClass,
  sizingCashPieDotRestClass,
  sizingCashPieDotStkClass,
  sizingCashPieHoleClass,
  sizingCashPieHoleLabelClass,
  sizingCashPieLayoutClass,
  sizingCashPieLegendPairClass,
  sizingCashPieLegendPairLeftClass,
  sizingCashPieLegendPairRightClass,
  sizingCashPieLegendPairedClass,
  sizingCashPieLegendPctClass,
  sizingCashPieLegendTextClass,
  sizingCashPieLegendTextTrClass,
  sizingCashPieLegendValClass,
  sizingCashPiePanelClass,
  sizingCashPiePanelEmptyClass,
  sizingCashPiePanelTitleClass,
  sizingCashPiePctClass,
  sizingCashPiePctStkClass,
  sizingCashPieRingClass,
  sizingCashPieSplitGridClass,
  sizingCashPieSplitHeadClass,
  sizingCashPieSplitWrapClass,
  sizingDashClass,
  sizingDashSubtitleSmClass,
  sizingPortfolioMaxDdRowClass,
  sizingPortfolioRiskToggleClass,
  sizingPortfolioSummaryClass,
  sizingPortfolioSummaryItemClass,
  sizingPortfolioSummaryItemMaxDdClass,
  sizingPortfolioSummaryMetricClass,
  sizingPortfolioSummaryMetricEmphClass,
  sizingPortfolioSummaryMetricValueClass,
  sizingPortfolioSummaryNameClass,
  sizingPortfolioTableWrapClass,
  sizingRangeElegantClass,
  sizingRangeFieldHeadClass,
  sizingRangeFieldLabelClass,
  sizingRangeFieldLabelRowClass,
  sizingRangeFieldMetricTileHighlightClass,
  sizingRangeFieldMetricTileLabelClass,
  sizingRangeFieldMetricTileSubClass,
  sizingRangeFieldMetricTileValueClass,
  sizingRangeFieldMetricsRowClass,
  sizingRangeFieldMetricsRowSingleClass,
  sizingRangeFieldPortfolioClass,
  sizingRangeFieldReadoutClass,
  sizingRangeFieldReadoutUnitClass,
  sizingRangeFieldScaleClass,
  sizingDashTitleInlineClass,
  sizingDashTitleRowClass,
} from './sizingUi'

interface Props {
  status: StatusResponse | null | undefined
  staticMaxDdPctCap: number
  staticRiskPctPerTrade: number
  capital: number
  staticRiskBudgetUsd: number
  staticRiskUsdPerTrade: number
  portfolioDdUsd: number | null
  portfolioDdPctOfNav: number | null
  collapsed: boolean
  onCollapsedChange: (v: boolean) => void
  onMaxDdChange: (v: number) => void
  onStaticRiskPctChange: (v: number) => void
}

function HelpTooltip({ text }: { text: string }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          className="text-muted-foreground"
          aria-label="Help"
          onClick={e => e.stopPropagation()}
        >
          <Info className="h-3.5 w-3.5" />
        </button>
      </TooltipTrigger>
      <TooltipContent className="max-w-sm text-xs">{text}</TooltipContent>
    </Tooltip>
  )
}

function CashPiePanel({
  title,
  pie,
  emptyMessage,
}: {
  title: string
  pie: ReturnType<typeof portfolioCashPieFromRow>
  emptyMessage?: string
}) {
  return (
    <div className={sizingCashPiePanelClass}>
      <h6 className={sizingCashPiePanelTitleClass}>{title}</h6>
      {!pie ? (
        <p className={sizingCashPiePanelEmptyClass}>{emptyMessage ?? '—'}</p>
      ) : (
        <div className={sizingCashPieLayoutClass}>
          <div
            className={sizingCashPieClass}
            role="img"
            aria-label={`${title}: cash ${pie.cashPctOfNet.toFixed(1)} percent, STK ex-FI ${pie.stkPctOfNet.toFixed(1)} percent, other ${pie.otherPctOfNet.toFixed(1)} percent of net liquidation`}
          >
            <div
              className={sizingCashPieRingClass}
              style={{
                background: `conic-gradient(
                  color-mix(in srgb, var(--primary) 88%, #050a10) 0turn ${pie.cashTurnEnd}turn,
                  color-mix(in srgb, #a855f7 74%, var(--background)) ${pie.cashTurnEnd}turn ${pie.stkTurnEnd}turn,
                  color-mix(in srgb, var(--border) 72%, var(--secondary)) ${pie.stkTurnEnd}turn 1turn
                )`,
              }}
            />
            <div className={sizingCashPieHoleClass}>
              <span className={sizingCashPiePctClass}>{pie.cashPctOfNet.toFixed(1)}%</span>
              <span className={sizingCashPiePctStkClass}>{pie.stkPctOfNet.toFixed(1)}%</span>
              <span className={sizingCashPieHoleLabelClass}>cash · stk ex‑FI</span>
            </div>
          </div>
          <div className={sizingCashPieLegendPairedClass} role="list">
            <div className={sizingCashPieLegendPairClass} role="listitem">
              <div className={sizingCashPieLegendPairLeftClass}>
                <span className={sizingCashPieDotCashClass} aria-hidden />
                <span className={sizingCashPieLegendTextClass}>
                  <strong>Cash total</strong>{' '}
                  <span className={sizingCashPieLegendValClass}>
                    {fmtUsd(pie.cash)}{' '}
                    <span className={sizingCashPieLegendPctClass}>
                      ({pie.cashPctOfNet.toFixed(1)}%)
                    </span>
                  </span>
                </span>
              </div>
              <div className={sizingCashPieLegendPairRightClass}>
                <div className={sizingCashPieLegendTextTrClass}>
                  <strong>Net liq.</strong>{' '}
                  <span className={sizingCashPieLegendValClass}>{fmtUsd(pie.net)}</span>
                </div>
              </div>
            </div>
            <div className={sizingCashPieLegendPairClass} role="listitem">
              <div className={sizingCashPieLegendPairLeftClass}>
                <span className={sizingCashPieDotStkClass} aria-hidden />
                <span className={sizingCashPieLegendTextClass}>
                  <strong>STK ex‑FI</strong>{' '}
                  <span className={sizingCashPieLegendValClass}>
                    {fmtUsd(pie.stkExFi)}{' '}
                    <span className={sizingCashPieLegendPctClass}>
                      ({pie.stkPctOfNet.toFixed(1)}%)
                    </span>
                  </span>
                </span>
              </div>
              <div className={sizingCashPieLegendPairRightClass}>
                <div className={sizingCashPieLegendTextTrClass}>
                  <strong>Ex‑FI net liq.</strong>{' '}
                  <span className={sizingCashPieLegendValClass}>{fmtUsd(pie.netLiqExFi)}</span>
                </div>
              </div>
            </div>
            <div className={sizingCashPieLegendPairClass} role="listitem">
              <div className={sizingCashPieLegendPairLeftClass}>
                <span className={sizingCashPieDotRestClass} aria-hidden />
                <span className={sizingCashPieLegendTextClass}>
                  <strong>Other</strong>{' '}
                  <span className={sizingCashPieLegendValClass}>
                    {fmtUsd(pie.other)}{' '}
                    <span className={sizingCashPieLegendPctClass}>
                      ({pie.otherPctOfNet.toFixed(1)}%)
                    </span>
                  </span>
                </span>
              </div>
              <div className={sizingCashPieLegendPairRightClass}>
                <div className={sizingCashPieLegendTextTrClass}>
                  <strong>Cash / ex‑FI</strong>{' '}
                  <span className={sizingCashPieLegendValClass}>
                    {pie.cashPctExFi != null ? `${pie.cashPctExFi.toFixed(1)}%` : '—'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export function PortfolioRiskPower({
  status,
  staticMaxDdPctCap,
  staticRiskPctPerTrade,
  capital,
  staticRiskBudgetUsd,
  staticRiskUsdPerTrade,
  portfolioDdUsd,
  portfolioDdPctOfNav,
  collapsed,
  onCollapsedChange,
  onMaxDdChange,
  onStaticRiskPctChange,
}: Props) {
  const table = buildPortfolioAccountTable(status, staticMaxDdPctCap)
  const rollup = buildPortfolioCashRollup(status)
  const hostPie = portfolioCashPieFromRow(table.hostRow ?? undefined)
  const secondaryPie = portfolioCashPieFromRow(table.secondaryRow ?? undefined)
  const expanded = !collapsed

  return (
    <section className={sizingDashClass} aria-labelledby="portfolio-risk-power-head">
      <div className={sizingDashTitleRowClass}>
        <h4 id="portfolio-risk-power-head" className={sizingDashTitleInlineClass}>
          Portfolio risk power
        </h4>
        <HelpTooltip text={HELP_PORTFOLIO_TABLE} />
        <button
          type="button"
          className={sizingPortfolioRiskToggleClass}
          onClick={() => onCollapsedChange(!collapsed)}
          aria-expanded={expanded}
          aria-controls="portfolio-risk-power-body"
          title={collapsed ? 'Expand portfolio risk power' : 'Collapse portfolio risk power'}
          aria-label={collapsed ? 'Expand portfolio risk power' : 'Collapse portfolio risk power'}
        >
          {collapsed ? (
            <ChevronRight className="h-4 w-4" aria-hidden />
          ) : (
            <ChevronDown className="h-4 w-4" aria-hidden />
          )}
        </button>
      </div>

      {collapsed ? (
        <div
          id="portfolio-risk-power-body"
          className={sizingPortfolioSummaryClass}
          role="status"
          aria-live="polite"
        >
          <div className={sizingPortfolioSummaryItemClass}>
            <span className={sizingPortfolioSummaryNameClass}>Host</span>
            <span className={sizingPortfolioSummaryMetricClass}>
              Cash:{' '}
              <span className={sizingPortfolioSummaryMetricValueClass}>
                {hostPie ? fmtUsd(hostPie.cash) : '—'}
              </span>
            </span>
            <span className={sizingPortfolioSummaryMetricClass}>
              STK:{' '}
              <span className={sizingPortfolioSummaryMetricValueClass}>
                {hostPie ? fmtUsd(hostPie.stkExFi) : '—'}
              </span>
            </span>
          </div>
          <div className={sizingPortfolioSummaryItemClass}>
            <span className={sizingPortfolioSummaryNameClass}>Secondary</span>
            <span className={sizingPortfolioSummaryMetricClass}>
              Cash:{' '}
              <span className={sizingPortfolioSummaryMetricValueClass}>
                {secondaryPie ? fmtUsd(secondaryPie.cash) : '—'}
              </span>
            </span>
            <span className={sizingPortfolioSummaryMetricClass}>
              STK:{' '}
              <span className={sizingPortfolioSummaryMetricValueClass}>
                {secondaryPie ? fmtUsd(secondaryPie.stkExFi) : '—'}
              </span>
            </span>
          </div>
          <div className={sizingPortfolioSummaryItemMaxDdClass}>
            <span className={sizingPortfolioSummaryNameClass}>Max drawdown %</span>
            <span className={sizingPortfolioSummaryMetricEmphClass}>
              {staticMaxDdPctCap.toFixed(0)}%
            </span>
            <span className={sizingPortfolioSummaryMetricClass}>
              Static risk budget:{' '}
              <span className={sizingPortfolioSummaryMetricValueClass}>
                {capital > 0 ? fmtUsd(staticRiskBudgetUsd) : '—'}
              </span>
            </span>
            <span className={sizingPortfolioSummaryMetricClass}>
              Max drawdown:{' '}
              <span className={sizingPortfolioSummaryMetricValueClass}>
                {portfolioDdUsd != null ? fmtUsd(portfolioDdUsd) : '—'}
              </span>
            </span>
            <span className={sizingPortfolioSummaryMetricClass}>
              Per-trade loss:{' '}
              <span className={sizingPortfolioSummaryMetricValueClass}>
                {capital > 0 ? fmtUsd(staticRiskUsdPerTrade) : '—'}
              </span>
            </span>
          </div>
        </div>
      ) : (
        <>
          <div id="portfolio-risk-power-body" className={sizingPortfolioMaxDdRowClass}>
            <div className={sizingRangeFieldPortfolioClass}>
              <div className={sizingRangeFieldHeadClass}>
                <div className={sizingRangeFieldLabelRowClass}>
                  <label className={sizingRangeFieldLabelClass} htmlFor="portfolio-max-dd-pct">
                    Max drawdown %
                  </label>
                  <HelpTooltip text={HELP_MAX_DD_SCENARIO} />
                </div>
                <span className={sizingRangeFieldReadoutClass} aria-live="polite">
                  {staticMaxDdPctCap}
                  <span className={sizingRangeFieldReadoutUnitClass}>%</span>
                </span>
              </div>
              <input
                id="portfolio-max-dd-pct"
                type="range"
                className={sizingRangeElegantClass}
                min={5}
                max={50}
                step={1}
                value={staticMaxDdPctCap}
                onChange={e =>
                  onMaxDdChange(Math.max(5, Math.min(50, Number.parseInt(e.target.value, 10) || 20)))
                }
                aria-valuemin={5}
                aria-valuemax={50}
                aria-valuenow={staticMaxDdPctCap}
                aria-label="Scenario max drawdown percent of net liquidation per account"
              />
              <div className={sizingRangeFieldScaleClass} aria-hidden>
                <span>5%</span>
                <span>50%</span>
              </div>
              <div className={sizingRangeFieldMetricsRowClass}>
                <div className={sizingRangeFieldMetricTileHighlightClass}>
                  <span className={sizingRangeFieldMetricTileLabelClass}>Max drawdown (history)</span>
                  <span className={sizingRangeFieldMetricTileValueClass}>
                    {portfolioDdUsd != null ? fmtUsd(portfolioDdUsd) : '—'}
                  </span>
                  {portfolioDdPctOfNav != null ? (
                    <span className={sizingRangeFieldMetricTileSubClass}>
                      {portfolioDdPctOfNav.toFixed(2)}% of NAV
                    </span>
                  ) : null}
                </div>
              </div>
            </div>

            <div className={sizingRangeFieldPortfolioClass}>
              <div className={sizingRangeFieldHeadClass}>
                <div className={sizingRangeFieldLabelRowClass}>
                  <label className={sizingRangeFieldLabelClass} htmlFor="static-risk-pct">
                    Static Risk % (per trade)
                  </label>
                </div>
                <span className={sizingRangeFieldReadoutClass} aria-live="polite">
                  {staticRiskPctPerTrade.toFixed(1)}
                  <span className={sizingRangeFieldReadoutUnitClass}>%</span>
                </span>
              </div>
              <input
                id="static-risk-pct"
                type="range"
                className={sizingRangeElegantClass}
                min={0.1}
                max={5}
                step={0.1}
                value={staticRiskPctPerTrade}
                onChange={e =>
                  onStaticRiskPctChange(Math.max(0.1, Math.min(5, Number.parseFloat(e.target.value) || 1)))
                }
                aria-valuemin={0.1}
                aria-valuemax={5}
                aria-valuenow={staticRiskPctPerTrade}
                aria-label="Static risk percent per trade"
              />
              <div className={sizingRangeFieldScaleClass} aria-hidden>
                <span>0.1%</span>
                <span>5.0%</span>
              </div>
              <div className={sizingRangeFieldMetricsRowSingleClass}>
                <div className={sizingRangeFieldMetricTileHighlightClass}>
                  <span className={sizingRangeFieldMetricTileLabelClass}>
                    Per-trade fixed loss budget
                  </span>
                  <span className={sizingRangeFieldMetricTileValueClass}>
                    {capital > 0 ? fmtUsd(staticRiskUsdPerTrade) : '—'}
                  </span>
                  <span className={sizingRangeFieldMetricTileSubClass}>
                    Total capital × {staticRiskPctPerTrade.toFixed(1)}%
                  </span>
                </div>
              </div>
            </div>

            <div className={sizingPortfolioTableWrapClass}>
              <WatchlistMetricTable table={table} maxDdPct={staticMaxDdPctCap} />
            </div>
          </div>

          <div className={sizingCashPieSplitWrapClass}>
            <div className={sizingCashPieSplitHeadClass}>
              <h5 className={cn(sizingDashSubtitleSmClass, 'm-0')}>
                Cash & ex‑FI stocks vs net liquidation
              </h5>
              <HelpTooltip text={HELP_CASH_PIE} />
            </div>
            <div className={sizingCashPieSplitGridClass}>
              <CashPiePanel
                title="Host"
                pie={hostPie}
                emptyMessage={
                  rollup.hostReason === 'no_config'
                    ? 'Set event_host or trading in Settings → IB.'
                    : `Account ${rollup.hostId ?? '—'} is not in this snapshot.`
                }
              />
              <CashPiePanel
                title="Secondary"
                pie={secondaryPie}
                emptyMessage={
                  rollup.secondaryReason === 'no_config'
                    ? 'event_secondary not set (optional).'
                    : `Account ${rollup.secondaryId ?? '—'} is not in this snapshot.`
                }
              />
            </div>
          </div>
        </>
      )}
    </section>
  )
}
