import { useMemo, useState } from 'react'
// lucide-react icons used only in navConfig; PageHeader has no icon prop
import { useQuery } from '@tanstack/react-query'
import { PageHeader, PageShell } from '@/components/layout'
import {
  DenseDataTable,
  DenseTableBody,
  DenseTableCell,
  DenseTableHead,
  DenseTableHeader,
  DenseTableHeadRow,
  DenseTableRow,
  DenseTag,
  denseTable,
  denseTableNumCell,
} from '@/components/data-display'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { QueryErrorAlert } from '@/components/ui/QueryErrorAlert'
import { Input } from '@/components/ui/input'
import { fetchGexIntraday, type GexIntraday } from '@/api/researchEngine'
import { GexStrikeChart } from '@/components/charts/GexStrikeChart'
import { GexTimelineChart } from '@/components/charts/GexTimelineChart'
import { cn } from '@/lib/utils'

function InfoCell({
  label,
  value,
  className,
}: {
  label: string
  value: string
  className?: string
}) {
  return (
    <span>
      <span className="text-muted-foreground">{label}</span>{' '}
      <strong className={cn('font-mono', className)}>{value}</strong>
    </span>
  )
}

function fmtNum(v: number | null | undefined, digits = 1): string {
  if (v == null) return '—'
  return v.toLocaleString(undefined, {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  })
}

function fmtTime(ts: string): string {
  try {
    const d = new Date(ts)
    return d.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    })
  } catch {
    return ts
  }
}

export default function GexIntradayPage() {
  const [symbol, setSymbol] = useState('SPX')
  const [date, setDate] = useState('')
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null)

  const { data, isLoading, error } = useQuery({
    queryKey: ['gex-intraday', symbol, date],
    queryFn: () => fetchGexIntraday(symbol, date || undefined),
    enabled: symbol.length > 0,
  })

  const rows = data?.rows ?? []

  const activeIdx = selectedIdx ?? (rows.length > 0 ? rows.length - 1 : null)
  const active: GexIntraday | null = activeIdx != null ? rows[activeIdx] ?? null : null

  const bars = useMemo(
    () => active?.levels_json ?? [],
    [active],
  )

  return (
    <PageShell padding="compact">
      <PageHeader
        title="GEX Intraday"
        actions={
          <div className="flex items-center gap-2">
            <Input
              className="h-7 w-24 text-dense-label"
              value={symbol}
              onChange={(e) => {
                setSymbol(e.target.value.toUpperCase())
                setSelectedIdx(null)
              }}
              placeholder="Symbol"
            />
            <Input
              type="date"
              className="h-7 w-36 text-dense-label"
              value={date}
              onChange={(e) => {
                setDate(e.target.value)
                setSelectedIdx(null)
              }}
            />
          </div>
        }
      />

      {error && <QueryErrorAlert error={error} />}

      {isLoading && (
        <div className="space-y-3">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-[360px] w-full" />
        </div>
      )}

      {active && (
        <>
          {/* Top info bar */}
          <Card variant="elevated" size="sm" className="p-2.5">
            <CardContent className="p-0">
              <div className="flex flex-wrap items-center gap-x-6 gap-y-1 text-dense-label">
                <InfoCell label="Ticker" value={active.symbol} />
                <InfoCell label="Spot" value={fmtNum(active.spot, 2)} />
                <InfoCell label="As-of" value={fmtTime(active.asof_ts)} />
                <InfoCell
                  label="Call Wall"
                  value={fmtNum(active.major_call_wall, 0)}
                  className="text-profit"
                />
                <InfoCell
                  label="Zero Gamma"
                  value={fmtNum(active.zero_gamma, 0)}
                  className="text-warning"
                />
                <InfoCell
                  label="Put Wall"
                  value={fmtNum(active.major_put_wall, 0)}
                  className="text-loss"
                />
              </div>
            </CardContent>
          </Card>

          {/* Timeline (Case 2) — between info bar and strike chart */}
          <Card variant="elevated" className="mt-3">
            <CardContent className="p-3">
              <p className="mb-2 text-dense-caption font-semibold uppercase tracking-wide text-muted-foreground">
                Timeline
              </p>
              <GexTimelineChart rows={rows} height={280} />
            </CardContent>
          </Card>

          {/* Main strike chart */}
          <Card variant="elevated" className="mt-3">
            <CardContent className="p-3">
              <GexStrikeChart
                bars={bars}
                spot={active.spot}
                zeroGamma={active.zero_gamma}
                callWall={active.major_call_wall}
                putWall={active.major_put_wall}
                height={420}
              />
            </CardContent>
          </Card>
        </>
      )}

      {/* Snapshot timeline */}
      {rows.length > 0 && (
        <Card variant="elevated" className="mt-3">
          <CardContent className="p-0">
            <DenseDataTable>
              <DenseTableHeader>
                <DenseTableHeadRow>
                  <DenseTableHead className="w-12">#</DenseTableHead>
                  <DenseTableHead>Time</DenseTableHead>
                  <DenseTableHead className={denseTableNumCell}>Spot</DenseTableHead>
                  <DenseTableHead className={denseTableNumCell}>Net GEX</DenseTableHead>
                  <DenseTableHead className={denseTableNumCell}>Call Wall</DenseTableHead>
                  <DenseTableHead className={denseTableNumCell}>Zero Gamma</DenseTableHead>
                  <DenseTableHead className={denseTableNumCell}>Put Wall</DenseTableHead>
                </DenseTableHeadRow>
              </DenseTableHeader>
              <DenseTableBody>
                {rows.map((row, i) => (
                  <DenseTableRow
                    key={row.asof_ts}
                    className={cn(
                      'cursor-pointer',
                      i === activeIdx && 'bg-accent',
                    )}
                    onClick={() => setSelectedIdx(i)}
                  >
                    <DenseTableCell className="text-dense-meta text-muted-foreground">
                      {i + 1}
                    </DenseTableCell>
                    <DenseTableCell>
                      <DenseTag variant="neutral">
                        {fmtTime(row.asof_ts)}
                      </DenseTag>
                    </DenseTableCell>
                    <DenseTableCell className={denseTableNumCell}>
                      {fmtNum(row.spot, 2)}
                    </DenseTableCell>
                    <DenseTableCell className={denseTableNumCell}>
                      {fmtNum(row.total_net_gex)}
                    </DenseTableCell>
                    <DenseTableCell className={denseTableNumCell}>
                      {fmtNum(row.major_call_wall, 0)}
                    </DenseTableCell>
                    <DenseTableCell className={denseTableNumCell}>
                      {fmtNum(row.zero_gamma, 0)}
                    </DenseTableCell>
                    <DenseTableCell className={denseTableNumCell}>
                      {fmtNum(row.major_put_wall, 0)}
                    </DenseTableCell>
                  </DenseTableRow>
                ))}
              </DenseTableBody>
            </DenseDataTable>
          </CardContent>
        </Card>
      )}

      {!isLoading && rows.length === 0 && !error && (
        <p className={denseTable.emptyHint}>No GEX snapshots available</p>
      )}
    </PageShell>
  )
}
