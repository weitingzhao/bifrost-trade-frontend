/**
 * Trading Copilot — `/research/copilot/trading`, a Copilot-seat page about the book.
 *
 * Level 2 for the book, given a front door.
 *
 * The capability has been shipping for a while and was impossible to find:
 * ten read-only `trade.*` tools and a portfolio persona, reachable only by
 * already knowing what to type into a floating panel. This page is that
 * capability written down — the book as it stands right now, the questions
 * worth asking about it, the tools each answer will come from, and the line
 * the Copilot cannot cross.
 *
 * It reads. D10 freezes execution: nothing here places, modifies or cancels
 * anything, and none of the tools it names could if asked.
 */
import { Link } from 'react-router-dom'
import { AlertOctagon, MessageCircle, ShieldCheck } from 'lucide-react'
import { PageHeader, PageShell } from '@/components/layout'
import { DenseTag } from '@/components/data-display'
import { Skeleton } from '@/components/ui/skeleton'
import { useCopilotPromptLang } from '@/lib/copilot/promptLang'
import { CopilotPromptLangToggle } from '@/components/cockpit/CopilotPromptLangToggle'
import { useMonitorStatus } from '@/hooks/useMonitorStatus'
import { useGateSafetyList } from '@/hooks/useGateSafety'
import { useExecutionsFinal } from '@/hooks/useExecutions'
import { useCopilotTools } from '@/hooks/useCopilotTools'
import { askCopilotIntentStore } from '@/store/askCopilotIntentStore'
import { copilotViewStore } from '@/store/copilotViewStore'
import {
  TRADE_QUESTION_GROUPS,
  questionsFor,
  type TradeQuestion,
} from '@/lib/copilot/tradePrompts'

const ORIGIN = 'trading-copilot'

