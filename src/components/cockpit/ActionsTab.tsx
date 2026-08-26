import { useNavigate } from 'react-router-dom'
import {
  Activity,
  Beaker,
  BookmarkPlus,
  CalendarDays,
  Compass,
  LineChart,
  Moon,
  Sunrise,
} from 'lucide-react'
import { FreshnessLampGrid } from '@/components/cockpit/FreshnessLampGrid'
import { QuickActionButton } from '@/components/cockpit/QuickActionButton'
import { useCockpitContext } from '@/hooks/useCockpitContext'
import { useCockpitPins } from '@/hooks/useCockpitPins'
import { cockpitDrawerStore } from '@/hooks/useCockpitDrawer'
import { useRunEodAgent, useRunMorningAgent } from '@/hooks/useResearchDrafts'
import { saveHypothesisIntentStore } from '@/store/saveHypothesisIntentStore'

export function ActionsTab() {
  const navigate = useNavigate()
  const ctx = useCockpitContext()
  const pins = useCockpitPins()
  const hypId = pins.focusedHypothesisId ?? pins.hypothesisIds[0] ?? null
  const morning = useRunMorningAgent()
  const eod = useRunEodAgent()

  function go(path: string) {
    navigate(path)
    cockpitDrawerStore.getState().close()
  }

  function withSymbol(base: string) {
    const sep = base.includes('?') ? '&' : '?'
    return `${base}${sep}symbol=${encodeURIComponent(ctx.symbol)}`
  }

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <p className="text-dense-caption font-semibold uppercase tracking-wide text-muted-foreground">
          Agents
        </p>
        <div className="flex flex-col gap-1.5">
          <QuickActionButton
            icon={Sunrise}
            label="Run Morning Prep now"
            hint={
              morning.isPending
                ? 'Running…'
                : morning.isSuccess
                  ? `Created ${morning.data?.count ?? 0} draft(s)`
                  : morning.isError
                    ? 'Failed — check research-api'
                    : 'CronJob + on-demand (D-RS-E-f)'
            }
            disabled={morning.isPending}
            onClick={() => {
              morning.mutate(undefined, {
                onSuccess: () => cockpitDrawerStore.getState().openWithTab('inbox'),
              })
            }}
          />
          <QuickActionButton
            icon={Moon}
            label="Run EOD Review now"
            hint={
              eod.isPending
                ? 'Running…'
                : eod.isSuccess
                  ? `Created ${eod.data?.count ?? 0} draft(s)`
                  : eod.isError
                    ? 'Failed — check research-api'
                    : 'Proposes verdicts; approve in Inbox'
            }
            disabled={eod.isPending}
            onClick={() => {
              eod.mutate(undefined, {
                onSuccess: () => cockpitDrawerStore.getState().openWithTab('inbox'),
              })
            }}
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <p className="text-dense-caption font-semibold uppercase tracking-wide text-muted-foreground">
          Quick actions
        </p>
        <div className="flex flex-col gap-1.5">
          <QuickActionButton
            icon={BookmarkPlus}
            label="Save as Hypothesis"
            hint="Open save dialog with current symbol pre-filled"
            onClick={() => {
              saveHypothesisIntentStore.open({
                originPage: 'cockpit',
                defaultTitle: `${ctx.symbol} research note`,
                defaultSymbols: [ctx.symbol],
                defaultTags: ['cockpit'],
              })
            }}
          />
          <QuickActionButton
            icon={Beaker}
            label="Run Event Query"
            hint={
              hypId
                ? `On focused hypothesis ${hypId.slice(0, 8)}…`
                : 'Pin or focus a hypothesis first'
            }
            disabled={!hypId}
            onClick={() => {
              if (!hypId) return
              go(
                `/research/backtest?tab=event-query&hypothesis_id=${encodeURIComponent(hypId)}`,
              )
            }}
          />
          <QuickActionButton
            icon={LineChart}
            label="Open Vol Surface"
            hint={ctx.symbol}
            onClick={() => go(withSymbol('/research/vol-surface-lab'))}
          />
          <QuickActionButton
            icon={Activity}
            label="Open IV-RV Spread"
            hint={ctx.symbol}
            onClick={() => go(withSymbol('/research/vrp-lab'))}
          />
          <QuickActionButton
            icon={CalendarDays}
            label="Open OpEx Cycle"
            hint={ctx.symbol}
            onClick={() => go(withSymbol('/research/opex-cycle-lab'))}
          />
          <QuickActionButton
            icon={Compass}
            label="Back to Research Home"
            hint="/research"
            onClick={() => go('/research')}
          />
        </div>
      </div>

      <FreshnessLampGrid />
    </div>
  )
}
