/**
 * Where Why opens (design Rev .163, DESIGN_CONTRACTS §18.5 · §18.6): the
 * right-hand inspector on the desk and the iPad; on a phone, a bottom sheet
 * (the design's `data-sr-phone-sheet` on the why aside). One drawer body in
 * both. On the phone the sheet pins the drawer's head (‹ › walk the list,
 * ✕) and its one way out, `Symbol →`; Plan this and Pool build, and a phone
 * does not (§18.2).
 */
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { RightInspectorShell } from '@/components/layout/RightInspectorShell'
import { BottomSheet } from '@/components/ui/BottomSheet'
import { useDevice } from '@/lib/device'
import type { NameRow } from './stockScreenModel'
import { screenSymbolHref } from './stockScreenStages'
import { WhyDrawer, WhyHead, type WhyDrawerProps } from './WhyDrawer'

type Props = Omit<WhyDrawerProps, 'row' | 'sheet'> & {
  /** The name Why reads, or null when it is closed. */
  row: NameRow | null
}

export function WhyPanel({ row, ...drawer }: Props) {
  const { device } = useDevice()
  const navigate = useNavigate()
  // The sheet slides out for 180ms after the row is cleared. It keeps the last
  // reading on screen meanwhile — the props of the render that drew it, whose
  // position and rank lines still read that name — instead of blanking them.
  const key = row ? [row.sym, drawer.pos, drawer.score, drawer.model, drawer.leadersSession].join('|') : null
  const [last, setLast] = useState<{ key: string; props: WhyDrawerProps } | null>(null)
  if (device === 'phone' && row && key && key !== last?.key) setLast({ key, props: { ...drawer, row } })

  if (device !== 'phone') {
    return (
      <RightInspectorShell open={row != null} ariaLabel="Why this name" onClose={drawer.onClose}>
        {row ? <WhyDrawer row={row} {...drawer} /> : null}
      </RightInspectorShell>
    )
  }

  const shown: WhyDrawerProps | null = row ? { ...drawer, row } : (last?.props ?? null)
  return (
    <BottomSheet
      open={row != null}
      onOpenChange={(open) => {
        if (!open) drawer.onClose()
      }}
      label={shown ? `Why ${shown.row.sym}` : 'Why this name'}
      head={
        shown ? (
          <WhyHead row={shown.row} screen={shown.screen} onPrev={drawer.onPrev} onNext={drawer.onNext} onClose={drawer.onClose} />
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
