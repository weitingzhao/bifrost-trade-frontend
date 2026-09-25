/**
 * Alerts that deserve interrupting you become banners (design Rev .69 §4:
 * "接 Alerts 流,新 risk / analyze 项 → banner,已读进 Alerts").
 *
 * - Only Risk and Analyze speak up; System and Platform wait in Alerts.
 * - "New" is new to this browser session: when a group first answers, what
 *   it already holds is the baseline, not news — a reload must not replay
 *   the day. The one exception is the design's own: the session's first red
 *   item announces itself once, 2.5s after the app is up.
 * - The banner is the same item the Alerts centre lists; dismissing the
 *   banner reads nothing there.
 */
import { useEffect, useRef } from 'react'
import type { AlertGroup, AlertItem } from '@/hooks/useAlerts'
import { banner, type BannerTone } from '@/lib/shellNotify'

const SPEAKS: ReadonlySet<AlertGroup['id']> = new Set(['risk', 'analyze'])
const SEEN_KEY = 'bifrost.banner.seen'
const FIRST_RED_KEY = 'bifrost.banner.b1'

function readSeen(): Set<string> {
  try {
    return new Set(JSON.parse(sessionStorage.getItem(SEEN_KEY) ?? '[]') as string[])
  } catch {
    return new Set()
  }
}

function writeSeen(seen: Set<string>): void {
  try {
    sessionStorage.setItem(SEEN_KEY, JSON.stringify([...seen].slice(-400)))
  } catch {
    // A private window without storage still banners; it just forgets.
  }
}

function toneOf(item: AlertItem): BannerTone {
  return item.lamp === 'red' ? 'red' : item.lamp === 'yellow' ? 'amber' : 'accent'
}

function toBanner(group: AlertGroup, item: AlertItem) {
  return {
    title: typeof item.title === 'string' ? item.title : group.title,
    sub: [item.sub, group.source].filter(Boolean).join(' · '),
    tone: toneOf(item),
    to: item.to,
    when: typeof item.when === 'string' ? item.when : 'now',
  }
}

export function useAlertBanners(groups: readonly AlertGroup[]): void {
  const seen = useRef<Set<string> | null>(null)
  const baselined = useRef(new Set<AlertGroup['id']>())

  useEffect(() => {
    seen.current ??= readSeen()
    const known = seen.current
    let changed = false
    for (const g of groups) {
      if (!SPEAKS.has(g.id) || g.state !== 'ready') continue
      const first = !baselined.current.has(g.id)
      baselined.current.add(g.id)
      for (const item of g.items) {
        const key = `${g.id}:${item.id}`
        if (known.has(key)) continue
        known.add(key)
        changed = true
        if (!first) banner(toBanner(g, item))
      }
      if (first && g.id === 'risk') {
        const announced = (() => {
          try {
            return sessionStorage.getItem(FIRST_RED_KEY) != null
          } catch {
            return true
          }
        })()
        const red = g.items.find((i) => i.lamp === 'red')
        if (!announced && red) {
          try {
            sessionStorage.setItem(FIRST_RED_KEY, '1')
          } catch {
            // Without storage it may announce again next load; better than never.
          }
          window.setTimeout(() => banner(toBanner(g, red)), 2_500)
        }
      }
    }
    if (changed) writeSeen(known)
  }, [groups])
}
