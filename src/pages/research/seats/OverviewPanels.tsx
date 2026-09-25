/**
 * Research Overview — the panels (Research Overview.dc.html, Rev 2026-09-18.2).
 *
 * Presentational only: the page computes every cell, including the grey ones.
 * A grey cell keeps the designed shape and says in its tooltip why it cannot
 * read yet — the verdict store (W2), the screen lineage (W3) and the dial
 * store (W4) are not built, and inventing their numbers is what this page
 * exists not to do.
 */
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { StatusLamp } from '@/components/StatusLamp'
import { cn } from '@/lib/utils'
import { OPERATOR_CHIP, type ResearchOperator } from '@/lib/research/operatorOf'
import type { DialLevelDef, EarnRow, BookRow } from './overviewModel'

// ── Dial ─────────────────────────────────────────────────────────────────

export interface DialCell extends DialLevelDef {
  state: string
  tone: 'current' | 'quiet' | 'warn'
  tip: string
}

/**
 * The confirm strip a level click opens (design: MOVE THE DIAL → Lx ·
 * Set Lx · cancel · Esc). The design’s Set writes a dial store; none
 * exists on this side — the level is read off the Trust grant the Owner
 * sets on the platform matrix — so Set stays disabled and says exactly
 * where the mechanism lives instead of pretending to be it.
 */
function dialConfirm(
  target: DialCell,
  current: string,
  earn: EarnRow | null,
): { title: string; text: string; why: string } {
  const order = ['L0', 'L1', 'L2', 'L3']
  const down = order.indexOf(target.level) < order.indexOf(current)
  if (target.level === 'L3')
    return {
      title: `Cannot move → L3`,
      text: `L3 stays locked until L2-era patches are themselves settled and verified. The dial is earned, not set — and orders never pass at any level (D10).`,
      why: 'L3 is locked.',
    }
  if (target.level === 'L2') {
    const cleared =
      earn != null && earn.settled >= earn.need && earn.hit != null && earn.hit >= earn.floor
    if (!cleared)
      return {
        title: `Cannot move → L2`,
        text: `${earn ? `${earn.title} stands at ${earn.settled} / ${earn.need} settled${earn.hit != null ? ` · ${Math.round(earn.hit * 100)}%` : ''}` : 'Nothing settled under L1 yet'}. The dial is earned, not set — keep running under ${current} and this row lights when the sample is there.`,
        why: 'The record has not cleared the gate.',
      }
    return {
      title: `Move the dial → L2`,
      text: `The record clears the gate${earn ? ` (${earn.settled} settled · ${earn.hit != null ? Math.round(earn.hit * 100) : '—'}%)` : ''}. From now ${target.passes} passes without you. Orders never do (D10) — but no mechanism grants L2 yet: the dial store lands with W4.`,
      why: 'No dial store exists to write — the L2 grant arrives with W4.',
    }
  }
  return {
    title: `Move the dial → ${target.level}`,
    text: `${down ? 'Down is immediate. ' : ''}From now ${target.passes} pass${down ? 'es' : ''} without you; ${target.waits} wait${down ? 's' : ''}. Nothing already merged is undone. The level is read off the Trust grant the Owner sets on the platform matrix — there is no dial store to write here, so the move happens on the grant.`,
    why: 'No dial store — the level follows the Trust grant, set on the platform matrix.',
  }
}

