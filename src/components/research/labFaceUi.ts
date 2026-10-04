/**
 * The lab method faces' shared panel dressing — promoted when the Screener
 * authoring face became its third reader (History and Symbol lab carried
 * local copies first; §14.2).
 */
// 11/600 sentence case (Rev .84 mechanical, applied to the lab faces at .88).
export const cap = 'whitespace-nowrap text-dense-meta font-semibold text-muted-foreground'
export const mono = 'font-mono tabular-nums'
export const panel =
  'min-w-0 border mat-card'
export const panelHead =
  'flex flex-wrap items-center gap-2.5 border-b px-3 py-1.75 text-dense-body leading-normal'
// Table heads and cells as positionsUi.th / td (§17.2 under the list grammar,
// Rev .153–.154): 11/600 sentence case, one head hairline, no row rules.
export const th =
  'whitespace-nowrap border-b border-border px-2 py-1 text-right align-bottom text-dense-meta font-semibold leading-[1.3] text-[var(--sk-mute)]'
export const td =
  'whitespace-nowrap px-2 py-1.25 text-right font-mono text-xs tabular-nums'
