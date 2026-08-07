import type { MassiveJobApiRow } from '@/types/ops'

const DISABLED = 'Massive Trade API removed — use Market Data Plugin'

/** No-op stand-in for deleted Massive job SSE subscription. */
export function subscribeMassiveJobEvents(
  _jobId: string,
  onEvent: (data: {
    ok: boolean
    error?: string
    job?: MassiveJobApiRow
  }) => void,
): { close: () => void } {
  queueMicrotask(() => {
    onEvent({ ok: false, error: DISABLED })
  })
  return { close: () => undefined }
}
