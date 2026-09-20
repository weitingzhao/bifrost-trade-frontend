import { Suspense, useEffect, useState, type CSSProperties } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { useAmbientPageContext } from '@/hooks/useAmbientPageContext'
import { useCopilotDeepLink } from '@/hooks/useCopilotDeepLink'
import { shouldShowGlobalMarketStrip } from '@/constants/globalMarketStrip'
import { GlobalMarketStatusBar, SkipToContent } from '@/components/layout'
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar'
import { AppSidebar } from './AppSidebar'
import { AppHeader } from './AppHeader'
import { ShellStatusBar } from './ShellStatusBar'
import { initialSidebarOpen, SHELL_SIDEBAR_WIDTH } from './shellChrome'
import { MessageToastStack } from '@/components/MessageCenter/MessageToastStack'
import { useSystemMessages } from '@/hooks/useSystemMessages'
import { useAlerts } from '@/hooks/useAlerts'
import { ErrorBoundary } from '@/components/ui/ErrorBoundary'
import { PageRouteFallback } from '@/components/layout'
import { CopilotDock } from '@/components/copilot/CopilotDock'
import { useCockpitKeybinds } from '@/lib/cockpit/keybinds'
import { useHeldSymbolSync } from '@/lib/symbolContext'
import { useRecentPagesTrail } from '@/lib/omnibar'
import { Omnibar } from './Omnibar'
import { InspectorSlotContext } from '@/components/layout/inspectorSlot'
import { layerForPath } from '@/lib/design/layers'

/** Stable ErrorBoundary key — keep Instances mounted when opening/closing detail. */
function outletBoundaryKey(pathname: string): string {
  const instances = pathname.match(/^(\/strategy\/instances)(?:\/\d+)?\/?$/)
  if (instances) return instances[1]
  return pathname
}

function BoundedOutlet() {
  const { pathname } = useLocation()
  return (
    // key resets the boundary when navigating to a different page
    <ErrorBoundary key={outletBoundaryKey(pathname)}>
      <Suspense fallback={<PageRouteFallback />}>
        <Outlet />
      </Suspense>
    </ErrorBoundary>
  )
}

export function AppLayout() {
  const { pathname } = useLocation()
  useCopilotDeepLink()
  useHeldSymbolSync()
  // After the held-symbol sync: the page context reads the URL the sync just settled.
  useAmbientPageContext()
  useRecentPagesTrail()
  const showMarketStrip = shouldShowGlobalMarketStrip(pathname)
  // One SSE subscription, two readers: Alerts groups it by source, the toast
  // stack decides which of it is allowed to interrupt.
  const stream = useSystemMessages()
  const { groups, summary } = useAlerts(stream)
  const [inspectorSlot, setInspectorSlot] = useState<HTMLElement | null>(null)

  // The layer the current group belongs to, stamped on the root so the ramp in
  // `index.css` applies. Standing in Research does not look like standing in
  // Portfolio — that is the design's point, and the group is the key.
  useEffect(() => {
    document.documentElement.dataset.layer = layerForPath(pathname)
  }, [pathname])
  useCockpitKeybinds()

  return (
    <InspectorSlotContext.Provider value={inspectorSlot}>
      <SidebarProvider
        defaultOpen={initialSidebarOpen(document.cookie, window.innerWidth)}
        style={{ '--sidebar-width': SHELL_SIDEBAR_WIDTH } as CSSProperties}
      >
        {/* Before the sidebar, not after: the ~40 nav links are exactly what
          this exists to skip. */}
        <SkipToContent />
        <AppSidebar />
        {/* h-svh + overflow-hidden keeps the three bars pinned to the viewport */}
        <SidebarInset className="h-svh overflow-hidden bg-card">
          <AppHeader />
          <GlobalMarketStatusBar enabled={showMarketStrip} />
          <main
            id="main-content"
            tabIndex={-1}
            className="flex-1 overflow-auto min-w-0 bg-card outline-none"
          >
            <BoundedOutlet />
          </main>
          {/* The alerts panel hangs off this bar's own chip — one trigger, so
            it can be a popover instead of the drawer two triggers forced. */}
          <ShellStatusBar groups={groups} alerts={summary} onDismissAll={stream.dismissAll} />
        </SidebarInset>
        {/* A docked inspector portals in here — a page opens it, but a panel that
          takes width from the content has to be the content's sibling, not its
          child. It sits between the page it explains and the Copilot, which is
          about the whole desk rather than one row. `display: contents` so an
          empty slot costs the row nothing. */}
        <div ref={setInspectorSlot} className="contents" />
        {/* A peer of the nav sidebar, not a layer over the page: `SidebarProvider`
          renders a flex row, so at the reading width on a wide screen the dock
          takes its space from the content instead of covering it. */}
        <CopilotDock />
        <Omnibar />
        <MessageToastStack
          messages={stream.messages}
          dismissedIds={stream.dismissedIds}
          onDismiss={stream.dismissMessage}
        />
      </SidebarProvider>
    </InspectorSlotContext.Provider>
  )
}
