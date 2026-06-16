import { SegmentControl } from '@/components/data-display'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { InfoTooltip } from '@/components/ui/InfoTooltip'
import { Label } from '@/components/ui/label'
import { celeryQueueHash } from '@/utils/celeryQueueDeepLink'
import { feedMassiveStockTickersSubHash } from '@/pages/settings/feed/massive/nav/stockTabUtils'
import {
  DEFAULT_TICKER_REF_MISSING_LIMIT,
  DEFAULT_TICKER_REF_SEARCH_LIMIT,
  MAX_TICKER_REF_MISSING_LIMIT,
  REF_CATALOG_PG_LABELS,
  type OverviewEnqueueMode,
  type RelatedEnqueueMode,
  refJobKindShortLabel,
  isFeedStocksTickersRelatedRefKind,
  isFeedStocksTickersOverviewRefKind,
  isFeedStocksTickersReferenceUniverseRefKind,
  isFeedStocksTickersTypesRefKind,
  type RefTickerCatalogRow,
  type TrackedMassiveDbJobKind,
} from '@/utils/massive/stockReferenceJobHelpers'

const RELATED_SCOPE_BUBBLES: ReadonlyArray<{
  value: RelatedEnqueueMode
  label: string
  title: string
}> = [
  {
    value: 'missing',
    label: 'Missing only',
    title: 'Tickers with no ticker_related_tickers rows for from_tickers_id.',
  },
  {
    value: 'stale',
    label: 'Missing or stale',
    title: 'No related rows, or latest fetched_at older than stale hours.',
  },
  {
    value: 'symbols',
    label: 'Listed symbols',
    title: 'Only symbols in the enqueue field below.',
  },
  {
    value: 'all',
    label: 'All tickers',
    title: 'Re-fetch related peers for every row in tickers.',
  },
]

const OVERVIEW_SCOPE_BUBBLES: ReadonlyArray<{
  value: OverviewEnqueueMode
  label: string
  title: string
}> = [
  {
    value: 'missing',
    label: 'Missing only',
    title: 'Tickers with no ticker_overview row (gap vs public.tickers).',
  },
  {
    value: 'stale',
    label: 'Missing or stale',
    title: 'No overview, null overview_updated_at, or older than stale hours.',
  },
  {
    value: 'symbols',
    label: 'Listed symbols',
    title: 'Only symbols in the enqueue field below.',
  },
  {
    value: 'all',
    label: 'All tickers',
    title: 'Refresh overview for every row in tickers (full pass).',
  },
]

function CatalogEnqueueIcon({ busy }: { busy: boolean }) {
  if (busy) {
    return (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
        <path
          d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"
          strokeLinecap="round"
        />
      </svg>
    )
  }
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
      <path d="M5 7h10M5 12h10M5 17h7" />
      <path d="M18 9v6M15 12h6" />
    </svg>
  )
}

function renderTableNameList(tables: readonly string[]) {
  return tables.map((t, i) => (
    <span key={t}>
      {i > 0 ? <span className="text-muted-foreground"> · </span> : null}
      <code className="rounded bg-muted px-1 py-0.5 font-mono text-xs">{t}</code>
    </span>
  ))
}

function CoverageCountsStrip({
  loading,
  counts,
  loadingLabel,
  unavailableLabel,
}: {
  loading: boolean
  counts: TickerOverviewCoverageCounts | null
  loadingLabel: string
  unavailableLabel: string
}) {
  if (loading) {
    return <span className="text-xs text-muted-foreground">{loadingLabel}</span>
  }
  if (!counts) {
    return <span className="text-xs text-muted-foreground">{unavailableLabel}</span>
  }
  return (
    <span className="text-xs text-muted-foreground" aria-live="polite">
      <span className="text-warning">
        <strong>{counts.missing.toLocaleString()}</strong> missing
      </span>
      <span aria-hidden> · </span>
      <span className="text-success">
        <strong>{counts.filled.toLocaleString()}</strong> filled
      </span>
      <span aria-hidden> · </span>
      <span>
        {counts.total_tickers.toLocaleString()} in <code className="font-mono text-[0.7rem]">tickers</code>
      </span>
    </span>
  )
}

