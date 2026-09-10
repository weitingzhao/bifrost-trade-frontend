import { useState } from 'react'
import { ChevronDown, ChevronRight } from 'lucide-react'
import { DenseTag } from '@/components/data-display'
import { useUniverseReach } from '@/hooks/useUniverseReach'
import { fmtInt } from '@/lib/format'

/**
 * How much of the warehouse the Loop can actually see.
 *
 * The Loop proposes from the scan snapshot, whose universe is assembled from
 * option-derived feature tables — so it is bounded by the option footprint, not
 * by how many symbols were bought. Without this strip that gap is invisible: the
 * run says `scan`, and you have to query the warehouse to learn it means 28.
 */
/**
 * What each layer is, in the reader's terms. The strip's numbers are five
 * different populations and read as one funnel; this says which population
 * each one counts and why the last chip is the one that matters.
 */
const LAYER_MEANING: Record<string, string> = {
  daily_bars: 'Every symbol with a priced daily bar in the warehouse — the widest set, bought or derived.',
  financials: 'Symbols with fundamentals loaded; SEPA needs these to grade a name.',
  sepa: 'Symbols the SEPA pipeline could grade today — the stock-first universe the loop screens.',
  scan: 'Symbols in the option scan snapshot — bounded by how many names have option data, not by how many were bought.',
  option_bars: 'Symbols with option bars ingested; the ceiling for any option-lens objective.',
}

export function UniverseReachStrip() {
  const { data, isLoading, isError } = useUniverseReach()
  const [open, setOpen] = useState(false)

  if (isLoading) {
    return (
      <div className="text-dense-meta text-muted-foreground">Universe reach — loading…</div>
    )
  }
  if (isError || !data) {
    return (
      <div className="text-dense-meta text-muted-foreground">
        Universe reach — unavailable
      </div>
    )
  }

  const pct = data.loop_pct_of_widest
  // Name the mode: 0.19% and 23.4% are both true, of different modes.
  const modes = data.universe_modes?.length ? data.universe_modes.join(' + ') : null

  // A layer with no count says the same nothing as the layer beside it. Rendered
  // one chip each, five of them plus the reach chip spent a whole row of a dense
  // page repeating "not measured" six times. Show the layers that have a number
  // as the funnel they are, and summarise the rest in one chip. The disclosure
  // below still names every layer and its status.
  const measured = data.layers.filter((l) => l.symbols != null)
  const unmeasured = data.layers.length - measured.length

  return (
    <div className="rounded-md border border-border/60 bg-secondary/50 px-3 py-2">
    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
      <button
        type="button"
        className="inline-flex items-center gap-1 text-dense-label font-medium hover:underline"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        title="What these numbers count"
      >
        {open ? <ChevronDown className="size-3" /> : <ChevronRight className="size-3" />}
        Universe reach
      </button>
      {measured.map((layer, i) => (
        <span key={layer.key} className="flex items-center gap-2">
          {i > 0 ? <span className="text-muted-foreground/50">→</span> : null}
          <span className="text-dense-meta text-muted-foreground" title={layer.table}>
            {layer.label}
          </span>
          <DenseTag variant={layer.status === 'ok' ? 'neutral' : 'warning'} size="cell">
            {fmtInt(layer.symbols as number)}
          </DenseTag>
        </span>
      ))}
      {unmeasured > 0 ? (
        <DenseTag
          variant="warning"
          size="cell"
          title={`Counts unavailable: ${data.layers
            .filter((l) => l.symbols == null)
            .map((l) => l.label)
            .join(', ')}. Open the strip for what each one counts.`}
        >
          {measured.length === 0
            ? `${unmeasured} layers not measured`
            : `+${unmeasured} not measured`}
        </DenseTag>
      ) : null}
      {pct != null ? (
        // The modes moved into the tooltip: spelled out, this chip was long
        // enough to wrap onto its own line, so a strip meant to be one line was
        // two — and the second one restated the first.
        <DenseTag
          variant={pct < 1 ? 'warning' : 'category'}
          size="cell"
          title={
            modes
              ? `Loop universe modes: ${modes}. Percentage is of the widest priced-symbol layer.`
              : 'Percentage is of the widest priced-symbol layer.'
          }
        >
          Loop sees {pct}%
        </DenseTag>
      ) : unmeasured === 0 ? (
        <DenseTag variant="warning" size="cell">
          reach not measured
        </DenseTag>
      ) : null}
    </div>
    {open ? (
      <div className="mt-2 grid gap-1.5 border-t border-border/40 pt-2 text-dense-label leading-relaxed text-muted-foreground md:grid-cols-2">
        <p className="md:col-span-2">
          Five populations, not one funnel. Each chip counts how many symbols a layer of the warehouse
          covers today. The loop can only propose from what its objective's universe mode reads:
          a stock-first objective screens the SEPA layer, an option-lens objective the scan snapshot.
          {pct != null ? (
            <>
              {' '}
              <span className="text-foreground">Loop sees {pct}%</span> is the loop's own universe as a share
              of the widest priced layer{modes ? ` (${modes})` : ''}. A low figure means the objective's
              instrument is thinly covered, not that the screen is strict.
            </>
          ) : null}
        </p>
        {data.layers.map((layer) => (
          <p key={layer.key}>
            <span className="text-foreground">{layer.label}</span>
            {layer.symbols != null ? ` · ${fmtInt(layer.symbols)}` : ' · not measured'}
            {LAYER_MEANING[layer.key] ? ` — ${LAYER_MEANING[layer.key]}` : ''}
            {layer.status !== 'ok' ? ` (${layer.status})` : ''}
          </p>
        ))}
      </div>
    ) : null}
    </div>
  )
}
