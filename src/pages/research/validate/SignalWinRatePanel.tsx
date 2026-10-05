/**
 * Indicator and Pine signals — win rate next to every session (W6).
 *
 * One row per signal: the 13 standard indicator crossings
 * (`/research/indicators/signal-stats`, computed on request) and each active
 * Pine library script's buy and sell (`/research/pine/signal-stats`, from the
 * daily signal table). Every row is read over the same basket, so a 58% win
 * rate is read against the basket's own drift, not against 50%.
 */
import { useMemo, useState } from 'react'
import { useQueries, useQuery } from '@tanstack/react-query'
import { Play } from 'lucide-react'
import { SectionHead } from '@/components/layout'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  DenseDataTable,
  DenseTableBody,
  DenseTableCell,
  DenseTableHead,
  DenseTableHeader,
  DenseTableHeadRow,
  DenseTableRow,
  denseTableNumCell,
} from '@/components/data-display'
import { cn } from '@/lib/utils'
import { INDICATOR_SIGNALS, fetchSignalStats } from '@/api/research/indicators'
import { fetchPineScripts, fetchPineSignalStats } from '@/api/research/pine'

const DEFAULT_BASKET = 'SPY, QQQ, IWM, AAPL, MSFT, NVDA, AMZN, META, GOOGL, TSLA'
const HORIZONS = [5, 20]

interface Measure {
  n: number
  win_rate: number | null
  avg_return: number | null
}
interface Row {
  key: string
  group: 'Indicator' | 'Pine'
  label: string
  signals: number | null
  sample: string | null
  h: Record<string, { signal: Measure; baseline: Measure; win_rate_edge: number | null }> | null
  loading: boolean
  error: string | null
}

function pct(v: number | null | undefined, digits = 0): string {
  return v == null || !Number.isFinite(v) ? '—' : `${(v * 100).toFixed(digits)}%`
}

function pts(v: number | null | undefined): string {
  return v == null || !Number.isFinite(v) ? '—' : `${v >= 0 ? '+' : ''}${(v * 100).toFixed(1)} pt`
}

