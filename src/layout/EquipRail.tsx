/**
 * The companion rail — the equipment's own edge, present on every page.
 *
 * `equip.ts` holds why the three modules are not in the business tree. This
 * draws them: three frosted glass boxes at the right edge, a head icon that
 * opens the module's home and one icon per page under it, tooltip for the full
 * name, and the icon of the page you are standing on lit in the group's hue.
 *
 * ## The design's own rules, and what each is for
 *
 * - **Idle, a box is nearly invisible** (opacity and blur both drop) because
 *   the right edge already belongs to two other things — the Copilot dock and
 *   whatever drawer a page opens. A rail that permanently obscured either would
 *   have bought its own visibility with theirs. Blur is part of the fade: a
 *   frosted panel at 40% opacity still smears what is behind it.
 * - **Hover magnifies the icon 1.38 and slides its name out** from the left, a
 *   dock gesture rather than a tooltip, because the icons are 24px and the
 *   whole point of an icon strip is that one click reaches a page.
 * - **The group shares one hue; the buttons do not each get their own.** In
 *   this design system a colour variation carries meaning, so a row of
 *   different hues reads as a row of status lamps.
 * - **Only Autopilot wears an indicator** — a lamp while a run is in flight
 *   and the count waiting on a call. It is the one module with state that
 *   changes without your hand.
 *
 * In this phase an icon **navigates**. The design opens it as a float over the
 * page you are on; that is its own mechanism and its own pass, and the table
 * already carries the sizes it will need.
 */
import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAutopilotStanding } from '@/hooks/useLoopHarness'
import { EQUIP_GROUPS, EQUIP_HUE, equipGroupOf, type EquipGroup, type EquipPage } from './equip'
import { cn } from '@/lib/utils'

function IconButton({
  page,
  hue,
  active,
  head,
  badge,
  onOpen,
}: {
  page: EquipPage
  hue: string
  active: boolean
  head?: boolean
  badge?: React.ReactNode
  onOpen: (to: string) => void
}) {
  const Icon = page.icon
  return (
    <button
      type="button"
      onClick={() => onOpen(page.to)}
      aria-label={page.label}
      aria-current={active ? 'page' : undefined}
      title={page.label}
      className={cn(
        'group/equip relative flex h-8 w-8 items-center justify-center rounded-md',
        'transition-[transform,color,background-color] duration-150 ease-out',
        'hover:scale-[1.38] hover:origin-right',
        active ? 'bg-white/[0.07]' : 'hover:bg-white/[0.06]',
      )}
      style={{ color: active ? hue : undefined }}
    >
      <Icon
        className={cn(head ? 'size-[18px]' : 'size-4', !active && 'text-muted-foreground')}
        aria-hidden
      />
      {badge}
      {/* The name pill, sliding out of the left edge. It counter-scales so the
          text stays 10px while the icon grows. */}
      <span
        className={cn(
          'pointer-events-none absolute right-full mr-1.5 hidden whitespace-nowrap rounded',
          'border px-1.5 py-0.5 font-mono text-dense-micro',
          'bg-[var(--sk-surface)] group-hover/equip:block',
        )}
        style={{ borderColor: hue, color: hue, transform: 'scale(0.72)', transformOrigin: 'right' }}
      >
        {page.label}
      </span>
    </button>
  )
}

function Group({
  group,
  activePath,
  onOpen,
  lamp,
  count,
}: {
  group: EquipGroup
  activePath: string
  onOpen: (to: string) => void
  lamp?: boolean
  count?: number
}) {
  const hue = EQUIP_HUE[group.id]
  const [hovered, setHovered] = useState(false)
  // Including the pages the group owns without an icon — an objective is
  // Autopilot's even though no icon opens it.
  const standingHere = equipGroupOf(activePath)?.id === group.id
  const awake = hovered || standingHere

  return (
    <div
      onPointerEnter={() => setHovered(true)}
      onPointerLeave={() => setHovered(false)}
      className={cn(
        'pointer-events-auto flex flex-col items-center gap-0.5 rounded-lg border p-1',
        'transition-opacity duration-200',
        awake ? 'opacity-100' : 'opacity-40',
      )}
      style={{
        // Glass is the material, the hue is the identity — they are two layers
        // and the hue only ever touches the edge, the icons and the glow.
        background: 'rgba(20, 25, 33, 0.42)',
        backdropFilter: awake ? 'blur(18px) saturate(1.7)' : 'none',
        borderColor: standingHere ? hue : 'rgba(255, 255, 255, 0.10)',
        boxShadow: awake ? `0 0 18px -6px ${hue}` : 'none',
      }}
      aria-label={group.label}
    >
      <IconButton
        page={group.hub}
        hue={hue}
        head
        active={group.hub.to === activePath}
        onOpen={onOpen}
        badge={
          lamp || (count ?? 0) > 0 ? (
            <span className="absolute -right-0.5 -top-0.5 flex items-center gap-0.5">
              {lamp ? (
                <span
                  className="size-1.5 animate-pulse rounded-full"
                  style={{ background: hue }}
                  title="A loop run is in flight"
                />
              ) : null}
              {(count ?? 0) > 0 ? (
                <span
                  className="rounded-full bg-warning px-1 font-mono text-dense-micro font-bold leading-none text-background"
                  title={`${count} waiting on a call`}
                >
                  {count}
                </span>
              ) : null}
            </span>
          ) : null
        }
      />
      {group.pages.length > 0 ? (
        <span className="my-0.5 h-px w-4 bg-white/10" aria-hidden />
      ) : null}
      {group.pages.map((p) => (
        <IconButton
          key={p.to}
          page={p}
          hue={hue}
          active={p.to === activePath}
          onOpen={onOpen}
        />
      ))}
    </div>
  )
}

export function EquipRail() {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const standing = useAutopilotStanding().data

  // The two readings that earn Autopilot its indicator, read where the sidebar
  // used to read them — the badge moved with the row.
  const waiting = standing ? (standing.pending_decisions?.calls ?? standing.pending_memos) : 0
  const running = standing?.objectives.some((o) => o.last_run?.status === 'running') ?? false

  return (
    <div
      className="pointer-events-none fixed right-1 top-1/2 z-30 hidden -translate-y-1/2 flex-col gap-2 md:flex"
      aria-label="Equipment"
    >
      {EQUIP_GROUPS.map((g) => (
        <Group
          key={g.id}
          group={g}
          activePath={pathname}
          onOpen={(to) => navigate(to)}
          lamp={g.id === 'autopilot' && running}
          count={g.id === 'autopilot' ? waiting : 0}
        />
      ))}
    </div>
  )
}
