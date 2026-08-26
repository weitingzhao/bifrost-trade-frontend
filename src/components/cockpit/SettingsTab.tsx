import { AiUsageTile } from '@/components/cockpit/AiUsageTile'
import { Button } from '@/components/ui/button'
import {
  COPILOT_MODELS,
  PROVIDER_LABELS,
  type CopilotModelId,
} from '@/lib/cockpit/modelCatalog'
import { copilotSessionStore, useCopilotSession } from '@/hooks/useCopilotSession'
import { useCopilotModels } from '@/hooks/useCopilotModels'

type ModelRow = {
  id: CopilotModelId
  label: string
  provider: keyof typeof PROVIDER_LABELS
  cost_per_mtok_in?: number
  cost_per_mtok_out?: number
  note?: string
  available: boolean
}

export function SettingsTab() {
  const { model, lastError, clearSession, setModel } = useCopilotSession()
  const { data: modelData, isLoading, isError } = useCopilotModels()

  // Merge static catalog with the deployment's actual availability so users
  // can see what exists in principle but the picker only lets them choose
  // real, configured ones.  If the backend hasn't answered (or 404s), we
  // fall back to "everything is available" to avoid greying out the whole
  // list during development.
  const rows: ModelRow[] = COPILOT_MODELS.map((m) => {
    const remote = modelData?.available.find((r) => r.id === m.id)
    return {
      id: m.id,
      label: m.label,
      provider: m.provider,
      cost_per_mtok_in: remote?.cost_per_mtok_in ?? m.costPerMtokIn,
      cost_per_mtok_out: remote?.cost_per_mtok_out ?? m.costPerMtokOut,
      note: remote?.note,
      available: modelData ? Boolean(remote) : true,
    }
  })

  // Also surface any backend model that isn't in the frontend catalog yet
  // (e.g. a preview model dropped in via env-only config).
  if (modelData) {
    for (const r of modelData.available) {
      if (!rows.find((row) => row.id === r.id)) {
        rows.push({
          id: r.id as CopilotModelId,
          label: r.label,
          provider: r.provider,
          cost_per_mtok_in: r.cost_per_mtok_in,
          cost_per_mtok_out: r.cost_per_mtok_out,
          note: r.note,
          available: true,
        })
      }
    }
  }

  const activeMeta = rows.find((r) => r.id === model)

  const byProvider = rows.reduce(
    (acc, m) => {
      if (!acc[m.provider]) acc[m.provider] = []
      acc[m.provider].push(m)
      return acc
    },
    {} as Record<keyof typeof PROVIDER_LABELS, ModelRow[]>,
  )

  // Only render providers that have at least one available model (unless
  // the backend list is empty / errored, in which case show everything so
  // the user isn't staring at a blank pane).
  const showAll = !modelData || (modelData.available.length === 0 && !isLoading)
  const providersToShow = (
    Object.keys(byProvider) as Array<keyof typeof PROVIDER_LABELS>
  ).filter((p) => showAll || byProvider[p].some((m) => m.available))

  return (
    <div className="space-y-3 py-1">
      <div className="space-y-1">
        <p className="text-dense-label font-medium">Cockpit settings</p>
        <p className="text-dense-meta text-muted-foreground leading-snug">
          Model preference persists in localStorage (D-RS-F-c). LLM keys stay on the Research API.
        </p>
      </div>

      <AiUsageTile />

      <div className="rounded border border-border/50 px-2 py-2 space-y-2">
        <div className="flex items-baseline justify-between gap-2">
          <p className="text-dense-label font-medium">Model</p>
          {isLoading ? (
            <span className="text-dense-caption text-muted-foreground">加载中…</span>
          ) : isError ? (
            <span className="text-dense-caption text-destructive">
              无法获取可用模型（后端旧版本？）
            </span>
          ) : modelData ? (
            <span className="text-dense-caption text-muted-foreground">
              {modelData.available.length} / {modelData.total_catalog} 已配置
            </span>
          ) : null}
        </div>
        {providersToShow.map((provider) => (
          <div key={provider} className="space-y-1">
            <p className="text-dense-caption text-muted-foreground">
              {PROVIDER_LABELS[provider]}
            </p>
            <div className="flex flex-col gap-0.5">
              {byProvider[provider].map((m) => {
                const disabled = !m.available
                const isActive = model === m.id
                return (
                  <button
                    key={m.id}
                    type="button"
                    disabled={disabled}
                    className={`flex flex-col rounded px-2 py-1 text-left text-dense-meta transition-colors ${
                      isActive ? 'bg-secondary font-medium' : ''
                    } ${
                      disabled
                        ? 'cursor-not-allowed opacity-40'
                        : 'hover:bg-secondary/80'
                    }`}
                    onClick={() => setModel(m.id)}
                    title={disabled ? 'This model is not configured on the backend' : undefined}
                  >
                    <span className="flex items-center justify-between gap-2">
                      <span className="flex items-center gap-1.5">
                        <span>{m.label}</span>
                        {disabled ? (
                          <span className="rounded border border-border/60 px-1 text-dense-caption text-muted-foreground/70">
                            未配置
                          </span>
                        ) : null}
                      </span>
                      {m.cost_per_mtok_in != null ? (
                        <span className="text-dense-caption text-muted-foreground tabular-nums shrink-0">
                          ${m.cost_per_mtok_in}/${m.cost_per_mtok_out ?? 0} /M
                        </span>
                      ) : null}
                    </span>
                    {m.note ? (
                      <span className="text-dense-caption text-muted-foreground leading-snug mt-0.5">
                        {m.note}
                      </span>
                    ) : null}
                  </button>
                )
              })}
            </div>
          </div>
        ))}
        <p className="text-dense-caption text-muted-foreground">
          Active: <span className="font-mono">{activeMeta?.label ?? model}</span>
        </p>
        {lastError ? (
          <p className="text-dense-meta text-destructive">Last error: {lastError}</p>
        ) : null}
      </div>

      <Button
        type="button"
        variant="outline"
        size="sm"
        className="h-7 text-dense-meta"
        onClick={() => {
          clearSession()
          copilotSessionStore.setCapBreached(false)
        }}
      >
        Clear Copilot session
      </Button>
    </div>
  )
}
