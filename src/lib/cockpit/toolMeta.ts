/**
 * MCP tool metadata + friendly renderers (Wave RS-KB QA).
 *
 * The Copilot invokes many MCP tools (research.*, trade.*, playbook.*).
 * Historically the tool_result card showed the raw JSON payload, which is
 * hard to read.  This registry gives every tool a Chinese title +
 * one-sentence "what does this tool do" description, plus an optional
 * `summarize()` that returns human-friendly key facts extracted from the
 * MCP envelope (`{ok, data}`).
 *
 * Unknown tools fall back to a generic renderer that highlights row counts
 * and top-level scalars.  Raw JSON is still available under a "view raw"
 * disclosure in the tool card.
 */

export type ToolCategory =
  | 'portfolio'
  | 'trading'
  | 'strategy'
  | 'market'
  | 'research'
  | 'playbook'
  | 'copilot'
  | 'other'

export type ToolSummaryLine = {
  label: string
  value: string
  tone?: 'default' | 'success' | 'warning' | 'danger' | 'muted'
}

export type ToolSummary = {
  headline?: string
  lines?: ToolSummaryLine[]
  tableCaption?: string
  table?: {
    columns: string[]
    rows: string[][]
    truncatedFrom?: number
  }
}

export type ToolMeta = {
  title: string
  description: string
  category: ToolCategory
  summarize?: (data: unknown, envelope: unknown) => ToolSummary | null
}

const CATEGORY_LABELS: Record<ToolCategory, string> = {
  portfolio: '组合',
  trading: '交易',
  strategy: '策略',
  market: '行情',
  research: '研究',
  playbook: '玩法',
  copilot: 'Copilot',
  other: '工具',
}

export function categoryLabel(c: ToolCategory): string {
  return CATEGORY_LABELS[c]
}

// ---------- helpers ----------

function asRecord(v: unknown): Record<string, unknown> | null {
  return v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : null
}

function asArray(v: unknown): unknown[] | null {
  return Array.isArray(v) ? v : null
}

function unwrapEnvelope(envelope: unknown): {
  ok: boolean
  data: unknown
  error?: string
} {
  const env = asRecord(envelope)
  if (!env) return { ok: false, data: envelope }
  if ('data' in env) {
    return {
      ok: env.ok !== false,
      data: env.data,
      error: typeof env.error === 'string' ? env.error : undefined,
    }
  }
  return { ok: true, data: envelope }
}

