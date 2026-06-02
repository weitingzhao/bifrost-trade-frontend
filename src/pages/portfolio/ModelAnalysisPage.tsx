import { useState } from 'react'
import { RefreshCw } from 'lucide-react'
import { PageHeader, PageShell } from '@/components/layout'
import { InfoTooltip } from '@/components/ui/InfoTooltip'
import { QueryErrorAlert } from '@/components/ui/QueryErrorAlert'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { useModelAnalysis, useModelAnalysisAccounts } from '@/hooks/useModelAnalysis'
import {
  MODEL_ANALYSIS_DEFAULT_DISCLAIMER,
  MODEL_ANALYSIS_INFO,
} from '@/utils/modelAnalysisExplain'
import { cn } from '@/lib/utils'
import {
  AccountStressSection,
  ModelAnalysisMainTable,
  ModelAnalysisSummaryStrip,
} from './modelAnalysis/ModelAnalysisSections'
import { ModelAnalysisAccountPills } from './modelAnalysis/ModelAnalysisAccountPills'
import {
  modelAnalysisConfigHintClass,
  modelAnalysisDisclaimerClass,
  modelAnalysisEmptyHintClass,
  modelAnalysisHypotheticalBadgeClass,
  modelAnalysisPageStackClass,
} from './modelAnalysis/modelAnalysisUi'

export default function ModelAnalysisPage() {
  const accounts = useModelAnalysisAccounts()
  const [selectedAccount, setSelectedAccount] = useState<string | null>(null)
  const accountId = selectedAccount ?? accounts.initialAccountId

  const { data, isLoading, isFetching, error, refetch } = useModelAnalysis(accountId)

  const showConfigHint =
    !accounts.hostSelectable &&
    !accounts.secondarySelectable &&
    accounts.hasSnapshotAccounts

  return (
    <PageShell padding="compact" className={modelAnalysisPageStackClass}>
      <PageHeader
        breadcrumb={
          <p className="text-xs text-primary/90 font-medium">Portfolio / Model Analysis</p>
        }
        title={
          <span className="inline-flex flex-wrap items-center gap-2">
            Model Analysis
            <InfoTooltip text={MODEL_ANALYSIS_INFO} />
            <span
              className={modelAnalysisHypotheticalBadgeClass}
              title="Hypothetical — not actual performance"
            >
              ⚠ Hypothetical
            </span>
          </span>
        }
        actions={
          <>
            <ModelAnalysisAccountPills
              accountId={accountId}
              hostId={accounts.hostId}
              secondaryId={accounts.secondaryId}
              hostSelectable={accounts.hostSelectable}
              secondarySelectable={accounts.secondarySelectable}
              onSelect={setSelectedAccount}
            />
            <Button
              variant="outline"
              size="sm"
              disabled={!accountId || isFetching}
              onClick={() => void refetch()}
            >
              <RefreshCw className={cn('h-3.5 w-3.5', isFetching && 'animate-spin')} />
              {isFetching ? 'Loading…' : 'Refresh'}
            </Button>
          </>
        }
      />

      <div className={modelAnalysisDisclaimerClass}>
        {data?.disclaimer ?? MODEL_ANALYSIS_DEFAULT_DISCLAIMER}
      </div>

      {showConfigHint && (
        <div className={modelAnalysisConfigHintClass}>
          Host / Secondary account IDs from settings do not match any account in the current
          snapshot. Check <strong>event_host</strong>, <strong>trading</strong>, or{' '}
          <strong>event_secondary</strong> in GET /status{' '}
          <code className="text-xs">config.ib_client.account</code> (Settings IB / Event account).
        </div>
      )}

      {error != null && <QueryErrorAlert error={error} onRetry={() => void refetch()} />}

      {isLoading && accountId && (
        <div className="space-y-3">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-64 w-full rounded-lg" />
        </div>
      )}

      {data && !isLoading && (
        <>
          <ModelAnalysisSummaryStrip data={data} />
          <AccountStressSection data={data} />
          <ModelAnalysisMainTable data={data} />
        </>
      )}

      {data && !isLoading && data.per_underlying.length === 0 && accountId && (
        <div className={modelAnalysisEmptyHintClass}>No positions found for {accountId}</div>
      )}

      {!accounts.hasSnapshotAccounts && !isLoading && (
        <div className={modelAnalysisEmptyHintClass}>
          No accounts in status. Ensure GET /status returns accounts (e.g. open Live or refresh).
        </div>
      )}
    </PageShell>
  )
}
