/**
 * The base the option book sits on, one row per role.
 *
 * The page used to split holdings into product tabs — Stocks, Fixed income,
 * Cash-like — which is how a broker statement is organised and not how a seller
 * thinks about them. Stock is collateral for calls; cash is collateral for puts;
 * income ETFs are neither, and only widen buying power. Each row says which, and
 * how much of it the options have already spoken for.
 *
 * Three rows. The detail tabs still exist for the line items.
 */
import { cn } from '@/lib/utils'
import {
  DenseDataTable,
  DenseTableBody,
  DenseTableCell,
  DenseTableRow,
  DenseTag,
  denseTableNumCell,
} from '@/components/data-display'
import { fmtUsd } from '@/utils/positions'
import type { BaseLayer } from '@/utils/bookVsBase'

function usedTone(used: number | null): string | undefined {
  if (used == null) return undefined
  if (used >= 0.9) return 'text-warning'
  return undefined
}

export function BaseLayersSection({ layers }: { layers: BaseLayer[] }) {
  if (layers.every((l) => l.marketValue === 0 && l.symbols.length === 0)) return null

  return (
    <section aria-label="Base holdings by role">
      <div className="mb-1 flex items-baseline justify-between">
        <span className="text-dense-label font-semibold uppercase tracking-wide text-muted-foreground">
          Base — and the role each layer plays for the options
        </span>
      </div>
      <DenseDataTable tableClassName="table-fixed">
        <colgroup>
          <col style={{ width: '9rem' }} />
          <col style={{ width: '6.5rem' }} />
          <col style={{ width: '10rem' }} />
          <col />
        </colgroup>
        <DenseTableBody>
          {layers.map((l) => (
            <DenseTableRow key={l.role} className="[&_td]:text-dense-body">
              <DenseTableCell className="font-medium">{l.label}</DenseTableCell>
              <DenseTableCell className={cn(denseTableNumCell, 'font-mono')}>
                {l.marketValue > 0 ? fmtUsd(l.marketValue, true) : '—'}
              </DenseTableCell>
              <DenseTableCell>
                {l.role === 'stocks' && l.shares > 0 ? (
                  <span className="font-mono tabular-nums">{l.shares.toLocaleString()} sh</span>
                ) : (
                  <span className="inline-flex flex-wrap gap-1">
                    {l.symbols.slice(0, 4).map((s) => (
                      <DenseTag key={s} variant="symbol" size="cell" className="font-mono">
                        {s}
                      </DenseTag>
                    ))}
                    {l.symbols.length > 4 ? (
                      <span className="text-dense-caption text-muted-foreground">
                        +{l.symbols.length - 4}
                      </span>
                    ) : null}
                  </span>
                )}
              </DenseTableCell>
              <DenseTableCell className={cn('whitespace-normal', usedTone(l.used) ?? 'text-muted-foreground')}>
                {l.note}
                {l.used != null ? (
                  <span className="ml-2 font-mono text-dense-caption tabular-nums">
                    {Math.round(l.used * 100)}% in use
                  </span>
                ) : null}
              </DenseTableCell>
            </DenseTableRow>
          ))}
        </DenseTableBody>
      </DenseDataTable>
    </section>
  )
}
