import { useCallback, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  fetchMarketStreamsSymbolOrder,
  putMarketStreamsSymbolOrder,
  patchPositionCategory,
} from '@/api/portfolio'
import { QUERY_KEYS } from '@/constants/queryKeys'
import type { PositionCategory } from '@/types/portfolio'
import {
  applySymbolReorderInCategory,
  loadSymbolOrderFromStorage,
  saveSymbolOrderToStorage,
} from '@/utils/marketStreamsRows'

export function useMarketStreamsSymbolOrder() {
  const queryClient = useQueryClient()
  const [localOrder, setLocalOrder] = useState<Record<string, string[]>>(loadSymbolOrderFromStorage)

  const { data: serverOrder } = useQuery({
    queryKey: QUERY_KEYS.portfolio.marketStreamsSymbolOrder,
    queryFn: async () => {
      const res = await fetchMarketStreamsSymbolOrder()
      if (res.ok && res.order && Object.keys(res.order).length > 0) {
        saveSymbolOrderToStorage(res.order)
        return res.order
      }
      return null
    },
    staleTime: 60_000,
  })

  const symbolOrderByCategory =
    serverOrder && Object.keys(serverOrder).length > 0 ? serverOrder : localOrder

  const applySymbolReorder = useCallback(
    (category: string, fromSymbol: string, toSymbol: string) => {
      setLocalOrder(prev => {
        const base =
          serverOrder && Object.keys(serverOrder).length > 0 ? serverOrder : prev
        const next = applySymbolReorderInCategory(base, category, fromSymbol, toSymbol)
        saveSymbolOrderToStorage(next)
        const symbols = next[category] ?? []
        putMarketStreamsSymbolOrder(category, symbols).catch(() => {
          /* localStorage already updated */
        })
        return next
      })
    },
    [serverOrder],
  )

  const invalidate = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.portfolio.marketStreamsSymbolOrder })
  }, [queryClient])

  return { symbolOrderByCategory, applySymbolReorder, invalidate }
}

export function useCategoryOrderPersistence(positionCategories: PositionCategory[]) {
  const [categoryOrder, setCategoryOrder] = useState<string[]>([])
  const [categoryOrderSaving, setCategoryOrderSaving] = useState(false)

  const persistCategoryOrder = useCallback(
    async (ordered: string[]) => {
      const orderWithoutUncat = ordered.filter(c => c !== 'Uncategorized')
      const nameToOrder = new Map(orderWithoutUncat.map((name, i) => [name, i]))
      setCategoryOrderSaving(true)
      try {
        for (const cat of positionCategories) {
          const idx = nameToOrder.get(cat.name)
          const desired = idx ?? 999
          const current = cat.sort_order ?? 999
          if (desired !== current) {
            await patchPositionCategory(cat.id, { sort_order: desired })
          }
        }
        setCategoryOrder(ordered)
      } finally {
        setCategoryOrderSaving(false)
      }
    },
    [positionCategories],
  )

  return { categoryOrder, setCategoryOrder, categoryOrderSaving, persistCategoryOrder }
}
