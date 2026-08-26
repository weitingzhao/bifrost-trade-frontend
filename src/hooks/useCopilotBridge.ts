import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  fetchBridgePresets,
  postCopilotBridge,
  type BridgeDepth,
  type BridgeFocus,
  type BridgeTarget,
} from '@/api/researchCopilotBridge'
import { createPlaybookCaseFromBridge } from '@/api/playbook'

export function useBridgePresets() {
  return useQuery({
    queryKey: ['research', 'copilot', 'bridge', 'presets'],
    queryFn: ({ signal }) => fetchBridgePresets(signal),
    staleTime: 60_000,
  })
}

export function useCopilotBridge(sessionId: string) {
  const qc = useQueryClient()

  const bridge = useMutation({
    mutationFn: (input: {
      focus: BridgeFocus
      depth: BridgeDepth
      target: BridgeTarget
      model?: string
      frames_from_message_id?: string
    }) => postCopilotBridge(sessionId, input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['research', 'copilot', 'usage'] })
    },
  })

  const saveFeedback = useMutation({
    mutationFn: (input: {
      bridge_event_id: string
      external_reply_md: string
      outcome?: string
    }) => createPlaybookCaseFromBridge(input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['playbook', 'cases'] })
    },
  })

  return { bridge, saveFeedback }
}
