/**
 * LLM Agent QA prompts — one per UI Design System section.
 * Each prompt is self-contained: spec definition + detection steps + report format.
 * Rendered as copy buttons on /settings/ui-design-system.
 */

const CONTEXT = `你是 bifrost-trade-frontend（React 18 + Vite + Tailwind CSS v4 + shadcn/ui）的 UI 合规 QA Agent。
本项目执行 Dense UI 设计系统。权威规范来源：
- docs/DENSE_UI.md（完整规范 + Business semantic colors 对照表）
- .cursor/rules/dense-ui-system.mdc（强制映射表，alwaysApply）
- src/index.css（全部 design token：:root light + .dark + @theme inline 三处成对定义）
- 活体契约页：src/pages/settings/UiDesignSystemPage.tsx（/settings/ui-design-system）
审计范围：src/pages/** 与 src/components/**（src/components/data-display/** 是原语层本体，豁免）。`

const REPORT_FORMAT = `## 输出要求
1. 审计报告按表格列出：文件:行号 · 违规类型 · 现状代码片段 → 建议修复（替换为哪个 token / 原语 / accessor）
2. 明确区分「硬违规」（违反强制映射，必须修）与「豁免项」（命中例外清单，说明理由）
3. 给出修复优先级排序（按页面流量/违规密度）与预估改动量
4. 先输出完整审计报告，未经确认不要直接修改任何代码
5. 若后续执行修复，完成后必须全部通过：npm run lint && npm run build && npm run check:legacy-css`

const EXEMPTIONS = `## 例外豁免清单（命中则标记为豁免，不算违规）
- src/components/data-display/**（原语层本体，颜色决策收口处）
- 图表几何模块 CSS：PositionsChartsSection.module.css、DonutChart.module.css、riskProfile.module.css、discoveryCharts
- 图表调色盘工具：src/lib/chartTokens.ts、src/utils/donutChart.ts、src/utils/positionsCharts.ts（SVG 填色场景）
- 动态计算的内联 style（宽高/定位/百分比），但内联 style 写死颜色 hex 不豁免`

export const QA_PROMPT_PNL = `${CONTEXT}

# QA 任务 1：PnL 语义色合规审计

## 设计规范（权威定义）
- 已实现盈利 → 绿色：token --color-profit（utility: text-profit）
- 已实现亏损 → 红色：token --color-loss（utility: text-loss）
- 未实现盈亏（Unrealized）→ **一律黄色**：token --color-unrealized（utility: text-unrealized），绝对禁止用红绿渲染未实现盈亏
- 0 / null / 缺失 → text-muted-foreground
- 页面层唯一合法入口（accessor）：
  - pnlColorClass(v) / unrealizedPnlColorClass(v)（来自 @/utils/dailyChange）
  - <PnlCell dollar pct /> / <InlinePnl value>（来自 @/components/data-display）
- 数值渲染必须 font-mono tabular-nums（PnlCell 已内置）

## 检测步骤
1. 扫描原生色板类残留：
   grep -rnE 'text-emerald-[0-9]|text-red-[0-9]|text-green-[0-9]' src/pages src/components --include='*.tsx' --include='*.ts' | grep -v 'src/components/data-display'
   （注意 scripts/check-legacy-css.sh 中的棘轮基线 RAW_PNL_PALETTE_BASELINE，当前 64；每修一处都应让计数下降，修复后同步下调基线值）
2. 扫描内联红绿 hex：grep -rnE '#(16a34a|22c55e|dc2626|ef4444|059669|34d399|f87171|4ade80)' src/pages src/components --include='*.tsx'
3. 语义违规（最重要）：搜索 unrealized / unrl / unrealizedPnl 相关字段的渲染处，确认全部走 unrealizedPnlColorClass（黄色）而非 pnlColorClass（红绿）
4. 自建 PnL 类残留：grep -rn 'pnlPositive\\|pnl-positive\\|pnl-negative' src --include='*.tsx' --include='*.css'
5. 检查 PnL 数值列是否缺 font-mono tabular-nums（手写 text-right 而未用 denseTableNumCell / PnlCell）

${EXEMPTIONS}

${REPORT_FORMAT}`

