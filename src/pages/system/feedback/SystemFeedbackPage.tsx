/**
 * System › Feedback — the triage face (design Rev .96, `System Feedback.dc.html`).
 *
 * The other side of the in-system loop: everything the trader filed, blocking
 * reports first, one selected report with its shell-collected context, and
 * the two writes that close the loop — a status move and a reply. Both land
 * on the reporter's row as the unread dot (the store sets it; My reports
 * clears it on sight).
 */
import { useMemo, useState } from 'react'
import { QUERY_KEYS } from '@/constants/queryKeys'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  FEEDBACK_STATUSES,
  OPEN_STATUSES,
  feedbackImageUrl,
  fetchFeedbackReports,
  replyFeedback,
  setFeedbackStatus,
  type FeedbackReport,
  type FeedbackStatus,
} from '@/api/research/feedback'
import { ViewState } from '@bifrost/ui'
import { PageHead, PageShell } from '@/components/layout'
import { SegmentControl } from '@/components/data-display'
import { Button } from '@/components/ui/button'
import { failedDetail } from '@/lib/viewState'
import { cn } from '@/lib/utils'

const td = 'whitespace-nowrap border-b border-border/55 px-2 py-1.25 text-left text-dense-body'
const th =
  'whitespace-nowrap border-b border-border px-2 py-1 text-left align-bottom text-dense-caption font-semibold text-secondary-foreground'

