import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { useState } from 'react'
import {
  createPlaybookNote,
  createPlaybookRule,
  fetchPlaybookCases,
  fetchPlaybookNotes,
  fetchPlaybookRules,
  retirePlaybookRule,
  searchPlaybook,
} from '@/api/playbook'
import { PageHeader } from '@/components/layout/PageHeader'
import { PageShell } from '@/components/layout/PageShell'
import { ExportSessionMenu } from '@/components/cockpit/ExportSessionMenu'
import { MarkdownContent } from '@/components/cockpit/MarkdownContent'
import { ResearchUserSwitcher } from '@/components/auth/ResearchUserSwitcher'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { QueryErrorAlert } from '@/components/ui/QueryErrorAlert'
import { Skeleton } from '@/components/ui/skeleton'
import { DenseTag, SegmentControl } from '@/components/data-display'
import type { CopilotUiMessage } from '@/hooks/useCopilotSession'
import { cn } from '@/lib/utils'
import {
  CATEGORIES,
  caseHeadline,
  caseMeta,
  hasTradeRef,
  noteWhen,
  outcomeTone,
  ruleMeta,
  tabHint,
  type PlaybookTab,
} from './playbookModel'

/** Wrap a playbook case as a pseudo-session for export reuse (RS-EX1-P4). */
function caseAsExportMessages(c: {
  outcome?: string | null
  lessons_md: string
}): CopilotUiMessage[] {
  const parts: string[] = []
  if (c.outcome) parts.push(`**Outcome:** ${c.outcome}`)
  parts.push(c.lessons_md)
  return [
    {
      id: 'case-export',
      role: 'assistant',
      content: parts.join('\n\n'),
    },
  ]
}

function MutationError({ error }: { error: unknown }) {
  if (!error) return null
  return (
    <p className="text-dense-meta text-destructive">
      {error instanceof Error ? error.message : String(error)}
    </p>
  )
}

