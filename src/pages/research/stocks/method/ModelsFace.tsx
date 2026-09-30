/**
 * Method › Models (Rev .121 #5): the three models as facts, one word per
 * thing, and how far their names overlap — every figure read live from the
 * same stores Stock screen ranks with, not typed from a measurement.
 */
import { AsofTag } from '@/components/AsofTag'
import { PageFaceSwitch, PageHead, PageShell } from '@/components/layout'
import { cn } from '@/lib/utils'
import { AGREE_OF, clears, type ModelKey } from '../stockScreenModel'
import { useStockScreenData } from '../useStockScreenData'
import { METHOD_INFO, METHOD_PATH, METHOD_TITLE, type MethodHead } from './methodHead'

const NO_CHIPS: Record<string, boolean> = {}

const NAMES: [string, string][] = [
  ['Radar', 'The Momentum Radar engine and its A+ · A · B · C · D letter. On the page: the Rank by choice called Radar, the stage called Radar grade, tags reading “Radar A+”.'],
  ['Momentum tier', 'SEPA’s own factor: ten signals, weight .20 in the SEPA composite. On the page: the SEPA weight slider, the “Mom tier” column, the Momentum tier stage.'],
  ['Options tier', 'SEPA’s fourth lens (the mart calls it structure_score): the options structure, weight .15; a name without one scores 50.'],
  ['Grade', 'SEPA’s letter only, always paired with path (“A · SETUP”). Radar’s letter is never shown bare.'],
  ['Trend', 'Display name of the vol model’s server preset `momentum`, so “momentum” appears in one place only. The id is unchanged.'],
]

function fmt(n: number | null | undefined): string {
  return n == null ? '—' : n.toLocaleString('en-US')
}

