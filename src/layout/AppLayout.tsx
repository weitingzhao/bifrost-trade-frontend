import { Suspense, useState, type CSSProperties } from 'react'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useCopilotDeepLink } from '@/hooks/useCopilotDeepLink'
import { useResearchSeatDeepLink } from '@/hooks/useResearchSeatDeepLink'
import { shouldShowGlobalMarketStrip } from '@/constants/globalMarketStrip'
import { GlobalMarketStatusBar, SkipToContent } from '@/components/layout'
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar'
import { AppSidebar } from './AppSidebar'
import { AppHeader } from './AppHeader'
import { ShellStatusBar } from './ShellStatusBar'
import { SHELL_SIDEBAR_WIDTH } from './shellChrome'
import { MessageToastStack } from '@/components/MessageCenter/MessageToastStack'
import { InboxDrawer } from '@/components/MessageCenter/InboxDrawer'
import { useSystemMessages } from '@/hooks/useSystemMessages'
import { useInbox } from '@/hooks/useInbox'
import { ErrorBoundary } from '@/components/ui/ErrorBoundary'
import { PageRouteFallback } from '@/components/layout'
import { CopilotDock } from '@/components/copilot/CopilotDock'
import { useCockpitKeybinds } from '@/lib/cockpit/keybinds'
import { useHeldSymbolSync } from '@/lib/symbolContext'
import { useRecentPagesTrail } from '@/lib/omnibar'
import { Omnibar } from './Omnibar'

function readSidebarCookie(): boolean {
  const match = document.cookie.match(/(?:^|;\s*)sidebar_state=([^;]*)/)
  return match ? match[1] === 'true' : true
}

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
  const navigate = useNavigate()
  useCopilotDeepLink()
  useResearchSeatDeepLink()
  useHeldSymbolSync()
  useRecentPagesTrail()
  const showMarketStrip = shouldShowGlobalMarketStrip(pathname)
  // One SSE subscription, two readers: the Inbox groups it by source, the
  // toast stack decides which of it is allowed to interrupt.
  const stream = useSystemMessages()
  const { groups, summary } = useInbox(stream)
  const [drawerOpen, setDrawerOpen] = useState(false)
  useCockpitKeybinds()

  const msgCenter = (
    <>
      <MessageToastStack
        messages={stream.messages}
        dismissedIds={stream.dismissedIds}
        onDismiss={stream.dismissMessage}
      />
      <InboxDrawer
        open={drawerOpen}
        groups={groups}
        count={summary.count}
        onDismissAll={stream.dismissAll}
        onClose={() => setDrawerOpen(false)}
        onNavigate={navigate}
      />
    </>
  )

  return (
    <SidebarProvider
      defaultOpen={readSidebarCookie()}
      style={{ '--sidebar-width': SHELL_SIDEBAR_WIDTH } as CSSProperties}
    >
      {/* Before the sidebar, not after: the ~40 nav links are exactly what
          this exists to skip. */}
      <SkipToContent />
      <AppSidebar />
      {/* h-svh + overflow-hidden keeps the three bars pinned to the viewport */}
      <SidebarInset className="h-svh overflow-hidden bg-card">
        <AppHeader inbox={summary} onOpenInbox={() => setDrawerOpen(true)} />
        <GlobalMarketStatusBar enabled={showMarketStrip} />
        <main id="main-content" tabIndex={-1} className="flex-1 overflow-auto min-w-0 bg-card outline-none">
          <BoundedOutlet />
        </main>
        <ShellStatusBar inbox={summary} onOpenInbox={() => setDrawerOpen(true)} />
      </SidebarInset>
      {/* A peer of the nav sidebar, not a layer over the page: `SidebarProvider`
          renders a flex row, so at the reading width on a wide screen the dock
          takes its space from the content instead of covering it. */}
      <CopilotDock />
      <Omnibar />
      {msgCenter}
    </SidebarProvider>
  )
}