export const QA_PROMPT_ENTITY = `${CONTEXT}

# QA 任务 2：实体识别色（Entity Identity）合规审计

## 设计规范（权威定义）
每个业务实体在任何页面必须用同一颜色 + 同一原语渲染：
| 实体 | Token | 合法原语 |
|------|-------|---------|
| Symbol（股票代码） | --color-entity-symbol（=primary） | DenseTag variant="symbol"（非链接）/ DenseLinkButton variant="stock"（可点击） |
| Option 合约 | --color-entity-option（sky 系） | DenseLinkButton variant="option"（自带 font-mono） |
| Strategy 名称 | --color-entity-strategy（indigo 系） | DenseTag variant="strategy" / DenseLinkButton variant="strategy" |
| Instance ID | --color-entity-instance（teal 系） | DenseTag variant="instance"（自带 font-mono）/ DenseLinkButton variant="instance" |
| 持仓类别 | --color-entity-category（purple 系） | DenseTag variant="category" |
原语来源：@/components/data-display

## 硬违规判定（满足任一条即必须修，不能因「已用 Dense* 原语」而放过）
- 可点击股票代码未用 DenseLinkButton variant="stock"（禁止仅靠 default + className 覆盖颜色）
- 期权合约（含 strike/right/expiry 的合约字符串）未用 DenseLinkButton variant="option"（禁止 DenseTag/DenseTagButton variant="symbol" 渲染整段合约）
- DenseLinkButton / DenseTag 的 className 含 text-foreground、text-primary、text-sky-* 等，覆盖实体 token 色（活跃态可用 underline/ring，不得改实体色）
- 同一域内主表与子表对同一实体形态不一致（例：OptionsTab Contract 为 option 链接，Instance 展开子表却为 symbol pill）

## 检测步骤
1. 原生 sky / 自建 pill 残留：
   grep -rnE 'text-sky-[0-9]' src/pages src/components --include='*.tsx' | grep -v data-display
   grep -rn 'stkPillSymbolClass\\|stkPillCategoryClass' src --include='*.tsx'（仅 ledgerSharedClasses.ts 定义处豁免）
2. Symbol 链接 variant 与颜色覆盖（最重要）：
   grep -rn 'DenseLinkButton' src/pages src/components --include='*.tsx' | grep -v data-display
   逐文件核对：渲染 ticker/股票代码处是否 variant="stock"；同行或相邻 className 是否含 text-foreground|text-primary（覆盖 entity-symbol）
   重点文件：src/pages/research/stockScreener/ReadinessResultsTable.tsx、src/components/positions/StocksTab.tsx、InstanceCoverageSubTable.tsx、CoveragePoolTable.tsx
3. Option 合约语义误用（最重要）：
   grep -rnE 'DenseTag(Button)?' src/pages src/components --include='*.tsx' | grep -E "variant=.symbol.|variant='symbol'" | grep -v data-display
   人工对照表头/列名 Contract、Option、合约：若 cell 内容是期权合约字符串，必须改为 DenseLinkButton variant="option" + contractButtonLabel（参考 OptionsTab.tsx、InstanceOptionSubTable.tsx）
   grep 合约列旁的 rightLabel/strike 手写拼接且未走 contractButtonLabel 的，列入修复清单
4. Strategy / Instance：遍历 src/components/strategy/**、src/pages/strategy/**、positions InstanceTab、ledger 等，检查 strategy 名称 / instance ID 是否用 DenseTag/DenseLinkButton 对应变体，禁止 oppPrimary/裸 text-link 替代 entity-strategy/instance（InstanceTab 主行 opportunity 列需单独标注）
5. 自定义链接 pill CSS：各 *.module.css 中 symbol/option 链接样式残留；instancePanel.subContractBtn 等未使用但含 text-sky 的 bundle 标记为死代码清理项
6. 域内一致性（必做，不只跨 4 页）：
   - Positions：OptionsTab Contract 列 vs InstanceOptionSubTable Contract 列（必须同为 variant="option" 链接）
   - Positions：StocksTab Symbol vs InstanceCoverageSubTable Symbol（可点击时必须同为 variant="stock" 链接）
   - Research：ReadinessResultsTable Symbol vs Positions StocksTab Symbol
   - 再加 Trade Ledger、Live、Option Discovery 共 4 页做跨域 Symbol/Option 比对
7. 参考实现（修复时对齐）：StocksTab SymbolLinkButton variant="stock"；OptionsTab DenseLinkButton variant="option"；契约页 UiDesignSystemPage §2 Entity Identity 样例

${EXEMPTIONS}

${REPORT_FORMAT}`

