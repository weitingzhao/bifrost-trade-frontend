/**
 * The one `LayoutProvider` (D2, design Rev .176 · §18.14): the package measures
 * the window, the input and the content area; this host adds what the package
 * leaves to the app.
 *
 * - `main` is `[data-sr-main]` — the shell's content area *and* the inspector
 *   slot beside it (AppLayout). A docked inspector is portaled outside
 *   `#main-content`, so measuring `#main-content` alone made docking shrink it
 *   under the line and undock again (Plans: 61 flips in 3 s at 1680, §18.12).
 *   A page's `DetailPane` docks inside `#main-content` and never needed that.
 * - The `?device=` preset becomes the provider's `override`.
 * - Rev .163's labels: `data-device` · `data-orient` · `data-pwa` · `data-touch`,
 *   and with `?device=…&sim=1` the preset's simulated safe areas (both the
 *   package's `--safe-*` and the app's `--sr-safe-*`, and `data-safe`).
 *
 * The labels are written in a passive effect, after the provider's layout
 * effect has written its own attributes, so a simulated `data-safe` is not
 * cleared by the real screen's verdict.
 */
import { useEffect, useMemo, type ReactNode } from 'react'
import { LayoutProvider } from '@bifrost/ui'
import { media, presetKind, presetOverride, simulatedInsets, useDevice, useLayout } from '@/lib/device'

function Labels() {
  const layout = useLayout()
  const device = useDevice()
  useEffect(() => {
    const root = document.documentElement
    const flag = (name: string, on: boolean) => (on ? root.setAttribute(name, '1') : root.removeAttribute(name))
    root.dataset.device = device.device
    root.dataset.orient = device.orient
    flag('data-touch', layout.input === 'touch')
    flag('data-pwa', device.pwa)
    const sim = simulatedInsets(presetKind(), device.orient)
    ;(['t', 'b', 'l', 'r'] as const).forEach((k, i) => {
      for (const name of [`--sr-safe-${k}`, `--safe-${k}`]) {
        if (sim) root.style.setProperty(name, `${sim[i]}px`)
        else root.style.removeProperty(name)
      }
    })
    if (sim) flag('data-safe', sim.some((x) => x > 0))
  }, [layout, device.device, device.orient, device.pwa])
  // The orientation and the standalone flag move without a class crossing.
  useEffect(() => {
    const queries = ['(orientation: portrait)', '(display-mode: standalone)']
    const sync = () => {
      const root = document.documentElement
      root.dataset.orient = window.innerWidth >= window.innerHeight ? 'land' : 'port'
      if (media('(display-mode: standalone)')) root.setAttribute('data-pwa', '1')
      else root.removeAttribute('data-pwa')
    }
    const lists = queries.map((q) => {
      try {
        return window.matchMedia(q)
      } catch {
        return null
      }
    })
    lists.forEach((l) => l?.addEventListener('change', sync))
    return () => lists.forEach((l) => l?.removeEventListener('change', sync))
  }, [])
  return null
}

export function LayoutHost({ children }: { children: ReactNode }) {
  const override = useMemo(() => presetOverride(), [])
  return (
    <LayoutProvider main="[data-sr-main]" override={override}>
      <Labels />
      {children}
    </LayoutProvider>
  )
}
