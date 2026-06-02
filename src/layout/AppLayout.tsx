import { Suspense, useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { shouldShowGlobalMarketStrip } from '@/constants/globalMarketStrip'
import { GlobalMarketStatusBar } from '@/components/layout'
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar'
import { AppSidebar } from './AppSidebar'
import { AppHeader } from './AppHeader'
import { TopNav } from './TopNav'
import { MessageToastStack } from '@/components/MessageCenter/MessageToastStack'
import { MessageDrawer } from '@/components/MessageCenter/MessageDrawer'
import { LogPanel } from '@/components/LogPanel'
import { ReactorMapPanel } from '@/components/topology/ReactorMapPanel'
import { LogPanelProvider } from '@/context/LogPanelContext'
import { ReactorMapProvider } from '@/context/ReactorMapContext'
import { useSystemMessages } from '@/hooks/useSystemMessages'
import { useNavMode } from '@/hooks/useNavMode'
import { ErrorBoundary } from '@/components/ui/ErrorBoundary'
import { PageRouteFallback } from '@/components/layout'

function readSidebarCookie(): boolean {
  const match = document.cookie.match(/(?:^|;\s*)sidebar_state=([^;]*)/)
  return match ? match[1] === 'true' : true
}

function BoundedOutlet() {
  const { pathname } = useLocation()
  return (
    // key=pathname resets the boundary when navigating to a different page
    <ErrorBoundary key={pathname}>
      <Suspense fallback={<PageRouteFallback />}>
        <Outlet />
      </Suspense>
    </ErrorBoundary>
  )
}

export function AppLayout() {
  const { pathname } = useLocation()
  const showMarketStrip = shouldShowGlobalMarketStrip(pathname)
  const { effectiveMode, toggle, isTooNarrow } = useNavMode()
  const { messages, dismissedIds, activeMsgCount, dismissMessage, dismissAll } = useSystemMessages()
  const [drawerOpen, setDrawerOpen] = useState(false)

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

  if (effectiveMode === 'topnav') {
    return (
      <ReactorMapProvider>
        <LogPanelProvider>
          <div className="flex flex-col h-svh bg-card">
            <TopNav
              activeMsgCount={activeMsgCount}
              onOpenMessages={() => setDrawerOpen(true)}
              onToggleNavMode={isTooNarrow ? undefined : toggle}
            />
            <GlobalMarketStatusBar enabled={showMarketStrip} />
            <main className="flex-1 overflow-auto min-w-0">
              <BoundedOutlet />
            </main>
            <ReactorMapPanel />
            <LogPanel />
            {msgCenter}
          </div>
        </LogPanelProvider>
      </ReactorMapProvider>
    )
  }

  return (
    <ReactorMapProvider>
      <LogPanelProvider>
        <SidebarProvider defaultOpen={readSidebarCookie()}>
          <AppSidebar />
          {/* h-svh + overflow-hidden keeps dock panels inside the viewport */}
          <SidebarInset className="h-svh overflow-hidden bg-card">
            <AppHeader
              activeMsgCount={activeMsgCount}
              onOpenMessages={() => setDrawerOpen(true)}
              onToggleNavMode={toggle}
            />
            <GlobalMarketStatusBar enabled={showMarketStrip} />
            <main className="flex-1 overflow-auto min-w-0 bg-card">
              <BoundedOutlet />
            </main>
            <ReactorMapPanel />
            <LogPanel />
          </SidebarInset>
          {msgCenter}
        </SidebarProvider>
      </LogPanelProvider>
    </ReactorMapProvider>
  )
}
