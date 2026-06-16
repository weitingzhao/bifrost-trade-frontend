import { cn } from '@/lib/utils'
import chartStyles from '../discoveryCharts.module.css'

export const discoveryRootClass = chartStyles.discoveryRoot

export const discoverySectionHintClass = 'text-sm text-muted-foreground'

export const discoveryChainScopeClass = 'space-y-3'

export const discoveryFullChainClass = 'space-y-3'

export const discoveryViewScopeClass = 'space-y-3'

export const discoveryViewScopeHintClass = 'option-discovery-view-scope-hint'

export function discoveryFeedbackBoxClass(level: 'error' | 'warning' | 'info'): string {
  if (level === 'error') {
    return cn(
      'mb-3 rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive',
    )
  }
  if (level === 'warning') {
    return cn(
      'mb-3 rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-800 dark:text-amber-200',
    )
  }
  return cn('mb-3 rounded-lg border border-border bg-muted/50 px-3 py-2 text-sm text-muted-foreground')
}
