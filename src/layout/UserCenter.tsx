/**
 * The user centre, in the sidebar foot (design Rev .54, `_Part UserCenter`).
 *
 * One row: the avatar with a summary lamp in its corner · Operator · how many
 * of the trader's questions are degraded — and a square door on the right,
 * Enter System (or Back to Trade inside it). The avatar opens a glass card
 * upward: who is operating over which accounts, Can I trade (the three
 * readings System Status gives, from the same hook), Appearance, and the
 * shell's doors. Collapsed, the rail keeps only the avatar and its lamp.
 *
 * Where this side reads the design differently, and why:
 *
 * - The corner lamp and the degraded count summarise **two** of the three
 *   questions — can I trade, did the data land. "Can I see" is judged stream
 *   by stream, which takes the live quote stream, and a control on every page
 *   must not hold that open; the card reads all three while it is open.
 * - Under Operator the accounts are listed, not "the current account": the
 *   shell carries no account scope (each page owns its own).
 * - No Keyboard shortcuts row and no package version: this app has neither a
 *   shortcuts sheet nor a version it can state, and a row that opens nothing
 *   is a dead end. The design revision the shell was synced to is stated.
 */
import { useState } from 'react'
import { Link, NavLink, useLocation } from 'react-router-dom'
import { ExternalLink, Settings, SlidersHorizontal, Scale, Undo2 } from 'lucide-react'
import { HealthLamp, useSidebar } from '@bifrost/ui'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { useMonitorStatus } from '@/hooks/useMonitorStatus'
import { useSystemDomains } from '@/hooks/useSystemDomains'
import { DESIGN_REV } from '@/lib/design/designRoutes.generated'
import { OPS_CONSOLE_URL } from '@/lib/opsConsole'
import { useThemeMode, type ThemeMode } from '@/lib/theme'
import { cn } from '@/lib/utils'
import { worstLamp } from '@/utils/systemStanding'
import { isSystemRoute } from './routeRegistry'

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

/** Enter System, or the way back out of it — the tree swaps, so the foot carries the door. */
function useDoor() {
  const { pathname } = useLocation()
  return isSystemRoute(pathname)
    ? { to: '/', label: 'Back to Trade', Icon: Undo2 }
    : { to: '/system/status', label: 'Enter System', Icon: Settings }
}

/** The card: mounted only while open, so the live quote reading lives only as long as it does. */
function UserCard({ onClose }: { onClose: () => void }) {
  const { mode, theme, choose } = useThemeMode()
  const { data: status } = useMonitorStatus()
  const accounts = (status?.portfolio?.accounts ?? []).map((a) => (a.account_id ?? '').trim()).filter(Boolean)
  const domains = useSystemDomains({ live: true })
  const door = useDoor()
  const items = [
    { label: door.label, to: door.to, Icon: door.Icon },
    { label: 'Settings', to: '/settings', Icon: SlidersHorizontal },
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

      <Link
        to="/system/status"
        onClick={onClose}
        title="/system/status — the same three readings"
        className="block border-y border-[color-mix(in_srgb,var(--sk-ink)_8%,transparent)] px-3.5 py-2 no-underline hover:bg-[color-mix(in_srgb,var(--sk-ink)_5%,transparent)]"
      >
        <span className="text-dense-micro font-bold uppercase tracking-[0.12em] text-muted-foreground">Can I trade</span>
        {domains.map((d) => (
          <span key={d.key} className="mt-1 grid grid-cols-[10px_88px_minmax(0,1fr)] items-baseline gap-2">
            <HealthLamp lamp={d.lamp} variant="dot" title={d.name} />
            <span className="text-dense-meta text-foreground">{d.name}</span>
            <span className="truncate text-dense-meta text-[var(--sk-mute2)]" title={d.why}>
              {d.state}
            </span>
          </span>
        ))}
      </Link>

      <div className="flex flex-col gap-1.5 px-3.5 pt-2.5 pb-3">
        <div className="flex items-baseline justify-between">
          <span className="text-dense-micro font-bold uppercase tracking-[0.12em] text-muted-foreground">Appearance</span>
          {mode === 'auto' ? <span className="font-mono text-dense-micro text-muted-foreground">now → {theme}</span> : null}
        </div>
        <div className="flex gap-0.5 rounded-lg bg-[color-mix(in_srgb,var(--sk-ink)_6%,transparent)] p-0.5" role="radiogroup" aria-label="Theme">
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
                  'h-6 flex-1 rounded-md text-dense-meta font-semibold transition-colors',
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
      </div>

      <nav className="border-t border-[color-mix(in_srgb,var(--sk-ink)_8%,transparent)] py-1.5" aria-label="Doors">
        {items.map(({ label, to, Icon }) => (
          <Link
            key={to}
            to={to}
            onClick={onClose}
            className="flex items-center gap-2 px-3.5 py-1.5 text-dense-body text-foreground no-underline hover:bg-[color-mix(in_srgb,var(--sk-ink)_7%,transparent)]"
          >
            <Icon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden />
            <span>{label}</span>
          </Link>
        ))}
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
      <div className="border-t border-[color-mix(in_srgb,var(--sk-ink)_8%,transparent)] px-3.5 py-1.5 font-mono text-dense-micro text-muted-foreground">
        design Rev {DESIGN_REV}
      </div>
    </>
  )
}

