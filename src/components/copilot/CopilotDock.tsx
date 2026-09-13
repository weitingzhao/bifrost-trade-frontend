import { lazy, Suspense, useEffect, useState } from 'react'
import { History, MessageCircle, PanelLeftClose, PanelLeftOpen, PanelRightClose, PanelRightOpen, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { ResearchUserSwitcher, type ResearchUserSwitcherHandle } from '@/components/auth/ResearchUserSwitcher'
import { AskCopilotIntentHost } from '@/components/cockpit/AskCopilotIntentHost'
import { CockpitSaveHypothesisHost } from '@/components/cockpit/CockpitSaveHypothesisHost'
import { CopilotPanelMoreMenu } from '@/components/copilot/CopilotPanelMoreMenu'
import { useRef } from 'react'

/**
 * The panel's own weight, deferred until it opens.
 *
 * These four render only behind `if (!open)`, but a static import puts them —
 * and the whole markdown stack CockpitTabs pulls for message bodies — in the
 * entry chunk, so every page load paid for a Copilot nobody had opened yet.
 * The two deep-link hosts below stay static: they render in the *closed*
 * branch and have to be listening before the dock exists.
 */
const CockpitTabs = lazy(() =>
  import('@/components/cockpit/CockpitTabs').then((m) => ({ default: m.CockpitTabs })),
)
const BridgeDialog = lazy(() =>
  import('@/components/cockpit/BridgeDialog').then((m) => ({ default: m.BridgeDialog })),
)
const ExportSessionMenu = lazy(() =>
  import('@/components/cockpit/ExportSessionMenu').then((m) => ({ default: m.ExportSessionMenu })),
)
const SessionListSidebar = lazy(() =>
  import('@/components/cockpit/SessionListSidebar').then((m) => ({
    default: m.SessionListSidebar,
  })),
)
import {
  COPILOT_DOCK_PUSH_MIN_VIEWPORT,
  COPILOT_DOCK_WIDTH,
  COPILOT_DOCK_WIDTH_WIDE,
  useCopilotDock,
} from '@/hooks/useCopilotDock'
import { useCopilotSession } from '@/hooks/useCopilotSession'
import { cn } from '@/lib/utils'

const SESSIONS_RAIL_W = 240
/** Below this the rail leaves the chat too narrow to read, so it does not render. */
const RAIL_MIN_DOCK_W = COPILOT_DOCK_WIDTH_WIDE

/**
 * Research Copilot — a dock on the right, a peer of the nav sidebar.
 *
 * It used to be a floating bubble: a support-widget FAB in the corner opening
 * a draggable card. Two things were wrong with that on a desk tool. The card
 * sat on top of the numbers it was answering about, and the corner it lived in
 * is the corner a dense table needs — the design states the rule for every
 * page: no floating button, the corner belongs to the table.
 *
 * So there is no launcher here at all. ⌘J opens it, and so does any page's own
 * Ask, which is where the question actually starts. Nothing renders when it is
 * closed except the two deep-link hosts, which have to keep listening.
 *
 * Push or overlay is decided by room, not preference: below
 * `COPILOT_DOCK_PUSH_MIN_VIEWPORT`, or at the wide tier, taking the width out
 * of the page would leave the tables unreadable, so it floats over the right
 * edge instead. Above it, at the reading width, it pushes and nothing overlaps.
 */
export function CopilotDock() {
  const { open, wide, sessionsOpen, close, toggleWide, toggleSessions } = useCopilotDock()
  const { streaming, messages, sessionId } = useCopilotSession()
  const [bridgeOpen, setBridgeOpen] = useState(false)
  const [viewport, setViewport] = useState(() => window.innerWidth)
  const userSwitcherRef = useRef<ResearchUserSwitcherHandle>(null)

  useEffect(() => {
    const onResize = () => setViewport(window.innerWidth)
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  if (!open) {
    return (
      <>
        <CockpitSaveHypothesisHost />
        <AskCopilotIntentHost />
      </>
    )
  }

  const width = wide ? COPILOT_DOCK_WIDTH_WIDE : COPILOT_DOCK_WIDTH
  const overlay = wide || viewport < COPILOT_DOCK_PUSH_MIN_VIEWPORT
  const mobile = viewport < 768
  const showRail = sessionsOpen && width >= RAIL_MIN_DOCK_W

  return (
    <Suspense fallback={null}>
      <aside
        role="complementary"
        aria-label="Research Copilot"
        style={mobile ? undefined : { width }}
        className={cn(
          'flex flex-col overflow-hidden border-l border-border bg-card',
          // Uniform typography inside the Copilot: sans with the shared CJK
          // fallback chain so Chinese and Latin render at the same optical
          // weight; tabular numerics so amounts, times and IDs line up.
          'font-sans tabular-nums',
          overlay
            ? 'fixed inset-y-0 right-0 z-[190] shadow-[0_0_60px_-12px_rgba(0,0,0,0.55)]'
            : 'h-svh shrink-0',
          mobile && 'inset-x-0 w-full',
          bridgeOpen && 'pointer-events-none opacity-60',
        )}
      >
        <header className="flex h-[42px] shrink-0 items-center justify-between gap-2 border-b border-border bg-secondary px-3">
          <div className="flex min-w-0 items-center gap-1.5">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/15">
              <MessageCircle className="h-3.5 w-3.5 text-primary" strokeWidth={2.25} />
            </span>
            <span className="truncate text-dense-body font-semibold text-foreground">
              Research Copilot
            </span>
            {streaming ? (
              <span
                className="ml-1 inline-flex h-1.5 w-1.5 shrink-0 animate-pulse rounded-full bg-primary"
                aria-label="Streaming"
              />
            ) : null}
          </div>
          <div className="flex shrink-0 items-center gap-0.5">
            {width >= RAIL_MIN_DOCK_W ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    onClick={toggleSessions}
                    aria-label={sessionsOpen ? 'Hide threads' : 'Show threads'}
                    aria-pressed={sessionsOpen}
                  >
                    {sessionsOpen ? (
                      <PanelLeftClose className="h-3.5 w-3.5" />
                    ) : (
                      <PanelLeftOpen className="h-3.5 w-3.5" />
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom">
                  {sessionsOpen ? 'Hide threads' : 'Thread history'}
                </TooltipContent>
              </Tooltip>
            ) : null}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  onClick={toggleWide}
                  aria-label={wide ? 'Narrow the dock' : 'Widen the dock'}
                  aria-pressed={wide}
                >
                  {wide ? (
                    <PanelRightClose className="h-3.5 w-3.5" />
                  ) : (
                    <PanelRightOpen className="h-3.5 w-3.5" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                {wide ? `Narrow to ${COPILOT_DOCK_WIDTH}px` : `Widen to ${COPILOT_DOCK_WIDTH_WIDE}px · overlays`}
              </TooltipContent>
            </Tooltip>
            <ExportSessionMenu messages={messages} sessionId={sessionId} />
            <CopilotPanelMoreMenu
              onExportMemory={() => setBridgeOpen(true)}
              onOpenUserIdentity={() => userSwitcherRef.current?.openDialog()}
              onClosePanel={close}
              disabledExport={messages.length === 0}
            />
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  onClick={close}
                  aria-label="Close Research Copilot"
                >
                  <X className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">Close (⌘J)</TooltipContent>
            </Tooltip>
          </div>
        </header>

        <div className="flex min-h-0 flex-1">
          {showRail ? (
            <div
              className="hidden shrink-0 flex-col border-r border-border bg-background md:flex"
              style={{ width: SESSIONS_RAIL_W }}
            >
              <div className="flex items-center gap-1.5 border-b border-border bg-secondary px-2.5 py-2">
                <History className="h-3.5 w-3.5 text-primary" />
                <span className="text-dense-label font-semibold text-foreground">Chat history</span>
              </div>
              <div className="min-h-0 flex-1 overflow-y-auto px-2 py-2">
                <SessionListSidebar onLoaded={() => undefined} />
              </div>
            </div>
          ) : null}
          <div className="flex min-w-0 flex-1 flex-col bg-card p-3">
            <CockpitTabs />
          </div>
        </div>
      </aside>
      <ResearchUserSwitcher ref={userSwitcherRef} showTrigger={false} dialogStackLayer="elevated" />
      <BridgeDialog open={bridgeOpen} onOpenChange={setBridgeOpen} sessionId={sessionId} />
      <CockpitSaveHypothesisHost />
      <AskCopilotIntentHost />
    </Suspense>
  )
}
