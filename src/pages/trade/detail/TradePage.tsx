/**
 * One trade (design Rev .103, `Trade.dc.html` since Rev .111): `/trade/:id`,
 * top level and outside every menu — reached only from a `#NNN`.
 *
 * The same component is the Instance surface. Inside a surface (the panel or
 * the float — `useInSurface()`, the context behind `data-sr-embed`) it is the
 * shared record's compact face; as the route it is the page. The verdict is
 * the embed, not a width (design Rev .175, DESIGN_CONTRACTS §18.2): a surface
 * has no page shell for the whole page to sit in, so a panel dragged to its
 * 600–640 maximum is still the compact face. (It used to read "surface ≤ 640
 * wide", which the panel's 640 cap made the same thing.) The surface hands it
 * the id and the rows it came from; the page reads them from its address
 * (`?list=&from=`). ‹ › and [ ] step that list — in place on the surface, by
 * address on the page.
 */
import { useEffect, useRef } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { PageShell } from '@/components/layout'
import { PageHead } from '@/components/layout/PageHead'
import { TradeRecord } from '@/components/tradeRecord/TradeRecord'
import { useAllocations, useGateSets, useTrade } from '@/hooks/useStrategies'
import { useInSurface } from '@/lib/surfaceScope'
import { tradePath, setSurfaceTrade, type Surface } from '@/layout/equipSurface'
import { ranUnderOf } from '@/utils/tradeRecord/ranUnder'
import { TradeWide } from './TradeWide'

const editable = (t: EventTarget | null) =>
  t instanceof HTMLElement && (/^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName) || t.isContentEditable)

/** The route's page: the address carries the id and the list. */
export default function TradePage() {
  return <TradeView />
}

/** The page and the surface body — the surface hands over what the address would. */
export function TradeView({ surface }: { surface?: Surface }) {
  const params = useParams()
  const [search] = useSearchParams()
  const navigate = useNavigate()
  const inSurface = useInSurface()

  const id = surface?.trade ?? (Number(params.id) || null)
  const list =
    surface?.tradeList ??
    (search.get('list') ?? '')
      .split(',')
      .map(Number)
      .filter((x) => Number.isFinite(x) && x > 0)
  const from = surface?.tradeFrom ?? search.get('from') ?? ''
  const j = id != null ? list.indexOf(id) : -1
  const hasList = list.length > 1 && j >= 0
  const step = (k: -1 | 1) => {
    const next = hasList ? list[j + k] : undefined
    if (next == null) return
    if (surface) setSurfaceTrade(surface.key, next)
    else navigate(tradePath(next, list, from), { replace: true })
  }
  const stepRef = useRef(step)
  useEffect(() => {
    stepRef.current = step
  })

  const q = useTrade(id, id != null)
  const allocations = useAllocations()
  const gates = useGateSets()
  const inst = q.data ?? null
  // The embed decides (§18.2 Rev .175), not the surface's width.
  const compact = inSurface

  // The page steps on [ ] anywhere; a surface only while focus is inside it,
  // so the page behind keeps its own keys.
  useEffect(() => {
    if (surface) return
    const onKey = (e: KeyboardEvent) => {
      if (editable(e.target) || e.metaKey || e.ctrlKey || e.altKey) return
      if (e.key === '[' || e.key === ']') stepRef.current(e.key === '[' ? -1 : 1)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [surface])

  const missing = id == null || (!q.isLoading && !q.isFetching && inst == null)
  const pos = hasList ? `${j + 1} / ${list.length}` : undefined
  const ranUnder = inst
    ? ranUnderOf(inst.strategy_opportunity_id, allocations.data?.items ?? [], gates.data?.items ?? [])
    : null

  if (compact) {
    return (
      <div
        className="min-h-0"
        onKeyDown={(e) => {
          if (editable(e.target) || e.metaKey || e.ctrlKey || e.altKey) return
          if (e.key === '[' || e.key === ']') step(e.key === '[' ? -1 : 1)
        }}
      >
        {inst ? (
          <TradeRecord
            key={inst.trade_id}
            trade={inst}
            mode="panel"
            title={`#${inst.trade_id}${inst.label?.trim() ? ` · ${inst.label.trim()}` : ''}`}
            opportunity={inst.strategy_opportunity_name ?? '—'}
            structure={inst.strategy_structure_name ?? '—'}
            pos={pos}
            from={from || undefined}
            list={hasList ? list : undefined}
            onPrev={hasList && j > 0 ? () => step(-1) : undefined}
            onNext={hasList && j < list.length - 1 ? () => step(1) : undefined}
            ranUnder={
              ranUnder
                ? {
                    ...ranUnder,
                    onOpp: () => navigate(`/trade/rules?pick=opportunity:${inst.strategy_opportunity_id}`),
                  }
                : undefined
            }
          />
        ) : (
          <TradeMissing id={id} loading={!missing} />
        )}
      </div>
    )
  }

  return (
    <div className="min-w-0">
      <PageShell padding="compact" className="space-y-3">
        {inst ? (
          <TradeWide
            trade={inst}
            list={hasList ? list : undefined}
            from={from}
            pos={pos}
            onPrev={hasList && j > 0 ? () => step(-1) : undefined}
            onNext={hasList && j < list.length - 1 ? () => step(1) : undefined}
            ranUnder={ranUnder}
          />
        ) : (
          <>
            <PageHead title={id != null ? `Trade #${id}` : 'Trade'} />
            <TradeMissing id={id} loading={!missing} />
          </>
        )}
      </PageShell>
    </div>
  )
}

function TradeMissing({ id, loading }: { id: number | null; loading: boolean }) {
  if (loading) return <p className="m-0 p-4 text-dense-meta text-muted-foreground">Reading #{id}…</p>
  return (
    <div className="flex flex-col gap-1 p-4">
      <span className="text-dense-body font-semibold">{id != null ? `No trade #${id} in the book` : 'No trade named'}</span>
      <span className="text-dense-meta text-muted-foreground text-pretty">
        {id != null
          ? 'The rulebook has no trade with this number — it may have been deleted with nothing linked to it. Trading › Rules lists every trade that exists.'
          : 'This page opens from a trade token (#NNN) on any page.'}
      </span>
    </div>
  )
}
