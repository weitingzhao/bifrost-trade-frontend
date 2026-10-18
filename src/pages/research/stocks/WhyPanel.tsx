/**
 * Where Why opens (design Rev .164 → .173, DESIGN_CONTRACTS §18.5 · §18.12):
 * the wide standard layout's detail. With the dock (`useLayout().dock`: wide
 * and the content area ≥ 1200) it is a column beside the page, 380 as the
 * prototype's aside; otherwise it floats over the right edge (`DetailPane`);
 * on compact it is a bottom sheet (the design's `data-sr-compact-sheet`).
 * The page lays the column out: it sits in the page's flex row.
 *
 * The compact sheet pins the drawer's head (‹ › walk the list, ✕) and its
 * one way out, `Symbol →`, as the footer Enter runs; Plan this and Pool build,
 * and compact does not (§18.2). Above compact the drawer draws its own head
 * and footer, and Esc closes it (the inspector stack, as the shell's
 * inspector did).
 */
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { DetailPane } from '@/components/layout/DetailPane'
import { BottomSheet } from '@/components/ui/BottomSheet'
import { registerInspectorEscape } from '@/lib/cockpit/inspectorEscape'
import { useLayout } from '@/lib/device'
import type { NameRow } from './stockScreenModel'
import { screenSymbolHref } from './stockScreenStages'
import { WhyDrawer, WhyHead, type WhyDrawerProps } from './WhyDrawer'

type Props = Omit<WhyDrawerProps, 'row' | 'sheet'> & {
  /** The name Why reads, or null when it is closed. */
  row: NameRow | null
}

/** The prototype's why aside (`width: 380px`). */
const WHY_W = 380

export function WhyPanel({ row, ...drawer }: Props) {
  const compact = useLayout().w === 'compact'
  const navigate = useNavigate()
  const { onClose } = drawer
  // The sheet slides out for 180ms after the row is cleared. It keeps the last
  // reading on screen meanwhile — the props of the render that drew it, whose
  // position and rank lines still read that name — instead of blanking them.
  const key = row ? [row.sym, drawer.pos, drawer.score, drawer.model, drawer.leadersSession].join('|') : null
  const [last, setLast] = useState<{ key: string; props: WhyDrawerProps } | null>(null)
  if (compact && row && key && key !== last?.key) setLast({ key, props: { ...drawer, row } })

  const open = row != null
  useEffect(() => {
    if (!open || compact) return
    return registerInspectorEscape(onClose)
  }, [open, compact, onClose])

  if (!compact) {
    return (
      <DetailPane open={open} onClose={onClose} width={WHY_W} label="Why this name">
        {row ? <WhyDrawer row={row} {...drawer} /> : null}
      </DetailPane>
    )
  }

  const shown: WhyDrawerProps | null = row ? { ...drawer, row } : (last?.props ?? null)
  return (
    <BottomSheet
      open={open}
      onOpenChange={(next) => {
        if (!next) onClose()
      }}
      label={shown ? `Why ${shown.row.sym}` : 'Why this name'}
      head={
        shown ? (
          <WhyHead row={shown.row} screen={shown.screen} onPrev={drawer.onPrev} onNext={drawer.onNext} onClose={onClose} />
        ) : (
          <span />
        )
      }
      flush
      actions={shown ? [{ label: 'Symbol →', onRun: () => navigate(screenSymbolHref(shown.row.sym, shown.screen.on)) }] : []}
    >
      {shown ? <WhyDrawer {...shown} sheet /> : null}
    </BottomSheet>
  )
}
