/**
 * GENERATED — do not edit. `node scripts/design-nav-snapshot.mjs`.
 *
 * The design registry's colour mirror (`DIRECTION` + `ACCENT` in
 * `design/trade/shell-registry.js`, Rev 2026-09-25.49). The values belong to
 * `@bifrost/ui` since Rev .31; the registry keeps this copy as a ratchet mirror,
 * and `identityColour.test.ts` holds it to the package.
 */

export const DESIGN_INKS = {
  dark: {
    accent: "#a78bfa",
    profit: "#4ade80",
    loss: "#f87171",
    unrealized: "#fb923c",
    ticker: "#a3e635",
    contract: "#7dd3fc",
    instance: "#c084fc",
  },
  light: {
    accent: "#6d28d9",
    profit: "#15803d",
    loss: "#b91c1c",
    unrealized: "#9a3412",
    ticker: "#3f6212",
    contract: "#075985",
    instance: "#6b21a8",
  },
} as const

/**
 * The neutral ramp (`RAMP`, named by `SK_VARS`). Trade-only — the package does
 * not carry it (Rev .43 Q5) — so `identityColour.test.ts` holds the app's
 * `--sk-*` declarations to this mirror instead.
 */
export const DESIGN_RAMP = {
  dark: {
    "--sk-ground": "#0a0b11",
    "--sk-surface": "#191d29",
    "--sk-raised": "#0e1017",
    "--sk-raised2": "#121522",
    "--sk-line": "#2a3040",
    "--sk-line2": "#3d4559",
    "--sk-line0": "#1f2330",
    "--sk-ink": "#e6e9f2",
    "--sk-soft": "#c5cad8",
    "--sk-mute2": "#99a1b3",
    "--sk-mute": "#99a1b3",
    "--sk-faint": "#566175",
  },
  light: {
    "--sk-ground": "#e9ebef",
    "--sk-surface": "#f4f5f8",
    "--sk-raised": "#eef0f4",
    "--sk-raised2": "#fafbfc",
    "--sk-line": "#c9ced7",
    "--sk-line2": "#aeb6c2",
    "--sk-line0": "#dbdfe6",
    "--sk-ink": "#171c26",
    "--sk-soft": "#3a4250",
    "--sk-mute2": "#5b6572",
    "--sk-mute": "#5b6572",
    "--sk-faint": "#959daa",
  },
} as const