export function ModelsFace({ head }: { head: MethodHead }) {
  const d = useStockScreenData(NO_CHIPS)
  const rows = d.rows
  const bar = (m: ModelKey) => rows.filter((r) => clears(r, AGREE_OF[m]))
  const sepaBar = new Set(bar('sepa').map((r) => r.sym))
  const radarBar = bar('radar')
  const premBar = bar('premium')
  const trend11 = rows.filter((r) => r.sepa?.trendN === 11)
  const paths = ['PIVOT', 'SETUP', 'WATCH', 'AVOID'].map((p) => `${p} ${rows.filter((r) => r.sepa?.path === p).length}`).join(' / ')
  const grades = ['A+', 'A', 'B', 'C', 'D'].map((g) => `${g} ${rows.filter((r) => r.radar?.grade === g).length}`).join(' · ')
  const models: { name: string; kind: string; note: string; facts: [string, string, boolean?][] }[] = [
    {
      name: 'SEPA',
      kind: 'stock model · is the company in a tradeable trend',
      note: `Grade, path and stage are the mart’s cuts of the composite (${paths}). Client weights on Stock screen re-order; they never re-grade.`,
      facts: [
        ['endpoint', '/analytics/sepa/screener-wide', true],
        ['source', 'dw_stock.mart_sepa_screener_wide', true],
        ['rows', `${fmt(d.wide.data?.rows.length)} evaluated — the model route caps at 1,000; the wide read is the same cuts on every name`],
        ['as of', d.sepaDate ?? '—'],
        ['composite', 'trend 11 × .35 + growth 8 × .30 + momentum tier × .20 + options tier × .15 (50 where unscored) — reconciles on every row'],
        ['presets', 'Model · Trend · Quality · Even (client-side weights)'],
        ['shares with', 'Trend template and Growth stages: the same evaluation table'],
      ],
    },
    {
      name: 'Radar',
      kind: 'Momentum Radar engine · who is moving now',
      note: 'Scored server-side; Stock screen shows the score, the letter and four of the nine factors, with no weights. Leaders is this engine’s own cross-session history.',
      facts: [
        ['endpoint', '/research/momentum/radar?trade_date=<latest>', true],
        ['rows', `${fmt(d.radar.data?.rows.length)} graded · ${grades}`],
        ['session', d.radarDate ?? '—'],
        ['sort field', 'score + grade', true],
        ['factors', 'z_sdt · z_v · accept_vwap · z_ofi · h_52w · o_plus · a_factor · r_sec · crash', true],
        ['not computed', 'z_ofi returns 50.0 for every name'],
        ['presets', 'none'],
      ],
    },
    {
      name: 'Premium',
      kind: 'vol model · is the underlying worth selling',
      note: 'Ranks the underlying, not the company. On Stock screen it is a Rank by choice; Vol ratings keeps its own page for one version while the two are compared.',
      facts: [
        ['endpoint', '/research/scan (two pages)', true],
        ['rows', `${fmt(d.scan.data?.rows.length)} of a ${fmt(d.scanUniverse)}-underlying universe`],
        ['as of', d.scanDate?.slice(0, 10) ?? '—'],
        ['sort field', 'composite_score', true],
        ['lenses', 'IV rank · VRP · term slope · pin · terrain'],
        ['presets', 'neutral · momentum · mean_revert (server). Shown as Neutral · Trend · Revert'],
      ],
    },
  ]
  const overlap: [string, string][] = [
    ['Radar A+ / A names (latest session)', fmt(radarBar.length)],
    ['… of which SEPA SETUP / PIVOT', `${radarBar.filter((r) => sepaBar.has(r.sym)).length} of ${radarBar.length}`],
    ['Premium ≥ 70 underlyings', fmt(premBar.length)],
    ['… of which SEPA SETUP / PIVOT', `${premBar.filter((r) => sepaBar.has(r.sym)).length} of ${premBar.length}`],
    ['Trend template 11 / 11', fmt(trend11.length)],
    ['… of which SEPA SETUP / PIVOT', `${trend11.filter((r) => sepaBar.has(r.sym)).length} of ${trend11.length}`],
    ['Tech / fund pass counts, SEPA vs Screen', 'one table — the same row'],
  ]
  return (
    <PageShell padding="compact" className="space-y-3">
      <PageHead
        title={METHOD_TITLE}
        info={METHOD_INFO}
        stamp={<AsofTag asof={d.sepaDate} judgedBy="Research" href="/research/signal-health" />}
        tabs={head.tabs}
        tab={head.tab}
        onTab={head.onTab}
      />
      <div data-sr-toolbar="">
        <PageFaceSwitch path={METHOD_PATH} />
        <span data-sr-tb="sep" />
        <span
          className="inline-flex items-center gap-1.5 px-2 py-0.5 mat-tag font-mono text-dense-micro font-semibold tracking-[0.05em] text-[var(--sk-series-violet)]"
          title="Method face — how the number is made. No order can be placed from here."
        >
          ◆ METHOD · NO ORDERS
        </span>
        <span data-sr-tb="meta" className="font-mono">
          three models · one universe · SEPA {d.sepaDate ?? '—'} · Radar {d.radarDate ?? '—'} · Premium {d.scanDate?.slice(0, 10) ?? '—'}
        </span>
      </div>
      <div className="grid gap-2.5 [grid-template-columns:repeat(auto-fit,minmax(min(100%,320px),1fr))]">
        {models.map((m) => (
          <section key={m.name} className="mat-card overflow-hidden border">
            <header className="flex flex-wrap items-baseline gap-2 border-b border-foreground/[0.06] px-3 py-2">
              <span className="text-dense-body font-semibold">{m.name}</span>
              <span className="text-dense-meta text-muted-foreground">{m.kind}</span>
            </header>
            <dl className="grid gap-x-3 gap-y-1.5 px-3 py-2.5 text-dense-label [grid-template-columns:96px_minmax(0,1fr)]">
              {m.facts.map(([k, v, mono]) => (
                <div key={k} className="contents">
                  <dt className="text-muted-foreground">{k}</dt>
                  <dd className={cn('min-w-0 break-words', mono && 'font-mono text-dense-meta')}>{v}</dd>
                </div>
              ))}
            </dl>
            <div className="border-t border-foreground/[0.06] px-3 py-2 text-dense-meta leading-normal text-muted-foreground">{m.note}</div>
          </section>
        ))}
      </div>
      <div className="grid gap-2.5 [grid-template-columns:repeat(auto-fit,minmax(min(100%,380px),1fr))]">
        <section className="mat-card overflow-hidden border">
          <header className="flex items-baseline gap-2 border-b border-foreground/[0.06] px-3 py-2">
            <span data-sr-tb="label">Names</span>
            <span className="text-dense-body font-semibold">One word per thing</span>
          </header>
          <dl className="grid gap-x-3 gap-y-1.5 px-3 py-2.5 text-dense-label [grid-template-columns:110px_minmax(0,1fr)]">
            {NAMES.map(([k, v]) => (
              <div key={k} className="contents">
                <dt className="font-semibold">{k}</dt>
                <dd className="text-[var(--sk-soft)]">{v}</dd>
              </div>
            ))}
          </dl>
        </section>
        <section className="mat-card overflow-hidden border">
          <header className="flex items-baseline gap-2 border-b border-foreground/[0.06] px-3 py-2">
            <span data-sr-tb="label">Overlap</span>
            <span className="text-dense-body font-semibold">Same names, different models</span>
            <span className="ml-auto font-mono text-dense-caption text-muted-foreground">live · {d.sepaDate ?? '—'}</span>
          </header>
          <div className="py-1.5">
            {overlap.map(([k, v], i) => (
              <div key={`${i}-${k}`} className="grid items-center gap-2.5 px-3 py-1 [grid-template-columns:minmax(0,1fr)_auto]">
                <span className="text-dense-label text-[var(--sk-soft)]">{k}</span>
                <span className="text-right font-mono text-dense-label">{d.isLoading ? '…' : v}</span>
              </div>
            ))}
          </div>
          <div className="border-t border-foreground/[0.06] px-3 py-2 text-dense-meta leading-normal text-muted-foreground">
            Read from the stores Stock screen ranks with. Screen and SEPA agree by construction — they read one evaluation table; Radar and Premium overlap SEPA only partly because they are different engines.
          </div>
        </section>
      </div>
    </PageShell>
  )
}
