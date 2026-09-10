import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { Radar } from 'lucide-react'
import { fetchAlerts, type AnalyzeAlert } from '@/api/research/alertScan'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { QUERY_KEYS } from '@/constants/queryKeys'
import { cn } from '@/lib/utils'
import {
  bellBadgeClass,
  bellState,
  rankAlerts,
  severityTextClass,
} from '@/lib/alertRanking'

function reasonSummary(item: AnalyzeAlert): string {
  const r = item.reason
  if (r == null) return ''
  if (typeof r === 'string') return r
  if (item.kind === 'composite_high') {
    const score = r.composite_score
    const rank = r.rank
    const parts: string[] = []
    if (score != null) parts.push(`score ${String(score)}`)
    if (rank != null) parts.push(`rank ${String(rank)}`)
    return parts.join(' · ')
  }
  if (item.kind === 'hit_rate_drop') {
    const drop = r.drop_pp
    return drop != null ? `hot hit-rate −${String(drop)}pp` : ''
  }
  if (item.kind === 'weight_shift') {
    const z = r.z
    return z != null ? `z=${String(z)}` : ''
  }
  const keys = Object.keys(r).slice(0, 2)
  return keys.map((k) => `${k}=${String(r[k])}`).join(' · ')
}

function alertHref(item: AnalyzeAlert): string {
  if (item.kind === 'composite_high') {
    const sym = item.symbol?.trim()
    return sym ? `/research/scan?symbol=${encodeURIComponent(sym)}` : '/research/scan'
  }
  if (item.kind === 'hit_rate_drop' || item.kind === 'weight_shift') {
    const lens = item.lens?.trim()
    return lens
      ? `/research/signal-decay?lens=${encodeURIComponent(lens)}`
      : '/research/signal-decay'
  }
  return '/research/scan'
}

export function AlertBell() {
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)

  const { data, isPending, isError, refetch } = useQuery({
    queryKey: QUERY_KEYS.research.alerts,
    queryFn: () => fetchAlerts({ limit: 20, days: 14 }),
    refetchInterval: 120_000,
    staleTime: 60_000,
  })

  const items = data?.items ?? []
  // Severity first. The API answers newest-first, so slicing an unranked list
  // was hiding a `high` behind whatever happened to arrive today. The list
  // container already scrolls, so every fetched alert is reachable.
  const ranked = rankAlerts(items)
  // A bell that hides its badge when its own fetch fails reads as all-clear.
  const state = bellState({ isPending, isError, items })

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <Tooltip>
        <TooltipTrigger asChild>
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="relative h-8 w-8"
              aria-label="Analyze alerts"
            >
              <Radar className="h-4 w-4" />
              {state.kind !== 'clear' && state.kind !== 'checking' && (
                <span
                  className={cn(
                    'absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full px-0.5 text-dense-micro font-bold leading-none',
                    bellBadgeClass(state),
                  )}
                >
                  {state.kind === 'unavailable'
                    ? '?'
                    : state.count > 9
                      ? '9+'
                      : state.count}
                </span>
              )}
            </Button>
          </PopoverTrigger>
        </TooltipTrigger>
        <TooltipContent side="bottom">
          {state.kind === 'alerts'
            ? `${state.count} analyze alert${state.count > 1 ? 's' : ''}${
                state.worst ? ` · worst: ${state.worst}` : ''
              }`
            : state.kind === 'unavailable'
              ? 'Alert check failed — unknown whether there are alerts'
              : state.kind === 'checking'
                ? 'Checking analyze alerts…'
                : 'No analyze alerts'}
        </TooltipContent>
      </Tooltip>

      <PopoverContent align="end" className="w-[min(22rem,calc(100vw-2rem))] p-0">
        <div className="border-b border-border px-3 py-2">
          <p className="text-dense-caption font-semibold uppercase tracking-wide text-muted-foreground">
            Analyze alerts
          </p>
        </div>
        {state.kind === 'unavailable' ? (
          <div className="space-y-1.5 px-3 py-4">
            <p className="text-dense-meta text-warning">Alert check failed.</p>
            <p className="text-dense-caption text-muted-foreground">
              This is not an all-clear — whether anything fired is unknown. Verify
              research-api :8795.
            </p>
            <button
              type="button"
              className="text-dense-caption underline underline-offset-2 hover:text-foreground"
              onClick={() => void refetch()}
            >
              Check again
            </button>
          </div>
        ) : state.kind === 'checking' ? (
          <p className="px-3 py-4 text-dense-meta text-muted-foreground">Checking…</p>
        ) : ranked.length === 0 ? (
          <p className="px-3 py-4 text-dense-meta text-muted-foreground">No analyze alerts</p>
        ) : (
          <ul className="max-h-72 overflow-auto py-1">
            {ranked.map((item, idx) => {
              const summary = reasonSummary(item)
              const label = [
                item.kind,
                item.symbol?.trim() || null,
                item.lens?.trim() || null,
              ]
                .filter(Boolean)
                .join(' · ')
              return (
                <li key={`${item.trade_date}-${item.kind}-${item.symbol ?? ''}-${item.lens ?? ''}-${idx}`}>
                  <button
                    type="button"
                    className="flex w-full flex-col gap-0.5 px-3 py-2 text-left hover:bg-accent/60"
                    onClick={() => {
                      setOpen(false)
                      navigate(alertHref(item))
                    }}
                  >
                    <span className="text-dense-meta leading-snug">
                      <span className={cn('font-medium', severityTextClass(item.severity))}>
                        [{item.severity}]
                      </span>{' '}
                      <span className="text-foreground">{label}</span>
                    </span>
                    {summary ? (
                      <span className="truncate text-dense-caption text-muted-foreground">
                        {summary}
                      </span>
                    ) : null}
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </PopoverContent>
    </Popover>
  )
}
