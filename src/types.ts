export interface Stats {
  rpm: number
  power: number
  torque: number
  topSpeed: number
  weight: number
  height: number
}

export type PartSlot = 'engine' | 'forcedInduction' | 'suspension' | 'exhaust'

export interface VehicleDef {
  id: string
  name: string
  price: number
  baseStats: Stats
  color: number // hex, e.g. 0xaa3333
}

export interface PartDef {
  id: string
  slot: PartSlot
  name: string
  price: number // 0 for stock parts (not purchasable)
  sellPrice: number
  statModifiers: Partial<Stats>
}

export interface OwnedVehicle {
  vehicleDefId: string
  instanceId: string
  installedParts: Partial<Record<PartSlot, string>> // -> OwnedPart.instanceId
}

export interface OwnedPart {
  instanceId: string
  partDefId: string
}

export interface PlayerState {
  cash: number
  ownedVehicles: OwnedVehicle[]
  inventory: OwnedPart[]
}
