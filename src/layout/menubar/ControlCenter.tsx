/**
 * The Control Center — Data and System, one menu-bar item (design Rev .60 §3,
 * `_Shell StatusBar placement="menubar"`).
 *
 * On the bar: a database glyph and a server glyph, each with its lamp and the
 * count of what is not green; narrower than 820 of header they fold into one
 * switch glyph with a corner lamp — the worse of the two. Words in the tip.
 *
 * Open: two tiles, Data and System, each with its lamp and one line; the list
 * under them is the tile you picked, and it starts on the worse one.
 *
 * - **Data** is the trader's own reading, the same three questions System
 *   Status answers (`useSystemDomains` — can I trade, can I see, did the data
 *   land), not a second inventory of sources.
 * - **System** is every service and plugin, each row a door to the Ops
 *   Console view that can say more.
 *
 * Grey means unprobed, not down — the foot says so, as the design's does.
 */
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { HealthLamp } from '@bifrost/ui'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { usePlatformPlugins } from '@/hooks/usePlatformPlugins'
import { useSystemDomains } from '@/hooks/useSystemDomains'
import { cn } from '@/lib/utils'
import { worstLamp, type DomainLamp } from '@/utils/systemStanding'
import { SystemServiceList } from '../SystemServiceList'
import { useShellPopover } from '@/lib/shellPopover'
import { MenubarTip } from './MenubarTip'
import css from './menubar.module.css'

const LAMP_VAR: Record<DomainLamp, string> = {
  green: 'var(--color-lamp-green)',
  yellow: 'var(--color-lamp-yellow)',
  red: 'var(--color-lamp-red)',
  gray: 'var(--sk-faint)',
}

const RANK: Record<DomainLamp, number> = { red: 3, yellow: 2, gray: 1, green: 0 }

const DB = (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" aria-hidden>
    <ellipse cx="12" cy="5.5" rx="7.5" ry="2.8" />
    <path d="M4.5 5.5v13c0 1.5 3.4 2.8 7.5 2.8s7.5-1.3 7.5-2.8v-13" />
    <path d="M4.5 12c0 1.5 3.4 2.8 7.5 2.8s7.5-1.3 7.5-2.8" />
  </svg>
)
const SERVER = (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" aria-hidden>
    <rect x="3.5" y="4" width="17" height="7" rx="1.8" />
    <rect x="3.5" y="13" width="17" height="7" rx="1.8" />
    <path d="M7.5 7.5h.01M7.5 16.5h.01" />
  </svg>
)
const SWITCHES = (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden>
    <rect x="3" y="4.5" width="18" height="6" rx="3" />
    <circle cx="15" cy="7.5" r="1.6" fill="currentColor" stroke="none" />
    <rect x="3" y="13.5" width="18" height="6" rx="3" />
    <circle cx="9" cy="16.5" r="1.6" fill="currentColor" stroke="none" />
  </svg>
)

type Tile = 'data' | 'system'

