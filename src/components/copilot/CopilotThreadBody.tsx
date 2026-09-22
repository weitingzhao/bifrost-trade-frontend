/**
 * The Copilot conversation's contents — everything the dock held, minus the
 * column the dock was.
 *
 * The dock owned four things that the surface header now owns: how wide it
 * was, whether it pushed or overlaid, where it sat, and how it closed. All
 * four are answered once for every surface (`▢ ⇥ ⤢ ×`), so what is left here
 * is the conversation itself and the three controls that belong to it — which
 * thread, which persona, and what to do with the transcript.
 *
 * It was a floating bubble before it was a dock: a support-widget FAB in the
 * corner opening a draggable card. Two things were wrong with that on a desk
 * tool — the card sat on top of the numbers it was answering about, and the
 * corner it lived in is the corner a dense table needs. Neither is true of a
 * surface: the panel takes its column out of the page when there is room, and
 * nothing here is a launcher. ⌘J opens it, and so does any page's own Ask,
 * which is where the question actually starts.
 */
import { lazy, Suspense, useRef, useState } from 'react'
import {
  ResearchUserSwitcher,
  type ResearchUserSwitcherHandle,
} from '@/components/auth/ResearchUserSwitcher'
import { CopilotPanelMoreMenu } from '@/components/copilot/CopilotPanelMoreMenu'
import { CopilotPersonaChip } from '@/components/copilot/CopilotPersonaChip'
import { CopilotThreadSwitcher } from '@/components/copilot/CopilotThreadSwitcher'
import { useCopilotSession } from '@/hooks/useCopilotSession'
import { closeThread } from '@/hooks/useCopilotThread'
import { cn } from '@/lib/utils'

/**
 * The panel's own weight, deferred until the conversation is opened.
 *
 * A static import puts these — and the whole markdown stack `CockpitTabs`
 * pulls for message bodies — in the entry chunk, so every page load paid for
 * a Copilot nobody had opened yet.
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

export function CopilotThreadBody() {
  const { streaming, messages, sessionId } = useCopilotSession()
  const [bridgeOpen, setBridgeOpen] = useState(false)
  const userSwitcherRef = useRef<ResearchUserSwitcherHandle>(null)

  return (
    <Suspense fallback={null}>
      <div
        className={cn(
          'flex h-full min-h-0 flex-col',
          // Uniform typography inside the Copilot: sans with the shared CJK
          // fallback chain so Chinese and Latin render at the same optical
          // weight; tabular numerics so amounts, times and IDs line up.
          'font-sans tabular-nums',
          bridgeOpen && 'pointer-events-none opacity-60',
        )}
      >
        {/* Not a title bar — the tab already names it. These are the three
            controls that belong to the conversation rather than to the
            surface: which thread, which persona, what to do with it. */}
        <div className="flex h-8 shrink-0 items-center justify-between gap-2 border-b border-border bg-secondary px-2">
          <div className="flex min-w-0 items-center gap-1.5">
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
            <ExportSessionMenu messages={messages} sessionId={sessionId} />
            <CopilotPanelMoreMenu
              onExportMemory={() => setBridgeOpen(true)}
              onOpenUserIdentity={() => userSwitcherRef.current?.openDialog()}
              onClosePanel={closeThread}
              disabledExport={messages.length === 0}
            />
          </div>
        </div>

        <div className="flex min-h-0 flex-1 flex-col bg-card p-3">
          <CockpitTabs />
        </div>
      </div>
      <ResearchUserSwitcher ref={userSwitcherRef} showTrigger={false} dialogStackLayer="elevated" />
      <BridgeDialog open={bridgeOpen} onOpenChange={setBridgeOpen} sessionId={sessionId} />
    </Suspense>
  )
}