export function SidebarUserCenter() {
  const { state } = useSidebar()
  const [open, setOpen] = useState(false)
  const collapsed = state === 'collapsed'
  // The two questions answered without the quote stream (see the header).
  const summary = useSystemDomains({ live: false })
  const lamp = worstLamp(summary)
  // Amber and red only: a reading still loading, or none at all, is unknown —
  // grey, never a fault (§11.3.1).
  const degraded = summary.filter((d) => d.lamp === 'yellow' || d.lamp === 'red').length
  const door = useDoor()

  const avatar = (
    <PopoverTrigger asChild>
      <button
        type="button"
        className={cn(AVATAR, 'size-7 cursor-pointer text-[10.5px] hover:border-[color-mix(in_srgb,var(--sk-accent)_55%,transparent)]')}
        title={`Account, appearance & system — can I trade: ${summary.map((d) => `${d.name} ${d.state}`).join(' · ')}. Market data is read when you open this.`}
        aria-label="User menu"
      >
        OP
        <span
          aria-hidden
          className={cn('absolute -right-0.5 -bottom-0.5 size-2 rounded-full ring-2 ring-[var(--sidebar)]', LAMP_BG[lamp])}
        />
      </button>
    </PopoverTrigger>
  )

  return (
    <Popover open={open} onOpenChange={setOpen}>
      {collapsed ? (
        <div className="flex justify-center py-1.5">{avatar}</div>
      ) : (
        <div className="flex items-center gap-2 px-2 py-1.5">
          {avatar}
          <span className="text-dense-meta font-semibold text-sidebar-foreground">Operator</span>
          {degraded > 0 ? (
            <span className="font-mono text-dense-micro text-[var(--color-lamp-yellow)]">{degraded} degraded</span>
          ) : null}
          <span className="flex-1" />
          <NavLink
            to={door.to}
            title={door.label}
            aria-label={door.label}
            className="flex size-7 items-center justify-center rounded-md border border-[var(--sk-line)] text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground"
          >
            <door.Icon className="h-3.5 w-3.5" aria-hidden />
          </NavLink>
        </div>
      )}
      <PopoverContent
        side={collapsed ? 'right' : 'top'}
        align="start"
        sideOffset={8}
        className={cn(
          'w-[300px] overflow-hidden rounded-xl p-0',
          'border-[color-mix(in_srgb,var(--sk-ink)_14%,transparent)] bg-[color-mix(in_srgb,var(--sk-raised)_82%,transparent)]',
          'backdrop-blur-[16px] backdrop-saturate-[1.4]',
          'shadow-[inset_0_1px_0_color-mix(in_srgb,var(--sk-ink)_7%,transparent),0_24px_60px_-16px_rgb(0_0_0/0.55)]',
        )}
      >
        <UserCard onClose={() => setOpen(false)} />
      </PopoverContent>
    </Popover>
  )
}
