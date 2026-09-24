/**
 * The 620×190 SVI smile frame — fit path, market dots coloured by residual,
 * residual bars compressed past the design's ×9 scale so a rough fit cannot
 * run its bars through the smile. Promoted from the Symbol lab when the
 * Symbol page's Skew panel became its second reader (§14.2).
 */
import { cn } from '@/lib/utils'
import { type SmileRow } from '@/utils/sviSmile'

const mono = 'font-mono tabular-nums'

export function SviSmileChart({ rows }: { rows: SmileRow[] }) {
  const ivs = rows.flatMap((r) => [r.mkt, r.fit])
  const lo = Math.min(...ivs) - 2
  const hi = Math.max(...ivs) + 2
  // The design draws residual bars at 9px per vol point, sized for a fit
  // within a point or two. A rough fit would run its bars through the smile,
  // so past that the scale compresses to keep the worst bar at 40px.
  const worst = rows.reduce((a, r) => Math.max(a, Math.abs(r.resid)), 0)
  const pxPerPt = worst > 40 / 9 ? 40 / worst : 9
  const X = (k: number) => 40 + ((k + 0.2) / 0.4) * 540
  const Y = (v: number) => 150 - ((v - lo) / (hi - lo)) * 132
  const fitPath = rows
    .map((r, i) => `${i ? 'L' : 'M'}${X(r.k).toFixed(1)} ${Y(r.fit).toFixed(1)}`)
    .join(' ')
  const dotFill = (resid: number) =>
    Math.abs(resid) < 0.35
      ? 'var(--foreground)'
      : resid > 0
        ? 'var(--color-profit)'
        : 'var(--color-loss)'
  return (
    <div className="px-3 pb-0.5 pt-2.5">
      <svg
        viewBox="0 0 620 190"
        className="block h-auto w-full"
        role="img"
        aria-label="Implied vol smile with SVI fit and residual bars"
      >
        <line x1="0" x2="620" y1="168" y2="168" stroke="var(--border)" strokeWidth="1" />
        <line
          x1={X(0)}
          x2={X(0)}
          y1="8"
          y2="150"
          stroke="var(--sk-ticker)"
          strokeWidth="1"
          strokeDasharray="3 3"
        />
        <path d={fitPath} fill="none" stroke="var(--primary)" strokeWidth="1.7" />
        {rows.map((r) => (
          <circle key={`p${r.strike}`} cx={X(r.k)} cy={Y(r.mkt)} r="3" fill={dotFill(r.resid)} />
        ))}
        {rows.map((r) => (
          <rect
            key={`b${r.strike}`}
            x={X(r.k) - 3.5}
            y={r.resid >= 0 ? 168 - Math.abs(r.resid) * pxPerPt : 168}
            width="7"
            height={Math.max(1.5, Math.abs(r.resid) * pxPerPt)}
            fill={r.resid > 0 ? 'var(--color-profit)' : 'var(--color-loss)'}
            opacity=".85"
          />
        ))}
      </svg>
      <div className="flex justify-between pt-0.5">
        {rows
          .filter((_, i) => i % 2 === 0)
          .map((r) => (
            <span key={r.strike} className={cn(mono, 'text-dense-micro text-muted-foreground')}>
              {r.strike}
            </span>
          ))}
      </div>
      <div className="flex flex-wrap gap-x-3.5 gap-y-1 pt-1.5">
        <span className={cn(mono, 'text-dense-micro text-muted-foreground')}>
          <span className="text-primary">—</span> fit
        </span>
        <span className={cn(mono, 'text-dense-micro text-muted-foreground')}>● market IV</span>
        <span className={cn(mono, 'text-dense-micro text-muted-foreground')}>
          bars = residual, above line rich{pxPerPt < 9 ? ' · scaled to the worst bar' : ''}
        </span>
      </div>
    </div>
  )
}
