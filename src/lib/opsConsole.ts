/** Bifrost Ops Console — the control plane's own UI, opened in a new tab. */
export const OPS_CONSOLE_URL = import.meta.env.VITE_OPS_CONSOLE_URL ?? 'http://127.0.0.1:5180'

/**
 * One Ops Console view. The console routes by hash (`#satellite-bus`), and
 * the names are its own (`console/src/lib/consoleNavConfig.ts`).
 */
export function opsConsoleHref(view: string): string {
  return `${OPS_CONSOLE_URL.replace(/\/$/, '')}/#${view}`
}
