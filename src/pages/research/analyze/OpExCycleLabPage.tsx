import { fmtNumLocale, fmtPctFromFraction } from '@/lib/format'
import { useMemo, useState } from 'react'
import { CalendarDays } from 'lucide-react'
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
  EmptyState,
  SegmentControl,
  denseTable,
  denseTableNumCell,
} from '@/components/data-display'
import { Card, CardContent } from '@/components/ui/card'
import { QueryErrorAlert } from '@/components/ui/QueryErrorAlert'
import { Skeleton } from '@/components/ui/skeleton'
import { ResearchContextBar } from '@/components/research/ResearchContextBar'
import { SymbolContextGuard } from '@/components/research/SymbolContextGuard'
import { AskCopilotButton } from '@/components/research/AskCopilotButton'
import { compactSnapshot } from '@/components/research/compactSnapshot'
import { SaveAsHypothesisButton } from '@/components/research/SaveAsHypothesisButton'
import { SimilarRegimeCard } from '@/components/research/SimilarRegimeCard'
import { CompositeRegimeRibbon } from '@/components/research/CompositeRegimeRibbon'
import { AnalyzeVerdictStrip } from '@/components/research/AnalyzeVerdictStrip'
import { PortfolioTag } from '@/components/portfolio/PortfolioTag'
import { VannaCharmMap } from '@/components/charts/VannaCharmMap'
import {
  useOpexCurrent,
  useOpexHistory,
  useOpexPinAnalysis,
} from '@/hooks/useOpExCycle'
import {
  PORTFOLIO_UNIVERSE_OPTIONS,
  usePortfolioSymbols,
  type PortfolioUniverse,
} from '@/hooks/usePortfolioSymbols'
import { useResearchContext } from '@/hooks/useResearchContext'
import { cn } from '@/lib/utils'
import type { OpexDailyRow, OpexHistoryRow, OpexPinRow } from '@/api/research/opexCycle'

type Tone = 'success' | 'warning' | 'danger' | 'neutral'

function fmtSigned(v: number | null | undefined, digits = 2): string {
  if (v == null || !Number.isFinite(v)) return '—'
  const s = v > 0 ? '+' : ''
  return `${s}${fmtNumLocale(v, digits)}`
}

function fmtInt(v: number | null | undefined): string {
  if (v == null || !Number.isFinite(v)) return '—'
  return Math.round(v).toString()
}

function fmtExp(v: number | null | undefined): string {
  if (v == null || !Number.isFinite(v)) return '—'
  if (v === 0) return '0'
  return v.toExponential(2)
}

function pinBand(pctDistance: number | null | undefined): Tone {
  if (pctDistance == null || !Number.isFinite(pctDistance)) return 'neutral'
  const abs = Math.abs(pctDistance)
  if (abs <= 0.005) return 'success'
  if (abs <= 0.015) return 'warning'
  return 'danger'
}

function pinBandLabel(pctDistance: number | null | undefined): string {
  const t = pinBand(pctDistance)
  if (t === 'success') return 'Pinned — fade breakouts'
  if (t === 'warning') return 'Near pin — watch magnets'
  if (t === 'danger') return 'Off pin — trend freer'
  return 'No pin data'
}

function verdictTone(row: OpexDailyRow | null, dteToday: number): Tone {
  if (!row) return 'neutral'
  if (row.total_vanna == null && row.total_charm == null) return 'neutral'
  if (dteToday <= 3) return 'warning'
  return 'success'
}

function verdictLabel(dteToday: number, isOpexWeek: boolean): string {
  if (dteToday <= 0) return 'OpEx day — reduce size'
  if (dteToday <= 3) return 'OpEx imminent — hedge/roll'
  if (isOpexWeek) return 'OpEx week — watch pin'
  return 'Pre-OpEx — plan rolls'
}