export function DialStrip({
  cells,
  earn,
  current,
}: {
  cells: DialCell[]
  earn: EarnRow | null
  current: string
}) {
  const [confirm, setConfirm] = useState<DialCell | null>(null)
  useEffect(() => {
    if (!confirm) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setConfirm(null)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [confirm])
  const c = confirm ? dialConfirm(confirm, current, earn) : null
  return (
    <section className="overflow-hidden border mat-card">
      <header className="flex flex-wrap items-baseline gap-x-3 gap-y-1 border-b border-border bg-secondary/40 px-3 py-2">
        <span className="text-dense-micro font-bold uppercase tracking-[0.12em] text-muted-foreground">Dial</span>
        <span className="text-dense-body font-semibold">How much passes without you</span>
        <span className="text-dense-meta text-muted-foreground">
          one setting for all three operators, by what is being written · earned by record, never set
        </span>
        <span className="ml-auto font-mono text-dense-micro text-muted-foreground">
          D10 does not move with the dial
        </span>
      </header>
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4">
        {cells.map((d) => (
          <button
            key={d.level}
            type="button"
            title={d.tone === 'current' ? d.tip : `${d.tip} Click for the move.`}
            onClick={() => {
              if (d.tone !== 'current') setConfirm(d)
            }}
            className={cn(
              'flex flex-col gap-1 border-t-2 px-3 py-2.5 text-left sm:border-r sm:border-r-border/60',
              d.tone === 'current'
                ? 'cursor-default border-t-primary bg-primary/5'
                : 'border-t-transparent hover:bg-secondary/40',
            )}
          >
            <div className="flex w-full items-baseline gap-2">
              <span className={cn('font-mono text-sm font-bold', d.tone === 'current' ? 'text-primary' : d.level === 'L3' ? 'text-muted-foreground' : 'text-foreground')}>
                {d.level}
              </span>
              <span className={cn('text-dense-label font-semibold', d.tone === 'current' ? 'text-primary' : undefined)}>
                {d.name}
              </span>
              <span
                className={cn(
                  'ml-auto font-mono text-dense-micro',
                  d.tone === 'current' ? 'text-primary' : d.tone === 'warn' ? 'text-warning' : 'text-muted-foreground',
                )}
              >
                {d.state}
              </span>
            </div>
            <div className="text-dense-meta leading-relaxed text-foreground/80">
              <span className="text-muted-foreground">passes · </span>
              {d.passes}
            </div>
            <div className="text-dense-meta leading-relaxed text-muted-foreground">
              <span>waits · </span>
              {d.waits}
            </div>
          </button>
        ))}
      </div>
      {confirm && c ? (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 border-t border-warning/40 bg-warning/5 px-3 py-2">
          <span className="text-dense-micro font-bold uppercase tracking-[0.12em] text-warning">
            {c.title}
          </span>
          <span className="min-w-0 flex-1 basis-64 text-dense-meta leading-relaxed text-foreground/85 text-pretty">
            {c.text}
          </span>
          <span className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              disabled
              title={c.why}
              className="cursor-not-allowed rounded border border-warning/50 px-2.5 py-1 text-dense-label font-semibold text-warning opacity-55"
            >
              Set {confirm.level}
            </button>
            <Link
              to="/research/loop/harness"
              className="whitespace-nowrap text-dense-meta text-primary hover:underline"
              title="The Trust grant the level reads — the console’s leash panel shows it."
            >
              Console → Trust
            </Link>
            <button
              type="button"
              onClick={() => setConfirm(null)}
              className="whitespace-nowrap text-dense-meta text-muted-foreground hover:text-foreground"
            >
              cancel · Esc
            </button>
          </span>
        </div>
      ) : null}
      <div className="flex flex-wrap items-center gap-x-3.5 gap-y-1 border-t border-border/60 bg-secondary/20 px-3 py-2">
        <span className="text-dense-micro font-bold uppercase tracking-[0.12em] text-muted-foreground">to L2</span>
        {earn ? (
          <>
            <span className="text-dense-meta">
              L2 needs a settled hit rate ≥ {Math.round(earn.floor * 100)}% on ≥ {earn.need} outcomes under L1, per
              objective.
            </span>
            <span className="h-1.5 min-w-[120px] flex-1 basis-40 overflow-hidden rounded-full bg-secondary">
              <span className="block h-full bg-primary" style={{ width: `${earn.pct}%` }} />
            </span>
            <span className="font-mono text-dense-meta text-muted-foreground">
              {earn.title} · {earn.settled} / {earn.need} settled
              {earn.hit != null ? ` · ${Math.round(earn.hit * 100)}%` : ''}
            </span>
          </>
        ) : (
          <span className="text-dense-meta text-muted-foreground">
            Nothing settled under L1 yet — the gate starts counting when outcomes do.
          </span>
        )}
      </div>
    </section>
  )
}

// ── Operator cards ───────────────────────────────────────────────────────

export interface OpCell {
  k: string
  v: string
  sub?: string
  tone?: 'default' | 'good' | 'warn' | 'muted'
  tip?: string
}

export interface OpCardData {
  op: ResearchOperator
  label: string
  role: string
  home: { label: string; to: string }
  cells: OpCell[]
  note: string
}

const CELL_TONE: Record<NonNullable<OpCell['tone']>, string> = {
  default: 'text-foreground',
  good: 'text-profit',
  warn: 'text-warning',
  muted: 'text-muted-foreground',
}

export function OperatorCards({ cards }: { cards: OpCardData[] }) {
  return (
    <div className="grid grid-cols-1 gap-2.5 lg:grid-cols-3">
      {cards.map((c) => (
        <section key={c.op} className="flex min-w-0 flex-col gap-2 border px-3.5 py-3 mat-card">
          <div className="flex flex-wrap items-baseline gap-2">
            <span className={cn('border px-1.5 font-mono text-dense-meta font-bold mat-tag', OPERATOR_CHIP[c.op])}>
              {c.op}
            </span>
            <span className="text-dense-body font-semibold">{c.label}</span>
            <span className="text-dense-meta text-muted-foreground">{c.role}</span>
            <Link to={c.home.to} className="ml-auto text-dense-meta text-primary hover:underline">
              {c.home.label}
            </Link>
          </div>
          <div className="grid grid-cols-3 gap-2.5">
            {c.cells.map((k) => (
              <div key={k.k} className="min-w-0" title={k.tip}>
                <div className="text-dense-micro uppercase tracking-wide text-muted-foreground">{k.k}</div>
                <div className={cn('font-mono text-sm font-semibold tabular-nums', CELL_TONE[k.tone ?? 'default'])}>
                  {k.v}
                </div>
                {k.sub ? <div className="text-dense-micro text-muted-foreground">{k.sub}</div> : null}
              </div>
            ))}
          </div>
          <p className="text-dense-meta leading-relaxed text-muted-foreground">{c.note}</p>
        </section>
      ))}
    </div>
  )
}

// ── Pipeline · today ─────────────────────────────────────────────────────

export interface StationRow {
  name: string
  produces: string
  h: string
  l: string
  c: string
  hTip?: string
  lTip?: string
  cTip?: string
}

function StationCell({ v, tip }: { v: string; tip?: string }) {
  return (
    <td
      className={cn(
        'px-3 py-1.5 text-right font-mono text-dense-label tabular-nums',
        v === '—' ? 'text-muted-foreground' : 'text-foreground',
      )}
      title={tip}
    >
      {v}
    </td>
  )
}

export function StationsTable({ rows, footnote }: { rows: StationRow[]; footnote: string }) {
  return (
    <section className="overflow-hidden border mat-card">
      <header className="flex flex-wrap items-baseline gap-x-3 gap-y-1 border-b border-border bg-secondary/40 px-3 py-2">
        <span className="text-dense-micro font-bold uppercase tracking-[0.12em] text-muted-foreground">
          Pipeline · today
        </span>
        <span className="text-dense-body font-semibold">Six stations, shared</span>
        <span className="ml-auto text-dense-meta text-muted-foreground">artifacts per station, by operator</span>
      </header>
      <table className="w-full border-collapse">
        <thead>
          <tr className="border-b border-border text-dense-micro uppercase tracking-wide text-muted-foreground">
            <th className="px-3 py-1.5 text-left font-semibold">Station</th>
            <th className="px-3 py-1.5 text-left font-semibold">Produces</th>
            <th className="px-3 py-1.5 text-right font-semibold">hand</th>
            <th className="px-3 py-1.5 text-right font-semibold">loop</th>
            <th className="px-3 py-1.5 text-right font-semibold">copilot</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((st) => (
            <tr key={st.name} className="border-b border-border/50 last:border-b-0">
              <td className="whitespace-nowrap px-3 py-1.5 text-dense-label font-semibold">{st.name}</td>
              <td className="px-3 py-1.5 font-mono text-dense-meta text-muted-foreground">{st.produces}</td>
              <StationCell v={st.h} tip={st.hTip} />
              <StationCell v={st.l} tip={st.lTip} />
              <StationCell v={st.c} tip={st.cTip} />
            </tr>
          ))}
        </tbody>
      </table>
      <div className="px-3 py-2 text-dense-meta leading-relaxed text-muted-foreground">{footnote}</div>
    </section>
  )
}

