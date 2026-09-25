import { cn } from '@/lib/utils'
import { fmtIsoDateToken } from '@/lib/format'
import type { LedgerReconcileModel } from '@/pages/portfolio/ledger/ledgerReconcile'
import { undatedSummaryNote, ledgerSourceBucket } from '@/pages/portfolio/ledger/ledgerReconcile'

export function LedgerReconcileFace({
  model,
  focus,
}: {
  model: LedgerReconcileModel
  focus?: 'undated' | 'diff'
}) {
  return (
    <div className="flex flex-col gap-2.5 px-3 py-2.5">
      <span className="text-dense-body font-bold">Canonical vs book</span>
      <div className="flex flex-wrap gap-1.5">
        {[
          { k: 'Canonical', v: String(model.canonical), amber: false },
          { k: 'Book', v: String(model.book), amber: false },
          { k: 'Only in TWS', v: String(model.onlyTws), amber: model.onlyTws > 0 },
          ...(model.manual > 0 ? [{ k: 'Manual', v: String(model.manual), amber: true }] : []),
        ].map(s => (
          <span
            key={s.k}
            className="flex flex-col border px-2.5 py-1.5 mat-card"
          >
            <span className="text-dense-micro font-bold uppercase tracking-wide text-muted-foreground">{s.k}</span>
            <span
              className={cn(
                'font-mono text-dense-body font-bold tabular-nums',
                s.amber ? 'text-[var(--color-warning)]' : 'text-foreground',
              )}
            >
              {s.v}
            </span>
          </span>
        ))}
      </div>
      <p className="text-dense-meta text-muted-foreground leading-relaxed text-pretty">
        The difference is every <span className="font-mono">tws_client</span> row
        {model.manual > 0 ? <> and every <span className="font-mono">manual</span> row</> : null}. TWS is the fast
        read and is deliberately outside the performance book, so a gap here is expected.
      </p>
      <p className="text-dense-caption text-muted-foreground leading-relaxed text-pretty">
        Across all dates and types — a row reconciles or it does not, whatever the window. Account, symbol,
        structure and expiry filters apply.
      </p>
      {model.groups.map(g => (
        <div key={g.id} className="border mat-card" data-reconcile-group={g.id}>
          <div className="flex flex-wrap items-baseline gap-2 border-b border-border bg-muted/30 px-2.5 py-1.5">
            <span className="inline-flex items-center gap-1.5 text-dense-label font-semibold">
              <span
                className={cn(
                  'size-2 rounded-full',
                  g.id === 'bag' ? 'bg-violet-400' : g.id === 'also_flex' ? 'bg-sky-400' : 'bg-sky-300',
                )}
              />
              {g.label}
            </span>
            <span className="ml-auto font-mono text-dense-label font-bold tabular-nums">{g.count}</span>
          </div>
          <div className="flex flex-col gap-1.5 px-2.5 py-2">
            <p className="text-dense-meta text-muted-foreground leading-relaxed text-pretty">{g.note}</p>
            {g.rows.slice(0, 50).map((r, i) => (
              <span key={`${g.id}-${i}`} className="flex flex-wrap items-baseline gap-x-2.5 gap-y-0.5">
                <span className="font-mono text-dense-meta text-foreground" title={r.title}>{r.name}</span>
                <span className="font-mono text-dense-meta text-muted-foreground">{r.date}</span>
                <span
                  className={cn(
                    'font-mono text-dense-meta',
                    r.fieldsMuted ? 'text-muted-foreground/70' : 'text-muted-foreground',
                  )}
                >
                  {r.fields}
                </span>
              </span>
            ))}
            {g.rows.length > 50 ? (
              <p className="text-dense-meta text-muted-foreground">
                showing 50 of {g.rows.length}
              </p>
            ) : null}
          </div>
        </div>
      ))}
      <div
        id="ledger-reconcile-undated"
        className={cn(
          'border mat-card',
          focus === 'undated' && 'ring-1 ring-[var(--color-warning)]',
        )}
      >
        <div className="flex flex-wrap items-baseline gap-2 border-b border-border bg-muted/30 px-2.5 py-1.5">
          <span className="inline-flex items-center gap-1.5 text-dense-label font-semibold">
            <span className="size-2 rounded-full bg-slate-500" />
            No trade date · {model.undated.length} {model.undated.length === 1 ? 'row' : 'rows'}
          </span>
        </div>
        <div className="flex flex-col gap-1.5 px-2.5 py-2">
          <p className="text-dense-meta text-muted-foreground leading-relaxed text-pretty">
            {undatedSummaryNote(model.undated)}
          </p>
          {model.undated.map((e, i) => (
            <span key={e.account_executions_id ?? i} className="flex flex-wrap items-baseline gap-x-2.5 gap-y-0.5">
              <span className="font-mono text-dense-meta text-foreground">{e.symbol || e.contract_key || '—'}</span>
              <span className="font-mono text-dense-meta text-muted-foreground">
                {fmtIsoDateToken(e.trade_date) === '—' ? 'no trade date' : fmtIsoDateToken(e.trade_date)}
              </span>
              <span className="font-mono text-dense-meta text-muted-foreground">{ledgerSourceBucket(e.source)}</span>
            </span>
          ))}
        </div>
      </div>
      <p className="text-dense-meta text-muted-foreground leading-relaxed text-pretty">
        A gap is not a fault: nothing here is red. Neither group shrinks on its own — if a row
        belongs in the book, a journal entry is the only thing that puts it there.
      </p>
    </div>
  )
}
