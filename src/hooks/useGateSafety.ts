import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  fetchGateSafety,
  fetchGateSafetyDefaults,
  fetchGateSafetyFull,
  createGateSafety,
  updateGateSafety,
} from '@/api/strategy'
import type { GateSafetyPayload } from '@/types/positions'
import { QUERY_KEYS } from '@/constants/queryKeys'

const LIST_KEY = ['strategy', 'gate-safety'] as const

export function useGateSafetyList() {
  return useQuery({
    queryKey: [...LIST_KEY],
    queryFn: fetchGateSafety,
    staleTime: 60_000,
  })
}

/**
 * Core's gate defaults, which a new gate set is seeded from (TD-72). They move
 * only with a core release, so they are read once per half hour at most.
 * `enabled` is the create sheet being open — editing a set never reads them.
 */
export function useGateSafetyDefaults(enabled = true) {
  return useQuery({
    queryKey: QUERY_KEYS.strategy.gateSafetyDefaults,
    queryFn: fetchGateSafetyDefaults,
    staleTime: 30 * 60_000,
    enabled,
  })
}

export function useGateSafetyFull(id: number | null) {
  return useQuery({
    queryKey: [...LIST_KEY, 'detail', id],
    queryFn: () => fetchGateSafetyFull(id!),
    enabled: id != null,
  })
}

export function useCreateGateSafety() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: GateSafetyPayload) => createGateSafety(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: LIST_KEY })
    },
  })
}

export function useUpdateGateSafety() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: GateSafetyPayload }) =>
      updateGateSafety(id, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: LIST_KEY })
    },
  })
}
