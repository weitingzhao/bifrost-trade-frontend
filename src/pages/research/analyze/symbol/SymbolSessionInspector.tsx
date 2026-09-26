/**
 * One forecast session, opened from the Forecast sessions table — what the
 * model said that night: the regime and its probability split, the hourly
 * path it drew, the structures it ranked and its own words — and how it
 * settled: against the session it forecast (research 0.126.0), each hour's
 * print beside the band it drew where the plugin keeps 1-hour bars for the
 * name, the close alone where it does not.
 */
import { useQuery } from '@tanstack/react-query'
import { fetchForecastSessionDetail } from '@/api/researchEngine'
import { DenseTag, SettlementBadges, type DenseTagVariant } from '@/components/data-display'
import { ProbabilityBar } from '@/components/charts/ProbabilityBar'
import { ForecastStructureCards } from '@/components/research/ForecastStructureCards'
import { FaceKv } from '@/components/research/FaceKv'
import { settlementFineGrain } from '@/lib/researchSettlement'
import { cn } from '@/lib/utils'
import {
  INPUT_FAULT_NOTE,
  LEGACY_SETTLEMENT_NOTE,
  isForecastSettlement,
  settlementBasis,
  settlementInputFault,
  settlementTarget,
  type SessionDay,
} from './useSymbolForecastSessions'

/** The settlement's own per-hour record: the print and whether the band held. */
function hourPrints(hourlyJson: unknown): Map<number, { price: number; hit: boolean }> {
  const out = new Map<number, { price: number; hit: boolean }>()
  if (!Array.isArray(hourlyJson)) return out
  for (const h of hourlyJson) {
    if (!h || typeof h !== 'object') continue
    const r = h as Record<string, unknown>
    if (typeof r.hour_et === 'number' && typeof r.actual_price === 'number') {
      out.set(r.hour_et, { price: r.actual_price, hit: r.hit === true })
    }
  }
  return out
}

const cap =
  'whitespace-nowrap text-dense-meta font-semibold text-muted-foreground'
const th =
  'whitespace-nowrap border-b border-border px-2 py-1 text-right align-bottom text-dense-caption font-semibold text-secondary-foreground'
const td = 'whitespace-nowrap border-b border-border/40 px-2 py-1 text-right font-mono text-dense-meta tabular-nums'

function hourPathVariant(call: string): DenseTagVariant {
  const c = call.toLowerCase()
  if (c === 'bull' || c === 'up') return 'success'
  if (c === 'bear' || c === 'down') return 'danger'
  if (c === 'flat' || c === 'rangy') return 'warning'
  return 'neutral'
}

/** The LLM's own bill for the session, when the terrain snapshot recorded one. */
function sessionCostUsd(terrainJson: unknown): number | null {
  if (!terrainJson || typeof terrainJson !== 'object') return null
  const tokens = (terrainJson as Record<string, unknown>).llm_tokens
  if (!tokens || typeof tokens !== 'object') return null
  const t = tokens as Record<string, unknown>
  const v = t.session_cost_usd ?? t.cost_usd
  return typeof v === 'number' && Number.isFinite(v) ? v : null
}

