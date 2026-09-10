---
name: web-interface-audit
description: Audit Trade frontend TSX/CSS for accessibility, focus, motion and content-handling defects using the vendored Web Interface Guidelines. Use when reviewing a page before merge, or when the user asks for an a11y / interface-quality pass. Not a design or taste tool — Dense UI owns look and density.
parity-id: web-interface-audit-v1
---

# Web Interface Audit

Mechanical correctness pass over the interface layer: accessibility, focus, motion,
i18n and content handling. Rules are vendored in [reference.md](reference.md)
(MIT, `vercel-labs/web-interface-guidelines`).

## This is not a design skill

It finds *defects*, not improvements. It cannot judge hierarchy, density or whether a
panel earns its space.

**Precedence when the two disagree — Dense UI wins.** Upstream is written for
comfortable consumer product UI ("build one badly and the whole app feels slow and
cramped"); this frontend is a deliberately dense trading terminal. Row height,
padding and information density are settled by `docs/DENSE_UI.md` and
`.claude/skills/dense-ui/`. Never file a finding that amounts to "add more breathing
room".

For look, hierarchy and layout use `.claude/skills/frontend-design/`.

## Scope — skip vendored shadcn

`src/components/ui/**` is vendored shadcn/ui. Radix owns focus there, so
`outline-none` is intentional and paired with `focus-visible:ring-*` or
`data-[state=*]` elsewhere in the same class string.

**Auditing it produces ~15 false positives and zero real findings.** Exclude it
unless the change under review actually edits those files. Audit `src/pages/**`,
`src/components/**` minus `ui/`, and `*.module.css`.

## Run

```bash
cd bifrost-trade-frontend/src
X="--include=*.tsx --include=*.ts --include=*.css"
grep -rn "transition-all\|transition: all" $X . | grep -v "/components/ui/"
grep -rn "outline-none\|outline: *none"    $X . | grep -v "/components/ui/" | grep -v "focus-visible"
grep -rn "<div[^>]*onClick=\|<span[^>]*onClick=" --include=*.tsx . | grep -v "/components/ui/"
grep -rn "prefers-reduced-motion"          $X .
grep -rln "animate-\|transition"           $X . | grep -v "/components/ui/"
```

Then read [reference.md](reference.md) and check the rules that greps cannot see —
heading hierarchy, `aria-live` on async updates, empty states, `min-w-0` on flex
children that must truncate.

## Calibrated baseline (measured 2026-09-09, 569 `.tsx`)

Re-measure before claiming a regression; these are the numbers that made the
false-positive rule above.

| Rule | Count | Read |
|---|---|---|
| `tabular-nums` | 450 | Already systemic. Upstream's top ask for data UI — satisfied. |
| `aria-label` | 435 | Already systemic. |
| `window.confirm` / `alert` | 0 real | 3 grep hits are docs *forbidding* it. Dense UI already bans it. |
| `prefers-reduced-motion` | **0** | Against 34 `animate-*` + 139 `transition`. Handled globally in `src/index.css` — check it survived before adding local guards. |
| `outline-none` w/o same-line `focus-visible` | 15 | **All vendored shadcn.** Noise. |
| `transition-all` | 9 | Several vendored. Prefer naming properties in project code. |

## Output

Group by file, `file:line`, terse. State issue + location; skip the explanation
unless the fix is non-obvious.

```text
## src/pages/research/seats/WorkbenchPage.tsx

src/pages/research/seats/WorkbenchPage.tsx:126 - card body has no line-clamp; long text clips
src/pages/research/seats/WorkbenchPage.tsx:93  - h2 under no h1 in this subtree
```

Report `✓ pass` for a clean file. No preamble.

## Re-syncing with upstream

`reference.md` is a faithful copy. To refresh, replace the body below its header
from `https://raw.githubusercontent.com/vercel-labs/web-interface-guidelines/main/command.md`
and keep the header and `LICENSE.upstream` intact. Calibration stays in this file.
