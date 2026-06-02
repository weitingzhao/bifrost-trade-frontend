import { useMemo, useState } from 'react'
import { PageHeader, PageShell } from '@/components/layout'
import { useNavigate } from 'react-router-dom'
import { RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { InfoTooltip } from '@/components/ui/InfoTooltip'
import { SegmentControl } from '@/components/data-display'
import { useWinRate } from '@/hooks/useStrategies'
import { WinRateStructureCard, WinRateTotalsCard } from '@/components/strategy/winRate'
import { resolveWinRateTotals } from '@/utils/winRate'
import { cn } from '@/lib/utils'
import {
  winRateEmptyHintClass,
  winRateHintClass,
  winRatePageSectionClass,
  winRateSinceLabelClass,
  winRateStructureGridClass,
} from '@/components/strategy/winRate/winRateUi'

export type SinceFilter = '' | '1m' | 'q' | 'half' | '1y' | 'ytd'

const SINCE_OPTIONS: { key: SinceFilter; label: string }[] = [
  { key: '', label: 'All' },
  { key: '1m', label: '1m' },
  { key: 'q', label: 'Q' },
  { key: 'half', label: '6m' },
  { key: '1y', label: '1y' },
  { key: 'ytd', label: 'YTD' },
]

const WIN_RATE_INFO =
  'Per-structure win-rate from instances with executions. Underlying cost matches Instance detail (sell OPT: strike × |qty| × 100 per instance; allocation splits qty when present). P&L: Total profit = sum of execution Net PnL where net > 0; Total loss = sum where net < 0 — same formulas for every structure.'

function sinceEpoch(filter: SinceFilter): number | undefined {
  if (!filter) return undefined
  const now = new Date()
  const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))
  if (filter === '1m') d.setUTCMonth(d.getUTCMonth() - 1)
  else if (filter === 'q') d.setUTCMonth(d.getUTCMonth() - 3)
  else if (filter === 'half') d.setUTCMonth(d.getUTCMonth() - 6)
  else if (filter === '1y') d.setUTCFullYear(d.getUTCFullYear() - 1)
  else if (filter === 'ytd') {
    d.setUTCMonth(0)
    d.setUTCDate(1)
  }
  return Math.floor(d.getTime() / 1000)
}

export default function WinRatePage() {
  const navigate = useNavigate()
  const [sinceFilter, setSinceFilter] = useState<SinceFilter>('')

  const params = useMemo(() => ({ sinceTs: sinceEpoch(sinceFilter) }), [sinceFilter])

  const { data, isLoading, isError, error, refetch, isFetching } = useWinRate(params)

  const structures = useMemo(() => data?.structures ?? [], [data?.structures])
  const totalsAll = useMemo(
    () => resolveWinRateTotals(structures, data?.totals_all),
    [structures, data?.totals_all],
  )

  const handleCardClick = (structureName: string) => {
    navigate('/strategy/instances', { state: { structureFilter: structureName } })
  }

  return (
    <PageShell padding="default" className="space-y-3">
      <PageHeader
        title={
          <span className="inline-flex items-center gap-1">
            Strategy / Win Rate
            <InfoTooltip text={WIN_RATE_INFO} />
          </span>
        }
        titleSize="large"
        actions={
          <Button
            variant="outline"
            size="sm"
            className="shrink-0 gap-1.5"
            onClick={() => void refetch()}
            disabled={isFetching}
          >
            <RefreshCw className={cn('h-3.5 w-3.5', isFetching && 'animate-spin')} />
            {isFetching ? 'Loading…' : 'Refresh'}
          </Button>
        }
      />

      <p className={winRateHintClass}>
        Aggregated results per Strategy Structure. Click a structure card to open Instances with
        that structure filter.
      </p>

      <Card variant="elevated" className="p-2.5">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className={winRateSinceLabelClass}>Since</span>
          <SegmentControl
            size="sm"
            ariaLabel="Filter win rate by closed since"
            value={sinceFilter}
            onChange={(v) => setSinceFilter(v as SinceFilter)}
            options={SINCE_OPTIONS.map(({ key, label }) => ({ value: key, label }))}
          />
        </div>
      </Card>

      {isLoading && (
        <div className={winRateStructureGridClass}>
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-64 w-full rounded-lg" />
          ))}
        </div>
      )}

      {isError && (
        <Alert variant="destructive" role="alert">
          <AlertDescription>
            {error instanceof Error ? error.message : 'Failed to load win-rate data'}
          </AlertDescription>
        </Alert>
      )}

      {!isLoading && !isError && structures.length === 0 && (
        <p className={winRateEmptyHintClass}>
          No closed strategy instances found. Run some strategies and close them to see win-rate
          statistics.
        </p>
      )}

      {!isLoading && !isError && structures.length > 0 && (
        <div className={winRatePageSectionClass}>
          {totalsAll != null && <WinRateTotalsCard totals={totalsAll} />}
          <div className={winRateStructureGridClass}>
            {structures.map((row) => (
              <WinRateStructureCard
                key={row.structure_name}
                row={row}
                onOpenInstances={handleCardClick}
              />
            ))}
          </div>
        </div>
      )}
    </PageShell>
  )
}
