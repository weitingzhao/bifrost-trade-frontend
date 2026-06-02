import {
  API_HEALTH_FETCH_TIMEOUT_MS,
  fetchDocsApiHealthAtOrigin,
  fetchHealthAtOrigin,
  fetchMassiveApiHealthAtOrigin,
  fetchOpsHealthAtOrigin,
  fetchResearchApiHealthAtOrigin,
  type ApiOriginBase,
} from '@/api/apiHealthProbes'
import { fetchMonitorHealth } from '@/api/monitor'
import {
  normalizeUtilizedServices,
  utilizedAllEnv,
  type UtilizedServiceRow,
} from '@/utils/utilizedServices'

export type EnvLamp = 'green' | 'red' | 'none'

interface MicroPorts {
  tradingPort: number
  strategyPort: number
  portfolioPort: number
  marketPort: number
  researchPort: number
}

type ProbeKind =
  | { kind: 'single'; origin: ApiOriginBase; microPorts: MicroPorts | null }
  | {
      kind: 'split'
      scheme: string
      host: string
      serverPort: number
      massivePort: number
      docsPort: number
      opsPort: number
      tradingPort: number
      strategyPort: number
      portfolioPort: number
      marketPort: number
      researchPort: number
    }

export interface ColumnPlan {
  display: string
  probe: ProbeKind
}

interface ServiceProbe {
  ok: boolean
  ts?: number
  base: string
}

interface ProbeResult {
  server: ServiceProbe
  massive: ServiceProbe
  docs: ServiceProbe
  ops: ServiceProbe
  trading: ServiceProbe
  strategy: ServiceProbe
  portfolio: ServiceProbe
  market: ServiceProbe
  research: ServiceProbe
}

export interface HealthProbeRow {
  label: string
  lamp: EnvLamp
  detail: string
}

export interface HealthGroupState {
  title: string
  rows: HealthProbeRow[]
}

export interface EnvColumnState {
  title: string
  display: string | null
  groups: HealthGroupState[]
  hint?: string
}

function trimEnv(s: string | undefined): string | undefined {
  const t = s?.trim()
  return t ? t.replace(/\/$/, '') : undefined
}

function lampFor(ok: boolean | null): EnvLamp {
  if (ok === true) return 'green'
  if (ok === false) return 'red'
  return 'none'
}

function microPortsFromHealth(h: Record<string, unknown> | undefined | null): MicroPorts | null {
  const n = (x: unknown): number | null =>
    typeof x === 'number' && Number.isFinite(x) ? x : null
  const tradingPort = n(h?.trading_port)
  const strategyPort = n(h?.strategy_port)
  const portfolioPort = n(h?.portfolio_port)
  const marketPort = n(h?.market_port)
  const researchPort = n(h?.research_port)
  if (
    tradingPort === null ||
    strategyPort === null ||
    portfolioPort === null ||
    marketPort === null ||
    researchPort === null
  ) {
    return null
  }
  return { tradingPort, strategyPort, portfolioPort, marketPort, researchPort }
}

function splitCorePortsFromHealth(h: Record<string, unknown> | undefined | null): {
  serverPort: number
  massivePort: number
  docsPort: number
  opsPort: number
} | null {
  const n = (x: unknown): number | null =>
    typeof x === 'number' && Number.isFinite(x) ? x : null
  const serverPort = n(h?.monitor_port)
  const massivePort = n(h?.massive_port)
  const docsPort = n(h?.docs_port)
  const opsPort = n(h?.ops_port)
  if (serverPort === null || massivePort === null || docsPort === null || opsPort === null) {
    return null
  }
  return { serverPort, massivePort, docsPort, opsPort }
}

function microserviceHealthBase(kind: ProbeKind, port: number): string {
  if (kind.kind === 'split') {
    return `${kind.scheme}://${kind.host}:${port}`
  }
  const o = kind.origin
  const raw =
    o && o.trim() !== ''
      ? o.includes('://')
        ? o
        : `http://${o}`
      : typeof window !== 'undefined'
        ? window.location.origin
        : 'http://127.0.0.1'
  try {
    const u = new URL(raw)
    const scheme = (u.protocol || 'http:').replace(':', '') || 'http'
    const host = u.hostname || '127.0.0.1'
    return `${scheme}://${host}:${port}`
  } catch {
    return `http://127.0.0.1:${port}`
  }
}

function researchProbeOrigin(kind: ProbeKind): string {
  const rp =
    kind.kind === 'split'
      ? kind.researchPort
      : kind.microPorts !== null
        ? kind.microPorts.researchPort
        : 0
  return microserviceHealthBase(kind, rp)
}