export interface TickerOverviewCoverageCounts {
  total_tickers: number
  missing: number
  filled: number
}

export interface RefJobDetailPanelProps {
  catalogRow: RefTickerCatalogRow
  disabledForJobs: boolean
  busyVerify: boolean
  jobBusyKind: TrackedMassiveDbJobKind | null
  overviewEnqueueMode: OverviewEnqueueMode
  setOverviewEnqueueMode: (m: OverviewEnqueueMode) => void
  overviewStaleHours: number
  setOverviewStaleHours: (n: number) => void
  relatedEnqueueMode: RelatedEnqueueMode
  setRelatedEnqueueMode: (m: RelatedEnqueueMode) => void
  relatedStaleHours: number
  setRelatedStaleHours: (n: number) => void
  refJobSymbols: string
  setRefJobSymbols: (s: string) => void
  refJobSymbolsErr: string | null
  onEnqueue: () => void
  searchQuery: string
  setSearchQuery: (s: string) => void
  searchLimit: number
  setSearchLimit: (n: number) => void
  overviewSymbol: string
  setOverviewSymbol: (s: string) => void
  relatedSymbol: string
  setRelatedSymbol: (s: string) => void
  onVerifySearch: () => void
  onVerifyOverviewMerged: () => void
  onVerifyOverviewMissingFirst: () => void
  onVerifyOverviewMissingMore: () => void
  overviewMissingLimit: number
  setOverviewMissingLimit: (n: number) => void
  missingOverviewHasMore: boolean
  missingOverviewLoadedCount: number
  onVerifyRelatedDb: () => void
  onVerifyInstrumentTypes: () => void
  overviewCoverage: TickerOverviewCoverageCounts | null
  overviewCoverageLoading: boolean
  overviewVerifyKind: 'merged' | 'missing' | null
  overviewMissingVerifyAppend: boolean
  relatedCoverage: TickerOverviewCoverageCounts | null
  relatedCoverageLoading: boolean
  relatedListPageLimit: number
  setRelatedListPageLimit: (n: number) => void
  onVerifyRelatedMissingFirst: () => void
  onVerifyRelatedMissingMore: () => void
  onVerifyRelatedFilledFirst: () => void
  onVerifyRelatedFilledMore: () => void
  missingRelatedHasMore: boolean
  missingRelatedLoadedCount: number
  filledRelatedHasMore: boolean
  filledRelatedLoadedCount: number
  relatedVerifyKind: 'symbol' | 'missing' | 'filled' | null
  relatedMissingVerifyAppend: boolean
  relatedFilledVerifyAppend: boolean
  universeRowCount: number | null
  universeRowCountLoading: boolean
  tickerTypesRowCount: number | null
  tickerTypesRowCountLoading: boolean
}

