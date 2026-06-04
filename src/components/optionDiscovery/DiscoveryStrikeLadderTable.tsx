import type { Dispatch, Ref, SetStateAction } from 'react'
import type { StrikeOiPair } from './StrikeLadderPanel'

function fmtOiCompact(n: number | null): string {
  if (n == null || !Number.isFinite(n)) return '—'
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 100_000) return `${Math.round(n / 1000)}k`
  if (n >= 10_000) return `${(n / 1000).toFixed(1)}k`
  if (n >= 1000) return `${(n / 1000).toFixed(2)}k`
  return String(Math.round(n))
}

export function StrikeLadderOiStrikeCell({
  strike,
  oiMax,
  oiByStrike,
  showOi,
}: {
  strike: number
  oiMax: number
  oiByStrike: Map<number, StrikeOiPair>
  showOi: boolean
}) {
  if (!showOi) {
    return <td className="strike-ladder-cell-strike">{strike.toFixed(1)}</td>
  }
  const o = oiByStrike.get(strike)
  const c = o?.c ?? null
  const p = o?.p ?? null
  const denom = oiMax > 0 ? oiMax : 1
  const cw = c != null ? Math.min(100, (c / denom) * 100) : 0
  const pw = p != null ? Math.min(100, (p / denom) * 100) : 0
  return (
    <td className="strike-ladder-cell-strike strike-ladder-cell-strike--oi">
      <div className="strike-ladder-oi-cell">
        <div className="strike-ladder-oi-strike">{strike.toFixed(1)}</div>
        <div className="strike-ladder-oi-bar" aria-hidden="true">
          <div className="strike-ladder-oi-bar-half strike-ladder-oi-bar-half--call">
            <div
              className="strike-ladder-oi-bar-fill strike-ladder-oi-bar-fill--call"
              style={{ width: `${cw}%` }}
            />
          </div>
          <div className="strike-ladder-oi-bar-center" />
          <div className="strike-ladder-oi-bar-half strike-ladder-oi-bar-half--put">
            <div
              className="strike-ladder-oi-bar-fill strike-ladder-oi-bar-fill--put"
              style={{ width: `${pw}%` }}
            />
          </div>
        </div>
        <div
          className="strike-ladder-oi-nums"
          aria-label={`Call OI ${fmtOiCompact(c)}, Put OI ${fmtOiCompact(p)}`}
        >
          <span className="strike-ladder-oi-nums-c">C {fmtOiCompact(c)}</span>
          <span className="strike-ladder-oi-nums-p">P {fmtOiCompact(p)}</span>
        </div>
      </div>
    </td>
  )
}

type Props = {
  ariaLabel: string
  strikes: number[]
  rowClassName?: (strike: number) => string
  multiSelectStrikes: number[]
  setMultiSelectStrikes: Dispatch<SetStateAction<number[]>>
  showOi: boolean
  oiMax: number
  oiByStrike: Map<number, StrikeOiPair>
  wrapRef?: Ref<HTMLDivElement>
}

export function DiscoveryStrikeLadderTable({
  ariaLabel,
  strikes,
  rowClassName,
  multiSelectStrikes,
  setMultiSelectStrikes,
  showOi,
  oiMax,
  oiByStrike,
  wrapRef,
}: Props) {
  return (
    <div className="strike-ladder-wrap" ref={wrapRef}>
      <table className="strike-ladder-table" role="grid" aria-label={ariaLabel}>
        <thead>
          <tr>
            <th scope="col">Select</th>
            <th scope="col">{showOi ? 'Strike / OI' : 'Strike'}</th>
          </tr>
        </thead>
        <tbody>
          {strikes.map(s => (
            <tr key={s} className={rowClassName?.(s)}>
              <td className="strike-ladder-cell-check">
                <input
                  type="checkbox"
                  checked={multiSelectStrikes.includes(s)}
                  onChange={() => {
                    if (multiSelectStrikes.includes(s)) {
                      setMultiSelectStrikes(prev => prev.filter(x => x !== s))
                    } else {
                      setMultiSelectStrikes(prev => [...prev, s].sort((a, b) => a - b))
                    }
                  }}
                  aria-label={`Select strike ${s}`}
                />
              </td>
              <StrikeLadderOiStrikeCell
                strike={s}
                oiMax={oiMax}
                oiByStrike={oiByStrike}
                showOi={showOi}
              />
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
