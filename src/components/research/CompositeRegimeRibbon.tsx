/**
 * Composite regime ribbon — Wave 17, registry-driven since A5.
 * Aggregated exhibit lamps (or explicit lenses override) linking to Analyze routes.
 * Labels and routes come from the lens registry; the lens set is the five hubs' lenses.
 */
import { Link } from 'react-router-dom'
import { flowHref, labHref, withSymbolParam } from '@/lib/analyzeHubs'
import { useQuery } from '@tanstack/react-query'
import { StatusLamp } from '@/components/StatusLamp'
import type { LampColor } from '@/lib/researchFreshness'
import { researchEngineUrl } from '@/lib/devApiUrl'
import { useLensRegistry } from '@/hooks/useLensRegistry'
import { cn } from '@/lib/utils'

export interface RegimeLensItem {
  id: string
  label: string
  href: string
  lamp: LampColor
}

export interface CompositeRegimeRibbonProps {
  symbol: string
  lenses?: RegimeLensItem[]
  className?: string
}

interface ExhibitItem {
  lens: string
  freshness: string
  as_of?: string | null
  verdict?: { band?: string | null } | null
}

/** The ribbon's lenses — one per hub, in reading order. `terrain` is the registry's terrain_regime. */
export const RIBBON_LENSES = ['iv_rank', 'vrp', 'skew', 'gex_regime', 'opex_pin', 'terrain'] as const

// Fallback names when the registry has not loaded; the registry wins once it has.
const LENS_ROUTES: Record<string, string> = {
  vrp: '/research/vol-regime?view=vrp',
  iv_rank: '/research/vol-regime?view=iv-rank',
  skew: '/research/vol-regime?view=skew',
  gex_regime: '/research/dealer-levels?view=gex',
  opex_pin: '/research/dealer-levels?view=opex',
  terrain: '/research/scenario?view=model',
  terrain_regime: '/research/scenario?view=model',
  order_sentiment: '/research/flow',
}

const LENS_LABELS: Record<string, string> = {
  vrp: 'VRP',
  iv_rank: 'IV Rank',
  skew: 'Skew',
  gex_regime: 'Gamma',
  opex_pin: 'OpEx pin',
  terrain: 'Terrain',
  terrain_regime: 'Terrain',
  order_sentiment: 'Sentiment',
}

const BAND_SHORT: Record<string, string> = {
  hot: 'hot',
  lean_hot: 'lean hot',
  neutral: 'neutral',
  lean_cold: 'lean cold',
  cold: 'cold',
}

function lampFromFreshness(freshness: string): LampColor {
  if (freshness === 'fresh') return 'green'
  if (freshness === 'stale') return 'yellow'
  return 'red'
}

const FALLBACK_LENSES = (symbol: string): RegimeLensItem[] => [
  { id: 'vrp', label: 'VRP', href: labHref('vrp', symbol), lamp: 'yellow' },
  { id: 'iv_rank', label: 'IV Rank', href: labHref('iv-rank', symbol), lamp: 'yellow' },
  { id: 'terrain', label: 'Terrain', href: labHref('model', symbol), lamp: 'yellow' },
  { id: 'order_sentiment', label: 'Sentiment', href: flowHref(symbol), lamp: 'yellow' },
]

async function fetchComposite(symbol: string): Promise<ExhibitItem[]> {
  const q = new URLSearchParams({ symbol, lenses: RIBBON_LENSES.join(',') })
  const r = await fetch(researchEngineUrl(`/research/exhibit/composite?${q}`))
  if (!r.ok) throw new Error(`exhibit composite HTTP ${r.status}`)
  const body = (await r.json()) as { ok: boolean; data: { exhibits: ExhibitItem[] } }
  if (!body.ok) throw new Error('exhibit composite failed')
  return body.data.exhibits ?? []
}

export function CompositeRegimeRibbon({
  symbol,
  lenses,
  className,
}: CompositeRegimeRibbonProps) {
  const sym = symbol.trim().toUpperCase()
  const registry = useLensRegistry()
  const q = useQuery({
    queryKey: ['research', 'exhibit-composite', sym, RIBBON_LENSES.join(',')],
    queryFn: () => fetchComposite(sym),
    enabled: !lenses && sym.length > 0,
    staleTime: 60_000,
  })

  const specOf = (lensId: string) => {
    const canonical = lensId === 'terrain' ? 'terrain_regime' : lensId
    return registry.data?.lenses.find((l) => l.id === canonical)
  }

  const items: RegimeLensItem[] =
    lenses ??
    (q.data && q.data.length > 0
      ? q.data.map((ex) => {
          const spec = specOf(ex.lens)
          const band = ex.verdict?.band ? BAND_SHORT[ex.verdict.band] ?? ex.verdict.band : null
          const label = spec?.label ?? LENS_LABELS[ex.lens] ?? ex.lens
          return {
            id: ex.lens,
            label: band ? `${label} ${band}` : label,
            href: withSymbolParam(spec?.page_route ?? LENS_ROUTES[ex.lens] ?? '/research', sym),
            lamp: lampFromFreshness(ex.freshness),
          }
        })
      : FALLBACK_LENSES(sym))

  return (
    <div
      className={cn(
        'flex flex-wrap items-center gap-x-3 gap-y-1 rounded-md border border-border bg-secondary/40 px-2.5 py-1.5',
        className,
      )}
    >
      <span className="text-dense-micro font-semibold uppercase tracking-wide text-muted-foreground">
        {sym || '—'} regime
      </span>
      {!lenses && q.isLoading ? (
        <span className="text-dense-caption text-muted-foreground">Loading exhibits…</span>
      ) : (
        items.map((lens) => (
          <Link
            key={lens.id}
            to={lens.href}
            className="inline-flex items-center gap-1.5 text-dense-meta text-foreground hover:underline"
          >
            <StatusLamp lamp={lens.lamp} className="h-2 w-2" />
            {lens.label}
          </Link>
        ))
      )}
    </div>
  )
}
