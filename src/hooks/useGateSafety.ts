import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  fetchGateSafety,
  fetchGateSafetyFull,
  createGateSafety,
  updateGateSafety,
} from '@/api/strategy'
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
