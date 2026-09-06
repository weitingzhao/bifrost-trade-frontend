/**
 * The model band — what the market can do to this book, and what return the
 * book is paid for that risk. Hypothetical, computed by bifrost-trade-core
 * for one account at a time: that is why the band carries its own account
 * control and always says, in words, which account its figures are for.
 * Pure props; `useModelBand` owns the query and the reader's choices.
 */
import { RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { InfoTooltip } from '@/components/ui/InfoTooltip'
import { QueryErrorAlert } from '@/components/ui/QueryErrorAlert'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import { MODEL_ANALYSIS_DEFAULT_DISCLAIMER, MODEL_ANALYSIS_INFO } from '@/utils/modelAnalysisExplain'
import type { ModelAnalysisAccountChoice, ModelBandAccount, ModelBandSide } from '@/utils/modelAnalysisAccounts'
import type { ModelAnalysisResponse } from '@/types/modelAnalysis'
import { ModelAnalysisAccountPills } from './ModelAnalysisAccountPills'
import { modelBandScopeSentence } from './modelBandScope'
import { AccountStressSection, ModelAnalysisMainTable, ModelAnalysisSummaryStrip } from './ModelAnalysisSections'
import {
  modelAnalysisConfigHintClass,
  modelAnalysisDisclaimerClass,
  modelAnalysisEmptyHintClass,
  modelAnalysisHypotheticalBadgeClass,
  modelBandBodyClass,
  modelBandHeaderClass,
  modelBandScopeLineClass,
  modelBandSectionClass,
  modelBandTitleClass,
} from './modelAnalysisUi'

export interface ModelBandTable {
  open: boolean
  expandedSymbol: string | null
  onToggle: () => void
  onToggleSymbol: (symbol: string) => void
}

export interface ModelBandProps {
  accounts: ModelAnalysisAccountChoice
  account: ModelBandAccount
  onSideChange: (side: ModelBandSide) => void
  /** The page's symbol scope; the per-underlying table narrows with the rest of the page. */
  filterSymbol: string
  data: ModelAnalysisResponse | undefined
  isLoading: boolean
  isFetching: boolean
  error: unknown
  onRefresh: () => void
  table: ModelBandTable
}

export function ModelBandSection({
  accounts,
  account,
  onSideChange,
  filterSymbol,
  data,
  isLoading,
  isFetching,
  error,
  onRefresh,
  table,
}: ModelBandProps) {
  const showConfigHint = !accounts.hostSelectable && !accounts.secondarySelectable && accounts.hasSnapshotAccounts
  const loading = isLoading && Boolean(account.accountId)
  const entries = data?.per_underlying ?? []

  return (
    <section className={modelBandSectionClass} aria-label="Model" data-testid="model-band">
      <div className={modelBandHeaderClass}>
        <h2 className={modelBandTitleClass}>
          Model
          <InfoTooltip text={MODEL_ANALYSIS_INFO} />
          <span className={modelAnalysisHypotheticalBadgeClass} title="Hypothetical — not actual performance">
            ⚠ Hypothetical
          </span>
        </h2>
        <span className="ml-auto flex items-center gap-1.5">
          <ModelAnalysisAccountPills
            side={account.side}
            hostSelectable={accounts.hostSelectable}
            secondarySelectable={accounts.secondarySelectable}
            readOnly={account.locked}
            onSelect={onSideChange}
          />
          <Button variant="outline" size="sm" disabled={!account.accountId || isFetching} onClick={onRefresh}>
            <RefreshCw className={cn('h-3.5 w-3.5', isFetching && 'animate-spin')} />
            {isFetching ? 'Loading…' : 'Refresh'}
          </Button>
        </span>
      </div>
      <p className={modelBandScopeLineClass} data-testid="model-scope">
        {modelBandScopeSentence(account, accounts)}
      </p>

      <div className={modelBandBodyClass}>
        <div className={modelAnalysisDisclaimerClass}>{data?.disclaimer ?? MODEL_ANALYSIS_DEFAULT_DISCLAIMER}</div>

        {showConfigHint ? (
          <div className={modelAnalysisConfigHintClass}>
            Host / Secondary account IDs from settings do not match any account in the current snapshot. Check{' '}
            <strong>event_host</strong>, <strong>trading</strong>, or <strong>event_secondary</strong> in GET /status{' '}
            <code className="text-xs">config.ib_client.account</code> (Settings IB / Event account).
          </div>
        ) : null}

        {error != null ? <QueryErrorAlert error={error} onRetry={onRefresh} /> : null}

        {/* Fixed-height skeletons: `#model` scrolls to a band that is not still growing. */}
        {loading ? (
          <div className="space-y-3" data-testid="model-loading">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-64 w-full rounded-lg" />
          </div>
        ) : null}

        {data && !loading ? (
          <>
            <ModelAnalysisSummaryStrip data={data} />
            <AccountStressSection data={data} />
            <ModelAnalysisMainTable
              data={data}
              filterSymbol={filterSymbol}
              open={table.open}
              onToggle={table.onToggle}
              expandedSymbol={table.expandedSymbol}
              onToggleSymbol={table.onToggleSymbol}
            />
            {entries.length === 0 ? (
              <div className={modelAnalysisEmptyHintClass}>No positions found for {account.accountId}</div>
            ) : null}
          </>
        ) : null}

        {!accounts.hasSnapshotAccounts && !loading ? (
          <div className={modelAnalysisEmptyHintClass}>
            No accounts in status. Ensure GET /status returns accounts (e.g. open Live or refresh).
          </div>
        ) : null}
      </div>
    </section>
  )
}
