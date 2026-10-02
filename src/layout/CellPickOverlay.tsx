/**
 * The wrong-number crosshair (design Rev .96, `Feedback.dc.html`): the dialog
 * steps aside, one click on the page captures the number with its column, row
 * and panel, and the dialog comes back holding the cell card. Esc cancels.
 *
 * Reading is DOM-shaped on purpose: a `td` knows its header through its
 * index, a KPI knows its label through `data-sr-kpi`, and everything else
 * still yields its text — a value with no column is a worse report only than
 * a value with one, never a refusal.
 */
import { useEffect } from 'react'
import { finishCellPick, useFeedbackDialog, type PickedCell } from '@/lib/feedback/feedbackDialog'

const clip = (s: string | null | undefined, n: number) =>
  (s ?? '').replace(/\s+/g, ' ').trim().slice(0, n)

function readCell(target: Element): PickedCell | null {
  const cellEl =
    target.closest('td,th,[data-sr-kpi-v],[data-sr-kpi]') ?? (target instanceof HTMLElement ? target : null)
  if (cellEl == null) return null
  let value = clip(cellEl.textContent, 120)
  let column: string
  let row = ''
  const td = cellEl.closest('td,th')
  if (td instanceof HTMLTableCellElement) {
    const table = td.closest('table')
    const head = table?.tHead?.rows[0]?.cells[td.cellIndex]
    column = clip(head?.textContent, 60)
    const tr = td.closest('tr')
    const first = tr?.cells[0]
    if (first && first !== td) row = clip(first.textContent, 60)
  } else {
    const kpi = cellEl.closest('[data-sr-kpi]')
    const label = kpi?.querySelector('[data-sr-kpi-l]')
    column = clip(label?.textContent, 60)
    const v = kpi?.querySelector('[data-sr-kpi-v]')
    if (v) value = clip(v.textContent, 120)
  }
  const section = cellEl.closest('section')
  const panel = clip(
    section?.querySelector('h1,h2,h3,[data-sr-cap]')?.textContent ?? document.querySelector('main h1')?.textContent,
    60,
  )
  if (!value) return null
  return { value, column, row, panel }
}

export function CellPickOverlay() {
  const { picking } = useFeedbackDialog()

  useEffect(() => {
    if (!picking) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        finishCellPick(null)
      }
    }
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  }, [picking])

  if (!picking) return null
  return (
    <div
      role="dialog"
      aria-label="Point at the wrong number"
      className="fixed inset-0 z-[80] cursor-crosshair"
      onClick={(e) => {
        // The overlay owns the click; the cell under it is read by point so
        // the page never acts on the pick.
        e.preventDefault()
        e.stopPropagation()
        const under = document
          .elementsFromPoint(e.clientX, e.clientY)
          .find((el) => !(el instanceof HTMLElement && el.closest('[data-cell-pick-overlay]')))
        finishCellPick(under ? readCell(under) : null)
      }}
      data-cell-pick-overlay=""
    >
      <div data-glass-surface="raised" className="sr-glass-float pointer-events-none fixed top-12 left-1/2 -translate-x-1/2 rounded-full px-3 py-1 text-dense-meta">
        Click the wrong number — its column, row and panel ride along · esc cancels
      </div>
    </div>
  )
}
