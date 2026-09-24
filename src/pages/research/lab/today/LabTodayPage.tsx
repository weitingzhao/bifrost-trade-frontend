/**
 * Today's candidates — the Method face of Ratings · Stocks (design
 * `Research Stock Ratings Method.dc.html`, route rev 2026-09-22.6).
 *
 * The night batch produced a queue; this page shows it with the evidence
 * behind each name, in the batch's own state: live, empty (a result, not a
 * blank), or failed (holding yesterday's queue, and saying so). Analysis only
 * — crossing to Trade is what places an order (D10).
 *
 * The design's per-candidate Forecast, same-setup backtest and Copilot draft
 * have no stores behind them yet; their tiles keep the design's own `—` with
 * the reason in the source line, the same way its HALO row prints an
 * unmeasured option face.
 */
import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { fetchSepaCandidates, fetchSepaDaily } from '@/api/researchEngine'
import { fetchOrchestrationStatus } from '@/api/research/orchestration'
import { fetchCandidateOutcomeSummary } from '@/api/research/candidateOutcome'
import { fetchUniverseReach } from '@/api/research/universeReach'
import { DenseTag, EmptyState } from '@/components/data-display'
import { PageFaceSwitch, PageHeader, PageShell } from '@/components/layout'
import { AskCopilotButton } from '@/components/research/AskCopilotButton'
import { useExhibit } from '@/hooks/useLensRegistry'
import { cn } from '@/lib/utils'
import { withSymbolParam } from '@/lib/symbolLink'
import { SYMBOL_PATH } from '@/lib/symbolTabs'
import {
  batchState,
  candidateCard,
  funnelTiles,
  type CandidateCard,
  type CandidateTile,
} from './labTodayModel'

const cap =
  'whitespace-nowrap text-dense-caption font-semibold uppercase tracking-[0.1em] text-muted-foreground'
const panel =
  'min-w-0 rounded-[10px] border border-[var(--sk-line0)] bg-[var(--sk-raised)] shadow-[inset_0_1px_0_color-mix(in_srgb,var(--sk-ink)_4%,transparent)]'
const mono = 'font-mono tabular-nums'

function Tile({ t }: { t: CandidateTile }) {
  return (
    <div className="min-w-0 rounded-lg border border-[var(--sk-line0)] bg-background px-2.75 py-2">
      <div className={cap}>{t.label}</div>
      <div
        className={cn(
          mono,
          'mt-0.5 type-section font-semibold',
          t.measured ? 'text-foreground' : 'text-muted-foreground'
        )}
      >
        {t.value}
      </div>
      <div className={cn(mono, 'text-dense-micro text-muted-foreground')}>{t.src}</div>
    </div>
  )
}

