import type { PartDef, PartSlot } from '../types'

export const PARTS: PartDef[] = [
  // Engine
  { id: 'engine-stock', slot: 'engine', name: 'Stock Engine', price: 0, sellPrice: 0, statModifiers: {} },
  { id: 'engine-performance', slot: 'engine', name: 'Performance Engine', price: 2500, sellPrice: 1250, statModifiers: { power: 40, torque: 30, rpm: 300, weight: 40 } },
  { id: 'engine-race', slot: 'engine', name: 'Race Engine', price: 6000, sellPrice: 3000, statModifiers: { power: 90, torque: 60, rpm: 700, weight: 90 } },

  // Forced Induction
  { id: 'fi-none', slot: 'forcedInduction', name: 'None (Stock)', price: 0, sellPrice: 0, statModifiers: {} },
  { id: 'turbo', slot: 'forcedInduction', name: 'Turbo', price: 1800, sellPrice: 900, statModifiers: { power: 45, torque: 10, topSpeed: 12, weight: 25 } },
  { id: 'supercharger', slot: 'forcedInduction', name: 'Supercharger', price: 3200, sellPrice: 1600, statModifiers: { power: 35, torque: 40, topSpeed: 4, weight: 60 } },

  // Suspension
  { id: 'suspension-stock', slot: 'suspension', name: 'Stock Suspension', price: 0, sellPrice: 0, statModifiers: {} },
  { id: 'suspension-hard', slot: 'suspension', name: 'Hard (Track)', price: 600, sellPrice: 300, statModifiers: { height: -80, weight: -20 } },
  { id: 'suspension-soft', slot: 'suspension', name: 'Soft (Cruiser)', price: 400, sellPrice: 200, statModifiers: { height: 60, weight: 15 } },
  { id: 'suspension-sport', slot: 'suspension', name: 'Sport', price: 900, sellPrice: 450, statModifiers: { height: -50, weight: -30 } },
  { id: 'suspension-rally', slot: 'suspension', name: 'Rally', price: 1100, sellPrice: 550, statModifiers: { height: 90, weight: -15 } },

  // Exhaust
  { id: 'exhaust-stock', slot: 'exhaust', name: 'Stock Exhaust', price: 0, sellPrice: 0, statModifiers: {} },
  { id: 'exhaust-torque', slot: 'exhaust', name: 'Torque Exhaust', price: 500, sellPrice: 250, statModifiers: { torque: 15, weight: 10, topSpeed: 1 } },
  { id: 'exhaust-race', slot: 'exhaust', name: 'Race Exhaust', price: 1200, sellPrice: 600, statModifiers: { power: 15, topSpeed: 6, torque: -5, weight: -15 } },
]

export const STOCK_PART_IDS: Record<PartSlot, string> = {
  engine: 'engine-stock',
  forcedInduction: 'fi-none',
  suspension: 'suspension-stock',
  exhaust: 'exhaust-stock',
}
