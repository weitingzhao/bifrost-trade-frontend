import type { ComponentProps, ReactNode } from 'react'
import { cn } from '@/lib/utils'
import {
  denseTagClass,
  type DenseTagSize,
  type DenseTagVariant,
} from './denseTagClasses'

export type { DenseTagSize, DenseTagVariant }

export function DenseTag({
  children,
  variant = 'category',
  size = 'cell',
  className,
  ...rest
}: {
  children: ReactNode
  variant?: DenseTagVariant
  size?: DenseTagSize
  className?: string
} & Omit<ComponentProps<'span'>, 'children' | 'className'>) {
  return (
    <span data-slot="dense-tag" className={cn(denseTagClass(variant, size), className)} {...rest}>
      {children}
    </span>
  )
}

export function DenseTagButton({
  children,
  variant = 'category',
  size = 'cell',
  className,
  ...rest
}: {
  children: ReactNode
  variant?: DenseTagVariant
  size?: DenseTagSize
  className?: string
} & Omit<ComponentProps<'button'>, 'children' | 'className'>) {
  return (
    <button
      data-slot="dense-tag"
      type="button"
      className={cn(
        denseTagClass(variant, size),
        'cursor-pointer transition-opacity hover:opacity-90',
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  )
}
