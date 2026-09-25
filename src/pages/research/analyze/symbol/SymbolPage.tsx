/**
 * Symbol — one name, every face, in one page.
 *
 * Six routes became these tabs. `analyzeHubs.ts` records the app making this
 * move once already, twelve labs into five hubs; the design makes it again one
 * level up, because the five doors were one name's six faces and reading them
 * meant leaving the name each time. Owner overrode the standing defer-merges
 * decision for this page specifically, 2026-09-12.
 *
 * ## Re-walked 2026-09-21 against Rev 2026-09-18.2
 *
 * The page had the right *pieces* and the wrong *shape*. The design reads, top
 * to bottom: the face switch, the list you came from, the name and its verdict
 * with the verbs beside it, then a **tab strip that divides the header from the
 * body**, then — on Overview — two columns, the faces and a rail. This side had
 * the tabs as a control among the header's buttons, no rail at all, and the
 * page's own strips (context, Copilot, legs, since-snapshot) stacked between
 * the title and the body so the body began below the fold.
 *
 * Three things moved rather than being added:
 *
 * - **the tab strip** is the spine now, sticky, with a dot per face and the
 *   `opt` mark before the option faces. `1`–`6` switch, which is the design's
 *   own shortcut and the reason a strip beats a segment control here.
 * - **Since last snapshot** was above the tabs, where it claimed to be about
 *   the whole page; it is one of the design's three rail panels and sits in the
 *   rail, on the face that reads it.
 * - **the regime ribbon left.** Its five chips are the five faces' verdicts,
 *   which the cards below now print with their records — the strip was the same
 *   reading twice, once without its evidence. It stays on the other tabs'
 *   sections, where the card grid is not there to say it.
 *
 * `?tab=` still drives the tabs, so every link and bookmark written against
 * them is unchanged, and every retired `?view=` still lands on its anchor.
 */