export function RefJobDetailPanel({
  catalogRow,
  disabledForJobs,
  busyVerify,
  jobBusyKind,
  overviewEnqueueMode,
  setOverviewEnqueueMode,
  overviewStaleHours,
  setOverviewStaleHours,
  relatedEnqueueMode,
  setRelatedEnqueueMode,
  relatedStaleHours,
  setRelatedStaleHours,
  refJobSymbols,
  setRefJobSymbols,
  refJobSymbolsErr,
  onEnqueue,
  searchQuery,
  setSearchQuery,
  searchLimit,
  setSearchLimit,
  overviewSymbol,
  setOverviewSymbol,
  relatedSymbol,
  setRelatedSymbol,
  onVerifySearch,
  onVerifyOverviewMerged,
  onVerifyOverviewMissingFirst,
  onVerifyOverviewMissingMore,
  overviewMissingLimit,
  setOverviewMissingLimit,
  missingOverviewHasMore,
  missingOverviewLoadedCount,
  onVerifyRelatedDb,
  onVerifyInstrumentTypes,
  overviewCoverage,
  overviewCoverageLoading,
  overviewVerifyKind,
  overviewMissingVerifyAppend,
  relatedCoverage,
  relatedCoverageLoading,
  relatedListPageLimit,
  setRelatedListPageLimit,
  onVerifyRelatedMissingFirst,
  onVerifyRelatedMissingMore,
  onVerifyRelatedFilledFirst,
  onVerifyRelatedFilledMore,
  missingRelatedHasMore,
  missingRelatedLoadedCount,
  filledRelatedHasMore,
  filledRelatedLoadedCount,
  relatedVerifyKind,
  relatedMissingVerifyAppend,
  relatedFilledVerifyAppend,
  universeRowCount,
  universeRowCountLoading,
  tickerTypesRowCount,
  tickerTypesRowCountLoading,
}: RefJobDetailPanelProps) {
  const kind = catalogRow.kind
  const jobLabel = refJobKindShortLabel(kind)
  const enqueueBusy = jobBusyKind === kind
  const disabledEnqueue = disabledForJobs || enqueueBusy

  const scopeSegmentDisabled = disabledEnqueue

  return (
    <div
      className="min-w-0 flex-1 space-y-3 rounded-md border border-border/60 bg-background p-3"
      id="ref-job-detail-panel"
      role="tabpanel"
    >
      <dl className="grid gap-x-4 gap-y-2 text-sm sm:grid-cols-[4.5rem_1fr]">
        <dt className="font-medium text-muted-foreground">Job</dt>
        <dd>
          <strong>{jobLabel}</strong>
          <InfoTooltip text={catalogRow.hint} />
        </dd>
        <dt className="font-medium text-muted-foreground">REST</dt>
        <dd>
          <a
            href={feedMassiveStockTickersSubHash(catalogRow.tickersSubTab)}
            className="text-primary hover:underline"
            title="Open Massive Stock → Tickers (matching REST tab)"
          >
            {catalogRow.restEndpointShort}
          </a>
        </dd>
        <dt className="font-medium text-muted-foreground">Queue</dt>
        <dd>
          <a
            href={celeryQueueHash(catalogRow.queueNote)}
            className="text-primary hover:underline"
            title="Open Celery queue"
          >
            <code className="rounded bg-muted px-1 py-0.5 font-mono text-xs">{catalogRow.queueNote}</code>
          </a>
        </dd>
        <dt className="font-medium text-muted-foreground">{REF_CATALOG_PG_LABELS.business}</dt>
        <dd>{renderTableNameList(catalogRow.businessTables)}</dd>
        <dt className="font-medium text-muted-foreground">{REF_CATALOG_PG_LABELS.job}</dt>
        <dd>
          {catalogRow.jobTables.length > 0 ? renderTableNameList(catalogRow.jobTables) : <span className="text-muted-foreground">—</span>}
        </dd>
      </dl>

      <h4 className="text-sm font-semibold">Enqueue</h4>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1 space-y-3">
          {isFeedStocksTickersReferenceUniverseRefKind(kind) ? (
            <div>
              <p className="text-xs text-muted-foreground">
                Full pagination sync (1000 rows/page) until cursor ends. No extra fields.
              </p>
              <p className="mt-2 text-xs" aria-live="polite">
                {universeRowCountLoading ? (
                  <span className="text-muted-foreground">Loading row count…</span>
                ) : universeRowCount != null ? (
                  <span title="Rows in public.tickers">
                    <strong>{universeRowCount.toLocaleString()}</strong>
                    <span className="text-muted-foreground"> tickers in </span>
                    <code className="font-mono text-[0.7rem]">tickers</code>
                  </span>
                ) : (
                  <span className="text-muted-foreground">Row count unavailable</span>
                )}
              </p>
            </div>
          ) : null}
          {isFeedStocksTickersTypesRefKind(kind) ? (
            <div>
              <p className="text-xs text-muted-foreground">
                Replaces all rows in ticker_types from the API. No extra fields.
              </p>
              <p className="mt-2 text-xs" aria-live="polite">
                {tickerTypesRowCountLoading ? (
                  <span className="text-muted-foreground">Loading row count…</span>
                ) : tickerTypesRowCount != null ? (
                  <span title="Rows in public.ticker_types">
                    <strong>{tickerTypesRowCount.toLocaleString()}</strong>
                    <span className="text-muted-foreground"> instrument types in </span>
                    <code className="font-mono text-[0.7rem]">ticker_types</code>
                  </span>
                ) : (
                  <span className="text-muted-foreground">Row count unavailable</span>
                )}
              </p>
            </div>
          ) : null}

          {isFeedStocksTickersOverviewRefKind(kind) ? (
            <div className="space-y-2">
              <Label className="text-sm font-medium">Overview job scope</Label>
              <SegmentControl
                ariaLabel="Overview job scope"
                size="sm"
                options={OVERVIEW_SCOPE_BUBBLES.map(opt => ({
                  value: opt.value,
                  label: opt.label,
                  disabled: scopeSegmentDisabled,
                }))}
                value={overviewEnqueueMode}
                onChange={v => setOverviewEnqueueMode(v as OverviewEnqueueMode)}
                className="flex-wrap"
              />
              <p className="text-xs text-muted-foreground">
                Compares <code className="font-mono text-[0.7rem]">public.tickers</code> to{' '}
                <code className="font-mono text-[0.7rem]">public.ticker_overview</code>.
              </p>
              <CoverageCountsStrip
                loading={overviewCoverageLoading}
                counts={overviewCoverage}
                loadingLabel="Loading coverage counts…"
                unavailableLabel="Coverage counts unavailable"
              />
              {overviewEnqueueMode === 'stale' ? (
                <div className="space-y-1">
                  <Label htmlFor="ref-overview-stale-hours">Stale after (hours)</Label>
                  <Input
                    id="ref-overview-stale-hours"
                    className="max-w-32"
                    type="number"
                    min={1}
                    step={1}
                    value={overviewStaleHours}
                    disabled={disabledEnqueue}
                    onChange={e => {
                      const n = parseInt(e.target.value, 10)
                      setOverviewStaleHours(Number.isFinite(n) && n >= 1 ? n : 720)
                    }}
                    aria-label="Hours before ticker_overview is considered stale"
                  />
                </div>
              ) : null}
            </div>
          ) : null}

          {isFeedStocksTickersRelatedRefKind(kind) ? (
            <div className="mt-2 space-y-2">
              <Label className="text-sm font-medium">Related job scope</Label>
              <SegmentControl
                ariaLabel="Related job scope"
                size="sm"
                options={RELATED_SCOPE_BUBBLES.map(opt => ({
                  value: opt.value,
                  label: opt.label,
                  disabled: scopeSegmentDisabled,
                }))}
                value={relatedEnqueueMode}
                onChange={v => setRelatedEnqueueMode(v as RelatedEnqueueMode)}
                className="flex-wrap"
              />
              <p className="text-xs text-muted-foreground">
                Compares <code className="font-mono text-[0.7rem]">public.tickers</code> to{' '}
                <code className="font-mono text-[0.7rem]">public.ticker_related_tickers</code> (
                <code className="font-mono text-[0.7rem]">from_tickers_id</code>). Stale uses{' '}
                <code className="font-mono text-[0.7rem]">MAX(fetched_at)</code> per ticker.
              </p>
              <CoverageCountsStrip
                loading={relatedCoverageLoading}
                counts={relatedCoverage}
                loadingLabel="Loading coverage counts…"
                unavailableLabel="Coverage counts unavailable"
              />
              {relatedEnqueueMode === 'stale' ? (
                <div className="space-y-1">
                  <Label htmlFor="ref-related-stale-hours">Stale after (hours)</Label>
                  <Input
                    id="ref-related-stale-hours"
                    className="max-w-32"
                    type="number"
                    min={1}
                    step={1}
                    value={relatedStaleHours}
                    disabled={disabledEnqueue}
                    onChange={e => {
                      const n = parseInt(e.target.value, 10)
                      setRelatedStaleHours(Number.isFinite(n) && n >= 1 ? n : 720)
                    }}
                    aria-label="Hours before related data is considered stale"
                  />
                </div>
              ) : null}
            </div>
          ) : null}

          {(isFeedStocksTickersOverviewRefKind(kind) && overviewEnqueueMode === 'symbols') ||
          (isFeedStocksTickersRelatedRefKind(kind) && relatedEnqueueMode === 'symbols') ? (
            <div className="mt-2 space-y-1">
              <Label htmlFor="ref-job-symbols-panel">Symbols (comma or space separated)</Label>
              <Input
                id="ref-job-symbols-panel"
                value={refJobSymbols}
                onChange={e => setRefJobSymbols(e.target.value)}
                disabled={disabledEnqueue}
                placeholder="AAPL, MSFT, GOOGL"
                autoComplete="off"
                aria-invalid={refJobSymbolsErr != null}
                aria-describedby={refJobSymbolsErr ? 'ref-job-symbols-err-panel' : undefined}
              />
              {refJobSymbolsErr ? (
                <p id="ref-job-symbols-err-panel" className="text-sm text-destructive" role="alert">
                  {refJobSymbolsErr}
                </p>
              ) : null}
            </div>
          ) : null}
        </div>
        <Button
          type="button"
          size="sm"
          disabled={disabledEnqueue}
          aria-busy={enqueueBusy}
          onClick={onEnqueue}
          className="shrink-0 gap-1.5"
        >
          <CatalogEnqueueIcon busy={enqueueBusy} />
          {enqueueBusy ? 'Enqueueing…' : `Enqueue ${jobLabel}`}
        </Button>
      </div>

      <h4 className="text-sm font-semibold">Verify (PostgreSQL)</h4>

      {isFeedStocksTickersReferenceUniverseRefKind(kind) ? (
        <>
          <label className="flex flex-col gap-1 text-sm block">
            <span className="text-sm font-medium">Search query</span>
            <input
              className="max-w-full sm:max-w-xs"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              disabled={busyVerify}
              placeholder="AAPL or Apple"
              autoComplete="off"
            />
          </label>
          <label className="mt-2 flex flex-col gap-1 text-sm">
            <span className="text-sm font-medium">Result limit</span>
            <input
              className="max-w-full sm:max-w-xs"
              type="number"
              min={1}
              max={100}
              step={1}
              value={searchLimit}
              onChange={e => {
                const v = parseInt(e.target.value, 10)
                setSearchLimit(Number.isFinite(v) ? v : DEFAULT_TICKER_REF_SEARCH_LIMIT)
              }}
              disabled={busyVerify}
              aria-label="Search result row limit"
              style={{ maxWidth: '8rem' }}
            />
          </label>
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" size="sm" disabled={busyVerify} onClick={onVerifySearch}>
              {busyVerify ? 'Loading…' : 'Search (DB)'}
            </Button>
          </div>
        </>
      ) : null}

      {isFeedStocksTickersTypesRefKind(kind) ? (
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" size="sm" disabled={busyVerify} onClick={onVerifyInstrumentTypes}>
            {busyVerify ? 'Loading…' : 'Instrument types (DB)'}
          </Button>
        </div>
      ) : null}

      {isFeedStocksTickersOverviewRefKind(kind) ? (
        <>
          <label className="flex flex-col gap-1 text-sm block">
            <span className="text-sm font-medium">Symbol (merged ticker + overview row)</span>
            <input
              className="max-w-full sm:max-w-xs"
              value={overviewSymbol}
              onChange={e => setOverviewSymbol(e.target.value)}
              disabled={busyVerify}
              placeholder="AAPL"
              autoComplete="off"
            />
          </label>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={busyVerify}
              aria-busy={busyVerify && overviewVerifyKind === 'merged'}
              onClick={onVerifyOverviewMerged}
            >
              {busyVerify && overviewVerifyKind === 'merged' ? 'Loading…' : 'Load merged row (DB)'}
            </Button>
          </div>

          <label className="mt-3 flex flex-col gap-1 text-sm">
            <span className="text-sm font-medium">Missing overview — page size</span>
            <input
              className="max-w-full sm:max-w-xs"
              type="number"
              min={1}
              max={MAX_TICKER_REF_MISSING_LIMIT}
              step={1}
              value={overviewMissingLimit}
              onChange={e => {
                const v = parseInt(e.target.value, 10)
                if (Number.isFinite(v)) setOverviewMissingLimit(v)
              }}
              disabled={busyVerify}
              aria-label="Number of tickers to load per request for missing overview list"
              style={{ maxWidth: '8rem' }}
            />
          </label>
          <p className="mt-1 mb-0 text-xs text-muted-foreground">
            Lists symbols present in <code>tickers</code> with no <code>ticker_overview</code> row (ordered A–Z). Default
            page size {DEFAULT_TICKER_REF_MISSING_LIMIT}.
          </p>
          <div className="flex flex-wrap gap-2 mt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={busyVerify}
              aria-busy={busyVerify && overviewVerifyKind === 'missing' && !overviewMissingVerifyAppend}
              onClick={onVerifyOverviewMissingFirst}
            >
              {busyVerify && overviewVerifyKind === 'missing' && !overviewMissingVerifyAppend
                ? 'Loading…'
                : 'Load missing tickers (DB)'}
            </Button>
            {missingOverviewHasMore && missingOverviewLoadedCount > 0 ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={busyVerify}
                aria-busy={busyVerify && overviewVerifyKind === 'missing' && overviewMissingVerifyAppend}
                onClick={onVerifyOverviewMissingMore}
              >
                {busyVerify && overviewVerifyKind === 'missing' && overviewMissingVerifyAppend
                  ? 'Loading…'
                  : 'Load more'}
              </Button>
            ) : null}
          </div>
        </>
      ) : null}

      {isFeedStocksTickersRelatedRefKind(kind) ? (
        <>
          <label className="flex flex-col gap-1 text-sm block">
            <span className="text-sm font-medium">Symbol (single-ticker related rows)</span>
            <input
              className="max-w-full sm:max-w-xs"
              value={relatedSymbol}
              onChange={e => setRelatedSymbol(e.target.value)}
              disabled={busyVerify}
              placeholder="AAPL"
              autoComplete="off"
            />
          </label>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={busyVerify}
              aria-busy={busyVerify && relatedVerifyKind === 'symbol'}
              onClick={onVerifyRelatedDb}
            >
              {busyVerify && relatedVerifyKind === 'symbol' ? 'Loading…' : 'Load related (DB)'}
            </Button>
          </div>

          <label className="mt-3 flex flex-col gap-1 text-sm">
            <span className="text-sm font-medium">Page size</span>
            <input
              className="max-w-full sm:max-w-xs"
              type="number"
              min={1}
              max={MAX_TICKER_REF_MISSING_LIMIT}
              step={1}
              value={relatedListPageLimit}
              onChange={e => {
                const v = parseInt(e.target.value, 10)
                if (Number.isFinite(v)) setRelatedListPageLimit(v)
              }}
              disabled={busyVerify}
              aria-label="Page size for missing and filled related ticker lists"
              style={{ maxWidth: '8rem' }}
            />
          </label>
          <div className="flex flex-wrap gap-2 mt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={busyVerify}
              aria-busy={busyVerify && relatedVerifyKind === 'missing' && !relatedMissingVerifyAppend}
              onClick={onVerifyRelatedMissingFirst}
            >
              {busyVerify && relatedVerifyKind === 'missing' && !relatedMissingVerifyAppend
                ? 'Loading…'
                : 'Load missing tickers (DB)'}
            </Button>
            {missingRelatedHasMore && missingRelatedLoadedCount > 0 ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={busyVerify}
                aria-busy={busyVerify && relatedVerifyKind === 'missing' && relatedMissingVerifyAppend}
                onClick={onVerifyRelatedMissingMore}
              >
                {busyVerify && relatedVerifyKind === 'missing' && relatedMissingVerifyAppend
                  ? 'Loading…'
                  : 'Load more (missing)'}
              </Button>
            ) : null}
          </div>
          <div className="flex flex-wrap gap-2 mt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={busyVerify}
              aria-busy={busyVerify && relatedVerifyKind === 'filled' && !relatedFilledVerifyAppend}
              onClick={onVerifyRelatedFilledFirst}
            >
              {busyVerify && relatedVerifyKind === 'filled' && !relatedFilledVerifyAppend
                ? 'Loading…'
                : 'Load filled tickers (DB)'}
            </Button>
            {filledRelatedHasMore && filledRelatedLoadedCount > 0 ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={busyVerify}
                aria-busy={busyVerify && relatedVerifyKind === 'filled' && relatedFilledVerifyAppend}
                onClick={onVerifyRelatedFilledMore}
              >
                {busyVerify && relatedVerifyKind === 'filled' && relatedFilledVerifyAppend
                  ? 'Loading…'
                  : 'Load more (filled)'}
              </Button>
            ) : null}
          </div>
        </>
      ) : null}
    </div>
  )
}
