import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  fetchGateSafety,
  fetchGateSafetyFull,
  createGateSafety,
  updateGateSafety,
  fetchDimsGrouped,
} from '@/api/strategy'
import { postActiveStrategy } from '@/api/monitor'
import type { GateSafetyPayload } from '@/types/positions'

const LIST_KEY = ['strategy', 'gate-safety'] as const

export function useGateSafetyList() {
  return useQuery({
    queryKey: [...LIST_KEY],
    queryFn: fetchGateSafety,
    staleTime: 60_000,
  })
}

export function useGateSafetyFull(id: number | null) {
  return useQuery({
    queryKey: [...LIST_KEY, 'detail', id],
    queryFn: () => fetchGateSafetyFull(id!),
    enabled: id != null,
  })
}

export function useStrategyDims() {
  return useQuery({
    queryKey: ['strategy', 'dims'],
    queryFn: fetchDimsGrouped,
    staleTime: 300_000,
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

export function useSetActiveStrategy() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: postActiveStrategy,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['monitor', 'status'] })
    },
  })
}
