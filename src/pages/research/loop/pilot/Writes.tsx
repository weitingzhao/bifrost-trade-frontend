/**
 * Writes — what the chat asked to change, on the Copilot Desk's Today face.
 *
 * Design (`design/trade/Copilot.dc.html`, Today): kind · change · thread ·
 * result, one row per write, and a row opens its thread. The rows are the
 * ledger's (`/research/copilot/writes`, research 0.133.0): the write tools the
 * Owner approved or refused on a card, over the last seven days so a quiet
 * day does not blank the panel. The meta keeps the standing's counts for
 * today, read from the same ledger with the same filter.
 *
 * The scheduled agents' drafts are not writes the chat asked for; they are
 * Waiting on you and the Decision Inbox. Until 0.133.0 the counts here
 * included them — 30 to 50 a day, and none from the chat.
 */
import { PenLine } from 'lucide-react'
import {
  DenseDataTable,
  DenseTableBody,
  DenseTableCell,
  DenseTableHead,
  DenseTableHeader,
  DenseTableHeadRow,
  DenseTableRow,
  DenseTag,
  EmptyState,
} from '@/components/data-display'
import type { DenseTagVariant } from '@/components/data-display/denseTagClasses'
import { ResearchAuthGap } from '@/components/auth/ResearchAuthGap'
import { SectionPanel } from '@/components/layout'
import { Skeleton } from '@/components/ui/skeleton'
import { useCopilotWrites } from '@/hooks/useCopilotWrites'
import { rowSelectProps } from '@/hooks/useRowLink'
import { openCopilotSession } from '@/lib/copilot/openCopilotSession'
import { openResearchCopilot } from '@/lib/harness/loopCopilotPrefill'
import {
  writeResult,
  writesEmptyLine,
  writesMeta,
  writeThread,
  type WriteResultTone,
} from '@/pages/research/loop/pilot/writesTable'

const RESULT_TAG: Record<WriteResultTone, DenseTagVariant> = {
  green: 'state-green',
  warn: 'warning',
  danger: 'danger',
  muted: 'neutral',
}

/** Opens the thread, or the panel on whatever it had if the thread will not load. */
async function openThread(sessionId: string): Promise<void> {
  try {
    await openCopilotSession(sessionId)
  } finally {
    openResearchCopilot()
  }
}

export function Writes({ approvals }: { approvals: Record<string, number> | null | undefined }) {
  const query = useCopilotWrites()
  const data = query.data
  const now = new Date()

  return (
    <SectionPanel
      cap="Writes"
      title="what the chat asked to change"
      note={data ? `last ${data.days} days · every write goes through a card · nothing silent` : 'every write goes through a card · nothing silent'}
      action={
        <span
          className="font-mono tabular-nums text-muted-foreground"
          title="Today's chat writes by result (UTC day), from the Copilot standing — the same ledger and filter as the rows"
        >
          {writesMeta(approvals)}
        </span>
      }
    >
      {query.isLoading ? (
        <Skeleton className="h-24 w-full" />
      ) : query.isError ? (
        <ResearchAuthGap error={query.error} onRetry={() => void query.refetch()} />
      ) : !data ? null : !data.db_ok ? (
        <EmptyState
          icon={<PenLine />}
          title="The write ledger is not reachable"
          description="Research could not open its database, so whether the chat wrote anything is unknown — not zero."
        />
      ) : data.rows.length === 0 ? (
        <EmptyState
          icon={<PenLine />}
          title="Nothing written from the chat"
          description={`${writesEmptyLine(data)} A write the Copilot proposes arrives as a card in its thread; nothing is written until you approve it.`}
        />
      ) : (
        <>
          <DenseDataTable>
            <DenseTableHeader>
              <DenseTableHeadRow>
                <DenseTableHead>Kind</DenseTableHead>
                <DenseTableHead>Change</DenseTableHead>
                <DenseTableHead>Thread</DenseTableHead>
                <DenseTableHead>Result</DenseTableHead>
              </DenseTableHeadRow>
            </DenseTableHeader>
            <DenseTableBody>
              {data.rows.map((row) => {
                const thread = writeThread(row, now)
                const result = writeResult(row)
                const sessionId = row.session_id
                const rowProps =
                  thread.openable && sessionId
                    ? {
                        ...rowSelectProps(false, () => void openThread(sessionId)),
                        'aria-label': `Open the thread behind “${row.change}” in the Copilot panel`,
                      }
                    : {}
                return (
                  <DenseTableRow key={row.id} {...rowProps}>
                    <DenseTableCell>
                      <DenseTag variant="state-blue" title={row.tool}>
                        {row.kind}
                      </DenseTag>
                    </DenseTableCell>
                    <DenseTableCell className="whitespace-normal">
                      <span className="text-pretty">{row.change}</span>
                    </DenseTableCell>
                    <DenseTableCell
                      className={thread.openable ? 'max-w-[14rem] text-muted-foreground' : 'max-w-[14rem] text-muted-foreground/70'}
                    >
                      <span className="block truncate" title={thread.title}>
                        {thread.text}
                      </span>
                    </DenseTableCell>
                    <DenseTableCell>
                      <DenseTag variant={RESULT_TAG[result.tone]} title={result.title}>
                        {result.text}
                      </DenseTag>
                    </DenseTableCell>
                  </DenseTableRow>
                )
              })}
            </DenseTableBody>
          </DenseDataTable>
          {data.truncated ? (
            <p className="m-0 border-t px-3 py-1.5 text-dense-meta text-muted-foreground">
              Showing the newest {data.rows.length} of {data.total}.
            </p>
          ) : null}
        </>
      )}
    </SectionPanel>
  )
}
