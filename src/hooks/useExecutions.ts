import { useQuery } from '@tanstack/react-query'
import { fetchExecutions } from '@/api/trading'

export function useExecutionsFinal() {
  return useQuery({
    queryKey: ['trading', 'executions', 'final'],
    queryFn: () => fetchExecutions('final'),
    staleTime: 30_000,
  })
}

export function useExecutionsTws() {
  return useQuery({
    queryKey: ['trading', 'executions', 'tws'],
    queryFn: () => fetchExecutions('tws'),
    staleTime: 30_000,
  })
}

export function useExecutionsCanonical() {
  return useQuery({
    queryKey: ['trading', 'executions', 'canonical'],
    queryFn: () => fetchExecutions('canonical'),
    staleTime: 30_000,
  })
}
