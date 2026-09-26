/**
 * Events — the Market face, fed (design `Home Events.dc.html`, §market/live).
 *
 * The design's restructure of the old three-tab board into one reading:
 * an Importance / Direction filter bar with a click-to-filter themes panel,
 * the forward calendar beside it, and the ingest's own rows under both.
 * Built against the store's real scales (importance 1–3, direction −1/0/+1,
 * the tagger's own thresholds) — the fixture prose in the prototype is its
 * illustration, not a promise.
 *
 * Nothing here places or arms anything (D10); the one write is the design's
 * own ⊞ — a candidate into the pool, source event_radar.
 */
import { useMemo } from 'react'
import { usePageViewState } from '@/lib/pageView'
import { Link } from 'react-router-dom'
import { SegmentControl, DenseTag } from '@/components/data-display'
import { AddToPoolButton } from '@/components/research/AddToPoolButton'
import { useHoldingSymbols } from '@/hooks/useHoldingSymbols'
import { fmtIsoDateToken } from '@/lib/format'
import { withSymbolParam } from '@/lib/symbolLink'
import { SYMBOL_PATH } from '@/lib/symbolTabs'
import { cn } from '@/lib/utils'
import type { EventRadarRow } from '@/api/researchEngine'

export interface EventThemeRow {
  theme: string
  count: number
  direction_avg: number
  sentiment_avg: number
  bull_count?: number
  bear_count?: number
  neutral_count?: number
}

const cap =
  'whitespace-nowrap text-dense-micro font-bold uppercase tracking-[0.14em] text-muted-foreground'
const th =
  'whitespace-nowrap border-b border-border px-2 py-1 text-left align-bottom text-dense-caption font-semibold text-secondary-foreground'
const td = 'border-b border-border/40 px-2 py-1.5 align-top text-dense-meta'
const mono = 'font-mono tabular-nums'

/** The tagger's own scale: 3 = high, 2 = med, 1 = low. */
function impOf(importance: number): 'high' | 'med' | 'low' {
  return importance >= 3 ? 'high' : importance === 2 ? 'med' : 'low'
}

const IMP_VARIANT = { high: 'warning', med: 'info', low: 'neutral' } as const

function dirOf(direction: number): 'bull' | 'bear' | 'neutral' {
  return direction > 0 ? 'bull' : direction < 0 ? 'bear' : 'neutral'
}

const DIR_VARIANT = { bull: 'success', bear: 'danger', neutral: 'neutral' } as const

function symbolsOf(affected: string | null | undefined): string[] {
  if (!affected) return []
  return [...new Set(affected.split(/[\s,]+/).map((s) => s.trim().toUpperCase()).filter(Boolean))]
}

function daysUntil(dateIso: string): number {
  return Math.round((Date.parse(dateIso) - Date.parse(new Date().toISOString().slice(0, 10))) / 86_400_000)
}

function SymbolLinks({ symbols, inBook }: { symbols: string[]; inBook: (s: string) => boolean }) {
  if (symbols.length === 0) return <span className="text-muted-foreground">—</span>
  return (
    <span className="inline-flex flex-wrap gap-x-1.5">
      {symbols.map((s) => (
        <Link
          key={s}
          to={withSymbolParam(SYMBOL_PATH, s)}
          className={cn(
            'font-mono font-semibold no-underline hover:underline',
            inBook(s) ? 'text-[var(--sk-ticker)]' : 'text-foreground',
          )}
          title={inBook(s) ? `${s} — held in the book` : s}
        >
          {s}
        </Link>
      ))}
    </span>
  )
}

