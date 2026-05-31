import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  fetchStructures,
  fetchStructure,
  createStructure,
  updateStructure,
  fetchStrategyHistory,
  fetchTemplates,
  fetchTemplateDetail,
} from '@/api/strategy'
import { postActiveStrategy } from '@/api/monitor'
import { QUERY_KEYS } from '@/constants/queryKeys'
import type { StructurePayload, StrategyHistoryParams } from '@/types/strategy'
import type { ActiveStrategyPayload } from '@/types/strategy'

export function useStructuresAll() {
  return useQuery({
    queryKey: [...QUERY_KEYS.strategy.structures, 'all'],
    queryFn: () => fetchStructures(false),
    staleTime: 60_000,
  })
}

export function useStructureDetail(id: number | null) {
  return useQuery({
    queryKey: [...QUERY_KEYS.strategy.structureDetail, id],
    queryFn: () => fetchStructure(id!),
    enabled: id != null,
  })
}

export function useStrategyHistory(params: StrategyHistoryParams) {
  return useQuery({
    queryKey: [
      ...QUERY_KEYS.strategy.history,
      params.strategy_structure_id ?? null,
      params.limit ?? 100,
    ],
    queryFn: () => fetchStrategyHistory(params),
    staleTime: 30_000,
  })
}

export function useStructureTemplates() {
  return useQuery({
    queryKey: [...QUERY_KEYS.strategy.structures, 'templates'],
    queryFn: () => fetchTemplates(true),
    staleTime: 120_000,
  })
}

export function useTemplateDetail(id: number | null) {
  return useQuery({
    queryKey: [...QUERY_KEYS.strategy.structures, 'template', id],
    queryFn: () => fetchTemplateDetail(id!),
    enabled: id != null,
  })
}

export function useCreateStructure() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: StructurePayload) => createStructure(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QUERY_KEYS.strategy.structures })
      qc.invalidateQueries({ queryKey: QUERY_KEYS.monitor.status })
    },
  })
}

export function useUpdateStructure() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: StructurePayload }) =>
      updateStructure(id, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QUERY_KEYS.strategy.structures })
      qc.invalidateQueries({ queryKey: QUERY_KEYS.strategy.structureDetail })
      qc.invalidateQueries({ queryKey: QUERY_KEYS.monitor.status })
    },
  })
}

export function useSetActiveStructureConfig() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: ActiveStrategyPayload) => postActiveStrategy(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QUERY_KEYS.monitor.status })
    },
  })
}