export const QA_PROMPT_STATUS = `${CONTEXT}

# QA 任务 3：状态与来源标签合规审计

## 设计规范（权威定义）
- 通用状态一律 DenseTag（outline pill：border + text，无填充背景）：
  success（emerald）/ warning（amber）/ danger（red）/ info（sky）/ neutral（muted）
- 执行来源一律 <ExecSourceBadge source>：flex_trades→flex(emerald)、tws_event/tws_client→tws(sky)、journal_closed→journal(amber)、manual(violet)、其他→muted
- tone 映射用 denseTagVariantFromTone / denseTagVariantFromExecSource，不得自写 if-else 颜色分支
- 原语来源：@/components/data-display

## 检测步骤
1. 手写状态 pill：grep -rnE 'rounded-full[^"]*border[^"]*text-(red|green|emerald|amber|yellow|sky)-' src/pages src/components --include='*.tsx' | grep -v data-display
2. 执行来源自建 Badge：grep -rn 'sourceBadge\\|source-badge' src --include='*.tsx' --include='*.css'；并检查渲染 exec source / source 字段处是否绕过 ExecSourceBadge
3. shadcn <Badge> 用于业务状态的场景：grep -rln '@/components/ui/badge' src/pages src/components，逐个判断是否应替换为 DenseTag（页面元信息类 Badge 可豁免，业务状态必须 DenseTag）
4. 填充式背景状态色（bg-red-100 / bg-yellow-100 等水洗背景）：grep -rnE 'bg-(red|yellow|green|amber)-[0-9]+' src/pages src/components --include='*.tsx' | grep -v data-display

${EXEMPTIONS}

${REPORT_FORMAT}`