async function probeServices(kind: ProbeKind): Promise<ProbeResult> {
  const tmo = { timeoutMs: API_HEALTH_FETCH_TIMEOUT_MS }
  if (kind.kind === 'single') {
    const o = kind.origin
    const baseLabel = o === '' ? '(same origin as this app)' : o
    const mp = kind.microPorts
    if (mp === null) {
      const [sr, mr, dr, or_] = await Promise.allSettled([
        fetchHealthAtOrigin(o, tmo),
        fetchMassiveApiHealthAtOrigin(o, tmo),
        fetchDocsApiHealthAtOrigin(o, tmo),
        fetchOpsHealthAtOrigin(o, tmo),
      ])
      const dead = (base: string): ServiceProbe => ({
        ok: false,
        ts: undefined,
        base,
      })
      return {
        server: {
          ok: sr.status === 'fulfilled',
          ts: sr.status === 'fulfilled' ? sr.value.ts : undefined,
          base: baseLabel,
        },
        massive: {
          ok: mr.status === 'fulfilled',
          ts: mr.status === 'fulfilled' ? mr.value.ts : undefined,
          base: baseLabel,
        },
        docs: {
          ok: dr.status === 'fulfilled',
          ts: dr.status === 'fulfilled' ? dr.value.ts : undefined,
          base: baseLabel,
        },
        ops: {
          ok: or_.status === 'fulfilled',
          ts: or_.status === 'fulfilled' ? or_.value.ts : undefined,
          base: baseLabel,
        },
        trading: dead('(need trading_port etc. on GET /health)'),
        strategy: dead('(need trading_port etc. on GET /health)'),
        portfolio: dead('(need trading_port etc. on GET /health)'),
        market: dead('(need trading_port etc. on GET /health)'),
        research: dead('(need trading_port etc. on GET /health)'),
      }
    }
    const oRes = researchProbeOrigin(kind)
    const oTr = microserviceHealthBase(kind, mp.tradingPort)
    const oSt = microserviceHealthBase(kind, mp.strategyPort)
    const oPf = microserviceHealthBase(kind, mp.portfolioPort)
    const oMk = microserviceHealthBase(kind, mp.marketPort)
    const [sr, mr, dr, or, tr, st, pf, mk, rr] = await Promise.allSettled([
      fetchHealthAtOrigin(o, tmo),
      fetchMassiveApiHealthAtOrigin(o, tmo),
      fetchDocsApiHealthAtOrigin(o, tmo),
      fetchOpsHealthAtOrigin(o, tmo),
      fetchHealthAtOrigin(oTr, tmo),
      fetchHealthAtOrigin(oSt, tmo),
      fetchHealthAtOrigin(oPf, tmo),
      fetchHealthAtOrigin(oMk, tmo),
      fetchResearchApiHealthAtOrigin(oRes, tmo),
    ])
    return {
      server: {
        ok: sr.status === 'fulfilled',
        ts: sr.status === 'fulfilled' ? sr.value.ts : undefined,
        base: baseLabel,
      },
      massive: {
        ok: mr.status === 'fulfilled',
        ts: mr.status === 'fulfilled' ? mr.value.ts : undefined,
        base: baseLabel,
      },
      docs: {
        ok: dr.status === 'fulfilled',
        ts: dr.status === 'fulfilled' ? dr.value.ts : undefined,
        base: baseLabel,
      },
      ops: {
        ok: or.status === 'fulfilled',
        ts: or.status === 'fulfilled' ? or.value.ts : undefined,
        base: baseLabel,
      },
      trading: {
        ok: tr.status === 'fulfilled',
        ts: tr.status === 'fulfilled' ? tr.value.ts : undefined,
        base: oTr,
      },
      strategy: {
        ok: st.status === 'fulfilled',
        ts: st.status === 'fulfilled' ? st.value.ts : undefined,
        base: oSt,
      },
      portfolio: {
        ok: pf.status === 'fulfilled',
        ts: pf.status === 'fulfilled' ? pf.value.ts : undefined,
        base: oPf,
      },
      market: {
        ok: mk.status === 'fulfilled',
        ts: mk.status === 'fulfilled' ? mk.value.ts : undefined,
        base: oMk,
      },
      research: {
        ok: rr.status === 'fulfilled',
        ts: rr.status === 'fulfilled' ? rr.value.ts : undefined,
        base: oRes,
      },
    }
  }
  const {
    scheme,
    host,
    serverPort,
    massivePort,
    docsPort,
    opsPort,
    tradingPort,
    strategyPort,
    portfolioPort,
    marketPort,
    researchPort,
  } = kind
  const oS = `${scheme}://${host}:${serverPort}`
  const oM = `${scheme}://${host}:${massivePort}`
  const oD = `${scheme}://${host}:${docsPort}`
  const oO = `${scheme}://${host}:${opsPort}`
  const oTr = `${scheme}://${host}:${tradingPort}`
  const oSt = `${scheme}://${host}:${strategyPort}`
  const oPf = `${scheme}://${host}:${portfolioPort}`
  const oMk = `${scheme}://${host}:${marketPort}`
  const oR = `${scheme}://${host}:${researchPort}`
  const [sr, mr, dr, or, tr, st, pf, mk, rr] = await Promise.allSettled([
    fetchHealthAtOrigin(oS, tmo),
    fetchMassiveApiHealthAtOrigin(oM, tmo),
    fetchDocsApiHealthAtOrigin(oD, tmo),
    fetchOpsHealthAtOrigin(oO, tmo),
    fetchHealthAtOrigin(oTr, tmo),
    fetchHealthAtOrigin(oSt, tmo),
    fetchHealthAtOrigin(oPf, tmo),
    fetchHealthAtOrigin(oMk, tmo),
    fetchResearchApiHealthAtOrigin(oR, tmo),
  ])
  return {
    server: {
      ok: sr.status === 'fulfilled',
      ts: sr.status === 'fulfilled' ? sr.value.ts : undefined,
      base: oS,
    },
    massive: {
      ok: mr.status === 'fulfilled',
      ts: mr.status === 'fulfilled' ? mr.value.ts : undefined,
      base: oM,
    },
    docs: {
      ok: dr.status === 'fulfilled',
      ts: dr.status === 'fulfilled' ? dr.value.ts : undefined,
      base: oD,
    },
    ops: {
      ok: or.status === 'fulfilled',
      ts: or.status === 'fulfilled' ? or.value.ts : undefined,
      base: oO,
    },
    trading: {
      ok: tr.status === 'fulfilled',
      ts: tr.status === 'fulfilled' ? tr.value.ts : undefined,
      base: oTr,
    },
    strategy: {
      ok: st.status === 'fulfilled',
      ts: st.status === 'fulfilled' ? st.value.ts : undefined,
      base: oSt,
    },
    portfolio: {
      ok: pf.status === 'fulfilled',
      ts: pf.status === 'fulfilled' ? pf.value.ts : undefined,
      base: oPf,
    },
    market: {
      ok: mk.status === 'fulfilled',
      ts: mk.status === 'fulfilled' ? mk.value.ts : undefined,
      base: oMk,
    },
    research: {
      ok: rr.status === 'fulfilled',
      ts: rr.status === 'fulfilled' ? rr.value.ts : undefined,
      base: oR,
    },
  }
}

