import type { OpenOrder } from '@/types/market'

function isOptionOrder(order: OpenOrder): boolean {
  const sec = (order.sec_type ?? '').toUpperCase()
  if (sec === 'OPT') return true
  if (order.contract_key && /:\d{8}:/.test(order.contract_key)) return true
  return false
}

export function partitionOpenOrders(orders: OpenOrder[]): {
  optOrders: OpenOrder[]
  stkOrders: OpenOrder[]
} {
  const optOrders: OpenOrder[] = []
  const stkOrders: OpenOrder[] = []
  for (const o of orders) {
    if (isOptionOrder(o)) optOrders.push(o)
    else stkOrders.push(o)
  }
  return { optOrders, stkOrders }
}
