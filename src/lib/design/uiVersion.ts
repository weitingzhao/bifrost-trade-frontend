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
// 0.6.0 (K7): every failed ViewState grows a Report-this link when the shell
// registers a handler (setViewStateReportHandler) — the feedback loop's entry.
// 0.7.0 (U1): ShellNavSidebar's Filter pages field (design 2026-09-28).
// 0.7.1 (Rev .111): `--sk-trade` and `--sk-objective`; `--sk-instance` stays one version as an alias.
// 0.8.0 (Rev .117): `SectionBand` — every page section folds (§17.8).
// 0.9.0 (Rev .132): Liquid Glass — the glass tokens (rim, lens, tinted primary,
// vibrancy inks, scroll edge, press, morph / spring motion), morph-from-source
// on Popover · ContextMenu · the sheet, InspectorPanel, TokenSearchField,
// UndoToast, ScrollEdge. The design targeted 0.8.0, which SectionBand had taken.
// 0.9.1 (Rev .135–.142): every Button a capsule; FilterBar without a slab (sticky =
// the scroll edge); PageHead capsule tabs, no hairline, glass ⓘ note; the sidebar
// fills its row only on keyboard focus, overlay scrollbar, glass Filter pages.
// 0.10.0 (Rev .150–.154): the list grammar of a grid on glass behind the `data-sr-list`
// scope (DenseDataTable variant="list", DenseTableRow selected / rowTint, subhead rows
// as data-sr-group, DenseList / DenseListHead / DenseListRow); stuck marks (useStuck,
// useStuckMarks: data-stuck on sticky bars and heads, data-sx on wide boxes) and
// data-sr-edge fade | solid; the sticky toolbar's band only while stuck; IconActionButton
// variant="close" (data-sr-close); hero readings step 30 / 26 / 24 and wrap at spaces.
// 0.11.0 (Rev .146 · .150 · .151, plan batches 5 + 6): PanelHead (data-sr-head) and the
// Rev .151 overlay values; DialogContent size sm (glass) · md / lg (opaque); the round
// built-in close and --glass-drop on every sheet; SegmentControl's selected segment ink 15%
// + lens; FilterChip · FilterTray · FilterGroup (tri-state head); CalendarGrid · CalendarNav
// · MiniMonth · TimeStrip and the shared date words (§17.9).
// 0.12.0 (Rev .156): FilterChip size="sm" · dashed · missing (§17.10); DenseTableDetailRow
// as an expansion in a list scope — no fill, no zebra, no capsule, a hairline under,
// `indent`; a nested table's head does not stick (§17.2).
export const UI_VERSION_NOW = '0.12.0'