export async function resolveApiHealthColumnPlans(): Promise<{
  dev: ColumnPlan | null
  prod: ColumnPlan | null
  utilizedServices: UtilizedServiceRow[]
}> {
  const devEnv = trimEnv(import.meta.env.VITE_DEV_API_ORIGIN as string | undefined)
  const prodEnv = trimEnv(import.meta.env.VITE_PROD_API_ORIGIN as string | undefined)
  if (devEnv && prodEnv) {
    let utilizedServices: UtilizedServiceRow[] = []
    let microPorts: MicroPorts | null = null
    try {
      const h = await fetchMonitorHealth()
      utilizedServices = normalizeUtilizedServices(h.utilized_services)
      microPorts = microPortsFromHealth(h)
    } catch {
      /* monitor unreachable */
    }
    return {
      dev: { display: devEnv, probe: { kind: 'single', origin: devEnv, microPorts } },
      prod: { display: prodEnv, probe: { kind: 'single', origin: prodEnv, microPorts } },
      utilizedServices,
    }
  }

  try {
    const h = await fetchMonitorHealth()
    const mhRes = await fetch(
      `${import.meta.env.VITE_API_MASSIVE as string}/research/massive/health`,
      { signal: AbortSignal.timeout(API_HEALTH_FETCH_TIMEOUT_MS) },
    ).catch(() => null)
    const mh =
      mhRes?.ok === true
        ? ((await mhRes.json().catch(() => null)) as Record<string, unknown> | null)
        : null

    const utilizedServices = normalizeUtilizedServices(h.utilized_services)
    const hRec = h
    const prof = (mh?.config_profile ?? hRec.config_profile) as string | undefined
    const effectiveProdStack =
      prof === 'prod' || (prof == null && utilizedAllEnv(utilizedServices, 'prod'))
    const pub = trimEnv(hRec.frontend_public_origin as string | undefined)
    const cfgDev = trimEnv(hRec.frontend_dev_path as string | undefined)
    const cfgProd = trimEnv(hRec.frontend_prod_path as string | undefined)
    const microPorts = microPortsFromHealth(hRec)
    const splitCore = splitCorePortsFromHealth(hRec)
    const noYamlPaths = cfgDev == null && cfgProd == null

    let dev: ColumnPlan | null = null
    if (devEnv) {
      dev = { display: devEnv, probe: { kind: 'single', origin: devEnv, microPorts } }
    } else if (cfgDev) {
      if (splitCore && microPorts) {
        try {
          const raw = cfgDev.includes('://') ? cfgDev : `http://${cfgDev}`
          const u = new URL(raw)
          const scheme = (u.protocol || 'http:').replace(':', '') || 'http'
          const host = u.hostname
          if (!host) throw new Error('no host')
          dev = {
            display: cfgDev.replace(/\/$/, ''),
            probe: {
              kind: 'split',
              scheme,
              host,
              serverPort: splitCore.serverPort,
              massivePort: splitCore.massivePort,
              docsPort: splitCore.docsPort,
              opsPort: splitCore.opsPort,
              tradingPort: microPorts.tradingPort,
              strategyPort: microPorts.strategyPort,
              portfolioPort: microPorts.portfolioPort,
              marketPort: microPorts.marketPort,
              researchPort: microPorts.researchPort,
            },
          }
        } catch {
          const o = cfgDev.replace(/\/$/, '')
          dev = { display: o, probe: { kind: 'single', origin: o, microPorts } }
        }
      } else {
        const o = cfgDev.replace(/\/$/, '')
        dev = { display: o, probe: { kind: 'single', origin: o, microPorts } }
      }
    } else if (noYamlPaths && prof === 'dev') {
      dev = {
        display: pub || 'Same as this app',
        probe: { kind: 'single', origin: pub ?? '', microPorts },
      }
    }

    let prod: ColumnPlan | null = null
    if (prodEnv) {
      prod = { display: prodEnv, probe: { kind: 'single', origin: prodEnv, microPorts } }
    } else if (cfgProd) {
      const o = cfgProd.replace(/\/$/, '')
      prod = { display: o, probe: { kind: 'single', origin: o, microPorts } }
    } else if (effectiveProdStack && !prodEnv && !cfgProd) {
      prod = {
        display: pub || 'Same as this app',
        probe: { kind: 'single', origin: pub ?? '', microPorts },
      }
    }

    return { dev, prod, utilizedServices }
  } catch {
    return {
      dev: devEnv ? { display: devEnv, probe: { kind: 'single', origin: devEnv, microPorts: null } } : null,
      prod: prodEnv ? { display: prodEnv, probe: { kind: 'single', origin: prodEnv, microPorts: null } } : null,
      utilizedServices: [],
    }
  }
}

