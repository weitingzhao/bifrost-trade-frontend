/* eslint-disable react-hooks/set-state-in-effect -- inline DB summary refresh on refreshKey */
import { useEffect, useState } from 'react'
import { fetchDbCoverageSummary } from '@/api/massive/watchlistCoverage'

export function OptionCoverageDbSummaryInline({ refreshKey }: { refreshKey: number }) {
  const [line, setLine] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setLine(null)
    void fetchDbCoverageSummary()
      .then(res => {
        if (cancelled) return
        setLoading(false)
        if (!res.ok) {
          setLine(res.error ?? 'Could not load DB summary')
          return
        }
        const parts = (res.tables ?? [])
          .filter(t => !t.error)
          .map(t => `${t.table_name} ${t.distinct_symbols ?? '—'}`)
        setLine(parts.length > 0 ? parts.join(' · ') : 'No tables returned')
      })
      .catch(() => {
        if (!cancelled) {
          setLoading(false)
          setLine('Could not load DB summary')
        }
      })
    return () => {
      cancelled = true
    }
  }, [refreshKey])

  if (loading && line == null) {
    return (
      <p className="text-xs text-muted-foreground mb-3">Loading PostgreSQL coverage snapshot…</p>
    )
  }
  if (!line) return null
  return (
    <p className="text-xs text-muted-foreground mb-3 leading-relaxed">
      <strong className="text-foreground/80">DB snapshot:</strong> {line}
    </p>
  )
}
