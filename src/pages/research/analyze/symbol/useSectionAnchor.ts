/**
 * Scroll to the panel an old link named. `labHref` builds
 * `/research/symbol?tab=volatility#vrp`, and the retired hubs' redirects carry
 * `?view=vrp`; both landed on the top of the tab (S6, 2026-09-26). The panels
 * carry the lab view's id (`iv-rank`, `vrp`, `skew`, `gex`, `opex`, `model`,
 * `sessions`, `playbook`, `multi-leg`, plus `term` and `pcr`), so the page
 * looks for the one named once the tab has rendered — a panel draws in its
 * loading state, so a few frames are enough.
 */
import { useEffect } from 'react'
import { useLocation, useSearchParams } from 'react-router-dom'

const TRIES = 12
const EVERY_MS = 120

export function sectionTarget(hash: string, view: string | null): string | null {
  const h = hash.replace(/^#/, '').trim()
  if (h) return h
  const v = (view ?? '').trim()
  return v || null
}

export function useSectionAnchor(active: string): void {
  const { hash } = useLocation()
  const [params] = useSearchParams()
  const target = sectionTarget(hash, params.get('view'))
  useEffect(() => {
    if (!target) return
    let tries = 0
    let timer: ReturnType<typeof setTimeout> | undefined
    const seek = () => {
      const el = document.getElementById(target)
      if (el) {
        el.scrollIntoView({ block: 'start' })
        return
      }
      tries += 1
      if (tries < TRIES) timer = setTimeout(seek, EVERY_MS)
    }
    seek()
    return () => {
      if (timer) clearTimeout(timer)
    }
  }, [target, active])
}
