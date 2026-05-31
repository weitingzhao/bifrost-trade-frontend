import type { HTMLAttributes, ReactNode } from 'react'
import { cn } from '@/lib/utils'

export interface DiscoveryHintProps extends HTMLAttributes<HTMLParagraphElement> {
  children: ReactNode
  as?: 'p' | 'span'
}

/** Muted caption text (replaces legacy `.section-hint`). */
export function DiscoveryHint({
  children,
  className,
  as: Tag = 'p',
  ...props
}: DiscoveryHintProps) {
  return (
    <Tag className={cn('text-xs text-muted-foreground mt-1 first:mt-0', className)} {...props}>
      {children}
    </Tag>
  )
}
