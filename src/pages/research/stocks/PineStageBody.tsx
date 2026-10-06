/**
 * The Pine signals stage, opened (design Rev .158 B2): one row per script —
 * its name (a user or community script carries a small tag) and a joined
 * `↑ buy n` / `↓ sell n` pair on the right; both can be on, so it is two
 * FilterChips, not a SegmentControl. The built-ins come first, user and
 * community scripts after a hairline; past ten rows the rest fold behind
 * `Show N more`. The window (`1 · 5 · 10 sessions`) and the match (`Any · All`)
 * sit on the stage's own line and are saved with the screen.
 */
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { FilterChip, FilterTray } from '@bifrost/ui'
import { CloseButton, SegmentControl } from '@/components/data-display'
import { pineLibraryPath } from '@/lib/symbolLink'
import { usePineLibrary } from '@/hooks/usePineLibrary'
import { pineOffPicks } from './stockScreenStages'
import { pineOf, type PineStageSettings, type PineWithin, type ScreenState, type Stage, type StageChip } from './stockScreenModel'

const FOLD = 10

interface ScriptRow {
  script: string
  name: string
  origin: string
  buy: StageChip | null
  sell: StageChip | null
}

function scriptRows(chips: readonly StageChip[]): ScriptRow[] {
  const out: ScriptRow[] = []
  const at = new Map<string, ScriptRow>()
  for (const c of chips) {
    if (!c.pine) continue
    let r = at.get(c.pine.script)
    if (!r) {
      r = { script: c.pine.script, name: c.pine.name, origin: c.pine.origin, buy: null, sell: null }
      at.set(c.pine.script, r)
      out.push(r)
    }
    r[c.pine.side] = c
  }
  return out
}

export function PineStageBody({
  stage,
  screen,
  chipCountOf,
  onChip,
  onPine,
}: {
  stage: Stage
  screen: ScreenState
  chipCountOf: (id: string) => { n: number | null; where: string }
  onChip: (id: string, label: string) => void
  onPine: (next: PineStageSettings, why: string) => void
}) {
  const [more, setMore] = useState(false)
  const pine = pineOf(screen)
  const rows = scriptRows(stage.chips)
  const shown = rows.length > FOLD && !more ? rows.slice(0, FOLD) : rows
  const win = `${pine.within} session${pine.within === 1 ? '' : 's'}`
  // Picks of scripts the library has switched off since the screen was saved:
  // kept in their place, drawn missing, evaluating nothing (Rev .160 receipt).
  const lib = usePineLibrary()
  const off = pineOffPicks(stage, screen.on)
  const offBy = new Map<string, ('buy' | 'sell')[]>()
  for (const id of off) {
    const [, script, side] = id.split(':')
    offBy.set(script, [...(offBy.get(script) ?? []), side as 'buy' | 'sell'])
  }
  const offScripts = [...offBy.entries()]
  const chip = (r: ScriptRow, c: StageChip | null) => {
    if (!c) return null
    const side = c.pine!.side
    const cc = chipCountOf(c.id)
    return (
      <FilterChip
        key={c.id}
        pressed={!!screen.on[c.id]}
        onPressedChange={() => onChip(c.id, c.label)}
        count={cc.n == null ? '—' : String(cc.n)}
        title={`${r.name} ${side} within ${win} · ${cc.n ?? '—'} names across the market (not this pool)`}
        className="h-[22px] px-2 text-dense-meta"
      >
        {side === 'buy' ? '↑ buy' : '↓ sell'}
      </FilterChip>
    )
  }
  return (
    <>
      <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1.5 text-dense-meta text-muted-foreground">
        <span>within</span>
        <SegmentControl
          ariaLabel="Signal window"
          size="xs"
          options={[
            { value: '1', label: '1' },
            { value: '5', label: '5' },
            { value: '10', label: '10 sessions' },
          ]}
          value={String(pine.within)}
          onChange={(v) => onPine({ ...pine, within: Number(v) as PineWithin }, `Pine window ${v}`)}
        />
        <span>match</span>
        <SegmentControl
          ariaLabel="Match any or all"
          size="xs"
          options={[
            { value: 'any', label: 'Any' },
            { value: 'all', label: 'All' },
          ]}
          value={pine.match}
          onChange={(v) => onPine({ ...pine, match: v as PineStageSettings['match'] }, `Pine match ${v}`)}
        />
        <Link to={pineLibraryPath()} className="ml-auto text-[var(--sk-accent)] hover:underline">
          Pine library ↗
        </Link>
      </div>
      <div className="grid gap-x-3.5 gap-y-0.5 [grid-template-columns:repeat(auto-fill,minmax(min(100%,250px),1fr))]">
        {shown.map((r, i) => {
          const firstOwn = r.origin !== 'bifrost' && (i === 0 || shown[i - 1].origin === 'bifrost')
          return [
            firstOwn ? <div key={`${r.script}-rule`} aria-hidden className="col-span-full my-1 h-px bg-foreground/[0.08]" /> : null,
            <div key={r.script} className="flex min-h-7 items-center gap-1.5">
              <span className="truncate text-dense-label" title={r.script}>
                {r.name}
              </span>
              {r.origin !== 'bifrost' ? (
                <span className="rounded-full bg-foreground/[0.09] px-1.5 text-dense-caption leading-4 text-[var(--sk-mute2)]">
                  {r.origin === 'user' ? 'mine' : r.origin}
                </span>
              ) : null}
              <span className="ml-auto inline-flex">
                <FilterTray variant="joined" aria-label={r.name}>
                  {chip(r, r.buy)}
                  {chip(r, r.sell)}
                </FilterTray>
              </span>
            </div>,
          ]
        })}
      </div>
      {off.length ? (
        <div className="flex flex-col gap-0.5">
          <div aria-hidden className="my-1 h-px bg-foreground/[0.08]" />
          {offScripts.map(([script, sides]) => {
            const row = lib.rows?.find((r) => r.id === script)
            const name = row?.name.trim() || script
            const tag = row?.origin === 'community' ? 'community · off' : row?.origin === 'user' ? 'mine · off' : 'off'
            return (
              <div key={script} className="flex min-h-7 items-center gap-1.5">
                <span className="truncate text-dense-label" title={script}>
                  {name}
                </span>
                <span className="rounded-full bg-foreground/[0.09] px-1.5 text-dense-caption leading-4 text-[var(--sk-mute2)]">{tag}</span>
                <span className="ml-auto inline-flex items-center gap-1">
                  {sides.map((side) => {
                    const remove = `Remove ${name} ${side} from this screen`
                    return (
                      // The missing chip with its own way out (Rev .161): faint, inert, the ✕ at the capsule's right end.
                      <span
                        key={side}
                        aria-disabled="true"
                        title="script off — switched off in the Pine library"
                        className="inline-flex h-6 items-center gap-1 whitespace-nowrap rounded-full bg-foreground/[0.04] pl-2.5 pr-1 text-dense-label text-[var(--sk-faint)]"
                      >
                        {side === 'buy' ? '↑ buy' : '↓ sell'}
                        <CloseButton
                          size="sm"
                          label={remove}
                          onClick={() => onChip(`pine:${script}:${side}`, `${name} ${side} (off)`)}
                        />
                      </span>
                    )
                  })}
                </span>
              </div>
            )
          })}
        </div>
      ) : null}
      {rows.length > FOLD ? (
        <button type="button" className="self-start text-dense-meta text-[var(--sk-accent)] hover:underline" onClick={() => setMore(!more)}>
          {more ? 'Show fewer' : `Show ${rows.length - FOLD} more`}
        </button>
      ) : null}
    </>
  )
}
