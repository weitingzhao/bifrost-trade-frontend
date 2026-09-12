import { NavLink, useLocation } from 'react-router-dom'
import { ExternalLink, Undo2 } from 'lucide-react'
import { shellNavCollapsedIconButtonClass, useSidebar } from '@bifrost/ui'
import { cn } from '@/lib/utils'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { OPS_CONSOLE_URL } from '@/lib/opsConsole'
import { isSystemRoute } from './routeRegistry'
import { SYSTEM_ICON, SYSTEM_ITEM } from './navConfig'

/**
 * Two destinations, and nothing else.
 *
 * It used to be four icons, two of them toggles that raised a docked panel
 * from the bottom of whatever page you were on. Both panels are pages now
 * (System › Topology, System › Platform), so the toggles had nothing left to
 * toggle. What remains is the way into the System tree — which replaces the
 * business tree, so it also needs the way back — and the Ops Console, which is
 * a different application.
 *
 * No lamp on the System row: the status bar already carries that reading, all
 * day, on every page. Two lamps for one fact is one lamp too many.
 */

const iconBtn = 'flex h-7 w-7 items-center justify-center rounded-md transition-colors'
const btnActive = 'bg-sidebar-accent text-sidebar-accent-foreground'
const btnIdle = 'text-sidebar-foreground/50 hover:bg-sidebar-accent hover:text-sidebar-foreground'

function OpsConsoleLink({ className, side }: { className: string; side: 'top' | 'right' }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <a href={OPS_CONSOLE_URL} target="_blank" rel="noreferrer" className={className}>
          <ExternalLink className={side === 'right' ? 'h-4 w-4 shrink-0' : 'h-3.5 w-3.5 opacity-70'} />
        </a>
      </TooltipTrigger>
      <TooltipContent side={side} className="text-xs font-medium">
        Open Bifrost Ops · environment matrix &amp; release program
      </TooltipContent>
    </Tooltip>
  )
}

/** Inside System the tree is gone, so the footer is the way out. */
function useFooterDestination() {
  const { pathname } = useLocation()
  return isSystemRoute(pathname)
    ? { to: '/', label: 'Back to Trade', Icon: Undo2, active: false }
    : { to: SYSTEM_ITEM.to ?? SYSTEM_ITEM.id, label: 'System', Icon: SYSTEM_ICON, active: false }
}

export function TradeSidebarFooter() {
  const { state } = useSidebar()
  const { to, label, Icon, active } = useFooterDestination()

  if (state === 'collapsed') {
    return (
      <>
        <OpsConsoleLink className={shellNavCollapsedIconButtonClass(false)} side="right" />
        <Tooltip>
          <TooltipTrigger asChild>
            <NavLink to={to} className={shellNavCollapsedIconButtonClass(active)}>
              <Icon className="h-4 w-4 shrink-0" />
            </NavLink>
          </TooltipTrigger>
          <TooltipContent side="right" className="text-xs font-medium">
            {label}
          </TooltipContent>
        </Tooltip>
      </>
    )
  }

  return (
    <div className="flex items-center px-2 py-1.5">
      <NavLink
        to={to}
        className={cn(
          'flex items-center gap-1.5 rounded-md px-1.5 py-1 text-xs font-medium transition-colors',
          active ? btnActive : btnIdle,
        )}
      >
        <Icon className="h-3.5 w-3.5 shrink-0 opacity-70" />
        <span>{label}</span>
      </NavLink>

      <div className="flex-1" />

      <OpsConsoleLink className={cn(iconBtn, btnIdle)} side="top" />
    </div>
  )
}
