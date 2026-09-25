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
 * else on screen. Rev .55 split the Lens: the symbol rides in the ⌘K field as
 * its prefix token, the objective has its own control, and the account stays
 * each page's own.
 */
import { MessageSquare, Search } from 'lucide-react'
import { Link, useLocation } from 'react-router-dom'
import { SidebarTrigger } from '@/components/ui/sidebar'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import { omnibar } from '@/lib/omnibar'
import { toggleThread, useThread } from '@/hooks/useCopilotThread'
import { PAGE_ROUTES, routeFor } from './routeRegistry'
import { crumbLinks } from './crumbLinks'
import { NAV_GROUPS, SYSTEM_ITEM } from './navConfig'
import { usePageHeadVisibility } from './usePageHeadVisibility'
import { useCrumbLabel } from './useCrumbLabel'
import { useSymbolContext } from '@/lib/symbolContext'
import { ObjectiveControl } from './ObjectiveControl'
import { useSymbolGo } from './symbolGo'
import {
  SHELL_TOP_BAR_CONTROL_CLASS,
  SHELL_TOP_BAR_HEIGHT_CLASS,
  SHELL_TOP_BAR_KBD_CLASS,
} from './shellChrome'

/** Top-level headings a first crumb can fall back to; System's is its first page. */
const CRUMB_GROUPS = [...NAV_GROUPS, { label: 'System', to: SYSTEM_ITEM.to }]

