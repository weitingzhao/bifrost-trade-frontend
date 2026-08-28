import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { fetchAgentPersonas } from '@/api/agentPersona'
import { AGENT_LABELS_EN } from '@/lib/copilot/agentPersonaCatalog'
import { cn } from '@/lib/utils'

const PERSONA_TOTAL = Object.keys(AGENT_LABELS_EN).length

export function PersonaMiniCard({ className }: { className?: string }) {
  const { data, isLoading } = useQuery({
    queryKey: ['agent-personas'],
    queryFn: fetchAgentPersonas,
    staleTime: 60_000,
  })

  const customized = (data ?? []).filter((p) => !p.seeded).length

  return (
    <p className={cn('text-center text-dense-caption text-muted-foreground', className)}>
      Personas:{' '}
      {isLoading ? '…' : `${customized}/${PERSONA_TOTAL}`} customized
      {' · '}
      <Link
        to="/research/agent-personas"
        className="text-primary hover:underline"
      >
        Personalize
      </Link>
    </p>
  )
}

export function personaVersionLabel(updatedAt?: string): string | null {
  if (!updatedAt) return null
  const d = new Date(updatedAt)
  if (Number.isNaN(d.getTime())) return null
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}
