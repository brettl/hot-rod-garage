import { describe, it, expect } from 'vitest'
import { computeStats } from '../src/state/stats'
import type { Stats } from '../src/types'

const base: Stats = { rpm: 5000, power: 100, torque: 100, topSpeed: 100, weight: 3000, height: 1000 }

describe('computeStats', () => {
  it('returns base stats unchanged with no installed parts', () => {
    expect(computeStats(base, [])).toEqual(base)
  })

  it('applies a single part modifier additively', () => {
    const result = computeStats(base, ['engine-performance'])
    expect(result.power).toBe(140) // 100 + 40
    expect(result.torque).toBe(130) // 100 + 30
    expect(result.rpm).toBe(5300) // 5000 + 300
    expect(result.weight).toBe(3040) // 3000 + 40
    expect(result.topSpeed).toBe(100) // untouched
  })

  it('stacks modifiers from multiple installed parts', () => {
    const result = computeStats(base, ['engine-performance', 'turbo'])
    expect(result.power).toBe(185) // 100 + 40 + 45
    expect(result.topSpeed).toBe(112) // 100 + 0 + 12
  })

  it('ignores unknown part ids gracefully (no crash, no modifier applied)', () => {
    const result = computeStats(base, ['does-not-exist'])
    expect(result).toEqual(base)
  })
})
