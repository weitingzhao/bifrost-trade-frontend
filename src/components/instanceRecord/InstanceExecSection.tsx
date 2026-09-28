/**
 * Executions (design Rev .101): the Performance book contract by contract —
 * buys beside sells, gross, fees, net — or the TWS client's own rows for the
 * same contracts. TWS rows carry no instance attribution, so they are matched
 * by contract; TWS keeps only recent days, which the empty state says.
 */
import { DenseTag, SegmentControl } from '@/components/data-display'
import { fmtUsd } from '@/lib/format'
import { cn } from '@/lib/utils'
import { pnlColorClass } from '@/utils/dailyChange'
import type { Execution } from '@/types/positions'
import { d3, type ExecGroup } from '@/utils/instanceRecord/instanceRecordModel'

export function InstanceExecSection({
  groups,
  source,
  onSource,
  tws,
  twsLoading,
}: {
  groups: ExecGroup[]
  source: 'perf' | 'tws'
  onSource: (v: 'perf' | 'tws') => void
  tws: Execution[]
  twsLoading: boolean
}) {
  const tGross = groups.reduce((a, g) => a + g.gross, 0)
  const tComm = groups.reduce((a, g) => a + g.comm, 0)
  const tNet = tGross - tComm
  return (
    <div className="flex flex-col gap-2.5 rounded-xl bg-[color-mix(in_srgb,var(--sk-ink)_4%,transparent)] px-3.5 py-3">
      <div className="flex flex-wrap items-center gap-2.5">
        <span className="text-dense-body font-semibold">Executions</span>
        <SegmentControl
          size="xs"
          ariaLabel="Execution source"
          value={source}
          onChange={(v) => onSource(v as 'perf' | 'tws')}
          options={[
            { value: 'perf', label: 'Performance book' },
            { value: 'tws', label: 'TWS client' },
          ]}
        />
        <span className="text-dense-micro text-muted-foreground">
          {source === 'perf'
            ? 'final book · buy/sell matched per contract'
            : 'TWS raw · matched to this instance by contract'}
        </span>
      </div>

      {source === 'perf' ? (
        groups.map((g) => (
          <div key={g.key} className="flex flex-col gap-1.5 border-t border-[color-mix(in_srgb,var(--sk-ink)_6%,transparent)] pt-2">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <span className="font-mono text-dense-label font-semibold text-[var(--sk-contract,#7dd3fc)]">{g.label}</span>
              <span className="font-mono text-dense-micro text-[var(--sk-mute2)]">
                net {g.netQty > 0 ? '+' : ''}
                {g.netQty}
              </span>
              <DenseTag variant={g.open ? 'warning' : 'neutral'} size="cell">
                {g.open ? 'Open' : 'Flat'}
              </DenseTag>
              <span className="ml-auto font-mono text-dense-micro text-[var(--sk-mute2)]">
                gross {fmtUsd(g.gross)} · comm {fmtUsd(g.comm)} ·{' '}
                <span className={cn('font-semibold', pnlColorClass(g.net))}>net {fmtUsd(g.net)}</span>
              </span>
            </div>
            <div className="grid grid-cols-[repeat(auto-fit,minmax(12rem,1fr))] gap-2">
              {g.sides.map((s) => (
                <div key={s.name} className="rounded-lg bg-[color-mix(in_srgb,var(--sk-ink)_4%,transparent)] px-2.5 py-2">
                  <div className="flex gap-1.5 text-dense-micro">
                    <span className="font-semibold text-[var(--sk-soft)]">{s.name}</span>
                    <span className="ml-auto font-mono text-[var(--sk-mute2)]">
                      {s.qty ? `${s.qty} @ ${s.avg?.toFixed(2)} · ${fmtUsd(s.total)}` : '—'}
                    </span>
                  </div>
                  {s.fills.length === 0 ? (
                    <div className="pt-1 text-dense-micro text-muted-foreground">none yet</div>
                  ) : (
                    s.fills.map((f, i) => (
                      <div key={`${f.id}-${i}`} className="grid grid-cols-[minmax(0,1fr)_auto_auto_auto] gap-2 pt-1 font-mono text-dense-micro">
                        <span className="text-[var(--sk-soft)]">
                          {d3(f.date)} <span className="text-muted-foreground">{f.id != null ? `#${f.id}` : ''}</span>
                        </span>
                        <span className="text-right">{f.qty}</span>
                        <span className="text-right">{f.price.toFixed(2)}</span>
                        <span className="text-right text-muted-foreground">{fmtUsd(f.comm)}</span>
                      </div>
                    ))
                  )}
                </div>
              ))}
            </div>
          </div>
        ))
      ) : twsLoading ? (
        <p className="m-0 text-dense-meta text-muted-foreground">Reading the TWS client rows…</p>
      ) : tws.length === 0 ? (
        <p className="m-0 text-dense-meta text-muted-foreground text-pretty">
          No TWS client row for these contracts. TWS keeps only recent days, so an instance traded before that window
          is expected to match nothing here — the Performance book is the record.
        </p>
      ) : (
        <div className="flex flex-col">
          {tws.map((r, i) => (
            <div
              key={`${r.account_executions_id}-${i}`}
              className="grid grid-cols-[minmax(0,1fr)_auto_auto_auto_auto] gap-2 border-t border-[color-mix(in_srgb,var(--sk-ink)_6%,transparent)] py-1 font-mono text-dense-micro"
            >
              <span className="min-w-0 truncate text-[var(--sk-soft)]">
                {r.time != null ? new Date(r.time * 1000).toISOString().slice(0, 16).replace('T', ' ') : '—'}{' '}
                <span className="text-muted-foreground">{(r.contract_key ?? '').split('|')[0].trim()}</span>
              </span>
              <span className="font-semibold">{(r.side ?? '').toUpperCase().startsWith('B') ? 'BOT' : 'SLD'}</span>
              <span className="text-right">{Math.abs(Number(r.quantity ?? r.qty) || 0)}</span>
              <span className="text-right">{Number(r.price).toFixed(2)}</span>
              <span className="text-right text-muted-foreground">{fmtUsd(Number(r.commission) || 0)}</span>
            </div>
          ))}
        </div>
      )}

      {source === 'perf' && groups.length > 0 ? (
        <div className="flex flex-wrap gap-x-4 border-t border-[color-mix(in_srgb,var(--sk-ink)_6%,transparent)] pt-2 font-mono text-dense-micro">
          <span className="text-[var(--sk-mute2)]">
            Total gross <span className="text-foreground">{fmtUsd(tGross)}</span>
          </span>
          <span className="text-[var(--sk-mute2)]">
            Comm <span className="text-foreground">{fmtUsd(tComm)}</span>
          </span>
          <span className="text-[var(--sk-mute2)]">
            Net <span className={cn('font-semibold', pnlColorClass(tNet))}>{fmtUsd(tNet)}</span>
          </span>
        </div>
      ) : null}
    </div>
  )
}
