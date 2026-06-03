import { useCallback, useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { feedMassiveOptionSvcAnchorId } from '@/pages/settings/feed/massive/nav/anchors'
import {
  feedMassiveOptionTabHash,
  resolveOptionRowIdFromHash,
} from '@/pages/settings/feed/massive/nav/optionTabUtils'
import type { StockChannelTab } from '@/pages/settings/feed/massive/components/MassiveDeliveryChannelTabs'
import {
  OPTION_FLAT_IDS,
  OPTION_PROJECT_IDS,
  OPTION_WS_IDS,
  optionCapabilityGroupForRowId,
} from '@/pages/settings/feed/massive/option/optionNavUtils'
import {
  OPTION_REST_SECTION_ORDER,
  type OptionRestSectionId,
} from '@/pages/settings/feed/massive/option/optionRestSections'

const REST_ID_SET = new Set<string>(OPTION_REST_SECTION_ORDER)

export function useMassiveOptionPageNav() {
  const { hash, pathname } = useLocation()
  const navigate = useNavigate()
  const [capExpanded, setCapExpanded] = useState<Record<string, boolean>>({})
  const [channelTab, setChannelTab] = useState<StockChannelTab>('rest')
  const [restSection, setRestSection] = useState<OptionRestSectionId>('contracts')
  const [wsSection, setWsSection] = useState(OPTION_WS_IDS[0] ?? 'ws-aggregates-s')
  const [flatSection, setFlatSection] = useState(OPTION_FLAT_IDS[0] ?? 'flat-file-day-aggs')
  const [highlightedId, setHighlightedId] = useState<string | null>(null)

  const scrollToSection = useCallback((id: string) => {
    setHighlightedId(id)
    setCapExpanded(prev => ({ ...prev, [id]: true }))
    const g = optionCapabilityGroupForRowId(id)
    if (g === 'rest' || g === 'ws' || g === 'flat') {
      setChannelTab(g)
    } else if (g === 'project') {
      setChannelTab('rest')
    }
    if (REST_ID_SET.has(id)) {
      setRestSection(id as OptionRestSectionId)
    }
    if (OPTION_WS_IDS.includes(id)) setWsSection(id)
    if (OPTION_FLAT_IDS.includes(id)) setFlatSection(id)
    window.setTimeout(() => {
      document.getElementById(feedMassiveOptionSvcAnchorId(id))?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, 80)
  }, [])

  const navigateToCap = useCallback(
    (id: string) => {
      navigate({ pathname, hash: feedMassiveOptionTabHash(id).slice(1) })
      scrollToSection(id)
    },
    [navigate, pathname, scrollToSection],
  )

  const toggleCap = useCallback((id: string) => {
    setCapExpanded(prev => ({ ...prev, [id]: !prev[id] }))
  }, [])

  useEffect(() => {
    const raw = hash || window.location.hash
    const id = resolveOptionRowIdFromHash(raw)
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
    channelTab,
    setChannelTab,
    restSection,
    setRestSection,
    wsSection,
    setWsSection,
    flatSection,
    setFlatSection,
    highlightedId,
    navigateToCap,
    toggleCap,
    scrollToSection,
    projectIds: OPTION_PROJECT_IDS,
  }
}