function fmtUsd(v: unknown): string | null {
  const n = typeof v === 'string' ? Number(v) : v
  if (typeof n !== 'number' || !Number.isFinite(n)) return null
  const abs = Math.abs(n)
  if (abs >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`
  if (abs >= 1_000) return `$${(n / 1_000).toFixed(1)}K`
  return `$${n.toFixed(2)}`
}

function fmtSigned(v: unknown): string | null {
  const n = typeof v === 'string' ? Number(v) : v
  if (typeof n !== 'number' || !Number.isFinite(n)) return null
  const s = fmtUsd(n)
  if (!s) return null
  return n > 0 ? `+${s}` : s
}

function pnlTone(v: unknown): ToolSummaryLine['tone'] {
  const n = typeof v === 'string' ? Number(v) : v
  if (typeof n !== 'number' || !Number.isFinite(n)) return 'muted'
  if (n > 0) return 'success'
  if (n < 0) return 'danger'
  return 'muted'
}

// ---------- registry ----------

export const TOOL_META: Record<string, ToolMeta> = {
  // ---------- trade.* ----------
  'trade.portfolio.snapshot': {
    title: '组合快照',
    description: '读取 Trade daemon 的实时快照 —— 账户净值、持仓、挂单、daemon 状态。回答"我现在持有什么？"最直接的工具。',
    category: 'portfolio',
    summarize: (data) => {
      const d = asRecord(data)
      if (!d) return null
      const accounts = asArray(d.accounts) ?? []
      const daemon = asRecord(d.daemon) ?? {}
      const lamps = asRecord(d.lamps) ?? {}
      const openOrders = asArray(d.open_orders) ?? []

      const totalNetLiq = accounts.reduce<number>((sum, a) => {
        const summary = asRecord((a as Record<string, unknown>).summary) ?? {}
        const nl = Number(summary.NetLiquidation)
        return Number.isFinite(nl) ? sum + nl : sum
      }, 0)
      const totalPositions = accounts.reduce<number>((sum, a) => {
        const pc = Number((a as Record<string, unknown>).positions_count)
        return Number.isFinite(pc) ? sum + pc : sum
      }, 0)

      const dstate = String(daemon.state ?? '—')
      const tstate = String(daemon.trading_state ?? '—')
      const symbol = daemon.symbol ? String(daemon.symbol) : '—'
      const spot = typeof daemon.spot === 'number' ? daemon.spot.toFixed(2) : '—'
      const dailyPnl = daemon.daily_pnl

      return {
        headline: `${accounts.length} 账户 · 净值 ${fmtUsd(totalNetLiq) ?? '—'} · ${totalPositions} 持仓`,
        lines: [
          { label: 'Daemon 状态', value: `${dstate} / ${tstate}` },
          { label: '交易标的', value: `${symbol} @ ${spot}` },
          {
            label: '日内 P&L',
            value: fmtSigned(dailyPnl) ?? '—',
            tone: pnlTone(dailyPnl),
          },
          { label: '挂单', value: `${openOrders.length} 单` },
          {
            label: '系统灯',
            value: String(lamps.system_lamp ?? '—'),
            tone:
              lamps.system_lamp === 'green'
                ? 'success'
                : lamps.system_lamp === 'yellow'
                  ? 'warning'
                  : lamps.system_lamp === 'red'
                    ? 'danger'
                    : 'muted',
          },
        ],
        table:
          accounts.length > 0
            ? {
                columns: ['账户', 'NetLiq', '持仓', '未实现 P&L'],
                rows: accounts.slice(0, 6).map((a) => {
                  const acct = a as Record<string, unknown>
                  const s = asRecord(acct.summary) ?? {}
                  return [
                    String(acct.account_id ?? '—'),
                    fmtUsd(s.NetLiquidation) ?? '—',
                    String(acct.positions_count ?? '—'),
                    fmtSigned(s.UnrealizedPnL) ?? '—',
                  ]
                }),
                truncatedFrom: accounts.length > 6 ? accounts.length : undefined,
                tableCaption: undefined,
              }
            : undefined,
      }
    },
  },
  'trade.portfolio.risk_summary': {
    title: '组合风险摘要',
    description: '轻量级健康检查 —— 当前标的、现价、日内 P&L、hedge 次数。比 snapshot 便宜。',
    category: 'portfolio',
    summarize: (data) => {
      const d = asRecord(data)
      if (!d) return null
      return {
        headline: `${String(d.symbol ?? '—')} @ ${String(d.spot ?? '—')}`,
        lines: [
          { label: '日内 P&L', value: fmtSigned(d.daily_pnl) ?? '—', tone: pnlTone(d.daily_pnl) },
          { label: '日内 Hedge 次数', value: String(d.daily_hedge_count ?? '—') },
          { label: '操作次数', value: String(d.operations_count ?? '—') },
        ],
      }
    },
  },
  'trade.trading.recent_executions': {
    title: '最近成交',
    description: '拉取账户维度的最近成交记录，默认 7 天窗口。用于回答"最近做了哪些交易？"。',
    category: 'trading',
    summarize: (data) => {
      const d = asRecord(data)
      if (!d) return null
      const rows = asArray(d.executions) ?? []
      return {
        headline: `${d.count ?? rows.length} 条成交（源池 ${d.returned_from ?? '—'} 条）`,
        table:
          rows.length > 0
            ? {
                columns: ['时间', '标的', '方向', '数量', '价格'],
                rows: rows.slice(0, 8).map((r) => {
                  const x = r as Record<string, unknown>
                  const ts = x.exec_time ?? x.ts ?? x.time ?? ''
                  return [
                    typeof ts === 'string' ? ts.slice(0, 19).replace('T', ' ') : String(ts),
                    String(x.symbol ?? x.local_symbol ?? '—'),
                    String(x.side ?? x.action ?? '—'),
                    String(x.qty ?? x.shares ?? x.quantity ?? '—'),
                    fmtUsd(x.price) ?? String(x.price ?? '—'),
                  ]
                }),
                truncatedFrom: rows.length > 8 ? rows.length : undefined,
              }
            : undefined,
      }
    },
  },
  'trade.strategy.instances': {
    title: '活跃策略 Instance',
    description: 'Daemon 正在管理的策略实例（每个 instance 对应一组开仓 legs）。',
    category: 'strategy',
    summarize: (data) => {
      const d = asRecord(data)
      if (!d) return null
      const rows = asArray(d.instances) ?? []
      return {
        headline: `${d.count ?? rows.length} 个活跃 instance`,
        table:
          rows.length > 0
            ? {
                columns: ['ID', '标的', '结构', '状态'],
                rows: rows.slice(0, 8).map((r) => {
                  const x = r as Record<string, unknown>
                  return [
                    String(x.instance_id ?? x.id ?? '—').slice(0, 12),
                    String(x.symbol ?? '—'),
                    String(x.structure ?? x.structure_type ?? '—'),
                    String(x.status ?? x.state ?? '—'),
                  ]
                }),
                truncatedFrom: rows.length > 8 ? rows.length : undefined,
              }
            : undefined,
      }
    },
  },
  'trade.strategy.opportunities': {
    title: '策略 Opportunity',
    description: 'Daemon 已配置的可执行组合模式（Structure × Symbol × Gate）。回答"系统能对哪些标的做什么策略？"。',
    category: 'strategy',
    summarize: (data) => {
      const d = asRecord(data)
      if (!d) return null
      const rows = asArray(d.opportunities) ?? []
      return {
        headline: `${d.count ?? rows.length} 个 opportunity`,
        table:
          rows.length > 0
            ? {
                columns: ['结构', '标的', 'Gate'],
                rows: rows.slice(0, 8).map((r) => {
                  const x = r as Record<string, unknown>
                  return [
                    String(x.structure ?? x.structure_type ?? '—'),
                    String(x.symbol ?? '—'),
                    String(x.gate ?? x.gate_id ?? '—'),
                  ]
                }),
                truncatedFrom: rows.length > 8 ? rows.length : undefined,
              }
            : undefined,
      }
    },
  },
  'trade.market.watchlist': {
    title: 'Watchlist',
    description: '用户当前关注的标的列表（symbol / sec type / category）。',
    category: 'market',
    summarize: (data) => {
      const d = asRecord(data)
      if (!d) return null
      const rows = asArray(d.items) ?? []
      const preview = rows.slice(0, 12).map((r) => {
        const x = r as Record<string, unknown>
        return String(x.symbol ?? x.local_symbol ?? '?')
      })
      return {
        headline: `${d.count ?? rows.length} 个 watchlist 项`,
        lines: preview.length > 0 ? [{ label: '标的', value: preview.join(' · ') }] : undefined,
      }
    },
  },
  'trade.market.quotes': {
    title: '实时行情',
    description: '按 symbols（逗号分隔）拉取实时报价。适合和 portfolio snapshot 组合使用。',
    category: 'market',
    summarize: (data) => {
      const d = asRecord(data)
      if (!d) return null
      const rows = asArray(d.quotes) ?? []
      return {
        headline: `${d.count ?? rows.length} 条报价`,
        table:
          rows.length > 0
            ? {
                columns: ['标的', 'Last', 'Bid', 'Ask'],
                rows: rows.slice(0, 12).map((r) => {
                  const x = r as Record<string, unknown>
                  return [
                    String(x.symbol ?? '—'),
                    String(x.last ?? x.price ?? '—'),
                    String(x.bid ?? '—'),
                    String(x.ask ?? '—'),
                  ]
                }),
                truncatedFrom: rows.length > 12 ? rows.length : undefined,
              }
            : undefined,
      }
    },
  },

  // ---------- research.* ----------
  'research.hypothesis.list': {
    title: '假设列表',
    description: '列出所有 Research 假设（active / draft / paused / resolved）。用于回答"我记录过哪些假设？"。',
    category: 'research',
  },
  'research.hypothesis.list_active': {
    title: '活跃假设',
    description: '仅返回当前 active 状态的假设。',
    category: 'research',
  },
  'research.hypothesis.get': {
    title: '假设详情',
    description: '按 hypothesis_id 拉取完整的假设（含 evidence、metrics、状态历史）。',
    category: 'research',
  },
  'research.hypothesis.summary_active': {
    title: '活跃假设汇总',
    description: '汇总所有活跃假设的关键指标（数量、类别分布、最新更新）。',
    category: 'research',
  },
  'research.backtest.list_runs': {
    title: '回测列表',
    description: '列出最近的回测 run（每次 SEPA 或策略回测都记录）。',
    category: 'research',
  },
  'research.backtest.get_run': {
    title: '回测详情',
    description: '按 run_id 拉取回测的收益、回撤、命中率等指标。',
    category: 'research',
  },
  'research.vrp.get_latest': {
    title: 'VRP 最新值',
    description: '最新的 Volatility Risk Premium（IV vs 实现波动率）。VRP > 0 期权卖方占优。',
    category: 'research',
  },
  'research.vrp.get_history': {
    title: 'VRP 历史序列',
    description: '按天返回 VRP 时间序列，用于观察卖方 edge 的持续性。',
    category: 'research',
  },
  'research.vrp.get_extremes': {
    title: 'VRP 极值',
    description: '返回窗口内的 VRP 极端值（前 5% / 后 5%），用于捕捉波动率异常。',
    category: 'research',
  },
  'research.vol_surface.get_fit': {
    title: '波动率曲面拟合',
    description: '按 symbol + trade_date 拉取拟合后的 IV 曲面参数。',
    category: 'research',
  },
  'research.vol_surface.get_term_structure': {
    title: '期限结构',
    description: 'ATM IV 按到期时间的序列，观察 term structure 形态。',
    category: 'research',
  },
  'research.vol_surface.get_residuals': {
    title: '曲面残差',
    description: '每个 strike 的实际 IV vs 拟合 IV 的偏差（潜在 mispriced 期权）。',
    category: 'research',
  },
  'research.vol_surface.get_skew_extremes': {
    title: 'Skew 极值',
    description: '返回 Put Skew 极端 (25Δ Put IV - 25Δ Call IV) 的候选。',
    category: 'research',
  },
  'research.opex_cycle.get_current': {
    title: 'OpEx 周期（当前）',
    description: '当前 monthly OpEx 周期的状态：距到期天数、pin 分析、Gamma / Charm profile。',
    category: 'research',
  },
  'research.opex_cycle.get_history': {
    title: 'OpEx 周期（历史）',
    description: '历史 OpEx 周期的 P&L 统计与 pin 命中率。',
    category: 'research',
  },
  'research.opex_cycle.get_pin_analysis': {
    title: 'OpEx Pin 分析',
    description: 'OpEx 前后 spot 靠近最大 gamma strike 的概率与偏差。',
    category: 'research',
  },
  'research.discovery.daily_brief_synth': {
    title: '每日综合简报',
    description: 'Research 引擎综合的每日简报（宏观 + SEPA + Event + Flow）。适合作为盘前 brief 的起点。',
    category: 'research',
  },
  'research.discovery.sepa_daily': {
    title: 'SEPA 每日榜',
    description: 'SEPA 四阶段筛选每日 top candidates（动量 + 趋势 + 波动 + 结构）。',
    category: 'research',
  },
  'research.discovery.sepa_candidates': {
    title: 'SEPA 候选',
    description: '按分数返回当前活跃的 SEPA 候选，含四阶段每一步的通过情况。',
    category: 'research',
  },
  'research.discovery.event_radar': {
    title: '事件雷达',
    description: '未来 N 天的财报、宏观事件、异常资金流信号。',
    category: 'research',
  },
  'research.discovery.momentum_radar': {
    title: '动量雷达',
    description: '短中期动量榜单（rating × RS × 回踩形态）。',
    category: 'research',
  },
  'research.discovery.forecast_sessions': {
    title: '预测 Session',
    description: 'AI Forecast 引擎最近的会话（含预测、验证、命中）。',
    category: 'research',
  },
  'research.discovery.gex_intraday': {
    title: 'GEX 日内',
    description: '当日 Gamma Exposure 曲线 + 支撑/阻力 strike。',
    category: 'research',
  },
  'research.discovery.flow_sentiment': {
    title: '资金流情绪',
    description: '期权资金流的方向性汇总（P/C ratio、Call/Put premium、Unusual flow）。',
    category: 'research',
  },
  'research.discovery.regime_stats': {
    title: '市场 Regime',
    description: '当前市场 Regime（Bull/Bear × Low/High Vol × Trend/Range）的统计。',
    category: 'research',
  },

  // ---------- playbook + copilot memory ----------
  'research.playbook.rules_active': {
    title: '玩法规则（active）',
    description: '返回你在 My Trading System 里记录的全部 active 规则（策略习惯 / 风控 / entry criteria）。',
    category: 'playbook',
    summarize: (data) => {
      const rows = asArray(asRecord(data)?.rules) ?? asArray(data) ?? []
      return {
        headline: `${rows.length} 条 active 规则`,
        table:
          rows.length > 0
            ? {
                columns: ['标题', '分类', '标签'],
                rows: rows.slice(0, 8).map((r) => {
                  const x = r as Record<string, unknown>
                  const tags = asArray(x.tags) ?? []
                  return [
                    String(x.title ?? '—'),
                    String(x.category ?? '—'),
                    tags.slice(0, 3).map(String).join(', '),
                  ]
                }),
                truncatedFrom: rows.length > 8 ? rows.length : undefined,
              }
            : undefined,
      }
    },
  },
  'research.playbook.notes_for': {
    title: '玩法笔记',
    description: '按 symbol/category 拉取相关笔记（复盘、心得、临时观察）。',
    category: 'playbook',
  },
  'research.playbook.cases_matching': {
    title: '玩法 Case',
    description: '返回与当前情境匹配的历史 case（同类型交易的记录）。',
    category: 'playbook',
  },
  'research.copilot.recent_sessions': {
    title: '最近对话',
    description: '你最近的 Copilot 对话摘要，用于跨 session 的连续性。',
    category: 'copilot',
  },
}

/** Fallback description by category prefix, when a specific tool isn't registered. */
export function inferCategory(toolName: string): ToolCategory {
  if (toolName.startsWith('trade.portfolio.')) return 'portfolio'
  if (toolName.startsWith('trade.trading.')) return 'trading'
  if (toolName.startsWith('trade.strategy.')) return 'strategy'
  if (toolName.startsWith('trade.market.')) return 'market'
  if (toolName.startsWith('research.playbook.')) return 'playbook'
  if (toolName.startsWith('research.copilot.')) return 'copilot'
  if (toolName.startsWith('research.')) return 'research'
  return 'other'
}

export function getToolMeta(toolName: string): ToolMeta {
  const hit = TOOL_META[toolName]
  if (hit) return hit
  const category = inferCategory(toolName)
  return {
    title: toolName,
    description: '（此工具暂无详细说明 — 展开原始 JSON 查看返回值）',
    category,
  }
}

/**
 * Generic summarizer for tools without a specific one.  Extracts the row
 * count from common array keys and highlights top-level scalars.
 */
export function genericSummary(data: unknown): ToolSummary | null {
  const d = asRecord(data)
  if (!d) return null
  const rowKeys = [
    'items',
    'rows',
    'executions',
    'instances',
    'opportunities',
    'quotes',
    'candidates',
    'signals',
    'notes',
    'rules',
    'cases',
    'sessions',
    'entries',
    'runs',
    'points',
  ] as const

  let table: ToolSummary['table']
  let headline: string | undefined
  for (const k of rowKeys) {
    const arr = asArray(d[k])
    if (arr) {
      const cols = ['#']
      const rows: string[][] = []
      const sample = arr[0] && typeof arr[0] === 'object' ? (arr[0] as Record<string, unknown>) : null
      if (sample) {
        const keys = Object.keys(sample).slice(0, 4)
        cols.push(...keys)
        arr.slice(0, 6).forEach((r, i) => {
          const rec = r as Record<string, unknown>
          rows.push([
            String(i + 1),
            ...keys.map((kk) => {
              const v = rec[kk]
              if (v == null) return '—'
              if (typeof v === 'object') return JSON.stringify(v).slice(0, 40)
              return String(v).slice(0, 60)
            }),
          ])
        })
      }
      if (rows.length > 0) {
        table = {
          columns: cols,
          rows,
          truncatedFrom: arr.length > rows.length ? arr.length : undefined,
        }
        headline = `${arr.length} 条 ${k}`
      } else {
        headline = `${arr.length} 条 ${k}（空/非结构化）`
      }
      break
    }
  }

  // Scalars view
  const scalars: ToolSummaryLine[] = []
  for (const [k, v] of Object.entries(d)) {
    if (v == null) continue
    if (Array.isArray(v)) continue
    if (typeof v === 'object') continue
    scalars.push({ label: k, value: String(v).slice(0, 80) })
    if (scalars.length >= 6) break
  }

  if (!headline && scalars.length === 0) return null

  return {
    headline,
    lines: scalars.length > 0 ? scalars : undefined,
    table,
  }
}

export function summarizeToolResult(toolName: string, envelope: unknown): {
  meta: ToolMeta
  ok: boolean
  error?: string
  summary: ToolSummary | null
} {
  const meta = getToolMeta(toolName)
  const { ok, data, error } = unwrapEnvelope(envelope)
  let summary: ToolSummary | null = null
  if (ok && meta.summarize) {
    try {
      summary = meta.summarize(data, envelope)
    } catch {
      summary = null
    }
  }
  if (ok && !summary) {
    try {
      summary = genericSummary(data)
    } catch {
      summary = null
    }
  }
  return { meta, ok, error, summary }
}
