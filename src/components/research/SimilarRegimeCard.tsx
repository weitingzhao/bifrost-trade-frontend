/**
 * Similar-regime card — Wave 14 / F.1 Dense UI (numeric + categorical lenses).
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
          <p className="text-dense-meta text-muted-foreground py-2">No similar dates found.</p>
        ) : (
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
        )}
      </CardContent>
    </Card>
  )
}
