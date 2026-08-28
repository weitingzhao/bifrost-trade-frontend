<!--
parity-ids: dense-ui-system-v1, ui-confirm-dialogs-v1
对等文件: .cursor/rules/{dense-ui-system,ui-confirm-dialogs}.mdc
改任一侧必须同步另一侧并 bump 两侧版本号；校验: bash ../scripts/check-agent-config-parity.sh
-->

# CLAUDE.md — bifrost-trade-frontend

> Legacy `bifrost-trader-engine` 已按 spine **D8**（2026-06-29）NAS 归档并移出工作区，重构完成。
> 工作区事实基线见 `../AGENT_FACTS.md`。

与本项目用户对话一律使用中文回复（无论用户用何种语言提问）；UI 字符串与代码标识符使用 English。

---

## 职责范围

本 repo 是 Bifrost Trade 系统的 React/TypeScript 前端监控 UI。纯内部工具，无 SEO 需求，面向单一交易者使用。

---

## DEV Inner Loop（D-IL1 — Agent 强制习惯）

**默认 UI 验收 = 本机 Vite `:5173`，不是 Prod 浏览器刷新。**

| 项 | 值 |
|----|-----|
| Accept | `npm run dev:k3s` → `http://127.0.0.1:5173` |
| API | `.env.development.local` → `192.168.10.73:30882`（`bifrost-dev`） |
| Preset | `.env.development.k3s` |
| 合同 | `bifrost-trade-infra/docs/TRADE_DEV_INNER_LOOP.md` · Program `trade-dev-inner-loop` |

- Smoke：Instances / Live / Ledger 在本地 Vite 对 DEV API 点检通过后才算 FE 完成
- Prod / Satellite 刷新 = **L2 发布闸门**（D-IL4），不是日常视觉回归
- 禁止长期把本地 FE 钉到 Prod 可写 API；禁止 D10 解锁路径
- Live = 共享 `redis-ib`；台账新鲜度 = Owner 门控 `trigger_data_clone` → `bifrost_dev`

---

## ⚠️ 架构禁令（Legacy 遗留问题清单）

Legacy 前端（`bifrost-trader-engine/frontend`，已随 D8 归档，不可访问）存在以下问题，
**本项目严禁重现** —— 这些是已确立的架构禁令，不是待办事项：

- App.tsx 1963 行，27 个 useState 混杂路由/数据/UI 三类状态 → App.tsx 仅含路由 + Provider
- 页面组件内直接写 useEffect + fetch，无 custom hook 封装 → 强制用 TanStack Query hook
- App.css 31,769 行单文件，魔法数字泛滥 → Tailwind + token，禁原生色板与内联 hex
- SSE 订阅逻辑散落在 App.tsx 顶层 → 封装成独立 hook，每个 EventSource 必须有 cleanup
- 无 ESLint/Prettier，有 console.log 残留 → ESLint `no-console` 强制拦截
- vite.config.ts 用 Python 脚本加载端口 → `.env` + `VITE_API_*` 变量

---

## 技术栈决策（已锁定）

| 方向 | 选型 | 选用原因 |
|------|------|---------|
| 框架 | **React 18 + TypeScript + Vite** | 纯 SPA，无 SEO 需求，Vite 构建最快 |
| 路由 | **React Router v7**（`react-router-dom@7.x`） | 替代旧代码的 hash + window.location 手工管理；使用 Data Router 模式（`createBrowserRouter` + `RouterProvider`），与 v6.4+ API 完全兼容 |
| 服务端状态 | **TanStack Query v5** | 统一替代所有手写 useEffect+fetch+useState 模式 |
| UI 组件库 | **shadcn/ui + Tailwind CSS** | 免费开源，组件质量高，样式可定制 |
| 布局 | **左侧折叠 Sidebar + 顶部 Header** | 见下方布局规范 |
| 代码质量 | **ESLint + Prettier + pre-commit hook** | 项目初始化第一天配置，不可跳过 |

