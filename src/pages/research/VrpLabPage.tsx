import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Waves } from 'lucide-react'
import { PageHeader, PageShell } from '@/components/layout'
import {
  DenseDataTable,
  DenseLinkButton,
  DenseTableBody,
  DenseTableCell,
  DenseTableHead,
  DenseTableHeader,
  DenseTableHeadRow,
  DenseTableRow,
  DenseTag,
  EmptyState,
  SegmentControl,
  denseTable,
  denseTableEntityCell,
  denseTableNumCell,
} from '@/components/data-display'
import { Card, CardContent } from '@/components/ui/card'
import { QueryErrorAlert } from '@/components/ui/QueryErrorAlert'
import { Skeleton } from '@/components/ui/skeleton'
import { ResearchContextBar } from '@/components/research/ResearchContextBar'
import { SaveAsHypothesisButton } from '@/components/research/SaveAsHypothesisButton'
import { VrpTimeSeriesChart } from '@/components/charts/VrpTimeSeriesChart'
import {
  useVrpExtremes,
  useVrpHistory,
  useVrpLatest,
} from '@/hooks/useVrpData'
import { useResearchContext } from '@/hooks/useResearchContext'
import { cn } from '@/lib/utils'
import type { VrpRow } from '@/api/research/vrp'

type Bucket = 'high' | 'low'

function fmtPct(n: number | null | undefined, digits = 1): string {
  if (n == null || !Number.isFinite(n)) return '—'
  return `${(n * 100).toFixed(digits)}%`
}

function fmtSpread(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return '—'
  const sign = n > 0 ? '+' : ''
  return `${sign}${(n * 100).toFixed(1)}%`
}

function fmtPercentile(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return '—'
  return n.toFixed(0)
}

function percentileBandTone(
  pct: number | null | undefined,
): 'success' | 'warning' | 'danger' | 'neutral' {
  if (pct == null || !Number.isFinite(pct)) return 'neutral'
  if (pct >= 80) return 'success'
  if (pct <= 20) return 'danger'
  return 'warning'
}

function percentileBandLabel(pct: number | null | undefined): string {
  if (pct == null || !Number.isFinite(pct)) return 'No data'
  if (pct >= 80) return 'High VRP'
  if (pct <= 20) return 'Low VRP'
  return 'Neutral'
}

function verdictText(row: VrpRow | null | undefined): string {
  if (!row) return 'No VRP data available for this symbol yet.'
  const pct = row.vrp_pct_252d
  if (pct == null || !Number.isFinite(pct)) {
    return `${row.symbol}: VRP percentile not yet computed (needs ≥252d of history).`
  }
  const iv = row.atm_iv_30d
  const rv = row.rv_60d
  const spread = row.vrp_60d
  const ivStr = iv != null ? fmtPct(iv) : '—'
  const rvStr = rv != null ? fmtPct(rv) : '—'
  const spreadStr = spread != null ? fmtSpread(spread) : '—'
  if (pct >= 80) {
    return `${row.symbol}: VRP at ${fmtPercentile(pct)}th percentile — sell-vol edge significant (IV ${ivStr} > RV ${rvStr}, spread ${spreadStr}).`
  }
  if (pct <= 20) {
    return `${row.symbol}: VRP at ${fmtPercentile(pct)}th percentile — buy-vol edge (IV ${ivStr} < RV ${rvStr}, spread ${spreadStr}).`
  }
  return `${row.symbol}: VRP at ${fmtPercentile(pct)}th percentile — neutral regime (IV ${ivStr}, RV60 ${rvStr}).`
}

function DistributionBar({
  rows,
  currentPct,
}: {
  rows: VrpRow[]
  currentPct: number | null | undefined
}) {
  const bins = useMemo(() => {
    const buckets = Array.from({ length: 10 }, () => 0)
    let total = 0
    rows.forEach((r) => {
      const p = r.vrp_pct_252d
      if (p == null || !Number.isFinite(p)) return
      const idx = Math.min(9, Math.max(0, Math.floor(p / 10)))
      buckets[idx] += 1
      total += 1
    })
    const max = Math.max(1, ...buckets)
    return { buckets, max, total }
  }, [rows])

  if (bins.total === 0) {
    return (
      <p className="py-4 text-center text-dense-meta text-muted-foreground">
        Percentile history not populated yet.
      </p>
    )
  }

  const currentBin =
    currentPct != null && Number.isFinite(currentPct)
      ? Math.min(9, Math.max(0, Math.floor(currentPct / 10)))
      : -1

  return (
    <div className="space-y-2">
      <div className="flex items-end gap-1 h-24">
        {bins.buckets.map((count, i) => {
          const heightPct = (count / bins.max) * 100
          const highlighted = i === currentBin
          return (
            <div
              key={i}
              className={cn(
                'flex-1 rounded-sm transition-colors',
                highlighted ? 'bg-primary' : 'bg-muted',
              )}
              style={{ height: `${Math.max(heightPct, 2)}%` }}
              title={`${i * 10}-${i * 10 + 10}th percentile · ${count} day${count === 1 ? '' : 's'}`}
            />
          )
        })}
      </div>
      <div className="flex justify-between text-dense-micro text-muted-foreground font-mono">
        <span>0</span>
        <span>25</span>
        <span>50</span>
        <span>75</span>
        <span>100</span>
      </div>
      <p className="text-dense-meta text-muted-foreground">
        Distribution of daily <span className="font-medium text-foreground">VRP percentile</span>{' '}
        over trailing history ({bins.total} days). Highlighted bar = today.
      </p>
    </div>
  )
}

