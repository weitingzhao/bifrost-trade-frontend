/**
 * A control write's lifecycle as one line of text: "Setting suspend…", then
 * what the daemon will do and when, or the error — cleared after six seconds.
 *
 * Moved from the retired System › Daemon page (2026-09-25); the Hedge menu is
 * its one reader.
 */
import { useCallback, useEffect, useRef, useState } from 'react'

type CtrlMsg = { text: string; isErr: boolean }

export function useCtrlAction(onSuccess?: () => void) {
  const [msg, setMsg] = useState<CtrlMsg>({ text: '', isErr: false })
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const clear = useCallback(() => {
    if (timer.current) clearTimeout(timer.current)
    timer.current = null
  }, [])

  useEffect(() => () => clear(), [clear])

  const run = useCallback(async (
    fn: () => Promise<{ ok?: boolean; error?: string }>,
    messages: { loading: string; success: string },
  ) => {
    clear()
    setMsg({ text: messages.loading, isErr: false })
    try {
      const res = await fn()
      if (res.ok === false) throw new Error(res.error ?? 'Unknown error')
      setMsg({ text: messages.success, isErr: false })
      onSuccess?.()
    } catch (e) {
      setMsg({ text: (e as Error).message, isErr: true })
    }
    timer.current = setTimeout(() => setMsg({ text: '', isErr: false }), 6000)
  }, [clear, onSuccess])

  return { msg, run }
}
