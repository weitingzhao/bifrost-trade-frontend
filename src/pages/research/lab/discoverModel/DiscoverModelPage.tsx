/**
 * Discover model — the vocabulary behind the Discover menu (design
 * `System Data Discover Model.dc.html`, rev 2026-09-20.4).
 *
 * A System › Data reference, not a reading: it answers why Ratings and
 * Screener are two things, in the industry's own words, and how Bifrost's
 * pages map onto the three verbs. The design wrote it in Chinese and it stays
 * verbatim — this is the design's own document, and 文档中英不限.
 *
 * No data behind it by design; the one live thing on the page is the METHOD
 * badge's promise, which is D10's.
 */
import { PageShell } from '@/components/layout'
import { cn } from '@/lib/utils'

const h2 = 'mb-2.5 mt-0 type-section font-semibold tracking-[-0.005em] text-foreground'
const p = 'm-0 text-dense-body leading-[1.65] text-secondary-foreground text-pretty'
const th =
  'border-b border-border bg-[var(--sk-raised2)] px-3 py-1.5 text-left text-dense-caption font-semibold uppercase tracking-[0.08em] text-muted-foreground'
const td =
  'border-b border-border/55 px-3 py-2 align-top text-dense-body leading-[1.55] text-secondary-foreground'
const strong = 'font-semibold text-foreground'

const VERBS = [
  {
    verb: 'Rank',
    q: '模型今天看好什么？',
    who: (
      <>
        <span className={strong}>Ratings / Rankings / Ideas</span>。Zacks Rank、Morningstar
        星级、Seeking Alpha Quant Rating、TipRanks Smart Score、thinkorswim Sizzle Index、Bloomberg
        ANR。用户不定义模型，消费一个分数，再点进去看「为什么」。
      </>
    ),
    trust: '不透明但可解释：每个分数必须能拆到因子贡献；模型本身要有 out-of-sample 记录。',
    dim: false,
  },
  {
    verb: 'Screen',
    q: '满足这些条件的有哪些？',
    who: (
      <>
        <span className={strong}>Screener</span>。Finviz、TradingView Screener、Bloomberg
        EQS、Koyfin、Barchart；期权侧 Market Chameleon、OptionSamurai、Barchart Options
        Screener（DTE / Δ / IV rank / ROI / 概率 / earnings）。
      </>
    ),
    trust: '完全透明、确定性：同一条件同一数据必得同一集合。可命名、可保存、可复跑、可回测。',
    dim: false,
  },
  {
    verb: 'Alert',
    q: 'X 发生时告诉我。',
    who: (
      <>
        <span className={strong}>Scan / Alerts</span>。thinkorswim Scan 与 Alerts、Trade
        Ideas、TradingView Alerts。「Scan」在业界指持续/盘中运行的条件监控，不是一张每日物化的表。
      </>
    ),
    trust: '时间维度：条件 + 触发。产物是事件，不是列表。',
    dim: false,
  },
  {
    verb: 'Search',
    q: '找一个我已知的代码。',
    who: <>任何终端的 ⌘K / 顶栏搜索。不是 Discover 的一部分——Bifrost 里是 Omnibar。</>,
    trust: '—',
    dim: true,
  },
]

const RULES = [
  {
    cap: 'Screen → Rank',
    body: '先用确定性条件缩 universe，再让模型给剩下的排序。这是最常见的路径：「FCF 为正 · 无 10 天内财报」之后按 vol 模型排。Screener 结果表右上「Rank by」选模型。',
  },
  {
    cap: 'Rank → Screen',
    body: '先看模型 top 20，再用条件剔除不能交易的（流动性、财报、已持仓）。Ratings 表顶部「Filter by saved screen」。',
  },
  {
    cap: '两者都是对象',
    body: '一个 Screen 是一组条件；一个 Model 是一组权重。都可命名、版本化、回测（这个筛子历史上跑赢了吗）、交给 daemon 每天跑（Autopilot objective）。Outcome 归因按 source 回读它们。',
  },
  {
    cap: '两个资产层级',
    body: '股票层（公司好不好）和标的/合约层（权利金值不值得卖）是两套模型、两套条件目录。页面形状相同，切换资产层级，不新开页面。',
  },
]

const MAP = [
  {
    to: 'Ratings › Stocks',
    from: 'Stock Explorer 的 SEPA · Momentum tab；SEPA Daily Core；Momentum Radar',
    what: '股票模型：Trend template 11 条 + Growth 8 条 + Momentum 等级 → stage / path / composite。页面形状 = Ratings › Underlyings：权重可动、Tape、排序表、Why 面板。',
    proto: '已建',
  },
  {
    to: 'Ratings › Underlyings',
    from: 'Option Scan',
    what: '波动率模型：IV rank · VRP · Slope · Pin · Terrain 五因子 → composite。已有原型，只改名。',
    proto: '有',
  },
  {
    to: 'Screener › Stocks',
    from: 'Stock Screener + Explorer 的 Rules tab',
    what: '67 条条件的漏斗。预设只是起点，不再假装是模型；结果表加「Rank by」接模型。已有原型，改标题。',
    proto: '有',
  },
  {
    to: 'Screener › Contracts',
    from: 'Option Screener',
    what: '合约层条件：结构 · DTE · Δ · P(ITM) · 年化 · spread · OI · earnings。来源可接 Ratings 的 top N 或 Screener › Stocks 的结果。已有原型。',
    proto: '有',
  },
  {
    to: 'Alerts',
    from: 'Event Radar + Autopilot objectives 的触发',
    what: '时间层：财报 / 新闻 / 主题日历，加「某个 Screen 或 Rating 变化时通知」。Autopilot objective 就是一个定时跑的 Screen+Rank，其 draft 是 Alert 的一种。',
    proto: '保留',
  },
]

