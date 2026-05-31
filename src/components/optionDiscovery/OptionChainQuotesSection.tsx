import type { ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { cn } from '@/lib/utils'
import { fmtUsd } from '@/lib/format'
import { InfoTooltip } from '@/components/ui/InfoTooltip'
import { CHAIN_COLUMN_LABEL } from '@/utils/optionDiscovery/strikePresets'
import type { OptionSnapshotRow } from '@/types/optionDiscovery'
import { optionContractKey } from '@/utils/optionDiscovery/optionContractMetrics'
import { DiscoveryHint } from './DiscoveryHint'
import { DiscoveryIconButton } from './DiscoveryIconButton'
import { DiscoverySection } from './DiscoverySection'
import { DiscoveryScrollArea } from './DiscoveryScrollArea'
import type { StrikeSideMode } from './DiscoverySideToggle'

type ChainColumnId = keyof typeof CHAIN_COLUMN_LABEL

type SnapshotFeedback = {
  level: 'error' | 'warning' | 'info'
  title?: string
  body: string
}

export function OptionChainQuotesSection({
  lastQuotesLoadTs,
  greeksSource,
  onGreeksSourceChange,
  onRefreshQuotes,
  canLoadQuotes,
  snapshotLoading,
  underlyingPrice,
  addWatchlistFeedback,
  snapshotFeedback,
  snapshotPgWatching,
  snapshotPgWatchSecondsLeft,
  onPullNow,
  openMassiveFeed,
  chainColumnVisibility,
  onToggleChainColumn,
  chainColumnList,
  strikeSideMode,
  showCallSide,
  showPutSide,
  chainStrikesSorted,
  rowIndexByStrikeRight,
  snapshotRows,
  selectedContractKey,
  onSelectContractKey,
  snapshotLoadAttempted,
  renderChainSideCells,
}: {
  lastQuotesLoadTs: Date | null
  greeksSource: 'snapshot' | 'bs'
  onGreeksSourceChange: (v: 'snapshot' | 'bs') => void
  onRefreshQuotes: () => void
  canLoadQuotes: boolean
  snapshotLoading: boolean
  underlyingPrice: number | null
  addWatchlistFeedback: string | null
  snapshotFeedback: SnapshotFeedback | null
  snapshotPgWatching: boolean
  snapshotPgWatchSecondsLeft: number | null
  onPullNow: () => void
  openMassiveFeed?: () => void
  chainColumnVisibility: Record<string, boolean | undefined>
  onToggleChainColumn: (id: ChainColumnId) => void
  chainColumnList: ChainColumnId[]
  strikeSideMode: StrikeSideMode
  showCallSide: boolean
  showPutSide: boolean
  chainStrikesSorted: number[]
  rowIndexByStrikeRight: Map<string, number>
  snapshotRows: OptionSnapshotRow[]
  selectedContractKey: string | null
  onSelectContractKey: (key: string | null) => void
  snapshotLoadAttempted: boolean
  renderChainSideCells: (
    side: 'call' | 'put',
    row: OptionSnapshotRow | undefined,
    rowIdx: number | null,
    sideSelected: boolean,
  ) => ReactNode
}) {
  const feedbackClass =
    snapshotFeedback?.level === 'error'
      ? 'border-destructive/40 bg-destructive/10 text-destructive'
      : snapshotFeedback?.level === 'warning'
        ? 'border-amber-500/40 bg-amber-500/10 text-amber-800 dark:text-amber-200'
        : 'border-border bg-muted/50 text-muted-foreground'

  return (
    <DiscoverySection
      aria-labelledby="option-discovery-table-head"
      aria-describedby="option-discovery-view-scope-hint"
    >
      <div className="mt-1 mb-2 flex flex-wrap items-center gap-x-3 gap-y-2">
        <h3 id="option-discovery-table-head" className="m-0 inline-flex items-center gap-1.5 text-base font-medium">
          Option quotes
          <InfoTooltip text="Massive: enqueue sync job (REST), then read snapshots from PostgreSQL; 15 min delayed." />
        </h3>
        <span className="inline-flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          {lastQuotesLoadTs != null && (
            <span title={`Data loaded at ${lastQuotesLoadTs.toLocaleString()}`} className="tabular-nums">
              {lastQuotesLoadTs.toLocaleString([], {
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
              })}
            </span>
          )}
          <ToggleGroup
            type="single"
            size="sm"
            variant="outline"
            value={greeksSource}
            onValueChange={v => {
              if (v === 'snapshot' || v === 'bs') onGreeksSourceChange(v)
            }}
            title="Switch IV & Greeks columns between Massive snapshot data and local Black-Scholes calculation"
          >
            <ToggleGroupItem value="snapshot">Snapshot</ToggleGroupItem>
            <ToggleGroupItem value="bs">BS</ToggleGroupItem>
          </ToggleGroup>
        </span>
        <DiscoveryIconButton
          onClick={onRefreshQuotes}
          disabled={!canLoadQuotes}
          aria-label="Refresh option quotes"
          title={snapshotLoading ? 'Loading option quotes' : 'Refresh option quotes'}
        >
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
            <path d="M3 3v5h5" />
            <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" />
            <path d="M16 21h5v-5" />
          </svg>
        </DiscoveryIconButton>
        {underlyingPrice != null && (
          <DiscoveryHint as="span" className="mt-0 whitespace-nowrap tabular-nums">
            Underlying: {fmtUsd(underlyingPrice)}
          </DiscoveryHint>
        )}
      </div>

      {addWatchlistFeedback != null && (
        <div className="mb-2">
          <DiscoveryHint as="span" className="mt-0" role="status">
            {addWatchlistFeedback.includes('|') ? 'Added to Watchlist.' : addWatchlistFeedback}
          </DiscoveryHint>
        </div>
      )}

      {snapshotLoading && (
        <DiscoveryHint>Fetching option quotes (may take ~10s)…</DiscoveryHint>
      )}

      {snapshotFeedback != null && !snapshotLoading && (
        <div className={cn('mb-3 rounded-lg border px-3 py-2 text-sm', feedbackClass)} role={snapshotFeedback.level === 'error' ? 'alert' : 'status'}>
          {snapshotFeedback.title && <strong className="mr-1">{snapshotFeedback.title}</strong>}
          <span>{snapshotFeedback.body}</span>
          {snapshotFeedback.level !== 'error' && (
            <div className="mt-2 flex flex-wrap gap-2">
              <Button type="button" variant="secondary" size="sm" onClick={onPullNow} disabled={!canLoadQuotes}>
                Pull now
              </Button>
              {openMassiveFeed && (
                <Button type="button" variant="ghost" size="sm" onClick={openMassiveFeed}>
                  Open Massive Option
                </Button>
              )}
            </div>
          )}
          {snapshotPgWatching && (
            <DiscoveryHint className="mt-2" role="status">
              Watching PostgreSQL for new snapshots… ~{snapshotPgWatchSecondsLeft ?? 0}s left. Matching rows will appear
              automatically when data is available. Use Pull now to enqueue another chain snapshot if the worker was not
              running.
            </DiscoveryHint>
          )}
        </div>
      )}

      {snapshotRows.length > 0 && !snapshotLoading && (
        <>
          <div className="mb-2 flex flex-wrap items-center gap-2" role="group" aria-label="Column visibility">
            <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Columns</span>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <span className="text-[0.65rem] font-medium text-muted-foreground">Day</span>
              {(['day_open', 'day_high', 'day_low', 'day_close', 'day_vol'] as const).map(id => (
                <label key={id} className="inline-flex items-center gap-1.5 text-xs">
                  <Checkbox
                    checked={chainColumnVisibility[id] !== false}
                    onCheckedChange={() => onToggleChainColumn(id)}
                  />
                  {CHAIN_COLUMN_LABEL[id]}
                </label>
              ))}
              <span className="mx-1 h-4 w-px bg-border" aria-hidden />
              {(['iv', 'delta', 'gamma', 'theta', 'vega', 'oi'] as const).map(id => (
                <label key={id} className="inline-flex items-center gap-1.5 text-xs">
                  <Checkbox
                    checked={chainColumnVisibility[id] !== false}
                    onCheckedChange={() => onToggleChainColumn(id)}
                  />
                  {CHAIN_COLUMN_LABEL[id]}
                </label>
              ))}
            </div>
          </div>

          {chainColumnList.length === 0 ? (
            <DiscoveryHint role="status">Select at least one column in Columns filter.</DiscoveryHint>
          ) : (
            <DiscoveryScrollArea maxHeightClass="max-h-[min(70vh,32rem)]" className="rounded-md border border-border">
              <Table className="text-xs" aria-label="Option chain: calls, strike, puts">
                <TableHeader>
                  {strikeSideMode === 'put' ? (
                    <>
                      <TableRow className="hover:bg-transparent">
                        <TableHead
                          rowSpan={2}
                          className="sticky top-0 z-10 bg-card font-semibold"
                          scope="col"
                        >
                          Strike
                        </TableHead>
                        <TableHead
                          colSpan={chainColumnList.length}
                          className="sticky top-0 z-10 bg-red-500/10 text-center font-semibold text-destructive"
                          scope="colgroup"
                        >
                          Puts
                        </TableHead>
                      </TableRow>
                      <TableRow className="hover:bg-transparent">
                        {chainColumnList.map(col => (
                          <TableHead
                            key={`put-h-${col}`}
                            className="sticky top-[1.85rem] z-10 bg-red-500/5 text-right font-medium"
                            scope="col"
                          >
                            {CHAIN_COLUMN_LABEL[col]}
                          </TableHead>
                        ))}
                      </TableRow>
                    </>
                  ) : (
                    <>
                      <TableRow className="hover:bg-transparent">
                        {showCallSide && (
                          <TableHead
                            colSpan={chainColumnList.length}
                            className="sticky top-0 z-10 bg-green-500/10 text-center font-semibold text-green-700 dark:text-green-500"
                            scope="colgroup"
                          >
                            Calls
                          </TableHead>
                        )}
                        <TableHead
                          rowSpan={2}
                          className="sticky top-0 z-10 bg-card text-center font-semibold"
                          scope="col"
                        >
                          Strike
                        </TableHead>
                        {showPutSide && strikeSideMode === 'all' && (
                          <TableHead
                            colSpan={chainColumnList.length}
                            className="sticky top-0 z-10 bg-red-500/10 text-center font-semibold text-destructive"
                            scope="colgroup"
                          >
                            Puts
                          </TableHead>
                        )}
                      </TableRow>
                      <TableRow className="hover:bg-transparent">
                        {showCallSide &&
                          chainColumnList.map(col => (
                            <TableHead
                              key={`call-h-${col}`}
                              className="sticky top-[1.85rem] z-10 bg-green-500/5 text-right font-medium"
                              scope="col"
                            >
                              {CHAIN_COLUMN_LABEL[col]}
                            </TableHead>
                          ))}
                        {showPutSide &&
                          strikeSideMode === 'all' &&
                          chainColumnList.map(col => (
                            <TableHead
                              key={`put-h-${col}`}
                              className="sticky top-[1.85rem] z-10 bg-red-500/5 text-right font-medium"
                              scope="col"
                            >
                              {CHAIN_COLUMN_LABEL[col]}
                            </TableHead>
                          ))}
                      </TableRow>
                    </>
                  )}
                </TableHeader>
                <TableBody>
                  {chainStrikesSorted.map(strike => {
                    const callIdx = rowIndexByStrikeRight.get(`${strike}|C`) ?? null
                    const putIdx = rowIndexByStrikeRight.get(`${strike}|P`) ?? null
                    const callRow = callIdx != null ? snapshotRows[callIdx] : undefined
                    const putRow = putIdx != null ? snapshotRows[putIdx] : undefined
                    const callKey = callRow ? optionContractKey(callRow) : null
                    const putKey = putRow ? optionContractKey(putRow) : null
                    const callSel = callKey != null && selectedContractKey === callKey
                    const putSel = putKey != null && selectedContractKey === putKey
                    const rowHighlight = (callIdx != null && callSel) || (putIdx != null && putSel)
                    const atm =
                      underlyingPrice != null &&
                      Number.isFinite(underlyingPrice) &&
                      Math.abs(strike - underlyingPrice) < 0.021
                    const itm =
                      !atm &&
                      underlyingPrice != null &&
                      Number.isFinite(underlyingPrice) &&
                      strike < underlyingPrice

                    return (
                      <TableRow
                        key={strike}
                        className={cn(
                          'cursor-pointer tabular-nums',
                          rowHighlight && 'bg-accent/15',
                          atm && 'bg-primary/5',
                          !atm && itm && 'bg-muted/30',
                        )}
                        onClick={() => {
                          if (callIdx != null && callKey) onSelectContractKey(callSel ? null : callKey)
                          else if (putIdx != null && putKey) onSelectContractKey(putSel ? null : putKey)
                        }}
                      >
                        {strikeSideMode === 'put' ? (
                          <>
                            <TableCell
                              className={cn(
                                'sticky left-0 z-[1] bg-card text-center font-mono font-semibold',
                                (callSel || putSel) && 'bg-accent/20',
                              )}
                              onClick={e => {
                                e.stopPropagation()
                                if (putIdx != null && putKey) onSelectContractKey(putSel ? null : putKey)
                                else if (callIdx != null && callKey) onSelectContractKey(callSel ? null : callKey)
                              }}
                            >
                              {strike.toFixed(2)}
                            </TableCell>
                            {renderChainSideCells('put', putRow, putIdx, putSel)}
                          </>
                        ) : (
                          <>
                            {showCallSide && renderChainSideCells('call', callRow, callIdx, callSel)}
                            <TableCell
                              className={cn(
                                'text-center font-mono font-semibold',
                                (callSel || putSel) && 'bg-accent/20',
                              )}
                              onClick={e => {
                                e.stopPropagation()
                                if (callIdx != null && callKey) onSelectContractKey(callSel ? null : callKey)
                                else if (putIdx != null && putKey) onSelectContractKey(putSel ? null : putKey)
                              }}
                            >
                              {strike.toFixed(2)}
                            </TableCell>
                            {showPutSide && strikeSideMode === 'all' && renderChainSideCells('put', putRow, putIdx, putSel)}
                          </>
                        )}
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </DiscoveryScrollArea>
          )}
        </>
      )}

      {snapshotRows.length === 0 && !snapshotLoading && !snapshotFeedback && (
        <DiscoveryHint role="status">
          {!snapshotLoadAttempted
            ? 'Select symbol and expiration to load quotes automatically.'
            : 'No quotes returned. Check Massive job queue, Celery worker, and PostgreSQL option_snapshots.'}
        </DiscoveryHint>
      )}
    </DiscoverySection>
  )
}
