/**
 * The dossier's exhibits — every registry lens for one symbol, in one batch —
 * and, from the same answer, the name's option listing (research 0.193.0,
 * TD-159: standard and adjusted contracts on its latest open-interest session).
 */
import { exhibitFailed, type ExhibitLens, type ExhibitPayload, type OptionListing } from '@/api/research/exhibit'
import { useCompositeOptionListing, useExhibitComposite } from '@/hooks/useExhibitComposite'
import { DOSSIER_LENSES } from '@/lib/dossier'

export interface DossierExhibits {
  exhibits: ExhibitPayload[]
  /** True until the batch has answered. */
  loading: boolean
  /** The lenses whose builder failed — shown, not swallowed. */
  failed: ExhibitLens[]
  /** Null: no open-interest rows. Undefined: not answered yet, or a server before 0.193.0. */
  optionListing: OptionListing | null | undefined
}

export function useDossier(symbol: string): DossierExhibits {
  const sym = (symbol || '').trim().toUpperCase()
  const q = useExhibitComposite(DOSSIER_LENSES, sym)
  const listing = useCompositeOptionListing(DOSSIER_LENSES, sym)
  const exhibits = q.data ?? []
  return {
    exhibits,
    loading: sym.length > 0 && q.isPending,
    // The request itself failing is every lens failing; otherwise the batch says which.
    failed: q.isError
      ? [...DOSSIER_LENSES]
      : exhibits.filter(exhibitFailed).map((ex) => ex.lens as ExhibitLens),
    optionListing: listing.data,
  }
}
