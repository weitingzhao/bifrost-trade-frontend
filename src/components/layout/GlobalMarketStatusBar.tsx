import { useNavigate } from 'react-router-dom'
import { ChevronDown, ListOrdered, Activity } from 'lucide-react'
import { cn } from '@/lib/utils'
import { StatusLamp } from '@/components/StatusLamp'
import { DataStateBlock } from '@/components/data-display'
import { dataState } from '@/lib/dataState'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useGlobalMarketStrip } from '@/hooks/useGlobalMarketStrip'
import { pnlColorClass } from '@/utils/dailyChange'
import { fmtPctSigned, fmtUsdCompact } from '@/lib/format'
import type { StreamStripTone } from '@/utils/streamStripSummary'

function toneTextClass(tone: StreamStripTone): string {
  if (tone === 'positive') return 'text-profit'
  if (tone === 'negative') return 'text-loss'
  return 'text-muted-foreground'
}

interface GlobalMarketStatusBarProps {
  enabled: boolean
}

export function GlobalMarketStatusBar({ enabled }: GlobalMarketStatusBarProps) {
  const navigate = useNavigate()
  const { model, isLoading, isError, symbolCount } = useGlobalMarketStrip(enabled)

  if (!enabled) return null

  const goLive = () => navigate('/market/live')

  if (isLoading && !model) {
    return (
      <section
        className="flex h-11 shrink-0 items-center gap-3 border-b border-border bg-card px-3"
        aria-label="Market status"
        // A band inside the frosted page (index.css): clear, an ink hairline.
        data-frost-band=""
      >
        <Skeleton className="h-7 w-28 rounded-md" />
        <Skeleton className="h-7 w-40 rounded-md" />
        <div className="ml-auto flex gap-2">
          <Skeleton className="h-7 w-20 rounded-md" />
          <Skeleton className="h-7 w-24 rounded-md" />
        </div>
      </section>
    )
  }

  if (!model) return null

  const streamsLabel = model.streamsOnline ? 'Online' : 'Offline'

  return (
    // One line at every width: at 430 the words give way first (the open
    // orders label, then the Streams label truncates), the numbers stay.
    // With the frost on it is a band of the page's glass, not a slab on it
    // (index.css `[data-frost-band]`): no fill of its own, the DS table rule
    // for its edge and divider. ?frost=0 / solid keep the card and the line.
    <section
      className="flex h-11 min-w-0 shrink-0 items-center gap-2 overflow-hidden border-b border-border bg-card px-3 text-xs"
      aria-label="Market status"
      data-frost-band=""
    >
      <button
        type="button"
        onClick={goLive}
        className="inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full bg-[color-mix(in_srgb,var(--sk-ink)_8%,transparent)] px-2.5 py-1 font-medium text-foreground transition-colors hover:bg-[color-mix(in_srgb,var(--sk-ink)_14%,transparent)]"
        aria-label="Open orders"
        title="Open orders (PostgreSQL)"
      >
        <ListOrdered className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />
        <span className="hidden text-muted-foreground sm:inline">Open orders</span>
        <span className="font-mono tabular-nums">{model.openOrderCount}</span>
      </button>

      <div className="h-5 w-px shrink-0 bg-border" aria-hidden />

      <button
        type="button"
        onClick={goLive}
        className="inline-flex min-w-0 flex-1 items-center gap-1.5 rounded-md px-1 py-1 font-medium transition-colors hover:bg-muted/60 sm:max-w-md"
        aria-label="Go to Live page"
        title="Go to Live page"
      >
        <Activity className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden />
        <StatusLamp lamp={model.streamsLamp} className="shrink-0" />
        <span className="min-w-0 truncate text-muted-foreground">Market Streams</span>
        <span
          className={cn(
            'shrink-0 font-semibold',
            model.streamsOnline ? 'text-success' : 'text-danger',
          )}
        >
          {streamsLabel}
        </span>
      </button>

      <div className="ml-auto flex items-center gap-2 shrink-0">
        <div className="hidden sm:flex items-center gap-3 font-mono tabular-nums">
          <span className="text-muted-foreground">Daily %</span>
          <span className={cn('font-semibold', toneTextClass(model.totalDailyTone))}>
            {model.totalDailyPctDisplay}
          </span>
          <span className="text-muted-foreground">Daily $</span>
          <span className={cn('font-semibold', toneTextClass(model.totalDailyTone))}>
            {model.totalDailyDollarDisplay}
          </span>
        </div>

        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="h-7 gap-1 px-2 text-xs font-medium"
              aria-label={`${symbolCount} symbols — open list`}
            >
              {symbolCount} symbol{symbolCount === 1 ? '' : 's'}
              <ChevronDown className="h-3 w-3 opacity-60" />
            </Button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-[min(24rem,calc(100vw-2rem))] p-0">
            <div className="border-b border-border px-3 py-2">
              <p className="text-xs font-semibold">Market stream symbols</p>
              <p className="text-dense-meta text-muted-foreground mt-0.5">
                Daily change vs benchmark · position-weighted where held
              </p>
            </div>
            {model.symbolRows.length === 0 ? (
              <DataStateBlock
                className="px-3 py-4"
                state={dataState({ isError, isEmpty: true })}
                sourceLabel="Monitor status"
                empty={{ title: 'No symbols in stream.' }}
              />
            ) : (
              // The list grammar (design Rev .153): the popover is portalled
              // out of the page's scope, so it opens its own.
              <div className="max-h-72 overflow-auto" data-sr-list="">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="h-8 text-xs">Symbol</TableHead>
                      <TableHead className="h-8 text-xs text-right">Daily %</TableHead>
                      <TableHead className="h-8 text-xs text-right">Daily $</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {model.symbolRows.map(row => (
                      <TableRow key={row.symbol} className="text-xs">
                        <TableCell className="py-1.5 font-mono font-medium">{row.symbol}</TableCell>
                        <TableCell
                          className={cn('py-1.5 text-right font-mono tabular-nums', pnlColorClass(row.changePct))}
                        >
                          {row.changePct != null ? fmtPctSigned(row.changePct) : '—'}
                        </TableCell>
                        <TableCell
                          className={cn('py-1.5 text-right font-mono tabular-nums', pnlColorClass(row.pnlVsBench))}
                        >
                          {row.pnlVsBench != null ? fmtUsdCompact(row.pnlVsBench) : '—'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </PopoverContent>
        </Popover>
      </div>
    </section>
  )
}
