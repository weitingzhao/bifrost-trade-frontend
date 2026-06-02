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

# Stock Screener: Dense migration — no module CSS
if ss_legacy=$(grep -rE 'styles\.(ssTechRow|ssFundRow|ssStackCol|ssCard|ssChip|ssGroupHeader|ssFilterBadge)' \
  src/pages/research/stockScreener --include='*.tsx' --include='*.ts' 2>/dev/null || true); then
  if [[ -n "$ss_legacy" ]]; then
    echo "$ss_legacy" >&2
    report "legacy stock-screener.module.css class references under Stock Screener"
  fi
fi
if ss_styles=$(grep -rl "stock-screener.module.css" src/pages/research --include='*.tsx' --include='*.ts' 2>/dev/null || true); then
  if [[ -n "$ss_styles" ]]; then
    echo "$ss_styles" >&2
    report "stock-screener.module.css import under src/pages/research"
  fi
fi
ss_css=src/pages/research/stockScreener/stock-screener.module.css
if [[ -f "$ss_css" ]]; then
  report "stock-screener.module.css must be deleted (Stock Screener Dense migration)"
fi
if grep -q "@/components/ui/table" src/pages/research/stockScreener/ReadinessResultsTable.tsx 2>/dev/null; then
  report "shadcn Table in ReadinessResultsTable.tsx (use DenseDataTable)"
fi

# Option Screener: Dense migration — no raw HTML tables
if os_raw_table=$(grep -rE '<table[\s>]' src/pages/research/optionScreener --include='*.tsx' 2>/dev/null || true); then
  if [[ -n "$os_raw_table" ]]; then
    echo "$os_raw_table" >&2
    report "raw HTML table under src/pages/research/optionScreener (use DenseDataTable)"
  fi
fi
if os_icon_legacy=$(grep -rE 'opacity-40 hover:opacity-100' \
  src/pages/research/optionScreener src/pages/research/ScreenerPage.tsx --include='*.tsx' 2>/dev/null || true); then
  if [[ -n "$os_icon_legacy" ]]; then
    echo "$os_icon_legacy" >&2
    report "hand-rolled icon row buttons under Option Screener (use IconActionButton)"
  fi
fi
if os_risk_legacy=$(grep -rE 'bg-yellow-100|bg-red-100' src/pages/research/optionScreener --include='*.tsx' 2>/dev/null || true); then
  if [[ -n "$os_risk_legacy" ]]; then
    echo "$os_risk_legacy" >&2
    report "legacy risk pill colors under Option Screener (use DenseTag)"
  fi
fi

# Stock Watchlist: Dense migration — no module CSS or shadcn Table
wl_css=src/pages/research/watchlist/watchlist.module.css
if [[ -f "$wl_css" ]]; then
  report "watchlist.module.css must be deleted (Stock Watchlist Dense migration)"
fi
if wl_styles=$(grep -rl "watchlist.module.css" src/pages/research/watchlist --include='*.tsx' --include='*.ts' 2>/dev/null || true); then
  if [[ -n "$wl_styles" ]]; then
    echo "$wl_styles" >&2
    report "watchlist.module.css import under src/pages/research/watchlist"
  fi
fi
if wl_table=$(grep -rl "@/components/ui/table" src/pages/research/watchlist --include='*.tsx' 2>/dev/null || true); then
  if [[ -n "$wl_table" ]]; then
    echo "$wl_table" >&2
    report "shadcn Table under src/pages/research/watchlist (use DenseDataTable)"
  fi
fi
if wl_danger=$(grep -rl "dangerGhostBtnClass" src/pages/research/watchlist --include='*.tsx' 2>/dev/null || true); then
  if [[ -n "$wl_danger" ]]; then
    echo "$wl_danger" >&2
    report "dangerGhostBtnClass under watchlist (use IconActionButton tone=danger)"
  fi
fi

# Option Discovery: Dense migration — no detail module CSS or shadcn Table
od_detail_css=src/components/optionDiscovery/optionContractDetail.module.css
if [[ -f "$od_detail_css" ]]; then
  report "optionContractDetail.module.css must be deleted (Option Discovery Dense migration)"