function verdictLine(
  symbol: string,
  row: OpexDailyRow | null,
  dteToday: number,
  nextOpex: string | null,
): string {
  const days = `${dteToday}d`
  const target = nextOpex ? ` to ${nextOpex}` : ''
  if (!row) {
    return `${symbol}: ${days}${target}; no Vanna/Charm row — do not size OpEx pin trades yet.`
  }
  const v = row.total_vanna
  const c = row.total_charm
  const vSide = v == null ? 'unknown' : v >= 0 ? 'positive' : 'negative'
  const cSide = c == null ? 'unknown' : c >= 0 ? 'positive' : 'negative'
  const dealer = v == null ? 'unknown' : v >= 0 ? 'dealer short vol' : 'dealer long vol'
  if (dteToday <= 3) {
    return `${symbol} OpEx in ${days}${target}: prefer hedges / rolls; Vanna ${vSide} · Charm ${cSide} · ${dealer}. Avoid new naked short gamma.`
  }
  if (dteToday <= 7) {
    return `${symbol} OpEx week (${days}${target}): watch pin magnets; Vanna ${vSide} · Charm ${cSide} · ${dealer}. Size smaller into settlement.`
  }
  return `${symbol} Pre-OpEx (${days}${target}): plan rolls; Vanna ${vSide} · Charm ${cSide} · ${dealer}.`
}

function OpexHistoryTable({ rows }: { rows: OpexHistoryRow[] }) {
  if (rows.length === 0) {
    return (
      <div className="py-4 text-center text-dense-meta text-muted-foreground">
        No OpEx history yet.
      </div>
    )
  }
  return (
    <DenseDataTable tableClassName="min-w-[640px]">
      <colgroup>
        <col style={{ width: '18%' }} />
        <col style={{ width: '18%' }} />
        <col style={{ width: '16%' }} />
        <col style={{ width: '16%' }} />
        <col style={{ width: '16%' }} />
        <col style={{ width: '16%' }} />
      </colgroup>
      <DenseTableHeader>
        <DenseTableHeadRow>
          <DenseTableHead>OpEx date</DenseTableHead>
          <DenseTableHead>Trade date</DenseTableHead>
          <DenseTableHead className="text-right">DTE</DenseTableHead>
          <DenseTableHead className="text-right">Spot</DenseTableHead>
          <DenseTableHead className="text-right">Σ Vanna</DenseTableHead>
          <DenseTableHead className="text-right">Σ Charm</DenseTableHead>
        </DenseTableHeadRow>
      </DenseTableHeader>
      <DenseTableBody>
        {rows.map((r, i) => (
          <DenseTableRow key={`${r.opex_date}-${r.trade_date}-${i}`}>
            <DenseTableCell>
              <span className="font-mono tabular-nums">{r.opex_date ?? '—'}</span>
            </DenseTableCell>
            <DenseTableCell className={denseTable.mutedMeta}>
              {r.trade_date ?? '—'}
            </DenseTableCell>
            <DenseTableCell className={denseTableNumCell}>
              {fmtInt(r.dte_to_opex)}
            </DenseTableCell>
            <DenseTableCell className={denseTableNumCell}>{fmtNumLocale(r.spot)}</DenseTableCell>
            <DenseTableCell className={denseTableNumCell}>
              {fmtSigned(r.total_vanna)}
            </DenseTableCell>
            <DenseTableCell className={denseTableNumCell}>
              {fmtSigned(r.total_charm)}
            </DenseTableCell>
          </DenseTableRow>
        ))}
      </DenseTableBody>
    </DenseDataTable>
  )
}

