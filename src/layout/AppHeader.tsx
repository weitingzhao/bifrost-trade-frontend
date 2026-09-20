/**
 * The top bar: where you are, and what you are looking through.
 *
 * Design 2026-09-20.8 divided the three horizontal bars by job — **TopBar =
 * position and focus**, StatusBar = health and alerts, sidebar foot = where to
 * go — and cut this one to four items on the finding that its extras were all
 * duplicates. Two went: a System button whose lamp the status bar already
 * carried, and an alert bell whose count the status bar already carried (and
 * which collided with the Decision Inbox on the word). What is left is
 * breadcrumb · ⌘K · Lens · Copilot, and none of the four repeats anything
 * else on screen.
 */
import { MessageSquare, Search } from 'lucide-react'
import { useLocation } from 'react-router-dom'
import { SidebarTrigger } from '@/components/ui/sidebar'
import { Separator } from '@/components/ui/separator'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import { omnibar } from '@/lib/omnibar'
import { useCopilotDock } from '@/hooks/useCopilotDock'
import { routeFor } from './routeRegistry'
import { Lens } from './Lens'
import { SHELL_TOP_BAR_HEIGHT_CLASS } from './shellChrome'

export function AppHeader() {
  const location = useLocation()
  const { label, crumbs } = routeFor(location.pathname)
  const copilot = useCopilotDock()

  return (
    <header
      className={cn(
        SHELL_TOP_BAR_HEIGHT_CLASS,
        'flex items-center gap-2 border-b border-border bg-card px-4',
        // The layer's one accent line, on the top bar's bottom edge — the
        // design puts it here rather than on the page header, which renders as
        // an unclassed div with nothing stable to hook. The product is dark
        // only (Owner, 2026-09-13), so there is no light mode to exempt.
        'border-b-2 border-primary',
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

      {/* One control for every scope the shell carries (design 2026-09-20.8:
          TopBar = position and focus). It replaces the standalone symbol chip
          rather than sitting beside it — two controls for one idea is the
          duplication that ruling removed.

          The alert bell that used to sit to its right is gone with it. */}
      <Lens />

      {/* The fourth item. ⌘J was the only way to it, which made the Copilot
          discoverable to whoever already knew about it — the design puts it on
          the bar for the same reason the Omnibar shows its own key. */}
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            onClick={copilot.toggle}
            aria-pressed={copilot.open}
            className={cn(
              'inline-flex h-6 shrink-0 items-center gap-1.25 rounded border px-1.75 text-dense-micro transition-colors',
              copilot.open
                ? 'border-primary/45 bg-primary/[0.08] text-primary'
                : 'border-border text-muted-foreground hover:bg-secondary hover:text-foreground',
            )}
          >
            <MessageSquare className="h-3 w-3" aria-hidden />
            <span className="hidden lg:inline">Copilot</span>
          </button>
        </TooltipTrigger>
        <TooltipContent side="bottom">
          {copilot.open ? 'Close the Research Copilot' : 'Open the Research Copilot'} · ⌘J
        </TooltipContent>
      </Tooltip>
    </header>
  )
}
