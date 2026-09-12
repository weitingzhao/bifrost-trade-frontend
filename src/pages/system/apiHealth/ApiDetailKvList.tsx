import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { Card, CardContent } from '@/components/ui/card'
import {
  apiHealthDetailCardContentClass,
  apiHealthDetailKvLabelClass,
  apiHealthDetailKvMonoClass,
  apiHealthDetailKvRowClass,
  apiHealthDetailKvValueClass,
} from './apiHealthDetailUi'

export function DetailKV({
  label,
  mono = false,
  children,
}: {
  label: string
  mono?: boolean
  children: ReactNode
}) {
  return (
    <div className={apiHealthDetailKvRowClass}>
      <span className={apiHealthDetailKvLabelClass}>{label}</span>
      <span className={cn(apiHealthDetailKvValueClass, mono && apiHealthDetailKvMonoClass)}>
        {children}
      </span>
    </div>
  )
}

export function ApiDetailKvCard({ children }: { children: ReactNode }) {
  return (
    <Card variant="elevated" size="sm">
      <CardContent className={apiHealthDetailCardContentClass}>{children}</CardContent>
    </Card>
  )
}
