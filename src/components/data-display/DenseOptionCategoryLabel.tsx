import type { ComponentProps, ReactNode } from 'react'
import {
  denseOptionCategoryLabelClass,
  type DenseOptionCategoryVariant,
} from './denseTagClasses'

export type { DenseOptionCategoryVariant }

export function DenseOptionCategoryLabel({
  children,
  variant,
  className,
  ...rest
}: {
  children: ReactNode
  variant: DenseOptionCategoryVariant
  className?: string
} & Omit<ComponentProps<'span'>, 'children' | 'className'>) {
  return (
    <span className={denseOptionCategoryLabelClass(variant, className)} {...rest}>
      {children}
    </span>
  )
}
