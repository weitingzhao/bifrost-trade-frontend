/** Design-system Fix Prompt specs — one per UI Design System section. */

export type PromptSpecId =
  | 'pnl'
  | 'entity'
  | 'option-category'
  | 'position-category'
  | 'status'
  | 'density'
  | 'surface'
  | 'full'

export interface PromptSpec {
  id: PromptSpecId
  title: string
  sectionId: string
  specMarkdown: string
}

export const PROMPT_SPECS: PromptSpec[] = [
  {
    id: 'pnl',
    title: 'PnL Semantics',
    sectionId: 'pnl-semantics',
    specMarkdown: `# 任务：PnL 语义色合规修复

## 设计规范
- 已实现盈利 → \`--color-profit\` / \`text-profit\` / \`pnlColorClass(v)\`
- 已实现亏损 → \`--color-loss\` / \`text-loss\`
- **未实现盈亏 (Unrealized) → 一律黄色** \`--color-unrealized\` / \`unrealizedPnlColorClass(v)\`，禁止红绿
- 0 / null → \`text-muted-foreground\`
- 合法入口：\`PnlCell\` / \`InlinePnl\` / \`pnlColorClass\` / \`unrealizedPnlColorClass\`（@/utils/dailyChange, @/components/data-display）
- 数值列：\`font-mono tabular-nums\` 或 \`denseTableNumCell\`

## 硬违规（必须修）
- 页面层 \`text-emerald-*\` / \`text-red-*\` / 内联红绿 hex 渲染 realized PnL
- unrealized 字段走 \`pnlColorClass\`（红绿）而非 yellow token
- \`pnl-positive\` / \`pnl-negative\` / 自建 PnL module 类

## 检测
\`\`\`bash
grep -rnE 'text-emerald-[0-9]|text-red-[0-9]|text-green-[0-9]' src/pages src/components --include='*.tsx' | grep -v data-display
grep -rn 'pnlPositive\\|pnl-positive\\|pnl-negative' src --include='*.tsx' --include='*.css'
\`\`\`

## 参考
UiDesignSystemPage §1 · Positions PnlCell · scripts/check-legacy-css.sh (RAW_PNL_PALETTE_BASELINE)`,
  },
  {
    id: 'entity',
    title: 'Entity — Stock / Option / Fixed Income / Cash-like',
    sectionId: 'entity-asset-class',
    specMarkdown: `# 任务：Entity 资产类视觉合规修复

## 设计规范（四类 Entity，与 Option Category / Position Category 分离）

| Entity | Token（现状 / 目标） | Table identity 列 | Tab / 图例 / 只读 label |
|--------|---------------------|-------------------|-------------------------|
| **Stock** | \`--color-entity-symbol\`（= primary） | \`DenseLinkButton variant="stock"\` 或 \`strong + text-entity-symbol\` | 同色文字，禁止 Tag pill 作主列 |
| **Option** | \`--color-entity-option\` | \`DenseLinkButton variant="option"\`（font-mono） | 合约字符串只用 Option entity，不用 Option Category tag |
| **Fixed Income** | 目标 \`--color-entity-fixed-income\`（待 token；图表暂用 amber） | 分组/tab 用 FI entity 色 | 不得用 Position Category 紫色 pill 表示 FI **资产类** |
| **Cash-like** | 目标 \`--color-entity-cash-like\`（待 token；图表暂用 violet） | 同上 | 不得与 Position Category 紫色混淆 |

**Placement 原则**：同一 token 色全站一致；表格主标识列用 Link/粗体文字，不用 \`DenseTag\` pill。

## 硬违规
- Stock 主列使用 \`DenseTag variant="symbol"\` pill（Ledger pill 模式若存在须与域内一致或改）
- Option 合约行用 Strategy/Instance/Category tag 替代 \`variant="option"\`
- FI/Cash-like tab 或图例用 Position Category 紫色 pill
- \`text-foreground\` / \`text-sky-*\` 覆盖 entity token

## 检测
- Live \`MarketStreamStkRow\` / Positions \`StocksTab\` / Ledger Symbol 列
- OptionsTab Contract 列 vs InstanceOptionSubTable
- Performance/Ledger FI、Cash-like tab 标签色

## 参考
UiDesignSystemPage §2 · StocksTab · MarketStreamStkRow · OptionsTab`,
  },
  {
    id: 'option-category',
    title: 'Option Category — Instance / Strategy / Opportunity / Structure',
    sectionId: 'option-category',
    specMarkdown: `# 任务：Option Category（策略域四概念）视觉合规修复

## 设计规范
Option Category 与 Entity 分离。四类概念：

| 概念 | Token（现状） | 合法原语 |
|------|--------------|---------|
| **Instance** | \`--color-entity-instance\` | \`DenseTag variant="instance"\` / \`DenseLinkButton variant="instance"\` |
| **Strategy** | \`--color-entity-strategy\` | \`DenseTag variant="strategy"\` / \`DenseLinkButton variant="strategy"\` |
| **Opportunity** | 待 \`--color-option-category-opportunity\` | 目标 DenseTag/Link variant（暂对齐 strategy 或文档化 gap 后扩展） |
| **Structure** | 待 \`--color-option-category-structure\` | 同上 |

- 表格 composite 单元格：Strategy + Instance 可 \`DenseTag\` + \`flex flex-wrap gap-1\`
- **期权 Contract 字符串属于 Option Entity**，不得用 Option Category tag 渲染整段合约

## 硬违规
- Contract 列用 \`DenseTag variant="symbol"\` 或 strategy/instance tag 代替 \`variant="option"\`
- Instance/Strategy 名称用裸 \`text-link\` / 页面本地 pill CSS
- 主表与子表 Strategy/Instance 形态不一致（LedgerStgInsCell vs InstanceTab）

## 检测重点文件
- src/pages/portfolio/ledger/LedgerStgInsCell.tsx
- src/pages/strategy/InstancesPage.tsx · InstancesGroupedTable
- src/pages/strategy/OpportunitiesPage.tsx · OpportunityFormModal
- src/pages/strategy/StructuresPage.tsx · StructuresTable
- src/components/positions/InstanceTab.tsx · LedgerStrategyGroup.tsx

## 参考
UiDesignSystemPage §3`,
  },
  {
    id: 'position-category',
    title: 'Position Category — watchlist / portfolio',
    sectionId: 'position-category',
    specMarkdown: `# 任务：Position Category 视觉合规修复

## 设计规范
Position Category 是**持仓分类标签**，与 Entity 资产类、Option Category 策略概念分离。

**两类固定 Position Category 标签名**：\`watchlist\`、\`portfolio\`（与 Fix Income、Tech、Watching 等用户自定义名**同视觉**）。

Token：\`--color-entity-category\`（purple outline pill）。

| 出现位置 | 原语 |
|----------|------|
| 表格 Category 列 | \`DenseTag variant="category" size="cell"\` |
| 表格分组行 | \`GroupHeaderRow variant="category"\` — \`text-entity-category\` + \`bg-secondary\` 色带 + 上下 \`border\`，与下方 Symbol 行分割；**不用** pill 或标签后横线 |
| 页面筛选（筛 category 值） | \`DenseTagButton variant="category"\` + \`denseEntityFilterChipClass('category', active)\` — 未选中灰色，选中才用 entity 色 |

**非 Position Category**：Host/Secondary、时间范围、状态 → 中性 pill 或 \`SegmentControl\`，不得用 entity-category 紫色。

## 硬违规
- category 名（含 watchlist/portfolio）用 gray \`liveFilterPill\` / primary active pill
- 分组头用 DenseTag pill 套 category 名（应 \`GroupHeaderRow\` 纯文本 + 分割线）
- 把 Fix Income 等**资产 bucket** 误标为 Position Category 紫色（FI 属于 Entity）

## 检测重点
- src/pages/market/live/FilterPillBar.tsx
- src/pages/market/live/WatchingStocksPane.tsx · MarketStreamsTable GroupHeaderRow
- src/pages/portfolio/ledger/LedgerStkTable.tsx category 列
- src/pages/research/watchlist/** category 列

## 参考
UiDesignSystemPage §4 · FilterPillBar · GroupHeaderRow in DenseTable.tsx`,
  },
  {
    id: 'status',
    title: 'Status & Source Tags',
    sectionId: 'status-tags',
    specMarkdown: `# 任务：状态与来源标签合规修复

## 设计规范
- 通用状态 → \`DenseTag\`（success/warning/danger/info/neutral，outline pill）
- 执行来源 → \`ExecSourceBadge\`（flex/tws/journal/manual）
- 禁止手写 rounded-full 状态色、shadcn Badge 渲染业务状态

## 检测
\`\`\`bash
grep -rn 'sourceBadge\\|source-badge' src --include='*.tsx'
grep -rnE 'rounded-full[^"]*border[^"]*text-(red|green|emerald)-' src/pages src/components --include='*.tsx' | grep -v data-display
\`\`\`

## 参考
UiDesignSystemPage §5 · ExecSourceBadge`,
  },
  {
    id: 'density',
    title: 'Density & Typography',
    sectionId: 'density',
    specMarkdown: `# 任务：表格密度与排版合规修复

## 设计规范
- 数据表 → \`DenseDataTable\` 家族（禁止 shadcn Table / 裸 table module CSS）
- 数值列 → \`denseTableNumCell\`
- 身份列 Symbol/Contract/Strategy/Instance → \`denseTableEntityCell\` + wrap，禁止 \`truncate\` / \`line-clamp\` / identity 列上的 \`detailCellClip\`
- 行操作 → \`IconActionButton\`；危险确认 → ConfirmDialog

## 检测
\`\`\`bash
grep -rln '@/components/ui/table' src/pages src/components --include='*.tsx'
grep -rnE 'truncate|line-clamp' src/pages src/components --include='*.tsx' | grep -v data-display
grep -rn 'window\\.confirm\\|window\\.alert' src --include='*.tsx'
\`\`\`

## 参考
UiDesignSystemPage §6 · StocksTab · OptionsTab`,
  },
  {
    id: 'surface',
    title: 'Surface Layers',
    sectionId: 'surfaces',
    specMarkdown: `# 任务：页面外壳与表面层级合规修复

## 设计规范
- 三层：Canvas \`bg-card\` (PageShell) → Elevated \`bg-secondary\` / Card elevated → Inset \`bg-background\`
- 业务页必须 \`PageShell\` + \`PageHeader\`，禁止手写页面级 \`<h1>\`
- 禁止 Legacy：\`.card\`、\`.process-section\`、\`.legacy-monitoring-shell\`

## 检测
- 遍历 \`*Page.tsx\` 缺 PageShell
- \`grep -rn '<h1' src/pages\`
- canvas 上叠同色 \`bg-card\` 块

## 参考
UiDesignSystemPage §7`,
  },
  {
    id: 'full',
    title: 'Full Design System (8 dimensions)',
    sectionId: 'compliance',
    specMarkdown: `# 任务：Dense UI 全量合规修复（8 维）

在 scope 内依次检查并**直接修复**：

1. **PnL** — profit/loss/unrealized 语义色与 accessor
2. **Entity** — Stock/Option/FI/Cash-like 四类资产；identity 列不用 Tag pill
3. **Option Category** — Instance/Strategy/Opportunity/Structure；Contract 仍用 Option entity
4. **Position Category** — watchlist/portfolio 固定标签 + 用户自定义名；紫色 Tag 三处一致
5. **Status & Source** — DenseTag / ExecSourceBadge
6. **Density** — DenseDataTable、identity 列不换行截断
7. **Surfaces** — PageShell 三层画布
8. **Token 治理** — 无页面内联 hex；新色先进 index.css

各维细节见 UiDesignSystemPage §1–§8 与 docs/DENSE_UI.md。优先修硬违规；data-display 原语层仅在被 spec 要求扩展 variant 时修改。`,
  },
]

export function getPromptSpec(id: PromptSpecId): PromptSpec {
  const spec = PROMPT_SPECS.find(s => s.id === id)
  if (!spec) throw new Error(`Unknown prompt spec: ${id}`)
  return spec
}

export const PROMPT_SPEC_BY_SECTION: Record<string, PromptSpecId> = {
  'pnl-semantics': 'pnl',
  'entity-asset-class': 'entity',
  'option-category': 'option-category',
  'position-category': 'position-category',
  'status-tags': 'status',
  density: 'density',
  surfaces: 'surface',
  compliance: 'full',
}