// ── The Book ─────────────────────────────────────────────────────────────

export interface BookPanelRow extends BookRow {
  label: string
  to: string
}

export function BookPanel({ rows }: { rows: BookPanelRow[] }) {
  return (
    <section className="overflow-hidden border mat-card">
      <header className="flex flex-wrap items-baseline gap-x-3 gap-y-1 border-b border-border bg-secondary/40 px-3 py-2">
        <span className="text-dense-micro font-bold uppercase tracking-[0.12em] text-muted-foreground">The Book</span>
        <span className="text-dense-body font-semibold">State — whoever wrote it</span>
        <span className="ml-auto text-dense-meta text-muted-foreground">seat-free · the object layer belongs to all three</span>
      </header>
      {rows.map((b) => {
        const w = (n: number) => (b.share.total ? `${((n / b.share.total) * 100).toFixed(1)}%` : '0%')
        return (
          <div
            key={b.label}
            className="grid grid-cols-[110px_minmax(0,1fr)_auto] items-center gap-3 border-b border-border/50 px-3 py-2 last:border-b-0"
          >
            <Link to={b.to} className="text-dense-label font-semibold hover:underline">
              {b.label}
            </Link>
            <div
              className="flex h-2 overflow-hidden rounded-full bg-secondary"
              title={`${b.share.hand} by hand · ${b.share.loop} by the loop · ${b.share.copilot} by the Copilot`}
            >
              <span className="bg-foreground" style={{ width: w(b.share.hand) }} />
              <span className="bg-muted-foreground" style={{ width: w(b.share.loop) }} />
              <span className="bg-primary" style={{ width: w(b.share.copilot) }} />
            </div>
            <span className="whitespace-nowrap font-mono text-dense-meta text-muted-foreground">{b.meta}</span>
          </div>
        )
      })}
      <div className="flex flex-wrap gap-3.5 px-3 py-1.5 text-dense-micro text-muted-foreground">
        <span className="flex items-center gap-1">
          <span className="size-2 rounded-sm bg-foreground" /> born by hand
        </span>
        <span className="flex items-center gap-1">
          <span className="size-2 rounded-sm bg-muted-foreground" /> by the loop
        </span>
        <span className="flex items-center gap-1">
          <span className="size-2 rounded-sm bg-primary" /> by the Copilot
        </span>
      </div>
    </section>
  )
}

