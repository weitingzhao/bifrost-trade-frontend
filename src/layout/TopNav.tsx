import { useRef, useState, useEffect } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { Bell, ChevronDown, Moon, Network, PanelLeft, ScrollText, Sun, SunMoon } from 'lucide-react'
import { useLogPanel } from '@/hooks/useLogPanel'
import { useReactorMap } from '@/hooks/useReactorMap'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { getAllItems, NAV_GROUPS, SETTINGS_ITEM } from './navConfig'
import type { NavGroup, NavItem } from './navConfig'
import { BifrostLogoMark } from '@/components/BifrostLogo'
import { useThemeMode, THEME_LABELS } from '@/hooks/useThemeMode'
import { useTopNavIconOnly } from '@/hooks/useTopNavIconOnly'
import { SHELL_TOP_BAR_HEIGHT_CLASS } from './shellChrome'

// Renders a single dropdown item; if it has children shows them indented below.
function DropdownItem({ item, onClose, depth = 0 }: { item: NavItem; onClose: () => void; depth?: number }) {
  const location = useLocation()
  const hasChildren = item.children && item.children.length > 0
  const childActive = hasChildren
    ? item.children!.some((c) => location.pathname.startsWith(c.to))
    : false
  const [open, setOpen] = useState(location.pathname.startsWith(item.to) || childActive)
  const pl = depth === 0 ? 'px-3' : 'pl-6 pr-3'

  return (
    <div>
      <div className="flex items-center">
        <NavLink
          to={item.to}
          onClick={onClose}
          className={({ isActive: a }) =>
            cn(
              `flex flex-1 items-center gap-2 ${pl} py-1.5 text-xs transition-colors hover:bg-muted`,
              (a || childActive) ? 'text-foreground font-medium' : 'text-muted-foreground',
            )
          }
        >
          <item.icon className="h-3.5 w-3.5 shrink-0" />
          {item.label}
        </NavLink>
        {hasChildren && (
          <button
            onClick={() => setOpen((o) => !o)}
            className="shrink-0 flex h-6 w-6 items-center justify-center text-muted-foreground/50 hover:text-muted-foreground"
            aria-label={open ? `Collapse ${item.label}` : `Expand ${item.label}`}
          >
            <ChevronDown className={cn('h-3 w-3 transition-transform', open && 'rotate-180')} />
          </button>
        )}
      </div>
      {hasChildren && open && (
        <div>
          {item.children!.map((child) => (
            <DropdownItem key={child.to} item={child} onClose={onClose} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  )
}

interface GroupMenuProps {
  group: NavGroup
  isOpen: boolean
  onToggle: () => void
  onClose: () => void
  iconOnly?: boolean
}

function GroupMenu({ group, isOpen, onToggle, onClose, iconOnly = false }: GroupMenuProps) {
  const location = useLocation()
  const ref = useRef<HTMLDivElement>(null)
  const allItems = getAllItems(group)
  const isActive = allItems.some((i) => location.pathname.startsWith(i.to))

  useEffect(() => {
    if (!isOpen) return
    function handleMouseDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose()
    }
    document.addEventListener('mousedown', handleMouseDown)
    return () => document.removeEventListener('mousedown', handleMouseDown)
  }, [isOpen, onClose])

  const trigger = (
    <button
      onClick={onToggle}
      aria-label={group.label}
      aria-expanded={isOpen}
      className={cn(
        'flex items-center rounded text-xs font-medium transition-colors',
        iconOnly
          ? 'h-8 w-8 justify-center'
          : 'h-8 gap-1 px-2.5',
        isActive
          ? 'bg-primary text-primary-foreground'
          : 'text-muted-foreground hover:bg-muted hover:text-foreground',
      )}
    >
      {iconOnly ? (
        <group.icon className="h-4 w-4 shrink-0" />
      ) : (
        <>
          {group.label}
          <ChevronDown
            className={cn('h-3 w-3 shrink-0 transition-transform duration-150', isOpen && 'rotate-180')}
          />
        </>
      )}
    </button>
  )

  return (
    <div ref={ref} className="relative shrink-0">
      {iconOnly ? (
        <Tooltip>
          <TooltipTrigger asChild>{trigger}</TooltipTrigger>
          <TooltipContent side="bottom">{group.label}</TooltipContent>
        </Tooltip>
      ) : (
        trigger
      )}

      {isOpen && (
        <div className="absolute top-full left-0 z-50 mt-1 min-w-44 rounded-md border border-border bg-popover shadow-lg py-1">
          {/* Flat items (with optional nested children) */}
          {group.items?.map((item) => (
            <DropdownItem key={item.to} item={item} onClose={onClose} />
          ))}

          {/* Sub-grouped items with section labels */}
          {group.subGroups?.map((sg, idx) => (
            <div key={sg.label}>
              {idx > 0 && <div className="my-1 border-t border-border/50" />}
              <p className="px-3 pt-1.5 pb-0.5 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60 select-none">
                {sg.label}
              </p>
              {sg.items.map((item) => (
                <DropdownItem key={item.to} item={item} onClose={onClose} />
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

interface Props {
  activeMsgCount?: number
  onOpenMessages?: () => void
  /** Provided only when screen is wide enough to switch; absent on narrow screens. */
  onToggleNavMode?: () => void
}

export function TopNav({ activeMsgCount = 0, onOpenMessages, onToggleNavMode }: Props) {
  const [openGroup, setOpenGroup] = useState<string | null>(null)
  const iconOnly = useTopNavIconOnly()
  const { mode, cycleMode } = useThemeMode()
  const { open: reactorOpen, toggle: toggleReactor, alertCount } = useReactorMap()
  const { open: logsOpen, toggle: toggleLogs, errorCount } = useLogPanel()
  const handleClose = () => setOpenGroup(null)

  const settingsLink = (
    <NavLink
      to={SETTINGS_ITEM.to}
      aria-label={SETTINGS_ITEM.label}
      className={({ isActive }) =>
        cn(
          'flex items-center rounded text-xs font-medium shrink-0 transition-colors',
          iconOnly ? 'h-8 w-8 justify-center' : 'h-8 gap-1 px-2.5',
          isActive
            ? 'bg-primary text-primary-foreground'
            : 'text-muted-foreground hover:bg-muted hover:text-foreground',
        )
      }
    >
      <SETTINGS_ITEM.icon className={iconOnly ? 'h-4 w-4' : 'h-3.5 w-3.5'} />
      {!iconOnly && SETTINGS_ITEM.label}
    </NavLink>
  )

  return (
    <header
      className={cn(
        SHELL_TOP_BAR_HEIGHT_CLASS,
        'flex items-center gap-1 border-b border-border bg-sidebar px-2',
      )}
    >
      {/* Brand mark */}
      <div className="flex items-center gap-2 px-1 shrink-0">
        <BifrostLogoMark size={26} />
        {!iconOnly && (
          <div className="flex flex-col leading-tight">
            <span className="text-[12px] font-bold tracking-tight text-sidebar-primary leading-none">
              Bifrost
            </span>
            <span className="text-[8px] font-semibold uppercase tracking-[0.14em] text-sidebar-foreground/40 leading-none mt-0.5">
              Trade
            </span>
          </div>
        )}
      </div>

      {/* Nav groups — no overflow container so absolute dropdowns are not clipped */}
      <nav className="flex flex-1 items-center gap-0.5 min-w-0 flex-nowrap">
        {NAV_GROUPS.map((group) => (
          <GroupMenu
            key={group.label}
            group={group}
            isOpen={openGroup === group.label}
            onToggle={() => setOpenGroup((prev) => (prev === group.label ? null : group.label))}
            onClose={handleClose}
            iconOnly={iconOnly}
          />
        ))}

        {iconOnly ? (
          <Tooltip>
            <TooltipTrigger asChild>{settingsLink}</TooltipTrigger>
            <TooltipContent side="bottom">{SETTINGS_ITEM.label}</TooltipContent>
          </Tooltip>
        ) : (
          settingsLink
        )}
      </nav>

      {/* Controls */}
      <div className="flex items-center gap-0.5 shrink-0 ml-1">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className={cn('relative h-8 w-8', reactorOpen && 'bg-muted')}
              onClick={toggleReactor}
              aria-label="Reactor Map"
            >
              <Network className="h-4 w-4" />
              {alertCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-0.5 text-[9px] font-bold text-white leading-none">
                  {alertCount > 9 ? '9+' : alertCount}
                </span>
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">Reactor Map</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className={cn('relative h-8 w-8', logsOpen && 'bg-muted')}
              onClick={toggleLogs}
              aria-label="Logs"
            >
              <ScrollText className="h-4 w-4" />
              {errorCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-0.5 text-[9px] font-bold text-white leading-none">
                  {errorCount > 9 ? '9+' : errorCount}
                </span>
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">Logs</TooltipContent>
        </Tooltip>

        {/* Nav mode toggle: switch to Sidebar */}
        {onToggleNavMode && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onToggleNavMode} aria-label="Switch to sidebar navigation">
                <PanelLeft className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">Switch to sidebar navigation</TooltipContent>
          </Tooltip>
        )}

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="relative h-8 w-8"
              onClick={onOpenMessages}
              aria-label="Messages"
            >
              <Bell className="h-4 w-4" />
              {activeMsgCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-0.5 text-[9px] font-bold text-white leading-none">
                  {activeMsgCount > 9 ? '9+' : activeMsgCount}
                </span>
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            {activeMsgCount > 0 ? `${activeMsgCount} unread` : 'Messages'}
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={cycleMode}
              aria-label="Toggle theme"
            >
              {mode === 'auto'  && <SunMoon className="h-4 w-4" />}
              {mode === 'light' && <Sun     className="h-4 w-4" />}
              {mode === 'dark'  && <Moon    className="h-4 w-4" />}
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">{THEME_LABELS[mode]}</TooltipContent>
        </Tooltip>
      </div>
    </header>
  )
}
