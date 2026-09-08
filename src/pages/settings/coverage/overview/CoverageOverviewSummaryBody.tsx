import { Link } from 'react-router-dom'
import { EmptyState } from '@/components/data-display'

const OPS_CONSOLE_URL = import.meta.env.VITE_OPS_CONSOLE_URL ?? 'http://127.0.0.1:5180'

/**
 * The watchlist summary was never finished, and said so by pointing at the
 * Legacy Frontend — which spine D8 archived and removed. An instruction to
 * open something that no longer exists is worse than an empty page, so this
 * says what is true and where the question is answered today.
 *
 * The parts are written: `DataOverviewWatchlistStocks`,
 * `DataOverviewWatchlistOptions`, `OptionWatchlistMatrix` and
 * `WatchlistSummaryTables` are about 1,100 lines under this directory with no
 * consumer. What is missing is the container that fetches watchlist rows and
 * holds the gap / compare-pool state they take as props.
 */
export function CoverageOverviewSummaryBody() {
  return (
    <EmptyState
      title="Watchlist summary was never finished"
      description="It pointed at the Legacy Frontend, which was archived under spine D8. The Option and Stock views on this page do work. For plugin-wide coverage use the Ops Console; for how much of the warehouse the research loop can see, use Universe reach on the Research overview."
      action={
        <span className="flex flex-wrap items-center justify-center gap-3 text-dense-label">
          <Link to="/settings/coverage?view=option" className="hover:underline">
            Option coverage
          </Link>
          <Link to="/settings/coverage?view=stock" className="hover:underline">
            Stock coverage
          </Link>
          <Link to="/research/overview" className="hover:underline">
            Universe reach
          </Link>
          <a href={`${OPS_CONSOLE_URL}/#market-data-manage`} target="_blank" rel="noreferrer" className="hover:underline">
            Ops Console · Massive
          </a>
        </span>
      }
    />
  )
}
