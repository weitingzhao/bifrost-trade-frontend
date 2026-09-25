/**
 * The toast and the banners (design Rev .69 §3–§4), rendered from
 * `lib/shellNotify`.
 *
 * - The toast is a glass capsule centred in the content's lane, 72 off the
 *   bottom — above the toolbar, never on it.
 * - Banners stack at the top right, left of the Symbol list; each slides in
 *   from the right, leaves by itself after 6s unless hovered or focused,
 *   opens its detail on a click, and goes on × or Esc.
 */
import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { bannerStore, dismissBanner, dismissToast, toastStore, type ShellBanner, type BannerTone } from '@/lib/shellNotify'
import { useDockColumn } from './symbolDock/dockState'
import { useBottomLane } from './bottomLane'
import css from './shellNotices.module.css'

const TONE: Record<BannerTone, string> = {
  red: 'var(--color-lamp-red)',
  amber: 'var(--color-lamp-yellow)',
  accent: 'var(--sk-accent)',
}

function Toast() {
  const { toast } = toastStore.useStore()
  const lane = useBottomLane()
  const [shown, setShown] = useState<number | null>(null)
  const undoRan = useRef(false)

  useEffect(() => {
    if (toast == null) return
    undoRan.current = false
    const on = window.requestAnimationFrame(() => setShown(toast.id))
    const off = window.setTimeout(() => setShown(null), toast.undo ? 5_000 : 2_800)
    const gone = window.setTimeout(() => dismissToast(toast.id), (toast.undo ? 5_000 : 2_800) + 220)
    return () => {
      window.cancelAnimationFrame(on)
      window.clearTimeout(off)
      window.clearTimeout(gone)
    }
  }, [toast])

  if (toast == null) return null
  return (
    <div
      role="status"
      className={css.toast}
      data-glass-surface="raised"
      data-on={shown === toast.id ? '1' : '0'}
      style={{ left: lane.left + lane.width / 2 }}
    >
      <span className={css.toastMsg}>{toast.msg}</span>
      {toast.undo ? (
        <button
          type="button"
          className={css.undo}
          onClick={() => {
            if (undoRan.current) return
            undoRan.current = true
            setShown(null)
            dismissToast(toast.id)
            toast.undo?.()
          }}
        >
          {toast.label ?? 'Undo'}
        </button>
      ) : null}
    </div>
  )
}

function Banner({ b }: { b: ShellBanner }) {
  const navigate = useNavigate()
  const [on, setOn] = useState(false)
  const timer = useRef(0)
  const gone = () => {
    window.clearTimeout(timer.current)
    setOn(false)
    window.setTimeout(() => dismissBanner(b.id), 260)
  }
  const arm = () => {
    window.clearTimeout(timer.current)
    timer.current = window.setTimeout(gone, b.ms ?? 6_000)
  }
  useEffect(() => {
    const raf = window.requestAnimationFrame(() => setOn(true))
    arm()
    return () => {
      window.cancelAnimationFrame(raf)
      window.clearTimeout(timer.current)
    }
    // Armed once per banner; `gone` and `arm` close over the same id.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [b.id])
  const ink = TONE[b.tone]
  return (
    <div
      role="alert"
      tabIndex={0}
      className={css.banner}
      data-glass-surface="surface"
      data-on={on ? '1' : '0'}
      onMouseEnter={() => window.clearTimeout(timer.current)}
      onMouseLeave={arm}
      onFocus={() => window.clearTimeout(timer.current)}
      onBlur={arm}
      onClick={() => {
        gone()
        if (b.to) navigate(b.to)
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          gone()
          if (b.to) navigate(b.to)
        } else if (e.key === 'Escape') {
          gone()
        }
      }}
    >
      <span className={css.bannerIcon} style={{ color: ink, background: `color-mix(in srgb, ${ink} 22%, transparent)` }}>
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinejoin="round" strokeLinecap="round" aria-hidden>
          <path d="M8 2.5h8l5.5 5.5v8L16 21.5H8L2.5 16V8L8 2.5Z" />
          <path d="M12 8v5M12 16h.01" />
        </svg>
      </span>
      <div className="min-w-0">
        <div className="flex items-baseline gap-2">
          <span className={css.bannerTitle}>{b.title}</span>
          <span className={css.bannerWhen}>{b.when ?? 'now'}</span>
        </div>
        {b.sub ? <div className={css.bannerSub}>{b.sub}</div> : null}
      </div>
      <button
        type="button"
        className={css.bannerX}
        aria-label="Dismiss"
        onClick={(e) => {
          e.stopPropagation()
          gone()
        }}
      >
        ×
      </button>
    </div>
  )
}

function Banners() {
  const { banners } = bannerStore.useStore()
  const dock = useDockColumn().width
  if (banners.length === 0) return null
  return (
    <div className={css.banners} aria-live="polite" style={{ right: dock + 12 }}>
      {banners.map((b) => (
        <Banner key={b.id} b={b} />
      ))}
    </div>
  )
}

export function ShellNotices() {
  return (
    <>
      <Toast />
      <Banners />
    </>
  )
}
