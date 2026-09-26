/**
 * Narrative — what the text says, structured, in its own column (design
 * `Research Narrative Lens.dc.html`, Rev 2026-09-23.24; Vision §9.2).
 *
 * The readings on this side are the deterministic half of the lens: each 8-K
 * indexed by the SEC item it files under, and the data vendor's classification
 * where it has one. Neither is a judgment, so neither carries a confidence —
 * the basis is shown instead. The model half the design also draws (10-K risk
 * factors year over year, supply language in MD&A) needs an extractor that is
 * not built; its source text is ingested, and the page says which kinds are
 * owed rather than drawing them empty.
 */
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { PageHeader, PageShell } from '@/components/layout'
import { AsofTag } from '@/components/AsofTag'
import { SegmentControl } from '@/components/data-display'
import type { NarrativeTag } from '@/api/research/narrative'
import { useNarrativeWindow } from '@/hooks/useNarrative'
import { fmtIsoDateToken } from '@/lib/format'
import { withSymbolParam } from '@/lib/symbolLink'
import { SYMBOL_PATH } from '@/lib/symbolTabs'
import { cn } from '@/lib/utils'

const cap =
  'whitespace-nowrap text-dense-micro font-semibold uppercase tracking-[0.1em] text-muted-foreground'
const panel = 'min-w-0 overflow-hidden border mat-card'
const panelHead =
  'flex flex-wrap items-center gap-x-2.5 gap-y-1 border-b border-border bg-secondary/40 px-3 py-2'
const th =
  'sticky top-0 z-[1] whitespace-nowrap border-b border-border bg-background px-2.5 py-1.5 text-left text-dense-micro font-semibold uppercase tracking-[0.08em] text-muted-foreground'
const td = 'border-b border-border/40 px-2.5 py-1.5 align-top text-dense-meta'

type Kind = 'all' | 'event' | 'risk' | 'supply' | 'guidance'

const KIND_OPTIONS: { value: Kind; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'event', label: 'event' },
  { value: 'risk', label: 'risk' },
  { value: 'supply', label: 'supply' },
  { value: 'guidance', label: 'guidance' },
]

const WINDOW_OPTIONS = [
  { value: '7', label: '7d' },
  { value: '30', label: '30d' },
]

function fmtN(n: number): string {
  return n.toLocaleString('en-US')
}

function measuredText(t: NarrativeTag): string {
  const m = t.measured
  if (!m || (m.composite == null && m.iv_rank == null)) return 'no measured read on this name'
  const parts = [
    m.composite == null ? null : `Composite ${Math.round(m.composite)}`,
    `IV rank ${m.iv_rank == null ? '—' : Math.round(m.iv_rank)}`,
  ].filter(Boolean)
  return parts.join(' · ')
}

