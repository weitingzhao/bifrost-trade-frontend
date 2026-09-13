/**
 * Symbol — one name, every face, in one page.
 *
 * Six routes became these tabs. `analyzeHubs.ts` records the app making this
 * move once already, twelve labs into five hubs; the design makes it again one
 * level up, because the five doors were one name's six faces and reading them
 * meant leaving the name each time. Owner overrode the standing defer-merges
 * decision for this page specifically, 2026-09-12.
 *
 * The container owns everything the six pages each used to carry — the shell,
 * the title, the context bar, the regime ribbon, the verdict strip — so a tab
 * change is a body change and nothing above it moves. `?tab=` drives it, so a
 * tab is bookmarkable and linkable exactly as `?view=` was.
 *
 * Sections stack rather than sub-tab. Volatility is four lenses read *together*
 * to reach one verdict; hiding three behind a sub-tab is the shape the twelve
 * separate pages had. Every retired `?view=` survives as that section's anchor,
 * so a link written before the merge still lands on what it pointed at.
 */
import { useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import { SegmentControl } from '@/components/data-display'
import { PageHeader, PageShell } from '@/components/layout'
import { ResearchContextBar } from '@/components/research/ResearchContextBar'
import { CompositeRegimeRibbon } from '@/components/research/CompositeRegimeRibbon'
import { CopilotVerdictStrip } from '@/components/research/CopilotVerdictStrip'
import { useDossier } from '@/hooks/useDossier'
import { useResearchContext } from '@/hooks/useResearchContext'
import { verdictView } from '@/lib/lensVerdict'
import { SYMBOL_TABS, TAB_PARAM, tabFor, type SymbolTabId } from '@/lib/symbolTabs'
import { cn } from '@/lib/utils'
import { DossierBody } from '@/pages/research/analyze/dossier/DossierBody'
import { IvRankSection } from '@/pages/research/analyze/volRegime/IvRankSection'
import { VrpSection } from '@/pages/research/analyze/volRegime/VrpSection'
import { SkewSection } from '@/pages/research/analyze/volRegime/SkewSection'
import { GexSection } from '@/pages/research/analyze/dealerLevels/GexSection'
import { OpexSection } from '@/pages/research/analyze/dealerLevels/OpexSection'
import { ModelSection } from '@/pages/research/analyze/scenario/ModelSection'
import { SessionsSection } from '@/pages/research/analyze/scenario/SessionsSection'
import { PlaybookSection } from '@/pages/research/analyze/scenario/PlaybookSection'
import { FlowBody } from '@/pages/research/analyze/flow/FlowBody'
import DiscoveryPage from '@/pages/research/analyze/DiscoveryPage'

const TAB_DESCRIPTION: Record<SymbolTabId, string> = {
  overview: 'One symbol, every face. Observe-only (D10).',
  volatility: 'How volatility is priced here — read the four together, not one at a time.',
  dealer: 'Where the dealers sit: gamma levels and the OpEx cycle.',
  scenario: 'What the model expects, and how its paths have settled.',
  flow: 'Order sentiment — placeholder until the options tape is on the plan.',
  chain: 'The chain for this name: expiries, strikes, structures.',
}

/** Amber outranks green, and a real fault outranks both. */
const TONE_RANK: Record<string, number> = { danger: 0, warning: 1, success: 2, info: 3, neutral: 4 }

/** One section of a stacked tab, anchored by the `?view=` it used to be. */
function Anchored({ id, children }: { id: string; children: React.ReactNode }) {
  // `scroll-mt` so a hash landing does not tuck the section under the top bar.
  return (
    <section id={id} className="scroll-mt-16 space-y-3">
      {children}
    </section>
  )
}

export default function SymbolPage() {
  const [params, setParams] = useSearchParams()
  const active = tabFor(params.get(TAB_PARAM), params.get('view'))
  const { symbol } = useResearchContext()
  // One batch for every registry lens, shared with the Overview tab's faces —
  // so the dots cost nothing beyond what the page already fetches.
  const { exhibits } = useDossier(symbol)

  const dotFor = useMemo(() => {
    const byLens = new Map(exhibits.map((ex) => [ex.lens, ex]))
    return (tab: (typeof SYMBOL_TABS)[number]) => {
      let worst: string | null = null
      for (const lens of tab.lenses) {
        const v = verdictView(lens, byLens.get(lens))
        if (v.band == null) continue
        if (worst == null || TONE_RANK[v.tone] < TONE_RANK[worst]) worst = v.tone
      }
      return worst
    }
  }, [exhibits])

  const setTab = (id: SymbolTabId) => {
    setParams((prev) => {
      const next = new URLSearchParams(prev)
      next.set(TAB_PARAM, id)
      // The anchor belonged to the tab being left.
      next.delete('view')
      return next
    })
  }

  return (
    <PageShell padding={active === 'chain' ? 'none' : 'compact'} className="space-y-3">
      <div className={cn(active === 'chain' && 'space-y-3 px-4 pt-4')}>
        <PageHeader
          title="Symbol"
          description={TAB_DESCRIPTION[active]}
          actions={
            <SegmentControl
              ariaLabel="Symbol tab"
              size="sm"
              value={active}
              onChange={(v) => setTab(v as SymbolTabId)}
              options={SYMBOL_TABS.map((t) => {
                const dot = dotFor(t)
                return {
                  value: t.id,
                  // The worst band inside a tab, on the tab: a name's problem is
                  // visible without opening the tab that holds it.
                  label: dot ? `${t.label} ●` : t.label,
                }
              })}
            />
          }
        />
        <ResearchContextBar showDate={active === 'dealer' || active === 'chain'} />
        {symbol ? <CompositeRegimeRibbon symbol={symbol} /> : null}
        <CopilotVerdictStrip originPage={`symbol:${active}`} originLabel={`Symbol · ${active}`} />
      </div>

      {/* Keyed so a tab switch remounts: a lab's selected row, sort and filters
          belong to that lab, not to its neighbour. */}
      <div key={active}>
        {active === 'overview' && <DossierBody />}
        {active === 'volatility' && (
          <div className="space-y-4">
            <Anchored id="iv-rank"><IvRankSection /></Anchored>
            <Anchored id="vrp"><VrpSection /></Anchored>
            <Anchored id="skew"><SkewSection /></Anchored>
          </div>
        )}
        {active === 'dealer' && (
          <div className="space-y-4">
            <Anchored id="gex"><GexSection /></Anchored>
            <Anchored id="opex"><OpexSection /></Anchored>
          </div>
        )}
        {active === 'scenario' && (
          <div className="space-y-4">
            <Anchored id="model"><ModelSection /></Anchored>
            <Anchored id="sessions"><SessionsSection /></Anchored>
            <Anchored id="playbook"><PlaybookSection /></Anchored>
          </div>
        )}
        {active === 'flow' && <FlowBody />}
        {/* Chain still brings its own shell. Discovery is 6.6k lines behind its
            own header and root class; separating its body is its own cut, and
            wrapping it half-way would leave the page in two idioms. The
            container drops its padding here so the two shells do not stack. */}
        {active === 'chain' && <DiscoveryPage />}
      </div>
    </PageShell>
  )
}
