import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { ChevronDown, ArrowUpDown, ScanSearch, Compass } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { buildDiscoveryUrl } from '@/utils/optionDiscovery/discoveryNav'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { fmtUsd, fmtExpiry, rightLabel, pnlColorClass } from '@/utils/positions'
import { ExecutionRow } from './ExecutionRow'
import type { OpenOptionPosition, Execution } from '@/types/positions'
import type { QuoteItem } from '@/types/market'

interface Props {
  positions: OpenOptionPosition[]
  quotesBySymbol: Record<string, QuoteItem>
  filterSymbol?: string
  filterExpiry?: string
  executionsFinal?: Execution[]
  executionsTws?: Execution[]
  onEditExec?: (exec: Execution) => void
  onLinkExec?: (exec: Execution) => void
  onDeleteExec?: (exec: Execution) => void
  onCloseExec?: (exec: Execution) => void
  onRefreshExecs?: () => void
  onInspect?: (pos: OpenOptionPosition) => void
}

function colorClass(n: number | null | undefined) {
  return pnlColorClass(n)
}

function optionIntrinsic(right: string, strike: number, spot: number | null): number | null {
  if (spot == null) return null
  if (right === 'C') return Math.max(0, spot - strike)
  if (right === 'P') return Math.max(0, strike - spot)
  return null
}

function moneyness(right: string, strike: number, spot: number | null): string {
  if (spot == null) return '—'
  if (Math.abs(spot - strike) < 0.5) return 'ATM'
  if (right === 'C') return spot > strike ? 'ITM' : 'OTM'
  if (right === 'P') return spot < strike ? 'ITM' : 'OTM'
  return '—'
}

function expiryMatchesFilter(expiry: string, filter: string): boolean {
  const f = filter.replace(/\D/g, '')
  if (!f) return true
  const ex = expiry.replace(/\D/g, '')
  if (!ex) return false
  return ex.startsWith(f) || f.startsWith(ex)
}

function matchExecsForContract(
  contractKey: string,
  accountId: string,
  execs: Execution[],
): Execution[] {
  return execs.filter((e) =>
    e.contract_key === contractKey && e.account_id === accountId && e.sec_type?.toUpperCase() === 'OPT'
  )
}

type SortKey = 'symbol' | 'expiry' | 'strike' | 'qty' | 'pnl' | null
type SortDir = 'asc' | 'desc'

