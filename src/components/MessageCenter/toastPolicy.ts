import type { SystemMessage } from '@/types/messages'

/**
 * Which messages interrupt, and which just wait in the Inbox.
 *
 * Every message used to raise a toast for ten seconds. Most of what the stream
 * carries does not deserve that: an IB slot reconnecting, and an IB slot coming
 * back, are ambient facts about the machine — true whether or not you are
 * looking, and the Inbox is where facts wait.
 *
 * Design (`design/trade/Docs Gaps.dc.html` F3): toast for `error`, and for the
 * result of an action you just triggered; everything else counts silently in
 * the Inbox. The second clause needs a channel to recognise "you triggered
 * this", and there is exactly one — the message centre publishes
 * `portfolio.tws_executions` from `POST /executions/fetch`, which is a button
 * and nothing else. The topic *is* the correlation; no request id to thread.
 *
 * Add a topic here only when a UI action is its sole cause. A topic the daemon
 * can also raise on its own would toast at times nobody asked for anything.
 */
const ACTION_RESULT_TOPICS: ReadonlySet<string> = new Set(['portfolio.tws_executions'])

export function shouldToast(msg: SystemMessage): boolean {
  // A dropped broker connection outranks the rule about ambient facts: it is
  // `error`, and it stops the book from being priced.
  if (msg.level === 'error') return true
  return ACTION_RESULT_TOPICS.has(msg.topic)
}
