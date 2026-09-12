/**
 * Composite regime row — Wave 17, registry-driven since A5, one row since the
 * Analyze pass of 2026-09-08.
 *
 * The symbol's live exhibit verdicts, one tag per hub lens: the band decides
 * the colour, the lab's own words are the text, the exhibit's `means`
 * sentence is the tooltip and reads inline for the lens of the lab you are
 * on. The lamp is freshness. Each tag links to the lab that decided it;
 * labels and routes come from the lens registry.
 */
import { Link } from 'react-router-dom'
import { DenseTag } from '@/components/data-display'
import { StatusLamp } from '@/components/StatusLamp'
import { useExhibitComposite } from '@/hooks/useExhibitComposite'
import { useLensRegistry } from '@/hooks/useLensRegistry'
import { ANALYZE_HUB } from '@/lib/analyzeHubs'
import { withSymbolParam } from '@/lib/symbolLink'
import { canonicalLens, placeholderExhibits, regimeItems, RIBBON_LENSES } from '@/lib/regimeRibbon'
import { cn } from '@/lib/utils'

export type { RegimeLensItem } from '@/lib/regimeRibbon'

export interface CompositeRegimeRibbonProps {
  symbol: string
  /** The registry lens of the lab showing the row; its `means` reads inline. */
  activeLens?: string
  className?: string
}

export function CompositeRegimeRibbon({
  symbol,
  activeLens,
  className,
}: CompositeRegimeRibbonProps) {
  const sym = symbol.trim().toUpperCase()
  const registry = useLensRegistry()
  const q = useExhibitComposite(RIBBON_LENSES, sym)
  const specOf = (canonical: string) => registry.data?.lenses.find((l) => l.id === canonical)
  // No exhibits yet (or none at all): every lens with no reading, lamp amber.
  const exhibits = q.data && q.data.length > 0 ? q.data : placeholderExhibits()
  const items = regimeItems(exhibits, sym, specOf)
  const activeId = activeLens
    ? items.find((it) => canonicalLens(it.id) === canonicalLens(activeLens))?.id
    : undefined
  const active = items.find((it) => it.id === activeId)
  return (
    <div
      className={cn(
        'flex flex-wrap items-center gap-x-2 gap-y-1 rounded-md border border-border bg-secondary/40 px-2.5 py-1.5',
        className
      )}
      data-testid="composite-regime-ribbon"
    >
      <Link
        to={withSymbolParam(ANALYZE_HUB.dossier, sym)}
        title="Open the dossier — every face of this symbol"
        className="text-dense-micro font-semibold uppercase tracking-wide text-muted-foreground no-underline hover:text-foreground"
      >
        {`${sym || '—'} regime`}
      </Link>
      {q.isLoading ? (
        <span className="text-dense-caption text-muted-foreground">Loading exhibits…</span>
      ) : (
        items.map((it) => (
          <Link
            key={it.id}
            to={it.href}
            title={`${it.means ?? 'No reading yet'}${it.asOf ? ` · as of ${it.asOf}` : ''}`}
            aria-current={it.id === activeId ? 'page' : undefined}
            className={cn(
              'inline-flex items-center gap-1 rounded no-underline',
              it.id === activeId && 'ring-1 ring-primary/40'
            )}
          >
            <StatusLamp lamp={it.lamp} className="h-2 w-2" />
            <DenseTag variant={it.tone} size="cell">
              {`${it.label} · ${it.verdict}`}
            </DenseTag>
          </Link>
        ))
      )}
      {active?.means ? (
        <span className="text-dense-micro text-muted-foreground">{active.means}</span>
      ) : null}
    </div>
  )
}