export function AppHeader() {
  const location = useLocation()
  const { label: registryLabel, crumbs } = routeFor(location.pathname)
  const label = useCrumbLabel(location.pathname, registryLabel)
  const thread = useThread()
  const { symbol, isScoped, clearSymbol } = useSymbolContext()
  const symbolGo = useSymbolGo()
  const trail = crumbLinks(crumbs ?? [], PAGE_ROUTES, CRUMB_GROUPS)
  // §16.12: while the page head shows the page's name, the leaf (and the `›`
  // before it) folds; it fades back once the head scrolls away. A page that
  // has not moved to PageHead reports nothing, and keeps its leaf.
  const leafFolded = usePageHeadVisibility() === 'in'

  return (
    <header
      className={cn(
        SHELL_TOP_BAR_HEIGHT_CLASS,
        // 10px between controls, 12px from the edge — the design's own
        // `gap: 6px 10px; padding: 5px 12px`.
        'flex items-center gap-x-2.5 border-b px-3',
        // The layer's one line, on the top bar's bottom edge — the design puts
        // it here rather than on the page header, which renders as an
        // unclassed div with nothing stable to hook.
        //
        // It reads `--sk-layer`, not the accent. Until Package 2026-09-23.3
        // the accent *was* the layer's hue, so `border-primary` said where you
        // were standing by accident; now the accent is one violet everywhere
        // and this line would have said nothing at all.
        //
        // Since Rev .14 it is a 1px hairline at 62% plus a 6% wash of the same
        // hue down the bar, rather than a 2px solid edge: the place is still
        // there, and still below the data.
      )}
      style={{
        borderBottomColor: 'color-mix(in srgb, var(--sk-layer) 62%, transparent)',
        background: 'linear-gradient(180deg, color-mix(in srgb, var(--sk-layer) 6%, var(--card)), var(--card))',
      }}
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
        {trail.map((crumb, i) => (
          <span key={crumb.label} className="hidden shrink-0 items-center gap-1.5 text-muted-foreground sm:flex">
            {/* Ancestors are links where they resolve (§16.12); a fold with
                no page of its own stays a word. */}
            {crumb.to != null ? (
              <Link to={crumb.to} className="text-muted-foreground no-underline hover:text-foreground hover:underline">
                {crumb.label}
              </Link>
            ) : (
              crumb.label
            )}
            {/* `›`, the design's own separator. A slash reads as a path; the
                trail is a place inside a place. */}
            {leafFolded && i === trail.length - 1 ? null : (
              <span aria-hidden="true" className="text-border">›</span>
            )}
          </span>
        ))}
        {/* The leaf carries full ink and 600, the trail behind it does not:
            that weight step is the whole reason a breadcrumb reads as "here,
            and how you got here" rather than as a row of equal words. */}
        {leafFolded ? null : (
          <span
            aria-current="page"
            className="min-w-0 truncate font-semibold text-foreground animate-in fade-in-0 duration-200"
          >
            {label}
          </span>
        )}
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
        {/* The framework's current symbol is the omnibar's prefix token (Rev
            .55): load a security, then pick a function. Ticker ink where this
            page reads it, dim where it is only held for the next page; × lets
            it go. */}
        {symbol ? (
          // Rev .58: the token is the name, so a click on it opens the name —
          // the Symbol panel beside this page — rather than the omnibar.
          <span
            role="button"
            tabIndex={0}
            onClick={(e) => {
              e.stopPropagation()
              symbolGo.toggle()
            }}
            onKeyDown={(e) => {
              if (e.key !== 'Enter' && e.key !== ' ') return
              e.preventDefault()
              e.stopPropagation()
              symbolGo.toggle()
            }}
            title={`${
              isScoped
                ? `${symbol} — this page reads it`
                : `${symbol} — held for the next page that reads a symbol`
            } · click to open Symbol beside this page`}
            className="inline-flex h-4.5 flex-none cursor-pointer items-center gap-1 rounded-[4px] bg-[var(--sk-raised2)] pr-0.5 pl-1.5 font-mono text-dense-meta font-bold"
            style={{ color: isScoped ? 'var(--sk-ticker)' : 'var(--sk-faint)' }}
          >
            {symbol}
            <span
              role="button"
              tabIndex={0}
              aria-label="Clear symbol"
              title="Clear the carried symbol"
              onClick={(e) => {
                e.stopPropagation()
                clearSymbol()
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  e.stopPropagation()
                  clearSymbol()
                }
              }}
              className="cursor-pointer px-0.5 font-normal text-muted-foreground hover:text-foreground"
            >
              ×
            </span>
          </span>
        ) : null}
        <span className="flex-1 truncate text-left">{symbol ? 'page or command' : 'Symbol, page, or command'}</span>
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
        {/* The Objective control (Rev .55) — the objective half of the Lens it
            replaces; the symbol half is the omnibar's token above. */}
        <ObjectiveControl />

        {/* The fourth item, and the Copilot's second avatar: the rail opens
            its Desk (a page), this opens the conversation (§5a.8 sixteenth
            round). Autopilot has no conversation avatar, so it has no button
            here — the asymmetry is real, not an omission. ⌘J was the only way
            to it, which made the Copilot discoverable to whoever already knew
            about it; the design puts it on the bar for the same reason the
            Omnibar shows its own key. */}
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              onClick={(e) => toggleThread(e.currentTarget)}
              aria-pressed={thread.open}
              className={cn(
                SHELL_TOP_BAR_CONTROL_CLASS,
                'shrink-0',
                thread.open
                  ? 'border-primary/45 bg-primary/[0.08] text-primary'
                  : 'text-muted-foreground hover:bg-secondary hover:text-foreground',
              )}
            >
              <MessageSquare className="h-3 w-3" aria-hidden />
              {/* "Ask", a verb, since the framework pass (Rev .25): the rail's
                  group is the Copilot Desk (a place), this opens a conversation
                  (not a place). Two things named "Copilot" was the confusion. */}
              <span className="hidden lg:inline">Ask</span>
              {/* The design prints the key on the button, as the Omnibar does:
                  a control whose shortcut is invisible is a shortcut only for
                  whoever already knew it. */}
              <kbd className={cn(SHELL_TOP_BAR_KBD_CLASS, 'hidden lg:inline')}>⌘J</kbd>
            </button>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            {/* One lit state, and the tooltip says where — a conversation
                behind another tab is open, and the click brings it forward
                rather than opening a second one. */}
            {thread.open
              ? `${thread.place === 'float' ? 'Ask — the conversation, in a float' : 'Ask — the conversation, in the side panel'}`
              : 'Ask the Copilot — opens the conversation'}{' '}
            · ⌘J
          </TooltipContent>
        </Tooltip>

        {/* The user centre left the bar for the sidebar foot at Rev .54. */}
      </div>
    </header>
  )
}