export function OptionsTab({
  positions,
  quotesBySymbol,
  filterSymbol,
  filterExpiry,
  executionsFinal = [],
  executionsTws = [],
  onEditExec,
  onLinkExec,
  onDeleteExec,
  onCloseExec,
  onRefreshExecs,
  onInspect,
}: Props) {
  const [expandedKeys, setExpandedKeys] = useState<Set<string>>(new Set())
  const [sortKey, setSortKey] = useState<SortKey>(null)
  const [sortDir, setSortDir] = useState<SortDir>('asc')

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => d === 'asc' ? 'desc' : 'asc')
    } else {
      setSortKey(key)
      setSortDir('asc')
    }
  }

  let filtered = positions
  if (filterSymbol) {
    const upper = filterSymbol.toUpperCase()
    filtered = filtered.filter((p) => p.symbol.includes(upper))
  }
  if (filterExpiry) {
    filtered = filtered.filter((p) => expiryMatchesFilter(p.expiry, filterExpiry))
  }

  const sorted = useMemo(() => {
    if (!sortKey) return filtered
    const mult = sortDir === 'asc' ? 1 : -1
    return [...filtered].sort((a, b) => {
      switch (sortKey) {
        case 'symbol': return mult * a.symbol.localeCompare(b.symbol)
        case 'expiry': return mult * a.expiry.localeCompare(b.expiry)
        case 'strike': return mult * (a.strike - b.strike)
        case 'qty': return mult * (a.qty - b.qty)
        case 'pnl': return mult * (a.unrealized_pnl - b.unrealized_pnl)
        default: return 0
      }
    })
  }, [filtered, sortKey, sortDir])

  if (filtered.length === 0) {
    return (
      <div>
        <p className="text-sm font-medium mb-2">Option Positions</p>
        <p className="text-sm text-muted-foreground">None</p>
      </div>
    )
  }

  function toggleExpand(key: string) {
    setExpandedKeys((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  let totalPremium = 0
  for (const pos of sorted) {
    if (pos.avg_cost != null) totalPremium += -(pos.qty * pos.avg_cost)
  }

  const hasExecData = executionsFinal.length > 0 || executionsTws.length > 0

  return (
    <div>
      <p className="text-sm font-medium mb-2">Option Positions</p>
      <div className="rounded-md border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              {hasExecData && <TableHead className="w-8" />}
              <TableHead className="min-w-[60px] cursor-pointer select-none" onClick={() => toggleSort('symbol')}>
                <span className="inline-flex items-center gap-1">Symbol <ArrowUpDown className="h-3 w-3 opacity-40" /></span>
              </TableHead>
              <TableHead>Right</TableHead>
              <TableHead className="cursor-pointer select-none" onClick={() => toggleSort('expiry')}>
                <span className="inline-flex items-center gap-1">Expiry <ArrowUpDown className="h-3 w-3 opacity-40" /></span>
              </TableHead>
              <TableHead className="text-right cursor-pointer select-none" onClick={() => toggleSort('strike')}>
                <span className="inline-flex items-center gap-1 justify-end">Strike <ArrowUpDown className="h-3 w-3 opacity-40" /></span>
              </TableHead>
              <TableHead className="text-right cursor-pointer select-none" onClick={() => toggleSort('qty')}>
                <span className="inline-flex items-center gap-1 justify-end">Qty <ArrowUpDown className="h-3 w-3 opacity-40" /></span>
              </TableHead>
              <TableHead>Side</TableHead>
              <TableHead>Moneyness</TableHead>
              <TableHead className="text-right">Cost</TableHead>
              <TableHead className="text-right">Premium</TableHead>
              <TableHead className="text-right">Mark</TableHead>
              <TableHead className="text-right">Intrinsic</TableHead>
              <TableHead className="text-right cursor-pointer select-none" onClick={() => toggleSort('pnl')}>
                <span className="inline-flex items-center gap-1 justify-end">PnL <ArrowUpDown className="h-3 w-3 opacity-40" /></span>
              </TableHead>
              <TableHead>Strategy</TableHead>
              {onInspect && <TableHead className="w-16" />}
            </TableRow>
          </TableHeader>
          <TableBody>
            {sorted.map((pos, i) => {
              const key = pos.contract_key || String(i)
              const isExpanded = expandedKeys.has(key)
              const spot = quotesBySymbol[pos.symbol]?.last ?? null
              const intrinsic = optionIntrinsic(pos.right, pos.strike, spot)
              const money = moneyness(pos.right, pos.strike, spot)
              const side = pos.qty > 0 ? 'Long' : pos.qty < 0 ? 'Short' : '—'
              const premium = pos.avg_cost != null ? -(pos.qty * pos.avg_cost) : null
              const changePct =
                pos.mark_price != null && pos.avg_cost != null && pos.avg_cost !== 0
                  ? ((pos.mark_price - pos.avg_cost) / pos.avg_cost) * 100
                  : null

              return [
                <TableRow
                  key={key}
                  className={cn(hasExecData && 'cursor-pointer hover:bg-muted/50')}
                  onClick={hasExecData ? () => toggleExpand(key) : undefined}
                >
                  {hasExecData && (
                    <TableCell className="px-2">
                      <ChevronDown className={cn('h-3.5 w-3.5 text-muted-foreground transition-transform', isExpanded && 'rotate-180')} />
                    </TableCell>
                  )}
                  <TableCell className="font-mono text-xs font-medium">{pos.symbol}</TableCell>
                  <TableCell className="text-xs">{rightLabel(pos.right)}</TableCell>
                  <TableCell className="text-xs font-mono">{fmtExpiry(pos.expiry)}</TableCell>
                  <TableCell className="text-right font-mono text-xs">{fmtUsd(pos.strike)}</TableCell>
                  <TableCell className="text-right font-mono text-xs">{pos.qty || '—'}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{side}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{money}</TableCell>
                  <TableCell className="text-right font-mono text-xs">{fmtUsd(pos.avg_cost)}</TableCell>
                  <TableCell className={cn('text-right font-mono text-xs', colorClass(premium))}>
                    {fmtUsd(premium)}
                  </TableCell>
                  <TableCell className={cn('text-right font-mono text-xs font-semibold', colorClass(changePct))}>
                    {fmtUsd(pos.mark_price)}
                  </TableCell>
                  <TableCell className="text-right font-mono text-xs">
                    {intrinsic != null ? fmtUsd(intrinsic) : '—'}
                  </TableCell>
                  <TableCell className={cn('text-right font-mono text-xs font-semibold', colorClass(pos.unrealized_pnl))}>
                    {fmtUsd(pos.unrealized_pnl)}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground truncate max-w-[120px]">
                    {pos.strategy_opportunity_name ?? '—'}
                  </TableCell>
                  {onInspect && (
                    <TableCell className="px-1">
                      <div className="flex items-center gap-0.5">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          asChild
                          title="Open in Discovery"
                        >
                          <Link
                            to={buildDiscoveryUrl(pos.symbol, pos.expiry)}
                            onClick={(e) => e.stopPropagation()}
                            aria-label={`Open ${pos.symbol} in Option Discovery`}
                          >
                            <Compass className="h-3.5 w-3.5 text-muted-foreground" />
                          </Link>
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={(e) => { e.stopPropagation(); onInspect(pos) }}
                          title="Inspect contract"
                        >
                          <ScanSearch className="h-3.5 w-3.5 text-muted-foreground" />
                        </Button>
                      </div>
                    </TableCell>
                  )}
                </TableRow>,

                ...(isExpanded && hasExecData
                  ? [
                      <TableRow key={`${key}-execs`} className="bg-muted/10 hover:bg-muted/10">
                        <TableCell colSpan={(hasExecData ? 15 : 14) + (onInspect ? 1 : 0)} className="p-2">
                          <ExecutionRow
                            finalExecs={matchExecsForContract(pos.contract_key, pos.account_id, executionsFinal)}
                            twsExecs={matchExecsForContract(pos.contract_key, pos.account_id, executionsTws)}
                            onEdit={onEditExec ?? (() => {})}
                            onLink={onLinkExec ?? (() => {})}
                            onDelete={onDeleteExec ?? (() => {})}
                            onClose={pos.pool_label === 'Off' ? onCloseExec : undefined}
                            onRefresh={onRefreshExecs ?? (() => {})}
                            showPoolOff={pos.pool_label === 'Off'}
                          />
                        </TableCell>
                      </TableRow>,
                    ]
                  : []),
              ]
            })}
            <TableRow className="border-t-2 bg-muted/30 hover:bg-muted/30">
              {hasExecData && <TableCell />}
              <TableCell colSpan={8} className="text-xs font-medium py-1.5">
                Option Premium Total
              </TableCell>
              <TableCell className={cn('text-right font-mono text-xs font-semibold', colorClass(totalPremium))}>
                {fmtUsd(totalPremium)}
              </TableCell>
              <TableCell colSpan={4 + (onInspect ? 1 : 0)} />
            </TableRow>
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
