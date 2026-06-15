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
import { TradeSidebarFooter } from './TradeSidebarFooter'

const LIVE_NAV_PATH = '/market/live'
const OPS_CONSOLE_URL =
  import.meta.env.VITE_OPS_CONSOLE_URL ?? 'http://127.0.0.1:5180'

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

  return (
    <SystemNavLampProvider>
      <ShellNavSidebar
        productName="Bifrost Trade"
        navGroups={NAV_GROUPS}
        activeId={location.pathname}
        matchActive={shellNavMatchByPathPrefix}
        onSelect={(item: ShellNavItem) => {
          navigate(item.to ?? item.id)
        }}
        renderItemIcon={(item) => <NavSubItemIcon item={item} />}
        renderItemExtras={(item) =>
          (item.to ?? item.id) === LIVE_NAV_PATH ? <LiveNavLamp /> : null
        }
        renderInAppLink={renderInAppLink}
        peerApp={{
          label: 'Open Bifrost Ops',
          href: OPS_CONSOLE_URL,
          description: 'Environment matrix & release program',
        }}
        footer={<TradeSidebarFooter />}
        openGroupsStorageKey={STORAGE_KEYS.sidebarOpenGroups}
        accordionStorageKey={STORAGE_KEYS.sidebarAccordion}
      />
    </SystemNavLampProvider>
  )
}
