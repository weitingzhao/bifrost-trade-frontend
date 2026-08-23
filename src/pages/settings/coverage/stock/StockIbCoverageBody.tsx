import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { IbStockCoveragePanel } from '@/pages/settings/coverage/stock/IbStockCoveragePanel'
import { WatchlistEodPreviewDialog } from '@/pages/settings/coverage/stock/WatchlistEodPreviewDialog'
import { useBarsCoverage } from '@/pages/settings/coverage/stock/useBarsCoverage'

export function StockIbCoverageBody() {
  const cov = useBarsCoverage()

  return (
    <>
      <IbStockCoveragePanel
        coverage={cov.coverage}
        coveragePolicy={cov.coveragePolicy}
        coverageLoading={cov.coverageLoading}
        coverageError={cov.coverageError}
        deleteSymbolError={cov.deleteSymbolError}
        deletingSymbol={cov.deletingSymbol}
        backfillSymbol={cov.backfillSymbol}
        backfillMessage={cov.backfillMessage}
        isTradingDay={cov.isTradingDay}
        status={cov.status}
        coverageGroups={cov.coverageGroups}
        indicesRefreshLoading={cov.indicesRefreshLoading}
        indicesRefreshMessage={cov.indicesRefreshMessage}
        watchlistRefreshMessage={cov.watchlistRefreshMessage}
        watchlistPreviewLoading={cov.watchlistPreviewLoading}
        watchlistRefreshRunning={cov.watchlistRefreshRunning}
        backfillIsTest={cov.backfillIsTest}
        needWatchlistDryRun={cov.needWatchlistDryRun}
        backfillApiIntervalSec={cov.backfillApiIntervalSec}
        onLoadCoverage={() => void cov.loadCoverage()}
        onRefreshIndices={() => void cov.handleRefreshIndices()}
        onWatchlistEodRefresh={() => void cov.handleWatchlistEodRefreshClick()}
        onOpenReset={cov.handleOpenReset}
        onOpenPull={cov.handleOpenPull}
        onBackfillIsTestChange={cov.setBackfillIsTest}
        onNeedWatchlistDryRunChange={cov.setNeedWatchlistDryRun}
        onBackfillApiIntervalSecChange={cov.setBackfillApiIntervalSec}
      />

      <WatchlistEodPreviewDialog
        open={cov.watchlistRefreshPreview !== null}
        preview={cov.watchlistRefreshPreview}
        backfillIsTest={cov.backfillIsTest}
        backfillApiIntervalSec={cov.backfillApiIntervalSec}
        running={cov.watchlistRefreshRunning}
        onClose={() => cov.setWatchlistRefreshPreview(null)}
        onConfirm={() => void cov.confirmWatchlistEodRefresh()}
      />

      <ConfirmDialog
        open={cov.resetConfirmSymbol !== null}
        title="Delete stored bars"
        message={
          cov.resetConfirmSymbol
            ? `Remove ${cov.resetConfirmIsIndex ? 'index' : 'watchlist'} bar rows for ${cov.resetConfirmSymbol}?`
            : ''
        }
        confirmLabel="Confirm delete"
        confirming={cov.deletingSymbol !== null}
        onConfirm={() => void cov.handleConfirmReset()}
        onCancel={() => {
          cov.setResetConfirmSymbol(null)
          cov.setResetConfirmIsIndex(false)
        }}
      />

      <ConfirmDialog
        open={cov.pullModalSymbol !== null}
        title="Enqueue Polygon ingest"
        message={
          cov.pullModalSymbol
            ? `Queue Market Data Plugin jobs for ${cov.pullModalSymbol} (${cov.pullSelectedPeriods.join(', ')})?`
            : ''
        }
        confirmLabel="Enqueue"
        confirming={cov.backfillSymbol !== null}
        onConfirm={() => void cov.handleConfirmPull()}
        onCancel={() => {
          cov.setPullModalSymbol(null)
          cov.setPullModalIsIndex(false)
        }}
      />
    </>
  )
}
