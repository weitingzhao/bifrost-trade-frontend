/**
 * The instance face as a right sheet over any page (design Rev .101, §14.4):
 * one host in the shell, opened by `openInstanceSheet` from a `#NNN` token.
 * The page behind stays live; ‹ › and [ ] step the rows the token came from;
 * Esc closes; Open in Rules → and Ran under lead into the rulebook, where the
 * instance is a place rather than a look.
 */
import { useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { RightInspectorShell } from '@/components/layout/RightInspectorShell'
import { INSTANCE_COMPARE_MAX_WIDTH_PX } from '@/constants/instanceDetailSidebar'
import { useAllocations, useGateSafety, useStrategyInstance } from '@/hooks/useStrategies'
import { closeInstanceSheet, pruneInstanceSheet, stepInstanceSheet, useInstanceSheet } from '@/lib/instanceSheet'
import { useInstanceIndex } from '@/hooks/useInstanceIndex'
import type { StrategyInstance } from '@/types/positions'
import { ranUnderOf } from '@/utils/instanceRecord/ranUnder'
import { InstanceRecord, type InstanceRecordAction } from './InstanceRecord'

const editable = (t: EventTarget | null) =>
  t instanceof HTMLElement && (/^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName) || t.isContentEditable)

function Pending({ id, missing }: { id: number; missing: boolean }) {
  return (
    <div className="flex flex-col gap-1 px-3.5 py-3">
      <span className="font-mono type-section font-semibold text-[var(--sk-instance,#c084fc)]">#{id}</span>
      <span className="text-dense-meta text-muted-foreground">
        {missing ? `No instance #${id} in the book — it may have been deleted.` : 'Reading the instance…'}
      </span>
    </div>
  )
}

export function InstanceSheetHost() {
  const sheet = useInstanceSheet()
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const inst = useStrategyInstance(sheet?.id, sheet != null)
  const vs = useStrategyInstance(sheet?.compareId, sheet?.compareId != null)
  const allocations = useAllocations()
  const gates = useGateSafety()
  const known = useInstanceIndex()

  useEffect(() => {
    if (known && sheet) pruneInstanceSheet(known)
  }, [known, sheet])

  useEffect(() => {
    if (!sheet || sheet.compareId != null) return
    const onKey = (e: KeyboardEvent) => {
      if (editable(e.target) || e.metaKey || e.ctrlKey || e.altKey) return
      if (e.key === '[' || e.key === ']') {
        e.preventDefault()
        stepInstanceSheet(e.key === '[' ? -1 : 1)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [sheet])

  if (!sheet) return null

  const face = (rec: StrategyInstance, nav: boolean) => {
    const id = rec.strategy_instance_id
    const j = sheet.ids.indexOf(id)
    const actions: InstanceRecordAction[] = pathname.startsWith('/portfolio/positions')
      ? []
      : [{ label: 'Positions →', to: `/portfolio/positions?instance=${id}`, title: 'Where its open legs are marked' }]
    return (
      <InstanceRecord
        key={id}
        instance={rec}
        mode="sheet"
        title={`#${id}${rec.label?.trim() ? ` · ${rec.label.trim()}` : ''}`}
        opportunity={rec.strategy_opportunity_name ?? '—'}
        structure={rec.strategy_structure_name ?? '—'}
        pos={nav && sheet.ids.length > 1 ? `${j + 1} / ${sheet.ids.length}` : undefined}
        from={sheet.from || undefined}
        onPrev={nav && j > 0 ? () => stepInstanceSheet(-1) : undefined}
        onNext={nav && j < sheet.ids.length - 1 ? () => stepInstanceSheet(1) : undefined}
        onClose={closeInstanceSheet}
        onFull={() => {
          closeInstanceSheet()
          navigate(`/trade/rules?pick=instance:${id}`)
        }}
        ranUnder={{
          ...ranUnderOf(rec.strategy_opportunity_id, allocations.data?.items ?? [], gates.data?.items ?? []),
          onOpp: () => {
            closeInstanceSheet()
            navigate(`/trade/rules?pick=opportunity:${rec.strategy_opportunity_id}`)
          },
        }}
        actions={actions}
      />
    )
  }
  const one = (q: typeof inst, id: number, nav: boolean) =>
    q.data ? face(q.data, nav) : <Pending id={id} missing={!q.isLoading && !q.isFetching} />

  return (
    <RightInspectorShell
      open
      ariaLabel="Instance record"
      onClose={closeInstanceSheet}
      panelWidthPx={sheet.compareId != null ? Math.min(INSTANCE_COMPARE_MAX_WIDTH_PX, window.innerWidth - 40) : undefined}
    >
      {sheet.compareId != null ? (
        <div className="grid min-w-0 grid-cols-2 gap-2">
          {one(inst, sheet.id, false)}
          {one(vs, sheet.compareId, false)}
        </div>
      ) : (
        one(inst, sheet.id, true)
      )}
    </RightInspectorShell>
  )
}
