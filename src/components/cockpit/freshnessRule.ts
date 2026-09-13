import { shortDate } from '@/components/cockpit/signatureRule'

/**
 * The lenses cell, as data.
 *
 * Four states, and the two quiet ones are not the same: `checking` is a fact
 * about this render, `unavailable` is a fact about the batch, and neither may
 * borrow the failure colour — an unread batch is not a broken one. The one
 * that does deserve a warning is a batch that answered and said it is behind
 * its own SLA.
 */
export function lensCell(q: {
  isPending: boolean
  isError: boolean
  overall?: string
  asOf?: string | null
}): { lamp: string; value: string } {
  if (q.isPending) return { lamp: 'gray', value: 'checking' }
  if (q.isError || !q.asOf) return { lamp: 'gray', value: 'unavailable' }
  return { lamp: q.overall === 'ok' ? 'green' : 'yellow', value: shortDate(q.asOf) }
}
