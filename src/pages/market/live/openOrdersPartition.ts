import type { OpenOrder } from '@/types/market'

export function partitionOpenOrders(orders: OpenOrder[]): {
  optOrders: OpenOrder[]
  stkOrders: OpenOrder[]
} {
  const optOrders: OpenOrder[] = []
  const stkOrders: OpenOrder[] = []
  for (const order of orders) {
    if ((order.sec_type ?? '').toUpperCase() === 'OPT') {
      optOrders.push(order)
    } else {
      stkOrders.push(order)
    }
  }
  return { optOrders, stkOrders }
}
