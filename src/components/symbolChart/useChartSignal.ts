/**
 * The signal the Symbol chart marks, and the choices its picker offers.
 *
 * `?signal=` when the page carries one (a shared link), else this machine's
 * last choice. A choice is written to both — except in a surface panel, whose
 * URL belongs to the page behind it. The Pine choices are the library's active
 * scripts (`usePineLibrary`), so a pasted script is offered once it is saved.
 */
import { useSearchParams } from 'react-router-dom'
import { INDICATOR_SIGNALS, type IndicatorSignalId } from '@/api/research/indicators'
import { PINE_SCRIPT_ID, type PineLibraryEntry } from '@/api/research/pine'
import { usePersistedChoice } from '@/hooks/usePersistedChoice'
import { usePineLibrary } from '@/hooks/usePineLibrary'
import { CHART_SIGNAL_PARAM } from '@/lib/symbolLink'
import { useInSurface } from '@/lib/surfaceScope'

const INDICATOR_SIGNAL_IDS = new Set<string>(INDICATOR_SIGNALS.map((x) => x.id))

/**
 * '' = off · an indicator signal id (bare, or `ind:<id>` as Shell Spec §9
 * writes links) · `pine:<script>` for any script in the Pine library. Pine ids
 * are checked by shape, not against the library: a pasted script is only known
 * once the library answers.
 */
export function isChartSignal(v: string): v is string {
  return (
    v === '' ||
    INDICATOR_SIGNAL_IDS.has(v.startsWith('ind:') ? v.slice(4) : v) ||
    (v.startsWith('pine:') && PINE_SCRIPT_ID.test(v.slice(5)))
  )
}

/** One spelling per signal: `ind:<id>` reads as the bare indicator id the picker and the API use. */
const canonical = (v: string) => (v.startsWith('ind:') ? v.slice(4) : v)

export function useChartSignal(isMini: boolean) {
  const [params, setParams] = useSearchParams()
  const inSurface = useInSurface()
  const ownsUrl = !isMini && !inSurface
  const [storedSig, storeSig] = usePersistedChoice<string>('bifrost.chart.signal', '', isChartSignal)
  const urlSig = ownsUrl ? params.get(CHART_SIGNAL_PARAM) : null
  const sigId = canonical(urlSig != null && isChartSignal(urlSig) ? urlSig : storedSig)
  const setSigId = (next: string) => {
    storeSig(next)
    if (!ownsUrl) return
    setParams(
      (prev) => {
        const out = new URLSearchParams(prev)
        if (next) out.set(CHART_SIGNAL_PARAM, next)
        else out.delete(CHART_SIGNAL_PARAM)
        return out
      },
      { replace: true },
    )
  }
  const pineId = sigId.startsWith('pine:') ? sigId.slice(5) : null
  const indSig = pineId ? '' : (sigId as IndicatorSignalId | '')
  const { scripts } = usePineLibrary()
  // A script no longer active (or not listed yet) keeps its own option, so the picker shows what is marked.
  const pineChoices: readonly PineLibraryEntry[] =
    pineId && !scripts.some((p) => p.id === pineId) ? [...scripts, { id: pineId, label: pineId, origin: 'user' }] : scripts
  const pineName = pineChoices.find((p) => p.id === pineId)?.label ?? pineId
  return { sigId, setSigId, pineId, indSig, pineChoices, pineName }
}