export function ControlCenter() {
  // One shell popover at a time (Rev .68): another item opening closes this
  // one without a call here, so the picked tile resets on the way in instead.
  const [open, setOpen] = useShellPopover('control')
  const [picked, setPicked] = useState<Tile | null>(null)
  // "Can I see" is judged stream by stream only while the centre is open —
  // it takes the quote stream, which a control on every page must not hold.
  const domains = useSystemDomains({ live: open })
  const { rows: plugins, isLoading } = usePlatformPlugins(true)

  const dataLamp = domains.length ? worstLamp(domains) : 'gray'
  const dataN = domains.filter((d) => d.lamp === 'yellow' || d.lamp === 'red').length
  const faults = plugins.filter((r) => r.lamp === 'degraded' || r.lamp === 'down').length
  const probed = plugins.some((r) => r.lamp !== 'unknown')
  const sysLamp: DomainLamp = isLoading ? 'gray' : faults > 0 ? 'yellow' : probed ? 'green' : 'gray'
  const worse = RANK[dataLamp] >= RANK[sysLamp] ? dataLamp : sysLamp
  const tile: Tile = picked ?? (RANK[sysLamp] > RANK[dataLamp] ? 'system' : 'data')

  const dataText = domains.map((d) => `${d.name}: ${d.state}`).join(' · ') || 'reading…'
  const sysText = isLoading
    ? 'probing'
    : faults > 0
      ? `${faults} plugin${faults === 1 ? '' : 's'} degraded`
      : probed
        ? 'all plugins healthy'
        : 'unprobed — the gateway is out of reach'
  const tip = `Data — ${dataText}\nSystem — ${sysText}\ngrey = unprobed, not down`

  const close = () => setOpen(false)

  return (
    <Popover
      open={open}
      onOpenChange={(v) => {
        setOpen(v)
        if (v) setPicked(null)
      }}
    >
      <MenubarTip tip={tip}>
        <PopoverTrigger asChild>
          <button type="button" className={cn(css.item, 'relative min-w-8 justify-center px-[7px]')} aria-label="Data and system health">
            <span className={css.ccGlyph}>{SWITCHES}</span>
            <span
              className={cn(css.ccGlyph, 'absolute top-1 right-1 size-1.5 rounded-full')}
              style={{ background: LAMP_VAR[worse], boxShadow: '0 0 0 2px var(--background)' }}
            />
            <span className={cn(css.ccText, css.fs11, 'inline-flex items-center gap-[9px]')}>
              <span className="inline-flex items-center gap-1">
                {DB}
                <span className="size-1.5 rounded-full" style={{ background: LAMP_VAR[dataLamp] }} />
                {dataN > 0 ? <span className={cn(css.mono, 'text-[var(--sk-ink)]')}>{dataN}</span> : null}
              </span>
              <span className="inline-flex items-center gap-1">
                {SERVER}
                <span className="size-1.5 rounded-full" style={{ background: LAMP_VAR[sysLamp] }} />
                {faults > 0 ? <span className={cn(css.mono, 'text-[var(--sk-ink)]')}>{faults}</span> : null}
              </span>
            </span>
          </button>
        </PopoverTrigger>
      </MenubarTip>
      <PopoverContent
        align="end"
        sideOffset={6}
        className={cn(css.pop, 'flex max-h-[calc(100vh-64px)] w-[400px] max-w-[calc(100vw-24px)] flex-col overflow-hidden')}
        aria-label="Control Center"
      >
        <div className="grid flex-none grid-cols-2 gap-2 p-2.5">
          {(
            [
              ['data', 'Data', dataLamp, dataText],
              ['system', 'System', sysLamp, sysText],
            ] as const
          ).map(([key, label, lamp, text]) => (
            <button
              key={key}
              type="button"
              className={cn(css.tile, 'justify-start gap-2.5 rounded-[10px] p-2.5 text-left')}
              data-on={tile === key ? '1' : '0'}
              onClick={() => setPicked(key)}
            >
              <span className={css.round} style={{ background: `color-mix(in srgb, ${LAMP_VAR[lamp]} 22%, transparent)` }}>
                <span className="size-[9px] rounded-full" style={{ background: LAMP_VAR[lamp] }} />
              </span>
              <span className="flex min-w-0 flex-col gap-px">
                <span className={cn(css.fs13, 'font-semibold')}>{label}</span>
                <span className={cn(css.mono, css.fs11, 'truncate text-[var(--sk-mute2)]')}>{text}</span>
              </span>
            </button>
          ))}
        </div>
        <div className="min-h-0 flex-auto overflow-y-auto border-t border-[color-mix(in_srgb,var(--sk-ink)_8%,transparent)]">
          {tile === 'data' ? (
            <div className="p-1">
              {domains.map((d) => (
                <Link key={d.key} to={d.to} onClick={close} className={cn(css.row, 'no-underline')} title={`${d.toLabel} →`}>
                  <HealthLamp lamp={d.lamp} variant="dot" />
                  <span className="flex min-w-0 flex-col gap-px">
                    <span className={cn(css.fs12, 'text-[var(--sk-ink)]')}>{d.name}</span>
                    <span className={cn(css.fs11, 'text-[var(--sk-mute2)]')}>{d.why}</span>
                    {d.detail.map((x) => (
                      <span key={x.text} className={cn(css.fs11, x.tone === 'warn' ? 'text-[var(--color-lamp-yellow)]' : 'text-[var(--sk-mute)]')}>
                        {x.text}
                      </span>
                    ))}
                  </span>
                  <span className={cn(css.mono, css.fs11, 'self-start text-[var(--sk-soft)]')}>{d.state}</span>
                </Link>
              ))}
              <p className={cn(css.fs11, 'm-0 px-3 py-2 leading-normal text-[var(--sk-mute)]')}>
                By-design and delayed-by-plan are not faults. Each page weighs these against what it is for.
              </p>
            </div>
          ) : (
            <SystemServiceList open={open && tile === 'system'} onNavigate={close} />
          )}
        </div>
        <div className={cn(css.fs11, 'flex flex-none gap-2.5 border-t border-[color-mix(in_srgb,var(--sk-ink)_8%,transparent)] px-3 py-2 text-[var(--sk-mute)]')}>
          <Link to="/system/status" onClick={close} className="text-[var(--sk-accent)] no-underline">
            System Status →
          </Link>
          <span className="ml-auto">grey = unprobed, not down</span>
        </div>
      </PopoverContent>
    </Popover>
  )
}
