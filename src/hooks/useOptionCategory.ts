import { useQuery } from '@tanstack/react-query'
import {
  fetchTemplates,
  fetchTemplateDetail,
  fetchDimsGrouped,
  fetchParamKindOptions,
  fetchLegRoleOptions,
  fetchLegDirectionOptions,
  fetchLegOptionRightOptions,
} from '@/api/strategy'
import { QUERY_KEYS } from '@/constants/queryKeys'

const TEMPLATES_KEY = [...QUERY_KEYS.strategy.structures, 'templates', 'all'] as const
export const DIMS_KEY = ['strategy', 'dims'] as const
const TEMPLATE_DETAIL_KEY = ['strategy', 'template'] as const

export function useOptionCategoryTemplates() {
  return useQuery({
    queryKey: TEMPLATES_KEY,
    queryFn: () => fetchTemplates(false),
    staleTime: 30_000,
  })
}

export function useOptionCategoryDims() {
  return useQuery({
    queryKey: DIMS_KEY,
    queryFn: fetchDimsGrouped,
    staleTime: 60_000,
  })
}

export function useOptionCategoryTemplateDetail(templateId: number | null) {
  return useQuery({
    queryKey: [...TEMPLATE_DETAIL_KEY, templateId],
    queryFn: () => fetchTemplateDetail(templateId!),
    enabled: templateId != null,
    staleTime: 10_000,
  })
}

export function useOptionCategoryFormOptions() {
  const paramKinds = useQuery({
    queryKey: ['strategy', 'options', 'param-kind'],
    queryFn: fetchParamKindOptions,
    staleTime: Infinity,
  })
  const legRoles = useQuery({
    queryKey: ['strategy', 'options', 'leg-role'],
    queryFn: fetchLegRoleOptions,
    staleTime: Infinity,
  })
  const legDirs = useQuery({
    queryKey: ['strategy', 'options', 'leg-direction'],
    queryFn: fetchLegDirectionOptions,
    staleTime: Infinity,
  })
  const legOrs = useQuery({
    queryKey: ['strategy', 'options', 'leg-option-right'],
    queryFn: fetchLegOptionRightOptions,
    staleTime: Infinity,
  })
  return { paramKinds, legRoles, legDirs, legOrs }
}

export { TEMPLATES_KEY, TEMPLATE_DETAIL_KEY }
