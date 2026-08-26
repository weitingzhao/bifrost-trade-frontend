import { CopilotComposer } from '@/components/cockpit/CopilotComposer'
import { CopilotMessageList } from '@/components/cockpit/CopilotMessageList'
import { useCopilotSession } from '@/hooks/useCopilotSession'
import { useQuery } from '@tanstack/react-query'
import { fetchCopilotUsage } from '@/api/aiCopilot'
import { useEffect } from 'react'
import { copilotSessionStore } from '@/hooks/useCopilotSession'

export function CopilotTab() {
  const {
    messages,
    model,
    streaming,
    lastError,
    capBreached,
    send,
    setModel,
    approveWrite,
    rejectWrite,
  } = useCopilotSession()

  const usageQ = useQuery({
    queryKey: ['research', 'copilot', 'usage'],
    queryFn: ({ signal }) => fetchCopilotUsage(signal),
    refetchInterval: 30_000,
    retry: 1,
  })

  useEffect(() => {
    const rem = usageQ.data?.remaining_usd
    if (typeof rem === 'number' && rem <= 0) {
      copilotSessionStore.setCapBreached(true)
    } else if (typeof rem === 'number' && rem > 0) {
      copilotSessionStore.setCapBreached(false)
    }
  }, [usageQ.data?.remaining_usd])

  const blocked = capBreached || streaming

  return (
    <div className="flex h-full min-h-0 flex-col gap-2">
      {capBreached ? (
        <div
          role="alert"
          className="rounded border border-destructive/40 bg-destructive/10 px-2 py-1.5 text-dense-meta text-destructive"
        >
          Daily AI cap reached — resets at 00:00 UTC
        </div>
      ) : null}
      {lastError && !capBreached ? (
        <p className="text-dense-meta text-destructive leading-snug">{lastError}</p>
      ) : null}
      <div className="min-h-0 flex-1 overflow-y-auto pr-0.5">
        <CopilotMessageList
          messages={messages}
          onApproveWrite={approveWrite}
          onRejectWrite={rejectWrite}
        />
      </div>
      <CopilotComposer
        model={model}
        onModelChange={setModel}
        onSend={send}
        disabled={blocked}
      />
    </div>
  )
}
