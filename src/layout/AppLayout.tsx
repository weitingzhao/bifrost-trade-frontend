import { Suspense, useState, type CSSProperties } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
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
import { MessageDrawer } from '@/components/MessageCenter/MessageDrawer'
import { PlatformStatusPanel } from '@/components/PlatformStatusPanel'
import { ReactorMapPanel } from '@/components/topology/ReactorMapPanel'
import { PlatformPanelProvider } from '@/context/PlatformPanelContext'
import { ReactorMapProvider } from '@/context/ReactorMapContext'
import { useSystemMessages } from '@/hooks/useSystemMessages'
import { ErrorBoundary } from '@/components/ui/ErrorBoundary'
import { PageRouteFallback } from '@/components/layout'
import { CopilotFloatingBubble } from '@/components/copilot/CopilotFloatingBubble'
import { useCockpitKeybinds } from '@/lib/cockpit/keybinds'

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
  useCopilotDeepLink()
  useResearchSeatDeepLink()
  const showMarketStrip = shouldShowGlobalMarketStrip(pathname)
  const { messages, dismissedIds, activeMsgCount, dismissMessage, dismissAll } = useSystemMessages()
  const [drawerOpen, setDrawerOpen] = useState(false)
  useCockpitKeybinds()

  const msgCenter = (
    <>
      <MessageToastStack
        messages={messages}
        dismissedIds={dismissedIds}
        onDismiss={dismissMessage}
      />
      <MessageDrawer
        open={drawerOpen}
        messages={messages}
        dismissedIds={dismissedIds}
        onDismiss={dismissMessage}
        onDismissAll={dismissAll}
        onClose={() => setDrawerOpen(false)}
      />
    </>
  )

  return (
    <ReactorMapProvider>
      <PlatformPanelProvider>
        <SidebarProvider
          defaultOpen={readSidebarCookie()}
          style={{ '--sidebar-width': SHELL_SIDEBAR_WIDTH } as CSSProperties}
        >
          {/* Before the sidebar, not after: the ~40 nav links are exactly what
              this exists to skip. */}
          <SkipToContent />
          <AppSidebar />
          {/* h-svh + overflow-hidden keeps dock panels inside the viewport */}
          <SidebarInset className="h-svh overflow-hidden bg-card">
            <AppHeader activeMsgCount={activeMsgCount} onOpenMessages={() => setDrawerOpen(true)} />
            <GlobalMarketStatusBar enabled={showMarketStrip} />
            <main id="main-content" tabIndex={-1} className="flex-1 overflow-auto min-w-0 bg-card outline-none">
              <BoundedOutlet />
            </main>
            <ShellStatusBar
              activeMsgCount={activeMsgCount}
              onOpenMessages={() => setDrawerOpen(true)}
            />
            <ReactorMapPanel />
            <PlatformStatusPanel />
          </SidebarInset>
          {msgCenter}
          <CopilotFloatingBubble />
        </SidebarProvider>
      </PlatformPanelProvider>
    </ReactorMapProvider>
  )
}
