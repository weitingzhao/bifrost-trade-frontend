import { cn } from '@/lib/utils'

const AGENT_COLORS: Record<string, string> = {
  triage: 'bg-muted text-foreground',
  discovery: 'bg-sky-500/15 text-sky-700 dark:text-sky-300',
  analyze: 'bg-violet-500/15 text-violet-700 dark:text-violet-300',
  validate: 'bg-amber-500/15 text-amber-800 dark:text-amber-200',
  write: 'bg-orange-500/15 text-orange-800 dark:text-orange-200',
  explain: 'bg-teal-500/15 text-teal-800 dark:text-teal-200',
  verdict: 'bg-indigo-500/15 text-indigo-800 dark:text-indigo-200',
}

export function AgentChip({ agent, className }: { agent: string; className?: string }) {
  const key = agent.toLowerCase()
  const label = key.charAt(0).toUpperCase() + key.slice(1)
  return (
    <span
      className={cn(
        'inline-flex items-center rounded px-1.5 py-0.5 text-dense-caption font-medium',
        AGENT_COLORS[key] ?? 'bg-secondary text-secondary-foreground',
        className,
      )}
    >
      {label}
    </span>
  )
}

export function AgentHandoffChip({
  from,
  to,
  className,
}: {
  from: string
  to: string
  className?: string
}) {
  return (
    <div className={cn('flex flex-wrap items-center gap-1 text-dense-caption', className)}>
      <span className="text-muted-foreground">Routed</span>
      <AgentChip agent={from} />
      <span className="text-muted-foreground">→</span>
      <AgentChip agent={to} />
    </div>
  )
}
