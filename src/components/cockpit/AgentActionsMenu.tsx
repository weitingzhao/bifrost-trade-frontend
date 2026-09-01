import { useNavigate } from 'react-router-dom'
import {
  Beaker,
  BookmarkPlus,
  ChevronRight,
  Moon,
  Play,
  RefreshCw,
  Sparkles,
  Sunrise,
  Terminal,
  Zap,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useCockpitContext } from '@/hooks/useCockpitContext'
import { useCockpitPins } from '@/hooks/useCockpitPins'
import { cockpitDrawerStore } from '@/hooks/useCockpitDrawer'
import {
  useActiveObjectives,
  useAwaitingRuns,
  useCurateRun,
  useRunObjective,
} from '@/hooks/useLoopHarness'
import { useRunEodAgent, useRunMorningAgent } from '@/hooks/useResearchDrafts'
import { openCopilotInbox } from '@/lib/harness/loopCopilotPrefill'
import { copilotBubbleStore } from '@/hooks/useCopilotBubble'
import { saveHypothesisIntentStore } from '@/store/saveHypothesisIntentStore'

/**
 * Agent + workspace commands (Wave RS-UX6 + HC-2 Loop).
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
  const objectivesQ = useActiveObjectives()
  const awaitingQ = useAwaitingRuns()
  const runObjective = useRunObjective()
  const curateRun = useCurateRun()

  const objectives = objectivesQ.data?.items ?? []
  const latestAwaiting = awaitingQ.data?.items?.[0] ?? null

  const busy =
    morning.isPending ||
    eod.isPending ||
    runObjective.isPending ||
    curateRun.isPending

  function runAndRevealInbox(run: typeof morning) {
    run.mutate(undefined, {
      onSuccess: () => {
        copilotBubbleStore.getState().open_()
        cockpitDrawerStore.getState().revealInbox()
      },
    })
  }

  function runSingleObjective(objectiveId: string) {
    runObjective.mutate(objectiveId)
  }

  function curateLatestAwaiting() {
    if (!latestAwaiting) return
    curateRun.mutate(latestAwaiting.id)
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
          Loop harness — observe only (D10)
        </DropdownMenuLabel>
        {objectives.length === 0 ? (
          <DropdownMenuItem disabled>
            <Play className="mr-2 size-3.5" />
            <span className="flex-1">Run active objective</span>
            <span className="text-dense-micro text-muted-foreground">none</span>
          </DropdownMenuItem>
        ) : objectives.length === 1 ? (
          <DropdownMenuItem
            disabled={runObjective.isPending}
            onSelect={(e) => {
              e.preventDefault()
              runSingleObjective(objectives[0]!.id)
            }}
          >
            <Play className="mr-2 size-3.5" />
            <span className="min-w-0 flex-1 truncate">Run {objectives[0]!.title}</span>
          </DropdownMenuItem>
        ) : (
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>
              <Play className="mr-2 size-3.5" />
              <span className="flex-1">Run active objective</span>
              <ChevronRight className="ml-auto size-3.5" />
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent className="z-[260] max-w-[14rem]">
              {objectives.map((o) => (
                <DropdownMenuItem
                  key={o.id}
                  disabled={runObjective.isPending}
                  onSelect={(e) => {
                    e.preventDefault()
                    runSingleObjective(o.id)
                  }}
                >
                  <span className="truncate">{o.title}</span>
                </DropdownMenuItem>
              ))}
            </DropdownMenuSubContent>
          </DropdownMenuSub>
        )}
        <DropdownMenuItem
          disabled={!latestAwaiting || curateRun.isPending}
          onSelect={(e) => {
            e.preventDefault()
            curateLatestAwaiting()
          }}
        >
          <Sparkles className="mr-2 size-3.5" />
          <span className="flex-1">Curator on latest awaiting</span>
          {!latestAwaiting ? (
            <span className="text-dense-micro text-muted-foreground">none</span>
          ) : curateRun.isPending ? (
            <span className="text-dense-micro text-muted-foreground">Running…</span>
          ) : null}
        </DropdownMenuItem>
        <DropdownMenuItem
          onSelect={(e) => {
            e.preventDefault()
            openCopilotInbox()
          }}
        >
          <RefreshCw className="mr-2 size-3.5" />
          <span className="flex-1">Open Decision Inbox</span>
        </DropdownMenuItem>
        <DropdownMenuItem
          onSelect={() => navigate('/research/loop/harness')}
        >
          <Terminal className="mr-2 size-3.5" />
          <span className="flex-1">Open Harness Console</span>
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
