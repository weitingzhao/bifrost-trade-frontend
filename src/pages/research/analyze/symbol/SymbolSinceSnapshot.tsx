/**
 * Since you last looked — band flips and within-band moves on this name.
 *
 * Prototype: `Research Symbol.dc.html` Overview aside. Research exhibits carry
 * only the current reading; the prior half is the last snapshot this browser
 * stored for the symbol (`symbolSnapshotStore`). When `as_of` advances, the
 * rail lists what moved — flips first, within-band grey. Renders nothing on a
 * first visit or when nothing moved.
 *
 * Rows are derived during render (session gate → else localStorage prior).
 * Persistence runs in an effect so Strict Mode cannot wipe the rail by
 * comparing a reading against the copy it just saved.
 *
 * The next earnings print (Research's estimate) rides the same snapshot and
 * gets the design's Earnings row (`earningsChange`); the rail waits for it so a
 * snapshot is never saved without it.
 */
import { useEffect, useMemo } from 'react'
import type { ExhibitPayload } from '@/api/research/exhibit'
import type { LensBand } from '@/api/research/lenses'
import { useExhibitComposite } from '@/hooks/useExhibitComposite'
import { useEarningsDates } from '@/hooks/useNarrative'
import {
  bandChanges,
  earningsChange,
  formatReadingDisplay,
  type BandChangeRow,
  type SymbolExhibitSnapshot,
} from '@/lib/bandChanges'
import { RIBBON_LENSES } from '@/lib/regimeRibbon'
import { loadSymbolSnapshot, saveSymbolSnapshot } from './symbolSnapshotStore'

function snapshotFromExhibits(
  exhibits: ExhibitPayload[],
  earnings: SymbolExhibitSnapshot['earnings'],
): SymbolExhibitSnapshot {
  const asOf =
    exhibits
      .map((ex) => ex.as_of)
      .filter((d): d is string => !!d)
      .sort()[0] ?? null
  return {
    asOf,
    lenses: exhibits.map((ex) => ({
      lens: ex.lens,
      band: (ex.verdict?.band ?? null) as LensBand | null,
      display: formatReadingDisplay({
        band: (ex.verdict?.band ?? null) as LensBand | null,
        label: ex.verdict?.label,
        value: ex.verdict?.value,
        unit: ex.verdict?.unit,
      }),
    })),
    earnings,
  }
}

/** Flips first, as bandChanges sorts them; the earnings row joins its own kind. */
function withEarningsRow(rows: BandChangeRow[], row: BandChangeRow | null): BandChangeRow[] {
  if (!row) return rows
  if (row.kind === 'within') return [...rows, row]
  const at = rows.findIndex((r) => r.kind === 'within')
  return at < 0 ? [...rows, row] : [...rows.slice(0, at), row, ...rows.slice(at)]
}

function sessionGateKey(symbol: string, asOf: string | null): string {
  return `bifrost-symbol-snap-rows:${symbol}:${asOf ?? 'none'}`
}

function readSessionRows(key: string): BandChangeRow[] | null {
  try {
    const raw = sessionStorage.getItem(key)
    if (raw == null) return null
    return JSON.parse(raw) as BandChangeRow[]
  } catch {
    return null
  }
}

function writeSessionRows(key: string, rows: BandChangeRow[]): void {
  try {
    sessionStorage.setItem(key, JSON.stringify(rows))
  } catch {
    // private mode — rail may flash empty under Strict Mode; acceptable
  }
}

export function SymbolSinceSnapshot({ symbol }: { symbol: string }) {
  const sym = symbol.trim().toUpperCase()
  const q = useExhibitComposite(RIBBON_LENSES, sym)
  const earnQ = useEarningsDates(sym)

  const current = useMemo(() => {
    if (!q.data || q.data.length === 0) return null
    const next = earnQ.data?.expected_next ?? null
    // Unknown (the request failed) stays undefined, so no row claims a move it cannot see.
    const earnings: SymbolExhibitSnapshot['earnings'] = earnQ.isSuccess
      ? next
        ? { date: next.date, daysAway: next.days_away }
        : null
      : undefined
    return snapshotFromExhibits(q.data, earnings)
  }, [q.data, earnQ.data, earnQ.isSuccess])

  const rows = useMemo(() => {
    if (!sym || !current || q.isLoading || earnQ.isLoading) return null
    const gate = sessionGateKey(sym, current.asOf)
    const cached = readSessionRows(gate)
    if (cached != null) return cached
    const prior = loadSymbolSnapshot(sym)
    return withEarningsRow(bandChanges(prior, current), earningsChange(prior, current))
  }, [sym, current, q.isLoading, earnQ.isLoading])

  useEffect(() => {
    if (!sym || !current || rows == null) return
    writeSessionRows(sessionGateKey(sym, current.asOf), rows)
    saveSymbolSnapshot(sym, current)
  }, [sym, current, rows])

  // Still loading (or no symbol): nothing to seat yet.
  if (rows == null) return null

  /* The panel keeps its seat when there is nothing to list — a rail section
     that vanishes on a first visit reads as unbuilt, not as quiet. Which of
     the two quiets it is matters: no prior snapshot is a different fact from
     "nothing moved". */
  if (rows.length === 0) {
    const firstLook = current != null && loadSymbolSnapshot(sym) == null
    return (
      <section
        className="border px-2 py-1.5 mat-card"
        aria-label="Since you last looked"
        title="Prior readings come from this browser, not Research's last snapshot."
      >
        <header className="mb-0.5 flex flex-wrap items-baseline gap-x-2">
          <span className="text-dense-meta font-semibold text-muted-foreground">
            Since you last looked
          </span>
        </header>
        <p className="m-0 text-dense-meta text-muted-foreground">
          {firstLook
            ? 'First look on this browser — the next visit compares against today.'
            : 'Nothing moved since your last look.'}
        </p>
      </section>
    )
  }

  const flips = rows.filter((r) => r.kind === 'flip').length

  return (
    <section
      className="border px-2 py-1.5 mat-card"
      aria-label="Since you last looked"
      title="Prior readings come from this browser, not Research's last snapshot."
    >
      <header className="mb-1 flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
        <span
          className="text-dense-meta font-semibold text-muted-foreground"
          title="Prior readings come from this browser, not Research's last snapshot."
        >
          Since you last looked
        </span>
        <span className="text-dense-meta text-foreground">
          {rows.length} reading{rows.length === 1 ? '' : 's'} moved
          {flips > 0 ? ` · ${flips} band flip${flips === 1 ? '' : 's'}` : ''}
        </span>
      </header>
      <ul className="divide-y divide-border/40">
        {rows.map((r) => (
          <li
            key={r.lens}
            className="grid grid-cols-[minmax(0,1fr)_auto] gap-2 py-1 text-dense-meta"
          >
            <span className="truncate text-muted-foreground">{r.label}</span>
            <span className="font-mono tabular-nums">
              <span className="text-muted-foreground">{r.from}</span>
              <span className="text-muted-foreground/60"> → </span>
              <span
                className={
                  r.tone === 'danger'
                    ? `text-destructive${r.kind === 'flip' ? ' font-semibold' : ''}`
                    : r.kind === 'flip'
                      ? 'font-semibold text-foreground'
                      : 'text-muted-foreground'
                }
              >
                {r.to}
              </span>
            </span>
          </li>
        ))}
      </ul>
      <p className="mt-1 text-dense-micro text-muted-foreground">
        Band flips are listed first. A reading that moved inside its band is shown grey.
      </p>
    </section>
  )
}