export default function DiscoverModelPage() {
  return (
    <PageShell padding="compact">
      <article className="mx-auto flex max-w-[65rem] flex-col gap-8 px-2 pb-16 pt-6">
        <header className="flex flex-col gap-2.5 border-b border-border pb-5">
          <div className="flex flex-wrap items-center gap-2 font-mono text-dense-caption tracking-[0.05em]">
            <span
              className="inline-flex items-center gap-1.5 border py-0.5 text-[var(--sk-accent)] mat-tag"
              title="Method face — vocabulary and structure only. No order can be placed from here."
            >
              ◆ METHOD · NO ORDERS
            </span>
            <span className="text-muted-foreground">Discover · 词表与结构</span>
          </div>
          <h1 className="m-0 type-hero font-semibold tracking-[-0.01em]">
            Rank · Screen · Alert：选股与选合约的三个动词
          </h1>
          <p className={cn(p, 'max-w-[52rem] type-section')}>
            你的理解是对的：Explorer 是模型给评级，Screener
            是自己定条件。行业里这两件事一直分开，因为它们的信任模型不同——评级要能解释「为什么」，筛选要能保证「确定性」。之前把两者压成一页（预设
            = 模型）是把区别抹掉了，现在拆回来，并把第三个动词补上。
          </p>
        </header>

        <section>
          <h2 className={h2}>01 · 行业怎么分</h2>
          <div className="overflow-x-auto border mat-card">
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <th className={cn(th, 'w-[6.875rem]')}>动词</th>
                  <th className={cn(th, 'w-[13.75rem]')}>回答的问题</th>
                  <th className={th}>业界叫法与例子</th>
                  <th className={cn(th, 'w-[12.5rem]')}>信任模型</th>
                </tr>
              </thead>
              <tbody>
                {VERBS.map((v) => (
                  <tr key={v.verb}>
                    <td
                      className={cn(
                        td,
                        'font-semibold',
                        v.dim ? 'text-muted-foreground' : 'text-foreground'
                      )}
                    >
                      {v.verb}
                    </td>
                    <td className={cn(td, v.dim && 'text-muted-foreground')}>{v.q}</td>
                    <td className={cn(td, v.dim && 'text-muted-foreground')}>{v.who}</td>
                    <td className={cn(td, v.dim && 'text-muted-foreground')}>{v.trust}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className={cn(p, 'mt-2.5 text-dense-label text-muted-foreground')}>
            「Explorer」不建议用：Bloomberg 用它指浏览目录，TradingView / Finviz
            不用它，含义最模糊。「Scan」留给 Alert 层。
          </p>
        </section>

        <section>
          <h2 className={h2}>02 · 量化用户的组合规则</h2>
          <div className="grid grid-cols-[repeat(auto-fit,minmax(15rem,1fr))] gap-2.5">
            {RULES.map((r) => (
              <div
                key={r.cap}
                className="border px-3 py-2.5 mat-card"
              >
                <div className="text-dense-caption font-semibold uppercase tracking-[0.1em] text-muted-foreground">
                  {r.cap}
                </div>
                <p className={cn(p, 'mt-1 text-dense-label')}>{r.body}</p>
              </div>
            ))}
          </div>
        </section>

        <section>
          <h2 className={h2}>03 · Bifrost 的映射</h2>
          <div className="overflow-x-auto border mat-card">
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <th className={cn(th, 'w-[12.5rem]')}>新结构 · Discover</th>
                  <th className={cn(th, 'w-[13.75rem]')}>来自</th>
                  <th className={th}>是什么</th>
                  <th className={cn(th, 'w-[5.625rem]')}>原型</th>
                </tr>
              </thead>
              <tbody>
                {MAP.map((m) => (
                  <tr key={m.to}>
                    <td className={cn(td, 'font-semibold text-foreground')}>{m.to}</td>
                    <td className={td}>{m.from}</td>
                    <td className={td}>{m.what}</td>
                    <td className={td}>{m.proto}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className={cn(p, 'mt-2.5 text-dense-label text-muted-foreground')}>
            回答上一个问题——Option Scan 和 Contract Screener 为什么不合并：因为一个是 Rank，一个是
            Screen，动词不同；它们的关系是「Rank 的输出可以做 Screen 的输入」，用 Contracts
            页顶部的来源选择器表达，而不是合成一页。Stock Explorer 和 Stock Screener
            之所以合并，是因为 Explorer 的 Rules tab 本来就是 Screen——真正属于 Rank 的 SEPA /
            Momentum 两个 tab 现在拆出去成 Ratings › Stocks。
          </p>
        </section>

        <section className="rounded-lg border border-[color-mix(in_srgb,var(--sk-accent)_40%,transparent)] bg-[rgb(var(--sk-accent-rgb)/0.05)] px-5 py-4">
          <h2 className={h2}>04 · 下一步</h2>
          <p className={cn(p, 'type-section text-foreground')}>
            <span className={strong}>Ratings › Stocks</span> 已建（与 Underlyings
            同一形状）。剩下的是在两个 Screener 结果表加「Rank by」、两个 Ratings 表加「Filter by
            screen」，把组合规则接通。菜单已按新词表改好。
          </p>
        </section>
      </article>
    </PageShell>
  )
}
