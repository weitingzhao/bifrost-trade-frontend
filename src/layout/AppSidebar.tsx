import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import {
  ShellNavSidebar,
  shellNavMatchByPathPrefix,
  type ShellNavLinkRenderProps,
  type ShellNavItem,
} from '@bifrost/ui'
import { LiveNavLamp } from '@/components/layout/LiveNavLamp'
import { NavSubItemIcon } from '@/components/layout/SystemNavIcon'
import { SystemNavLampProvider } from '@/components/layout/SystemNavLampProvider'
import { STORAGE_KEYS } from '@/constants/storage'
import { NAV_GROUPS, SYSTEM_NAV_GROUPS } from './navConfig'
import { isSystemRoute } from './routeRegistry'
import { ScopeMark } from './ScopeMark'
import { useResearchNavGroup } from './useResearchNavGroup'
import { useMemo } from 'react'
import { TradeSidebarFooter } from './TradeSidebarFooter'

const LIVE_NAV_PATH = '/market/live'
function renderInAppLink({
  item,
  children,
  onNavigate,
  variant,
  flyoutClassName,
}: ShellNavLinkRenderProps) {
  const to = item.to ?? item.id
  if (variant === 'flyout') {
    return (
      <NavLink to={to} onClick={onNavigate} className={flyoutClassName}>
        {children}
      </NavLink>
    )
  }
  return (
    <NavLink to={to} className="flex w-full items-center gap-2" onClick={onNavigate}>
      {children}
    </NavLink>
  )
}

export function AppSidebar() {
  const location = useLocation()
  const navigate = useNavigate()
  const research = useResearchNavGroup()
  // Two trees, one shell. Inside `/system/*` and `/docs/*` the business tree is
  // replaced rather than appended to — the reader there is checking the
  // machine, not scanning for a position. Everything else about the shell (top
  // bar, breadcrumb, Omnibar, symbol chip, status bar) stays, which is the
  // whole point: the old `SettingsLayout` swapped the tree by growing a second
  // shell around it, and took all of that with it.
  const inSystem = isSystemRoute(location.pathname)
  // Same groups, same order; only Research is re-laid for the seat.
  const navGroups = useMemo(
    () =>
      inSystem
        ? SYSTEM_NAV_GROUPS
        : NAV_GROUPS.map((g) => (g.label === 'Research' ? research.group : g)),
    [inSystem, research.group],
  )

  return (
    <SystemNavLampProvider>
      <ShellNavSidebar
        // Remount on the swap. `ShellNavSidebar` reads its open-groups store
        // once, in a `useState` initialiser, so handing it a different storage
        // key mid-life changes where it *writes* without changing what it
        // holds — it would carry the business tree's open set into System
        // (where no group matches, so the tree renders shut) and then save
        // that set over System's own. Two trees are two identities.
        key={inSystem ? 'system' : 'business'}
        productName="Bifrost Trade"
        navGroups={navGroups}
        activeId={location.pathname}
        matchActive={shellNavMatchByPathPrefix}
        onSelect={(item: ShellNavItem) => {
          navigate(item.to ?? item.id)
        }}
        renderItemIcon={(item) => <NavSubItemIcon item={item} />}
        renderItemExtras={(item) => {
          const to = item.to ?? item.id
          if (to === LIVE_NAV_PATH) return <LiveNavLamp />
          // A badge outranks the scope mark: a count is news, the unit of
          // analysis is a standing fact about the page.
          //
          // `item.id`, not `to`: a fold row borrows its first child's `to`, so
          // keying on `to` marked the Analyze heading with Dossier's unit. A
          // real page row has its own path as its id; a fold's is `fold:...`
          // and matches no route, which is the answer we want for a heading.
          return research.extras(item) ?? <ScopeMark path={item.id} />
        }}
        renderInAppLink={renderInAppLink}
        footer={<TradeSidebarFooter />}
        openGroupsStorageKey={
          inSystem ? STORAGE_KEYS.sidebarSystemOpenGroups : STORAGE_KEYS.sidebarOpenGroups
        }
        accordionStorageKey={STORAGE_KEYS.sidebarAccordion}
      />
    </SystemNavLampProvider>
  )
}
