/**
 * The Calibration page's data (design `System Data Calibration.dc.html`,
 * route rev 2026-09-20.4): the calibration document's rows, transcribed whole
 * from RESEARCH_CALIBRATION.md round 2026-09-08.9 as the design read them.
 * This page renders the document; it does not judge. Contracts are referenced
 * by number because the numbers are the stable anchor and the wording is not.
 *
 * The live document is served at GET /research/docs/calibration; the page
 * probes its version stamp so a transcription of a stale round says so
 * instead of impersonating the current one.
 */

/** The round these rows transcribe — compared against the live document. */
export const TRANSCRIBED_ROUND = '2026-09-08.9'
export const TRANSCRIBED_ASOF = '2026-09-08'

export type ContractState = 'ok' | 'warn' | 'fail' | 'ramp'

/**
 * Four contract states on the four-lamp vocabulary (§11.3.1): a broken
 * contract is a real fault, so it is red; a ramping one has a reading but no
 * verdict, so it is grey.
 */
export const STATE: Record<
  ContractState,
  {
    label: string
    lamp: string
    variant: 'success' | 'warning' | 'danger' | 'neutral'
    sym: string
    note: string
  }
> = {
  ok: { label: 'met', lamp: 'green', variant: 'success', sym: '✅', note: 'evidence on file' },
  warn: { label: 'partly met', lamp: 'yellow', variant: 'warning', sym: '⚠️', note: 'named gap remains' },
  fail: { label: 'not met', lamp: 'red', variant: 'danger', sym: '❌', note: 'real fault' },
  ramp: { label: 'ramping', lamp: 'gray', variant: 'neutral', sym: '⏳', note: 'rule landed, supply climbing' },
}

export const STATE_ORDER: readonly ContractState[] = ['ok', 'warn', 'fail', 'ramp']

export const LAYERS: readonly [string, string, string][] = [
  ['F', '基础层 · Foundation', 'lenses, registry, universe'],
  ['R', '实绩层 · Record', 'what happened next'],
  ['A', '智囊 · Autopilot', 'judgement layer'],
  ['C', '操作面 · Copilot', 'the desk'],
  ['U', 'UI', 'seat and navigation'],
]

export interface ContractRow {
  id: string
  state: ContractState
  contract: string
  evidence: string
  layer: string
}

/*
 * Contract text: RESEARCH_BLUEPRINT.md §4 (stable anchors). Evidence:
 * RESEARCH_CALIBRATION.md round 2026-09-08.9 — the design's own reading,
 * transcribed verbatim.
 */
