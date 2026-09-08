/**
 * Research overview — `/research/overview`: the three postures side by side,
 * and the circuit they share. The seat rail's "all three" link lands here.
 */
import { Link } from 'react-router-dom'
import { BookOpen } from 'lucide-react'
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
        actions={
          <Link
            to="/docs/research-blueprint"
            className="inline-flex items-center gap-1.5 rounded-md border border-border/60 px-2.5 py-1 text-dense-meta text-muted-foreground hover:border-primary/40 hover:text-foreground"
            title="What Research should be — the target the code is calibrated against"
          >
            <BookOpen className="size-3.5" aria-hidden />
            Blueprint
          </Link>
        }
      />
      <ResearchPostures activeHypotheses={activeQ.data?.total_active ?? 0} discoveries={home.totalDiscoveries} />
      {/* The circuit the three postures share. A segment looks healthy on its
          own while the loop is open; this is where that shows. */}
      <LoopOverviewStrip />
      <UniverseReachStrip />
    </PageShell>
  )
}
