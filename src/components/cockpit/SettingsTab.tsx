import { useMemo } from 'react'
import { AiUsageTile } from '@/components/cockpit/AiUsageTile'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { cn } from '@/lib/utils'
import {
  COPILOT_MODELS,
  PROVIDER_LABELS,
  type CopilotModelId,
} from '@/lib/cockpit/modelCatalog'
import {
  TIER_LABELS,
  TIER_ORDER,
  compareModels,
  getModelMeta,
  modelPickerPrefs,
  type ModelTier,
} from '@/lib/cockpit/modelPreferences'
import { getModelPracticalAdvice } from '@/lib/cockpit/modelPickerAdvice'
import { copilotSessionStore, useCopilotSession } from '@/hooks/useCopilotSession'
import { useCopilotModels } from '@/hooks/useCopilotModels'

type ModelRow = {
  id: CopilotModelId | string
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
  const hidden = modelPickerPrefs.useHidden()

  const rows: ModelRow[] = useMemo(() => {
    const acc: ModelRow[] = COPILOT_MODELS.map((m) => {
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
    if (modelData) {
      for (const r of modelData.available) {
        if (!acc.find((row) => row.id === r.id)) {
          acc.push({
            id: r.id,
            label: r.label,
            provider: r.provider as keyof typeof PROVIDER_LABELS,
            cost_per_mtok_in: r.cost_per_mtok_in,
            cost_per_mtok_out: r.cost_per_mtok_out,
            note: r.note,
            available: true,
          })
        }
      }
    }
    return acc.sort((a, b) => compareModels(a.id, b.id))
  }, [modelData])

  const activeMeta = rows.find((r) => r.id === model)

  const byTier = useMemo(() => {
    const acc: Record<ModelTier, ModelRow[]> = {
      recommended: [],
      reasoning: [],
      advanced: [],
      trial: [],
    }
    for (const r of rows) acc[getModelMeta(r.id).tier].push(r)
    return acc
  }, [rows])

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
          <div className="min-w-0">
            <p className="text-dense-label font-medium">Model</p>
            <p className="text-dense-caption leading-snug text-muted-foreground">
              开关控制是否显示在聊天框的下拉里；点击行切换当前使用的模型。
            </p>
          </div>
          {isLoading ? (
            <span className="text-dense-caption text-muted-foreground shrink-0">加载中…</span>
          ) : isError ? (
            <span className="text-dense-caption text-destructive shrink-0">
              无法获取可用模型
            </span>
          ) : modelData ? (
            <span className="text-dense-caption text-muted-foreground shrink-0">
              {modelData.available.length} / {modelData.total_catalog} 已配置
            </span>
          ) : null}
        </div>

        {TIER_ORDER.map((tier) => {
          const tierRows = byTier[tier]
          if (tierRows.length === 0) return null
          return (
            <div key={tier} className="space-y-1">
              <p className="text-dense-micro font-semibold uppercase tracking-wide text-muted-foreground">
                {TIER_LABELS[tier]}
              </p>
              <ul className="flex flex-col gap-0.5">
                {tierRows.map((m) => {
                  const disabled = !m.available
                  const isActive = model === m.id
                  const isHidden = hidden.has(m.id)
                  const advice = getModelPracticalAdvice(m.id, m.note)
                  return (
                    <li
                      key={m.id}
                      className={cn(
                        'flex items-start gap-2 rounded px-2 py-1.5',
                        isActive && 'bg-secondary',
                        disabled && 'opacity-50',
                      )}
                    >
                      <button
                        type="button"
                        disabled={disabled}
                        onClick={() => setModel(m.id as CopilotModelId)}
                        className={cn(
                          'flex min-w-0 flex-1 flex-col text-left text-dense-meta',
                          !disabled && 'cursor-pointer hover:text-foreground',
                        )}
                        title={
                          disabled
                            ? 'This model is not configured on the backend'
                            : '点击设为当前模型'
                        }
                      >
                        <span className="flex items-center gap-1.5">
                          <span
                            className={cn(
                              'truncate',
                              isActive ? 'font-medium text-foreground' : 'text-foreground/90',
                            )}
                          >
                            {m.label}
                          </span>
                          <span className="text-dense-caption text-muted-foreground/70 truncate">
                            {m.id}
                          </span>
                          {disabled ? (
                            <span className="rounded border border-border/60 px-1 text-dense-caption text-muted-foreground/70">
                              未配置
                            </span>
                          ) : null}
                        </span>
                        <span className="text-dense-caption leading-snug text-muted-foreground line-clamp-2">
                          {advice}
                        </span>
                      </button>
                      <div className="flex shrink-0 flex-col items-end gap-1">
                        {m.cost_per_mtok_in != null ? (
                          <span className="text-dense-caption text-muted-foreground tabular-nums">
                            ${m.cost_per_mtok_in}/${m.cost_per_mtok_out ?? 0} /M
                          </span>
                        ) : null}
                        <label
                          className={cn(
                            'flex items-center gap-1 text-dense-caption text-muted-foreground',
                            disabled && 'cursor-not-allowed',
                          )}
                          title={
                            disabled
                              ? '模型未配置，无法在聊天框显示'
                              : isHidden
                                ? '打开：让此模型出现在聊天框下拉里'
                                : '关闭：把此模型从聊天框下拉里隐藏（不影响后端）'
                          }
                        >
                          <span>{isHidden ? '隐藏' : '显示'}</span>
                          <Switch
                            checked={!isHidden}
                            disabled={disabled}
                            onCheckedChange={(v) =>
                              modelPickerPrefs.setHidden(m.id, !v)
                            }
                            aria-label={
                              isHidden
                                ? `Show ${m.label} in composer`
                                : `Hide ${m.label} from composer`
                            }
                          />
                        </label>
                      </div>
                    </li>
                  )
                })}
              </ul>
            </div>
          )
        })}

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
