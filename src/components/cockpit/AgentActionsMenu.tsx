import { useNavigate } from 'react-router-dom'
import { Beaker, BookmarkPlus, Moon, Sunrise, Zap } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useCockpitContext } from '@/hooks/useCockpitContext'
import { useCockpitPins } from '@/hooks/useCockpitPins'
import { cockpitDrawerStore } from '@/hooks/useCockpitDrawer'
import { useRunEodAgent, useRunMorningAgent } from '@/hooks/useResearchDrafts'
import { saveHypothesisIntentStore } from '@/store/saveHypothesisIntentStore'

/**
 * Agent + workspace commands (Wave RS-UX6).
 *
 * Replaces the old `Actions` tab, which mixed three unrelated things: agent
 * triggers (verbs with side effects), Lab navigation links that duplicated the
 * left sidebar one-for-one, and a freshness lamp grid that was not an action at
 * all.  Only the verbs survive, and they sit next to the composer because that
 * is where commands are issued.  The nav links are gone (the sidebar has
 * IV Radar / Vol Surface / IV-RV Spread / OpEx Cycle already); the lamps moved
 * into the context popover.
 *
 * D10: observe-only. Nothing here places or arms an order.
 */
export function AgentActionsMenu({ disabled }: { disabled?: boolean }) {
  const navigate = useNavigate()
  const ctx = useCockpitContext()
  const pins = useCockpitPins()
  const hypId = pins.focusedHypothesisId ?? pins.hypothesisIds[0] ?? null
  const morning = useRunMorningAgent()
  const eod = useRunEodAgent()

  const busy = morning.isPending || eod.isPending

  function runAndRevealInbox(run: typeof morning) {
    run.mutate(undefined, {
      onSuccess: () => cockpitDrawerStore.getState().revealInbox(),
    })
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={disabled}
          className="h-6 shrink-0 gap-1 px-1.5 text-dense-caption text-muted-foreground hover:text-foreground"
          aria-label="Agent actions"
          title="Agent actions"
        >
          <Zap className={busy ? 'size-3 animate-pulse text-primary' : 'size-3'} />
          Agents
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" side="top" className="z-[250] min-w-[15rem]">
        <DropdownMenuLabel className="text-dense-caption font-normal text-muted-foreground">
          Run now — drafts land in the inbox
        </DropdownMenuLabel>
        <DropdownMenuItem
          disabled={morning.isPending}
          onSelect={(e) => {
            e.preventDefault()
            runAndRevealInbox(morning)
          }}
        >
          <Sunrise className="mr-2 size-3.5" />
          <span className="flex-1">Morning Prep</span>
          {morning.isPending ? (
            <span className="text-dense-micro text-muted-foreground">Running…</span>
          ) : null}
        </DropdownMenuItem>
        <DropdownMenuItem
          disabled={eod.isPending}
          onSelect={(e) => {
            e.preventDefault()
            runAndRevealInbox(eod)
          }}
        >
          <Moon className="mr-2 size-3.5" />
          <span className="flex-1">EOD Review</span>
          {eod.isPending ? (
            <span className="text-dense-micro text-muted-foreground">Running…</span>
          ) : null}
        </DropdownMenuItem>

        <DropdownMenuSeparator />
        <DropdownMenuLabel className="text-dense-caption font-normal text-muted-foreground">
          This session
        </DropdownMenuLabel>
        <DropdownMenuItem
          onSelect={() =>
            saveHypothesisIntentStore.open({
              originPage: 'cockpit',
              defaultTitle: `${ctx.symbol} research note`,
              defaultSymbols: [ctx.symbol],
              defaultTags: ['cockpit'],
            })
          }
        >
          <BookmarkPlus className="mr-2 size-3.5" />
          Save as Hypothesis
        </DropdownMenuItem>
        <DropdownMenuItem
          disabled={!hypId}
          onSelect={() => {
            if (!hypId) return
            navigate(
              `/research/backtest?tab=event-query&hypothesis_id=${encodeURIComponent(hypId)}`,
            )
          }}
        >
          <Beaker className="mr-2 size-3.5" />
          <span className="flex-1">Run Event Query</span>
          {!hypId ? (
            <span className="text-dense-micro text-muted-foreground">pin one</span>
          ) : null}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
