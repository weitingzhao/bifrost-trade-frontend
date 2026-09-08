/**
 * The dossier's exhibits — every registry lens for one symbol, in one batch.
 */
import { exhibitFailed, type ExhibitLens, type ExhibitPayload } from '@/api/research/exhibit'
import { useExhibitComposite } from '@/hooks/useExhibitComposite'
import { DOSSIER_LENSES } from '@/lib/dossier'

export interface DossierExhibits {
  exhibits: ExhibitPayload[]
  /** True until the batch has answered. */
  loading: boolean
  /** The lenses whose builder failed — shown, not swallowed. */
  failed: ExhibitLens[]
}

export function useDossier(symbol: string): DossierExhibits {
  const sym = (symbol || '').trim().toUpperCase()
  const q = useExhibitComposite(DOSSIER_LENSES, sym)
  const exhibits = q.data ?? []
  return {
    exhibits,
    loading: sym.length > 0 && q.isPending,
    // The request itself failing is every lens failing; otherwise the batch says which.
    failed: q.isError
      ? [...DOSSIER_LENSES]
      : exhibits.filter(exhibitFailed).map((ex) => ex.lens as ExhibitLens),
  }
}
