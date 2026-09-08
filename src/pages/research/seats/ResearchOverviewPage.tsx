/**
 * Research overview — `/research/overview`: the three postures side by side,
 * and the circuit they share. The seat rail's "all three" link lands here.
 */
import { PageHeader, PageShell } from '@/components/layout'
import { UniverseReachStrip } from '@/components/research/UniverseReachStrip'
import { useActiveHypotheses } from '@/hooks/useHypotheses'
import { useResearchHomeData } from '@/hooks/useResearchHomeData'
import { LoopOverviewStrip } from '@/pages/research/home/LoopOverviewStrip'
import { ResearchPostures } from '@/pages/research/home/ResearchPostures'

export default function ResearchOverviewPage() {
  const activeQ = useActiveHypotheses(5)
  const home = useResearchHomeData()
  return (
    <PageShell padding="default" className="space-y-3">
      <PageHeader
        title="Research"
        description="Three ways it works for you — it runs on its own, it works when asked, or you open the pages. Pick a seat; the menu follows. Advisory only, D10 BLOCKED."
      />
      <ResearchPostures activeHypotheses={activeQ.data?.total_active ?? 0} discoveries={home.totalDiscoveries} />
      {/* The circuit the three postures share. A segment looks healthy on its
          own while the loop is open; this is where that shows. */}
      <LoopOverviewStrip />
      <UniverseReachStrip />
    </PageShell>
  )
}
