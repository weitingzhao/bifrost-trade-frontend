/**
 * Similar-regime card — Wave 14 / F.1 Dense UI (numeric + categorical lenses).
 *
 * A5: the neighbours are resolved-only and de-clustered (A3), so the card
 * leads with the distribution of what followed and says what it dropped.
 */
import {
  DenseDataTable,
  DenseTableBody,
  DenseTableCell,
  DenseTableHead,
  DenseTableHeader,
  DenseTableHeadRow,
  DenseTableRow,
  denseTable,
  denseTableNumCell,
} from '@/components/data-display'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { useQuery } from '@tanstack/react-query'
import { fetchSimilarRegime, type SimilarRegimeLens } from '@/api/research/similarRegime'

function fmtRet(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return '—'
  const sign = n > 0 ? '+' : ''
  return `${sign}${(n * 100).toFixed(1)}%`
}

function summaryLine(
  s: { n_resolved: number; median_fwd: number | null; p25_fwd: number | null; p75_fwd: number | null; share_positive: number | null } | null | undefined,
  horizon: number,
): string | null {
  if (!s || s.n_resolved === 0) return null
  const share = s.share_positive == null ? '—' : `${Math.round(s.share_positive * 100)}%`
  return `${horizon}d after: median ${fmtRet(s.median_fwd)} · IQR ${fmtRet(s.p25_fwd)}…${fmtRet(s.p75_fwd)} · ${share} positive (n=${s.n_resolved})`
}

function hygieneLine(
  h: { dropped_unresolved: number; dropped_clustered: number; min_gap_days: number } | null | undefined,
): string | null {
  if (!h) return null
  const parts: string[] = []
  if (h.dropped_unresolved > 0) parts.push(`${h.dropped_unresolved} unsettled`)
  if (h.dropped_clustered > 0) parts.push(`${h.dropped_clustered} within ${h.min_gap_days}d of a kept date`)
  return parts.length > 0 ? `dropped ${parts.join(', ')}` : 'resolved and de-clustered'
}

function fmtLens(v: number | string | null | undefined): string {
  if (v == null) return '—'
  if (typeof v === 'string') return v
  if (!Number.isFinite(v)) return '—'
  return Math.abs(v) >= 1000 ? v.toExponential(2) : v.toFixed(2)
}

export interface SimilarRegimeCardProps {
  lens: SimilarRegimeLens
  symbol: string
  value?: number | string | null
  /** Alias for value */
  currentValue?: number | string | null
  horizon?: number
  k?: number
}

export function SimilarRegimeCard({
  lens,
  symbol,
  value,
  currentValue,
  horizon = 5,
  k = 5,
}: SimilarRegimeCardProps) {
  const lensValue = value ?? currentValue
  const enabled =
    Boolean(symbol) &&
    lensValue != null &&
    lensValue !== '' &&
    (typeof lensValue === 'string' || Number.isFinite(lensValue))
  const q = useQuery({
    queryKey: ['research', 'similar-regime', lens, symbol, lensValue, horizon, k],
    queryFn: () =>
      fetchSimilarRegime({
        lens,
        symbol,
        value: lensValue as number | string,
        horizon,
        k,
      }),
    enabled,
    staleTime: 60_000,
  })

  return (
    <Card variant="elevated">
      <CardContent className="space-y-2 px-3 py-2">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-dense-label font-medium text-foreground">Similar Regime</p>
          <span className="text-dense-meta text-muted-foreground">
            {lens} · {symbol} · value {fmtLens(lensValue)} · fwd {horizon}d
          </span>
        </div>
        {!enabled ? (
          <p className="text-dense-meta text-muted-foreground py-2">
            Select a symbol with a computed lens value to find historical analogs.
          </p>
        ) : q.isLoading ? (
          <Skeleton className="h-28 w-full rounded-md" />
        ) : q.isError ? (
          <p className="text-dense-meta text-destructive">
            {q.error instanceof Error ? q.error.message : 'Similar regime failed'}
          </p>
        ) : (q.data?.rows.length ?? 0) === 0 ? (
          <p className="text-dense-meta text-muted-foreground py-2">No settled similar dates found.</p>
        ) : (
          <>
          {summaryLine(q.data?.summary, horizon) ? (
            <p className="text-dense-caption text-foreground" data-testid="similar-summary">
              {summaryLine(q.data?.summary, horizon)}
              {hygieneLine(q.data?.hygiene) ? (
                <span className="text-muted-foreground"> · {hygieneLine(q.data?.hygiene)}</span>
              ) : null}
            </p>
          ) : null}
          <DenseDataTable tableClassName="min-w-[420px]">
            <DenseTableHeader>
              <DenseTableHeadRow>
                <DenseTableHead>Date</DenseTableHead>
                <DenseTableHead className="text-right">Lens</DenseTableHead>
                <DenseTableHead className="text-right">Dist</DenseTableHead>
                <DenseTableHead className="text-right">Fwd {horizon}d</DenseTableHead>
              </DenseTableHeadRow>
            </DenseTableHeader>
            <DenseTableBody>
              {(q.data?.rows ?? []).map((row) => (
                <DenseTableRow key={`${row.trade_date}-${row.symbol}`}>
                  <DenseTableCell className={denseTable.mutedMeta}>
                    {row.trade_date}
                  </DenseTableCell>
                  <DenseTableCell className={denseTableNumCell}>
                    {fmtLens(row.lens_value ?? row.vrp_pct_252d ?? row.regime)}
                  </DenseTableCell>
                  <DenseTableCell className={denseTableNumCell}>
                    {fmtLens(row.distance)}
                  </DenseTableCell>
                  <DenseTableCell className={denseTableNumCell}>
                    {fmtRet(row.fwd_return)}
                  </DenseTableCell>
                </DenseTableRow>
              ))}
            </DenseTableBody>
          </DenseDataTable>
          </>
        )}
      </CardContent>
    </Card>
  )
}
