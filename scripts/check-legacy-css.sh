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

# Trade Ledger: no ledgerStyles.module.css (shell/toolbar/summary → ledgerShellUi + ledgerSummaryUi)
if ledger_styles=$(grep -rl "ledgerStyles" src/pages/portfolio/ledger --include='*.tsx' --include='*.ts' 2>/dev/null || true); then
  if [[ -n "$ledger_styles" ]]; then
    echo "$ledger_styles" >&2
    report "ledgerStyles import under src/pages/portfolio/ledger (use ledgerShellUi / ledgerSummaryUi)"
  fi
fi
ledger_css=src/pages/portfolio/ledger/ledgerStyles.module.css
if [[ -f "$ledger_css" ]]; then
  report "ledgerStyles.module.css must be deleted (Trade Ledger Dense shell migration)"
fi

# Transfer & Pay: Dense migration — no module CSS
if tp_legacy=$(grep -rE 'styles\.(dataTable|tableWrap|appTab|typePill|pnlPositive|pnlNegative|pnlZero|amountCell)' \
  src/pages/portfolio/TransferPayPage.tsx src/pages/portfolio/transferPay --include='*.tsx' --include='*.ts' 2>/dev/null || true); then
  if [[ -n "$tp_legacy" ]]; then
    echo "$tp_legacy" >&2
    report "legacy transferPay.module.css class references under Transfer Pay"
  fi
fi
if tp_styles=$(grep -rl "transferPay.module.css" src/pages/portfolio --include='*.tsx' --include='*.ts' 2>/dev/null || true); then
  if [[ -n "$tp_styles" ]]; then
    echo "$tp_styles" >&2
    report "transferPay.module.css import under src/pages/portfolio"
  fi
fi
tp_css=src/pages/portfolio/transferPay.module.css
if [[ -f "$tp_css" ]]; then
  report "transferPay.module.css must be deleted (Transfer Pay Dense migration)"
fi

# Accounts: Dense migration — no shadcn Table
accounts_table=$(grep -rl "@/components/ui/table" src/components/accounts --include='*.tsx' 2>/dev/null || true)
if [[ -n "$accounts_table" ]]; then
  echo "$accounts_table" >&2
  report "shadcn Table under src/components/accounts"
fi

# Positions Instance tab: Dense migration (Phase 1)
for f in InstanceTab.tsx InstanceOptionSubTable.tsx InstanceCoverageSubTable.tsx; do
  if grep -q "@/components/ui/table" "src/components/positions/$f" 2>/dev/null; then
    echo "src/components/positions/$f" >&2
    report "shadcn Table in src/components/positions/$f"
  fi
done

# Live: no legacy table module class references in TSX
live_legacy=$(grep -rE 'styles\.(numCell|tableWrap|openOrdersTable|groupHeader|sumRow|table|colGroup|pnlStacked|symbolCell|symbolFresh|lastBidAsk|quoteSpread)' \
  src/pages/market/live --include='*.tsx' 2>/dev/null || true)
if [[ -n "$live_legacy" ]]; then
  echo "$live_legacy" >&2
  report "legacy live.module.css table class references in src/pages/market/live"
fi

live_css=src/pages/market/live/live.module.css
if [[ -f "$live_css" ]]; then
  live_lines=$(wc -l < "$live_css")
  if [[ "$live_lines" -gt 120 ]]; then
    report "live.module.css line budget exceeded ($live_lines > 120)"
  fi
fi

# Model Analysis: Dense migration — no legacy table module class references
ma_legacy=$(grep -rE 'styles\.(compactTable|tableWrap|nestedTable|pnlPositive|pnlNegative|riskDefined|riskUnlimited|stressCollapsible|accountPill|summaryStrip|detailCell)' \
  src/pages/portfolio/modelAnalysis --include='*.tsx' 2>/dev/null || true)
if [[ -n "$ma_legacy" ]]; then
  echo "$ma_legacy" >&2
  report "legacy modelAnalysis.module.css class references in src/pages/portfolio/modelAnalysis"
fi

ma_css=src/pages/portfolio/modelAnalysis.module.css
if [[ -f "$ma_css" ]]; then
  ma_lines=$(wc -l < "$ma_css")
  if [[ "$ma_lines" -gt 80 ]]; then
    report "modelAnalysis.module.css line budget exceeded ($ma_lines > 80)"
  fi
fi

# Category tags: use DenseTag, not ledger stkPill* class strings in TSX
stk_tag_legacy=$(grep -rE 'stk(Pill|Cell)(Category|Symbol)Class' src --include='*.tsx' 2>/dev/null \
  | grep -v 'ledgerSharedClasses.ts' || true)
if [[ -n "$stk_tag_legacy" ]]; then
  echo "$stk_tag_legacy" >&2
  report "stkPill/stkCell Category/Symbol class strings in TSX (use DenseTag from data-display)"
fi

if [[ "$fail" -ne 0 ]]; then
  exit 1
fi

echo "check-legacy-css: OK"