export function PlaybookPage() {
  const [tab, setTab] = useState<PlaybookTab>('rules')
  const [searchQ, setSearchQ] = useState('')
  const [openCase, setOpenCase] = useState<string | null>(null)
  const qc = useQueryClient()

  const rulesQ = useQuery({
    queryKey: ['playbook', 'rules'],
    queryFn: () => fetchPlaybookRules(),
    enabled: tab === 'rules',
  })
  const notesQ = useQuery({
    queryKey: ['playbook', 'notes'],
    queryFn: () => fetchPlaybookNotes(),
    enabled: tab === 'notes',
  })
  const casesQ = useQuery({
    queryKey: ['playbook', 'cases'],
    queryFn: () => fetchPlaybookCases(),
    enabled: tab === 'cases',
  })
  const searchQry = useQuery({
    queryKey: ['playbook', 'search', searchQ],
    queryFn: () => searchPlaybook(searchQ),
    enabled: tab === 'search' && searchQ.trim().length >= 2,
  })

  const [newRuleTitle, setNewRuleTitle] = useState('')
  const [newRuleCategory, setNewRuleCategory] = useState<string>('general')
  const [newRuleBody, setNewRuleBody] = useState('')
  const [newNoteBody, setNewNoteBody] = useState('')

  const createRule = useMutation({
    mutationFn: () =>
      createPlaybookRule({
        title: newRuleTitle,
        category: newRuleCategory,
        body_md: newRuleBody,
      }),
    onSuccess: () => {
      setNewRuleTitle('')
      setNewRuleBody('')
      qc.invalidateQueries({ queryKey: ['playbook', 'rules'] })
    },
  })

  const createNote = useMutation({
    mutationFn: () => createPlaybookNote({ note_md: newNoteBody }),
    onSuccess: () => {
      setNewNoteBody('')
      qc.invalidateQueries({ queryKey: ['playbook', 'notes'] })
    },
  })

  const retireRule = useMutation({
    mutationFn: (id: string) => retirePlaybookRule(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['playbook', 'rules'] }),
  })

  const hint = tabHint(tab, {
    rules: rulesQ.data,
    notes: notesQ.data,
    cases: casesQ.data,
  })
  const nowIso = new Date().toISOString()
  const searchTerm = searchQ.trim()
  const noResults =
    tab === 'search' &&
    searchTerm.length >= 2 &&
    searchQry.data != null &&
    (searchQry.data.rules ?? []).length === 0 &&
    (searchQry.data.notes ?? []).length === 0

  return (
    <PageShell padding="default">
      <PageHeader
        title="Playbook"
        description="Rules, notes and case studies — the trading system in writing."
        actions={
          <div className="flex items-center gap-3">
            <Link
              to="/review/playbook-stats"
              className="whitespace-nowrap text-dense-label text-primary hover:underline"
            >
              Does it pay? Playbook stats →
            </Link>
            <ResearchUserSwitcher />
          </div>
        }
      />

      {/* Program research-copilot-reach P4 — name the knowledge-loop break.
          The Copilot can propose rules and notes here, and its own agents read
          them back (research.playbook.rules_active). Trade-side daemon / gate
          configuration does NOT read this playbook. Under the D10 freeze that
          is the correct wiring, but nothing in the UI said so, leaving the
          impression that saving a rule arms it. */}
      <div
        role="note"
        className="rounded-md border border-border/60 bg-secondary px-3 py-2 text-dense-meta leading-snug text-muted-foreground"
      >
        <span className="font-medium text-foreground">Advisory only.</span> Rules and notes
        inform Copilot reasoning and your own review. They are{' '}
        <span className="font-medium text-foreground">not</span> read by the trading daemon or
        gate configuration and do not arm or block any order — spine{' '}
        <span className="font-mono">D10</span> (trade execution frozen).
      </div>

      <div className="mb-3 flex items-center gap-2.5">
        <SegmentControl
          ariaLabel="Playbook section"
          value={tab}
          onChange={(v) => setTab(v as PlaybookTab)}
          options={[
            { value: 'rules', label: 'Rules' },
            { value: 'notes', label: 'Notes' },
            { value: 'cases', label: 'Cases' },
            { value: 'search', label: 'Search' },
          ]}
        />
        {hint ? <span className="text-dense-meta text-muted-foreground">{hint}</span> : null}
      </div>

      {tab === 'rules' ? (
        <div className="flex flex-col gap-3">
          <Card variant="elevated" className="space-y-2 p-3">
            <p className="text-dense-caption font-semibold uppercase tracking-wider text-muted-foreground">
              New rule
            </p>
            <Input
              placeholder="Title — one sentence, imperative"
              value={newRuleTitle}
              onChange={(e) => setNewRuleTitle(e.target.value)}
              className="h-8"
            />
            <SegmentControl
              ariaLabel="Rule category"
              value={newRuleCategory}
              onChange={setNewRuleCategory}
              options={CATEGORIES.map((c) => ({ value: c, label: c }))}
            />
            <textarea
              className="min-h-[100px] w-full rounded border border-border bg-background p-2 text-dense-label"
              placeholder="Markdown body — the rule, the reason, the tell that you are about to break it"
              value={newRuleBody}
              onChange={(e) => setNewRuleBody(e.target.value)}
            />
            <div>
              <Button
                size="sm"
                disabled={!newRuleTitle.trim() || !newRuleBody.trim() || createRule.isPending}
                onClick={() => createRule.mutate()}
              >
                Save rule
              </Button>
            </div>
            <MutationError error={createRule.error} />
          </Card>
          {rulesQ.isError ? (
            <QueryErrorAlert error={rulesQ.error} onRetry={() => void rulesQ.refetch()} />
          ) : null}
          {rulesQ.isLoading ? <Skeleton className="h-24 w-full" /> : null}
          <MutationError error={retireRule.error} />
          <div className="space-y-2">
            {(rulesQ.data ?? []).map((rule) => {
              const retired = rule.active === false
              const meta = ruleMeta(rule)
              return (
                <Card
                  key={rule.id}
                  variant="elevated"
                  className={cn('p-3', retired && 'opacity-45')}
                >
                  <div className="flex items-baseline gap-2.5">
                    <DenseTag variant="category">{rule.category}</DenseTag>
                    <span className="text-dense-label font-medium">{rule.title}</span>
                    <span className="ml-auto">
                      {retired ? (
                        <span className="text-dense-meta text-muted-foreground">retired</span>
                      ) : (
                        <button
                          type="button"
                          className="text-dense-meta text-muted-foreground hover:text-foreground disabled:opacity-50"
                          disabled={retireRule.isPending}
                          onClick={() => retireRule.mutate(rule.id)}
                        >
                          Retire
                        </button>
                      )}
                    </span>
                  </div>
                  <MarkdownContent className="mt-1">{rule.body_md}</MarkdownContent>
                  {meta ? (
                    <p className="mt-1 text-dense-caption text-muted-foreground">{meta}</p>
                  ) : null}
                </Card>
              )
            })}
          </div>
        </div>
      ) : null}

      {tab === 'notes' ? (
        <div className="flex flex-col gap-3">
          <Card variant="elevated" className="space-y-2 p-3">
            <p className="text-dense-caption font-semibold uppercase tracking-wider text-muted-foreground">
              Quick note
            </p>
            <textarea
              className="min-h-[64px] w-full rounded border border-border bg-background p-2 text-dense-label"
              placeholder="Markdown — observations that are not yet rules"
              value={newNoteBody}
              onChange={(e) => setNewNoteBody(e.target.value)}
            />
            <div>
              <Button
                size="sm"
                disabled={!newNoteBody.trim() || createNote.isPending}
                onClick={() => createNote.mutate()}
              >
                Save note
              </Button>
            </div>
            <MutationError error={createNote.error} />
          </Card>
          {notesQ.isError ? (
            <QueryErrorAlert error={notesQ.error} onRetry={() => void notesQ.refetch()} />
          ) : null}
          {notesQ.isLoading ? <Skeleton className="h-24 w-full" /> : null}
          {(notesQ.data ?? []).map((n) => {
            const when = noteWhen(n.created_at, nowIso)
            return (
              <Card key={n.id} variant="elevated" className="p-3">
                <MarkdownContent>{n.note_md}</MarkdownContent>
                {when ? (
                  <p className="mt-1 text-dense-caption text-muted-foreground">{when}</p>
                ) : null}
              </Card>
            )
          })}
        </div>
      ) : null}

      {tab === 'cases' ? (
        <div className="space-y-2">
          {casesQ.isError ? (
            <QueryErrorAlert error={casesQ.error} onRetry={() => void casesQ.refetch()} />
          ) : null}
          {casesQ.isLoading ? <Skeleton className="h-24 w-full" /> : null}
          {casesQ.data?.length === 0 ? (
            <p className="text-dense-meta text-muted-foreground">
              No case studies yet — cases are filed from Copilot bridge replies, not written
              here.
            </p>
          ) : null}
          {(casesQ.data ?? []).map((c) => {
            const open = openCase === c.id
            const { title, lede } = caseHeadline(c.lessons_md)
            const meta = caseMeta(c)
            return (
              <Card key={c.id} variant="elevated" className="overflow-hidden p-0">
                <button
                  type="button"
                  className="w-full p-3 text-left transition-colors hover:bg-secondary/40"
                  onClick={() => setOpenCase(open ? null : c.id)}
                >
                  <div className="flex items-baseline gap-2.5">
                    {c.outcome ? (
                      <DenseTag
                        variant={outcomeTone(c.outcome) === 'loss' ? 'danger' : 'success'}
                      >
                        {c.outcome}
                      </DenseTag>
                    ) : null}
                    <span className="text-dense-label font-medium">{title}</span>
                    {meta ? (
                      <span className="ml-auto whitespace-nowrap text-dense-caption text-muted-foreground">
                        {meta}
                      </span>
                    ) : null}
                  </div>
                  {lede ? (
                    <p className="mt-1 line-clamp-2 text-dense-meta text-muted-foreground">
                      {lede}
                    </p>
                  ) : null}
                </button>
                {open ? (
                  <div className="space-y-2 border-t border-border/60 bg-background p-3">
                    <MarkdownContent>{c.lessons_md}</MarkdownContent>
                    <div className="flex items-center justify-between gap-2">
                      {hasTradeRef(c) ? (
                        <Link
                          to="/review"
                          className="text-dense-meta text-primary hover:underline"
                        >
                          Open the trade in Review →
                        </Link>
                      ) : (
                        <span className="text-dense-meta text-muted-foreground">
                          Open the trade in Review · no trade reference on this case
                        </span>
                      )}
                      <ExportSessionMenu
                        messages={caseAsExportMessages(c)}
                        sessionId={c.id}
                        sessionTitle={c.outcome ?? 'Playbook case'}
                      />
                    </div>
                  </div>
                ) : null}
              </Card>
            )
          })}
        </div>
      ) : null}

      {tab === 'search' ? (
        <div className="space-y-3">
          <Input
            placeholder="Search rules and notes — 2+ characters"
            value={searchQ}
            onChange={(e) => setSearchQ(e.target.value)}
            className="h-8 max-w-[420px]"
          />
          {searchQry.isError ? (
            <QueryErrorAlert error={searchQry.error} onRetry={() => void searchQry.refetch()} />
          ) : null}
          {searchQry.isFetching ? <Skeleton className="h-16 w-full" /> : null}
          {searchQry.data ? (
            <div className="space-y-2">
              {(searchQry.data.rules ?? []).map((r) => (
                <Card key={r.id} variant="elevated" className="p-3">
                  <div className="flex items-baseline gap-2.5">
                    <DenseTag variant="category">{r.category}</DenseTag>
                    <span className="text-dense-label font-medium">{r.title}</span>
                  </div>
                  <MarkdownContent className="mt-1">{r.body_md}</MarkdownContent>
                </Card>
              ))}
              {(searchQry.data.notes ?? []).map((n) => (
                <Card key={n.id} variant="elevated" className="p-3">
                  <div className="flex items-baseline gap-2.5">
                    <DenseTag variant="neutral">note</DenseTag>
                  </div>
                  <MarkdownContent className="mt-1">{n.note_md}</MarkdownContent>
                </Card>
              ))}
            </div>
          ) : null}
          {noResults ? (
            <div className="py-6 text-center text-dense-meta text-muted-foreground">
              No rule or note matches “{searchTerm}” — an empty result, not a failed search.
            </div>
          ) : null}
        </div>
      ) : null}
    </PageShell>
  )
}

export default PlaybookPage
