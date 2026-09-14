/**
 * A lamp from objective-run statuses — shared by the Copilot Desk's Ran today
 * rows and the daily digest's loop lamp, so the two never colour the same run
 * differently. Design confirmed the four states (Copilot Desk response ⑧).
 */
import type { LampTone } from '@/lib/lampTone'

/** One run's status as the page knows it: the run's own word, still fetching, no longer kept, or failed to load. */
export type RunStatusRead = string | 'loading' | 'gone' | 'error'

const RUN_STATUS_WORD: Record<string, string> = {
  running: 'still running',
  awaiting_approval: 'awaiting approval',
  cancelled: 'cancelled',
  failed: 'failed',
  completed: 'completed',
}

function tallyWords(statuses: readonly string[]): string {
  const n = new Map<string, number>()
  for (const s of statuses) n.set(s, (n.get(s) ?? 0) + 1)
  return [...n.entries()].map(([s, k]) => `${k} ${RUN_STATUS_WORD[s] ?? s}`).join(' · ')
}

/**
 * A row's lamp, from the runs its drafts came from.
 *
 * Red is a run that failed — a fault. Amber is a run that has not finished its
 * business: still running, waiting on you, or cancelled part-way (a stopped run
 * wants a look, not an alarm). Green is every linked run completed, or a row
 * that links no run at all: it wrote today, and agents outside the objective
 * runs record nothing more to check. Grey is not knowing — still loading, or
 * none of its runs readable, or a status this page does not recognise — because
 * not knowing is not a fault.
 */
export function rowLamp(
  runIds: readonly string[],
  statusByRun: ReadonlyMap<string, RunStatusRead>,
): { lamp: LampTone; why: string } {
  if (runIds.length === 0) {
    return { lamp: 'green', why: 'Wrote today. It links no objective run, so there is no run status to check.' }
  }
  const statuses = runIds.map((id) => statusByRun.get(id) ?? 'loading')
  if (statuses.includes('loading')) return { lamp: 'gray', why: 'Reading run status…' }
  const known = statuses.filter((s) => s !== 'gone' && s !== 'error')
  if (known.length === 0) {
    return { lamp: 'gray', why: `None of its ${runIds.length} run${runIds.length === 1 ? '' : 's'} could be read.` }
  }
  const why = tallyWords(known) + (known.length < statuses.length ? ` · ${statuses.length - known.length} unreadable` : '')
  if (known.includes('failed')) return { lamp: 'red', why }
  if (known.some((s) => s === 'running' || s === 'awaiting_approval' || s === 'cancelled')) return { lamp: 'yellow', why }
  if (known.every((s) => s === 'completed')) return { lamp: 'green', why }
  return { lamp: 'gray', why: `${why} — a status this page does not recognise` }
}
