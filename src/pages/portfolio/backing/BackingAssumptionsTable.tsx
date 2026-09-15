import { StatusLamp } from '@/components/StatusLamp'
import {
  DenseDataTable,
  DenseTableBody,
  DenseTableCell,
  DenseTableRow,
  denseTableNumCell,
} from '@/components/data-display'
import { cn } from '@/lib/utils'
import { backingAssumptionRows } from '@/utils/backingAssumptions'
import type { BackingJudgment } from '@/utils/backingJudgment'

export function BackingAssumptionsTable({
  judgment,
  pressureCeiling,
}: {
  judgment: BackingJudgment
  pressureCeiling: number
}) {
  const rows = backingAssumptionRows({ judgment, pressureCeiling })
  return (
    <section
      className="min-w-0 rounded-md border border-border bg-secondary/40"
      aria-label="Model assumptions"
      data-testid="backing-assumptions"
    >
      <header className="flex flex-wrap items-center gap-2 border-b border-border px-3 py-1.5">
        <span className="text-dense-label font-semibold uppercase tracking-wide text-muted-foreground">
          The model
        </span>
        <span className="text-dense-body font-semibold">assumptions, in one place</span>
      </header>
      <DenseDataTable scrollX={false} tableClassName="table-fixed min-w-0">
        <colgroup>
          <col style={{ width: '9.5rem' }} />
          <col />
          <col style={{ width: '38%' }} />
        </colgroup>
        <DenseTableBody>
          {rows.map((row) => (
            <DenseTableRow key={row.key}>
              <DenseTableCell className="align-top text-dense-caption text-muted-foreground">
                {row.key}
              </DenseTableCell>
              <DenseTableCell className="align-top whitespace-normal text-dense-body">
                <span className="inline-flex items-start gap-1.5">
                  {row.unknown ? (
                    <StatusLamp
                      lamp="gray"
                      variant="dot"
                      title="Unknown — not a fault"
                      className="mt-1 shrink-0"
                    />
                  ) : null}
                  {row.value}
                </span>
              </DenseTableCell>
              <DenseTableCell
                className={cn(
                  denseTableNumCell,
                  'align-top whitespace-normal text-left text-dense-caption text-muted-foreground'
                )}
              >
                {row.source}
              </DenseTableCell>
            </DenseTableRow>
          ))}
        </DenseTableBody>
      </DenseDataTable>
      <p className="border-t border-border px-3 py-2 text-dense-caption leading-relaxed text-muted-foreground">
        This page computes pool, used, share and the house gate. Risk › Portfolio Exposure will cite
        them. The 85% gate and the 50% pressure ceiling are both house lines — different quantities.
        If the two pages disagree, this one is wrong first.
      </p>
    </section>
  )
}
