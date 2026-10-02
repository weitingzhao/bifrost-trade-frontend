import { useQuery } from '@tanstack/react-query'
import {
  fetchDimsGrouped,
  fetchParamKindOptions,
  fetchLegRoleOptions,
  fetchLegDirectionOptions,
  fetchLegOptionRightOptions,
} from '@/api/strategy'
import { QUERY_KEYS } from '@/constants/queryKeys'

/**
 * The six-dimension dictionary. One hook for the template catalogue and the
 * gate forms alike — the app writes no dims, so a long staleTime costs nothing.
 */
export function useStrategyDims() {
  return useQuery({
    queryKey: QUERY_KEYS.strategy.dims,
    queryFn: fetchDimsGrouped,
    staleTime: 300_000,
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
