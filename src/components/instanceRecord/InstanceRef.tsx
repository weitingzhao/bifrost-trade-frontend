/**
 * An instance number as a token (design Rev .101): `#159` anywhere on a page
 * opens that instance's face as a right sheet, carrying the rows it sits in so
 * the sheet can step them. A number the book does not hold stays plain text
 * and says so — a token that opens nothing is a dead end wearing a link.
 */
import type { MouseEvent } from 'react'
import { useInstanceIndex } from '@/hooks/useInstanceIndex'
import { openInstanceSheet, useInstanceSheet } from '@/lib/instanceSheet'
import { cn } from '@/lib/utils'

export function InstanceRef({
  id,
  list,
  from,
  className,
  children,
}: {
  id: number
  /** The rows this token sits among, in page order — what ‹ › and [ ] step. */
  list?: readonly number[]
  /** Where the sheet says it was opened from. */
  from?: string
  className?: string
  /** Defaults to `#id`. */
  children?: React.ReactNode
}) {
  const known = useInstanceIndex()
  const sheet = useInstanceSheet()
  const text = children ?? `#${id}`
  const base = cn('font-mono font-bold text-[var(--color-instance-multi)]', className)
  if (known && !known.has(id)) {
    return (
      <span className={cn(base, 'opacity-70')} title={`#${id} is not in the instance book — nothing to open`}>
        {text}
      </span>
    )
  }
  const on = sheet?.id === id && sheet.compareId == null
  return (
    <button
      type="button"
      className={cn(base, 'cursor-pointer border-0 bg-transparent p-0 hover:underline', on && 'underline')}
      aria-pressed={on}
      title={on ? `Close #${id}` : `Open #${id} — its record, over this page`}
      onClick={(e: MouseEvent) => {
        e.stopPropagation()
        openInstanceSheet(id, list ?? [id], from)
      }}
      onKeyDown={(e) => e.stopPropagation()}
    >
      {text}
    </button>
  )
}
