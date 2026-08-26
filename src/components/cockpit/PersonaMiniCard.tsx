import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { Pencil } from 'lucide-react'
import { fetchAgentPersonas, type AgentPersona } from '@/api/agentPersona'
import { agentLabel } from '@/lib/copilot/agentPersonaCatalog'
import { DenseTag } from '@/components/data-display'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

function firstLine(md: string): string {
  const line = md.split('\n').find((l) => l.trim() && !l.startsWith('#'))
  return (line ?? md.split('\n')[0] ?? '').replace(/^#+\s*/, '').trim()
}

export function PersonaMiniCard({ className }: { className?: string }) {
  const { data, isLoading } = useQuery({
    queryKey: ['agent-personas'],
    queryFn: fetchAgentPersonas,
    staleTime: 60_000,
  })

  if (isLoading) {
    return (
      <p className={cn('text-dense-meta text-muted-foreground', className)}>
        Loading trading personas…
      </p>
    )
  }

  const agents = data ?? []

  return (
    <div
      className={cn(
        'rounded-md border border-border/60 bg-secondary/30 px-2.5 py-2 space-y-2',
        className,
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <p className="text-dense-label font-medium">My trading personas</p>
        <Button variant="ghost" size="sm" className="h-7 gap-1 text-dense-meta" asChild>
          <Link to="/research/agent-personas">
            <Pencil className="size-3.5" />
            Edit
          </Link>
        </Button>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {agents.map((p: AgentPersona) => (
          <DenseTag
            key={p.agent_name}
            variant="category"
            size="cell"
            title={firstLine(p.persona_md)}
          >
            {agentLabel(p.agent_name, 'zh', p.label)}: {firstLine(p.persona_md).slice(0, 36)}
            {firstLine(p.persona_md).length > 36 ? '…' : ''}
          </DenseTag>
        ))}
      </div>
    </div>
  )
}

export function personaVersionLabel(updatedAt?: string): string | null {
  if (!updatedAt) return null
  const d = new Date(updatedAt)
  if (Number.isNaN(d.getTime())) return null
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}
