import { ChevronDown, ChevronUp } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { Info } from 'lucide-react'
import { fmtUsd } from '@/utils/positions'
import {
  buildPortfolioAccountTable,
  buildPortfolioCashRollup,
  portfolioCashPieFromRow,
  type PortfolioAccountTable,
} from '@/utils/accountsSnapshot'
import type { StatusResponse } from '@/types/monitor'
import styles from './watchlist.module.css'

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
      <div className="rounded-lg border p-3">
        <h6 className="text-xs font-semibold mb-2">{title}</h6>
        <p className="text-xs text-muted-foreground">{emptyMessage ?? '—'}</p>
      </div>
    )
  }
  return (
    <div className="rounded-lg border p-3 space-y-2">
      <h6 className="text-xs font-semibold">{title}</h6>
      <div className="flex gap-3 items-center">
        <div
          className={styles.pieRing}
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
          <div className={styles.pieHole}>
            <span className="font-mono font-semibold">{pie.cashPctOfNet.toFixed(0)}%</span>
            <span className="text-muted-foreground">cash</span>
          </div>
        </div>
        <div className="text-xs space-y-1 min-w-0">
          <div>Cash: {fmtUsd(pie.cash)} ({pie.cashPctOfNet.toFixed(1)}%)</div>
          <div>STK ex-FI: {fmtUsd(pie.stkExFi)} ({pie.stkPctOfNet.toFixed(1)}%)</div>
          <div>Other: {fmtUsd(pie.other)} ({pie.otherPctOfNet.toFixed(1)}%)</div>
          <div className="text-muted-foreground">Net liq. {fmtUsd(pie.net)}</div>
        </div>
      </div>
    </div>
  )
}

function MetricTable({ table, maxDdPct }: { table: PortfolioAccountTable; maxDdPct: number }) {
  const rows = [
    { label: 'Host', id: table.hostId, data: table.hostRow },
    { label: 'Secondary', id: table.secondaryId, data: table.secondaryRow },
    { label: 'Total', id: 'All accounts', data: table.totalRow, total: true },
  ] as const

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Account</TableHead>
          <TableHead className="text-right">Cash (IB)</TableHead>
          <TableHead className="text-right">Cash-like</TableHead>
          <TableHead className="text-right">Cash total</TableHead>
          <TableHead className="text-right">Positions MV</TableHead>
          <TableHead className="text-right">Net liq.</TableHead>
          <TableHead className="text-right">Max DD @ {maxDdPct}%</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map(row => (
          <TableRow key={row.label} className={'total' in row && row.total ? 'font-medium' : ''}>
            <TableCell>
              <div className="font-semibold text-sm">{row.label}</div>
              {row.id && <div className="text-[10px] font-mono text-muted-foreground">{row.id}</div>}
            </TableCell>
            {row.data ? (
              <>
                <TableCell className="text-right font-mono text-xs">{fmtUsd(row.data.ibCash)}</TableCell>
                <TableCell className="text-right font-mono text-xs">{fmtUsd(row.data.cashLike)}</TableCell>
                <TableCell className="text-right font-mono text-xs">{fmtUsd(row.data.cashTotal)}</TableCell>
                <TableCell className="text-right font-mono text-xs">{fmtUsd(row.data.positionsMv)}</TableCell>
                <TableCell className="text-right font-mono text-xs">{fmtUsd(row.data.netLiq)}</TableCell>
                <TableCell className="text-right font-mono text-xs">{fmtUsd(row.data.maxDdUsd)}</TableCell>
              </>
            ) : (
              <TableCell colSpan={6} className="text-muted-foreground text-xs">—</TableCell>
            )}
          </TableRow>
        ))}
      </TableBody>
    </Table>
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

  return (
    <Card>
      <CardHeader className="py-3 px-4 flex flex-row items-center justify-between space-y-0">
        <div className="flex items-center gap-2">
          <CardTitle className="text-sm font-semibold">Portfolio risk power</CardTitle>
          <Tooltip>
            <TooltipTrigger asChild>
              <button type="button" className="text-muted-foreground" aria-label="Help">
                <Info className="h-3.5 w-3.5" />
              </button>
            </TooltipTrigger>
            <TooltipContent className="max-w-xs text-xs">{HELP_PORTFOLIO}</TooltipContent>
          </Tooltip>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={() => onCollapsedChange(!collapsed)}
          aria-expanded={!collapsed}
        >
          {collapsed ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
        </Button>
      </CardHeader>

      {collapsed ? (
        <CardContent className="pt-0 pb-3 px-4 text-xs text-muted-foreground flex flex-wrap gap-4">
          <span>Host cash: {hostPie ? fmtUsd(hostPie.cash) : '—'}</span>
          <span>Max DD %: {staticMaxDdPctCap}%</span>
          <span>Static risk budget: {capital > 0 ? fmtUsd(staticRiskBudgetUsd) : '—'}</span>
        </CardContent>
      ) : (
        <CardContent className="pt-0 px-4 pb-4 space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-xs font-medium">Max drawdown %</label>
              <input
                type="range"
                className={styles.rangeTrack}
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
                className={styles.rangeTrack}
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
            <MetricTable table={table} maxDdPct={staticMaxDdPctCap} />
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
        </CardContent>
      )}
    </Card>
  )
}