export const ROWS: readonly ContractRow[] = [
  {
    id: 'C-F1',
    state: 'warn',
    contract: '任何分析原语全系统只有一份实现',
    evidence:
      'lenses/screen.py 已落地:一个 lens 一条集合语句打整个宇宙,band 走 registry 的 classify,575 标的 × 10 lens 实测 6.8 秒(循环 build_exhibit 要 11 分钟)。每行还列出该标的没有读数的 lens。仍非 ✅:sepa.py / momentum.py 两个开口解析器未改走原语——那会改变 Autopilot 每天的候选来源,需 Owner 先定。',
    layer: 'F',
  },
  {
    id: 'C-F2',
    state: 'ok',
    contract: '基础层不知道 objective、不知道谁在问',
    evidence:
      'engines/、lenses/ 无 objective / policy 依赖。iv_solver.py 与 vol_surface/fit.py 里的 objective 是最小二乘的目标函数,不是这个 objective。',
    layer: 'F',
  },
  {
    id: 'C-F3',
    state: 'warn',
    contract: '每个 lens 有 registry 条目、band、说明、页面路由',
    evidence:
      '12 个 spec 都有 route、bands、hot/cold 说明。0.95.1 起 sepa 与 momentum 加入衰减追踪(只追 hot 侧:cold 侧 400 个/天无人消费且回补会 OOM),最宽的两个面开始自我度量。仍无 decay 的 3 个:iv_percentile、term_slope、forecast_path。',
    layer: 'F',
  },
  {
    id: 'C-F4',
    state: 'fail',
    contract: '每个 lens 对它覆盖的每个标的都真的会触发',
    evidence:
      '三个 lens 几乎不触发:skew 建表至今 1 行、terrain_regime 4 行、order_sentiment 0 行。上游表都有 27–28 个标的、数据齐全,所以根因各不相同,不是一类动作。',
    layer: 'F',
  },
  {
    id: 'C-F5',
    state: 'ramp',
    contract: '宇宙由明确规则定义,宇宙内每个标的拥有全部分析面',
    evidence:
      '规则已落地(0.95.0):research.option_universe 三层,首次填充 575(常驻 27 / 核 527 / 边 21),Dagster asset 每日刷新。供给爬坡中:option-refresh 首跑排入 173 个任务,每次最多 150 个新名字、六小时一次,核全部枚举完约 1–2 天。',
    layer: 'F',
  },
  {
    id: 'C-R1',
    state: 'fail',
    contract: '每个「后来怎么样了」的问题有且只有一个定义与实现',
    evidence:
      '「命中率 / 实绩」在代码里 ≥ 10 处实现、回答 4 个问题。lenses/track_record.fetch_track_record 与 harness/evidence._fetch_track_record 名字几乎相同、问题完全不同。',
    layer: 'R',
  },
  {
    id: 'C-R2',
    state: 'ramp',
    contract: '提出的每个候选都会被结清',
    evidence:
      '0.91.0 对齐了基准腿的日期口径;not_elapsed=132 个仍在等 bar,3/3 已判。窗口未到的横期跳过而非写 0,所以这条要等时间,不等代码。',
    layer: 'R',
  },
  {
    id: 'C-R3',
    state: 'ok',
    contract: 'Owner 的拒绝被记住,回来时说出变化',
    evidence:
      '0.90.0 decline_memory:被拒绝的名字只有在变好时才回来(分数上行、path/grade 进阶、新事件、regime 翻转),卡片写明变了什么。漏斗里有 decline_memory 步,已回填 3 条。',
    layer: 'R',
  },
  {
    id: 'C-R4',
    state: 'ok',
    contract: 'lens 触发的命中会被回填',
    evidence:
      '0.91.0 engines/signal_hit_fwd_fill,一次回填 1,310 行。此前 hit_20d 从未被写过非 NULL 值,policy.min_hit_rate 一直在读空表。',
    layer: 'R',
  },
  {
    id: 'C-R5',
    state: 'ok',
    contract: '提案、审批、花费各有一条账',
    evidence:
      'ai_draft、ai_action_log、persona_eval_spend 三条账各自独立,provider 与 cost_usd 逐次记录。',
    layer: 'R',
  },
  {
    id: 'C-R6',
    state: 'warn',
    contract: '智囊的评级与 Copilot 的回答引用同一份战绩',
    evidence:
      'rating.settled_record 与 Copilot 各自取战绩,口径未证明一致。两边今天可能都对,但没有测试拦住它们分叉。',
    layer: 'R',
  },
  {
    id: 'C-A1',
    state: 'fail',
    contract: '读基础层只经 lenses/,不含直接读 features.* 的 SQL',
    evidence:
      'harness/data_sources.py 直接 SELECT features.*。智囊自己拿着 5 张表(sepa、scan、lens_hit、candidate_pool、candidate_outcome)和自己的 SQL,只复用了回测引擎。',
    layer: 'A',
  },
  {
    id: 'C-A2',
    state: 'fail',
    contract: '筛选是多层的,进入判断的标的拥有全部深面;缺面明说',
    evidence:
      '今日一次 Smart Decision Run:3,475 → 43(SEPA)→ momentum 返回 0 → events 跳过 → 期权 overlay 跳过(快照过期 4 天)→ 24 → 8。momentum 宇宙 25 个标的,与 43 个 SEPA 幸存者交集 5 个,那 5 个里没有 grade A。多层筛选实际是单层,而判断层对缺面静默出了结论。',
    layer: 'A',
  },
  {
    id: 'C-A3',
    state: 'warn',
    contract: '产出是带评级的报告,评级有度量且事后可验',
    evidence:
      '报告有 why / price / settled / wrong_if。但系统以候选数与 auto_approve_eligible 自评——用错误的尺子量自己;新信息率与事后正确率未度量。',
    layer: 'A',
  },
  {
    id: 'C-A4',
    state: 'ok',
    contract: '报告回流 Copilot,可被追问',
    evidence:
      'research.loop.list_runs / get_run / explain_candidate 三个读工具加每日 digest。实测「why was RKLB proposed」只调一次 explain_candidate 并逐块带出处。',
    layer: 'A',
  },
  {
    id: 'C-A5',
    state: 'ok',
    contract: '不执行、不下单、不扩容',
    evidence:
      'D10 守卫;propose-only;绳子四道门(两模型一致 ∧ validate 未 block ∧ 证据已测 ∧ 来源结清命中率 ≥ policy 门槛)。',
    layer: 'A',
  },
  {
    id: 'C-A6',
    state: 'fail',
    contract: '名字说的就是它做的事',
    evidence:
      '它叫 Autopilot,而它做的是提案与评级,不自动驾驶。改名要动 seat、路由、存储键、文案四处。',
    layer: 'A',
  },
  {
    id: 'C-A7',
    state: 'ok',
    contract: '评级是智囊的产物,八项齐全且可追溯',
    evidence:
      'rating.py:conviction / action / timing / levels / outlook / instrument / why 全部存在,战绩来自 candidate_outcome。',
    layer: 'A',
  },
  {
    id: 'C-A8',
    state: 'warn',
    contract: '基础一端与高级一端都可用,同一层、同一套评级',
    evidence:
      '高级一端就是 Smart Decision Run。基础一端(只摆读数、评级从简)没有独立入口,所以想轻用它的人只能跑重的那一端。',
    layer: 'A',
  },
  {
    id: 'C-C1',
    state: 'ok',
    contract: '所有人要读要聊的东西以它为终点',
    evidence:
      'Inbox、digest、verdict strip 都可进 Copilot。',
    layer: 'C',
  },
  {
    id: 'C-C2',
    state: 'ok',
    contract: '能用到基础层的全部面',
    evidence:
      '63 个工具,import engines / lenses,覆盖 VRP、vol surface、opex、GEX、flow、forecast、backtest、playbook。',
    layer: 'C',
  },
  {
    id: 'C-C3',
    state: 'ok',
    contract: '不重复实现基础层',
    evidence:
      'mcp/tools/* 一律 import engines / lenses,没有自己的分析实现。',
    layer: 'C',
  },
  {
    id: 'C-C4',
    state: 'ok',
    contract: '写操作经审批,账可追溯',
    evidence:
      '审批 token、fill_tool_defaults、bearer 解析 owner。approved_by 不再由调用方自报。',
    layer: 'C',
  },
  {
    id: 'C-C5',
    state: 'ok',
    contract: '可以在智囊的 objective 之外直接做研究',
    evidence:
      'discovery / vrp / vol_surface / backtest 工具不依赖任何 run,任何标的、任何面、任何回测都不需要先有一份报告。',
    layer: 'C',
  },
  {
    id: 'C-U1',
    state: 'ok',
    contract: '每个 seat 只带自己的页;seat 跟着路由走',
    evidence:
      'researchNavCatalog.seatForRoute,21 个测试。',
    layer: 'U',
  },
  {
    id: 'C-U2',
    state: 'ok',
    contract: '同一个队列只数一次:徽章 = 页面',
    evidence:
      '0.92.0 pending_decision_calls;两侧独立计算并一致:34 待决 / 19 折叠 / 24 briefing。',
    layer: 'U',
  },
  {
    id: 'C-U3',
    state: 'ok',
    contract: '首页即标题,无不可点的分区',
    evidence:
      'home 行既是标题也是页面;三个不可点的分区标题已删。',
    layer: 'U',
  },
  {
    id: 'C-U4',
    state: 'ok',
    contract: '一个页面只亮一行(父子高亮除外)',
    evidence:
      'Objectives 不再借控制台路由,站在控制台不会同时亮两行。',
    layer: 'U',
  },
]

