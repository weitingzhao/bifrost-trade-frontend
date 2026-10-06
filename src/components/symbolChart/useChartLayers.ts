/**
 * The price chart's layer switches (design K-LINE-SPEC §8): Levels and Trades
 * on, BB · MACD · RSI off, remembered on this machine under
 * `bifrost.chart.layers`. A display preference, not a reading.
 */
import { useCallback, useState } from 'react'

export interface ChartLayers {
  levels: boolean
  trades: boolean
  bb: boolean
  macd: boolean
  rsi: boolean
}

const KEY = 'bifrost.chart.layers'
export const DEFAULT_LAYERS: ChartLayers = { levels: true, trades: true, bb: false, macd: false, rsi: false }

function readLayers(): ChartLayers {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) ?? '{}') as Partial<Record<keyof ChartLayers, unknown>>
    const out = { ...DEFAULT_LAYERS }
    for (const k of Object.keys(DEFAULT_LAYERS) as (keyof ChartLayers)[])
      if (typeof raw[k] === 'boolean') out[k] = raw[k] as boolean
    return out
  } catch {
    return { ...DEFAULT_LAYERS }
  }
}

export function useChartLayers(): [ChartLayers, (k: keyof ChartLayers, on: boolean) => void] {
  const [layers, setLayers] = useState<ChartLayers>(readLayers)
  const set = useCallback((k: keyof ChartLayers, on: boolean) => {
    setLayers((prev) => {
      const next = { ...prev, [k]: on }
      try {
        localStorage.setItem(KEY, JSON.stringify(next))
      } catch {
        // Private mode or blocked storage: the switch still applies for this visit.
      }
      return next
    })
  }, [])
  return [layers, set]
}