function PinRiskTable({ rows }: { rows: OpexPinRow[] }) {
  if (rows.length === 0) {
    return (
      <div className="py-4 text-center text-dense-meta text-muted-foreground">
        No pin-analysis rows yet.
      </div>
    )
  }
  return (
    <DenseDataTable tableClassName="min-w-[640px]">
      <colgroup>
        <col style={{ width: '16%' }} />
        <col style={{ width: '14%' }} />
        <col style={{ width: '14%' }} />
        <col style={{ width: '14%' }} />
        <col style={{ width: '14%' }} />
        <col style={{ width: '14%' }} />
        <col style={{ width: '14%' }} />
      </colgroup>
      <DenseTableHeader>
        <DenseTableHeadRow>
          <DenseTableHead>OpEx date</DenseTableHead>
          <DenseTableHead>Status</DenseTableHead>
          <DenseTableHead className="text-right">Max pain</DenseTableHead>
          <DenseTableHead className="text-right">Settle</DenseTableHead>
          <DenseTableHead className="text-right">Distance</DenseTableHead>
          <DenseTableHead className="text-right">% Distance</DenseTableHead>
          <DenseTableHead className="text-right">Total OI</DenseTableHead>
        </DenseTableHeadRow>
      </DenseTableHeader>
      <DenseTableBody>
        {rows.map((r, i) => {
          const tone = pinBand(r.pct_distance)
          const variant: 'success' | 'warning' | 'danger' | 'neutral' =
            tone === 'success' ? 'success' : tone === 'warning' ? 'warning' : tone === 'danger' ? 'danger' : 'neutral'
          return (
            <DenseTableRow key={`${r.opex_date}-${i}`}>
              <DenseTableCell>
                <span className="font-mono tabular-nums">{r.opex_date ?? '—'}</span>
              </DenseTableCell>
              <DenseTableCell>
                <DenseTag variant={variant}>{pinBandLabel(r.pct_distance)}</DenseTag>
              </DenseTableCell>
              <DenseTableCell className={denseTableNumCell}>
                {fmtNumLocale(r.max_pain_strike)}
              </DenseTableCell>
              <DenseTableCell className={denseTableNumCell}>
                {fmtNumLocale(r.settle_close)}
              </DenseTableCell>
              <DenseTableCell className={denseTableNumCell}>
                {fmtSigned(r.distance)}
              </DenseTableCell>
              <DenseTableCell className={denseTableNumCell}>
                {fmtPctFromFraction(r.pct_distance, 2)}
              </DenseTableCell>
              <DenseTableCell className={denseTableNumCell}>
                {r.total_oi != null ? Math.round(r.total_oi).toLocaleString() : '—'}
              </DenseTableCell>
            </DenseTableRow>
          )
        })}
      </DenseTableBody>
    </DenseDataTable>
  )
}

