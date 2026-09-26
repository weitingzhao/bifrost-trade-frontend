/**
 * One forecast session, opened from the Forecast sessions table — what the
 * model said that night: the regime and its probability split, the hourly
 * path it drew, the structures it ranked and its own words. The settlement
 * keeps its seat and says why its figures are withheld (see
 * `SETTLEMENT_WITHHELD_REASON`).
 */
import { useQuery } from '@tanstack/react-query'
import { fetchForecastSessionDetail } from '@/api/researchEngine'
import { DenseTag, type DenseTagVariant } from '@/components/data-display'
import { ProbabilityBar } from '@/components/charts/ProbabilityBar'
import { ForecastStructureCards } from '@/components/research/ForecastStructureCards'
import { FaceKv } from '@/components/research/FaceKv'
import { cn } from '@/lib/utils'
import { SETTLEMENT_WITHHELD_REASON, type SessionDay } from './useSymbolForecastSessions'

const cap =
  'whitespace-nowrap text-dense-caption font-semibold uppercase tracking-[0.1em] text-muted-foreground'
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

        <div className="flex flex-col gap-1 border-t border-border/60 pt-2">
          <span className={cap}>settlement</span>
          <p className="m-0 text-dense-meta leading-normal text-muted-foreground text-pretty">
            {day.settlement
              ? `Settled ${day.settlement.computed_at.slice(0, 10)} against ${day.settlement.actual_close.toFixed(2)}${
                  Math.abs(day.settlement.actual_close - s.spot) < 1e-6
                    ? ' — the session’s own spot'
                    : ` (spot at compute ${s.spot.toFixed(2)})`
                }. `
              : 'Not settled. '}
            {SETTLEMENT_WITHHELD_REASON}
          </p>
        </div>
      </div>
    </div>
  )
}
