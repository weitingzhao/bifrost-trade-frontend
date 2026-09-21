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
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import { omnibar } from '@/lib/omnibar'
import { useCopilotDock } from '@/hooks/useCopilotDock'
import { routeFor } from './routeRegistry'
import { useCrumbLabel } from './useCrumbLabel'
import { Lens } from './Lens'
import {
  SHELL_TOP_BAR_CONTROL_CLASS,
  SHELL_TOP_BAR_HEIGHT_CLASS,
  SHELL_TOP_BAR_KBD_CLASS,
} from './shellChrome'

export function AppHeader() {
  const location = useLocation()
  const { label: registryLabel, crumbs } = routeFor(location.pathname)
  const label = useCrumbLabel(location.pathname, registryLabel)
  const copilot = useCopilotDock()

  return (
    <header
      className={cn(
        SHELL_TOP_BAR_HEIGHT_CLASS,
        // 10px between controls, 12px from the edge — the design's own
        // `gap: 6px 10px; padding: 5px 12px`.
        'flex items-center gap-x-2.5 border-b border-border bg-card px-3',
        // The layer's one accent line, on the top bar's bottom edge — the
        // design puts it here rather than on the page header, which renders as
        // an unclassed div with nothing stable to hook. The product is dark
        // only (Owner, 2026-09-13), so there is no light mode to exempt.
        'border-b-2 border-primary',
      )}
    >
      {/* Sized and framed like every other control on the bar. The glyph
          stays chevrons rather than the design's panel rect: it comes from
          `@bifrost/ui`, and which way they point is a reading the Ops Console
          gets too. */}
      <SidebarTrigger
        className="size-7 shrink-0 rounded-sm border border-border"
        aria-label="Toggle sidebar"
      />
      <nav
        aria-label="Breadcrumb"
        className="flex min-w-0 shrink items-center gap-1.5 text-dense-body"
      >
        {crumbs?.map((crumb) => (
          <span key={crumb} className="hidden shrink-0 items-center gap-1.5 text-muted-foreground sm:flex">
            {crumb}
            {/* `›`, the design's own separator. A slash reads as a path; the
                trail is a place inside a place. */}
            <span aria-hidden="true" className="text-border">›</span>
          </span>
        ))}
        {/* The leaf carries full ink and 600, the trail behind it does not:
            that weight step is the whole reason a breadcrumb reads as "here,
            and how you got here" rather than as a row of equal words. */}
        <span aria-current="page" className="min-w-0 truncate font-semibold text-foreground">
          {label}
        </span>
      </nav>
      {/* The one control that takes the slack: `flex: 1 1 220px` between a
          180 floor and a 440 ceiling, so the bar breathes here and nowhere
          else. */}
      <button
        type="button"
        onClick={omnibar.open}
        className={cn(
          SHELL_TOP_BAR_CONTROL_CLASS,
          'ml-1.5 hidden min-w-[180px] max-w-[440px] flex-1 bg-background text-muted-foreground hover:bg-secondary md:inline-flex',
        )}
        aria-label="Open the Omnibar"
      >
        <Search className="h-3 w-3 shrink-0" aria-hidden />
        <span className="flex-1 truncate text-left">Symbol, page, or command</span>
        <kbd className={SHELL_TOP_BAR_KBD_CLASS}>⌘K</kbd>
      </button>

      {/* The right cluster: `margin-left: auto`, 8px between. Two controls,
          one edge — before this they were loose flex children and the gap
          between them was whatever the bar had left over. */}
      <div className="ml-auto flex shrink-0 items-center gap-2">
        {/* One control for every scope the shell carries (design 2026-09-20.8:
            TopBar = position and focus). It replaces the standalone symbol
            chip rather than sitting beside it — two controls for one idea is
            the duplication that ruling removed. The alert bell that used to
            sit to its right is gone with it. */}
        <Lens />

        {/* The fourth item. ⌘J was the only way to it, which made the Copilot
            discoverable to whoever already knew about it — the design puts it
            on the bar for the same reason the Omnibar shows its own key. */}
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              onClick={copilot.toggle}
              aria-pressed={copilot.open}
              className={cn(
                SHELL_TOP_BAR_CONTROL_CLASS,
                'shrink-0',
                copilot.open
                  ? 'border-primary/45 bg-primary/[0.08] text-primary'
                  : 'text-muted-foreground hover:bg-secondary hover:text-foreground',
              )}
            >
              <MessageSquare className="h-3 w-3" aria-hidden />
              <span className="hidden lg:inline">Copilot</span>
              {/* The design prints the key on the button, as the Omnibar does:
                  a control whose shortcut is invisible is a shortcut only for
                  whoever already knew it. */}
              <kbd className={cn(SHELL_TOP_BAR_KBD_CLASS, 'hidden lg:inline')}>⌘J</kbd>
            </button>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            {copilot.open ? 'Close the Research Copilot' : 'Open the Research Copilot'} · ⌘J
          </TooltipContent>
        </Tooltip>
      </div>
    </header>
  )
}
