import { Link } from 'react-router-dom'
import { ExternalLink } from 'lucide-react'
import { labPathForTool } from '@/lib/cockpit/modelCatalog'
import { cn } from '@/lib/utils'

export function CopilotSourceLink({
  toolName,
  symbol,
  className,
}: {
  toolName: string
  symbol?: string
  className?: string
}) {
  const path = labPathForTool(toolName, symbol)
  if (!path) {
    return (
      <span className={cn('text-dense-caption text-muted-foreground font-mono', className)}>
        {toolName}
      </span>
    )
  }

  return (
    <Link
      to={path}
      className={cn(
        'inline-flex items-center gap-0.5 rounded border border-border/60 bg-secondary/60',
        'px-1.5 py-0.5 text-dense-caption text-entity-symbol hover:bg-secondary',
        className,
      )}
      title={`Open ${toolName}`}
    >
      <span className="max-w-[160px] truncate font-mono">{toolName.replace(/^research\./, '')}</span>
      <ExternalLink className="size-2.5 shrink-0 opacity-70" />
    </Link>
  )
}
