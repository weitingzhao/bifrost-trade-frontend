import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import { Network, ScrollText } from 'lucide-react'
import { shellNavCollapsedIconButtonClass, useSidebar } from '@bifrost/ui'
import { cn } from '@/lib/utils'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { useLogPanel } from '@/hooks/useLogPanel'
import { useReactorMap } from '@/hooks/useReactorMap'
import { SETTINGS_ICON, SETTINGS_ITEM } from './navConfig'

function LogAndSettingsFooter() {
  const location = useLocation()
  const { open: logsOpen, toggle: toggleLogs, errorCount } = useLogPanel()
  const { open: reactorOpen, toggle: toggleReactor, alertCount } = useReactorMap()
  const settingsActive = location.pathname.startsWith('/settings')

  const iconBtn = 'flex h-7 w-7 items-center justify-center rounded-md transition-colors'
  const btnActive = 'bg-sidebar-accent text-sidebar-accent-foreground'
  const btnIdle = 'text-sidebar-foreground/50 hover:bg-sidebar-accent hover:text-sidebar-foreground'

  return (
    <div className="flex items-center px-2 py-1.5">
      <NavLink
        to={SETTINGS_ITEM.to ?? SETTINGS_ITEM.id}
        className={cn(
          'flex items-center gap-1.5 rounded-md px-1.5 py-1 text-xs font-medium transition-colors',
          settingsActive ? btnActive : btnIdle,
        )}
      >
        <SETTINGS_ICON className="h-3.5 w-3.5 shrink-0 opacity-70" />
        <span>{SETTINGS_ITEM.label}</span>
      </NavLink>

      <div className="flex-1" />

      <Tooltip>
        <TooltipTrigger asChild>
          <button onClick={toggleReactor} className={cn(iconBtn, reactorOpen ? btnActive : btnIdle)}>
            <div className="relative">
              <Network className="h-3.5 w-3.5 opacity-70" />
              {alertCount > 0 && (
                <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5 items-center justify-center rounded-full bg-red-500 text-[7px] font-bold text-white leading-none">
                  {alertCount > 9 ? '9+' : alertCount}
                </span>
              )}
            </div>
          </button>
        </TooltipTrigger>
        <TooltipContent side="top" className="text-xs font-medium">
          {reactorOpen ? 'Close Reactor Map' : 'Reactor Map'}
          {alertCount > 0 ? ` · ${alertCount} offline` : ''}
        </TooltipContent>
      </Tooltip>

      <Tooltip>
        <TooltipTrigger asChild>
          <button onClick={toggleLogs} className={cn(iconBtn, logsOpen ? btnActive : btnIdle)}>
            <div className="relative">
              <ScrollText className="h-3.5 w-3.5 opacity-70" />
              {errorCount > 0 && (
                <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5 items-center justify-center rounded-full bg-red-500 text-[7px] font-bold text-white leading-none">
                  {errorCount > 9 ? '9+' : errorCount}
                </span>
              )}
            </div>
          </button>
        </TooltipTrigger>
        <TooltipContent side="top" className="text-xs font-medium">
          {logsOpen ? 'Close logs' : 'Logs'}
          {errorCount > 0 ? ` · ${errorCount} error${errorCount > 1 ? 's' : ''}` : ''}
        </TooltipContent>
      </Tooltip>
    </div>
  )
}

function CollapsedReactorButton() {
  const { open, toggle, alertCount } = useReactorMap()
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          onClick={toggle}
          className={cn('relative', shellNavCollapsedIconButtonClass(open))}
        >
          <Network className="h-4 w-4 shrink-0" />
          {alertCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white leading-none">
              {alertCount > 9 ? '9+' : alertCount}
            </span>
          )}
        </button>
      </TooltipTrigger>
      <TooltipContent side="right" className="text-xs font-medium">
        Reactor Map {alertCount > 0 ? `· ${alertCount} offline` : ''}
      </TooltipContent>
    </Tooltip>
  )
}

function CollapsedLogButton() {
  const { open, toggle, errorCount } = useLogPanel()
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          onClick={toggle}
          className={cn('relative', shellNavCollapsedIconButtonClass(open))}
        >
          <ScrollText className="h-4 w-4 shrink-0" />
          {errorCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white leading-none">
              {errorCount > 9 ? '9+' : errorCount}
            </span>
          )}
        </button>
      </TooltipTrigger>
      <TooltipContent side="right" className="text-xs font-medium">
        Logs {errorCount > 0 ? `· ${errorCount} error${errorCount > 1 ? 's' : ''}` : ''}
      </TooltipContent>
    </Tooltip>
  )
}

function CollapsedSettingsButton() {
  const location = useLocation()
  const navigate = useNavigate()
  const isActive = location.pathname.startsWith('/settings')
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          onClick={() => navigate(SETTINGS_ITEM.to ?? SETTINGS_ITEM.id)}
          className={shellNavCollapsedIconButtonClass(isActive)}
        >
          <SETTINGS_ICON className="h-4 w-4 shrink-0" />
        </button>
      </TooltipTrigger>
      <TooltipContent side="right" className="text-xs font-medium">
        {SETTINGS_ITEM.label}
      </TooltipContent>
    </Tooltip>
  )
}

export function TradeSidebarFooter() {
  const { state } = useSidebar()
  const isCollapsed = state === 'collapsed'

  if (isCollapsed) {
    return (
      <>
        <CollapsedReactorButton />
        <CollapsedLogButton />
        <CollapsedSettingsButton />
      </>
    )
  }

  return <LogAndSettingsFooter />
}
