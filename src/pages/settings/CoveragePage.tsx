/**
 * Data Coverage — `/settings/coverage`.
 *
 * One page, four views, where there used to be four pages in a tree two levels
 * deep. The question underneath them is single: are the symbols I actually
 * trade covered, and by what. Splitting that across Overview, a Detail child,
 * Option and a Stock child made the reader navigate a menu to compare two
 * halves of one answer.
 *
 * This is deliberately not the Ops Console's Massive → Coverage tab. That one
 * reports what the plugin holds; this one reports what the watchlist has,
 * which the plugin cannot know.
 */
import { useSearchParams } from 'react-router-dom'
import { PageHeader, PageShell } from '@/components/layout'
import { SegmentControl } from '@/components/data-display'
import { InfoTooltip } from '@/components/ui/InfoTooltip'
import { CoverageOverviewSummaryBody } from '@/pages/settings/coverage/overview/CoverageOverviewSummaryBody'
import { OptionCoverageBody } from '@/pages/settings/coverage/option/OptionCoverageBody'
import { StockIbCoverageBody } from '@/pages/settings/coverage/stock/StockIbCoverageBody'

// Option and Stock lead because they are the two that work. The watchlist
// summary is last and says plainly that it was never finished, rather than
// sitting first and sending the reader to a frontend that no longer exists.
const VIEWS = [
  { value: 'option', label: 'Option', description: 'Daily option pipeline, Greeks and IV coverage, and the plugin’s snapshot tools.' },
  { value: 'stock', label: 'Stock', description: 'Polygon-backed coverage of watchlist stocks and reference indices, with pull and EOD enqueue.' },
  { value: 'watchlist', label: 'Watchlist', description: 'Per-symbol summary across every source. Unfinished — see the note.' },
] as const

type ViewId = (typeof VIEWS)[number]['value']

export default function CoveragePage() {
  const [params, setParams] = useSearchParams()
  const raw = params.get('view')
  const active = VIEWS.find((v) => v.value === raw) ?? VIEWS[0]

  return (
    <PageShell className="space-y-4">
      <PageHeader
        title="Data Coverage"
        description={active.description}
        actions={
          <span className="flex items-center gap-1">
            <SegmentControl
              ariaLabel="Coverage view"
              size="sm"
              value={active.value}
              onChange={(v) =>
                setParams(
                  (prev) => {
                    const next = new URLSearchParams(prev)
                    next.set('view', v as ViewId)
                    return next
                  },
                  { replace: true },
                )
              }
              options={VIEWS.map((v) => ({ value: v.value, label: v.label }))}
            />
            <InfoTooltip text="Coverage of the symbols on your watchlist. The Ops Console reports what the Market Data Plugin holds overall; this reports what your names have." />
          </span>
        }
      />
      {/* Keyed so switching views remounts: each body owns filters and
          selections that belong to it, not to its neighbour. */}
      <div key={active.value}>
        {active.value === 'option' ? <OptionCoverageBody /> : null}
        {active.value === 'stock' ? <StockIbCoverageBody /> : null}
        {active.value === 'watchlist' ? <CoverageOverviewSummaryBody /> : null}
      </div>
    </PageShell>
  )
}