export default function OpExCycleLabPage() {
  const { symbol, apiDate } = useResearchContext()
  const [universe, setUniverse] = useState<PortfolioUniverse>('all')
  const { filterSymbols } = usePortfolioSymbols()
  const symbolOutOfUniverse =
    universe !== 'all' &&
    Boolean(symbol.trim()) &&
    filterSymbols(universe, [symbol]).length === 0

  const currentQ = useOpexCurrent(symbol, apiDate)
  const historyQ = useOpexHistory(symbol, 12)
  const pinQ = useOpexPinAnalysis(symbol, 24)

  const row = currentQ.data?.row ?? null
  const strikeMap = currentQ.data?.strike_map ?? []
  const nextOpex = currentQ.data?.next_opex_date ?? null
  const dteToday = currentQ.data?.dte_to_opex_today ?? 0
  const isOpexWeekToday = currentQ.data?.is_opex_week_today ?? false

  const tone = useMemo(() => verdictTone(row, dteToday), [row, dteToday])
  const label = useMemo(() => verdictLabel(dteToday, isOpexWeekToday), [dteToday, isOpexWeekToday])
  const verdict = useMemo(
    () => verdictLine(symbol, row, dteToday, nextOpex),
    [symbol, row, dteToday, nextOpex],
  )

  const verdictBorderClass =
    tone === 'danger'
      ? 'border-destructive/40'
      : tone === 'warning'
        ? 'border-warning/40'
        : tone === 'success'
          ? 'border-success/40'
          : 'border-border'

  const anyError = currentQ.isError || historyQ.isError || pinQ.isError

  const pinRate = pinQ.data?.pin_rate ?? null
  const pinRows = pinQ.data?.rows ?? []
  const latestPinPct = pinRows[0]?.pct_distance ?? null
  const recentCycles = useMemo(() => (historyQ.data ?? []).slice(0, 3), [historyQ.data])

  return (
    <PageShell padding="default" className="space-y-3">
      <PageHeader
        title="OpEx Cycle Lab"
        description="Third-Friday OpEx cycle — dealer Vanna & Charm, per-strike exposure map, and historical pin-risk. Observe-only (D10)."
        actions={
          <div className="flex items-center gap-1.5">
            <AskCopilotButton
              originPage="opex-cycle-lab"
              originLabel="OpEx Cycle Lab"
              symbol={symbol}
              date={row?.trade_date ?? apiDate}
              snapshot={compactSnapshot({
                next_opex_date: nextOpex,
                dte_to_opex_today: dteToday,
                is_opex_week_today: isOpexWeekToday,
                total_vanna: row?.total_vanna,
                total_charm: row?.total_charm,
              })}
              suggestedPrompt={`What do current OpEx Vanna/Charm dynamics imply for ${symbol}?`}
            />
            <SaveAsHypothesisButton
              originPage="opex-cycle-lab"
              defaultTitle={`${symbol} OpEx cycle hypothesis`}
              defaultSymbols={[symbol]}
              defaultTags={['opex-cycle', 'vanna', 'charm']}
              originRef={{
                symbol,
                trade_date: row?.trade_date ?? null,
                next_opex_date: nextOpex,
                dte_to_opex_today: dteToday,
                is_opex_week_today: isOpexWeekToday,
                total_vanna: row?.total_vanna ?? null,
                total_charm: row?.total_charm ?? null,
                vanna_zero_strike: row?.vanna_zero_strike ?? null,
                charm_zero_strike: row?.charm_zero_strike ?? null,
              }}
            />
          </div>
        }
      />

      <ResearchContextBar />

      <SymbolContextGuard symbol={symbol}>

      {symbol.trim() ? (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-dense-label font-semibold text-entity-symbol">
            {symbol.trim().toUpperCase()}
          </span>
          <PortfolioTag symbol={symbol} variant="inline" />
          {symbolOutOfUniverse ? (
            <span className="text-dense-meta text-muted-foreground">Not in holdings/watchlist</span>
          ) : null}
        </div>
      ) : null}

      <Card variant="elevated">
        <CardContent className="flex flex-wrap items-center gap-2 px-3 py-2">
          <span className="text-dense-meta font-medium text-muted-foreground shrink-0">Universe:</span>
          <SegmentControl
            ariaLabel="Portfolio universe filter"
            size="sm"
            value={universe}
            onChange={(v) => setUniverse(v as PortfolioUniverse)}
            options={[...PORTFOLIO_UNIVERSE_OPTIONS]}
          />
        </CardContent>
      </Card>

      <CompositeRegimeRibbon symbol={symbol} />

      <AnalyzeVerdictStrip
        tone={tone}
        verdictLabel={label}
        narrative={verdict}
        signals={
          row
            ? [
                { label: 'DTE', value: String(dteToday) },
                { label: 'Vanna', value: fmtNumLocale(row.total_vanna) },
                { label: 'Charm', value: fmtNumLocale(row.total_charm) },
              ]
            : [{ label: 'DTE', value: String(dteToday) }]
        }
        nextMoves={[
          {
            label: 'GEX Intraday',
            href: `/research/gex-intraday?symbol=${encodeURIComponent(symbol)}`,
          },
          {
            label: 'Analysis Model',
            href: `/research/analysis-model?symbol=${encodeURIComponent(symbol)}`,
          },
        ]}
      />

      <Card variant="elevated" className={cn('border', verdictBorderClass)}>
        <CardContent className="flex flex-col gap-1 px-3 py-2">
          <div className="flex flex-wrap items-center gap-2">
            <DenseTag
              variant={
                tone === 'danger'
                  ? 'danger'
                  : tone === 'warning'
                    ? 'warning'
                    : tone === 'success'
                      ? 'success'
                      : 'neutral'
              }
            >
              {label}
            </DenseTag>
            <span className="text-dense-caption text-muted-foreground">
              Next OpEx <span className="font-mono">{nextOpex ?? '—'}</span>
              {row?.vanna_zero_strike != null
                ? ` · Vanna₀ ${fmtNumLocale(row.vanna_zero_strike)}`
                : ''}
              {row?.charm_zero_strike != null
                ? ` · Charm₀ ${fmtNumLocale(row.charm_zero_strike)}`
                : ''}
              {pinRate != null
                ? ` · pin rate (24 cycles) ${fmtPctFromFraction(pinRate, 1)}`
                : ''}
            </span>
          </div>
          {row ? (
            <p className="text-dense-caption text-muted-foreground">
              Trade date <span className="font-mono">{row.trade_date ?? '—'}</span> · spot{' '}
              <span className="font-mono">{fmtNumLocale(row.spot)}</span> · Σ Vanna{' '}
              <span className="font-mono">{fmtExp(row.total_vanna)}</span> · Σ Charm{' '}
              <span className="font-mono">{fmtExp(row.total_charm)}</span>
            </p>
          ) : null}
        </CardContent>
      </Card>

      {anyError ? (
        <QueryErrorAlert
          error={currentQ.error ?? historyQ.error ?? pinQ.error}
          onRetry={() => {
            void currentQ.refetch()
            void historyQ.refetch()
            void pinQ.refetch()
          }}
        />
      ) : null}

      <Card variant="elevated">
        <CardContent className="space-y-2 px-3 py-2">
          <p className="text-dense-label font-medium text-foreground">
            Vanna / Charm map · dealer exposure across strikes
          </p>
          {currentQ.isLoading ? (
            <Skeleton className="h-[220px] w-full rounded-md" />
          ) : strikeMap.length === 0 ? (
            <EmptyState
              icon={<CalendarDays />}
              title="No strike map"
              description={`No paired GEX strike_map for ${symbol}. Run the OpEx Cycle CronJob (schedule 30 23 * * MON-FRI) after GEX populates.`}
            />
          ) : (
            <VannaCharmMap
              rows={strikeMap}
              spot={row?.spot ?? null}
              vannaZeroStrike={row?.vanna_zero_strike ?? null}
              charmZeroStrike={row?.charm_zero_strike ?? null}
            />
          )}
        </CardContent>
      </Card>

      {latestPinPct != null && Number.isFinite(latestPinPct) ? (
        <SimilarRegimeCard lens="pin_distance" symbol={symbol} value={latestPinPct} />
      ) : null}

      <Card variant="elevated">
        <CardContent className="space-y-2 px-3 py-2">
          <p className="text-dense-label font-medium text-foreground">
            Last 3 OpEx weeks · side-by-side
          </p>
          {historyQ.isLoading ? (
            <Skeleton className="h-20 w-full rounded-md" />
          ) : recentCycles.length === 0 ? (
            <p className="py-4 text-center text-dense-meta text-muted-foreground">
              No OpEx history cycles yet.
            </p>
          ) : (
            <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
              {recentCycles.map((c) => (
                <Card key={`${c.opex_date}-${c.trade_date}`} variant="elevated" size="sm">
                  <CardContent className="space-y-1 px-3 py-2">
                    <p className="font-mono text-dense-label">
                      OpEx {c.opex_date ?? '—'}
                    </p>
                    <p className="text-dense-caption text-muted-foreground">
                      As-of <span className="font-mono">{c.trade_date ?? '—'}</span> · DTE{' '}
                      <span className="font-mono">{c.dte_to_opex ?? '—'}</span>
                    </p>
                    <p className="text-dense-caption">
                      Spot <span className="font-mono">{fmtNumLocale(c.spot)}</span>
                    </p>
                    <p className="text-dense-caption">
                      ΣV <span className="font-mono">{fmtExp(c.total_vanna)}</span> · ΣC{' '}
                      <span className="font-mono">{fmtExp(c.total_charm)}</span>
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card variant="elevated">
        <CardContent className="space-y-2 px-3 py-2">
          <p className="text-dense-label font-medium text-foreground">
            OpEx cycle timeline · last 12 cycles
          </p>
          {historyQ.isLoading ? (
            <div className="space-y-1">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-7 w-full rounded-md" />
              ))}
            </div>
          ) : (
            <OpexHistoryTable rows={historyQ.data ?? []} />
          )}
        </CardContent>
      </Card>

      <Card variant="elevated">
        <CardContent className="space-y-2 px-3 py-2">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-dense-label font-medium text-foreground">
              Pin risk · settle vs max pain (last {pinQ.data?.cycles_requested ?? 24} cycles)
            </p>
            {pinRate != null ? (
              <DenseTag variant={pinRate >= 0.4 ? 'warning' : 'neutral'}>
                Pin rate {fmtPctFromFraction(pinRate, 1)}
              </DenseTag>
            ) : null}
          </div>
          {pinQ.isLoading ? (
            <div className="space-y-1">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-7 w-full rounded-md" />
              ))}
            </div>
          ) : (
            <PinRiskTable rows={pinRows} />
          )}
        </CardContent>
      </Card>

      <p className="text-dense-caption text-muted-foreground">
        Third-Friday OpEx cycle. Vanna &gt; 0 → dealer short vol (buys vol on rallies).
        Charm &gt; 0 → decay pushes hedges up over time. Pin-band uses |settle − max
        pain| ≤ 0.5 % (pinned), ≤ 1.5 % (near), &gt; 1.5 % (off). D10: observe-only.
      </p>
      </SymbolContextGuard>
    </PageShell>
  )
}
