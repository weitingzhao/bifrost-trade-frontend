import { isAppFocused, subscribeAppFocus } from './appFocus'

const BASE_DELAY_MS = 2_000
const MAX_DELAY_MS = 30_000

export interface SseOptions {
  /**
   * When true (default), the SSE connection auto-pauses while the app is
   * idle (no user activity for ~60s, or window hidden/blurred).  Activity
   * automatically resumes the connection.
   *
   * Set to `false` for streams that MUST stay open regardless of user
   * activity (rare — most dashboards should leave this on).
   */
  pauseWhenIdle?: boolean
}

/**
 * Opens an SSE connection with exponential backoff reconnect on error.
 * Resets delay to BASE on first successful message after each reconnect.
 *
 * Cursor-Browser compatibility: by default the connection is torn down
 * during app-idle periods (see src/lib/appFocus.ts) so background tabs
 * and unfocused windows don't burn the IDE main thread.  Activity
 * automatically re-opens the stream.
 *
 * Returns a cleanup function that cancels any pending reconnect,
 * closes the connection, and unsubscribes from focus events.
 */
export function openSseWithBackoff(
  url: string,
  onRawMessage: (data: string) => void,
  onError?: () => void,
  options: SseOptions = {},
): () => void {
  const { pauseWhenIdle = true } = options
  let closed = false
  let paused = pauseWhenIdle ? !isAppFocused() : false
  let es: EventSource | null = null
  let retryHandle: ReturnType<typeof setTimeout> | null = null
  let delay = BASE_DELAY_MS

  function clearRetry(): void {
    if (retryHandle != null) {
      clearTimeout(retryHandle)
      retryHandle = null
    }
  }

  function disconnect(): void {
    clearRetry()
    if (es) {
      es.close()
      es = null
    }
  }

  function connect(): void {
    if (closed || paused || es) return
    es = new EventSource(url)
    es.onmessage = (e: MessageEvent<string>) => {
      delay = BASE_DELAY_MS
      onRawMessage(e.data)
    }
    es.onerror = () => {
      es?.close()
      es = null
      if (closed || paused) return
      onError?.()
      retryHandle = setTimeout(() => {
        retryHandle = null
        delay = Math.min(delay * 2, MAX_DELAY_MS)
        connect()
      }, delay)
    }
  }

  let focusUnsub: () => void = () => {}
  if (pauseWhenIdle) {
    focusUnsub = subscribeAppFocus((focused) => {
      if (closed) return
      if (focused) {
        if (paused) {
          paused = false
          delay = BASE_DELAY_MS
        }
        connect()
      } else if (!paused) {
        paused = true
        disconnect()
      }
    })
  } else {
    connect()
  }

  return () => {
    closed = true
    focusUnsub()
    disconnect()
  }
}
