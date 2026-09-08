import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import { Blocks, ExternalLink, Network } from 'lucide-react'
import { shellNavCollapsedIconButtonClass, useSidebar } from '@bifrost/ui'
import { cn } from '@/lib/utils'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { OPS_CONSOLE_URL } from '@/lib/opsConsole'
import { usePlatformPanel } from '@/hooks/usePlatformPanel'
import { useReactorMap } from '@/hooks/useReactorMap'
import { SETTINGS_ICON, SETTINGS_ITEM } from './navConfig'


/**
 * The Ops Console, as one icon rather than a two-line card.
 *
 * It was a permanent block above this row spending about fifty pixels of
 * sidebar to say "Environment matrix & release program" — a description the
 * Owner reads once and then never again. The destination matters; the sales
 * copy for it does not.
 */
function OpsConsoleButton({ className }: { className: string }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <a href={OPS_CONSOLE_URL} target="_blank" rel="noreferrer" className={className}>
          <ExternalLink className="h-3.5 w-3.5 opacity-70" />
        </a>
      </TooltipTrigger>
      <TooltipContent side="top" className="text-xs font-medium">
        Open Bifrost Ops · environment matrix &amp; release program
      </TooltipContent>
    </Tooltip>
  )
}

function LogAndSettingsFooter() {
  const location = useLocation()
  const { open: pluginsOpen, toggle: togglePlugins, attentionCount } = usePlatformPanel()
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

      <OpsConsoleButton className={cn(iconBtn, btnIdle)} />

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
          <button onClick={togglePlugins} className={cn(iconBtn, pluginsOpen ? btnActive : btnIdle)}>
            <div className="relative">
              <Blocks className="h-3.5 w-3.5 opacity-70" />
              {attentionCount > 0 && (
                <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5 items-center justify-center rounded-full bg-amber-500 text-[7px] font-bold text-white leading-none">
                  {attentionCount > 9 ? '9+' : attentionCount}
                </span>
              )}
            </div>
          </button>
        </TooltipTrigger>
        <TooltipContent side="top" className="text-xs font-medium">
          {pluginsOpen ? 'Close platform plugins' : 'Platform plugins'}
          {attentionCount > 0 ? ` · ${attentionCount} need${attentionCount > 1 ? '' : 's'} a look` : ''}
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
            <span className="absolute -top-0.5 -right-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-red-500 text-dense-micro font-bold text-white leading-none">
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
  const { open, toggle, attentionCount } = usePlatformPanel()
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          onClick={toggle}
          className={cn('relative', shellNavCollapsedIconButtonClass(open))}
        >
          <Blocks className="h-4 w-4 shrink-0" />
          {attentionCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-amber-500 text-dense-micro font-bold text-white leading-none">
              {attentionCount > 9 ? '9+' : attentionCount}
            </span>
          )}
        </button>
      </TooltipTrigger>
      <TooltipContent side="right" className="text-xs font-medium">
        Platform plugins {attentionCount > 0 ? `· ${attentionCount} need${attentionCount > 1 ? '' : 's'} a look` : ''}
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
        <Tooltip>
          <TooltipTrigger asChild>
            <a
              href={OPS_CONSOLE_URL}
              target="_blank"
              rel="noreferrer"
              className={shellNavCollapsedIconButtonClass(false)}
            >
              <ExternalLink className="h-4 w-4 shrink-0" />
            </a>
          </TooltipTrigger>
          <TooltipContent side="right" className="text-xs font-medium">
            Open Bifrost Ops
          </TooltipContent>
        </Tooltip>
        <CollapsedReactorButton />
        <CollapsedLogButton />
        <CollapsedSettingsButton />
      </>
    )
  }

  return <LogAndSettingsFooter />
}
