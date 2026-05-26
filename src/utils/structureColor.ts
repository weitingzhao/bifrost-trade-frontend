/**
 * Derives a deterministic hue from a structure name and returns
 * inline style objects for active/inactive chip states.
 */

function structureHue(name: string): number {
  let h = 0
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0
  return h % 360
}

export function structureChipStyle(name: string, active: boolean): React.CSSProperties {
  const hue = structureHue(name)
  if (active) {
    return {
      borderColor: `hsl(${hue} 78% 52%)`,
      background: `hsl(${hue} 85% 20% / 0.42)`,
      color: `hsl(${hue} 96% 78%)`,
    }
  }
  return {
    borderColor: 'transparent',
    background: 'transparent',
    color: `hsl(${hue} 70% 70%)`,
  }
}
