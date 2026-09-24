/**
 * The name, its price, and what the lenses make of it — the page's opening.
 *
 * The design (Rev 2026-09-18.2) leads with three lines and nothing else:
 *
 *     PLTR  Palantir Technologies  156.90 +3.40%  [watchlist]
 *     VERDICT  Sell premium bias · Sell-vol edge · Positive gamma
 *     3 of 8 lenses decisive · volatility drove the rating · IV rank 71 · not held
 *
 * and beside them the column of things you can do with the read. This side led
 * with the word «Symbol» and a lens chip strip: the page said what it *was*,
 * not what it had *concluded*.
 *
 * Measured, and each absence left visible rather than filled:
 *
 * - **price** is the quote this app already reads; the day change is the last
 *   against the store's own previous close (2026-09-25 — the bars endpoint
 *   served it all along; the earlier note said no change could be printed).
 * - **the company's name** comes off the SEPA wide table's universe row —
 *   measured the day the Screener face landed on the same read.
 * - **the verdict** is the decisive lenses' own words, in the order the faces
 *   below read them. The design writes one synthesised phrase per lens
 *   («Sell premium bias»); nothing here synthesises, and inventing the
 *   synthesis would put a judgement in the app's mouth that no lens made.
 * - **"volatility drove the rating"** is the *list's* claim, not this page's —
 *   read from the trail the ranked table published. Typed straight into the
 *   box, nothing drove it and the clause is absent.
 *
 * The verb row is four of the design's ten. The other six — Explain, Challenge,
 * Fork, Extend, Settle, Distill — walk a *read artifact* (`read
 * pltr-0918-today`), and there is no artifact store on this side: the Journal's
 * own walk measured that its five joins have no artifact endpoint between
 * them. Owner deferred the six until the semantics are settled, so the row
 * says what is missing instead of drawing six buttons that would open nothing.
 */
import { Link } from 'react-router-dom'
import { PortfolioTag } from '@/components/portfolio/PortfolioTag'
import { SECTION_CAP_CLASS } from '@/components/layout'
import {
  AddToPoolButton,
  PlanThisButton,
  SaveAsHypothesisButton,
} from '@/components/research'
import { IconActionButton } from '@/components/data-display'
import { Pin } from 'lucide-react'
import { cockpitPinStore } from '@/store/cockpitPinStore'
import { StatusLamp } from '@/components/StatusLamp'
import { useQuotes } from '@/hooks/useQuotes'
import { useQuery } from '@tanstack/react-query'
import { fetchSepaScreenerWide } from '@/api/research/sepaScreenerWide'
import { fetchDailyClosesMulti } from '@/api/marketData/dailyBars'
import { pnlColorClass } from '@/utils/dailyChange'
import { fmtNum } from '@/lib/format'
import { SYMBOL_PATH, TAB_PARAM } from '@/lib/analyzeHubs'
import { withSymbolParam } from '@/lib/symbolLink'
import { cn } from '@/lib/utils'
import type { SymbolFaces } from './useSymbolFaces'

/** The design's face pills — one per tab that has a reading behind it. */
function FaceLamps({ symbol, faces }: { symbol: string; faces: SymbolFaces }) {
  const pills = faces.views.filter((v) => v.face.isTab)
  return (
    <div className="flex flex-wrap items-center justify-end gap-1">
      {pills.map((v) => (
        <Link
          key={v.face.id}
          to={withSymbolParam(`${SYMBOL_PATH}?${TAB_PARAM}=${v.face.openTo}`, symbol)}
          className="inline-flex items-center gap-1.5 whitespace-nowrap rounded border border-border px-1.5 py-0.5 text-dense-meta hover:bg-muted"
          title={v.headline}
        >
          <StatusLamp lamp={v.lamp} className="h-1.5 w-1.5" />
          {v.face.title.split(' ')[0]}
        </Link>
      ))}
    </div>
  )
}

