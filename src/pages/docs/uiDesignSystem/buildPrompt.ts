import {
  formatScopeLabel,
  formatScopePathsForPrompt,
  type PromptScope,
} from './scopeRegistry'
import { getPromptSpec, type PromptSpecId } from './promptSpecs'

const CONTEXT = `你是 bifrost-trade-frontend（React 18 + Vite + Tailwind CSS v4 + shadcn/ui）的 UI 实现 Agent。
本项目执行 Dense UI 设计系统。权威规范：
- docs/DENSE_UI.md
- .cursor/rules/dense-ui-system.mdc
- src/index.css（design token）
- 活体契约页：/settings/ui-design-system（UiDesignSystemPage.tsx）

**你必须在指定 scope 内直接修改代码**，不要只输出审计报告。`

const EXEMPTIONS = `## 例外豁免（不要“修复”这些）
- src/components/data-display/** — 原语层；除非本任务明确要求扩展 variant/token，否则只消费现有原语
- 图表几何 CSS：PositionsChartsSection.module.css、DonutChart.module.css、riskProfile.module.css、discoveryCharts
- 图表调色：src/lib/chartTokens.ts、src/utils/donutChart.ts、src/utils/positionsCharts.ts
- 动态 layout 内联 style（无硬编码颜色 hex）`

const FIX_INSTRUCTIONS = `## 执行要求（Fix Prompt — 必须遵守）
1. **仅修改**下方 Scope 列出的路径；不要改 scope 外文件（除非 import 链必需且最小改动）
2. 扫描 scope 内违规 → **立即修复**，不要等待确认
3. 修复后在本 repo 根目录运行并通过：
   \`npm run lint && npm run build && npm run check:legacy-css\`
4. 若 check-legacy-css 棘轮计数下降，同步更新 scripts/check-legacy-css.sh 中对应 BASELINE
5. 回复简短摘要：改了哪些文件、解决了哪些违规、有无刻意保留的 gap（标注原因）`

function buildScopeBlock(scope: PromptScope): string {
  return `## Scope（修改范围 — 严格限制）

**范围**：${formatScopeLabel(scope)}

**允许修改的路径**（repo: bifrost-trade-frontend）：
${formatScopePathsForPrompt(scope)}

不要修改 bifrost-trader-engine/（只读参考）。`
}

export function buildPrompt(specId: PromptSpecId, scope: PromptScope): string {
  const spec = getPromptSpec(specId)
  return [
    CONTEXT,
    '',
    buildScopeBlock(scope),
    '',
    spec.specMarkdown,
    '',
    FIX_INSTRUCTIONS,
    '',
    EXEMPTIONS,
  ].join('\n')
}

/** Site-wide default prompts for backward compatibility. */
export function buildSitePrompt(specId: PromptSpecId): string {
  return buildPrompt(specId, { kind: 'site' })
}
