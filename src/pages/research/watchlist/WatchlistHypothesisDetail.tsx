import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { DenseTag, SegmentControl } from '@/components/data-display'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { useHypothesisList } from '@/hooks/useHypotheses'
import {
  fetchCanonicalTrajectory,
  type CanonicalStructure,
} from '@/api/research/canonicalPnl'
import { researchEngineUrl } from '@/lib/devApiUrl'
import { PromoteToWatchlistButton } from '@/components/research/PromoteToWatchlistButton'

const STRUCTURES: { value: CanonicalStructure; label: string }[] = [
  { value: 'short_strangle', label: 'Strangle' },
  { value: 'put_credit_spread', label: 'PCS' },
  { value: 'long_straddle', label: 'Straddle' },
  { value: 'covered_call', label: 'CC' },
  { value: 'short_put', label: 'Short Put' },
]

function MiniPnlSpark({ values }: { values: Array<number | null> }) {
  const pts = values.filter((v): v is number => v != null && Number.isFinite(v))
  if (pts.length < 2) {
    return <p className="text-dense-caption text-muted-foreground">No PnL series yet.</p>
  }
  const min = Math.min(...pts)
  const max = Math.max(...pts)
  const span = max - min || 1
  const w = 280
  const h = 64
  const d = pts
    .map((v, i) => {
      const x = (i / (pts.length - 1)) * w
      const y = h - ((v - min) / span) * (h - 4) - 2
      return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`
    })
    .join(' ')
  return (
    <svg width="100%" viewBox={`0 0 ${w} ${h}`} className="h-16 text-foreground">
      <path d={d} fill="none" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  )
}

function SnapshotChips({ originRef }: { originRef: Record<string, unknown> | null | undefined }) {
  if (!originRef || typeof originRef !== 'object') return null
  const chips: { label: string; value: string }[] = []
  const push = (label: string, key: string, fmt?: (n: number) => string) => {
    const raw = originRef[key]
    if (typeof raw === 'number' && Number.isFinite(raw)) {
      chips.push({ label, value: fmt ? fmt(raw) : String(raw) })
    } else if (typeof raw === 'string' && raw.trim()) {
      chips.push({ label, value: raw })
    }
  }
  push('VRP%', 'vrp_pct', (n) => n.toFixed(1))
  push('VRP60', 'vrp_60d', (n) => n.toFixed(3))
  push('IV Rank', 'iv_rank', (n) => n.toFixed(1))
  push('Sentiment', 'sentiment_score', (n) => n.toFixed(2))
  push('ATM IV', 'atm_iv_30d', (n) => `${(n * 100).toFixed(1)}%`)
  if (chips.length === 0) return null
  return (
    <div className="flex flex-wrap gap-1.5">
      {chips.map((c) => (
        <DenseTag key={c.label} variant="neutral">
          {c.label} {c.value}
        </DenseTag>
      ))}
    </div>
  )
}

/**
 * Watchlist / inspector panel: hypotheses for a symbol + canonical PnL spark.
 */
export function WatchlistHypothesisDetail({ symbol }: { symbol: string }) {
  const sym = symbol.trim().toUpperCase()
  const [structure, setStructure] = useState<CanonicalStructure>('short_strangle')
  const listQ = useHypothesisList({ limit: 50 })
  const hyps = useMemo(
    () =>
      (listQ.data?.rows ?? []).filter((h) =>
        (h.symbols ?? []).some((s) => s.toUpperCase() === sym),
      ),
    [listQ.data, sym],
  )

  const entryDate =
    hyps[0]?.created_at?.slice(0, 10) ?? new Date().toISOString().slice(0, 10)

  const trajQ = useQuery({
    queryKey: ['canonical-pnl', sym, entryDate, structure],
    queryFn: () =>
      fetchCanonicalTrajectory({
        symbol: sym,
        entryDate,
        structure,
      }),
    enabled: Boolean(sym),
    staleTime: 60_000,
  })

  const pnls = (trajQ.data?.rows ?? []).map((r) => r.pnl_since_entry)

  async function refreshTrajectory(id: string) {
    const q = new URLSearchParams({ structure })
    await fetch(
      researchEngineUrl(`/research/hypothesis/${encodeURIComponent(id)}/refresh-trajectory?${q}`),
      { method: 'POST' },
    )
    void trajQ.refetch()
    void listQ.refetch()
  }

  return (
    <div className="space-y-3 p-2">
      <Card variant="elevated">
        <CardContent className="space-y-2 px-3 py-2">
          <p className="text-dense-label font-medium">
            Journal · <span className="font-mono text-entity-symbol">{sym}</span>
          </p>
          {listQ.isLoading ? (
            <Skeleton className="h-12 w-full" />
          ) : hyps.length === 0 ? (
            <p className="text-dense-caption text-muted-foreground">
              No hypotheses linked to this symbol yet. Save from an Analyze page.
            </p>
          ) : (
            <ul className="space-y-2">
              {hyps.slice(0, 8).map((h) => (
                <li key={h.id} className="space-y-1 text-dense-meta">
                  <div className="flex items-start justify-between gap-2">
                    <span className="font-medium text-foreground">{h.title}</span>
                    <div className="flex shrink-0 items-center gap-1">
                      <PromoteToWatchlistButton hypothesis={h} symbol={sym} />
                      <button
                        type="button"
                        className="text-dense-caption underline"
                        onClick={() => void refreshTrajectory(h.id)}
                      >
                        Refresh PnL
                      </button>
                    </div>
                  </div>
                  <SnapshotChips
                    originRef={
                      h.origin_ref && typeof h.origin_ref === 'object'
                        ? (h.origin_ref as Record<string, unknown>)
                        : null
                    }
                  />
                  <p className="text-muted-foreground line-clamp-2">{h.thesis}</p>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card variant="elevated">
        <CardContent className="space-y-2 px-3 py-2">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-dense-label font-medium">Canonical PnL</p>
            <SegmentControl
              ariaLabel="Canonical structure"
              size="sm"
              value={structure}
              onChange={(v) => setStructure(v as CanonicalStructure)}
              options={STRUCTURES}
            />
          </div>
          {trajQ.isLoading ? (
            <Skeleton className="h-16 w-full" />
          ) : (
            <MiniPnlSpark values={pnls} />
          )}
          <p className="text-dense-caption text-muted-foreground">
            Entry anchor {entryDate} · observe-only (D10). Empty until cohort backfill.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