export function SymbolSessionInspector({ day, onClose }: { day: SessionDay; onClose: () => void }) {
  const s = day.session
  const detailQ = useQuery({
    queryKey: ['research', 'forecast-session-detail', s.session_id],
    queryFn: () => fetchForecastSessionDetail(s.session_id),
    staleTime: 10 * 60_000,
  })
  const hourly = [...(detailQ.data?.hourly ?? [])].sort((a, b) => a.hour_et - b.hour_et)
  const cost = sessionCostUsd(detailQ.data?.session.terrain_json)
  const move = s.spot > 0 ? ((s.expected_close - s.spot) / s.spot) * 100 : null
  const stl = day.settlement
  const current = isForecastSettlement(stl)
  const prints = current ? hourPrints(stl.hourly_json) : new Map<number, { price: number; hit: boolean }>()
  const came = current && s.spot > 0 ? (stl.actual_close - s.spot) / s.spot : null

  return (
    <div className="flex h-full flex-col overflow-y-auto">
      <header className="flex flex-wrap items-baseline gap-x-3 gap-y-1 border-b border-border px-3 py-2">
        <span className={cap}>Forecast session</span>
        <span className="font-mono text-dense-body font-bold text-entity-symbol">{s.symbol}</span>
        <span className="font-mono text-dense-body tabular-nums">{s.trade_date}</span>
        {s.regime ? (
          <DenseTag variant="neutral" size="cell">
            {s.regime}
          </DenseTag>
        ) : null}
        <button
          type="button"
          onClick={onClose}
          className="ml-auto rounded px-1.5 py-0.5 text-dense-meta text-muted-foreground hover:bg-secondary"
          aria-label="Close"
        >
          esc
        </button>
      </header>

      <div className="flex flex-col gap-3 px-3 py-3">
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
          <FaceKv label="spot" value={s.spot.toFixed(2)} />
          <FaceKv label="target" value={s.expected_close.toFixed(2)} />
          <FaceKv
            label="target vs spot"
            value={move != null ? `${move >= 0 ? '+' : '−'}${Math.abs(move).toFixed(2)}%` : '—'}
            cls={move != null ? (move >= 0 ? 'text-profit' : 'text-loss') : undefined}
          />
          <FaceKv
            label="computed"
            value={s.computed_at.slice(0, 16).replace('T', ' ')}
            title="UTC. Sessions are computed after the close of their trade date."
          />
        </div>

        <div className="flex flex-col gap-1">
          <span className={cap}>probability split</span>
          <ProbabilityBar
            rangy={s.prob_rangy}
            bull={s.prob_bull}
            bear={s.prob_bear}
            squeeze={s.prob_squeeze}
            height={22}
          />
        </div>

        {s.narrative ? (
          <p className="m-0 text-dense-meta leading-normal text-secondary-foreground text-pretty">{s.narrative}</p>
        ) : null}
        <p className="m-0 text-dense-caption text-muted-foreground">
          Model: {s.llm_provider || 'heuristic'}
          {cost != null ? ` · session cost $${cost.toFixed(4)}` : ''}
          {day.reruns > 0
            ? ` · ${day.reruns} later re-run${day.reruns === 1 ? '' : 's'} of this date set aside`
            : ''}
        </p>

        <div className="flex flex-col gap-1">
          <span className={cap}>hourly path</span>
          {detailQ.isLoading ? (
            <p className="m-0 text-dense-meta text-muted-foreground">Loading the hourly path…</p>
          ) : hourly.length === 0 ? (
            <p className="m-0 text-dense-meta text-muted-foreground">
              The session stored no hourly path.
            </p>
          ) : (
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <th className={cn(th, 'text-left')}>Hour ET</th>
                  <th className={cn(th, 'text-left')}>Path</th>
                  <th className={th}>Low</th>
                  <th className={th}>High</th>
                  <th className={th}>Target</th>
                  <th className={th}>Conf</th>
                  {prints.size > 0 ? <th className={th} title="The 1-hour bar's close at that hour, against the band.">Actual</th> : null}
                </tr>
              </thead>
              <tbody>
                {hourly.map((h) => (
                  <tr key={h.hour_et}>
                    <td className={cn(td, 'text-left text-muted-foreground')}>
                      {String(h.hour_et).padStart(2, '0')}:00
                    </td>
                    <td className={cn(td, 'text-left font-sans')}>
                      <DenseTag variant={hourPathVariant(h.path_call)} size="cell">
                        {h.path_call}
                      </DenseTag>
                    </td>
                    <td className={td}>{h.level_low.toFixed(2)}</td>
                    <td className={td}>{h.level_high.toFixed(2)}</td>
                    <td className={td}>{h.level_target.toFixed(2)}</td>
                    <td className={td}>{Math.round(h.confidence * 100)}%</td>
                    {prints.size > 0 ? (
                      <td className={cn(td, prints.get(h.hour_et) == null ? 'text-muted-foreground' : prints.get(h.hour_et)!.hit ? 'text-success' : 'text-destructive')}>
                        {prints.get(h.hour_et)?.price.toFixed(2) ?? '—'}
                      </td>
                    ) : null}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {s.structures_json ? (
          <div className="flex flex-col gap-1">
            <span className={cap}>structures it ranked</span>
            <ForecastStructureCards structuresJson={s.structures_json} />
          </div>
        ) : null}

        <div className="flex flex-col gap-1.5 border-t border-border/60 pt-2">
          <span className={cap}>settlement</span>
          {current ? (
            <>
              {settlementInputFault(stl) ? (
                <p className="m-0 text-dense-meta leading-normal text-warning text-pretty">{INPUT_FAULT_NOTE}</p>
              ) : null}
              <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
                <FaceKv label="for" value={settlementTarget(stl) ?? '—'} title="The session the forecast was for — the next trading day." />
                <FaceKv
                  label="close · move"
                  value={`${stl.actual_close.toFixed(2)} · ${came == null ? '—' : `${came >= 0 ? '+' : '−'}${Math.abs(came * 100).toFixed(2)}%`}`}
                  cls={came == null ? undefined : came >= 0 ? 'text-profit' : 'text-loss'}
                />
                <FaceKv
                  label="miss vs target"
                  value={`${stl.close_miss_pct >= 0 ? '+' : '−'}${Math.abs(stl.close_miss_pct * 100).toFixed(2)}%`}
                />
                <FaceKv
                  label="path"
                  value={settlementBasis(stl) === 'hourly' ? `${stl.path_hit_count}/${stl.path_total} hours` : 'close only'}
                  title={
                    settlementBasis(stl) === 'hourly'
                      ? 'Hours whose print held the band (or moved the called way), of the hours that printed.'
                      : 'No 1-hour bars for this name that day: the path is judged on the close alone.'
                  }
                />
              </div>
              <SettlementBadges
                pathHit={stl.path_hit}
                pathHitCount={stl.path_hit_count}
                pathTotal={stl.path_total}
                closeMissPct={stl.close_miss_pct}
                {...settlementFineGrain(stl)}
              />
            </>
          ) : (
            <p className="m-0 text-dense-meta leading-normal text-muted-foreground text-pretty">
              {stl ? LEGACY_SETTLEMENT_NOTE : 'Not settled yet — it settles after the session it forecast closes.'}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
