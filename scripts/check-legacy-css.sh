#!/usr/bin/env bash
# Mechanical Legacy CSS guards — see docs/LEGACY_CSS_CUTOFF.md
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

fail=0

report() {
  echo "check-legacy-css: $1" >&2
  fail=1
}

# Side-effect CSS module imports (import './foo.module.css' without binding)
if side_effect=$(grep -rE "^import ['\"]\./[^'\"]+\.module\.css['\"];?\s*$" src --include='*.ts' --include='*.tsx' 2>/dev/null || true); then
  if [[ -n "$side_effect" ]]; then
    echo "$side_effect" >&2
    report "side-effect module CSS imports found (use \`import styles from './file.module.css'\`)"
  fi
fi

# Legacy alias token strings in TS/TSX (not in CSS comments)
if legacy_tokens=$(grep -rE '(--color-text-main|--color-bg[^-]|--space-[0-9])' src --include='*.ts' --include='*.tsx' 2>/dev/null || true); then
  if [[ -n "$legacy_tokens" ]]; then
    echo "$legacy_tokens" >&2
    report "Legacy alias CSS tokens in TS/TSX"
  fi
fi

# replay-* and pnl-positive/negative string class names in TSX
if replay=$(grep -rE "('|\")replay-|('|\")pnl-positive|('|\")pnl-negative" src --include='*.tsx' 2>/dev/null || true); then
  if [[ -n "$replay" ]]; then
    echo "$replay" >&2
    report "replay-* or pnl-positive/negative strings in TSX (use Tailwind / pnlColorClass)"
  fi
fi

# Positions domain: no replay-* in components/positions
if pos_replay=$(grep -rE 'replay-' src/components/positions --include='*.tsx' --include='*.ts' 2>/dev/null || true); then
  if [[ -n "$pos_replay" ]]; then
    echo "$pos_replay" >&2
    report "replay-* strings under src/components/positions"
  fi
fi

# No new *Legacy.css files
if legacy_files=$(find src -name '*Legacy.css' 2>/dev/null); then
  if [[ -n "$legacy_files" ]]; then
    echo "$legacy_files" >&2
    report "*Legacy.css files must not exist"
  fi
fi

# Positions: :global( in module CSS (except chart exceptions kept scoped under PositionsChartsSection)
if pos_global=$(grep -r ':global(' src/components/positions --include='*.css' 2>/dev/null \
  | grep -v PositionsChartsSection.module.css \
  | grep -v DonutChart.module.css || true); then
  if [[ -n "$pos_global" ]]; then
    echo "$pos_global" >&2
    report ":global() in positions CSS (charts donut exception only)"
  fi
fi

# riskProfile should remain scoped (no :global)
if risk_global=$(grep ':global(' src/components/positions/riskProfile.module.css 2>/dev/null || true); then
  if [[ -n "$risk_global" ]]; then
    echo "$risk_global" >&2
    report ":global() in riskProfile.module.css"
  fi
fi

# Positions chart module CSS budget (PositionsChartsSection + DonutChart only)
chart_css_files=(
  src/components/positions/PositionsChartsSection.module.css
  src/components/positions/charts/DonutChart.module.css
)
chart_css_lines=0
for f in "${chart_css_files[@]}"; do
  if [[ -f "$f" ]]; then
    chart_css_lines=$((chart_css_lines + $(wc -l < "$f")))
  fi
done
if [[ "$chart_css_lines" -gt 400 ]]; then
  report "positions chart module CSS line budget exceeded ($chart_css_lines > 400)"
fi

# Risk profile scoped CSS (payoff + scenario matrix exception)
risk_css=src/components/positions/riskProfile.module.css
if [[ -f "$risk_css" ]]; then
  risk_lines=$(wc -l < "$risk_css")
  if [[ "$risk_lines" -gt 450 ]]; then
    report "riskProfile.module.css line budget exceeded ($risk_lines > 450)"
  fi
fi

# Trade Ledger: migrated tabs must not reference legacy table module classes
if ledger_legacy=$(grep -rE 'styles\.(ledgerTable|optTable|stkTable|ledgerGroupRow|strategyGroup|instanceHeader|iconBtn|execRowActions)' \
  src/pages/portfolio/ledger --include='*.tsx' --include='*.ts' 2>/dev/null || true); then
  if [[ -n "$ledger_legacy" ]]; then
    echo "$ledger_legacy" >&2
    report "legacy ledger table CSS class references under src/pages/portfolio/ledger"
  fi
fi

# Trade Ledger aggregated CSS budget (toolbar + summary + source badges only)
ledger_css=src/pages/portfolio/ledger/ledgerStyles.module.css
if [[ -f "$ledger_css" ]]; then
  ledger_lines=$(wc -l < "$ledger_css")
  if [[ "$ledger_lines" -gt 950 ]]; then
    report "ledgerStyles.module.css line budget exceeded ($ledger_lines > 950)"
  fi
fi

if [[ "$fail" -ne 0 ]]; then
  exit 1
fi

echo "check-legacy-css: OK"
