/**
 * The bench's first row (Rev .96): the portrait's four axes and the week's
 * movement, read live from `journal.memory` (K6). The full story — every
 * memory, its evidence, Forget, sources — is the You page this links to.
 */
import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { fetchMemory, type MemoryAxis } from '@/api/research/journal'
import { ViewState } from '@bifrost/ui'
import { failedDetail } from '@/lib/viewState'
import { cn } from '@/lib/utils'

const AXIS_ORDER = [
  { id: 'hold', label: 'Holding period' },
  { id: 'exit', label: 'Exit' },
  { id: 'risk', label: 'Risk' },
  { id: 'trigger', label: 'Weak spot' },
] as const

export function YouBenchCard() {
  const navigate = useNavigate()
  const memQ = useQuery({
    queryKey: ['research-engine', 'journal', 'memory'],
    queryFn: fetchMemory,
    refetchInterval: 300_000,
    retry: 1,
  })
  const axes = useMemo(() => {
    const byId = new Map<string, MemoryAxis>((memQ.data?.axes ?? []).map((a) => [a.id, a]))
    return AXIS_ORDER.map(({ id, label }) => ({ id, label, a: byId.get(id) ?? null }))
  }, [memQ.data])

  if (memQ.isLoading) return <ViewState kind="loading" title="Reading the memory store" rows={1} cols={4} />
  if (memQ.isError)
    return (
      <ViewState
        kind="failed"
        title="Couldn’t read the memory store"
        detail={failedDetail(memQ, 'journal.memory did not answer.')}
        onAction={() => void memQ.refetch()}
      />
    )
  const n = memQ.data?.memories.length ?? 0
  if (n === 0)
    return (
      <ViewState
        kind="empty"
        title="No memories yet"
        detail="The nightly distill starts from your trail — notes, fills, Inbox decisions, visits."
      />
    )
  return (
    <div className="flex flex-col gap-2 px-3 py-2.5">
      <div className="flex flex-wrap gap-2">
        {axes.map(({ id, label, a }) => (
          <div key={id} className="flex min-w-[10rem] flex-1 flex-col gap-0.5">
            <span className="text-dense-micro text-muted-foreground">{label}</span>
            <span
              className={cn(
                'text-dense-body font-semibold',
                a == null
                  ? 'text-muted-foreground'
                  : a.warn
                    ? 'text-warning'
                    : 'text-foreground',
                a && /\d/.test(a.value) && 'font-mono',
              )}
            >
              {a?.value ?? '—'}
            </span>
            <span className="text-dense-micro text-muted-foreground">
              {a?.sub ?? (id === 'risk' ? 'needs the Trade gate history — owed' : 'not measured yet')}
            </span>
          </div>
        ))}
      </div>
      <div className="flex items-center gap-2 text-dense-meta text-muted-foreground">
        <span>
          {n} memor{n === 1 ? 'y' : 'ies'} · {memQ.data?.week.moved ?? 0} moved this week
        </span>
        <button
          type="button"
          onClick={() => navigate('/research/agent-personas/you')}
          className="ml-auto text-primary hover:underline"
        >
          You →
        </button>
      </div>
    </div>
  )
}
