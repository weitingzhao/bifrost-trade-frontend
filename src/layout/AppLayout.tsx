import { Suspense, useEffect, useMemo, useState, type CSSProperties } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { useAmbientPageContext } from '@/hooks/useAmbientPageContext'
import { useCopilotDeepLink } from '@/hooks/useCopilotDeepLink'
import { shouldShowGlobalMarketStrip } from '@/constants/globalMarketStrip'
import { GlobalMarketStatusBar, SkipToContent } from '@/components/layout'
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar'
import { ShellTip } from './ShellTip'
import { cn } from '@/lib/utils'
import { useToolbarShown } from './bottomLane'
import { ShellNotices } from './ShellNotices'
import { ShellContextMenu } from './ShellContextMenu'
import { useShellArrows } from './useShellArrows'
import { usePageLane } from './usePageLane'
import { useGlassSync } from '@/lib/glass'
import { useDisplaySync } from '@/lib/display'
import { useSheetEnter } from './useSheetEnter'
import { NumberStepper } from './NumberStepper'
import { WhatsNew } from './WhatsNew'
import { QuickLook } from './QuickLook'
import { ShortcutSheet } from './ShortcutSheet'
import { SymbolDrop } from './SymbolDrop'
import { useAlertBanners } from '@/hooks/useAlertBanners'
import { AppSidebar } from './AppSidebar'
import { AppHeader } from './AppHeader'
import { initialSidebarOpen, SHELL_SIDEBAR_WIDTH } from './shellChrome'
import { isSystemRoute } from './routeRegistry'
import { MessageToastStack } from '@/components/MessageCenter/MessageToastStack'
import { useSystemMessages } from '@/hooks/useSystemMessages'
import { alertsSummary, useAlerts } from '@/hooks/useAlerts'
import { useClearedAlerts, withoutCleared } from '@/lib/alertsCleared'
import { ErrorBoundary } from '@/components/ui/ErrorBoundary'
import { PageRouteFallback } from '@/components/layout'
import { AskCopilotIntentHost } from '@/components/cockpit/AskCopilotIntentHost'
import { EquipRail } from './EquipRail'
import { EquipFloat } from './EquipFloat'
import { EquipPanel } from './EquipPanel'
import { SymbolDockHost } from './symbolDock/SymbolDockHost'
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
  // System pages that live under /research (Signal Health, Calibration, the
  // agents…) are the machine room, not a market page: the design draws no
  // market strip anywhere in System.
  const showMarketStrip = shouldShowGlobalMarketStrip(pathname) && !isSystemRoute(pathname)
  // One SSE subscription, two readers: Alerts groups it by source, the toast
  // stack decides which of it is allowed to interrupt.
  const stream = useSystemMessages()
  const { groups: streamed } = useAlerts(stream)
  // What this session cleared in the notification centre (Rev .72 §10) leaves
  // the centre, the count and the banners together.
  const cleared = useClearedAlerts()
  const groups = useMemo(() => withoutCleared(streamed, cleared), [streamed, cleared])
  const summary = useMemo(() => alertsSummary(groups), [groups])
  const [inspectorSlot, setInspectorSlot] = useState<HTMLElement | null>(null)

  // The layer the current group belongs to, stamped on the root so the ramp in
  // `index.css` applies. Standing in Research does not look like standing in
  // Portfolio — that is the design's point, and the group is the key.
  useEffect(() => {
    document.documentElement.dataset.layer = layerForPath(pathname)
  }, [pathname])
  useCockpitKeybinds()
  // Rev .69: arrows through the menu bar and open popovers; new Risk and
  // Analyze alerts announce themselves as banners.
  useShellArrows()
  useAlertBanners(groups)
  // Rev .70–.71: table heads park under the page's sticky toolbar, and each
  // route keeps its scroll for this tab's session.
  usePageLane()
  useGlassSync()
  const toolbarShown = useToolbarShown()
  // Rev .72: display options on <html>, and Enter confirms a sheet.
  useDisplaySync()
  useSheetEnter()

  return (
    <InspectorSlotContext.Provider value={inspectorSlot}>
      <SidebarProvider
        defaultOpen={initialSidebarOpen(document.cookie, window.innerWidth)}
        style={{ '--sidebar-width': SHELL_SIDEBAR_WIDTH } as CSSProperties}
      >
        {/* Before the sidebar, not after: the ~40 nav links are exactly what
          this exists to skip. */}
        <SkipToContent />
        {/* The one tooltip (Rev .68): every data-tip and native title. */}
        <ShellTip />
        {/* Rev .69: the toast (with Undo), the banners, the right-click menu. */}
        <ShellNotices />
        <ShellContextMenu />
        {/* Rev .70–.71: drag a symbol to the drop bar, Space for Quick Look,
            hold ⌘ for the shortcut sheet. */}
        <SymbolDrop />
        <QuickLook />
        <ShortcutSheet />
        {/* Rev .72: numeric fields step; What's New once per design Rev. */}
        <NumberStepper />
        <WhatsNew />
        <AppSidebar />
        {/* h-svh + overflow-hidden keeps the three bars pinned to the viewport.
          Transparent, with the lane below: one window ground (Rev .61) — the
          floating sidebar, the top bar and the page share the body's. */}
        <SidebarInset className="h-svh overflow-hidden bg-transparent">
          {/* The menu bar (Rev .60): the status pill retired into the top
              bar's right end, and the Alerts panel hangs off its clock. */}
          <AppHeader alertGroups={groups} alerts={summary} onDismissAllAlerts={stream.dismissAll} />
          <GlobalMarketStatusBar enabled={showMarketStrip} />
          {/* `@container/page`: the width a page is given, queried by name. A
            float or panel body declares the same container, so a page that
            lays out with `@…/page:` reads its own width in both places — the
            design's surfaces are iframes, where the viewport *is* that width. */}
          <main
            id="main-content"
            // The page-material scope (Rev .62): index.css reads it.
            data-mat=""
            tabIndex={-1}
            // The last row scrolls clear of the floating toolbar (Rev .73 §3):
            // its height plus the gap, while the toolbar is shown.
            className={cn('@container/page flex-1 overflow-auto min-w-0 outline-none', toolbarShown && 'pb-[72px]')}
          >
            <BoundedOutlet />
          </main>
        </SidebarInset>
        {/* A docked inspector portals in here — a page opens it, but a panel that
          takes width from the content has to be the content's sibling, not its
          child. It sits between the page it explains and the Copilot, which is
          about the whole desk rather than one row. `display: contents` so an
          empty slot costs the row nothing. */}
        <div ref={setInspectorSlot} className="contents" />
        {/* Every page's Ask, listening from the shell rather than from the
          conversation — it has to be awake while the conversation is closed. */}
        <AskCopilotIntentHost />
        {/* The one side panel (design Rev 2026-09-22.6, §5a.8 seventeenth
            round). A sibling of the content, like the dock, so that when
            there is room it takes its column out of the page instead of
            covering it. */}
        <EquipPanel />
        {/* The Symbol list (design Rev .56–.58): the outermost column, right of
            the panel — docked or a strip it takes its width from the page,
            floating it sits over it. */}
        <SymbolDockHost />
        {/* The equipment's edge. After the panel and the dock, so it floats
            over both — the rail is shell furniture, not page furniture, and
            it keeps the screen edge for Fitts. */}
        <EquipRail />
        {/* The other place a surface can rest. No scrim on either: the page
            behind stays completely interactive, which is the whole claim of
            the word float — and the evidence of cross-phase work is approving
            a decision while standing on a Trade page, not a Review page
            hovering over a Trade page. */}
        <EquipFloat />
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