export default function TradingCopilotPage() {
  const [lang] = useCopilotPromptLang()
  const status = useMonitorStatus()
  const gates = useGateSafetyList()
  const execs = useExecutionsFinal()
  const toolsQ = useCopilotTools()

  const accounts = status.data?.portfolio.accounts ?? []
  const positions = accounts.reduce((n, a) => n + (a.positions?.length ?? 0), 0)
  const openOrders = status.data?.portfolio.open_orders?.length ?? 0
  const activeGates = (gates.data?.items ?? []).filter((g) => g.is_active).length
  const totalGates = gates.data?.items?.length ?? 0
  const fills = execs.data?.items?.length ?? 0

  const registry = toolsQ.data?.tools ?? []
  const known = new Set(registry.map((t) => t.name))
  const tradeTools = registry.filter((t) => t.domain === 'trade')

  function ask(q: TradeQuestion) {
    copilotViewStore.unsuppress()
    askCopilotIntentStore.open({
      originPage: ORIGIN,
      originLabel: lang === 'zh' ? '交易副驾' : 'Trading Copilot',
      snapshot: {
        accounts: accounts.length,
        positions,
        open_orders: openOrders,
        active_gates: activeGates,
        recent_fills: fills,
      },
      suggestedPrompt: q.prompt[lang],
    })
  }

  return (
    <PageShell padding="default" className="min-w-0 space-y-3 overflow-x-hidden">
      <PageHeader
        title="Trading Copilot"
        description="Ask about the book — positions, risk, gates, executions, instances. It reads and explains; it never places, modifies or cancels. D10 BLOCKED."
        actions={<CopilotPromptLangToggle />}
      />

      <section className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <BookFact
          label={lang === 'zh' ? '持仓' : 'The book'}
          value={status.isLoading ? null : String(positions)}
          sub={`${accounts.length} ${accounts.length === 1 ? 'account' : 'accounts'}`}
          to="/portfolio/positions"
        />
        <BookFact
          label={lang === 'zh' ? '在途委托' : 'Open orders'}
          value={status.isLoading ? null : String(openOrders)}
          sub={openOrders === 0 ? 'nothing working' : 'placed by hand'}
          to="/market/live"
        />
        <BookFact
          label={lang === 'zh' ? '生效门控' : 'Gates armed'}
          value={gates.isLoading ? null : String(activeGates)}
          sub={`of ${totalGates} configured`}
          to="/strategy/gates"
        />
        <BookFact
          label={lang === 'zh' ? '成交记录' : 'Executions'}
          value={execs.isLoading ? null : String(fills)}
          sub="in the ledger"
          to="/portfolio/ledger"
        />
      </section>

      <section className="grid gap-3 md:grid-cols-2">
        {TRADE_QUESTION_GROUPS.map((group) => (
          <div key={group.id} className="rounded-lg border border-border bg-secondary/40 px-4 py-3">
            <h2 className="text-dense-body font-semibold">{group.label[lang]}</h2>
            <p className="text-dense-label text-muted-foreground">{group.lead[lang]}</p>
            <ul className="mt-2 space-y-2">
              {questionsFor(group.id).map((q) => {
                const missing = q.tools.filter((t) => known.size > 0 && !known.has(t))
                return (
                  <li key={q.id}>
                    <button
                      type="button"
                      onClick={() => ask(q)}
                      title={q.prompt[lang]}
                      className="flex w-full items-start gap-2 rounded-md border border-border/60 bg-background px-2.5 py-1.5 text-left transition-colors hover:border-primary/40 hover:bg-primary/[0.06]"
                    >
                      <MessageCircle className="mt-0.5 size-3.5 shrink-0 text-primary" aria-hidden />
                      <span className="min-w-0 flex-1">
                        <span className="block text-dense-body">{q.label[lang]}</span>
                        <span className="mt-0.5 flex flex-wrap gap-1">
                          {q.tools.map((t) => (
                            <span
                              key={t}
                              className="font-mono text-dense-micro text-muted-foreground"
                              title={registry.find((r) => r.name === t)?.description ?? t}
                            >
                              {t}
                            </span>
                          ))}
                        </span>
                      </span>
                    </button>
                    {missing.length ? (
                      <p className="mt-0.5 text-dense-micro text-warning">
                        Not in the registry on this backend: {missing.join(', ')}
                      </p>
                    ) : null}
                  </li>
                )
              })}
            </ul>
          </div>
        ))}
      </section>

      <section className="rounded-lg border border-border bg-secondary/40 px-4 py-3">
        <h2 className="flex flex-wrap items-center gap-2 text-dense-body font-semibold">
          <ShieldCheck className="size-4 text-success" />
          What it can read
          {toolsQ.data ? (
            <DenseTag variant="neutral" size="cell">
              {tradeTools.length} trade tools · {toolsQ.data.count} in all
            </DenseTag>
          ) : null}
        </h2>
        <p className="text-dense-label text-muted-foreground">
          Read from the tool registry that answers the calls, not from a list kept on this side — so
          this page cannot promise a capability the backend does not have.
        </p>
        {toolsQ.isLoading ? (
          <Skeleton className="mt-2 h-24 w-full" />
        ) : toolsQ.isError ? (
          <p className="mt-2 text-dense-label text-destructive">
            Tool registry unavailable — research-api :8795. The questions above still work; their
            sources just cannot be confirmed from here.
          </p>
        ) : (
          <dl className="mt-2 grid gap-x-6 gap-y-1.5 md:grid-cols-2">
            {tradeTools.map((t) => (
              <div key={t.name} className="min-w-0">
                <dt className="font-mono text-dense-caption text-foreground">{t.name}</dt>
                <dd className="text-dense-label leading-snug text-muted-foreground">{t.description}</dd>
              </div>
            ))}
          </dl>
        )}
      </section>

      <section className="rounded-lg border border-warning/40 bg-warning/[0.06] px-4 py-3">
        <h2 className="flex items-center gap-2 text-dense-body font-semibold">
          <AlertOctagon className="size-4 text-warning" />
          What it cannot do
        </h2>
        <p className="mt-1 text-dense-label leading-relaxed text-muted-foreground">
          Every tool above is a read. The Copilot cannot place, modify or cancel an order, arm a
          daemon, or write to the trade database — not because the page hides those buttons, but
          because decision <span className="font-mono">D10</span> freezes trade execution and the
          agent guard reads that decision at call time. The unattended level of the trading system
          stays switched off until the freeze is lifted deliberately.{' '}
          <Link to="/research/overview" className="hover:underline">
            The three levels, side by side
          </Link>
          .
        </p>
      </section>
    </PageShell>
  )
}

function BookFact({
  label,
  value,
  sub,
  to,
}: {
  label: string
  value: string | null
  sub: string
  to: string
}) {
  return (
    <Link
      to={to}
      className="rounded-lg border border-border bg-secondary/40 px-4 py-3 transition-colors hover:border-primary/40"
    >
      <div className="text-dense-meta uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="mt-1 flex flex-wrap items-baseline gap-2">
        {value == null ? (
          <Skeleton className="h-6 w-12" />
        ) : (
          <span className="font-mono text-lg font-semibold tabular-nums">{value}</span>
        )}
        <span className="text-dense-label text-muted-foreground">{sub}</span>
      </div>
    </Link>
  )
}
