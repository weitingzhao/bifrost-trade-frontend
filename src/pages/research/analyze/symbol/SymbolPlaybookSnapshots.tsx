/**
 * The playbook's session snapshots — what the retired Intraday Playbook section
 * replayed: every intraday terrain snapshot of a session, any session, and the
 * branches, levels and invalidation at the one picked (S7, G2, 2026-09-26).
 *
 * Until research 0.138.0 every input came from the nightly tables, so all seven
 * snapshots of a session were the prior close restated (every name,
 * 2026-09-10…25). From then a name the plugin's intraday chain observes stands
 * on the session's own spot (put–call parity on the chain) and intraday gamma;
 * each row's `inputs_json.spot_source` says which, and a flat session says so
 * rather than offering seven identical rows as a replay.
 */
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { fetchTerrainIntraday, type TerrainIntraday } from '@/api/researchEngine'
import { fmtEtClock } from '@/lib/format'
import { cn } from '@/lib/utils'
import {
  BRANCHES,
  branchProbs,
  flatSession,
  invalidation,
  leadBranch,
  spotSourceOf,
  transitionsOf,
} from './playbookBranches'
import { SessionStepper } from './SessionStepper'
import { useMarketSessions } from './useMarketSessions'

const cap = 'whitespace-nowrap text-dense-meta font-semibold text-muted-foreground'
const mono = 'font-mono tabular-nums'
const th =
  'whitespace-nowrap border-b border-border px-2 py-1 text-right align-bottom text-dense-caption font-semibold text-secondary-foreground'
const td = 'whitespace-nowrap border-b border-border/55 px-2 py-1 text-right font-mono text-xs tabular-nums'

const etClock = (ts: string) => fmtEtClock(new Date(ts)).slice(0, 5)

export function SymbolPlaybookSnapshots({
  sym,
  newestRows,
}: {
  sym: string
  /** The newest session's rows, already read for the LIVE tag. */
  newestRows: readonly TerrainIntraday[]
}) {
  const [picked, setPicked] = useState<{ sym: string; date: string } | null>(null)
  const pick = picked?.sym === sym ? picked.date : null
  const [chosen, setChosen] = useState<{ key: string; ts: string } | null>(null)
  const sessions = useMarketSessions()
  const dayQ = useQuery({
    queryKey: ['research-engine', 'terrain-intraday', sym, pick],
    queryFn: () => fetchTerrainIntraday(sym, pick ?? undefined),
    enabled: Boolean(sym && pick),
    staleTime: 10 * 60_000,
  })
  const rows = [...(pick ? (dayQ.data?.rows ?? []) : newestRows)].sort((a, b) => a.asof_ts.localeCompare(b.asof_ts))
  const day = pick ?? rows[0]?.trade_date ?? ''
  const viewKey = `${sym}|${day}`
  const selected = rows.find((r) => chosen?.key === viewKey && r.asof_ts === chosen.ts) ?? rows[rows.length - 1] ?? null
  const flat = flatSession(rows)
  const trans = transitionsOf(rows)
  const live = rows.filter((r) => spotSourceOf(r) === 'parity').length

  return (
    <div className="border-t border-[var(--sk-line0)]">
      <div className="flex flex-wrap items-center gap-2 px-3 pb-1 pt-1.5">
        <span className={cap}>session snapshots</span>
        <SessionStepper
          day={day}
          sessions={sessions}
          picked={Boolean(pick)}
          onGo={(date) => setPicked(date ? { sym, date } : null)}
          label="Playbook session"
        />
        <span className="ml-auto text-dense-caption text-muted-foreground">
          {rows.length > 0
            ? `${rows.length} snapshot${rows.length === 1 ? '' : 's'}${live > 0 ? ` · ${live} on the session's own spot` : ''}`
            : ''}
        </span>
      </div>
      {pick && dayQ.isLoading ? (
        <p className="m-0 px-3 py-1.5 text-dense-meta text-muted-foreground">Loading the session&rsquo;s snapshots…</p>
      ) : rows.length === 0 ? (
        <p className="m-0 px-3 py-1.5 text-dense-meta text-muted-foreground text-pretty">
          No intraday terrain for {sym}{pick ? ` on ${pick}` : ''}.
        </p>
      ) : flat ? (
        <p className="m-0 px-3 py-1.5 text-dense-meta leading-normal text-muted-foreground text-pretty">
          All {rows.length} snapshots of {day} are the same — {rows[0].regime} at {rows[0].spot.toFixed(2)}, the
          prior close: the intraday terrain stood on the nightly tables all session, so there is nothing to
          replay. A name the plugin&rsquo;s intraday chain observes stands on its own session from research 0.138.0.
        </p>
      ) : (
        <div className="flex flex-col gap-2.5 px-3 pb-2">
          <div className="min-w-0 overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr>
                  <th className={cn(th, 'text-left')}>ET</th>
                  <th className={cn(th, 'text-left')}>Regime</th>
                  <th className={th}>Spot</th>
                  <th className={th}>Zone</th>
                  <th className={cn(th, 'text-left')}>Leads</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => {
                  const lead = leadBranch(r)
                  const b = BRANCHES.find((x) => x.key === lead)!
                  const on = r === selected
                  return (
                    <tr
                      key={r.asof_ts}
                      tabIndex={0}
                      aria-selected={on}
                      onClick={() => setChosen({ key: viewKey, ts: r.asof_ts })}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault()
                          setChosen({ key: viewKey, ts: r.asof_ts })
                        }
                      }}
                      className="cursor-pointer"
                    >
                      <td className={cn(td, 'text-left text-muted-foreground')}>{etClock(r.asof_ts)}</td>
                      <td className={cn(td, 'text-left font-sans')}>{r.regime}</td>
                      <td className={td} title={spotSourceOf(r) === 'parity' ? "The session's level, by put–call parity on the intraday chain" : 'The prior close'}>
                        {r.spot.toFixed(2)}
                        {spotSourceOf(r) === 'prior_close' ? <span className="ml-1 font-sans text-dense-micro text-muted-foreground">pc</span> : null}
                      </td>
                      <td className={td}>
                        {r.gamma_zone_low.toFixed(2)}–{r.gamma_zone_high.toFixed(2)}
                      </td>
                      <td className={cn(td, 'text-left font-sans', b.text)}>
                        {b.label} {Math.round(branchProbs(r)[lead] * 100)}%
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          {selected ? <SnapshotDetail row={selected} /> : null}
        </div>
      )}
      <div className={cn(cap, 'px-3 pb-0.5 pt-1.5')}>path transitions · {day ? day.slice(5) : '—'}</div>
      {flat ? (
        <p className="m-0 px-3 py-1.5 text-dense-meta text-muted-foreground">
          No path to change: every snapshot of the session stood on the prior close.
        </p>
      ) : trans.length === 0 ? (
        <p className="m-0 px-3 py-1.5 text-dense-meta text-muted-foreground">
          {rows.length > 0 ? 'No path change — the session held one regime.' : '—'}
        </p>
      ) : (
        trans.map((t) => (
          <div key={t.time + t.txt} className="grid grid-cols-[52px_minmax(0,1fr)] gap-2.5 px-3 py-1 text-dense-meta">
            <span className={cn(mono, 'text-muted-foreground')}>{t.time}</span>
            <span className="text-[var(--sk-soft)]">{t.txt}</span>
          </div>
        ))
      )}
    </div>
  )
}

