import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  fetchGateSets,
  fetchGateSetDefaults,
  fetchGateSetFull,
  createGateSet,
  updateGateSet,
} from '@/api/strategy'
import type { GateSetPayload } from '@/types/positions'
import { QUERY_KEYS } from '@/constants/queryKeys'

const LIST_KEY = QUERY_KEYS.strategy.gateSets

export function useGateSetList() {
  return useQuery({
    queryKey: [...LIST_KEY],
    queryFn: fetchGateSets,
    staleTime: 60_000,
  })
}

/**
 * Core's gate defaults, which a new gate set is seeded from (TD-72). They move
 * only with a core release, so they are read once per half hour at most.
 * `enabled` is the create sheet being open — editing a set never reads them.
 */
export function useGateSetDefaults(enabled = true) {
  return useQuery({
    queryKey: QUERY_KEYS.strategy.gateSetDefaults,
    queryFn: fetchGateSetDefaults,
    staleTime: 30 * 60_000,
    enabled,
  })
}

export function useGateSetFull(id: number | null) {
  return useQuery({
    queryKey: [...LIST_KEY, 'detail', id],
    queryFn: () => fetchGateSetFull(id!),
    enabled: id != null,
  })
}

export function useCreateGateSet() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: GateSetPayload) => createGateSet(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: LIST_KEY })
    },
  })
}

export function useUpdateGateSet() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: GateSetPayload }) =>
      updateGateSet(id, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: LIST_KEY })
    },
  })
}
