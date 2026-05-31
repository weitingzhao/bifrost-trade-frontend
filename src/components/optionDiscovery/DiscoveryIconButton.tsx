import type { ComponentProps } from 'react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

/** Icon toolbar control (replaces legacy `.section-header-icon-btn`). */
export function DiscoveryIconButton({ className, ...props }: ComponentProps<typeof Button>) {
  return (
    <Button
      type="button"
      variant="outline"
      size="icon"
      className={cn(
        'size-8 shrink-0 rounded-lg border-border bg-secondary text-muted-foreground',
        'hover:bg-accent/10 hover:border-primary/40 hover:text-primary',
        className,
      )}
      {...props}
    />
  )
}
