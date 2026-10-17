/**
 * More (DESIGN_CONTRACTS §18.4): the whole menu as one list, by layer, with
 * Pinned and Saved searches, then Beside the page (Alerts · Watchlist · Live)
 * and System (Settings · System status) — a full-height sheet.
 *
 * A desk-tier page keeps its row: faint, `iPad · desktop` on the right, not
 * tappable, the reason in its title. The `FilterChip missing` rule — do not
 * hide it, say why.
 */
import { useMemo } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import type { ShellNavItem } from '@bifrost/ui'
import { BottomSheet } from '@/components/ui/BottomSheet'
import { useSavedSearches } from '@/hooks/useSavedSearches'
import { usePins, SHELF_GROUP } from '@/lib/pins'
import { savedSearchTo } from '@/lib/savedSearch'
import { NAV_GROUPS } from '../navConfig'
import { orderGroups, useNavOrder } from '../navOrder'
import { routeFor } from '../routeRegistry'
import { useResearchNavGroup } from '../useResearchNavGroup'
import { DESK_TIER_REASON, phoneTier } from '../phoneTier'
import css from './phone.module.css'

interface Row {
  label: string
  to: string
}

interface Section {
  title: string
  rows: Row[]
}

/** A fold row (`fold:…`) is a heading that borrows its first child's path; only its children are pages. */
function walk(items: readonly ShellNavItem[] | undefined, out: Row[]): void {
  for (const it of items ?? []) {
    if (it.to && !it.id.startsWith('fold:')) out.push({ label: it.label, to: it.to })
    if (it.children) walk(it.children, out)
  }
}

export function PhoneMoreSheet({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const research = useResearchNavGroup()
  const order = useNavOrder()
  const { pins } = usePins()
  const savedQuery = useSavedSearches()

  const sections = useMemo<Section[]>(() => {
    const groups = orderGroups(
      NAV_GROUPS.map((g) => (g.label === 'Research' ? research.group : g)),
      order,
    )
    const out: Section[] = groups.map((g) => {
      const rows: Row[] = []
      if (g.to) {
        const page = routeFor(g.to).label
        rows.push({ label: page === g.label ? 'Overview' : page, to: g.to })
      }
      walk(g.items, rows)
      return { title: g.label, rows }
    })
    if (pins.length > 0) out.push({ title: SHELF_GROUP, rows: pins.map((p) => ({ label: p.label, to: p.to })) })
    const saved = savedQuery.data?.items ?? []
    if (saved.length > 0) out.push({ title: 'Saved searches', rows: saved.map((s) => ({ label: s.label, to: savedSearchTo(s) })) })
    out.push({
      title: 'Beside the page',
      rows: [
        { label: 'Alerts', to: '/research/event-radar' },
        { label: 'Watchlist', to: '/research/watchlist' },
        { label: 'Live', to: '/market/live' },
      ],
    })
    out.push({
      title: 'System',
      rows: [
        { label: 'Settings', to: '/settings' },
        { label: 'System status', to: '/system/status' },
      ],
    })
    return out.filter((s) => s.rows.length > 0)
  }, [research.group, order, pins, savedQuery.data])

  return (
    <BottomSheet open={open} onOpenChange={onOpenChange} title="More" label="All pages" detent="full">
      <div className={css.more}>
        {sections.map((s) => (
          <div key={s.title} className={css.moreSec}>
            <div className={css.moreHead}>{s.title}</div>
            {s.rows.map((r) => {
              const off = r.to.startsWith('/') && phoneTier(r.to) === 'desk'
              const here = r.to.split('?')[0] === pathname
              return (
                <button
                  key={`${s.title}:${r.to}:${r.label}`}
                  type="button"
                  className={css.moreRow}
                  aria-current={here ? 'page' : undefined}
                  aria-disabled={off ? 'true' : undefined}
                  title={off ? DESK_TIER_REASON : undefined}
                  onClick={() => {
                    if (off) return
                    onOpenChange(false)
                    navigate(r.to)
                  }}
                >
                  <span className={css.moreLabel}>{r.label}</span>
                  {off ? <span className={css.moreTier}>iPad · desktop</span> : null}
                </button>
              )
            })}
          </div>
        ))}
      </div>
    </BottomSheet>
  )
}
