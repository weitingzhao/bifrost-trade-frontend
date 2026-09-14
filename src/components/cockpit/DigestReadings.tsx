/**
 * The readings a daily digest was written from — names down, lenses across.
 *
 * Design (`design/trade/Research Copilot.dc.html`, Today) gives every digest
 * line a cite: the lens that says it, linked to where that lens is read. The
 * payload already carries those readings (`exhibits`), so the cite is the
 * reading itself — its freshness lamp, the lens's own word for the band, and a
 * link to that section of the Symbol page. A lens with no reading is grey and
 * says so: not red, and not a blank that reads as a quiet name.
 */
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ChevronDown, ChevronRight } from 'lucide-react'
import {
  DenseDataTable,
  DenseTableBody,
  DenseTableCell,
  DenseTableHead,
  DenseTableHeader,
  DenseTableHeadRow,
  DenseTableRow,
  DenseTag,
} from '@/components/data-display'
import { StatusLamp } from '@/components/StatusLamp'
import { useLensRegistry } from '@/hooks/useLensRegistry'
import { digestLenses, type DigestSymbol } from '@/lib/harness/dailyDigest'
import { regimeItems, type RegimeExhibit } from '@/lib/regimeRibbon'
import { lensHref, symbolTabHref } from '@/lib/symbolTabs'

export function DigestReadings({ rows, defaultOpen = false }: { rows: readonly DigestSymbol[]; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen)
  const registry = useLensRegistry()
  const specOf = (id: string) => registry.data?.lenses.find((l) => l.id === id)
  const lenses = digestLenses(rows)
  if (rows.length === 0 || lenses.length === 0) return null

  const cells = rows.length * lenses.length
  const read = rows.reduce((n, r) => n + new Set(r.readings.filter((x) => x.band != null).map((x) => x.lens)).size, 0)
  // The same function names the columns as fills the cells, so a header never disagrees with its cells.
  const labels = regimeItems(lenses.map((lens) => ({ lens, freshness: '' })), '', specOf).map((i) => i.label)

  return (
    <div className="rounded-sm border border-border/60">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full items-center gap-1.5 px-2 py-1 text-left text-dense-meta text-foreground hover:bg-secondary/60"
      >
        {open ? <ChevronDown className="size-3 shrink-0" aria-hidden /> : <ChevronRight className="size-3 shrink-0" aria-hidden />}
        Readings it was written from
        <span className="font-mono tabular-nums text-muted-foreground">
          {rows.length} names × {lenses.length} lenses · {read} of {cells} read
        </span>
      </button>
      {open ? (
        <div className="border-t border-border/60">
          <DenseDataTable>
            <DenseTableHeader>
              <DenseTableHeadRow>
                <DenseTableHead>Symbol</DenseTableHead>
                {labels.map((label, i) => (
                  <DenseTableHead key={lenses[i]}>{label}</DenseTableHead>
                ))}
              </DenseTableHeadRow>
            </DenseTableHeader>
            <DenseTableBody>
              {rows.map((row) => {
                const byLens = new Map(row.readings.map((r) => [r.lens, r]))
                const exhibits: RegimeExhibit[] = lenses.map((lens) => {
                  const r = byLens.get(lens)
                  return { lens, freshness: r?.freshness ?? '', as_of: r?.as_of, verdict: r ? { band: r.band, means: r.means } : null }
                })
                return (
                  <DenseTableRow key={row.symbol}>
                    <DenseTableCell>
                      <Link to={symbolTabHref('overview', row.symbol)} className="font-mono hover:underline">
                        {row.symbol}
                      </Link>
                    </DenseTableCell>
                    {regimeItems(exhibits, row.symbol, specOf).map((it) => (
                      <DenseTableCell key={it.id}>
                        <Link
                          to={lensHref(it.id, row.symbol) ?? it.href}
                          className="inline-flex items-center gap-1.5 hover:underline"
                          title={
                            it.band != null
                              ? `${it.label}: ${it.means ?? it.verdict}${it.asOf ? ` · as of ${it.asOf}` : ''}`
                              : `${it.label}: no reading in this digest`
                          }
                        >
                          <StatusLamp lamp={it.lamp} variant="dot" />
                          {it.band != null ? (
                            <DenseTag variant={it.tone} size="cell">
                              {it.verdict}
                            </DenseTag>
                          ) : (
                            <span className="text-dense-meta text-muted-foreground">no reading</span>
                          )}
                        </Link>
                      </DenseTableCell>
                    ))}
                  </DenseTableRow>
                )
              })}
            </DenseTableBody>
          </DenseDataTable>
        </div>
      ) : null}
    </div>
  )
}
