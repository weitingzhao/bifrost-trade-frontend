import { DenseTag } from '@/components/data-display'
import { cn } from '@/lib/utils'

/**
 * Which agent produced a thing.
 *
 * It used to be seven hues — sky, violet, amber, orange, teal, indigo — one
 * per agent. Contract §7 cancels category colour: the accent channel carries
 * one emphasis per screen and that emphasis now belongs to the layer, so a
 * taxonomy competing for it makes the screen say two things at once. One of
 * the seven was teal, which since `0503be6` means a profit — a category badge
 * was reading in the direction channel.
 *
 * The name is the distinction. `DenseTag`'s `category` variant is where this
 * codebase puts a taxonomy that is not a state.
 */
export function AgentChip({ agent, className }: { agent: string; className?: string }) {
  const key = agent.trim()
  const label = key.charAt(0).toUpperCase() + key.slice(1).toLowerCase()
  return (
    <DenseTag variant="category" className={className}>
      {label}
    </DenseTag>
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
