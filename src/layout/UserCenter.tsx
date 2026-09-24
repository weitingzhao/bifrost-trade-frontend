/**
 * The user centre — the shell's "about me" pocket (design Rev 2026-09-23.13).
 *
 * The avatar is the only circular control on the bar. It opens one glass card:
 * who is operating and over which accounts, Appearance (the three theme modes),
 * and the shell's System doors.
 *
 * Two readings of the design are this side's, and both are about not claiming
 * more than the app holds:
 *
 * - The design prints "the current account" under Operator, which it takes
 *   from the Lens. This shell carries no account scope — each page owns its
 *   own account control (see `Lens.tsx`) — so the card lists the accounts the
 *   monitor reports and says each page scopes its own.
 * - The design's third door is "Design docs → /docs/index". That index is not
 *   built here, so the row is named for where it actually goes — the design
 *   adoption tracker — rather than carrying the design's label to a different
 *   page.
 */
import { Link } from 'react-router-dom'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { useMonitorStatus } from '@/hooks/useMonitorStatus'
import { useThemeMode, type ThemeMode } from '@/lib/theme'
import { cn } from '@/lib/utils'

const MODES: readonly { mode: ThemeMode; label: string; title: string }[] = [
  { mode: 'dark', label: 'Dark', title: 'Near-black ground with an indigo cast' },
  {
    mode: 'light',
    label: 'Light',
    // The design calls light a preview too: the shell and the token-driven
    // pages are paper-ready, a few charts and module stylesheets still carry
    // dark-only literals (about fifty, counted 2026-09-23).
    title: 'Grey-paper ground, deepened data inks — preview: a few charts still carry dark-only colours',
  },
  { mode: 'auto', label: 'Auto', title: 'By clock — light 07:00–19:00 local' },
]

const DOORS: readonly { label: string; to: string }[] = [
  { label: 'Settings', to: '/settings' },
  { label: 'System Status', to: '/system/status' },
  { label: 'Design adoption', to: '/docs/design-adoption' },
]

/** The avatar's face: a gradient from the accent into the surface, the design's own. */
const AVATAR =
  'inline-flex shrink-0 items-center justify-center rounded-full border border-border font-bold tracking-[0.04em] text-foreground ' +
  'bg-[linear-gradient(145deg,color-mix(in_srgb,var(--sk-accent)_30%,var(--sk-surface)),var(--sk-surface))]'

export function UserCenter() {
  const { mode, theme, choose } = useThemeMode()
  const { data: status } = useMonitorStatus()
  const accounts = (status?.portfolio?.accounts ?? []).map((a) => (a.account_id ?? '').trim()).filter(Boolean)

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            AVATAR,
            'size-7 text-[10.5px] transition-[transform,box-shadow,border-color] duration-150 hover:scale-[1.07]',
            'hover:border-[color-mix(in_srgb,var(--sk-accent)_55%,transparent)] hover:shadow-[0_0_0_3px_color-mix(in_srgb,var(--sk-accent)_16%,transparent)]',
          )}
          title="Account, appearance & system"
          aria-label="User menu"
        >
          OP
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        sideOffset={6}
        // Glass is for floating things (Rev .20): a translucent raised card
        // with a blur, a hairline in the ink and a top highlight.
        className={cn(
          'w-[264px] overflow-hidden rounded-xl p-0',
          'border-[color-mix(in_srgb,var(--sk-ink)_14%,transparent)] bg-[color-mix(in_srgb,var(--sk-raised)_82%,transparent)]',
          'backdrop-blur-[16px] backdrop-saturate-[1.4]',
          'shadow-[inset_0_1px_0_color-mix(in_srgb,var(--sk-ink)_7%,transparent),0_24px_60px_-16px_rgb(0_0_0/0.55)]',
        )}
      >
        <div className="flex items-center gap-2.5 px-3.5 pb-2.5 pt-3">
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

        <div className="flex flex-col gap-1.5 border-b border-[color-mix(in_srgb,var(--sk-ink)_8%,transparent)] px-3.5 pb-3 pt-1">
          <div className="flex items-baseline justify-between">
            <span className="text-dense-micro font-bold uppercase tracking-[0.12em] text-muted-foreground">Appearance</span>
            {mode === 'auto' ? <span className="font-mono text-dense-micro text-muted-foreground">now → {theme}</span> : null}
          </div>
          <div
            className="flex gap-0.5 rounded-lg bg-[color-mix(in_srgb,var(--sk-ink)_6%,transparent)] p-0.5"
            role="radiogroup"
            aria-label="Theme"
          >
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

        <nav className="py-1.5" aria-label="System">
          {DOORS.map((d) => (
            <Link
              key={d.to}
              to={d.to}
              className="flex items-center gap-2 px-3.5 py-2 text-dense-body text-foreground no-underline hover:bg-[color-mix(in_srgb,var(--sk-ink)_7%,transparent)]"
            >
              <span className="flex-1">{d.label}</span>
              <span className="font-mono text-dense-micro text-muted-foreground">{d.to}</span>
            </Link>
          ))}
        </nav>
      </PopoverContent>
    </Popover>
  )
}
