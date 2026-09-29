/**
 * Every instance on this name, for the Symbol panel (design Rev .103, Symbol ↔
 * Instance): the three opened most recently, `All N` for the rest with the
 * open ones first. Each number opens its Instance surface, stepping this
 * name's instances — the same tracks the price chart above draws.
 */
import { useMemo, useState } from 'react'
import { InstanceRef } from '@/components/instanceRecord/InstanceRef'
import { fmtPl, instanceTracksFor } from '@/components/symbolChart/symbolPriceModel'
import { useLedgerExecutionsBook } from '@/hooks/useLedgerExecutions'
import { useSymbolLegs } from '@/hooks/useSymbolLegs'
import { cn } from '@/lib/utils'
import { d3 } from '@/utils/instanceRecord/instanceRecordModel'

const SHOWN = 3

export function SymbolInstancesList({ symbol }: { symbol: string }) {
  const sym = symbol.trim().toUpperCase()
  const bookQ = useLedgerExecutionsBook({ limit: 0 })
  const legs = useSymbolLegs(sym)
  const [all, setAll] = useState(false)
  const tracks = useMemo(
    () => instanceTracksFor(bookQ.data?.items ?? [], sym, legs).filter((t) => t.id != null),
    [bookQ.data, sym, legs],
  )
  const recent = useMemo(() => [...tracks].sort((a, b) => b.openDate.localeCompare(a.openDate)), [tracks])
  const everyOne = useMemo(
    () => [...recent].sort((a, b) => Number(a.closeDate != null) - Number(b.closeDate != null)),
    [recent],
  )
  const ids = useMemo(() => everyOne.map((t) => t.id as number), [everyOne])
  const rows = all ? everyOne : recent.slice(0, SHOWN)
  if (bookQ.isLoading) return <p className="m-0 text-dense-micro text-muted-foreground">Reading the instances on {sym}…</p>
  if (tracks.length === 0)
    return <p className="m-0 text-dense-micro text-muted-foreground">No instance has traded {sym} — nothing in the book to open.</p>
  return (
    <section aria-label={`Instances on ${sym}`} className="flex flex-col gap-1">
      <div className="flex items-baseline gap-2 text-dense-micro text-muted-foreground">
        <span className="font-semibold text-secondary-foreground">Instances</span>
        <span>
          {tracks.filter((t) => t.closeDate == null).length} open · {tracks.length} in all
        </span>
        {tracks.length > SHOWN ? (
          <button type="button" className="ml-auto cursor-pointer border-0 bg-transparent p-0 text-[var(--sk-accent)] hover:underline" onClick={() => setAll((v) => !v)}>
            {all ? 'Recent 3' : `All ${tracks.length}`}
          </button>
        ) : null}
      </div>
      <ul className="m-0 flex list-none flex-col p-0">
        {rows.map((t) => {
          const open = t.closeDate == null
          return (
            <li
              key={t.key}
              className="grid grid-cols-[52px_minmax(0,1fr)_auto] items-baseline gap-x-2 border-t border-[color-mix(in_srgb,var(--sk-ink)_5%,transparent)] py-1 text-dense-label"
            >
              <InstanceRef id={t.id as number} list={ids} from={`Symbol · ${sym}`} />
              <span className="min-w-0 truncate">
                <span className="font-mono text-[var(--sk-contract,#7dd3fc)]">{t.name.replace(/^#\d+\s*/, '')}</span>
                <span className="ml-1.5 text-dense-micro text-muted-foreground">
                  {open ? `open since ${d3(t.openDate)}` : `${d3(t.openDate)} → ${d3(t.closeDate)}`}
                  {t.joints.length ? ' · rolled' : ''}
                </span>
              </span>
              <span
                className={cn(
                  'font-mono tabular-nums',
                  t.pnl == null ? 'text-muted-foreground' : open ? 'text-[var(--color-unrealized)]' : t.pnl >= 0 ? 'text-profit' : 'text-loss',
                )}
              >
                {t.pnl == null ? (open ? 'open' : '—') : fmtPl(t.pnl)}
              </span>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
