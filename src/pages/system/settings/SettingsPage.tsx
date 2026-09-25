/**
 * Settings — built 2026-09-22 against `Settings.dc.html` (Rev 2026-09-20.16).
 * The app had no page here; `/settings` was a redirect to the Coverage page
 * the same ruling retired.
 *
 * The other half of the Owner's 2026-09-15 collapse: System becomes Status and
 * this. The prototype's footer sets the boundary — the old System ›
 * Configuration › IB Connection merges in here, and cluster, pipeline and
 * market-data infrastructure config belongs to the Ops Console — so there are
 * three panels and nothing about the cluster on any of them.
 *
 * ## Read here, and written here
 *
 * The prototype is read-only and says so: *此页原型只读——编辑动作在实现侧接
 * YAML/配置存储*. The Owner called the move on 2026-09-25: the IB Connection
 * page's writes now open in place under their rows (`SettingsEditors.tsx`),
 * and `/system/ib` forwards here. The two YAML rows have no write route —
 * config.yaml is read when a process starts — so their control is `View`,
 * which opens the full reading the old page printed: every slot's host and
 * port, and every client id the YAML assigns.
 *
 * ## Keyboard is the app's own table, not the design's four
 *
 * `SHORTCUTS` already answers `?` in the Omnibar. Retyping the design's list
 * here would have made two lists that can disagree, and publishing it turned
 * up two ways the one table was already wrong: Esc was described as closing
 * the Copilot, which stopped being true when §5a.8 made the side panel the
 * companion that stays, and ⌘B — which `@bifrost/ui`'s sidebar has always
 * bound — was missing. Both are fixed at the source (§14.2).
 *
 * ## Owed
 *
 * The design's Flex header reads `daily 08:30 · missed today, ran 06:02` — a
 * schedule and a comparison against it. The plugin exposes neither: its
 * schedule is Dagster's and no route reports it. The header says what did land
 * and when, which is the half that can be read.
 */
import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { PageHead, PageShell } from '@/components/layout'
import { RAISED_PANEL } from '@/components/layout/raisedPanel'
import { cn } from '@/lib/utils'
import { useMonitorStatus } from '@/hooks/useMonitorStatus'
import { useFlexConfigSummary, useInvalidateFlexConfigSummary } from '@/hooks/useFlexConfigSummary'
import { useFlexCoverageFreshness } from '@/hooks/useFlexCoverageFreshness'
import { pluginFlexTrigger } from '@/api/flexQueryPlugin'
import { SHORTCUTS } from '@/lib/cockpit/shortcuts'
import {
  flexRows,
  flexStanding,
  ibClientIdLines,
  ibConnectionLines,
  ibRows,
  ibSlotStanding,
  type SettingRow,
} from './settingsModel'
import { AccountEditor, FlexQueryEditor, FlexRangeEditor, FlexTokenEditor, YamlReading } from './SettingsEditors'

/** The two rows config.yaml owns: read in full, never written from here. */
const YAML_ROWS = new Set(['ib-user', 'ib-client'])
const YAML_WHY =
  'Set in config.yaml and read when a process starts — edit the file and restart the process; there is no write route for it.'

function Panel({
  cap,
  title,
  aside,
  asideTone,
  children,
}: {
  cap: string
  title: string
  aside?: string
  asideTone?: 'ok' | 'warn' | 'gray'
  children: React.ReactNode
}) {
  return (
    <section className={cn(RAISED_PANEL, 'overflow-hidden')}>
      <header className="flex flex-wrap items-center gap-2.5 border-b border-[var(--sk-line0)] bg-[var(--sk-raised2)] px-3 py-2">
        <span className="whitespace-nowrap text-dense-caption font-semibold uppercase tracking-[0.1em] text-muted-foreground">
          {cap}
        </span>
        <span className="text-dense-body font-semibold">{title}</span>
        {aside ? (
          <span
            className={cn(
              'ml-auto text-dense-meta',
              asideTone === 'warn' ? 'text-warning' : 'text-muted-foreground',
            )}
          >
            {aside}
          </span>
        ) : null}
      </header>
      {children}
    </section>
  )
}

/**
 * A form row, measured (§5a.3): the description takes a reading measure and
 * the control tracks it, so Edit stays beside the field it edits rather than
 * at the far edge of a wide pane. The panel still fills the pane.
 */
const ROW =
  'grid grid-cols-[170px_minmax(0,72ch)_auto] items-baseline justify-start gap-3 border-b border-[color-mix(in_srgb,var(--sk-line)_60%,transparent)] px-3 py-2 last:border-b-0'

function Row({ row, action }: { row: SettingRow; action?: React.ReactNode }) {
  return (
    <div className={ROW}>
      <span className="text-dense-label text-[var(--sk-soft)]">{row.label}</span>
      <span className="min-w-0 text-dense-label leading-normal text-[var(--sk-mute2)]">
        {row.what}
        <span className="ml-2 font-mono tabular-nums text-foreground/80">{row.reading}</span>
      </span>
      {action}
    </div>
  )
}

