import {
  forwardRef,
  useCallback,
  useImperativeHandle,
  useMemo,
  useState,
} from 'react'
import { postMassiveSync } from '@/api/research/optionDiscovery'
import {
  postOptionDayFillEligibility,
  postOptionMinFillEligibility,
} from '@/api/massive/watchlistCoverage'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { Button } from '@/components/ui/button'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import type {
  OptionBarsContractsGapResult,
  OptionContractsReferenceGapResult,
  OptionSnapshotsContractsGapResult,
} from '@/types/watchlistDbCoverage'
import type { OptionsFocusDataset } from '@/utils/dataOverview/optionFocusDataset'
import { isPoolableOptionsFocus } from '@/utils/dataOverview/optionFocusDataset'
const DEFAULT_OPTION_MIN_PERIOD = '1 min'
import { useOptionJobTracker } from '@/pages/settings/coverage/overview/useOptionJobTracker'

export interface DataOverviewOptionJobsBarHandle {
  enqueueChainSnapshot: (underlying: string) => Promise<void>
}

export interface DataOverviewOptionJobsBarProps {
  focusDataset: OptionsFocusDataset
  comparePool: string[]
  onSelectAllComparePool?: () => void
  onClearComparePool?: () => void
  refGapBySymbol?: Record<string, OptionContractsReferenceGapResult>
  onCompareMassiveReference?: (symbols: string[]) => void | Promise<void>
  refGapLoading?: boolean
  refGapError?: string | null
  snapshotGapBySymbol?: Record<string, OptionSnapshotsContractsGapResult>
  onCompareSnapshotGap?: (symbols: string[]) => void | Promise<void>
  snapshotGapLoading?: boolean
  snapshotGapError?: string | null
  barsGapBySymbol?: Record<string, OptionBarsContractsGapResult>
  onCompareBarsGap?: (symbols: string[]) => void | Promise<void>
  barsGapLoading?: boolean
  barsGapError?: string | null
  jobsSheetOpen: boolean
  onJobsSheetOpenChange: (open: boolean) => void
  onWatchlistRefreshRequested?: () => void | Promise<void>
  optionMinPeriod?: string
}

export const DataOverviewOptionJobsBar = forwardRef<
  DataOverviewOptionJobsBarHandle,
  DataOverviewOptionJobsBarProps
