import { cn } from '@/lib/utils'
import { DenseTag } from './DenseTag'
import { denseTable } from '@bifrost/ui'
import {
  denseTagVariantFromExecSource,
  type DenseTagVariant,
} from './denseTagClasses'

const SOURCE_LABELS: Record<string, { label: string; title?: string }> = {
  flex_trades: { label: 'flex' },
  flex: { label: 'flex' },
  tws_event: { label: 'tws' },
  tws_client: { label: 'tws-client' },
  journal_closed: {
    label: 'journal',
    title: 'Manual accounting adjustment (journal entry)',
  },
  manual: { label: 'manual' },
}

export function ExecSourceBadge({
  source,
  className,
}: {
  source?: string | null
  className?: string
}) {
  const s = (source ?? '').trim()
  if (!s) return <span className={denseTable.mutedMeta}>—</span>

  const norm = s.toLowerCase()
  const meta = SOURCE_LABELS[norm] ?? SOURCE_LABELS[s]
  const label = meta?.label ?? s
  const title = meta?.title ?? s
  const variant: DenseTagVariant = denseTagVariantFromExecSource(s)

  return (
    <DenseTag
      variant={variant}
      size="cell"
      className={cn('leading-none whitespace-nowrap', className)}
      title={title}
    >
      {label}
    </DenseTag>
  )
}