function ExtremesTable({
  rows,
  bucket,
  onPick,
}: {
  rows: VrpRow[]
  bucket: Bucket
  onPick: (symbol: string) => void
}) {
  if (rows.length === 0) {
    return (
      <div className="py-4 text-center text-dense-meta text-muted-foreground">
        No {bucket === 'high' ? 'high' : 'low'} VRP candidates yet.
      </div>
    )
  }
  return (
    <DenseDataTable tableClassName="min-w-[560px]">
      <colgroup>
        <col style={{ width: '18%' }} />
        <col style={{ width: '16%' }} />
        <col style={{ width: '16%' }} />
        <col style={{ width: '16%' }} />
        <col style={{ width: '16%' }} />
        <col style={{ width: '18%' }} />
      </colgroup>
      <DenseTableHeader>
        <DenseTableHeadRow>
          <DenseTableHead>Symbol</DenseTableHead>
          <DenseTableHead className="text-right">VRP %ile</DenseTableHead>
          <DenseTableHead className="text-right">IV 30d</DenseTableHead>
          <DenseTableHead className="text-right">RV 60d</DenseTableHead>
          <DenseTableHead className="text-right">Spread</DenseTableHead>
          <DenseTableHead>As-of</DenseTableHead>
        </DenseTableHeadRow>
      </DenseTableHeader>
      <DenseTableBody>
        {rows.map((row) => (
          <DenseTableRow key={`${bucket}-${row.symbol}`}>
            <DenseTableCell className={denseTableEntityCell}>
              <div className="flex items-center gap-1.5">
                <DenseLinkButton
                  variant="stock"
                  label={row.symbol}
                  ariaLabel={`Load ${row.symbol} in VRP Lab`}
                  onClick={() => onPick(row.symbol)}
                />
                <DenseTag variant={bucket === 'high' ? 'success' : 'danger'}>
                  {bucket === 'high' ? 'Sell-vol' : 'Buy-vol'}
                </DenseTag>
              </div>
            </DenseTableCell>
            <DenseTableCell className={denseTableNumCell}>
              {fmtPercentile(row.vrp_pct_252d)}
            </DenseTableCell>
            <DenseTableCell className={denseTableNumCell}>
              {fmtPct(row.atm_iv_30d)}
            </DenseTableCell>
            <DenseTableCell className={denseTableNumCell}>
              {fmtPct(row.rv_60d)}
            </DenseTableCell>
            <DenseTableCell className={denseTableNumCell}>
              {fmtSpread(row.vrp_60d)}
            </DenseTableCell>
            <DenseTableCell className={denseTable.mutedMeta}>
              {row.trade_date ?? '—'}
            </DenseTableCell>
          </DenseTableRow>
        ))}
      </DenseTableBody>
    </DenseDataTable>
  )
}

