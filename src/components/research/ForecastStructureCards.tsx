import { DenseTag } from '@/components/data-display'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'

export interface ForecastStructureRec {
  structure: string
  legs_summary: string
  pop: number
  ev: number
  cvar: number
  rationale: string
  status?: 'CANDIDATE' | 'WATCH' | 'AVOID'
}

function parseStructures(raw: unknown): ForecastStructureRec[] {
  if (!raw) return []
  let list: unknown[]
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw) as unknown
      list = Array.isArray(parsed) ? parsed : []
    } catch {
      return []
    }
  } else if (Array.isArray(raw)) {
    list = raw
  } else {
    return []
  }
  return list
    .map((item): ForecastStructureRec | null => {
      if (!item || typeof item !== 'object') return null
      const o = item as Record<string, unknown>
      const structure = String(o.structure ?? o.name ?? 'Structure')
      const rec: ForecastStructureRec = {
        structure,
        legs_summary: String(o.legs_summary ?? o.legs ?? ''),
        pop: Number(o.pop ?? 0),
        ev: Number(o.ev ?? 0),
        cvar: Number(o.cvar ?? 0),
        rationale: String(o.rationale ?? ''),
      }
      if (o.status === 'CANDIDATE' || o.status === 'WATCH' || o.status === 'AVOID') {
        rec.status = o.status
      }
      return rec
    })
    .filter((x): x is ForecastStructureRec => x !== null)
}

function classifyStatus(rec: ForecastStructureRec, index: number, total: number): ForecastStructureRec['status'] {
  if (rec.status) return rec.status
  if (index === 0 && rec.ev > 0) return 'CANDIDATE'
  if (rec.ev < 0 || index === total - 1) return 'AVOID'
  return 'WATCH'
}

function statusVariant(status: ForecastStructureRec['status']) {
  if (status === 'CANDIDATE') return 'success'
  if (status === 'WATCH') return 'warning'
  return 'danger'
}

function fmtPct(n: number, digits = 0): string {
  if (!Number.isFinite(n)) return '—'
  return `${(n * 100).toFixed(digits)}%`
}

export function ForecastStructureCards({ structuresJson }: { structuresJson: unknown }) {
  const parsed = parseStructures(structuresJson)
  if (parsed.length === 0) return null

  const ranked = [...parsed].sort((a, b) => b.ev - a.ev)
  const withStatus = ranked.map((rec, i) => ({
    ...rec,
    status: classifyStatus(rec, i, ranked.length),
  }))

  return (
    <div className="grid gap-3 md:grid-cols-3">
      {withStatus.map((rec) => (
        <Card
          key={`${rec.structure}-${rec.legs_summary.slice(0, 24)}`}
          variant="elevated"
          className={cn(
            'border',
            rec.status === 'CANDIDATE' && 'border-emerald-500/40',
            rec.status === 'WATCH' && 'border-amber-500/40',
            rec.status === 'AVOID' && 'border-destructive/40',
          )}
        >
          <CardContent className="flex flex-col gap-2 p-3">
            <div className="flex items-center justify-between gap-2">
              <h4 className="text-dense-label font-semibold">{rec.structure}</h4>
              <DenseTag variant={statusVariant(rec.status)}>{rec.status}</DenseTag>
            </div>
            <p className="text-dense-meta text-muted-foreground">{rec.legs_summary}</p>
            <div className="flex flex-wrap gap-3 font-mono text-dense-meta tabular-nums">
              <span>PoP {fmtPct(rec.pop)}</span>
              <span>EV {rec.ev.toFixed(2)}</span>
              <span>CVaR {rec.cvar.toFixed(2)}</span>
            </div>
            {rec.rationale ? (
              <p className="text-dense-caption text-muted-foreground">{rec.rationale}</p>
            ) : null}
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
