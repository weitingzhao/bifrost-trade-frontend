import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar'
import { AppSidebar } from './AppSidebar'
import { AppHeader } from './AppHeader'
import { TopNav } from './TopNav'
import { MessageToastStack } from '@/components/MessageCenter/MessageToastStack'
import { MessageDrawer } from '@/components/MessageCenter/MessageDrawer'
import { LogPanel } from '@/components/LogPanel'
import { LogPanelProvider } from '@/context/LogPanelContext'
import { useSystemMessages } from '@/hooks/useSystemMessages'
import { useNavMode } from '@/hooks/useNavMode'

function readSidebarCookie(): boolean {
  const match = document.cookie.match(/(?:^|;\s*)sidebar_state=([^;]*)/)
  return match ? match[1] === 'true' : true
}

export function AppLayout() {
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
      <LogPanelProvider>
        <div className="flex flex-col h-svh bg-background">
          <TopNav
            activeMsgCount={activeMsgCount}
            onOpenMessages={() => setDrawerOpen(true)}
            onToggleNavMode={isTooNarrow ? undefined : toggle}
          />
          <main className="flex-1 overflow-auto min-w-0">
            <Outlet />
          </main>
          <LogPanel />
          {msgCenter}
        </div>
      </LogPanelProvider>
    )
  }

  return (
    <LogPanelProvider>
      <SidebarProvider defaultOpen={readSidebarCookie()}>
        <AppSidebar />
        {/* h-svh + overflow-hidden keeps LogPanel inside the viewport */}
        <SidebarInset className="h-svh overflow-hidden">
          <AppHeader
            activeMsgCount={activeMsgCount}
            onOpenMessages={() => setDrawerOpen(true)}
            onToggleNavMode={toggle}
          />
          <main className="flex-1 overflow-auto min-w-0">
            <Outlet />
          </main>
          <LogPanel />
        </SidebarInset>
        {msgCenter}
      </SidebarProvider>
    </LogPanelProvider>
  )
}
