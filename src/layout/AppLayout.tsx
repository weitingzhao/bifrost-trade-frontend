import { useEffect, useState } from 'react'
import { Outlet } from 'react-router-dom'
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar'
import { AppSidebar } from './AppSidebar'
import { AppHeader } from './AppHeader'
import { TopNav } from './TopNav'
import { MessageToastStack } from '@/components/MessageCenter/MessageToastStack'
import { MessageDrawer } from '@/components/MessageCenter/MessageDrawer'
import { useSystemMessages } from '@/hooks/useSystemMessages'

// Below this viewport width, sidebar moves to a horizontal top navigation bar.
// Change this value to adjust the responsive breakpoint.
const TOPNAV_BREAKPOINT = 1100 // px

function readSidebarCookie(): boolean {
  const match = document.cookie.match(/(?:^|;\s*)sidebar_state=([^;]*)/)
  return match ? match[1] === 'true' : true
}

function useIsNarrow(): boolean {
  const [isNarrow, setIsNarrow] = useState(() => window.innerWidth < TOPNAV_BREAKPOINT)
  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${TOPNAV_BREAKPOINT - 1}px)`)
    const handler = (e: MediaQueryListEvent) => setIsNarrow(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])
  return isNarrow
}

export function AppLayout() {
  const isNarrow = useIsNarrow()
  const { messages, dismissedIds, activeMsgCount, dismissMessage, dismissAll } = useSystemMessages()
  const [drawerOpen, setDrawerOpen] = useState(false)

  const msgCenter = (
    <>
      <MessageToastStack messages={messages} dismissedIds={dismissedIds} onDismiss={dismissMessage} />
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

  // Narrow: top navigation bar + full-width content (same horizontal space as legacy)
  if (isNarrow) {
    return (
      <div className="flex flex-col h-svh bg-background">
        <TopNav
          activeMsgCount={activeMsgCount}
          onOpenMessages={() => setDrawerOpen(true)}
        />
        <main className="flex-1 overflow-auto min-w-0">
          <Outlet />
        </main>
        {msgCenter}
      </div>
    )
  }

  // Wide: left sidebar + inset content
  return (
    <SidebarProvider defaultOpen={readSidebarCookie()}>
      <AppSidebar />
      <SidebarInset>
        <AppHeader
          activeMsgCount={activeMsgCount}
          onOpenMessages={() => setDrawerOpen(true)}
        />
        <main className="flex-1 overflow-auto min-w-0">
          <Outlet />
        </main>
      </SidebarInset>
      {msgCenter}
    </SidebarProvider>
  )
}
