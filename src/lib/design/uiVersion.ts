/**
 * The `@bifrost/ui` this app is built on, stated where two reference pages read
 * it: the Options Kit (against its target) and the UI Design System's head.
 * Measured against `node_modules/@bifrost/ui` — the Options Kit test pins it.
 *
 * 0.4.12 (2026-09-24) is a PageHeader layout patch, 0.4.13 (2026-09-25) adds
 * the semantic colour tokens and 0.4.14 ships them as their own stylesheet;
 * 0.4.15 moves the severity lamps in beside them and drops the up/down
 * aliases; 0.4.16 adds `PageHead` (§16.10); 0.4.17 the §17 patterns layer,
 * `ViewState` and table column types; 0.4.18 the floating sidebar skin
 * (`ShellNavSidebar chrome="floating"`, `styles/shell`, Rev .61); 0.5.0 the
 * "Apple" round promoted (design Rev .59–.74): `styles/materials`, 1a as the
 * default look (tag capsule, frameless secondary button, field, table,
 * floating sidebar), sheets, NumberField, ContextMenu, KpiCard / FilterBar;
 * 0.5.1 the last framed pieces (SegmentControl track, CollapsibleGroup, the
 * sidebar's rules and peer card); 0.5.2 the Rev .84/.85/.93 site-wide rules
 * (sentence-case toolbar labels, four heroes 2 × 2, nowrap segments, a DS
 * table head sticking at the top of its own scroller); 0.5.3 the package's
 * last neutral borders (standard table rules, PageHead's rule and ⓘ,
 * ViewState's strip, the sidebar's leftovers); 0.5.4 drops the subhead and
 * detail rows' `bg-secondary` bands.
 */
export const UI_VERSION_NOW = '0.5.4'
