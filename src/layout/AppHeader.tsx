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
 * its prefix token, the objective has its own control, and (Rev .58) the
 * account has one beside it — a shell scope the wired pages follow.
 */
import { Link, useLocation } from 'react-router-dom'
import { SidebarTrigger } from '@/components/ui/sidebar'
import { cn } from '@/lib/utils'
import { omnibar, omnibarStore } from '@/lib/omnibar'
import { toggleThread, useThread } from '@/hooks/useCopilotThread'
import { PAGE_ROUTES, routeFor } from './routeRegistry'
import { crumbLinks } from './crumbLinks'
import { NAV_GROUPS, SYSTEM_ITEM } from './navConfig'
import { usePageHeadVisibility } from './usePageHeadVisibility'
import { useCrumbLabel } from './useCrumbLabel'
import { useSymbolContext } from '@/lib/symbolContext'
import { ObjectiveControl } from './ObjectiveControl'
import { BookControl } from './menubar/BookControl'
import { ControlCenter } from './menubar/ControlCenter'
import { SessionClock } from './menubar/SessionClock'
import { MenubarTip } from './menubar/MenubarTip'
import mb from './menubar/menubar.module.css'
import type { AlertGroup, AlertsSummary } from '@/hooks/useAlerts'
import { useSymbolGo } from './symbolGo'
import { SHELL_TOP_BAR_HEIGHT_CLASS } from './shellChrome'

/** Top-level headings a first crumb can fall back to; System's is its first page. */
const CRUMB_GROUPS = [...NAV_GROUPS, { label: 'System', to: SYSTEM_ITEM.to }]

export function AppHeader({
  alertGroups,
  alerts,
  onDismissAllAlerts,
}: {
  /** The Alerts stream, for the clock's notification centre (Rev .60). */
  alertGroups: AlertGroup[]
  alerts: AlertsSummary
  onDismissAllAlerts: () => void
}) {
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
  const omniOpen = omnibarStore.useStore().open

  return (
    <header
      className={cn(
        SHELL_TOP_BAR_HEIGHT_CLASS,
        // The right cluster collapses by this bar's own width (Rev .60 §7).
        mb.bar,
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
      {/* A borderless menu-bar item like every other on the bar (Rev .60 §8).
          The glyph stays chevrons rather than the design's panel rect: it
          comes from `@bifrost/ui`, and which way they point is a reading the
          Ops Console gets too. */}
      <SidebarTrigger className={cn(mb.item, 'size-7 justify-center p-0')} aria-label="Toggle sidebar" />
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
      {/* The one control that takes the slack, as a macOS toolbar search
          field (Rev .60 §8): filled, borderless, radius 8, an accent ring
          only while the omnibar is open. Under 980 of header it folds to
          the glass and the carried symbol. */}
      <button
        type="button"
        onClick={omnibar.open}
        data-on={omniOpen ? '1' : '0'}
        className={cn(
          mb.search,
          mb.omni,
          'ml-3 hidden h-7 min-w-[88px] max-w-[440px] flex-[1_1_0] items-center gap-[7px] pr-2 pl-[9px] text-left md:inline-flex',
        )}
        aria-label="Open the Omnibar"
      >
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden className="flex-none">
          <circle cx="11" cy="11" r="6.5" />
          <path d="m16 16 4.5 4.5" />
        </svg>
        {/* The framework's current symbol is the field's prefix token (Rev
            .55), a capsule in its ticker ink (Rev .60): bright where this page
            reads it, dim where it is only held. A click opens it beside the
            page; × lets it go. */}
        {symbol ? (
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
              isScoped ? `${symbol} — this page reads it` : `${symbol} — held for the next page that reads a symbol`
            } · click to open Symbol beside this page`}
            className={mb.token}
            style={{
              color: isScoped ? 'var(--sk-ticker)' : 'var(--sk-faint)',
              background: `color-mix(in srgb, ${isScoped ? 'var(--sk-ticker)' : 'var(--sk-faint)'} 16%, transparent)`,
            }}
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
        <span className={cn(mb.omniText, mb.fs12, 'min-w-0 flex-1 truncate')}>
          {symbol ? 'page or command' : 'Symbol, page, or command'}
        </span>
        <span className={cn(mb.omniText, mb.mono, mb.fs10, 'text-[var(--sk-mute)]')}>⌘K</span>
      </button>

      {/* The right cluster as a macOS menu bar (Rev .60 §1), in its order:
          the Objective, the Account and its Book, the Copilot, the Control
          Center, and the clock that opens Alerts. Every item is an icon and
          a number; the words are in the tips. They collapse by this bar's own
          width — chrome first, readings after, the clock never. */}
      <div className="ml-auto flex shrink-0 flex-nowrap items-center gap-1">
        <ObjectiveControl />
        <BookControl />
        <MenubarTip
          tip={
            thread.open
              ? `${thread.place === 'float' ? 'Ask — the conversation, in a float' : 'Ask — the conversation, in the side panel'} · ⌘J`
              : 'Ask Copilot — a thread beside this page · ⌘J'
          }
        >
          <button
            type="button"
            onClick={(e) => toggleThread(e.currentTarget)}
            aria-pressed={thread.open}
            aria-label="Ask Copilot"
            data-state={thread.open ? 'open' : 'closed'}
            className={cn(mb.item, 'relative px-[3px]')}
          >
            <span className="inline-flex size-[22px] flex-none items-center justify-center text-[var(--sk-soft)]">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="M12 3v3" />
                <circle cx="12" cy="2.6" r="1" fill="currentColor" stroke="none" />
                <rect x="4.5" y="6.5" width="15" height="12" rx="3.5" />
                <path d="M2.5 11.5v3M21.5 11.5v3" />
                <circle className={mb.eye} cx="9.3" cy="12.3" r="1.35" fill="currentColor" stroke="none" />
                <circle className={mb.eye} cx="14.7" cy="12.3" r="1.35" fill="currentColor" stroke="none" />
                <path d="M9.8 15.7h4.4" />
              </svg>
            </span>
            {thread.open ? (
              <span
                aria-hidden
                className="absolute -top-[3px] -right-[3px] size-[7px] rounded-full bg-[var(--sk-accent)] shadow-[0_0_0_2px_var(--background)]"
              />
            ) : null}
          </button>
        </MenubarTip>
        <ControlCenter />
        <SessionClock groups={alertGroups} alerts={alerts} onDismissAll={onDismissAllAlerts} />
      </div>
    </header>
  )
}
