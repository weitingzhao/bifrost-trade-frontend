import { useQuery } from '@tanstack/react-query'
import { fetchCopilotUsage } from '@/api/aiCopilot'
import { ResearchAuthGap } from '@/components/auth/ResearchAuthGap'
import { COPILOT_MODELS, PROVIDER_LABELS, type CopilotModelId } from '@/lib/cockpit/modelCatalog'
import { copilotSpendLine } from '@/lib/copilot/copilotSpendLine'

/** 10px read-only spend on the composer. Model choice lives in Settings. */
export function CopilotSpendHint({ model }: { model: CopilotModelId }) {
  const q = useQuery({
    queryKey: ['research', 'copilot', 'usage'],
    queryFn: ({ signal }) => fetchCopilotUsage(signal),
    refetchInterval: 30_000,
    retry: 1,
  })
  const local = COPILOT_MODELS.find((m) => m.id === model)
  const provider = local ? PROVIDER_LABELS[local.provider] : null
  const cost = q.isSuccess ? q.data.cost_estimate_usd : null
  if (q.isError) {
    return (
      <div data-testid="copilot-spend-hint">
        <ResearchAuthGap
          error={q.error}
          onRetry={() => void q.refetch()}
          layout="banner"
          className="min-w-0"
        />
      </div>
    )
  }
  return (
    <p
      data-testid="copilot-spend-hint"
      className="min-w-0 truncate text-dense-caption text-muted-foreground"
      title="Today's chat spend estimate · pick the model in Copilot settings"
    >
      {copilotSpendLine({ providerLabel: provider, costUsd: cost })}
    </p>
  )
}