fi
if od_detail_import=$(grep -rl "optionContractDetail.module.css" src/components/optionDiscovery --include='*.tsx' --include='*.ts' 2>/dev/null || true); then
  if [[ -n "$od_detail_import" ]]; then
    echo "$od_detail_import" >&2
    report "optionContractDetail.module.css import under src/components/optionDiscovery"
  fi
fi
if od_table=$(grep -rl "@/components/ui/table" src/components/optionDiscovery --include='*.tsx' 2>/dev/null || true); then
  if [[ -n "$od_table" ]]; then
    echo "$od_table" >&2
    report "shadcn Table under src/components/optionDiscovery (use DenseDataTable)"
  fi
fi
if od_raw_table=$(grep -rE '<table' src/components/optionDiscovery --include='*.tsx' 2>/dev/null || true); then
  if [[ -n "$od_raw_table" ]]; then
    echo "$od_raw_table" >&2
    report "raw <table under src/components/optionDiscovery (use DenseDataTable family)"
  fi
fi
if od_legacy_strings=$(grep -rE 'dangerTextBtnClass|od-pnl-pos|od-scenario-table' src/components/optionDiscovery --include='*.tsx' 2>/dev/null || true); then
  if [[ -n "$od_legacy_strings" ]]; then
    echo "$od_legacy_strings" >&2
    report "legacy option discovery class strings (use Dense UI primitives)"
  fi
fi

# IV & Greeks: Dense migration — no module CSS or shadcn Table
if greeks_module_css=$(find src/pages/research/greeks -name '*.module.css' 2>/dev/null || true); then
  if [[ -n "$greeks_module_css" ]]; then
    echo "$greeks_module_css" >&2
    report "*.module.css under src/pages/research/greeks (use greeksUi tokens + DenseDataTable)"
  fi
fi
if greeks_table=$(grep -rl "@/components/ui/table" src/pages/research/greeks --include='*.tsx' 2>/dev/null || true); then
  if [[ -n "$greeks_table" ]]; then
    echo "$greeks_table" >&2
    report "shadcn Table under src/pages/research/greeks (use DenseDataTable)"
  fi
fi
if greeks_raw_table=$(grep -rE '<table' src/pages/research/greeks --include='*.tsx' 2>/dev/null || true); then
  if [[ -n "$greeks_raw_table" ]]; then
    echo "$greeks_raw_table" >&2
    report "raw <table under src/pages/research/greeks (use DenseDataTable family)"
  fi
fi
if greeks_legacy_strings=$(grep -rE 'greeks-table__|greeks-calc-tooltip__|option-greeks-page__' src/pages/research/greeks --include='*.tsx' --include='*.ts' 2>/dev/null || true); then
  if [[ -n "$greeks_legacy_strings" ]]; then
    echo "$greeks_legacy_strings" >&2
    report "legacy greeks class strings under src/pages/research/greeks"
  fi
fi

# Strategy Instances list: Dense migration — no table/filter module CSS
for f in instancesTable.module.css instancesFilters.module.css; do
  if [[ -f "src/components/strategy/instances/$f" ]]; then
    report "$f must be deleted (Strategy Instances Dense migration)"
  fi
done
if inst_table_css=$(grep -rl 'instancesTable\.module\.css' src/components/strategy --include='*.tsx' 2>/dev/null || true); then
  if [[ -n "$inst_table_css" ]]; then
    echo "$inst_table_css" >&2
    report "instancesTable.module.css import under src/components/strategy"
  fi
fi
if inst_filters_css=$(grep -rl 'instancesFilters\.module\.css' src/components/strategy --include='*.tsx' 2>/dev/null || true); then
  if [[ -n "$inst_filters_css" ]]; then
    echo "$inst_filters_css" >&2
    report "instancesFilters.module.css import under src/components/strategy"
  fi
fi
if inst_raw_table=$(grep -rE '<table' src/components/strategy/InstancesGroupedTable.tsx 2>/dev/null || true); then
  if [[ -n "$inst_raw_table" ]]; then
    echo "$inst_raw_table" >&2
    report "raw <table in InstancesGroupedTable (use DenseDataTable family)"
  fi
