/**
 * The rail's My screens (design `Research Stock Screen.dc.html` L91-115): the
 * screens saved on the authoring face (`/research/screens`, 6A), each one
 * click from Results.
 *
 * A saved screen is written in the authoring face's vocabulary — paths,
 * grades, a composite floor, trend and growth conditions — and resolved here
 * with the same `screenRows` over the same wide read, so a screen names the
 * same set on both faces. Until 2026-09-30 this rail said "Nothing saves a
 * screen yet" while the route answered.
 */
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { SectionPanel } from '@/components/layout/SectionPanel'
import { fetchSavedScreens, type SavedScreen } from '@/api/research/savedScreens'
import { fetchSepaScreenerWide } from '@/api/research/sepaScreenerWide'
import { filterOfSavedScreen, filterSummary, screenRows } from '@/utils/sepaScreenModel'

const AUTHORING = '/research/lab/screener'

export function SavedScreensPanel({ onApply }: { onApply: (symbols: string[], screen: SavedScreen) => void }) {
  const screensQ = useQuery({
    queryKey: ['research', 'saved-screens'],
    queryFn: fetchSavedScreens,
    staleTime: 60_000,
  })
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const screens = (screensQ.data?.screens ?? []).filter((s) => s.is_active && s.retired_at == null)

  const apply = async (s: SavedScreen) => {
    setBusy(s.id)
    setError(null)
    try {
      const wide = await fetchSepaScreenerWide()
      onApply(
        screenRows(wide.rows, filterOfSavedScreen(s.definition)).map((r) => r.symbol),
        s,
      )
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setBusy(null)
    }
  }

  return (
    <SectionPanel cap="My screens" title="Saved by you">
      {screensQ.isError ? (
        <p className="px-3 py-2 text-dense-caption text-warning">
          The saved-screen store did not answer — silence, not an empty list.
        </p>
      ) : screensQ.isLoading ? (
        <p className="px-3 py-2 text-dense-caption text-muted-foreground">Reading saved screens…</p>
      ) : screens.length === 0 ? (
        <p className="px-3 py-2 text-dense-caption leading-relaxed text-muted-foreground">
          None saved yet. A screen is written on the{' '}
          <Link to={AUTHORING} className="text-primary no-underline hover:underline">
            authoring face
          </Link>{' '}
          (Save screen) and lands here.
        </p>
      ) : (
        <div className="flex flex-col">
          {screens.map((s) => (
            <button
              key={s.id}
              type="button"
              disabled={busy != null}
              onClick={() => void apply(s)}
              title={`${s.description ? `${s.description} — ` : ''}${filterSummary(filterOfSavedScreen(s.definition))}. Lands its names in Results.`}
              className="flex cursor-pointer items-baseline justify-between gap-2 border-b border-border/60 px-3 py-1.5 text-left last:border-b-0 hover:bg-secondary/40 disabled:cursor-default disabled:opacity-60"
            >
              <span className="min-w-0 truncate text-dense-label">{s.name}</span>
              <span className="shrink-0 font-mono text-dense-caption text-muted-foreground">
                {busy === s.id ? 'loading…' : s.updated_at.slice(0, 10)}
              </span>
            </button>
          ))}
        </div>
      )}
      {error ? <p className="border-t border-border/60 px-3 py-2 text-dense-caption text-warning">{error}</p> : null}
    </SectionPanel>
  )
}
