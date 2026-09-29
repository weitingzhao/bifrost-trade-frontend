/**
 * One strategy instance (design Rev .103, `Instance.dc.html`): `/instance/:id`,
 * top level and outside every menu — reached only from a `#NNN`.
 *
 * The same component is the Instance surface. In the 440 panel (or any
 * surface ≤ 640 wide) it is the shared record's compact face; wider, it is the
 * page. The surface hands it the id and the rows it came from; the page reads
 * them from its address (`?list=&from=`). ‹ › and [ ] step that list — in
 * place on the surface, by address on the page.
 */
import { useEffect, useRef } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { PageShell } from '@/components/layout'
import { PageHead } from '@/components/layout/PageHead'
import { TradeRecord } from '@/components/tradeRecord/TradeRecord'
import { useAllocations, useGateSafety, useStrategyInstance } from '@/hooks/useStrategies'
import { useContainerWidth } from '@/hooks/useContainerWidth'
import { useInSurface } from '@/lib/surfaceScope'
import { tradePath, setSurfaceTrade, type Surface } from '@/layout/equipSurface'
import { ranUnderOf } from '@/utils/tradeRecord/ranUnder'
import { TradeWide } from './TradeWide'

const COMPACT_MAX_PX = 640

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
  const rootRef = useRef<HTMLDivElement>(null)
  const width = useContainerWidth(rootRef, 1200)

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

  const q = useStrategyInstance(id, id != null)
  const allocations = useAllocations()
  const gates = useGateSafety()
  const inst = q.data ?? null
  const compact = inSurface && width <= COMPACT_MAX_PX

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
        ref={rootRef}
        className="min-h-0"
        onKeyDown={(e) => {
          if (editable(e.target) || e.metaKey || e.ctrlKey || e.altKey) return
          if (e.key === '[' || e.key === ']') step(e.key === '[' ? -1 : 1)
        }}
      >
        {inst ? (
          <TradeRecord
            key={inst.strategy_instance_id}
            instance={inst}
            mode="panel"
            title={`#${inst.strategy_instance_id}${inst.label?.trim() ? ` · ${inst.label.trim()}` : ''}`}
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
    <div ref={rootRef} className="min-w-0">
      <PageShell padding="compact" className="space-y-3">
        {inst ? (
          <TradeWide
            instance={inst}
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
