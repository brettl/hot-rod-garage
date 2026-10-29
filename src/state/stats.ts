import { PARTS } from '../data/parts'
import type { Stats } from '../types'

export function computeStats(baseStats: Stats, installedPartIds: string[]): Stats {
  const result: Stats = { ...baseStats }

  for (const partId of installedPartIds) {
    const part = PARTS.find(p => p.id === partId)
    if (!part) continue

    for (const key of Object.keys(part.statModifiers) as (keyof Stats)[]) {
      result[key] += part.statModifiers[key]!
    }
  }

  return result
}