import { Fragment, useEffect, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import { PageFaceSwitch, PageHeader, PageShell } from '@/components/layout'
import { StatusLamp } from '@/components/StatusLamp'
import { CopilotVerdictStrip } from '@/components/research/CopilotVerdictStrip'
import { useResearchContext } from '@/hooks/useResearchContext'
import { useInSurface } from '@/lib/surfaceScope'
import { SYMBOL_PATH, SYMBOL_TABS, TAB_PARAM, tabFor, type SymbolTabId } from '@/lib/symbolTabs'
import { cn } from '@/lib/utils'
import { SymbolAsofTag } from '@/pages/research/analyze/symbol/SymbolAsofTag'
import { SymbolIdentity } from '@/pages/research/analyze/symbol/SymbolIdentity'
import { SymbolMyLegs } from '@/pages/research/analyze/symbol/SymbolMyLegs'
import { SymbolOriginRail } from '@/pages/research/analyze/symbol/SymbolOriginRail'
import { SymbolRecordRail } from '@/pages/research/analyze/symbol/SymbolRecordRail'
import { SymbolSinceSnapshot } from '@/pages/research/analyze/symbol/SymbolSinceSnapshot'
import { SymbolVerdictPanel } from '@/pages/research/analyze/symbol/SymbolVerdictPanel'
import { SymbolNarrativePanel } from '@/pages/research/analyze/symbol/SymbolNarrativePanel'
import { useSymbolFaces } from '@/pages/research/analyze/symbol/useSymbolFaces'
import { DossierBody } from '@/pages/research/analyze/dossier/DossierBody'
import { SymbolVolatilityFace } from '@/pages/research/analyze/symbol/SymbolVolatilityFace'
import { SymbolDealerFace } from '@/pages/research/analyze/symbol/SymbolDealerFace'
import { SymbolScenarioFace } from '@/pages/research/analyze/symbol/SymbolScenarioFace'
import { SymbolFlowFace } from '@/pages/research/analyze/symbol/SymbolFlowFace'
import { SymbolChainFace } from '@/pages/research/analyze/symbol/SymbolChainFace'
import { PayoffBody } from '@/pages/research/analyze/payoff/PayoffBody'

/** The design's line at the right of the tab strip — what this face is for. */
const TAB_HINT: Record<SymbolTabId, string> = {
  overview: 'six faces · open a face to read it in full · 1–6 switch tabs',
  volatility: 'one name only — the universe tables stay in Discover',
  dealer: 'where the dealers sit: gamma levels and the OpEx cycle',
  scenario: 'what the model expects · observe-only (D10)',
  flow: 'a proxy until the options tape is on the data plan',
  chain: 'expiries, strikes and structures for this name',
  payoff: 'a structure priced before it exists · at close, not a quote',
}

export default function SymbolPage() {
  const [params, setParams] = useSearchParams()
  const active = tabFor(params.get(TAB_PARAM), params.get('view'))
  const { symbol } = useResearchContext()
  const faces = useSymbolFaces(symbol)
  // In the Symbol panel the frame keeps the keys: a Desk behind it, or a
  // second Symbol page, would otherwise have its digits answered twice.
  const inSurface = useInSurface()

  const setTab = (id: SymbolTabId) => {
    setParams((prev) => {
      const next = new URLSearchParams(prev)
      next.set(TAB_PARAM, id)
      // The anchor belonged to the tab being left.
      next.delete('view')
      return next
    })
  }

  /**
   * `1`–`6` switch faces — the design's own shortcut.
   *
   * It stands down while a field has focus: the page carries a symbol box and
   * the Copilot composer, and a digit typed into either is a digit.
   */
  useEffect(() => {
    if (inSurface) return
    function onKey(e: KeyboardEvent) {
      const el = e.target as HTMLElement | null
      if (el && (/INPUT|TEXTAREA|SELECT/.test(el.tagName) || el.isContentEditable)) return
      if (e.metaKey || e.ctrlKey || e.altKey) return
      const n = Number(e.key)
      if (!Number.isInteger(n) || n < 1 || n > SYMBOL_TABS.length) return
      e.preventDefault()
      setTab(SYMBOL_TABS[n - 1].id)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  /** A tab's dot is the lamp of the face it opens — one reading, not two. */
  const lampFor = useMemo(() => {
    const byTab = new Map(
      faces.views.filter((v) => v.face.isTab).map((v) => [v.face.openTo, v.lamp]),
    )
    return (id: SymbolTabId) => byTab.get(id) ?? null
  }, [faces.views])

  const decisive = faces.views.flatMap((v) => v.rows).filter((r) => r.band === 'hot' || r.band === 'cold')
  const thesis =
    decisive.length > 0
      ? decisive.map((r) => r.verdict).join(' · ')
      : 'No lens is decisive on this name today'

  return (
    <PageShell padding="compact" className="space-y-2.5">
      <div className="flex flex-wrap items-center gap-2">
        {/* Reading | Method: this page's back is the Symbol method face
            (design 2026-09-20.4). A face is a view of the page, not a place. */}
        <PageFaceSwitch path={SYMBOL_PATH} />
        {!symbol ? (
          <PageHeader title="Symbol" description="One symbol, every face. Observe-only (D10)." />
        ) : null}
      </div>

      {/* Where this name came from, and the way through that list — stepping it
          keeps the tab you are reading. */}
      <SymbolOriginRail symbol={symbol} tabQuery={`${SYMBOL_PATH}?${TAB_PARAM}=${active}`} />

      {symbol ? (
        <SymbolIdentity symbol={symbol} faces={faces} asof={<SymbolAsofTag symbol={symbol} />} />
      ) : null}

      <div className="sticky top-0 z-10 -mx-3 flex items-end overflow-x-auto border-b border-border bg-card px-3">
        {SYMBOL_TABS.map((t, i) => {
          const lamp = lampFor(t.id)
          const on = t.id === active
          return (
            <Fragment key={t.id}>
              {t.id === 'chain' ? (
                <span
                  className="ml-2 self-center border-l border-border pl-3 font-mono text-dense-micro tracking-wide text-entity-contract opacity-75"
                  title="The option faces — Chain and Payoff, contract-level where the rest of the page is the underlying."
                >
                  opt
                </span>
              ) : null}
              <button
                type="button"
                onClick={() => setTab(t.id)}
                aria-current={on ? 'page' : undefined}
                title={`${TAB_HINT[t.id]} — ${i + 1}`}
                className={cn(
                  'inline-flex h-8 shrink-0 items-center gap-1.5 whitespace-nowrap border-b-2 px-3 text-dense-label',
                  on
                    ? 'border-primary font-semibold text-foreground'
                    : 'border-transparent text-muted-foreground hover:text-foreground',
                )}
              >
                {lamp ? <StatusLamp variant="dot" lamp={lamp} className="h-1.5 w-1.5" /> : null}
                {t.label}
              </button>
            </Fragment>
          )
        })}
        <span className="ml-auto hidden min-w-0 shrink truncate pb-2 pl-3 text-dense-meta text-muted-foreground lg:block">
          {TAB_HINT[active]}
        </span>
      </div>

      {/* The strips that belong to a face rather than to the page.
    
          The symbol picker goes where the design puts it — nowhere: the shell's
          own field sets the symbol and stays on the page while doing it, so a
          second box under the tabs was a second way to do one thing. It is kept
          on the two faces that also need the as-of date beside it.
    
          The Copilot strip leaves Overview for the same reason the regime
          ribbon left: the rail's `Your verdict` panel now lists the very claims
          it was summarising, with their approval states. It stays on the five
          faces that have no rail. */}
      {/* Every face reads the shell's symbol now — no per-tab context bar. */}
      {active === 'overview' ? null : (
        <CopilotVerdictStrip originPage={`symbol:${active}`} originLabel={`Symbol · ${active}`} />
      )}
      {/* Contract §11.7 — the judgement is read against what you already
          carry on this name, so the leg rail sits above the body. */}
      {symbol ? <SymbolMyLegs symbol={symbol} /> : null}

      {/* Keyed so a tab switch remounts: a lab's selected row, sort and filters
          belong to that lab, not to its neighbour. */}
      <div key={active}>
        {active === 'overview' && (
          /* Two columns, as the design draws them. The rail is not a seventh
             face: your own verdict is a thing you write, what moved is a
             comparison with yesterday, and the record is a ranking *of* the
             cards beside it. */
          <div className="flex flex-wrap items-start gap-3">
            <div className="min-w-0 flex-[1_1_34rem]">
              <DossierBody faces={faces} />
            </div>
            {symbol ? (
              <aside className="flex min-w-0 flex-[1_1_18rem] flex-col gap-3 lg:max-w-[22rem]">
                <SymbolVerdictPanel symbol={symbol} thesis={thesis} />
                {/* Rev .43: under the verdict, dashed — beside it, never in it. */}
                <SymbolNarrativePanel symbol={symbol} />
                <SymbolSinceSnapshot symbol={symbol} />
                <SymbolRecordRail
                  symbol={symbol}
                  record={faces.record}
                  loading={faces.loading}
                />
              </aside>
            ) : null}
          </div>
        )}
        {active === 'volatility' && <SymbolVolatilityFace symbol={symbol} />}
        {active === 'dealer' && (
          <SymbolDealerFace symbol={symbol} />
        )}
        {active === 'scenario' && <SymbolScenarioFace symbol={symbol} />}
        {active === 'flow' && <SymbolFlowFace symbol={symbol} />}
        {active === 'chain' && <SymbolChainFace symbol={symbol} />}
        {active === 'payoff' && <PayoffBody />}
      </div>
    </PageShell>
  )
}
