import { lazy, Suspense, useEffect, useState } from 'react'
import { MessageCircle, PanelRightClose, PanelRightOpen, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { ResearchUserSwitcher, type ResearchUserSwitcherHandle } from '@/components/auth/ResearchUserSwitcher'
import { AskCopilotIntentHost } from '@/components/cockpit/AskCopilotIntentHost'
import { CopilotPanelMoreMenu } from '@/components/copilot/CopilotPanelMoreMenu'
import { CopilotPersonaChip } from '@/components/copilot/CopilotPersonaChip'
import { CopilotThreadSwitcher } from '@/components/copilot/CopilotThreadSwitcher'
import { useRef } from 'react'

/**
 * The panel's own weight, deferred until it opens.
 *
 * These three render only behind `if (!open)`, but a static import puts them —
 * and the whole markdown stack CockpitTabs pulls for message bodies — in the
 * entry chunk, so every page load paid for a Copilot nobody had opened yet.
 * AskCopilotIntentHost stays static: it renders in the *closed*
 * branch and has to be listening before the dock exists.
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
import {
  COPILOT_DOCK_WIDTH,
  COPILOT_DOCK_WIDTH_WIDE,
  copilotDockPushes,
  useCopilotDock,
} from '@/hooks/useCopilotDock'
import { useCopilotSession } from '@/hooks/useCopilotSession'
import { cn } from '@/lib/utils'

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
 * closed except `AskCopilotIntentHost`, which has to keep listening.
 *
 * Push or overlay is decided by room, not preference: `copilotDockPushes`
 * applies the one shared docking formula (sidebar 240 + content floor 760 +
 * panel width — `src/lib/panelDocks.ts`). At the reading width that means
 * pushing from 1440 up; below that, or at the wide tier, it floats over the
 * right edge and the page keeps its columns. Thread switching is the title
 * (`CopilotThreadSwitcher`); the old sessions rail is not mounted here.
 * Composer Save-as-Hypothesis is gone (Design 2026-09-15 D2); Ask still has
 * to listen while the dock is closed.
 */
export function CopilotDock() {
  const { open, wide, close, toggleWide } = useCopilotDock()
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
    return <AskCopilotIntentHost />
  }

  const width = wide ? COPILOT_DOCK_WIDTH_WIDE : COPILOT_DOCK_WIDTH
  const overlay = !copilotDockPushes({ open, wide }, viewport)
  const mobile = viewport < 768

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
            <CopilotThreadSwitcher />
            {streaming ? (
              <span
                className="ml-1 inline-flex h-1.5 w-1.5 shrink-0 animate-pulse rounded-full bg-primary"
                aria-label="Streaming"
              />
            ) : null}
          </div>
          <div className="flex shrink-0 items-center gap-0.5">
            <CopilotPersonaChip />
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
          <div className="flex min-w-0 flex-1 flex-col bg-card p-3">
            <CockpitTabs />
          </div>
        </div>
      </aside>
      <ResearchUserSwitcher ref={userSwitcherRef} showTrigger={false} dialogStackLayer="elevated" />
      <BridgeDialog open={bridgeOpen} onOpenChange={setBridgeOpen} sessionId={sessionId} />
      <AskCopilotIntentHost />
    </Suspense>
  )
}
