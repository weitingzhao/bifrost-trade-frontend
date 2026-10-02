/**
 * The user centre, in the sidebar foot (design Rev .54, `_Part UserCenter`).
 *
 * One row: the avatar with a summary lamp in its corner · Operator · how many
 * readings are degraded (or all normal) — and one square on the right, the
 * bottom-toolbar switch. The System gear that used to sit beside it retired
 * with the design (Owner 2026-09-25): the menu's first row already is Enter
 * System / Back to Trade, and two doors to one place is one too many. The
 * row opens a glass card upward (Rev .118): what is degraded, who is operating over which accounts,
 * Appearance, and the shell's doors — including the feedback pair the Owner
 * added 2026-09-26 (Send feedback · My reports with its unread count), the
 * menu's door for people who don't use ⌘K. The "Can I trade" card retired to
 * the Control Center's first row (Rev .97 — one business fact in one place);
 * the corner lamp stays. Collapsed, the rail keeps only the avatar's lamp.
 *
 * Where this side reads the design differently, and why:
 *
 * - The corner lamp and the degraded count summarise **two** of the three
 *   questions — can I trade, did the data land. "Can I see" is judged stream
 *   by stream, which takes the live quote stream, and a control on every page
 *   must not hold that open; the card reads all three while it is open.
 * - Under Operator the accounts are listed, not "the current account": the
 *   shell carries no account scope (each page owns its own).
 * - "Design adoption" stands where the design's "Design docs" row points at
 *   /docs/index — a design-only page this app deliberately has no copy of.
 * - The degraded list (Rev .118) is `degradedItems` over the same domain rows
 *   System Status draws — the design's registry `DEGRADED` made real. A red
 *   domain is listed too (a stopped link is at least degraded); the block
 *   stays amber, as the design sets it.
 */
import { useRef } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { ClipboardList, ExternalLink, Flag, Keyboard, Scale, SlidersHorizontal } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { fetchFeedbackSummary } from '@/api/research/feedback'
import { openFeedbackDialog } from '@/lib/feedback/feedbackDialog'
import { UI_VERSION_NOW } from '@/lib/design/uiVersion'
import { useSidebar } from '@bifrost/ui'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { useMonitorStatus } from '@/hooks/useMonitorStatus'
import { useSystemDomains } from '@/hooks/useSystemDomains'
import { DESIGN_REV } from '@/lib/design/designRoutes.generated'
import { glyph } from '@/lib/design/glyphs'
import { OPS_CONSOLE_URL } from '@/lib/opsConsole'
import { useThemeMode, type ThemeMode } from '@/lib/theme'
import { useGlass } from '@/lib/glass'
import { useDisplay, type TextSize } from '@/lib/display'
import { SwitchTrack } from '@/components/ui/SwitchTrack'
import { useShellPopover } from '@/lib/shellPopover'
import { cn } from '@/lib/utils'
import { degradedItems, worstLamp, type DegradedItem } from '@/utils/systemStanding'
import { toggleToolbar, useToolbarShown } from './bottomLane'
import { isSystemRoute } from './routeRegistry'

/** The three text sizes, drawn as A in three sizes (Rev .72 §11). */
const TEXT_SIZES: readonly { size: TextSize; label: string; className: string }[] = [
  { size: 's', label: 'Smaller text', className: 'text-dense-caption' },
  { size: 'm', label: 'Default text', className: 'text-dense-label' },
  { size: 'l', label: 'Larger text', className: 'text-dense-body' },
]

/** A macOS switch row: the words, then the track. */
function SwitchRow({ label, on, onToggle, title }: { label: string; on: boolean; onToggle: () => void; title: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      onClick={onToggle}
      title={title}
      className="flex w-full items-center gap-2 border-0 bg-transparent py-1 text-left text-dense-label text-foreground"
    >
      <span className="flex-1">{label}</span>
      <SwitchTrack on={on} />
    </button>
  )
}

