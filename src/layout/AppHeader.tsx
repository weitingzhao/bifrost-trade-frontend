import { Moon, Search, Sun, SunMoon } from 'lucide-react'
import { useLocation } from 'react-router-dom'
import { DenseTag } from '@/components/data-display'
import { SEAT_META, useResearchSeat } from '@/lib/research/seat'
import { Button } from '@/components/ui/button'
import { SidebarTrigger } from '@/components/ui/sidebar'
import { Separator } from '@/components/ui/separator'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { useThemeMode, THEME_LABELS } from '@/hooks/useThemeMode'
import { cn } from '@/lib/utils'
import { omnibar } from '@/lib/omnibar'
import { InboxBell } from './InboxBell'
import type { InboxSummary } from '@/hooks/useInbox'
import { routeFor } from './routeRegistry'
import { SymbolChip } from './SymbolChip'
import { SHELL_TOP_BAR_HEIGHT_CLASS } from './shellChrome'

interface AppHeaderProps {
  inbox: InboxSummary
  onOpenInbox: () => void
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

export function AppHeader({ inbox, onOpenInbox }: AppHeaderProps) {
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
      <button
        type="button"
        onClick={omnibar.open}
        className="hidden h-6 max-w-[460px] flex-1 items-center gap-2 rounded border border-border bg-secondary/40 px-2 text-dense-micro text-muted-foreground transition-colors hover:bg-secondary md:flex"
        aria-label="Open the Omnibar"
      >
        <Search className="h-3 w-3" aria-hidden />
        <span>Symbol, page, or command</span>
        <kbd className="ml-auto font-mono opacity-70">⌘K</kbd>
      </button>

      <SymbolChip />
      {location.pathname.startsWith('/research') ? <ResearchSeatChip /> : null}

      <div className="ml-auto flex shrink-0 items-center gap-1">
        {/* One bell. There were two here — a Radar for analyze alerts with a
            popover of its own, and this one for system messages — either of
            which could be showing a count with no way to tell which mattered
            more. Both are groups inside the Inbox now. */}
        <InboxBell summary={inbox} onOpen={onOpenInbox} />

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
