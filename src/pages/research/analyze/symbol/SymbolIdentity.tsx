/**
 * The Symbol page's head — one hierarchy, top to bottom (design Rev .56,
 * contract §16.10a, still outside the shared PageHead):
 *
 *     ▢ PLTR  Palantir Technologies  156.90  +3.40%  [in the book]      subject
 *     VERDICT  Sell premium bias …                 Send to  Pin Pool Hyp ＋Plan
 *     3 of 8 lenses decisive · volatility drove the rating │ from Stock ratings  composite 77 …
 *     ─────────────────────────────────────────────────────────────────────
 *     ⧉ Reading | Method   snapshot · today only   ASOF …         read · no artifact store
 *
 * What left the page with Rev .56, and where it went (§15):
 * - the **FROM strip and ← n of N →** — the walk is the Symbol list's Source
 *   list now, j / k walk it there, and `3 of 18` is that list's foot; where
 *   the name came from, and why it was on the list, is the third line here;
 * - the **lamp row** — the tabs under the head carry the same lamps;
 * - the loose **Reading / Method** row — it sits with the other "which view
 *   of this subject" controls, and carries the tab you are on into Method.
 *
 * Measured, and each absence left visible rather than filled:
 * - **price** is the quote this app reads; the day change is the last against
 *   the store's own previous close.
 * - **the company's name** comes off the SEPA wide table's universe row.
 * - **the verdict** is the decisive lenses' own words. The design writes one
 *   synthesised phrase; nothing here composes lenses into a stance, and
 *   inventing one would put a judgement in the app's mouth no lens made.
 * - **"volatility drove the rating"** is the list's claim, read from the trail
 *   the ranked table published.
 * - **snapshot** is today only: `/research/exhibit` takes no as-of.
 * - **the six verbs** walk a read artifact, and no artifact store exists on
 *   this side; the Owner deferred them, so the row says what is missing.
 *
 * `compact` is the 440 form (Rev .57): the same facts, re-ordered for a panel
 * — the page switches on its container's width, not a second component.
 */
import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Pin } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { PageFaceSwitch } from '@/components/layout'
import { AddToPoolButton, PlanThisButton, SaveAsHypothesisButton } from '@/components/research'
import { IconActionButton } from '@/components/data-display'
import { cockpitPinStore } from '@/store/cockpitPinStore'
import { useQuotes } from '@/hooks/useQuotes'
import { fetchSepaScreenerWide } from '@/api/research/sepaScreenerWide'
import { fetchDailyClosesMulti } from '@/api/marketData/dailyBars'
import { fmtNum } from '@/lib/format'
import { SYMBOL_PATH } from '@/lib/analyzeHubs'
import { useSymbolTrail, type TrailChip } from '@/lib/symbolTrail'
import type { SymbolTabId } from '@/lib/symbolTabs'
import { TONE_TEXT } from '@/lib/dossier'
import { cn } from '@/lib/utils'
import { EARNINGS_GATE_DAYS, estimateCaveat } from '@/utils/earningsEstimate'
import type { SymbolFaces } from './useSymbolFaces'
import css from './symbolHead.module.css'

/**
 * Which Method tab explains the face you are on — the design's `LAB_TAB`.
 * Method is the Lab's Symbol face; its three tabs are the fit, the grid and
 * the ledger.
 */
const LAB_TAB: Record<SymbolTabId, { tab: 'surface' | 'whatif' | 'method'; why: string }> = {
  overview: { tab: 'surface', why: 'the SVI fit and residuals behind the vol read' },
  volatility: { tab: 'surface', why: 'the SVI fit and residuals behind these numbers' },
  dealer: { tab: 'method', why: 'the assumption ledger behind the dealer read' },
  scenario: { tab: 'whatif', why: 'the spot × IV grid this scenario came from' },
  chain: { tab: 'surface', why: 'the fit each strike is measured against' },
  payoff: { tab: 'whatif', why: 'the spot × IV grid behind the payoff' },
  flow: { tab: 'method', why: 'the assumption ledger behind the flow proxy' },
}