const MODES: readonly { mode: ThemeMode; label: string; title: string }[] = [
  { mode: 'dark', label: 'Dark', title: 'Near-black ground with an indigo cast' },
  { mode: 'light', label: 'Light', title: 'Grey-paper ground, deepened data inks' },
  { mode: 'auto', label: 'Auto', title: 'By clock — light 07:00–19:00 local' },
]

/** The avatar's face: a gradient from the accent into the surface, the design's own. */
const AVATAR =
  'relative inline-flex shrink-0 items-center justify-center rounded-full border border-border font-bold tracking-[0.04em] text-foreground ' +
  'bg-[linear-gradient(145deg,color-mix(in_srgb,var(--sk-accent)_30%,var(--sk-surface)),var(--sk-surface))]'

const LAMP_BG: Record<string, string> = {
  green: 'bg-lamp-green',
  yellow: 'bg-lamp-yellow',
  red: 'bg-lamp-red',
  gray: 'bg-lamp-gray',
}

const GEAR = glyph('gear')
const LANES = glyph('lanes')
const TOOLBAR = glyph('toolbar')

/**
 * Enter System, or the way back out of it — the tree swaps, so the foot
 * carries the door. The design's shapes and targets: the gear into System
 * Status, and lanes back to the Trade Desk.
 */
function useDoor() {
  const { pathname } = useLocation()
  const inSystem = isSystemRoute(pathname)
  return inSystem
    ? { to: '/trade/desk', label: 'Back to Trade', Icon: LANES, inSystem }
    : { to: '/system/status', label: 'Enter System', Icon: GEAR, inSystem }
}

/**
 * What is degraded, what it costs, and where it shows (Rev .118) — the list
 * the foot's count names. Amber only: degraded is not down.
 */
function DegradedBlock({ items, onClose }: { items: readonly DegradedItem[]; onClose: () => void }) {
  const domains = [...new Set(items.map((d) => d.domain))].join(' · ')
  return (
    <div className="mx-2 mb-2 flex flex-col gap-0.5 rounded-lg bg-[color-mix(in_srgb,var(--color-lamp-yellow)_10%,transparent)] px-1 pt-1.5 pb-1">
      <div className="flex items-center gap-1.5 px-1.5 pb-0.5">
        <span aria-hidden className="size-[7px] flex-none rounded-full bg-lamp-yellow" />
        <span className="text-dense-label font-semibold text-[var(--sk-warn)]">{items.length} degraded</span>
        <span className="ml-auto truncate text-dense-micro text-[var(--sk-mute2)]">{domains}</span>
      </div>
      {items.map((d) => (
        <Link
          key={d.key}
          to={d.to}
          onClick={onClose}
          title={`${d.domain} · opens ${d.label}`}
          className="grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-x-2 gap-y-0.5 rounded-md px-1.5 py-[5px] no-underline hover:bg-[color-mix(in_srgb,var(--sk-ink)_7%,transparent)]"
        >
          <span className="text-dense-label text-foreground">{d.what}</span>
          <span className="whitespace-nowrap text-dense-caption text-[var(--sk-accent)]">{d.label} →</span>
          <span className="col-span-2 text-dense-caption text-pretty text-[var(--sk-mute2)]">{d.impact}</span>
        </Link>
      ))}
      <Link
        to="/system/status"
        onClick={onClose}
        className="mx-1.5 mt-0.5 self-start text-dense-caption text-[var(--sk-accent)] no-underline hover:underline"
      >
        Every service · System Status →
      </Link>
    </div>
  )
}