fi
if inst_danger=$(grep -rE 'dangerGhostBtnClass' src/components/strategy/instances src/components/strategy/InstancesGroupedTable.tsx --include='*.tsx' 2>/dev/null || true); then
  if [[ -n "$inst_danger" ]]; then
    echo "$inst_danger" >&2
    report "dangerGhostBtnClass under strategy instances list (use IconActionButton tone=danger)"
  fi
fi
if inst_legacy_strings=$(grep -rE 'strategy-instances-|instance-list-symbol-toolbar' src/components/strategy src/pages/strategy --include='*.tsx' --include='*.ts' 2>/dev/null || true); then
  if [[ -n "$inst_legacy_strings" ]]; then
    echo "$inst_legacy_strings" >&2
    report "legacy strategy instances class strings"
  fi
fi

# Win Rate: Dense migration (Phase 4.10)
if [[ -f src/components/strategy/winRate/winRate.module.css ]]; then
  report "winRate.module.css must not exist (use winRateUi.ts tokens)"
fi
if winrate_css=$(grep -rl 'winRate\.module\.css' src/components/strategy/winRate --include='*.tsx' --include='*.ts' 2>/dev/null || true); then
  if [[ -n "$winrate_css" ]]; then
    echo "$winrate_css" >&2
    report "winRate.module.css import under src/components/strategy/winRate"
  fi
fi
if winrate_pnl=$(grep -rE 'kpiValuePositive|kpiValueNegative|pnl-positive|pnl-negative' src/components/strategy/winRate --include='*.tsx' --include='*.ts' 2>/dev/null || true); then
  if [[ -n "$winrate_pnl" ]]; then
    echo "$winrate_pnl" >&2
    report "legacy PnL class strings under src/components/strategy/winRate (use profitLossToneClass / winRateWinPctClass)"
  fi
fi
if winrate_legacy=$(grep -rE 'strategy-win-rate-' src/components/strategy/winRate src/pages/strategy --include='*.tsx' --include='*.ts' 2>/dev/null || true); then
  if [[ -n "$winrate_legacy" ]]; then
    echo "$winrate_legacy" >&2
    report "legacy strategy-win-rate- class strings"
  fi
fi

# Structures: Dense migration (Phase 4.11)
for f in \
  src/pages/strategy/StructuresPage.tsx \
  src/components/strategy/StructuresTable.tsx \
  src/components/strategy/StrategyHistorySection.tsx \
  src/components/strategy/StructureFormSheet.tsx
do
  if [[ -f "$f" ]] && grep -q '@/components/ui/table' "$f" 2>/dev/null; then
    echo "$f" >&2
    report "shadcn Table in $f (use DenseDataTable)"
  fi
done
if struct_danger=$(grep -rE 'dangerTextBtnClass' src/components/strategy/StructureFormSheet.tsx --include='*.tsx' 2>/dev/null || true); then
  if [[ -n "$struct_danger" ]]; then
    echo "$struct_danger" >&2
    report "dangerTextBtnClass in StructureFormSheet (use IconActionButton tone=danger)"
  fi
fi
if struct_legacy=$(grep -rE 'structure-active-filter-|structure-sheet-|structure-wizard-' src/pages/strategy/StructuresPage.tsx src/components/strategy/StructuresTable.tsx src/components/strategy/StrategyHistorySection.tsx src/components/strategy/StructureFormSheet.tsx src/components/strategy/structures --include='*.tsx' --include='*.ts' 2>/dev/null || true); then
  if [[ -n "$struct_legacy" ]]; then
    echo "$struct_legacy" >&2
    report "legacy structure-* class strings under strategy structures domain"
  fi
fi

# Opportunities: Dense migration (Phase 4.12)
for f in \
  src/pages/strategy/OpportunitiesPage.tsx \
  src/components/strategy/OpportunitiesTable.tsx \
  src/components/strategy/OpportunityFormModal.tsx
do
  if [[ -f "$f" ]] && grep -q '@/components/ui/table' "$f" 2>/dev/null; then
    echo "$f" >&2
    report "shadcn Table in $f (use DenseDataTable)"
  fi
done
if opp_danger=$(grep -rE 'dangerTextBtnClass' src/components/strategy/OpportunityFormModal.tsx --include='*.tsx' 2>/dev/null || true); then
  if [[ -n "$opp_danger" ]]; then
    echo "$opp_danger" >&2
    report "dangerTextBtnClass in OpportunityFormModal (use IconActionButton tone=danger)"
  fi
