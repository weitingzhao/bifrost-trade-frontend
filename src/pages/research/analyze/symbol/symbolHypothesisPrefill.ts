/**
 * What «Hypothesis» on the Symbol head fills in (S6, 2026-09-26): the retired
 * sections each pre-filled their own lens; the head had one generic `symbol`
 * tag whatever face was open. On a lens face it now carries that face — its
 * headline and meaning as the thesis, its lenses as tags, their readings in
 * the origin — and elsewhere the decisive lenses across the page.
 */
import type { DossierFaceId, DossierFaceView } from '@/lib/dossier'
import type { SymbolTabId } from '@/lib/symbolTabs'

const TAB_FACE: Partial<Record<SymbolTabId, DossierFaceId>> = {
  volatility: 'volatility',
  dealer: 'dealer',
  scenario: 'scenario',
  flow: 'flow',
}

export interface HypothesisPrefill {
  title: string
  thesis: string
  tags: string[]
  originRef: Record<string, unknown>
}

export function symbolHypothesisPrefill(
  symbol: string,
  tab: SymbolTabId,
  views: readonly DossierFaceView[],
  pageThesis: string,
): HypothesisPrefill {
  const faceId = TAB_FACE[tab]
  const view = faceId ? views.find((v) => v.face.id === faceId) ?? null : null
  const rows = view
    ? view.rows.filter((r) => r.band != null || r.value != null)
    : views.flatMap((v) => v.rows).filter((r) => r.band === 'hot' || r.band === 'cold')
  const readingLine = rows
    .map((r) => `${r.label} ${r.value ?? '—'}${r.band ? ` (${r.band})` : ''}`)
    .join(' · ')
  const tags = [...new Set(['symbol', ...(view ? [view.face.id] : []), ...rows.map((r) => r.id)])]
  const readings = Object.fromEntries(
    rows.map((r) => [r.id, { band: r.band, value: r.value, verdict: r.verdict, as_of: r.asOf }]),
  )
  if (view) {
    const head = [view.headline, view.means].filter(Boolean).join(' — ').replace(/[.\s]+$/, '')
    return {
      title: `${symbol} — ${view.face.title}: ${view.headline}`,
      thesis: readingLine ? `${head}. Readings: ${readingLine}.` : head,
      tags,
      originRef: { source: 'symbol', symbol, tab, face: view.face.id, readings },
    }
  }
  return {
    title: `${symbol} — ${pageThesis}`,
    thesis: readingLine ? `${pageThesis.replace(/[.\s]+$/, '')}. Readings: ${readingLine}.` : pageThesis,
    tags,
    originRef: { source: 'symbol', symbol, tab, readings },
  }
}