export const QA_PROMPT_DENSITY = `${CONTEXT}

# QA 任务 4：表格密度与排版合规审计

## 设计规范（权威定义）
- 数据表一律 DenseDataTable 家族（DenseTableHeader/Body/HeadRow/Row/Head/Cell + GroupHeaderRow / NestedDenseTable / DenseTableDetailRow 等），来自 @/components/data-display
- 禁止：shadcn Table（@/components/ui/table）、裸 <table>、新建表格 module CSS
- 排版数值：表格主体 --text-dense（13px）、meta --text-dense-meta（11px）、单元格 padding --table-cell-py/px（6×8px）、table-fixed 防展开抖动
- 数值列：denseTableNumCell（text-right font-mono tabular-nums）
- 行内操作按钮：IconActionButton（tone: default/danger/warn）；危险确认用 ConfirmDialog，禁止 window.confirm/alert
- 展开行：ExpandToggleCell + DenseTableDetailRow + colgroup 对齐

## 身份列完整显示（Identity columns — 硬违规）
以下业务字段在表格/Grid 中**禁止省略号**（truncate / text-ellipsis / line-clamp-*）；宁可换行增高行高，也要让用户看到完整文本：
- Symbol（股票代码）
- Contract / Option 合约字符串
- Strategy 名称
- Instance ID / 实例标签

合法实现：
- 单元格：<DenseTableCell className={denseTableEntityCell}>（或 denseTable.entityCell）
- 链接：<DenseLinkButton … className={denseTableEntityLink} />
- 多 tag（Strategy + Instance）：父格 entityCell + 子元素 flex flex-wrap gap-1
- 禁止在身份列使用：truncate、line-clamp、detailCellClip、overflow-hidden 盖在身份格上、whitespace-nowrap 锁死不换行
- detailRowLabel 的 truncate **仅**用于执行明细/归因等次要长文本，不用于上述四类身份字段

## 检测步骤
1. shadcn Table 残留：grep -rln '@/components/ui/table' src/pages src/components --include='*.tsx'
   已知历史违规（确认是否仍存在并列入修复清单）：StockCoverageTable、GlobalMarketStatusBar、CoverageOverviewDetailPage、IbConnectionPage、GapSheets、TechStackPage、CalendarDayDetail、TradeLedgerModals
2. 裸表格：grep -rnE '<table[\\s>]' src/pages src/components --include='*.tsx' | grep -v data-display
3. 身份列省略（最重要）：
   grep -rnE 'truncate|text-ellipsis|line-clamp' src/pages src/components --include='*.tsx' | grep -v data-display
   逐条人工过滤：若同一单元格/组件渲染 Symbol、Contract、Strategy、Instance（或表头为 Symbol/Contract/Opportunity/Instance/Symbols），必须改为 denseTableEntityCell + 换行，不得保留 truncate
   grep -rn 'detailCellClip' src/pages src/components --include='*.tsx' | grep -v data-display — 对照上下文，Contract/Symbol 列上的 detailCellClip 为硬违规
   grep -rn 'DenseLinkButton' src/pages src/components --include='*.tsx' | grep -v data-display — 同行含 truncate 的链接列入修复
   重点文件：OptionsTab.tsx、InstanceOptionSubTable.tsx、InstanceTab.tsx、ReadinessResultsTable.tsx、LedgerStgInsCell.tsx、LedgerStrategyGroup.tsx
   参考实现：UiDesignSystemPage §4 样例表（含长合约 demo 行）
4. 手写数值列：Dense 表格中 text-right 但无 font-mono / tabular-nums
5. 手写图标按钮：grep -rnE 'h-5 w-5.*hover:|opacity-40 hover:opacity-100' src/pages src/components --include='*.tsx'
6. window.confirm / window.alert：grep -rn 'window\\.confirm\\|window\\.alert' src --include='*.tsx'
7. 硬编码字号：grep -rnE 'text-\\[13px\\]|text-\\[11px\\]|text-\\[0\\.8125rem\\]|text-\\[0\\.6875rem\\]' src/pages src/components --include='*.tsx'

${EXEMPTIONS}
- 额外豁免：非数据表格的布局型结构（如 TechStackPage 文档对照表）可降级；图表 legend、Worker ID、API base URL 等非身份字段的 truncate 可豁免并注明理由

${REPORT_FORMAT}`

export const QA_PROMPT_SURFACE = `${CONTEXT}

# QA 任务 5：页面外壳与表面层级合规审计

## 设计规范（权威定义）
- 三层画布：Canvas = bg-card（页面根 PageShell，与 Sidebar 同色）→ Elevated = bg-secondary 或 Card variant="elevated"（KPI/筛选条/嵌套面板）→ Inset = bg-background（刻意凹进的图表/深坑区域）
- 每个业务页面根必须 PageShell（padding: default/compact/none）+ PageHeader（titleSize: default/large），禁止手写页面级 <h1>
- 铺在 canvas 上的面板禁止与画布同色（bg-card 上叠 bg-card）
- 禁止 Legacy 全局壳类：.card、.process-section、.legacy-monitoring-shell

## 检测步骤
1. 缺 PageShell 的页面：遍历 src/pages/**/*Page.tsx，grep -L 'PageShell'，列出未使用者并确认是否为业务页（Layout/重定向页豁免）
2. 手写 h1：grep -rn '<h1' src/pages --include='*.tsx'（PageHeader 内部实现豁免）
3. 画布同色叠加：在页面中 grep 'bg-card'，判断是否为 canvas 上的面板（应为 bg-secondary 或 Card variant="elevated"）
4. Legacy 壳类残留：grep -rn 'process-section\\|legacy-monitoring-shell' src --include='*.tsx'
5. 抽样 5 个最近修改的页面，核对三层结构截图级一致性（canvas→elevated→inset 嵌套顺序正确、无反向嵌套）

${EXEMPTIONS}

${REPORT_FORMAT}`