fi
if opp_legacy=$(grep -rE 'opp-table-|opp-form-|opp-list-|structure-active-filter-' src/pages/strategy/OpportunitiesPage.tsx src/components/strategy/OpportunitiesTable.tsx src/components/strategy/OpportunityFormModal.tsx src/components/strategy/opportunities --include='*.tsx' --include='*.ts' 2>/dev/null || true); then
  if [[ -n "$opp_legacy" ]]; then
    echo "$opp_legacy" >&2
    report "legacy opp-* / structure-active-filter-* class strings under strategy opportunities domain"
  fi
fi

# Gates: Dense migration (Phase 4.13)
for f in \
  src/pages/strategy/GatesPage.tsx \
  src/components/strategy/gates/GatesTable.tsx \
  src/components/strategy/gates/GateSafetyFormSheet.tsx
do
  if [[ -f "$f" ]] && grep -q '@/components/ui/table' "$f" 2>/dev/null; then
    echo "$f" >&2
    report "shadcn Table in $f (use DenseDataTable)"
  fi
done
if gates_danger=$(grep -rE 'dangerGhostBtnClass|dangerTextBtnClass' src/pages/strategy/GatesPage.tsx src/components/strategy/gates --include='*.tsx' --include='*.ts' 2>/dev/null || true); then
  if [[ -n "$gates_danger" ]]; then
    echo "$gates_danger" >&2
    report "dangerGhostBtnClass/dangerTextBtnClass under strategy gates domain (use IconActionButton tone=danger)"
  fi
fi
if gates_legacy=$(grep -rE 'gates-form-|gate-safety-table-|strategy-gates-' src/pages/strategy/GatesPage.tsx src/components/strategy/gates --include='*.tsx' --include='*.ts' 2>/dev/null || true); then
  if [[ -n "$gates_legacy" ]]; then
    echo "$gates_legacy" >&2
    report "legacy gates-* class strings under strategy gates domain"
  fi
fi

# Allocations: Dense migration (Phase 4.14)
for f in \
  src/pages/strategy/AllocationsPage.tsx \
  src/components/strategy/AllocationsTable.tsx \
  src/components/strategy/AllocationFormModal.tsx
do
  if [[ -f "$f" ]] && grep -q '@/components/ui/table' "$f" 2>/dev/null; then
    echo "$f" >&2
    report "shadcn Table in $f (use DenseDataTable)"
  fi
done
if alloc_legacy=$(grep -rE 'gates-form-|data-table|btn-set-active|btn-manage' src/pages/strategy/AllocationsPage.tsx src/components/strategy/AllocationsTable.tsx src/components/strategy/AllocationFormModal.tsx src/components/strategy/allocations --include='*.tsx' --include='*.ts' 2>/dev/null || true); then
  if [[ -n "$alloc_legacy" ]]; then
    echo "$alloc_legacy" >&2
    report "legacy gates-form- / data-table / btn-set-active / btn-manage strings under strategy allocations domain"
  fi
fi

# Option Category: Dense migration (Phase 4.15)
for f in \
  src/pages/strategy/OptionCategoryPage.tsx \
  src/pages/strategy/optionCategory/OptionCategoryLegsSection.tsx \
  src/pages/strategy/optionCategory/OptionCategoryMetaTable.tsx
do
  if [[ -f "$f" ]] && grep -q '@/components/ui/table' "$f" 2>/dev/null; then
    echo "$f" >&2
    report "shadcn Table in $f (use NestedDenseTable)"
  fi
done
if otc_danger=$(grep -rE 'dangerTextBtnClass' src/pages/strategy/optionCategory src/pages/strategy/OptionCategoryPage.tsx --include='*.tsx' 2>/dev/null || true); then
  if [[ -n "$otc_danger" ]]; then
    echo "$otc_danger" >&2
    report "dangerTextBtnClass under option category (use IconActionButton tone=danger)"
  fi
fi
if otc_legacy=$(grep -rE 'otc-|TemplateMetaEditor' src/pages/strategy/optionCategory src/pages/strategy/OptionCategoryPage.tsx --include='*.tsx' --include='*.ts' 2>/dev/null || true); then
  if [[ -n "$otc_legacy" ]]; then
    echo "$otc_legacy" >&2
    report "legacy otc-* or TemplateMetaEditor under option category domain"
  fi
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