// ── Today ────────────────────────────────────────────────────────────────

export interface TodayItem {
  op: ResearchOperator
  title: string
  /** The row id / run id trimmed out of the title — hover keeps it. */
  titleTip?: string
  when: string
  sub: string
  /** The design's leading dot: amber = waiting on you, purple = fresh copilot output, grey = quiet. */
  tone?: 'wait' | 'new' | 'quiet'
  actions: { label: string; to: string }[]
}

const TODAY_DOT: Record<'wait' | 'new' | 'quiet', string> = {
  wait: 'bg-warning',
  new: 'bg-primary',
  quiet: 'bg-muted-foreground/40',
}

const TODAY_OP_INK: Record<ResearchOperator, string> = {
  hand: 'text-muted-foreground',
  loop: 'text-muted-foreground',
  copilot: 'text-primary',
}

export function TodayFeed({ items, asOf }: { items: TodayItem[]; asOf: string }) {
  return (
    <section className="overflow-hidden border mat-card">
      <header className="flex flex-wrap items-baseline gap-x-3 gap-y-1 border-b border-border bg-secondary/40 px-3 py-2">
        <span className="text-dense-micro font-bold uppercase tracking-[0.12em] text-muted-foreground">Today</span>
        <span className="text-dense-body font-semibold">What each operator produced</span>
        <span className="ml-auto text-dense-meta text-muted-foreground">{asOf}</span>
      </header>
      {items.length === 0 ? (
        <p className="px-3 py-3 text-dense-meta text-muted-foreground">
          Nothing recorded today yet — the loop's next run and the morning brief land here.
        </p>
      ) : (
        items.map((t, i) => (
          <div key={i} className="flex gap-2.5 border-b border-border/50 px-3 py-2 last:border-b-0">
            <span
              className={cn('mt-[7px] h-2 w-2 shrink-0 rounded-full', TODAY_DOT[t.tone ?? 'quiet'])}
              title={t.tone === 'wait' ? 'Waiting on you.' : t.tone === 'new' ? 'Fresh output.' : undefined}
            />
            <span className={cn('mt-0.5 shrink-0 font-mono text-dense-micro font-bold', TODAY_OP_INK[t.op])}>
              {t.op}
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline gap-2">
                <span className="min-w-0 text-dense-label font-semibold" title={t.titleTip}>{t.title}</span>
                <span className="ml-auto shrink-0 font-mono text-dense-micro text-muted-foreground">{t.when}</span>
              </div>
              <div className="mt-0.5 text-dense-meta leading-relaxed text-muted-foreground">{t.sub}</div>
              {t.actions.length ? (
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {t.actions.map((a) => (
                    <Link
                      key={a.label}
                      to={a.to}
                      className="border px-1.5 py-0.5 text-dense-meta text-foreground/80 hover:text-foreground mat-btn"
                    >
                      {a.label}
                    </Link>
                  ))}
                </div>
              ) : null}
            </div>
          </div>
        ))
      )}
    </section>
  )
}

