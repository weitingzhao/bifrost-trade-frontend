import { Info } from 'lucide-react'
import {
  CollapsibleChevron,
  CollapsibleGroup,
  CollapsibleGroupBody,
  CollapsibleGroupHeader,
  CollapsibleGroupTitle,
} from '@/components/data-display'
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
  watchlistCollapsedSummaryClass,
  watchlistPieHoleClass,
  watchlistPiePanelClass,
  watchlistPieRingClass,
  watchlistRangeTrackClass,
  watchlistRiskBodyClass,
} from './watchlistUi'

const HELP_PORTFOLIO =
  'Per-account columns use the IB snapshot on this page. Cash (IB) is TotalCashValue; Cash-like is STK lines tagged cash-like. Host / Secondary follow Settings → IB event_host / trading and event_secondary.'

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

function CashPiePanel({
  title,
  pie,
  emptyMessage,
}: {
  title: string
  pie: ReturnType<typeof portfolioCashPieFromRow>
  emptyMessage?: string
}) {
  if (!pie) {
    return (
      <div className={watchlistPiePanelClass}>
        <h6 className="mb-2 text-xs font-semibold">{title}</h6>
        <p className="text-xs text-muted-foreground">{emptyMessage ?? '—'}</p>
      </div>
    )
  }
  return (
    <div className={watchlistPiePanelClass}>
      <h6 className="text-xs font-semibold">{title}</h6>
      <div className="flex items-center gap-3">
        <div
          className={watchlistPieRingClass}
          style={{
            background: `conic-gradient(
              var(--primary) 0turn ${pie.cashTurnEnd}turn,
              #a855f7 ${pie.cashTurnEnd}turn ${pie.stkTurnEnd}turn,
              var(--muted) ${pie.stkTurnEnd}turn 1turn
            )`,
          }}
          role="img"
          aria-label={`${title} allocation`}
        >
          <div className={watchlistPieHoleClass}>
            <span className="font-mono font-semibold">{pie.cashPctOfNet.toFixed(0)}%</span>
            <span className="text-muted-foreground">cash</span>
          </div>
        </div>
        <div className="min-w-0 space-y-1 text-xs">
          <div>Cash: {fmtUsd(pie.cash)} ({pie.cashPctOfNet.toFixed(1)}%)</div>
          <div>STK ex-FI: {fmtUsd(pie.stkExFi)} ({pie.stkPctOfNet.toFixed(1)}%)</div>
          <div>Other: {fmtUsd(pie.other)} ({pie.otherPctOfNet.toFixed(1)}%)</div>
          <div className="text-muted-foreground">Net liq. {fmtUsd(pie.net)}</div>
        </div>
      </div>
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
    <CollapsibleGroup variant="card" className="mb-0">
      <CollapsibleGroupHeader
        expanded={expanded}
        onToggle={() => onCollapsedChange(!collapsed)}
        className="py-3"
      >
        <CollapsibleGroupTitle className="text-sm">Portfolio risk power</CollapsibleGroupTitle>
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
          <TooltipContent className="max-w-xs text-xs">{HELP_PORTFOLIO}</TooltipContent>
        </Tooltip>
        <CollapsibleChevron expanded={expanded} className="ml-auto" />
      </CollapsibleGroupHeader>

      {collapsed ? (
        <div className={watchlistCollapsedSummaryClass}>
          <span>Host cash: {hostPie ? fmtUsd(hostPie.cash) : '—'}</span>
          <span>Max DD %: {staticMaxDdPctCap}%</span>
          <span>Static risk budget: {capital > 0 ? fmtUsd(staticRiskBudgetUsd) : '—'}</span>
        </div>
      ) : (
        <CollapsibleGroupBody className={watchlistRiskBodyClass}>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-xs font-medium">Max drawdown %</label>
              <input
                type="range"
                className={watchlistRangeTrackClass}
                min={5}
                max={50}
                step={1}
                value={staticMaxDdPctCap}
                onChange={e => onMaxDdChange(Number.parseInt(e.target.value, 10))}
              />
              <div className="flex justify-between text-[10px] text-muted-foreground">
                <span>5%</span>
                <span className="font-mono font-semibold text-foreground">{staticMaxDdPctCap}%</span>
                <span>50%</span>
              </div>
              <div className="text-xs">
                Max drawdown (history):{' '}
                <span className="font-mono">{portfolioDdUsd != null ? fmtUsd(portfolioDdUsd) : '—'}</span>
                {portfolioDdPctOfNav != null && (
                  <span className="text-muted-foreground"> ({portfolioDdPctOfNav.toFixed(2)}% of NAV)</span>
                )}
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-medium">Static risk % (per trade)</label>
              <input
                type="range"
                className={watchlistRangeTrackClass}
                min={0.1}
                max={5}
                step={0.1}
                value={staticRiskPctPerTrade}
                onChange={e => onStaticRiskPctChange(Number.parseFloat(e.target.value))}
              />
              <div className="text-xs">
                Per-trade budget:{' '}
                <span className="font-mono">{capital > 0 ? fmtUsd(staticRiskUsdPerTrade) : '—'}</span>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto rounded-md border">
            <WatchlistMetricTable table={table} maxDdPct={staticMaxDdPctCap} />
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <CashPiePanel
              title="Host"
              pie={hostPie}
              emptyMessage={
                rollup.hostReason === 'no_config'
                  ? 'Set event_host or trading in Settings → IB.'
                  : `Account ${rollup.hostId ?? '—'} not in snapshot.`
              }
            />
            <CashPiePanel
              title="Secondary"
              pie={secondaryPie}
              emptyMessage={
                rollup.secondaryReason === 'no_config'
                  ? 'event_secondary not set (optional).'
                  : `Account ${rollup.secondaryId ?? '—'} not in snapshot.`
              }
            />
          </div>
        </CollapsibleGroupBody>
      )}
    </CollapsibleGroup>
  )
}
