/**
 * `?preview=failed` (or loading · stale · empty · filtered) on a page that
 * implements §17.1 shows that state without breaking anything — the app's
 * version of the design's `bifrost.viewState` preview, so a state that is
 * hard to meet on a working day can still be looked at.
 *
 * Development builds only: in production the parameter is ignored, and a page
 * always shows what its data says.
 */
import { useSearchParams } from 'react-router-dom'

export type PreviewState = 'loading' | 'failed' | 'stale' | 'empty' | 'filtered'

const KINDS: readonly PreviewState[] = ['loading', 'failed', 'stale', 'empty', 'filtered']

export function usePreviewState(): PreviewState | null {
  const [params] = useSearchParams()
  if (!import.meta.env.DEV) return null
  const v = params.get('preview')
  return KINDS.includes(v as PreviewState) ? (v as PreviewState) : null
}