export default function NarrativePage() {
  const [kind, setKind] = useState<Kind>('all')
  const [days, setDays] = useState('7')
  const q = useNarrativeWindow(Number(days))
  const data = q.data
  const src = data?.sources
  const riskSection = src?.tenk.find((s) => s.section === 'risk_factors')
  const mdaSection = src?.tenk.find((s) => s.section === 'mda')

  const tags = useMemo(() => data?.tags ?? [], [data])
  const shown = kind === 'all' || kind === 'event' ? tags : []
  const names = new Set(shown.map((t) => t.symbol)).size

  const emptyText =
    kind === 'guidance'
      ? 'No guidance tags — structured guidance is not on the current plan (the vendor returns 403). Adding it is the Owner’s call.'
      : kind === 'risk'
        ? `No risk readings — they are a model reading the 10-K risk factors year over year${riskSection ? ` (${fmtN(riskSection.names)} names ingested)` : ''}, and that extractor is not built. The source text is in; the readings are owed.`
        : kind === 'supply'
          ? `No supply readings — they are a model extracting from MD&A${mdaSection ? ` (${fmtN(mdaSection.names)} names ingested)` : ''}, and that extractor is not built. The source text is in; the readings are owed.`
          : q.isLoading
            ? 'Reading the filings…'
            : q.isError
              ? `The narrative read failed — ${(q.error as Error).message}`
              : `No 8-K filed in the last ${days} days.`

  const sources = [
    {
      name: '8-K · body',
      n: src?.filings_8k.first_filed ? `since ${fmtIsoDateToken(src.filings_8k.first_filed)}` : '—',
      note: `events indexed by SEC item (1.01 · 2.02 · 5.02 …) — deterministic, no confidence${src ? ` · ${fmtN(src.filings_8k.filings)} filings over ${fmtN(src.filings_8k.names)} names` : ''}`,
      live: true,
    },
    {
      name: '8-K · vendor classification',
      n: src?.vendor_classified.share == null ? '—' : `≈ ${Math.round(src.vendor_classified.share * 100)}% of 8-Ks`,
      note: 'a second label where the vendor has one — never the index',
      live: true,
    },
    {
      name: '10-K sections',
      n: 'risk_factors · mda',
      note: `${riskSection ? `risk factors ${fmtN(riskSection.names)} names · ` : ''}${mdaSection ? `MD&A ${fmtN(mdaSection.names)} names · ` : ''}the text is in; the readings it feeds (risk year over year, supply from MD&A) are a model not built yet`,
      live: true,
    },
    {
      name: 'Guidance tables',
      n: 'not subscribed',
      note: 'the vendor has structured guidance with the prior value; the current plan returns 403 — adding it is the Owner’s call',
      live: false,
    },
    {
      name: 'Earnings calls',
      n: 'not on the plan',
      note: 'no vendor on this data plan sells transcripts at any tier — tone (Q&A only) is retired with it',
      live: false,
    },
    {
      name: 'News',
      n: 'off',
      note: 'not enabled — provenance is weaker, confidence would have to say so',
      live: false,
    },
    { name: 'Social', n: 'off', note: 'not a source: no author record to score, no falsifier', live: false },
  ]

  const enters = [
    {
      mark: '1',
      title: 'Scan · Catalyst window stage',
      text: 'Narrative tags are chips in the Catalyst stage of the Screener, marked narrative. They cut like any condition — but the column is theirs.',
      standing: 'owed',
      why: 'The Screener draws the Catalyst stage with no condition ids behind it yet; the narrative chips land there when it has them.',
    },
    {
      mark: '2',
      title: 'Never the composite',
      text: 'The composite score reads measured lenses only. A tag cannot raise a score; it can put a name in front of you.',
      standing: 'holds',
      why: 'composite_score is built from the measured lenses; nothing on this page is an input to it.',
    },
    {
      mark: '3',
      title: 'Read · a second column on Symbol',
      text: 'On the Symbol page the narrative reading sits beside the measured verdict, never blended — where the two disagree is the question the page should ask.',
      standing: 'owed',
      why: 'The Symbol page has no narrative column yet; this page is where the readings live today.',
    },
    {
      mark: '4',
      title: 'Nominate · not alone',
      text: 'A candidate needs at least one measured condition. Narrative-only nominations are refused by the station, not by policy — the rule is structural.',
      standing: 'holds',
      why: 'Narrative feeds no nomination path today, so nothing can be nominated on it alone.',
    },
  ]

  const record = [
    { k: 'event · SEC item', v: 'not scored', why: 'Deterministic: the filing states the item — there is nothing to be right or wrong about, so it never enters the 20-day record.' },
    { k: 'event · vendor', v: 'not scored', why: 'A vendor label, not a judgment — outside the record for the same reason.' },
    { k: 'risk · model', v: 'n 0', why: 'No model readings exist yet; the extractor is owed.' },
    { k: 'supply · model', v: 'n 0', why: 'No model readings exist yet; the extractor is owed.' },
  ]

  return (
    <PageShell className="space-y-3">
      <PageHeader
        title="Narrative"
        description="What the text says, structured — its own column, never mixed into a measured score."
        actions={
          <span className="flex flex-wrap items-center gap-2">
            <span
              className="inline-flex h-5 items-center rounded-[3px] bg-primary/10 px-1.5 font-mono text-dense-micro font-bold text-primary"
              title="Every tag here is operator copilot. It can trigger attention; it cannot nominate on its own."
            >
              operator · copilot
            </span>
            <AsofTag asof={src?.filings_8k.last_filed ?? null} judgedBy="Research" href="/research/signal-health" />
          </span>
        }
      />

      {/* ── Sources ── */}
      <section className={panel}>
        <header className={panelHead}>
          <span className={cap}>Sources</span>
          <span className="text-dense-body font-semibold">what is read, and what is not</span>
          <span className="ml-auto text-dense-meta text-muted-foreground">
            filings are in · calls not on the plan · guidance not subscribed · news and social not enabled
          </span>
        </header>
        <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,200px),1fr))]">
          {sources.map((s) => (
            <div
              key={s.name}
              className={cn('flex min-w-0 flex-col gap-1 border-r border-border/40 px-3 py-2.5', !s.live && 'opacity-60')}
            >
              <div className="flex items-center gap-1.5">
                <span aria-hidden className={cn('h-[7px] w-[7px] shrink-0 rounded-full', s.live ? 'bg-success' : 'bg-muted-foreground/40')} />
                <span className="text-dense-meta font-semibold">{s.name}</span>
                <span className="ml-auto font-mono text-dense-micro tabular-nums text-muted-foreground">{s.n}</span>
              </div>
              <div className="text-dense-caption leading-relaxed text-muted-foreground">{s.note}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Tags ── */}
      <section className={panel}>
        <header className={panelHead}>
          <span className={cap}>Tags · {days}d</span>
          <span className="text-dense-body font-semibold">
            {fmtN(shown.length)} structured readings across {fmtN(names)} names
          </span>
          <SegmentControl size="xs" ariaLabel="Tag kind" value={kind} onChange={(v) => setKind(v as Kind)} options={KIND_OPTIONS} />
          <SegmentControl size="xs" ariaLabel="Window" value={days} onChange={setDays} options={WINDOW_OPTIONS} />
          <span className="ml-auto text-dense-meta text-muted-foreground">
            model readings carry the model&rsquo;s confidence · SEC-item and vendor tags carry none — their basis is shown instead
          </span>
        </header>
        {/* The design's composition has six rows here and the two panels below
            in view; the store has hundreds a week. The table scrolls in its own
            frame so the page keeps its order: readings, then where they enter,
            then whether they are worth anything. */}
        <div className="max-h-[560px] overflow-auto">
          <table className="w-full min-w-[980px] border-collapse">
            <thead>
              <tr>
                <th className={th}>Symbol</th>
                <th className={th}>Tag</th>
                <th className={th}>Reading</th>
                <th className={cn(th, 'text-right')} title="Model readings show the model's own confidence. Deterministic tags (SEC item number, vendor classification) have no confidence — the basis is shown instead.">
                  Basis
                </th>
                <th className={th}>Quoted span</th>
                <th className={th}>Source · as of</th>
                <th className={th}>Measured says</th>
                <th className={th} />
              </tr>
            </thead>
            <tbody>
              {shown.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-6 text-center text-dense-meta text-muted-foreground">
                    {emptyText}
                  </td>
                </tr>
              ) : (
                shown.map((t) => (
                  <tr key={`${t.accession}|${t.symbol}|${t.basis}|${t.item ?? t.reading}`}>
                    <td className={cn(td, 'font-mono font-bold')}>
                      <Link to={withSymbolParam(SYMBOL_PATH, t.symbol)} className="text-[var(--sk-ticker)] hover:underline">
                        {t.symbol}
                      </Link>
                    </td>
                    <td className={td}>
                      <span className="inline-flex h-4 items-center rounded-[3px] bg-warning/10 px-1.5 font-mono text-dense-micro font-bold text-warning">
                        {t.kind}
                      </span>
                    </td>
                    <td className={cn(td, 'min-w-[160px] font-semibold text-foreground')} title={t.category ? `vendor category: ${t.category}` : undefined}>
                      {t.reading}
                    </td>
                    <td className={cn(td, 'whitespace-nowrap text-right font-mono tabular-nums text-muted-foreground')}>
                      —
                      <span className="block text-dense-micro">{t.basis === 'sec' ? `SEC item ${t.item}` : 'vendor'}</span>
                    </td>
                    <td className={cn(td, 'min-w-[280px]')}>
                      <div className="border-l-2 border-border pl-2 text-dense-caption italic leading-relaxed text-muted-foreground">
                        {t.quote || '—'}
                      </div>
                    </td>
                    <td className={cn(td, 'whitespace-nowrap font-mono text-dense-micro text-muted-foreground')}>
                      {t.filing_url ? (
                        <a href={t.filing_url} target="_blank" rel="noreferrer" className="text-primary hover:underline" title="Open the filing on SEC EDGAR">
                          {t.form}
                        </a>
                      ) : (
                        t.form
                      )}
                      <span className="block">filed {fmtIsoDateToken(t.filing_date)}</span>
                    </td>
                    <td
                      className={cn(td, 'min-w-[150px] text-dense-caption text-muted-foreground')}
                      title={
                        t.measured?.trade_date
                          ? `Scan of ${t.measured.trade_date}. A deterministic tag has no direction, so there is no agree or disagree to draw — the reading sits beside the measured one, never blended.`
                          : undefined
                      }
                    >
                      {measuredText(t)}
                    </td>
                    <td className={cn(td, 'whitespace-nowrap')}>
                      <span
                        className="cursor-default text-dense-caption text-muted-foreground/60"
                        title="The six verbs (explain · challenge · fork · extend · distill · settle) are deferred until their semantics are settled (Owner option B) — owed, not a gap."
                      >
                        verbs
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className="border-t border-border px-3 py-2 text-dense-caption leading-relaxed text-muted-foreground">
          A tag that contradicts the measured column is the useful row — it is a question, not an answer. Model confidence below
          0.6 is amber; the model saying so is worth more than it guessing well. SEC-item and vendor tags are not judgments: no
          confidence, and they do not enter the 20-day record. Item 9.01 (exhibits), filed beside nearly every 8-K, is not a
          reading.{data?.truncated ? ' The window holds more filings than the page reads — the newest are shown.' : ''}
        </div>
      </section>

      <div className="grid grid-cols-1 items-start gap-3 @3xl/page:grid-cols-2">
        {/* ── Where it enters ── */}
        <section className={panel}>
          <header className={panelHead}>
            <span className={cap}>Where it enters</span>
            <span className="text-dense-body font-semibold">one funnel step, its own column</span>
          </header>
          <div className="flex flex-col gap-2 px-3 py-2.5">
            {enters.map((e) => (
              <div key={e.mark} className="grid grid-cols-[24px_minmax(0,1fr)] items-start gap-2">
                <span className={cn('font-mono text-dense-meta font-bold', e.mark === '4' ? 'text-warning' : 'text-foreground')}>{e.mark}</span>
                <div>
                  <div className="flex flex-wrap items-baseline gap-2 text-dense-meta font-semibold">
                    {e.title}
                    <span
                      className={cn('font-mono text-dense-micro font-normal', e.standing === 'owed' ? 'text-warning' : 'text-muted-foreground')}
                      title={e.why}
                    >
                      {e.standing === 'owed' ? 'owed here' : 'holds'}
                    </span>
                  </div>
                  <div className="text-dense-caption leading-relaxed text-muted-foreground">{e.text}</div>
                </div>
              </div>
            ))}
            <div className="flex flex-wrap gap-3 border-t border-border/40 pt-2 text-dense-micro">
              <Link to="/research/screener" className="text-primary hover:underline">
                Screener · Catalyst window →
              </Link>
              <span
                className="cursor-default text-muted-foreground"
                title="Narrative is not a decay-tracked lens yet — Signal Decay has nothing to show for it, so this is not a link."
              >
                Signal Decay · narrative lens (not tracked)
              </span>
            </div>
          </div>
        </section>

        {/* ── Record ── */}
        <section className={panel}>
          <header className={panelHead}>
            <span className={cap}>Record</span>
            <span className="text-dense-body font-semibold">is the narrative lens worth anything yet</span>
            <span className="ml-auto text-dense-meta text-muted-foreground">20d · scored like every other lens</span>
          </header>
          <div className="flex flex-col gap-1.5 px-3 py-2.5">
            {record.map((r) => (
              <div key={r.k} className="grid grid-cols-[minmax(0,1fr)_60px_72px] items-center gap-2 text-dense-meta" title={r.why}>
                <span className="text-[var(--sk-soft)]">{r.k}</span>
                <span className="h-[5px] overflow-hidden rounded-[3px] bg-secondary" />
                <span className="text-right font-mono tabular-nums text-muted-foreground">{r.v}</span>
              </div>
            ))}
            <div className="mt-1 text-dense-caption leading-relaxed text-muted-foreground">
              No tag kind has a record yet: the deterministic ones never enter it, and the model kinds have no readings. Until a
              model kind clears the floor on a real sample, narrative can trigger attention and nothing else — it does not enter
              the composite and cannot nominate alone.
            </div>
          </div>
        </section>
      </div>
    </PageShell>
  )
}
