/**
 * Minimal external store (Zustand substitute).
 * Zustand is not in FE deps — useSyncExternalStore + optional localStorage persist.
 */
import { useSyncExternalStore } from 'react'

type Listener = () => void

export function createExternalStore<T>(initial: T) {
  let state = initial
  const listeners = new Set<Listener>()

  function getState(): T {
    return state
  }

  function setState(partial: Partial<T> | ((prev: T) => T)) {
    const next =
      typeof partial === 'function' ? (partial as (prev: T) => T)(state) : { ...state, ...partial }
    if (Object.is(next, state)) return
    state = next
    listeners.forEach((l) => l())
  }

  function subscribe(listener: Listener): () => void {
    listeners.add(listener)
    return () => {
      listeners.delete(listener)
    }
  }

  function useStore(): T {
    return useSyncExternalStore(subscribe, getState, getState)
  }

  return { getState, setState, subscribe, useStore }
}

export function createPersistedStore<T extends object>(
  storageKey: string,
  initial: T,
  pickPersist: (state: T) => Partial<T>,
) {
  function load(): T {
    try {
      const raw = localStorage.getItem(storageKey)
      if (!raw) return initial
      const parsed = JSON.parse(raw) as Partial<T>
      return { ...initial, ...parsed }
    } catch {
      return initial
    }
  }

  const store = createExternalStore<T>(load())

  function persist() {
    try {
      localStorage.setItem(storageKey, JSON.stringify(pickPersist(store.getState())))
    } catch {
      // ignore quota / private mode
    }
  }

  const origSet = store.setState
  store.setState = (partial) => {
    origSet(partial)
    persist()
  }

  return store
}