export function EventsMarketFace({
  events,
  themes,
  batches,
  calendar,
}: {
  events: EventRadarRow[]
  themes: EventThemeRow[]
  batches: { batch_id: string; collected_at: string }[]
  /** Rows from /research/events/calendar (time_code=2, event_date ASC) — the
   *  recency-ordered events fetch loses dated rows once the SEC backfill
   *  floods it, so FORWARD reads the store that keeps them. */
  calendar: EventRadarRow[]
}) {
  // The face's view (Rev .79 `imp · dir · theme`); the face itself is the URL's.
  const [imp, setImp] = usePageViewState<'all' | 'high' | 'med' | 'low'>('imp', 'all')
  const [dir, setDir] = usePageViewState<'all' | 'bull' | 'neutral' | 'bear'>('dir', 'all')
  const [theme, setTheme] = usePageViewState<string | null>('theme', null)
  const holdings = useHoldingSymbols()
  const inBook = (s: string) => holdings.symbols.includes(s)

  const filtered = useMemo(
    () =>
      events.filter(
        (e) =>
          (imp === 'all' || impOf(e.importance) === imp) &&
          (dir === 'all' || dirOf(e.direction) === dir) &&
          (theme == null || e.theme === theme),
      ),
    [events, imp, dir, theme],
  )
  const touchBook = useMemo(
    () => events.filter((e) => symbolsOf(e.affected_symbols).some(inBook)).length,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [events, holdings.symbols],
  )
  const forward = useMemo(
    () =>
      calendar
        .filter((e) => e.event_date != null && daysUntil(e.event_date) >= 0 && daysUntil(e.event_date) <= 30)
        .sort((a, b) => (a.event_date ?? '').localeCompare(b.event_date ?? '')),
    [calendar],
  )
  const themeMax = Math.max(1, ...themes.map((t) => t.count))

  return (
    <div className="space-y-3">
      {/* ── Filter bar ── */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <span className="inline-flex items-center gap-2">
          <span className={cap}>Importance</span>
          <SegmentControl
            size="xs"
            ariaLabel="Importance filter"
            value={imp}
            onChange={(v) => setImp(v as typeof imp)}
            options={[
              { value: 'all', label: 'All' },
              { value: 'high', label: 'High' },
              { value: 'med', label: 'Medium' },
              { value: 'low', label: 'Low' },
            ]}
          />
        </span>
        <span className="inline-flex items-center gap-2">
          <span className={cap}>Direction</span>
          <SegmentControl
            size="xs"
            ariaLabel="Direction filter"
            value={dir}
            onChange={(v) => setDir(v as typeof dir)}
            options={[
              { value: 'all', label: 'All' },
              { value: 'bull', label: 'Bull' },
              { value: 'neutral', label: 'Neutral' },
              { value: 'bear', label: 'Bear' },
            ]}
          />
        </span>
        <span className={cn('ml-auto text-dense-meta text-muted-foreground', mono)}>
          {filtered.length} of {events.length} events · {touchBook} touch the book
        </span>
      </div>

      <div className="grid grid-cols-1 items-start gap-3 xl:grid-cols-2">
        {/* ── Themes ── */}
        <section className="overflow-hidden border mat-card">
          <header className="flex flex-wrap items-baseline gap-x-3 gap-y-1 border-b border-border bg-secondary/40 px-3 py-2">
            <span className={cap}>Themes</span>
            <span className="text-dense-body font-semibold">
              {themes.length} theme{themes.length === 1 ? '' : 's'} in the window
            </span>
            <span className="text-dense-meta text-muted-foreground">click a theme to filter</span>
          </header>
          {themes.length === 0 ? (
            <p className="px-3 py-3 text-dense-meta text-muted-foreground">
              The themes store answered with nothing in the window.
            </p>
          ) : (
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <th className={th}>Theme</th>
                  <th className={cn(th, 'text-right')}>Events</th>
                  <th className={cn(th, 'w-[34%]')}>Bull · neutral · bear</th>
                  <th className={cn(th, 'text-right')}>Dir avg</th>
                  <th className={cn(th, 'text-right')}>Sent avg</th>
                </tr>
              </thead>
              <tbody>
                {themes.map((t) => {
                  const bull = t.bull_count ?? 0
                  const bear = t.bear_count ?? 0
                  const neutral = t.neutral_count ?? Math.max(0, t.count - bull - bear)
                  const on = theme === t.theme
                  return (
                    <tr
                      key={t.theme}
                      onClick={() => setTheme(on ? null : t.theme)}
                      className={cn('cursor-pointer hover:bg-secondary/40', on && 'bg-[rgb(var(--sk-accent-rgb,163_230_53)/0.07)]')}
                      title={on ? 'Clear the theme filter' : `Filter the events to ${t.theme}`}
                    >
                      <td className={cn(td, on ? 'font-semibold text-foreground' : 'text-secondary-foreground')}>{t.theme}</td>
                      <td className={cn(td, mono, 'text-right')}>{t.count}</td>
                      <td className={td}>
                        <span
                          className="flex h-[7px] overflow-hidden rounded-[3px] bg-[var(--sk-line0,var(--border))]"
                          style={{ width: `${(t.count / themeMax) * 100}%`, minWidth: 24 }}
                        >
                          {bull > 0 ? <span className="h-full bg-success" style={{ flex: bull }} /> : null}
                          {neutral > 0 ? <span className="h-full bg-[var(--sk-mute2,#98a2b0)]" style={{ flex: neutral }} /> : null}
                          {bear > 0 ? <span className="h-full bg-destructive" style={{ flex: bear }} /> : null}
                        </span>
                      </td>
                      <td className={cn(td, mono, 'text-right', t.direction_avg > 0 ? 'text-success' : t.direction_avg < 0 ? 'text-destructive' : 'text-muted-foreground')}>
                        {t.direction_avg >= 0 ? '+' : ''}
                        {t.direction_avg.toFixed(2)}
                      </td>
                      <td className={cn(td, mono, 'text-right text-muted-foreground')}>
                        {t.sentiment_avg >= 0 ? '+' : ''}
                        {t.sentiment_avg.toFixed(2)}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
          <p className="m-0 border-t border-border/60 px-3 py-1.5 text-dense-caption text-muted-foreground">
            from events/themes · counts are the whole window, not the filters above
          </p>
        </section>

        {/* ── Forward ── */}
        <section className="overflow-hidden border mat-card">
          <header className="flex flex-wrap items-baseline gap-x-3 gap-y-1 border-b border-border bg-secondary/40 px-3 py-2">
            <span className={cap}>Forward</span>
            <span className="text-dense-body font-semibold">
              {forward.length} dated event{forward.length === 1 ? '' : 's'} ahead
            </span>
            <span className="text-dense-meta text-muted-foreground">next 30 days · from events/calendar</span>
          </header>
          {forward.length === 0 ? (
            <p className="px-3 py-3 text-dense-meta text-muted-foreground">
              No ingested row carries a forward date inside 30 days.
            </p>
          ) : (
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <th className={th}>Date</th>
                  <th className={cn(th, 'text-right')}>In</th>
                  <th className={th}>Event</th>
                  <th className={th}>Symbols</th>
                  <th className={th}>Imp</th>
                </tr>
              </thead>
              <tbody>
                {forward.map((e) => {
                  const inDays = daysUntil(e.event_date as string)
                  return (
                    <tr key={e.event_id}>
                      <td className={cn(td, mono, 'text-secondary-foreground')}>{fmtIsoDateToken(e.event_date as string)}</td>
                      <td className={cn(td, mono, 'text-right', inDays <= 7 ? 'text-warning' : 'text-muted-foreground')}>{inDays}d</td>
                      <td className={cn(td, 'text-secondary-foreground')}>{e.subject}</td>
                      <td className={td}>
                        <SymbolLinks symbols={symbolsOf(e.affected_symbols)} inBook={inBook} />
                      </td>
                      <td className={td}>
                        <DenseTag variant={IMP_VARIANT[impOf(e.importance)]} size="cell">
                          {impOf(e.importance)}
                        </DenseTag>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
          <p className="m-0 border-t border-border/60 px-3 py-1.5 text-dense-caption text-muted-foreground">
            lime symbol = held in the book · the book&rsquo;s own dates are on the{' '}
            <Link to="/research/events" className="text-primary hover:underline">
              Book face →
            </Link>
          </p>
        </section>
      </div>

      {/* ── Events ── */}
      <section className="overflow-hidden border mat-card">
        <header className="flex flex-wrap items-baseline gap-x-3 gap-y-1 border-b border-border bg-secondary/40 px-3 py-2">
          <span className={cap}>Events</span>
          <span className="text-dense-body font-semibold">what the ingest read</span>
          <span className="text-dense-meta text-muted-foreground">
            newest first · advisory only, nothing here places or arms anything (D10)
          </span>
          <span className={cn('ml-auto text-dense-caption text-muted-foreground', mono)}>
            {batches.length} batch{batches.length === 1 ? '' : 'es'}
            {batches[0] ? ` · last ${fmtIsoDateToken(batches[0].collected_at)}` : ''}
          </span>
        </header>
        {filtered.length === 0 ? (
          <p className="px-3 py-3 text-dense-meta text-muted-foreground">
            {events.length === 0
              ? 'The store answered with no events in the window.'
              : 'Nothing passes the filters above — they filter this table only.'}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse" style={{ minWidth: 880 }}>
              <thead>
                <tr>
                  <th className={th}>Collected</th>
                  <th className={th}>Source</th>
                  <th className={th}>Subject</th>
                  <th className={cn(th, 'w-[30%]')}>Event</th>
                  <th className={th}>Symbols</th>
                  <th className={th}>Direction</th>
                  <th className={cn(th, 'text-right')}>Certainty</th>
                  <th className={cn(th, 'text-right')}>Sentiment</th>
                  <th className={th}>Theme</th>
                  <th className={th}>Imp</th>
                  <th className={th} />
                </tr>
              </thead>
              <tbody>
                {filtered.map((e) => {
                  const syms = symbolsOf(e.affected_symbols)
                  const d = dirOf(e.direction)
                  return (
                    <tr key={e.event_id}>
                      <td className={cn(td, mono, 'whitespace-nowrap text-muted-foreground')}>
                        {e.collected_at.slice(5, 16).replace('T', ' ')}
                      </td>
                      <td className={cn(td, 'text-muted-foreground')}>{e.source}</td>
                      <td className={cn(td, 'text-secondary-foreground')}>{e.subject}</td>
                      <td className={cn(td, 'leading-snug text-foreground/85 text-pretty')}>{e.event_summary}</td>
                      <td className={td}>
                        <SymbolLinks symbols={syms} inBook={inBook} />
                      </td>
                      <td className={td}>
                        <DenseTag variant={DIR_VARIANT[d]} size="cell">
                          {d}
                        </DenseTag>
                      </td>
                      <td className={cn(td, mono, 'text-right text-secondary-foreground')}>{e.certainty}</td>
                      <td className={cn(td, mono, 'text-right', e.sentiment > 0 ? 'text-success' : e.sentiment < 0 ? 'text-destructive' : 'text-muted-foreground')}>
                        {e.sentiment >= 0 ? '+' : ''}
                        {e.sentiment.toFixed(2)}
                      </td>
                      <td className={td}>
                        <button
                          type="button"
                          onClick={() => setTheme(theme === e.theme ? null : e.theme)}
                          className="rounded border border-border px-1.5 py-0.5 text-dense-caption text-secondary-foreground hover:border-primary/40"
                          title={`Filter to ${e.theme}`}
                        >
                          {e.theme || '—'}
                        </button>
                      </td>
                      <td className={td}>
                        <DenseTag variant={IMP_VARIANT[impOf(e.importance)]} size="cell">
                          {impOf(e.importance)}
                        </DenseTag>
                      </td>
                      <td className={cn(td, 'whitespace-nowrap')}>
                        {syms[0] ? (
                          <AddToPoolButton
                            symbol={syms[0]}
                            source="event_radar"
                            tags={['event_radar']}
                            source_ref={{ event_id: e.event_id, theme: e.theme }}
                          />
                        ) : null}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
        <p className="m-0 border-t border-border/60 px-3 py-2 text-dense-caption leading-relaxed text-muted-foreground text-pretty">
          ingest: .txt / .md / .json dropped into 事件雷达工作流/input/ · the cron upserts
          research.event_radar · a symbol opens its own name · ⊞ → Candidate Pool (source
          event_radar)
        </p>
      </section>
    </div>
  )
}
