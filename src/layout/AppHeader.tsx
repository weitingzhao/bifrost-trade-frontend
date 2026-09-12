import { Bell, Moon, PanelTop, Sun, SunMoon } from 'lucide-react'
import { useLocation } from 'react-router-dom'
import { DenseTag } from '@/components/data-display'
import { SEAT_META, useResearchSeat } from '@/lib/research/seat'
import { AlertBell } from '@/components/research/AlertBell'
import { Button } from '@/components/ui/button'
import { SidebarTrigger } from '@/components/ui/sidebar'
import { Separator } from '@/components/ui/separator'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { useThemeMode, THEME_LABELS } from '@/hooks/useThemeMode'
import { cn } from '@/lib/utils'
import { routeFor } from './routeRegistry'
import { SHELL_TOP_BAR_HEIGHT_CLASS } from './shellChrome'

interface AppHeaderProps {
  activeMsgCount?: number
  onOpenMessages?: () => void
  onToggleNavMode?: () => void
}

function ResearchSeatChip() {
  const seat = useResearchSeat()
  const m = SEAT_META[seat]
  return (
    <DenseTag variant="neutral" size="cell" title={`${m.level} — ${m.claim}`} className="hidden md:inline-flex">
      {m.label} seat
    </DenseTag>
  )
}

export function AppHeader({ activeMsgCount = 0, onOpenMessages, onToggleNavMode }: AppHeaderProps) {
  const location = useLocation()
  const { mode, cycleMode } = useThemeMode()
  const { label, crumbs } = routeFor(location.pathname)

  return (
    <header
      className={cn(
        SHELL_TOP_BAR_HEIGHT_CLASS,
        'flex items-center gap-2 border-b border-border bg-card px-4',
      )}
    >
      <SidebarTrigger className="-ml-1" aria-label="Toggle sidebar" />
      <Separator orientation="vertical" className="h-4" />
      <nav
        aria-label="Breadcrumb"
        className="flex min-w-0 flex-1 items-center gap-1.5 text-sm md:flex-none md:max-w-none"
      >
        {crumbs?.map((crumb) => (
          <span key={crumb} className="hidden shrink-0 items-center gap-1.5 text-muted-foreground sm:flex">
            {crumb}
            <span aria-hidden="true" className="text-border">/</span>
          </span>
        ))}
        <span aria-current="page" className="min-w-0 truncate font-medium">
          {label}
        </span>
      </nav>
      {location.pathname.startsWith('/research') ? <ResearchSeatChip /> : null}

      <div className="ml-auto flex shrink-0 items-center gap-1">
        {onToggleNavMode && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onToggleNavMode} aria-label="Switch to top navigation">
                <PanelTop className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">Switch to top navigation</TooltipContent>
          </Tooltip>
        )}

        <AlertBell />

        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" className="relative h-8 w-8" onClick={onOpenMessages} aria-label="Open messages">
              <Bell className="h-4 w-4" />
              {activeMsgCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-0.5 text-dense-micro font-bold text-white leading-none">
                  {activeMsgCount > 9 ? '9+' : activeMsgCount}
                </span>
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            {activeMsgCount > 0 ? `${activeMsgCount} unread message${activeMsgCount > 1 ? 's' : ''}` : 'Messages'}
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={cycleMode} aria-label="Toggle theme">
              {mode === 'auto'  && <SunMoon className="h-4 w-4" />}
              {mode === 'light' && <Sun    className="h-4 w-4" />}
              {mode === 'dark'  && <Moon   className="h-4 w-4" />}
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">{THEME_LABELS[mode]}</TooltipContent>
        </Tooltip>
      </div>
    </header>
  )
}
