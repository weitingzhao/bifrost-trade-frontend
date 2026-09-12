/** All localStorage keys used across the app. */
export const STORAGE_KEYS = {
  theme: 'bifrost-theme',
  sidebarAccordion: 'bifrost-sidebar-accordion',
  sidebarOpenGroups: 'bifrost-sidebar-open-groups',
  // The System tree keeps its own folds. Sharing one key had two costs: the
  // stored business set has no `System` entry, so the group rendered closed
  // however `defaultOpen` was set (a stored set wins over the defaults
  // outright), and every fold opened inside System was written back over the
  // business tree's own — walk in and out and your Portfolio folds were gone.
  sidebarSystemOpenGroups: 'bifrost-sidebar-system-open-groups',
  researchSeat: 'bifrost-research-seat',
  optionScreenerFilters: 'optionScreenerFilters',
  optionDiscoveryPrefs: 'optionDiscoveryPrefs',
  positionsCushionPct: 'bifrost-positions-cushion-pct',
  positionsSections: 'bifrost-positions-sections',
  positionsLinesView: 'bifrost-positions-lines-view',
  positionsDetailMode: 'bifrost-positions-detail-mode',
  backingPressureCeiling: 'bifrost-backing-pressure-ceiling',
} as const