export interface FixRow {
  ids: string
  gap: string
  fix: string
}

/** §3's own list — the document's smallest changes, not a plan invented here. */
export const FIXES: readonly FixRow[] = [
  {
    ids: 'C-A1 / C-F1',
    gap: '智囊自己读表、自己筛',
    fix: 'harness 改为经 lenses/ 取读数;删 harness/universe/* 里重做的筛选。这是唯一能同时关掉两条的改动,也是 C-A2 落地的前提——筛选原语知道每个标的有哪些面,才能拒绝把缺面的标的送进判断。',
  },
  {
    ids: 'C-R1 / C-R6',
    gap: '实绩十个实现',
    fix: '一个 track_record 模块,四个问题四个函数,其余全部改为调用。',
  },
  {
    ids: 'C-A2',
    gap: '接缝无契约',
    fix: '筛选层校验深面存在;判断层缺面时标注「未测」而非静默。',
  },
  {
    ids: 'C-A3',
    gap: '报告以错误尺子自评',
    fix: '度量新信息率与事后正确率,上 Overview。',
  },
  {
    ids: 'C-F4',
    gap: '三个 lens 不触发',
    fix: '先查阈值还是上游数据(task 已开)。三个不是一类动作:skew 等时间;terrain_regime 保持稀有或另议档位;order_sentiment 等 tape 源。',
  },
  {
    ids: 'C-F5',
    gap: '宇宙无规则',
    fix: '规则那一半已关掉;宽度需求交 Plugin / 订阅 program。',
  },
  {
    ids: 'C-A6',
    gap: '命名',
    fix: 'Autopilot → 智囊(英文待定):seat、路由、存储键、文案四处同改。',
  },
  {
    ids: 'C-A8',
    gap: '基础一端缺入口',
    fix: '给 objective 一个「只摆读数」的模式。',
  },
]