export function SignalWinRatePanel() {
  const [basketStr, setBasketStr] = useState(DEFAULT_BASKET)
  const [basket, setBasket] = useState<string[] | null>(null)
  const parsed = useMemo(
    () =>
      [...new Set(basketStr.split(/[,\s]+/).map((s) => s.trim().toUpperCase()).filter(Boolean))].slice(0, 50),
    [basketStr]
  )

  const pineQ = useQuery({
    queryKey: ['research-engine', 'pine', 'scripts'],
    queryFn: () => fetchPineScripts(),
    enabled: basket != null,
    staleTime: 5 * 60_000,
  })
  const pineScripts = (pineQ.data?.scripts ?? []).filter((s) => s.is_active)

  const indQs = useQueries({
    queries: INDICATOR_SIGNALS.map((s) => ({
      queryKey: ['research-engine', 'indicators', 'signal-stats', s.id, basket?.join(',') ?? ''],
      queryFn: () => fetchSignalStats({ signal: s.id, symbols: basket ?? [], horizons: HORIZONS }),
      enabled: basket != null && basket.length > 0,
      staleTime: 10 * 60_000,
    })),
  })
  const pineCells = pineScripts.flatMap((s) =>
    (['buy', 'sell'] as const).filter((side) => s.signals.includes(side)).map((side) => ({ s, side }))
  )
  const pineQs = useQueries({
    queries: pineCells.map(({ s, side }) => ({
      queryKey: ['research-engine', 'pine', 'signal-stats', s.id, side, basket?.join(',') ?? ''],
      queryFn: () => fetchPineSignalStats({ script: s.id, side, symbols: basket ?? [], horizons: HORIZONS }),
      enabled: basket != null && basket.length > 0,
      staleTime: 10 * 60_000,
    })),
  })

  const rows: Row[] = [
    ...INDICATOR_SIGNALS.map((s, i) => {
      const q = indQs[i]
      return {
        key: s.id,
        group: 'Indicator' as const,
        label: s.label,
        signals: q?.data?.signals ?? null,
        sample: q?.data?.sample_note ?? null,
        h: q?.data?.by_horizon ?? null,
        loading: q?.isLoading ?? false,
        error: q?.error instanceof Error ? q.error.message : null,
      }
    }),
    ...pineCells.map(({ s, side }, i) => {
      const q = pineQs[i]
      return {
        key: `pine:${s.id}:${side}`,
        group: 'Pine' as const,
        label: `${s.name} · ${side}`,
        signals: q?.data?.signals ?? null,
        sample: q?.data?.sample_note ?? null,
        h: q?.data?.by_horizon ?? null,
        loading: q?.isLoading ?? false,
        error: q?.error instanceof Error ? q.error.message : null,
      }
    }),
  ]

  return (
    <>
      <SectionHead note="Each signal's win rate against every session of the same basket — the edge is what the signal adds over the drift.">
        Indicator &amp; Pine signals
      </SectionHead>
      <Card variant="elevated">
        <CardContent className="space-y-2 px-3 py-2">
          <div className="flex flex-wrap items-center gap-2">
            <Input
              aria-label="Basket"
              value={basketStr}
              onChange={(e) => setBasketStr(e.target.value)}
              className="h-8 max-w-[34rem] flex-1 text-dense-body"
            />
            <Button size="sm" onClick={() => setBasket(parsed)} disabled={parsed.length === 0}>
              <Play className="h-3.5 w-3.5" />
              {basket ? 'Recompute' : 'Compute'}
            </Button>
            <span className="text-dense-caption text-muted-foreground">
              {parsed.length} symbols · up to 50 · five years · win = moved the signal&apos;s way
            </span>
          </div>
          {basket == null ? (
            <p className="m-0 text-dense-caption text-muted-foreground">
              Compute reads {INDICATOR_SIGNALS.length} indicator signals and every active Pine script over the basket.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <DenseDataTable>
                <DenseTableHeader>
                  <DenseTableHeadRow>
                    <DenseTableHead>Signal</DenseTableHead>
                    <DenseTableHead className="text-right">n</DenseTableHead>
                    {HORIZONS.map((h) => (
                      <DenseTableHead key={`w${h}`} className="text-right">
                        Win {h}d
                      </DenseTableHead>
                    ))}
                    <DenseTableHead className="text-right">Basket 20d</DenseTableHead>
                    <DenseTableHead className="text-right">Edge 20d</DenseTableHead>
                    <DenseTableHead className="text-right">Avg 20d</DenseTableHead>
                  </DenseTableHeadRow>
                </DenseTableHeader>
                <DenseTableBody>
                  {rows.map((r) => {
                    const h20 = r.h?.['20']
                    const edge = h20?.win_rate_edge ?? null
                    return (
                      <DenseTableRow key={r.key}>
                        <DenseTableCell className="font-medium">
                          <span className="mr-1.5 text-dense-micro text-muted-foreground">{r.group}</span>
                          {r.label}
                        </DenseTableCell>
                        {r.loading ? (
                          <DenseTableCell colSpan={HORIZONS.length + 4} className={denseTableNumCell}>
                            …
                          </DenseTableCell>
                        ) : r.error ? (
                          <DenseTableCell
                            colSpan={HORIZONS.length + 4}
                            className="text-dense-caption text-destructive"
                            title={r.error}
                          >
                            not read — {r.error.slice(0, 80)}
                          </DenseTableCell>
                        ) : (
                          <>
                            <DenseTableCell
                              className={cn(denseTableNumCell, r.sample && r.sample !== 'ok' ? 'text-warning' : '')}
                              title={r.sample ?? undefined}
                            >
                              {r.signals ?? '—'}
                            </DenseTableCell>
                            {HORIZONS.map((h) => (
                              <DenseTableCell key={h} className={denseTableNumCell}>
                                {pct(r.h?.[String(h)]?.signal.win_rate)}
                              </DenseTableCell>
                            ))}
                            <DenseTableCell className={cn(denseTableNumCell, 'text-muted-foreground')}>
                              {pct(h20?.baseline.win_rate)}
                            </DenseTableCell>
                            <DenseTableCell
                              className={cn(
                                denseTableNumCell,
                                edge == null ? '' : edge > 0 ? 'text-[var(--color-profit)]' : 'text-[var(--color-loss)]'
                              )}
                            >
                              {pts(edge)}
                            </DenseTableCell>
                            <DenseTableCell className={denseTableNumCell}>
                              {pct(h20?.signal.avg_return, 1)}
                            </DenseTableCell>
                          </>
                        )}
                      </DenseTableRow>
                    )
                  })}
                </DenseTableBody>
              </DenseDataTable>
              {pineQ.isError ? (
                <p className="m-0 mt-1 text-dense-caption text-destructive">
                  The Pine library did not load — Research may not have the Pine tables yet.
                </p>
              ) : null}
            </div>
          )}
        </CardContent>
      </Card>
    </>
  )
}
