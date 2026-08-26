import { AiUsageTile } from '@/components/cockpit/AiUsageTile'
import { Button } from '@/components/ui/button'
import {
  COPILOT_MODELS,
  PROVIDER_LABELS,
  type CopilotModelId,
} from '@/lib/cockpit/modelCatalog'
import { copilotSessionStore, useCopilotSession } from '@/hooks/useCopilotSession'
import { useCockpitDrawer, type CockpitDisplayMode } from '@/hooks/useCockpitDrawer'
import { SegmentControl } from '@/components/data-display'

export function SettingsTab() {
  const { model, lastError, clearSession, setModel } = useCopilotSession()
  const { mode, setMode } = useCockpitDrawer()
  const modelMeta = COPILOT_MODELS.find((m) => m.id === model)

  const byProvider = COPILOT_MODELS.reduce(
    (acc, m) => {
      if (!acc[m.provider]) acc[m.provider] = []
      acc[m.provider].push(m)
      return acc
    },
    {} as Record<string, typeof COPILOT_MODELS>,
  )

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
        <p className="text-dense-label font-medium">Display</p>
        <SegmentControl
          value={mode}
          onChange={(v) => setMode(v as CockpitDisplayMode)}
          options={[
            { value: 'overlay', label: 'Overlay' },
            { value: 'dock', label: 'Dock' },
          ]}
          size="sm"
        />
        <p className="text-dense-caption text-muted-foreground">
          Dock shifts main content left when Cockpit is open (400px).
        </p>
      </div>

      <div className="rounded border border-border/50 px-2 py-2 space-y-2">
        <p className="text-dense-label font-medium">Model</p>
        {(Object.keys(byProvider) as Array<keyof typeof PROVIDER_LABELS>).map((provider) => (
          <div key={provider} className="space-y-1">
            <p className="text-dense-caption text-muted-foreground">{PROVIDER_LABELS[provider]}</p>
            <div className="flex flex-col gap-0.5">
              {byProvider[provider].map((m) => (
                <button
                  key={m.id}
                  type="button"
                  className={`flex items-center justify-between rounded px-2 py-1 text-left text-dense-meta hover:bg-secondary/80 ${
                    model === m.id ? 'bg-secondary font-medium' : ''
                  }`}
                  onClick={() => setModel(m.id as CopilotModelId)}
                >
                  <span>{m.label}</span>
                  {m.costPerMtokIn != null ? (
                    <span className="text-dense-caption text-muted-foreground tabular-nums">
                      ${m.costPerMtokIn}/${m.costPerMtokOut ?? 0} /M
                    </span>
                  ) : null}
                </button>
              ))}
            </div>
          </div>
        ))}
        <p className="text-dense-caption text-muted-foreground">
          Active: <span className="font-mono">{modelMeta?.label ?? model}</span>
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