export default function VrpLabPage() {
  const navigate = useNavigate()
  const { symbol, setSymbol } = useResearchContext()
  const [bucket, setBucket] = useState<Bucket>('high')

  const latestQ = useVrpLatest(symbol)
  const historyQ = useVrpHistory(symbol, 252)
  const extremesQ = useVrpExtremes(bucket, 20)

  const latest = latestQ.data ?? null
  const history = historyQ.data ?? []
  const extremes = extremesQ.data?.rows ?? []

  const verdictTone = percentileBandTone(latest?.vrp_pct_252d)
  const verdictLabel = percentileBandLabel(latest?.vrp_pct_252d)
  const verdictTextValue = verdictText(latest)

  const verdictToneClass =
    verdictTone === 'success'
      ? 'border-success/40 text-success'
      : verdictTone === 'danger'
        ? 'border-destructive/40 text-destructive'
        : verdictTone === 'warning'
          ? 'border-warning/40 text-warning'
          : 'border-border text-muted-foreground'

  const anyLoading = latestQ.isLoading || historyQ.isLoading
  const anyError = latestQ.isError || historyQ.isError

  return (
    <PageShell padding="default" className="space-y-3">
      <PageHeader
        title="IV-RV Spread Lab"
        description="Volatility Risk Premium (IV − RV) percentile regime. Sell-vol edge when VRP high, buy-vol edge when VRP low. Observe-only (D10)."
        actions={
          <SaveAsHypothesisButton
            originPage="vrp-lab"
            defaultTitle={`${symbol} VRP hypothesis`}
            defaultSymbols={[symbol]}
            defaultTags={['vrp', 'iv-rv']}
            originRef={{
              symbol,
              date: latest?.trade_date ?? null,
              vrp_pct: latest?.vrp_pct_252d ?? null,
              vrp_60d: latest?.vrp_60d ?? null,
              atm_iv_30d: latest?.atm_iv_30d ?? null,
              rv_60d: latest?.rv_60d ?? null,
            }}
          />
        }
      />

      <ResearchContextBar showDate={false} />

      <Card variant="elevated" className={cn('border', verdictToneClass)}>
        <CardContent className="flex flex-col gap-1 px-3 py-2">
          <div className="flex flex-wrap items-center gap-2">
            <DenseTag
              variant={
                verdictTone === 'success'
                  ? 'success'
                  : verdictTone === 'danger'
                    ? 'danger'
                    : verdictTone === 'warning'
                      ? 'warning'
                      : 'neutral'
              }
            >
              {verdictLabel}
            </DenseTag>
            <span className="text-dense-label text-foreground">{verdictTextValue}</span>
          </div>
          {latest ? (
            <p className="text-dense-caption text-muted-foreground">
              Trade date{' '}
              <span className="font-mono">{latest.trade_date ?? '—'}</span> ·
              VRP20 {fmtSpread(latest.vrp_20d)} · VRP60 {fmtSpread(latest.vrp_60d)} ·
              Percentile {fmtPercentile(latest.vrp_pct_252d)}
            </p>
          ) : null}
        </CardContent>
      </Card>

      {anyError ? (
        <QueryErrorAlert
          error={latestQ.error ?? historyQ.error}
          onRetry={() => {
            void latestQ.refetch()
            void historyQ.refetch()
          }}
        />
      ) : null}

      <Card variant="elevated">
        <CardContent className="space-y-2 px-3 py-2">
          <p className="text-dense-label font-medium text-foreground">
            ATM IV vs Realized Vol · trailing 252 days
          </p>
          {anyLoading ? (
            <Skeleton className="h-[220px] w-full rounded-md" />
          ) : history.length === 0 ? (
            <EmptyState
              icon={<Waves />}
              title="No VRP history yet"
              description={`No rows in features.stock_signal_vrp_daily for ${symbol}. Wait for the VRP CronJob to populate, or check Ops Console → Subcontractors → Research.`}
            />
          ) : (
            <VrpTimeSeriesChart rows={history} />
          )}
        </CardContent>
      </Card>

      <Card variant="elevated">
        <CardContent className="space-y-2 px-3 py-2">
          <p className="text-dense-label font-medium text-foreground">
            VRP percentile distribution ({symbol})
          </p>
          {anyLoading ? (
            <Skeleton className="h-24 w-full rounded-md" />
          ) : (
            <DistributionBar rows={history} currentPct={latest?.vrp_pct_252d} />
          )}
        </CardContent>
      </Card>

      <Card variant="elevated">
        <CardContent className="space-y-2 px-3 py-2">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-dense-label font-medium text-foreground">VRP Extremes</p>
            <SegmentControl
              ariaLabel="VRP extremes bucket"
              size="sm"
              value={bucket}
              onChange={(v) => setBucket(v as Bucket)}
              options={[
                { value: 'high', label: 'High (sell-vol)' },
                { value: 'low', label: 'Low (buy-vol)' },
              ]}
            />
            {extremesQ.data?.as_of ? (
              <span className="text-dense-meta text-muted-foreground">
                As-of{' '}
                <span className="font-mono">{extremesQ.data.as_of}</span>
              </span>
            ) : null}
          </div>
          {extremesQ.isLoading ? (
            <div className="space-y-1">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-7 w-full rounded-md" />
              ))}
            </div>
          ) : (
            <ExtremesTable
              rows={extremes}
              bucket={bucket}
              onPick={(sym) => {
                setSymbol(sym)
                navigate(`/research/vrp-lab?symbol=${encodeURIComponent(sym)}`)
              }}
            />
          )}
        </CardContent>
      </Card>

      <p className="text-dense-caption text-muted-foreground">
        VRP = ATM IV(30d) − RV(60d). Percentile rank over trailing 252 sessions. Historical
        edge only — not investment advice. D10: no live order execution from this page.
      </p>
    </PageShell>
  )
}
