/**
 * The order sheet's one quiet line (design Rev .96, Spec §20.6): a memory
 * that names this trade's situation — today the weak-spot memory when its
 * name matches the plan's symbol. "Not relevant" counts in the store (the
 * You page shows the count); past the threshold the server marks the hint
 * quiet and this line stops offering it.
 *
 * Owed contexts, by name: the earnings-proximity and first-visit-today
 * triggers the prototype carries need context this form does not read yet.
 */
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation, useQuery } from '@tanstack/react-query'
import { dismissMemoryHint, fetchMemoryHint } from '@/api/research/journal'

export function MemoryHintLine({ symbol }: { symbol: string }) {
  const navigate = useNavigate()
  const sym = symbol.trim().toUpperCase()
  const [hidden, setHidden] = useState<Record<string, boolean>>({})
  const hintQ = useQuery({
    queryKey: ['research-engine', 'journal', 'memory-hint', sym],
    queryFn: () => fetchMemoryHint(sym),
    enabled: sym.length > 0,
    staleTime: 300_000,
    retry: 1,
  })
  const dismiss = useMutation({ mutationFn: (topic: string) => dismissMemoryHint(topic) })

  const hint = hintQ.data?.hint
  if (!sym || hintQ.isLoading || hintQ.isError || !hint || hint.quiet || hidden[`${hint.topic}:${sym}`])
    return null

  return (
    <div className="flex flex-col gap-1 rounded-lg bg-[color-mix(in_srgb,var(--sk-warn)_7%,transparent)] px-2.5 py-2">
      <span className="flex items-baseline gap-1.5 text-dense-micro text-muted-foreground">
        <span>From your memory</span>
        <span className="font-mono">{hint.id}</span>
        <span>{hint.kind === 'tension' ? 'said vs did' : hint.kind}</span>
        <button
          type="button"
          onClick={() => navigate(`/research/agent-personas/you?m=${hint.id}`)}
          className="ml-auto text-primary hover:underline"
        >
          Why?
        </button>
        <button
          type="button"
          onClick={() => {
            setHidden((prev) => ({ ...prev, [`${hint.topic}:${sym}`]: true }))
            dismiss.mutate(hint.topic)
          }}
          className="text-muted-foreground hover:text-foreground"
        >
          Not relevant
        </button>
      </span>
      <span className="text-dense-meta leading-snug text-muted-foreground text-pretty">
        {hint.text}
      </span>
    </div>
  )
}
