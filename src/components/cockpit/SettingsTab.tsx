import { AiUsageTile } from '@/components/cockpit/AiUsageTile'
import { Button } from '@/components/ui/button'
import { COPILOT_MODELS } from '@/lib/cockpit/modelCatalog'
import { copilotSessionStore, useCopilotSession } from '@/hooks/useCopilotSession'

export function SettingsTab() {
  const { model, lastError, clearSession } = useCopilotSession()
  const modelMeta = COPILOT_MODELS.find((m) => m.id === model)

  return (
    <div className="space-y-3 py-1">
      <div className="space-y-1">
        <p className="text-dense-label font-medium">Cockpit settings</p>
        <p className="text-dense-meta text-muted-foreground leading-snug">
          Pins and tab preference persist in localStorage (D-RS-E-b). LLM keys stay on the
          Research API — this UI only talks to <span className="font-mono">/research/copilot/*</span>.
        </p>
      </div>

      <AiUsageTile />

      <div className="rounded border border-border/50 px-2 py-2 space-y-1">
        <p className="text-dense-label font-medium">Provider</p>
        <p className="text-dense-meta">
          Active model:{' '}
          <span className="font-mono">{modelMeta?.label ?? model}</span>
        </p>
        <p className="text-dense-caption text-muted-foreground">
          Switch models from the Copilot tab composer. Provider:{' '}
          {modelMeta?.provider ?? 'unknown'}.
        </p>
        {lastError ? (
          <p className="text-dense-meta text-destructive">Last error: {lastError}</p>
        ) : (
          <p className="text-dense-caption text-muted-foreground">No recent provider error</p>
        )}
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