export default function SettingsPage() {
  const { data: status } = useMonitorStatus()
  const flexConfig = useFlexConfigSummary()
  const freshness = useFlexCoverageFreshness()
  const invalidateFlex = useInvalidateFlexConfigSummary()
  const [nowMs] = useState(() => Date.now())
  const [fetched, setFetched] = useState<string | null>(null)

  const fetchNow = useMutation({
    mutationFn: () => pluginFlexTrigger('transactions'),
    onSuccess: (r) => {
      setFetched(r.ok === false ? (r.error ?? 'refused') : 'queued ✓')
      invalidateFlex()
      void freshness.refetch()
      window.setTimeout(() => setFetched(null), 4000)
    },
    onError: (e) => setFetched(e instanceof Error ? e.message : 'failed'),
  })

  const standing = flexStanding(freshness.data, nowMs)
  const secondaryOn = Boolean(status?.config?.ib_client?.client?.secondary_host_ip?.trim())

  // One row open at a time: an editor is a form, and two half-typed forms on
  // one page is two saves waiting to disagree.
  const [open, setOpen] = useState<string | null>(null)
  const close = () => setOpen(null)
  const toggle = (row: SettingRow) => (
    <button
      type="button"
      onClick={() => setOpen(open === row.id ? null : row.id)}
      aria-expanded={open === row.id}
      className="whitespace-nowrap text-dense-meta text-[var(--sk-accent)] hover:underline"
      title={YAML_ROWS.has(row.id) ? YAML_WHY : undefined}
    >
      {open === row.id ? 'Close' : YAML_ROWS.has(row.id) ? 'View' : 'Edit'}
    </button>
  )
  const opened = (id: string) => {
    if (open !== id) return null
    switch (id) {
      case 'ib-user':
        return <YamlReading lines={ibConnectionLines(status)} why={YAML_WHY} />
      case 'ib-client':
        return <YamlReading lines={ibClientIdLines(status)} why={YAML_WHY} />
      case 'ib-account':
        return <AccountEditor status={status} onDone={close} />
      case 'flex-query':
        return <FlexTokenEditor summary={flexConfig.data} secondaryOn={secondaryOn} onDone={close} />
      case 'flex-preference':
        return <FlexQueryEditor summary={flexConfig.data} secondaryOn={secondaryOn} onDone={close} />
      case 'flex-range':
        return <FlexRangeEditor summary={flexConfig.data} onDone={close} />
      default:
        return null
    }
  }

  return (
    <PageShell padding="compact" className="space-y-3">
      <PageHead
        title="Settings"
        info="The trader's own configuration — connection, data pulls, keys. Infra config lives in Ops."
      />

      <Panel cap="IB Connection" title={ibSlotStanding(status)} aside="edits apply on next reconnect">
        {ibRows(status).map((r) => (
          <div key={r.id}>
            <Row row={r} action={toggle(r)} />
            {opened(r.id)}
          </div>
        ))}
      </Panel>

      <Panel
        cap="Flex"
        title={standing.text}
        asideTone={standing.tone}
        aside="feeds Ledger + Transfer & Pay"
      >
        {flexRows(flexConfig.data).map((r) => (
          <div key={r.id}>
            <Row row={r} action={toggle(r)} />
            {opened(r.id)}
          </div>
        ))}
        <Row
          row={{
            id: 'flex-fetch',
            label: 'Fetch now',
            what: 'Pull transactions for the default range — the same trigger Transfer & Pay’s toolbar fires',
            reading: fetched ?? '',
          }}
          action={
            <button
              type="button"
              onClick={() => fetchNow.mutate()}
              disabled={fetchNow.isPending}
              className="whitespace-nowrap text-dense-meta text-[var(--sk-accent)] hover:underline disabled:opacity-50"
            >
              {fetchNow.isPending ? 'pulling…' : 'Fetch now'}
            </button>
          }
        />
      </Panel>

      <Panel cap="Keyboard" title="fixed set · reference" aside="the Omnibar answers ? with this list">
        {SHORTCUTS.map((s) => (
          <div key={s.keys} className={ROW}>
            <span className="text-dense-label text-[var(--sk-soft)]">{s.name}</span>
            <span className="text-dense-label text-[var(--sk-mute2)]">
              {s.what}
              {s.scope === 'Anywhere' ? null : (
                <span className="ml-2 font-mono text-dense-caption text-muted-foreground">{s.scope}</span>
              )}
            </span>
            <kbd className="rounded border border-[var(--sk-line)] px-1 font-mono text-dense-caption leading-[15px] text-[var(--sk-mute2)]">
              {s.keys}
            </kbd>
          </div>
        ))}
      </Panel>

      <p className="text-dense-meta leading-[1.6] text-muted-foreground">
        Owner ruling 2026-09-15: the old System › Configuration › IB Connection merges here, and
        cluster, pipeline and market-data infrastructure config belongs to the Ops Console. Each
        row edits in place and saves only its own part; the two YAML rows are read here and
        changed in config.yaml. The Flex schedule itself is Dagster&rsquo;s and no route reports
        it, so the header says what landed rather than what was due.
      </p>
    </PageShell>
  )
}