const CHIP_INK: Record<NonNullable<TrailChip['tone']>, string> = {
  hot: 'text-warning',
  cold: 'text-success',
  neutral: 'text-foreground',
}

export function SymbolIdentity({
  symbol,
  faces,
  asof,
  tab,
  compact = false,
  subjectControl,
}: {
  symbol: string
  faces: SymbolFaces
  asof?: ReactNode
  /** The tab the page is on — Method opens on the one that explains it. */
  tab: SymbolTabId
  compact?: boolean
  /** The panel's Follow / Lock, when the page is a surface. */
  subjectControl?: ReactNode
}) {
  const sym = (symbol || '').trim().toUpperCase()
  const quotes = useQuotes(sym ? [sym] : [])
  const at = useSymbolTrail(sym)
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
  const decisive = faces.views.flatMap((v) => v.rows).filter((r) => r.band === 'hot' || r.band === 'cold')
  const drove = faces.drove ? faces.views.find((v) => v.face.id === faces.drove) : null
  const thesis = decisive.length > 0 ? decisive.map((r) => r.verdict).join(' · ') : 'No lens is decisive on this name today'
  const heldTag = faces.held ? 'in the book' : faces.watched ? 'watchlist' : 'not held'
  const lab = LAB_TAB[tab]

  const subject = (
    <div className={css.line}>
      <span className={css.logo} aria-hidden title="Company logo — a monogram until the logo proxy is wired">
        {sym.charAt(0)}
      </span>
      <Link
        to={`/portfolio/positions?symbol=${encodeURIComponent(sym)}`}
        className={cn(css.sym, 'no-underline hover:underline')}
        title={`${sym} in the book`}
      >
        {sym}
      </Link>
      {company && !compact ? <span className={css.name}>{company}</span> : null}
      {last == null ? (
        <span className="text-dense-meta text-muted-foreground" title="No quote for this name right now.">
          no quote
        </span>
      ) : (
        <span className={css.spot} title="Last traded price.">
          {fmtNum(last, 2)}
        </span>
      )}
      {chg != null ? (
        <span
          className={css.chg}
          style={{ color: chg >= 0 ? 'var(--color-profit)' : 'var(--color-loss)' }}
          title={last != null ? "Last against the store's previous close." : 'Close on close — no live quote right now.'}
        >
          {chg >= 0 ? '+' : '−'}
          {Math.abs(chg * 100).toFixed(2)}%
        </span>
      ) : null}
      {company && compact ? <span className={css.name}>{company}</span> : null}
      {compact ? null : <span className={css.chip}>{heldTag}</span>}
    </div>
  )

  const headline = (
    <span className={css.headline}>
      {faces.loading && decisive.length === 0 ? (
        <span className="font-normal text-muted-foreground">reading the lenses…</span>
      ) : decisive.length === 0 ? (
        <span className="text-muted-foreground">No decisive edge — every reading is in its middle band</span>
      ) : (
        decisive.map((r, i) => (
          <span key={r.id} className={TONE_TEXT[r.tone] ?? TONE_TEXT.neutral}>
            {i > 0 ? <span className="mx-1.5 text-muted-foreground/60">·</span> : null}
            {r.verdict}
          </span>
        ))
      )}
    </span>
  )

  const send = (
    <>
      <IconActionButton
        title="Send to the Cockpit — pin it"
        ariaLabel={`Pin ${sym}`}
        className="w-auto gap-1 px-1.5"
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
        <span className="text-dense-meta">Pin</span>
      </IconActionButton>
      <AddToPoolButton
        symbol={sym}
        source="symbol"
        tags={['symbol']}
        label="Pool"
        lens_snapshot={{ verdict: thesis, decisive: faces.decisive.n }}
      />
      <SaveAsHypothesisButton
        originPage="symbol"
        defaultTitle={`${sym} — ${thesis}`}
        defaultThesis={thesis}
        defaultSymbols={[sym]}
        defaultTags={['symbol']}
        label={compact ? 'Hyp' : 'Hypothesis'}
        originRef={{ source: 'symbol', symbol: sym }}
      />
      <PlanThisButton symbol={sym} source="symbol" sourceLabel="Symbol" note={thesis} variant="primary" />
    </>
  )

  const decisiveLine = (
    <span
      title="Decisive means a lens sat at one of its extremes — the middle bands are the lens declining to call it. Trend and momentum are out of this count: they are the screen that found the name, not the rating of it."
    >
      {faces.decisive.n} of {faces.decisive.of} lenses decisive
      {drove ? ` · ${drove.face.title.toLowerCase()} drove the ${faces.drove === 'trend' ? 'screen' : 'rating'}` : ''}
      {faces.earnings && faces.earnings.days_away >= 0 && faces.earnings.days_away <= EARNINGS_GATE_DAYS ? (
        <span className="text-destructive" title={estimateCaveat(faces.earnings)}>
          {` · earnings in ~${faces.earnings.days_away}d (est.) gates every short-premium rule`}
        </span>
      ) : null}
    </span>
  )

  // Where the name came from, and why it was on that list — the FROM strip's
  // two halves, now one line of provenance under the verdict.
  const from = at ? (
    <span>
      from{' '}
      <Link to={at.href} className="text-[var(--sk-soft)] hover:underline" title={at.note ?? `Back to ${at.label}`}>
        {at.label}
      </Link>
    </span>
  ) : (
    <span title="Nothing ranked this name into view — it was typed, carried, or linked. A ranked list (Stock ratings, Vol ratings) puts its reasons here and its names in the Symbol list's Source.">
      opened directly
    </span>
  )
  const chips = (at?.chips ?? []).map((c) => (
    <span key={c.k} className={css.whyChip}>
      <span className="text-muted-foreground">{c.k}</span>{' '}
      <span className={CHIP_INK[c.tone ?? 'neutral']}>{c.v}</span>
    </span>
  ))

  if (compact) {
    return (
      <header className={cn(css.head, css.compact)}>
        <div className="flex items-center gap-2">
          {subjectControl}
          <span className={cn(css.chip, 'ml-auto h-auto py-px')}>{heldTag}</span>
        </div>
        {subject}
        {headline}
        <div className={css.why}>
          {chips}
          {from}
        </div>
        <div className="mt-0.5 flex items-center gap-1">
          <span className={cn(css.cap, 'mr-0.5')}>Send</span>
          {send}
        </div>
      </header>
    )
  }

  return (
    <header className={css.head}>
      {subject}
      <div className={cn(css.line, 'items-center')}>
        <span className={css.cap}>Verdict</span>
        {headline}
        <span className={css.send}>
          <span className={cn(css.cap, 'mr-0.5')} title="Each goes through the Decision Inbox, not straight into the store it names.">
            Send to
          </span>
          {send}
        </span>
      </div>
      <div className={css.why}>
        {decisiveLine}
        <span className={css.rule} aria-hidden />
        {from}
        {chips}
      </div>
      <div className={css.controls}>
        <PageFaceSwitch
          path={SYMBOL_PATH}
          methodTo={`/research/lab/symbol?tab=${lab.tab}&symbol=${encodeURIComponent(sym)}`}
          methodTitle={`The method face — ${lab.why}. Same subject, same endpoint, shown open. Analysis only; no order can be placed there.`}
        />
        <span
          title="The design lets you step the whole page back a day or a week. /research/exhibit takes no as_of parameter, so no prior reading can be requested; the Since-last-snapshot panel compares against the last reading this browser saw instead."
        >
          snapshot · today only
        </span>
        {asof}
        <span className={css.verbs}>
          <span
            className="rounded border border-dashed border-border px-1.5 py-0.5 text-dense-caption text-muted-foreground/70"
            title="The design gives every read an artifact id and six verbs that walk it — Explain, Challenge, Fork, Extend, Settle, Distill. No artifact store exists on this side (the Journal's own walk found no artifact endpoint across its five joins), and the Owner deferred the verbs until their semantics are settled."
          >
            read · no artifact store
          </span>
        </span>
      </div>
    </header>
  )
}
