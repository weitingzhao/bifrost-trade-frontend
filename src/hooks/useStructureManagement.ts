import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  createStructure,
  updateStructure,
  fetchTemplates,
  fetchTemplateDetail,
} from '@/api/strategy'
import { QUERY_KEYS } from '@/constants/queryKeys'
import type { StructurePayload } from '@/types/strategy'

export function useStructureTemplates() {
  return useQuery({
    queryKey: QUERY_KEYS.strategy.templates.list('active'),
    queryFn: () => fetchTemplates(true),
    staleTime: 120_000,
  })
}

export function useTemplateDetail(id: number | null) {
  return useQuery({
    queryKey: QUERY_KEYS.strategy.templates.detail(id),
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
      // The prefix carries every structure's detail read too.
      qc.invalidateQueries({ queryKey: QUERY_KEYS.strategy.structures })
      qc.invalidateQueries({ queryKey: QUERY_KEYS.monitor.status })
    },
  })
}
