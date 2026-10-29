import { describe, it, expect } from 'vitest'
import { VEHICLES } from '../src/data/vehicles'
import { PARTS, STOCK_PART_IDS } from '../src/data/parts'

describe('VEHICLES catalog', () => {
  it('has exactly 5 vehicles', () => {
    expect(VEHICLES).toHaveLength(5)
  })

  it('has unique ids', () => {
    const ids = new Set(VEHICLES.map(v => v.id))
    expect(ids.size).toBe(VEHICLES.length)
  })

  it('prices range from $3,000 to $18,500', () => {
    const prices = VEHICLES.map(v => v.price).sort((a, b) => a - b)
    expect(prices[0]).toBe(3000)
    expect(prices[prices.length - 1]).toBe(18500)
  })

  it('roadster-gt has the highest top speed', () => {
    const roadster = VEHICLES.find(v => v.id === 'roadster-gt')!
    const maxTopSpeed = Math.max(...VEHICLES.map(v => v.baseStats.topSpeed))
    expect(roadster.baseStats.topSpeed).toBe(maxTopSpeed)
  })
})

describe('PARTS catalog', () => {
  it('has 14 parts total (4 stock + 10 purchasable)', () => {
    expect(PARTS).toHaveLength(14)
  })

  it('has exactly 4 stock parts priced at $0, one per slot', () => {
    const stock = PARTS.filter(p => p.price === 0)
    expect(stock).toHaveLength(4)
    const slots = new Set(stock.map(p => p.slot))
    expect(slots.size).toBe(4)
  })

  it('has unique ids', () => {
    const ids = new Set(PARTS.map(p => p.id))
    expect(ids.size).toBe(PARTS.length)
  })

  it('STOCK_PART_IDS references real, $0-priced PartDef ids', () => {
    for (const slot of ['engine', 'forcedInduction', 'suspension', 'exhaust'] as const) {
      const id = STOCK_PART_IDS[slot]
      const def = PARTS.find(p => p.id === id)
      expect(def).toBeDefined()
      expect(def!.price).toBe(0)
      expect(def!.slot).toBe(slot)
    }
  })

  it('every sellPrice is less than price for purchasable parts', () => {
    for (const p of PARTS.filter(p => p.price > 0)) {
      expect(p.sellPrice).toBeLessThan(p.price)
    }
  })

  it('turbo is top-end biased and supercharger is low-end biased', () => {
    const turbo = PARTS.find(p => p.id === 'turbo')!
    const supercharger = PARTS.find(p => p.id === 'supercharger')!
    expect(turbo.statModifiers.topSpeed!).toBeGreaterThan(supercharger.statModifiers.topSpeed ?? 0)
    expect(supercharger.statModifiers.torque!).toBeGreaterThan(turbo.statModifiers.torque ?? 0)
  })
})
