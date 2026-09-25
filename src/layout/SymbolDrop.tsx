/**
 * Drag a symbol anywhere → the drop bar (design Rev .70 §4).
 *
 * Whatever `symbolAt` recognises as a name — `data-ctx-sym`, a Symbol-list
 * row, a symbol in its entity ink, a link to the name — becomes draggable
 * as the pointer reaches it. Lifting it raises a bar above the toolbar with
 * three targets: open it (the shell's rule — beside this page, or swapped
 * in where the page reads it), a locked tab to compare, Add to Watch.
 *
 * A drag some other code started (Market Live reorders its rows) is left
 * alone: this listens after the page's own handlers and stands down when the
 * drag already carries data.
 */
import { useEffect, useState } from 'react'
import { useWatchlistMutations } from '@/hooks/useStockWatchlist'
import { stockWatchlistContractKey } from '@/components/research/watchlistContractKey'
import { notify } from '@/lib/shellNotify'
import { useBottomLane } from './bottomLane'
import { symbolAt } from './shellContextTarget'
import { useSymbolGo } from './symbolGo'
import css from './symbolDrop.module.css'

type Zone = 'open' | 'compare' | 'watch'

export function SymbolDrop() {
  const { go, verb } = useSymbolGo()
  const { addItem } = useWatchlistMutations()
  const lane = useBottomLane()
  const [sym, setSym] = useState<string | null>(null)
  const [hot, setHot] = useState<Zone | null>(null)

  useEffect(() => {
    const onOver = (e: MouseEvent) => {
      const t = e.target instanceof Element ? e.target : null
      if (t == null || t.closest('input, textarea, select, [contenteditable="true"], [draggable]')) return
      if (!symbolAt(t)) return
      const host = t.closest<HTMLElement>('[data-ctx-sym], [data-dock-sym], a, button') ?? (t as HTMLElement)
      if (!host.hasAttribute('draggable')) host.setAttribute('draggable', 'true')
    }
    const onStart = (e: DragEvent) => {
      if (!e.dataTransfer || e.dataTransfer.types.length > 0) return
      const t = e.target instanceof Element ? e.target : null
      const hit = t ? symbolAt(t) : null
      if (!hit) return
      e.dataTransfer.setData('text/plain', hit.sym)
      e.dataTransfer.effectAllowed = 'copy'
      setSym(hit.sym)
    }
    const onEnd = () => {
      setSym(null)
      setHot(null)
    }
    document.addEventListener('mouseover', onOver, true)
    document.addEventListener('dragstart', onStart)
    document.addEventListener('dragend', onEnd, true)
    return () => {
      document.removeEventListener('mouseover', onOver, true)
      document.removeEventListener('dragstart', onStart)
      document.removeEventListener('dragend', onEnd, true)
    }
  }, [])

  const run = (zone: Zone, name: string) => {
    if (zone === 'open') go(name)
    else if (zone === 'compare') go(name, 'compare')
    else {
      addItem.mutate(
        { contract_key: stockWatchlistContractKey(name), symbol: name, sec_type: 'STK', source: 'drag' },
        { onSuccess: () => notify(`${name} added to Watch`) },
      )
    }
  }

  const zones: [Zone, string, string][] = [
    ['open', verb === 'swap' ? 'Swap it in' : 'Open beside', '↵'],
    ['compare', 'Compare', '⇧↵ · locked'],
    ['watch', 'Add to Watch', '＋'],
  ]

  return (
    <div
      className={css.bar}
      data-on={sym ? '1' : '0'}
      data-glass-surface="raised"
      aria-hidden
      style={{ left: lane.left + lane.width / 2 }}
    >
      {zones.map(([zone, label, sub]) => (
        <div
          key={zone}
          className={css.zone}
          data-hot={hot === zone ? '1' : '0'}
          onDragOver={(e) => {
            e.preventDefault()
            e.dataTransfer.dropEffect = 'copy'
            if (hot !== zone) setHot(zone)
          }}
          onDragLeave={() => setHot((h) => (h === zone ? null : h))}
          onDrop={(e) => {
            e.preventDefault()
            const name = sym ?? e.dataTransfer.getData('text/plain')
            setHot(null)
            setSym(null)
            if (name) run(zone, name)
          }}
        >
          <b>{label}</b>
          <span>{sub}</span>
        </div>
      ))}
    </div>
  )
}
