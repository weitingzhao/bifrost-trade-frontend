/**
 * Loop run pipeline — white-box harness audit (LS-3).
 * `/research/loop/runs/:runId`
 */
import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Check, MessageCircle, Sparkles } from 'lucide-react'
import { PageHeader, PageShell } from '@/components/layout'
import {
  CollapsibleGroup,
  CollapsibleGroupBody,
  CollapsibleGroupHeader,
  CollapsibleGroupTitle,
  CollapsibleChevron,
} from '@/components/data-display'
import { Button } from '@/components/ui/button'
import { QueryErrorAlert } from '@/components/ui/QueryErrorAlert'
import { Skeleton } from '@/components/ui/skeleton'
import {
  HarnessFunnelPanel,
  HarnessPlanStepper,
  HarnessRunOutputs,
  HarnessRunVerdictStrip,
  HarnessTraceEventCard,
} from '@/components/research/harness/HarnessPipelinePanels'
import {
  loopCopilotUi,
  openCopilotInbox,
  openLoopRunInCopilot,
} from '@/lib/harness/loopCopilotPrefill'
import { useCopilotPromptLang } from '@/lib/copilot/promptLang'
import { useApproveAllRun, useCurateRun, useObjectiveRun } from '@/hooks/useLoopHarness'

export default function LoopRunPipelinePage() {
  const { runId = '' } = useParams<{ runId: string }>()
  const [lang] = useCopilotPromptLang()
  const runQ = useObjectiveRun(runId)
  const curate = useCurateRun()
  const approve = useApproveAllRun()

  const [funnelOpen, setFunnelOpen] = useState(true)
  const [planOpen, setPlanOpen] = useState(false)
  const [traceOpen, setTraceOpen] = useState(false)
  const [outputsOpen, setOutputsOpen] = useState(false)

  const run = runQ.data
  const draftIds = Array.isArray(run?.outputs?.draft_ids)
    ? (run!.outputs!.draft_ids as string[])
    : []
  const awaiting = run?.status === 'awaiting_approval'
  const title = run?.objective_title ?? run?.objective_id ?? runId

  return (
    <PageShell padding="default" className="min-w-0 space-y-3">
      <PageHeader
        title="Loop Pipeline"
        description="White-box harness run — universe funnel, trace, and outputs."
        actions={
          <Button variant="outline" size="sm" className="h-7" asChild>
            <Link to="/research/loop/harness">Harness Console</Link>
          </Button>
        }
      />

      {runQ.isError ? <QueryErrorAlert error={runQ.error} /> : null}
      {runQ.isLoading ? <Skeleton className="h-40 w-full" /> : null}

      {run ? (
        <>
          <HarnessRunVerdictStrip run={run} />

          <CollapsibleGroup variant="card">
            <CollapsibleGroupHeader
              expanded={funnelOpen}
              onToggle={() => setFunnelOpen((o) => !o)}
            >
              <CollapsibleChevron expanded={funnelOpen} />
              <CollapsibleGroupTitle>Universe funnel</CollapsibleGroupTitle>
            </CollapsibleGroupHeader>
            {funnelOpen ? (
              <CollapsibleGroupBody className="px-3 pb-3">
                <HarnessFunnelPanel traceJson={run.trace_json} />
              </CollapsibleGroupBody>
            ) : null}
          </CollapsibleGroup>

          <CollapsibleGroup variant="card">
            <CollapsibleGroupHeader expanded={planOpen} onToggle={() => setPlanOpen((o) => !o)}>
              <CollapsibleChevron expanded={planOpen} />
              <CollapsibleGroupTitle>Plan</CollapsibleGroupTitle>
            </CollapsibleGroupHeader>
            {planOpen ? (
              <CollapsibleGroupBody className="px-3 pb-3">
                <HarnessPlanStepper planJson={run.plan_json} />
              </CollapsibleGroupBody>
            ) : null}
          </CollapsibleGroup>

          <CollapsibleGroup variant="card">
            <CollapsibleGroupHeader expanded={traceOpen} onToggle={() => setTraceOpen((o) => !o)}>
              <CollapsibleChevron expanded={traceOpen} />
              <CollapsibleGroupTitle>Trace events</CollapsibleGroupTitle>
            </CollapsibleGroupHeader>
            {traceOpen ? (
              <CollapsibleGroupBody className="px-3 pb-3">
                <HarnessTraceEventCard traceJson={run.trace_json} />
              </CollapsibleGroupBody>
            ) : null}
          </CollapsibleGroup>

          <CollapsibleGroup variant="card">
            <CollapsibleGroupHeader
              expanded={outputsOpen}
              onToggle={() => setOutputsOpen((o) => !o)}
            >
              <CollapsibleChevron expanded={outputsOpen} />
              <CollapsibleGroupTitle>Outputs & drafts</CollapsibleGroupTitle>
            </CollapsibleGroupHeader>
            {outputsOpen ? (
              <CollapsibleGroupBody className="px-3 pb-3">
                <HarnessRunOutputs run={run} draftIds={draftIds} />
              </CollapsibleGroupBody>
            ) : null}
          </CollapsibleGroup>

          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              className="h-7"
              onClick={() =>
                openLoopRunInCopilot({ runId: run.id, title, lang, runDetail: run })
              }
            >
              <MessageCircle className="mr-1 size-3" />
              {loopCopilotUi.discuss(lang)}
            </Button>
            {awaiting ? (
              <>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="h-7"
                  disabled={curate.isPending}
                  onClick={() => void curate.mutateAsync(run.id)}
                >
                  <Sparkles className="mr-1 size-3" />
                  {curate.isPending ? 'Curating…' : 'Curator'}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="h-7"
                  disabled={approve.isPending}
                  onClick={() => void approve.mutateAsync(run.id)}
                >
                  <Check className="mr-1 size-3" />
                  {approve.isPending ? 'Approving…' : 'Approve all'}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="h-7"
                  onClick={() => openCopilotInbox()}
                >
                  {loopCopilotUi.inbox(lang)}
                </Button>
              </>
            ) : null}
          </div>
        </>
      ) : null}
    </PageShell>
  )
}
