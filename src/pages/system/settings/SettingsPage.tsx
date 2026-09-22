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
 * ## Read here, written where the write already lives
 *
 * The prototype is read-only and says so: *此页原型只读——编辑动作在实现侧接
 * YAML/配置存储*. This side already has that implementation, on the IB
 * Connection page, so each row reads its value and `Edit →` opens the page
 * that owns the write. Moving 545 lines of write paths is not a presentation
 * change; the design's merge is recorded, and the move is the Owner's to call.
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
import { Link } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { PageHeader, PageShell } from '@/components/layout'
import { cn } from '@/lib/utils'
import { useMonitorStatus } from '@/hooks/useMonitorStatus'
import { useFlexConfigSummary, useInvalidateFlexConfigSummary } from '@/hooks/useFlexConfigSummary'
import { useFlexCoverageFreshness } from '@/hooks/useFlexCoverageFreshness'
import { pluginFlexTrigger } from '@/api/flexQueryPlugin'
import { SHORTCUTS } from '@/lib/cockpit/shortcuts'
import { flexRows, flexStanding, ibRows, ibSlotStanding, type SettingRow } from './settingsModel'

const IB_EDIT = '/system/ib'

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
    <section className="overflow-hidden rounded-lg border border-border">
      <header className="flex flex-wrap items-baseline gap-x-3 gap-y-1 border-b border-border bg-secondary/40 px-3 py-2">
        <span className="text-dense-micro font-bold uppercase tracking-[0.1em] text-muted-foreground">
          {cap}
        </span>
        <span className="text-dense-body font-semibold">{title}</span>
        {aside ? (
          <span
            className={cn(
              'ml-auto text-dense-caption',
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

function Row({ row, action }: { row: SettingRow; action?: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[minmax(0,140px)_minmax(0,1fr)_auto] items-baseline gap-3 border-b border-border/50 px-3 py-2 last:border-b-0">
      <span className="text-dense-meta text-secondary-foreground">{row.label}</span>
      <span className="min-w-0 text-dense-caption leading-relaxed text-muted-foreground">
        {row.what}
        <span className="ml-2 font-mono text-foreground/80">{row.reading}</span>
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

  const edit = (
    <Link to={IB_EDIT} className="whitespace-nowrap text-dense-caption hover:underline">
      Edit →
    </Link>
  )

  return (
    <PageShell padding="compact" className="space-y-3">
      <PageHeader
        title="Settings"
        description="The trader's own configuration — connection, data pulls, keys. Infra config lives in Ops."
      />

      <Panel cap="IB Connection" title={ibSlotStanding(status)} aside="edits apply on next reconnect">
        {ibRows(status).map((r) => (
          <Row key={r.label} row={r} action={edit} />
        ))}
      </Panel>

      <Panel
        cap="Flex"
        title={standing.text}
        asideTone={standing.tone}
        aside="feeds Ledger + Transfer & Pay"
      >
        {flexRows(flexConfig.data).map((r) => (
          <Row key={r.label} row={r} action={edit} />
        ))}
        <Row
          row={{
            label: 'Fetch now',
            what: 'Pull transactions for the default range — the same trigger Transfer & Pay’s toolbar fires',
            reading: fetched ?? '',
          }}
          action={
            <button
              type="button"
              onClick={() => fetchNow.mutate()}
              disabled={fetchNow.isPending}
              className="whitespace-nowrap text-dense-caption hover:underline disabled:opacity-50"
            >
              {fetchNow.isPending ? 'pulling…' : 'Fetch now'}
            </button>
          }
        />
      </Panel>

      <Panel cap="Keyboard" title="fixed set · reference" aside="the Omnibar answers ? with this list">
        {SHORTCUTS.map((s) => (
          <div
            key={s.keys}
            className="grid grid-cols-[minmax(0,140px)_minmax(0,1fr)_auto] items-baseline gap-3 border-b border-border/50 px-3 py-2 last:border-b-0"
          >
            <span className="text-dense-meta text-secondary-foreground">{s.what}</span>
            <span className="text-dense-caption text-muted-foreground">{s.scope}</span>
            <kbd className="rounded border border-border bg-secondary px-1.5 py-0.5 font-mono text-dense-caption">
              {s.keys}
            </kbd>
          </div>
        ))}
      </Panel>

      <p className="text-dense-caption leading-relaxed text-muted-foreground">
        Owner ruling 2026-09-15: the old System › Configuration › IB Connection merges here, and
        cluster, pipeline and market-data infrastructure config belongs to the Ops Console. The
        readings above are this page&rsquo;s; the writes still live on{' '}
        <Link to={IB_EDIT} className="text-foreground hover:underline">
          IB Connection
        </Link>
        , which is where <span className="font-mono">Edit →</span> goes — moving a write path is
        not a presentation change. The Flex schedule itself is Dagster&rsquo;s and no route reports
        it, so the header says what landed rather than what was due.
      </p>
    </PageShell>
  )
}
