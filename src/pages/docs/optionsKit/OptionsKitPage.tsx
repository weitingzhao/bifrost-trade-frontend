/**
 * Options Kit — walked against `Docs Options Kit.dc.html` (Rev 2026-09-17.2)
 * and its spec, `Dense UI Options Kit Spec.md`.
 *
 * The prototype is a sample page: it draws each of the kit's 21 primitives
 * with made-up data. This side deliberately does not, and the reason is the
 * first line of the spec itself — *"spec settled, not scheduled"*. Measured
 * 2026-09-23, `@bifrost/ui` is still 0.4.11 with no `finance/`, `quant/` or
 * `trading/` directory, so there is nothing to render for thirteen of them.
 *
 * Drawing lookalikes in this page's own markup would be worse than not
 * drawing them: it would put a second definition of `HitRateBar` in the
 * codebase, in the one page whose whole job is to say there should only ever
 * be one. So the rule here is **render what exists, specify what does not** —
 * live components where this app already answers the primitive, signature and
 * rule where it does not.
 *
 * The one thing that *is* shown working is rule §4.1 — a rate without its
 * sample size is not a reading. That rule is logic, not pixels, so it lives in
 * `kitInventory.confidenceReading`, is under test, and drives the sample-size
 * control below out of real `DenseTag`s.
 */
