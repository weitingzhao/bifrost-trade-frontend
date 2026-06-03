import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { parseHashAnchor } from '../nav/anchors'

export function useMassiveFeedHashScroll() {
  const { hash } = useLocation()

  useEffect(() => {
    const id = parseHashAnchor(hash)
    if (!id) return
    const t = window.setTimeout(() => {
      document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, 50)
    return () => window.clearTimeout(t)
  }, [hash])
}
