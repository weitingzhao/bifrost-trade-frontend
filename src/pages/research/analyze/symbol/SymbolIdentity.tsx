/**
 * The name, its price, and what the lenses make of it — the prototype's
 * opening line (Research Symbol.dc.html, Rev 2026-09-18.2).
 *
 * The design leads the page with `PLTR · Palantir Technologies · 156.90
 * +3.46%` and, under it, one sentence of verdict and `3 of 8 lenses
 * decisive`. This side led with the word «Symbol» and a lens chip strip: the
 * page said what it was, not what it had concluded about the name in it.
 *
 * Three of those four parts are measured here and one is not:
 *
 * - **price** comes from the quote this app already reads for every other
 *   page. The REST quote carries bid/ask/last/mid and no previous close, so
 *   there is no change to print — the figure says what it is (`last`) and the
 *   line says the rest is not quoted, rather than computing a percentage out
 *   of something that is not the close.
 * - **the company's name** is nowhere in this app's market payloads; the
 *   ticker stands alone rather than borrowing a name from a list that could
 *   be stale.
 * - **the verdict** is the decisive lenses' own words. The design writes one
 *   synthesised sentence («Sell premium bias»); nothing here synthesises, and
 *   inventing the synthesis would put a judgement in the app's mouth that no
 *   lens made. Decisive lenses are listed in the order the dossier reads
 *   them, which is the same order the faces below appear in.
 * - **`n of m decisive`** is a count of the same readings.
 */
import { Link } from 'react-router-dom'
import { DOSSIER_LENSES } from '@/lib/dossier'
import { LENS_LABELS } from '@/lib/regimeRibbon'
import { verdictView } from '@/lib/lensVerdict'
import { useDossier } from '@/hooks/useDossier'
import { useQuotes } from '@/hooks/useQuotes'
import { fmtNum } from '@/lib/format'
import { cn } from '@/lib/utils'

export function SymbolIdentity({ symbol }: { symbol: string }) {
  const sym = (symbol || '').trim().toUpperCase()
  const { exhibits, loading } = useDossier(sym)
  const quotes = useQuotes(sym ? [sym] : [])

  if (!sym) return null

  const byLens = new Map(exhibits.map((e) => [e.lens, e]))
  const readings = DOSSIER_LENSES.map((lens) => ({ lens, view: verdictView(lens, byLens.get(lens)) }))
  const read = readings.filter((r) => r.view.band != null)
  const decisive = read.filter((r) => r.view.decisive)

  const quote = quotes.data?.quotes?.find((q) => q.symbol === sym && q.sec_type === 'STK')
  const last = quote?.last ?? quote?.mid ?? null

  return (
    <section
      className="flex flex-wrap items-baseline gap-x-3 gap-y-1 rounded-lg border border-border bg-background px-3 py-2"
      aria-label={`${sym} identity`}
    >
      <Link
        to={`/portfolio/positions?symbol=${encodeURIComponent(sym)}`}
        className="font-mono text-lg font-bold text-entity-symbol hover:underline"
        title={`${sym} in the book`}
      >
        {sym}
      </Link>
      {last == null ? (
        <span className="text-dense-meta text-muted-foreground" title="No quote for this name right now.">
          no quote
        </span>
      ) : (
        <span
          className="font-mono text-dense-body tabular-nums"
          title="Last traded price. The quote carries no previous close, so no change is printed rather than computed against the wrong number."
        >
          {fmtNum(last, 2)}
        </span>
      )}

      {loading ? (
        <span className="text-dense-meta text-muted-foreground">reading the lenses…</span>
      ) : decisive.length === 0 ? (
        <span className="text-dense-meta text-muted-foreground">
          {read.length === 0
            ? 'no lens has a reading on this name today'
            : 'no lens is decisive today — every reading is in its middle band'}
        </span>
      ) : (
        <span className="flex flex-wrap items-baseline gap-x-2 text-dense-label">
          {decisive.map((r, i) => (
            <span key={r.lens} className={cn(r.view.tone)}>
              {i > 0 ? <span className="mr-2 text-muted-foreground/60">·</span> : null}
              {LENS_LABELS[r.lens] ?? r.lens} {r.view.label}
            </span>
          ))}
        </span>
      )}

      <span
        className="ml-auto whitespace-nowrap font-mono text-dense-meta text-muted-foreground"
        title="Decisive means a lens sat at one of its extremes — the middle bands are the lens declining to call it."
      >
        {decisive.length} of {read.length || DOSSIER_LENSES.length} lenses decisive
      </span>
    </section>
  )
}