/** The roll-up the document itself states (§2 计数) — 27, against its rows' 28. */
export const DOC_TALLY: Record<ContractState, number> = { ok: 15, warn: 5, fail: 6, ramp: 1 }

export function rowTally(rows_: readonly ContractRow[]): Record<ContractState, number> {
  const t: Record<ContractState, number> = { ok: 0, warn: 0, fail: 0, ramp: 0 }
  for (const r of rows_) t[r.state] += 1
  return t
}

export function talliesDisagree(
  doc: Record<ContractState, number>,
  row: Record<ContractState, number>,
): boolean {
  return STATE_ORDER.some((k) => doc[k] !== row[k])
}

/** The design's own countNote — why the roll-up and the rows disagree. */
export function countNote(
  doc: Record<ContractState, number>,
  row: Record<ContractState, number>,
): string {
  const docSum = doc.ok + doc.warn + doc.fail + doc.ramp
  const rowSum = row.ok + row.warn + row.fail + row.ramp
  return (
    `The document states ✅ ${doc.ok} · ⚠️ ${doc.warn} · ❌ ${doc.fail} · ⏳ ${doc.ramp} = ${docSum}. ` +
    `Reading the per-layer tables row by row gives ✅ ${row.ok} · ⚠️ ${row.warn} · ❌ ${row.fail} · ⏳ ${row.ramp} = ${rowSum}. ` +
    'The gap traces to the parenthetical under the count, which records C-F1 going ⚠️→❌ and C-F3 going ' +
    '✅→⚠️ in an earlier round; the layer tables were then revised again (0.95.x) and the roll-up was not. ' +
    'This page shows the row states because the rows carry their evidence — but the document should reconcile ' +
    'the two, since a page that displays both is the only reason anyone noticed.'
  )
}

