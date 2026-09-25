/**
 * Trade's shell chrome dimensions.
 *
 * These are Trade's, not the design system's. `@bifrost/ui` exports a 48px top
 * bar, and the Ops Console renders it (`console/src/components/ConsoleHeader.tsx`).
 * Ops is designed separately from Trade, so Trade's 42px lives here rather than
 * in the shared package, where changing it would silently re-chrome another
 * product.
 *
 * Source: `design/trade/Shell Spec.md` — top bar 42px single row, status
 * bar 24px always present, sidebar 240px expanded.
 */

/** Top bar: sidebar toggle · breadcrumb · Omnibar · Lens · Copilot. */
export const SHELL_TOP_BAR_HEIGHT_CLASS = 'h-[42px] shrink-0'

/**
 * The same 42, as a number, for the surfaces that start below it.
 *
 * The design measures its own top bar with a ResizeObserver because that bar
 * wraps to two rows on a narrow viewport. This one does not — it is a single
 * flex row with a shrinking breadcrumb — so there is nothing to measure and a
 * constant is the honest spelling.
 */
export const SHELL_TOP_BAR_PX = 42

/** The expanded sidebar. Collapsed, it keeps the design system's icon-rail width. */
export const SHELL_SIDEBAR_WIDTH = '240px'

/**
 * Below this the nav starts as an icon rail (Shell Spec §6).
 *
 * 240px of nav on a 1280 screen is a fifth of it, and the tables are what the
 * screen is for. The design's three tiers are: expanded above this, rail
 * below, and — further down — the Copilot and the Inspector stop pushing and
 * overlay instead, which they already decide for themselves from their own
 * widths.
 */
export const SHELL_SIDEBAR_EXPAND_MIN_VIEWPORT = 1400

/**
 * Where the sidebar starts.
 *
 * The reader's own choice when they have made one — the DS writes
 * `sidebar_state` on every toggle — and the viewport only supplies the default
 * for someone who has not. Never an override: expanding the rail on a narrow
 * screen is a decision, and a decision that gets undone on the next reload was
 * not honoured.
 */
export function initialSidebarOpen(cookie: string, viewportWidth: number): boolean {
  const match = cookie.match(/(?:^|;\s*)sidebar_state=([^;]*)/)
  if (match) return match[1] === 'true'
  return viewportWidth >= SHELL_SIDEBAR_EXPAND_MIN_VIEWPORT
}

