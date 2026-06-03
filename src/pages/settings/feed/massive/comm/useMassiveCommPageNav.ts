import { useCallback, useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { feedMassiveCommonSvcAnchorId } from '@/pages/settings/feed/massive/nav/anchors'
import {
  feedMassiveCommonCapHash,
  resolveCommonRowIdFromHash,
} from '@/pages/settings/feed/massive/nav/commonTabUtils'

export function useMassiveCommPageNav() {
  const { hash, pathname } = useLocation()
  const navigate = useNavigate()
  const [capExpanded, setCapExpanded] = useState<Record<string, boolean>>({})
  const [highlightedId, setHighlightedId] = useState<string | null>(null)

  const scrollToSection = useCallback((id: string) => {
    setHighlightedId(id)
    setCapExpanded(prev => ({ ...prev, [id]: true }))
    window.setTimeout(() => {
      document.getElementById(feedMassiveCommonSvcAnchorId(id))?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, 80)
  }, [])

  const navigateToCap = useCallback(
    (id: string) => {
      navigate({ pathname, hash: feedMassiveCommonCapHash(id).slice(1) })
      scrollToSection(id)
    },
    [navigate, pathname, scrollToSection],
  )

  const toggleCap = useCallback((id: string) => {
    setCapExpanded(prev => ({ ...prev, [id]: !prev[id] }))
  }, [])

  useEffect(() => {
    const raw = hash || window.location.hash
    const id = resolveCommonRowIdFromHash(raw)
    const frame = requestAnimationFrame(() => {
      if (id) scrollToSection(id)
      else setHighlightedId(null)
    })
    return () => cancelAnimationFrame(frame)
  }, [hash, scrollToSection])

  useEffect(() => {
    if (!highlightedId) return
    const t = window.setTimeout(() => setHighlightedId(null), 2200)
    return () => window.clearTimeout(t)
  }, [highlightedId])

  return {
    capExpanded,
    highlightedId,
    navigateToCap,
    toggleCap,
    scrollToSection,
  }
}
