/**
 * Composite regime ribbon — Wave 17.
 * Aggregated exhibit lamps (or explicit lenses override) linking to Analyze routes.
 */
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { StatusLamp } from '@/components/StatusLamp'
import type { LampColor } from '@/lib/researchFreshness'
import { researchEngineUrl } from '@/lib/devApiUrl'
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
}

const LENS_ROUTES: Record<string, string> = {
  vrp: '/research/vrp-lab',
  iv_rank: '/research/iv-radar',
  terrain: '/research/analysis-model',
  order_sentiment: '/research/order-sentiment',
}

const LENS_LABELS: Record<string, string> = {
  vrp: 'VRP',
  iv_rank: 'IV Rank',
  terrain: 'Terrain',
  order_sentiment: 'Sentiment',
}

function lampFromFreshness(freshness: string): LampColor {
  if (freshness === 'fresh') return 'green'
  if (freshness === 'stale') return 'yellow'
  return 'red'
}

const FALLBACK_LENSES = (symbol: string): RegimeLensItem[] => {
  const q = symbol ? `?symbol=${encodeURIComponent(symbol)}` : ''
  return [
    { id: 'vrp', label: 'VRP', href: `/research/vrp-lab${q}`, lamp: 'yellow' },
    { id: 'iv_rank', label: 'IV Rank', href: `/research/iv-radar${q}`, lamp: 'yellow' },
    { id: 'terrain', label: 'Terrain', href: `/research/analysis-model${q}`, lamp: 'yellow' },
    {
      id: 'order_sentiment',
      label: 'Sentiment',
      href: `/research/order-sentiment${q}`,
      lamp: 'yellow',
    },
  ]
}

async function fetchComposite(symbol: string): Promise<ExhibitItem[]> {
  const q = new URLSearchParams({ symbol })
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
  const q = useQuery({
    queryKey: ['research', 'exhibit-composite', sym],
    queryFn: () => fetchComposite(sym),
    enabled: !lenses && sym.length > 0,
    staleTime: 60_000,
  })

  const items: RegimeLensItem[] =
    lenses ??
    (q.data && q.data.length > 0
      ? q.data.map((ex) => ({
          id: ex.lens,
          label: LENS_LABELS[ex.lens] ?? ex.lens,
          href: `${LENS_ROUTES[ex.lens] ?? '/research'}?symbol=${encodeURIComponent(sym)}`,
          lamp: lampFromFreshness(ex.freshness),
        }))
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