/** The card: mounted only while open, so the live quote reading lives only as long as it does. */
function UserCard({ onClose, degraded }: { onClose: () => void; degraded: readonly DegradedItem[] }) {
  const { mode, theme, choose } = useThemeMode()
  const glass = useGlass()
  const display = useDisplay()
  const { data: status } = useMonitorStatus()
  const accounts = (status?.portfolio?.accounts ?? []).map((a) => (a.account_id ?? '').trim()).filter(Boolean)
  const door = useDoor()
  // Read only while the card is open (same rule as the header's tooltip):
  // the unread count on My reports comes from the feedback store's summary.
  const sumQ = useQuery({
    queryKey: ['research', 'feedback', 'summary'],
    queryFn: fetchFeedbackSummary,
    staleTime: 60_000,
    retry: 1,
  })
  const unread = sumQ.data?.unread ?? 0
  const items = [
    { label: door.label, to: door.to, Icon: door.Icon },
    { label: 'Settings', to: '/settings', Icon: SlidersHorizontal },
    // Owner 2026-09-26: the menu's feedback pair, for people who don't use ⌘K.
    {
      label: 'Send feedback',
      Icon: Flag,
      onPick: () => openFeedbackDialog('bug'),
    },
    {
      label: 'My reports',
      to: '/settings?pane=reports',
      Icon: ClipboardList,
      badge: unread > 0 ? `● ${unread} update${unread > 1 ? 's' : ''}` : '',
    },
    { label: 'Keyboard shortcuts', to: '/settings?pane=keys', Icon: Keyboard },
    { label: 'Design adoption', to: '/docs/design-adoption', Icon: Scale },
  ]
  return (
    <>
      <div className="flex items-center gap-2.5 px-3.5 pt-3 pb-2.5">
        <span className={cn(AVATAR, 'size-[34px] text-dense-meta')}>OP</span>
        <div className="min-w-0">
          <div className="text-dense-body font-semibold text-foreground">Operator</div>
          <div
            className="truncate font-mono text-dense-caption text-muted-foreground"
            title="The shell carries no account scope; each page scopes its own account."
          >
            {accounts.length === 0 ? 'no account reported' : accounts.join(' · ')}
          </div>
        </div>
      </div>

      {degraded.length > 0 ? <DegradedBlock items={degraded} onClose={onClose} /> : null}

      {/* The "Can I trade" card left this menu (Owner 2026-09-26, Rev .97):
          three rows written here could contradict the top bar's own live
          readings. One business fact shows in one place — the verdict is the
          Control Center's first row now, derived from the same rows it draws. */}
      <div className="flex flex-col gap-1.5 border-t border-[color-mix(in_srgb,var(--sk-ink)_8%,transparent)] px-3.5 pt-2.5 pb-3">
        <div className="flex items-baseline justify-between">
          <span className="text-dense-meta font-semibold text-muted-foreground">Appearance</span>
          {mode === 'auto' ? <span className="font-mono text-dense-micro text-muted-foreground">now → {theme}</span> : null}
        </div>
        <div className="flex gap-0.5 rounded-full bg-[color-mix(in_srgb,var(--sk-ink)_6%,transparent)] p-0.5" role="radiogroup" aria-label="Theme">
          {MODES.map((m) => {
            const on = mode === m.mode
            return (
              <button
                key={m.mode}
                type="button"
                role="radio"
                aria-checked={on}
                title={m.title}
                onClick={() => choose(m.mode)}
                className={cn(
                  'h-6 flex-1 rounded-full text-dense-meta font-semibold transition-colors',
                  on
                    ? 'bg-[var(--sk-raised2)] text-foreground shadow-[0_1px_3px_rgb(0_0_0/0.4),inset_0_0_0_1px_color-mix(in_srgb,var(--sk-ink)_10%,transparent)]'
                    : 'text-[var(--sk-mute2)] hover:text-foreground',
                )}
              >
                {m.label}
              </button>
            )
          })}
        </div>
        {/* Rev .70 §1 — macOS Accessibility › Display. Follows the system until set here. */}
        <SwitchRow
          label="Reduce transparency"
          on={glass.solid}
          onToggle={glass.toggle}
          title="Glass surfaces (panel, toolbar, sidebar, popovers) become solid. Follows the system setting unless you set it here."
        />
        {/* Rev .72 §11 — display options. */}
        <SwitchRow
          label="Increase contrast"
          on={display.contrast}
          onToggle={() => display.set({ contrast: !display.contrast })}
          title="Frames return on cards, tags and surfaces; muted text gets brighter (dark) or darker (light)."
        />
        <div className="flex items-center gap-2 py-0.5">
          <span className="flex-1 text-dense-label text-foreground">Text size</span>
          <div
            className="flex gap-0.5 rounded-full bg-[color-mix(in_srgb,var(--sk-ink)_6%,transparent)] p-0.5"
            role="radiogroup"
            aria-label="Text size"
            title="Scales page content only — the toolbar, sidebar and panels keep their size."
          >
            {TEXT_SIZES.map((z) => {
              const on = display.textSize === z.size
              return (
                <button
                  key={z.size}
                  type="button"
                  role="radio"
                  aria-checked={on}
                  aria-label={z.label}
                  onClick={() => display.set({ textSize: z.size })}
                  className={cn(
                    'h-6 w-7 rounded-full font-semibold leading-none transition-colors',
                    z.className,
                    on
                      ? 'bg-[var(--sk-raised2)] text-foreground shadow-[0_1px_3px_rgb(0_0_0/0.4),inset_0_0_0_1px_color-mix(in_srgb,var(--sk-ink)_10%,transparent)]'
                      : 'text-[var(--sk-mute2)] hover:text-foreground',
                  )}
                >
                  A
                </button>
              )
            })}
          </div>
        </div>
      </div>

      <nav className="border-t border-[color-mix(in_srgb,var(--sk-ink)_8%,transparent)] py-1.5" aria-label="Doors">
        {items.map(({ label, to, Icon, onPick, badge }) => {
          const inner = (
            <>
              <Icon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden />
              <span className="min-w-0 flex-1 truncate">{label}</span>
              {badge ? (
                <span className="text-dense-caption whitespace-nowrap text-[var(--sk-accent)]">{badge}</span>
              ) : null}
            </>
          )
          const rowClass =
            'flex w-full items-center gap-2 px-3.5 py-1.5 text-left text-dense-body text-foreground no-underline hover:bg-[color-mix(in_srgb,var(--sk-ink)_7%,transparent)]'
          return onPick ? (
            <button
              key={label}
              type="button"
              onClick={() => {
                onClose()
                onPick()
              }}
              className={cn(rowClass, 'border-0 bg-transparent')}
            >
              {inner}
            </button>
          ) : (
            <Link key={label} to={to!} onClick={onClose} className={rowClass}>
              {inner}
            </Link>
          )
        })}
        <a
          href={OPS_CONSOLE_URL}
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-2 px-3.5 py-1.5 text-dense-body text-foreground no-underline hover:bg-[color-mix(in_srgb,var(--sk-ink)_7%,transparent)]"
        >
          <ExternalLink className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden />
          <span>Bifröst Ops ↗</span>
        </a>
      </nav>
      <div className="flex gap-2 border-t border-[color-mix(in_srgb,var(--sk-ink)_8%,transparent)] px-3.5 py-1.5 font-mono text-dense-micro text-muted-foreground">
        <span>design Rev {DESIGN_REV}</span>
        <span className="ml-auto">@bifrost/ui {UI_VERSION_NOW}</span>
      </div>
    </>
  )
}