export const QA_PROMPT_FULL = `${CONTEXT}

# QA 任务：Dense UI 设计系统全量合规审计（全部 6 个维度）

请按以下 6 个维度依次完成审计，输出一份合并报告。建议使用多个并行子任务分别扫描，最后汇总去重。

## 维度 1 — PnL 语义色
盈利绿（--color-profit/text-profit）、亏损红（--color-loss/text-loss）、未实现盈亏一律黄（--color-unrealized/text-unrealized）、0/null 灰。
页面只许走 pnlColorClass / unrealizedPnlColorClass / PnlCell / InlinePnl。
扫描：原生 text-emerald-*/text-red-*（棘轮基线 RAW_PNL_PALETTE_BASELINE=64，见 scripts/check-legacy-css.sh）、内联红绿 hex、unrealized 字段误用红绿。

## 维度 2 — 实体识别色
Symbol（entity-symbol）→ 可点击 DenseLinkButton variant="stock"；Option 合约 → 必须 DenseLinkButton variant="option"（禁止 symbol pill 包整段合约）；Strategy/Instance/Category 见 QA_PROMPT_ENTITY 映射表。
硬违规：variant 错误、className 覆盖 text-foreground/text-primary、Positions 主表与子表 Contract/Symbol 形态不一致。
扫描：text-sky-*、stkPill*、DenseLinkButton 缺 variant="stock"、DenseTag symbol 用于 Contract 列、ReadinessResultsTable/InstanceOptionSubTable/InstanceCoverageSubTable 与参考实现对齐。

## 维度 3 — 状态与来源标签
状态一律 DenseTag（success/warning/danger/info/neutral，outline pill 无填充）；执行来源一律 ExecSourceBadge。
扫描：手写状态 pill、自建 sourceBadge、bg-red-100 类水洗背景、业务状态误用 shadcn Badge。

## 维度 4 — 表格密度与排版
DenseDataTable 家族；数值列 denseTableNumCell；身份列 Symbol/Contract/Strategy/Instance 必须 denseTableEntityCell + denseTableEntityLink，禁止 truncate/line-clamp/detailCellClip（宁可换行）。
扫描：truncate 与身份列共现、detailCellClip 用于 Contract/Symbol、缺 entityCell 的 Dense 表；另 @/components/ui/table、window.confirm、硬编码字号。

## 维度 5 — 页面外壳与表面层级
PageShell + PageHeader 强制；三层画布 bg-card → bg-secondary → bg-background；禁手写 <h1>、禁 Legacy 壳类。
扫描：缺 PageShell 的业务页、手写 h1、画布同色叠加。

## 维度 6 — Token 治理
新业务颜色必须先进 src/index.css（:root + .dark + @theme inline 三处成对），再经 data-display 原语暴露。
扫描：src/pages 内联 hex 颜色、绕过 token 直接写死的颜色值；核对 light/dark 是否成对（grep token 名在 :root 与 .dark 中均出现）。

${EXEMPTIONS}

${REPORT_FORMAT}
6. 报告末尾给出总体合规评分（每维度 0-10）与 Top 5 修复建议清单`
