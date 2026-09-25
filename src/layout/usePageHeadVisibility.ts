/**
 * Whether the current page's head title is on screen (§16.12): `in`, `out`,
 * or null on a page that has not moved to `PageHead` and so reports nothing.
 */
import { useSyncExternalStore } from 'react'
import { PAGEHEAD_EVENT, type PageHeadVisibility } from '@/components/layout/PageHead'

function subscribePageHead(onChange: () => void): () => void {
  window.addEventListener(PAGEHEAD_EVENT, onChange)
  return () => window.removeEventListener(PAGEHEAD_EVENT, onChange)
}

function readPageHead(): PageHeadVisibility | null {
  const v = document.documentElement.dataset.pagehead
  return v === 'in' || v === 'out' ? v : null
}

export function usePageHeadVisibility(): PageHeadVisibility | null {
  return useSyncExternalStore(subscribePageHead, readPageHead, () => null)
}