**明确排除 Next.js**：本项目是内部交易监控台，无 SEO 需求，SSE 密集，无需 SSR/RSC。Next.js 的核心价值与本项目需求完全错位。

**权威文档（技术选型 + Dense UI + 治理）**：`docs/TECH_STACK.md`；应用内 **Settings → Configuration → Tech Stack**（`/settings/tech-stack`）。Dense UI 细节见 `docs/DENSE_UI.md`。

---

## 布局架构规范

### 整体结构

```
┌──────────────────────────────────────────────────┐
│  顶部 Header：Logo、实时状态灯、通知、主题切换      │
├──────┬───────────────────────────────────────────┤
│      │                                           │
│ Side │           页面内容区                       │
│ bar  │     （各域页面在此渲染）                    │
│      │                                     [抽屉]│
└──────┴───────────────────────────────────────────┘
```

### Sidebar 规范

- 使用 **shadcn/ui Sidebar 组件**
- 支持两种状态：**展开**（文字 + 图标）/ **折叠 Mini**（仅图标）
- 折叠状态用于数据密集页面（期权链、交易台账等）释放横向空间
- 导航分组与 API 域对齐：

```
Market       → Live、WatchList
Portfolio    → Accounts、Positions、Performance
Research     → Screener、Discovery、Greeks、SEPA
Strategy     → Instances、Structures、Opportunities、Gates
Operations   → Daemon、Logs
Settings     → Config、IB Connection
```

### 右侧面板规范

- **RightInspectorDrawer**（浮层，不遮挡背后内容）：用于行情 Inspector、策略实例详情
- **DetailSidebar**（Modal 或 Docked）：用于需要聚焦编辑的详情页

---

## 架构模式（强制规范）

### 数据获取：必须使用 TanStack Query

```tsx
// ✅ 正确
function usePositions() {
  return useQuery({
    queryKey: ['positions'],
    queryFn: fetchPositions,
    refetchInterval: 15_000,
  })
}

function PositionsPage() {
  const { data, isLoading } = usePositions()
  return <PositionsTable data={data} />
}

// ❌ 禁止 — 旧代码模式，严禁在新项目出现
function PositionsPage() {
  const [positions, setPositions] = useState([])
  useEffect(() => {
    fetchPositions().then(setPositions)
  }, [])
}
```

### SSE 实时订阅：必须封装成 hook，用 QueryClient 推入

```tsx
// ✅ 正确
function useQuoteStream(symbols: string[]) {
  const queryClient = useQueryClient()
  useEffect(() => {
    const es = new EventSource(`/api/quotes/stream?symbols=${symbols.join(',')}`)
    es.onmessage = (e) => {
      const quote = JSON.parse(e.data)
      queryClient.setQueryData(['quote', quote.symbol], quote)
    }
    return () => es.close()  // 必须 cleanup
  }, [symbols.join(',')])
}

// ❌ 禁止 — SSE 逻辑写在 App.tsx 或页面组件顶层
```

### 状态分层规则

| 状态类型 | 归属 | 实现 |
|---------|------|------|
| 服务端数据（API 响应） | TanStack Query | useQuery / useMutation |
| 实时推送数据（SSE） | TanStack Query Cache | queryClient.setQueryData |
| 全局 UI 状态（主题、sidebar 展开） | React Context 或 Zustand（轻量） | 按需引入 |
| 页面级 UI 状态（选中行、展开折叠） | 页面组件 useState | 不上提到父级 |
| URL 状态（当前页、筛选条件） | React Router useSearchParams | 不用 window.location |

### CSS 规范

- **Tailwind CSS** 处理布局、间距、颜色
- **shadcn/ui CSS 变量** 处理主题（亮/暗）
- **CSS Modules**（`*.module.css`）处理页面特定的复杂样式
- **禁止**：全局单文件 CSS、魔法数字（直接写 `padding: 6px`）、`!important`

### Dense UI 设计系统（Agent 强制）

相同交互必须复用 `@/components/data-display` 原语；改 token/组件一处，全站采纳者统一升级。Agent 必读：

