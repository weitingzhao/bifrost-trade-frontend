import type { OpsHostEnvPill as OpsHostEnvPillType } from '@/utils/ingestOpsShared'
import { cn } from '@/lib/utils'
import { opsHostEnvPillDotClass, opsHostEnvPillVariantClass } from './socketIngestUi'

export function OpsHostEnvPill({
  pill,
  className,
  title,
}: {
  pill: OpsHostEnvPillType
  className?: string
  title?: string
}) {
  return (
    <span
      className={cn(opsHostEnvPillVariantClass(pill.pillVariant), className)}
      aria-label={pill.ariaLabel}
      title={title ?? pill.ariaLabel}
    >
      <span className={opsHostEnvPillDotClass(pill.pillVariant)} aria-hidden />
      {pill.shortLabel}
    </span>
  )
}
