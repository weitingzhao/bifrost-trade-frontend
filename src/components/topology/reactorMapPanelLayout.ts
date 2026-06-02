import { TOPOLOGY_VIEWBOX_HEIGHT, TOPOLOGY_VIEWBOX_WIDTH } from './serviceTopologyUi'

/** Resize bar + docked panel toolbar (px). */
export const REACTOR_PANEL_CHROME_PX = 32

/** Reactor Map header + legend inside ServiceTopologyOverview (px). */
export const REACTOR_OVERVIEW_CHROME_PX = 52

export const REACTOR_PANEL_MIN_HEIGHT = 280

/** Max panel height when user drags resize handle. */
export function reactorPanelMaxHeight(viewportHeight = window.innerHeight): number {
  return Math.floor(viewportHeight * 0.92)
}

/**
 * Default open height for a layout viewBox at `contentWidth`.
 * Pass viewBox height/width when using non-default topology layouts.
 */
export function idealReactorPanelHeight(
  contentWidth: number,
  viewportHeight = window.innerHeight,
  viewBoxWidth = TOPOLOGY_VIEWBOX_WIDTH,
  viewBoxHeight = TOPOLOGY_VIEWBOX_HEIGHT,
): number {
  if (contentWidth <= 0) return REACTOR_PANEL_MIN_HEIGHT
  const canvasH = contentWidth * (viewBoxHeight / viewBoxWidth)
  const raw = Math.round(canvasH + REACTOR_PANEL_CHROME_PX + REACTOR_OVERVIEW_CHROME_PX)
  const maxH = reactorPanelMaxHeight(viewportHeight)
  return Math.max(REACTOR_PANEL_MIN_HEIGHT, Math.min(maxH, raw))
}
