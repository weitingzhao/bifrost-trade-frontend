/**
 * Backtest › Pine library — the option context a script can read (research
 * 0.195.0, ledger S6): IV, IV rank, VRP, term structure, earnings counts and
 * SPY, each by name through `request.security("NAME", timeframe.period, close)`.
 * The list, units, history start and the alignment rules come from Research
 * (`GET research/pine/context`), so this panel says only what Research serves.
 */
import { useQuery } from '@tanstack/react-query'
import { ViewState } from '@bifrost/ui'
import { cap, mono, panel, panelHead, td, th } from '@/components/research/labFaceUi'
import { cn } from '@/lib/utils'
import { QUERY_KEYS } from '@/constants/queryKeys'
import { fetchPineContext } from '@/api/research/pine'

const RULE_ORDER = ['timeframe', 'missing_day', 'warm_up', 'as_of'] as const
const RULE_LABEL: Record<string, string> = {
  timeframe: 'Timeframe',
  missing_day: 'Missing day',
  warm_up: 'Warm-up',
  as_of: 'As of',
}

export function PineContextPanel() {
  const q = useQuery({ queryKey: QUERY_KEYS.researchEngine.pineContext, queryFn: fetchPineContext, staleTime: 30 * 60_000 })
  return (
    <section className={panel} aria-label="Option context">
      <header className={panelHead}>
        <span className="text-dense-body font-semibold">Option context</span>
        <span className={cn(mono, 'text-dense-caption text-muted-foreground')}>
          request.security(&quot;NAME&quot;, timeframe.period, close)
        </span>
      </header>
      {q.isPending ? (
        <ViewState kind="loading" layout="strip" title="Loading the context series" />
      ) : q.isError ? (
        <ViewState
          kind="failed"
          layout="strip"
          title="The context series did not load"
          detail="Research before 0.195.0 does not serve them; scripts there cannot call request.security."
        />
      ) : (
        <div className="space-y-2 p-3">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <th className={th}>Name</th>
                  <th className={th}>Unit</th>
                  <th className={th}>From</th>
                  <th className={th}>What</th>
                  <th className={th}>Note</th>
                </tr>
              </thead>
              <tbody>
                {q.data.series.map((s) => (
                  <tr key={s.name}>
                    <td className={cn(td, mono)} title={s.pine}>
                      {s.name}
                      {s.kind === 'market' ? <span className="ml-1 text-muted-foreground">· market</span> : null}
                    </td>
                    <td className={cn(td, 'whitespace-nowrap')}>{s.unit}</td>
                    <td className={cn(td, mono, 'whitespace-nowrap')}>{s.history_from}</td>
                    <td className={td}>{s.description}</td>
                    <td className={cn(td, 'text-muted-foreground')}>{s.note || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5">
            {RULE_ORDER.filter((k) => q.data.rules[k]).map((k) => (
              <div key={k} className="contents">
                <dt className={cap}>{RULE_LABEL[k]}</dt>
                <dd className="m-0 text-dense-caption text-muted-foreground">{q.data.rules[k]}</dd>
              </div>
            ))}
          </dl>
        </div>
      )}
    </section>
  )
}
