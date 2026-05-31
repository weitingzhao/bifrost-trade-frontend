import { useState } from 'react'
import { RefreshCw } from 'lucide-react'
import { PageShell } from '@/components/layout'
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
import styles from './modelAnalysis.module.css'

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
    <PageShell>
      <div className={styles.pageCard}>
        <div className={styles.headerRow}>
          <div className="min-w-0 space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-semibold tracking-tight">
                Portfolio / Model Analysis
              </h1>
              <InfoTooltip text={MODEL_ANALYSIS_INFO} />
              <span
                className={styles.hypotheticalBadge}
                title="Hypothetical — not actual performance"
              >
                ⚠ Hypothetical
              </span>
            </div>
          </div>

          <div className={styles.headerActions}>
            <div
              className={styles.accountPills}
              role="group"
              aria-label="IB account for model analysis"
            >
              <button
                type="button"
                className={cn(
                  styles.accountPill,
                  accountId === accounts.hostId && styles.accountPillActive,
                )}
                disabled={!accounts.hostSelectable}
                onClick={() => accounts.hostSelectable && setSelectedAccount(accounts.hostId)}
                title={
                  accounts.hostId
                    ? `Host: ${accounts.hostId}${accounts.hostSelectable ? '' : ' (not in current account list)'}`
                    : 'Host account ID not configured (Settings → IB / Event account)'
                }
                aria-pressed={accountId === accounts.hostId}
              >
                Host
              </button>
              <button
                type="button"
                className={cn(
                  styles.accountPill,
                  accountId === accounts.secondaryId && styles.accountPillActive,
                )}
                disabled={!accounts.secondarySelectable}
                onClick={() =>
                  accounts.secondarySelectable && setSelectedAccount(accounts.secondaryId)
                }
                title={
                  accounts.secondaryId
                    ? `Secondary: ${accounts.secondaryId}${accounts.secondarySelectable ? '' : ' (not in current account list)'}`
                    : 'Secondary account ID not configured (Settings → IB / Event account)'
                }
                aria-pressed={accountId === accounts.secondaryId}
              >
                Secondary
              </button>
            </div>
            <Button
              variant="outline"
              size="sm"
              disabled={!accountId || isFetching}
              onClick={() => void refetch()}
            >
              <RefreshCw className={cn('h-3.5 w-3.5', isFetching && 'animate-spin')} />
              {isFetching ? 'Loading…' : 'Refresh'}
            </Button>
          </div>
        </div>

        <div className={styles.disclaimer}>
          {data?.disclaimer ?? MODEL_ANALYSIS_DEFAULT_DISCLAIMER}
        </div>

        {showConfigHint && (
          <div className={styles.configHint}>
            Host / Secondary account IDs from settings do not match any account in the current
            snapshot. Check <strong>event_host</strong>, <strong>trading</strong>, or{' '}
            <strong>event_secondary</strong> in GET /status{' '}
            <code className="text-xs">config.ib_client.account</code> (Settings IB / Event account).
          </div>
        )}

        {error != null && (
          <QueryErrorAlert error={error} onRetry={() => void refetch()} />
        )}

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
          <div className={styles.emptyState}>No positions found for {accountId}</div>
        )}

        {!accounts.hasSnapshotAccounts && !isLoading && (
          <div className={styles.emptyState}>
            No accounts in status. Ensure GET /status returns accounts (e.g. open Live or refresh).
          </div>
        )}
      </div>
    </PageShell>
  )
}
