import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import {
  ShellNavSidebar,
  type ShellNavLinkRenderProps,
  type ShellNavItem,
} from '@bifrost/ui'
import { LiveNavLamp } from '@/components/layout/LiveNavLamp'
import { NavSubItemIcon } from '@/components/layout/SystemNavIcon'
import { SystemNavLampProvider } from '@/components/layout/SystemNavLampProvider'
import { STORAGE_KEYS } from '@/constants/storage'
import { lifecycleMark } from './LifecycleMark'
import { NAV_GROUPS, SYSTEM_NAV_GROUPS } from './navConfig'
import { LIFECYCLE, orderGroups, useNavOrder } from './navOrder'
import { LAYER_OF_GROUP, layerForPath } from '@/lib/design/layers'
import { isSystemRoute, matchActiveRow, navRowFor } from './routeRegistry'
import { ScopeMark } from './ScopeMark'
import { useResearchNavGroup } from './useResearchNavGroup'
import { useMemo } from 'react'
import { Pin as PinIcon } from 'lucide-react'
import { SHELF_GROUP, isStalePin, usePins } from '@/lib/pins'
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
  const order = useNavOrder()
  const { pins } = usePins()
  // Research is re-laid for the seat; then the six groups take the design's
  // order (`loop` rests: Home, then the lifecycle chain) and their icons
  // become the lifecycle numerals — in loop order the numerals draw the
  // spine, and Home's dot marks the row that belongs to no layer.
  const navGroups = useMemo(() => {
    if (inSystem) return SYSTEM_NAV_GROUPS
    const swapped = NAV_GROUPS.map((g) => (g.label === 'Research' ? research.group : g))
    const ordered = orderGroups(swapped, order)
    const chain = ordered.filter((g) => LIFECYCLE[g.label] != null)
    // The one numeral that takes its layer's hue is the one you are standing
    // in (design Rev 2026-09-23.5) — read from the route, not from which row
    // happens to be active, because a page can belong to a layer whose group
    // holds no row for it (Contract Greeks under Risk is the standing case).
    const hereLayer = layerForPath(location.pathname)
    const marked = ordered.map((g) => {
      const n = LIFECYCLE[g.label]
      const here = LAYER_OF_GROUP[g.label] === hereLayer
      if (n == null) {
        return g.label === 'Home' ? { ...g, icon: lifecycleMark('·', { here }) } : g
      }
      const i = chain.indexOf(g)
      return {
        ...g,
        icon: lifecycleMark(String(n), {
          spine: order === 'loop',
          first: i === 0,
          last: i === chain.length - 1,
          here,
        }),
      }
    })
    // The shelf goes last, on purpose. Frequency argues for the top; honesty
    // argues for the bottom, because above the five layers a pin reads as a
    // sixth layer — the one claim a pin must not make. It carries the pin
    // glyph rather than a lifecycle numeral: it is a shortcut, not a step.
    if (pins.length > 0) {
      marked.push({
        label: SHELF_GROUP,
        icon: PinIcon,
        defaultOpen: true,
        items: pins.map((p) => ({
          id: `pin:${p.to}`,
          label: p.label,
          to: p.to,
          icon: PinIcon,
          // A pin to a page the app no longer has keeps its row and says so.
          // A shortcut that evaporates leaves the reader wondering whether
          // they imagined it.
          badge: isStalePin(p) ? 'stale' : undefined,
        })),
      })
    }
    return marked
    // `hereLayer` is read from the route, so the route is a dependency. It was
    // missing, and every navigation that does not reload — which is all of
    // them — left the previous page's numeral lit. Invisible in a
    // full-page check, obvious the moment you click through the tree.
  }, [inSystem, research.group, order, pins, location.pathname])

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
        // A pinned page lights its shelf row instead of its home row: two lit
        // rows for one page reads as a bug. Unpinned, it falls back to the
        // section that owns it (an objective lights Autopilot).
        activeId={
          pins.some((p) => p.to === location.pathname)
            ? `pin:${location.pathname}`
            : navRowFor(location.pathname)
        }
        matchActive={matchActiveRow}
        // The three-kind row grammar (design §5a, 2026-09-20). It replaces
        // the 2026-09-15 rule this side had adopted a day earlier — every
        // parent "expands first, navigates second" — which the design itself
        // then overturned: one row doing two things by a state the reader
        // cannot see is what made the tree feel split. Now a container row
        // only opens, a page-with-children splits label from caret, and the
        // caret's frame says which you are looking at.
        navRowSyntax
        onSelect={(item: ShellNavItem) => {
          navigate(item.to ?? item.id)
        }}
        renderItemIcon={(item) => <NavSubItemIcon item={item} />}
        // `item.id`, not `item.to`: a fold row borrows its first child's `to`,
        // so keying on `to` gives the heading its child's marks — the Analyze
        // heading wore Dossier's unit, and the Market heading lit a second
        // session lamp above Live's. A real page row has its own path as its
        // id; a fold's is `fold:...` and matches no route, which is the answer
        // a heading wants.
        //
        // A badge outranks the scope mark: a count is news, the unit of
        // analysis is a standing fact about the page.
        renderItemExtras={(item) => {
          if (item.id === LIVE_NAV_PATH) return <LiveNavLamp />
          return research.extras(item) ?? <ScopeMark path={item.id} />
        }}
        renderInAppLink={renderInAppLink}
        footer={<TradeSidebarFooter />}
        openGroupsStorageKey={
          inSystem ? STORAGE_KEYS.sidebarSystemOpenGroups : STORAGE_KEYS.sidebarOpenGroups
        }
        captionsStorageKey={STORAGE_KEYS.sidebarCaptions}
        accordionStorageKey={STORAGE_KEYS.sidebarAccordion}
      />
    </SystemNavLampProvider>
  )
}
