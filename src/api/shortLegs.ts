/**
 * The short legs of the book, and the price each is measured against.
 *
 * The Positions page derives this from ten queries; the status bar is on every
 * screen and cannot. This is the cheap read behind it: the API returns the legs
 * and their spots, and the cushion — plus the trader's own "tight" line — is
 * applied here, by the same `summarizeCushion` and `useCushionThreshold` the
 * Positions page uses. One rule, one implementation, two readers.
 */
import { withValidation } from '@/lib/apiValidation'
import { portfolioUrl } from '@/lib/devApiUrl'
import { ShortLegsResponseSchema } from '@/lib/schemas/portfolio'

export interface ShortLeg {
  account_id?: string | null
  symbol: string
  expiry?: string | null
  strike: number | null
  right: string | null
  qty: number
  contract_key?: string | null
  /** Null when the underlying carries no live quote — unpriced, not safe. */
  spot: number | null
}

export interface ShortLegsResponse {
  legs: ShortLeg[]
  count: number
}

const validate = withValidation<ShortLegsResponse>(ShortLegsResponseSchema, 'portfolio/short-legs')

export async function fetchShortLegs(signal?: AbortSignal): Promise<ShortLegsResponse> {
  const res = await fetch(portfolioUrl('/portfolio/short-legs'), { signal })
  if (!res.ok) throw new Error(`Portfolio /portfolio/short-legs: ${res.status}`)
  return validate(await res.json())
}