// ── Health ───────────────────────────────────────────────────────────────

export interface HealthCell {
  k: string
  v: string
  lamp: 'green' | 'yellow' | 'gray'
  tip?: string
}

export function HealthPanel({ cells }: { cells: HealthCell[] }) {
  return (
    <section className="overflow-hidden border mat-card">
      <header className="flex flex-wrap items-baseline gap-x-3 gap-y-1 border-b border-border bg-secondary/40 px-3 py-2">
        <span className="text-dense-micro font-bold uppercase tracking-[0.12em] text-muted-foreground">Health</span>
        <span className="text-dense-body font-semibold">Engines behind the pages</span>
        <Link to="/research/signal-health" className="ml-auto text-dense-meta text-primary hover:underline">
          Signal Health →
        </Link>
      </header>
      {cells.length === 0 ? (
        <p className="px-3 py-3 text-dense-meta text-muted-foreground">
          Orchestration status not read — the schedules land here when it answers.
        </p>
      ) : (
        <div className="grid grid-cols-2 xl:grid-cols-4">
          {cells.map((h) => (
            <div key={h.k} className="flex items-start gap-2 border-r border-border/50 px-3 py-2 last:border-r-0" title={h.tip}>
              <span className="pt-1">
                <StatusLamp lamp={h.lamp} variant="dot" title={h.tip} />
              </span>
              <span className="min-w-0">
                <span className="block truncate text-dense-label font-semibold">{h.k}</span>
                <span className="block font-mono text-dense-micro text-muted-foreground">{h.v}</span>
              </span>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}
