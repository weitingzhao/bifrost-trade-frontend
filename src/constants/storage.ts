/** All localStorage keys used across the app. */
export const STORAGE_KEYS = {
  sidebarAccordion: 'bifrost-sidebar-accordion',
  sidebarOpenGroups: 'bifrost-sidebar-open-groups',
  /** Captions the reader has folded away in the business tree (§5a.7). */
  sidebarCaptions: 'bifrost-sidebar-captions',
  // The sidebar's group order — the design's own key (`shell-registry.js`).
  navOrder: 'bifrost.navorder',
  // The System tree keeps its own folds. Sharing one key had two costs: the
  // stored business set has no `System` entry, so the group rendered closed
  // however `defaultOpen` was set (a stored set wins over the defaults
  // outright), and every fold opened inside System was written back over the
  // business tree's own — walk in and out and your Portfolio folds were gone.
  sidebarSystemOpenGroups: 'bifrost-sidebar-system-open-groups',
  researchSeat: 'bifrost-research-seat',
  // Briefings you marked read in the Decision Inbox. Per browser: the Research
  // service keeps no read state on drafts.
  inboxReadDrafts: 'bifrost-inbox-read-drafts',
  // Last exhibit this browser saw per symbol — prior half of "Since you last looked".
  symbolExhibitSnapshot: 'bifrost-symbol-exhibit-snapshot',
  // Option Discovery compare drawer — survives symbol / expiry switches.
  discoveryCompare: 'bifrost-discovery-compare',
  /**
   * The Option screen's list, structure and six sliders. Replaced
   * `optionScreenerFilters` on 2026-09-23 when the sliders moved from 0–1
   * fractions to the design's percents: a saved 0.3 read as 0.3% would have
   * emptied every screen on first load.
   */
  optionScreenerLive: 'optionScreenerLive',
  optionDiscoveryPrefs: 'optionDiscoveryPrefs',
  positionsCushionPct: 'bifrost-positions-cushion-pct',
  positionsSections: 'bifrost-positions-sections',
  positionsLinesView: 'bifrost-positions-lines-view',
  positionsDetailMode: 'bifrost-positions-detail-mode',
  backingPressureCeiling: 'bifrost-backing-pressure-ceiling',
} as const
