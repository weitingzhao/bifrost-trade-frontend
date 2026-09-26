/**
 * Settings — rebuilt 2026-09-25 against `Settings.dc.html` at Rev .80, the
 * macOS System Settings shape (Owner, direction A): a category list on the
 * left, one pane of grouped rows on the right. The v1 page (Rev .52, built
 * 2026-09-22) was three stacked panels; every capability it had is kept.
 *
 * The other half of the Owner's 2026-09-15 collapse: System becomes Status and
 * this. The old System › Configuration › IB Connection merges in here, and
 * cluster, pipeline and market-data infrastructure config belongs to the Ops
 * Console — the one line under the categories says so and links there.
 *
 * ## Read here, and written here
 *
 * The prototype is read-only; the Owner called the move on 2026-09-25: the IB
 * Connection page's writes open in place under their rows
 * (`SettingsEditors.tsx`), and `/system/ib` forwards here. The two YAML rows
 * have no write route — config.yaml is read when a process starts — so their
 * control is `View`, which opens the full reading.
 *
 * ## Keyboard is the app's own table, not the design's five
 *
 * `SHORTCUTS` already answers `?` in the Omnibar and draws the hold-⌘ sheet.
 * Retyping the design's list here would make two lists that can disagree.
 *
 * ## The category is the page's view state
 *
 * The design keeps the chosen category in its page view; here it is `?pane=`,
 * so a reload, the back button and a link all land on the same pane.
 *
 * ## Owed
 *
 * The design's Flex line reads `landed 06:02` against a daily schedule. The
 * plugin's schedule is Dagster's and no route reports it, so the line says
 * what did land and when, which is the half that can be read.
 */
import { useState, type KeyboardEvent } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Search } from 'lucide-react'
import { PageHead, PageShell } from '@/components/layout'
import { useMonitorStatus } from '@/hooks/useMonitorStatus'
import { useFlexCoverageFreshness } from '@/hooks/useFlexCoverageFreshness'
import { OPS_CONSOLE_URL } from '@/lib/opsConsole'
import { useThemeMode } from '@/lib/theme'
import { cn } from '@/lib/utils'
import {
  flexLandedMeta,
  ibSlotMeta,
  isSettingsPane,
  SETTINGS_CATEGORIES,
  settingsSearch,
  type SettingsPane,
} from './settingsModel'
import { AppearancePane, FlexPane, IbPane, KeyboardPane } from './SettingsPanes'

const PANES: Record<SettingsPane, () => React.ReactNode> = {
  ib: IbPane,
  flex: FlexPane,
  look: AppearancePane,
  keys: KeyboardPane,
}

function useCategoryMeta(): Record<SettingsPane, string> {
  const { data: status } = useMonitorStatus()
  const freshness = useFlexCoverageFreshness()
  const { mode } = useThemeMode()
  const [nowMs] = useState(() => Date.now())
  return {
    ib: ibSlotMeta(status),
    flex: flexLandedMeta(freshness.data, nowMs),
    look: mode === 'auto' ? 'Auto' : mode === 'light' ? 'Light' : 'Dark',
    keys: '',
  }
}

export default function SettingsPage() {
  const [params, setParams] = useSearchParams()
  const [q, setQ] = useState('')
  const raw = params.get('pane')
  const chosen: SettingsPane = isSettingsPane(raw) ? raw : 'ib'
  const { shown, pane } = settingsSearch(q, chosen)
  const meta = useCategoryMeta()
  const Pane = PANES[pane]

  const pick = (id: SettingsPane) =>
    setParams(
      (prev) => {
        const next = new URLSearchParams(prev)
        if (id === 'ib') next.delete('pane')
        else next.set('pane', id)
        return next
      },
      { replace: true }
    )

  // ↑ ↓ walk the list, as a listbox does.
  const onListKey = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return
    e.preventDefault()
    const i = shown.findIndex((c) => c.id === pane)
    const next = shown[(i + (e.key === 'ArrowDown' ? 1 : shown.length - 1)) % shown.length]
    if (!next) return
    pick(next.id)
    e.currentTarget.querySelector<HTMLElement>(`[data-cat='${next.id}']`)?.focus()
  }

  return (
    <PageShell padding="compact" className="space-y-3">
      <PageHead
        title="Settings"
        info="The trader's own configuration — connection, data pulls, display, keys. Infra config lives in Ops."
      />

      <div className="flex flex-wrap items-start gap-4">
        <nav
          aria-label="Settings categories"
          className="sticky top-0 flex min-w-0 flex-[0_0_220px] flex-col gap-2"
        >
          <label className="mat-field flex h-7 items-center gap-1.5 px-2 focus-within:shadow-[0_0_0_3px_var(--mat-focus)]">
            <Search aria-hidden className="size-[13px] flex-none text-[var(--sk-mute)]" />
            <input
              type="search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search"
              aria-label="Search settings"
              className="h-[26px] min-w-0 flex-1 border-0 bg-transparent text-dense-body text-foreground outline-none placeholder:text-[var(--sk-mute)]"
            />
          </label>
          <div
            role="listbox"
            aria-label="Category"
            className="flex flex-col gap-0.5"
            onKeyDown={onListKey}
          >
            {shown.map((c) => {
              const on = c.id === pane
              return (
                <button
                  key={c.id}
                  type="button"
                  role="option"
                  aria-selected={on}
                  data-cat={c.id}
                  tabIndex={on ? 0 : -1}
                  onClick={() => pick(c.id)}
                  className={cn(
                    'flex h-[30px] items-center gap-2 rounded-[7px] border-0 px-2.5 text-left text-dense-body text-foreground',
                    on
                      ? 'bg-[color-mix(in_srgb,var(--sk-accent)_20%,transparent)] hover:bg-[color-mix(in_srgb,var(--sk-accent)_24%,transparent)]'
                      : 'bg-transparent hover:bg-[color-mix(in_srgb,var(--sk-ink)_6%,transparent)]'
                  )}
                >
                  <span className="min-w-0 flex-1 truncate">{c.label}</span>
                  <span className="whitespace-nowrap text-dense-meta text-[var(--sk-mute2)]">
                    {meta[c.id]}
                  </span>
                </button>
              )
            })}
            {shown.length === 0 ? (
              <span className="px-2.5 py-1.5 text-dense-label text-[var(--sk-mute2)]">
                No setting matches “{q}”.
              </span>
            ) : null}
          </div>
          <span className="px-2.5 pt-2 text-dense-meta leading-normal text-pretty text-[var(--sk-mute2)]">
            Cluster, pipeline and market-data configuration lives in{' '}
            <a
              href={OPS_CONSOLE_URL}
              target="_blank"
              rel="noreferrer"
              className="text-[var(--sk-accent)] hover:underline"
            >
              Ops Console
            </a>
            .
          </span>
        </nav>

        <section
          aria-label={SETTINGS_CATEGORIES.find((c) => c.id === pane)?.label}
          className="flex min-w-0 max-w-[720px] flex-[1_1_480px] flex-col gap-4"
        >
          <Pane />
        </section>
      </div>
    </PageShell>
  )
}