import { useMemo, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { PageHead, PageShell } from '@/components/layout'
import {
  DenseDataTable,
  DenseTableBody,
  DenseTableCell,
  DenseTableHead,
  DenseTableHeader,
  DenseTableHeadRow,
  DenseTableRow,
  DenseTag,
  SegmentControl,
  denseTableNumCell,
  type SegmentOption,
} from '@/components/data-display'
import { DenseSparkline } from '@/components/charts/DenseSparkline'
import { IvRankStrip } from '@/components/charts/IvRankStrip'
import { InlinePnl, PnlCell } from '@/components/data-display'
import { greeksDeltaCellClass } from '@/pages/research/analyze/greeks/greeksUi'
import { fmtDollar, unrealizedPnlColorClass } from '@/utils/dailyChange'
import { fmtPctSigned } from '@/lib/format'
import { cn } from '@/lib/utils'
import {
  CodeRef,
  PlannedTokenSwatch,
  SampleBox,
  TokenSwatch,
  type DocsSection,
} from '@/components/docs/docsUi'
import {
  COLOUR_CHANNELS,
  KIT_GROUP_LABEL,
  KIT_ORDER_STATES,
  KIT_PRIMITIVES,
  UI_VERSION_NOW,
  UI_VERSION_TARGET,
  confidenceReading,
  kitStanding,
  orderVocabularyGap,
  type KitGroup,
  type KitPrimitive,
} from './kitInventory'

const SECTIONS: readonly DocsSection[] = [
  { id: 'standing', label: 'Standing' },
  { id: 'channels', label: 'Colour channels' },
  { id: 'finance', label: 'finance' },
  { id: 'quant', label: 'quant' },
  { id: 'trading', label: 'trading' },
  { id: 'layout', label: 'layout' },
  { id: 'code-map', label: 'Code map' },
]

/** The design's head facts, from the kit inventory rather than retyped. */
const HEAD_FACTS: readonly [string, ReactNode][] = [
  ['Base', <span className="font-mono tabular-nums">@bifrost/ui {UI_VERSION_NOW}</span>],
  ['Proposed', <span className="font-mono tabular-nums">{UI_VERSION_TARGET} · src/finance · src/quant · src/trading</span>],
  ['Boundary', 'D10 — the system advises and records; it never sends an order. The order vocabulary below has no “working” or “submitted” state.'],
  ['Spec', <span className="font-mono">Dense UI Options Kit Spec.md</span>],
]

/**
 * One section in the design's editorial layout: the number, the title and
 * what it answers on the left; the section's content beside it.
 */
function KitSection({
  id,
  n,
  title,
  description,
  children,
}: {
  id: string
  n: string
  title: string
  description: ReactNode
  children: ReactNode
}) {
  return (
    <section id={id} className="flex scroll-mt-24 flex-wrap gap-x-8 gap-y-6 border-t border-[var(--sk-line)] pt-6 pb-6.5">
      <aside className="min-w-[200px] flex-[0_1_220px]">
        <div className="font-mono text-dense-meta text-muted-foreground">{n}</div>
        <h2 className="mt-0.5 mb-2 text-base font-semibold">{title}</h2>
        <p className="m-0 text-dense-label leading-normal text-[var(--sk-mute2)] text-pretty">{description}</p>
      </aside>
      <div className="min-w-0 flex-[1_1_560px] space-y-4 text-sm leading-relaxed text-muted-foreground">{children}</div>
    </section>
  )
}

const OWED = (
  <DenseTag variant="neutral" size="cell">
    owed
  </DenseTag>
)

/** The one mark this page repeats: is there something behind this name today? */
function HereOrOwed({ p }: { p: KitPrimitive }) {
  if (!p.here) return OWED
  return (
    <span className="inline-flex flex-wrap items-center gap-1.5">
      <DenseTag variant="success" size="cell">
        here
      </DenseTag>
      <CodeRef>{p.here.what}</CodeRef>
    </span>
  )
}

function PrimitiveRow({ p }: { p: KitPrimitive }) {
  return (
    <div className="rounded-md border border-border bg-background px-3 py-2.5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="text-xs font-semibold text-foreground">{p.name}</p>
        <HereOrOwed p={p} />
      </div>
      <p className="mt-1 break-words font-mono text-dense-caption text-muted-foreground">
        {p.signature}
      </p>
      <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">{p.note}</p>
    </div>
  )
}

function byGroup(group: KitGroup) {
  return KIT_PRIMITIVES.filter(p => p.group === group)
}

const SAMPLE_OPTIONS: SegmentOption[] = [
  { value: '3', label: 'n=3' },
  { value: '14', label: 'n=14' },
  { value: '212', label: 'n=212' },
]

/** The prototype's own three samples, with the figures it uses. */
const SAMPLES: Record<string, { n: number; win: number; avg: number; med: number; sharpe: number | null; dd: number }> = {
  '3': { n: 3, win: 0.67, avg: 1120, med: 980, sharpe: null, dd: -860 },
  '14': { n: 14, win: 0.71, avg: 1940, med: 1210, sharpe: 1.32, dd: -4120 },
  '212': { n: 212, win: 0.58, avg: 412, med: 260, sharpe: 0.94, dd: -9830 },
}

export default function OptionsKitPage() {
  const [sampleN, setSampleN] = useState('14')
  const standing = useMemo(() => kitStanding(), [])
  const gap = useMemo(() => orderVocabularyGap(), [])

  const s = SAMPLES[sampleN] ?? SAMPLES['14']
  const conf = confidenceReading(s.n)
  const wins = Math.round(s.win * s.n)

  /** Rule §4.1 in one place: below the minimum, nothing here takes a colour. */
  const tone = (v: number) =>
    !conf.colours ? 'text-muted-foreground' : v > 0 ? 'text-[var(--color-profit)]' : v < 0 ? 'text-[var(--color-loss)]' : ''

  return (
    <PageShell padding="compact">
      <div className="mx-auto flex w-full max-w-[1240px] flex-col">
      {/* The design's head: the page head, and beside it the four lines that
          say what this kit is built on, where it goes, and what it may not do. */}
      <div className="flex flex-wrap items-start gap-x-6 gap-y-3 pb-4">
        <div className="min-w-0 flex-[1_1_520px]">
          <PageHead
            title="Options Kit"
            info="The options and quant extension to Dense UI — six colour channels and 21 primitives destined for @bifrost/ui. This page says, for each one, what this app renders today and what is still only specified."
            meta="spec · not scheduled"
          />
        </div>
        <dl className="m-0 flex flex-[0_1_320px] flex-col gap-1.5 pt-1.5 text-dense-label text-[var(--sk-mute2)]">
          {HEAD_FACTS.map(([k, v]) => (
            <div key={k} className="flex items-start gap-2">
              <dt className="w-[82px] flex-none text-dense-meta font-semibold uppercase tracking-[0.06em] text-muted-foreground">{k}</dt>
              <dd className="m-0 text-pretty">{v}</dd>
            </div>
          ))}
        </dl>
      </div>

      <nav aria-label="Options kit sections" className="flex flex-wrap gap-x-3 gap-y-1.5 border-t border-[var(--sk-line)] pt-2.5 pb-3 text-dense-label">
        {SECTIONS.map((sec, i) => (
          <a key={sec.id} href={`#${sec.id}`} className="text-[var(--sk-accent)] no-underline hover:text-[var(--sk-accent2)]">
            {String(i).padStart(2, '0')} {sec.label}
          </a>
        ))}
      </nav>

      <KitSection
        id="standing"
        n="00"
        title="Where the kit actually stands"
        description="The spec's own status line, checked rather than quoted."
      >
        <p>
          <CodeRef>Dense UI Options Kit Spec.md</CodeRef> opens with{' '}
          <strong className="text-foreground">spec settled, not scheduled</strong>. Measured on
          2026-09-23 that is still exactly true: <CodeRef>@bifrost/ui</CodeRef> is{' '}
          <strong className="text-foreground">{UI_VERSION_NOW}</strong> — the version this app
          builds against — and none of the four directories the kit adds (
          <CodeRef>finance/</CodeRef> <CodeRef>quant/</CodeRef> <CodeRef>trading/</CodeRef>{' '}
          <CodeRef>layout/</CodeRef>) exists yet. The rollout is filed for {UI_VERSION_TARGET}. The
          site-wide half of this gallery is already here:{' '}
          <Link to="/docs/ui-design-system" className="text-primary hover:underline">
            UI Design System
          </Link>
          .
        </p>
        <p>
          So this page is a <strong className="text-foreground">join, not a gallery</strong>. Of the{' '}
          {standing.total} primitives, <strong className="text-foreground">{standing.here}</strong>{' '}
          are already rendered by this app under another name, and{' '}
          <strong className="text-foreground">{standing.owed}</strong> have nothing behind them on
          either side. The eight sources named below are real files, asserted against the disk by{' '}
          <CodeRef>kitInventory.test.ts</CodeRef> — a page that claims &ldquo;already built, here&rdquo;
          should notice when that stops being true.
        </p>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {standing.byGroup.map(g => (
            <div key={g.group} className="rounded-md border border-border bg-background px-3 py-2">
              <p className="font-mono text-xs font-semibold text-foreground">{g.group}/</p>
              <p className="mt-1 text-xs text-muted-foreground">
                <span className="font-mono tabular-nums text-foreground">
                  {g.here}/{g.total}
                </span>{' '}
                answered here
              </p>
            </div>
          ))}
        </div>
      </KitSection>

      <KitSection
        id="channels"
        n="01"
        title="Six colour channels"
        description="What each hue is allowed to mean, and the thing it is never allowed to mean."
      >
        <p>
          A swatch reads the running stylesheet wherever the token has landed, so what you see is
          the value the app will actually paint. The direction tokens are live — contract §14.7 put{' '}
          <CodeRef>--color-profit</CodeRef> / <CodeRef>--color-loss</CodeRef> /{' '}
          <CodeRef>--color-unrealized</CodeRef> into this app already. The lamp shades are drawn as
          literals because the kit has not given them variables.
        </p>
        <div className="space-y-3">
          {COLOUR_CHANNELS.map(c => (
            <div key={c.id} className="rounded-md border border-border bg-background px-3 py-2.5">
              <p className="text-xs font-semibold text-foreground">{c.name}</p>
              <div className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {c.swatches.map(sw =>
                  sw.varName ? (
                    <TokenSwatch key={sw.token} label={sw.token} varName={sw.varName} />
                  ) : (
                    <PlannedTokenSwatch
                      key={sw.token}
                      label={sw.token}
                      color={sw.color ?? 'transparent'}
                      note="no token yet"
                    />
                  ),
                )}
              </div>
              <dl className="mt-2.5 space-y-1 text-xs leading-relaxed">
                <div className="flex gap-2">
                  <dt className="shrink-0 font-semibold text-foreground">On</dt>
                  <dd>{c.on}</dd>
                </div>
                <div className="flex gap-2">
                  <dt className="shrink-0 font-semibold text-foreground">Never</dt>
                  <dd>{c.never}</dd>
                </div>
              </dl>
            </div>
          ))}
        </div>
      </KitSection>

      <KitSection
        id="finance"
        n="02"
        title="finance — the numbers on an option"
        description={KIT_GROUP_LABEL.finance}
      >
        <p className="text-xs">
          Three of these render below with the components this app ships today. The kit&rsquo;s
          contribution to them is a <em>name and a home</em>, not a behaviour — most visibly{' '}
          <CodeRef>GreekCell</CodeRef>, whose accent rule (|Δ| between 0.40 and 0.60) is already{' '}
          <CodeRef>greeksDeltaCellClass</CodeRef>, to the digit.
        </p>

        <SampleBox className="gap-6">
          <div>
            <p className="mb-1.5 text-dense-caption uppercase tracking-wide">PnlValue · realised</p>
            <div className="flex items-center gap-4 font-mono tabular-nums">
              <PnlCell dollar={1940} pct={2.4} formatDollar={fmtDollar} formatPct={fmtPctSigned} />
              <PnlCell dollar={-412} pct={-0.6} formatDollar={fmtDollar} formatPct={fmtPctSigned} />
              <PnlCell dollar={0} pct={0} formatDollar={fmtDollar} formatPct={fmtPctSigned} />
              <InlinePnl value={null}>—</InlinePnl>
            </div>
          </div>
          <div>
            <p className="mb-1.5 text-dense-caption uppercase tracking-wide">
              PnlValue · unrealised
            </p>
            <span className={cn('font-mono tabular-nums', unrealizedPnlColorClass(3120))}>
              {fmtDollar(3120)} <span className="text-dense-caption">UNREALIZED</span>
            </span>
          </div>
        </SampleBox>

        <SampleBox className="gap-6">
          <div>
            <p className="mb-1.5 text-dense-caption uppercase tracking-wide">GreekCell</p>
            <div className="flex items-center gap-4 font-mono tabular-nums">
              {[
                { g: 'Δ', v: 0.52 },
                { g: 'Γ', v: 0.031 },
                { g: 'Θ', v: -0.041 },
                { g: 'ν', v: 0.184 },
              ].map(x => (
                <span key={x.g} className="flex items-baseline gap-1">
                  <span className="text-dense-caption text-muted-foreground">{x.g}</span>
                  <span className={greeksDeltaCellClass(x.g === 'Δ' ? x.v : null)}>
                    {x.v.toFixed(3)}
                  </span>
                </span>
              ))}
            </div>
          </div>
        </SampleBox>

        <div className="rounded-md border border-border bg-background px-3 py-2.5">
          <p className="mb-2 text-dense-caption uppercase tracking-wide">
            IvRankStrip — as it renders today
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            {[
              { sym: 'PLTR', rank: 71, word: 'rich' },
              { sym: 'SPY', rank: 18, word: 'cheap' },
            ].map(x => (
              <div key={x.sym}>
                <p className="mb-1 flex items-baseline gap-2">
                  <span className="font-mono text-xs text-[var(--color-entity-symbol)]">
                    {x.sym}
                  </span>
                  <span className="text-dense-caption text-muted-foreground">{x.word}</span>
                </p>
                <IvRankStrip rank={x.rank} />
              </div>
            ))}
          </div>
        </div>

        <p className="text-xs">
          <strong className="text-foreground">
            The IV rule the kit retires is painted by the component the kit moves up.
          </strong>{' '}
          The spec asks for a grey rail with a lime marker (§1) and, in the same document, moves{' '}
          <CodeRef>charts/IvRankStrip</CodeRef> up as-is (§5). The strip above is that component,
          and its rail is three bands — <CodeRef>bg-success/25</CodeRef> below 30,{' '}
          <CodeRef>bg-warning/20</CodeRef> to 60, <CodeRef>bg-destructive/20</CodeRef> above —
          which is green-for-cheap, amber, red-for-rich. Moving it unchanged would carry the retired
          rule into <CodeRef>@bifrost/ui</CodeRef>, so §1 and §5 need reconciling before that move.
        </p>

        <p className="text-xs">
          The same rule has a second home: <CodeRef>greeksIvCellClass</CodeRef> colours IV green
          below 0.30 and amber from 0.80, with one caller left —{' '}
          <CodeRef>GreeksHistoryTable.tsx</CodeRef>, on{' '}
          <Link to="/research/greeks" className="text-primary hover:underline">
            Contract Greeks
          </Link>
          .
        </p>

        <div className="grid gap-2 lg:grid-cols-2">
          {byGroup('finance').map(p => (
            <PrimitiveRow key={p.name} p={p} />
          ))}
        </div>
      </KitSection>

      <KitSection
        id="quant"
        n="03"
        title="quant — reading a sample"
        description="Rule 1 of the spec, shown working: a rate without its sample size is not a reading."
      >
        <div className="flex flex-wrap items-center gap-3">
          <SegmentControl options={SAMPLE_OPTIONS} value={sampleN} onChange={setSampleN} />
          <DenseTag variant={conf.variant} size="pill">
            {conf.label}
          </DenseTag>
          <span className="text-xs">{conf.note}</span>
        </div>

        <div className="grid gap-2 sm:grid-cols-3 lg:grid-cols-6">
          {[
            { label: 'Events', value: String(s.n), note: conf.colours ? 'priced · 0 skipped' : 'too few to read', cls: '' },
            {
              label: 'Win rate',
              value: `${Math.round(s.win * 100)}%`,
              note: `${wins} of ${s.n}`,
              cls: !conf.colours ? 'text-muted-foreground' : s.win > 0.55 ? 'text-[var(--color-profit)]' : s.win < 0.45 ? 'text-[var(--color-loss)]' : '',
            },
            { label: 'Avg P&L', value: fmtDollar(s.avg), note: 'per event · net of fees', cls: tone(s.avg) },
            { label: 'Median P&L', value: fmtDollar(s.med), note: s.avg > s.med ? 'skew right' : 'skew left', cls: tone(s.med) },
            {
              label: 'Sharpe',
              value: s.sharpe == null ? '—' : s.sharpe.toFixed(2),
              note: s.sharpe == null ? 'withheld · n < 5' : 'annualised · 252d',
              cls: s.sharpe == null ? 'text-muted-foreground' : tone(s.sharpe),
            },
            { label: 'Max drawdown', value: fmtDollar(s.dd), note: 'peak to trough', cls: tone(-1) },
          ].map(st => (
            <div key={st.label} className="rounded-md border border-border bg-background px-2.5 py-2">
              <p className="text-dense-caption uppercase tracking-wide">{st.label}</p>
              <p className={cn('font-mono text-sm tabular-nums text-foreground', st.cls)}>{st.value}</p>
              <p className="text-dense-caption text-muted-foreground">{st.note}</p>
            </div>
          ))}
        </div>

        <p className="text-xs">
          Switch to <strong className="text-foreground">n=3</strong> and every figure goes muted and
          Sharpe goes to <CodeRef>—</CodeRef>. That is not styling: <CodeRef>StatGrid</CodeRef> owns
          it so that no caller can colour a two-event win rate, and the logic here lives in{' '}
          <CodeRef>confidenceReading</CodeRef> with its boundaries under test.
        </p>

        <SampleBox>
          <div>
            <p className="mb-1.5 text-dense-caption uppercase tracking-wide">Sparkline · line</p>
            <div className="flex items-center gap-4">
              {[
                { sym: 'NVDA', v: [41, 44, 43, 47, 52, 50, 55, 58], d: 4.2 },
                { sym: 'AMD', v: [62, 60, 57, 58, 54, 51, 49, 46], d: -3.1 },
              ].map(x => (
                <span key={x.sym} className="flex items-center gap-2">
                  <span className="font-mono text-xs text-[var(--color-entity-symbol)]">{x.sym}</span>
                  <DenseSparkline values={x.v} />
                  <span className={cn('font-mono text-xs tabular-nums', tone(x.d))}>
                    {fmtPctSigned(x.d)}
                  </span>
                </span>
              ))}
            </div>
          </div>
        </SampleBox>

        <div className="grid gap-2 lg:grid-cols-2">
          {byGroup('quant').map(p => (
            <PrimitiveRow key={p.name} p={p} />
          ))}
        </div>
      </KitSection>

      <KitSection
        id="trading"
        n="04"
        title="trading — intent, never execution"
        description="The spec's §0 boundary: the order vocabulary stops at intended."
      >
        <p className="text-xs">
          <CodeRef>OrderState</CodeRef> is a closed union, so TypeScript refuses{' '}
          <CodeRef>working</CodeRef> or <CodeRef>submitted</CodeRef>. Broker states stay in the Live
          pane&rsquo;s own type and never enter a shared one — which is the same boundary D10 draws,
          expressed in the type system.
        </p>

        <SampleBox className="gap-2">
          {KIT_ORDER_STATES.map(o => (
            <span key={o.state} className="inline-flex items-center gap-1.5">
              <DenseTag variant={o.variant} size="cell">
                {o.state.replace('_', ' ')}
              </DenseTag>
              <span className="text-dense-caption text-muted-foreground">{o.who}</span>
            </span>
          ))}
        </SampleBox>

        <p className="text-xs">
          <strong className="text-foreground">The vocabulary gap, measured.</strong> This app
          validates plans against <CodeRef>strategyPlan.ts</CodeRef>, and the two sets are not the
          same one. The kit adds{' '}
          {gap.onlyKit.map((x, i) => (
            <span key={x}>
              {i > 0 ? ', ' : ''}
              <CodeRef>{x}</CodeRef>
            </span>
          ))}{' '}
          — four states this app currently cannot record — and has no word for{' '}
          {gap.onlyApp.map(x => (
            <CodeRef key={x}>{x}</CodeRef>
          ))}
          , which this app does record. Adopting the union is therefore a store change, not a
          renaming.
        </p>

        <div className="grid gap-2 lg:grid-cols-2">
          {byGroup('trading').map(p => (
            <PrimitiveRow key={p.name} p={p} />
          ))}
        </div>
      </KitSection>

      <KitSection
        id="layout"
        n="05"
        title="layout — the line under the header"
        description={KIT_GROUP_LABEL.layout}
      >
        <p className="text-xs">
          One primitive, and this app has a partial answer to it already:{' '}
          <CodeRef>ResearchContextBar</CodeRef> carries the symbol chip, the as-of stamp and the
          quality flag, but only on Research pages — Portfolio pages each run their own account{' '}
          <CodeRef>SegmentControl</CodeRef>. The kit&rsquo;s version is the one bar for both.
        </p>
        <div className="grid gap-2 lg:grid-cols-2">
          {byGroup('layout').map(p => (
            <PrimitiveRow key={p.name} p={p} />
          ))}
        </div>
      </KitSection>

      <KitSection
        id="code-map"
        n="06"
        title="Code map"
        description="Every primitive, its home in @bifrost/ui, and what answers it here today."
      >
        <DenseDataTable tableClassName="min-w-[860px]">
          <DenseTableHeader>
            <DenseTableHeadRow>
              <DenseTableHead className="w-[22ch] min-w-[22ch]">Primitive</DenseTableHead>
              <DenseTableHead className="w-[30ch] min-w-[30ch]">Lands at</DenseTableHead>
              <DenseTableHead className="w-[26ch] min-w-[26ch]">Here today</DenseTableHead>
              <DenseTableHead className={denseTableNumCell}>Group</DenseTableHead>
            </DenseTableHeadRow>
          </DenseTableHeader>
          <DenseTableBody>
            {KIT_PRIMITIVES.map(p => (
              <DenseTableRow key={p.name}>
                <DenseTableCell className="w-[22ch] min-w-[22ch] whitespace-nowrap font-medium text-foreground">
                  {p.name}
                </DenseTableCell>
                <DenseTableCell className="w-[30ch] min-w-[30ch] whitespace-nowrap font-mono text-dense-caption">
                  {p.kitPath}
                </DenseTableCell>
                <DenseTableCell className="w-[26ch] min-w-[26ch]">
                  {p.here ? (
                    <span className="font-mono text-dense-caption" title={p.here.path}>
                      {p.here.what}
                    </span>
                  ) : (
                    OWED
                  )}
                </DenseTableCell>
                <DenseTableCell className={cn(denseTableNumCell, 'whitespace-nowrap')}>
                  {p.group}
                </DenseTableCell>
              </DenseTableRow>
            ))}
          </DenseTableBody>
        </DenseDataTable>
        <p className="text-xs">
          The <CodeRef>Here today</CodeRef> column is the spec&rsquo;s own §5 migration table read
          from this side. Every path in it exists — the test says so — which means the migration is
          a set of moves with known origins, not a greenfield build.
        </p>
      </KitSection>
      </div>
    </PageShell>
  )
}
