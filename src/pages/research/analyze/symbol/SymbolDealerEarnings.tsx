/**
 * The Dealer face's earnings pieces (`dealerEarnings.ts` holds the reading):
 * the OpEx header's tag, the panel's warning when the print can land inside
 * the cycle, and the past cycles' marks.
 */
import { DenseTag } from '@/components/data-display'
import { shortDate } from '@/utils/earningsEstimate'
import type { OpexEarnings } from './dealerEarnings'

export function OpexEarningsTag({ reading }: { reading: OpexEarnings | null }) {
  if (!reading) return null
  return (
    <DenseTag variant={reading.tag.tone} size="cell" title={reading.tag.title} data-opex-earnings={reading.tag.tone}>
      {reading.tag.label}
    </DenseTag>
  )
}

export function OpexEarningsNote({ reading }: { reading: OpexEarnings | null }) {
  if (!reading?.note) return null
  return (
    <p
      className="m-0 border-y border-warning/30 bg-warning/10 px-3 py-1.5 text-dense-meta leading-normal text-warning text-pretty"
      role="note"
      aria-label="Earnings inside the cycle"
      title={reading.tag.title}
    >
      {reading.note}
    </p>
  )
}

/** A settled cycle's prints, beside its OpEx date. */
export function CycleEarningsMark({ prints }: { prints: readonly string[] | undefined }) {
  if (!prints || prints.length === 0) return null
  return (
    <span
      className="ml-1.5 font-mono text-dense-micro text-warning"
      title={`Earnings inside this cycle — 8-K Item 2.02 filed ${prints.join(', ')}`}
      data-cycle-earnings
    >
      E {prints.map((d) => shortDate(d)).join(' · ')}
    </span>
  )
}