export function SidebarUserCenter() {
  const { state } = useSidebar()
  // One shell popover at a time (Rev .68).
  const [open, setOpen] = useShellPopover('user')
  const collapsed = state === 'collapsed'
  // The two questions answered without the quote stream (see the header).
  const summary = useSystemDomains({ live: false })
  const lamp = worstLamp(summary)
  // Amber and red only: a reading still loading, or none at all, is unknown —
  // grey, never a fault (§11.3.1). The count is the list's length (Rev .118).
  const items = degradedItems(summary)
  const degraded = items.length
  const door = useDoor()
  const toolbarShown = useToolbarShown()
  // "all normal" only when every reading is in and green — unknown is not normal.
  const health = degraded > 0 ? `${degraded} degraded` : lamp === 'green' ? 'all normal' : null
  const footLine = [door.inSystem ? 'in System' : null, health].filter(Boolean).join(' · ')
  const healthTitle =
    degraded > 0
      ? `${items.map((d) => d.what).join(' · ')} — open the user centre for where`
      : lamp === 'green'
        ? 'All services normal'
        : 'Not every service has answered yet'

  // The avatar's face and its lamp; the trigger around it is the rail's
  // avatar when collapsed, and the whole row when open (Rev .118: the foot
  // opens the user centre).
  const face = (size: string) => (
    <span className={cn(AVATAR, size)}>
      OP
      <span
        aria-hidden
        className={cn('absolute -right-0.5 -bottom-0.5 size-2 rounded-full ring-2 ring-[var(--sidebar)]', LAMP_BG[lamp])}
      />
    </span>
  )
  // The popover grows out of its trigger and goes back in (Rev .139).
  const morphRef = useRef<HTMLButtonElement>(null)
  const triggerTitle = `Account, appearance & system — ${healthTitle}`

  return (
    <Popover open={open} onOpenChange={setOpen}>
      {collapsed ? (
        <div className="flex justify-center py-1.5">
          <PopoverTrigger asChild ref={morphRef}>
            <button
              type="button"
              title={triggerTitle}
              aria-label="User menu"
              className="cursor-pointer rounded-full border-0 bg-transparent p-0 [&>span]:hover:border-[color-mix(in_srgb,var(--sk-accent)_55%,transparent)]"
            >
              {face('size-[26px] text-[10.5px]')}
            </button>
          </PopoverTrigger>
        </div>
      ) : (
        <div className="flex items-center gap-1 px-1.5 pt-0.5 pb-2">
          <PopoverTrigger asChild ref={morphRef}>
            <button
              type="button"
              title={triggerTitle}
              aria-label="User menu"
              className="flex h-[38px] min-w-0 flex-1 cursor-pointer items-center gap-2 rounded-md border-0 bg-transparent px-1.5 text-left hover:bg-sidebar-accent"
            >
              {face('size-[26px] text-[10.5px]')}
              {/* Two lines, as the design sets them: who, then where and what is degraded. */}
              <span className="flex min-w-0 flex-col leading-tight">
                <span className="text-dense-label font-semibold whitespace-nowrap text-foreground">Operator</span>
                {footLine ? (
                  <span
                    className={cn(
                      'font-mono text-dense-caption whitespace-nowrap',
                      degraded > 0 ? 'text-[var(--color-lamp-yellow)]' : 'text-muted-foreground',
                    )}
                  >
                    {footLine}
                  </span>
                ) : null}
              </span>
            </button>
          </PopoverTrigger>
          {/* The System gear retired here (Owner 2026-09-25): the menu's
              first row already is Enter System / Back to Trade. */}
          {/* The bottom toolbar floats over the page, so it can cover the last
              rows — this square hides and shows it (design Rev .57). */}
          <button
            type="button"
            onClick={toggleToolbar}
            aria-pressed={toolbarShown}
            title={toolbarShown ? 'Hide the bottom toolbar' : 'Show the bottom toolbar'}
            aria-label="Show or hide the bottom toolbar"
            className={cn(
              'flex size-[30px] flex-none items-center justify-center rounded-full border border-sidebar-border hover:bg-sidebar-accent hover:text-sidebar-foreground',
              toolbarShown ? 'text-[var(--sk-mute2)]' : 'text-muted-foreground/50',
            )}
          >
            <TOOLBAR className="h-4 w-4" aria-hidden />
          </button>
        </div>
      )}
      <PopoverContent
        morphFrom={morphRef}
        side={collapsed ? 'right' : 'top'}
        align="start"
        sideOffset={8}
        className={cn(
          // Capped as the design's (Rev .118): a long degraded list scrolls, it never runs off the screen.
          // The DS popover glass (0.9.0) is the material; nothing local.
          'max-h-[calc(100vh-72px)] w-[300px] overflow-y-auto rounded-xl p-0',
        )}
      >
        <UserCard onClose={() => setOpen(false)} degraded={items} />
      </PopoverContent>
    </Popover>
  )
}
