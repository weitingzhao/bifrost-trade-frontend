# AGENTS.md — bifrost-trade-frontend

Instructions for **Claude Code, Cursor Agent, Codex, GPT**, and other coding agents working in this repository.

## Language

- **Chat with the user**: Always reply in **Chinese**, regardless of the user's input language (do not switch to English just because a message arrives in English)
- **UI strings and code identifiers**: English only

## Product context

Internal trading monitoring SPA (React 18 + Vite + TanStack Query + shadcn/ui). Phase 1: New Frontend + Legacy API. See `CLAUDE.md` for architecture, hooks, and migration constraints.

## UI consistency (MANDATORY)

**Same interaction → same shared primitive. One token/component change → all adopters update together.**

Before any UI work, agents MUST:

1. Read **`docs/TECH_STACK.md`** (locked stack + governance — authoritative)
2. Read **`docs/DENSE_UI.md`** (dense table / monitoring patterns)
3. Follow **`.cursor/rules/dense-ui-system.mdc`**
4. For tables, segments, collapsible panels, or CSS migration: read **`.cursor/skills/dense-ui/SKILL.md`**

### Stack

| Layer | Location |
|-------|----------|
| Tokens | `src/index.css` |
| Dense data primitives | `src/components/data-display/` |
| Generic UI | shadcn/ui + Tailwind |
| Domain | pages/components — logic + columns only |

### Hard rules

- Use `DenseDataTable`, `PnlCell`/`pnlColorClass`, `IconActionButton`, `SegmentControl`, `CollapsibleGroup` — not new table module CSS or `replay-*` classes
- No `window.confirm` / `window.alert` — use in-app `ConfirmDialog` (see `.cursor/rules/ui-confirm-dialogs.mdc`)
- After UI changes: `npm run lint && npm run build && npm run check:legacy-css`

### Allowed CSS exceptions

Chart geometry and risk payoff layout only (`PositionsChartsSection.module.css`, `DonutChart.module.css`, `riskProfile.module.css`). Do not add new exceptions without owner approval.

## Other rules

| Topic | File |
|-------|------|
| Confirm dialogs | `.cursor/rules/ui-confirm-dialogs.mdc` |
| Monitoring layout / Skote reference | `.cursor/rules/monitoring-ui.mdc` |
| Distinctive visual design (large redesigns) | `.cursor/skills/frontend-design/SKILL.md` |
| Full project conventions | `CLAUDE.md` |

## Commands

```bash
npm run dev          # port 5173
npm run lint
npm run build
npm run check:legacy-css
```
