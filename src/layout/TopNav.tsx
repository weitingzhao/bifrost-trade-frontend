import { useEffect, useRef, useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { Bell, ChevronDown, Moon, Sun, SunMoon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { NAV_GROUPS, SETTINGS_ITEM } from './navConfig'
import type { NavGroup } from './navConfig'

type ThemeMode = 'auto' | 'light' | 'dark'
const THEME_KEY = 'bifrost-theme'
const THEME_CYCLE: Record<ThemeMode, ThemeMode> = { auto: 'light', light: 'dark', dark: 'auto' }
const THEME_LABEL: Record<ThemeMode, string> = { auto: 'Auto (System)', light: 'Light', dark: 'Dark' }

function applyTheme(mode: ThemeMode) {
  const dark = mode === 'dark' || (mode === 'auto' && window.matchMedia('(prefers-color-scheme: dark)').matches)
  document.documentElement.classList.toggle('dark', dark)
}

function readTheme(): ThemeMode {
  const saved = localStorage.getItem(THEME_KEY)
  return saved === 'light' || saved === 'dark' || saved === 'auto' ? saved : 'auto'
}

interface GroupMenuProps {
  group: NavGroup
  isOpen: boolean
  onToggle: () => void
  onClose: () => void
}

function GroupMenu({ group, isOpen, onToggle, onClose }: GroupMenuProps) {
  const location = useLocation()
  const ref = useRef<HTMLDivElement>(null)
  const isActive = group.items.some((i) => location.pathname.startsWith(i.to))

  useEffect(() => {
    if (!isOpen) return
    function handleMouseDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose()
    }
    document.addEventListener('mousedown', handleMouseDown)
    return () => document.removeEventListener('mousedown', handleMouseDown)
  }, [isOpen, onClose])

  return (
    <div ref={ref} className="relative shrink-0">
      <button
        onClick={onToggle}
        className={cn(
          'flex items-center gap-1 h-8 px-2.5 rounded text-xs font-medium transition-colors',
          isActive
            ? 'bg-primary text-primary-foreground'
            : 'text-muted-foreground hover:bg-muted hover:text-foreground',
        )}
      >
        {group.label}
        <ChevronDown
          className={cn('h-3 w-3 shrink-0 transition-transform duration-150', isOpen && 'rotate-180')}
        />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 z-50 mt-1 min-w-36 rounded-md border border-border bg-popover shadow-lg py-1">
          {group.items.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={onClose}
              className={({ isActive: a }) =>
                cn(
                  'flex items-center gap-2 px-3 py-1.5 text-xs transition-colors hover:bg-muted',
                  a ? 'text-foreground font-medium' : 'text-muted-foreground',
                )
              }
            >
              <item.icon className="h-3.5 w-3.5 shrink-0" />
              {item.label}
            </NavLink>
          ))}
        </div>
      )}
    </div>
  )
}

interface Props {
  activeMsgCount?: number
  onOpenMessages?: () => void
}

export function TopNav({ activeMsgCount = 0, onOpenMessages }: Props) {
  const [openGroup, setOpenGroup] = useState<string | null>(null)
  const [mode, setMode] = useState<ThemeMode>(readTheme)

  // Apply theme
  useEffect(() => {
    applyTheme(mode)
    localStorage.setItem(THEME_KEY, mode)
    if (mode !== 'auto') return
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const handler = () => applyTheme('auto')
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [mode])

  const handleClose = () => setOpenGroup(null)

  return (
    <header className="flex h-12 shrink-0 items-center gap-1 border-b border-border bg-sidebar px-2">
      {/* Brand mark */}
      <span className="text-xs font-bold text-sidebar-foreground px-1.5 mr-1 shrink-0">
        Bifrost
      </span>

      {/* Scrollable nav groups */}
      <nav className="flex flex-1 items-center gap-0.5 overflow-x-auto scrollbar-none min-w-0">
        {NAV_GROUPS.map((group) => (
          <GroupMenu
            key={group.label}
            group={group}
            isOpen={openGroup === group.label}
            onToggle={() => setOpenGroup((prev) => (prev === group.label ? null : group.label))}
            onClose={handleClose}
          />
        ))}

        <NavLink
          to={SETTINGS_ITEM.to}
          className={({ isActive }) =>
            cn(
              'flex items-center gap-1 h-8 px-2.5 rounded text-xs font-medium shrink-0 transition-colors',
              isActive
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground',
            )
          }
        >
          <SETTINGS_ITEM.icon className="h-3.5 w-3.5" />
          {SETTINGS_ITEM.label}
        </NavLink>
      </nav>

      {/* Controls */}
      <div className="flex items-center gap-0.5 shrink-0 ml-1">
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
              onClick={() => setMode((m) => THEME_CYCLE[m])}
              aria-label="Toggle theme"
            >
              {mode === 'auto' && <SunMoon className="h-4 w-4" />}
              {mode === 'light' && <Sun className="h-4 w-4" />}
              {mode === 'dark' && <Moon className="h-4 w-4" />}
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">{THEME_LABEL[mode]}</TooltipContent>
        </Tooltip>
      </div>
    </header>
  )
}