export function SymbolIdentity({
  symbol,
  faces,
  asof,
}: {
  symbol: string
  faces: SymbolFaces
  asof?: React.ReactNode
}) {
  const sym = (symbol || '').trim().toUpperCase()
  const quotes = useQuotes(sym ? [sym] : [])
  // The wide table's universe row carries the company's name; the closes give
  // yesterday's close, the denominator of the day change.
  const wideQ = useQuery({
    queryKey: ['research', 'sepa-wide-one', sym],
    queryFn: () => fetchSepaScreenerWide(5, [sym]),
    enabled: Boolean(sym),
    staleTime: 60 * 60_000,
  })
  const closesQ = useQuery({
    queryKey: ['market', 'closes-multi', 'ident', sym],
    queryFn: () => fetchDailyClosesMulti([sym], 8),
    enabled: Boolean(sym),
    staleTime: 10 * 60_000,
  })
  if (!sym) return null

  const quote = quotes.data?.quotes?.find((q) => q.symbol === sym && q.sec_type === 'STK')
  const last = quote?.last ?? quote?.mid ?? null

  const company = wideQ.data?.rows.find((r) => r.symbol === sym)?.company_name ?? null
  const closes = (closesQ.data?.[sym] ?? []).map((b) => b.close).filter((c): c is number => c != null && c > 0)
  // Against yesterday's close when the live last is in; else close-on-close.
  const prevClose = closes.length > 1 ? closes[closes.length - 2] : null
  const ref = last ?? (closes.length > 0 ? closes[closes.length - 1] : null)
  const chg = prevClose != null && ref != null ? ref / prevClose - 1 : null

  // The decisive readings, in the order the faces read them.
  const decisive = faces.views
    .flatMap((v) => v.rows)
    .filter((r) => r.band === 'hot' || r.band === 'cold')
  const drove = faces.drove ? faces.views.find((v) => v.face.id === faces.drove) : null
  const thesis =
    decisive.length > 0
      ? decisive.map((r) => r.verdict).join(' · ')
      : 'No lens is decisive on this name today'

  return (
    <div className="flex flex-wrap items-start gap-x-6 gap-y-2">
      <div className="min-w-0 flex-[1_1_26rem]">
        <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
          <Link
            to={`/portfolio/positions?symbol=${encodeURIComponent(sym)}`}
            className="font-mono text-xl font-bold text-entity-symbol hover:underline"
            title={`${sym} in the book`}
          >
            {sym}
          </Link>
          {company ? (
            <span className="max-w-[26ch] overflow-hidden text-ellipsis whitespace-nowrap text-dense-label text-muted-foreground">
              {company}
            </span>
          ) : null}
          {last == null ? (
            <span
              className="text-dense-meta text-muted-foreground"
              title="No quote for this name right now."
            >
              no quote
            </span>
          ) : (
            <span className="font-mono text-dense-body tabular-nums" title="Last traded price.">
              {fmtNum(last, 2)}
            </span>
          )}
          {chg != null ? (
            <span
              className={cn('font-mono text-dense-body font-semibold tabular-nums', pnlColorClass(chg))}
              title={last != null ? "Last against the store's previous close." : 'Close on close — no live quote right now.'}
            >
              {chg >= 0 ? '+' : '−'}
              {Math.abs(chg * 100).toFixed(2)}%
            </span>
          ) : null}
          <PortfolioTag symbol={sym} variant="inline" />
        </div>

        <div className="mt-1 flex flex-wrap items-baseline gap-x-2">
          <span className={SECTION_CAP_CLASS}>Verdict</span>
          {faces.loading && decisive.length === 0 ? (
            <span className="text-dense-label text-muted-foreground">reading the lenses…</span>
          ) : (
            <span className="flex flex-wrap items-baseline gap-x-2 text-dense-body font-semibold">
              {decisive.length === 0 ? (
                <span className="text-muted-foreground">
                  No decisive edge — every reading is in its middle band
                </span>
              ) : (
                decisive.map((r, i) => (
                  <span key={r.id} className={cn(r.tone)}>
                    {i > 0 ? <span className="mr-2 text-muted-foreground/60">·</span> : null}
                    {r.verdict}
                  </span>
                ))
              )}
            </span>
          )}
        </div>

        <p className="mt-0.5 text-dense-meta text-muted-foreground">
          <span
            title="Decisive means a lens sat at one of its extremes — the middle bands are the lens declining to call it. Trend and momentum are out of this count: they are the screen that found the name, not the rating of it."
          >
            {faces.decisive.n} of {faces.decisive.of} lenses decisive
          </span>
          {drove ? (
            <span title={`The list you arrived from was ranking on ${drove.face.title}.`}>
              {' · '}
              {drove.face.title.toLowerCase()} drove the {faces.drove === 'trend' ? 'screen' : 'rating'}
            </span>
          ) : null}
          {' · '}
          {faces.held ? 'in the book' : faces.watched ? 'watchlist only' : 'not held'}
        </p>
      </div>

      <div className="ml-auto flex min-w-0 flex-[1_1_20rem] flex-col items-end gap-1.5">
        <div className="flex flex-wrap items-center justify-end gap-1.5">
          {/* Four of the design's ten. The six that walk a read artifact are
              owed, and the reason is one sentence rather than six dead
              buttons. */}
          <span
            className="rounded border border-dashed border-border px-1.5 py-0.5 text-dense-caption text-muted-foreground/70"
            title="The design gives every read an artifact id and six verbs that walk it — Explain, Challenge, Fork, Extend, Settle, Distill. No artifact store exists on this side (the Journal's own walk found no artifact endpoint across its five joins), and the Owner deferred the verbs until their semantics are settled."
          >
            read · no artifact store
          </span>
          <IconActionButton
            title="Pin to Cockpit"
            ariaLabel={`Pin ${sym}`}
            onClick={() =>
              cockpitPinStore.getState().pinHit({
                kind: 'iv',
                symbol: sym,
                ts: new Date().toISOString().slice(0, 10),
                detail: { verdict: thesis, decisive: faces.decisive },
                originPage: SYMBOL_PATH,
              })
            }
          >
            <Pin className="h-3.5 w-3.5" />
          </IconActionButton>
          <AddToPoolButton
            symbol={sym}
            source="symbol"
            tags={['symbol']}
            lens_snapshot={{ verdict: thesis, decisive: faces.decisive.n }}
          />
          <SaveAsHypothesisButton
            originPage="symbol"
            defaultTitle={`${sym} — ${thesis}`}
            defaultThesis={thesis}
            defaultSymbols={[sym]}
            defaultTags={['symbol']}
            originRef={{ source: 'symbol', symbol: sym }}
          />
          <PlanThisButton
            symbol={sym}
            source="symbol"
            sourceLabel="Symbol"
            note={thesis}
            variant="primary"
          />
        </div>

        <div className="flex flex-wrap items-center justify-end gap-x-2 gap-y-1 text-dense-meta text-muted-foreground">
          {/* The design offers today / −1d / −5d here. The exhibit route takes
              a symbol and a lens list and no date, so a prior reading cannot
              be asked for — what the page *can* say is what changed since you
              last looked, which is the rail panel below. */}
          <span
            className="text-dense-caption text-muted-foreground/70"
            title="The design lets you step the whole page back a day or a week. /research/exhibit takes no as_of parameter, so no prior reading can be requested; the Since-last-snapshot panel compares against the last reading this browser saw instead."
          >
            snapshot · today only
          </span>
          {asof}
        </div>

        <FaceLamps symbol={sym} faces={faces} />
      </div>
    </div>
  )
}
