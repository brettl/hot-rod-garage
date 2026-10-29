import type { VehicleDef } from '../types'

export const VEHICLES: VehicleDef[] = [
  {
    id: 'rust-bucket-sedan',
    name: 'Rust Bucket Sedan',
    price: 3000,
    color: 0x8a7f6b,
    baseStats: { rpm: 5500, power: 85, torque: 130, topSpeed: 85, weight: 3100, height: 1450 },
  },
  {
    id: 'farm-truck',
    name: 'Farm Truck',
    price: 5500,
    color: 0x5b6b45,
    baseStats: { rpm: 5000, power: 110, torque: 180, topSpeed: 90, weight: 3600, height: 1650 },
  },
  {
    id: 'classic-coupe',
    name: 'Classic Coupe',
    price: 9000,
    color: 0x2f4f6b,
    baseStats: { rpm: 6000, power: 140, torque: 150, topSpeed: 105, weight: 2900, height: 1350 },
  },
  {
    id: 'muscle-car',
    name: 'Muscle Car',
    price: 14000,
    color: 0x8b1a1a,
    baseStats: { rpm: 6500, power: 220, torque: 260, topSpeed: 125, weight: 3400, height: 1300 },
  },
  {
    id: 'roadster-gt',
    name: 'Roadster GT',
    price: 18500,
    color: 0xd4af37,
    baseStats: { rpm: 7200, power: 260, torque: 220, topSpeed: 140, weight: 2600, height: 1150 },
  },
]
