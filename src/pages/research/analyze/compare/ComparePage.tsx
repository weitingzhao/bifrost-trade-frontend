/**
 * Compare — `/research/compare`. One view, the structures your rules allow.
 *
 * See `compareModel.ts` for where every number comes from and which of the
 * prototype's are owed. This file is the page in the prototype's order:
 * header and view, Structures, then How big · Can you get filled · Payoff at
 * expiry · The trade-off, in words.
 */
import { useMemo, useState } from 'react'
import { cn } from '@/lib/utils'
import { Link, useSearchParams } from 'react-router-dom'
import { PageHeader, PageShell, SectionPanel } from '@/components/layout'
import { EmptyState, SegmentControl } from '@/components/data-display'
import { SymbolContextGuard } from '@/components/research/SymbolContextGuard'
import { QueryErrorAlert } from '@/components/ui/QueryErrorAlert'
import { Skeleton } from '@/components/ui/skeleton'
import { useResearchContext } from '@/hooks/useResearchContext'
import { todayIso } from '@/lib/researchFreshness'
import { withSymbolParam } from '@/lib/symbolLink'
import { SYMBOL_PATH } from '@/lib/symbolTabs'
import { fmtPct0 } from '@/utils/positions'
import { fmtMvAbbrev } from '@/utils/positionsCharts'
import { STANCES, WING_PCT, payoffAt, viewFromParams, type View } from './compareModel'
import { CompareHowBig } from './CompareHowBig'
import { ComparePayoff, type PayoffCurve } from './ComparePayoff'
import { CompareTable } from './CompareTable'
import { useCompareRows, useSessionClose, type CompareRow } from './useCompareRows'

const FIELD =
  'h-6 w-[4.5rem] rounded-md border border-border bg-background px-1.5 text-right font-mono text-dense-meta tabular-nums text-foreground'

const FILLS_EMPTY =
  'Bid/ask is not in the Options Starter snapshot — the spread, the limit and the fill odds need quotes. Upgrading is the Owner’s call.'

/** A level typed by nobody: ±10% of spot, rounded to a half dollar, and marked as such. */
function suggested(spot: number, f: number): number {
  return Math.round(spot * f * 2) / 2
}

export default function ComparePage() {
  const { symbol } = useResearchContext()
  const sym = (symbol ?? '').trim().toUpperCase()
  const [params, setParams] = useSearchParams()
  const typed = viewFromParams(params)

  const set = (key: string, value: string | null) => {
    const next = new URLSearchParams(params)
    if (value == null || value === '') next.delete(key)
    else next.set(key, value)
    setParams(next, { replace: true })
  }

  return (
    <PageShell padding="compact" className="space-y-3">
      <PageHeader
        breadcrumb={<p className="text-xs font-medium text-primary/90">Research · Analyze</p>}
        title={
          <span className="inline-flex items-baseline gap-3">
            Compare
            {sym ? (
              <Link to={withSymbolParam(SYMBOL_PATH, sym)} className="font-mono text-dense-body font-bold text-entity-symbol hover:underline">
                {sym}
              </Link>
            ) : null}
          </span>
        }
        description="One view, the structures your rules allow — sized by the smallest cap that could be computed. Everything lands as a Plan (D10)."
      />
      <SymbolContextGuard symbol={sym} description="Compare expresses one view on one name. Pick a symbol, then come back here.">
        <CompareBody sym={sym} typed={typed} set={set} />
      </SymbolContextGuard>
    </PageShell>
  )
}