export default function LabTodayPage() {
  const [sel, setSel] = useState(0)

  const candQ = useQuery({
    queryKey: ['research', 'sepa', 'model-candidates'],
    queryFn: () => fetchSepaCandidates(),
    staleTime: 5 * 60_000,
  })
  const orchQ = useQuery({
    queryKey: ['research', 'orchestration', 'status'],
    queryFn: fetchOrchestrationStatus,
    staleTime: 60_000,
  })
  const dailyQ = useQuery({
    queryKey: ['research', 'sepa', 'model-daily', 'funnel'],
    queryFn: () => fetchSepaDaily({ limit: 1000 }),
    staleTime: 5 * 60_000,
  })
  const outcomeQ = useQuery({
    queryKey: ['research', 'candidate-outcome', 'summary'],
    queryFn: () => fetchCandidateOutcomeSummary(),
    staleTime: 5 * 60_000,
  })
  const reachQ = useQuery({
    queryKey: ['research', 'universe-reach'],
    queryFn: fetchUniverseReach,
    staleTime: 10 * 60_000,
  })

  const rows = useMemo(() => candQ.data?.candidates ?? [], [candQ.data])
  const cards = useMemo(() => rows.map((r, i) => candidateCard(r, i + 1)), [rows])
  const state = batchState(orchQ.data, candQ.isSuccess || candQ.isError, rows.length)
  const hero: CandidateCard | null = cards[Math.min(sel, cards.length - 1)] ?? null

  // The one per-name fetch: the hero's dealer reading, from the same exhibit
  // the Symbol page's Dealer face renders — one store, two readers.
  const gexQ = useExhibit('gex_regime', hero?.symbol ?? '')
  const gexTile: CandidateTile = useMemo(() => {
    const r = gexQ.data?.readings as Record<string, unknown> | undefined
    const zero = r?.zero_gamma != null ? Number(r.zero_gamma) : null
    const spot = r?.spot != null ? Number(r.spot) : null
    if (zero == null || !Number.isFinite(zero)) {
      return {
        label: 'GEX flip',
        value: '—',
        src: 'gex_regime exhibit · not measured for this name',
        measured: false,
      }
    }
    const dist =
      spot != null && spot > 0
        ? ` · spot ${spot.toFixed(1)} · ${(((zero - spot) / spot) * 100).toFixed(1)}%`
        : ''
    return {
      label: 'GEX flip',
      value: zero.toFixed(1),
      src: `gex_regime exhibit${dist}`,
      measured: true,
    }
  }, [gexQ.data])

  const sched = orchQ.data?.schedules.find((s) => s.job_name === 'research_trading_day')
  const lastRun = sched?.last_run_ended_at
    ? sched.last_run_ended_at.slice(0, 16).replace('T', ' ') + ' UTC'
    : null
  const nextTick = sched?.next_tick_at
    ? sched.next_tick_at.slice(0, 16).replace('T', ' ') + ' UTC'
    : null
  const session = candQ.data?.trade_date ?? null

  const funnel = funnelTiles(
    reachQ.data,
    dailyQ.data ? dailyQ.data.rows.length : null,
    Boolean(dailyQ.data && dailyQ.data.rows.length >= 1000),
    candQ.data ? rows.length : null,
    outcomeQ.data
  )

  return (
    <PageShell padding="compact" className="space-y-3">
      <div className="flex flex-wrap items-start gap-3">
        <div className="min-w-0 max-w-[84ch] flex-[1_1_28rem]">
          <PageHeader
            breadcrumb={<p className="text-xs font-medium text-primary/90">Research / Discover</p>}
            title="Today's candidates"
            titleSize="large"
            description="The night batch produced this queue, each candidate carrying the evidence behind it. Analysis only — crossing to Trade is what places an order."
          />
        </div>
        <div className="pt-1.5">
          <PageFaceSwitch path="/research/lab/today" />
        </div>
        {hero ? (
          <div className="pt-1">
            <AskCopilotButton
              originPage="lab-today"
              originLabel="Today's candidates"
              symbol={hero.symbol}
              snapshot={{ queue: cards.length, hero: hero.symbol, state }}
            />
          </div>
        ) : null}
      </div>

      {/* The batch strip: what session this page is, judged by the orchestrator. */}
      <div className="flex flex-wrap items-center gap-x-3.5 gap-y-1.5 rounded-md border border-border bg-[var(--sk-raised)] px-3 py-1.75">
        <span
          className={cn(
            'inline-flex items-center gap-1.5 rounded-[5px] border px-2 py-0.5 font-mono text-dense-caption tracking-[0.05em]',
            'border-[color-mix(in_srgb,var(--sk-accent)_40%,transparent)] bg-[rgb(var(--sk-accent-rgb)/0.08)] text-[var(--sk-accent)]'
          )}
          title="Method face — how the number is made. Analysis only; no order can be placed from here (D10)."
        >
          ◆ METHOD · NO ORDERS
        </span>
        <span
          className={cn(
            mono,
            'text-dense-meta',
            state === 'failed' ? 'text-warning' : 'text-secondary-foreground'
          )}
          title="The queue's session — the trade date the candidates were judged for, from the store itself."
        >
          ASOF {session ?? '—'}
          {state === 'failed' ? ' · held' : ''}
        </span>
        <span className={cn(mono, 'text-dense-meta text-muted-foreground')}>
          {lastRun ? `batch ${lastRun}` : 'batch —'} · {rows.length} in queue · SEPA + signal
          ensemble
        </span>
        <span
          className={cn(mono, 'ml-auto text-dense-meta text-muted-foreground')}
          title={orchQ.data?.detail ?? undefined}
        >
          {state === 'failed'
            ? 'needs Ops'
            : nextTick
              ? `next ${nextTick}`
              : (orchQ.data?.verdict ?? '—')}
        </span>
      </div>

      {state === 'failed' ? (
        <div className={cn(panel, 'border-warning/60')}>
          <div className="flex flex-wrap items-start gap-3.5 px-3.5 py-3">
            <div className="flex min-w-0 flex-[1_1_20rem] flex-col gap-1">
              <div className={cn(mono, 'text-dense-caption tracking-[0.1em] text-warning')}>
                BATCH {sched?.last_run_status ?? 'UNHEALTHY'} · research_trading_day
              </div>
              <div className="text-dense-body font-semibold text-foreground">
                Today is holding the {session ?? 'last'} queue.
              </div>
              <p className="m-0 max-w-[64ch] text-dense-label leading-normal text-muted-foreground text-pretty">
                {orchQ.data?.detail ??
                  'The orchestrator reports the nightly job unhealthy; every number below is the last session it produced, not re-judged.'}
              </p>
            </div>
            <Link
              to="/system/status"
              className="shrink-0 rounded-[5px] border border-warning/60 bg-warning/15 px-3 py-2 text-dense-label text-warning no-underline hover:brightness-110"
            >
              Open System Status · needs you
            </Link>
          </div>
        </div>
      ) : null}

      {state === 'empty' ? (
        <div className={panel}>
          <div className="flex flex-col gap-3.5 px-3.5 py-4">
            <EmptyState
              title="No candidate cleared the gate tonight"
              description="The scan ran to completion and the universe was judged. Zero names passed the active policy — a result, not a blank."
            />
            <div className="grid grid-cols-[repeat(auto-fit,minmax(9.375rem,1fr))] gap-2">
              {funnel.map((f) => (
                <div
                  key={f.label}
                  className="rounded-lg border border-[var(--sk-line0)] bg-background px-2.75 py-2"
                >
                  <div className={cap}>{f.label}</div>
                  <div
                    className={cn(
                      mono,
                      'mt-0.5 type-section font-semibold',
                      f.warn ? 'text-warning' : 'text-foreground'
                    )}
                  >
                    {f.value}
                  </div>
                  <div className={cn(mono, 'text-dense-micro text-muted-foreground')}>{f.src}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : null}

      {state === 'loading' ? (
        <p className="p-3 text-dense-meta text-muted-foreground">Reading the queue…</p>
      ) : null}

      {hero && state !== 'empty' && state !== 'loading' ? (
        <>
          <div className={panel}>
            <header className="flex flex-wrap items-center gap-2.5 rounded-t-[9px] border-b border-[var(--sk-line0)] bg-[var(--sk-raised2)] px-3.5 py-2">
              <span className={cn(mono, 'text-dense-meta text-muted-foreground')}>
                #{hero.rank}
              </span>
              <Link
                to={withSymbolParam(SYMBOL_PATH, hero.symbol)}
                className={cn(
                  mono,
                  'text-lg font-bold text-entity-symbol no-underline hover:underline'
                )}
                title="Open in Symbol — the reading face"
              >
                {hero.symbol}
              </Link>
              <span className={cn(mono, 'text-dense-meta text-muted-foreground')}>
                MOM {hero.momScore}
              </span>
              <span className="ml-auto inline-flex items-baseline gap-1.5">
                <span className={cn(mono, 'text-xl font-semibold text-foreground')}>
                  {hero.score}
                </span>
                <span className={cap}>score</span>
              </span>
            </header>
            <div className="flex flex-col gap-3 px-3.5 py-3">
              <div className="flex flex-wrap gap-1.5">
                {hero.chips.map((c) => (
                  <DenseTag key={c.label} variant={c.variant} size="cell">
                    {c.label}
                  </DenseTag>
                ))}
              </div>
              <div className="grid grid-cols-[repeat(auto-fit,minmax(8.25rem,1fr))] gap-2">
                {hero.tiles.map((t) => (
                  <Tile key={t.label} t={t.label === 'GEX flip' ? gexTile : t} />
                ))}
              </div>
              {/* The design's Copilot draft panel; the store behind it is owed. */}
              <div className="rounded-lg border-l-[3px] border border-[var(--sk-line0)] border-l-primary bg-background px-3 py-2">
                <div className={cn(mono, 'text-dense-micro tracking-[0.1em] text-primary')}>
                  COPILOT DRAFT
                </div>
                <p className="m-0 mt-1 max-w-[70ch] text-dense-label leading-relaxed text-muted-foreground text-pretty">
                  No per-candidate draft store exists yet — the drafts the engine writes today are
                  hypothesis reviews, not candidate briefs. The panel keeps its seat rather than
                  borrowing one of those.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Link
                  to={withSymbolParam(SYMBOL_PATH, hero.symbol)}
                  className="rounded-[6px] border border-border px-3 py-1.5 text-dense-label text-foreground no-underline hover:bg-[var(--sk-surface)]"
                  title="The reading face — what the market says. Same subject, same stores."
                >
                  Open in Symbol →
                </Link>
                <Link
                  to="/research/ratings/stocks"
                  className="rounded-[6px] border border-border px-3 py-1.5 text-dense-label text-muted-foreground no-underline hover:bg-[var(--sk-surface)]"
                  title="The model this queue came out of — weights, tape and the ranked table."
                >
                  Ratings · Stocks →
                </Link>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            {cards
              .filter((c) => c.rank !== hero.rank)
              .map((c) => (
                <button
                  key={c.symbol}
                  type="button"
                  onClick={() => setSel(c.rank - 1)}
                  className="flex cursor-pointer flex-wrap items-center gap-3 rounded-[9px] border border-[var(--sk-line0)] bg-[var(--sk-raised)] px-3.5 py-2.25 text-left hover:border-border hover:bg-[color-mix(in_oklab,var(--primary)_5%,var(--sk-raised))]"
                >
                  <span className={cn(mono, 'min-w-5.5 text-dense-meta text-muted-foreground')}>
                    #{c.rank}
                  </span>
                  <span className={cn(mono, 'min-w-13 text-sm font-bold text-entity-symbol')}>
                    {c.symbol}
                  </span>
                  <span className={cn(mono, 'text-dense-caption text-muted-foreground')}>
                    {c.sepaLine}
                  </span>
                  <DenseTag variant="info" size="cell">
                    GRADE {c.grade}
                  </DenseTag>
                  <span
                    className={cn(
                      mono,
                      'ml-auto min-w-7 text-right text-sm font-semibold text-foreground'
                    )}
                  >
                    {c.score}
                  </span>
                </button>
              ))}
          </div>

          <p className={cn(mono, 'm-0 text-dense-caption text-muted-foreground text-pretty')}>
            {state === 'failed'
              ? `Every number on this page is as of ${session ?? 'the held session'}. The batch state lives in the strip above, judged by the orchestrator.`
              : 'Direction is teal/orange everywhere — Trade, Workbench, Ops alike. Red is reserved for a real fault, so a falling number is never red.'}
          </p>
        </>
      ) : null}
    </PageShell>
  )
}