function SnapshotDetail({ row }: { row: TerrainIntraday }) {
  const probs = branchProbs(row)
  const lead = leadBranch(row)
  const pivot = (row.gamma_zone_low + row.gamma_zone_high) / 2
  const source = spotSourceOf(row)
  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5 text-dense-meta">
        <span className={cap}>{etClock(row.asof_ts)} ET</span>
        <span>
          spot <b className={mono}>{row.spot.toFixed(2)}</b>
          <span className="ml-1 text-dense-micro text-muted-foreground">
            {source === 'parity' ? 'session · parity' : source === 'prior_close' ? 'prior close' : ''}
          </span>
        </span>
        <span>
          pivot <b className={mono}>{pivot.toFixed(2)}</b>
          <span className="ml-1 text-dense-micro text-muted-foreground">derived</span>
        </span>
        <span>
          exp. close <b className={mono}>{row.expected_close.toFixed(2)}</b>
        </span>
        <span>
          PIN <b className={mono}>{row.pin_score.toFixed(0)}</b>
        </span>
      </div>
      {BRANCHES.map((b) => {
        const pct = Math.round(probs[b.key] * 100)
        return (
          <div key={b.key} className="grid grid-cols-[64px_minmax(0,1fr)_40px] items-center gap-2 text-dense-meta">
            <span className={cn(b.text, b.key === lead ? 'font-semibold' : 'font-normal')}>{b.label}</span>
            <span className="relative block h-[5px] overflow-hidden rounded-[3px] bg-[color-mix(in_srgb,var(--sk-ink)_8%,transparent)]">
              <span className={cn('absolute inset-y-0 left-0', b.bar)} style={{ width: `${pct}%` }} />
            </span>
            <span className={cn(mono, 'text-right')}>{pct}%</span>
          </div>
        )
      })}
      <p className="m-0 text-dense-caption leading-normal text-muted-foreground text-pretty">
        <span className="font-semibold text-secondary-foreground">
          {BRANCHES.find((b) => b.key === lead)!.label} is overturned by
        </span>{' '}
        {invalidation(lead, row)} — levels from this snapshot only.
      </p>
    </div>
  )
}