export default function SystemFeedbackPage() {
  const qc = useQueryClient()
  const [scope, setScope] = useState<'open' | 'all'>('open')
  const [sel, setSel] = useState<string | null>(null)
  const [reply, setReply] = useState('')
  const [error, setError] = useState<string | null>(null)

  const reportsQ = useQuery({
    queryKey: QUERY_KEYS.tradeResearch.feedback.reports(scope),
    queryFn: () => fetchFeedbackReports(scope),
    refetchInterval: 60_000,
    retry: 1,
  })
  const rows = useMemo(() => reportsQ.data?.reports ?? [], [reportsQ.data])
  const selected: FeedbackReport | null = rows.find((r) => r.id === sel) ?? rows[0] ?? null

  const invalidate = () => qc.invalidateQueries({ queryKey: QUERY_KEYS.tradeResearch.feedback.root })
  const statusMut = useMutation({
    mutationFn: (s: FeedbackStatus) => setFeedbackStatus(selected!.id, s),
    onSuccess: invalidate,
    onError: (e: Error) => setError(e.message),
  })
  const replyMut = useMutation({
    mutationFn: () => replyFeedback(selected!.id, reply.trim()),
    onSuccess: () => {
      setReply('')
      setError(null)
      invalidate()
    },
    onError: (e: Error) => setError(e.message),
  })

  const openN = rows.filter((r) => OPEN_STATUSES.includes(r.status)).length
  const blockN = rows.filter((r) => OPEN_STATUSES.includes(r.status) && r.blocks_trading).length
  const waitN = rows.filter((r) => r.status === 'new').length

  return (
    <PageShell padding="compact" className="space-y-3">
      <PageHead
        title="Feedback"
        info="The triage face — everything filed from the top bar, blocking reports first. A status move or a reply lands back on the reporter's row; the loop never leaves the system."
      />
      <div data-sr-toolbar="">
        <SegmentControl
          ariaLabel="Scope"
          size="xs"
          value={scope}
          onChange={(v) => setScope(v as 'open' | 'all')}
          options={[
            { value: 'open', label: 'Open' },
            { value: 'all', label: 'All' },
          ]}
        />
        <span data-sr-tb="sep" />
        <span className="font-mono text-dense-meta text-muted-foreground" data-sr-kpi="">
          {openN} open · <b className={blockN ? 'text-warning' : ''}>{blockN} blocking</b> ·{' '}
          {waitN} waiting
        </span>
      </div>

      {reportsQ.isLoading ? (
        <section className="overflow-hidden mat-card">
          <ViewState kind="loading" title="Loading reports" rows={6} cols={5} />
        </section>
      ) : reportsQ.isError ? (
        <section className="overflow-hidden mat-card">
          <ViewState
            kind="failed"
            title="Couldn’t read the feedback store"
            detail={failedDetail(reportsQ, 'ops_feedback did not answer.')}
            onAction={() => void reportsQ.refetch()}
          />
        </section>
      ) : rows.length === 0 ? (
        <section className="overflow-hidden mat-card">
          <ViewState
            kind="empty"
            title={scope === 'open' ? 'Nothing open' : 'No reports yet'}
            detail="The top bar's Feedback button files one from any page."
          />
        </section>
      ) : (
        <div className="flex flex-wrap items-start gap-3">
          <section className="min-w-0 flex-[1_1_30rem] overflow-x-auto mat-card">
            <table className="w-full border-collapse" data-sr-table="">
              <thead>
                <tr>
                  <th className={th}>ID</th>
                  <th className={th}>Kind</th>
                  <th className={th}>Title</th>
                  <th className={th}>Page</th>
                  <th className={th} data-sr-col="tag">
                    Blocks
                  </th>
                  <th className={th}>Status</th>
                  <th className={th}>Sent</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr
                    key={r.id}
                    onClick={() => setSel(r.id)}
                    className={cn(
                      'cursor-pointer hover:bg-[color-mix(in_srgb,var(--sk-ink)_5%,transparent)]',
                      selected?.id === r.id &&
                        'bg-[color-mix(in_srgb,var(--sk-accent)_10%,transparent)]',
                    )}
                  >
                    <td className={cn(td, 'font-mono')}>{r.id}</td>
                    <td className={td}>{r.kind}</td>
                    <td className={cn(td, 'max-w-[26rem] truncate whitespace-normal')}>{r.title}</td>
                    <td className={cn(td, 'text-muted-foreground')}>{r.page_label || '—'}</td>
                    <td className={cn(td, r.blocks_trading ? 'text-warning' : 'text-muted-foreground')}>
                      {r.blocks_trading ? 'yes' : '—'}
                    </td>
                    <td className={td}>{r.status}</td>
                    <td className={cn(td, 'font-mono text-muted-foreground')}>
                      {(r.created_at ?? '').slice(5, 16).replace('T', ' ')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          {selected ? (
            <aside className="flex min-w-0 flex-[1_1_20rem] flex-col gap-2 mat-card p-3 lg:max-w-[26rem]">
              <div className="flex flex-wrap items-baseline gap-2">
                <span className="font-mono text-dense-body font-bold">{selected.id}</span>
                <span className="text-dense-meta text-muted-foreground">{selected.kind}</span>
                {selected.blocks_trading ? (
                  <span className="text-dense-meta text-warning">blocks trading</span>
                ) : null}
                <span className="ml-auto font-mono text-dense-micro text-muted-foreground">
                  {(selected.created_at ?? '').slice(0, 16).replace('T', ' ')}
                </span>
              </div>
              <p className="text-dense-body font-semibold">{selected.title}</p>
              {selected.body_md ? (
                <p className="whitespace-pre-wrap text-dense-body text-foreground">
                  {selected.body_md}
                </p>
              ) : null}
              {selected.images > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {Array.from({ length: selected.images }, (_, i) => (
                    <a key={i} href={feedbackImageUrl(selected.id, i)} target="_blank" rel="noreferrer">
                      <img
                        src={feedbackImageUrl(selected.id, i)}
                        alt={`attachment ${i + 1}`}
                        className="h-16 rounded border border-border/60 object-cover"
                      />
                    </a>
                  ))}
                </div>
              ) : null}
              <pre className="max-h-32 overflow-auto rounded bg-[color-mix(in_srgb,var(--sk-ink)_6%,transparent)] p-2 font-mono text-dense-micro text-muted-foreground">
                {JSON.stringify(selected.context, null, 1)}
              </pre>
              {selected.reply_md ? (
                <p className="rounded bg-[color-mix(in_srgb,var(--sk-accent)_8%,transparent)] px-2 py-1 text-dense-meta">
                  Reply · {(selected.replied_at ?? '').slice(5, 16).replace('T', ' ')} —{' '}
                  {selected.reply_md}
                </p>
              ) : null}
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-dense-micro text-muted-foreground">status</span>
                {FEEDBACK_STATUSES.map((s) => (
                  <button
                    key={s}
                    type="button"
                    disabled={statusMut.isPending || selected.status === s}
                    onClick={() => statusMut.mutate(s)}
                    className={cn(
                      'mat-tag text-dense-micro',
                      selected.status === s
                        ? 'text-foreground'
                        : 'text-muted-foreground hover:text-foreground',
                    )}
                  >
                    {s}
                  </button>
                ))}
              </div>
              <div className="flex items-end gap-2">
                <textarea
                  value={reply}
                  onChange={(e) => setReply(e.target.value)}
                  rows={2}
                  placeholder="Reply — lands on the reporter's row"
                  className="mat-field min-w-0 flex-1 resize-y px-2 py-1.5 text-dense-body text-foreground outline-none placeholder:text-[var(--sk-mute)] focus:shadow-[0_0_0_3px_var(--mat-focus)]"
                />
                <Button
                  size="sm"
                  className="h-6"
                  disabled={!reply.trim() || replyMut.isPending}
                  onClick={() => replyMut.mutate()}
                >
                  Reply
                </Button>
              </div>
              {error ? <p className="text-dense-micro text-destructive">{error}</p> : null}
            </aside>
          ) : null}
        </div>
      )}
    </PageShell>
  )
}
