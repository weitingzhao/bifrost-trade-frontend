import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

export function EnvBadge({
  profile,
  ok,
  compact,
  className,
}: {
  profile?: 'dev' | 'prod'
  ok: boolean | null
  /** Shorter label for tight layouts (e.g. service health cards). */
  compact?: boolean
  className?: string
}) {
  const badgeClass = cn('shrink-0', className)

  if (profile === 'dev') {
    return (
      <Badge
        variant="outline"
        title={compact ? 'Development' : undefined}
        className={cn(
          badgeClass,
          'border-sky-500/40 bg-sky-500/10 text-sky-500 hover:bg-sky-500/15 dark:text-sky-400',
        )}
      >
        {compact ? 'Dev' : 'Development'}
      </Badge>
    )
  }
  if (profile === 'prod') {
    return (
      <Badge
        variant="outline"
        title={compact ? 'Production' : undefined}
        className={cn(
          badgeClass,
          'border-green-600/40 bg-green-600/10 text-green-600 hover:bg-green-600/15 dark:text-green-400',
        )}
      >
        {compact ? 'Prod' : 'Production'}
      </Badge>
    )
  }
  if (ok === true) return <Badge variant="outline" className={badgeClass}>Custom</Badge>
  if (ok === false) {
    return (
      <Badge variant="outline" className={cn(badgeClass, 'text-muted-foreground')}>
        Unknown
      </Badge>
    )
  }
  return null
}
