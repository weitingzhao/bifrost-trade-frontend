/**
 * One waiting queue above the Copilot thread: drafts + awaiting loop runs.
 * Chat writes stay in the message stream (Owner C2-a5 option a).
 */
export function waitingQueueTotal(draftPending: number, runCount: number): number {
  return Math.max(0, draftPending) + Math.max(0, runCount)
}

export function waitingQueueHeadline(n: number): string {
  return `${n} waiting on you`
}

export function waitingQueueSummary(opts: {
  digest: boolean
  draftPending: number
  runCount: number
}): string {
  const bits: string[] = []
  if (opts.digest) bits.push('Daily digest')
  const otherDrafts = opts.digest
    ? Math.max(0, opts.draftPending - 1)
    : opts.draftPending
  if (otherDrafts > 0) {
    bits.push(`${otherDrafts} draft${otherDrafts === 1 ? '' : 's'}`)
  }
  if (opts.runCount > 0) {
    bits.push(`${opts.runCount} run${opts.runCount === 1 ? '' : 's'}`)
  }
  return bits.join(' · ')
}

/** Digest has no Approve (A1). Loop runs are not drafts — no fake ✓. */
export function waitingQueueShowsApprove(kind: 'digest' | 'draft' | 'run'): boolean {
  return kind === 'draft'
}

export function waitingQueueShowsDismiss(kind: 'digest' | 'draft' | 'run'): boolean {
  return kind === 'digest' || kind === 'draft'
}