>(function DataOverviewOptionJobsBar(
  {
    focusDataset,
    comparePool,
    onSelectAllComparePool,
    onClearComparePool,
    refGapBySymbol = {},
    onCompareMassiveReference,
    refGapLoading = false,
    refGapError = null,
    snapshotGapBySymbol = {},
    onCompareSnapshotGap,
    snapshotGapLoading = false,
    snapshotGapError = null,
    onCompareBarsGap,
    barsGapBySymbol = {},
    barsGapLoading = false,
    barsGapError = null,
    jobsSheetOpen,
    onJobsSheetOpenChange,
    onWatchlistRefreshRequested,
    optionMinPeriod = DEFAULT_OPTION_MIN_PERIOD,
  },
  ref,
) {
  const [gapScope, setGapScope] = useState<'all' | 'pool'>('pool')
  const [fillBusy, setFillBusy] = useState<'row' | 'column' | null>(null)
  const [confirmFill, setConfirmFill] = useState<'row' | 'column' | null>(null)
  const [checkMsg, setCheckMsg] = useState<string | null>(null)

  const { items, trackJob, activeCount } = useOptionJobTracker(() => {
    void onWatchlistRefreshRequested?.()
  })

  const poolUpper = useMemo(
    () => comparePool.map(s => s.trim().toUpperCase()).filter(Boolean),
    [comparePool],
  )

  const checkTargets = useMemo(() => {
    if (gapScope === 'pool') return poolUpper
    return poolUpper
  }, [gapScope, poolUpper])

  const runCheck = useCallback(async () => {
    setCheckMsg(null)
    if (checkTargets.length === 0) {
      setCheckMsg('Add symbols to the compare pool (click Symbol in the matrix).')
      return
    }
    if (focusDataset === 'option_contracts') {
      await onCompareMassiveReference?.(checkTargets)
      return
    }
    if (focusDataset === 'option_snapshots') {
      await onCompareSnapshotGap?.(checkTargets)
      return
    }
    if (focusDataset === 'option_day' || focusDataset === 'option_min') {
      await onCompareBarsGap?.(checkTargets)
      return
    }
    setCheckMsg('Check is available for option_contracts, option_snapshots, option_day, and option_min.')
  }, [
    checkTargets,
    focusDataset,
    onCompareBarsGap,
    onCompareMassiveReference,
    onCompareSnapshotGap,
  ])

  const symbolsWithGap = useCallback(() => {
    return poolUpper.filter(sym => {
      let g: { ok?: boolean; gap?: number | null } | undefined
      if (focusDataset === 'option_snapshots') g = snapshotGapBySymbol[sym]
      else if (focusDataset === 'option_day' || focusDataset === 'option_min')
        g = barsGapBySymbol[sym]
      else g = refGapBySymbol[sym]
      return g?.ok && typeof g.gap === 'number' && g.gap !== 0
    })
  }, [poolUpper, focusDataset, refGapBySymbol, snapshotGapBySymbol, barsGapBySymbol])

  const enqueueOne = useCallback(
    async (sym: string, kind: string, payload: Record<string, unknown>) => {
      const res = await postMassiveSync(kind, payload)
      if (!res.ok || !res.job_id) {
        throw new Error(res.error ?? res.message ?? 'Enqueue failed')
      }
      trackJob(res.job_id, kind, sym, res.deduplicated)
    },
    [trackJob],
  )

  const enqueueChainSnapshot = useCallback(
    async (underlying: string) => {
      const sym = underlying.trim().toUpperCase()
      await enqueueOne(sym, 'feed_option_snapshots', { underlying: sym })
    },
    [enqueueOne],
  )

  useImperativeHandle(ref, () => ({ enqueueChainSnapshot }), [enqueueChainSnapshot])

  const runFillRow = useCallback(async () => {
    const syms = symbolsWithGap()
    if (syms.length === 0) {
      setCheckMsg('No pool symbols with non-zero gap after Check.')
      return
    }
    setFillBusy('row')
    setCheckMsg(null)
    try {
      for (const sym of syms) {
        if (focusDataset === 'option_snapshots') {
          await enqueueChainSnapshot(sym)
        } else if (focusDataset === 'option_contracts') {
          await enqueueOne(sym, 'feed_option_contracts', { underlying: sym, mode: 'reference_gap_fill' })
        } else if (focusDataset === 'option_day') {
          await enqueueOne(sym, 'feed_options_aggregate', {
            underlying: sym,
            table: 'option_day',
            mode: 'row_gap_fill',
          })
        } else if (focusDataset === 'option_min') {
          await enqueueOne(sym, 'feed_options_aggregate', {
            underlying: sym,
            table: 'option_min',
            period: optionMinPeriod,
            mode: 'row_gap_fill',
          })
        }
      }
    } catch (e) {
      setCheckMsg(e instanceof Error ? e.message : 'Fill failed')
    } finally {
      setFillBusy(null)
      setConfirmFill(null)
    }
  }, [symbolsWithGap, focusDataset, enqueueChainSnapshot, enqueueOne, optionMinPeriod])

  const runFillColumn = useCallback(async () => {
    if (poolUpper.length === 0) {
      setCheckMsg('Add symbols to the compare pool first.')
      return
    }
    setFillBusy('column')
    setCheckMsg(null)
    try {
      if (focusDataset === 'option_min') {
        const elig = await postOptionMinFillEligibility(poolUpper, optionMinPeriod)
        if (!elig.ok) throw new Error(elig.error ?? 'Eligibility check failed')
        for (const sym of poolUpper) {
          if (!elig.results?.[sym]?.needs_column_fill) continue
          await enqueueOne(sym, 'feed_options_aggregate', {
            underlying: sym,
            table: 'option_min',
            period: optionMinPeriod,
            mode: 'column_fill',
          })
        }
      } else if (focusDataset === 'option_day') {
        const elig = await postOptionDayFillEligibility(poolUpper)
        if (!elig.ok) throw new Error(elig.error ?? 'Eligibility check failed')
        for (const sym of poolUpper) {
          if (!elig.results?.[sym]?.needs_column_fill) continue
          await enqueueOne(sym, 'feed_options_aggregate', {
            underlying: sym,
            table: 'option_day',
            mode: 'column_fill',
          })
        }
      } else if (focusDataset === 'option_snapshots') {
        for (const sym of poolUpper) {
          await enqueueOne(sym, 'feed_option_snapshots', {
            underlying: sym,
            mode: 'contract_column_fill',
          })
        }
      } else if (focusDataset === 'option_contracts') {
        for (const sym of poolUpper) {
          await enqueueOne(sym, 'feed_option_contracts', {
            underlying: sym,
            mode: 'nullable_column_fill',
          })
        }
      }
    } catch (e) {
      setCheckMsg(e instanceof Error ? e.message : 'Fill failed')
    } finally {
      setFillBusy(null)
      setConfirmFill(null)
    }
  }, [poolUpper, focusDataset, optionMinPeriod, enqueueOne])

  const checkLoading =
    refGapLoading || snapshotGapLoading || barsGapLoading

  if (!isPoolableOptionsFocus(focusDataset)) {
    return null
  }

  return (
    <>
      <div className="flex flex-wrap items-center gap-2 rounded-md border bg-muted/20 p-3 text-sm">
        <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          POOL O
        </span>
        <Button type="button" variant="outline" size="sm" onClick={onSelectAllComparePool}>
          Select all
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={onClearComparePool}>
          Clear
        </Button>
        <span className="font-mono text-xs text-muted-foreground">
          {poolUpper.length > 0 ? poolUpper.join(', ') : '(empty)'}
        </span>

        <span className="ml-2 text-xs text-muted-foreground">Gap scope</span>
        <select
          className="h-8 rounded-md border border-input bg-background px-2 text-xs"
          value={gapScope}
          onChange={e => setGapScope(e.target.value as 'all' | 'pool')}
          aria-label="Gap scope"
        >
          <option value="pool">Pool symbols</option>
          <option value="all">All gaps</option>
        </select>

        <Button type="button" variant="secondary" size="sm" disabled={checkLoading} onClick={() => void runCheck()}>
          {checkLoading ? 'Checking…' : 'Check'}
        </Button>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          disabled={fillBusy != null}
          onClick={() => setConfirmFill('row')}
        >
          {fillBusy === 'row' ? 'Filling…' : 'Fill row gap'}
        </Button>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          disabled={fillBusy != null}
          onClick={() => setConfirmFill('column')}
        >
          {fillBusy === 'column' ? 'Filling…' : 'Fill column data'}
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={() => onJobsSheetOpenChange(true)}>
          Jobs{activeCount > 0 ? ` (${activeCount})` : ''}
        </Button>
      </div>

      {refGapError ? <p className="text-sm text-destructive">{refGapError}</p> : null}
      {snapshotGapError ? <p className="text-sm text-destructive">{snapshotGapError}</p> : null}
      {barsGapError ? <p className="text-sm text-destructive">{barsGapError}</p> : null}
      {checkMsg ? <p className="text-sm text-muted-foreground">{checkMsg}</p> : null}

      <Sheet open={jobsSheetOpen} onOpenChange={onJobsSheetOpenChange}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Option coverage jobs</SheetTitle>
          </SheetHeader>
          <div className="mt-4 space-y-2">
            {items.length === 0 ? (
              <p className="text-sm text-muted-foreground">No jobs enqueued this session.</p>
            ) : (
              items.map(it => (
                <div key={it.job_id} className="rounded-md border px-3 py-2 text-xs font-mono">
                  <div className="font-semibold">{it.symbol}</div>
                  <div className="text-muted-foreground">{it.kindLabel}</div>
                  <div>
                    {it.job_id.slice(0, 8)}… · {it.status}
                    {it.deduplicated ? ' (dedup)' : ''}
                  </div>
                  {it.error ? <div className="text-destructive">{it.error}</div> : null}
                </div>
              ))
            )}
          </div>
        </SheetContent>
      </Sheet>

      <ConfirmDialog
        open={confirmFill === 'row'}
        title="Fill row gap"
        message="Enqueue Celery jobs for pool symbols with non-zero gap after Check. This may trigger many Massive sync tasks."
        confirmLabel="Confirm"
        confirming={fillBusy === 'row'}
        onConfirm={() => void runFillRow()}
        onCancel={() => setConfirmFill(null)}
      />
      <ConfirmDialog
        open={confirmFill === 'column'}
        title="Fill column data"
        message="Enqueue column backfill jobs for symbols in the compare pool. Review eligibility on the server before running in production."
        confirmLabel="Confirm"
        confirming={fillBusy === 'column'}
        onConfirm={() => void runFillColumn()}
        onCancel={() => setConfirmFill(null)}
      />
    </>
  )
})
