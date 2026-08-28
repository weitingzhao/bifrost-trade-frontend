import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  createPlaybookNote,
  createPlaybookRule,
  fetchPlaybookCases,
  fetchPlaybookNotes,
  fetchPlaybookRules,
  retirePlaybookRule,
  searchPlaybook,
  type PlaybookCase,
} from '@/api/playbook'
import { PageHeader } from '@/components/layout/PageHeader'
import { PageShell } from '@/components/layout/PageShell'
import { ExportSessionMenu } from '@/components/cockpit/ExportSessionMenu'
import { MarkdownContent } from '@/components/cockpit/MarkdownContent'
import { ResearchUserSwitcher } from '@/components/auth/ResearchUserSwitcher'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { SegmentControl } from '@/components/data-display'
import type { CopilotUiMessage } from '@/hooks/useCopilotSession'
import { useState } from 'react'

type TabId = 'rules' | 'notes' | 'cases' | 'search'

const CATEGORIES = [
  'general',
  'entry',
  'exit',
  'sizing',
  'hedge',
  'risk',
  'regime',
  'instrument',
] as const

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

export function PlaybookPage() {
  const [tab, setTab] = useState<TabId>('rules')
  const [searchQ, setSearchQ] = useState('')
  const [selectedCase, setSelectedCase] = useState<PlaybookCase | null>(null)
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

  return (
    <PageShell padding="default">
      <PageHeader
        title="My Trading System"
        description="Playbook rules, notes, and case studies — your long-term trading DNA."
        actions={<ResearchUserSwitcher />}
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
        <span className="font-medium text-foreground">Advisory only.</span>{' '}
        These rules and notes inform Copilot reasoning and your own review. They are{' '}
        <span className="font-medium text-foreground">not</span> read by the trading daemon or
        gate configuration, and do not arm or block any order — spine{' '}
        <span className="font-mono">D10</span> (trade execution frozen).
      </div>

      <SegmentControl
        ariaLabel="Playbook section"
        value={tab}
        onChange={(v) => setTab(v as TabId)}
        options={[
          { value: 'rules', label: 'Rules' },
          { value: 'notes', label: 'Notes' },
          { value: 'cases', label: 'Cases' },
          { value: 'search', label: 'Search' },
        ]}
        className="mb-3"
      />

      {tab === 'rules' ? (
        <div className="flex flex-col gap-3">
          <Card variant="elevated" className="p-3 space-y-2">
            <p className="text-dense-label font-medium">New rule</p>
            <Input
              placeholder="Title"
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
              placeholder="Markdown rule body…"
              value={newRuleBody}
              onChange={(e) => setNewRuleBody(e.target.value)}
            />
            <Button
              size="sm"
              disabled={!newRuleTitle.trim() || !newRuleBody.trim() || createRule.isPending}
              onClick={() => createRule.mutate()}
            >
              Save rule
            </Button>
          </Card>
          <div className="space-y-2">
            {(rulesQ.data ?? []).map((rule) => (
              <Card key={rule.id} variant="elevated" className="p-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-dense-label font-medium">
                      <span className="text-primary">{rule.category}</span> · {rule.title}
                    </p>
                    <MarkdownContent className="mt-1">{rule.body_md}</MarkdownContent>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive shrink-0"
                    onClick={() => retireRule.mutate(rule.id)}
                  >
                    Retire
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        </div>
      ) : null}

      {tab === 'notes' ? (
        <div className="flex flex-col gap-3">
          <Card variant="elevated" className="p-3 space-y-2">
            <textarea
              className="min-h-[80px] w-full rounded border border-border bg-background p-2 text-dense-label"
              placeholder="Quick note…"
              value={newNoteBody}
              onChange={(e) => setNewNoteBody(e.target.value)}
            />
            <Button
              size="sm"
              disabled={!newNoteBody.trim() || createNote.isPending}
              onClick={() => createNote.mutate()}
            >
              Save note
            </Button>
          </Card>
          {(notesQ.data ?? []).map((n) => (
            <Card key={n.id} variant="elevated" className="p-3">
              <MarkdownContent>{n.note_md}</MarkdownContent>
            </Card>
          ))}
        </div>
      ) : null}

      {tab === 'cases' ? (
        <div className="space-y-2">
          {(casesQ.data ?? []).map((c) => (
            <Card
              key={c.id}
              variant="elevated"
              className="cursor-pointer p-3 transition-colors hover:bg-secondary/40"
              onClick={() => setSelectedCase(c)}
            >
              {c.outcome ? (
                <p className="text-dense-caption text-muted-foreground mb-1">{c.outcome}</p>
              ) : null}
              <MarkdownContent>{c.lessons_md}</MarkdownContent>
            </Card>
          ))}
        </div>
      ) : null}

      {tab === 'search' ? (
        <div className="space-y-3">
          <Input
            placeholder="Search rules and notes…"
            value={searchQ}
            onChange={(e) => setSearchQ(e.target.value)}
            className="h-8"
          />
          {searchQry.data ? (
            <div className="space-y-2">
              {(searchQry.data.rules ?? []).map((r) => (
                <Card key={r.id} variant="elevated" className="p-3">
                  <p className="text-dense-label font-medium">{r.title}</p>
                  <MarkdownContent className="mt-1">{r.body_md}</MarkdownContent>
                </Card>
              ))}
              {(searchQry.data.notes ?? []).map((n) => (
                <Card key={n.id} variant="elevated" className="p-3">
                  <MarkdownContent>{n.note_md}</MarkdownContent>
                </Card>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}

      <Dialog open={Boolean(selectedCase)} onOpenChange={(o) => !o && setSelectedCase(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Case study</DialogTitle>
          </DialogHeader>
          {selectedCase ? (
            <div className="space-y-3">
              {selectedCase.outcome ? (
                <p className="text-dense-caption text-muted-foreground">{selectedCase.outcome}</p>
              ) : null}
              <MarkdownContent>{selectedCase.lessons_md}</MarkdownContent>
              <div className="flex justify-end">
                <ExportSessionMenu
                  messages={caseAsExportMessages(selectedCase)}
                  sessionId={selectedCase.id}
                  sessionTitle={selectedCase.outcome ?? 'Playbook case'}
                />
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </PageShell>
  )
}

export default PlaybookPage
