/**
 * The Copilot conversation, as the rest of the app asks for it.
 *
 * This replaces `useCopilotDock`. The dock was a right-hand column of its own
 * — 440 wide, its own push threshold, its own storage, its own open/close —
 * and §5a.8's seventeenth round collapsed every such column into the shell's
 * one side panel. The conversation is now a **surface** like the Watchlist or
 * a run: it lives in the panel by default, it can be sent to a float, it
 * cannot be a page, and the same `▢ ⇥ ⤢ ×` in the panel header move it.
 *
 * What retires with the dock:
 *
 * - **the wide (760) tier** — size belongs to the float now, and a float you
 *   drag remembers more than two tiers ever did;
 * - **`sessionsOpen`** — storage for an in-dock sessions rail that was
 *   removed long ago and that nothing read;
 * - **`bifrost.copilot.dock.*`** — the open flag lives in `bifrost.panel`
 *   with every other surface, which is the whole point of one model.
 *
 * Twelve callers asked the dock to open. They ask this instead, so none of
 * them has to know what a surface is.
 */
import { writeJson } from '@/lib/localStore'
import { isVisible, openSurface, placeOf, threadSurface, useSurfaces } from '@/layout/equipSurface'
import { dismissSurface, toggleSurfaceFrom } from '@/layout/equipMotion'

// The dock's own keys, cleared rather than left to rot — the same courtesy
// the design pays `bifrost.drawer`. `bubble.*` is older still: the floating
// card this became a dock to escape. A key nothing reads is a trap for
// whoever next greps for it.
for (const key of [
  'bifrost.copilot.dock.open',
  'bifrost.copilot.dock.wide',
  'bifrost.copilot.dock.sessions',
  'bifrost.copilot.bubble.open',
  'bifrost.copilot.bubble.position',
]) {
  writeJson(key, null)
}

/** Open it where it was last put — the panel, unless you moved it. */
export function openThread(): void {
  openSurface(threadSurface())
}

/**
 * The top bar's Ask button and ⌘J, which are the same gesture.
 *
 * Visible → close · open but behind another tab → bring it forward · not open
 * → open it. One click covers all three, and the button's lit state means
 * "open", with the tooltip saying where. Given the button, the conversation
 * opens out of it and closes back into it; ⌘J has no button and rises in place.
 */
export function toggleThread(from?: Element | null): void {
  toggleSurfaceFrom(threadSurface(), from)
}

/** The conversation's own close — a close the reader asked for, so it animates. */
export function closeThread(): void {
  dismissSurface('thread')
}

/** Open anywhere, in front or behind — what lights the top bar's button. */
export function threadIsOpen(): boolean {
  return placeOf('thread') != null
}

/** Open *and* in front. */
export function threadIsVisible(): boolean {
  return isVisible('thread')
}

/** Subscribed state for a component that draws the button. */
export function useThread(): { open: boolean; place: 'float' | 'panel' | null } {
  useSurfaces()
  return { open: threadIsOpen(), place: placeOf('thread') }
}
