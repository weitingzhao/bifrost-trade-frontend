import { useCallback, useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { STOCK_CHECKLIST_ROWS } from '@/pages/settings/feed/massive/checklist/stockChecklistRows'
import type { CapabilityGroup } from '@/pages/settings/feed/massive/checklist/types'
import { feedMassiveStockSvcAnchorId } from '@/pages/settings/feed/massive/nav/anchors'
import {
  feedMassiveStockTabHash,
  feedMassiveStockTickersSubHash,
  parseFeedMassiveStockSvcFromHash,
  parseFeedMassiveStockTabFromHash,
  parseFeedMassiveStockTickersSubTabFromHash,
  type MassiveStockTickersSubTab,
} from '@/pages/settings/feed/massive/nav/stockTabUtils'
import {
  stockCapabilityGroupForRowId,
  type StockChannelTab,
} from '@/pages/settings/feed/massive/components/MassiveDeliveryChannelTabs'
import {
  STOCK_REST_SECTION_ORDER,
  type StockRestSectionId,
} from '@/pages/settings/feed/massive/stock/stockRestSections'

const REST_ID_SET = new Set<string>(STOCK_REST_SECTION_ORDER)
const WS_IDS = STOCK_CHECKLIST_ROWS.filter(r => r.group === 'ws').map(r => r.id)
const FLAT_IDS = STOCK_CHECKLIST_ROWS.filter(r => r.group === 'flat').map(r => r.id)

export function useMassiveStockPageNav() {
  const { hash, pathname } = useLocation()
  const navigate = useNavigate()
  const [capExpanded, setCapExpanded] = useState<Record<string, boolean>>({})
  const [channelTab, setChannelTab] = useState<StockChannelTab>('rest')
  const [restSection, setRestSection] = useState<StockRestSectionId>('stock-tickers')
  const [wsSection, setWsSection] = useState(WS_IDS[0] ?? 'stock-ws-aggregates-s')
  const [flatSection, setFlatSection] = useState(FLAT_IDS[0] ?? 'stock-flat-file-day-aggs')
  const [tickersSubTab, setTickersSubTab] = useState<MassiveStockTickersSubTab>('all_tickers')
  const [highlightedId, setHighlightedId] = useState<string | null>(null)

  const scrollToSection = useCallback((id: string) => {
    setHighlightedId(id)
    setCapExpanded(prev => ({ ...prev, [id]: true }))
    const g = stockCapabilityGroupForRowId(id)
    if (g === 'rest' || g === 'ws' || g === 'flat') {
      setChannelTab(g)
    }
    if (REST_ID_SET.has(id)) {
      setRestSection(id as StockRestSectionId)
    }
    if (WS_IDS.includes(id)) setWsSection(id)
    if (FLAT_IDS.includes(id)) setFlatSection(id)
    window.setTimeout(() => {
      document.getElementById(feedMassiveStockSvcAnchorId(id))?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, 80)
  }, [])

  const navigateToCap = useCallback(
    (id: string) => {
      navigate({ pathname, hash: feedMassiveStockTabHash(id) })
      scrollToSection(id)
    },
    [navigate, pathname, scrollToSection],
  )

  const navigateToTickersSub = useCallback(
    (sub: MassiveStockTickersSubTab) => {
      setTickersSubTab(sub)
      navigate({ pathname, hash: feedMassiveStockTickersSubHash(sub).slice(1) })
      scrollToSection('stock-tickers')
    },
    [navigate, pathname, scrollToSection],
  )

  const toggleCap = useCallback((id: string) => {
    setCapExpanded(prev => ({ ...prev, [id]: !prev[id] }))
  }, [])

  useEffect(() => {
    const raw = hash || window.location.hash
    const tkSub = parseFeedMassiveStockTickersSubTabFromHash(raw)
    const fromTab = parseFeedMassiveStockTabFromHash(raw)
    const fromSvc = parseFeedMassiveStockSvcFromHash(raw)
    const id =
      (fromTab && STOCK_CHECKLIST_ROWS.some(r => r.id === fromTab) ? fromTab : null) ??
      (fromSvc && STOCK_CHECKLIST_ROWS.some(r => r.id === fromSvc) ? fromSvc : null)

    const frame = requestAnimationFrame(() => {
      if (tkSub) {
        setTickersSubTab(tkSub)
        scrollToSection('stock-tickers')
        return
      }
      if (id) {
        scrollToSection(id)
      } else {
        setHighlightedId(null)
      }
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
    tickersSubTab,
    setTickersSubTab,
    highlightedId,
    scrollToSection,
    navigateToCap,
    navigateToTickersSub,
    toggleCap,
  }
}

export function capNavGroupForRow(id: string): CapabilityGroup | null {
  return stockCapabilityGroupForRowId(id)
}
