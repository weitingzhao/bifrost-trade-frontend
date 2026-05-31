const BASE_DELAY_MS = 2_000
const MAX_DELAY_MS = 30_000

/**
 * Opens an SSE connection with exponential backoff reconnect on error.
 * Resets delay to BASE on first successful message after each reconnect.
 * Returns a cleanup function that cancels any pending reconnect and closes the connection.
 */
export function openSseWithBackoff(
  url: string,
  onRawMessage: (data: string) => void,
  onError?: () => void,
): () => void {
  let closed = false
  let es: EventSource | null = null
  let retryHandle: ReturnType<typeof setTimeout> | null = null
  let delay = BASE_DELAY_MS

  function connect() {
    if (closed) return
    es = new EventSource(url)
    es.onmessage = (e: MessageEvent<string>) => {
      delay = BASE_DELAY_MS
      onRawMessage(e.data)
    }
    es.onerror = () => {
      es?.close()
      es = null
      if (closed) return
      onError?.()
      retryHandle = setTimeout(() => {
        retryHandle = null
        delay = Math.min(delay * 2, MAX_DELAY_MS)
        connect()
      }, delay)
    }
  }

  connect()

  return () => {
    closed = true
    if (retryHandle != null) {
      clearTimeout(retryHandle)
      retryHandle = null
    }
    es?.close()
    es = null
  }
}