# Settings API Health: Dense migration (Phase 4.16)
if [[ -f src/pages/settings/apiHealth/apiHealthSections.tsx ]]; then
  report "apiHealthSections.tsx must be deleted (split into apiHealth/* components)"
fi
if api_health_raw_table=$(grep -rE '<table' src/pages/settings/apiHealth --include='*.tsx' 2>/dev/null || true); then
  if [[ -n "$api_health_raw_table" ]]; then
    echo "$api_health_raw_table" >&2
    report "raw <table under src/pages/settings/apiHealth (use DenseDataTable; ServiceTopologyOverview SVG exempt)"
  fi
fi
if api_health_ui_table=$(grep -rl '@/components/ui/table' src/pages/settings/apiHealth --include='*.tsx' 2>/dev/null || true); then
  if [[ -n "$api_health_ui_table" ]]; then
    echo "$api_health_ui_table" >&2
    report "shadcn Table under src/pages/settings/apiHealth (use DenseDataTable)"
  fi
fi

# Operations Celery: Dense migration (Phase 4.20)
if celery_layout_classes=$(grep -rl 'celeryLayoutClasses' src/pages/operations/celery --include='*.tsx' --include='*.ts' 2>/dev/null || true); then
  if [[ -n "$celery_layout_classes" ]]; then
    echo "$celery_layout_classes" >&2
    report "celeryLayoutClasses imports (merged into celeryUi.ts)"
  fi
fi
if celery_ui_table=$(grep -rl '@/components/ui/table' src/pages/operations/celery --include='*.tsx' 2>/dev/null || true); then
  if [[ -n "$celery_ui_table" ]]; then
    echo "$celery_ui_table" >&2
    report "shadcn Table under src/pages/operations/celery (use DenseDataTable)"
  fi
fi

# Settings Socket: Dense migration (Phase 4.18)
if socket_ui_table=$(grep -rl '@/components/ui/table' src/pages/settings/socket --include='*.tsx' 2>/dev/null || true); then
  if [[ -n "$socket_ui_table" ]]; then
    echo "$socket_ui_table" >&2
    report "shadcn Table under src/pages/settings/socket (use DenseDataTable)"
  fi
fi

# Settings Daemon: Dense migration (Phase 4.19)
if daemon_ui_table=$(grep -rl '@/components/ui/table' \
  src/pages/settings/DaemonStatusPage.tsx \
  src/pages/settings/daemon \
  --include='*.tsx' 2>/dev/null || true); then
  if [[ -n "$daemon_ui_table" ]]; then
    echo "$daemon_ui_table" >&2
    report "shadcn Table under DaemonStatusPage or settings/daemon (use DenseDataTable)"
  fi
fi
if daemon_pnl_class=$(grep -rE '\bpnlClass\b' src/pages/settings/daemon --include='*.tsx' --include='*.ts' 2>/dev/null || true); then
  if [[ -n "$daemon_pnl_class" ]]; then
    echo "$daemon_pnl_class" >&2
    report "pnlClass under settings/daemon (use pnlColorClass / daemonLampTextClass)"
  fi
fi
if daemon_inline_lamp=$(grep -rE "text-green-600|text-red-500|text-yellow-500" src/pages/settings/daemon \
  --include='*.tsx' 2>/dev/null | grep -v daemonUi.ts || true); then
  if [[ -n "$daemon_inline_lamp" ]]; then
    echo "$daemon_inline_lamp" >&2
    report "inline lamp colors under settings/daemon (use daemonLampTextClass)"
  fi
fi
if daemon_legacy_strings=$(grep -rE 'daemon-group-|table-operations|ib-connection-table' \
  src/pages/settings/daemon src/pages/settings/DaemonStatusPage.tsx --include='*.tsx' 2>/dev/null || true); then
  if [[ -n "$daemon_legacy_strings" ]]; then
    echo "$daemon_legacy_strings" >&2
    report "legacy daemon CSS class strings under settings/daemon paths"
  fi
fi

if [[ "$fail" -ne 0 ]]; then
  exit 1
fi

echo "check-legacy-css: OK"
