/**
 * Intraday playbook — scenario fan · LIVE bias (design `Research Symbol.dc.html`,
 * §isScenario, third panel).
 *
 * The fan is the newest forecast session's own probability split; LIVE is the
 * branch the intraday terrain is currently confirming, and the transitions
 * list is every regime change the tape printed today. The branch ranges are
 * the daily terrain's own levels — the gamma zone for rangy, past its edges
 * for the directional branches; squeeze is a volatility event, not a band.
 * Observe-only (D10): nothing here places orders.
 *
 * Below the fan, the playbook's own record (`/research/playbook/hit-rate`,
 * 30 days, 5-session forward return) per branch, and the triggers the newest
 * session fired. The record counts each session × branch once: the store
 * re-fires a branch when a date is recomputed a night later (PLTR 09-16 fired
 * bull, rangy, bull), and every re-fire carries the same forward return.
 */
import { useQuery } from '@tanstack/react-query'
import {
  fetchPlaybookHitRate,
  fetchPlaybookTriggers,
  fetchTerrain,
  fetchTerrainIntraday,
  type PlaybookHitRateSummary,
  type TerrainIntraday,
} from '@/api/researchEngine'
import { DenseTag, type DenseTagVariant } from '@/components/data-display'
import { fmtEtClock } from '@/lib/format'
import { cn } from '@/lib/utils'
import { useSymbolForecastSessions } from './useSymbolForecastSessions'

const cap =
  'whitespace-nowrap text-dense-caption font-semibold uppercase tracking-[0.1em] text-muted-foreground'
const mono = 'font-mono tabular-nums'
const panel =
  'min-w-0 border mat-card'
const panelHead =
  'flex flex-wrap items-center gap-2.5 border-b px-3 py-1.75 text-dense-body leading-normal'

// The design's own palette: Rangy green, Bull the ticker lime, Bear red,
// Squeeze amber — the leading branch is bolded, never recoloured.
const BRANCHES = [
  { key: 'rangy', label: 'Rangy', text: 'text-success', bar: 'bg-success' },
  { key: 'bull', label: 'Bull', text: 'text-[var(--sk-ticker)]', bar: 'bg-[var(--sk-ticker)]' },
  { key: 'bear', label: 'Bear', text: 'text-destructive', bar: 'bg-destructive' },
  { key: 'squeeze', label: 'Squeeze', text: 'text-warning', bar: 'bg-warning' },
] as const

function liveVariant(regime: string): DenseTagVariant {
  const lo = regime.toLowerCase()
  if (lo.includes('bull')) return 'success'
  if (lo.includes('bear')) return 'danger'
  if (lo.includes('squeeze') || lo.includes('transition')) return 'warning'
  return 'neutral'
}

function transitionsOf(rows: TerrainIntraday[]) {
  const out: { time: string; txt: string }[] = []
  for (let i = 1; i < rows.length; i++) {
    if (rows[i - 1].regime !== rows[i].regime) {
      out.push({
        time: rows[i].asof_ts.slice(11, 16),
        txt: `${rows[i - 1].regime} → ${rows[i].regime} · ${rows[i].spot.toFixed(2)}`,
      })
    }
  }
  return out
}

/** `dominant:bull` and `bull` are the same branch. */
const branchOf = (scenarioKey: string) => scenarioKey.split(':').pop() ?? scenarioKey

/**
 * The record per branch, one outcome per session × branch (see the header
 * note). `n` counts evaluated outcomes; a trigger inside its 5-session horizon
 * has no outcome yet and is left out.
 */
function playbookBranchRecord(rows: PlaybookHitRateSummary['rows']) {
  const seen = new Set<string>()
  const by = new Map<string, { n: number; hits: number }>()
  let fired = 0
  for (const r of [...rows].sort((a, b) => a.trigger_at.localeCompare(b.trigger_at))) {
    const key = `${r.trade_date}|${branchOf(r.scenario_key)}`
    if (seen.has(key)) continue
    seen.add(key)
    fired += 1
    if (r.hit == null) continue
    const cur = by.get(branchOf(r.scenario_key)) ?? { n: 0, hits: 0 }
    cur.n += 1
    if (r.hit) cur.hits += 1
    by.set(branchOf(r.scenario_key), cur)
  }
  return { by, fired, raw: rows.length }
}

