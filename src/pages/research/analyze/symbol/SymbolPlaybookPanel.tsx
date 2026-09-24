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
 */
import { useQuery } from '@tanstack/react-query'
import {
  fetchForecastSessions,
  fetchTerrain,
  fetchTerrainIntraday,
  type TerrainIntraday,
} from '@/api/researchEngine'
import { DenseTag, type DenseTagVariant } from '@/components/data-display'
import { cn } from '@/lib/utils'

const cap =
  'whitespace-nowrap text-dense-caption font-semibold uppercase tracking-[0.1em] text-muted-foreground'
const mono = 'font-mono tabular-nums'
const panel =
  'min-w-0 rounded-[10px] border border-[var(--sk-line0)] bg-[var(--sk-raised)] shadow-[inset_0_1px_0_color-mix(in_srgb,var(--sk-ink)_4%,transparent)]'
const panelHead =
  'flex flex-wrap items-center gap-2.5 rounded-t-[9px] border-b border-[var(--sk-line0)] bg-[var(--sk-raised2)] px-3 py-1.75 text-dense-body leading-normal'

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

export function SymbolPlaybookPanel({ symbol }: { symbol: string }) {
  const sym = symbol.trim().toUpperCase()
  const sessQ = useQuery({
    queryKey: ['research', 'forecast-sessions', sym],
    queryFn: () => fetchForecastSessions(sym),
    enabled: Boolean(sym),
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

  const latest = (sessQ.data?.rows ?? [])
    .slice()
    .sort((a, b) => b.trade_date.localeCompare(a.trade_date))[0]
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
        Observe-only (D10). The fan is the model&rsquo;s own probability split for the session; LIVE
        is which branch the tape is currently confirming. Nothing here places orders.
      </p>
    </section>
  )
}
