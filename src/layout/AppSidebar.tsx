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
import { NAV_GROUPS } from './navConfig'
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
  // Same groups, same order; only Research is re-laid for the seat.
  const navGroups = useMemo(
    () => NAV_GROUPS.map((g) => (g.label === 'Research' ? research.group : g)),
    [research.group],
  )

  return (
    <SystemNavLampProvider>
      <ShellNavSidebar
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
        openGroupsStorageKey={STORAGE_KEYS.sidebarOpenGroups}
        accordionStorageKey={STORAGE_KEYS.sidebarAccordion}
      />
    </SystemNavLampProvider>
  )
}