- `docs/DENSE_UI.md` · `AGENTS.md`
- Cursor: `.cursor/rules/dense-ui-system.mdc`（alwaysApply）· `.cursor/skills/dense-ui/SKILL.md`
- Claude: 本文件本节 · `.claude/skills/dense-ui/`（表格/迁移任务）

UI 改动后运行 `npm run check:legacy-css`。

### 页面画布（三层 surface，与 Sidebar 对齐）

| 层级 | Tailwind | 用途 |
|------|----------|------|
| Canvas | `bg-card` | 页面根、`PageShell`、与侧栏同色 |
| Elevated | `bg-secondary` 或 `Card variant="elevated"` | KPI、筛选条、嵌套面板 |
| Inset | `bg-background` | 刻意凹进的图表/深坑区域 |

- 每个页面根必须使用 [`PageShell`](src/components/layout/PageShell.tsx)（`padding`: `default` / `compact` / `none`）
- 每个 `PageShell` 业务页必须使用 [`PageHeader`](src/components/layout/PageHeader.tsx)（`titleSize`: `default` | `large`）；禁止手写页面级 `<h1>`
- 铺在 canvas 上的 KPI/图表面板使用 `Card variant="elevated"` 或 `bg-secondary`，禁止与画布同色的 `bg-card` 块
- **禁止**在新页面使用 Legacy 全局类 `.card`、`.process-section`、`.legacy-monitoring-shell` 作为页面外壳
- Option Discovery 样式仅限页面 import：`discoveryCharts.css`（SVG/IV-term 表）+ Tailwind（`option-discovery-root`）；**不得**在新页面 import 或复用全局 Legacy shell

### 文件组织规范

```
src/
├── main.tsx
├── App.tsx               ← 仅含路由定义 + Layout shell，< 100 行
├── layout/
│   ├── AppSidebar.tsx    ← Sidebar 导航
│   ├── AppHeader.tsx     ← 顶部 Header
│   └── AppLayout.tsx     ← 组合 Sidebar + Header + Outlet
├── pages/
│   ├── market/
│   ├── portfolio/
│   ├── research/
│   ├── strategy/
│   ├── operations/
│   └── settings/
├── hooks/                ← 所有 custom hooks（按域分文件）
│   ├── useQuoteStream.ts
│   ├── useSystemMessages.ts
│   ├── useStatusPoller.ts
│   └── ...
├── api/                  ← 纯函数，只负责 HTTP 请求，无状态
│   ├── monitor.ts
│   ├── market.ts
│   └── ...
├── components/           ← 可复用 UI 组件
│   └── layout/           ← PageShell, PageHeader, PageSection
├── lib/
│   ├── queryClient.ts    ← TanStack Query 全局配置
│   └── router.tsx        ← React Router 路由定义
└── utils/
```

### App.tsx 硬性约束

App.tsx **只允许**包含：
1. `<RouterProvider>` 或 `<BrowserRouter>`
2. `<QueryClientProvider>`
3. Layout 组件引用

**不允许**出现在 App.tsx：
- 任何 useState（主题除外，可用 Context）
- 任何 useEffect
- 任何 API 调用
- 任何页面级渲染逻辑

---

## 环境配置规范

端口通过 `.env` 文件管理，不使用 Python 脚本：

```
# .env.development — Phase B single gateway base
VITE_API_BASE=http://localhost:80
VITE_API_MARKET_DATA_PLUGIN=http://localhost:8780/api/v1/plugins/market-data/api
# K3s thick backend: VITE_API_BASE=http://192.168.10.73:30882
# P7: api-massive retired — use Market Data Plugin above
```

---

## API 目标

Phase 1（New FE + Legacy API）与 Phase 2（逐域切换）均已完成，Legacy 全线退役（spine **D8**）。
当前 API 目标由 `.env.development.local` / `.env.development.k3s` 控制，见上文 DEV Inner Loop。

---

## 命令

```bash
npm install
npm run dev      # 开发服务器（端口 5173）
npm run build    # 生产构建
npm run lint     # ESLint 检查
npm run preview  # 预览构建结果
```