export function SymbolPlaybookPanel({ symbol }: { symbol: string }) {
  const sym = symbol.trim().toUpperCase()
  const { days } = useSymbolForecastSessions(sym)
  const recordQ = useQuery({
    queryKey: ['research', 'playbook-hit-rate', sym, 30, 5],
    queryFn: () => fetchPlaybookHitRate(sym, 30, 5),
    enabled: Boolean(sym),
    staleTime: 10 * 60_000,
  })
  const newestDate = days[0]?.trade_date ?? null
  const triggersQ = useQuery({
    queryKey: ['research', 'playbook-triggers', sym, newestDate],
    queryFn: () => fetchPlaybookTriggers(sym, newestDate ?? undefined),
    enabled: Boolean(sym && newestDate),
    staleTime: 5 * 60_000,
  })
  const terQ = useQuery({
    queryKey: ['research', 'terrain-daily', sym],
    queryFn: () => fetchTerrain(sym),
    enabled: Boolean(sym),
    staleTime: 5 * 60_000,
  })
  const intraQ = useQuery({
    queryKey: ['research', 'terrain-intraday', sym],
    queryFn: () => fetchTerrainIntraday(sym),
    enabled: Boolean(sym),
    refetchInterval: 60_000,
  })

  const latest = days[0]?.session
  const record = playbookBranchRecord(recordQ.data?.rows ?? [])
  const triggers = [...(triggersQ.data?.rows ?? [])].sort((a, b) => a.trigger_at.localeCompare(b.trigger_at))
  const probs: Record<string, number | undefined> = {
    rangy: latest?.prob_rangy,
    bull: latest?.prob_bull,
    bear: latest?.prob_bear,
    squeeze: latest?.prob_squeeze,
  }
  const top = Object.entries(probs).sort((a, b) => (b[1] ?? 0) - (a[1] ?? 0))[0]?.[0]

  const gzLo = terQ.data?.terrain?.gamma_zone_low ?? null
  const gzHi = terQ.data?.terrain?.gamma_zone_high ?? null
  const rangeOf = (key: string) => {
    if (key === 'rangy') return gzLo != null && gzHi != null ? `${gzLo.toFixed(0)}–${gzHi.toFixed(0)}` : '—'
    if (key === 'bull') return gzHi != null ? `> ${gzHi.toFixed(0)}` : '—'
    if (key === 'bear') return gzLo != null ? `< ${gzLo.toFixed(0)}` : '—'
    return '—'
  }

  const intraRows = intraQ.data?.rows ?? []
  const live = intraRows[intraRows.length - 1] ?? null
  const trans = transitionsOf(intraRows)

  return (
    <section className={panel}>
      <header className={panelHead}>
        <span className={cap}>Intraday playbook</span>
        <span className="text-dense-body font-semibold">scenario fan · LIVE bias</span>
        <span className="ml-auto inline-flex items-center gap-1.5 text-dense-caption text-muted-foreground">
          pivot{' '}
          <b className={cn(mono, 'text-foreground')} title="No pivot level in the playbook store — unmeasured, not omitted.">
            —
          </b>
          {live ? (
            <DenseTag variant={liveVariant(live.regime)} size="cell">
              LIVE · {live.regime}
            </DenseTag>
          ) : (
            <DenseTag
              variant="neutral"
              size="cell"
              title="No intraday terrain rows for this session — market closed or the feed is idle."
            >
              LIVE · off
            </DenseTag>
          )}
        </span>
      </header>
      <div className="flex flex-col gap-1.5 px-3 py-2.5">
        {BRANCHES.map((b) => {
          const p = probs[b.key]
          const pct = p != null ? Math.round(p * 100) : null
          const lead = b.key === top && pct != null
          return (
            <div
              key={b.key}
              className="grid grid-cols-[64px_minmax(0,1fr)_40px_96px] items-center gap-2 text-dense-meta"
            >
              <span className={cn(b.text, lead ? 'font-semibold' : 'font-normal')}>{b.label}</span>
              <span className="relative block h-[5px] overflow-hidden rounded-[3px] bg-[var(--sk-line0)]">
                {pct != null ? (
                  <span className={cn('absolute inset-y-0 left-0', b.bar)} style={{ width: `${pct}%` }} />
                ) : null}
              </span>
              <span className={cn(mono, 'text-right')}>{pct != null ? `${pct}%` : '—'}</span>
              <span className={cn(mono, 'text-right text-dense-caption text-muted-foreground')}>
                {rangeOf(b.key)}
              </span>
            </div>
          )
        })}
      </div>
      <div className="border-t border-[var(--sk-line0)] px-3 pb-2 pt-1.5">
        <div className="flex items-baseline gap-2">
          <span className={cap}>playbook record · 30d</span>
          <span
            className="ml-auto text-dense-caption text-muted-foreground"
            title={`The store's rule on the 5-session forward return from the trigger session's close: bull > 0 · bear < 0 · rangy |r| < 2% · squeeze |r| < 1.5%. ${record.raw} triggers in the window; re-fires of the same session and branch count once (${record.fired} kept).`}
          >
            5-session forward · {record.fired} of {record.raw} triggers kept
          </span>
        </div>
        {recordQ.isLoading ? (
          <p className="m-0 py-1 text-dense-meta text-muted-foreground">Loading the record…</p>
        ) : record.by.size === 0 ? (
          <p className="m-0 py-1 text-dense-meta text-muted-foreground">
            No trigger on this name has reached its 5-session horizon in the last 30 days.
          </p>
        ) : (
          <div className="mt-1 grid grid-cols-[64px_minmax(0,1fr)_40px_64px] items-center gap-x-2 gap-y-1 text-dense-meta">
            {BRANCHES.filter((b) => record.by.has(b.key)).map((b) => {
              const r = record.by.get(b.key)!
              const rate = r.n > 0 ? r.hits / r.n : null
              return (
                <div key={b.key} className="contents">
                  <span className={b.text}>{b.label}</span>
                  <span className="relative block h-[5px] overflow-hidden rounded-[3px] bg-[var(--sk-line0)]">
                    {rate != null ? (
                      <span className={cn('absolute inset-y-0 left-0', b.bar)} style={{ width: `${rate * 100}%` }} />
                    ) : null}
                  </span>
                  <span className={cn(mono, 'text-right')}>{rate != null ? `${Math.round(rate * 100)}%` : '—'}</span>
                  <span
                    className={cn(mono, 'text-right text-dense-caption', r.n < 10 ? 'text-warning' : 'text-muted-foreground')}
                    title={r.n < 10 ? 'Under 10 outcomes — a thin sample, whatever the rate.' : undefined}
                  >
                    {r.hits}/{r.n}
                  </span>
                </div>
              )
            })}
          </div>
        )}
      </div>
      <div className="border-t border-[var(--sk-line0)]">
        <div className={cn(cap, 'px-3 pb-0.5 pt-1.5')}>
          triggers · {newestDate ? newestDate.slice(5) : '—'}
        </div>
        {triggers.length === 0 ? (
          <p className="m-0 px-3 py-1.5 text-dense-meta text-muted-foreground">
            {triggersQ.isLoading ? 'Loading triggers…' : 'The newest session fired no trigger.'}
          </p>
        ) : (
          triggers.map((t) => (
            <div
              key={t.trigger_at + t.scenario_key}
              className="grid grid-cols-[52px_minmax(0,1fr)_auto] gap-2.5 px-3 py-1 text-dense-meta"
            >
              <span className={cn(mono, 'text-muted-foreground')} title={`${t.trigger_at} (shown in ET)`}>
                {fmtEtClock(new Date(t.trigger_at)).slice(0, 5)}
              </span>
              <span className="text-[var(--sk-soft)]">{branchOf(t.scenario_key)}{t.scenario_key.startsWith('dominant:') ? ' · dominant' : ''}</span>
              <span className={cn('text-dense-caption', t.satisfied ? 'text-success' : 'text-muted-foreground')}>
                {t.satisfied ? 'conditions met' : 'conditions not met'}
              </span>
            </div>
          ))
        )}
      </div>
      <div className="border-t border-[var(--sk-line0)]">
        <div className={cn(cap, 'px-3 pb-0.5 pt-1.5')}>path transitions today</div>
        {trans.length === 0 ? (
          <p className="m-0 px-3 py-1.5 text-dense-meta text-muted-foreground">
            No path change today — the session has held one regime.
          </p>
        ) : (
          trans.map((t) => (
            <div
              key={t.time + t.txt}
              className="grid grid-cols-[52px_minmax(0,1fr)] gap-2.5 px-3 py-1 text-dense-meta"
            >
              <span className={cn(mono, 'text-muted-foreground')}>{t.time}</span>
              <span className="text-[var(--sk-soft)]">{t.txt}</span>
            </div>
          ))
        )}
      </div>
      <p className="m-0 border-t border-[var(--sk-line0)] px-3 py-2 text-dense-caption leading-relaxed text-muted-foreground text-pretty">
        Observe-only. The fan is the model&rsquo;s own probability split for the session; LIVE
        is which branch the tape is currently confirming. Nothing here places orders.
      </p>
    </section>
  )
}
