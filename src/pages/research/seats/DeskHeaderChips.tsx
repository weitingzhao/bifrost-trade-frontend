import type { CopilotUsage } from '@/api/aiCopilot'
import { DenseTag } from '@/components/data-display'
import { cockpitDrawerStore } from '@/hooks/useCockpitDrawer'
import { copilotDockStore } from '@/hooks/useCopilotDock'
import { useCopilotModels } from '@/hooks/useCopilotModels'
import { useCopilotSession } from '@/hooks/useCopilotSession'
import { fmtUsd } from '@/lib/harness/runSpend'
import { cn } from '@/lib/utils'
import { newThreadProvider, spendAgainstCap } from '@/pages/research/seats/deskHeader'

const CHIP = 'inline-flex h-7 items-center gap-1.5 rounded-md border border-border bg-secondary/40 px-2 text-dense-meta'

/** "spent $x / $cap" with a bar — the figure the Desk's "Spent today" tile used to show. */
export function SpendChip({ usage }: { usage: CopilotUsage | undefined }) {
  if (!usage) {
    return (
      <span className={CHIP}>
        <span className="text-muted-foreground">spent</span>
        <span className="font-mono">—</span>
      </span>
    )
  }
  const { spent, cap, share, over } = spendAgainstCap(usage)
  return (
    <span className={CHIP} title="Chat and bridge spend today against the daily cap">
      <span className="text-muted-foreground">spent</span>
      <span className="font-mono tabular-nums">{fmtUsd(spent)}</span>
      {/* The cap is a budget, not a run cost: cents, not fmtUsd's third decimal. */}
      <span className="text-muted-foreground">/ ${cap.toFixed(2)}</span>
      {share != null ? (
        <span className="relative h-1 w-11 overflow-hidden rounded-full bg-background" aria-hidden>
          <span
            className={cn('absolute inset-y-0 left-0', over ? 'bg-destructive' : 'bg-primary')}
            style={{ width: `${share * 100}%` }}
          />
        </span>
      ) : null}
    </span>
  )
}

/** The provider a new thread will use; opens Settings, where it is changed. */
export function ProviderChip() {
  const { model } = useCopilotSession()
  const models = useCopilotModels()
  const p = newThreadProvider(model, models.data)

  const title =
    p.state === 'ready'
      ? `New threads use ${p.modelLabel}. Change it in Settings.`
      : p.state === 'not_configured'
        ? `New threads are set to ${p.modelLabel}, and this deployment has no ${p.provider} key — the chat stops with "not configured" instead of answering. Pick another model in Settings.`
        : models.isLoading
          ? `New threads use ${p.modelLabel}.`
          : `New threads use ${p.modelLabel}. The model list did not load, so whether this deployment can serve it is unchecked.`

  return (
    <button
      type="button"
      className={cn(CHIP, 'hover:bg-secondary')}
      title={title}
      onClick={() => {
        copilotDockStore.getState().open_()
        cockpitDrawerStore.getState().setTab('settings')
      }}
    >
      <span className="text-muted-foreground">provider</span>
      <span className="font-mono">{p.provider}</span>
      {p.state === 'not_configured' ? (
        <DenseTag variant="warning" size="cell">
          not configured
        </DenseTag>
      ) : p.state === 'unchecked' && !models.isLoading ? (
        <span className="text-muted-foreground">unchecked</span>
      ) : null}
    </button>
  )
}
