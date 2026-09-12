/**
 * Trade's shell chrome dimensions.
 *
 * These are Trade's, not the design system's. `@bifrost/ui` exports a 48px top
 * bar, and the Ops Console renders it (`console/src/components/ConsoleHeader.tsx`).
 * Ops is designed separately from Trade, so Trade's 42px lives here rather than
 * in the shared package, where changing it would silently re-chrome another
 * product.
 *
 * Source: `design/trade/Shell Spec Draft.md` — top bar 42px single row, status
 * bar 24px always present, sidebar 240px expanded.
 */

/** Top bar: sidebar toggle · breadcrumb · Omnibar · symbol chip · market strip · inbox · Copilot. */
export const SHELL_TOP_BAR_HEIGHT_CLASS = 'h-[42px] shrink-0'

/** Bottom bar: always present, never scrolls away, never grows. */
export const SHELL_STATUS_BAR_HEIGHT_CLASS = 'h-6 shrink-0'

/** The expanded sidebar. Collapsed, it keeps the design system's icon-rail width. */
export const SHELL_SIDEBAR_WIDTH = '240px'