export function buildEnvColumn(
  title: string,
  display: string | null,
  probe: ProbeResult | null,
): EnvColumnState {
  if (display === null) {
    return {
      title,
      display: null,
      groups: [],
      hint:
        title === 'Development'
          ? 'Set VITE_DEV_API_ORIGIN or open this UI against a dev server so the Development column can probe.'
          : 'Set VITE_PROD_API_ORIGIN or open this UI against a prod server so the Production column can probe.',
    }
  }
  if (!probe) {
    return { title, display, groups: [] }
  }
  const row = (label: string, p: ServiceProbe, failPath: string): HealthProbeRow => ({
    label,
    lamp: lampFor(p.ok),
    detail: p.ok
      ? `ts ${p.ts ?? '—'} · ${p.base}`
      : `${failPath} (unreachable or timed out) · ${p.base}`,
  })
  const groups: HealthGroupState[] = [
    {
      title: 'Architecture',
      rows: [
        row('Monitor', probe.server, 'GET /health failed'),
        row('Ops API', probe.ops, 'GET /ops/health failed'),
        row('Docs API', probe.docs, 'GET /health failed'),
      ],
    },
    {
      title: 'Account',
      rows: [
        row('Trading API', probe.trading, 'GET /health failed'),
        row('Portfolio API', probe.portfolio, 'GET /health failed'),
      ],
    },
    {
      title: 'Research',
      rows: [
        row('Research API', probe.research, 'GET /health failed'),
        row('Market API', probe.market, 'GET /health failed'),
        row('Strategy API', probe.strategy, 'GET /health failed'),
      ],
    },
    {
      title: 'Feed',
      rows: [row('Massive API', probe.massive, 'GET /research/massive/health failed')],
    },
  ]
  return { title, display, groups }
}

export async function probeApiHealthColumn(plan: ColumnPlan | null): Promise<ProbeResult | null> {
  if (!plan) return null
  return probeServices(plan.probe)
}