function CompareBody({
  sym,
  typed,
  set,
}: {
  sym: string
  typed: View
  set: (key: string, value: string | null) => void
}) {
  const today = todayIso()
  // The rows are read with the suggested levels until the reader types their
  // own; the note beside the view says which levels are whose.
  const { spot } = useSessionClose(sym, today)
  const floorSuggested = typed.floor == null && spot != null
  const ceilSuggested = typed.ceiling == null && spot != null
  const view: View = useMemo(
    () => ({
      ...typed,
      floor: typed.floor ?? (spot == null ? null : suggested(spot, 0.9)),
      ceiling: typed.ceiling ?? (spot == null ? null : suggested(spot, 1.1)),
    }),
    [typed, spot],
  )
  const data = useCompareRows(sym, view, today)

  const [overrides, setOverrides] = useState<Record<number, number>>({})
  const [off, setOff] = useState<Set<number>>(new Set())
  const sizeOf = (r: CompareRow) => overrides[r.id] ?? r.caps?.size ?? null
  const on = useMemo(
    () => new Set(data.rows.filter((r) => r.placement?.ok && !off.has(r.id)).map((r) => r.id)),
    [data.rows, off],
  )
  const toggle = (id: number) =>
    setOff((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })

  const planHref = `/trade/plans?new=1&symbol=${encodeURIComponent(sym)}`
  const error = data.errors.structures ?? data.errors.expirations ?? data.errors.closes ?? data.errors.chain

  const placed = data.rows.filter((r) => r.placement?.ok)
  const strikes = placed.flatMap((r) => (r.placement?.ok ? r.placement.legs.map((l) => l.strike).filter((k): k is number => k != null) : []))
  const lo = data.spot == null ? 0 : Math.min(data.spot, ...strikes) * 0.85
  const hi = data.spot == null ? 0 : Math.max(data.spot, ...strikes) * 1.15
  const curves: PayoffCurve[] = placed
    .filter((r) => on.has(r.id) && (sizeOf(r) ?? 0) > 0)
    .map((r) => ({
      key: String(r.id),
      stroke: r.series.stroke,
      at: (price: number) => {
        const v = r.placement?.ok && data.spot != null ? payoffAt(r.placement, data.spot, price) : null
        return v == null ? null : v * (sizeOf(r) ?? 0)
      },
    }))

  const j = data.judgment
  const committed = placed.reduce((a, r) => a + (r.econ?.backing ?? 0) * (sizeOf(r) ?? 0), 0)

  return (
    <div className="space-y-3">
      {/* ── the view ─────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <span className="inline-flex flex-wrap items-center gap-2 rounded-md border border-border bg-secondary px-2.5 py-1 text-dense-meta text-muted-foreground">
          view
          <SegmentControl
            size="xs"
            ariaLabel="Stance"
            value={typed.stance}
            onChange={(v) => set('stance', v === 'sell-vol' ? null : v)}
            options={STANCES.map((s) => ({ value: s.value, label: s.label }))}
          />
          <label className="inline-flex items-center gap-1">
            floor ≈
            <input
              className={FIELD}
              inputMode="decimal"
              aria-label="Floor"
              placeholder={view.floor == null ? '' : String(view.floor)}
              defaultValue={typed.floor ?? ''}
              onBlur={(e) => set('floor', e.currentTarget.value.trim() || null)}
            />
          </label>
          <label className="inline-flex items-center gap-1">
            ceiling ≈
            <input
              className={FIELD}
              inputMode="decimal"
              aria-label="Ceiling"
              placeholder={view.ceiling == null ? '' : String(view.ceiling)}
              defaultValue={typed.ceiling ?? ''}
              onBlur={(e) => set('ceil', e.currentTarget.value.trim() || null)}
            />
          </label>
          <label className="inline-flex items-center gap-1">
            <input
              className={FIELD}
              inputMode="numeric"
              aria-label="Horizon in days"
              defaultValue={typed.horizon}
              onBlur={(e) => set('h', e.currentTarget.value.trim() === '20' ? null : e.currentTarget.value.trim() || null)}
            />
            d
          </label>
          <span
            className="text-dense-caption text-muted-foreground/80"
            title="The prototype reads the view from Symbol's verdict. Verdicts here are prose claims with no stance, level or horizon, so the view is typed on this page."
          >
            typed here · Symbol verdict owed
          </span>
        </span>
        {floorSuggested || ceilSuggested ? (
          <span className="text-dense-caption text-warning" role="note">
            {floorSuggested && ceilSuggested ? 'Floor and ceiling are' : floorSuggested ? 'The floor is' : 'The ceiling is'} ±10% of spot until
            you type your own — not a view anyone holds.
          </span>
        ) : null}
        <span className="ml-auto text-dense-caption text-muted-foreground">
          {data.spot == null ? 'spot —' : `spot ${data.spot.toFixed(2)} · close ${data.spotDate}`} · chain as of{' '}
          {data.chainAsOf ? data.chainAsOf.slice(0, 10) : '—'} · EV net of fills · owed (quotes)
        </span>
      </div>

      {error ? <QueryErrorAlert error={error} /> : null}

      {/* ── Structures ───────────────────────────────────────────────── */}
      <SectionPanel
        cap="Structures"
        title="at the size the rules allow"
        note={`${data.rows.length} of ${data.ruleCount} active rules read a ${STANCES.find((s) => s.value === typed.stance)?.label} view · click a row for its payoff · ± to override size`}
      >
        {data.loading && data.rows.length === 0 ? (
          <div className="space-y-2 p-3">
            <Skeleton className="h-8 rounded" />
            <Skeleton className="h-8 rounded" />
          </div>
        ) : data.rows.length === 0 ? (
          <EmptyState
            title="No rule reads this view"
            description="Trade › Rules holds no active structure whose dimensions match this stance. The structures come from your rulebook, not from this page."
            action={
              <Link to="/trade/rules" className="text-dense-meta text-primary hover:underline">
                Trade › Rules →
              </Link>
            }
          />
        ) : (
          <CompareTable
            rows={data.rows}
            sizeOf={sizeOf}
            on={on}
            onToggle={toggle}
            onStep={(id, delta) =>
              setOverrides((prev) => {
                // Stepped from the previous override, not from the rendered
                // size — ten fast clicks are ten steps.
                const base = prev[id] ?? data.rows.find((r) => r.id === id)?.caps?.size ?? 0
                return { ...prev, [id]: Math.max(0, base + delta) }
              })
            }
            planHref={planHref}
          />
        )}
        <p className="border-t border-border/60 px-3 py-1.5 text-dense-caption leading-relaxed text-muted-foreground">
          Legs are placed on the listed chain: a short put at the highest strike at or below the floor, a short call at the lowest at
          or above the ceiling, a spread’s long wing about {Math.round(WING_PCT * 100)}% beyond its short, a covered call by its own
          rule. Premiums are the session’s last trade, not a quote.
        </p>
      </SectionPanel>

      <div className="grid items-start gap-3 [grid-template-columns:repeat(auto-fit,minmax(min(100%,420px),1fr))]">
        {/* ── How big ────────────────────────────────────────────────── */}
        <SectionPanel
          cap="How big"
          title="three caps, the smallest computed one wins"
          note={
            j == null
              ? data.roomLoading
                ? 'reading the book…'
                : 'room to the gate unread'
              : `backing ${j.usedPct == null ? '—' : fmtPct0(j.usedPct)} → gate ${fmtPct0(j.gatePct)} · ${fmtMvAbbrev(j.spendable)} of room`
          }
        >
          <CompareHowBig rows={data.rows} sizeOf={sizeOf} spendable={j?.spendable ?? null} recordsLoaded={data.recordsLoaded} />
        </SectionPanel>

        {/* ── Can you get filled (owed) ──────────────────────────────── */}
        <SectionPanel cap="Can you get filled" title="spread · depth · where to sit" note="NBBO not on the plan">
          {/* The design's table, kept in its shape: the columns the store cannot
              answer print a dash rather than vanish — mark, not drop. */}
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  {['Structure', 'Bid/Ask', 'Spread', 'of credit', 'OI', 'Vol', 'Limit', 'Fill'].map((h, i) => (
                    <th
                      key={h}
                      className={cn(
                        'whitespace-nowrap border-b border-border px-2 py-1 text-dense-caption font-semibold text-secondary-foreground',
                        i === 0 ? 'text-left' : 'text-right'
                      )}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {placed.map((r) => {
                  const thinOi = r.thinnest?.oi != null && r.thinnest.oi < 500
                  return (
                    <tr key={r.id}>
                      <td className={cn('border-b border-border/55 px-2 py-1.25 text-left text-dense-meta font-semibold', r.series.text)}>
                        {r.name}
                      </td>
                      {['—', '—', '—'].map((v, i) => (
                        <td
                          key={i}
                          className="border-b border-border/55 px-2 py-1.25 text-right font-mono text-xs tabular-nums text-muted-foreground"
                          title="Needs a quote — the snapshots carry the session's last trade, never bid/ask."
                        >
                          {v}
                        </td>
                      ))}
                      <td
                        className={cn(
                          'border-b border-border/55 px-2 py-1.25 text-right font-mono text-xs tabular-nums',
                          thinOi ? 'text-warning' : 'text-secondary-foreground'
                        )}
                        title="The thinnest option leg's open interest — a liquidity proxy, not a spread."
                      >
                        {r.thinnest?.oi == null ? '—' : r.thinnest.oi.toLocaleString('en-US')}
                      </td>
                      <td className="border-b border-border/55 px-2 py-1.25 text-right font-mono text-xs tabular-nums text-muted-foreground">
                        {r.thinnest?.volume == null ? '—' : r.thinnest.volume.toLocaleString('en-US')}
                      </td>
                      <td className="border-b border-border/55 px-2 py-1.25 text-right font-mono text-xs tabular-nums text-muted-foreground" title="Where to sit needs the combo book — not on the plan.">
                        —
                      </td>
                      <td className="border-b border-border/55 px-2 py-1.25 text-right font-mono text-xs tabular-nums text-muted-foreground" title="Fill likelihood needs an order-fill record — not on the plan.">
                        —
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          <p className="border-t border-border/60 px-3 py-1.5 text-dense-caption leading-relaxed text-muted-foreground">
            {FILLS_EMPTY}
          </p>
        </SectionPanel>

        {/* ── Payoff at expiry ───────────────────────────────────────── */}
        <SectionPanel
          cap="Payoff at expiry"
          title={`${curves.length} on · at chosen size`}
          note="dashed = spot · the 20-day band is owed"
        >
          <div className="px-3 py-3">
            {data.spot == null ? (
              <Skeleton className="h-48 rounded" />
            ) : (
              <ComparePayoff curves={curves} spot={data.spot} lo={lo} hi={hi} />
            )}
          </div>
        </SectionPanel>

        {/* ── The trade-off, in words ─────────────────────────────────── */}
        <SectionPanel cap="The trade-off, in words" title="what each structure buys you">
          <div className="space-y-2 px-3 py-2.5 text-dense-meta leading-relaxed text-muted-foreground">
            {data.rows.map((r) => {
              const n = sizeOf(r) ?? 0
              if (!r.placement?.ok) {
                return (
                  <p key={r.id}>
                    <span className="font-semibold text-foreground">{r.name}</span> — not placed: {r.placement ? r.placement.reason : 'reading the chain'}.
                  </p>
                )
              }
              const e = r.econ
              if (n === 0) {
                return (
                  <p key={r.id}>
                    <span className="font-semibold text-foreground">{r.name}</span> — sized to none: the{' '}
                    {r.caps?.binding ?? 'size'} cap allows nothing
                    {r.caps?.allowance ? ` (${r.caps.allowance.why})` : ''}. Shown so the rejection is visible, not silent.
                  </p>
                )
              }
              return (
                <p key={r.id}>
                  <span className="font-semibold text-foreground">
                    {r.name} × {n}
                  </span>{' '}
                  — {e?.net == null ? 'no mark on every leg' : `${e.net >= 0 ? 'credit' : 'debit'} ${fmtMvAbbrev(Math.abs(e.net * n))}`}, takes{' '}
                  {e?.backing == null ? '—' : fmtMvAbbrev(e.backing * n)} of backing, θ{' '}
                  {e?.theta == null ? '—' : `${e.theta * n >= 0 ? '+' : '−'}$${Math.abs(Math.round(e.theta * n))}`}/day.{' '}
                  {r.caps?.binding ? `The ${r.caps.binding} cap binds` : 'No cap could be read'}
                  {r.caps?.allowance ? `; conviction is ${r.caps.allowance.label} on this structure's record` : ''}.
                </p>
              )
            })}
            {j != null && j.pool > 0 && placed.length > 0 ? (
              <p className="border-t border-border/60 pt-2 text-dense-caption">
                Backing after entry, if you took each one on its own:{' '}
                {placed
                  .map((r) => `${r.name} alone ${fmtPct0((j.used + (r.econ?.backing ?? 0) * (sizeOf(r) ?? 0)) / j.pool)}`)
                  .join(' · ')}
                . Taking all of them would commit {fmtMvAbbrev(committed)} of the {fmtMvAbbrev(j.spendable)} available under the gate.
              </p>
            ) : null}
          </div>
        </SectionPanel>
      </div>
    </div>
  )
}
