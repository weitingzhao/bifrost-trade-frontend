import { Link } from 'react-router-dom'
import { ExternalLink } from 'lucide-react'
import { useResearchContext } from '@/hooks/useResearchContext'
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
  const { symbol: contextSymbol } = useResearchContext()
  const path = labPathForTool(toolName, symbol ?? contextSymbol)
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
        'mat-btn inline-flex items-center gap-0.5 border',
        'px-1.5 py-0.5 text-dense-caption text-entity-symbol',
        className,
      )}
      title={`Open ${toolName}`}
    >
      <span className="max-w-[160px] truncate font-mono">{toolName.replace(/^research\./, '')}</span>
      <ExternalLink className="size-2.5 shrink-0 opacity-70" />
    </Link>
  )
}
